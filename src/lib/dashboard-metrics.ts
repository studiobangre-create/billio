// Dashboard figures computed from the organisation's own invoices and
// payments (no hard-coded trends).

import type { CreditNote, Invoice, Payment } from '@/lib/schemas';
import { invoiceBalance, todayISO } from '@/lib/invoice-status';

export interface DashboardMetrics {
  totalInvoiced:  number;
  /** Issued (non-draft) total this calendar month vs last; null when last month had none. */
  invoicedThisMonth: number;
  monthOverMonthPct: number | null;
  outstanding:    number;
  overdueCount:   number;
  /** Completed payments received. */
  collected:      number;
  collectionRate: number;
  /** Average days from issue to the payment that settled it; null without settled invoices. */
  avgDaysToPay:   number | null;
  settledCount:   number;
}

const DAY = 86_400_000;
const monthKey = (iso: string) => iso.slice(0, 7);

export function dashboardMetrics(
  invoices: Invoice[],
  payments: Payment[],
  creditNotes: Pick<CreditNote, 'invoiceId' | 'amount'>[] = [],
  today: string = todayISO(),
): DashboardMetrics {
  const issued = invoices.filter(i => i.status !== 'draft');
  const totalInvoiced = issued.reduce((s, i) => s + i.amount, 0);

  const thisMonth = monthKey(today);
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
  const lastMonth = d.toISOString().slice(0, 7);
  const invoicedThisMonth = issued.filter(i => monthKey(i.issued) === thisMonth).reduce((s, i) => s + i.amount, 0);
  const invoicedLastMonth = issued.filter(i => monthKey(i.issued) === lastMonth).reduce((s, i) => s + i.amount, 0);
  const monthOverMonthPct = invoicedLastMonth > 0
    ? Math.round(((invoicedThisMonth - invoicedLastMonth) / invoicedLastMonth) * 100)
    : null;

  const open = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
  const outstanding = open.reduce((s, i) => s + invoiceBalance(i, payments, creditNotes).balance, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const collected = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const collectionRate = totalInvoiced ? Math.min(100, Math.round((collected / totalInvoiced) * 100)) : 0;

  // Paid invoices: the date of their last completed payment marks settlement
  const delays: number[] = [];
  for (const inv of invoices.filter(i => i.status === 'paid')) {
    const dates = payments.filter(p => p.inv === inv.id && p.status === 'completed').map(p => p.date).sort();
    const settled = dates[dates.length - 1];
    if (!settled) continue;
    const days = Math.round((Date.parse(settled + 'T00:00:00Z') - Date.parse(inv.issued + 'T00:00:00Z')) / DAY);
    if (Number.isFinite(days) && days >= 0) delays.push(days);
  }
  const avgDaysToPay = delays.length ? Math.round((delays.reduce((s, x) => s + x, 0) / delays.length) * 10) / 10 : null;

  return { totalInvoiced, invoicedThisMonth, monthOverMonthPct, outstanding, overdueCount, collected, collectionRate, avgDaysToPay, settledCount: delays.length };
}
