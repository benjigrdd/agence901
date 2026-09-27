-- Lot 12 : fonctions d'aide aux policies (schema prive, evaluees une fois par requete via `(select ...)`).

-- Notes internes de l'editeur : table separee (jamais lisible par la commune ni par l'app).
create table public.tenant_internal_notes (
  tenant_id uuid primary key references public.tenants (id) on delete restrict,
  notes text check (length(notes) <= 2000),
  updated_at timestamptz not null default now()
);
insert into public.tenant_internal_notes (tenant_id, notes) select id, internal_notes from public.tenants where internal_notes is not null;
alter table public.tenants drop column internal_notes;
alter table public.tenant_internal_notes enable row level security;
create trigger tenant_internal_notes_set_updated_at before update on public.tenant_internal_notes for each row execute function private.set_updated_at();

create or replace function private.is_aal2()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;

-- Super-admin : drapeau `app_metadata.platform_admin` (pose par le serveur, jamais par l'utilisateur) et 2FA.
create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_aal2() and coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false) $$;

-- Commune ouverte a son personnel (une commune suspendue n'est plus accessible, sauf a l'editeur).
create or replace function private.tenant_open(t uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tenants where id = t and status <> 'suspended') $$;

-- Commune active : son contenu public est lisible par l'app.
create or replace function private.tenant_active(t uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tenants where id = t and status = 'active') $$;

create or replace function private.has_role(t uuid, roles public.app_role[] default '{admin,agent}')
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_aal2() and private.tenant_open(t) and exists (
    select 1 from public.memberships m
    where m.tenant_id = t and m.user_id = auth.uid() and m.disabled_at is null and m.role = any (roles)
  )
$$;

-- Personnel de la commune ou editeur (2FA obligatoire).
create or replace function private.is_staff(t uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_platform_admin() or private.has_role(t) $$;

-- Meme logique que `can()` de @app/shared : editeur et admin actif => tout ; agent actif => niveau configure
-- (read < edit < publish), jamais sur les modules reserves aux administrateurs (audit).
create or replace function private.has_permission(t uuid, m public.module_key, lvl public.permission_level)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_platform_admin()
    or private.has_role(t, '{admin}')
    or (
      m <> 'audit' and private.has_role(t, '{agent}') and exists (
        select 1 from public.memberships ms
        join public.membership_permissions p on p.membership_id = ms.id and p.tenant_id = ms.tenant_id
        where ms.tenant_id = t and ms.user_id = auth.uid() and ms.disabled_at is null and ms.role = 'agent'
          and p.module = m and p.level >= lvl
      )
    )
$$;

-- Commune de l'habitant connecte (profil citoyen).
create or replace function private.citizen_tenant()
returns uuid language sql stable security definer set search_path = ''
as $$ select tenant_id from public.citizen_profiles where user_id = auth.uid() $$;

-- Module active pour la commune (les modules non activables sont toujours actifs).
create or replace function private.module_enabled(t uuid, m public.module_key)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when not exists (select 1 from public.tenant_modules where tenant_id = t and module = m) then m not in ('news', 'events', 'reports', 'map', 'mobility', 'procedures', 'participation', 'notifications', 'services', 'environment')
    else exists (select 1 from public.tenant_modules where tenant_id = t and module = m and enabled)
  end
$$;

-- Contenu public d'un module : commune active et module active.
create or replace function private.public_module(t uuid, m public.module_key)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.tenant_active(t) and private.module_enabled(t, m) $$;

-- Premier segment d'un chemin de stockage converti en uuid (null si invalide).
create or replace function private.path_uuid(p_name text, p_index integer)
returns uuid language plpgsql immutable set search_path = ''
as $$
begin
  return (storage.foldername(p_name))[p_index]::uuid;
exception when others then
  return null;
end;
$$;

-- Les policies s'executent avec le role de l'appelant : il doit pouvoir appeler ces fonctions (et seulement elles).
grant usage on schema private to anon, authenticated;
grant execute on function
  private.is_aal2(), private.is_platform_admin(), private.tenant_open(uuid), private.tenant_active(uuid),
  private.has_role(uuid, public.app_role[]), private.is_staff(uuid), private.has_permission(uuid, public.module_key, public.permission_level),
  private.citizen_tenant(), private.module_enabled(uuid, public.module_key), private.public_module(uuid, public.module_key),
  private.path_uuid(text, integer)
to anon, authenticated;

-- Modules activables : liste exacte de TENANT_MODULES.
alter table public.tenant_modules drop constraint tenant_modules_module_check;
alter table public.tenant_modules add constraint tenant_modules_module_check
  check (module in ('news', 'events', 'reports', 'map', 'mobility', 'procedures', 'participation', 'notifications', 'services', 'environment'));
