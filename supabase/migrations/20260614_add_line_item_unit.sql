alter table public.line_items
  add column if not exists unit text not null default 'unité';
