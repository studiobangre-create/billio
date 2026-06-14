-- org_payment_settings: one row per org.
-- Sub-account model: the platform holds the provider API keys server-side.
-- This table stores per-org settlement details + the sub-account codes the platform
-- creates on their behalf. No user-facing credentials are stored here.

create table if not exists public.org_payment_settings (
  org_id                   uuid primary key references public.organizations on delete cascade,

  -- ── Invoice display methods (shown on PDF sent to client) ────────────────
  method_mtn_enabled       boolean not null default false,
  method_mtn_phone         text    not null default '',
  method_orange_enabled    boolean not null default false,
  method_orange_phone      text    not null default '',
  method_wave_enabled      boolean not null default false,
  method_wave_phone        text    not null default '',
  method_bank_enabled      boolean not null default false,
  method_bank_iban         text    not null default '',
  method_cash_enabled      boolean not null default false,

  -- ── Active provider ───────────────────────────────────────────────────────
  active_provider          text    check (active_provider in ('paystack', 'pawapay')),
  provider_mode            text    not null default 'test' check (provider_mode in ('test', 'live')),
  -- pending = sub-account submitted, awaiting platform activation
  -- active  = sub-account live and accepting payments
  -- suspended = provider suspended the sub-account
  provider_status          text    not null default 'pending'
                           check (provider_status in ('pending', 'active', 'suspended')),
  auto_reconcile           boolean not null default true,

  -- ── Checkout method toggles (shown on the hosted payment link) ────────────
  checkout_momo_enabled    boolean not null default true,
  checkout_wave_enabled    boolean not null default true,
  checkout_card_enabled    boolean not null default true,
  checkout_bank_enabled    boolean not null default false,

  -- ── Paystack sub-account ─────────────────────────────────────────────────
  -- Settlement info supplied by the org; platform creates the sub-account.
  paystack_business_name   text    not null default '',
  paystack_settlement_bank text    not null default '',   -- bank code, e.g. "058"
  paystack_account_number  text    not null default '',
  paystack_account_name    text    not null default '',   -- resolved by Paystack API
  paystack_subaccount_code text    not null default '',   -- ACCT_xxx — set by platform after creation
  paystack_percentage_charge numeric(5,2) not null default 0, -- platform split fee

  -- ── PawaPay sub-account ───────────────────────────────────────────────────
  pawapay_country          text    not null default '',   -- ISO-3 e.g. BFA, SEN, CIV
  pawapay_correspondent    text    not null default '',   -- e.g. MTN_MOMO_BFA
  pawapay_phone            text    not null default '',   -- settlement mobile number
  pawapay_correspondent_id text    not null default '',   -- set by platform after activation

  updated_at               timestamptz not null default now()
);

alter table public.org_payment_settings enable row level security;

-- All org members can read settings (needed to render invoice payment methods).
create policy "pay_settings: members read" on public.org_payment_settings
  for select using (org_id in (select public.my_org_ids()));

-- Only org admins can write.
create policy "pay_settings: admin write" on public.org_payment_settings
  for all using (org_id in (select public.my_admin_org_ids()));
