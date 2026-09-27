-- Genere par scripts/db/generate-sql.ts depuis @app/data (seedTenantDefaults) : ne pas modifier a la main.

-- Donnees par defaut d'une commune : equivalent SQL de `seedTenantDefaults`.
create or replace function private.seed_tenant_defaults(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
  v_compact text;
  v_service_id uuid;
begin
  select slug into v_slug from public.tenants where id = p_tenant_id;
  v_compact := replace(v_slug, '-', '');
  if v_compact !~ '^[a-z]' then
    v_compact := 'c' || v_compact;
  end if;

  -- Les donnees initiales ne sont pas des actions du personnel : pas d'audit.
  perform set_config('app.skip_audit', 'on', true);

  insert into public.services (tenant_id, name, email)
  values (p_tenant_id, 'Services techniques', null)
  returning id into v_service_id;

  insert into public.place_categories (tenant_id, key, label, icon, color, is_default, hidden) values
    (p_tenant_id, 'mairie', 'Mairie', 'landmark', '#1d4ed8', true, false),
    (p_tenant_id, 'ecole', 'École', 'school', '#7c3aed', true, false),
    (p_tenant_id, 'equipement-sportif', 'Équipement sportif', 'dumbbell', '#047857', true, false),
    (p_tenant_id, 'parc', 'Parc', 'trees', '#15803d', true, false),
    (p_tenant_id, 'parking', 'Parking', 'square-parking', '#334155', true, false),
    (p_tenant_id, 'toilettes', 'Toilettes publiques', 'toilet', '#0e7490', true, false),
    (p_tenant_id, 'fontaine', 'Fontaine', 'glass-water', '#0369a1', true, false),
    (p_tenant_id, 'borne-recharge', 'Borne de recharge', 'plug-zap', '#a16207', true, false),
    (p_tenant_id, 'decheterie', 'Déchèterie', 'recycle', '#4d7c0f', true, false),
    (p_tenant_id, 'commerce', 'Commerce', 'store', '#be185d', true, false),
    (p_tenant_id, 'sante', 'Santé', 'stethoscope', '#b91c1c', true, false),
    (p_tenant_id, 'culture', 'Culture', 'library', '#9333ea', true, false);

  insert into public.report_categories (tenant_id, label, icon, default_service_id, sla_days) values
    (p_tenant_id, 'Voirie', 'construction', v_service_id, 7),
    (p_tenant_id, 'Éclairage public', 'lightbulb', v_service_id, 5),
    (p_tenant_id, 'Propreté', 'trash-2', v_service_id, 3),
    (p_tenant_id, 'Espaces verts', 'trees', v_service_id, 10),
    (p_tenant_id, 'Mobilier urbain', 'armchair', v_service_id, 14);

  insert into public.topics (tenant_id, label, sort_order) values
    (p_tenant_id, 'Culture', 0),
    (p_tenant_id, 'Sport', 1),
    (p_tenant_id, 'Travaux', 2),
    (p_tenant_id, 'Jeunesse', 3),
    (p_tenant_id, 'Environnement', 4),
    (p_tenant_id, 'Vie municipale', 5);

  insert into public.tenant_modules (tenant_id, module, enabled) values
    (p_tenant_id, 'news'::public.module_key, true),
    (p_tenant_id, 'events'::public.module_key, true),
    (p_tenant_id, 'reports'::public.module_key, true),
    (p_tenant_id, 'map'::public.module_key, true),
    (p_tenant_id, 'mobility'::public.module_key, false),
    (p_tenant_id, 'procedures'::public.module_key, true),
    (p_tenant_id, 'participation'::public.module_key, false),
    (p_tenant_id, 'notifications'::public.module_key, true),
    (p_tenant_id, 'services'::public.module_key, false),
    (p_tenant_id, 'environment'::public.module_key, true);

  insert into public.tenant_app_config (tenant_id, home_layout, links, contact)
  values (
    p_tenant_id,
    '[{"tile":"alerts","enabled":true},{"tile":"news","enabled":true},{"tile":"events","enabled":true},{"tile":"reports","enabled":true},{"tile":"map","enabled":true},{"tile":"environment","enabled":true},{"tile":"procedures","enabled":true},{"tile":"contact","enabled":true}]'::jsonb,
    '{"legalNotice":null,"privacy":null,"accessibility":null}'::jsonb,
    '{"openingHours":null,"phone":null,"email":null,"address":null}'::jsonb
  );

  insert into public.tenant_store_info (tenant_id, ios_bundle_id, android_package, url_scheme, onboarding_checklist)
  values (p_tenant_id, 'fr.' || v_compact || '.app', 'fr.' || v_compact || '.app', v_compact, '[{"key":"duns","label":"Numéro D-U-N-S obtenu","done":false,"doneAt":null},{"key":"apple-account","label":"Compte Apple Developer (organisation) créé","done":false,"doneAt":null},{"key":"apple-fee-waiver","label":"Demande d’exonération des frais envoyée","done":false,"doneAt":null},{"key":"apple-delegation","label":"Accès délégué à l’éditeur accordé (Apple)","done":false,"doneAt":null},{"key":"google-account","label":"Compte Google Play organisation créé","done":false,"doneAt":null},{"key":"google-delegation","label":"Accès délégué accordé (Google)","done":false,"doneAt":null},{"key":"store-listing","label":"Textes et captures de la fiche store validés par la mairie","done":false,"doneAt":null},{"key":"privacy-policy","label":"Politique de confidentialité en ligne","done":false,"doneAt":null},{"key":"first-release","label":"Première publication","done":false,"doneAt":null}]'::jsonb);

  perform set_config('app.skip_audit', 'off', true);
end;
$$;
