-- Add fiscal regime and division fields to organizations table (Burkina Faso compliance)
alter table organizations
  add column if not exists tax_regime       text not null default '',
  add column if not exists division_fiscale text not null default '';

-- Add tax regime to clients table (required on invoices for legal entities)
alter table clients
  add column if not exists tax_regime text not null default '';
