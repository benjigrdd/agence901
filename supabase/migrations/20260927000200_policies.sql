-- Lot 12 : policies RLS (matrice dans docs/rls.md). Tout ce qui n'est pas autorise ici est refuse.
-- Convention : les fonctions d'aide sont appelees sous la forme `(select private.fn(...))`.

-- ---------------------------------------------------------------------------------------------
-- Plateforme
-- ---------------------------------------------------------------------------------------------
create policy tenants_select on public.tenants for select to anon, authenticated
  using (status = 'active' or (select private.is_staff(id)));
create policy tenants_insert on public.tenants for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy tenants_update on public.tenants for update to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy tenant_internal_notes_all on public.tenant_internal_notes for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy tenant_branding_select on public.tenant_branding for select to anon, authenticated
  using ((select private.tenant_active(tenant_id)) or (select private.is_staff(tenant_id)));
create policy tenant_branding_write on public.tenant_branding for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy tenant_modules_select on public.tenant_modules for select to anon, authenticated
  using ((select private.tenant_active(tenant_id)) or (select private.is_staff(tenant_id)));
create policy tenant_modules_write on public.tenant_modules for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy tenant_app_config_select on public.tenant_app_config for select to anon, authenticated
  using ((select private.tenant_active(tenant_id)) or (select private.is_staff(tenant_id)));
create policy tenant_app_config_insert on public.tenant_app_config for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy tenant_app_config_update on public.tenant_app_config for update to authenticated
  using ((select private.has_permission(tenant_id, 'settings', 'edit')))
  with check ((select private.has_permission(tenant_id, 'settings', 'edit')));

create policy tenant_store_info_all on public.tenant_store_info for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

-- ---------------------------------------------------------------------------------------------
-- Personnes
-- ---------------------------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_platform_admin())
    or exists (select 1 from public.memberships m where m.user_id = profiles.id and (select private.is_staff(m.tenant_id)))
  );
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) or (select private.is_platform_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_platform_admin()))
  with check (id = (select auth.uid()) or (select private.is_platform_admin()));

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff(tenant_id)));
create policy memberships_write on public.memberships for all to authenticated
  using ((select private.has_role(tenant_id, '{admin}')) or (select private.is_platform_admin()))
  with check ((select private.has_role(tenant_id, '{admin}')) or (select private.is_platform_admin()));

create policy membership_permissions_select on public.membership_permissions for select to authenticated
  using ((select private.is_staff(tenant_id)));
create policy membership_permissions_write on public.membership_permissions for all to authenticated
  using ((select private.has_role(tenant_id, '{admin}')) or (select private.is_platform_admin()))
  with check ((select private.has_role(tenant_id, '{admin}')) or (select private.is_platform_admin()));

create policy topics_select on public.topics for select to anon, authenticated
  using ((select private.tenant_active(tenant_id)) or (select private.is_staff(tenant_id)));
create policy topics_write on public.topics for all to authenticated
  using ((select private.has_permission(tenant_id, 'settings', 'edit')))
  with check ((select private.has_permission(tenant_id, 'settings', 'edit')));

-- Habitant : uniquement son propre profil, dans une commune active.
create policy citizen_profiles_select on public.citizen_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy citizen_profiles_insert on public.citizen_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.tenant_active(tenant_id)));
create policy citizen_profiles_update on public.citizen_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy citizen_profiles_delete on public.citizen_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and tenant_id = (select private.citizen_tenant()));

