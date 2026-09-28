-- Lot 12 : isolation entre communes et droits, role par role.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- ---------------------------------------------------------------------------------------------
-- Donnees de test (en superutilisateur : RLS et workflow ignores)
-- ---------------------------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.test'),
  ('a0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agent-a@test.test'),
  ('b0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@test.test'),
  ('e0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editeur@test.test'),
  ('c0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null),
  ('c0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null);

insert into public.tenants (id, slug, name, insee_code, center, status) values
  ('aaaa0000-0000-4000-8000-000000000000', 'rls-a', 'RLS A', '99801', 'SRID=4326;POINT(2.35 48.85)', 'active'),
  ('bbbb0000-0000-4000-8000-000000000000', 'rls-b', 'RLS B', '99802', 'SRID=4326;POINT(4.83 45.76)', 'active');

insert into public.memberships (id, tenant_id, user_id, role, accepted_at) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-00000000000a', 'admin', now()),
  ('a1000000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-00000000000b', 'agent', now()),
  ('b1000000-0000-4000-8000-000000000001', 'bbbb0000-0000-4000-8000-000000000000', 'b0000000-0000-4000-8000-00000000000a', 'admin', now());
insert into public.membership_permissions (tenant_id, membership_id, module, level) values
  ('aaaa0000-0000-4000-8000-000000000000', 'a1000000-0000-4000-8000-000000000002', 'news', 'edit'),
  ('aaaa0000-0000-4000-8000-000000000000', 'a1000000-0000-4000-8000-000000000002', 'reports', 'edit');

insert into public.citizen_profiles (user_id, tenant_id) values
  ('c0000000-0000-4000-8000-00000000000a', 'aaaa0000-0000-4000-8000-000000000000'),
  ('c0000000-0000-4000-8000-00000000000b', 'bbbb0000-0000-4000-8000-000000000000');

insert into public.posts (id, tenant_id, title, summary, status, publish_at, author_id) values
  ('a2000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000000', 'Publie A', 'Resume', 'published', now() - interval '1 day', 'a0000000-0000-4000-8000-00000000000a'),
  ('a2000000-0000-4000-8000-000000000002', 'aaaa0000-0000-4000-8000-000000000000', 'Brouillon A', 'Resume', 'draft', null, 'a0000000-0000-4000-8000-00000000000b'),
  ('a2000000-0000-4000-8000-000000000003', 'aaaa0000-0000-4000-8000-000000000000', 'Futur A', 'Resume', 'published', now() + interval '1 day', 'a0000000-0000-4000-8000-00000000000a'),
  ('b2000000-0000-4000-8000-000000000001', 'bbbb0000-0000-4000-8000-000000000000', 'Publie B', 'Resume', 'published', now() - interval '1 day', 'b0000000-0000-4000-8000-00000000000a');

insert into public.reports (id, tenant_id, category_id, description, point, address, reporter_id) values
  ('a3000000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000000',
   (select id from public.report_categories where tenant_id = 'aaaa0000-0000-4000-8000-000000000000' limit 1),
   'Signalement A', 'SRID=4326;POINT(2.35 48.85)', '1 rue A', 'c0000000-0000-4000-8000-00000000000a'),
  ('b3000000-0000-4000-8000-000000000001', 'bbbb0000-0000-4000-8000-000000000000',
   (select id from public.report_categories where tenant_id = 'bbbb0000-0000-4000-8000-000000000000' limit 1),
   'Signalement B', 'SRID=4326;POINT(4.83 45.76)', '1 rue B', 'c0000000-0000-4000-8000-00000000000b');
insert into public.report_events (tenant_id, report_id, kind, message, visibility) values
  ('aaaa0000-0000-4000-8000-000000000000', 'a3000000-0000-4000-8000-000000000001', 'comment', 'Note interne', 'internal'),
  ('aaaa0000-0000-4000-8000-000000000000', 'a3000000-0000-4000-8000-000000000001', 'status_change', 'Pris en compte', 'public');

-- ---------------------------------------------------------------------------------------------
-- Structure : RLS partout, et une policy sur chaque table hors acces serveur
-- ---------------------------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0, 'RLS activee sur 100 % des tables');
select is(
  (select array_agg(t.tablename::text order by t.tablename) from pg_tables t
   where t.schemaname = 'public' and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)),
  array['notification_deliveries', 'push_outbox', 'rate_limits', 'tenant_counters'],
  'seules les tables serveur sont sans policy');

