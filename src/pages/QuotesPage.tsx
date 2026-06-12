import { useState, useMemo } from 'react';
import Icon from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { QuotesEmptyIllustration } from '../components/PageEmptyIllustrations';
import { PageSkeleton } from '../components/SkeletonLoader';
import { useApp } from '../context/AppContext';
import { createQuote, updateQuote, removeQuote } from '../lib/api/quotes';
import { createInvoice } from '../lib/api/invoices';
import { fetchLineItems, saveLineItems } from '../lib/api/line-items';
import { recordInvoiceIssuanceEntry } from '../lib/api/accounting';
import { fmt, fmtDate, newLineItem, nextId } from '../data';
import type { LineItem, QuoteStatus, Quote } from '../lib/schemas';

type FilterKey = 'all' | QuoteStatus;


const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft:    'Brouillon',
  sent:     'Envoyé',
  accepted: 'Accepté',
  declined: 'Refusé',
  expired:  'Expiré',
  invoiced: 'Facturé',
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'Tous'      },
  { key: 'draft',    label: 'Brouillon' },
  { key: 'sent',     label: 'Envoyé'    },
  { key: 'accepted', label: 'Accepté'   },
  { key: 'declined', label: 'Refusé'    },
  { key: 'expired',  label: 'Expiré'    },
];

function nextQuoteId(quotes: Quote[]): string {
  const nums = quotes.map(q => parseInt(q.id.split('-')[1], 10));
  return 'DEV-' + String(Math.max(...nums) + 1).padStart(4, '0');
}

function fmtCompact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1) + 'M';
  return Math.round(n).toLocaleString('fr-FR');
}

const TVA = 0.18;

