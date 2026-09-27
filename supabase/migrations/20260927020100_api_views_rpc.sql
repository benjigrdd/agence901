-- Lot 14 : vues (geographie en GeoJSON) et RPC utilisees par l'adaptateur Supabase de @app/data.
-- Toutes en `security invoker` (RLS de l'appelant), sauf mention contraire justifiee.

-- Action d'audit explicite (ex. `transition`) posee par une RPC pour la transaction en cours.
create or replace function private.audit_row_action(p_op text)
returns public.audit_action language sql stable set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.audit_action', true), '')::public.audit_action,
    case p_op when 'INSERT' then 'create'::public.audit_action when 'UPDATE' then 'update'::public.audit_action else 'delete'::public.audit_action end)
$$;

create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_row jsonb := coalesce(v_new, v_old);
  v_excluded text[] := array['created_at', 'updated_at', 'contact_email', 'token'];
  v_diff jsonb := '{}'::jsonb;
  v_key text;
  v_tenant uuid;
  v_ip inet;
begin
  if coalesce(current_setting('app.skip_audit', true), 'off') = 'on' then
    return null;
  end if;
  for v_key in select jsonb_object_keys(coalesce(v_new, '{}'::jsonb) || coalesce(v_old, '{}'::jsonb)) loop
    continue when v_key = any (v_excluded);
    if tg_op = 'UPDATE' and (v_old -> v_key) is not distinct from (v_new -> v_key) then
      continue;
    end if;
    v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('before', coalesce(v_old -> v_key, 'null'::jsonb), 'after', coalesce(v_new -> v_key, 'null'::jsonb)));
  end loop;
  if tg_op = 'UPDATE' and v_diff = '{}'::jsonb then
    return null;
  end if;
  v_tenant := case when tg_table_name = 'tenants' then (v_row ->> 'id')::uuid else (v_row ->> 'tenant_id')::uuid end;
  begin
    v_ip := nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), '')::inet;
  exception when others then
    v_ip := null;
  end;
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, diff, ip)
  values (v_tenant, coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid), private.audit_row_action(tg_op), tg_table_name, (v_row ->> 'id')::uuid, v_diff, v_ip);
  return null;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Vues : colonnes geographiques en GeoJSON (lecture), RLS des tables sous-jacentes
-- ---------------------------------------------------------------------------------------------
create view public.v_tenants with (security_invoker = true) as
  select t.*, extensions.st_asgeojson(t.center)::jsonb as center_geo from public.tenants t;

create view public.v_places with (security_invoker = true) as
  select p.*, extensions.st_asgeojson(p.point)::jsonb as point_geo from public.places p;

create view public.v_events with (security_invoker = true) as
  select e.*, extensions.st_asgeojson(e.location_point)::jsonb as location_point_geo from public.events e;

create view public.v_districts with (security_invoker = true) as
  select d.*, extensions.st_asgeojson(d.geom)::jsonb as geom_geo from public.districts d;

create view public.v_waste_zones with (security_invoker = true) as
  select z.*, extensions.st_asgeojson(z.geom)::jsonb as geom_geo from public.waste_zones z;

create view public.v_reports with (security_invoker = true) as
  select r.*, extensions.st_asgeojson(r.point)::jsonb as point_geo,
    coalesce((select array_agg(m.path order by m.created_at) from public.report_media m where m.tenant_id = r.tenant_id and m.report_id = r.id), '{}') as photo_paths
  from public.reports r;

