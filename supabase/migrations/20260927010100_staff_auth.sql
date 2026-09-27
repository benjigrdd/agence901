-- Lot 13 : invitations et acceptation par le personnel.

-- L'appelant peut-il gerer les membres de cette commune ? (admin de la commune ou editeur, 2FA validee)
create or replace function public.can_manage_members(p_tenant_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.has_role(p_tenant_id, '{admin}') or private.is_platform_admin() $$;
grant execute on function public.can_manage_members(uuid) to authenticated;

-- Enregistre une invitation (profil, appartenance, droits) de facon atomique et auditee.
-- Appelee uniquement par l'Edge Function `invite-member` (cle service), apres verification de l'appelant.
create or replace function public.record_invitation(
  p_tenant_id uuid,
  p_user_id uuid,
  p_display_name text,
  p_role public.app_role,
  p_permissions jsonb,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership_id uuid;
  v_module text;
begin
  perform set_config('app.actor_id', p_actor_id::text, true);
  insert into public.profiles (id, display_name) values (p_user_id, p_display_name)
  on conflict (id) do nothing;
  if exists (select 1 from public.memberships where tenant_id = p_tenant_id and user_id = p_user_id) then
    perform private.raise_app('APP_ALREADY_MEMBER', 'Cette personne est déjà membre de la commune');
  end if;
  insert into public.memberships (tenant_id, user_id, role, invited_at)
  values (p_tenant_id, p_user_id, p_role, now())
  returning id into v_membership_id;
  if p_role = 'agent' then
    for v_module in select jsonb_object_keys(coalesce(p_permissions, '{}'::jsonb)) loop
      insert into public.membership_permissions (tenant_id, membership_id, module, level)
      values (p_tenant_id, v_membership_id, v_module::public.module_key, (p_permissions ->> v_module)::public.permission_level);
    end loop;
  end if;
  return v_membership_id;
end;
$$;
revoke execute on function public.record_invitation(uuid, uuid, text, public.app_role, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.record_invitation(uuid, uuid, text, public.app_role, jsonb, uuid) to service_role;

-- Acceptation : l'invite a choisi son mot de passe.
create or replace function public.accept_invitations()
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.memberships set accepted_at = now()
    where user_id = auth.uid() and accepted_at is null and disabled_at is null
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function public.accept_invitations() from public, anon;
grant execute on function public.accept_invitations() to authenticated;

-- Derniere connexion : lue par l'ecran Membres (sans exposer auth.users).
create or replace function public.staff_last_sign_in(p_tenant_id uuid)
returns table (user_id uuid, email text, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text, u.last_sign_in_at
  from auth.users u
  join public.memberships m on m.user_id = u.id and m.tenant_id = p_tenant_id
  where private.is_staff(p_tenant_id)
$$;
revoke execute on function public.staff_last_sign_in(uuid) from public, anon;
grant execute on function public.staff_last_sign_in(uuid) to authenticated;
