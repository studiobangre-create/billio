alter table public.invoices
  add column if not exists discount_pct numeric not null default 0
    check (discount_pct >= 0 and discount_pct <= 100);
