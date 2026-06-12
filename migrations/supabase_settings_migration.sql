-- ============================================================
-- Billio — settings migration
-- Add business-detail columns to organizations
-- ============================================================
alter table public.organizations
  add column if not exists ifu      text not null default '',
  add column if not exists rccm     text not null default '',
  add column if not exists address  text not null default '',
  add column if not exists city     text not null default '',
  add column if not exists country  text not null default 'Burkina Faso',
  add column if not exists currency text not null default 'F CFA';
