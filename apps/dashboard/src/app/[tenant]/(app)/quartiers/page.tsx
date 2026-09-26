import { can } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { DistrictsManager } from './districts-manager';

export const metadata: Metadata = { title: 'Quartiers' };

export default async function DistrictsPage({ params }: PageProps<'/[tenant]/quartiers'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'districts', 'read');
  const repos = getRepos();
  const [districts, stats] = await Promise.all([repos.districts.list(ctx), repos.districts.stats(ctx)]);
  const byId = new Map(stats.map((s) => [s.districtId, s]));
  return (
    <>
      <PageHeader title="Quartiers" description="Dessinez les quartiers : ils servent au ciblage des actualités et des notifications." />
      <DistrictsManager
        slug={slug}
        center={tenant.center}
        canEdit={can(session, tenant.id, 'districts', 'edit')}
        districts={districts.map((d) => ({
          id: d.id,
          name: d.name,
          color: d.color,
          geom: d.geom,
          reports: byId.get(d.id)?.reports ?? 0,
          subscribers: byId.get(d.id)?.subscribers ?? 0,
        }))}
      />
    </>
  );
}
