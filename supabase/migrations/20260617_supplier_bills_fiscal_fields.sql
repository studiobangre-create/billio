alter table supplier_bills
  add column if not exists ifu              text not null default '',
  add column if not exists rccm             text not null default '',
  add column if not exists tax_regime       text not null default '',
  add column if not exists fiscal_division  text not null default '';
