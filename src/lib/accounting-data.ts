/* ============================================================
   Billio — accounting data (SYSCOHADA, Système Normal)
   Single entity · Studio Wend SARL · exercice 2026 · F CFA
   ============================================================ */

export interface AccountClass {
  name: string;
  short: string;
  color: string;
}

export interface Account {
  num: string;
  label: string;
  nature: 'D' | 'C';
}

export interface Journal {
  code: string;
  name: string;
  icon: string;
  color: string;
}

export interface EntryLine {
  acct: string;
  d: number;
  c: number;
}

export interface JournalEntry {
  id: string;
  journal: string;
  date: string;
  piece: string;
  label: string;
  posted: boolean;
  lines: EntryLine[];
}

export interface FixedAsset {
  id: string;
  name: string;
  acct: string;
  icon: string;
  acquisitionDate: string;
  usefulLife: number;
  method: string;
  grossValue: number;
}

export type PaymentMethod = 'wire' | 'cash' | 'mobile';

export interface SupplierBill {
  id: string;
  supplier: string;
  city: string;
  piece: string;
  date: string;
  dueDate: string;
  htAmount: number;
  tvaAmount: number;
  status: 'open' | 'overdue' | 'paid';
  paymentMethod: PaymentMethod;
  acctLines: { acct: string; label: string; amount: number; side: 'D' | 'C' }[];
  ifu?: string;
  rccm?: string;
  taxRegime?: string;
}

export interface LedgerRow {
  entry: JournalEntry;
  d: number;
  c: number;
  running: number;
}

/* ---------- Account classes ---------- */
export const CLASSES: Record<number, AccountClass> = {
  1: { name: 'Ressources durables',                       short: 'Financement',     color: 'var(--c1)' },
  2: { name: 'Actif immobilisé',                          short: 'Immobilisations', color: 'var(--c2)' },
  3: { name: 'Stocks',                                    short: 'Stocks',          color: 'var(--c3)' },
  4: { name: 'Comptes de tiers',                          short: 'Tiers',           color: 'var(--c4)' },
  5: { name: 'Trésorerie',                                short: 'Trésorerie',      color: 'var(--c5)' },
  6: { name: 'Charges',                                   short: 'Charges',         color: 'var(--c6)' },
  7: { name: 'Produits',                                  short: 'Produits',        color: 'var(--c7)' },
  8: { name: 'Autres charges et produits (HAO)',          short: 'HAO',             color: 'var(--c8)' },
  9: { name: 'Engagements & comptabilité analytique',     short: 'Analytique',      color: 'var(--c9)' },
};

/* ---------- Chart of accounts ---------- */
export const ACCOUNTS: Account[] = [
  { num: '101',  label: 'Capital social',                                  nature: 'C' },
  { num: '106',  label: 'Réserves',                                        nature: 'C' },
  { num: '110',  label: 'Report à nouveau créditeur',                      nature: 'C' },
  { num: '162',  label: 'Emprunts auprès des établissements de crédit',    nature: 'C' },
  { num: '211',  label: 'Logiciels et licences',                           nature: 'D' },
  { num: '2441', label: 'Matériel de bureau',                              nature: 'D' },
  { num: '2451', label: 'Matériel de transport',                           nature: 'D' },
  { num: '281',  label: 'Amortissements des immobilisations incorporelles',nature: 'C' },
  { num: '2818', label: 'Amortissements du matériel',                      nature: 'C' },
  { num: '311',  label: 'Marchandises',                                    nature: 'D' },
  { num: '401',  label: 'Fournisseurs',                                    nature: 'C' },
  { num: '411',  label: 'Clients',                                         nature: 'D' },
  { num: '421',  label: 'Personnel, rémunérations dues',                   nature: 'C' },
  { num: '4311', label: 'CNSS, cotisations patronales',                    nature: 'C' },
  { num: '4312', label: 'CNSS, cotisations salariales',                    nature: 'C' },
  { num: '4421', label: 'État, IRI retenu à la source',                    nature: 'C' },
  { num: '4423', label: 'État, TMS (Taxe sur Masse Salariale)',             nature: 'C' },
  { num: '443',  label: 'État, TVA facturée',                              nature: 'C' },
  { num: '445',  label: 'État, TVA récupérable',                           nature: 'D' },
  { num: '521',  label: 'Banques',                                         nature: 'D' },
  { num: '571',  label: 'Caisse',                                          nature: 'D' },
  { num: '601',  label: 'Achats de marchandises',                          nature: 'D' },
  { num: '605',  label: 'Autres achats',                                   nature: 'D' },
  { num: '627',  label: 'Services bancaires et assimilés',                 nature: 'D' },
  { num: '661',  label: 'Rémunérations directes versées au personnel',     nature: 'D' },
  { num: '664',  label: 'Charges sociales patronales',                     nature: 'D' },
  { num: '671',  label: 'Intérêts des emprunts',                           nature: 'D' },
  { num: '681',  label: 'Dotations aux amortissements d\'exploitation',    nature: 'D' },
  { num: '701',  label: 'Ventes de marchandises',                          nature: 'C' },
  { num: '706',  label: 'Services vendus',                                 nature: 'C' },
];

