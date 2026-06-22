-- Per-org quote sequence (mirrors invoice_sequences).
-- Atomically increments the counter so concurrent callers never get the same number.

create table if not exists public.quote_sequences (
  org_id      uuid primary key references public.organizations(id) on delete cascade,
  last_number integer not null default 0
);

alter table public.quote_sequences enable row level security;

create policy "members can read own quote sequence"
  on public.quote_sequences for select
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create or replace function public.next_quote_number(p_org_id uuid)
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

  insert into quote_sequences (org_id, last_number)
  values (p_org_id, 1)
  on conflict (org_id) do update
    set last_number = quote_sequences.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;
