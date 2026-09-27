-- Lot 15 : parcours habitant (app mobile a venir) — session anonyme, signalements, jetons push, usage, RGPD.

-- Premier evenement public d'un signalement (meme texte que le mock).
create or replace function private.report_received()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- Les donnees de demonstration fournissent deja leur chronologie.
  if coalesce(current_setting('app.skip_tenant_defaults', true), 'off') = 'on' then
    return null;
  end if;
  insert into public.report_events (tenant_id, report_id, kind, from_status, to_status, message, visibility, author_id)
  values (new.tenant_id, new.id, 'status_change', null, 'new', 'Signalement reçu.', 'public', null);
  return null;
end;
$$;
create trigger reports_received after insert on public.reports for each row execute function private.report_received();

-- Jeton push : rattache a l'habitant courant (un appareil reinstalle peut changer d'habitant).
create or replace function public.register_push_token(p_token text, p_platform public.push_platform, p_locale text default 'fr')
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant uuid := private.citizen_tenant();
begin
  if auth.uid() is null or v_tenant is null then
    perform private.raise_app('APP_FORBIDDEN', 'Profil habitant requis');
  end if;
  if length(p_token) not between 1 and 500 or p_locale not in ('fr', 'en') then
    perform private.raise_app('APP_INVALID_INPUT', 'Jeton invalide');
  end if;
  insert into public.push_tokens (tenant_id, user_id, token, platform, locale, last_seen_at, invalid_at)
  values (v_tenant, auth.uid(), p_token, p_platform, p_locale, now(), null)
  on conflict (token) do update set tenant_id = excluded.tenant_id, user_id = excluded.user_id, platform = excluded.platform,
    locale = excluded.locale, last_seen_at = now(), invalid_at = null;
end;
$$;
revoke execute on function public.register_push_token(text, public.push_platform, text) from public, anon;
grant execute on function public.register_push_token(text, public.push_platform, text) to authenticated;

-- Derniere activite (aucun identifiant d'appareil, aucun traceur : seule la date du jour compte).
create or replace function public.touch_citizen()
returns void language sql security invoker set search_path = ''
as $$ update public.citizen_profiles set last_seen_at = now() where user_id = auth.uid() $$;
grant execute on function public.touch_citizen() to authenticated;

-- Agregats quotidiens par commune (jour de Paris), appeles par la tache planifiee (lot 16).
create or replace function private.compute_usage_daily(p_day date)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.usage_daily (tenant_id, date, installs, active_users, reports_created, posts_published)
  select t.id, p_day,
    (select count(*) from public.citizen_profiles c where c.tenant_id = t.id and (c.created_at at time zone 'Europe/Paris')::date = p_day),
    (select count(*) from public.citizen_profiles c where c.tenant_id = t.id and (c.last_seen_at at time zone 'Europe/Paris')::date = p_day),
    (select count(*) from public.reports r where r.tenant_id = t.id and (r.created_at at time zone 'Europe/Paris')::date = p_day),
    (select count(*) from public.posts p where p.tenant_id = t.id and p.status = 'published' and (p.publish_at at time zone 'Europe/Paris')::date = p_day)
  from public.tenants t
  on conflict (tenant_id, date) do update set installs = excluded.installs, active_users = excluded.active_users,
    reports_created = excluded.reports_created, posts_published = excluded.posts_published;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function private.compute_usage_daily(date) from public, anon, authenticated;

-- Suppression des donnees d'un habitant (appelee par l'Edge Function `delete-account`, cle service).
create or replace function public.anonymize_citizen(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('app.skip_audit', 'on', true);
  update public.reports set contact_email = null, reporter_id = null where reporter_id = p_user_id;
  delete from public.push_tokens where user_id = p_user_id;
  delete from public.citizen_profiles where user_id = p_user_id;
  perform set_config('app.skip_audit', 'off', true);
end;
$$;
revoke execute on function public.anonymize_citizen(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_citizen(uuid) to service_role;
