-- Client codes were derived from the client's initials ("Sahel Banque" and
-- "Société Burkinabè" both became "SB"), with no uniqueness constraint.
-- Invoices, quotes and payments reference clients by code, so duplicates
-- attached documents to the wrong client.
--
-- New codes come from a per-org sequence (CLI-0001, CLI-0002, …) and
-- (org_id, code) becomes unique.

-- 1. Repair existing duplicates: the oldest client keeps the code (documents
--    already pointing at it stay attached to it); later duplicates get a
--    suffix. Invoices that were meant for a renamed client must be
--    re-assigned by hand — this query lists the renamed clients:
--      select org_id, code, name from clients where code ~ '-DUP[0-9]+$';
--    Suffixes continue after any -DUP<n> already in use for the same base code.
with ranked as (
  select id, org_id, code,
         row_number() over (partition by org_id, code order by created_at, id) as rn
  from public.clients
), suffixes as (
  select org_id,
         regexp_replace(code, '-DUP[0-9]+$', '') as base_code,
         max(substring(code from '-DUP([0-9]+)$')::integer) as max_suffix
  from public.clients
  where code ~ '-DUP[0-9]+$'
  group by org_id, regexp_replace(code, '-DUP[0-9]+$', '')
)
update public.clients c
set code = c.code || '-DUP' || (coalesce(s.max_suffix, 0) + r.rn - 1)
from ranked r
left join suffixes s on s.org_id = r.org_id and s.base_code = r.code
where r.id = c.id and r.rn > 1;

-- 2. Enforce uniqueness
alter table public.clients drop constraint if exists clients_org_code_key;
alter table public.clients add constraint clients_org_code_key unique (org_id, code);

-- 3. Per-org client sequence
create table if not exists public.client_sequences (
  org_id      uuid primary key references public.organizations(id) on delete cascade,
  last_number integer not null default 0
);

alter table public.client_sequences enable row level security;

drop policy if exists "members can read own client sequence" on public.client_sequences;
create policy "members can read own client sequence"
  on public.client_sequences for select
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create or replace function public.next_client_number(p_org_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if not exists (
    select 1 from org_members
    where user_id = auth.uid() and org_id = p_org_id
  ) then
    raise exception 'Unauthorized';
  end if;

  -- Start after any CLI-<n> codes already in use (onboarding created some)
  insert into client_sequences (org_id, last_number)
  values (
    p_org_id,
    coalesce((
      select max(substring(code from '^CLI-(\d+)$')::integer)
      from clients
      where org_id = p_org_id
    ), 0) + 1
  )
  on conflict (org_id) do update
    set last_number = client_sequences.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;
