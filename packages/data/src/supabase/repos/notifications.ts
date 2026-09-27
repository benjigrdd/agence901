import type { Notification, NotificationTarget } from '@app/shared';
import { NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE, NotificationInputSchema, NotificationTargetSchema, requiresNotificationJustification } from '@app/shared';

import type { DataContext } from '../../context';
import { ValidationError } from '../../errors';
import { applyList, byString, parseInput } from '../../list';
import type { NotificationsRepository } from '../../ports';
import type { ClientResolver, Db } from '../core';
import { requirePermission, unwrap } from '../core';
import * as m from '../mappers';

export function createNotificationsRepository(resolve: ClientResolver): NotificationsRepository {
  const checkTargetIds = async (db: Db, ctx: DataContext, target: NotificationTarget) => {
    if (target.type === 'all') return;
    const table = target.type === 'districts' ? 'districts' : 'topics';
    const known = new Set(unwrap(await db.from(table).select('id').eq('tenant_id', ctx.tenantId)).map((r) => r.id));
    if (target.ids.some((id) => !known.has(id))) throw new ValidationError('Cible inconnue', [{ path: 'target.ids', message: 'Cible inconnue' }]);
  };

  const audience = async (db: Db, ctx: DataContext, target: NotificationTarget) =>
    unwrap(await db.rpc('estimate_audience', { p_tenant_id: ctx.tenantId, p_target: target }));

  const listAll = async (db: Db, ctx: DataContext): Promise<Notification[]> =>
    unwrap(await db.from('notifications').select('*').eq('tenant_id', ctx.tenantId)).map(m.toNotification);

  return {
    async list(ctx, params) {
      requirePermission(ctx, 'notifications', 'read');
      return applyList(await listAll((await resolve(ctx)), ctx), params, {
        searchText: (n) => `${n.title} ${n.body}`,
        sorters: { createdAt: byString((n: Notification) => n.createdAt), title: byString((n: Notification) => n.title) },
        defaultSort: { field: 'createdAt', direction: 'desc' },
      });
    },

    async estimateAudience(ctx, target) {
      requirePermission(ctx, 'notifications', 'read');
      const parsed = parseInput(NotificationTargetSchema, target);
      const db = (await resolve(ctx));
      await checkTargetIds(db, ctx, parsed);
      return audience(db, ctx, parsed);
    },

    async create(ctx, input) {
      const session = requirePermission(ctx, 'notifications', 'publish');
      const data = parseInput(NotificationInputSchema, input);
      const db = (await resolve(ctx));
      await checkTargetIds(db, ctx, data.target);
      if (!data.justification?.trim() && requiresNotificationJustification(await listAll(db, ctx), data, new Date())) {
        throw new ValidationError(NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE, [{ path: 'justification', message: NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE }]);
      }
      if (data.linkedEntity) {
        const table = data.linkedEntity.type === 'post' ? 'posts' : 'events';
        const linked = (await db.from(table).select('status').eq('tenant_id', ctx.tenantId).eq('id', data.linkedEntity.id).maybeSingle()).data;
        if (linked?.status !== 'published') throw new ValidationError('Le contenu lié doit être publié', [{ path: 'linkedEntity', message: 'Le contenu lié doit être publié' }]);
      }
      const scheduled = data.scheduledAt !== null && Date.parse(data.scheduledAt) > Date.now();
      const recipients = await audience(db, ctx, data.target);
      // L'envoi reel est fait par la tache serveur `dispatch-notifications` (lot 16).
      const row = unwrap(
        await db
          .from('notifications')
          .insert({
            tenant_id: ctx.tenantId,
            title: data.title,
            body: data.body,
            target: data.target,
            linked_entity: data.linkedEntity,
            scheduled_at: data.scheduledAt ?? new Date().toISOString(),
            sent_at: null,
            status: 'scheduled',
            stats: { recipients, opened: 0 },
            urgent: data.urgent,
            justification: data.justification,
            author_id: session.userId,
          })
          .select('*')
          .single(),
      );
      const notification = m.toNotification(row);
      return scheduled ? notification : { ...notification, scheduledAt: data.scheduledAt };
    },
  };
}
