-- Add withholding_scenario to clients table.
-- Governs the retenue à la source rate applied when a client pays a service invoice
-- (Arts. 206–214 CGI 2021). NULL means no withholding required.
alter table public.clients
  add column if not exists withholding_scenario text
    check (withholding_scenario in (
      'resident-with-ifu',
      'resident-without-ifu',
      'construction',
      'non-resident'
    ));
