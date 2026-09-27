-- Lot 12 : policies de stockage (buckets et chemins par commune).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is((select count(*)::int from storage.buckets where id in ('public-media', 'report-photos', 'branding', 'exports')), 4, 'les 4 buckets existent');
select is((select public from storage.buckets where id = 'report-photos'), false, 'photos de signalement privees');

insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'st-admin@test.test'),
  ('a0000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'st-agent@test.test'),
  ('c0000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null);
insert into public.tenants (id, slug, name, insee_code, center, status) values
  ('aaaa1111-0000-4000-8000-000000000000', 'st-a', 'Stockage A', '99701', 'SRID=4326;POINT(2.35 48.85)', 'active'),
  ('bbbb1111-0000-4000-8000-000000000000', 'st-b', 'Stockage B', '99702', 'SRID=4326;POINT(4.83 45.76)', 'active');
insert into public.memberships (id, tenant_id, user_id, role) values
  ('a1111111-0000-4000-8000-000000000001', 'aaaa1111-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-0000000000a1', 'admin'),
  ('a1111111-0000-4000-8000-000000000002', 'aaaa1111-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-0000000000a2', 'agent');
insert into public.citizen_profiles (user_id, tenant_id) values ('c0000000-0000-4000-8000-0000000000c1', 'aaaa1111-0000-4000-8000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-0000000000a2", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'aaaa1111-0000-4000-8000-000000000000/photo.png')$$,
  '42501', null, 'agent sans droit Mediatheque : televersement refuse');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-0000000000a1", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'aaaa1111-0000-4000-8000-000000000000/photo.png')$$,
  'admin : televersement dans sa commune');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'bbbb1111-0000-4000-8000-000000000000/photo.png')$$,
  '42501', null, 'admin : televersement refuse dans une autre commune');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-4000-8000-0000000000c1", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$insert into storage.objects (bucket_id, name) values ('report-photos', 'aaaa1111-0000-4000-8000-000000000000/c0000000-0000-4000-8000-0000000000c1/p1.jpg')$$,
  'habitant : photo dans son dossier');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('report-photos', 'aaaa1111-0000-4000-8000-000000000000/a0000000-0000-4000-8000-0000000000a1/p1.jpg')$$,
  '42501', null, 'habitant : dossier d''un autre refuse');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-0000000000a2", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from storage.objects where bucket_id = 'report-photos'), 0, 'agent sans droit Signalements : photos invisibles');
reset role;

select * from finish();
rollback;
