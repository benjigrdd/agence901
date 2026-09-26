import { can } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { CategoriesManager } from './categories-manager';

export const metadata: Metadata = { title: 'Catégories de lieux' };

export default async function PlaceCategoriesPage({ params }: PageProps<'/[tenant]/carte/categories'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'map', 'read');
  const categories = await getRepos().placeCategories.list(ctx);
  return (
    <>
      <PageHeader title="Catégories de lieux" description="Les catégories par défaut peuvent être masquées mais pas supprimées." />
      <CategoriesManager
        slug={slug}
        canEdit={can(session, tenant.id, 'map', 'edit')}
        categories={categories.map(({ id, key, label, icon, color, isDefault, hidden }) => ({ id, key, label, icon, color, isDefault, hidden }))}
      />
    </>
  );
}
