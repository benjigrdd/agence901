import { formatDateFr, richTextToPlainText } from '@app/shared';
import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { Body, Card, ErrorMessage, Loading, Screen, Title } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { repos } from '@/lib/data';
import { useAsync } from '@/lib/use-async';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ctx } = useApp();
  const feed = useAsync(useCallback(() => repos.citizen.publicFeed(ctx), [ctx]));

  if (feed.status === 'loading') return <Loading />;
  if (feed.status === 'error') return <ErrorMessage message={feed.message} onRetry={feed.reload} />;

  const post = feed.data.posts.find((p) => p.id === id);
  if (!post) return <ErrorMessage message="Cette actualité n’est plus disponible." />;

  return (
    <Screen>
      <Card>
        <Title>{post.title}</Title>
        {post.publishAt ? (
          <Body muted>Publiée le {formatDateFr(new Date(post.publishAt), 'd MMMM yyyy')}</Body>
        ) : null}
        <Body>{post.summary}</Body>
      </Card>
      <Card>
        <Body>{richTextToPlainText(post.body)}</Body>
      </Card>
    </Screen>
  );
}
