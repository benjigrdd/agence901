import type { ContentModule, ContentStatus, Event, EventInput, Post, PostInput } from '@app/shared';
import { canEditContent, checkContentTransition, EventInputSchema, PostInputSchema, TRANSITION_FAILURE_MESSAGES } from '@app/shared';

import type { DataContext } from '../../context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { applyList, byString, parseInput } from '../../list';
import type { ContentTransitionInput, EventFilters, EventsRepository, PostFilters, PostsRepository } from '../../ports';
import type { ClientResolver, Db } from '../core';
import { check, pointToEwkt, requirePermission, requireStaff, selectAll, unwrap } from '../core';
import * as m from '../mappers';

export const PUBLISH_FORBIDDEN_MESSAGE = "Vous n'avez pas les droits pour publier";

const EMPTY_COUNTS = (): Record<ContentStatus, number> => ({ draft: 0, pending_review: 0, scheduled: 0, published: 0, archived: 0 });

type ContentLike = { id: string; title: string; status: ContentStatus; publishAt: string | null; createdAt: string; updatedAt: string };

/** Verifications communes (memes messages que l'adaptateur mock), la base les rejoue par trigger. */
function checkTransition(ctx: DataContext, module: ContentModule, existing: ContentLike, input: ContentTransitionInput) {
  const session = requireStaff(ctx);
  const comment = input.comment?.trim() || null;
  const result = checkContentTransition(session, ctx.tenantId, module, existing.status, input.to, { comment, publishAt: input.publishAt ?? existing.publishAt });
  if (!result.ok) {
    if (result.reason === 'forbidden') {
      throw new ForbiddenError(input.to === 'published' || input.to === 'scheduled' ? PUBLISH_FORBIDDEN_MESSAGE : TRANSITION_FAILURE_MESSAGES.forbidden);
    }
    const path = result.reason === 'publish_at_required' ? 'publishAt' : result.reason === 'comment_required' ? 'comment' : 'status';
    throw new ValidationError(TRANSITION_FAILURE_MESSAGES[result.reason], [{ path, message: TRANSITION_FAILURE_MESSAGES[result.reason] }]);
  }
  return comment;
}

function checkEdit(ctx: DataContext, module: ContentModule, existing: ContentLike) {
  const session = requirePermission(ctx, module, 'read');
  if (!canEditContent(session, ctx.tenantId, module, existing.status)) {
    throw new ForbiddenError(existing.status === 'archived' ? 'Un contenu archivé ne peut plus être modifié' : "Vous n'avez pas les droits pour modifier ce contenu");
  }
  return session;
}

const listSorters = <T extends ContentLike>() => ({
  updatedAt: byString((i: T) => i.updatedAt),
  createdAt: byString((i: T) => i.createdAt),
  title: byString((i: T) => i.title),
  status: byString((i: T) => i.status),
  publishAt: byString((i: T) => i.publishAt),
});

async function reviewsOf(db: Db, ctx: DataContext, entity: 'post' | 'event', id: string) {
  return unwrap(await db.from('content_reviews').select('*').eq('tenant_id', ctx.tenantId).eq('entity_type', entity).eq('entity_id', id).order('created_at')).map(m.toReview);
}

async function countsOf(db: Db, table: 'posts' | 'events', ctx: DataContext) {
  const counts = EMPTY_COUNTS();
  for (const row of await selectAll(() => db.from(table).select('id, status').eq('tenant_id', ctx.tenantId).order('id'))) counts[row.status] += 1;
  return counts;
}

export function createPostsRepository(resolve: ClientResolver): PostsRepository {
  const fetchOne = async (ctx: DataContext, id: string): Promise<Post> => {
    const row = (await (await resolve(ctx)).from('posts').select('*').eq('tenant_id', ctx.tenantId).eq('id', id).maybeSingle()).data;
    if (!row) throw new NotFoundError();
    return m.toPost(row);
  };
  const toRow = (d: PostInput) => ({
    type: d.type,
    title: d.title,
    summary: d.summary,
    body: d.body,
    cover_media_id: d.coverMediaId,
    publish_at: d.publishAt,
    unpublish_at: d.unpublishAt,
    district_ids: d.districtIds,
    topic_ids: d.topicIds,
    pinned: d.pinned,
    alert_level: d.alertLevel,
    send_push: d.sendPush,
  });

  return {
    async list(ctx, params) {
      requirePermission(ctx, 'news', 'read');
      const f: PostFilters | undefined = params?.filters;
      const db = await resolve(ctx);
      const rows = await selectAll(() => {
        let query = db.from('posts').select('*').eq('tenant_id', ctx.tenantId);
        if (f?.status?.length) query = query.in('status', f.status);
        if (f?.type?.length) query = query.in('type', f.type);
        if (f?.districtId) query = query.contains('district_ids', [f.districtId]);
        if (f?.topicId) query = query.contains('topic_ids', [f.topicId]);
        return query.order('id');
      });
      const items = rows
        .map(m.toPost)
        .filter(
          (p) =>
            (!f?.status?.length || f.status.includes(p.status)) &&
            (!f?.type?.length || f.type.includes(p.type)) &&
            (!f?.districtId || p.districtIds.includes(f.districtId)) &&
            (!f?.topicId || p.topicIds.includes(f.topicId)),
        );
      return applyList(items, params, { searchText: (p) => `${p.title} ${p.summary}`, sorters: listSorters<Post>(), defaultSort: { field: 'updatedAt', direction: 'desc' } });
    },
    async get(ctx, id) {
      requirePermission(ctx, 'news', 'read');
      return fetchOne(ctx, id);
    },
    async create(ctx, input) {
      const session = requirePermission(ctx, 'news', 'edit');
      const data = parseInput(PostInputSchema, input);
      const row = unwrap(await (await resolve(ctx)).from('posts').insert({ ...toRow(data), tenant_id: ctx.tenantId, status: 'draft', author_id: session.userId }).select('*').single());
      return m.toPost(row);
    },
    async update(ctx, id, input) {
      checkEdit(ctx, 'news', await fetchOne(ctx, id));
      const data = parseInput(PostInputSchema, input);
      check(await (await resolve(ctx)).from('posts').update(toRow(data)).eq('tenant_id', ctx.tenantId).eq('id', id));
      return fetchOne(ctx, id);
    },
    async transition(ctx, id, input) {
      const comment = checkTransition(ctx, 'news', await fetchOne(ctx, id), input);
      check(await (await resolve(ctx)).rpc('transition_content', { p_entity: 'post', p_id: id, p_to: input.to, p_comment: comment ?? undefined, p_publish_at: input.publishAt ?? undefined }));
      return fetchOne(ctx, id);
    },
    async reviews(ctx, id) {
      requirePermission(ctx, 'news', 'read');
      await fetchOne(ctx, id);
      return reviewsOf((await resolve(ctx)), ctx, 'post', id);
    },
    async counts(ctx) {
      requirePermission(ctx, 'news', 'read');
      return countsOf((await resolve(ctx)), 'posts', ctx);
    },
  };
}

