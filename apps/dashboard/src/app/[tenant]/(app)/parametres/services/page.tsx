import { can } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { ReportCategoriesManager, ServicesManager } from './services-manager';

export const metadata: Metadata = { title: 'Services' };

export default async function ServicesPage({ params }: PageProps<'/[tenant]/parametres/services'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'settings', 'read');
  const repos = getRepos();
  const [services, categories] = await Promise.all([repos.services.list(ctx), repos.reportCategories.list(ctx)]);
  const canEdit = can(session, tenant.id, 'settings', 'edit');
  return (
    <>
      <PageHeader title="Services" description="Services municipaux et catégories de signalement." />
      <div className="grid gap-10">
        <ServicesManager slug={slug} canEdit={canEdit} services={services.map(({ id, name, email }) => ({ id, name, email }))} />
        <ReportCategoriesManager
          slug={slug}
          canEdit={canEdit}
          services={services.map(({ id, name }) => ({ id, name }))}
          categories={categories.map(({ id, label, icon, defaultServiceId, slaDays }) => ({ id, label, icon, defaultServiceId, slaDays }))}
        />
      </div>
    </>
  );
}
