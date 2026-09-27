-- Lot 12 : buckets et policies de stockage. Chemins : `<tenant_id>/...` (et `<tenant_id>/<user_id>/...` pour les photos).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('report-photos', 'report-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('branding', 'branding', true, 2097152, array['image/png', 'image/svg+xml']),
  ('exports', 'exports', false, 524288000, array['application/zip'])
on conflict (id) do nothing;

-- Mediatheque : lecture publique, ecriture par le personnel (droit `media` en edition).
create policy public_media_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');
create policy public_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (select private.has_permission(private.path_uuid(name, 1), 'media', 'edit')));
create policy public_media_update on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (select private.has_permission(private.path_uuid(name, 1), 'media', 'edit')));
create policy public_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (select private.has_permission(private.path_uuid(name, 1), 'media', 'edit')));

-- Photos de signalement : privees ; l'habitant depose dans `<sa commune>/<son id>/`, le personnel lit selon `reports`.
create policy report_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and private.path_uuid(name, 1) = (select private.citizen_tenant())
    and private.path_uuid(name, 2) = (select auth.uid())
  );
create policy report_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'report-photos'
    and (private.path_uuid(name, 2) = (select auth.uid()) or (select private.has_permission(private.path_uuid(name, 1), 'reports', 'read')))
  );
create policy report_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'report-photos' and private.path_uuid(name, 2) = (select auth.uid()));

-- Marque (logos, icones) : lecture publique, ecriture par l'editeur.
create policy branding_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'branding');
create policy branding_write on storage.objects for all to authenticated
  using (bucket_id = 'branding' and (select private.is_platform_admin()))
  with check (bucket_id = 'branding' and (select private.is_platform_admin()));

-- Exports de reversibilite : lecture par les administrateurs de la commune (ecriture serveur).
create policy exports_read on storage.objects for select to authenticated
  using (bucket_id = 'exports' and ((select private.has_role(private.path_uuid(name, 1), '{admin}')) or (select private.is_platform_admin())));
