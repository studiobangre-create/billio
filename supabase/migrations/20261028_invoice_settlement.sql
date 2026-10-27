-- Invoice settlement: payments and credit notes against an invoice's balance.
--
-- Before this, any payment marked the invoice paid (even a partial one), the
-- payment insert and the status update were two separate requests, and credit
-- notes were only checked one at a time against the invoice total.
--
-- balance = invoices.amount − completed payments − credit notes

create or replace function public.invoice_balance(p_org_id uuid, p_invoice_id text)
returns numeric
language sql
stable
set search_path = public
as $$
  select i.amount
       - coalesce((select sum(p.amount) from payments p
                   where p.org_id = i.org_id and p.inv_id = i.id and p.status = 'completed'), 0)
       - coalesce((select sum(c.amount) from credit_notes c
                   where c.org_id = i.org_id and c.invoice_id = i.id), 0)
  from invoices i
  where i.org_id = p_org_id and i.id = p_invoice_id;
$$;

-- Mark an issued invoice paid once nothing is left to collect.
create or replace function public.refresh_invoice_status(p_org_id uuid, p_invoice_id text)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  update invoices
     set status = 'paid'
   where org_id = p_org_id and id = p_invoice_id
     and status in ('pending', 'overdue')
     and invoice_balance(p_org_id, p_invoice_id) <= 0;

  select status into v_status from invoices where org_id = p_org_id and id = p_invoice_id;
  return v_status;
end;
$$;

-- Record a payment against an invoice in one transaction.
-- SECURITY INVOKER: the inserts and updates go through the caller's RLS.
-- p_amount is the amount settled, including any amounts withheld at source.
create or replace function public.record_invoice_payment(
  p_org_id     uuid,
  p_invoice_id text,
  p_date       date,
  p_method     text,
  p_ref        text,
  p_amount     numeric
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_status     text;
  v_balance    numeric;
  v_payment_id text;
  v_client     text;
begin
  -- Lock the invoice so concurrent payments are applied one after the other
  select status, client_code into v_status, v_client
    from invoices
   where org_id = p_org_id and id = p_invoice_id
   for update;

  if not found then
    raise exception 'Invoice % not found', p_invoice_id using errcode = 'P0002';
  end if;
  if v_status not in ('pending', 'overdue') then
    raise exception 'Invoice % is not open (status %)', p_invoice_id, v_status using errcode = 'P0001', hint = 'invoice_not_open';
  end if;

  v_balance := invoice_balance(p_org_id, p_invoice_id);
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be positive' using errcode = 'P0001', hint = 'invalid_amount';
  end if;
  if p_amount > v_balance then
    raise exception 'Payment of % exceeds the balance of %', p_amount, v_balance using errcode = 'P0001', hint = 'exceeds_balance';
  end if;

  v_payment_id := 'PAI-' || lpad(next_payment_number(p_org_id)::text, 4, '0');

  insert into payments (id, org_id, created_by, date, client_code, inv_id, method, ref, amount, status, source)
  values (v_payment_id, p_org_id, auth.uid(), p_date, v_client, p_invoice_id, p_method, coalesce(p_ref, ''), p_amount, 'completed', 'manual');

  v_status := refresh_invoice_status(p_org_id, p_invoice_id);

  return jsonb_build_object(
    'payment_id',     v_payment_id,
    'client_code',    v_client,
    'invoice_status', v_status,
    'balance',        invoice_balance(p_org_id, p_invoice_id)
  );
end;
$$;

-- Credit notes may not add up to more than the invoice total.
create or replace function public.check_credit_note_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_amount   numeric;
  v_credited numeric;
begin
  select amount into v_amount
    from invoices
   where org_id = new.org_id and id = new.invoice_id
   for update;

  select coalesce(sum(amount), 0) into v_credited
    from credit_notes
   where org_id = new.org_id and invoice_id = new.invoice_id;

  if v_credited + new.amount > v_amount then
    raise exception 'Credit notes (% + %) exceed invoice total %', v_credited, new.amount, v_amount
      using errcode = 'P0001', hint = 'exceeds_invoice_total';
  end if;
  return new;
end;
$$;

create or replace function public.after_credit_note_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform refresh_invoice_status(new.org_id, new.invoice_id);
  return new;
end;
$$;

drop trigger if exists credit_notes_check_total on public.credit_notes;
create trigger credit_notes_check_total
  before insert on public.credit_notes
  for each row execute function public.check_credit_note_total();

drop trigger if exists credit_notes_refresh_invoice on public.credit_notes;
create trigger credit_notes_refresh_invoice
  after insert on public.credit_notes
  for each row execute function public.after_credit_note_insert();
