import type { AuditEntry } from '@app/shared';

import type { AuditRepository, UsageRepository } from '../../ports';
import { applyList, byString, requirePermission, requirePlatformAdmin, requireStaff } from '../access';
import type { MockRuntime } from '../runtime';
import { recordAudit } from '../runtime';

export function createAuditRepositories(rt: MockRuntime): { audit: AuditRepository; usage: UsageRepository } {
  const { store } = rt;

  const audit: AuditRepository = {
    async list(ctx, params) {
      // `audit` est reserve aux administrateurs par `can()`.
      requirePermission(store, ctx, 'audit', 'read');
      const f = params?.filters;
      const rows = store.audit
        .forTenant(ctx.tenantId)
        .filter((e) => !f?.actorId || e.actorId === f.actorId)
        .filter((e) => !f?.entity || e.entity === f.entity)
        .filter((e) => !f?.action?.length || f.action.includes(e.action))
        .filter((e) => !f?.from || e.at >= f.from)
        .filter((e) => !f?.to || e.at <= f.to);
      return applyList(rows, params, {
        searchText: (e) => `${e.entity} ${e.action} ${Object.keys(e.diff).join(' ')}`,
        sorters: { at: byString((e: AuditEntry) => e.at) },
        defaultSort: { field: 'at', direction: 'desc' },
      });
    },

    async recordPlatformAccess(ctx) {
      const session = requirePlatformAdmin(ctx);
      const since = new Date(rt.now().getTime() - 30 * 60_000).toISOString();
      const recent = store.audit
        .forTenant(ctx.tenantId)
        .some((e) => e.action === 'platform_access' && e.actorId === session.userId && e.at >= since);
      if (recent) return;
      recordAudit(rt, {
        tenantId: ctx.tenantId,
        actorId: session.userId,
        action: 'platform_access',
        entity: 'tenant',
        entityId: ctx.tenantId,
        before: null,
        after: { access: 'dashboard' },
      });
    },
  };

  const usage: UsageRepository = {
    async daily(ctx, range) {
      requireStaff(store, ctx);
      return store.usage
        .forTenant(ctx.tenantId)
        .filter((u) => u.date >= range.from && u.date <= range.to)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  };

  return { audit, usage };
}
