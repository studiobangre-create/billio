-- Credit notes (avoirs) — SYSCOHADA compliance.
-- Sent invoices cannot be deleted; a credit note partially or fully reverses them.

create table if not exists public.credit_notes (
  id          text        primary key,          -- e.g. "AV-0001"
  org_id      uuid        not null references public.organizations(id) on delete cascade,
  invoice_id  text        not null references public.invoices(id) on delete restrict,
  created_by  uuid        references auth.users on delete set null,
  subject     text        not null default '',
  client_code text        not null,
  issued_at   date        not null,
  amount      numeric     not null default 0    check (amount >= 0),
  reason      text        not null default '',
  created_at  timestamptz not null default now()
);

alter table public.credit_notes enable row level security;

create policy "members can manage own credit notes"
  on public.credit_notes for all
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

-- Per-org credit-note sequence (same pattern as invoice_sequences)
create table if not exists public.credit_note_sequences (
  org_id      uuid primary key references public.organizations(id) on delete cascade,
  last_number integer not null default 0
);

alter table public.credit_note_sequences enable row level security;

create policy "members can read own cn sequence"
  on public.credit_note_sequences for select
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create or replace function public.next_credit_note_number(p_org_id uuid)
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

  insert into credit_note_sequences (org_id, last_number)
  values (p_org_id, 1)
  on conflict (org_id) do update
    set last_number = credit_note_sequences.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;
