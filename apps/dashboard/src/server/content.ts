import 'server-only';

import type { DataContext } from '@app/data';
import type { ContentModule, ContentReview, ContentStatus, Session } from '@app/shared';
import { allowedContentTransitions, can, canEditContent } from '@app/shared';

import type { ReviewView } from '@/components/content/review-history';

import { getRepos } from './repos';

/** Droits d'edition et transitions proposees dans l'editeur (l'adaptateur revalide chaque action). */
export function editorPermissions(session: Session, tenantId: string, module: ContentModule, status: ContentStatus | null) {
  if (!status) {
    const canCreate = can(session, tenantId, module, 'edit');
    return { canEdit: canCreate, allowed: canCreate ? allowedContentTransitions(session, tenantId, module, 'draft') : [] };
  }
  return {
    canEdit: canEditContent(session, tenantId, module, status),
    allowed: allowedContentTransitions(session, tenantId, module, status),
  };
}

export async function authorNames(ctx: DataContext): Promise<Map<string, string>> {
  const directory = await getRepos().members.directory(ctx);
  return new Map(directory.map((d) => [d.userId, d.displayName]));
}

export function toReviewViews(reviews: ContentReview[], names: Map<string, string>): ReviewView[] {
  return reviews.map((r) => ({
    id: r.id,
    action: r.action,
    comment: r.comment,
    authorName: names.get(r.authorId) ?? 'Membre du personnel',
    createdAt: r.createdAt,
  }));
}
