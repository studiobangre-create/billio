-- Role-based permissions (PRO-98).
--
-- Roles in org_members: owner, admin, accountant, member, observer.
--   * every role can read its organisation's data;
--   * owner, admin, accountant and member can create and edit (observer is read-only);
--   * only owner and admin can delete.
--
-- Postgres OR's permissive policies together, so the old "members read/write"
-- FOR ALL policies let every member delete despite the "admin+ delete" ones,
-- and let observers write. They are replaced by one policy per command.
-- Safe to run more than once.

-- ─── Helpers ──────────────────────────────────────────────────────────────────

-- Organisations where the caller may create and edit (everyone but observers)
create or replace function public.my_writer_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select org_id from public.org_members
  where user_id = auth.uid() and role in ('owner', 'admin', 'accountant', 'member');
$$;

-- Organisations where the caller may post journal entries. Defined in
-- 20260622_journal_entries_accountant_post.sql, which the live database is
-- missing; recreated here.
create or replace function public.my_posting_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select org_id from public.org_members
  where user_id = auth.uid() and role in ('owner', 'admin', 'accountant');
$$;

revoke all on function public.my_writer_org_ids() from public, anon;
revoke all on function public.my_posting_org_ids() from public, anon;
grant execute on function public.my_writer_org_ids() to authenticated;
grant execute on function public.my_posting_org_ids() to authenticated;

-- ─── Business documents: read all, write non-observers, delete admins ────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'clients', 'invoices', 'quotes', 'payments', 'products', 'credit_notes',
    'fixed_assets', 'journals', 'supplier_bills'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || ': members read/write', t);
    execute format('drop policy if exists %I on public.%I', t || ': members read', t);
    execute format('drop policy if exists %I on public.%I', t || ': writers insert', t);
    execute format('drop policy if exists %I on public.%I', t || ': writers update', t);
    execute format('drop policy if exists %I on public.%I', t || ': admin delete', t);
    execute format('drop policy if exists %I on public.%I', t || ': admin+ delete', t);

    execute format(
      'create policy %I on public.%I for select using (org_id in (select public.my_org_ids()))',
      t || ': members read', t);
    execute format(
      'create policy %I on public.%I for insert with check (org_id in (select public.my_writer_org_ids()))',
      t || ': writers insert', t);
    execute format(
      'create policy %I on public.%I for update using (org_id in (select public.my_writer_org_ids())) '
      || 'with check (org_id in (select public.my_writer_org_ids()))',
      t || ': writers update', t);
    execute format(
      'create policy %I on public.%I for delete using (org_id in (select public.my_admin_org_ids()))',
      t || ': admin delete', t);
  end loop;
end $$;

-- Duplicate FOR ALL policy from 20260626_credit_notes.sql
drop policy if exists "members can manage own credit notes" on public.credit_notes;

-- ─── Line items: rewritten whenever a document is edited ─────────────────────

drop policy if exists "line_items: members read/write" on public.line_items;
drop policy if exists "line_items: members read" on public.line_items;
drop policy if exists "line_items: writers write" on public.line_items;

create policy "line_items: members read" on public.line_items
  for select using (org_id in (select public.my_org_ids()));
create policy "line_items: writers write" on public.line_items
  for all using (org_id in (select public.my_writer_org_ids()))
  with check (org_id in (select public.my_writer_org_ids()));

-- ─── Activity feed: a log, so no edits or deletes ────────────────────────────

drop policy if exists "activities: members read/write" on public.activities;
drop policy if exists "activities: members read" on public.activities;
drop policy if exists "activities: writers insert" on public.activities;

create policy "activities: members read" on public.activities
  for select using (org_id in (select public.my_org_ids()));
create policy "activities: writers insert" on public.activities
  for insert with check (org_id in (select public.my_writer_org_ids()));

-- ─── Accounting: write rights move from all members to non-observers ─────────

drop policy if exists "accounts: members insert custom" on public.accounts;
create policy "accounts: members insert custom" on public.accounts
  for insert with check (org_id is not null and org_id in (select public.my_writer_org_ids()));

drop policy if exists "fiscal_periods: members insert" on public.fiscal_periods;
create policy "fiscal_periods: members insert" on public.fiscal_periods
  for insert with check (org_id in (select public.my_writer_org_ids()));

drop policy if exists "entry_lines: members write" on public.entry_lines;
create policy "entry_lines: members write" on public.entry_lines
  for insert with check (org_id in (select public.my_writer_org_ids()));

drop policy if exists "entry_lines: members update" on public.entry_lines;
create policy "entry_lines: members update" on public.entry_lines
  for update using (org_id in (select public.my_writer_org_ids()))
  with check (org_id in (select public.my_writer_org_ids()));

drop policy if exists "journal_entries: members insert draft" on public.journal_entries;
create policy "journal_entries: members insert draft" on public.journal_entries
  for insert with check (org_id in (select public.my_writer_org_ids()) and posted = false);

-- Writers edit drafts. Owner, admin and accountant may also post, and edit
-- posted entries; a member can no longer un-post one.
drop policy if exists "journal_entries: members update" on public.journal_entries;
create policy "journal_entries: members update" on public.journal_entries
  for update
  using (
    org_id in (select public.my_writer_org_ids())
    and (posted = false or org_id in (select public.my_posting_org_ids()))
  )
  with check (
    org_id in (select public.my_writer_org_ids())
    and (posted = false or org_id in (select public.my_posting_org_ids()))
  );

-- ─── Team: observers can be given that role from Paramètres → Équipe ─────────

create or replace function public.update_org_member_role(p_org_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  if p_role is null or p_role not in ('admin', 'accountant', 'member', 'observer') then
    raise exception 'invalid role %', p_role using errcode = '22023';
  end if;

  select role into v_caller_role from org_members where org_id = p_org_id and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'only owners and admins can manage the team' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own role' using errcode = '42501';
  end if;

  select role into v_target_role from org_members where org_id = p_org_id and user_id = p_user_id;
  if v_target_role is null then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target_role = 'owner' then
    raise exception 'the owner''s role cannot be changed' using errcode = '42501';
  end if;

  update org_members set role = p_role where org_id = p_org_id and user_id = p_user_id;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
end;
$$;
