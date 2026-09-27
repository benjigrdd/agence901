import type { Procedure, ReportCategory, Service, SortingGuideItem, Topic, WasteSchedule, WasteZone } from '@app/shared';
import {
  computeNextCollections,
  DistrictInputSchema,
  PlaceCategoryInputSchema,
  ProcedureInputSchema,
  ReportCategoryInputSchema,
  ServiceInputSchema,
  SortingGuideItemInputSchema,
  TopicInputSchema,
  WasteScheduleInputSchema,
  WasteZoneInputSchema,
} from '@app/shared';

import { ConflictError } from '../../errors';
import type {
  DistrictsRepository,
  EnvironmentRepository,
  PlaceCategoriesRepository,
  ProceduresRepository,
  ReportCategoriesRepository,
  ServicesRepository,
  TopicsRepository,
} from '../../ports';
import type { ClientResolver } from '../core';
import { check, multiPolygonToEwkt, requirePermission, requireStaff, unwrap } from '../core';
import * as m from '../mappers';
import { createSimpleRepository } from './simple';

export function createTerritoryRepositories(resolve: ClientResolver): {
  districts: DistrictsRepository;
  topics: TopicsRepository;
  services: ServicesRepository;
  reportCategories: ReportCategoriesRepository;
  placeCategories: PlaceCategoriesRepository;
  procedures: ProceduresRepository;
  environment: EnvironmentRepository;
} {
  const districtsBase = createSimpleRepository(resolve, {
    table: 'districts',
    source: 'v_districts',
    inputSchema: DistrictInputSchema,
    toDomain: m.toDistrict,
    toRow: (d) => ({ name: d.name, color: d.color, geom: multiPolygonToEwkt(d.geom) }),
    read: 'public',
    write: { module: 'districts', level: 'edit' },
    orderBy: 'name',
  });

  const districts: DistrictsRepository = {
    ...districtsBase,
    async stats(ctx) {
      requireStaff(ctx);
      const rows = unwrap(await (await resolve(ctx)).rpc('district_stats', { p_tenant_id: ctx.tenantId }));
      return rows.map((r) => ({ districtId: r.district_id, reports: r.reports, subscribers: r.subscribers }));
    },
  };

  const topics = createSimpleRepository<Topic, typeof TopicInputSchema._output, Parameters<typeof m.toTopic>[0]>(resolve, {
    table: 'topics',
    inputSchema: TopicInputSchema,
    toDomain: m.toTopic,
    toRow: (t) => ({ label: t.label, sort_order: t.order }),
    read: 'public',
    write: { module: 'settings', level: 'edit' },
    orderBy: 'sort_order',
  });

  const services = createSimpleRepository<Service, typeof ServiceInputSchema._output, Parameters<typeof m.toService>[0]>(resolve, {
    table: 'services',
    inputSchema: ServiceInputSchema,
    toDomain: m.toService,
    toRow: (s) => ({ name: s.name, email: s.email }),
    read: 'staff',
    write: { module: 'settings', level: 'edit' },
    orderBy: 'name',
  });

  const reportCategories = createSimpleRepository<ReportCategory, typeof ReportCategoryInputSchema._output, Parameters<typeof m.toReportCategory>[0]>(resolve, {
    table: 'report_categories',
    inputSchema: ReportCategoryInputSchema,
    toDomain: m.toReportCategory,
    toRow: (c) => ({ label: c.label, icon: c.icon, default_service_id: c.defaultServiceId, sla_days: c.slaDays }),
    read: 'public',
    write: { module: 'settings', level: 'edit' },
    orderBy: 'label',
  });

  const placeCategories = createSimpleRepository(resolve, {
    table: 'place_categories',
    inputSchema: PlaceCategoryInputSchema,
    toDomain: m.toPlaceCategory,
    toRow: (c) => ({ key: c.key, label: c.label, icon: c.icon, color: c.color, hidden: c.hidden }),
    read: 'public',
    write: { module: 'map', level: 'edit' },
    orderBy: 'label',
    beforeRemove: (c) => {
      if (c.isDefault) throw new ConflictError('Une catégorie par défaut ne peut pas être supprimée : masquez-la');
    },
  });

  const proceduresBase = createSimpleRepository<Procedure, typeof ProcedureInputSchema._output, Parameters<typeof m.toProcedure>[0]>(resolve, {
    table: 'procedures',
    inputSchema: ProcedureInputSchema,
    toDomain: m.toProcedure,
    toRow: (p) => ({ category: p.category, title: p.title, description: p.description, kind: p.kind, value: p.value, sort_order: p.order }),
    read: 'public',
    write: { module: 'procedures', level: 'edit' },
    orderBy: 'sort_order',
  });

  const procedures: ProceduresRepository = {
    ...proceduresBase,
    async reorder(ctx, orderedIds) {
      requirePermission(ctx, 'procedures', 'edit');
      check(await (await resolve(ctx)).rpc('reorder_procedures', { p_tenant_id: ctx.tenantId, p_ids: orderedIds }));
      return proceduresBase.list(ctx);
    },
  };

  const zones = createSimpleRepository<WasteZone, typeof WasteZoneInputSchema._output, Parameters<typeof m.toWasteZone>[0]>(resolve, {
    table: 'waste_zones',
    source: 'v_waste_zones',
    inputSchema: WasteZoneInputSchema,
    toDomain: m.toWasteZone,
    toRow: (z) => ({ name: z.name, geom: multiPolygonToEwkt(z.geom) }),
    read: 'public',
    write: { module: 'environment', level: 'edit' },
    orderBy: 'name',
  });

  const schedules = createSimpleRepository<WasteSchedule, typeof WasteScheduleInputSchema._output, Parameters<typeof m.toWasteSchedule>[0]>(resolve, {
    table: 'waste_schedules',
    inputSchema: WasteScheduleInputSchema,
    toDomain: m.toWasteSchedule,
    toRow: (s) => ({ zone_id: s.zoneId, waste_type: s.wasteType, rrule: s.rrule, exceptions: s.exceptions, note: s.note }),
    read: 'public',
    write: { module: 'environment', level: 'edit' },
    orderBy: 'created_at',
  });

  const sortingGuide = createSimpleRepository<SortingGuideItem, typeof SortingGuideItemInputSchema._output, Parameters<typeof m.toSortingItem>[0]>(resolve, {
    table: 'sorting_guide_items',
    inputSchema: SortingGuideItemInputSchema,
    toDomain: m.toSortingItem,
    toRow: (s) => ({ name: s.name, bin: s.bin, advice: s.advice }),
    read: 'public',
    write: { module: 'environment', level: 'edit' },
    orderBy: 'name',
  });

  const environment: EnvironmentRepository = {
    zones,
    schedules,
    sortingGuide,
    async nextCollections(ctx, zoneId, from, count) {
      const all = await schedules.list(ctx);
      return computeNextCollections(all.filter((s) => s.zoneId === zoneId), from, count);
    },
  };

  return { districts, topics, services, reportCategories, placeCategories, procedures, environment };
}