export function createEventsRepository(resolve: ClientResolver): EventsRepository {
  const fetchOne = async (ctx: DataContext, id: string): Promise<Event> => {
    const row = (await (await resolve(ctx)).from('v_events').select('*').eq('tenant_id', ctx.tenantId).eq('id', id).maybeSingle()).data;
    if (!row) throw new NotFoundError();
    return m.toEvent(row);
  };
  const toRow = (d: EventInput) => ({
    title: d.title,
    description: d.description,
    category: d.category,
    starts_at: d.startsAt,
    ends_at: d.endsAt,
    all_day: d.allDay,
    rrule: d.rrule,
    place_id: d.placeId,
    location_label: d.location?.label ?? null,
    location_point: d.location ? pointToEwkt(d.location.point) : null,
    organizer: d.organizer,
    price: d.price,
    registration_url: d.registrationUrl,
    cover_media_id: d.coverMediaId,
    accessible: d.accessible,
    publish_at: d.publishAt,
  });

  return {
    async list(ctx, params) {
      requirePermission(ctx, 'events', 'read');
      const f: EventFilters | undefined = params?.filters;
      const db = await resolve(ctx);
      const rows = await selectAll(() => {
        let query = db.from('v_events').select('*').eq('tenant_id', ctx.tenantId);
        if (f?.status?.length) query = query.in('status', f.status);
        if (f?.category?.length) query = query.in('category', f.category);
        if (f?.to) query = query.lte('starts_at', f.to);
        return query.order('id');
      });
      const items = rows
        .map(m.toEvent)
        .filter(
          (e) =>
            (!f?.status?.length || f.status.includes(e.status)) &&
            (!f?.category?.length || f.category.includes(e.category)) &&
            (!f?.from || e.rrule !== null || e.endsAt >= f.from) &&
            (!f?.to || e.startsAt <= f.to),
        );
      return applyList(items, params, {
        searchText: (e) => `${e.title} ${e.organizer ?? ''}`,
        sorters: { ...listSorters<Event>(), startsAt: byString((e: Event) => e.startsAt) },
        defaultSort: { field: 'updatedAt', direction: 'desc' },
      });
    },
    async get(ctx, id) {
      requirePermission(ctx, 'events', 'read');
      return fetchOne(ctx, id);
    },
    async create(ctx, input) {
      const session = requirePermission(ctx, 'events', 'edit');
      const data = parseInput(EventInputSchema, input);
      const row = unwrap(await (await resolve(ctx)).from('events').insert({ ...toRow(data), tenant_id: ctx.tenantId, status: 'draft', author_id: session.userId }).select('id').single());
      return fetchOne(ctx, row.id);
    },
    async update(ctx, id, input) {
      checkEdit(ctx, 'events', await fetchOne(ctx, id));
      const data = parseInput(EventInputSchema, input);
      check(await (await resolve(ctx)).from('events').update(toRow(data)).eq('tenant_id', ctx.tenantId).eq('id', id));
      return fetchOne(ctx, id);
    },
    async transition(ctx, id, input) {
      const comment = checkTransition(ctx, 'events', await fetchOne(ctx, id), input);
      check(await (await resolve(ctx)).rpc('transition_content', { p_entity: 'event', p_id: id, p_to: input.to, p_comment: comment ?? undefined, p_publish_at: input.publishAt ?? undefined }));
      return fetchOne(ctx, id);
    },
    async reviews(ctx, id) {
      requirePermission(ctx, 'events', 'read');
      await fetchOne(ctx, id);
      return reviewsOf((await resolve(ctx)), ctx, 'event', id);
    },
    async counts(ctx) {
      requirePermission(ctx, 'events', 'read');
      return countsOf((await resolve(ctx)), 'events', ctx);
    },
  };
}
