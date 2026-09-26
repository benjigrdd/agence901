import { NotFoundError } from '@app/data';
import { can } from '@app/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { PlaceForm } from '../place-form';

export const metadata: Metadata = { title: 'Lieu' };

export default async function PlacePage({ params }: PageProps<'/[tenant]/carte/[id]'>) {
  const { tenant: slug, id } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'map', 'read');
  const repos = getRepos();
  const place = await repos.places.get(ctx, id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const [categories, photo] = await Promise.all([
    repos.placeCategories.list(ctx),
    place.photoMediaId ? repos.media.get(ctx, place.photoMediaId).catch(() => null) : Promise.resolve(null),
  ]);
  const { id: _id, tenantId: _t, createdAt: _c, updatedAt: _u, ...input } = place;
  void [_id, _t, _c, _u];
  return (
    <>
      <PageHeader title={place.name} />
      <PlaceForm
        key={place.updatedAt}
        slug={slug}
        placeId={place.id}
        canEdit={can(session, tenant.id, 'map', 'edit')}
        photo={photo ? { url: photo.media.url, altText: photo.media.altText } : null}
        categories={categories.filter((c) => !c.hidden || c.id === place.categoryId).map((c) => ({ id: c.id, label: c.label }))}
        initial={input}
      />
    </>
  );
}
