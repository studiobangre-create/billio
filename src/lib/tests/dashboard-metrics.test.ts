import { describe, it, expect } from 'vitest';
import { dashboardMetrics } from '@/lib/dashboard-metrics';
import type { Invoice, Payment } from '@/lib/schemas';

const inv = (id: string, issued: string, amount: number, status: Invoice['status']): Invoice =>
  ({ id, subject: '', client: 'C', issued, due: issued, amount, status } as Invoice);
const pay = (inv: string, date: string, amount: number): Payment =>
  ({ id: inv + date, date, client: 'C', inv, method: 'cash', ref: '', amount, status: 'completed', source: 'manual' } as Payment);

describe('dashboardMetrics', () => {
  const invoices = [
    inv('A', '2026-10-05', 100_000, 'paid'),
    inv('B', '2026-11-01', 150_000, 'pending'),
    inv('C', '2026-11-02', 50_000, 'overdue'),
    inv('D', '2026-11-02', 999_999, 'draft'),
  ];
  const payments = [pay('A', '2026-10-15', 100_000), pay('B', '2026-11-02', 40_000)];
  const m = dashboardMetrics(invoices, payments, [], '2026-11-03');

  it('ignores drafts and compares this month with last month', () => {
    expect(m.totalInvoiced).toBe(300_000);
    expect(m.invoicedThisMonth).toBe(200_000);
    expect(m.monthOverMonthPct).toBe(100);
  });

  it('counts what is actually still owed and received', () => {
    expect(m.outstanding).toBe(160_000); // 110 000 left on B + 50 000 on C
    expect(m.collected).toBe(140_000);
    expect(m.overdueCount).toBe(1);
  });

  it('subtracts credit notes from what is still owed', () => {
    const credited = dashboardMetrics(invoices, payments, [{ invoiceId: 'C', amount: 20_000 }], '2026-11-03');
    expect(credited.outstanding).toBe(140_000);
  });

  it('averages days from issue to settlement', () => {
    expect(m.avgDaysToPay).toBe(10);
    expect(m.settledCount).toBe(1);
  });

  it('has no trend or delay without history', () => {
    const empty = dashboardMetrics([inv('B', '2026-11-01', 1, 'pending')], [], [], '2026-11-03');
    expect(empty.monthOverMonthPct).toBeNull();
    expect(empty.avgDaysToPay).toBeNull();
  });
});
