-- Minimal stand-in for the production schema: just enough of Supabase (auth
-- schema, roles) and of each table (org_id, posted) to exercise the RLS
-- policies. The policies themselves are copied from the live database
-- (pg_policies, 3 Nov 2026) so the migration is tested against what is
-- really deployed.
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
end $$;

create schema auth;
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable
  as $$ select 'authenticated'::text $$;
create table auth.users (id uuid primary key, email text);
grant usage on schema auth to authenticated, anon;

create table public.org_members (org_id uuid, user_id uuid, role text,
  check (role in ('owner', 'admin', 'member', 'accountant', 'observer')));
alter table public.org_members enable row level security;
grant select on public.org_members to authenticated;
create policy "org_members: read own org" on public.org_members for select using (user_id = auth.uid());
create table public.pending_invitations (id uuid default gen_random_uuid(), org_id uuid, email text, status text);

create function public.my_org_ids() returns setof uuid language sql stable security definer
  set search_path = public set row_security = off
  as $$ select org_id from public.org_members where user_id = auth.uid() $$;
create function public.my_admin_org_ids() returns setof uuid language sql stable security definer
  set search_path = public set row_security = off
  as $$ select org_id from public.org_members where user_id = auth.uid() and role in ('owner', 'admin') $$;

do $$
declare t text;
begin
  foreach t in array array['clients','invoices','quotes','payments','products','credit_notes',
                           'fixed_assets','journals','supplier_bills','line_items','activities',
                           'accounts','fiscal_periods','entry_lines'] loop
    execute format('create table public.%I (id uuid primary key default gen_random_uuid(), org_id uuid, name text)', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
create table public.journal_entries (id uuid primary key default gen_random_uuid(), org_id uuid, name text, posted boolean not null default false);
alter table public.journal_entries enable row level security;
grant select, insert, update, delete on public.journal_entries to authenticated;

-- Live policies (before the migration)
do $$
declare t text;
begin
  foreach t in array array['clients','invoices','quotes','payments','products','credit_notes',
                           'fixed_assets','journals','supplier_bills','line_items','activities'] loop
    execute format('create policy %I on public.%I for all using (org_id in (select my_org_ids()))', t || ': members read/write', t);
  end loop;
  foreach t in array array['invoices','quotes','payments','products','credit_notes'] loop
    execute format('create policy %I on public.%I for delete using (org_id in (select my_admin_org_ids()))', t || ': admin+ delete', t);
  end loop;
  foreach t in array array['fixed_assets','journals','supplier_bills'] loop
    execute format('create policy %I on public.%I for delete using (org_id in (select my_admin_org_ids()))', t || ': admin delete', t);
  end loop;
end $$;
create policy "members can manage own credit notes" on public.credit_notes for all
  using (org_id in (select org_id from org_members where user_id = auth.uid()));
create policy "accounts: read standard" on public.accounts for select using (org_id is null or org_id in (select my_org_ids()));
create policy "accounts: members insert custom" on public.accounts for insert with check (org_id is not null and org_id in (select my_org_ids()));
create policy "accounts: admin update custom" on public.accounts for update using (org_id is not null and org_id in (select my_admin_org_ids()));
create policy "accounts: admin delete custom" on public.accounts for delete using (org_id is not null and org_id in (select my_admin_org_ids()));
create policy "fiscal_periods: admin close" on public.fiscal_periods for update using (org_id in (select my_admin_org_ids()));
create policy "fiscal_periods: admin delete" on public.fiscal_periods for delete using (org_id in (select my_admin_org_ids()));
create policy "fiscal_periods: members read" on public.fiscal_periods for select using (org_id in (select my_org_ids()));
create policy "fiscal_periods: members insert" on public.fiscal_periods for insert with check (org_id in (select my_org_ids()));
create policy "entry_lines: members read" on public.entry_lines for select using (org_id in (select my_org_ids()));
create policy "entry_lines: members write" on public.entry_lines for insert with check (org_id in (select my_org_ids()));
create policy "entry_lines: members update" on public.entry_lines for update using (org_id in (select my_org_ids()));
create policy "entry_lines: admin delete" on public.entry_lines for delete using (org_id in (select my_admin_org_ids()));
create policy "journal_entries: members read" on public.journal_entries for select using (org_id in (select my_org_ids()));
create policy "journal_entries: members insert draft" on public.journal_entries for insert with check (org_id in (select my_org_ids()) and posted = false);
create policy "journal_entries: members update" on public.journal_entries for update using (org_id in (select my_org_ids()))
  with check (org_id in (select my_org_ids()) and (posted = false or org_id in (select my_admin_org_ids())));
create policy "journal_entries: admin delete draft" on public.journal_entries for delete using (org_id in (select my_admin_org_ids()) and posted = false);

-- One organisation with one user per role, plus a user from another organisation
insert into public.org_members (org_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000002', 'admin'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000003', 'accountant'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000004', 'member'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000005', 'observer'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000006', 'owner');
