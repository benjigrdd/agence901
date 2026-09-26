import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';
import { can } from '@app/shared';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { PlaceForm } from '../place-form';

export const metadata: Metadata = { title: 'Nouveau lieu' };

export default async function NewPlacePage({ params }: PageProps<'/[tenant]/carte/nouveau'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'map', 'read');
  if (!can(session, tenant.id, 'map', 'edit')) forbidden();
  const categories = await getRepos().placeCategories.list(ctx);
  return (
    <>
      <PageHeader title="Nouveau lieu" />
      <PlaceForm
        slug={slug}
        placeId={null}
        canEdit
        photo={null}
        categories={categories.filter((c) => !c.hidden).map((c) => ({ id: c.id, label: c.label }))}
        initial={{
          categoryId: '',
          name: '',
          point: tenant.center,
          address: '',
          openingHours: null,
          phone: null,
          website: null,
          description: null,
          accessibility: { wheelchair: 'unknown', toilets: false },
          photoMediaId: null,
          source: 'manual',
          externalId: null,
        }}
      />
    </>
  );
}
