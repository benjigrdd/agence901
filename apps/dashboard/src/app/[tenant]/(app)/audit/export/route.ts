import { AUDIT_ACTION_LABELS } from '@app/shared';

import { authorNames } from '@/server/content';
import { requireTenantAdmin } from '@/server/guards';
import { listAll } from '@/server/list-all';
import { getRepos } from '@/server/repos';

import { parseAuditFilters } from '../filters';

const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Export CSV : noms des champs modifies uniquement, jamais leurs valeurs (donnees personnelles possibles). */
export async function GET(request: Request, { params }: RouteContext<'/[tenant]/audit/export'>) {
  const { tenant: slug } = await params;
  const { ctx } = await requireTenantAdmin(slug);
  const { filters } = parseAuditFilters(Object.fromEntries(new URL(request.url).searchParams.entries()));
  const [items, names] = await Promise.all([listAll((page, pageSize) => getRepos().audit.list(ctx, { filters, page, pageSize })), authorNames(ctx)]);
  const lines = items.map((a) =>
    [a.at, names.get(a.actorId) ?? 'Membre du personnel', AUDIT_ACTION_LABELS[a.action], a.entity, a.entityId, Object.keys(a.diff).join(', ')].map(cell).join(';'),
  );
  const csv = `\uFEFF${['Date;Acteur;Action;Élément;Identifiant;Champs modifiés', ...lines].join('\r\n')}\r\n`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-${slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
