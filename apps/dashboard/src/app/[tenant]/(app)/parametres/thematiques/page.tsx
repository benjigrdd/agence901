import { can } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { TopicsManager } from './topics-manager';

export const metadata: Metadata = { title: 'Thématiques' };

export default async function TopicsPage({ params }: PageProps<'/[tenant]/parametres/thematiques'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'settings', 'read');
  const topics = await getRepos().topics.list(ctx);
  return (
    <>
      <PageHeader title="Thématiques" description="Les centres d’intérêt proposés aux habitants pour recevoir des notifications ciblées." />
      <TopicsManager
        key={topics.map((t) => `${t.id}:${t.label}`).sort().join('|')}
        slug={slug}
        canEdit={can(session, tenant.id, 'settings', 'edit')}
        topics={topics.sort((a, b) => a.order - b.order).map(({ id, label, order }) => ({ id, label, order }))}
      />
    </>
  );
}
