import type { AuditEntry } from '@app/shared';

import { applyList, byString } from '../../list';
import type { AuditRepository, UsageRepository } from '../../ports';
import type { ClientResolver } from '../core';
import { AUDIT_ENTITY_NAMES, check, requirePermission, requirePlatformAdmin, requireStaff, unwrap } from '../core';
import * as m from '../mappers';

const TABLE_BY_ENTITY = new Map(Object.entries(AUDIT_ENTITY_NAMES).map(([table, entity]) => [entity, table]));

export function createAuditRepositories(resolve: ClientResolver): { audit: AuditRepository; usage: UsageRepository } {
  const audit: AuditRepository = {
    async list(ctx, params) {
      requirePermission(ctx, 'audit', 'read');
      const f = params?.filters;
      let query = (await resolve(ctx)).from('audit_log').select('*').eq('tenant_id', ctx.tenantId);
      if (f?.actorId) query = query.eq('actor_id', f.actorId);
      if (f?.entity) query = query.eq('entity', TABLE_BY_ENTITY.get(f.entity) ?? f.entity);
      if (f?.action?.length) query = query.in('action', f.action);
      if (f?.from) query = query.gte('at', f.from);
      if (f?.to) query = query.lte('at', f.to);
      const rows = unwrap(await query.order('at', { ascending: false }).limit(5000)).map(m.toAuditEntry);
      return applyList(rows, params, {
        searchText: (e) => `${e.entity} ${e.action} ${Object.keys(e.diff).join(' ')}`,
        sorters: { at: byString((e: AuditEntry) => e.at) },
        defaultSort: { field: 'at', direction: 'desc' },
      });
    },

    async recordPlatformAccess(ctx) {
      requirePlatformAdmin(ctx);
      check(await (await resolve(ctx)).rpc('record_platform_access', { p_tenant_id: ctx.tenantId }));
    },
  };

  const usage: UsageRepository = {
    async daily(ctx, range) {
      requireStaff(ctx);
      return unwrap(
        await (await resolve(ctx)).from('usage_daily').select('*').eq('tenant_id', ctx.tenantId).gte('date', range.from).lte('date', range.to).order('date'),
      ).map(m.toUsage);
    },
  };

  return { audit, usage };
}