/* ---------- Opening balances (signed: débit +, crédit −) ---------- */
export const OPENING: Record<string, number> = {
  '211': 1800000, '2441': 2400000, '2451': 6500000, '311': 1250000,
  '411': 3420000, '521': 4180000, '571': 320000,
  '101': -5000000, '106': -1200000, '110': -870000, '162': -8180000,
  '2818': -2100000, '281': -600000, '401': -1920000,
};

/* ---------- Journals ---------- */
export const JOURNALS: Record<string, Journal> = {
  VE: { code: 'VE', name: 'Ventes',              icon: 'receipt',          color: 'var(--c7)' },
  AC: { code: 'AC', name: 'Achats',              icon: 'truck-delivery',   color: 'var(--c6)' },
  BQ: { code: 'BQ', name: 'Banque',              icon: 'building-bank',    color: 'var(--c5)' },
  CA: { code: 'CA', name: 'Caisse',              icon: 'cash',             color: 'var(--c3)' },
  OD: { code: 'OD', name: 'Opérations diverses', icon: 'arrows-exchange',  color: 'var(--c2)' },
};

/* ---------- Journal entries (each balanced) ---------- */
export const ENTRIES: JournalEntry[] = [
  { id: 'VE-0042', journal: 'VE', date: '2026-06-02', piece: 'FACT INV-0042', label: 'Facture client — TechKonsult', posted: true,
    lines: [{ acct: '411', d: 908600, c: 0 }, { acct: '706', d: 0, c: 770000 }, { acct: '443', d: 0, c: 138600 }] },
  { id: 'AC-0118', journal: 'AC', date: '2026-06-03', piece: 'BL FRN-0461', label: 'Fournitures de bureau — Sahel Office', posted: true,
    lines: [{ acct: '605', d: 250000, c: 0 }, { acct: '445', d: 45000, c: 0 }, { acct: '401', d: 0, c: 295000 }] },
  { id: 'BQ-0233', journal: 'BQ', date: '2026-06-04', piece: 'VIR 2026-0233', label: 'Règlement reçu — Sahel Banque (INV-0040)', posted: true,
    lines: [{ acct: '521', d: 1200000, c: 0 }, { acct: '411', d: 0, c: 1200000 }] },
  { id: 'VE-0043', journal: 'VE', date: '2026-06-06', piece: 'FACT INV-0043', label: 'Facture client — AgroMali SA', posted: true,
    lines: [{ acct: '411', d: 531000, c: 0 }, { acct: '706', d: 0, c: 450000 }, { acct: '443', d: 0, c: 81000 }] },
  { id: 'AC-0119', journal: 'AC', date: '2026-06-08', piece: 'BL FRN-0462', label: 'Achat marchandises — BurkinaFarm', posted: true,
    lines: [{ acct: '601', d: 600000, c: 0 }, { acct: '445', d: 108000, c: 0 }, { acct: '401', d: 0, c: 708000 }] },
  { id: 'CA-0051', journal: 'CA', date: '2026-06-10', piece: 'PC 2026-051', label: 'Carburant & menues dépenses', posted: true,
    lines: [{ acct: '605', d: 35000, c: 0 }, { acct: '445', d: 6300, c: 0 }, { acct: '571', d: 0, c: 41300 }] },
  { id: 'BQ-0234', journal: 'BQ', date: '2026-06-12', piece: 'VIR 2026-0234', label: 'Règlement fournisseur — Sahel Office', posted: true,
    lines: [{ acct: '401', d: 900000, c: 0 }, { acct: '521', d: 0, c: 900000 }] },
  { id: 'BQ-0235', journal: 'BQ', date: '2026-06-12', piece: 'AVIS 2026-0235', label: 'Frais & commissions bancaires', posted: true,
    lines: [{ acct: '627', d: 12000, c: 0 }, { acct: '445', d: 2160, c: 0 }, { acct: '521', d: 0, c: 14160 }] },
  { id: 'VE-0044', journal: 'VE', date: '2026-06-15', piece: 'FACT INV-0044', label: 'Facture client — Orange Télécoms', posted: true,
    lines: [{ acct: '411', d: 377600, c: 0 }, { acct: '706', d: 0, c: 320000 }, { acct: '443', d: 0, c: 57600 }] },
  { id: 'OD-0027', journal: 'OD', date: '2026-06-28', piece: 'PAIE 2026-06', label: 'Paie du mois de juin — bulletin salarial', posted: true,
    lines: [
      { acct: '661',  d: 850000, c: 0 },  // Rémunérations brutes
      { acct: '4312', d: 0, c: 46750 },   // CNSS salarié 5.5%
      { acct: '4421', d: 0, c: 96000 },   // IRI retenu à la source (~12% base imposable)
      { acct: '421',  d: 0, c: 707250 },  // Net à payer (850 000 − 46 750 − 96 000)
    ] },
  { id: 'OD-0030', journal: 'OD', date: '2026-06-28', piece: 'PAIE 2026-06B', label: 'Charges patronales — juin', posted: true,
    lines: [
      { acct: '664',  d: 153000, c: 0 },  // Charges sociales patronales
      { acct: '4311', d: 0, c: 136000 },  // CNSS patronal 16%
      { acct: '4423', d: 0, c: 17000 },   // TMS 2%
    ] },
  { id: 'OD-0028', journal: 'OD', date: '2026-06-30', piece: 'OD 2026-028', label: 'Dotation aux amortissements — juin', posted: true,
    lines: [{ acct: '681', d: 180000, c: 0 }, { acct: '2818', d: 0, c: 150000 }, { acct: '281', d: 0, c: 30000 }] },
  { id: 'BQ-0236', journal: 'BQ', date: '2026-06-30', piece: 'ÉCH 2026-06', label: 'Échéance emprunt — capital + intérêts', posted: true,
    lines: [{ acct: '162', d: 250000, c: 0 }, { acct: '671', d: 45000, c: 0 }, { acct: '521', d: 0, c: 295000 }] },
  { id: 'OD-0029', journal: 'OD', date: '2026-06-30', piece: 'OD 2026-029', label: 'Régularisation TVA — brouillon', posted: false,
    lines: [{ acct: '443', d: 277200, c: 0 }, { acct: '445', d: 0, c: 161460 }, { acct: '521', d: 0, c: 115740 }] },
];

