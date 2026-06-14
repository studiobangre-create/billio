import { useState, useMemo } from 'react';
import posthog from 'posthog-js';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { InvoicesEmptyIllustration } from '../components/PageEmptyIllustrations';
import { PageSkeleton } from '../components/SkeletonLoader';
import { useApp } from '../context/AppContext';
import { createInvoice } from '../lib/api/invoices';
import { recordInvoiceIssuanceEntry } from '../lib/api/accounting';
import { saveLineItems } from '../lib/api/line-items';
import { createActivity } from '../lib/api/activities';
import {
  STATUS_LABEL, fmt, fmtCompact, fmtDate, fmtDue, nextId, newLineItem,
} from '../data';
import type { FilterKey, Status, LineItem } from '../data';
import type { Activity } from '../lib/schemas';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'Toutes' },
  { key: 'paid',    label: 'Payées' },
  { key: 'pending', label: 'En attente' },
  { key: 'overdue', label: 'En retard' },
  { key: 'draft',   label: 'Brouillons' },
];

export default function InvoicesPage() {
  const { invoices, setInvoices, setActivity, showToast, clientsMap, orgId, loading } = useApp();

  if (loading) return <PageSkeleton title="Factures" subtitle="Gérez et suivez vos factures" metrics={4} rows={6} />;
  const navigate = useNavigate();

  const [filter, setFilter]     = useState<FilterKey>('all');
  const [panelOpen, setPanelOpen] = useState(false);

  // New invoice form state
  const [fClient,  setFClient]  = useState('');
  const [fDate,    setFDate]    = useState(() => new Date().toISOString().slice(0, 10));
  const [fDue,     setFDue]     = useState(() => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  const [fSubject, setFSubject] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [fPay,     setFPay]     = useState('Mobile Money (MTN / Orange / Wave)');
  const [fNotes,   setFNotes]   = useState('');

  const filteredInvoices = useMemo(
    () => filter === 'all' ? invoices : invoices.filter(i => i.status === filter),
    [invoices, filter],
  );

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<FilterKey, number>> = { all: invoices.length };
    invoices.forEach(i => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
    return counts;
  }, [invoices]);

  const subtotal = useMemo(() => lineItems.reduce((s, li) => s + li.qty * li.price, 0), [lineItems]);
  const tax      = Math.round(subtotal * 0.18);
  const total    = subtotal + tax;

  const openPanel = () => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    setFClient(''); setFDate(today); setFDue(due); setFSubject(''); setFNotes('');
    setLineItems([newLineItem('', 1, 250_000), newLineItem('', 3, 75_000)]);
    setPanelOpen(true);
  };
  const closePanel = () => setPanelOpen(false);

  const addLine    = () => setLineItems(prev => [...prev, newLineItem()]);
  const removeLine = (id: string) =>
    setLineItems(prev => prev.length > 1 ? prev.filter(li => li.id !== id) : [newLineItem()]);
  const updateLine = (id: string, field: 'desc' | 'qty' | 'price', val: string) =>
    setLineItems(prev => prev.map(li => li.id !== id ? li : {
      ...li, [field]: field === 'desc' ? val : (parseFloat(val) || 0),
    }));

  const sendReminder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const actEntry: Activity = { kind: 'sent', parts: [{ text: 'Relance envoyée pour ' }, { text: `#${id}`, bold: true }], time: "À l'instant" };
    setActivity((prev: Activity[]) => [actEntry, ...prev]);
    try {
      await createActivity(orgId, { kind: actEntry.kind, parts: actEntry.parts });
      showToast(`Relance envoyée pour #${id}`);
    } catch (err) {
      console.error('[sendReminder] error:', err);
      setActivity((prev: Activity[]) => prev.filter(a => a !== actEntry));
      showToast('Erreur lors de l\'envoi de la relance. Veuillez réessayer.', true);
    }
  };

  const submitInvoice = async (status: 'draft' | 'pending') => {
    if (!fClient)      { showToast('Veuillez sélectionner un client.', true); return; }
    if (subtotal <= 0) { showToast('Ajoutez au moins une ligne de facturation.', true); return; }

    const isFirstInvoice = invoices.length === 0;
    const id    = nextId(invoices);
    const cName = clientsMap[fClient]?.name ?? fClient;
    const newInv = { id, subject: fSubject.trim() || 'Facture sans titre', client: fClient, issued: fDate, due: fDue, amount: total, status };

    try {
      await createInvoice(orgId, newInv);
      await saveLineItems(orgId, lineItems, { invoiceId: id });
      if (status === 'pending') {
        await recordInvoiceIssuanceEntry(orgId, {
          invoiceId:  id,
          htAmount:   subtotal,
          tvaAmount:  tax,
          date:       fDate,
          clientName: cName,
        });
      }

      posthog.capture('invoice_created', { invoice_type: status, item_count: lineItems.length, total_amount: total, currency: 'XOF' });
      if (status === 'pending') posthog.capture('invoice_sent', { invoice_id: id, delivery_method: fPay });
      if (isFirstInvoice) posthog.capture('first_invoice_created');

      setInvoices(prev => [newInv, ...prev]);

      const actPayload = status === 'pending'
        ? { kind: 'sent'   as const, parts: [{ text: 'Facture ' }, { text: `#${id}`, bold: true as const }, { text: ' envoyée à ' }, { text: cName, bold: true as const }] }
        : { kind: 'viewed' as const, parts: [{ text: 'Brouillon ' }, { text: `#${id}`, bold: true as const }, { text: ' enregistré pour ' }, { text: cName, bold: true as const }] };
      const actEntry: Activity = { ...actPayload, time: "À l'instant" };
      setActivity((prev: Activity[]) => [actEntry, ...prev]);
      await createActivity(orgId, actPayload);

      closePanel();
      showToast(status === 'pending' ? `Facture #${id} envoyée à ${cName}` : `Brouillon #${id} enregistré`);
    } catch (err) {
      console.error('[submitInvoice] error:', err);
      showToast('Une erreur est survenue. Veuillez réessayer.', true);
    }
  };

  return (
    <>
      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">Factures</div>
            <div className="page-sub">Gérez et suivez vos factures</div>
          </div>
          <div className="topbar-actions">
            <button className="btn"><Icon name="search" ariaHidden /> Rechercher</button>
            <button className="btn btn-primary" onClick={openPanel}>
              <Icon name="plus" ariaHidden /> Nouvelle facture
            </button>
          </div>
        </div>

        <div className="content">
          {/* Metrics */}
          <div className="metrics">
            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico blue"><Icon name="file-invoice" size={15} ariaHidden /></div>
                <div className="metric-label">Total facturé</div>
              </div>
              <div className="metric-value tnum">
                {fmtCompact(invoices.filter(i => i.status !== 'draft').reduce((s, i) => s + i.amount, 0))}
                <span className="metric-unit">F CFA</span>
              </div>
              <div className="metric-change neutral">{invoices.filter(i => i.status !== 'draft').length} factures émises</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico green"><Icon name="circle-check-filled" size={15} ariaHidden /></div>
                <div className="metric-label">Encaissé</div>
              </div>
              <div className="metric-value tnum">
                {fmtCompact(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0))}
                <span className="metric-unit">F CFA</span>
              </div>
              <div className="metric-change neutral">{invoices.filter(i => i.status === 'paid').length} factures payées</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico amber"><Icon name="clock-pause" size={15} ariaHidden /></div>
                <div className="metric-label">En attente</div>
              </div>
              <div className="metric-value tnum">
                {fmtCompact(invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0))}
                <span className="metric-unit">F CFA</span>
              </div>
              <div className="metric-change neutral">{invoices.filter(i => i.status === 'pending').length} en attente de paiement</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico" style={{ background: '#FCEBEB', color: '#A32D2D' }}><Icon name="alert-triangle" size={15} ariaHidden /></div>
                <div className="metric-label">En retard</div>
              </div>
              <div className="metric-value tnum" style={{ color: invoices.some(i => i.status === 'overdue') ? '#A32D2D' : undefined }}>
                {fmtCompact(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0))}
                <span className="metric-unit">F CFA</span>
              </div>
              <div className="metric-change neutral">{invoices.filter(i => i.status === 'overdue').length} factures en retard</div>
            </div>
          </div>

          <div className="section-header">
            <div className="section-title">Toutes les factures</div>
            <div className="filters">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`filter-chip${filter === f.key ? ' active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}<span className="cnt">{filterCounts[f.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="invoice-table">
            <div className="table-head grid-cols">
              <div className="th">Facture</div>
              <div className="th">Client</div>
              <div className="th">Émission / Échéance</div>
              <div className="th right">Montant</div>
              <div className="th">Statut</div>
              <div className="th" />
            </div>

            {filteredInvoices.length === 0 ? (
              <EmptyState
                illustration={<InvoicesEmptyIllustration />}
                title={filter !== 'all' ? `Aucune facture « ${STATUS_LABEL[filter as Status]} »` : 'Aucune facture'}
                description="Créez votre première facture pour commencer à facturer vos clients."
              />
            ) : filteredInvoices.map(inv => {
              const c = clientsMap[inv.client] ?? (() => {
                if (import.meta.env.DEV) console.warn(`[InvoicesPage] client not in clientsMap: "${inv.client}" (invoice #${inv.id})`);
                return { name: inv.client, city: '—', av: 'av-a' };
              })();
              return (
                <div key={inv.id} className="inv-row grid-cols" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <div>
                    <div className="inv-id">#{inv.id}</div>
                    <div className="inv-subject">{inv.subject}</div>
                  </div>
                  <div className="client-cell">
                    <div className={`client-av ${c.av}`}>{inv.client}</div>
                    <div>
                      <div className="cell-text">{c.name}</div>
                      <div className="cell-sub">{c.city}</div>
                    </div>
                  </div>
                  <div>
                    <div className="cell-text">{fmtDate(inv.issued)}</div>
                    <div className="cell-sub">{fmtDue(inv.due)}</div>
                  </div>
                  <div className="amount tnum" style={{ textAlign: 'right' }}>
                    {fmt(inv.amount)}<span className="cur">F CFA</span>
                  </div>
                  <div>
                    <span className={`status-pill s-${inv.status}`}>{STATUS_LABEL[inv.status]}</span>
                  </div>
                  <div className="row-actions">
                    {inv.status === 'draft' && (
                      <button className="icon-btn" aria-label="Modifier" onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.id}`); }}>
                        <Icon name="edit" size={15} ariaHidden />
                      </button>
                    )}
                    {inv.status === 'paid' && (
                      <button className="icon-btn" aria-label="Télécharger" onClick={e => e.stopPropagation()}>
                        <Icon name="download" size={15} ariaHidden />
                      </button>
                    )}
                    {(inv.status === 'overdue' || inv.status === 'pending') && (
                      <button className="icon-btn" aria-label="Envoyer une relance" onClick={e => sendReminder(e, inv.id)}>
                        <Icon name="send" size={15} ariaHidden />
                      </button>
                    )}
                    <button className="icon-btn" aria-label="Plus d'options" onClick={e => e.stopPropagation()}>
                      <Icon name="dots" size={15} ariaHidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slide-over panel — sibling of .main, both inside .main-rel */}
      <div className={`scrim${panelOpen ? ' open' : ''}`} onClick={closePanel} />
      <div className={`new-inv-panel${panelOpen ? ' open' : ''}`} role="dialog" aria-label="Nouvelle facture" aria-modal="true">
        <div className="panel-slide-head">
          <div>
            <div className="panel-slide-title">Nouvelle facture</div>
            <div className="panel-slide-sub">#{nextId(invoices)}</div>
          </div>
          <button className="icon-btn" onClick={closePanel} aria-label="Fermer">
            <Icon name="x" size={15} ariaHidden />
          </button>
        </div>

        <div className="panel-body">
          <div className="form-group">
            <label className="form-label">Client</label>
            <select className="form-input" value={fClient} onChange={e => setFClient(e.target.value)}>
              <option value="">Sélectionner un client…</option>
              {Object.entries(clientsMap).map(([code, c]) => (
                <option key={code} value={code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date de facturation</label>
              <input type="date" className="form-input" value={fDate} onChange={e => setFDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date d'échéance</label>
              <input type="date" className="form-input" value={fDue} onChange={e => setFDue(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Référence / Objet</label>
            <input type="text" className="form-input" placeholder="ex. Développement web — sprint 5"
              maxLength={255} value={fSubject} onChange={e => setFSubject(e.target.value)} />
          </div>

          <div className="subhead"><span>Lignes de facturation</span></div>
          <div className="line-items-head">
            <div className="li-col">Description</div>
            <div className="li-col right">Qté</div>
            <div className="li-col right">Prix</div>
            <div />
          </div>

          {lineItems.map(li => (
            <div key={li.id} className="line-item">
              <div className="line-item-row">
                <input className="li-input" placeholder="Description du service" value={li.desc}
                  onChange={e => updateLine(li.id, 'desc', e.target.value)} />
                <input className="li-input num" type="number" min="0" value={li.qty}
                  onChange={e => updateLine(li.id, 'qty', e.target.value)} />
                <input className="li-input num" type="number" min="0" value={li.price || ''}
                  placeholder="0" onChange={e => updateLine(li.id, 'price', e.target.value)} />
                <button className="li-del" onClick={() => removeLine(li.id)} aria-label="Supprimer la ligne">
                  <Icon name="trash" size={15} ariaHidden />
                </button>
              </div>
            </div>
          ))}

          <button className="add-line" onClick={addLine}>
            <Icon name="plus" size={14} ariaHidden /> Ajouter une ligne
          </button>

          <div className="total-block">
            <div className="total-row"><span>Sous-total</span><span>{fmt(subtotal)} F CFA</span></div>
            <div className="total-row"><span>TVA (18 %)</span><span>{fmt(tax)} F CFA</span></div>
            <div className="total-row final"><span>Total à payer</span><span>{fmt(total)} F CFA</span></div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Mode de paiement</label>
            <select className="form-input" value={fPay} onChange={e => setFPay(e.target.value)}>
              <option>Mobile Money (MTN / Orange / Wave)</option>
              <option>Virement bancaire</option>
              <option>Paiement à la livraison</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} placeholder="Merci pour votre confiance…"
              style={{ resize: 'none', lineHeight: 1.5 }} maxLength={1000} value={fNotes}
              onChange={e => setFNotes(e.target.value)} />
          </div>
        </div>

        <div className="panel-footer">
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => submitInvoice('draft')}>
            Enregistrer brouillon
          </button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => submitInvoice('pending')}>
            <Icon name="send" ariaHidden /> Envoyer la facture
          </button>
        </div>
      </div>
    </>
  );
}
