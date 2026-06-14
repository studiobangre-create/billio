-- Allows a newly-signed-up user who has no org yet (e.g. trigger didn't fire)
-- to bootstrap their first organisation from the client.
-- SECURITY DEFINER bypasses RLS so the INSERT succeeds even when
-- org_members has no existing row for this user.
create or replace function public.create_initial_org(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  -- Idempotent: if the user already has an org, just return it.
  select org_id into v_org_id
  from public.org_members
  where user_id = auth.uid()
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  insert into public.organizations (name)
  values (p_name)
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  return v_org_id;
end;
$$;
