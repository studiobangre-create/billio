import Icon from '../../components/Icon';
import { PageSkeleton } from '../../components/SkeletonLoader';
import KPIStrip from '../../components/accounting/KPIStrip';
import JournalBadge from '../../components/accounting/JournalBadge';
import type { JournalEntry } from '../../lib/accounting-data';
import { fmt, fmtCompact } from '../../lib/accounting-data';
import { useTaxData } from '../../lib/accounting-hooks';

const TVA_RATE = 0.18;

interface TaxLine {
  entryId: string;
  journal: string;
  label: string;
  piece: string;
  date: string;
  htBase: number;
  tvaAmount: number;
  type: 'collected' | 'deductible';
}

function sumPostedCredit(entries: JournalEntry[], acct: string): number {
  return entries
    .filter(e => e.posted)
    .flatMap(e => e.lines)
    .filter(l => l.acct === acct)
    .reduce((s, l) => s + l.c, 0);
}

function buildTaxLines(entries: JournalEntry[]): TaxLine[] {
  const lines: TaxLine[] = [];
  for (const e of entries) {
    if (!e.posted) continue;
    for (const l of e.lines) {
      if (l.acct === '443' && l.c > 0) {
        lines.push({
          entryId: e.id, journal: e.journal, label: e.label, piece: e.piece, date: e.date,
          htBase: Math.round(l.c / TVA_RATE),
          tvaAmount: l.c,
          type: 'collected',
        });
      }
      if (l.acct === '445' && l.d > 0) {
        lines.push({
          entryId: e.id, journal: e.journal, label: e.label, piece: e.piece, date: e.date,
          htBase: Math.round(l.d / TVA_RATE),
          tvaAmount: l.d,
          type: 'deductible',
        });
      }
    }
  }
  return lines.sort((a, b) => a.date < b.date ? -1 : 1);
}

