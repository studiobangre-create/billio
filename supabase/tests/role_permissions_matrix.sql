-- Role × command matrix for the org data tables. Each cell runs one
-- statement as the given user inside a savepoint and records Y (allowed:
-- a row was affected) or n (denied: error or no row affected). Raises if any
-- cell differs from the expected matrix.
create or replace function pg_temp.try(p_user uuid, p_sql text) returns text language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  set local role authenticated;
  begin
    execute p_sql;
    get diagnostics n = row_count;
  exception when others then
    n := 0;
  end;
  reset role;
  return case when n > 0 then 'Y' else 'n' end;
end $$;

do $$
declare
  org constant uuid := '00000000-0000-0000-0000-00000000000a';
  users constant text[] := array['owner','admin','accountant','member','observer','outsider'];
  uids  constant uuid[] := array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
                                 '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004',
                                 '00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006']::uuid[];
  -- select / insert / update / delete for each role, in the order of users[]
  standard constant text[] := array['YYYY','YYYY','YYYn','YYYn','Ynnn','nnnn'];
  t text; i int; row_id uuid; got text; want text; failures int := 0;
  expected jsonb := '{}'::jsonb;
begin
  foreach t in array array['clients','invoices','quotes','payments','products','credit_notes',
                           'fixed_assets','journals','supplier_bills'] loop
    expected := expected || jsonb_build_object(t, to_jsonb(standard));
  end loop;
  expected := expected
    -- accounting: owner/admin also update and delete (live admin policies)
    || jsonb_build_object('accounts', to_jsonb(array['YYYY','YYYY','YYnn','YYnn','Ynnn','nnnn']))
    || jsonb_build_object('fiscal_periods', to_jsonb(array['YYYY','YYYY','YYnn','YYnn','Ynnn','nnnn']))
    || jsonb_build_object('entry_lines', to_jsonb(standard))
    || jsonb_build_object('line_items', to_jsonb(array['YYYY','YYYY','YYYY','YYYY','Ynnn','nnnn']))
    || jsonb_build_object('activities', to_jsonb(array['YYnn','YYnn','YYnn','YYnn','Ynnn','nnnn']));

  for t in select jsonb_object_keys(expected) loop
    for i in 1 .. array_length(users, 1) loop
      execute format('insert into public.%I (org_id, name) values ($1, $2) returning id', t) into row_id using org, 'seed';
      got := pg_temp.try(uids[i], format('select 1 from public.%I where id = %L', t, row_id))
          || pg_temp.try(uids[i], format('insert into public.%I (org_id, name) values (%L, %L)', t, org, 'new'))
          || pg_temp.try(uids[i], format('update public.%I set name = %L where id = %L', t, 'edited', row_id))
          || pg_temp.try(uids[i], format('delete from public.%I where id = %L', t, row_id));
      want := expected -> t ->> (i - 1);
      if got <> want then
        failures := failures + 1;
        raise warning '% as %: got % want % (select/insert/update/delete)', t, users[i], got, want;
      end if;
    end loop;
  end loop;

  -- Journal entries: posting is for owner/admin/accountant; posted entries stay out of members' reach
  for i in 1 .. array_length(users, 1) loop
    insert into public.journal_entries (org_id, name) values (org, 'draft') returning id into row_id;
    got := pg_temp.try(uids[i], format('update public.journal_entries set name = %L where id = %L', 'edited', row_id))
        || pg_temp.try(uids[i], format('update public.journal_entries set posted = true where id = %L', row_id));
    insert into public.journal_entries (org_id, name, posted) values (org, 'posted', true) returning id into row_id;
    got := got || pg_temp.try(uids[i], format('update public.journal_entries set posted = false where id = %L', row_id))
        || pg_temp.try(uids[i], format('insert into public.journal_entries (org_id, name, posted) values (%L, %L, true)', org, 'new-posted'));
    want := (array['YYYn','YYYn','YYYn','Ynnn','nnnn','nnnn'])[i];
    if got <> want then
      failures := failures + 1;
      raise warning 'journal_entries as %: got % want % (edit draft/post/un-post/insert posted)', users[i], got, want;
    end if;
  end loop;

  -- update_org_member_role: owner/admin manage others, never themselves or the owner
  got := pg_temp.try(uids[2], format('select public.update_org_member_role(%L, %L, %L)', org, uids[4], 'observer'))  -- admin demotes member
      || pg_temp.try(uids[2], format('select public.update_org_member_role(%L, %L, %L)', org, uids[4], 'member'))    -- and restores them
      || pg_temp.try(uids[4], format('select public.update_org_member_role(%L, %L, %L)', org, uids[3], 'observer'))  -- member can't manage
      || pg_temp.try(uids[2], format('select public.update_org_member_role(%L, %L, %L)', org, uids[2], 'member'))    -- nor change themselves
      || pg_temp.try(uids[2], format('select public.update_org_member_role(%L, %L, %L)', org, uids[1], 'member'))    -- nor the owner
      || pg_temp.try(uids[1], format('select public.update_org_member_role(%L, %L, null)', org, uids[2]))           -- NULL role rejected
      || pg_temp.try(uids[6], format('select public.update_org_member_role(%L, %L, %L)', org, uids[4], 'observer')); -- other org
  if got <> 'YYnnnnn' then
    failures := failures + 1;
    raise warning 'update_org_member_role: got % want YYnnnnn', got;
  end if;

  if failures > 0 then
    raise exception '% permission cell(s) differ from the expected matrix', failures;
  end if;
  raise notice 'Role permission matrix: all cells match';
end $$;
