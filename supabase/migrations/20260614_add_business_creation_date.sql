alter table public.organizations
  add column if not exists business_creation_date date;
