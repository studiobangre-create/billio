import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import Icon from '../components/Icon';
import { PageSkeleton } from '../components/SkeletonLoader';
import { useApp } from '../context/AppContext';
import { removeInvoice, updateInvoice } from '../lib/api/invoices';
import { recordInvoicePaymentEntry, deleteInvoiceEntries } from '../lib/api/accounting';
import { fetchLineItems } from '../lib/api/line-items';
import { fmt, fmtDate, fmtDateLong, STATUS_LABEL } from '../data';
import { InvoicePDFDocument } from '../components/InvoicePDF';
import type { Status } from '../data';
import type { LineItem } from '../lib/schemas';

type DotKind = 'paid' | 'sent' | 'overdue' | 'viewed' | '';
interface TlEntry { dot: DotKind; text: string; time: string; }

function timelineForStatus(status: Status, clientName: string): TlEntry[] {
  const created: TlEntry = { dot: '', text: 'Créée par Serge W.', time: '18 mai 2026, 16h55' };
  if (status === 'draft') return [created];
  const sent: TlEntry = { dot: 'sent', text: 'Envoyée par e-mail', time: '18 mai 2026, 17h02' };
  if (status === 'paid') {
    return [
      { dot: 'paid',   text: `Paiement reçu de ${clientName}`, time: '5 juin 2026, 14h00' },
      { dot: 'viewed', text: `Consultée par ${clientName}`,    time: '20 mai 2026, 9h18' },
      sent, created,
    ];
  }
  if (status === 'overdue') {
    return [
      { dot: 'sent',    text: `Relance envoyée à ${clientName}`, time: '4 juin 2026, 15h40' },
      { dot: 'overdue', text: 'Facture passée en retard',        time: '2 juin 2026, automatique' },
      { dot: 'viewed',  text: `Consultée par ${clientName}`,     time: '20 mai 2026, 9h18' },
      sent, created,
    ];
  }
  return [
    { dot: 'viewed', text: `Consultée par ${clientName}`, time: '20 mai 2026, 9h18' },
    sent, created,
  ];
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
  const { invoices, setInvoices, showToast, clientsMap, orgSettings, orgId, loading } = useApp();
  const [lines, setLines] = useState<LineItem[]>([]);

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

  const client    = clientsMap[invoice.client] ?? { name: invoice.client, city: '—', av: 'av-a' };
  const subtotal  = lines.reduce((s, li) => s + li.qty * li.price, 0);
  const tax       = Math.round(subtotal * 0.18);
  const total     = subtotal + tax;
  const isOverdue = invoice.status === 'overdue';
  const timeline  = timelineForStatus(invoice.status, client.name);

  const handleSendReminder = () => showToast(`Relance envoyée à ${client.name}`);
  const handleDuplicate    = () => showToast('Facture dupliquée en brouillon');
  const handleDownloadPDF = async () => {
    const blob = await pdf(
      <InvoicePDFDocument
        invoice={invoice}
        lines={lines}
        client={client}
        biz={orgSettings}
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
  const handleDelete = async () => {
    if (window.confirm(`Supprimer la facture #${invoice.id} ? Cette action est irréversible.`)) {
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      await removeInvoice(invoice.id);
      await deleteInvoiceEntries(orgId, invoice.id);
      showToast('Facture supprimée');
      navigate('/invoices');
    }
  };
  const handleMarkPaid = async () => {
    setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'paid' } : i));
    await updateInvoice(invoice.id, { status: 'paid' });
    await recordInvoicePaymentEntry(orgId, {
      invoiceId: invoice.id,
      total,
      date: new Date().toISOString().slice(0, 10),
      clientName: client.name,
    });
    showToast('Facture marquée comme payée');
  };

  return (
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
          <button className="btn">
            <Icon name="edit" ariaHidden /> Modifier
          </button>
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
                      <><br />{[orgSettings.ifu && `IFU ${orgSettings.ifu}`, orgSettings.rccm && `RCCM ${orgSettings.rccm}`].filter(Boolean).join(' · ')}</>
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
                <div className="pp-client-meta">{client.city}, Burkina Faso</div>
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
                  <div className="v">{fmtDateLong(invoice.issued)}</div>
                  <div className="k">Échéance</div>
                  <div className={`v${isOverdue ? ' due' : ''}`}>{fmtDateLong(invoice.due)}</div>
                  <div className="k">Conditions</div>
                  <div className="v">Net 14 jours</div>
                  <div className="k">Référence</div>
                  <div className="v">{invoice.subject}</div>
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
                  <button className="btn btn-primary btn-block" onClick={handleMarkPaid}>
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
  );
}
