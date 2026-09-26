import { describe, expect, it } from 'vitest';

import { ctxOf } from './contract';
import { ForbiddenError } from './errors';
import { createMockEnvironment } from './mock';
import { seedTenantDefaults } from './tenant-defaults';

const input = {
  identity: {
    name: 'Commune Démo Gamma',
    type: 'commune' as const,
    slug: 'demo-gamma',
    inseeCode: '99003',
    population: 8400,
    center: { lat: 45.76, lng: 4.83 },
    plan: 'pilot' as const,
  },
  branding: {
    appName: 'Ma ville Gamma',
    shortName: 'Gamma',
    colors: { primary: '#7C2D12', onPrimary: '#FFFFFF', secondary: '#0F766E', background: '#FFFFFF', surface: '#F8FAFC', text: '#111827' },
    logoUrl: null,
  },
  modules: ['news' as const, 'events' as const, 'reports' as const],
  firstAdmin: { email: 'maire@demo-gamma.test', displayName: 'Maire Gamma' },
};

describe('seedTenantDefaults', () => {
  it('produit les données par défaut attendues', () => {
    let n = 0;
    const d = seedTenantDefaults({ tenantId: 'a1a1a1a1-0000-4000-8000-000000000000', slug: 'demo-gamma', now: '2026-09-26T10:00:00.000Z', newId: () => `id-${n++}` });
    expect(d.placeCategories).toHaveLength(12);
    expect(d.placeCategories.every((c) => c.isDefault && !c.hidden)).toBe(true);
    expect(d.reportCategories).toHaveLength(5);
    expect(d.services.map((s) => s.name)).toEqual(['Services techniques']);
    expect(d.reportCategories.every((c) => c.defaultServiceId === d.services[0]?.id)).toBe(true);
    expect(d.topics).toHaveLength(6);
    expect(d.appConfig.homeLayout.every((t) => t.enabled)).toBe(true);
    expect(d.storeInfo.iosBundleId).toBe('fr.demogamma.app');
    expect(d.storeInfo.onboardingChecklist.every((s) => !s.done && s.doneAt === null)).toBe(true);
    expect(d.modules.find((m) => m.module === 'participation')?.enabled).toBe(false);
  });
});

describe('création d’une commune', () => {
  it('crée la commune, ses données par défaut, sa marque et invite le premier admin', async () => {
    const { repos, store } = createMockEnvironment({ fresh: true });
    const editor = { session: ctxOf('platform-admin', 'alpha').session };
    const tenant = await repos.tenants.create(editor, input);
    expect(tenant.status).toBe('onboarding');
    const ctx = { session: editor.session, tenantId: tenant.id };
    expect(await repos.placeCategories.list(ctx)).toHaveLength(12);
    expect((await repos.branding.get(ctx)).colors.primary).toBe('#7c2d12');
    const enabled = (await repos.modules.list(ctx)).filter((m) => m.enabled).map((m) => m.module);
    expect(enabled.sort()).toEqual(['events', 'news', 'reports']);
    const members = await repos.members.list(ctx);
    expect(members.items.map((m) => [m.profile.email, m.membership.role, m.status])).toEqual([['maire@demo-gamma.test', 'admin', 'invited']]);
    expect(store.audit.forTenant(tenant.id).some((a) => a.action === 'create')).toBe(true);
    await expect(repos.tenants.create(editor, input)).rejects.toThrow('déjà utilisé');
  });

  it('est réservée à l’éditeur', async () => {
    const { repos } = createMockEnvironment({ fresh: true });
    await expect(repos.tenants.create({ session: ctxOf('admin-alpha', 'alpha').session }, input)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('trace les accès de l’éditeur, sans doublon rapproché', async () => {
    const { repos, store } = createMockEnvironment({ fresh: true });
    const ctx = ctxOf('platform-admin', 'alpha');
    await repos.audit.recordPlatformAccess(ctx);
    await repos.audit.recordPlatformAccess(ctx);
    expect(store.audit.forTenant(ctx.tenantId).filter((a) => a.action === 'platform_access')).toHaveLength(1);
    await expect(repos.audit.recordPlatformAccess(ctxOf('admin-alpha', 'alpha'))).rejects.toBeInstanceOf(ForbiddenError);
  });
});
