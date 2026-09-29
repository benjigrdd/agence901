import { formatDateFr } from '@app/shared';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text } from 'react-native';

import { Body, ErrorMessage, Loading, Screen, styles, useColors } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { repos } from '@/lib/data';
import { useAsync } from '@/lib/use-async';

export default function NewsScreen() {
  const { ctx } = useApp();
  const colors = useColors();
  const feed = useAsync(useCallback(() => repos.citizen.publicFeed(ctx), [ctx]));

  if (feed.status === 'loading') return <Loading />;
  if (feed.status === 'error') return <ErrorMessage message={feed.message} onRetry={feed.reload} />;

  const { posts } = feed.data;
  return (
    <Screen>
      {posts.length === 0 ? <Body>Aucune actualité pour le moment.</Body> : null}
      {posts.map((post) => (
        <Pressable
          key={post.id}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/news/[id]', params: { id: post.id } })}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          {post.publishAt ? (
            <Text style={[styles.body, styles.muted, { color: colors.text }]}>
              {formatDateFr(new Date(post.publishAt), 'd MMMM yyyy')}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
          <Text style={[styles.body, { color: colors.text }]}>{post.summary}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
