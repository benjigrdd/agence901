-- Fonctions internes : compteurs, references de signalement, audit, index.

-- Compteur atomique par commune, cle et annee.
create or replace function private.next_counter(p_tenant_id uuid, p_key text, p_year integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.tenant_counters as c (tenant_id, key, year, value)
  values (p_tenant_id, p_key, p_year, 1)
  on conflict (tenant_id, key, year) do update set value = c.value + 1
  returning c.value;
$$;

-- Reference AAAA-NNNNN d'un signalement (annee de Paris), sauf si elle est deja fournie (import, seed).
create or replace function private.assign_report_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from (coalesce(new.created_at, now()) at time zone 'Europe/Paris'))::integer;
begin
  if new.reference is null then
    new.reference := format('%s-%s', v_year, lpad(private.next_counter(new.tenant_id, 'report', v_year)::text, 5, '0'));
  end if;
  return new;
end;
$$;

create trigger reports_assign_reference
  before insert on public.reports
  for each row execute function private.assign_report_reference();

-- Audit generique : acteur, commune, operation, element et diff (colonnes modifiees seulement pour un update).
-- Les colonnes sensibles ne sont jamais recopiees.
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
  values (
    v_tenant,
    coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid),
    case tg_op when 'INSERT' then 'create'::public.audit_action when 'UPDATE' then 'update'::public.audit_action else 'delete'::public.audit_action end,
    tg_table_name,
    (v_row ->> 'id')::uuid,
    v_diff,
    v_ip
  );
  return null;
end;
$$;

-- updated_at sur toutes les tables qui en ont un.
do $$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'updated_at'
  loop
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', t.table_name || '_set_updated_at', t.table_name);
  end loop;
end;
$$;

-- Audit : tables gerees par le personnel (reports : mises a jour seulement).
do $$
declare
  t text;
begin
  foreach t in array array[
    'posts', 'events', 'places', 'place_categories', 'procedures', 'report_events', 'services', 'report_categories',
    'districts', 'waste_zones', 'waste_schedules', 'sorting_guide_items', 'notifications', 'memberships',
    'membership_permissions', 'media', 'topics', 'tenants', 'tenant_branding', 'tenant_modules', 'tenant_app_config', 'tenant_store_info'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.audit_row()', t || '_audit', t);
  end loop;
end;
$$;

create trigger reports_audit after update on public.reports for each row execute function private.audit_row();

-- Index : (tenant_id) partout, parcours frequents, GIST sur les colonnes geographiques.
do $$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'tenant_id'
  loop
    execute format('create index if not exists %I on public.%I (tenant_id)', t.table_name || '_tenant_id_idx', t.table_name);
  end loop;
end;
$$;

create index posts_status_publish_idx on public.posts (tenant_id, status, publish_at);
create index events_status_publish_idx on public.events (tenant_id, status, publish_at);
create index events_starts_idx on public.events (tenant_id, starts_at);
create index reports_status_created_idx on public.reports (tenant_id, status, created_at);
create index report_events_report_idx on public.report_events (tenant_id, report_id, created_at);
create index content_reviews_entity_idx on public.content_reviews (tenant_id, entity_type, entity_id);
create index memberships_user_idx on public.memberships (user_id);
create index audit_log_tenant_at_idx on public.audit_log (tenant_id, at desc);
create index notifications_due_idx on public.notifications (status, scheduled_at) where sent_at is null;
create index push_outbox_pending_idx on public.push_outbox (created_at) where processed_at is null;

create index tenants_center_gist on public.tenants using gist (center);
create index tenants_contour_gist on public.tenants using gist (contour);
create index districts_geom_gist on public.districts using gist (geom);
create index waste_zones_geom_gist on public.waste_zones using gist (geom);
create index places_point_gist on public.places using gist (point);
create index events_location_gist on public.events using gist (location_point);
create index reports_point_gist on public.reports using gist (point);
