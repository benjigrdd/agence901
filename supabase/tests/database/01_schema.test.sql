-- Lot 11 : structure, cles etrangeres composites, references, donnees par defaut, audit.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Tables principales presentes.
select has_table('public', t, format('table %s', t))
from unnest(array['tenants', 'memberships', 'posts', 'events', 'places', 'reports', 'report_events', 'districts', 'notifications', 'audit_log']) as t;

-- RLS activee sur toutes les tables de public.
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'RLS activee sur toutes les tables de public'
);

-- Deux communes de test (le trigger cree leurs donnees par defaut).
insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test@exemple.test');
insert into public.tenants (id, slug, name, insee_code, center) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'test-un', 'Test Un', '99901', 'SRID=4326;POINT(2.35 48.85)'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'test-deux', 'Test Deux', '99902', 'SRID=4326;POINT(4.83 45.76)');

select is((select count(*)::int from public.place_categories where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 12, '12 categories de lieux par defaut');
select is((select count(*)::int from public.report_categories where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 5, '5 categories de signalement par defaut');
select is((select count(*)::int from public.topics where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 6, '6 themes par defaut');
select is((select count(*)::int from public.tenant_modules where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 10, 'une ligne par module activable (10)');
select is((select ios_bundle_id from public.tenant_store_info where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'fr.testun.app', 'fiche store par defaut');

-- Cle etrangere composite : categorie d'une autre commune refusee.
select throws_ok(
  $$insert into public.reports (tenant_id, category_id, description, point, address)
    values ('aaaaaaaa-0000-4000-8000-000000000001',
            (select id from public.report_categories where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000002' limit 1),
            'Nid-de-poule', 'SRID=4326;POINT(2.35 48.85)', '1 rue Test')$$,
  '23503',
  null,
  'un signalement ne peut pas pointer vers la categorie d''une autre commune'
);

-- References : 00001 puis 00002, et l'autre commune repart a 1.
insert into public.reports (tenant_id, category_id, description, point, address, created_at)
select 'aaaaaaaa-0000-4000-8000-000000000001', id, 'Premier', 'SRID=4326;POINT(2.35 48.85)', '1 rue Test', '2026-05-01T10:00:00Z'
from public.report_categories where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001' limit 1;
insert into public.reports (tenant_id, category_id, description, point, address, created_at)
select 'aaaaaaaa-0000-4000-8000-000000000001', id, 'Deuxieme', 'SRID=4326;POINT(2.35 48.85)', '2 rue Test', '2026-05-02T10:00:00Z'
from public.report_categories where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001' limit 1;
insert into public.reports (tenant_id, category_id, description, point, address, created_at)
select 'aaaaaaaa-0000-4000-8000-000000000002', id, 'Autre commune', 'SRID=4326;POINT(4.83 45.76)', '3 rue Test', '2026-05-03T10:00:00Z'
from public.report_categories where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000002' limit 1;

select results_eq(
  $$select reference from public.reports where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000001' order by created_at$$,
  $$values ('2026-00001'), ('2026-00002')$$,
  'references sequentielles par commune et par annee'
);
select is((select reference from public.reports where tenant_id = 'aaaaaaaa-0000-4000-8000-000000000002'), '2026-00001', 'une autre commune repart a 1');

-- Audit : la modification d'un post n'enregistre que les colonnes modifiees.
insert into public.posts (id, tenant_id, title, summary, author_id)
values ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Titre', 'Resume', '11111111-1111-4111-8111-111111111111');
update public.posts set title = 'Nouveau titre' where id = 'bbbbbbbb-0000-4000-8000-000000000001';

select is(
  (select array_agg(k order by k) from public.audit_log a, jsonb_object_keys(a.diff) k
   where a.entity = 'posts' and a.entity_id = 'bbbbbbbb-0000-4000-8000-000000000001' and a.action = 'update'),
  array['title'],
  'le diff d''audit d''un update ne contient que la colonne modifiee'
);
select is(
  (select diff -> 'title' ->> 'after' from public.audit_log where entity = 'posts' and action = 'update' and entity_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'Nouveau titre',
  'valeur apres modification enregistree'
);

select * from finish();
rollback;
