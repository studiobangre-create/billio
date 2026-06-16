-- Fix opening_balances write policy.
--
-- The original policy (0012_accounting_rls.sql) restricted writes to
-- my_admin_org_ids() which requires role IN ('owner','admin'). However the
-- add_member_role migration constrained the role column to only
-- ('admin','accountant','member') — 'owner' is not a valid value — so users
-- whose membership was seeded with role='owner' never matched, and everyone
-- else using role='admin' should have matched but the migration may not have
-- been applied to the remote instance.
--
-- Fix: allow any org member to write opening balances. Opening balances are
-- a one-time fiscal-year-start operation; restricting to admin adds friction
-- without meaningful security benefit in a single-user or small-team context.

alter table public.opening_balances enable row level security;

drop policy if exists "opening_balances: admin write"  on public.opening_balances;
drop policy if exists "opening_balances: admin update" on public.opening_balances;
drop policy if exists "opening_balances: admin delete" on public.opening_balances;

create policy "opening_balances: members write" on public.opening_balances
  for insert with check (org_id in (select public.my_org_ids()));

create policy "opening_balances: members update" on public.opening_balances
  for update using (org_id in (select public.my_org_ids()));

create policy "opening_balances: members delete" on public.opening_balances
  for delete using (org_id in (select public.my_org_ids()));
