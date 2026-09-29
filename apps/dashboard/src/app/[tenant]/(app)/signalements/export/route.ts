import type { ReportListItem } from '@app/data';
import { buildReportsCsv } from '@app/shared';

import { requirePermission } from '@/server/guards';
import { listAll } from '@/server/list-all';
import { getRepos } from '@/server/repos';

import { parseReportFilters } from '../filters';

/** Export CSV de la liste filtree : aucune donnee personnelle (voir `buildReportsCsv`). */
export async function GET(request: Request, { params }: RouteContext<'/[tenant]/signalements/export'>) {
  const { tenant: slug } = await params;
  const { ctx } = await requirePermission(slug, 'reports', 'read');
  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { filters } = parseReportFilters(query);
  const repos = getRepos();
  const [categories, services] = await Promise.all([repos.reportCategories.list(ctx), repos.services.list(ctx)]);
  const items: ReportListItem[] = await listAll((page, pageSize) => repos.reports.list(ctx, { filters, page, pageSize }));
  const csv = buildReportsCsv(items, {
    categories: new Map(categories.map((c) => [c.id, c.label])),
    services: new Map(services.map((s) => [s.id, s.name])),
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="signalements-${slug}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
