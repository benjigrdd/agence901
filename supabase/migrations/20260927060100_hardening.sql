-- Lot 19 : limitation du debit des fonctions sensibles, export des donnees d'un habitant (droit
-- d'acces et de portabilite).

-- ---------------------------------------------------------------------------------------------
-- Limitation du debit : compteur par utilisateur, action et minute. Aucune policy : seule la
-- fonction ci-dessous (security definer) lit et ecrit la table.
-- ---------------------------------------------------------------------------------------------
create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action ~ '^[a-z][a-z0-9-]{1,40}$'),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, action, window_start)
);
alter table public.rate_limits enable row level security;

-- Vrai si l'appelant n'a pas depasse `p_max` appels de `p_action` dans la minute courante.
create or replace function public.consume_rate_limit(p_action text, p_max integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  if v_uid is null or p_max < 1 then
    return false;
  end if;
  delete from public.rate_limits where user_id = v_uid and window_start < v_window - interval '1 hour';
  insert into public.rate_limits (user_id, action, window_start, count) values (v_uid, p_action, v_window, 1)
  on conflict (user_id, action, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_max;
end;
$$;
revoke execute on function public.consume_rate_limit(text, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Export des donnees de l'habitant connecte (app : Reglages › « Telecharger mes donnees », JSON).
-- Les notes internes du personnel et l'identite des agents ne sont pas incluses.
-- ---------------------------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform private.raise_app('APP_FORBIDDEN', 'Session requise');
  end if;
  return jsonb_build_object(
    'exportedAt', now(),
    'profile', (
      select jsonb_build_object('commune', t.name, 'locale', c.locale, 'districtIds', c.district_ids, 'topicIds', c.topic_ids,
        'notificationPrefs', c.notification_prefs, 'wasteZoneId', c.waste_zone_id, 'contactEmail', c.contact_email,
        'consentAt', c.consent_at, 'lastSeenAt', c.last_seen_at, 'createdAt', c.created_at)
      from public.citizen_profiles c join public.tenants t on t.id = c.tenant_id
      where c.user_id = v_uid),
    'pushTokens', coalesce((
      select jsonb_agg(jsonb_build_object('platform', p.platform, 'locale', p.locale, 'createdAt', p.created_at, 'lastSeenAt', p.last_seen_at) order by p.created_at)
      from public.push_tokens p where p.user_id = v_uid), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reference', r.reference, 'category', rc.label, 'description', r.description, 'address', r.address,
        'position', jsonb_build_object('lat', extensions.st_y(r.point::extensions.geometry), 'lng', extensions.st_x(r.point::extensions.geometry)), 'status', r.status, 'contactEmail', r.contact_email,
        'createdAt', r.created_at, 'resolvedAt', r.resolved_at,
        'photos', coalesce((select jsonb_agg(m.path order by m.created_at) from public.report_media m where m.report_id = r.id), '[]'::jsonb),
        'publicHistory', coalesce((
          select jsonb_agg(jsonb_build_object('at', e.created_at, 'status', e.to_status, 'message', e.message) order by e.created_at)
          from public.report_events e where e.report_id = r.id and e.visibility = 'public'), '[]'::jsonb)
      ) order by r.created_at)
      from public.reports r join public.report_categories rc on rc.id = r.category_id
      where r.reporter_id = v_uid), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Supervision des taches planifiees : etat par tache (hors imports declenches par le personnel).
-- `failing` : les deux dernieres executions ont echoue. Lecture : editeur (RLS de `job_runs`).
-- ---------------------------------------------------------------------------------------------
create view public.job_health with (security_invoker = true) as
  with ranked as (
    select job, status, started_at, finished_at,
      row_number() over (partition by job order by started_at desc) as rn
    from public.job_runs
    where job <> 'import-osm'
  )
  select job,
    max(started_at) filter (where rn = 1) as last_run_at,
    max(status) filter (where rn = 1) as last_status,
    count(*) filter (where rn <= 2 and status = 'failed') = 2 as failing
  from ranked
  where rn <= 2
  group by job;

-- Alerte quotidienne par email a l'editeur (Edge Function `job-alerts`, SMTP configure).
select cron.schedule('job-alerts', '0 7 * * *', $$select private.call_edge_function('job-alerts')$$);
