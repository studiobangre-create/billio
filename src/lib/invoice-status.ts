// Derived invoice state: outstanding balance and overdue status.
// The database stores 'pending' for issued invoices; whether one is overdue
// depends on today's date, so it is computed here rather than stored.

import type { Invoice, Payment, CreditNote } from '@/lib/schemas';

export interface InvoiceBalance {
  paid:     number;
  credited: number;
  /** Amount still to collect (never negative). */
  balance:  number;
}

/** Mirrors public.invoice_balance(): amount − completed payments − credit notes. */
export function invoiceBalance(
  invoice: Pick<Invoice, 'id' | 'amount'>,
  payments: Payment[],
  creditNotes: Pick<CreditNote, 'invoiceId' | 'amount'>[] = [],
): InvoiceBalance {
  const paid = payments
    .filter(p => p.inv === invoice.id && p.status === 'completed')
    .reduce((s, p) => s + p.amount, 0);
  const credited = creditNotes
    .filter(c => c.invoiceId === invoice.id)
    .reduce((s, c) => s + c.amount, 0);
  return { paid, credited, balance: Math.max(0, invoice.amount - paid - credited) };
}

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Whole days past the due date (0 if not yet due). */
export function daysOverdue(due: string, today: string = todayISO()): number {
  const ms = Date.parse(today + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z');
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86_400_000)) : 0;
}

/** Status to display: a pending invoice past its due date is overdue. */
export function effectiveStatus(
  invoice: Pick<Invoice, 'status' | 'due'>,
  today: string = todayISO(),
): Invoice['status'] {
  if (invoice.status === 'pending' && daysOverdue(invoice.due, today) > 0) return 'overdue';
  return invoice.status;
}

/** Returns the invoices with their display status applied. */
export function withEffectiveStatus<T extends Pick<Invoice, 'status' | 'due'>>(
  invoices: T[],
  today: string = todayISO(),
): T[] {
  return invoices.map(inv => {
    const status = effectiveStatus(inv, today);
    return status === inv.status ? inv : { ...inv, status };
  });
}
