-- Enable Supabase Realtime for accounting tables.
-- Run this once in the Supabase SQL editor.

-- 1. Add tables to the realtime publication
alter publication supabase_realtime add table
  public.journal_entries,
  public.fixed_assets,
  public.supplier_bills;

-- 2. Enable REPLICA IDENTITY FULL so UPDATE/DELETE events carry the old row
--    (required to match on id/org_id for client-side filtering)
alter table public.journal_entries  replica identity full;
alter table public.fixed_assets     replica identity full;
alter table public.supplier_bills   replica identity full;
