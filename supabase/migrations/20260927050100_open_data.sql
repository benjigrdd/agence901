-- Lot 17 : contour officiel, imports open data (OSM, IRVE) et CSV, export de reversibilite.

-- ---------------------------------------------------------------------------------------------
-- Lieux importes : detachement et attributs complementaires
-- ---------------------------------------------------------------------------------------------
alter table public.places
  -- Lieu importe puis repris a la main : les imports suivants ne l'ecrasent plus.
  add column detached boolean not null default false,
  -- Sous-type OSM (aire de jeux), points de charge, puissances et operateur IRVE…
  add column attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object');

-- La vue fige la liste des colonnes a sa creation : recreee pour exposer les nouvelles colonnes.
drop view public.v_places;
create view public.v_places with (security_invoker = true) as
  select p.*, extensions.st_asgeojson(p.point)::jsonb as point_geo from public.places p;

-- Droit de l'appelant sur un module (verifie par les Edge Functions avec le jeton de l'appelant).
create or replace function public.has_module_permission(p_tenant_id uuid, p_module public.module_key, p_level public.permission_level)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.has_permission(p_tenant_id, p_module, p_level) $$;
grant execute on function public.has_module_permission(uuid, public.module_key, public.permission_level) to authenticated;

-- Appelant editeur (Edge Function `sync-tenant-geometry`).
create or replace function public.is_platform_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_platform_admin() $$;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Territoire de la commune : contour officiel s'il est connu, sinon disque de 5 km autour du centre
-- (communes creees avant la synchronisation, ou geo.api.gouv.fr indisponible).
-- ---------------------------------------------------------------------------------------------
create or replace function public.tenant_contains(p_tenant_id uuid, p_lng double precision, p_lat double precision)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case
      when t.contour is not null then extensions.st_covers(t.contour, v.point)
      else extensions.st_dwithin(t.center, v.point, 5000)
    end
    from public.tenants t,
      lateral (select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as point) v
    where t.id = p_tenant_id
  ), false)
$$;
grant execute on function public.tenant_contains(uuid, double precision, double precision) to anon, authenticated;

-- Contour, centre et population officiels (geo.api.gouv.fr), ecrits par l'Edge Function apres
-- verification du droit editeur de l'appelant.
create or replace function public.set_tenant_geometry(p_tenant_id uuid, p_contour jsonb, p_center jsonb, p_population integer, p_actor_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('app.actor_id', coalesce(p_actor_id::text, ''), true);
  update public.tenants set
    contour = case when p_contour is null then contour
      else extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(p_contour::text), 4326))::extensions.geography end,
    center = case when p_center is null then center
      else extensions.st_setsrid(extensions.st_geomfromgeojson(p_center::text), 4326)::extensions.geography end,
    population = coalesce(p_population, population)
  where id = p_tenant_id;
  if not found then
    perform private.raise_app('APP_NOT_FOUND', 'Commune introuvable');
  end if;
