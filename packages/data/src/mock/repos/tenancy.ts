import type { Tenant } from '@app/shared';
import {
  accessibleTenants,
  MembershipSchema,
  normalizeHexColor,
  ProfileSchema,
  TenantCreationInputSchema,
  TenantAppConfigInputSchema,
  TenantAppConfigSchema,
  TenantBrandingInputSchema,
  TenantBrandingSchema,
  TenantInputSchema,
  TenantModuleSchema,
  TenantSchema,
  TenantStoreInfoInputSchema,
  TenantStoreInfoSchema,
} from '@app/shared';

import { ConflictError, ForbiddenError, NotFoundError } from '../../errors';
import { seedTenantDefaults } from '../../tenant-defaults';
import type {
  AppConfigRepository,
  BrandingRepository,
  ModulesRepository,
  StoreInfoRepository,
  TenantsRepository,
} from '../../ports';
import { byString, found, parseInput, requirePermission, requirePlatformAdmin, requireStaff, requireTenant } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';

/** Couleurs stockees en hexadecimal sur 6 caracteres, en minuscules. */
function lowercaseColors<T extends Record<string, string>>(colors: T): T {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) out[k] = normalizeHexColor(v) ?? v;
  return { ...colors, ...out };
}

export function createTenancyRepositories(rt: MockRuntime): {
  tenants: TenantsRepository;
  branding: BrandingRepository;
  modules: ModulesRepository;
  appConfig: AppConfigRepository;
  storeInfo: StoreInfoRepository;
} {
  const { store } = rt;

  const tenants: TenantsRepository = {
    async list(ctx) {
      const scope = accessibleTenants(ctx.session);
      const all = [...store.tenants.values()];
      const items = (scope.kind === 'all' ? all : all.filter((t) => scope.tenantIds.includes(t.id))).sort(
        byString((t: Tenant) => t.name),
      );
      return { items, total: items.length };
    },

    async get(ctx) {
      requireStaff(store, ctx);
      return requireTenant(store, ctx.tenantId);
    },

    async getBySlug(ctx, slug) {
      const tenant = [...store.tenants.values()].find((t) => t.slug === slug);
      if (!tenant) throw new NotFoundError('Commune introuvable');
      requireStaff(store, { session: ctx.session, tenantId: tenant.id });
      return tenant;
    },

    async getPublicBySlug(slug) {
      const tenant = [...store.tenants.values()].find((t) => t.slug === slug && t.status !== 'suspended');
      return found(tenant, 'Commune introuvable');
    },

    async create(ctx, input) {
      const session = requirePlatformAdmin(ctx);
      const data = parseInput(TenantCreationInputSchema, input);
      const { identity } = data;
      if ([...store.tenants.values()].some((t) => t.slug === identity.slug)) {
        throw new ConflictError('Cet identifiant d’URL est déjà utilisé');
      }
      const now = nowIso(rt);
      const tenant = parseInput(TenantSchema, {
        ...identity,
        id: rt.newId(),
        parentId: null,
        status: 'onboarding',
        timezone: 'Europe/Paris',
        renewalDate: null,
        internalNotes: null,
        createdAt: now,
        updatedAt: now,
      });
      store.tenants.set(tenant.id, tenant);

      const defaults = seedTenantDefaults({ tenantId: tenant.id, slug: tenant.slug, now, newId: rt.newId, enabledModules: data.modules });
      for (const c of defaults.placeCategories) store.placeCategories.set(c);
      for (const c of defaults.reportCategories) store.reportCategories.set(c);
      for (const s of defaults.services) store.services.set(s);
      for (const t of defaults.topics) store.topics.set(t);
      for (const m of defaults.modules) store.modules.set(m);
      store.appConfigs.set(defaults.appConfig);
      store.storeInfos.set(defaults.storeInfo);
      store.branding.set(
        parseInput(TenantBrandingSchema, {
          ...data.branding,
          colors: lowercaseColors(data.branding.colors),
          iconUrl: null,
          id: rt.newId(),
          tenantId: tenant.id,
          createdAt: now,
          updatedAt: now,
        }),
      );

      // Premier administrateur : invitation (l'email partira au lot 13).
      const email = data.firstAdmin.email.toLowerCase();
      let profile = [...store.profiles.values()].find((p) => p.email.toLowerCase() === email);
      if (!profile) {
        profile = parseInput(ProfileSchema, { id: rt.newId(), displayName: data.firstAdmin.displayName, email, avatarUrl: null, lastSignInAt: null, createdAt: now, updatedAt: now });
        store.profiles.set(profile.id, profile);
      }
      const membership = parseInput(MembershipSchema, {
        id: rt.newId(),
        tenantId: tenant.id,
        userId: profile.id,
        role: 'admin',
        invitedAt: now,
        acceptedAt: null,
        disabledAt: null,
        createdAt: now,
        updatedAt: now,
      });
      store.memberships.set(membership);

      recordAudit(rt, { tenantId: tenant.id, actorId: session.userId, action: 'create', entity: 'tenant', entityId: tenant.id, before: null, after: tenant });
      recordAudit(rt, { tenantId: tenant.id, actorId: session.userId, action: 'invite', entity: 'membership', entityId: membership.id, before: null, after: { email, role: 'admin' } });
      return tenant;
    },

    async update(ctx, input) {
      const session = requirePlatformAdmin(ctx);
      const existing = requireTenant(store, ctx.tenantId);
      const data = parseInput(TenantInputSchema, input);
      if ([...store.tenants.values()].some((t) => t.slug === data.slug && t.id !== existing.id)) {
        throw new ConflictError('Cet identifiant d’URL est déjà utilisé');
      }
      const tenant = parseInput(TenantSchema, { ...existing, ...data, updatedAt: nowIso(rt) });
      store.tenants.set(tenant.id, tenant);
      recordAudit(rt, { tenantId: tenant.id, actorId: session.userId, action: 'update', entity: 'tenant', entityId: tenant.id, before: existing, after: tenant });
      return tenant;
    },
  };

  const branding: BrandingRepository = {
    async get(ctx) {
      requireTenant(store, ctx.tenantId);
      return found(store.branding.forTenant(ctx.tenantId)[0], 'Marque introuvable');
    },
    async update(ctx, input) {
      const session = requirePlatformAdmin(ctx);
      requireTenant(store, ctx.tenantId);
      const parsed = parseInput(TenantBrandingInputSchema, input);
      const data = { ...parsed, colors: lowercaseColors(parsed.colors) };
      const existing = store.branding.forTenant(ctx.tenantId)[0];
      const now = nowIso(rt);
      const next = parseInput(TenantBrandingSchema, {
        ...data,
        id: existing?.id ?? rt.newId(),
        tenantId: ctx.tenantId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      store.branding.set(next);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'branding', entityId: next.id, before: existing ?? null, after: next });
      return next;
    },
  };

  const modules: ModulesRepository = {
    async list(ctx) {
      requireTenant(store, ctx.tenantId);
      return store.modules.forTenant(ctx.tenantId);
    },
    async setEnabled(ctx, module, enabled) {
      const session = requirePlatformAdmin(ctx);
      requireTenant(store, ctx.tenantId);
      const existing = store.modules.forTenant(ctx.tenantId).find((m) => m.module === module);
      const now = nowIso(rt);
      const next = parseInput(TenantModuleSchema, {
        id: existing?.id ?? rt.newId(),
        tenantId: ctx.tenantId,
        module,
        enabled,
        settings: existing?.settings ?? {},
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      store.modules.set(next);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'module', entityId: next.id, before: existing ?? null, after: next });
      return next;
    },
  };

  const appConfig: AppConfigRepository = {
    async get(ctx) {
      requireTenant(store, ctx.tenantId);
      return found(store.appConfigs.forTenant(ctx.tenantId)[0], 'Configuration introuvable');
    },
    async update(ctx, input) {
      const session = requirePermission(store, ctx, 'settings', 'edit');
      const data = parseInput(TenantAppConfigInputSchema, input);
      const existing = found(store.appConfigs.forTenant(ctx.tenantId)[0], 'Configuration introuvable');
      const next = parseInput(TenantAppConfigSchema, { ...existing, ...data, updatedAt: nowIso(rt) });
      store.appConfigs.set(next);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'app_config', entityId: next.id, before: existing, after: next });
      return next;
    },
  };

  const storeInfo: StoreInfoRepository = {
    async get(ctx) {
      requirePlatformAdmin(ctx);
      requireTenant(store, ctx.tenantId);
      return found(store.storeInfos.forTenant(ctx.tenantId)[0], 'Informations store introuvables');
    },
    async update(ctx, input) {
      const session = requirePlatformAdmin(ctx);
      requireTenant(store, ctx.tenantId);
      const data = parseInput(TenantStoreInfoInputSchema, input);
      const existing = store.storeInfos.forTenant(ctx.tenantId)[0];
      if (!existing) throw new ForbiddenError('Informations store absentes');
      const next = parseInput(TenantStoreInfoSchema, { ...existing, ...data, updatedAt: nowIso(rt) });
      store.storeInfos.set(next);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'update', entity: 'store_info', entityId: next.id, before: existing, after: next });
      return next;
    },
  };

  return { tenants, branding, modules, appConfig, storeInfo };
}
