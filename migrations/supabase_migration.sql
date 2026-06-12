-- ============================================================
-- Billio — migration v3 (fix RLS recursion, safe to re-run)
-- ============================================================
-- The "for all" owner-manages policy evaluates on SELECT too,
-- causing its org_members subquery to recurse. Fix: separate it
-- into insert/update/delete-only policies so only the non-recursive
-- "user_id = auth.uid()" policy fires on SELECT.
-- ============================================================

-- Drop all existing org_members policies
drop policy if exists "org_members: read own org" on public.org_members;
drop policy if exists "org_members: owner manages" on public.org_members;
drop policy if exists "org_members: owner insert" on public.org_members;
drop policy if exists "org_members: owner update" on public.org_members;
drop policy if exists "org_members: owner delete" on public.org_members;

-- SELECT only: non-recursive, no function call
create policy "org_members: read own org" on public.org_members
  for select using (user_id = auth.uid());

-- WRITE only: subquery here triggers only the SELECT policy above
-- (which is non-recursive) — no loop possible
create policy "org_members: owner insert" on public.org_members
  for insert with check (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "org_members: owner update" on public.org_members
  for update using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "org_members: owner delete" on public.org_members
  for delete using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Rebuild helper functions (belt-and-suspenders)
create or replace function public.my_org_ids()
returns setof uuid language sql stable security definer
set search_path = public set row_security = off as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.my_admin_org_ids()
returns setof uuid language sql stable security definer
set search_path = public set row_security = off as $$
  select org_id from public.org_members
  where user_id = auth.uid() and role in ('owner', 'admin');
$$;

-- Add onboarding_completed_at if missing
alter table public.organizations
  add column if not exists onboarding_completed_at timestamptz;

-- Backfill org + membership for users who signed up before the trigger
do $$
declare
  u      record;
  new_id uuid;
begin
  for u in
    select id, email from auth.users
    where not exists (
      select 1 from public.org_members where user_id = auth.users.id
    )
  loop
    insert into public.organizations (name, slug)
    values (
      split_part(u.email, '@', 1),
      lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9]', '-', 'g'))
        || '-' || substr(gen_random_uuid()::text, 1, 6)
    )
    returning id into new_id;

    insert into public.org_members (org_id, user_id, role)
    values (new_id, u.id, 'owner');
  end loop;
end;
$$;
