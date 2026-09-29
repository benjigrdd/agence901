import { can } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { TruncationNotice } from '@/components/truncation-notice';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { MediaLibrary } from './media-library';

export const metadata: Metadata = { title: 'Médiathèque' };

export default async function MediaPage({ params }: PageProps<'/[tenant]/mediatheque'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'media', 'read');
  const { items, total } = await getRepos().media.list(ctx, { pageSize: 500 });
  const initial = items.map(({ media, usageCount }) => ({
    id: media.id,
    url: media.url,
    altText: media.altText,
    decorative: media.decorative,
    credit: media.credit,
    mime: media.mime,
    width: media.width,
    height: media.height,
    usageCount,
    createdAt: media.createdAt,
  }));
  return (
    <>
      <PageHeader title="Médiathèque" description="Images utilisées dans les actualités, l’agenda et la carte." />
      <TruncationNotice shown={items.length} total={total} hint="Les images les plus anciennes ne sont pas affichées." />
      <MediaLibrary slug={slug} initial={initial} canEdit={can(session, tenant.id, 'media', 'edit')} />
    </>
  );
}
