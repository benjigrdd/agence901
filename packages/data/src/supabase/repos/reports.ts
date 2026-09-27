import type { Report } from '@app/shared';
import {
  checkReportTransition,
  DEFAULT_SLA_DAYS,
  isReportOverdue,
  pseudonymizeReporter,
  REPORT_PRIORITIES,
  REPORT_PRIORITY_RANK,
  reportAgeDays,
  ReportStatusChangeInputSchema,
  TRANSITION_FAILURE_MESSAGES,
} from '@app/shared';
import { z } from 'zod';

import type { DataContext } from '../../context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { applyList, byNumber, byString, parseInput } from '../../list';
import type { ReportDetail, ReportListItem, ReportsRepository, ReportStats } from '../../ports';
import type { ClientResolver, Db } from '../core';
import { check, requirePermission, unwrap, validated } from '../core';
import * as m from '../mappers';

export const REPORT_PHOTOS_BUCKET = 'report-photos';

const ReportStatsSchema = z.object({
  new: z.number(),
  inProgress: z.number(),
  open: z.number(),
  overdue: z.number(),
  averageResolutionDays: z.number().nullable(),
  weekly: z.array(z.object({ weekStart: z.string(), created: z.number(), resolved: z.number() })),
});

export function createReportsRepository(resolve: ClientResolver): ReportsRepository {
  /** Photos : URLs signees (bucket prive), jamais un chemin construit par l'interface. */
  const signedPhotos = async (db: Db, paths: string[]): Promise<Map<string, string>> => {
    if (paths.length === 0) return new Map();
    const { data } = await db.storage.from(REPORT_PHOTOS_BUCKET).createSignedUrls(paths, 3600);
    return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
  };

  const slaByCategory = async (db: Db, ctx: DataContext): Promise<Map<string, number>> =>
    new Map(unwrap(await db.from('report_categories').select('id, sla_days').eq('tenant_id', ctx.tenantId)).map((c) => [c.id, c.sla_days]));

  const loadReports = async (ctx: DataContext, ids?: string[]): Promise<{ reports: Report[]; items: ReportListItem[] }> => {
    const db = (await resolve(ctx));
    const query = db.from('v_reports').select('*').eq('tenant_id', ctx.tenantId);
    const rows = unwrap(ids ? await query.in('id', ids) : await query);
    const [urls, sla] = await Promise.all([signedPhotos(db, rows.flatMap((r) => r.photo_paths ?? [])), slaByCategory(db, ctx)]);
    const now = new Date();
    const reports = rows.map((r) => m.toReport(r, (r.photo_paths ?? []).flatMap((p) => urls.get(p) ?? [])));
    const items = reports.map((report) => ({
      report,
      ageDays: reportAgeDays(report.createdAt, now),
      overdue: isReportOverdue(report, sla.get(report.categoryId) ?? DEFAULT_SLA_DAYS, now),
    }));
    return { reports, items };
  };

  const detail = async (ctx: DataContext, id: string): Promise<ReportDetail> => {
    const { items } = await loadReports(ctx, [id]);
    const item = items[0];
    if (!item) throw new NotFoundError('Signalement introuvable');
    const events = unwrap(await (await resolve(ctx)).from('report_events').select('*').eq('tenant_id', ctx.tenantId).eq('report_id', id).order('created_at')).map(m.toReportEvent);
    return { ...item, events, reporterAlias: item.report.reporterId ? pseudonymizeReporter(item.report.reporterId) : null };
  };

  const repo: ReportsRepository = {
    async list(ctx, params) {
      requirePermission(ctx, 'reports', 'read');
      const f = params?.filters;
      let inDistrict: Set<string> | null = null;
      if (f?.districtId) {
        const db = (await resolve(ctx));
        const district = (await db.from('districts').select('id').eq('tenant_id', ctx.tenantId).eq('id', f.districtId).maybeSingle()).data;
        if (!district) throw new ValidationError('Quartier inconnu');
        inDistrict = new Set(unwrap(await db.rpc('report_ids_in_district', { p_district_id: f.districtId })));
      }
      const { items } = await loadReports(ctx);
      const rows = items.filter(
        ({ report: r, overdue }) =>
          (!f?.status?.length || f.status.includes(r.status)) &&
          (!f?.categoryId?.length || f.categoryId.includes(r.categoryId)) &&
          (!f?.serviceId?.length || (r.serviceId !== null && f.serviceId.includes(r.serviceId))) &&
          (!f?.priority?.length || f.priority.includes(r.priority)) &&
          (!f?.from || r.createdAt >= f.from) &&
          (!f?.to || r.createdAt <= f.to) &&
          (!inDistrict || inDistrict.has(r.id)) &&
          (!f?.overdueOnly || overdue),
      );
      return applyList(rows, params, {
        searchText: (i) => `${i.report.reference} ${i.report.address} ${i.report.description}`,
        sorters: {
          priority: (a, b) => REPORT_PRIORITY_RANK[a.report.priority] - REPORT_PRIORITY_RANK[b.report.priority] || b.ageDays - a.ageDays,
          age: byNumber((i: ReportListItem) => i.ageDays),
          createdAt: byString((i: ReportListItem) => i.report.createdAt),
          reference: byString((i: ReportListItem) => i.report.reference),
          status: byString((i: ReportListItem) => i.report.status),
        },
        defaultSort: { field: 'priority', direction: 'desc' },
      });
    },

    async get(ctx, id) {
      requirePermission(ctx, 'reports', 'read');
      return detail(ctx, id);
    },

    async updateStatus(ctx, id, input) {
      const session = requirePermission(ctx, 'reports', 'read');
      const existing = await detail(ctx, id);
      const data = parseInput(ReportStatusChangeInputSchema, input);
      const result = checkReportTransition(session, ctx.tenantId, existing.report.status, data.to, { message: data.message, duplicateOfId: data.duplicateOfId });
      if (!result.ok) {
        if (result.reason === 'forbidden') throw new ForbiddenError();
        const path = result.reason === 'duplicate_required' ? 'duplicateOfId' : result.reason === 'message_required' ? 'message' : 'to';
        throw new ValidationError(TRANSITION_FAILURE_MESSAGES[result.reason], [{ path, message: TRANSITION_FAILURE_MESSAGES[result.reason] }]);
      }
      check(
        await (await resolve(ctx)).rpc('update_report_status', {
          p_id: id,
          p_to: data.to,
          p_message: data.message ?? undefined,
          p_public: data.to === 'rejected' || data.visibility === 'public',
          p_duplicate_of: data.duplicateOfId ?? undefined,
        }),
      );
      return detail(ctx, id);
    },

    async assign(ctx, id, serviceId) {
      requirePermission(ctx, 'reports', 'edit');
      await detail(ctx, id);
      check(await (await resolve(ctx)).rpc('assign_report', { p_id: id, p_service_id: serviceId ?? undefined }));
      return detail(ctx, id);
    },

    async setPriority(ctx, id, priority) {
      requirePermission(ctx, 'reports', 'edit');
      await detail(ctx, id);
      if (!REPORT_PRIORITIES.includes(priority)) throw new ValidationError('Priorité invalide');
      check(await (await resolve(ctx)).from('reports').update({ priority }).eq('tenant_id', ctx.tenantId).eq('id', id));
      return detail(ctx, id);
    },

    async markDuplicate(ctx, id, originalId) {
      return repo.updateStatus(ctx, id, { to: 'duplicate', message: 'Déjà signalé : suivi sur le signalement d’origine.', visibility: 'public', duplicateOfId: originalId });
    },

    async addNote(ctx, id, message) {
      requirePermission(ctx, 'reports', 'edit');
      await detail(ctx, id);
      check(await (await resolve(ctx)).rpc('add_report_note', { p_id: id, p_message: message }));
      return detail(ctx, id);
    },

    async nearby(ctx, reportId, radiusM) {
      requirePermission(ctx, 'reports', 'read');
      await detail(ctx, reportId);
      const rows = unwrap(await (await resolve(ctx)).rpc('reports_nearby', { p_report_id: reportId, p_radius_m: radiusM }));
      if (rows.length === 0) return [];
      const { reports } = await loadReports(ctx, rows.map((r) => r.report_id));
      const byId = new Map(reports.map((r) => [r.id, r]));
      return rows.flatMap((r) => {
        const report = byId.get(r.report_id);
        return report ? [{ report, distanceM: r.distance_m }] : [];
      });
    },

    async stats(ctx): Promise<ReportStats> {
      requirePermission(ctx, 'reports', 'read');
      return validated(ReportStatsSchema, unwrap(await (await resolve(ctx)).rpc('report_stats', { p_tenant_id: ctx.tenantId })), 'indicateurs');
    },
  };
  return repo;
}

