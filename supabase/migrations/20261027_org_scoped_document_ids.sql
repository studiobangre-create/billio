-- Document numbers (INV-0001, QUO-0001, AV-0001, PAI-0001) are allocated per
-- organisation, but invoices / quotes / payments / credit_notes used `id` alone
-- as a global primary key — so the second org to issue INV-0001 hit a
-- duplicate-key error. Scope every key (and the foreign keys pointing at them)
-- to (org_id, id).
--
-- The live database does not always match the repo's base schema (some
-- tables may be missing), so each step only runs for tables that exist.
--
-- If this fails on DROP CONSTRAINT because another object depends on one of
-- the old primary keys, that dependency exists only in the live database and
-- must be migrated explicitly — do not add CASCADE here.

do $$
declare
  t text;
begin
  -- 1. Drop foreign keys that reference the global primary keys
  if to_regclass('public.line_items') is not null then
    alter table public.line_items drop constraint if exists line_items_invoice_id_fkey;
    alter table public.line_items drop constraint if exists line_items_quote_id_fkey;
  end if;
  if to_regclass('public.payments') is not null then
    alter table public.payments drop constraint if exists payments_inv_id_fkey;
  end if;
  if to_regclass('public.credit_notes') is not null then
    alter table public.credit_notes drop constraint if exists credit_notes_invoice_id_fkey;
  end if;

  -- 2. Replace the global primary keys with per-org composite keys
  foreach t in array array['invoices', 'quotes', 'payments', 'credit_notes'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I drop constraint if exists %I', t, t || '_pkey');
      execute format('alter table public.%I add constraint %I primary key (org_id, id)', t, t || '_pkey');
    end if;
  end loop;

  -- 3. Re-create the foreign keys as composite, org-scoped references
  if to_regclass('public.line_items') is not null and to_regclass('public.invoices') is not null then
    alter table public.line_items
      add constraint line_items_invoice_id_fkey
      foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete cascade;
  end if;

  if to_regclass('public.line_items') is not null and to_regclass('public.quotes') is not null then
    alter table public.line_items
      add constraint line_items_quote_id_fkey
      foreign key (org_id, quote_id) references public.quotes (org_id, id) on delete cascade;
  end if;

  -- SET NULL (inv_id) only clears the invoice reference, not org_id (PG 15+)
  if to_regclass('public.payments') is not null and to_regclass('public.invoices') is not null then
    alter table public.payments
      add constraint payments_inv_id_fkey
      foreign key (org_id, inv_id) references public.invoices (org_id, id) on delete set null (inv_id);
  end if;

  if to_regclass('public.credit_notes') is not null and to_regclass('public.invoices') is not null then
    alter table public.credit_notes
      add constraint credit_notes_invoice_id_fkey
      foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete restrict;
  end if;
end;
$$;


-- 4. Per-org payment sequence (payment ids used to be computed in the browser
--    from the locally loaded list, which raced and collided across orgs).
create table if not exists public.payment_sequences (
  org_id      uuid primary key references public.organizations(id) on delete cascade,
  last_number integer not null default 0
);

alter table public.payment_sequences enable row level security;

drop policy if exists "members can read own payment sequence" on public.payment_sequences;
create policy "members can read own payment sequence"
  on public.payment_sequences for select
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create or replace function public.next_payment_number(p_org_id uuid)
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

  -- First call for an org starts after the highest existing PAI-<n> so that
  -- previously recorded payments are never reused.
  insert into payment_sequences (org_id, last_number)
  values (
    p_org_id,
    coalesce((
      select max(substring(id from '^PAI-(\d+)$')::integer)
      from payments
      where org_id = p_org_id
    ), 0) + 1
  )
  on conflict (org_id) do update
    set last_number = payment_sequences.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;
