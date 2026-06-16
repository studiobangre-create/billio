alter table public.line_items
  add column if not exists product_id text references public.products on delete set null;

create index if not exists line_items_product_id on public.line_items (product_id);
