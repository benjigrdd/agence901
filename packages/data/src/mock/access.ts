import type { Module, PermissionLevel, Session, Tenant } from '@app/shared';
import { can, isPlatformAdmin, isTenantAdmin } from '@app/shared';
import type { z } from 'zod';

import type { DataContext, ListParams, ListResult, SessionContext, SortDirection } from '../context';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../context';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors';
import type { MockStore } from './store';

export function requireTenant(store: MockStore, tenantId: string): Tenant {
  const tenant = store.tenants.get(tenantId);
  if (!tenant) throw new NotFoundError('Commune introuvable');
  return tenant;
}

/**
 * Acces personnel : la commune doit exister et l'utilisateur en etre membre (ou super-admin).
 * Sinon `NotFoundError`, pour ne pas reveler l'existence de la commune.
 * Membre sans 2FA validee : `ForbiddenError` (code `aal2_required`).
 */
export function requireStaff(store: MockStore, ctx: DataContext): Session {
  requireTenant(store, ctx.tenantId);
  const session = ctx.session;
  const isMember =
    session !== null && (session.isPlatformAdmin || session.memberships.some((m) => m.tenantId === ctx.tenantId));
  if (!session || !isMember) throw new NotFoundError('Commune introuvable');
  if (session.aal !== 'aal2') throw new ForbiddenError('Double authentification requise', 'aal2_required');
  return session;
}

export function requirePermission(
  store: MockStore,
  ctx: DataContext,
  module: Module,
  level: PermissionLevel,
  message?: string,
): Session {
  const session = requireStaff(store, ctx);
  if (!can(session, ctx.tenantId, module, level)) throw new ForbiddenError(message);
  return session;
}

export function requireTenantAdmin(store: MockStore, ctx: DataContext): Session {
  const session = requireStaff(store, ctx);
  if (!isTenantAdmin(session, ctx.tenantId)) {
    throw new ForbiddenError('Action réservée aux administrateurs de la commune');
  }
  return session;
}

export function requirePlatformAdmin(ctx: SessionContext): Session {
  const session = ctx.session;
  if (!session || !isPlatformAdmin(session)) throw new ForbiddenError("Action réservée à l'éditeur");
  return session;
}

/** Appel citoyen : une session (anonyme possible) sur une commune existante. */
export function requireCitizen(store: MockStore, ctx: DataContext): Session {
  requireTenant(store, ctx.tenantId);
  if (!ctx.session) throw new ForbiddenError('Session requise');
  return ctx.session;
}

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

export function found<T>(value: T | undefined, message?: string): T {
  if (value === undefined) throw new NotFoundError(message);
  return value;
}

// ---------------------------------------------------------------------------
// Listes : recherche, tri, pagination
// ---------------------------------------------------------------------------

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export type Comparator<T> = (a: T, b: T) => number;

export type ListOptions<T> = {
  searchText?: (item: T) => string;
  sorters: Record<string, Comparator<T>>;
  defaultSort: { field: string; direction: SortDirection };
};

export function applyList<T, F>(items: T[], params: ListParams<F> | undefined, options: ListOptions<T>): ListResult<T> {
  let rows = items;
  const search = params?.search?.trim();
  if (search && options.searchText) {
    const needle = normalizeText(search);
    const text = options.searchText;
    rows = rows.filter((item) => normalizeText(text(item)).includes(needle));
  }
  const sort = params?.sort ?? options.defaultSort;
  const comparator = options.sorters[sort.field] ?? options.sorters[options.defaultSort.field];
  if (comparator) {
    const sign = sort.direction === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => sign * comparator(a, b));
  }
  const pageSize = Math.min(Math.max(1, params?.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const page = Math.max(1, params?.page ?? 1);
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length };
}

export const byString =
  <T>(pick: (item: T) => string | null): Comparator<T> =>
  (a, b) =>
    (pick(a) ?? '').localeCompare(pick(b) ?? '', 'fr');

export const byNumber =
  <T>(pick: (item: T) => number): Comparator<T> =>
  (a, b) =>
    pick(a) - pick(b);
