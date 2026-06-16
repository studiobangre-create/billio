-- 1. Patch create_initial_org to seed journals for every new org at creation time.
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

  -- Seed default journals + fiscal periods so accounting works immediately.
  perform public.seed_org_accounting(v_org_id);

  return v_org_id;
end;
$$;


-- 2. Backfill: seed any existing org that has no journals yet.
do $$
declare
  r record;
begin
  for r in
    select id from public.organizations o
    where not exists (
      select 1 from public.journals j where j.org_id = o.id
    )
  loop
    perform public.seed_org_accounting(r.id);
  end loop;
end;
$$;
