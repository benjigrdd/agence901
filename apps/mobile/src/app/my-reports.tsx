import { formatDateFr, REPORT_STATUS_LABELS } from '@app/shared';
import { useCallback } from 'react';

import { Body, Card, ErrorMessage, Loading, Screen, Title } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { repos } from '@/lib/data';
import { useAsync } from '@/lib/use-async';

export default function MyReportsScreen() {
  const { ctx } = useApp();
  const reports = useAsync(useCallback(() => repos.citizen.listMyReports(ctx), [ctx]));

  if (reports.status === 'loading') return <Loading />;
  if (reports.status === 'error')
    return <ErrorMessage message={reports.message} onRetry={reports.reload} />;

  return (
    <Screen>
      {reports.data.length === 0 ? <Body>Vous n’avez encore envoyé aucun signalement.</Body> : null}
      {reports.data.map(({ report, events }) => (
        <Card key={report.id}>
          <Title>
            {report.reference} · {REPORT_STATUS_LABELS[report.status]}
          </Title>
          <Body muted>{report.address}</Body>
          <Body>{report.description}</Body>
          {events.map((event) => (
            <Body key={event.id} muted>
              {formatDateFr(new Date(event.createdAt), 'd MMM yyyy')} — {event.message ?? ''}
            </Body>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
