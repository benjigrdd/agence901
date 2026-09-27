import { CSV_IMPORT_ENTITIES } from '@app/shared';
import { z } from 'zod';

import { ValidationError } from '../../errors';
import type {
  ExportResult,
  GeometrySyncResult,
  ImportResult,
  OpenDataRepository,
  OsmPreview,
} from '../../ports';
import type { ClientResolver } from '../core';
import {
  check,
  requirePermission,
  requirePlatformAdmin,
  requireTenantAdmin,
  validated,
} from '../core';
import { invokeFunction } from './invitations';

const CountsSchema = z.object({ created: z.number(), updated: z.number(), skipped: z.number() });
const ImportResultSchema = CountsSchema.extend({
  found: z.number(),
  byCategory: z.record(z.string(), CountsSchema),
});
const PreviewSchema = z.object({
  found: z.number(),
  byCategory: z.record(z.string(), z.object({ found: z.number() })),
  previewId: z.string().nullable(),
});
const ExportPayloadSchema = z.object({
  path: z.string().min(1),
  counts: z.record(z.string(), z.number()),
  includePersonalData: z.boolean(),
});
const GeometrySchema = z.object({ contour: z.boolean(), population: z.number().nullable() });
const CsvEntitySchema = z.enum(CSV_IMPORT_ENTITIES);

/** Duree de validite du lien de telechargement de l'export (l'archive est supprimee apres 7 jours). */
export const EXPORT_LINK_SECONDS = 24 * 3600;

/** Imports, contour et export via les Edge Functions (droits verifies avec le jeton de l'appelant). */
export function createOpenDataRepository(resolve: ClientResolver): OpenDataRepository {
  return {
    async previewOsm(ctx, categories): Promise<OsmPreview> {
      requirePermission(ctx, 'map', 'edit');
      const data = validated(
        PreviewSchema,
        await invokeFunction<unknown>(await resolve(ctx), 'import-osm', {
          tenantId: ctx.tenantId,
          categories,
          dryRun: true,
        }),
        'aperçu OSM',
      );
      return {
        found: data.found,
        previewId: data.previewId,
        byCategory: Object.fromEntries(
          Object.entries(data.byCategory).map(([k, v]) => [k, v.found]),
        ),
      };
    },
    async importOsm(ctx, { categories, previewId }): Promise<ImportResult> {
      requirePermission(ctx, 'map', 'edit');
      return validated(
        ImportResultSchema,
        await invokeFunction<unknown>(await resolve(ctx), 'import-osm', {
          tenantId: ctx.tenantId,
          categories,
          previewId: previewId ?? null,
        }),
        'import OSM',
      );
    },
    async importIrve(ctx): Promise<ImportResult> {
      requirePermission(ctx, 'map', 'edit');
      return validated(
        ImportResultSchema,
        await invokeFunction<unknown>(await resolve(ctx), 'import-irve', {
          tenantId: ctx.tenantId,
        }),
        'import IRVE',
      );
    },
    async exportTenant(ctx, { includePersonalData }): Promise<ExportResult> {
      requireTenantAdmin(ctx);
      const db = await resolve(ctx);
      const payload = validated(
        ExportPayloadSchema,
        await invokeFunction<unknown>(db, 'export-tenant', {
          tenantId: ctx.tenantId,
          includePersonalData,
        }),
        'export',
      );
      const { data, error } = await db.storage
        .from('exports')
        .createSignedUrl(payload.path, EXPORT_LINK_SECONDS, { download: true });
      if (error || !data) throw new ValidationError('Lien de téléchargement indisponible');
      return {
        url: data.signedUrl,
        expiresInSeconds: EXPORT_LINK_SECONDS,
        counts: payload.counts,
        includePersonalData: payload.includePersonalData,
      };
    },
    async syncGeometry(ctx): Promise<GeometrySyncResult> {
      requirePlatformAdmin(ctx);
      return validated(
        GeometrySchema,
        await invokeFunction<unknown>(await resolve(ctx), 'sync-tenant-geometry', {
          tenantId: ctx.tenantId,
        }),
        'contour',
      );
    },
    async recordCsvImport(ctx, entity, counts) {
      const db = await resolve(ctx);
      check(
        await db.rpc('record_csv_import', {
          p_tenant_id: ctx.tenantId,
          p_entity: CsvEntitySchema.parse(entity),
          p_counts: counts,
        }),
      );
    },
  };
}
