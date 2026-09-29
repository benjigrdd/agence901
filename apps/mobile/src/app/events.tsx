import { formatDateFr } from '@app/shared';
import { useCallback } from 'react';

import { Body, Card, ErrorMessage, Loading, Screen, Title } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { repos } from '@/lib/data';
import { useAsync } from '@/lib/use-async';

export default function EventsScreen() {
  const { ctx } = useApp();
  const feed = useAsync(useCallback(() => repos.citizen.publicFeed(ctx), [ctx]));

  if (feed.status === 'loading') return <Loading />;
  if (feed.status === 'error') return <ErrorMessage message={feed.message} onRetry={feed.reload} />;

  const now = Date.now();
  const events = feed.data.events.filter((e) => Date.parse(e.endsAt) >= now);
  return (
    <Screen>
      {events.length === 0 ? <Body>Aucun événement à venir.</Body> : null}
      {events.map((event) => (
        <Card key={event.id}>
          <Body muted>{formatDateFr(new Date(event.startsAt), "EEEE d MMMM 'à' HH:mm")}</Body>
          <Title>{event.title}</Title>
          {event.location ? <Body>{event.location.label}</Body> : null}
        </Card>
      ))}
    </Screen>
  );
}
