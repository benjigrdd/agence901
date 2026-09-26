import type { Module, PermissionLevel } from '@app/shared';
import type { z } from 'zod';

import type { DataContext } from '../../context';
import { NotFoundError } from '../../errors';
import type { SimpleRepository } from '../../ports';
import type { Comparator } from '../access';
import { parseInput, requirePermission, requireStaff, requireTenant } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';
import type { Collection } from '../store';

type Row = { id: string; tenantId: string; createdAt: string; updatedAt: string };

/** `public` : lisible sans session (donnees affichees dans l'app citoyenne). */
export type ReadAccess = 'public' | 'staff' | { module: Module; level: PermissionLevel };

export type SimpleConfig<T extends Row, TInput extends object> = {
  collection: Collection<T>;
  schema: z.ZodType<T>;
  inputSchema: z.ZodType<TInput>;
  entity: string;
  read: ReadAccess;
  write: { module: Module; level: PermissionLevel };
  sort: Comparator<T>;
  /** Champs imposes par le serveur (ex. `isDefault: false`). */
  serverFields?: (existing: T | null) => object;
  beforeWrite?: (ctx: DataContext, data: TInput, existing: T | null) => void;
  beforeRemove?: (ctx: DataContext, item: T) => void;
};

export function checkRead(rt: MockRuntime, ctx: DataContext, access: ReadAccess): void {
  if (access === 'public') requireTenant(rt.store, ctx.tenantId);
  else if (access === 'staff') requireStaff(rt.store, ctx);
  else requirePermission(rt.store, ctx, access.module, access.level);
}

export function createSimpleRepository<T extends Row, TInput extends object>(
  rt: MockRuntime,
  config: SimpleConfig<T, TInput>,
): SimpleRepository<T, TInput> {
  const { collection, schema, inputSchema, entity } = config;

  const getRow = (ctx: DataContext, id: string): T => {
    const row = collection.get(ctx.tenantId, id);
    if (!row) throw new NotFoundError();
    return row;
  };

  return {
    async list(ctx) {
      checkRead(rt, ctx, config.read);
      return collection.forTenant(ctx.tenantId).sort(config.sort);
    },

    async get(ctx, id) {
      checkRead(rt, ctx, config.read);
      return getRow(ctx, id);
    },

    async create(ctx, input) {
      const session = requirePermission(rt.store, ctx, config.write.module, config.write.level);
      const data = parseInput(inputSchema, input);
      config.beforeWrite?.(ctx, data, null);
      const now = nowIso(rt);
      const row = parseInput(schema, {
        ...data,
        ...config.serverFields?.(null),
        id: rt.newId(),
        tenantId: ctx.tenantId,
        createdAt: now,
        updatedAt: now,
      });
      collection.set(row);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'create', entity, entityId: row.id, before: null, after: row });
      return row;
    },

    async update(ctx, id, input) {
      const session = requirePermission(rt.store, ctx, config.write.module, config.write.level);
      const existing = getRow(ctx, id);
      const data = parseInput(inputSchema, input);
      config.beforeWrite?.(ctx, data, existing);
      const row = parseInput(schema, { ...existing, ...data, ...config.serverFields?.(existing), updatedAt: nowIso(rt) });
      collection.set(row);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity, entityId: row.id, before: existing, after: row });
      return row;
    },

    async remove(ctx, id) {
      const session = requirePermission(rt.store, ctx, config.write.module, config.write.level);
      const existing = getRow(ctx, id);
      config.beforeRemove?.(ctx, existing);
      collection.delete(id);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'delete', entity, entityId: id, before: existing, after: null });
    },
  };
}
