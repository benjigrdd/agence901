-- Lot 16 : taches serveur (publication programmee, alertes, destinataires, resultats, retention).
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, instance_id, aud, role, email, is_anonymous) values
  ('a5000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jobs-admin@test.test', false),
  ('c5000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true),
  ('c5000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true),
  ('c5000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true);
insert into public.tenants (id, slug, name, insee_code, center, status) values
  ('aaaa5555-0000-4000-8000-000000000000', 'jobs-a', 'Jobs A', '99601', 'SRID=4326;POINT(2.35 48.85)', 'active');
insert into public.districts (id, tenant_id, name, color, geom) values
  ('d5000000-0000-4000-8000-000000000001', 'aaaa5555-0000-4000-8000-000000000000', 'Nord', '#112233', 'SRID=4326;MULTIPOLYGON(((0 0,1 0,1 1,0 0)))');
insert into public.citizen_profiles (user_id, tenant_id, district_ids, notification_prefs, last_seen_at) values
  ('c5000000-0000-4000-8000-000000000001', 'aaaa5555-0000-4000-8000-000000000000', '{d5000000-0000-4000-8000-000000000001}', '{"alerts": true, "news": true, "events": false, "wasteReminder": false, "reportUpdates": true}', now()),
  ('c5000000-0000-4000-8000-000000000002', 'aaaa5555-0000-4000-8000-000000000000', '{}', '{"alerts": true, "news": false, "events": false, "wasteReminder": false, "reportUpdates": true}', now()),
  ('c5000000-0000-4000-8000-000000000003', 'aaaa5555-0000-4000-8000-000000000000', '{}', '{"alerts": true, "news": true, "events": false, "wasteReminder": false, "reportUpdates": true}', now() - interval '30 months');
insert into public.push_tokens (id, tenant_id, user_id, token, platform) values
  ('e5000000-0000-4000-8000-000000000001', 'aaaa5555-0000-4000-8000-000000000000', 'c5000000-0000-4000-8000-000000000001', 'ExponentPushToken[un]', 'ios'),
  ('e5000000-0000-4000-8000-000000000002', 'aaaa5555-0000-4000-8000-000000000000', 'c5000000-0000-4000-8000-000000000002', 'ExponentPushToken[deux]', 'android');

-- Publication programmee : rien avant l'heure, publie a l'heure (temps simule).
insert into public.posts (id, tenant_id, title, summary, status, publish_at, unpublish_at, author_id) values
  ('b5000000-0000-4000-8000-000000000001', 'aaaa5555-0000-4000-8000-000000000000', 'Programmee', 'x', 'scheduled', '2030-01-01T08:00:00Z', '2030-01-10T08:00:00Z', 'a5000000-0000-4000-8000-000000000001');
select private.publish_due_content('2030-01-01T07:59:00Z');
select is((select status::text from public.posts where id = 'b5000000-0000-4000-8000-000000000001'), 'scheduled', 'pas de publication avant l''heure');
select ok((private.publish_due_content('2030-01-01T08:00:00Z') ->> 'postsPublished')::int >= 1, 'publication a l''heure prevue');
select is((select status::text from public.posts where id = 'b5000000-0000-4000-8000-000000000001'), 'published', 'statut publie');
select private.publish_due_content('2030-01-10T08:00:00Z');
select is((select status::text from public.posts where id = 'b5000000-0000-4000-8000-000000000001'), 'archived', 'depublication a l''heure prevue');
select ok((select count(*) from public.job_runs where job = 'publish_due_content' and status = 'success') >= 3, 'chaque execution est journalisee');

-- Alerte publiee avec push : une notification, une seule fois.
insert into public.posts (id, tenant_id, type, alert_level, title, summary, status, send_push, author_id) values
  ('b5000000-0000-4000-8000-000000000002', 'aaaa5555-0000-4000-8000-000000000000', 'alert', 'urgent', 'Coupure d''eau', 'Coupure rue des Lilas de 9 h a 12 h', 'draft', true, 'a5000000-0000-4000-8000-000000000001');
update public.posts set status = 'published' where id = 'b5000000-0000-4000-8000-000000000002';
update public.posts set status = 'archived' where id = 'b5000000-0000-4000-8000-000000000002';
update public.posts set status = 'published' where id = 'b5000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.notifications where dedupe_key = 'alert:b5000000-0000-4000-8000-000000000002'), 1, 'une seule notification par alerte');
select is((select channel from public.notifications where dedupe_key = 'alert:b5000000-0000-4000-8000-000000000002'), 'alertes', 'canal alertes');

-- Destinataires selon la cible et les preferences.
insert into public.notifications (id, tenant_id, title, body, target, scheduled_at, author_id) values
  ('f5000000-0000-4000-8000-000000000001', 'aaaa5555-0000-4000-8000-000000000000', 'Info', 'Quartier nord', '{"type": "districts", "ids": ["d5000000-0000-4000-8000-000000000001"]}', now(), 'a5000000-0000-4000-8000-000000000001'),
  ('f5000000-0000-4000-8000-000000000002', 'aaaa5555-0000-4000-8000-000000000000', 'Info', 'Toute la commune', '{"type": "all", "ids": []}', now(), 'a5000000-0000-4000-8000-000000000001');
select is((select count(*)::int from private.resolve_recipients('f5000000-0000-4000-8000-000000000001')), 1, 'ciblage par quartier');
select is((select count(*)::int from private.resolve_recipients('f5000000-0000-4000-8000-000000000002')), 1, 'preference « actualites » desactivee respectee');
select is((select count(*)::int from private.resolve_recipients((select id from public.notifications where dedupe_key = 'alert:b5000000-0000-4000-8000-000000000002'))), 2, 'alerte : tous les habitants qui acceptent les alertes');

-- Envoi : lot verrouille puis resultats (jeton desinscrit → invalide).
select ok(jsonb_array_length(public.claim_due_notifications(20, now() + interval '1 minute')) >= 2, 'notifications dues reclamees');
select is((select count(*)::int from public.notifications where tenant_id = 'aaaa5555-0000-4000-8000-000000000000' and status = 'scheduled'), 0, 'plus rien a reclamer (skip locked)');
select public.record_push_results('f5000000-0000-4000-8000-000000000002', '[{"pushTokenId": "e5000000-0000-4000-8000-000000000001", "ticketId": "t1", "status": "error", "error": "DeviceNotRegistered"}]');
select isnt((select invalid_at from public.push_tokens where id = 'e5000000-0000-4000-8000-000000000001'), null, 'jeton desinscrit invalide');

-- Retention : habitant anonyme inactif depuis plus de 24 mois supprime, les autres conserves.
select lives_ok($$select private.purge_retention(now())$$, 'purge executee');
select is((select count(*)::int from public.citizen_profiles where tenant_id = 'aaaa5555-0000-4000-8000-000000000000'), 2, 'habitant inactif supprime, habitants actifs conserves');

select * from finish();
rollback;
