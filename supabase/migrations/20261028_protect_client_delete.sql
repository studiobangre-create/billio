-- Invoices, quotes, payments and credit notes reference clients by code with
-- no foreign key, so deleting a client left those documents without a client.
-- Refuse the delete; the app offers to mark the client inactive instead.
create or replace function public.prevent_client_delete_with_documents()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Deleting the whole organisation cascades to its clients and documents
  if not exists (select 1 from organizations where id = old.org_id) then
    return old;
  end if;

  if exists (select 1 from invoices where org_id = old.org_id and client_code = old.code)
     or exists (select 1 from quotes   where org_id = old.org_id and client_code = old.code)
     or exists (select 1 from payments where org_id = old.org_id and client_code = old.code)
     or exists (select 1 from credit_notes where org_id = old.org_id and client_code = old.code)
  then
    raise exception 'Client % has documents and cannot be deleted', old.code
      using errcode = 'P0001', hint = 'client_has_documents';
  end if;
  return old;
end;
$$;

drop trigger if exists clients_prevent_delete_with_documents on public.clients;
create trigger clients_prevent_delete_with_documents
  before delete on public.clients
  for each row execute function public.prevent_client_delete_with_documents();
