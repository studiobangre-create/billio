-- ============================================================
-- Billio — onboarding data migration
-- ============================================================

-- Business-detail columns (from supabase_settings_migration.sql)
alter table public.organizations
  add column if not exists ifu      text not null default '',
  add column if not exists rccm     text not null default '',
  add column if not exists address  text not null default '',
  add column if not exists city     text not null default '',
  add column if not exists country  text not null default 'Burkina Faso',
  add column if not exists currency text not null default 'F CFA';

-- Invoice defaults on organizations
alter table public.organizations
  add column if not exists inv_prefix           text not null default 'INV-',
  add column if not exists inv_next_number      text not null default '0001',
  add column if not exists payment_terms        text not null default 'Net 14 jours',
  add column if not exists default_tax_rate     numeric(5,2) not null default 18,
  add column if not exists default_pay_method   text not null default 'Mobile Money (MTN / Orange / Wave)',
  add column if not exists invoice_footer       text not null default '';

-- Pending team invitations
create table if not exists public.pending_invitations (
  id         uuid        primary key default gen_random_uuid(),
  token      uuid        not null unique default gen_random_uuid(),
  org_id     uuid        not null references public.organizations on delete cascade,
  email      text        not null,
  role       text        not null default 'member'
               check (role in ('owner', 'admin', 'member', 'accountant', 'observer')),
  invited_by uuid        references auth.users on delete set null,
  status     text        not null default 'pending'
               check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  unique (org_id, email)
);

alter table public.pending_invitations enable row level security;

-- Add token column if the table was created before this column was introduced
alter table public.pending_invitations
  add column if not exists token uuid not null unique default gen_random_uuid();

-- Drop and recreate all policies (idempotent re-run)
drop policy if exists "invitations: members can read own org"  on public.pending_invitations;
drop policy if exists "invitations: admins/owners can insert"  on public.pending_invitations;
drop policy if exists "invitations: admins/owners can update"  on public.pending_invitations;
drop policy if exists "invitations: admins/owners can delete"  on public.pending_invitations;

-- Authenticated members can read their org's invitations
create policy "invitations: members can read own org"
  on public.pending_invitations for select to authenticated
  using (org_id in (select public.my_org_ids()));

-- Only owners and admins can create/modify/delete invitations
create policy "invitations: admins/owners can insert"
  on public.pending_invitations for insert to authenticated
  with check (
    org_id in (
      select org_id from public.org_members
       where user_id = auth.uid()
         and role in ('owner', 'admin')
    )
  );

create policy "invitations: admins/owners can update"
  on public.pending_invitations for update to authenticated
  using (
    org_id in (
      select org_id from public.org_members
       where user_id = auth.uid()
         and role in ('owner', 'admin')
    )
  );

create policy "invitations: admins/owners can delete"
  on public.pending_invitations for delete to authenticated
  using (
    org_id in (
      select org_id from public.org_members
       where user_id = auth.uid()
         and role in ('owner', 'admin')
    )
  );

-- ── Public invite-lookup function (bypasses RLS) ────────────
-- Returns invite details for the /invite/:token page.
-- Returns NULL row if token is invalid or expired.
create or replace function public.get_invite_details(p_token uuid)
returns table (
  org_name   text,
  email      text,
  role       text,
  expires_at timestamptz,
  status     text
)
language sql stable security definer
set search_path = public
as $$
  select
    o.name,
    i.email,
    i.role,
    i.expires_at,
    i.status
  from pending_invitations i
  join organizations o on o.id = i.org_id
  where i.token = p_token
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1;
$$;

-- ── Accept invitation (called right after auth.signUp) ───────
-- Guards:
--   1. Caller must be the authenticated user passed in p_user_id.
--   2. Caller's confirmed email must match the invitation email.
--   3. Token must be pending and not expired.
create or replace function public.accept_invitation(p_token uuid, p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_org_id       uuid;
  v_role         text;
  v_invite_email text;
  v_caller_email text;
  v_confirmed_at timestamptz;
begin
  -- Guard 1: caller must be the user they claim to be
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  -- Guard 2: caller's email must be confirmed and match the invite
  select email, confirmed_at
    into v_caller_email, v_confirmed_at
    from auth.users
   where id = auth.uid();

  if v_confirmed_at is null then
    raise exception 'Email not confirmed';
  end if;

  select org_id, role, email
    into v_org_id, v_role, v_invite_email
    from pending_invitations
   where token      = p_token
     and status     = 'pending'
     and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  if lower(v_caller_email) is distinct from lower(v_invite_email) then
    raise exception 'Email mismatch: this invitation was sent to a different address';
  end if;

  -- Accept
  insert into org_members (org_id, user_id, role)
    values (v_org_id, p_user_id, v_role)
    on conflict (org_id, user_id) do nothing;

  update pending_invitations
     set status = 'accepted'
   where token = p_token;
end;
$$;

-- ── Team member listing (bypasses RLS on auth.users) ────────
-- Returns members of the org with their name/email from auth.users.
-- Caller must be a member of the org (enforced inside).
create or replace function public.get_org_team(p_org_id uuid)
returns table (
  user_id    uuid,
  role       text,
  email      text,
  first_name text,
  last_name  text,
  joined_at  timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select
    m.user_id,
    m.role,
    u.email,
    coalesce(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'firstName', '') as first_name,
    coalesce(u.raw_user_meta_data->>'last_name',  u.raw_user_meta_data->>'lastName',  '') as last_name,
    m.created_at
  from org_members m
  join auth.users u on u.id = m.user_id
  where m.org_id = p_org_id
    and p_org_id in (select public.my_org_ids())
  order by m.created_at;
$$;

-- ── Fix: skip auto-org creation for invited users ────────────
-- The original handle_new_user fires on every signup and creates
-- a brand-new org. Invited users would end up owning a ghost org
-- AND being a member of the org they were invited to, causing
-- AppContext to pick the wrong org on first login.
-- This patched version skips org creation when a pending invite
-- exists for the signing-up email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  -- If a valid pending invitation exists for this email,
  -- skip org creation — accept_invitation will link them to the
  -- correct org after signup completes.
  if exists (
    select 1 from public.pending_invitations
     where lower(email) = lower(new.email)
       and status       = 'pending'
       and expires_at   > now()
  ) then
    return new;
  end if;

  insert into public.organizations (name, slug)
  values (
    coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '-', 'g'))
      || '-' || substr(gen_random_uuid()::text, 1, 6)
  )
  returning id into new_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;
