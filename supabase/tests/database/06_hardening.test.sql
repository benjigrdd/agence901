-- Lot 19 : durcissement (search_path des fonctions privilegiees, RLS, limitation du debit, export
-- des donnees d'un habitant).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Toute fonction `security definer` des schemas applicatifs fixe son search_path.
select is(
  (select coalesce(array_agg(n.nspname || '.' || p.proname order by 1), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.prosecdef and n.nspname in ('public', 'private')
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  '{}'::text[], 'security definer : search_path fixe partout');
-- Aucune table de public sans RLS (y compris celles de ce lot).
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 0, 'RLS active sur toutes les tables de public');

insert into auth.users (id, instance_id, aud, role, email, is_anonymous) values
  ('a9000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true),
  ('a9000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true);
insert into public.tenants (id, slug, name, insee_code, center, status) values
  ('aaaa9999-0000-4000-8000-000000000000', 'hard-a', 'Durcie', '99901', 'SRID=4326;POINT(2.35 48.85)', 'active');
insert into public.citizen_profiles (user_id, tenant_id, contact_email) values
  ('a9000000-0000-4000-8000-000000000001', 'aaaa9999-0000-4000-8000-000000000000', 'moi@exemple.test'),
  ('a9000000-0000-4000-8000-000000000002', 'aaaa9999-0000-4000-8000-000000000000', 'autre@exemple.test');
insert into public.reports (tenant_id, category_id, description, point, address, reporter_id, contact_email)
select 'aaaa9999-0000-4000-8000-000000000000', id, d, 'SRID=4326;POINT(2.35 48.85)', '1 rue', u, e
from public.report_categories, (values ('Lampadaire eteint', 'a9000000-0000-4000-8000-000000000001'::uuid, 'moi@exemple.test'),
  ('Nid de poule', 'a9000000-0000-4000-8000-000000000002'::uuid, 'autre@exemple.test')) v(d, u, e)
where tenant_id = 'aaaa9999-0000-4000-8000-000000000000' limit 2;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a9000000-0000-4000-8000-000000000001", "role": "authenticated", "is_anonymous": true}';

-- Limitation du debit : 3 appels autorises par minute, le 4e refuse ; compteur par action.
select ok(public.consume_rate_limit('export-tenant', 3) and public.consume_rate_limit('export-tenant', 3) and public.consume_rate_limit('export-tenant', 3), '3 appels acceptes');
select ok(not public.consume_rate_limit('export-tenant', 3), '4e appel refuse');
select ok(public.consume_rate_limit('import-osm', 3), 'autre action : compteur distinct');
select is((select count(*)::int from public.rate_limits), 0, 'compteurs invisibles en lecture directe (aucune policy)');

-- Export des donnees de l'habitant : les siennes uniquement.
select is(public.export_my_data() #>> '{profile,contactEmail}', 'moi@exemple.test', 'profil de l''habitant');
select is(jsonb_array_length(public.export_my_data() -> 'reports'), 1, 'ses signalements seulement');
select ok(public.export_my_data()::text not like '%autre@exemple.test%', 'aucune donnee d''un autre habitant');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.export_my_data()$$, '42501', null, 'anonyme : refuse');

select * from finish();
rollback;