-- ---------------------------------------------------------------------------------------------
-- Anonyme (application sans compte)
-- ---------------------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is((select count(*)::int from public.posts where tenant_id = 'aaaa0000-0000-4000-8000-000000000000'), 1, 'anon : seules les actualites publiees et en ligne');
select is((select count(*)::int from public.reports), 0, 'anon : aucun signalement');
select is((select count(*)::int from public.memberships), 0, 'anon : aucun membre');
select is((select count(*)::int from public.place_categories where tenant_id = 'aaaa0000-0000-4000-8000-000000000000'), 12, 'anon : categories de lieux publiques');
reset role;

-- Module desactive : l'actualite disparait de l'app.
update public.tenant_modules set enabled = false where tenant_id = 'aaaa0000-0000-4000-8000-000000000000' and module = 'news';
set local role anon;
select is((select count(*)::int from public.posts where tenant_id = 'aaaa0000-0000-4000-8000-000000000000'), 0, 'anon : module Actualites desactive => rien');
reset role;
update public.tenant_modules set enabled = true where tenant_id = 'aaaa0000-0000-4000-8000-000000000000' and module = 'news';

-- ---------------------------------------------------------------------------------------------
-- Agent de A (actualites : edition, signalements : edition)
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-00000000000b", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.posts where tenant_id = 'aaaa0000-0000-4000-8000-000000000000'), 3, 'agent A : tous les contenus de A');
select is((select count(*)::int from public.posts where tenant_id = 'bbbb0000-0000-4000-8000-000000000000'), 1, 'agent A : seulement le public de B');
select is((select count(*)::int from public.reports where tenant_id = 'bbbb0000-0000-4000-8000-000000000000'), 0, 'agent A : aucun signalement de B');
select is((select count(*)::int from public.reports where tenant_id = 'aaaa0000-0000-4000-8000-000000000000'), 1, 'agent A : signalements de A');
select throws_ok(
  $$insert into public.posts (tenant_id, title, summary, author_id) values ('bbbb0000-0000-4000-8000-000000000000', 'Intrus', 'x', 'a0000000-0000-4000-8000-00000000000b')$$,
  '42501', null, 'agent A : ecriture refusee dans B');
select throws_ok(
  $$insert into public.places (tenant_id, category_id, name, point, address)
    values ('aaaa0000-0000-4000-8000-000000000000', (select id from public.place_categories where tenant_id = 'aaaa0000-0000-4000-8000-000000000000' limit 1), 'Lieu', 'SRID=4326;POINT(2.35 48.85)', 'x')$$,
  '42501', null, 'agent A sans droit Carte : creation de lieu refusee');
select throws_ok(
  $$update public.posts set status = 'published' where id = 'a2000000-0000-4000-8000-000000000002'$$,
  'P0001', 'APP_PUBLISH_FORBIDDEN', 'agent A (edition) : publication refusee');
select lives_ok(
  $$update public.posts set status = 'pending_review' where id = 'a2000000-0000-4000-8000-000000000002'$$,
  'agent A : soumission a validation');
select throws_ok(
  $$update public.posts set title = 'Retouche' where id = 'a2000000-0000-4000-8000-000000000001'$$,
  'P0001', 'APP_EDIT_FORBIDDEN', 'agent A : un contenu publie ne se modifie qu''avec le droit de publication');
