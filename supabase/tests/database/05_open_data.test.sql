-- Lot 17 : territoire de la commune, imports idempotents, bilan des imports CSV.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email) values
  ('a7000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'od-admin@test.test'),
  ('a7000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'od-agent@test.test');
insert into public.tenants (id, slug, name, insee_code, center, status) values
  ('aaaa7777-0000-4000-8000-000000000000', 'od-a', 'Open data A', '99701', 'SRID=4326;POINT(2.35 48.85)', 'active');
insert into public.memberships (id, tenant_id, user_id, role, accepted_at) values
  ('a7100000-0000-4000-8000-000000000001', 'aaaa7777-0000-4000-8000-000000000000', 'a7000000-0000-4000-8000-00000000000a', 'admin', now()),
  ('a7100000-0000-4000-8000-000000000002', 'aaaa7777-0000-4000-8000-000000000000', 'a7000000-0000-4000-8000-00000000000b', 'agent', now());
insert into public.membership_permissions (tenant_id, membership_id, module, level) values
  ('aaaa7777-0000-4000-8000-000000000000', 'a7100000-0000-4000-8000-000000000002', 'map', 'read');

-- Sans contour : disque de 5 km autour du centre.
select ok(public.tenant_contains('aaaa7777-0000-4000-8000-000000000000', 2.38, 48.86), 'sans contour : point a moins de 5 km');
select ok(not public.tenant_contains('aaaa7777-0000-4000-8000-000000000000', 2.50, 48.85), 'sans contour : point a plus de 5 km');
select ok(not public.tenant_contains('00000000-0000-4000-8000-000000000000', 2.35, 48.85), 'commune inconnue : faux');

-- Avec contour : le contour fait foi (meme a moins de 5 km du centre).
select public.set_tenant_geometry('aaaa7777-0000-4000-8000-000000000000',
  '{"type": "Polygon", "coordinates": [[[2.30, 48.80], [2.36, 48.80], [2.36, 48.90], [2.30, 48.90], [2.30, 48.80]]]}', null, 4321, null);
select ok(public.tenant_contains('aaaa7777-0000-4000-8000-000000000000', 2.31, 48.81), 'contour : point interieur');
select ok(not public.tenant_contains('aaaa7777-0000-4000-8000-000000000000', 2.38, 48.85), 'contour : point exterieur proche du centre');
select is((select population from public.tenants where id = 'aaaa7777-0000-4000-8000-000000000000'), 4321, 'population mise a jour');

-- Import idempotent, lieu detache preserve, audit unique par import.
select is(public.upsert_imported_places('aaaa7777-0000-4000-8000-000000000000', 'osm',
  '[{"externalId": "node/1", "categoryKey": "toilettes", "name": "WC", "lat": 48.85, "lng": 2.35, "address": "Paris", "wheelchair": "yes"},
    {"externalId": "node/2", "categoryKey": "parc", "name": "Square", "lat": 48.85, "lng": 2.35, "address": "Paris", "attributes": {"subtype": "aire-de-jeux"}},
    {"externalId": "node/3", "categoryKey": "inconnue", "name": "?", "lat": 48.85, "lng": 2.35, "address": "Paris"}]', null) - 'byCategory',
  '{"created": 2, "updated": 0, "skipped": 1}'::jsonb, 'premier import');
update public.places set detached = true, name = 'WC renoves' where external_id = 'node/1';
select is(public.upsert_imported_places('aaaa7777-0000-4000-8000-000000000000', 'osm',
  '[{"externalId": "node/1", "categoryKey": "toilettes", "name": "WC", "lat": 48.85, "lng": 2.35, "address": "Paris"},
    {"externalId": "node/2", "categoryKey": "parc", "name": "Square Nord", "lat": 48.85, "lng": 2.35, "address": "Paris"}]', null) -> 'byCategory',
  '{"toilettes": {"created": 0, "updated": 0, "skipped": 1}, "parc": {"created": 0, "updated": 1, "skipped": 0}}'::jsonb, 'reimport : compteurs par categorie');
select is((select name from public.places where external_id = 'node/1'), 'WC renoves', 'lieu detache non ecrase');
select is((select count(*)::int from public.audit_log where tenant_id = 'aaaa7777-0000-4000-8000-000000000000' and entity = 'place'), 2, 'une entree d''audit par import, aucune par lieu');

-- Bilan CSV : droit d'edition du module requis.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a7000000-0000-4000-8000-00000000000b", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.record_csv_import('aaaa7777-0000-4000-8000-000000000000', 'places', '{"created": 1}')$$, 'P0001', 'APP_FORBIDDEN', 'agent en lecture : bilan refuse');
set local request.jwt.claims = '{"sub": "a7000000-0000-4000-8000-00000000000a", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.record_csv_import('aaaa7777-0000-4000-8000-000000000000', 'events', '{"created": 3, "errors": 3}')$$, 'admin : bilan inscrit');

select * from finish();
rollback;
