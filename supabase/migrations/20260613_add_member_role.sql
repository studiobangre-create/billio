alter table org_members
  add column if not exists role text not null default 'admin'
    check (role in ('admin', 'accountant', 'member'));