-- ---------------------------------------------------------------------------------------------
-- Contenu public (lisible par l'app si la commune est active et le module active) et gestion
-- ---------------------------------------------------------------------------------------------
create policy media_select on public.media for select to anon, authenticated
  using ((select private.tenant_active(tenant_id)) or (select private.is_staff(tenant_id)));
create policy media_write on public.media for all to authenticated
  using ((select private.has_permission(tenant_id, 'media', 'edit')))
  with check ((select private.has_permission(tenant_id, 'media', 'edit')));

create policy posts_select on public.posts for select to anon, authenticated
  using (
    (status = 'published' and (publish_at is null or publish_at <= now()) and (unpublish_at is null or unpublish_at > now())
      and (select private.public_module(tenant_id, 'news')))
    or (select private.has_permission(tenant_id, 'news', 'read'))
  );
create policy posts_insert on public.posts for insert to authenticated
  with check ((select private.has_permission(tenant_id, 'news', 'edit')) and author_id = (select auth.uid()));
create policy posts_update on public.posts for update to authenticated
  using ((select private.has_permission(tenant_id, 'news', 'edit')))
  with check ((select private.has_permission(tenant_id, 'news', 'edit')));
create policy posts_delete on public.posts for delete to authenticated
  using ((select private.has_permission(tenant_id, 'news', 'publish')));

create policy events_select on public.events for select to anon, authenticated
  using (
    (status = 'published' and (publish_at is null or publish_at <= now()) and (select private.public_module(tenant_id, 'events')))
    or (select private.has_permission(tenant_id, 'events', 'read'))
  );
create policy events_insert on public.events for insert to authenticated
  with check ((select private.has_permission(tenant_id, 'events', 'edit')) and author_id = (select auth.uid()));
create policy events_update on public.events for update to authenticated
  using ((select private.has_permission(tenant_id, 'events', 'edit')))
  with check ((select private.has_permission(tenant_id, 'events', 'edit')));
create policy events_delete on public.events for delete to authenticated
  using ((select private.has_permission(tenant_id, 'events', 'publish')));

create policy content_reviews_select on public.content_reviews for select to authenticated
  using ((select private.has_permission(tenant_id, case entity_type when 'post' then 'news'::public.module_key else 'events'::public.module_key end, 'read')));
create policy content_reviews_insert on public.content_reviews for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.has_permission(tenant_id, case entity_type when 'post' then 'news'::public.module_key else 'events'::public.module_key end, 'edit'))
  );

create policy place_categories_select on public.place_categories for select to anon, authenticated
  using ((select private.public_module(tenant_id, 'map')) or (select private.is_staff(tenant_id)));
create policy place_categories_insert on public.place_categories for insert to authenticated
  with check ((select private.has_permission(tenant_id, 'map', 'edit')) and not is_default);
create policy place_categories_update on public.place_categories for update to authenticated
  using ((select private.has_permission(tenant_id, 'map', 'edit')))
  with check ((select private.has_permission(tenant_id, 'map', 'edit')));
-- Les categories par defaut ne se suppriment pas : on les masque.
create policy place_categories_delete on public.place_categories for delete to authenticated
  using ((select private.has_permission(tenant_id, 'map', 'edit')) and not is_default);

create policy places_select on public.places for select to anon, authenticated
  using ((select private.public_module(tenant_id, 'map')) or (select private.is_staff(tenant_id)));
create policy places_write on public.places for all to authenticated
  using ((select private.has_permission(tenant_id, 'map', 'edit')))
  with check ((select private.has_permission(tenant_id, 'map', 'edit')));

create policy procedures_select on public.procedures for select to anon, authenticated
  using ((select private.public_module(tenant_id, 'procedures')) or (select private.is_staff(tenant_id)));
create policy procedures_write on public.procedures for all to authenticated
  using ((select private.has_permission(tenant_id, 'procedures', 'edit')))
  with check ((select private.has_permission(tenant_id, 'procedures', 'edit')));

create policy sorting_guide_items_select on public.sorting_guide_items for select to anon, authenticated
  using ((select private.public_module(tenant_id, 'environment')) or (select private.is_staff(tenant_id)));
create policy sorting_guide_items_write on public.sorting_guide_items for all to authenticated
  using ((select private.has_permission(tenant_id, 'environment', 'edit')))
  with check ((select private.has_permission(tenant_id, 'environment', 'edit')));

-- ---------------------------------------------------------------------------------------------
-- Territoire
-- ---------------------------------------------------------------------------------------------
create policy districts_select on public.districts for select to anon, authenticated
  using ((select private.tenant_active(tenant_id)) or (select private.is_staff(tenant_id)));
create policy districts_write on public.districts for all to authenticated
  using ((select private.has_permission(tenant_id, 'districts', 'edit')))
  with check ((select private.has_permission(tenant_id, 'districts', 'edit')));

create policy waste_zones_select on public.waste_zones for select to anon, authenticated
  using ((select private.public_module(tenant_id, 'environment')) or (select private.is_staff(tenant_id)));
