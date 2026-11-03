-- Lets an organisation's owner or admins change a member's role or remove a
-- member (Paramètres → Équipe). SECURITY DEFINER so the checks below, not the
-- org_members RLS policies, decide who may do it:
--   * the caller must be an owner or admin of the organisation;
--   * the owner can't be changed or removed, and nobody can change or remove
--     themselves (so an organisation can't lose its last admin this way).
-- Removing a member also cancels any pending invitation for their email, so
-- an old invite link can't bring them back.

create or replace function public.update_org_member_role(p_org_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  if p_role not in ('admin', 'accountant', 'member') then
    raise exception 'invalid role %', p_role using errcode = '22023';
  end if;

  select role into v_caller_role from org_members where org_id = p_org_id and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'only owners and admins can manage the team' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own role' using errcode = '42501';
  end if;

  select role into v_target_role from org_members where org_id = p_org_id and user_id = p_user_id;
  if v_target_role is null then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target_role = 'owner' then
    raise exception 'the owner''s role cannot be changed' using errcode = '42501';
  end if;

  update org_members set role = p_role where org_id = p_org_id and user_id = p_user_id;
  -- Removed by someone else in the meantime
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.remove_org_member(p_org_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  select role into v_caller_role from org_members where org_id = p_org_id and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'only owners and admins can manage the team' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'you cannot remove yourself' using errcode = '42501';
  end if;

  select role into v_target_role from org_members where org_id = p_org_id and user_id = p_user_id;
  if v_target_role is null then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target_role = 'owner' then
    raise exception 'the owner cannot be removed' using errcode = '42501';
  end if;

  delete from org_members where org_id = p_org_id and user_id = p_user_id;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  delete from pending_invitations
  where org_id = p_org_id
    and status = 'pending'
    and lower(email) = (select lower(email) from auth.users where id = p_user_id);
end;
$$;

revoke all on function public.update_org_member_role(uuid, uuid, text) from public, anon;
revoke all on function public.remove_org_member(uuid, uuid) from public, anon;
grant execute on function public.update_org_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_org_member(uuid, uuid) to authenticated;
