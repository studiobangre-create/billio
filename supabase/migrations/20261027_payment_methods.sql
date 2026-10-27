-- The app records payments as cash | wire | momo | cheque, but the original
-- check constraint only allowed cash | wave | momo | card, so bank transfers
-- and cheques were rejected. Keep the legacy values so existing rows stay valid.
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments
  add constraint payments_method_check
  check (method in ('cash', 'wire', 'momo', 'cheque', 'wave', 'card'));
