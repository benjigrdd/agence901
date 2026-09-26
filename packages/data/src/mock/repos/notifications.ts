import type { Notification, NotificationTarget } from '@app/shared';
import {
  NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE,
  NotificationInputSchema,
  NotificationSchema,
  NotificationTargetSchema,
  requiresNotificationJustification,
} from '@app/shared';

import type { DataContext } from '../../context';
import { ValidationError } from '../../errors';
import type { NotificationsRepository } from '../../ports';
import { applyList, byString, parseInput, requirePermission } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';

export function createNotificationsRepository(rt: MockRuntime): NotificationsRepository {
  const { store } = rt;

  const audience = (ctx: DataContext, target: NotificationTarget): number => {
    const citizens = store.citizens.forTenant(ctx.tenantId);
    if (target.type === 'all') return citizens.length;
    if (target.type === 'districts') return citizens.filter((c) => c.districtIds.some((id) => target.ids.includes(id))).length;
    return citizens.filter((c) => c.topicIds.some((id) => target.ids.includes(id))).length;
  };

  const checkTargetIds = (ctx: DataContext, target: NotificationTarget) => {
    const known =
      target.type === 'districts'
        ? store.districts.forTenant(ctx.tenantId).map((d) => d.id)
        : target.type === 'topics'
          ? store.topics.forTenant(ctx.tenantId).map((t) => t.id)
          : [];
    if (target.ids.some((id) => !known.includes(id))) {
      throw new ValidationError('Cible inconnue', [{ path: 'target.ids', message: 'Cible inconnue' }]);
    }
  };

  return {
    async list(ctx, params) {
      requirePermission(store, ctx, 'notifications', 'read');
      return applyList(store.notifications.forTenant(ctx.tenantId), params, {
        searchText: (n) => `${n.title} ${n.body}`,
        sorters: {
          createdAt: byString((n: Notification) => n.createdAt),
          title: byString((n: Notification) => n.title),
        },
        defaultSort: { field: 'createdAt', direction: 'desc' },
      });
    },

    async estimateAudience(ctx, target) {
      requirePermission(store, ctx, 'notifications', 'read');
      const parsed = parseInput(NotificationTargetSchema, target);
      checkTargetIds(ctx, parsed);
      return audience(ctx, parsed);
    },

    async create(ctx, input) {
      const session = requirePermission(store, ctx, 'notifications', 'publish');
      const data = parseInput(NotificationInputSchema, input);
      checkTargetIds(ctx, data.target);
      if (!data.justification?.trim() && requiresNotificationJustification(store.notifications.forTenant(ctx.tenantId), data, rt.now())) {
        throw new ValidationError(NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE, [
          { path: 'justification', message: NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE },
        ]);
      }
      if (data.linkedEntity) {
        const linked =
          data.linkedEntity.type === 'post'
            ? store.posts.get(ctx.tenantId, data.linkedEntity.id)
            : store.events.get(ctx.tenantId, data.linkedEntity.id);
        if (!linked || linked.status !== 'published') {
          throw new ValidationError('Le contenu lié doit être publié', [{ path: 'linkedEntity', message: 'Le contenu lié doit être publié' }]);
        }
      }
      const now = nowIso(rt);
      const scheduled = data.scheduledAt !== null && Date.parse(data.scheduledAt) > rt.now().getTime();
      const notification = parseInput(NotificationSchema, {
        ...data,
        id: rt.newId(),
        tenantId: ctx.tenantId,
        sentAt: scheduled ? null : now,
        stats: { recipients: audience(ctx, data.target), opened: 0 },
        authorId: session.userId,
        createdAt: now,
        updatedAt: now,
      });
      store.notifications.set(notification);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'send', entity: 'notification', entityId: notification.id, before: null, after: notification });
      return notification;
    },
  };
}