export default function QuotesPage() {
  const { showToast, quotes, setQuotes, invoices, setInvoices, clientsMap, userId, orgId, loading } = useApp();

  if (loading) return <PageSkeleton title="Devis" subtitle="Gérez vos devis" metrics={0} rows={6} />;
  const [filter, setFilter] = useState<FilterKey>('all');
  const [panelOpen, setPanelOpen] = useState(false);

  // Form
  const [fClient,  setFClient]  = useState('');
  const [fDate,    setFDate]    = useState(new Date().toISOString().split('T')[0]);
  const [fValid,   setFValid]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [fSubject, setFSubject] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    newLineItem(), newLineItem(),
  ]);

  const subtotal = lines.reduce((s, li) => s + li.qty * li.price, 0);
  const tax      = Math.round(subtotal * TVA);
  const total    = subtotal + tax;

  // Metrics
  const quotedStatuses: QuoteStatus[] = ['sent', 'accepted', 'declined', 'expired', 'invoiced'];
  const totalQuoted  = quotes.filter(q => quotedStatuses.includes(q.status)).reduce((s, q) => s + q.amount, 0);
  const openVal      = quotes.filter(q => q.status === 'sent').reduce((s, q) => s + q.amount, 0);
  const openCount    = quotes.filter(q => q.status === 'sent').length;
  const acceptedVal  = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + q.amount, 0);
  const won          = quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced').length;
  const decided      = quotes.filter(q => ['accepted', 'declined', 'expired', 'invoiced'].includes(q.status)).length;
  const rate         = decided ? Math.round((won / decided) * 100) : 0;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: quotes.length };
    quotes.forEach(q => { c[q.status] = (c[q.status] ?? 0) + 1; });
    return c;
  }, [quotes]);

  const filtered = useMemo(() =>
    filter === 'all' ? quotes : quotes.filter(q => q.status === filter),
    [quotes, filter],
  );

  function openPanel() {
    setFClient(''); setFSubject('');
    setLines([newLineItem(), newLineItem()]);
    setPanelOpen(true);
  }
  function closePanel() { setPanelOpen(false); }

  function addLine() {
    setLines(prev => [...prev, newLineItem()]);
  }
  function removeLine(id: string) {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }
  function updateLine(id: string, field: 'desc' | 'qty' | 'price', val: string) {
    setLines(prev => prev.map(l => l.id !== id ? l : {
      ...l,
      [field]: field === 'desc' ? val : parseFloat(val) || 0,
    }));
  }

  async function submitQuote(status: 'draft' | 'sent') {
    if (!fClient) { showToast('Sélectionnez un client', true); return; }
    if (subtotal <= 0) { showToast('Ajoutez au moins un article', true); return; }
    const id      = nextQuoteId(quotes);
    const cName   = clientsMap[fClient]?.name ?? fClient;
    const payload = { id, subject: fSubject.trim() || 'Devis sans titre', client: fClient, issued: fDate, valid: fValid, amount: total, status };
    const newQuote: Quote = { ...payload, expSoon: status === 'sent' };
    setQuotes(prev => [newQuote, ...prev]);
    await createQuote(orgId, payload);
    await saveLineItems(orgId, lines, { quoteId: id });
    closePanel();
    showToast(status === 'sent' ? `Devis ${id} envoyé à ${cName}` : `Brouillon ${id} enregistré`);
  }

  async function convertToInvoice(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const quote = quotes.find(q => q.id === id);
    if (!quote) return;

    const today   = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const invId   = nextId(invoices);
    const cName   = clientsMap[quote.client]?.name ?? quote.client;
    const htAmount  = Math.round(quote.amount / 1.18);
    const tvaAmount = quote.amount - htAmount;

    const newInv = {
      id:      invId,
      subject: quote.subject,
      client:  quote.client,
      issued:  today,
      due:     dueDate,
      amount:  quote.amount,
      status:  'pending' as const,
    };

    setInvoices(prev => [newInv, ...prev]);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'invoiced' } : q));

    const quoteLines = await fetchLineItems(undefined, id);
    await createInvoice(orgId, newInv);
    await saveLineItems(orgId, quoteLines.map(l => ({ ...l })), { invoiceId: invId });
    await updateQuote(id, { status: 'invoiced' });
    await recordInvoiceIssuanceEntry(orgId, {
      invoiceId:  invId,
      htAmount,
      tvaAmount,
      date:       today,
      clientName: cName,
    });

    showToast(`Devis ${id} → Facture #${invId} créée`);
  }

  function sendReminder(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    showToast(`Relance envoyée pour ${id}`);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`Supprimer le devis ${id} ? Cette action est irréversible.`)) return;
    setQuotes(prev => prev.filter(q => q.id !== id));
    await removeQuote(id);
    showToast(`Devis ${id} supprimé`);
  }

  return (
    <>
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="page-title">Devis</div>
            <div className="page-sub">Estimations envoyées avant facturation</div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={openPanel}>
              <Icon name="plus" size={16} />
              Nouveau devis
            </button>
          </div>
        </div>

        <div className="content">
          {/* Metrics */}
          <div className="metrics">
            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico blue"><Icon name="file-text" size={15} /></div>
                <div className="metric-label">Devisé (90 jours)</div>
              </div>
              <div className="metric-value tnum">
                {fmtCompact(totalQuoted)}<span className="metric-unit">F CFA</span>
              </div>
              <div className="metric-change">
                <span className="up"><Icon name="trending-up" size={13} /> +8% vs trimestre dernier</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico amber"><Icon name="clock-pause" size={15} /></div>
                <div className="metric-label">En attente de réponse</div>
              </div>
              <div className="metric-value tnum">
                {fmtCompact(openVal)}<span className="metric-unit">F CFA</span>
              </div>
              <div className="metric-change neutral">
                {openCount} devis en attente
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico green"><Icon name="trending-up" size={15} /></div>
                <div className="metric-label">Taux d'acceptation</div>
              </div>
              <div className="metric-value tnum">
                {rate}<span className="metric-unit">%</span>
              </div>
              <div className="metric-change neutral">
                {won} sur {decided} décidés
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-ico violet"><Icon name="circle-check-filled" size={15} /></div>
                <div className="metric-label">Acceptés</div>
              </div>
              <div className="metric-value tnum">
                {fmtCompact(acceptedVal)}<span className="metric-unit">F CFA</span>
              </div>
              <div className="metric-change neutral">prêt à facturer</div>
            </div>
          </div>

          {/* Section header */}
          <div className="section-header">
            <div className="section-title">Tous les devis</div>
            <div className="filters">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={'filter-chip' + (filter === f.key ? ' active' : '')}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}<span className="cnt">{counts[f.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quote table */}
          <div className="quote-table">
            <div className="table-head q-grid-cols">
              <div className="th">Devis</div>
              <div className="th">Client</div>
              <div className="th">Valide jusqu'au</div>
              <div className="th right">Montant</div>
              <div className="th">Statut</div>
              <div className="th" />
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                illustration={<QuotesEmptyIllustration />}
                title="Aucun devis"
                description="Aucun devis dans cette catégorie. Créez un devis pour commencer."
              />
            ) : (
              filtered.map(q => {
                const cl = clientsMap[q.client];
                return (
                  <div key={q.id} className="q-row q-grid-cols">
                    {/* Quote ID + subject */}
                    <div>
                      <div className="q-id">#{q.id}</div>
                      <div className="q-subject">{q.subject}</div>
                    </div>

                    {/* Client */}
                    <div className="client-cell">
                      {cl && <div className={`client-av ${cl.av}`}>{q.client}</div>}
                      <div>
                        <div className="cell-text">{cl?.name ?? q.client}</div>
                        <div className="cell-sub">{cl?.city}</div>
                      </div>
                    </div>

                    {/* Valid until */}
                    <div>
                      <div className="cell-text">{fmtDate(q.valid)}</div>
                      {q.status === 'sent' && q.expSoon
                        ? <div className="cell-sub warn">Expire bientôt</div>
                        : q.status === 'expired'
                          ? <div className="cell-sub">Périmé</div>
                          : <div className="cell-sub">émis le {fmtDate(q.issued)}</div>
                      }
                    </div>

                    {/* Amount */}
                    <div className="amount tnum" style={{ textAlign: 'right' }}>
                      {fmt(q.amount)}<span className="cur">F CFA</span>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`status-pill sq-${q.status}`}>{STATUS_LABEL[q.status]}</span>
                    </div>

                    {/* Actions */}
                    <div className="row-actions">
                      {q.status === 'accepted' && (
                        <button
                          className="btn-convert"
                          onClick={e => convertToInvoice(q.id, e)}
                        >
                          <Icon name="arrow-right" size={13} />
                          Facturer
                        </button>
                      )}
                      {q.status === 'sent' && (
                        <button
                          className="icon-btn"
                          title="Envoyer une relance"
                          onClick={e => sendReminder(q.id, e)}
                        >
                          <Icon name="send" size={14} />
                        </button>
                      )}
                      {q.status === 'draft' && (
                        <button className="icon-btn" title="Modifier" onClick={e => e.stopPropagation()}>
                          <Icon name="edit" size={14} />
                        </button>
                      )}
                      {!['accepted', 'sent', 'draft'].includes(q.status) && (
                        <button className="icon-btn" title="Dupliquer" onClick={e => e.stopPropagation()}>
                          <Icon name="copy" size={14} />
                        </button>
                      )}
                      <button className="icon-btn" title="Supprimer" onClick={e => handleDelete(q.id, e)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Scrim */}
      <div className={'scrim' + (panelOpen ? ' open' : '')} onClick={closePanel} />

      {/* New quote panel */}
      <div className={'new-inv-panel' + (panelOpen ? ' open' : '')}>
        <div className="panel-slide-head">
          <div>
            <div className="panel-slide-title">Nouveau devis</div>
            <div className="panel-slide-sub">#{nextQuoteId(quotes)}</div>
          </div>
          <button className="icon-btn" onClick={closePanel} aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="panel-body">
          {/* Client */}
          <div className="form-group">
            <label className="form-label">Client</label>
            <select className="form-input" value={fClient} onChange={e => setFClient(e.target.value)}>
              <option value="">Sélectionner un client…</option>
              {Object.entries(clientsMap).map(([code, cl]) => (
                <option key={code} value={code}>{cl.name}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date du devis</label>
              <input className="form-input" type="date" value={fDate} onChange={e => setFDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Valide jusqu'au</label>
              <input className="form-input" type="date" value={fValid} onChange={e => setFValid(e.target.value)} />
            </div>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label className="form-label">Objet</label>
            <input
              className="form-input"
              type="text"
              placeholder="ex. Refonte site web — périmètre complet"
              value={fSubject}
              onChange={e => setFSubject(e.target.value)}
            />
          </div>

          {/* Line items */}
          <div className="subhead">Lignes</div>
          <div className="line-items-head">
            <div className="li-col">Description</div>
            <div className="li-col right">Qté</div>
            <div className="li-col right">Prix</div>
            <div />
          </div>

          {lines.map(li => (
            <div key={li.id} className="line-item">
              <div className="line-item-row">
                <input
                  type="text"
                  className="li-input"
                  placeholder="Description"
                  value={li.desc}
                  onChange={e => updateLine(li.id, 'desc', e.target.value)}
                />
                <input
                  type="number"
                  className="li-input num"
                  min="0"
                  value={li.qty}
                  onChange={e => updateLine(li.id, 'qty', e.target.value)}
                />
                <input
                  type="number"
                  className="li-input num"
                  min="0"
                  value={li.price}
                  onChange={e => updateLine(li.id, 'price', e.target.value)}
                />
                <button className="li-del" onClick={() => removeLine(li.id)} aria-label="Supprimer">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}

          <button className="add-line" onClick={addLine}>
            <Icon name="plus" size={14} />
            Ajouter une ligne
          </button>

          {/* Totals */}
          <div className="total-block">
            <div className="total-row">
              <span>Sous-total</span>
              <span>{fmt(subtotal)} F CFA</span>
            </div>
            <div className="total-row">
              <span>TVA (18%)</span>
              <span>{fmt(tax)} F CFA</span>
            </div>
            <div className="total-row final">
              <span>Total estimé</span>
              <span>{fmt(total)} F CFA</span>
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <button
            className="btn"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => submitQuote('draft')}
          >
            Enregistrer brouillon
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => submitQuote('sent')}
          >
            <Icon name="send" size={15} />
            Envoyer le devis
          </button>
        </div>
      </div>
    </>
  );
}
