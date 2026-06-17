-- Add fiscal_division field to clients table
alter table public.clients
  add column if not exists fiscal_division text not null default '';