create policy waste_zones_write on public.waste_zones for all to authenticated
  using ((select private.has_permission(tenant_id, 'environment', 'edit')))
  with check ((select private.has_permission(tenant_id, 'environment', 'edit')));

create policy waste_schedules_select on public.waste_schedules for select to anon, authenticated
  using ((select private.public_module(tenant_id, 'environment')) or (select private.is_staff(tenant_id)));
create policy waste_schedules_write on public.waste_schedules for all to authenticated
  using ((select private.has_permission(tenant_id, 'environment', 'edit')))
  with check ((select private.has_permission(tenant_id, 'environment', 'edit')));

-- ---------------------------------------------------------------------------------------------
-- Signalements
-- ---------------------------------------------------------------------------------------------
create policy services_select on public.services for select to authenticated
  using ((select private.is_staff(tenant_id)));
create policy services_write on public.services for all to authenticated
  using ((select private.has_permission(tenant_id, 'settings', 'edit')))
  with check ((select private.has_permission(tenant_id, 'settings', 'edit')));

create policy report_categories_select on public.report_categories for select to anon, authenticated
  using ((select private.public_module(tenant_id, 'reports')) or (select private.is_staff(tenant_id)));
create policy report_categories_write on public.report_categories for all to authenticated
  using ((select private.has_permission(tenant_id, 'settings', 'edit')))
  with check ((select private.has_permission(tenant_id, 'settings', 'edit')));

-- Habitant : ses signalements. Personnel : selon le droit `reports`.
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.has_permission(tenant_id, 'reports', 'read')));
create policy reports_insert_citizen on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and tenant_id = (select private.citizen_tenant())
    and (select private.public_module(tenant_id, 'reports'))
    and status = 'new' and priority = 'normal' and service_id is null and duplicate_of_id is null
    and ai_suggestion is null and resolved_at is null
  );
create policy reports_update_staff on public.reports for update to authenticated
  using ((select private.has_permission(tenant_id, 'reports', 'edit')))
  with check ((select private.has_permission(tenant_id, 'reports', 'edit')));

create policy report_media_select on public.report_media for select to authenticated
  using (
    (select private.has_permission(tenant_id, 'reports', 'read'))
    or exists (select 1 from public.reports r where r.tenant_id = report_media.tenant_id and r.id = report_media.report_id and r.reporter_id = (select auth.uid()))
  );
create policy report_media_insert on public.report_media for insert to authenticated
  with check (exists (
    select 1 from public.reports r
    where r.tenant_id = report_media.tenant_id and r.id = report_media.report_id and r.reporter_id = (select auth.uid()) and r.status = 'new'
  ));

create policy report_events_select on public.report_events for select to authenticated
  using (
    (select private.has_permission(tenant_id, 'reports', 'read'))
    or (visibility = 'public' and exists (
      select 1 from public.reports r where r.tenant_id = report_events.tenant_id and r.id = report_events.report_id and r.reporter_id = (select auth.uid())
    ))
  );
create policy report_events_insert on public.report_events for insert to authenticated
  with check ((select private.has_permission(tenant_id, 'reports', 'edit')) and author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Notifications, audit, usage
-- ---------------------------------------------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using ((select private.has_permission(tenant_id, 'notifications', 'read')));
create policy notifications_insert on public.notifications for insert to authenticated
  with check ((select private.has_permission(tenant_id, 'notifications', 'publish')) and author_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using ((select private.has_permission(tenant_id, 'notifications', 'publish')) and sent_at is null)
  with check ((select private.has_permission(tenant_id, 'notifications', 'publish')));

create policy audit_log_select on public.audit_log for select to authenticated
  using (
    (tenant_id is not null and (select private.has_permission(tenant_id, 'audit', 'read')))
    or (select private.is_platform_admin())
  );

create policy usage_daily_select on public.usage_daily for select to authenticated
  using ((select private.is_staff(tenant_id)));

create policy job_runs_select on public.job_runs for select to authenticated
  using ((select private.is_platform_admin()));

-- Sans policy (acces reserve au serveur, cle service) : tenant_counters, notification_deliveries, push_outbox.
comment on table public.tenant_counters is 'Acces serveur uniquement (RLS sans policy).';
comment on table public.notification_deliveries is 'Acces serveur uniquement (RLS sans policy).';
comment on table public.push_outbox is 'Acces serveur uniquement (RLS sans policy).';