end;
$$;
revoke execute on function public.set_tenant_geometry(uuid, jsonb, jsonb, integer, uuid) from public, anon, authenticated;
grant execute on function public.set_tenant_geometry(uuid, jsonb, jsonb, integer, uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Import idempotent (OSM, IRVE) : upsert sur (commune, source, identifiant externe). Un lieu detache
-- n'est jamais ecrase. Une seule entree d'audit par import, avec ses compteurs par categorie.
-- ---------------------------------------------------------------------------------------------
create or replace function public.upsert_imported_places(p_tenant_id uuid, p_source public.place_source, p_rows jsonb, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb;
  v_key text;
  v_category uuid;
  v_existing public.places;
  v_point extensions.geography;
  v_outcome text;
  v_by_category jsonb := '{}'::jsonb;
  v_totals jsonb := jsonb_build_object('created', 0, 'updated', 0, 'skipped', 0);
begin
  if p_source not in ('osm', 'irve') then
    perform private.raise_app('APP_INVALID_INPUT', 'Source d''import invalide');
  end if;
  perform set_config('app.skip_audit', 'on', true);
  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_key := v_row ->> 'categoryKey';
    select id into v_category from public.place_categories where tenant_id = p_tenant_id and key = v_key;
    select * into v_existing from public.places
      where tenant_id = p_tenant_id and source = p_source and external_id = v_row ->> 'externalId';
    v_point := format('SRID=4326;POINT(%s %s)', (v_row ->> 'lng')::double precision, (v_row ->> 'lat')::double precision)::extensions.geography;
    if v_category is null or v_existing.detached then
      v_outcome := 'skipped';
    elsif v_existing.id is not null then
      update public.places set name = v_row ->> 'name', category_id = v_category, point = v_point,
        address = v_row ->> 'address', opening_hours = v_row ->> 'openingHours', phone = v_row ->> 'phone',
        website = v_row ->> 'website', description = v_row ->> 'description',
        accessibility = jsonb_build_object('wheelchair', coalesce(v_row ->> 'wheelchair', 'unknown'),
          'toilets', coalesce((v_existing.accessibility ->> 'toilets')::boolean, false)),
        attributes = coalesce(v_row -> 'attributes', '{}'::jsonb)
      where id = v_existing.id;
      v_outcome := 'updated';
    else
      insert into public.places (tenant_id, category_id, name, point, address, opening_hours, phone, website, description,
        accessibility, source, external_id, attributes)
      values (p_tenant_id, v_category, v_row ->> 'name', v_point, v_row ->> 'address', v_row ->> 'openingHours',
        v_row ->> 'phone', v_row ->> 'website', v_row ->> 'description',
        jsonb_build_object('wheelchair', coalesce(v_row ->> 'wheelchair', 'unknown'), 'toilets', false),
        p_source, v_row ->> 'externalId', coalesce(v_row -> 'attributes', '{}'::jsonb));
      v_outcome := 'created';
    end if;
    v_totals := jsonb_set(v_totals, array[v_outcome], to_jsonb((v_totals ->> v_outcome)::integer + 1));
    v_by_category := jsonb_set(v_by_category, array[v_key],
      coalesce(v_by_category -> v_key, jsonb_build_object('created', 0, 'updated', 0, 'skipped', 0)));
    v_by_category := jsonb_set(v_by_category, array[v_key, v_outcome], to_jsonb((v_by_category #>> array[v_key, v_outcome])::integer + 1));
  end loop;
  perform set_config('app.skip_audit', 'off', true);

  v_totals := v_totals || jsonb_build_object('byCategory', v_by_category);
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, diff)
  values (p_tenant_id, p_actor_id, case p_source when 'osm' then 'import_osm' else 'import_irve' end::public.audit_action,
    'place', p_tenant_id, jsonb_build_object('counts', jsonb_build_object('before', null, 'after', v_totals)));
  return v_totals;
end;
$$;
revoke execute on function public.upsert_imported_places(uuid, public.place_source, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.upsert_imported_places(uuid, public.place_source, jsonb, uuid) to service_role;

-- Import CSV (dashboard) : les lignes passent par les ecritures habituelles (RLS) ; cette fonction
-- inscrit le bilan dans l'audit, apres verification du droit d'edition sur le module concerne.
create or replace function public.record_csv_import(p_tenant_id uuid, p_entity text, p_counts jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_module public.module_key := (case p_entity
    when 'places' then 'map' when 'events' then 'events' when 'procedures' then 'procedures'
    when 'sortingGuide' then 'environment' end)::public.module_key;
begin
  if v_module is null then
    perform private.raise_app('APP_INVALID_INPUT', 'Type d''import inconnu');
  end if;
  if not private.has_permission(p_tenant_id, v_module, 'edit') then
    perform private.raise_app('APP_FORBIDDEN', 'Droit d''édition requis');
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, diff)
  values (p_tenant_id, auth.uid(), 'import_csv', p_entity, p_tenant_id,
    jsonb_build_object('counts', jsonb_build_object('before', null, 'after', p_counts)));
end;
$$;
revoke execute on function public.record_csv_import(uuid, text, jsonb) from public, anon;
grant execute on function public.record_csv_import(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Export de reversibilite (Edge Function `export-tenant`)
-- ---------------------------------------------------------------------------------------------
-- Administrateur de la commune (seul habilite a exporter les donnees personnelles des habitants).
create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.has_role(p_tenant_id, '{admin}') $$;
grant execute on function public.is_tenant_admin(uuid) to authenticated;

-- Quartiers, zones de collecte et lieux de la commune en GeoJSON (WGS84).
create or replace function public.tenant_geojson(p_tenant_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'districts', jsonb_build_object('type', 'FeatureCollection', 'features', coalesce((
      select jsonb_agg(jsonb_build_object('type', 'Feature', 'id', d.id,
        'geometry', extensions.st_asgeojson(d.geom)::jsonb,
        'properties', jsonb_build_object('nom', d.name)) order by d.name)
      from public.districts d where d.tenant_id = p_tenant_id), '[]'::jsonb)),
    'wasteZones', jsonb_build_object('type', 'FeatureCollection', 'features', coalesce((
      select jsonb_agg(jsonb_build_object('type', 'Feature', 'id', z.id,
        'geometry', extensions.st_asgeojson(z.geom)::jsonb,
        'properties', jsonb_build_object('nom', z.name)) order by z.name)
      from public.waste_zones z where z.tenant_id = p_tenant_id), '[]'::jsonb)),
    'places', jsonb_build_object('type', 'FeatureCollection', 'features', coalesce((
      select jsonb_agg(jsonb_build_object('type', 'Feature', 'id', p.id,
        'geometry', extensions.st_asgeojson(p.point)::jsonb,
        'properties', jsonb_build_object('nom', p.name, 'categorie', c.key, 'adresse', p.address,
          'horaires', p.opening_hours, 'source', p.source, 'identifiant_externe', p.external_id)) order by p.name)
      from public.places p join public.place_categories c on c.id = p.category_id
      where p.tenant_id = p_tenant_id), '[]'::jsonb))
  )
$$;
revoke execute on function public.tenant_geojson(uuid) from public, anon, authenticated;
grant execute on function public.tenant_geojson(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Retention : les archives d'export sont supprimees apres 7 jours par l'Edge Function
-- `purge-exports` (API Storage : une suppression SQL laisserait les fichiers orphelins).
-- ---------------------------------------------------------------------------------------------
create or replace function private.purge_retention(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_run uuid := private.job_start('purge_retention');
  v_result jsonb := '{}'::jsonb;
  v_count integer;
begin
  perform set_config('app.skip_audit', 'on', true);

  delete from public.audit_log where at < p_now - interval '12 months';
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('auditLog', v_count);

  delete from public.notification_deliveries where created_at < p_now - interval '90 days';
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('deliveries', v_count);

  delete from public.push_outbox where processed_at < p_now - interval '30 days';
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('outbox', v_count);

  delete from public.push_tokens where invalid_at < p_now - interval '30 days';
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('invalidTokens', v_count);

  -- Email de contact d'un signalement clos depuis 12 mois : efface.
  update public.reports set contact_email = null
  where contact_email is not null and status in ('resolved', 'rejected', 'duplicate') and updated_at < p_now - interval '12 months';
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('reportEmails', v_count);

  -- Signalements clos depuis 36 mois : detaches de l'habitant.
  update public.reports set reporter_id = null
  where reporter_id is not null and status in ('resolved', 'rejected', 'duplicate') and updated_at < p_now - interval '36 months';
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('reportsDetached', v_count);

  -- Habitants anonymes inactifs depuis 24 mois : compte supprime (profil et jetons en cascade).
  delete from auth.users u
  using public.citizen_profiles c
  where c.user_id = u.id and u.is_anonymous and c.last_seen_at < p_now - interval '24 months'
    and not exists (select 1 from public.memberships m where m.user_id = u.id);
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('inactiveCitizens', v_count);

  delete from public.job_runs where started_at < p_now - interval '90 days' and id <> v_run;
  get diagnostics v_count = row_count; v_result := v_result || jsonb_build_object('jobRuns', v_count);

  -- Archives d'export de plus de 7 jours (bucket `exports`).
  perform private.call_edge_function('purge-exports');

  perform set_config('app.skip_audit', 'off', true);
  perform private.job_finish(v_run, 'success', v_result);
  return v_result;
end;
$$;
