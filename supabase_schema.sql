-- ============================================================
-- Billio — Multi-tenant schema (org-based, with roles)
-- Run this in the Supabase SQL editor (Settings → SQL editor)
-- ============================================================
-- Tenancy model:
--   organizations  — the billing entity (company / studio)
--   org_members    — links users to an org with a role
--   role hierarchy: owner > admin > member
--     member : read + create + update own records
--     admin  : read + create + update + delete
--     owner  : everything + manage members
-- ============================================================


-- ------------------------------------------------------------
-- Step 1: Create bare tables (no RLS yet — avoids circular refs)
-- ------------------------------------------------------------

create table if not exists public.organizations (
  id                      uuid        primary key default gen_random_uuid(),
  name                    text        not null,
  slug                    text        unique,
  onboarding_completed_at timestamptz,
  created_at              timestamptz not null default now()
);

create table if not exists public.org_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations on delete cascade,
  user_id    uuid        not null references auth.users           on delete cascade,
  role       text        not null default 'member'
               check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);


-- ------------------------------------------------------------
-- Step 2: Helper functions (SECURITY DEFINER — avoids RLS loops)
-- Must exist before policies that use them.
-- ------------------------------------------------------------

create or replace function public.my_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
set row_security = off          -- bypass RLS to avoid infinite recursion
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.my_admin_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
set row_security = off          -- bypass RLS to avoid infinite recursion
as $$
  select org_id from public.org_members
  where user_id = auth.uid() and role in ('owner', 'admin');
$$;


-- ------------------------------------------------------------
-- Step 3: RLS on organizations (now org_members exists)
-- ------------------------------------------------------------

alter table public.organizations enable row level security;

create policy "orgs: members can read" on public.organizations
  for select using (id in (select public.my_org_ids()));

