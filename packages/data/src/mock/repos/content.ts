import type { ContentReview, ContentStatus, ReviewAction } from '@app/shared';
import { canEditContent, checkContentTransition, TRANSITION_FAILURE_MESSAGES } from '@app/shared';
import type { ContentModule } from '@app/shared';
import type { z } from 'zod';

import type { DataContext, ListParams } from '../../context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { ContentRepository } from '../../ports';
import type { Comparator } from '../access';
import { applyList, byString, parseInput, requirePermission, requireStaff } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';
import type { Collection } from '../store';

export const PUBLISH_FORBIDDEN_MESSAGE = "Vous n'avez pas les droits pour publier";

type ContentLike = {
  id: string;
  tenantId: string;
  title: string;
  status: ContentStatus;
  publishAt: string | null;
  authorId: string;
  reviewerId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ContentConfig<T extends ContentLike, TInput extends object, TFilters> = {
  module: ContentModule;
  entity: 'post' | 'event';
  collection: Collection<T>;
  schema: z.ZodType<T>;
  inputSchema: z.ZodType<TInput>;
  matches: (item: T, filters: TFilters) => boolean;
  searchText: (item: T) => string;
  sorters?: Record<string, Comparator<T>>;
};

export function createContentRepository<T extends ContentLike, TInput extends object, TFilters>(
  rt: MockRuntime,
  config: ContentConfig<T, TInput, TFilters>,
): ContentRepository<T, TInput, TFilters> {
  const { store } = rt;
  const { module, entity, collection, schema, inputSchema } = config;

  const getItem = (ctx: DataContext, id: string): T => {
    const item = collection.get(ctx.tenantId, id);
    if (!item) throw new NotFoundError();
    return item;
  };

  const addReview = (ctx: DataContext, entityId: string, action: ReviewAction, authorId: string, comment: string | null) => {
    const now = nowIso(rt);
    const review: ContentReview = {
      id: rt.newId(),
      tenantId: ctx.tenantId,
      entityType: entity,
      entityId,
      action,
      comment,
      authorId,
      createdAt: now,
      updatedAt: now,
    };
    store.reviews.set(review);
  };

  return {
    async list(ctx, params?: ListParams<TFilters>) {
      requirePermission(store, ctx, module, 'read');
      const filters = params?.filters;
      const items = collection.forTenant(ctx.tenantId).filter((item) => !filters || config.matches(item, filters));
      return applyList(items, params, {
        searchText: config.searchText,
        sorters: {
          updatedAt: byString((i: T) => i.updatedAt),
          createdAt: byString((i: T) => i.createdAt),
          title: byString((i: T) => i.title),
          status: byString((i: T) => i.status),
          publishAt: byString((i: T) => i.publishAt),
          ...config.sorters,
        },
        defaultSort: { field: 'updatedAt', direction: 'desc' },
      });
    },

    async get(ctx, id) {
      requirePermission(store, ctx, module, 'read');
      return getItem(ctx, id);
    },

    async create(ctx, input) {
      const session = requirePermission(store, ctx, module, 'edit');
      const data = parseInput(inputSchema, input);
      const now = nowIso(rt);
      const item = parseInput(schema, {
        ...data,
        id: rt.newId(),
        tenantId: ctx.tenantId,
        status: 'draft',
        authorId: session.userId,
        reviewerId: null,
        createdAt: now,
        updatedAt: now,
      });
      collection.set(item);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'create', entity, entityId: item.id, before: null, after: item });
      return item;
    },

    async update(ctx, id, input) {
      const session = requirePermission(store, ctx, module, 'read');
      const existing = getItem(ctx, id);
      if (!canEditContent(session, ctx.tenantId, module, existing.status)) {
        throw new ForbiddenError(
          existing.status === 'archived' ? 'Un contenu archivé ne peut plus être modifié' : "Vous n'avez pas les droits pour modifier ce contenu",
        );
      }
      const data = parseInput(inputSchema, input);
      const item = parseInput(schema, { ...existing, ...data, updatedAt: nowIso(rt) });
      collection.set(item);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity, entityId: item.id, before: existing, after: item });
      return item;
    },

    async transition(ctx, id, input) {
      const session = requireStaff(store, ctx);
      const existing = getItem(ctx, id);
      const publishAt = input.publishAt ?? existing.publishAt;
      const comment = input.comment?.trim() || null;
      const check = checkContentTransition(session, ctx.tenantId, module, existing.status, input.to, {
        comment,
        publishAt,
        now: rt.now(),
      });
      if (!check.ok) {
        if (check.reason === 'forbidden') {
          const publishing = input.to === 'published' || input.to === 'scheduled';
          throw new ForbiddenError(publishing ? PUBLISH_FORBIDDEN_MESSAGE : TRANSITION_FAILURE_MESSAGES.forbidden);
        }
        throw new ValidationError(TRANSITION_FAILURE_MESSAGES[check.reason], [
          { path: check.reason === 'publish_at_required' ? 'publishAt' : check.reason === 'comment_required' ? 'comment' : 'status', message: TRANSITION_FAILURE_MESSAGES[check.reason] },
        ]);
      }
      const now = nowIso(rt);
      const next = parseInput(schema, {
        ...existing,
        status: input.to,
        publishAt: input.to === 'scheduled' ? publishAt : input.to === 'published' ? (existing.publishAt && Date.parse(existing.publishAt) <= rt.now().getTime() ? existing.publishAt : now) : existing.publishAt,
        reviewerId: input.to === 'published' || input.to === 'scheduled' || (existing.status === 'pending_review' && input.to === 'draft') ? session.userId : existing.reviewerId,
        updatedAt: now,
      });
      collection.set(next);

      if (input.to === 'pending_review') addReview(ctx, next.id, 'submitted', session.userId, comment);
      if (existing.status === 'pending_review' && input.to === 'draft') addReview(ctx, next.id, 'rejected', session.userId, comment);
      if (existing.status === 'pending_review' && (input.to === 'published' || input.to === 'scheduled')) {
        addReview(ctx, next.id, 'approved', session.userId, comment);
      }
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'transition', entity, entityId: next.id, before: existing, after: next });
      return next;
    },

    async reviews(ctx, id) {
      requirePermission(store, ctx, module, 'read');
      getItem(ctx, id);
      return store.reviews
        .forTenant(ctx.tenantId)
        .filter((r) => r.entityType === entity && r.entityId === id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async counts(ctx) {
      requirePermission(store, ctx, module, 'read');
      const counts: Record<ContentStatus, number> = { draft: 0, pending_review: 0, scheduled: 0, published: 0, archived: 0 };
      for (const item of collection.forTenant(ctx.tenantId)) counts[item.status] += 1;
      return counts;
    },
  };
}
