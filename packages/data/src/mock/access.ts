import type { Module, PermissionLevel, Session, Tenant } from '@app/shared';
import { can, isPlatformAdmin, isTenantAdmin } from '@app/shared';

import type { DataContext, SessionContext } from '../context';
import { ForbiddenError, NotFoundError } from '../errors';
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

export { applyList, byNumber, byString, found, normalizeText, parseInput } from '../list';
export type { Comparator, ListOptions } from '../list';