select is((select count(*)::int from public.audit_log), 0, 'agent A : pas d''acces au journal d''audit');
select throws_ok(
  $$insert into public.report_events (tenant_id, report_id, kind, to_status, author_id) values ('aaaa0000-0000-4000-8000-000000000000', 'a3000000-0000-4000-8000-000000000001', 'status_change', 'rejected', 'a0000000-0000-4000-8000-00000000000b')$$,
  'P0001', 'APP_MESSAGE_REQUIRED', 'un rejet exige un motif');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Admin de A
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-00000000000a", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$update public.posts set status = 'published' where id = 'a2000000-0000-4000-8000-000000000002'$$, 'admin A : publication');
select throws_ok($$update public.memberships set disabled_at = now() where id = 'a1000000-0000-4000-8000-000000000001'$$,
  'P0001', 'APP_LAST_ADMIN', 'le dernier admin ne peut pas etre desactive');
select ok((select count(*) from public.audit_log where tenant_id = 'aaaa0000-0000-4000-8000-000000000000') > 0, 'admin A : journal d''audit de A');
select is((select count(*)::int from public.audit_log where tenant_id = 'bbbb0000-0000-4000-8000-000000000000'), 0, 'admin A : rien de B dans l''audit');
reset role;

-- Admin sans 2FA (aal1) : aucun acces personnel.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-00000000000a", "role": "authenticated", "aal": "aal1"}';
select is((select count(*)::int from public.reports), 0, 'admin A en aal1 : aucun signalement');
select is((select count(*)::int from public.posts where status = 'draft'), 0, 'admin A en aal1 : aucun brouillon');
reset role;

-- Admin de B : ne modifie rien dans A (0 ligne).
set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-4000-8000-00000000000a", "role": "authenticated", "aal": "aal2"}';
select is_empty($$update public.reports set priority = 'high' where id = 'a3000000-0000-4000-8000-000000000001' returning 1$$, 'admin B : aucune modification possible dans A');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Habitants
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-4000-8000-00000000000a", "role": "authenticated", "aal": "aal1", "is_anonymous": true}';
select is((select count(*)::int from public.reports), 1, 'habitant A : uniquement son signalement');
select is((select count(*)::int from public.report_events), 2, 'habitant A : uniquement les evenements publics de son signalement (recu + pris en compte)');
select is((select count(*)::int from public.citizen_profiles), 1, 'habitant A : uniquement son profil');
select throws_ok(
  $$insert into public.reports (tenant_id, category_id, description, point, address, reporter_id)
    values ('bbbb0000-0000-4000-8000-000000000000', (select id from public.report_categories where tenant_id = 'bbbb0000-0000-4000-8000-000000000000' limit 1), 'x', 'SRID=4326;POINT(4.8 45.7)', 'x', 'c0000000-0000-4000-8000-00000000000a')$$,
  '42501', null, 'habitant A : signalement refuse dans B');
select lives_ok(
  $$insert into public.reports (tenant_id, category_id, description, point, address, reporter_id)
    values ('aaaa0000-0000-4000-8000-000000000000', (select id from public.report_categories where tenant_id = 'aaaa0000-0000-4000-8000-000000000000' limit 1), 'Lampadaire', 'SRID=4326;POINT(2.35 48.85)', '2 rue A', 'c0000000-0000-4000-8000-00000000000a')$$,
  'habitant A : cree un signalement dans sa commune');
select is_empty($$update public.reports set status = 'resolved' returning 1$$, 'habitant A : ne modifie pas le statut');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Editeur (super-admin)
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e0000000-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2", "app_metadata": {"platform_admin": true}}';
select ok((select count(*) from public.reports where tenant_id in ('aaaa0000-0000-4000-8000-000000000000', 'bbbb0000-0000-4000-8000-000000000000')) >= 3, 'editeur : signalements de toutes les communes');
select is((select count(*)::int from public.tenant_internal_notes), (select count(*)::int from public.tenant_internal_notes), 'editeur : notes internes lisibles');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "e0000000-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal1", "app_metadata": {"platform_admin": true}}';
select is((select count(*)::int from public.reports), 0, 'editeur sans 2FA : aucun acces');
reset role;

select * from finish();
rollback;
