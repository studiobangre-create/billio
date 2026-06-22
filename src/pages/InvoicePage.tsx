import { useState, useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import Icon from '../components/Icon';
import ConfirmModal from '../components/ConfirmModal';
import { PageSkeleton } from '../components/SkeletonLoader';
import { useApp } from '../context/AppContext';
import { removeInvoice, updateInvoice } from '../lib/api/invoices';
import { recordInvoicePaymentEntry, deleteInvoiceEntries, updateInvoiceIssuanceEntry } from '../lib/api/accounting';
import { createPayment } from '../lib/api/payments';
import { fetchLineItems, saveLineItems, deleteLineItems } from '../lib/api/line-items';
import { fmt, fmtDate, fmtDateLong, STATUS_LABEL, newLineItem } from '../data';
import { InvoicePDFDocument } from '../components/InvoicePDF';
import { getFiscalIdLabel } from '../lib/ohada';
import type { Status } from '../data';
import { calculateServiceWithholding, SERVICE_WITHHOLDING_THRESHOLD } from '../lib/tax-bf';
import type { LineItem, PayMethod, Payment, ServiceWithholdingScenario } from '../lib/schemas';

type DotKind = 'paid' | 'sent' | 'overdue' | '';
interface TlEntry { dot: DotKind; text: string; time: string; }

function buildTimeline(
  invoice: { issued: string; due: string; status: Status },
  clientName: string,
  payment?: { date: string },
): TlEntry[] {
  const issuedStr = fmtDateLong(invoice.issued);
  const created: TlEntry = { dot: '', text: 'Facture créée', time: issuedStr };
  if (invoice.status === 'draft') return [created];

  const sent: TlEntry = { dot: 'sent', text: 'Envoyée', time: issuedStr };

  if (invoice.status === 'paid') {
    const paidEntry: TlEntry = payment
      ? { dot: 'paid', text: `Paiement reçu de ${clientName}`, time: fmtDateLong(payment.date) }
      : { dot: 'paid', text: `Paiement reçu de ${clientName}`, time: '—' };
    return [paidEntry, sent, created];
  }

  if (invoice.status === 'overdue') {
    return [
      { dot: 'overdue', text: 'Passée en retard', time: fmtDateLong(invoice.due) },
      sent,
      created,
    ];
  }

  return [sent, created];
}

function QrCodeSvg() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="60" height="60" fill="white"/>
      {/* top-left finder */}
      <rect x="4" y="4" width="22" height="22" rx="3" fill="#185FA5"/>
      <rect x="8" y="8" width="14" height="14" rx="1.5" fill="white"/>
      <rect x="11" y="11" width="8" height="8" rx="1" fill="#185FA5"/>
      {/* top-right finder */}
      <rect x="34" y="4" width="22" height="22" rx="3" fill="#185FA5"/>
      <rect x="38" y="8" width="14" height="14" rx="1.5" fill="white"/>
      <rect x="41" y="11" width="8" height="8" rx="1" fill="#185FA5"/>
      {/* bottom-left finder */}
      <rect x="4" y="34" width="22" height="22" rx="3" fill="#185FA5"/>
      <rect x="8" y="38" width="14" height="14" rx="1.5" fill="white"/>
      <rect x="11" y="41" width="8" height="8" rx="1" fill="#185FA5"/>
      {/* data modules */}
      <rect x="34" y="34" width="5" height="5" rx="1" fill="#185FA5"/>
      <rect x="41" y="34" width="5" height="5" rx="1" fill="#185FA5"/>
      <rect x="34" y="41" width="5" height="5" rx="1" fill="#185FA5"/>
      <rect x="41" y="41" width="5" height="5" rx="1" fill="#185FA5"/>
      <rect x="51" y="34" width="5" height="5" rx="1" fill="#185FA5"/>
      <rect x="34" y="51" width="5" height="5" rx="1" fill="#185FA5"/>
      <rect x="51" y="51" width="5" height="5" rx="1" fill="#185FA5"/>
      <rect x="46" y="46" width="5" height="5" rx="1" fill="#185FA5"/>
    </svg>
  );
}

const BillioLogoSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5.5 3.2h10.2c.6 0 1.1.2 1.5.6l3 3c.4.4.6.9.6 1.5v12c0 .7-.6 1.1-1.2.8l-1.6-.8-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.6.8c-.6.3-1.3-.1-1.3-.8V4.7c0-.8.7-1.5 1.5-1.5z" fill="#fff" fillOpacity="0.96"/>
    <path d="M8 8.2h6M8 11.4h7M8 14.6h4" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, setInvoices, payments, setPayments, showToast, clientsMap, products, orgSettings, orgId, loading } = useApp();
  const [lines, setLines] = useState<LineItem[]>([]);
  const [payDialog, setPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [payRef, setPayRef] = useState('');
  const [tvaRetenue, setTvaRetenue] = useState(0);
  const [serviceWithholding, setServiceWithholding] = useState(0);

  // Edit panel state
  const [editOpen,   setEditOpen]   = useState(false);
  const [eClient,    setEClient]    = useState('');
  const [eSubject,   setESubject]   = useState('');
  const [eDate,      setEDate]      = useState('');
  const [eDue,       setEDue]       = useState('');
  const [eLines,     setELines]     = useState<LineItem[]>([]);
  const [eDiscount,  setEDiscount]  = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);
  const [pickerQuery,  setPickerQuery]  = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showPicker]);

  useEffect(() => {
    if (id) fetchLineItems(id).then(setLines).catch(() => setLines([]));
  }, [id]);

  if (loading) return <PageSkeleton title="Facture" variant="table-only" metrics={0} rows={4} />;

  const invoice = invoices.find(i => i.id === id);
  if (!invoice) {
    return (
      <div className="main">
        <div className="topbar">
          <div className="crumbs">
            <button className="crumb-back" onClick={() => navigate('/invoices')} aria-label="Retour">
              <Icon name="arrow-left" ariaHidden />
            </button>
            <div className="crumb-text">Facture introuvable</div>
          </div>
        </div>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
          La facture #{id} n'existe pas.
        </div>
      </div>
    );
  }

  const client        = clientsMap[invoice.client] ?? { name: invoice.client, city: '—', av: 'av-a' };
  const clientWithholdingScenario = (client as { withholdingScenario?: ServiceWithholdingScenario }).withholdingScenario;
  const canInvoiceTVA = orgSettings.taxRegime === 'RNI';
  const subtotal      = lines.reduce((s, li) => s + li.qty * li.price, 0);
  const discountPct   = invoice.discountPct ?? 0;
  const discountAmt   = Math.round(subtotal * (discountPct / 100));
  const discountedSub = subtotal - discountAmt;
  const tax           = canInvoiceTVA ? Math.round(discountedSub * 0.18) : 0;
  const total         = discountedSub + tax;
  const isOverdue       = invoice.status === 'overdue';
  const invoicePayment  = payments.find(p => p.inv === invoice.id);
  const timeline        = buildTimeline(invoice, client.name, invoicePayment);

  const handleSendReminder = () => showToast(`Relance envoyée à ${client.name}`);
  const handleDuplicate    = () => showToast('Facture dupliquée en brouillon');
  const handleDownloadPDF = async () => {
    const blob = await pdf(
      <InvoicePDFDocument
        invoice={invoice}
        lines={lines}
        client={client}
        biz={orgSettings}
        paymentTerms={orgSettings.paymentTerms || 'Net 14 jours'}
        deliveryTerms={orgSettings.deliveryTerms || 'À convenir'}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${invoice.id.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    posthog.capture('invoice_pdf_downloaded', { invoice_id: invoice.id });
  };
  const handleDelete = () => setDeleteDialog(true);
  const handleConfirmDelete = async () => {
    setInvoices(prev => prev.filter(i => i.id !== invoice.id));
    await removeInvoice(invoice.id);
    await deleteInvoiceEntries(orgId, invoice.id);
    showToast('Facture supprimée');
    navigate('/invoices');
  };
  const REF_PLACEHOLDER: Record<PayMethod, string> = {
    cash: 'Reçu #0212',
    wire: '#WV0000',
    momo: 'Réf MTN / Orange',
    cheque: 'ch_3PXyZ...',
  };
  const METHOD_LABEL: Record<PayMethod, string> = {
    cash:   'Cash',
    wire:   'Virement',
    momo:   'Mobile Money',
    cheque: 'Chèque',
  };

  const canEdit = invoice.status === 'draft' || invoice.status === 'pending';

  const openEdit = () => {
    setEClient(invoice.client);
    setESubject(invoice.subject);
    setEDate(invoice.issued);
    setEDue(invoice.due);
    setEDiscount(invoice.discountPct ?? 0);
    setELines(lines.length ? lines.map(l => ({ ...l })) : [newLineItem()]);
    setEditOpen(true);
  };

  const updateELine = (lid: string, field: string, val: string) =>
    setELines(prev => prev.map(l => l.id === lid ? { ...l, [field]: field === 'qty' || field === 'price' ? Number(val) : val } : l));

  const filteredProducts = products.filter(p => !pickerQuery || p.name.toLowerCase().includes(pickerQuery.toLowerCase()));

  const eSubtotal      = eLines.reduce((s, l) => s + l.qty * l.price, 0);
  const eDiscountAmt   = Math.round(eSubtotal * (eDiscount / 100));
  const eDiscountedSub = eSubtotal - eDiscountAmt;
  const eTax           = canInvoiceTVA ? Math.round(eDiscountedSub * 0.18) : 0;
  const eTotal         = eDiscountedSub + eTax;

  const handleSaveEdit = async () => {
    if (!eClient) { showToast('Veuillez sélectionner un client.', true); return; }
    if (eSubtotal <= 0) { showToast('Ajoutez au moins une ligne de facturation.', true); return; }
    setSaving(true);
    try {
      await updateInvoice(invoice.id, { subject: eSubject.trim() || 'Facture sans titre', client: eClient, issued: eDate, due: eDue, amount: eTotal, discountPct: eDiscount });
      await deleteLineItems({ invoiceId: invoice.id });
      await saveLineItems(orgId, eLines, { invoiceId: invoice.id });
      const editedClientName = (clientsMap[eClient] ?? { name: eClient }).name;
      updateInvoiceIssuanceEntry(orgId, {
        invoiceId:  invoice.id,
        htAmount:   eDiscountedSub,
        tvaAmount:  eTax,
        date:       eDate,
        clientName: editedClientName,
      }).catch(err => console.error('Accounting update failed:', err));
      setInvoices(prev => prev.map(i => i.id === invoice.id
        ? { ...i, subject: eSubject.trim() || 'Facture sans titre', client: eClient, issued: eDate, due: eDue, amount: eTotal, discountPct: eDiscount }
        : i));
      setLines(eLines);
      setEditOpen(false);
      showToast('Facture mise à jour');
    } catch (err) {
      console.error('Edit invoice failed:', err);
      showToast('Erreur lors de la mise à jour', true);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const maxNum = payments.length
      ? Math.max(...payments.map(p => parseInt(p.id.split('-')[1], 10)))
      : 2052;
    const newPayment: Payment = {
      id:     `PAI-${maxNum + 1}`,
      date:   today,
      client: invoice.client,
      inv:    invoice.id,
      method: payMethod,
      ref:    payRef.trim() || METHOD_LABEL[payMethod],
      amount: total,
      status: 'completed',
      source: 'manual',
    };
    try {
      await createPayment(orgId, newPayment);
      await updateInvoice(invoice.id, { status: 'paid' });
      setPayments(prev => [newPayment, ...prev]);
      setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'paid' as const } : i));
      setPayDialog(false);
      showToast(`Paiement ${METHOD_LABEL[payMethod]} de ${fmt(total)} F CFA enregistré`);
      recordInvoicePaymentEntry(orgId, {
        invoiceId:  invoice.id,
        total,
        date:       today,
        clientName: client.name,
        tvaRetenue:         tvaRetenue       > 0 ? tvaRetenue       : undefined,
        serviceWithholding: serviceWithholding > 0 ? serviceWithholding : undefined,
      }).catch(err => {
        console.error('[recordInvoicePaymentEntry] failed:', err);
        showToast('Écriture comptable non enregistrée. Vérifiez la comptabilité.', true);
      });
    } catch (err) {
      console.error('Payment recording failed:', err);
      showToast('Erreur lors de l\'enregistrement du paiement', true);
    }
  };

  return (
    <>
    <div className="main">
      {/* Topbar — breadcrumb variant */}
      <div className="topbar">
        <div className="crumbs">
          <button className="crumb-back" onClick={() => navigate('/invoices')} aria-label="Retour aux factures">
            <Icon name="arrow-left" ariaHidden />
          </button>
          <div className="crumb-text">
            <button className="crumb-link" onClick={() => navigate('/invoices')}>Factures</button>
            {' / '}<b>#{invoice.id}</b>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={handleDownloadPDF}>
            <Icon name="printer" ariaHidden /> Télécharger PDF
          </button>
          {canEdit && (
            <button className="btn" onClick={openEdit}>
              <Icon name="edit" ariaHidden /> Modifier
            </button>
          )}
          {(isOverdue || invoice.status === 'pending') && (
            <button className="btn btn-primary" onClick={handleSendReminder}>
              <Icon name="send" ariaHidden /> Envoyer une relance
            </button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="detail-grid">

          {/* Invoice paper */}
          <div className="paper">
            <div className="pp-top">
              <div className="pp-biz">
                <div className="pp-logo" aria-hidden="true"><BillioLogoSvg /></div>
                <div>
                  <div className="pp-biz-name">{orgSettings.name || 'Mon entreprise'}</div>
                  <div className="pp-biz-meta">
                    {[orgSettings.address, orgSettings.city, orgSettings.country].filter(Boolean).join(', ')}
                    {(orgSettings.ifu || orgSettings.rccm) && (
                      <><br />{[orgSettings.ifu && `${getFiscalIdLabel(orgSettings.country)} ${orgSettings.ifu}`, orgSettings.rccm && `RCCM ${orgSettings.rccm}`].filter(Boolean).join(' · ')}</>
                    )}
                    {(orgSettings.taxRegime || orgSettings.divisionFiscale) && (
                      <><br />{[orgSettings.taxRegime && `${orgSettings.taxRegime}`, orgSettings.divisionFiscale && `${orgSettings.divisionFiscale}`].filter(Boolean).join(' · ')}</>
                    )}
                    {(orgSettings.email || orgSettings.phone) && (
                      <><br />{[orgSettings.email, orgSettings.phone].filter(Boolean).join(' · ')}</>
                    )}
                  </div>
                </div>
              </div>
              <div className="pp-doc">
                <div className="pp-doc-title">Facture</div>
                <div className="pp-doc-num">#{invoice.id}</div>
                <div className={`pp-status st-${invoice.status}`}>{STATUS_LABEL[invoice.status]}</div>
              </div>
            </div>

            <div className="pp-parties">
              <div>
                <div className="pp-block-label">Facturé à</div>
                <div className="pp-client-name">{client.name}</div>
                <div className="pp-client-meta">{[client.city, client.country].filter(Boolean).join(', ')}</div>
                {(client.contact || client.email || client.phone) && (
                  <div className="pp-client-meta" style={{ marginTop: 2 }}>
                    {client.contact && <div>Contact : {client.contact}</div>}
                    {client.phone   && <div>Tél : {client.phone}</div>}
                    {client.email   && <div>Email : {client.email}</div>}
                  </div>
                )}
                {(client.ifu || client.rccm || client.taxRegime || client.fiscalDivision) && (
                  <div className="pp-compliance-ids">
                    {client.ifu            && <span>{getFiscalIdLabel(client.country)} {client.ifu}</span>}
                    {client.rccm           && <span>RCCM {client.rccm}</span>}
                    {client.taxRegime      && <span>{client.taxRegime}</span>}
                    {client.fiscalDivision && <span>{client.fiscalDivision}</span>}
                  </div>
                )}
              </div>
              <div>
                <div className="pp-block-label">Détails</div>
                <div className="pp-meta-grid">
                  <div className="k">Émis le</div>
                  <div className="v">{fmtDateLong(invoice.issued)}</div>
                  <div className="k">Échéance</div>
                  <div className={`v${isOverdue ? ' due' : ''}`}>{fmtDateLong(invoice.due)}</div>
                  <div className="k">Paiement</div>
                  <div className="v">{orgSettings.paymentTerms || 'Net 14 jours'}</div>
                  <div className="k">Livraison</div>
                  <div className="v">{orgSettings.deliveryTerms || 'À convenir'}</div>
                  <div className="k">Référence</div>
                  <div className="v">{invoice.subject}</div>
                </div>
              </div>
            </div>

            <table className="li-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Unité</th>
                  <th className="r">Qté</th>
                  <th className="r">Prix unitaire</th>
                  <th className="r">Montant</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '16px 0' }}>Aucune ligne</td></tr>
                ) : lines.map(li => (
                  <tr key={li.id}>
                    <td><div className="li-desc">{li.desc}</div></td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{li.unit ?? 'unité'}</td>
                    <td className="r">{li.qty}</td>
                    <td className="r">{fmt(li.price)}</td>
                    <td className="r">{fmt(li.qty * li.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pp-totals">
              <div className="pp-totals-inner">
                <div className="tot-row"><span>Sous-total HT</span><span className="tv">{fmt(subtotal)} F CFA</span></div>
                {discountPct > 0 && (
                  <div className="tot-row"><span>Remise ({discountPct}%)</span><span className="tv" style={{ color: 'var(--color-text-secondary)' }}>−{fmt(discountAmt)} F CFA</span></div>
                )}
                {canInvoiceTVA && <div className="tot-row"><span>TVA (18 %)</span><span className="tv">{fmt(tax)} F CFA</span></div>}
                {invoice.status === 'paid' && (
                  <div className="tot-row"><span>Montant payé</span><span className="tv paid-amt">−{fmt(total)} F CFA</span></div>
                )}
                <div className="tot-row grand"><span>Total dû</span><span className="tv">{invoice.status === 'paid' ? '0' : fmt(total)} F CFA</span></div>
              </div>
            </div>

            <div className="pp-pay">
              <div>
                <div className="pp-block-label">Modes de paiement</div>
                <div className="pp-pay-methods">
                  <div className="pp-pm">
                    <Icon name="device-mobile" ariaHidden />
                    <span>Mobile Money — <b>MTN 70 12 34 56</b> · Orange 76 98 76 54</span>
                  </div>
                  <div className="pp-pm">
                    <Icon name="activity" ariaHidden />
                    <span>Wave — <b>billio.app/pay/{invoice.id.toLowerCase()}</b></span>
                  </div>
                  <div className="pp-pm">
                    <Icon name="building-bank" ariaHidden />
                    <span>Ecobank — <b>BF76 0001 2345 6789</b></span>
                  </div>
                </div>
              </div>
              <div>
                <div className="pp-block-label">Notes</div>
                <div className="pp-note">
                  Merci pour votre confiance. Paiement à régler sous 14 jours.
                  Tout retard entraîne une pénalité de 2 % par mois.
                </div>
              </div>
            </div>

            {/* Pay online block */}
            <div className="pp-payonline">
              <div className="pp-qr" aria-hidden="true">
                <QrCodeSvg />
              </div>
              <div className="pp-po-text">
                <div className="pp-po-title">Payer en ligne</div>
                <div className="pp-po-url">billio.app/pay/{invoice.id.toLowerCase()}</div>
                <div className="pp-po-hint">Scannez le QR ou cliquez sur le lien — Mobile Money, Wave, carte acceptés.</div>
              </div>
              <div className="pp-po-btn">
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://billio.app/pay/${invoice.id.toLowerCase()}`);
                    showToast('Lien copié');
                  }}
                >
                  <Icon name="external-link" size={14} /> Ouvrir
                </button>
              </div>
            </div>

            <div className="pp-foot">Studio Wend SARL · Facture générée via Billio · TVA applicable au taux en vigueur</div>
          </div>

          {/* Rail */}
          <aside className="rail">
            <div className="rail-card">
              <div className="rail-due-label">Montant dû</div>
              <div className="rail-due-amt tnum">
                {fmt(total)}<span className="cur">F CFA</span>
              </div>
              {isOverdue && (
                <div className="rail-due-sub">
                  <Icon name="alert-triangle" ariaHidden />
                  5 jours de retard · éch. {fmtDate(invoice.due)}
                </div>
              )}
              <div className="rail-actions">
                {(isOverdue || invoice.status === 'pending') && (<>
                  <button className="btn btn-primary btn-block" onClick={() => { setPayRef(''); setPayMethod('cash'); setTvaRetenue(0); setServiceWithholding(0); setPayDialog(true); }}>
                    <Icon name="cash" ariaHidden /> Enregistrer un paiement
                  </button>
                  <button
                    className="btn btn-block"
                    onClick={() => window.open(`https://billio.app/pay/${invoice.id.toLowerCase()}`, '_blank')}
                  >
                    <Icon name="external-link" ariaHidden /> Ouvrir la page de paiement
                  </button>
                  <button
                    className="btn btn-block"
                    onClick={() => {
                      navigator.clipboard?.writeText(`https://billio.app/pay/${invoice.id.toLowerCase()}`);
                      showToast('Lien de paiement copié');
                    }}
                  >
                    <Icon name="link" ariaHidden /> Copier le lien
                  </button>
                  <button className="btn btn-block" onClick={handleSendReminder}>
                    <Icon name="send" ariaHidden /> Envoyer une relance
                  </button>
                </>)}
                <button className="btn btn-block" onClick={handleDownloadPDF}>
                  <Icon name="printer" ariaHidden /> Télécharger PDF
                </button>
                <div className="rail-divider" />
                <button className="btn btn-block" onClick={handleDuplicate}>
                  <Icon name="copy" ariaHidden /> Dupliquer
                </button>
                <button className="btn btn-block btn-ghost btn-danger" onClick={handleDelete}>
                  <Icon name="trash" ariaHidden /> Supprimer la facture
                </button>
              </div>
            </div>

            <div className="rail-card">
              <div className="rail-title">Activité</div>
              {timeline.map((entry, i) => (
                <div key={i} className="tl-item">
                  <div className={`tl-dot${entry.dot ? ` ${entry.dot}` : ''}`} />
                  <div>
                    <div className="tl-text">{entry.text}</div>
                    <div className="tl-time">{entry.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>

    {payDialog && (
      <div className="inv-overlay" onClick={() => setPayDialog(false)}>
        <div className="inv-modal" onClick={e => e.stopPropagation()}>
          <div className="inv-modal-head">
            <div className="inv-modal-title">
              <Icon name="cash" size={16} ariaHidden />
              Enregistrer un paiement
            </div>
            <button className="btn btn-icon" onClick={() => setPayDialog(false)} aria-label="Fermer">
              <Icon name="x" size={16} ariaHidden />
            </button>
          </div>
          <div className="inv-modal-body">
            <div>
              <div className="form-label">Méthode de paiement</div>
              <div className="method-pick" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                {(['cash', 'wire', 'momo', 'cheque'] as PayMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`mp-opt${payMethod === m ? ' active' : ''}`}
                    onClick={() => setPayMethod(m)}
                  >
                    <Icon name={m === 'cash' ? 'cash' : m === 'wire' ? 'building-bank' : m === 'momo' ? 'device-mobile' : 'writing'} size={18} ariaHidden />
                    <span>{METHOD_LABEL[m]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Référence (optionnel)</label>
              <input
                className="form-input"
                type="text"
                value={payRef}
                onChange={e => setPayRef(e.target.value)}
                placeholder={REF_PLACEHOLDER[payMethod]}
              />
            </div>
            {canInvoiceTVA && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Retenue TVA (30 % = {fmt(Math.round(tax * 0.30))} F)</span>
                  <button
                    type="button"
                    style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => setTvaRetenue(Math.round(tax * 0.30))}
                  >
                    Appliquer 30 %
                  </button>
                </label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={tax}
                  value={tvaRetenue || ''}
                  placeholder="0"
                  onChange={e => setTvaRetenue(Math.max(0, Math.min(tax, Number(e.target.value) || 0)))}
                />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              {(() => {
                const suggested = clientWithholdingScenario
                  ? calculateServiceWithholding(discountedSub, clientWithholdingScenario)
                  : null;
                const belowThreshold = discountedSub < SERVICE_WITHHOLDING_THRESHOLD;
                const RATE_LABEL: Record<string, string> = {
                  'resident-with-ifu':    '5 %',
                  'resident-without-ifu': '25 %',
                  'construction':         '1 %',
                  'non-resident':         '20 %',
                };
                return (<>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Retenue à la source services (Art.207/212)</span>
                    {suggested !== null && !belowThreshold && (
                      <button
                        type="button"
                        style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => setServiceWithholding(suggested)}
                      >
                        Appliquer {RATE_LABEL[clientWithholdingScenario!]} ({fmt(suggested)} F)
                      </button>
                    )}
                  </label>
                  {belowThreshold ? (
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '6px 0' }}>
                      Montant HT sous le seuil de {fmt(SERVICE_WITHHOLDING_THRESHOLD)} F — pas de retenue requise (Art.208.3)
                    </div>
                  ) : (
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      value={serviceWithholding || ''}
                      placeholder={suggested !== null ? `Suggéré : ${fmt(suggested)} F` : '0'}
                      onChange={e => setServiceWithholding(Math.max(0, Number(e.target.value) || 0))}
                    />
                  )}
                </>);
              })()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div>Montant facturé : <b>{fmt(total)} F CFA</b></div>
              {(tvaRetenue > 0 || serviceWithholding > 0) && (<>
                {tvaRetenue > 0       && <div style={{ color: '#2E7D32' }}>TVA retenue (4449) : −{fmt(tvaRetenue)} F</div>}
                {serviceWithholding > 0 && <div style={{ color: '#B26A09' }}>Ret. services (4091) : −{fmt(serviceWithholding)} F</div>}
                <div style={{ fontWeight: 700 }}>Vous recevrez : {fmt(total - tvaRetenue - serviceWithholding)} F CFA</div>
              </>)}
            </div>
          </div>
          <div className="inv-modal-foot">
            <button className="btn" onClick={() => setPayDialog(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleConfirmPayment}>
              <Icon name="check" size={14} ariaHidden /> Confirmer
            </button>
          </div>
        </div>
      </div>
    )}
      {/* Edit panel */}
      <div className={`scrim${editOpen ? ' open' : ''}`} onClick={() => setEditOpen(false)} />
      <div className={`new-inv-panel${editOpen ? ' open' : ''}`} role="dialog" aria-label="Modifier la facture" aria-modal="true">
        <div className="panel-slide-head">
          <div>
            <div className="panel-slide-title">Modifier la facture</div>
            <div className="panel-slide-sub">#{invoice.id}</div>
          </div>
          <button className="icon-btn" onClick={() => setEditOpen(false)} aria-label="Fermer">
            <Icon name="x" size={15} ariaHidden />
          </button>
        </div>

        <div className="panel-body">
          <div className="form-group">
            <label className="form-label">Client</label>
            <select className="form-input" value={eClient} onChange={e => setEClient(e.target.value)}>
              <option value="">Sélectionner un client…</option>
              {Object.entries(clientsMap).map(([code, c]) => (
                <option key={code} value={code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date de facturation</label>
              <input type="date" className="form-input" value={eDate} onChange={e => setEDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date d'échéance</label>
              <input type="date" className="form-input" value={eDue} onChange={e => setEDue(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Référence / Objet</label>
            <input type="text" className="form-input" placeholder="ex. Développement web — sprint 5"
              maxLength={255} value={eSubject} onChange={e => setESubject(e.target.value)} />
          </div>

          <div className="subhead"><span>Lignes de facturation</span></div>
          <div className="line-items-head">
            <div className="li-col">Description</div>
            <div className="li-col">Unité</div>
            <div className="li-col right">Qté</div>
            <div className="li-col right">Prix</div>
            <div />
          </div>

          {eLines.map((li, idx) => (
            <div key={li.id} className="line-item">
              <div className="line-item-row">
                <input className="li-input" placeholder="Description du service" value={li.desc}
                  aria-label={`Description, ligne ${idx + 1}`}
                  onChange={e => updateELine(li.id, 'desc', e.target.value)} />
                <select className="li-input" value={li.unit ?? 'unité'}
                  aria-label={`Unité, ligne ${idx + 1}`}
                  onChange={e => updateELine(li.id, 'unit', e.target.value)}>
                  {['unité','heure','jour','mois','an','projet','article','licence'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <input className="li-input num" type="number" min="0" value={li.qty}
                  aria-label={`Quantité, ligne ${idx + 1}`}
                  onChange={e => updateELine(li.id, 'qty', e.target.value)} />
                <input className="li-input num" type="number" min="0" value={li.price || ''}
                  placeholder="0" aria-label={`Prix unitaire, ligne ${idx + 1}`}
                  onChange={e => updateELine(li.id, 'price', e.target.value)} />
                <button className="li-del" onClick={() => setELines(prev => prev.length > 1 ? prev.filter(l => l.id !== li.id) : prev)} aria-label={`Supprimer la ligne ${idx + 1}`}>
                  <Icon name="trash" size={15} ariaHidden />
                </button>
              </div>
            </div>
          ))}

          <div className="line-actions">
            <button className="add-line" onClick={() => setELines(prev => [...prev, newLineItem()])}>
              <Icon name="plus" size={14} ariaHidden /> Ajouter une ligne
            </button>
            {products.length > 0 && (
              <div className="product-picker-wrap" ref={pickerRef}>
                <button className="catalog-btn" onClick={() => setShowPicker(v => !v)}>
                  <Icon name="package" size={14} ariaHidden /> Depuis le catalogue
                </button>
                {showPicker && (
                  <div className="product-picker-dropdown">
                    <input autoFocus placeholder="Rechercher…" value={pickerQuery}
                      onChange={e => setPickerQuery(e.target.value)} />
                    {filteredProducts.length === 0
                      ? <div className="picker-empty">Aucun produit trouvé</div>
                      : filteredProducts.map(p => (
                          <div key={p.id} className="picker-item" onClick={() => {
                            setELines(prev => [...prev, newLineItem(p.name, 1, p.price, p.unit, p.id)]);
                            setShowPicker(false); setPickerQuery('');
                          }}>
                            <div>
                              <div className="picker-item-name">{p.name}</div>
                              <div className="picker-item-meta">{p.unit}</div>
                            </div>
                            <div className="picker-item-price">{fmt(p.price)} F</div>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="total-block">
            <div className="total-row"><span>Sous-total HT</span><span>{fmt(eSubtotal)} F CFA</span></div>
            <div className="total-row" style={{ alignItems: 'center' }}>
              <span>Remise (%)</span>
              <input
                type="number" min="0" max="100" step="0.5"
                className="form-input"
                style={{ width: 80, textAlign: 'right', padding: '3px 8px', fontSize: 13 }}
                value={eDiscount || ''}
                placeholder="0"
                onChange={e => setEDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              />
            </div>
            {eDiscount > 0 && <div className="total-row" style={{ color: 'var(--color-text-secondary)' }}><span>Montant remise</span><span>−{fmt(eDiscountAmt)} F CFA</span></div>}
            {canInvoiceTVA && <div className="total-row"><span>TVA (18 %)</span><span>{fmt(eTax)} F CFA</span></div>}
            <div className="total-row final"><span>Total à payer</span><span>{fmt(eTotal)} F CFA</span></div>
          </div>
        </div>

        <div className="panel-footer">
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditOpen(false)}>
            Annuler
          </button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving} onClick={handleSaveEdit}>
            <Icon name="check" ariaHidden /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {deleteDialog && (
        <ConfirmModal
          title="Supprimer la facture"
          body={`Supprimer la facture #${invoice.id} ? Cette action est irréversible et effacera également les écritures comptables associées.`}
          confirmLabel="Supprimer la facture"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteDialog(false)}
        />
      )}
    </>
  );
}
