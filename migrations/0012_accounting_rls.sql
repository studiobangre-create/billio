-- ============================================================
-- Billio — Accounting module RLS policies
-- Safe to re-run: drops existing policies before recreating
-- Depends on: 0010_accounting_schema.sql, supabase_schema.sql
--             (my_org_ids() and my_admin_org_ids() must exist)
-- ============================================================
-- Policy summary:
--   account_classes  → any authenticated user can read (reference data)
--   accounts         → any authenticated user can read; org members can
--                      insert/update/delete their own custom accounts
--   journals         → org members (all roles) read/write
--   fiscal_periods   → org members read; owner/admin close periods
--   opening_balances → org members read; owner/admin write
--   journal_entries  → org members read + insert draft; owner/admin post/delete
--   entry_lines      → follows parent journal_entry permissions
--   fixed_assets     → org members read/write; owner/admin delete
--   supplier_bills   → org members read/write; owner/admin delete
-- ============================================================


-- ------------------------------------------------------------
-- account_classes  (shared reference — read-only for all authed users)
-- ------------------------------------------------------------

alter table public.account_classes enable row level security;

drop policy if exists "account_classes: authenticated read" on public.account_classes;
create policy "account_classes: authenticated read" on public.account_classes
  for select using (auth.role() = 'authenticated');


-- ------------------------------------------------------------
-- accounts  (standard rows are shared; custom rows are org-scoped)
-- ------------------------------------------------------------

alter table public.accounts enable row level security;

drop policy if exists "accounts: read standard" on public.accounts;
create policy "accounts: read standard" on public.accounts
  for select using (
    org_id is null                             -- SYSCOHADA standard accounts
    or org_id in (select public.my_org_ids())  -- org-specific custom accounts
  );

drop policy if exists "accounts: members insert custom" on public.accounts;
create policy "accounts: members insert custom" on public.accounts
  for insert with check (
    org_id is not null
    and org_id in (select public.my_org_ids())
  );

drop policy if exists "accounts: admin update custom" on public.accounts;
create policy "accounts: admin update custom" on public.accounts
  for update using (
    org_id is not null
    and org_id in (select public.my_admin_org_ids())
  );

drop policy if exists "accounts: admin delete custom" on public.accounts;
create policy "accounts: admin delete custom" on public.accounts
  for delete using (
    org_id is not null
    and org_id in (select public.my_admin_org_ids())
  );


-- ------------------------------------------------------------
-- journals
-- ------------------------------------------------------------

alter table public.journals enable row level security;

drop policy if exists "journals: members read/write" on public.journals;
create policy "journals: members read/write" on public.journals
  for all using (org_id in (select public.my_org_ids()));

drop policy if exists "journals: admin delete" on public.journals;
create policy "journals: admin delete" on public.journals
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- fiscal_periods
-- ------------------------------------------------------------

alter table public.fiscal_periods enable row level security;

drop policy if exists "fiscal_periods: members read" on public.fiscal_periods;
create policy "fiscal_periods: members read" on public.fiscal_periods
  for select using (org_id in (select public.my_org_ids()));

-- Any member can create periods (needed by seed_org_accounting)
drop policy if exists "fiscal_periods: members insert" on public.fiscal_periods;
create policy "fiscal_periods: members insert" on public.fiscal_periods
  for insert with check (org_id in (select public.my_org_ids()));

-- Only owner/admin can close a period
drop policy if exists "fiscal_periods: admin close" on public.fiscal_periods;
create policy "fiscal_periods: admin close" on public.fiscal_periods
  for update using (org_id in (select public.my_admin_org_ids()));

drop policy if exists "fiscal_periods: admin delete" on public.fiscal_periods;
create policy "fiscal_periods: admin delete" on public.fiscal_periods
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- opening_balances
-- ------------------------------------------------------------

alter table public.opening_balances enable row level security;

drop policy if exists "opening_balances: members read" on public.opening_balances;
create policy "opening_balances: members read" on public.opening_balances
  for select using (org_id in (select public.my_org_ids()));

-- Only owner/admin may set or adjust opening balances (year-start operation)
drop policy if exists "opening_balances: admin write" on public.opening_balances;
create policy "opening_balances: admin write" on public.opening_balances
  for insert with check (org_id in (select public.my_admin_org_ids()));

drop policy if exists "opening_balances: admin update" on public.opening_balances;
create policy "opening_balances: admin update" on public.opening_balances
  for update using (org_id in (select public.my_admin_org_ids()));

