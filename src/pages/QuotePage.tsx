import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import Icon from '../components/Icon';
import { PageSkeleton } from '../components/SkeletonLoader';
import { useApp } from '../context/AppContext';
import { updateQuote } from '../lib/api/quotes';
import { createInvoice } from '../lib/api/invoices';
import { fetchLineItems, saveLineItems } from '../lib/api/line-items';
import { recordInvoiceIssuanceEntry } from '../lib/api/accounting';
import { InvoicePDFDocument } from '../components/InvoicePDF';
import { fmt, fmtDateLong, nextId } from '../data';
import type { LineItem } from '../lib/schemas';

const STATUS_LABEL: Record<string, string> = {
  draft:    'Brouillon',
  sent:     'Envoyé',
  accepted: 'Accepté',
  declined: 'Refusé',
  expired:  'Expiré',
  invoiced: 'Facturé',
};

const BillioLogoSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5.5 3.2h10.2c.6 0 1.1.2 1.5.6l3 3c.4.4.6.9.6 1.5v12c0 .7-.6 1.1-1.2.8l-1.6-.8-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.6.8c-.6.3-1.3-.1-1.3-.8V4.7c0-.8.7-1.5 1.5-1.5z" fill="#fff" fillOpacity="0.96"/>
    <path d="M8 8.2h6M8 11.4h7M8 14.6h4" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export default function QuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { quotes, setQuotes, invoices, setInvoices, showToast, clientsMap, orgSettings, orgId, loading } = useApp();
  const [lines, setLines] = useState<LineItem[]>([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (id) fetchLineItems(undefined, id).then(setLines).catch(() => setLines([]));
  }, [id]);

  if (loading) return <PageSkeleton title="Devis" variant="table-only" metrics={0} rows={4} />;

  const quote = quotes.find(q => q.id === id);
  if (!quote) {
    return (
      <div className="main">
        <div className="topbar">
          <div className="crumbs">
            <button className="crumb-back" onClick={() => navigate('/quotes')} aria-label="Retour">
              <Icon name="arrow-left" ariaHidden />
            </button>
            <div className="crumb-text">Devis introuvable</div>
          </div>
        </div>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
          Le devis #{id} n'existe pas.
        </div>
      </div>
    );
  }

  const client   = clientsMap[quote.client] ?? { name: quote.client, city: '—', av: 'av-a' };
  const subtotal = lines.reduce((s, li) => s + li.qty * li.price, 0);
  const tax      = Math.round(subtotal * 0.18);
  const total    = subtotal + tax;

  const quoteUrl    = window.location.href;
  const isTerminal  = ['invoiced', 'declined', 'expired'].includes(quote.status);
  const canConvert  = !isTerminal;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(quoteUrl);
    showToast('Lien copié dans le presse-papiers');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Devis #${quote.id} — ${orgSettings.name || 'Billio'}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint notre devis #${quote.id} d'un montant de ${fmt(total)} F CFA.\n\nObjet : ${quote.subject}\nValide jusqu'au : ${fmtDateLong(quote.valid)}\n\nConsultez le devis en ligne :\n${quoteUrl}\n\nCordialement,\n${orgSettings.name || ''}`.trim()
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Bonjour,\n\nVoici notre devis *#${quote.id}* d'un montant de *${fmt(total)} F CFA*.\n\n📋 *${quote.subject}*\n📅 Valide jusqu'au ${fmtDateLong(quote.valid)}\n\nConsultez-le ici : ${quoteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    posthog.capture('quote_shared_whatsapp', { quote_id: quote.id });
  };

  const handleDownloadPDF = async () => {
    const blob = await pdf(
      <InvoicePDFDocument
        invoice={{ id: quote.id, subject: quote.subject, client: quote.client, issued: quote.issued, due: quote.valid, amount: total, status: 'pending' }}
        lines={lines}
        client={client}
        biz={orgSettings}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devis-${quote.id.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    posthog.capture('quote_pdf_downloaded', { quote_id: quote.id });
  };

  const handleConvertToInvoice = async () => {
    if (converting) return;
    setConverting(true);
    const today   = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const invId   = nextId(invoices);
    const htAmount  = Math.round(total / 1.18);
    const tvaAmount = total - htAmount;
    const newInv = { id: invId, subject: quote.subject, client: quote.client, issued: today, due: dueDate, amount: total, status: 'pending' as const };
    const prevStatus = quote.status;
    try {
      setInvoices(prev => [newInv, ...prev]);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'invoiced' } : q));
      const quoteLines = await fetchLineItems(undefined, quote.id);
      await createInvoice(orgId, newInv);
      await saveLineItems(orgId, quoteLines, { invoiceId: invId });
      await updateQuote(quote.id, { status: 'invoiced' });
      await recordInvoiceIssuanceEntry(orgId, { invoiceId: invId, htAmount, tvaAmount, date: today, clientName: client.name });
      posthog.capture('quote_converted_to_invoice', { quote_id: quote.id, invoice_id: invId });
      showToast(`Devis ${quote.id} → Facture #${invId} créée`);
      navigate(`/invoices/${invId}`);
    } catch {
      showToast('Erreur lors de la conversion. Veuillez réessayer.', true);
      setInvoices(prev => prev.filter(i => i.id !== invId));
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: prevStatus } : q));
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="main">
      <div className="topbar">
        <div className="crumbs">
          <button className="crumb-back" onClick={() => navigate('/quotes')} aria-label="Retour aux devis">
            <Icon name="arrow-left" ariaHidden />
          </button>
          <div className="crumb-text">
            <button className="crumb-link" onClick={() => navigate('/quotes')}>Devis</button>
            {' / '}<b>#{quote.id}</b>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={handleDownloadPDF}>
            <Icon name="printer" ariaHidden /> Télécharger PDF
          </button>
          {canConvert && (
            <button className="btn btn-primary" onClick={handleConvertToInvoice} disabled={converting}>
              <Icon name="arrow-right" ariaHidden />
              {converting ? 'Conversion…' : 'Créer une facture'}
            </button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="detail-grid">

          {/* Quote paper */}
          <div className="paper">
            <div className="pp-top">
              <div className="pp-biz">
                <div className="pp-logo" aria-hidden="true"><BillioLogoSvg /></div>
                <div>
                  <div className="pp-biz-name">{orgSettings.name || 'Mon entreprise'}</div>
                  <div className="pp-biz-meta">
                    {[orgSettings.address, orgSettings.city, orgSettings.country].filter(Boolean).join(', ')}
                    {(orgSettings.ifu || orgSettings.rccm) && (
                      <><br />{[orgSettings.ifu && `IFU ${orgSettings.ifu}`, orgSettings.rccm && `RCCM ${orgSettings.rccm}`].filter(Boolean).join(' · ')}</>
                    )}
                    {(orgSettings.email || orgSettings.phone) && (
                      <><br />{[orgSettings.email, orgSettings.phone].filter(Boolean).join(' · ')}</>
                    )}
                  </div>
                </div>
              </div>
              <div className="pp-doc">
                <div className="pp-doc-title">Devis</div>
                <div className="pp-doc-num">#{quote.id}</div>
                <div className={`pp-status sq-${quote.status}`}>{STATUS_LABEL[quote.status]}</div>
              </div>
            </div>

            <div className="pp-parties">
              <div>
                <div className="pp-block-label">Adressé à</div>
                <div className="pp-client-name">{client.name}</div>
                <div className="pp-client-meta">{client.city}</div>
                {(client.ifu || client.rccm || client.taxRegime) && (
                  <div className="pp-compliance-ids">
                    {client.ifu       && <span>IFU {client.ifu}</span>}
                    {client.rccm      && <span>RCCM {client.rccm}</span>}
                    {client.taxRegime && <span>{client.taxRegime}</span>}
                  </div>
                )}
              </div>
              <div>
                <div className="pp-block-label">Détails</div>
                <div className="pp-meta-grid">
                  <div className="k">Émis le</div>
                  <div className="v">{fmtDateLong(quote.issued)}</div>
                  <div className="k">Valide jusqu'au</div>
                  <div className={`v${quote.status === 'expired' ? ' due' : ''}`}>{fmtDateLong(quote.valid)}</div>
                  <div className="k">Référence</div>
                  <div className="v">{quote.subject}</div>
                </div>
              </div>
            </div>

            <table className="li-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="r">Qté</th>
                  <th className="r">Prix unitaire</th>
                  <th className="r">Montant</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '16px 0' }}>Aucune ligne</td></tr>
                ) : lines.map(li => (
                  <tr key={li.id}>
                    <td><div className="li-desc">{li.desc}</div></td>
                    <td className="r">{li.qty}</td>
                    <td className="r">{fmt(li.price)}</td>
                    <td className="r">{fmt(li.qty * li.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pp-totals">
              <div className="pp-totals-inner">
                <div className="tot-row"><span>Sous-total</span><span className="tv">{fmt(subtotal)} F CFA</span></div>
                <div className="tot-row"><span>TVA (18 %)</span><span className="tv">{fmt(tax)} F CFA</span></div>
                <div className="tot-row grand"><span>Total estimé</span><span className="tv">{fmt(total)} F CFA</span></div>
              </div>
            </div>

            <div className="pp-foot">{orgSettings.name || 'Mon entreprise'} · Devis généré via Billio · Ce document n'est pas une facture</div>
          </div>

          {/* Rail */}
          <aside className="rail">
            <div className="rail-card">
              <div className="rail-due-label">Montant estimé</div>
              <div className="rail-due-amt tnum">
                {fmt(total)}<span className="cur">F CFA</span>
              </div>
              {quote.status === 'expired' && (
                <div className="rail-due-sub">
                  <Icon name="alert-triangle" ariaHidden />
                  Devis expiré le {fmtDateLong(quote.valid)}
                </div>
              )}
              {quote.expSoon && quote.status === 'sent' && (
                <div className="rail-due-sub" style={{ color: '#B45309' }}>
                  <Icon name="clock-pause" ariaHidden />
                  Expire bientôt
                </div>
              )}

              <div className="rail-actions">
                {canConvert && (
                  <button className="btn btn-primary btn-block" onClick={handleConvertToInvoice} disabled={converting}>
                    <Icon name="arrow-right" ariaHidden />
                    {converting ? 'Conversion…' : 'Créer une facture'}
                  </button>
                )}

                <div className="rail-divider" />

                <button className="btn btn-block" onClick={handleCopyLink}>
                  <Icon name="link" ariaHidden /> Copier le lien
                </button>
                <button className="btn btn-block" onClick={handleShareEmail}>
                  <Icon name="mail" ariaHidden /> Envoyer par e-mail
                </button>
                <button className="btn btn-block" onClick={handleShareWhatsApp}>
                  <Icon name="brand-whatsapp" ariaHidden /> Partager sur WhatsApp
                </button>

                <div className="rail-divider" />

                <button className="btn btn-block" onClick={handleDownloadPDF}>
                  <Icon name="printer" ariaHidden /> Télécharger PDF
                </button>
              </div>
            </div>

            <div className="rail-card">
              <div className="rail-title">Statut</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className={`status-pill sq-${quote.status}`}>{STATUS_LABEL[quote.status]}</span>
              </div>
              <div className="rail-title">Informations</div>
              <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Émis le</span>
                  <span style={{ fontWeight: 600 }}>{fmtDateLong(quote.issued)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Valide jusqu'au</span>
                  <span style={{ fontWeight: 600, color: quote.status === 'expired' ? '#A32D2D' : undefined }}>{fmtDateLong(quote.valid)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
