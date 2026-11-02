import { describe, it, expect } from 'vitest';
import { paymentMethodLines } from '@/lib/payment-methods';
import type { PaymentSettings } from '@/lib/api/payment-settings';

// Only the invoice-display fields matter here; type-only import keeps the
// Supabase client out of the test.
const DEFAULT_PAYMENT_SETTINGS = {
  methodMtnEnabled: false, methodMtnPhone: '',
  methodOrangeEnabled: false, methodOrangePhone: '',
  methodWaveEnabled: false, methodWavePhone: '',
  methodBankEnabled: false, methodBankIban: '',
  methodCashEnabled: false,
} as PaymentSettings;

describe('paymentMethodLines', () => {
  it('is empty when nothing is enabled', () => {
    expect(paymentMethodLines(DEFAULT_PAYMENT_SETTINGS)).toEqual([]);
  });

  it('lists enabled methods with their details, in a fixed order', () => {
    const lines = paymentMethodLines({
      ...DEFAULT_PAYMENT_SETTINGS,
      methodWaveEnabled: true,   methodWavePhone: ' 77 00 11 22 ',
      methodMtnEnabled: true,    methodMtnPhone: '70 00 00 01',
      methodBankEnabled: true,   methodBankIban: 'BF00 1234',
      methodCashEnabled: true,
    });
    expect(lines).toEqual([
      { label: 'MTN Mobile Money',  value: '70 00 00 01' },
      { label: 'Wave',              value: '77 00 11 22' },
      { label: 'Virement bancaire', value: 'BF00 1234' },
      { label: 'Espèces',           value: 'acceptées' },
    ]);
  });

  it('skips enabled methods with no number or IBAN', () => {
    expect(paymentMethodLines({ ...DEFAULT_PAYMENT_SETTINGS, methodOrangeEnabled: true, methodOrangePhone: '  ' })).toEqual([]);
  });
});
