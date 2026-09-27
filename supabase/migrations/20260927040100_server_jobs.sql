-- Lot 16 : taches serveur. Chaque traitement accepte `p_now` (tests « dans le temps »), journalise son
-- execution dans `job_runs` et verrouille ses lignes en `for update skip locked` (executions paralleles sures).

alter table public.notifications
  add column channel text not null default 'informations' check (channel in ('alertes', 'informations', 'collecte', 'signalements')),
  -- Cle d'unicite des notifications automatiques (ex. `alert:<post_id>` : une seule par alerte).
  add column dedupe_key text unique,
  add column attempts integer not null default 0,
  add column last_error text;

alter table public.notification_deliveries
  add column receipt_checked_at timestamptz;

create index notification_deliveries_receipts_idx on public.notification_deliveries (created_at) where ticket_id is not null and receipt_checked_at is null;

-- ---------------------------------------------------------------------------------------------
-- Journal des executions
-- ---------------------------------------------------------------------------------------------
create or replace function private.job_start(p_job text)
returns uuid language sql security definer set search_path = ''
as $$ insert into public.job_runs (job) values (p_job) returning id $$;

create or replace function private.job_finish(p_run uuid, p_status text, p_details jsonb)
returns void language sql security definer set search_path = ''
as $$ update public.job_runs set finished_at = now(), status = p_status, details = p_details where id = p_run $$;

