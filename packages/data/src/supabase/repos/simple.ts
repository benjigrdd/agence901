import type { Module, PermissionLevel } from '@app/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';

import type { DataContext } from '../../context';
import { NotFoundError } from '../../errors';
import { parseInput } from '../../list';
import type { SimpleRepository } from '../../ports';
import type { ClientResolver } from '../core';
import { check, requirePermission, requireStaff, unwrap } from '../core';

/**
 * Depot generique d'une table simple. Client non parametre par le schema (noms de table dynamiques) :
 * chaque ligne lue est validee par zod dans `toDomain`, chaque saisie par `inputSchema`.
 */
export type SimpleConfig<T, TInput, R> = {
  table: string;
  /** Source de lecture (vue GeoJSON le cas echeant). */
  source?: string;
  inputSchema: z.ZodType<TInput>;
  toDomain: (row: R) => T;
  toRow: (input: TInput) => Record<string, unknown>;
  /** `public` : lecture ouverte (RLS : commune active) ; `staff` : personnel uniquement. */
  read: 'public' | 'staff';
  write: { module: Module; level: PermissionLevel };
  orderBy: string;
  beforeRemove?: (item: T) => void;
};

export function createSimpleRepository<T, TInput, R>(resolve: ClientResolver, config: SimpleConfig<T, TInput, R>): SimpleRepository<T, TInput> {
  const db = async (ctx: DataContext): Promise<SupabaseClient> => resolve(ctx);
  const source = config.source ?? config.table;
  const { toDomain } = config;

  const fetchOne = async (ctx: DataContext, id: string): Promise<T> => {
    const { data, error } = await (await db(ctx)).from(source).select('*').eq('tenant_id', ctx.tenantId).eq('id', id).maybeSingle();
    check({ error });
    if (!data) throw new NotFoundError();
    return toDomain(data);
  };

  return {
    async list(ctx) {
      if (config.read === 'staff') requireStaff(ctx);
      const rows = unwrap(await (await db(ctx)).from(source).select('*').eq('tenant_id', ctx.tenantId).order(config.orderBy));
      return rows.map((row) => toDomain(row));
    },

    async get(ctx, id) {
      if (config.read === 'staff') requireStaff(ctx);
      return fetchOne(ctx, id);
    },

    async create(ctx, input) {
      requirePermission(ctx, config.write.module, config.write.level);
      const data = parseInput(config.inputSchema, input);
      const inserted: { id: string } = unwrap(await (await db(ctx)).from(config.table).insert({ ...config.toRow(data), tenant_id: ctx.tenantId }).select('id').single());
      return fetchOne(ctx, inserted.id);
    },

    async update(ctx, id, input) {
      requirePermission(ctx, config.write.module, config.write.level);
      await fetchOne(ctx, id);
      const data = parseInput(config.inputSchema, input);
      check(await (await db(ctx)).from(config.table).update(config.toRow(data)).eq('tenant_id', ctx.tenantId).eq('id', id));
      return fetchOne(ctx, id);
    },

    async remove(ctx, id) {
      requirePermission(ctx, config.write.module, config.write.level);
      const existing = await fetchOne(ctx, id);
      config.beforeRemove?.(existing);
      check(await (await db(ctx)).from(config.table).delete().eq('tenant_id', ctx.tenantId).eq('id', id));
    },
  };
}