export default function TaxPage() {
  const { data, loading } = useTaxData();

  if (loading) return <PageSkeleton title="Fiscalité" variant="accounting" rows={6} />;

  const entries  = data?.entries  ?? [];
  const journals = data?.journals ?? {};

  const taxLines   = buildTaxLines(entries);
  const collected  = taxLines.filter(l => l.type === 'collected').reduce((s, l) => s + l.tvaAmount, 0);
  const deductible = taxLines.filter(l => l.type === 'deductible').reduce((s, l) => s + l.tvaAmount, 0);
  const netDue     = collected - deductible;

  const collectedLines  = taxLines.filter(l => l.type === 'collected');
  const deductibleLines = taxLines.filter(l => l.type === 'deductible');

  // Derived from posted payroll entries (OD journal) — accounts 4421 and 4423
  const iriAmount = sumPostedCredit(entries, '4421');
  const tmsAmount = sumPostedCredit(entries, '4423');

  const deadlines: { label: string; date: string; amount: number; status: 'overdue' | 'pending' | 'upcoming'; category: string }[] = [
    // Overdue
    { label: 'TVM — Taxe sur la Valeur Marginale 2026', date: '2026-03-31', amount: 0, status: 'overdue', category: 'Annuelle' },
    // Monthly — derived from journal entries; IRB requires income computation so stays 0
    { label: 'IRB Déclaration Définitive — juin 2026', date: '2026-07-10', amount: 0, status: 'pending', category: 'Mensuelle' },
    { label: 'TCA régime normal (10%) — juin 2026', date: '2026-07-15', amount: netDue > 0 ? netDue : 0, status: 'pending', category: 'Mensuelle' },
    { label: 'IRI — Impôt/Revenu sur Salaire juin 2026', date: '2026-07-15', amount: iriAmount, status: 'pending', category: 'Mensuelle' },
    { label: 'TMS — Taxe sur Masse Salariale (2%) juin 2026', date: '2026-07-15', amount: tmsAmount, status: 'pending', category: 'Mensuelle' },
    // October annual — flat fees set by tax authority, no journal basis
    { label: 'Droit de licence des Étrangers 2026', date: '2026-10-20', amount: 0, status: 'upcoming', category: 'Annuelle' },
    { label: 'Taxe sur Actions 2026', date: '2026-10-20', amount: 0, status: 'upcoming', category: 'Annuelle' },
    { label: 'Autres Droits de Licence 2026', date: '2026-10-30', amount: 0, status: 'upcoming', category: 'Annuelle' },
    { label: 'Impôt/Revenu Base Forfaitaire 2026', date: '2026-10-30', amount: 0, status: 'upcoming', category: 'Annuelle' },
    // Nov–Dec
    { label: '2ᵉ acomptes provisionnels — nov. 2026', date: '2026-11-15', amount: 0, status: 'upcoming', category: 'Acomptes' },
    { label: 'Patente 2026', date: '2026-12-15', amount: 0, status: 'upcoming', category: 'Annuelle' },
    { label: 'TCA régime simplifié 2026', date: '2026-12-15', amount: 0, status: 'upcoming', category: 'Annuelle' },
    { label: '3ᵉ acomptes provisionnels — déc. 2026', date: '2026-12-15', amount: 0, status: 'upcoming', category: 'Acomptes' },
    // Feb next year
    { label: '3ᵉ acomptes provisionnels entreprises — fév. 2027', date: '2027-02-15', amount: 0, status: 'upcoming', category: 'Acomptes' },
  ];

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <Icon name="percentage" size={13} /> Accounting
          </div>
          <div className="page-title">Fiscalité</div>
          <div className="page-sub">TVA et obligations fiscales · Juin 2026</div>
        </div>
        <div className="topbar-actions">
          <span className="period-pill"><span className="dot" />Exercice 2026 · ouvert</span>
          <button className="btn"><Icon name="download" />Exporter déclaration</button>
        </div>
      </div>

      <div className="content">
        <KPIStrip items={[
          { icon: 'receipt', iconBg: '#E7F3E2', iconColor: '#2E7D32', label: '443 — TVA collectée', value: fmtCompact(collected), unit: 'F CFA', sub: `${collectedLines.length} écriture${collectedLines.length > 1 ? 's' : ''}` },
          { icon: 'receipt', iconBg: '#FAEEDA', iconColor: '#B26A09', label: '445 — TVA déductible', value: fmtCompact(deductible), unit: 'F CFA', sub: `${deductibleLines.length} écriture${deductibleLines.length > 1 ? 's' : ''}` },
          { icon: 'percentage', iconBg: netDue >= 0 ? '#E9F0FA' : '#FCEBEB', iconColor: netDue >= 0 ? 'var(--brand)' : '#A32D2D', label: '4441 — TVA nette due', value: fmtCompact(Math.abs(netDue)), unit: 'F CFA', sub: netDue >= 0 ? 'À verser à l\'État' : 'Crédit de TVA' },
          { icon: 'calendar', iconBg: '#FAEEDA', iconColor: '#B26A09', label: 'Prochaine échéance', value: '10 juil.', sub: 'IRB Déclaration Définitive juin 2026' },
        ]} />

        {/* Lines table */}
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '13px 18px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="receipt" size={15} />Détail TVA · Juin 2026
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 1fr 120px 110px 110px', gap: 12, padding: '9px 18px', background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            {['Date', 'Journal', 'Libellé', 'Base HT', 'TVA', 'Type'].map((h, i) => (
              <div key={i} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: i >= 3 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>

          {taxLines.map((l, i) => {
            const j = journals[l.journal];
            const isCollected = l.type === 'collected';
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 70px 1fr 120px 110px 110px', gap: 12, padding: '11px 18px', borderTop: '0.5px solid var(--color-border-tertiary)', alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{l.date.slice(5)}</span>
                {j ? <JournalBadge journal={j} /> : <span>{l.journal}</span>}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.label}</span>
                <span className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.htBase)}</span>
                <span className="mono" style={{ textAlign: 'right', fontWeight: 700, color: isCollected ? '#2E7D32' : '#B26A09' }}>
                  {isCollected ? '+' : '−'}{fmt(l.tvaAmount)}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: isCollected ? '#E7F3E2' : '#FAEEDA', color: isCollected ? '#2E7D32' : '#B26A09' }}>
                    {isCollected ? 'Collectée' : 'Déductible'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Totals row */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 1fr 120px 110px 110px', gap: 12, padding: '11px 18px', borderTop: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', fontWeight: 700, alignItems: 'center', fontSize: 12.5 }}>
            <span /><span />
            <span>Total TVA nette</span>
            <span />
            <span className="mono" style={{ textAlign: 'right', fontSize: 13, color: netDue >= 0 ? '#2E7D32' : '#A32D2D' }}>{netDue >= 0 ? '+' : ''}{fmt(netDue)}</span>
            <span />
          </div>
        </div>

        {/* Tax calendar */}
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="calendar" size={15} />Calendrier fiscal
          </div>
          {deadlines.map((d, i) => {
            const iconBg = d.status === 'overdue' ? '#FCEBEB' : d.status === 'pending' ? '#FAEEDA' : 'var(--brand-tint)';
            const iconColor = d.status === 'overdue' ? '#A32D2D' : d.status === 'pending' ? '#B26A09' : 'var(--brand)';
            const badgeBg = d.status === 'overdue' ? '#FCEBEB' : d.status === 'pending' ? '#FAEEDA' : 'var(--color-background-secondary)';
            const badgeColor = d.status === 'overdue' ? '#A32D2D' : d.status === 'pending' ? '#B26A09' : 'var(--color-text-tertiary)';
            const badgeLabel = d.status === 'overdue' ? 'En retard' : d.status === 'pending' ? 'À déclarer' : 'À venir';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderTop: i > 0 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="calendar" size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                    {d.label}
                    <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 12, background: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>{d.category}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>Échéance : {d.date}</div>
                </div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 13.5, textAlign: 'right', flexShrink: 0 }}>
                  {fmt(d.amount)} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>F CFA</span>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: badgeBg, color: badgeColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {badgeLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
