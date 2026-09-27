'use server';

import type { GeometrySyncResult } from '@app/data';
import { ValidationError } from '@app/data';
import type { TenantBrandingInput, TenantCreationInput, TenantInput, TenantModuleKey, TenantStatus, TenantStoreInfoInput } from '@app/shared';
import { TENANT_MODULES, TenantBrandingInputSchema, TenantCreationInputSchema, TenantInputSchema, TenantStoreInfoInputSchema } from '@app/shared';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/server/errors';
import { runAction, toActionError } from '@/server/errors';
import { requirePlatformAdmin, requirePlatformTenant } from '@/server/guards';
import { getRepos } from '@/server/repos';

const refresh = (id?: string) => {
  revalidatePath('/admin/communes');
  if (id) revalidatePath(`/admin/communes/${id}`);
};

export async function createTenantAction(input: TenantCreationInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = TenantCreationInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const session = await requirePlatformAdmin();
    const repos = getRepos();
    const tenant = await repos.tenants.create({ session }, parsed.data);
    // Contour officiel des la creation ; en cas d'echec (API indisponible), rattrapable depuis la fiche.
    await repos.openData.syncGeometry({ session, tenantId: tenant.id }).catch(() => null);
    refresh();
    return { id: tenant.id, slug: tenant.slug };
  });
}

export async function isSlugAvailableAction(slug: string): Promise<boolean> {
  const session = await requirePlatformAdmin();
  const { items } = await getRepos().tenants.list({ session });
  return !items.some((t) => t.slug === slug);
}

export async function updateTenantAction(id: string, input: TenantInput): Promise<ActionResult<null>> {
  const parsed = TenantInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requirePlatformTenant(id);
    await getRepos().tenants.update(ctx, parsed.data);
    refresh(id);
    return null;
  });
}

export async function updateBrandingAction(id: string, input: TenantBrandingInput): Promise<ActionResult<null>> {
  const parsed = TenantBrandingInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requirePlatformTenant(id);
    await getRepos().branding.update(ctx, parsed.data);
    refresh(id);
    return null;
  });
}

export async function setModuleAction(id: string, module: TenantModuleKey, enabled: boolean): Promise<ActionResult<null>> {
  return runAction(async () => {
    if (!(TENANT_MODULES as readonly string[]).includes(module)) throw new ValidationError('Module inconnu');
    const { ctx, tenant } = await requirePlatformTenant(id);
    await getRepos().modules.setEnabled(ctx, module, Boolean(enabled));
    refresh(id);
    revalidatePath(`/${tenant.slug}`, 'layout');
    return null;
  });
}

export async function updateStoreInfoAction(id: string, input: TenantStoreInfoInput): Promise<ActionResult<null>> {
  const parsed = TenantStoreInfoInputSchema.safeParse(input);
  if (!parsed.success) return toActionError(ValidationError.fromZod(parsed.error));
  return runAction(async () => {
    const { ctx } = await requirePlatformTenant(id);
    await getRepos().storeInfo.update(ctx, parsed.data);
    refresh(id);
    return null;
  });
}

/** Suspension / reactivation : l'editeur doit ressaisir le slug. */
export async function setTenantStatusAction(id: string, status: Extract<TenantStatus, 'active' | 'suspended'>, confirmSlug: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    const { ctx, tenant } = await requirePlatformTenant(id);
    if (confirmSlug.trim() !== tenant.slug) {
      throw new ValidationError('L’identifiant saisi ne correspond pas', [{ path: 'confirm', message: `Saisissez « ${tenant.slug} » pour confirmer` }]);
    }
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = tenant;
    void [_id, _c, _u];
    await getRepos().tenants.update(ctx, { ...rest, status: status === 'suspended' ? 'suspended' : 'active' });
    refresh(id);
    return null;
  });
}

/** Contour, centre et population officiels (geo.api.gouv.fr, par code INSEE). */
export async function syncGeometryAction(id: string): Promise<ActionResult<GeometrySyncResult>> {
  return runAction(async () => {
    const { ctx } = await requirePlatformTenant(id);
    const result = await getRepos().openData.syncGeometry(ctx);
    refresh(id);
    return result;
  });
}

/** Export de reversibilite demande par l'editeur (jamais avec les donnees personnelles des habitants). */
export async function exportTenantAsPlatformAction(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const { ctx } = await requirePlatformTenant(id);
    const { url } = await getRepos().openData.exportTenant(ctx, { includePersonalData: false });
    return { url };
  });
}
