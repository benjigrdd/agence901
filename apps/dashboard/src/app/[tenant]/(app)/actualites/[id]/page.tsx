import { NotFoundError } from '@app/data';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { authorNames, editorPermissions, toReviewViews } from '@/server/content';
import { requirePermission } from '@/server/guards';
import { getRepos } from '@/server/repos';

import { loadPostEditorData } from '../editor-data';
import { PostEditor } from '../post-editor';

export const metadata: Metadata = { title: 'Actualité' };

export default async function EditPostPage({ params }: PageProps<'/[tenant]/actualites/[id]'>) {
  const { tenant: slug, id } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'news', 'read');
  const repos = getRepos();
  const post = await repos.posts.get(ctx, id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const [data, reviews, names, cover] = await Promise.all([
    loadPostEditorData(ctx),
    repos.posts.reviews(ctx, id),
    authorNames(ctx),
    post.coverMediaId ? repos.media.get(ctx, post.coverMediaId).catch(() => null) : Promise.resolve(null),
  ]);
  const permissions = editorPermissions(session, tenant.id, 'news', post.status);
  return (
    <>
      <PageHeader title={post.title} description={`Rédigée par ${names.get(post.authorId) ?? 'un membre du personnel'}`} />
      <PostEditor
        key={`${post.id}-${post.status}-${post.updatedAt}`}
        slug={slug}
        postId={post.id}
        status={post.status}
        initial={{
          type: post.type,
          title: post.title,
          summary: post.summary,
          body: post.body,
          coverMediaId: post.coverMediaId,
          publishAt: post.publishAt,
          unpublishAt: post.unpublishAt,
          districtIds: post.districtIds,
          topicIds: post.topicIds,
          pinned: post.pinned,
          alertLevel: post.alertLevel,
          sendPush: post.sendPush,
        }}
        canEdit={permissions.canEdit}
        allowed={permissions.allowed}
        reviews={toReviewViews(reviews, names)}
        cover={cover ? { url: cover.media.url, altText: cover.media.altText } : null}
        {...data}
      />
    </>
  );
}
