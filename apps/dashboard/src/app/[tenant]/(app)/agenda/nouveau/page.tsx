import { EMPTY_RICH_TEXT_DOC } from '@app/shared';
import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { editorPermissions } from '@/server/content';
import { requirePermission } from '@/server/guards';
import { getRequestTime } from '@/server/time';

import { loadEventEditorData } from '../editor-data';
import { EventEditor } from '../event-editor';

export const metadata: Metadata = { title: 'Nouvel événement' };

export default async function NewEventPage({ params }: PageProps<'/[tenant]/agenda/nouveau'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'events', 'read');
  const permissions = editorPermissions(session, tenant.id, 'events', null);
  if (!permissions.canEdit) forbidden();
  const data = await loadEventEditorData(ctx);
  const start = new Date(getRequestTime().getTime() + 7 * 86_400_000);
  start.setUTCHours(16, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 3_600_000);
  return (
    <>
      <PageHeader title="Nouvel événement" />
      <EventEditor
        slug={slug}
        eventId={null}
        status={null}
        initial={{
          title: '',
          description: EMPTY_RICH_TEXT_DOC,
          category: 'municipal',
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          allDay: false,
          rrule: null,
          placeId: null,
          location: null,
          organizer: null,
          price: { free: true, label: null },
          registrationUrl: null,
          coverMediaId: null,
          accessible: true,
          publishAt: null,
        }}
        canEdit={permissions.canEdit}
        allowed={permissions.allowed}
        reviews={[]}
        cover={null}
        {...data}
      />
    </>
  );
}
