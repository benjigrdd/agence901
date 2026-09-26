import { formatDateFr, STORE_PUBLICATION_STATUS_LABELS, TENANT_PLAN_LABELS, TENANT_PLANS, TENANT_STATUS_LABELS, TENANT_STATUSES, TENANT_TYPE_LABELS } from '@app/shared';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { requirePlatformAdmin } from '@/server/guards';
import { getRepos } from '@/server/repos';

import type { TenantRow } from './tenants-table';
import { TenantsTable } from './tenants-table';

export const metadata: Metadata = { title: 'Communes' };

const SELECT = 'border-input bg-background h-9 rounded-md border px-3 text-sm';

export default async function TenantsPage({ searchParams }: PageProps<'/admin/communes'>) {
  const query = await searchParams;
  const status = TENANT_STATUSES.find((s) => s === query.statut);
  const plan = TENANT_PLANS.find((p) => p === query.offre);
  const session = await requirePlatformAdmin();
  const repos = getRepos();
  const { items } = await repos.tenants.list({ session });
  const rows: TenantRow[] = await Promise.all(
    items
      .filter((t) => (!status || t.status === status) && (!plan || t.plan === plan))
      .map(async (t) => {
        const ctx = { session, tenantId: t.id };
        const [modules, store, audit] = await Promise.all([
          repos.modules.list(ctx),
          repos.storeInfo.get(ctx).catch(() => null),
          repos.audit.list(ctx, { pageSize: 20 }),
        ]);
        const last = audit.items.find((a) => a.action !== 'platform_access');
        return {
          id: t.id,
          slug: t.slug,
          name: t.name,
          type: TENANT_TYPE_LABELS[t.type],
          population: t.population,
          status: TENANT_STATUS_LABELS[t.status],
          plan: TENANT_PLAN_LABELS[t.plan],
          modules: modules.filter((m) => m.enabled).length,
          publication: store ? `iOS : ${STORE_PUBLICATION_STATUS_LABELS[store.iosStatus]} · Android : ${STORE_PUBLICATION_STATUS_LABELS[store.androidStatus]}` : '—',
          lastActivity: last?.at ?? '',
          lastActivityLabel: last ? formatDateFr(new Date(last.at), 'd MMM yyyy') : '—',
        };
      }),
  );
  return (
    <>
      <PageHeader
        title="Communes"
        description="Communes clientes de la plateforme."
        actions={
          <Button asChild>
            <Link href="/admin/communes/nouvelle">
              <Plus aria-hidden="true" />
              Nouvelle commune
            </Link>
          </Button>
        }
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filtrer les communes">
        <div className="space-y-1">
          <Label htmlFor="f-statut">Statut</Label>
          <select id="f-statut" name="statut" defaultValue={status ?? ''} className={SELECT}>
            <option value="">Tous</option>
            {TENANT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TENANT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-offre">Offre</Label>
          <select id="f-offre" name="offre" defaultValue={plan ?? ''} className={SELECT}>
            <option value="">Toutes</option>
            {TENANT_PLANS.map((p) => (
              <option key={p} value={p}>
                {TENANT_PLAN_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>
      <TenantsTable rows={rows} />
    </>
  );
}