/* ---------- Fixed assets ---------- */
export const FIXED_ASSETS: FixedAsset[] = [
  {
    id: 'IMM-001', name: 'Logiciels & licences', acct: '211', icon: 'server',
    acquisitionDate: '2024-01-15', usefulLife: 3, method: 'Linéaire',
    grossValue: 1800000,
  },
  {
    id: 'IMM-002', name: 'Matériel de bureau', acct: '2441', icon: 'layout-dashboard',
    acquisitionDate: '2023-06-01', usefulLife: 5, method: 'Linéaire',
    grossValue: 2400000,
  },
  {
    id: 'IMM-003', name: 'Véhicule utilitaire', acct: '2451', icon: 'truck-delivery',
    acquisitionDate: '2022-03-20', usefulLife: 5, method: 'Linéaire',
    grossValue: 6500000,
  },
];

/* ---------- Supplier bills ---------- */
export const SUPPLIER_BILLS: SupplierBill[] = [
  {
    id: 'BILL-001', supplier: 'BurkinaFarm SARL', city: 'Ouagadougou',
    piece: 'BL FRN-0462', date: '2026-06-08', dueDate: '2026-07-08',
    htAmount: 600000, tvaAmount: 108000, status: 'open', paymentMethod: 'wire',
    acctLines: [
      { acct: '601', label: 'Achats de marchandises', amount: 600000, side: 'D' },
      { acct: '445', label: 'TVA récupérable', amount: 108000, side: 'D' },
      { acct: '401', label: 'Fournisseurs', amount: 708000, side: 'C' },
    ],
  },
  {
    id: 'BILL-002', supplier: 'Sahel Office', city: 'Bamako',
    piece: 'BL FRN-0461', date: '2026-06-03', dueDate: '2026-06-18',
    htAmount: 250000, tvaAmount: 45000, status: 'paid', paymentMethod: 'wire',
    acctLines: [
      { acct: '605', label: 'Autres achats', amount: 250000, side: 'D' },
      { acct: '445', label: 'TVA récupérable', amount: 45000, side: 'D' },
      { acct: '401', label: 'Fournisseurs', amount: 295000, side: 'C' },
    ],
  },
  {
    id: 'BILL-003', supplier: 'TotalEnergies BF', city: 'Ouagadougou',
    piece: 'FAC-2026-0815', date: '2026-05-20', dueDate: '2026-06-05',
    htAmount: 180000, tvaAmount: 32400, status: 'overdue', paymentMethod: 'mobile',
    acctLines: [
      { acct: '605', label: 'Autres achats', amount: 180000, side: 'D' },
      { acct: '445', label: 'TVA récupérable', amount: 32400, side: 'D' },
      { acct: '401', label: 'Fournisseurs', amount: 212400, side: 'C' },
    ],
  },
  {
    id: 'BILL-004', supplier: 'Orange Business CI', city: 'Abidjan',
    piece: 'INV-OB-04891', date: '2026-06-01', dueDate: '2026-07-01',
    htAmount: 95000, tvaAmount: 17100, status: 'open', paymentMethod: 'cash',
    acctLines: [
      { acct: '627', label: 'Services bancaires et assimilés', amount: 95000, side: 'D' },
      { acct: '445', label: 'TVA récupérable', amount: 17100, side: 'D' },
      { acct: '401', label: 'Fournisseurs', amount: 112100, side: 'C' },
    ],
  },
];

