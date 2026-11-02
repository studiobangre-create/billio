import { describe, it, expect } from 'vitest';
import { invoiceMessage, quoteMessage } from '@/lib/document-messages';

const base = { invoiceId: 'INV-0007', clientName: 'Sahel Banque', orgName: 'Studio X', amountDue: 150000, due: '2026-11-15', methods: [] };

describe('invoiceMessage', () => {
  it('builds the sending message with amount and due date', () => {
    const m = invoiceMessage('send', base);
    expect(m.subject).toBe('Facture INV-0007 — Studio X');
    expect(m.message).toContain('Bonjour Sahel Banque');
    expect(m.message).toMatch(/150\s000 F CFA/);
    expect(m.message).toContain('15 novembre 2026');
    expect(m.message).toContain('Studio X');
    // Email/WhatsApp hand-offs carry text only: never claim an attachment
    expect(m.message).not.toContain('ci-joint');
    expect(m.message).not.toContain('Modes de paiement');
  });

  it('lists payment methods when there are some', () => {
    const m = invoiceMessage('send', { ...base, methods: [{ label: 'Wave', value: '77 00 00 00' }] });
    expect(m.message).toContain('• Wave : 77 00 00 00');
  });

  it('mentions how late an overdue invoice is', () => {
    expect(invoiceMessage('reminder', { ...base, overdueDays: 3 }).message).toContain('échue depuis 3 jours');
    expect(invoiceMessage('reminder', { ...base, overdueDays: 1 }).message).toContain('échue depuis 1 jour ');
    expect(invoiceMessage('reminder', base).message).toContain('arrive à échéance le 15 novembre 2026');
  });
});

describe('quoteMessage', () => {
  it('builds send and follow-up messages', () => {
    const opts = { quoteId: 'QUO-0002', clientName: 'Faso Energy', orgName: '', amount: 50000, validUntil: '2026-12-01' };
    expect(quoteMessage('send', opts).subject).toBe('Devis QUO-0002 — Devis');
    expect(quoteMessage('send', opts).message).not.toContain('ci-joint');
    expect(quoteMessage('reminder', opts).message).toContain('valable jusqu\'au 1 décembre 2026');
  });
});
