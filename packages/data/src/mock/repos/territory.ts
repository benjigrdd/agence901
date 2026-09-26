import type { District, Procedure, ReportCategory, Service, SortingGuideItem, Topic, WasteSchedule, WasteZone } from '@app/shared';
import {
  computeNextCollections,
  DistrictInputSchema,
  DistrictSchema,
  isPointInMultiPolygon,
  ProcedureInputSchema,
  ProcedureSchema,
  ReportCategoryInputSchema,
  ReportCategorySchema,
  ServiceInputSchema,
  ServiceSchema,
  SortingGuideItemInputSchema,
  SortingGuideItemSchema,
  TopicInputSchema,
  TopicSchema,
  WasteScheduleInputSchema,
  WasteScheduleSchema,
  WasteZoneInputSchema,
  WasteZoneSchema,
} from '@app/shared';

import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type {
  DistrictsRepository,
  EnvironmentRepository,
  ProceduresRepository,
  ReportCategoriesRepository,
  ServicesRepository,
  TopicsRepository,
} from '../../ports';
import { byNumber, byString, requirePermission, requireTenant } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';
import { checkRead, createSimpleRepository } from './simple';

export function createTerritoryRepositories(rt: MockRuntime): {
  districts: DistrictsRepository;
  topics: TopicsRepository;
  services: ServicesRepository;
  reportCategories: ReportCategoriesRepository;
  procedures: ProceduresRepository;
  environment: EnvironmentRepository;
} {
  const { store } = rt;

  const districtsBase = createSimpleRepository(rt, {
    collection: store.districts,
    schema: DistrictSchema,
    inputSchema: DistrictInputSchema,
    entity: 'district',
    read: 'public',
    write: { module: 'districts', level: 'edit' },
    sort: byString((d: District) => d.name),
  });

  const districts: DistrictsRepository = {
    ...districtsBase,
    async stats(ctx) {
      checkRead(rt, ctx, 'staff');
      const reports = store.reports.forTenant(ctx.tenantId);
      const citizens = store.citizens.forTenant(ctx.tenantId);
      return store.districts.forTenant(ctx.tenantId).map((d) => ({
        districtId: d.id,
        reports: reports.filter((r) => isPointInMultiPolygon(r.point, d.geom)).length,
        subscribers: citizens.filter((c) => c.districtIds.includes(d.id)).length,
      }));
    },
  };

  const topics = createSimpleRepository(rt, {
    collection: store.topics,
    schema: TopicSchema,
    inputSchema: TopicInputSchema,
    entity: 'topic',
    read: 'public',
    write: { module: 'settings', level: 'edit' },
    sort: byNumber((t: Topic) => t.order),
  });

  const services = createSimpleRepository(rt, {
    collection: store.services,
    schema: ServiceSchema,
    inputSchema: ServiceInputSchema,
    entity: 'service',
    read: 'staff',
    write: { module: 'settings', level: 'edit' },
    sort: byString((s: Service) => s.name),
    beforeRemove: (ctx, service) => {
      const used = store.reports.forTenant(ctx.tenantId).some((r) => r.serviceId === service.id);
      if (used) throw new ConflictError('Service assigné à des signalements : suppression impossible');
    },
  });

  const reportCategories = createSimpleRepository(rt, {
    collection: store.reportCategories,
    schema: ReportCategorySchema,
    inputSchema: ReportCategoryInputSchema,
    entity: 'report_category',
    read: 'public',
    write: { module: 'settings', level: 'edit' },
    sort: byString((c: ReportCategory) => c.label),
    beforeWrite: (ctx, data) => {
      if (data.defaultServiceId && !store.services.get(ctx.tenantId, data.defaultServiceId)) {
        throw new ValidationError('Service inconnu', [{ path: 'defaultServiceId', message: 'Service inconnu' }]);
      }
    },
    beforeRemove: (ctx, category) => {
      if (store.reports.forTenant(ctx.tenantId).some((r) => r.categoryId === category.id)) {
        throw new ConflictError('Catégorie utilisée par des signalements : suppression impossible');
      }
    },
  });

  const proceduresBase = createSimpleRepository(rt, {
    collection: store.procedures,
    schema: ProcedureSchema,
    inputSchema: ProcedureInputSchema,
    entity: 'procedure',
    read: 'public',
    write: { module: 'procedures', level: 'edit' },
    sort: byNumber((p: Procedure) => p.order),
  });

  const procedures: ProceduresRepository = {
    ...proceduresBase,
    async reorder(ctx, orderedIds) {
      const session = requirePermission(store, ctx, 'procedures', 'edit');
      const current = store.procedures.forTenant(ctx.tenantId);
      if (orderedIds.length !== current.length || current.some((p) => !orderedIds.includes(p.id))) {
        throw new ValidationError('La liste doit contenir toutes les démarches de la commune');
      }
      const now = nowIso(rt);
      const before = current.map((p) => ({ id: p.id, order: p.order }));
      orderedIds.forEach((id, order) => {
        const p = store.procedures.get(ctx.tenantId, id);
        if (p) store.procedures.set({ ...p, order, updatedAt: now });
      });
      recordAudit(rt, {
        tenantId: ctx.tenantId,
        actorId: session.userId,
        action: 'reorder',
        entity: 'procedure',
        entityId: orderedIds[0] ?? ctx.tenantId,
        before: { order: before },
        after: { order: orderedIds.map((id, order) => ({ id, order })) },
      });
      return store.procedures.forTenant(ctx.tenantId).sort(byNumber((p: Procedure) => p.order));
    },
  };

  const environment: EnvironmentRepository = {
    zones: createSimpleRepository(rt, {
      collection: store.wasteZones,
      schema: WasteZoneSchema,
      inputSchema: WasteZoneInputSchema,
      entity: 'waste_zone',
      read: 'public',
      write: { module: 'environment', level: 'edit' },
      sort: byString((z: WasteZone) => z.name),
      beforeRemove: (ctx, zone) => {
        if (store.wasteSchedules.forTenant(ctx.tenantId).some((s) => s.zoneId === zone.id)) {
          throw new ConflictError('Supprimez d’abord les calendriers de cette zone');
        }
      },
    }),
    schedules: createSimpleRepository(rt, {
      collection: store.wasteSchedules,
      schema: WasteScheduleSchema,
      inputSchema: WasteScheduleInputSchema,
      entity: 'waste_schedule',
      read: 'public',
      write: { module: 'environment', level: 'edit' },
      sort: byString((s: WasteSchedule) => `${s.zoneId}${s.wasteType}`),
      beforeWrite: (ctx, data) => {
        if (!store.wasteZones.get(ctx.tenantId, data.zoneId)) {
          throw new ValidationError('Zone inconnue', [{ path: 'zoneId', message: 'Zone inconnue' }]);
        }
      },
    }),
    sortingGuide: createSimpleRepository(rt, {
      collection: store.sortingGuide,
      schema: SortingGuideItemSchema,
      inputSchema: SortingGuideItemInputSchema,
      entity: 'sorting_guide_item',
      read: 'public',
      write: { module: 'environment', level: 'edit' },
      sort: byString((i: SortingGuideItem) => i.name),
    }),
    async nextCollections(ctx, zoneId, from, count) {
      requireTenant(store, ctx.tenantId);
      if (!store.wasteZones.get(ctx.tenantId, zoneId)) throw new NotFoundError('Zone introuvable');
      const schedules = store.wasteSchedules.forTenant(ctx.tenantId).filter((s) => s.zoneId === zoneId);
      return computeNextCollections(schedules, from, count);
    },
  };

  return { districts, topics, services, reportCategories, procedures, environment };
}
