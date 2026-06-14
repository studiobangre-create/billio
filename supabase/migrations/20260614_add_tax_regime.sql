alter table public.organizations
  add column if not exists tax_regime       text not null default '',
  add column if not exists division_fiscale text not null default '';

alter table public.clients
  add column if not exists tax_regime text not null default '';
