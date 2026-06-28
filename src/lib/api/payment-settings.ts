import { supabase } from '@/lib/supabase';

export type ProviderStatus = 'pending' | 'active' | 'suspended';

export interface PaymentSettings {
  // Invoice display methods
  methodMtnEnabled:    boolean;
  methodMtnPhone:      string;
  methodOrangeEnabled: boolean;
  methodOrangePhone:   string;
  methodWaveEnabled:   boolean;
  methodWavePhone:     string;
  methodBankEnabled:   boolean;
  methodBankIban:      string;
  methodCashEnabled:   boolean;
  // Provider
  activeProvider:       'paystack' | 'pawapay' | null;
  providerMode:         'test' | 'live';
  providerStatus:       ProviderStatus;
  autoReconcile:        boolean;
  checkoutMomoEnabled:  boolean;
  checkoutWaveEnabled:  boolean;
  checkoutCardEnabled:  boolean;
  checkoutBankEnabled:  boolean;
  // Paystack sub-account (settlement info, no secrets)
  paystackBusinessName:     string;
  paystackSettlementBank:   string;
  paystackAccountNumber:    string;
  paystackAccountName:      string;   // resolved by platform
  paystackSubaccountCode:   string;   // set by platform after creation
  paystackPercentageCharge: number;
  // PawaPay sub-account
  pawapayCountry:          string;
  pawapayCorrespondent:    string;
  pawapayPhone:            string;
  pawapayCorrespondentId:  string;    // set by platform after activation
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  methodMtnEnabled:    false,
  methodMtnPhone:      '',
  methodOrangeEnabled: false,
  methodOrangePhone:   '',
  methodWaveEnabled:   false,
  methodWavePhone:     '',
  methodBankEnabled:   false,
  methodBankIban:      '',
  methodCashEnabled:   false,
  activeProvider:          null,
  providerMode:            'test',
  providerStatus:          'pending',
  autoReconcile:           true,
  checkoutMomoEnabled:     true,
  checkoutWaveEnabled:     true,
  checkoutCardEnabled:     true,
  checkoutBankEnabled:     false,
  paystackBusinessName:    '',
  paystackSettlementBank:  '',
  paystackAccountNumber:   '',
  paystackAccountName:     '',
  paystackSubaccountCode:  '',
  paystackPercentageCharge: 0,
  pawapayCountry:          '',
  pawapayCorrespondent:    '',
  pawapayPhone:            '',
  pawapayCorrespondentId:  '',
};

function dbToSettings(row: Record<string, unknown>): PaymentSettings {
  return {
    methodMtnEnabled:    Boolean(row.method_mtn_enabled),
    methodMtnPhone:      String(row.method_mtn_phone     ?? ''),
    methodOrangeEnabled: Boolean(row.method_orange_enabled),
    methodOrangePhone:   String(row.method_orange_phone  ?? ''),
    methodWaveEnabled:   Boolean(row.method_wave_enabled),
    methodWavePhone:     String(row.method_wave_phone    ?? ''),
    methodBankEnabled:   Boolean(row.method_bank_enabled),
    methodBankIban:      String(row.method_bank_iban     ?? ''),
    methodCashEnabled:   Boolean(row.method_cash_enabled),
    activeProvider:      (row.active_provider  as 'paystack' | 'pawapay' | null) ?? null,
    providerMode:        (row.provider_mode    as 'test' | 'live')               ?? 'test',
    providerStatus:      (row.provider_status  as ProviderStatus)                ?? 'pending',
    autoReconcile:       Boolean(row.auto_reconcile),
    checkoutMomoEnabled: Boolean(row.checkout_momo_enabled),
    checkoutWaveEnabled: Boolean(row.checkout_wave_enabled),
    checkoutCardEnabled: Boolean(row.checkout_card_enabled),
    checkoutBankEnabled: Boolean(row.checkout_bank_enabled),
    paystackBusinessName:     String(row.paystack_business_name     ?? ''),
    paystackSettlementBank:   String(row.paystack_settlement_bank   ?? ''),
    paystackAccountNumber:    String(row.paystack_account_number    ?? ''),
    paystackAccountName:      String(row.paystack_account_name      ?? ''),
    paystackSubaccountCode:   String(row.paystack_subaccount_code   ?? ''),
    paystackPercentageCharge: Number(row.paystack_percentage_charge ?? 0),
    pawapayCountry:          String(row.pawapay_country           ?? ''),
    pawapayCorrespondent:    String(row.pawapay_correspondent     ?? ''),
    pawapayPhone:            String(row.pawapay_phone             ?? ''),
    pawapayCorrespondentId:  String(row.pawapay_correspondent_id  ?? ''),
  };
}

export async function fetchPaymentSettings(orgId: string): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from('org_payment_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...DEFAULT_PAYMENT_SETTINGS };
  return dbToSettings(data as Record<string, unknown>);
}

export async function upsertPaymentSettings(
  orgId: string,
  patch: Partial<PaymentSettings>,
): Promise<void> {
  const db: Record<string, unknown> = { org_id: orgId, updated_at: new Date().toISOString() };

  const map: Array<[keyof PaymentSettings, string]> = [
    ['methodMtnEnabled',         'method_mtn_enabled'],
    ['methodMtnPhone',           'method_mtn_phone'],
    ['methodOrangeEnabled',      'method_orange_enabled'],
    ['methodOrangePhone',        'method_orange_phone'],
    ['methodWaveEnabled',        'method_wave_enabled'],
    ['methodWavePhone',          'method_wave_phone'],
    ['methodBankEnabled',        'method_bank_enabled'],
    ['methodBankIban',           'method_bank_iban'],
    ['methodCashEnabled',        'method_cash_enabled'],
    ['activeProvider',           'active_provider'],
    ['providerMode',             'provider_mode'],
    ['providerStatus',           'provider_status'],
    ['autoReconcile',            'auto_reconcile'],
    ['checkoutMomoEnabled',      'checkout_momo_enabled'],
    ['checkoutWaveEnabled',      'checkout_wave_enabled'],
    ['checkoutCardEnabled',      'checkout_card_enabled'],
    ['checkoutBankEnabled',      'checkout_bank_enabled'],
    ['paystackBusinessName',     'paystack_business_name'],
    ['paystackSettlementBank',   'paystack_settlement_bank'],
    ['paystackAccountNumber',    'paystack_account_number'],
    ['paystackAccountName',      'paystack_account_name'],
    ['paystackSubaccountCode',   'paystack_subaccount_code'],
    ['paystackPercentageCharge', 'paystack_percentage_charge'],
    ['pawapayCountry',           'pawapay_country'],
    ['pawapayCorrespondent',     'pawapay_correspondent'],
    ['pawapayPhone',             'pawapay_phone'],
    ['pawapayCorrespondentId',   'pawapay_correspondent_id'],
  ];

  for (const [jsKey, dbCol] of map) {
    if (patch[jsKey] !== undefined) db[dbCol] = patch[jsKey];
  }

  const { error } = await supabase
    .from('org_payment_settings')
    .upsert(db, { onConflict: 'org_id' });
  if (error) throw error;
}
