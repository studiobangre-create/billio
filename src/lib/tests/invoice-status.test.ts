import { describe, it, expect } from 'vitest';
import { invoiceBalance, daysOverdue, effectiveStatus, withEffectiveStatus, todayISO } from '@/lib/invoice-status';
import type { Payment } from '@/lib/schemas';

const pay = (inv: string, amount: number, status: Payment['status'] = 'completed'): Payment => ({
  id: 'PAI-' + amount, date: '2026-10-01', client: 'CLI-0001', inv, method: 'cash', ref: '', amount, status, source: 'manual',
});

describe('invoiceBalance', () => {
  const inv = { id: 'INV-0001', amount: 100_000 };

  it('is the full amount with no payments', () => {
    expect(invoiceBalance(inv, [])).toEqual({ paid: 0, credited: 0, balance: 100_000 });
  });

  it('subtracts completed payments for this invoice only', () => {
    const r = invoiceBalance(inv, [pay('INV-0001', 40_000), pay('INV-0002', 99_000), pay('INV-0001', 5_000, 'pending')]);
    expect(r.paid).toBe(40_000);
    expect(r.balance).toBe(60_000);
  });

  it('subtracts credit notes', () => {
    const r = invoiceBalance(inv, [pay('INV-0001', 50_000)], [{ invoiceId: 'INV-0001', amount: 20_000 }, { invoiceId: 'INV-0009', amount: 1 }]);
    expect(r).toEqual({ paid: 50_000, credited: 20_000, balance: 30_000 });
  });

  it('never goes negative', () => {
    expect(invoiceBalance(inv, [pay('INV-0001', 120_000)]).balance).toBe(0);
  });
});

describe('daysOverdue', () => {
  it('is 0 on or before the due date', () => {
    expect(daysOverdue('2026-10-15', '2026-10-15')).toBe(0);
    expect(daysOverdue('2026-10-15', '2026-10-01')).toBe(0);
  });

  it('counts whole days after the due date, across months', () => {
    expect(daysOverdue('2026-10-15', '2026-10-16')).toBe(1);
    expect(daysOverdue('2026-09-30', '2026-10-27')).toBe(27);
  });

  it('is 0 for an unparseable date', () => {
    expect(daysOverdue('not-a-date', '2026-10-27')).toBe(0);
  });
});

describe('effectiveStatus', () => {
  it('turns a pending invoice past its due date into overdue', () => {
    expect(effectiveStatus({ status: 'pending', due: '2026-10-01' }, '2026-10-02')).toBe('overdue');
  });

  it('keeps pending until the due date has passed', () => {
    expect(effectiveStatus({ status: 'pending', due: '2026-10-02' }, '2026-10-02')).toBe('pending');
  });

  it('leaves paid and draft invoices alone', () => {
    expect(effectiveStatus({ status: 'paid', due: '2026-01-01' }, '2026-10-27')).toBe('paid');
    expect(effectiveStatus({ status: 'draft', due: '2026-01-01' }, '2026-10-27')).toBe('draft');
  });
});

describe('withEffectiveStatus', () => {
  it('returns the same object when the status is unchanged', () => {
    const a = { id: 'a', status: 'paid' as const, due: '2026-01-01' };
    const b = { id: 'b', status: 'pending' as const, due: '2026-01-01' };
    const [ra, rb] = withEffectiveStatus([a, b], '2026-10-27');
    expect(ra).toBe(a);
    expect(rb).toEqual({ ...b, status: 'overdue' });
  });
});

describe('todayISO', () => {
  it('formats the local date', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
