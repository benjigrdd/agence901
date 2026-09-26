import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS, AUDIT_RETENTION_MONTHS, formatDateFr } from '@app/shared';
import { Download } from 'lucide-react';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authorNames } from '@/server/content';
import { requireTenantAdmin } from '@/server/guards';
import { getRepos } from '@/server/repos';

import type { AuditRow } from './audit-table';
import { AuditTable } from './audit-table';
import { parseAuditFilters } from './filters';

export const metadata: Metadata = { title: "Journal d'audit" };

const SELECT = 'border-input bg-background h-9 rounded-md border px-3 text-sm';

export default async function AuditPage({ params, searchParams }: PageProps<'/[tenant]/audit'>) {
  const { tenant: slug } = await params;
  const { ctx } = await requireTenantAdmin(slug);
  const { values, filters, qs } = parseAuditFilters(await searchParams);
  const repos = getRepos();
  const [list, all, names] = await Promise.all([repos.audit.list(ctx, { filters, pageSize: 500 }), repos.audit.list(ctx, { pageSize: 1000 }), authorNames(ctx)]);
  const entities = [...new Set(all.items.map((a) => a.entity))].sort();
  const actors = [...new Set(all.items.map((a) => a.actorId))];
  const rows: AuditRow[] = list.items.map((a) => ({
    id: a.id,
    at: a.at,
    atLabel: formatDateFr(new Date(a.at), "d MMM yyyy 'à' H'h'mm"),
    actor: names.get(a.actorId) ?? 'Membre du personnel',
    action: AUDIT_ACTION_LABELS[a.action],
    entity: a.entity,
    fields: Object.keys(a.diff),
    diff: Object.entries(a.diff).map(([field, change]) => ({ field, before: JSON.stringify(change.before, null, 2), after: JSON.stringify(change.after, null, 2) })),
  }));

  return (
    <>
      <PageHeader
        title="Journal d’audit"
        description={`Toutes les modifications faites par le personnel. Conservation : ${AUDIT_RETENTION_MONTHS} mois.`}
        actions={
          <Button asChild variant="outline">
            <a href={`/${slug}/audit/export${qs}`} download>
              <Download aria-hidden="true" />
              Exporter en CSV
            </a>
          </Button>
        }
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filtrer le journal">
        <div className="space-y-1">
          <Label htmlFor="a-acteur">Acteur</Label>
          <select id="a-acteur" name="acteur" defaultValue={values.acteur} className={SELECT}>
            <option value="">Tous</option>
            {actors.map((id) => (
              <option key={id} value={id}>
                {names.get(id) ?? 'Membre du personnel'}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="a-entite">Type d’élément</Label>
          <select id="a-entite" name="entite" defaultValue={values.entite} className={SELECT}>
            <option value="">Tous</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="a-action">Action</Label>
          <select id="a-action" name="action" defaultValue={values.action} className={SELECT}>
            <option value="">Toutes</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="a-du">Du</Label>
          <input id="a-du" type="date" name="du" defaultValue={values.du} className={SELECT} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="a-au">Au</Label>
          <input id="a-au" type="date" name="au" defaultValue={values.au} className={SELECT} />
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>
      <AuditTable rows={rows} />
    </>
  );
}
