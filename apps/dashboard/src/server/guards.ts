import 'server-only';

import type { DataContext } from '@app/data';
import { NotFoundError } from '@app/data';
import type { Module, PermissionLevel, Session, Tenant } from '@app/shared';
import { can, isPlatformAdmin, isTenantAdmin, TENANT_MODULES } from '@app/shared';
import { forbidden, notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { getRepos } from './repos';
import { getSession } from './session';

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/connexion');
  if (session.aal !== 'aal2') redirect('/connexion?erreur=2fa');
  return session;
}

export type TenantContext = { session: Session; tenant: Tenant; ctx: DataContext };

/** Resout la commune de l'URL. Sans acces : 404 (on ne revele pas son existence). */
export const requireTenant = cache(async (slug: string): Promise<TenantContext> => {
  const session = await requireSession();
  try {
    const tenant = await getRepos().tenants.getBySlug({ session }, slug);
    return { session, tenant, ctx: { session, tenantId: tenant.id } };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
});

const TOGGLEABLE: readonly Module[] = TENANT_MODULES;

/** Niveau insuffisant : 403. Module desactive pour la commune : 404. */
export async function requirePermission(slug: string, module: Module, level: PermissionLevel): Promise<TenantContext> {
  const context = await requireTenant(slug);
  if (TOGGLEABLE.includes(module)) {
    const modules = await getRepos().modules.list(context.ctx);
    if (!modules.some((m) => m.module === module && m.enabled)) notFound();
  }
  if (!can(context.session, context.tenant.id, module, level)) forbidden();
  return context;
}

export async function requireTenantAdmin(slug: string): Promise<TenantContext> {
  const context = await requireTenant(slug);
  if (!isTenantAdmin(context.session, context.tenant.id)) forbidden();
  return context;
}

export async function requirePlatformAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!isPlatformAdmin(session)) forbidden();
  return session;
}