create policy "orgs: owner can update" on public.organizations
  for update using (id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- Step 4: RLS on org_members
-- ------------------------------------------------------------

alter table public.org_members enable row level security;

-- SELECT only: non-recursive, no function call
create policy "org_members: read own org" on public.org_members
  for select using (user_id = auth.uid());

-- WRITE only: subquery triggers only the SELECT policy above (non-recursive)
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


-- ------------------------------------------------------------
-- clients
-- ------------------------------------------------------------
create table if not exists public.clients (
  id             uuid        primary key default gen_random_uuid(),
  org_id         uuid        not null references public.organizations on delete cascade,
  created_by     uuid        references auth.users on delete set null,
  code           text        not null,
  name           text        not null,
  av             text        not null default 'av-a',
  contact        text        not null default '—',
  email          text        not null default '—',
  phone          text        not null default '—',
  city           text        not null default '—',
  ifu            text        not null default '',
  status         text        not null default 'active'
                   check (status in ('active', 'lead', 'inactive')),
  invoices_count integer     not null default 0,
  billed         numeric     not null default 0,
  balance        numeric     not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.clients enable row level security;
create policy "clients: members read/write" on public.clients
  for all using (org_id in (select public.my_org_ids()));


-- ------------------------------------------------------------
-- invoices
-- ------------------------------------------------------------
create table if not exists public.invoices (
  id          text        primary key,          -- e.g. "INV-0041"
  org_id      uuid        not null references public.organizations on delete cascade,
  created_by  uuid        references auth.users on delete set null,
  subject     text        not null default '',
  client_code text        not null,
  issued_at   date        not null,
  due_at      date        not null,
  amount      numeric     not null default 0,
  status      text        not null default 'draft'
                check (status in ('paid', 'pending', 'overdue', 'draft')),
  created_at  timestamptz not null default now()
);

alter table public.invoices enable row level security;
create policy "invoices: members read/write" on public.invoices
  for all using (org_id in (select public.my_org_ids()));
create policy "invoices: admin+ delete" on public.invoices
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- line_items
-- ------------------------------------------------------------
create table if not exists public.line_items (
  id          uuid    primary key default gen_random_uuid(),
  org_id      uuid    not null references public.organizations on delete cascade,
  invoice_id  text    references public.invoices on delete cascade,
  quote_id    text,   -- FK added after quotes table
  description text    not null,
  qty         numeric not null default 1,
  price       numeric not null default 0
);

alter table public.line_items enable row level security;
create policy "line_items: members read/write" on public.line_items
  for all using (org_id in (select public.my_org_ids()));


-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
create table if not exists public.payments (
  id          text        primary key,          -- e.g. "PAI-2053"
  org_id      uuid        not null references public.organizations on delete cascade,
  created_by  uuid        references auth.users on delete set null,
  date        date        not null,
  client_code text        not null,
  inv_id      text        references public.invoices on delete set null,
  method      text        not null check (method in ('cash', 'wave', 'momo', 'card')),
  ref         text        not null default '',
  amount      numeric     not null default 0,
  status      text        not null default 'completed'
                check (status in ('completed', 'pending', 'failed')),
  source      text        not null default 'manual'
                check (source in ('online', 'manual')),
  created_at  timestamptz not null default now()
);

alter table public.payments enable row level security;
create policy "payments: members read/write" on public.payments
  for all using (org_id in (select public.my_org_ids()));
create policy "payments: admin+ delete" on public.payments
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
create table if not exists public.products (
  id         text        primary key,
  org_id     uuid        not null references public.organizations on delete cascade,
  created_by uuid        references auth.users on delete set null,
  name       text        not null,
  sku        text        not null default '—',
  type       text        not null default 'service' check (type in ('service', 'product')),
  unit       text        not null,
  price      numeric     not null default 0,
  tax        numeric     not null default 0,
  used       integer     not null default 0,
  ico        text        not null default 'package',
  color      text        not null default 'ico-blue',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
create policy "products: members read/write" on public.products
  for all using (org_id in (select public.my_org_ids()));
create policy "products: admin+ delete" on public.products
  for delete using (org_id in (select public.my_admin_org_ids()));


-- ------------------------------------------------------------
-- quotes
-- ------------------------------------------------------------
create table if not exists public.quotes (
  id          text        primary key,          -- e.g. "DEV-0119"
  org_id      uuid        not null references public.organizations on delete cascade,
  created_by  uuid        references auth.users on delete set null,
  subject     text        not null default '',
  client_code text        not null,
  issued_at   date        not null,
  valid_until date        not null,
  amount      numeric     not null default 0,
  status      text        not null default 'draft'
                check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'invoiced')),
  created_at  timestamptz not null default now()
);

alter table public.quotes enable row level security;
create policy "quotes: members read/write" on public.quotes
  for all using (org_id in (select public.my_org_ids()));
create policy "quotes: admin+ delete" on public.quotes
  for delete using (org_id in (select public.my_admin_org_ids()));

-- Back-fill FK from line_items → quotes now that quotes table exists
alter table public.line_items
  add constraint line_items_quote_id_fkey
  foreign key (quote_id) references public.quotes (id) on delete cascade;


-- ------------------------------------------------------------
-- activities
-- ------------------------------------------------------------
create table if not exists public.activities (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations on delete cascade,
  created_by uuid        references auth.users on delete set null,
  kind       text        not null check (kind in ('paid', 'sent', 'overdue', 'viewed')),
  parts      jsonb       not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;
create policy "activities: members read/write" on public.activities
  for all using (org_id in (select public.my_org_ids()));


-- ------------------------------------------------------------
-- Auto-provision: create org + owner membership on first sign-up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index if not exists org_members_user    on public.org_members (user_id);
create index if not exists org_members_org     on public.org_members (org_id);
create index if not exists invoices_org_issued on public.invoices    (org_id, issued_at desc);
create index if not exists payments_org_date   on public.payments    (org_id, date desc);
create index if not exists quotes_org_issued   on public.quotes      (org_id, issued_at desc);
create index if not exists activities_org_time on public.activities  (org_id, created_at desc);
create index if not exists clients_org_name    on public.clients     (org_id, name);
create index if not exists products_org_name   on public.products    (org_id, name);
