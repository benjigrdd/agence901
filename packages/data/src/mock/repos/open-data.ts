import type { CsvImportEntity, Module } from '@app/shared';

import { ValidationError } from '../../errors';
import type { OpenDataRepository } from '../../ports';
import {
  requirePermission,
  requirePlatformAdmin,
  requireStaff,
  requireTenantAdmin,
} from '../access';
import type { MockRuntime } from '../runtime';
import { recordAudit } from '../runtime';

export const OPEN_DATA_UNAVAILABLE =
  'Disponible avec Supabase (imports et exports passent par des fonctions serveur)';

export const CSV_IMPORT_MODULES: Record<CsvImportEntity, Module> = {
  places: 'map',
  events: 'events',
  procedures: 'procedures',
  sortingGuide: 'environment',
};

/**
 * Mode demonstration : imports open data, contour officiel et export ZIP necessitent les Edge
 * Functions (droits verifies, puis refus explicite). Les imports CSV passent par les ecritures
 * habituelles ; seul leur bilan est inscrit ici dans l'audit.
 */
export function createOpenDataRepository(rt: MockRuntime): OpenDataRepository {
  return {
    async previewOsm(ctx) {
      requirePermission(rt.store, ctx, 'map', 'edit');
      throw new ValidationError(OPEN_DATA_UNAVAILABLE);
    },
    async importOsm(ctx) {
      requirePermission(rt.store, ctx, 'map', 'edit');
      throw new ValidationError(OPEN_DATA_UNAVAILABLE);
    },
    async importIrve(ctx) {
      requirePermission(rt.store, ctx, 'map', 'edit');
      throw new ValidationError(OPEN_DATA_UNAVAILABLE);
    },
    async exportTenant(ctx) {
      requireTenantAdmin(rt.store, ctx);
      throw new ValidationError(OPEN_DATA_UNAVAILABLE);
    },
    async syncGeometry(ctx) {
      requirePlatformAdmin(ctx);
      throw new ValidationError(OPEN_DATA_UNAVAILABLE);
    },
    async recordCsvImport(ctx, entity, counts) {
      requirePermission(rt.store, ctx, CSV_IMPORT_MODULES[entity], 'edit');
      const session = requireStaff(rt.store, ctx);
      recordAudit(rt, {
        tenantId: ctx.tenantId,
        actorId: session.userId,
        action: 'import_csv',
        entity,
        entityId: ctx.tenantId,
        before: null,
        after: { counts },
      });
    },
  };
}
