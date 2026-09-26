import { z } from 'zod';

import type { Module, PermissionLevel } from './enums';
import {
  AAL_LEVELS,
  ADMIN_ONLY_MODULES,
  APP_ROLES,
  MODULES,
  PERMISSION_LEVEL_RANK,
  PERMISSION_LEVELS,
} from './enums';
import { idSchema } from './schemas/common';

export const PermissionMapSchema = z.partialRecord(z.enum(MODULES), z.enum(PERMISSION_LEVELS));
export type PermissionMap = z.infer<typeof PermissionMapSchema>;

export const SessionMembershipSchema = z.object({
  tenantId: idSchema,
  role: z.enum(APP_ROLES),
  permissions: PermissionMapSchema,
});
export type SessionMembership = z.infer<typeof SessionMembershipSchema>;

export const SessionSchema = z.object({
  userId: idSchema,
  isPlatformAdmin: z.boolean(),
  aal: z.enum(AAL_LEVELS),
  memberships: z.array(SessionMembershipSchema),
});
export type Session = z.infer<typeof SessionSchema>;

const ADMIN_ONLY: readonly Module[] = ADMIN_ONLY_MODULES;

export function isLevelAtLeast(granted: PermissionLevel, required: PermissionLevel): boolean {
  return PERMISSION_LEVEL_RANK[granted] >= PERMISSION_LEVEL_RANK[required];
}

/** Acces personnel a une commune : 2FA validee et appartenance (ou super-admin). */
export function hasStaffAccess(session: Session | null, tenantId: string): boolean {
  if (!session || session.aal !== 'aal2') return false;
  return session.isPlatformAdmin || session.memberships.some((m) => m.tenantId === tenantId);
}

export function isTenantAdmin(session: Session | null, tenantId: string): boolean {
  if (!session || session.aal !== 'aal2') return false;
  if (session.isPlatformAdmin) return true;
  return session.memberships.some((m) => m.tenantId === tenantId && m.role === 'admin');
}

export function isPlatformAdmin(session: Session | null): boolean {
  return session !== null && session.aal === 'aal2' && session.isPlatformAdmin;
}

/** Niveau effectif d'un utilisateur sur un module, ou `null` sans acces. */
export function effectiveLevel(
  session: Session | null,
  tenantId: string,
  module: Module,
): PermissionLevel | null {
  if (!session || session.aal !== 'aal2') return null;
  if (session.isPlatformAdmin) return 'publish';
  const membership = session.memberships.find((m) => m.tenantId === tenantId);
  if (!membership) return null;
  if (membership.role === 'admin') return 'publish';
  if (ADMIN_ONLY.includes(module)) return null;
  return membership.permissions[module] ?? null;
}

/**
 * Regle d'autorisation unique : super-admin = tout, admin = tout sur sa commune,
 * agent = niveau configure par module. Sans `aal2`, toujours `false`.
 */
export function can(
  session: Session | null,
  tenantId: string,
  module: Module,
  level: PermissionLevel,
): boolean {
  const granted = effectiveLevel(session, tenantId, module);
  return granted !== null && isLevelAtLeast(granted, level);
}

export type TenantScope = { kind: 'all' } | { kind: 'some'; tenantIds: string[] };

/** Communes accessibles cote personnel. */
export function accessibleTenants(session: Session | null): TenantScope {
  if (!session || session.aal !== 'aal2') return { kind: 'some', tenantIds: [] };
  if (session.isPlatformAdmin) return { kind: 'all' };
  return { kind: 'some', tenantIds: [...new Set(session.memberships.map((m) => m.tenantId))] };
}
