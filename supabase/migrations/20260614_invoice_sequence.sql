-- Per-org invoice sequence.
-- Atomically increments the counter for an org and returns the next number.
-- Calling next_invoice_number() from two concurrent sessions is safe:
-- the INSERT … ON CONFLICT DO UPDATE holds a row-level lock, so one
-- caller always wins and the other waits — no two callers ever get the
-- same number for the same org.

create table if not exists public.invoice_sequences (
  org_id      uuid primary key references public.organizations(id) on delete cascade,
  last_number integer not null default 0
);

-- Allow authenticated org members to call the function
alter table public.invoice_sequences enable row level security;

create policy "members can read own sequence"
  on public.invoice_sequences for select
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create or replace function public.next_invoice_number(p_org_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  -- Verify caller belongs to this org
  if not exists (
    select 1 from org_members
    where user_id = auth.uid() and org_id = p_org_id
  ) then
    raise exception 'Unauthorized';
  end if;

  insert into invoice_sequences (org_id, last_number)
  values (p_org_id, 1)
  on conflict (org_id) do update
    set last_number = invoice_sequences.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;
