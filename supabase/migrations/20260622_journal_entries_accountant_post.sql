-- Allow accountants to post journal entries.
-- my_admin_org_ids() only covers owner/admin; accountants need the same right
-- to mark entries as posted when creating invoices.
-- We add a narrowly-scoped helper and update only the journal_entries update policy.

create or replace function public.my_posting_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select org_id from public.org_members
  where user_id = auth.uid() and role in ('owner', 'admin', 'accountant');
$$;

-- Replace the update policy so accountants can flip posted=true.
drop policy if exists "journal_entries: members update" on public.journal_entries;
create policy "journal_entries: members update" on public.journal_entries
  for update
  using (org_id in (select public.my_org_ids()))
  with check (
    org_id in (select public.my_org_ids())
    and (
      posted = false                                           -- saving/editing a draft
      or org_id in (select public.my_posting_org_ids())       -- owner/admin/accountant may post
    )
  );
