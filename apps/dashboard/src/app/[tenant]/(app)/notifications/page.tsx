import { can, formatDateFr, NOTIFICATION_TARGET_TYPE_LABELS } from '@app/shared';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/page-header';
import { TruncationNotice } from '@/components/truncation-notice';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { NotificationComposer } from './notification-composer';
import type { NotificationRow } from './notifications-table';
import { NotificationsTable } from './notifications-table';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage({ params }: PageProps<'/[tenant]/notifications'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'notifications', 'read');
  const repos = getRepos();
  const [list, districts, topics, posts, events] = await Promise.all([
    repos.notifications.list(ctx, { pageSize: 500 }),
    repos.districts.list(ctx),
    repos.topics.list(ctx),
    repos.posts.list(ctx, { filters: { status: ['published'] }, pageSize: 100 }),
    repos.events.list(ctx, { filters: { status: ['published'] }, pageSize: 100 }),
  ]);
  const districtName = new Map(districts.map((d) => [d.id, d.name]));
  const topicName = new Map(topics.map((t) => [t.id, t.label]));
  const rows: NotificationRow[] = list.items.map((n) => {
    const names = n.target.ids.map((id) => (n.target.type === 'districts' ? districtName.get(id) : topicName.get(id)) ?? '?');
    return {
      id: n.id,
      title: n.title,
      target: n.target.type === 'all' ? NOTIFICATION_TARGET_TYPE_LABELS.all : `${NOTIFICATION_TARGET_TYPE_LABELS[n.target.type]} : ${names.join(', ')}`,
      date: n.sentAt ?? n.scheduledAt ?? n.createdAt,
      dateLabel: formatDateFr(new Date(n.sentAt ?? n.scheduledAt ?? n.createdAt), "d MMM yyyy 'à' H'h'mm"),
      recipients: n.stats.recipients,
      opened: n.stats.opened,
      status: n.sentAt ? 'Envoyée' : 'Programmée',
      urgent: n.urgent,
    };
  });

  return (
    <>
      <PageHeader title="Notifications" description="Envoyez des notifications ciblées aux habitants." />
      <div className="grid gap-8">
        {can(session, tenant.id, 'notifications', 'publish') ? (
          <NotificationComposer
            slug={slug}
            districts={districts.map((d) => ({ id: d.id, label: d.name }))}
            topics={topics.map((t) => ({ id: t.id, label: t.label }))}
            contents={[
              ...posts.items.map((p) => ({ value: `post:${p.id}`, label: `Actualité : ${p.title}` })),
              ...events.items.map((e) => ({ value: `event:${e.id}`, label: `Événement : ${e.title}` })),
            ]}
            existing={list.items.map((n) => ({ urgent: n.urgent, createdAt: n.createdAt, scheduledAt: n.scheduledAt }))}
            appName={tenant.name}
          />
        ) : null}
        <section aria-labelledby="historique" className="space-y-3">
          <h2 id="historique" className="text-lg font-semibold">
            Historique
          </h2>
          <TruncationNotice shown={list.items.length} total={list.total} hint="Les notifications les plus anciennes ne sont pas affichées." />
          <NotificationsTable rows={rows} />
        </section>
      </div>
    </>
  );
}
