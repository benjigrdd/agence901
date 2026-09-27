/**
 * SQL derive des constantes TypeScript (@app/shared, @app/data) : enums Postgres et donnees par defaut
 * d'une commune. `pnpm db:generate` ecrit les migrations correspondantes ; le test de parite verifie
 * que les fichiers commites sont a jour.
 */
import { DEFAULT_ENABLED_MODULES, DEFAULT_HOME_LAYOUT, DEFAULT_PLACE_CATEGORIES, DEFAULT_REPORT_CATEGORIES, DEFAULT_SERVICE_NAME, DEFAULT_TOPICS } from '@app/data';
import {
  ALERT_LEVELS,
  APP_ROLES,
  AUDIT_ACTIONS,
  CONTENT_STATUSES,
  EVENT_CATEGORIES,
  MODULES,
  ONBOARDING_STEP_DEFS,
  PERMISSION_LEVELS,
  PLACE_SOURCES,
  POST_TYPES,
  PROCEDURE_CATEGORIES,
  PROCEDURE_KINDS,
  PUSH_PLATFORMS,
  REPORT_EVENT_KINDS,
  REPORT_EVENT_VISIBILITIES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  REVIEW_ACTIONS,
  REVIEWABLE_ENTITY_TYPES,
  SORTING_BINS,
  STORE_PUBLICATION_STATUSES,
  TENANT_MODULES,
  TENANT_PLANS,
  TENANT_STATUSES,
  TENANT_TYPES,
  WASTE_TYPES,
  WHEELCHAIR_ACCESS,
} from '@app/shared';

/** Enums Postgres : nom SQL → valeurs (identiques a `@app/shared/enums.ts`). */
export const SQL_ENUMS: Record<string, readonly string[]> = {
  module_key: MODULES,
  app_role: APP_ROLES,
  permission_level: PERMISSION_LEVELS,
  post_type: POST_TYPES,
  alert_level: ALERT_LEVELS,
  content_status: CONTENT_STATUSES,
  report_status: REPORT_STATUSES,
  report_priority: REPORT_PRIORITIES,
  tenant_type: TENANT_TYPES,
  tenant_status: TENANT_STATUSES,
  tenant_plan: TENANT_PLANS,
  waste_type: WASTE_TYPES,
  sorting_bin: SORTING_BINS,
  event_category: EVENT_CATEGORIES,
  procedure_category: PROCEDURE_CATEGORIES,
  procedure_kind: PROCEDURE_KINDS,
  place_source: PLACE_SOURCES,
  wheelchair_access: WHEELCHAIR_ACCESS,
  report_event_kind: REPORT_EVENT_KINDS,
  visibility: REPORT_EVENT_VISIBILITIES,
  reviewable_entity: REVIEWABLE_ENTITY_TYPES,
  review_action: REVIEW_ACTIONS,
  audit_action: AUDIT_ACTIONS,
  store_publication_status: STORE_PUBLICATION_STATUSES,
  push_platform: PUSH_PLATFORMS,
  // Propre a la base (pas de schema zod correspondant).
  notification_status: ['scheduled', 'sent', 'failed', 'cancelled'],
};

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;
const json = (v: unknown) => `${lit(JSON.stringify(v))}::jsonb`;

export function enumsSql(): string {
  const lines = ['-- Genere par scripts/db/generate-sql.ts depuis @app/shared : ne pas modifier a la main.', ''];
  for (const [name, values] of Object.entries(SQL_ENUMS)) {
    lines.push(`create type public.${name} as enum (${values.map(lit).join(', ')});`);
  }
  return `${lines.join('\n')}\n`;
}

export function seedDefaultsSql(): string {
  const v2 = TENANT_MODULES.filter((m) => !DEFAULT_ENABLED_MODULES.includes(m));
  const placeValues = DEFAULT_PLACE_CATEGORIES.map((c) => `(p_tenant_id, ${lit(c.key)}, ${lit(c.label)}, ${lit(c.icon)}, ${lit(c.color)}, true, false)`).join(',\n    ');
  const reportValues = DEFAULT_REPORT_CATEGORIES.map((c) => `(p_tenant_id, ${lit(c.label)}, ${lit(c.icon)}, v_service_id, ${c.slaDays})`).join(',\n    ');
  const topicValues = DEFAULT_TOPICS.map((t, i) => `(p_tenant_id, ${lit(t)}, ${i})`).join(',\n    ');
  const moduleValues = TENANT_MODULES.map((m) => `(p_tenant_id, ${lit(m)}::public.module_key, ${v2.includes(m) ? 'false' : 'true'})`).join(',\n    ');
  const checklist = ONBOARDING_STEP_DEFS.map((s) => ({ ...s, done: false, doneAt: null }));
  return `-- Genere par scripts/db/generate-sql.ts depuis @app/data (seedTenantDefaults) : ne pas modifier a la main.

-- Donnees par defaut d'une commune : equivalent SQL de \`seedTenantDefaults\`.
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
  values (p_tenant_id, ${lit(DEFAULT_SERVICE_NAME)}, null)
  returning id into v_service_id;

  insert into public.place_categories (tenant_id, key, label, icon, color, is_default, hidden) values
    ${placeValues};

  insert into public.report_categories (tenant_id, label, icon, default_service_id, sla_days) values
    ${reportValues};

  insert into public.topics (tenant_id, label, sort_order) values
    ${topicValues};

  insert into public.tenant_modules (tenant_id, module, enabled) values
    ${moduleValues};

  insert into public.tenant_app_config (tenant_id, home_layout, links, contact)
  values (
    p_tenant_id,
    ${json(DEFAULT_HOME_LAYOUT)},
    ${json({ legalNotice: null, privacy: null, accessibility: null })},
    ${json({ openingHours: null, phone: null, email: null, address: null })}
  );

  insert into public.tenant_store_info (tenant_id, ios_bundle_id, android_package, url_scheme, onboarding_checklist)
  values (p_tenant_id, 'fr.' || v_compact || '.app', 'fr.' || v_compact || '.app', v_compact, ${json(checklist)});

  perform set_config('app.skip_audit', 'off', true);
end;
$$;
`;
}
