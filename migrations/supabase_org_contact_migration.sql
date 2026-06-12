-- Add contact fields to organizations for invoice display
alter table public.organizations
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '';
