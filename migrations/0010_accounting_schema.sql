-- ============================================================
-- Billio — Accounting module schema (SYSCOHADA, Système Normal)
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE
-- Depends on: supabase_schema.sql (organizations, org_members,
--             my_org_ids(), my_admin_org_ids() must already exist)
-- ============================================================


-- ------------------------------------------------------------
-- 1. Reference tables (shared, no org_id)
--    Seeded in 0011_accounting_seed.sql
-- ------------------------------------------------------------

create table if not exists public.account_classes (
  id      smallint    primary key,          -- 1–9 (SYSCOHADA class number)
  name    text        not null,
  short   text        not null,
  nature  char(1)     not null check (nature in ('D', 'C', 'M')),  -- M = mixed
  color   text        not null default '#6B7280'
);
comment on table public.account_classes is
  'SYSCOHADA Système Normal account classes 1-9. Shared reference data, no per-org rows.';

-- Orgs can hold accounts from the standard chart or define their own (org_id IS NULL = standard).
create table if not exists public.accounts (
  num     text        primary key,          -- e.g. '401', '2441'
  label   text        not null,
  nature  char(1)     not null check (nature in ('D', 'C')),
  class_id smallint   not null references public.account_classes (id),
  org_id  uuid        references public.organizations (id) on delete cascade
          -- NULL  → standard SYSCOHADA account (shared)
          -- non-NULL → org-specific custom account
);
comment on column public.accounts.org_id is
  'NULL for standard SYSCOHADA accounts; set to org UUID for custom accounts.';

create index if not exists accounts_class on public.accounts (class_id);
create index if not exists accounts_org   on public.accounts (org_id) where org_id is not null;


-- ------------------------------------------------------------
-- 2. Per-org journals
-- ------------------------------------------------------------

create table if not exists public.journals (
  id      uuid    primary key default gen_random_uuid(),
  org_id  uuid    not null references public.organizations (id) on delete cascade,
  code    text    not null,       -- VE, AC, BQ, CA, OD …
  name    text    not null,
  color   text    not null default '#6B7280',
  unique  (org_id, code)
);

create index if not exists journals_org on public.journals (org_id);


-- ------------------------------------------------------------
-- 3. Fiscal periods
-- ------------------------------------------------------------

create table if not exists public.fiscal_periods (
  id      uuid    primary key default gen_random_uuid(),
  org_id  uuid    not null references public.organizations (id) on delete cascade,
  year    smallint not null,
  month   smallint not null check (month between 1 and 12),
  status  text    not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid  references auth.users (id) on delete set null,
  unique  (org_id, year, month)
);

create index if not exists fiscal_periods_org_year on public.fiscal_periods (org_id, year, month);


-- ------------------------------------------------------------
-- 4. Opening balances (per org, per exercise year)
--    Signed: positive = debit balance, negative = credit balance
-- ------------------------------------------------------------

create table if not exists public.opening_balances (
  id             uuid     primary key default gen_random_uuid(),
  org_id         uuid     not null references public.organizations (id) on delete cascade,
  account_num    text     not null references public.accounts (num),
  exercise_year  smallint not null,
  signed_amount  numeric  not null default 0,
  unique (org_id, account_num, exercise_year)
);

create index if not exists opening_balances_org_year on public.opening_balances (org_id, exercise_year);


-- ------------------------------------------------------------
-- 5. Journal entries  (the double-entry core)
-- ------------------------------------------------------------

