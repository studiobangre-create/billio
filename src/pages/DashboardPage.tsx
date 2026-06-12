import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { EmptyState, EmptyInline } from '../components/EmptyState';
import { ActivityEmptyIllustration, TopClientsEmptyIllustration } from '../components/PageEmptyIllustrations';
import { PageSkeleton } from '../components/SkeletonLoader';
import { useApp } from '../context/AppContext';
import { fmt, fmtCompact, fmtDate, fmtDue } from '../data';
import type { ActivityPart } from '../data';

function ActivityLine({ parts }: { parts: ActivityPart[] }) {
  return (
    <div className="act-text">
      {parts.map((p, i) => p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>)}
    </div>
  );
}

export default function DashboardPage() {
  const { invoices, activity, clientsMap, loading } = useApp();
  const navigate = useNavigate();

  if (loading) return <PageSkeleton title="Tableau de bord" variant="dashboard" />;

  const metrics = useMemo(() => {
    const totalInvoiced  = invoices.filter(i => i.status !== 'draft').reduce((s, i) => s + i.amount, 0);
    const collected      = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const outstanding    = invoices.filter(i => i.status === 'overdue' || i.status === 'pending').reduce((s, i) => s + i.amount, 0);
    const overdueCount   = invoices.filter(i => i.status === 'overdue').length;
    const collectionRate = totalInvoiced ? Math.round((collected / totalInvoiced) * 100) : 0;
    return { totalInvoiced, collected, outstanding, overdueCount, collectionRate };
  }, [invoices]);

  const topClients = useMemo(() => {
    const totals: Record<string, { sum: number; n: number }> = {};
    invoices.forEach(inv => {
      if (inv.status === 'draft') return;
      if (!totals[inv.client]) totals[inv.client] = { sum: 0, n: 0 };
      totals[inv.client].sum += inv.amount;
      totals[inv.client].n  += 1;
    });
    const ranked = Object.entries(totals).sort(([, a], [, b]) => b.sum - a.sum).slice(0, 4);
    const max    = ranked.length ? ranked[0][1].sum : 1;
    return ranked.map(([code, d]) => ({ code, client: clientsMap[code] ?? { name: code, city: '—', av: 'av-a' }, ...d, barPct: Math.round((d.sum / max) * 100) }));
  }, [invoices]);

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <div className="page-title">Tableau de bord</div>
          <div className="page-sub">Aperçu de juin 2026</div>
        </div>
        <div className="topbar-actions">
          <button className="btn"><Icon name="search" ariaHidden /> Rechercher</button>
          <button className="btn btn-icon" aria-label="Notifications"><Icon name="bell" ariaHidden /></button>
          <button className="btn btn-primary" onClick={() => navigate('/invoices')}>
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
            <div className="metric-value tnum">{fmtCompact(metrics.totalInvoiced)}<span className="metric-unit">F CFA</span></div>
            <div className="metric-change"><span className="up"><Icon name="trending-up" size={14} ariaHidden />+12 % MoM</span></div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <div className="metric-ico amber"><Icon name="clock-pause" size={15} ariaHidden /></div>
              <div className="metric-label">Impayé</div>
            </div>
            <div className="metric-value tnum">{fmtCompact(metrics.outstanding)}<span className="metric-unit">F CFA</span></div>
            <div className="metric-change"><span className="dn"><Icon name="alert-triangle" size={14} ariaHidden />{metrics.overdueCount} en retard</span></div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <div className="metric-ico green"><Icon name="cash" size={15} ariaHidden /></div>
              <div className="metric-label">Encaissé</div>
            </div>
            <div className="metric-value tnum">{fmtCompact(metrics.collected)}<span className="metric-unit">F CFA</span></div>
            <div className="metric-change"><span className="up"><Icon name="trending-up" size={14} ariaHidden />{metrics.collectionRate} % collecté</span></div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <div className="metric-ico violet"><Icon name="calendar-stats" size={15} ariaHidden /></div>
              <div className="metric-label">Délai moy. de paiement</div>
            </div>
            <div className="metric-value tnum">8,4<span className="metric-unit">jours</span></div>
            <div className="metric-change"><span className="up"><Icon name="trending-down" size={14} ariaHidden />−2,1 jours</span></div>
          </div>
        </div>

        {/* Recent invoices preview */}
        <div className="section-header">
          <div className="section-title">Factures récentes</div>
          <button className="panel-link" onClick={() => navigate('/invoices')}>Tout voir</button>
        </div>
        <div className="invoice-table" style={{ marginBottom: 18 }}>
          {invoices.length === 0 ? (
            <EmptyInline message="Aucune facture récente." />
          ) : (
          <>
          <div className="table-head grid-cols">
            <div className="th">Facture</div>
            <div className="th">Client</div>
            <div className="th">Émission / Échéance</div>
            <div className="th right">Montant</div>
            <div className="th">Statut</div>
            <div className="th" />
          </div>
          {invoices.slice(0, 4).map(inv => {
            const c = clientsMap[inv.client] ?? { name: inv.client, city: '—', av: 'av-a' };
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
                  <span className={`status-pill s-${inv.status}`}>
                    {{ paid: 'Payée', overdue: 'En retard', pending: 'En attente', draft: 'Brouillon' }[inv.status]}
                  </span>
                </div>
                <div />
              </div>
            );
          })}
          </>
          )}
        </div>

        {/* Bottom panels */}
        <div className="bottom-grid">
          {/* Recent activity */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Activité récente</div>
              <button className="panel-link">Tout voir</button>
            </div>
            {activity.length === 0 ? (
              <EmptyState
                illustration={<ActivityEmptyIllustration />}
                title="Aucune activité récente"
                description="Les actions sur vos factures, clients et paiements apparaîtront ici."
              />
            ) : activity.slice(0, 5).map((item, i) => (
              <div key={i} className="activity-item">
                <div className={`act-dot ${item.kind}`} />
                <div>
                  <ActivityLine parts={item.parts} />
                  <div className="act-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Top clients */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Meilleurs clients par revenu</div>
              <button className="panel-link" onClick={() => navigate('/clients')}>Gérer</button>
            </div>
            {topClients.length === 0 ? (
              <EmptyState
                illustration={<TopClientsEmptyIllustration />}
                title="Aucune donnée client"
                description="Les clients avec le plus de revenus générés apparaîtront ici."
              />
            ) : topClients.map(({ code, client, sum, n, barPct }) => (
              <div key={code} className="client-item">
                <div className={`client-av lg ${client.av}`}>{code}</div>
                <div className="client-info">
                  <div className="client-name">{client.name}</div>
                  <div className="client-inv-count">{n} facture{n !== 1 ? 's' : ''}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
                <div className="client-total tnum">{fmtCompact(sum)} F CFA</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
