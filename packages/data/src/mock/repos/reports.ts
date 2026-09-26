import type { Report, ReportEvent } from '@app/shared';
import {
  checkReportTransition,
  DEFAULT_SLA_DAYS,
  distanceInMeters,
  isPointInMultiPolygon,
  isReportOpen,
  isReportOverdue,
  pseudonymizeReporter,
  REPORT_PRIORITY_RANK,
  reportAgeDays,
  ReportEventSchema,
  ReportSchema,
  ReportStatusChangeInputSchema,
  TRANSITION_FAILURE_MESSAGES,
} from '@app/shared';

import type { DataContext } from '../../context';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { ReportDetail, ReportListItem, ReportsRepository } from '../../ports';
import { applyList, byNumber, byString, parseInput, requirePermission } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';

const DAY = 86_400_000;
export const DUPLICATE_READ_ONLY_MESSAGE = 'Signalement en lecture seule : il s’agit d’un doublon';

type NewReportEvent = Pick<ReportEvent, 'kind' | 'fromStatus' | 'toStatus' | 'message' | 'visibility' | 'authorId'>;

export function createReportsRepository(rt: MockRuntime): ReportsRepository {
  const { store } = rt;

  const slaFor = (report: Report) =>
    store.reportCategories.get(report.tenantId, report.categoryId)?.slaDays ?? DEFAULT_SLA_DAYS;

  const listItem = (report: Report): ReportListItem => ({
    report,
    ageDays: reportAgeDays(report.createdAt, rt.now()),
    overdue: isReportOverdue(report, slaFor(report), rt.now()),
  });

  const detail = (report: Report): ReportDetail => ({
    ...listItem(report),
    events: store.reportEvents
      .forTenant(report.tenantId)
      .filter((e) => e.reportId === report.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    reporterAlias: report.reporterId ? pseudonymizeReporter(report.reporterId) : null,
  });

  const getReport = (ctx: DataContext, id: string): Report => {
    const report = store.reports.get(ctx.tenantId, id);
    if (!report) throw new NotFoundError('Signalement introuvable');
    return report;
  };

  const assertEditable = (report: Report) => {
    if (report.status === 'duplicate') throw new ConflictError(DUPLICATE_READ_ONLY_MESSAGE);
  };

  const addEvent = (report: Report, fields: NewReportEvent) => {
    const now = nowIso(rt);
    store.reportEvents.set(
      parseInput(ReportEventSchema, {
        ...fields,
        id: rt.newId(),
        tenantId: report.tenantId,
        reportId: report.id,
        createdAt: now,
        updatedAt: now,
      }),
    );
  };

  const save = (existing: Report, patch: Partial<Report>): Report => {
    const next = parseInput(ReportSchema, { ...existing, ...patch, updatedAt: nowIso(rt) });
    store.reports.set(next);
    return next;
  };

  const repo: ReportsRepository = {
    async list(ctx, params) {
      requirePermission(store, ctx, 'reports', 'read');
      const f = params?.filters;
      const district = f?.districtId ? store.districts.get(ctx.tenantId, f.districtId) : undefined;
      if (f?.districtId && !district) throw new ValidationError('Quartier inconnu');
      const rows = store.reports
        .forTenant(ctx.tenantId)
        .filter((r) => !f?.status?.length || f.status.includes(r.status))
        .filter((r) => !f?.categoryId?.length || f.categoryId.includes(r.categoryId))
        .filter((r) => !f?.serviceId?.length || (r.serviceId !== null && f.serviceId.includes(r.serviceId)))
        .filter((r) => !f?.priority?.length || f.priority.includes(r.priority))
        .filter((r) => !f?.from || r.createdAt >= f.from)
        .filter((r) => !f?.to || r.createdAt <= f.to)
        .filter((r) => !district || isPointInMultiPolygon(r.point, district.geom))
        .map(listItem)
        .filter((item) => !f?.overdueOnly || item.overdue);
      return applyList(rows, params, {
        searchText: (i) => `${i.report.reference} ${i.report.address} ${i.report.description}`,
        sorters: {
          priority: (a, b) =>
            REPORT_PRIORITY_RANK[a.report.priority] - REPORT_PRIORITY_RANK[b.report.priority] || b.ageDays - a.ageDays,
          age: byNumber((i: ReportListItem) => i.ageDays),
          createdAt: byString((i: ReportListItem) => i.report.createdAt),
          reference: byString((i: ReportListItem) => i.report.reference),
          status: byString((i: ReportListItem) => i.report.status),
        },
        defaultSort: { field: 'priority', direction: 'desc' },
      });
    },

    async get(ctx, id) {
      requirePermission(store, ctx, 'reports', 'read');
      return detail(getReport(ctx, id));
    },

    async updateStatus(ctx, id, input) {
      const session = requirePermission(store, ctx, 'reports', 'read');
      const existing = getReport(ctx, id);
      const data = parseInput(ReportStatusChangeInputSchema, input);
      const check = checkReportTransition(session, ctx.tenantId, existing.status, data.to, {
        message: data.message,
        duplicateOfId: data.duplicateOfId,
      });
      if (!check.ok) {
        if (check.reason === 'forbidden') throw new ForbiddenError();
        const path = check.reason === 'duplicate_required' ? 'duplicateOfId' : check.reason === 'message_required' ? 'message' : 'to';
        throw new ValidationError(TRANSITION_FAILURE_MESSAGES[check.reason], [{ path, message: TRANSITION_FAILURE_MESSAGES[check.reason] }]);
      }
      if (data.to === 'duplicate') {
        const original = data.duplicateOfId ? store.reports.get(ctx.tenantId, data.duplicateOfId) : undefined;
        if (!original || original.id === existing.id || original.status === 'duplicate') {
          throw new ValidationError("Signalement d'origine invalide", [{ path: 'duplicateOfId', message: "Signalement d'origine invalide" }]);
        }
      }
      const now = nowIso(rt);
      const next = save(existing, {
        status: data.to,
        duplicateOfId: data.to === 'duplicate' ? data.duplicateOfId : existing.duplicateOfId,
        resolvedAt: data.to === 'resolved' ? now : data.to === 'in_progress' ? null : existing.resolvedAt,
        serviceId:
          existing.status === 'new' && !existing.serviceId
            ? (store.reportCategories.get(ctx.tenantId, existing.categoryId)?.defaultServiceId ?? null)
            : existing.serviceId,
      });
      addEvent(next, {
        kind: 'status_change',
        fromStatus: existing.status,
        toStatus: data.to,
        message: data.message?.trim() || null,
        // Un rejet est toujours motive aupres de l'habitant.
        visibility: data.to === 'rejected' ? 'public' : data.visibility,
        authorId: session.userId,
      });
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'transition', entity: 'report', entityId: id, before: existing, after: next });
      return detail(next);
    },

    async assign(ctx, id, serviceId) {
      const session = requirePermission(store, ctx, 'reports', 'edit');
      const existing = getReport(ctx, id);
      assertEditable(existing);
      const service = serviceId ? store.services.get(ctx.tenantId, serviceId) : null;
      if (serviceId && !service) throw new ValidationError('Service inconnu', [{ path: 'serviceId', message: 'Service inconnu' }]);
      const next = save(existing, { serviceId });
      addEvent(next, {
        kind: 'assignment',
        fromStatus: null,
        toStatus: null,
        message: service ? `Assigné au service ${service.name}.` : 'Assignation retirée.',
        visibility: 'internal',
        authorId: session.userId,
      });
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'report', entityId: id, before: existing, after: next });
      return detail(next);
    },

    async setPriority(ctx, id, priority) {
      const session = requirePermission(store, ctx, 'reports', 'edit');
      const existing = getReport(ctx, id);
      assertEditable(existing);
      const next = save(existing, { priority });
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'report', entityId: id, before: existing, after: next });
      return detail(next);
    },

    async markDuplicate(ctx, id, originalId) {
      return repo.updateStatus(ctx, id, {
        to: 'duplicate',
        message: 'Déjà signalé : suivi sur le signalement d’origine.',
        visibility: 'public',
        duplicateOfId: originalId,
      });
    },

    async addNote(ctx, id, message) {
      const session = requirePermission(store, ctx, 'reports', 'edit');
      const existing = getReport(ctx, id);
      assertEditable(existing);
      const text = message.trim();
      if (!text) throw new ValidationError('La note est vide', [{ path: 'message', message: 'La note est vide' }]);
      if (text.length > 1000) throw new ValidationError('1000 caractères maximum', [{ path: 'message', message: '1000 caractères maximum' }]);
      // Une note est toujours interne : jamais visible par l'habitant.
      addEvent(existing, { kind: 'comment', fromStatus: null, toStatus: null, message: text, visibility: 'internal', authorId: session.userId });
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'report', entityId: id, before: { note: null }, after: { note: text } });
      return detail(existing);
    },

    async nearby(ctx, reportId, radiusM) {
      requirePermission(store, ctx, 'reports', 'read');
      const report = getReport(ctx, reportId);
      const since = rt.now().getTime() - 30 * DAY;
      return store.reports
        .forTenant(ctx.tenantId)
        .filter(
          (r) =>
            r.id !== report.id &&
            r.categoryId === report.categoryId &&
            isReportOpen(r.status) &&
            Date.parse(r.createdAt) >= since,
        )
        .map((r) => ({ report: r, distanceM: Math.round(distanceInMeters(r.point, report.point)) }))
        .filter((n) => n.distanceM <= radiusM)
        .sort((a, b) => a.distanceM - b.distanceM);
    },

    async stats(ctx) {
      requirePermission(store, ctx, 'reports', 'read');
      const now = rt.now().getTime();
      const items = store.reports.forTenant(ctx.tenantId).map(listItem);
      const resolved30 = items
        .map((i) => i.report)
        .filter((r) => r.resolvedAt && Date.parse(r.resolvedAt) >= now - 30 * DAY);
      const averageResolutionDays =
        resolved30.length === 0
          ? null
          : Math.round(
              (resolved30.reduce((sum, r) => sum + (Date.parse(r.resolvedAt ?? r.createdAt) - Date.parse(r.createdAt)), 0) /
                resolved30.length /
                DAY) *
                10,
            ) / 10;
      const weekly = Array.from({ length: 12 }, (_, w) => {
        const start = now - (12 - w) * 7 * DAY;
        const end = start + 7 * DAY;
        const inWeek = (iso: string | null) => iso !== null && Date.parse(iso) >= start && Date.parse(iso) < end;
        return {
          weekStart: new Date(start).toISOString().slice(0, 10),
          created: items.filter((i) => inWeek(i.report.createdAt)).length,
          resolved: items.filter((i) => inWeek(i.report.resolvedAt)).length,
        };
      });
      return {
        new: items.filter((i) => i.report.status === 'new').length,
        inProgress: items.filter((i) => i.report.status === 'in_progress').length,
        open: items.filter((i) => isReportOpen(i.report.status)).length,
        overdue: items.filter((i) => i.overdue).length,
        averageResolutionDays,
        weekly,
      };
    },
  };

  return repo;
}