drop policy if exists "opening_balances: admin delete" on public.opening_balances;
create policy "opening_balances: admin delete" on public.opening_balances
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- journal_entries
-- ------------------------------------------------------------

alter table public.journal_entries enable row level security;

drop policy if exists "journal_entries: members read" on public.journal_entries;
create policy "journal_entries: members read" on public.journal_entries
  for select using (org_id in (select public.my_org_ids()));

-- Any member can create a draft entry
drop policy if exists "journal_entries: members insert draft" on public.journal_entries;
create policy "journal_entries: members insert draft" on public.journal_entries
  for insert with check (
    org_id in (select public.my_org_ids())
    and posted = false   -- drafts only; posting requires the UPDATE below
  );

-- Any member can edit their own draft; only admin can post.
-- USING  = which rows may be targeted (evaluated against OLD row).
-- WITH CHECK = what the row must look like after the update (evaluated against NEW row).
-- Without WITH CHECK a member could flip posted=true because USING only sees the old state.
drop policy if exists "journal_entries: members update" on public.journal_entries;
create policy "journal_entries: members update" on public.journal_entries
  for update
  using (org_id in (select public.my_org_ids()))
  with check (
    org_id in (select public.my_org_ids())
    and (
      posted = false                                         -- saving/editing a draft
      or org_id in (select public.my_admin_org_ids())       -- only admin may set posted=true
    )
  );

-- Only admin can delete (and only drafts — the trigger blocks deletion of posted entries)
drop policy if exists "journal_entries: admin delete draft" on public.journal_entries;
create policy "journal_entries: admin delete draft" on public.journal_entries
  for delete using (
    org_id in (select public.my_admin_org_ids())
    and posted = false
  );


-- ------------------------------------------------------------
-- entry_lines
--   org_id is denormalised from journal_entries (see trigger in 0010).
--   Line edits are further blocked by the guard_posted_entry_lines trigger.
-- ------------------------------------------------------------

alter table public.entry_lines enable row level security;

drop policy if exists "entry_lines: members read" on public.entry_lines;
create policy "entry_lines: members read" on public.entry_lines
  for select using (org_id in (select public.my_org_ids()));

drop policy if exists "entry_lines: members write" on public.entry_lines;
create policy "entry_lines: members write" on public.entry_lines
  for insert with check (org_id in (select public.my_org_ids()));

drop policy if exists "entry_lines: members update" on public.entry_lines;
create policy "entry_lines: members update" on public.entry_lines
  for update using (org_id in (select public.my_org_ids()));

drop policy if exists "entry_lines: admin delete" on public.entry_lines;
create policy "entry_lines: admin delete" on public.entry_lines
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- fixed_assets
-- ------------------------------------------------------------

alter table public.fixed_assets enable row level security;

drop policy if exists "fixed_assets: members read/write" on public.fixed_assets;
create policy "fixed_assets: members read/write" on public.fixed_assets
  for all using (org_id in (select public.my_org_ids()));

drop policy if exists "fixed_assets: admin delete" on public.fixed_assets;
create policy "fixed_assets: admin delete" on public.fixed_assets
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- supplier_bills
-- ------------------------------------------------------------

alter table public.supplier_bills enable row level security;

drop policy if exists "supplier_bills: members read/write" on public.supplier_bills;
create policy "supplier_bills: members read/write" on public.supplier_bills
  for all using (org_id in (select public.my_org_ids()));

drop policy if exists "supplier_bills: admin delete" on public.supplier_bills;
create policy "supplier_bills: admin delete" on public.supplier_bills
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- Convenience view: account balances for the trial balance
--   Aggregates posted entry lines by org + account.
--   RLS on the underlying tables is respected automatically.
-- ------------------------------------------------------------

-- security_invoker = true makes the view run as the querying user, not the view owner.
-- Without this, Postgres evaluates the view under SECURITY DEFINER semantics (owner's
-- permissions), which bypasses RLS on entry_lines and journal_entries — every caller
-- would see every org's data.
create or replace view public.v_account_balances
  with (security_invoker = true) as
select
  el.org_id,
  el.account_num,
  sum(el.debit)  as total_debit,
  sum(el.credit) as total_credit,
  sum(el.debit) - sum(el.credit) as net   -- positive = debit balance
from public.entry_lines el
join public.journal_entries je on je.id = el.entry_id
where je.posted = true
group by el.org_id, el.account_num;

comment on view public.v_account_balances is
  'Posted movements per account per org. Used by trial balance, '
  'financial statements, and tax pages.';