-- ---------------------------------------------------------------------------------------------
-- Contenus : transition + validation dans une meme transaction
-- ---------------------------------------------------------------------------------------------
create or replace function public.transition_content(p_entity public.reviewable_entity, p_id uuid, p_to public.content_status, p_comment text default null, p_publish_at timestamptz default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from public.content_status;
  v_tenant uuid;
  v_publish timestamptz;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if p_entity = 'post' then
    select status, tenant_id, publish_at into v_from, v_tenant, v_publish from public.posts where id = p_id;
  else
    select status, tenant_id, publish_at into v_from, v_tenant, v_publish from public.events where id = p_id;
  end if;
  if v_tenant is null then
    perform private.raise_app('APP_NOT_FOUND', 'Contenu introuvable');
  end if;
  if v_from = 'pending_review' and p_to = 'draft' and v_comment is null then
    perform private.raise_app('APP_COMMENT_REQUIRED', 'Un motif est obligatoire pour refuser');
  end if;
  v_publish := case
    when p_to = 'scheduled' then coalesce(p_publish_at, v_publish)
    when p_to = 'published' then case when v_publish is not null and v_publish <= now() then v_publish else now() end
    else v_publish
  end;
  perform set_config('app.audit_action', 'transition', true);
  if p_entity = 'post' then
    update public.posts set status = p_to, publish_at = v_publish,
      reviewer_id = case when p_to in ('published', 'scheduled') or (v_from = 'pending_review' and p_to = 'draft') then auth.uid() else reviewer_id end
    where id = p_id;
  else
    update public.events set status = p_to, publish_at = v_publish,
      reviewer_id = case when p_to in ('published', 'scheduled') or (v_from = 'pending_review' and p_to = 'draft') then auth.uid() else reviewer_id end
    where id = p_id;
  end if;
  perform set_config('app.audit_action', '', true);
  if p_to = 'pending_review' then
    insert into public.content_reviews (tenant_id, entity_type, entity_id, action, comment, author_id) values (v_tenant, p_entity, p_id, 'submitted', v_comment, auth.uid());
  elsif v_from = 'pending_review' and p_to = 'draft' then
    insert into public.content_reviews (tenant_id, entity_type, entity_id, action, comment, author_id) values (v_tenant, p_entity, p_id, 'rejected', v_comment, auth.uid());
  elsif v_from = 'pending_review' and p_to in ('published', 'scheduled') then
    insert into public.content_reviews (tenant_id, entity_type, entity_id, action, comment, author_id) values (v_tenant, p_entity, p_id, 'approved', v_comment, auth.uid());
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Signalements
-- ---------------------------------------------------------------------------------------------
-- File des notifications individuelles (suivi d'un signalement) : ecriture reservee au serveur.
create or replace function private.enqueue_report_update(p_tenant uuid, p_report uuid, p_message text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_reference text;
begin
  select reporter_id, reference into v_user, v_reference from public.reports where tenant_id = p_tenant and id = p_report;
  if v_user is not null then
    insert into public.push_outbox (tenant_id, user_id, kind, payload)
    values (p_tenant, v_user, 'report_update', jsonb_build_object('reportId', p_report, 'reference', v_reference, 'message', p_message));
  end if;
end;
$$;
revoke execute on function private.enqueue_report_update(uuid, uuid, text) from public;
grant execute on function private.enqueue_report_update(uuid, uuid, text) to authenticated;

create or replace function public.update_report_status(p_id uuid, p_to public.report_status, p_message text default null, p_public boolean default true, p_duplicate_of uuid default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_report public.reports;
  v_service uuid;
  v_public boolean := p_public or p_to = 'rejected';
begin
  select * into v_report from public.reports where id = p_id;
  if v_report.id is null then
    perform private.raise_app('APP_NOT_FOUND', 'Signalement introuvable');
  end if;
  -- Premiere prise en charge : service par defaut de la categorie.
  if v_report.status = 'new' and v_report.service_id is null then
    select default_service_id into v_service from public.report_categories where tenant_id = v_report.tenant_id and id = v_report.category_id;
  end if;
  perform set_config('app.audit_action', 'transition', true);
  update public.reports set status = p_to,
    duplicate_of_id = case when p_to = 'duplicate' then p_duplicate_of else duplicate_of_id end,
    service_id = coalesce(service_id, v_service)
  where id = p_id;
  perform set_config('app.audit_action', '', true);
  insert into public.report_events (tenant_id, report_id, kind, from_status, to_status, message, visibility, author_id)
  values (v_report.tenant_id, p_id, 'status_change', v_report.status, p_to, nullif(trim(coalesce(p_message, '')), ''), case when v_public then 'public'::public.visibility else 'internal'::public.visibility end, auth.uid());
  if v_public then
    perform private.enqueue_report_update(v_report.tenant_id, p_id, nullif(trim(coalesce(p_message, '')), ''));
  end if;
end;
$$;

create or replace function public.assign_report(p_id uuid, p_service_id uuid default null)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_tenant uuid;
  v_name text;
begin
  select tenant_id into v_tenant from public.reports where id = p_id;
  if v_tenant is null then
    perform private.raise_app('APP_NOT_FOUND', 'Signalement introuvable');
  end if;
  if p_service_id is not null then
    select name into v_name from public.services where tenant_id = v_tenant and id = p_service_id;
    if v_name is null then
      perform private.raise_app('APP_UNKNOWN_SERVICE', 'Service inconnu');
    end if;
  end if;
  update public.reports set service_id = p_service_id where id = p_id;
  insert into public.report_events (tenant_id, report_id, kind, message, visibility, author_id)
  values (v_tenant, p_id, 'assignment', case when v_name is null then 'Assignation retirée.' else format('Assigné au service %s.', v_name) end, 'internal', auth.uid());
end;
$$;

create or replace function public.add_report_note(p_id uuid, p_message text)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_report public.reports;
begin
  select * into v_report from public.reports where id = p_id;
  if v_report.id is null then
    perform private.raise_app('APP_NOT_FOUND', 'Signalement introuvable');
  end if;
  if v_report.status = 'duplicate' then
    perform private.raise_app('APP_DUPLICATE_READ_ONLY', 'Signalement en lecture seule : il s’agit d’un doublon');
  end if;
  if length(trim(coalesce(p_message, ''))) = 0 then
    perform private.raise_app('APP_EMPTY_NOTE', 'La note est vide');
  end if;
  insert into public.report_events (tenant_id, report_id, kind, message, visibility, author_id)
  values (v_report.tenant_id, p_id, 'comment', trim(p_message), 'internal', auth.uid());
end;
$$;

-- Signalements ouverts de meme categorie, crees depuis moins de 30 jours, dans le rayon donne.
create or replace function public.reports_nearby(p_report_id uuid, p_radius_m double precision)
returns table (report_id uuid, distance_m integer)
language sql stable security invoker set search_path = ''
as $$
  select o.id, round(extensions.st_distance(o.point, r.point))::integer
  from public.reports r
  join public.reports o on o.tenant_id = r.tenant_id and o.id <> r.id and o.category_id = r.category_id
  where r.id = p_report_id
    and o.status in ('new', 'acknowledged', 'in_progress')
    and o.created_at >= now() - interval '30 days'
    and extensions.st_dwithin(o.point, r.point, p_radius_m)
  order by 2
$$;

create or replace function public.report_ids_in_district(p_district_id uuid)
returns setof uuid
language sql stable security invoker set search_path = ''
as $$
  select r.id from public.reports r
  join public.districts d on d.tenant_id = r.tenant_id and d.id = p_district_id
  where extensions.st_intersects(r.point, d.geom)
$$;

create or replace function public.report_stats(p_tenant_id uuid)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with r as (
    select rp.*, coalesce(c.sla_days, 7) as sla
    from public.reports rp left join public.report_categories c on c.tenant_id = rp.tenant_id and c.id = rp.category_id
    where rp.tenant_id = p_tenant_id
  ),
  weeks as (
    select w as idx, now() - ((12 - w) * interval '7 days') as start_at from generate_series(0, 11) w
  )
  select jsonb_build_object(
    'new', (select count(*) from r where status = 'new'),
    'inProgress', (select count(*) from r where status = 'in_progress'),
    'open', (select count(*) from r where status in ('new', 'acknowledged', 'in_progress')),
    'overdue', (select count(*) from r where status in ('new', 'acknowledged', 'in_progress') and floor(extract(epoch from now() - created_at) / 86400) > sla),
    'averageResolutionDays', (select round((avg(extract(epoch from resolved_at - created_at)) / 86400)::numeric, 1) from r where resolved_at >= now() - interval '30 days'),
    'weekly', (select jsonb_agg(jsonb_build_object(
        'weekStart', to_char(w.start_at, 'YYYY-MM-DD'),
        'created', (select count(*) from r where created_at >= w.start_at and created_at < w.start_at + interval '7 days'),
        'resolved', (select count(*) from r where resolved_at >= w.start_at and resolved_at < w.start_at + interval '7 days')
      ) order by w.idx) from weeks w)
  )
$$;

-- Statistiques par quartier : les profils des habitants ne sont pas lisibles par le personnel, d'ou le
-- `security definer`, protege par la verification explicite des droits.
create or replace function public.district_stats(p_tenant_id uuid)
returns table (district_id uuid, reports integer, subscribers integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_staff(p_tenant_id) then
    return;
  end if;
  return query
    select d.id,
      (select count(*)::integer from public.reports r where r.tenant_id = d.tenant_id and extensions.st_intersects(r.point, d.geom)),
      (select count(*)::integer from public.citizen_profiles c where c.tenant_id = d.tenant_id and d.id = any (c.district_ids))
    from public.districts d where d.tenant_id = p_tenant_id;
end;
$$;

-- Audience d'une notification (nombre d'habitants), sans exposer les profils.
create or replace function public.estimate_audience(p_tenant_id uuid, p_target jsonb)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_type text := p_target ->> 'type';
  v_ids uuid[] := coalesce(array(select jsonb_array_elements_text(p_target -> 'ids'))::uuid[], '{}');
begin
  if not private.has_permission(p_tenant_id, 'notifications', 'read') then
    perform private.raise_app('APP_FORBIDDEN', 'Accès refusé');
  end if;
  return (
    select count(*)::integer from public.citizen_profiles c
    where c.tenant_id = p_tenant_id
      and (v_type = 'all' or (v_type = 'districts' and c.district_ids && v_ids) or (v_type = 'topics' and c.topic_ids && v_ids))
  );
end;
$$;

create or replace function public.reorder_procedures(p_tenant_id uuid, p_ids uuid[])
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  perform set_config('app.audit_action', 'reorder', true);
  update public.procedures p set sort_order = o.pos - 1
  from unnest(p_ids) with ordinality as o(id, pos)
  where p.tenant_id = p_tenant_id and p.id = o.id and p.sort_order is distinct from o.pos - 1;
  perform set_config('app.audit_action', '', true);
end;
$$;

-- Droits d'un membre (role + droits par module), atomique.
create or replace function public.set_member_permissions(p_membership_id uuid, p_role public.app_role, p_permissions jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_tenant uuid;
  v_module text;
begin
  select tenant_id into v_tenant from public.memberships where id = p_membership_id;
  if v_tenant is null then
    perform private.raise_app('APP_NOT_FOUND', 'Membre introuvable');
  end if;
  perform set_config('app.audit_action', 'permissions', true);
  update public.memberships set role = p_role where id = p_membership_id;
  delete from public.membership_permissions where membership_id = p_membership_id;
  if p_role = 'agent' then
    for v_module in select jsonb_object_keys(coalesce(p_permissions, '{}'::jsonb)) loop
      insert into public.membership_permissions (tenant_id, membership_id, module, level)
      values (v_tenant, p_membership_id, v_module::public.module_key, (p_permissions ->> v_module)::public.permission_level);
    end loop;
  end if;
  perform set_config('app.audit_action', '', true);
end;
$$;

-- Creation d'une commune par l'editeur : commune (+ donnees par defaut par trigger), marque, modules actifs.
create or replace function public.create_tenant(p_identity jsonb, p_branding jsonb, p_modules public.module_key[])
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_platform_admin() then
    perform private.raise_app('APP_FORBIDDEN', 'Action réservée à l''éditeur');
  end if;
  if exists (select 1 from public.tenants where slug = p_identity ->> 'slug') then
    perform private.raise_app('APP_SLUG_TAKEN', 'Cet identifiant d’URL est déjà utilisé');
  end if;
  insert into public.tenants (slug, name, type, insee_code, population, center, plan, status)
  values (
    p_identity ->> 'slug', p_identity ->> 'name', (p_identity ->> 'type')::public.tenant_type, p_identity ->> 'inseeCode',
    (p_identity ->> 'population')::integer,
    format('SRID=4326;POINT(%s %s)', p_identity -> 'center' ->> 'lng', p_identity -> 'center' ->> 'lat')::extensions.geography,
    (p_identity ->> 'plan')::public.tenant_plan, 'onboarding'
  ) returning id into v_id;
  insert into public.tenant_branding (tenant_id, app_name, short_name, colors, logo_url)
  values (v_id, p_branding ->> 'appName', p_branding ->> 'shortName', p_branding -> 'colors', p_branding ->> 'logoUrl');
  update public.tenant_modules set enabled = (module = any (p_modules)) and module not in ('participation', 'mobility', 'services') where tenant_id = v_id;
  return v_id;
end;
$$;

grant execute on function
  public.transition_content(public.reviewable_entity, uuid, public.content_status, text, timestamptz),
  public.update_report_status(uuid, public.report_status, text, boolean, uuid),
  public.assign_report(uuid, uuid), public.add_report_note(uuid, text), public.reports_nearby(uuid, double precision),
  public.report_ids_in_district(uuid), public.report_stats(uuid), public.district_stats(uuid), public.estimate_audience(uuid, jsonb),
  public.reorder_procedures(uuid, uuid[]), public.set_member_permissions(uuid, public.app_role, jsonb),
  public.create_tenant(jsonb, jsonb, public.module_key[])
to authenticated;
revoke execute on function public.district_stats(uuid), public.estimate_audience(uuid, jsonb) from anon;

-- Acces de l'editeur a l'espace d'une commune : trace dans son audit (au plus une entree par 30 minutes).
create or replace function public.record_platform_access(p_tenant_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    perform private.raise_app('APP_FORBIDDEN', 'Action réservée à l''éditeur');
  end if;
  if exists (
    select 1 from public.audit_log
    where tenant_id = p_tenant_id and actor_id = auth.uid() and action = 'platform_access' and at >= now() - interval '30 minutes'
  ) then
    return;
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, diff)
  values (p_tenant_id, auth.uid(), 'platform_access', 'tenants', p_tenant_id, '{"access": {"before": null, "after": "dashboard"}}'::jsonb);
end;
$$;
revoke execute on function public.record_platform_access(uuid) from public, anon;
grant execute on function public.record_platform_access(uuid) to authenticated;

-- La reference est attribuee par trigger : colonne optionnelle a l'insertion (API).
alter table public.reports alter column reference set default '';
create or replace function private.assign_report_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from (coalesce(new.created_at, now()) at time zone 'Europe/Paris'))::integer;
begin
  if coalesce(new.reference, '') = '' then
    new.reference := format('%s-%s', v_year, lpad(private.next_counter(new.tenant_id, 'report', v_year)::text, 5, '0'));
  end if;
  return new;
end;
$$;