-- ---------------------------------------------------------------------------------------------
-- Publication et depublication programmees (toutes les minutes)
-- ---------------------------------------------------------------------------------------------
create or replace function private.publish_due_content(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_run uuid := private.job_start('publish_due_content');
  v_posts integer;
  v_events integer;
  v_archived integer;
begin
  -- Acteur « systeme » dans l'audit (actor_id nul) et action explicite.
  perform set_config('app.actor_id', '', true);
  perform set_config('app.audit_action', 'transition', true);
  with due as (
    select id from public.posts where status = 'scheduled' and publish_at <= p_now for update skip locked
  ) update public.posts p set status = 'published' from due where p.id = due.id;
  get diagnostics v_posts = row_count;
  with due as (
    select id from public.events where status = 'scheduled' and publish_at <= p_now for update skip locked
  ) update public.events e set status = 'published' from due where e.id = due.id;
  get diagnostics v_events = row_count;
  with due as (
    select id from public.posts where status = 'published' and unpublish_at is not null and unpublish_at <= p_now for update skip locked
  ) update public.posts p set status = 'archived' from due where p.id = due.id;
  get diagnostics v_archived = row_count;
  perform set_config('app.audit_action', '', true);
  perform private.job_finish(v_run, 'success', jsonb_build_object('postsPublished', v_posts, 'eventsPublished', v_events, 'postsArchived', v_archived));
  return jsonb_build_object('postsPublished', v_posts, 'eventsPublished', v_events, 'postsArchived', v_archived);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Alertes : une notification (canal « alertes ») a la publication, une seule fois par actualite
-- ---------------------------------------------------------------------------------------------
create or replace function private.alert_published()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.type = 'alert' and new.send_push and new.status = 'published' and old.status is distinct from 'published' then
    perform set_config('app.skip_audit', 'on', true);
    insert into public.notifications (tenant_id, title, body, target, linked_entity, scheduled_at, status, urgent, author_id, channel, dedupe_key)
    values (
      new.tenant_id,
      left(new.title, 50),
      left(new.summary, 150),
      case when coalesce(array_length(new.district_ids, 1), 0) = 0 then jsonb_build_object('type', 'all', 'ids', '[]'::jsonb)
           else jsonb_build_object('type', 'districts', 'ids', to_jsonb(new.district_ids)) end,
      jsonb_build_object('type', 'post', 'id', new.id),
      now(),
      'scheduled',
      true,
      coalesce(new.reviewer_id, new.author_id),
      'alertes',
      'alert:' || new.id
    )
    on conflict (dedupe_key) do nothing;
    perform set_config('app.skip_audit', 'off', true);
  end if;
  return null;
end;
$$;
create trigger posts_alert_published after update on public.posts for each row execute function private.alert_published();

-- ---------------------------------------------------------------------------------------------
-- Destinataires : jetons valides des habitants cibles, selon leurs preferences par canal
-- ---------------------------------------------------------------------------------------------
create or replace function private.resolve_recipients(p_notification_id uuid)
returns table (push_token_id uuid, token text)
language sql stable security definer set search_path = ''
as $$
  with n as (
    select tenant_id, target, channel, linked_entity, array(select jsonb_array_elements_text(target -> 'ids'))::uuid[] as ids
    from public.notifications where id = p_notification_id
  )
  select t.id, t.token
  from n
  join public.citizen_profiles c on c.tenant_id = n.tenant_id
  join public.push_tokens t on t.user_id = c.user_id and t.tenant_id = c.tenant_id and t.invalid_at is null
  where (n.target ->> 'type' = 'all'
      or (n.target ->> 'type' = 'districts' and c.district_ids && n.ids)
      or (n.target ->> 'type' = 'topics' and c.topic_ids && n.ids))
    and coalesce((c.notification_prefs ->> case n.channel
          when 'alertes' then 'alerts'
          when 'collecte' then 'wasteReminder'
          when 'signalements' then 'reportUpdates'
          else case when n.linked_entity ->> 'type' = 'event' then 'events' else 'news' end
        end)::boolean, true)
$$;

-- Lot de notifications a envoyer : verrouillees, passees en « sending », avec leurs destinataires.
create or replace function public.claim_due_notifications(p_limit integer default 20, p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_row record;
begin
  for v_row in
    select id, tenant_id, title, body, channel, linked_entity from public.notifications
    where status = 'scheduled' and sent_at is null and scheduled_at <= p_now
    order by urgent desc, scheduled_at
    limit p_limit
    for update skip locked
  loop
    update public.notifications set status = 'sending', attempts = attempts + 1 where id = v_row.id;
    v_items := v_items || jsonb_build_object(
      'id', v_row.id,
      'tenantId', v_row.tenant_id,
      'title', v_row.title,
      'body', v_row.body,
      'channel', v_row.channel,
      'url', case v_row.linked_entity ->> 'type' when 'post' then '/actualites/' || (v_row.linked_entity ->> 'id') when 'event' then '/agenda/' || (v_row.linked_entity ->> 'id') else null end,
      'recipients', coalesce((select jsonb_agg(jsonb_build_object('pushTokenId', r.push_token_id, 'token', r.token)) from private.resolve_recipients(v_row.id) r), '[]'::jsonb)
    );
  end loop;
  return v_items;
end;
$$;

-- Resultats d'envoi : livraisons, jetons invalides, statut et statistiques de la notification.
create or replace function public.record_push_results(p_notification_id uuid, p_results jsonb, p_error text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.notifications where id = p_notification_id;
  if p_error is not null then
    update public.notifications set status = case when attempts >= 3 then 'failed'::public.notification_status else 'scheduled'::public.notification_status end,
      last_error = left(p_error, 500) where id = p_notification_id;
    return;
  end if;
  insert into public.notification_deliveries (tenant_id, notification_id, push_token_id, ticket_id, status, error)
  select v_tenant, p_notification_id, (r ->> 'pushTokenId')::uuid, r ->> 'ticketId', coalesce(r ->> 'status', 'ok'), r ->> 'error'
  from jsonb_array_elements(p_results) r
  on conflict (notification_id, push_token_id) do nothing;
  update public.push_tokens set invalid_at = now()
  where id in (select (r ->> 'pushTokenId')::uuid from jsonb_array_elements(p_results) r where r ->> 'error' = 'DeviceNotRegistered');
  perform set_config('app.skip_audit', 'on', true);
  update public.notifications set status = 'sent', sent_at = now(), last_error = null,
    stats = jsonb_build_object('recipients', jsonb_array_length(p_results), 'opened', coalesce((stats ->> 'opened')::int, 0))
  where id = p_notification_id;
  perform set_config('app.skip_audit', 'off', true);
end;
$$;

-- Accuses de reception Expo : jetons desinscrits invalides.
create or replace function public.pending_receipts(p_limit integer default 300, p_now timestamptz default now())
returns table (delivery_id uuid, ticket_id text)
language sql security definer set search_path = ''
as $$
  select d.id, d.ticket_id from public.notification_deliveries d
  where d.ticket_id is not null and d.receipt_checked_at is null and d.created_at <= p_now - interval '15 minutes'
  order by d.created_at limit p_limit
$$;

create or replace function public.record_receipts(p_receipts jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.notification_deliveries d set receipt_checked_at = now(),
    status = coalesce(r ->> 'status', d.status), error = coalesce(r ->> 'error', d.error)
  from jsonb_array_elements(p_receipts) r where d.id = (r ->> 'deliveryId')::uuid;
  update public.push_tokens set invalid_at = now()
  where id in (select d.push_token_id from public.notification_deliveries d join jsonb_array_elements(p_receipts) r on d.id = (r ->> 'deliveryId')::uuid where r ->> 'error' = 'DeviceNotRegistered');
end;
$$;

-- File individuelle (suivi d'un signalement) : messages et jetons de l'habitant.
create or replace function public.claim_outbox(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_row record;
begin
  for v_row in select * from public.push_outbox where processed_at is null order by created_at limit p_limit for update skip locked loop
    update public.push_outbox set processed_at = now() where id = v_row.id;
    v_items := v_items || jsonb_build_object(
      'id', v_row.id,
      'kind', v_row.kind,
      'payload', v_row.payload,
      'tokens', coalesce((
        select jsonb_agg(jsonb_build_object('pushTokenId', t.id, 'token', t.token))
        from public.push_tokens t join public.citizen_profiles c on c.user_id = t.user_id
        where t.user_id = v_row.user_id and t.invalid_at is null and coalesce((c.notification_prefs ->> 'reportUpdates')::boolean, true)
      ), '[]'::jsonb)
    );
  end loop;
  return v_items;
end;
$$;

-- Rappels de collecte : jetons des habitants d'une zone qui ont active le rappel.
create or replace function public.waste_reminder_recipients(p_zone_id uuid)
returns table (push_token_id uuid, token text)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.token from public.citizen_profiles c
  join public.push_tokens t on t.user_id = c.user_id and t.invalid_at is null
  where c.waste_zone_id = p_zone_id and coalesce((c.notification_prefs ->> 'wasteReminder')::boolean, false)
$$;

-- ---------------------------------------------------------------------------------------------
-- Retention RGPD (quotidien) — duree documentee dans docs/rgpd/durees-de-conservation.md
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

  perform set_config('app.skip_audit', 'off', true);
  perform private.job_finish(v_run, 'success', v_result);
  return v_result;
end;
$$;

create or replace function private.compute_usage_yesterday()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_run uuid := private.job_start('compute_usage_daily');
  v_day date := ((now() at time zone 'Europe/Paris')::date - 1);
begin
  perform private.job_finish(v_run, 'success', jsonb_build_object('day', v_day, 'tenants', private.compute_usage_daily(v_day)));
end;
$$;

-- Fonctions d'envoi : reservees a la cle service (Edge Functions).
revoke execute on function public.claim_due_notifications(integer, timestamptz), public.record_push_results(uuid, jsonb, text),
  public.pending_receipts(integer, timestamptz), public.record_receipts(jsonb), public.claim_outbox(integer),
  public.waste_reminder_recipients(uuid) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(integer, timestamptz), public.record_push_results(uuid, jsonb, text),
  public.pending_receipts(integer, timestamptz), public.record_receipts(jsonb), public.claim_outbox(integer),
  public.waste_reminder_recipients(uuid) to service_role;
revoke execute on function private.publish_due_content(timestamptz), private.purge_retention(timestamptz), private.compute_usage_yesterday(),
  private.resolve_recipients(uuid), private.alert_published(), private.job_start(text), private.job_finish(uuid, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Planification (pg_cron). Les appels HTTP vers les Edge Functions lisent l'URL et la cle service
-- dans Supabase Vault (secrets `functions_url` et `service_role_key`, voir docs/taches-serveur.md).
-- ---------------------------------------------------------------------------------------------
create or replace function private.call_edge_function(p_name text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_url');
  v_key text := (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key');
begin
  if v_url is null or v_key is null then
    raise notice 'Secrets Vault absents : appel de % ignore', p_name;
    return;
  end if;
  perform net.http_post(url := v_url || '/' || p_name, headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'), body := '{}'::jsonb);
end;
$$;
revoke execute on function private.call_edge_function(text) from public, anon, authenticated;

select cron.schedule('publish-due-content', '* * * * *', $$select private.publish_due_content()$$);
select cron.schedule('dispatch-notifications', '* * * * *', $$select private.call_edge_function('dispatch-notifications')$$);
select cron.schedule('waste-reminders', '0 16 * * *', $$select private.call_edge_function('send-waste-reminders')$$);
select cron.schedule('usage-daily', '15 1 * * *', $$select private.compute_usage_yesterday()$$);
select cron.schedule('purge-retention', '30 2 * * *', $$select private.purge_retention()$$);
