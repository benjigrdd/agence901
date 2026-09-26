import { EMPTY_RICH_TEXT_DOC } from '@app/shared';
import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { editorPermissions } from '@/server/content';
import { requirePermission } from '@/server/guards';

import { loadPostEditorData } from '../editor-data';
import { PostEditor } from '../post-editor';

export const metadata: Metadata = { title: 'Nouvelle actualité' };

export default async function NewPostPage({ params }: PageProps<'/[tenant]/actualites/nouveau'>) {
  const { tenant: slug } = await params;
  const { session, tenant, ctx } = await requirePermission(slug, 'news', 'read');
  const permissions = editorPermissions(session, tenant.id, 'news', null);
  if (!permissions.canEdit) forbidden();
  const data = await loadPostEditorData(ctx);
  return (
    <>
      <PageHeader title="Nouvelle actualité" />
      <PostEditor
        slug={slug}
        postId={null}
        status={null}
        initial={{
          type: 'news',
          title: '',
          summary: '',
          body: EMPTY_RICH_TEXT_DOC,
          coverMediaId: null,
          publishAt: null,
          unpublishAt: null,
          districtIds: [],
          topicIds: [],
          pinned: false,
          alertLevel: null,
          sendPush: false,
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
