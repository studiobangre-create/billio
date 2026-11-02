// Payment instructions printed on invoices and quotes, from the methods the
// organisation enabled in Paramètres → Paiements.

import type { PaymentSettings } from '@/lib/api/payment-settings';

export interface PaymentMethodLine {
  label: string;
  value: string;
}

/** Enabled methods with the details customers need; methods without a number/IBAN are skipped. */
export function paymentMethodLines(s: PaymentSettings): PaymentMethodLine[] {
  const lines: PaymentMethodLine[] = [];
  const add = (enabled: boolean, label: string, value: string) => {
    if (enabled && value.trim()) lines.push({ label, value: value.trim() });
  };
  add(s.methodMtnEnabled,    'MTN Mobile Money', s.methodMtnPhone);
  add(s.methodOrangeEnabled, 'Orange Money',     s.methodOrangePhone);
  add(s.methodWaveEnabled,   'Wave',             s.methodWavePhone);
  add(s.methodBankEnabled,   'Virement bancaire', s.methodBankIban);
  if (s.methodCashEnabled) lines.push({ label: 'Espèces', value: 'acceptées' });
  return lines;
}