create table if not exists public.journal_entries (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizations  (id) on delete cascade,
  journal_id  uuid        not null references public.journals       (id) on delete restrict,
  period_id   uuid        not null references public.fiscal_periods (id) on delete restrict,
  date        date        not null,
  piece       text        not null default '',  -- voucher / ref number
  label       text        not null,
  posted      boolean     not null default false,
  posted_at   timestamptz,
  posted_by   uuid        references auth.users (id) on delete set null,
  created_by  uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists journal_entries_org_date   on public.journal_entries (org_id, date desc);
create index if not exists journal_entries_org_period on public.journal_entries (org_id, period_id);
create index if not exists journal_entries_journal    on public.journal_entries (journal_id);


-- ------------------------------------------------------------
-- 6. Entry lines  (individual debit / credit legs)
--    org_id is denormalised from the parent entry for RLS performance.
-- ------------------------------------------------------------

create table if not exists public.entry_lines (
  id          uuid    primary key default gen_random_uuid(),
  org_id      uuid    not null references public.organizations (id) on delete cascade,
  entry_id    uuid    not null references public.journal_entries (id) on delete cascade,
  account_num text    not null references public.accounts (num),
  debit       numeric not null default 0 check (debit  >= 0),
  credit      numeric not null default 0 check (credit >= 0),
  -- A line must be purely debit OR purely credit (or zero for placeholder)
  constraint  entry_lines_one_side check (not (debit > 0 and credit > 0))
);

create index if not exists entry_lines_entry   on public.entry_lines (entry_id);
create index if not exists entry_lines_account on public.entry_lines (org_id, account_num);

-- Trigger: copy org_id from parent entry automatically on insert
create or replace function public.fill_entry_line_org_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select org_id into NEW.org_id
  from public.journal_entries where id = NEW.entry_id;
  return NEW;
end;
$$;

drop trigger if exists fill_entry_line_org_id on public.entry_lines;
create trigger fill_entry_line_org_id
  before insert on public.entry_lines
  for each row execute function public.fill_entry_line_org_id();

-- Trigger: enforce debit = credit when an entry is posted
create or replace function public.check_entry_balance()
returns trigger language plpgsql set search_path = public as $$
declare
  total_debit  numeric;
  total_credit numeric;
begin
  -- Only validate at the moment of posting (draft entries may be temporarily unbalanced)
  if NEW.posted is false then
    return NEW;
  end if;

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into   total_debit, total_credit
  from   public.entry_lines
  where  entry_id = NEW.id;

  if round(total_debit, 2) <> round(total_credit, 2) then
    raise exception
      'Journal entry % is unbalanced (debit % ≠ credit %)',
      NEW.id, total_debit, total_credit;
  end if;

  -- Stamp who posted and when
  NEW.posted_at := now();
  NEW.posted_by := auth.uid();
  return NEW;
end;
$$;

drop trigger if exists enforce_entry_balance on public.journal_entries;
create trigger enforce_entry_balance
  before update on public.journal_entries
  for each row
  when (NEW.posted = true and (OLD.posted = false or OLD.posted is null))
  execute function public.check_entry_balance();

-- Trigger: prevent modifications to a posted entry's lines
create or replace function public.guard_posted_entry_lines()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from public.journal_entries
    where id = coalesce(OLD.entry_id, NEW.entry_id) and posted = true
  ) then
    raise exception 'Cannot modify lines of a posted journal entry';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists guard_posted_entry_lines on public.entry_lines;
create trigger guard_posted_entry_lines
  before insert or update or delete on public.entry_lines
  for each row execute function public.guard_posted_entry_lines();


-- ------------------------------------------------------------
-- 7. Fixed assets register
-- ------------------------------------------------------------

create table if not exists public.fixed_assets (
  id               text        primary key,   -- e.g. 'IMM-001'
  org_id           uuid        not null references public.organizations (id) on delete cascade,
  name             text        not null,
  account_num      text        not null references public.accounts (num),
  amort_account_num text       not null references public.accounts (num),
  gross_value      numeric     not null check (gross_value > 0),
  acquisition_date date        not null,
  useful_life      smallint    not null check (useful_life > 0),  -- years
  method           text        not null default 'Linéaire' check (method in ('Linéaire', 'Dégressif')),
  icon             text        not null default 'building-warehouse',
  created_at       timestamptz not null default now()
);

create index if not exists fixed_assets_org on public.fixed_assets (org_id);


-- ------------------------------------------------------------
-- 8. Supplier bills
-- ------------------------------------------------------------

create table if not exists public.supplier_bills (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.organizations (id) on delete cascade,
  supplier     text        not null,
  city         text        not null default '',
  piece        text        not null,       -- invoice reference
  date         date        not null,
  due_date     date        not null,
  ht_amount    numeric     not null check (ht_amount >= 0),
  tva_amount   numeric     not null default 0 check (tva_amount >= 0),
  status       text        not null default 'open'
                 check (status in ('open', 'overdue', 'paid')),
  -- Accounting simulation lines stored as JSONB (display-only, not posted entries)
  -- Shape: [{ acct, label, side: 'D'|'C', amount }]
  acct_lines   jsonb       not null default '[]',
  paid_at      timestamptz,
  created_by   uuid        references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists supplier_bills_org_status  on public.supplier_bills (org_id, status);
create index if not exists supplier_bills_org_due     on public.supplier_bills (org_id, due_date);
