alter table public.clients
  add column if not exists country text not null default 'Burkina Faso';
