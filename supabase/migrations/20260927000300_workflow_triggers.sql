-- Lot 12 : regles metier appliquees par la base (memes regles que @app/shared/workflow.ts).
-- Erreurs : message = code stable `APP_...`, detail = texte francais (traduits par l'adaptateur, lot 14).

create or replace function private.raise_app(p_code text, p_message text)
returns void language plpgsql set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = p_message;
end;
$$;

-- Circuit de validation des actualites et evenements.
create or replace function private.check_content_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module public.module_key := case tg_table_name when 'posts' then 'news'::public.module_key else 'events'::public.module_key end;
  v_level public.permission_level;
begin
  -- Taches serveur (cle service) : publication programmee, imports.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      perform private.raise_app('APP_INVALID_STATUS', 'Un contenu est créé en brouillon');
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    v_level := case
      when old.status = 'draft' and new.status = 'pending_review' then 'edit'
      when old.status = 'pending_review' and new.status = 'draft' then 'publish'
      when old.status in ('draft', 'pending_review') and new.status in ('scheduled', 'published') then 'publish'
      when old.status = 'scheduled' and new.status = 'draft' then 'publish'
      when old.status = 'published' and new.status = 'archived' then 'publish'
      else null
    end;
    if v_level is null then
      perform private.raise_app('APP_TRANSITION_NOT_ALLOWED', 'Ce changement de statut n''est pas possible');
    end if;
    if not private.has_permission(new.tenant_id, v_module, v_level) then
      perform private.raise_app('APP_PUBLISH_FORBIDDEN', 'Vous n''avez pas les droits pour publier');
    end if;
    if new.status = 'scheduled' and (new.publish_at is null or new.publish_at <= now()) then
      perform private.raise_app('APP_PUBLISH_AT_REQUIRED', 'La date de publication doit être dans le futur');
    end if;
    return new;
  end if;

  -- Modification du contenu : edition pour un brouillon ou en validation, publication sinon ; jamais une archive.
  if old.status = 'archived' then
    perform private.raise_app('APP_EDIT_FORBIDDEN', 'Un contenu archivé ne se modifie pas');
  end if;
  if not private.has_permission(new.tenant_id, v_module, case when old.status in ('draft', 'pending_review') then 'edit'::public.permission_level else 'publish'::public.permission_level end) then
    perform private.raise_app('APP_EDIT_FORBIDDEN', 'Vous n''avez pas les droits pour modifier ce contenu publié');
  end if;
  return new;
end;
$$;

create trigger posts_workflow before insert or update on public.posts for each row execute function private.check_content_workflow();
create trigger events_workflow before insert or update on public.events for each row execute function private.check_content_workflow();

-- Traitement des signalements.
create or replace function private.check_report_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if old.status = 'duplicate' then
    perform private.raise_app('APP_DUPLICATE_READ_ONLY', 'Signalement en lecture seule : il s’agit d’un doublon');
  end if;
  if new.status is distinct from old.status then
    if not (
      (old.status = 'new' and new.status = 'acknowledged')
      or (old.status = 'acknowledged' and new.status = 'in_progress')
      or (old.status = 'in_progress' and new.status = 'resolved')
      or (old.status = 'resolved' and new.status = 'in_progress')
      or (old.status in ('new', 'acknowledged', 'in_progress') and new.status in ('rejected', 'duplicate'))
    ) then
      perform private.raise_app('APP_TRANSITION_NOT_ALLOWED', 'Ce changement de statut n''est pas possible');
    end if;
    if new.status = 'duplicate' then
      if new.duplicate_of_id is null or not exists (
        select 1 from public.reports r where r.tenant_id = new.tenant_id and r.id = new.duplicate_of_id and r.status <> 'duplicate'
      ) then
        perform private.raise_app('APP_DUPLICATE_REQUIRED', 'Choisissez le signalement d''origine');
      end if;
    end if;
    new.resolved_at := case when new.status = 'resolved' then now() when new.status = 'in_progress' then null else old.resolved_at end;
  end if;
  -- L'habitant (reporter_id) et la reference ne changent jamais.
  new.reporter_id := old.reporter_id;
  new.reference := old.reference;
  new.contact_email := old.contact_email;
  return new;
end;
$$;

create trigger reports_workflow before update on public.reports for each row execute function private.check_report_workflow();

-- Une commune garde toujours au moins un administrateur actif.
create or replace function private.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.disabled_at is null
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.disabled_at is not null)
     and not exists (
       select 1 from public.memberships m
       where m.tenant_id = old.tenant_id and m.id <> old.id and m.role = 'admin' and m.disabled_at is null
     ) then
    perform private.raise_app('APP_LAST_ADMIN', 'Impossible : la commune doit garder au moins un administrateur actif');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger memberships_last_admin before update or delete on public.memberships for each row execute function private.guard_last_admin();

-- Une note (commentaire) reste interne et le rejet d'un signalement est motive publiquement.
create or replace function private.check_report_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'status_change' and new.to_status = 'rejected' then
    if coalesce(length(trim(new.message)), 0) = 0 then
      perform private.raise_app('APP_MESSAGE_REQUIRED', 'Un motif est obligatoire pour rejeter un signalement');
    end if;
    new.visibility := 'public';
  end if;
  return new;
end;
$$;

create trigger report_events_rules before insert on public.report_events for each row execute function private.check_report_event();

revoke execute on function private.raise_app(text, text), private.check_content_workflow(), private.check_report_workflow(),
  private.guard_last_admin(), private.check_report_event() from public, anon, authenticated;
