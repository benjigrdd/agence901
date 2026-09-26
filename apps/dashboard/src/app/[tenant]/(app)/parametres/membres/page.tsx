import { formatDateFr, MEMBERSHIP_STATUS_LABELS, ROLE_LABELS } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { requireTenantAdmin } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { MembersManager } from './members-manager';

export const metadata: Metadata = { title: 'Membres' };

export default async function MembersPage({ params }: PageProps<'/[tenant]/parametres/membres'>) {
  const { tenant: slug } = await params;
  const { session, ctx } = await requireTenantAdmin(slug);
  const members = await getRepos().members.list(ctx, { pageSize: 500 });
  return (
    <>
      <PageHeader title="Membres" description="Membres du personnel et droits par module." />
      <MembersManager
        slug={slug}
        currentUserId={session.userId}
        members={members.items.map((m) => ({
          id: m.membership.id,
          userId: m.membership.userId,
          name: m.profile.displayName,
          email: m.profile.email,
          role: m.membership.role,
          roleLabel: ROLE_LABELS[m.membership.role],
          status: m.status,
          statusLabel: MEMBERSHIP_STATUS_LABELS[m.status],
          lastSignIn: m.profile.lastSignInAt ? formatDateFr(new Date(m.profile.lastSignInAt), 'd MMM yyyy') : 'Jamais',
          permissions: m.permissions,
        }))}
      />
    </>
  );
}
