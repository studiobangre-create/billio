-- Add RCCM field to clients table for compliance display on invoices
alter table public.clients
  add column if not exists rccm text not null default '';
