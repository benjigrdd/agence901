import { NotFoundError } from '@app/data';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { authorNames, editorPermissions, toReviewViews } from '@/server/content';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { loadEventEditorData } from '../editor-data';
import { EventEditor } from '../event-editor';

export const metadata: Metadata = { title: 'Événement' };

export default async function EditEventPage({ params }: PageProps<'/[tenant]/agenda/[id]'>) {
  const { tenant: slug, id } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'events', 'read');
  const repos = getRepos();
  const event = await repos.events.get(ctx, id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const [data, reviews, names, cover] = await Promise.all([
    loadEventEditorData(ctx),
    repos.events.reviews(ctx, id),
    authorNames(ctx),
    event.coverMediaId ? repos.media.get(ctx, event.coverMediaId).catch(() => null) : Promise.resolve(null),
  ]);
  const permissions = editorPermissions(session, tenant.id, 'events', event.status);
  const input = {
    title: event.title,
    description: event.description,
    category: event.category,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    rrule: event.rrule,
    placeId: event.placeId,
    location: event.location,
    organizer: event.organizer,
    price: event.price,
    registrationUrl: event.registrationUrl,
    coverMediaId: event.coverMediaId,
    accessible: event.accessible,
    publishAt: event.publishAt,
  };
  return (
    <>
      <PageHeader title={event.title} />
      <EventEditor
        key={`${event.id}-${event.status}-${event.updatedAt}`}
        slug={slug}
        eventId={event.id}
        status={event.status}
        initial={input}
        canEdit={permissions.canEdit}
        allowed={permissions.allowed}
        reviews={toReviewViews(reviews, names)}
        cover={cover ? { url: cover.media.url, altText: cover.media.altText } : null}
        {...data}
      />
    </>
  );
}