/* ---------- Helper functions ---------- */
export function fmt(n: number): string {
  const s = Math.abs(Math.round(n)).toLocaleString('fr-FR').replace(/ /g, ' ').replace(/ /g, ' ');
  return (n < 0 ? '−' : '') + s;
}

export function fmtCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1) + 'M';
  return Math.round(n).toLocaleString('fr-FR');
}

export function clsOf(num: string): number {
  return parseInt(num[0], 10);
}

const ACCOUNTS_MAP: Map<string, Account> = new Map(ACCOUNTS.map(a => [a.num, a]));

export function acctOf(num: string): Account | undefined {
  return ACCOUNTS_MAP.get(num);
}

export function openingOf(num: string): number {
  return OPENING[num] ?? 0;
}

export function movementsOf(num: string, includeDraft = false): { debit: number; credit: number } {
  let d = 0, c = 0;
  for (const e of ENTRIES) {
    if (!includeDraft && !e.posted) continue;
    for (const l of e.lines) {
      if (l.acct === num) { d += l.d; c += l.c; }
    }
  }
  return { debit: d, credit: c };
}

export function closingSigned(num: string, includeDraft = false): number {
  const m = movementsOf(num, includeDraft);
  return openingOf(num) + m.debit - m.credit;
}

export function allMovements(includeDraft = false): Map<string, { debit: number; credit: number }> {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const e of ENTRIES) {
    if (!includeDraft && !e.posted) continue;
    for (const l of e.lines) {
      const m = map.get(l.acct);
      if (m) { m.debit += l.d; m.credit += l.c; }
      else map.set(l.acct, { debit: l.d, credit: l.c });
    }
  }
  return map;
}

export function ledgerOf(num: string, includeDraft = false): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let running = openingOf(num);
  const sorted = [...ENTRIES].sort((a, b) => a.date < b.date ? -1 : 1);
  for (const e of sorted) {
    if (!includeDraft && !e.posted) continue;
    for (const l of e.lines) {
      if (l.acct !== num) continue;
      running += l.d - l.c;
      rows.push({ entry: e, d: l.d, c: l.c, running });
    }
  }
  return rows;
}

/* Amortization schedule for a fixed asset */
export interface AmortRow {
  year: number;
  annualDepreciation: number;
  cumulative: number;
  netValue: number;
}

export function amortSchedule(asset: FixedAsset): AmortRow[] {
  const annual = asset.grossValue / asset.usefulLife;
  const startYear = parseInt(asset.acquisitionDate.split('-')[0], 10);
  const rows: AmortRow[] = [];
  for (let i = 1; i <= asset.usefulLife; i++) {
    const cumulative = annual * i;
    rows.push({
      year: startYear + i - 1,
      annualDepreciation: annual,
      cumulative,
      netValue: Math.max(0, asset.grossValue - cumulative),
    });
  }
  return rows;
}

/* Accumulated depreciation for a fixed asset (based on ENTRIES + OPENING for amort accounts) */
export function netValueOf(asset: FixedAsset): number {
  const amortAcct = asset.acct === '211' ? '281' : '2818';
  const grossOpening = OPENING[asset.acct] ?? 0;
  const amortOpening = Math.abs(OPENING[amortAcct] ?? 0);
  const { credit } = movementsOf(amortAcct);
  const totalAmort = amortOpening + credit;
  return grossOpening - totalAmort;
}
