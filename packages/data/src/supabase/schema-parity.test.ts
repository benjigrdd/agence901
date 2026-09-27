import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as shared from '@app/shared';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

/**
 * Coherence schema zod ↔ base : chaque champ du schema existe en colonne (camelCase → snake_case),
 * aux exceptions documentees pres. Lit les types generes par `pnpm db:types`.
 */
const TYPES = readFileSync(resolve(import.meta.dirname, 'database.types.ts'), 'utf8');

function tableColumns(table: string): string[] {
  const match = new RegExp(`\\n {6}${table}: \\{\\n {8}Row: \\{([\\s\\S]*?)\\n {8}\\};`).exec(TYPES);
  if (!match?.[1]) throw new Error(`Table absente des types generes : ${table}`);
  return [...match[1].matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1] ?? '');
}

function enumValues(name: string): string[] {
  const start = TYPES.indexOf('    Enums: {');
  const block = TYPES.slice(start, TYPES.indexOf('    CompositeTypes', start));
  const match = new RegExp(`\\n {6}${name}:([^;]*);`).exec(block);
  if (!match?.[1]) throw new Error(`Enum absent : ${name}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '');
}

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

type Entity = {
  schema: z.ZodObject;
  table: string;
  /** Champ zod → colonne(s) differente(s), ou `null` si le champ n'est pas stocke dans cette table. */
  exceptions?: Record<string, string[] | null>;
};

const ENTITIES: Entity[] = [
  { schema: shared.TenantSchema, table: 'tenants' },
  { schema: shared.TenantBrandingSchema, table: 'tenant_branding' },
  { schema: shared.TenantModuleSchema, table: 'tenant_modules' },
  { schema: shared.TenantAppConfigSchema, table: 'tenant_app_config' },
  { schema: shared.TenantStoreInfoSchema, table: 'tenant_store_info' },
  // email et derniere connexion : lus depuis auth.users.
  { schema: shared.ProfileSchema, table: 'profiles', exceptions: { email: null, lastSignInAt: null } },
  { schema: shared.MembershipSchema, table: 'memberships' },
  { schema: shared.MembershipPermissionSchema, table: 'membership_permissions' },
  { schema: shared.CitizenProfileSchema, table: 'citizen_profiles' },
  { schema: shared.TopicSchema, table: 'topics', exceptions: { order: ['sort_order'] } },
  // url : calculee depuis le chemin du bucket par l'adaptateur.
  { schema: shared.MediaSchema, table: 'media', exceptions: { url: null } },
  { schema: shared.PostSchema, table: 'posts' },
  { schema: shared.EventSchema, table: 'events', exceptions: { location: ['location_label', 'location_point'] } },
  { schema: shared.ContentReviewSchema, table: 'content_reviews' },
  { schema: shared.PlaceCategorySchema, table: 'place_categories' },
  { schema: shared.PlaceSchema, table: 'places' },
  { schema: shared.ProcedureSchema, table: 'procedures', exceptions: { order: ['sort_order'] } },
  { schema: shared.SortingGuideItemSchema, table: 'sorting_guide_items' },
  { schema: shared.ServiceSchema, table: 'services' },
  { schema: shared.ReportCategorySchema, table: 'report_categories' },
  // photos : table report_media (URLs signees a la lecture).
  { schema: shared.ReportSchema, table: 'reports', exceptions: { photos: null } },
  { schema: shared.ReportEventSchema, table: 'report_events' },
  { schema: shared.DistrictSchema, table: 'districts' },
  { schema: shared.WasteZoneSchema, table: 'waste_zones' },
  { schema: shared.WasteScheduleSchema, table: 'waste_schedules' },
  { schema: shared.NotificationSchema, table: 'notifications' },
  { schema: shared.AuditEntrySchema, table: 'audit_log' },
  { schema: shared.UsageDailySchema, table: 'usage_daily' },
];

describe('parité schéma zod ↔ base', () => {
  it.each(ENTITIES.map((e) => [e.table, e] as const))('%s couvre tous les champs du schéma zod', (_table, entity) => {
    const columns = tableColumns(entity.table);
    const missing: string[] = [];
    for (const field of Object.keys(entity.schema.shape)) {
      const mapped = entity.exceptions && field in entity.exceptions ? entity.exceptions[field] : [snake(field)];
      if (mapped === null || mapped === undefined) continue;
      for (const column of mapped) if (!columns.includes(column)) missing.push(`${field} → ${column}`);
    }
    expect(missing).toEqual([]);
  });

  it('les enums SQL reprennent exactement ceux de @app/shared', () => {
    const pairs: [string, readonly string[]][] = [
      ['module_key', shared.MODULES],
      ['app_role', shared.APP_ROLES],
      ['permission_level', shared.PERMISSION_LEVELS],
      ['post_type', shared.POST_TYPES],
      ['alert_level', shared.ALERT_LEVELS],
      ['content_status', shared.CONTENT_STATUSES],
      ['report_status', shared.REPORT_STATUSES],
      ['report_priority', shared.REPORT_PRIORITIES],
      ['tenant_type', shared.TENANT_TYPES],
      ['tenant_status', shared.TENANT_STATUSES],
      ['tenant_plan', shared.TENANT_PLANS],
      ['waste_type', shared.WASTE_TYPES],
      ['sorting_bin', shared.SORTING_BINS],
      ['event_category', shared.EVENT_CATEGORIES],
      ['procedure_category', shared.PROCEDURE_CATEGORIES],
      ['procedure_kind', shared.PROCEDURE_KINDS],
      ['place_source', shared.PLACE_SOURCES],
      ['wheelchair_access', shared.WHEELCHAIR_ACCESS],
      ['report_event_kind', shared.REPORT_EVENT_KINDS],
      ['visibility', shared.REPORT_EVENT_VISIBILITIES],
      ['reviewable_entity', shared.REVIEWABLE_ENTITY_TYPES],
      ['review_action', shared.REVIEW_ACTIONS],
      ['audit_action', shared.AUDIT_ACTIONS],
      ['store_publication_status', shared.STORE_PUBLICATION_STATUSES],
    ];
    for (const [sql, values] of pairs) expect([sql, enumValues(sql).sort()]).toEqual([sql, [...values].sort()]);
  });
});
