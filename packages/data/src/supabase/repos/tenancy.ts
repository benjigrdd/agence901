import type { Tenant } from '@app/shared';
import {
  accessibleTenants,
  normalizeHexColor,
  TenantAppConfigInputSchema,
  TenantBrandingInputSchema,
  TenantCreationInputSchema,
  TenantInputSchema,
  TenantStoreInfoInputSchema,
} from '@app/shared';

import type { DataContext } from '../../context';
import { NotFoundError } from '../../errors';
import { parseInput } from '../../list';
import type { AppConfigRepository, BrandingRepository, ModulesRepository, StoreInfoRepository, TenantsRepository } from '../../ports';
import type { ClientResolver } from '../core';
import { check, pointToEwkt, requirePermission, requirePlatformAdmin, requireStaff, unwrap } from '../core';
import * as m from '../mappers';
import { inviteMember } from './invitations';

const lowercaseColors = <T extends Record<string, string>>(colors: T): T => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) out[k] = normalizeHexColor(v) ?? v;
  return { ...colors, ...out };
};

export function createTenancyRepositories(resolve: ClientResolver): {
  tenants: TenantsRepository;
  branding: BrandingRepository;
  modules: ModulesRepository;
  appConfig: AppConfigRepository;
  storeInfo: StoreInfoRepository;
} {
  const fetchTenant = async (ctx: DataContext): Promise<Tenant> => {
    const db = (await resolve(ctx));
    const row = unwrap(await db.from('v_tenants').select('*').eq('id', ctx.tenantId).maybeSingle());
    let notes: string | null = null;
    if (ctx.session?.isPlatformAdmin) {
      const { data } = await db.from('tenant_internal_notes').select('notes').eq('tenant_id', ctx.tenantId).maybeSingle();
      notes = data?.notes ?? null;
    }
    return m.toTenant(row, notes);
  };

  const tenants: TenantsRepository = {
    async list(ctx) {
      const scope = accessibleTenants(ctx.session);
      if (scope.kind === 'some' && scope.tenantIds.length === 0) return { items: [], total: 0 };
      const db = (await resolve(ctx));
      const query = db.from('v_tenants').select('*').order('name');
      const rows = unwrap(scope.kind === 'all' ? await query : await query.in('id', scope.tenantIds));
      const items = rows.map((r) => m.toTenant(r));
      return { items, total: items.length };
    },

    async get(ctx) {
      requireStaff(ctx);
      return fetchTenant(ctx);
    },

    async getBySlug(ctx, slug) {
      const { data } = await (await resolve(ctx)).from('v_tenants').select('id').eq('slug', slug).maybeSingle();
      if (!data?.id) throw new NotFoundError('Commune introuvable');
      const tctx = { session: ctx.session, tenantId: data.id };
      requireStaff(tctx);
      return fetchTenant(tctx);
    },

    async getPublicBySlug(slug) {
      const row = unwrap(await (await resolve({ session: null })).from('v_tenants').select('*').eq('slug', slug).eq('status', 'active').maybeSingle());
      return m.toTenant(row);
    },

    async create(ctx, input) {
      requirePlatformAdmin(ctx);
      const data = parseInput(TenantCreationInputSchema, input);
      const db = (await resolve(ctx));
      const tenantId = unwrap(
        await db.rpc('create_tenant', {
          p_identity: data.identity,
          p_branding: { ...data.branding, colors: lowercaseColors(data.branding.colors) },
          p_modules: data.modules,
        }),
      );
      await inviteMember(db, { tenantId, email: data.firstAdmin.email, displayName: data.firstAdmin.displayName, role: 'admin', permissions: {} });
      return fetchTenant({ session: ctx.session, tenantId });
    },

    async update(ctx, input) {
      requirePlatformAdmin(ctx);
      const data = parseInput(TenantInputSchema, input);
      const db = (await resolve(ctx));
      check(
        await db
          .from('tenants')
          .update({
            slug: data.slug,
            name: data.name,
            type: data.type,
            parent_id: data.parentId,
            insee_code: data.inseeCode,
            population: data.population,
            status: data.status,
            plan: data.plan,
            timezone: data.timezone,
            center: pointToEwkt(data.center),
            renewal_date: data.renewalDate,
          })
          .eq('id', ctx.tenantId),
      );
      check(await db.from('tenant_internal_notes').upsert({ tenant_id: ctx.tenantId, notes: data.internalNotes }));
      return fetchTenant(ctx);
    },
  };

  const branding: BrandingRepository = {
    async get(ctx) {
      return m.toBranding(unwrap(await (await resolve(ctx)).from('tenant_branding').select('*').eq('tenant_id', ctx.tenantId).maybeSingle()));
    },
    async update(ctx, input) {
      requirePlatformAdmin(ctx);
      const data = parseInput(TenantBrandingInputSchema, input);
      const row = unwrap(
        await (await resolve(ctx))
          .from('tenant_branding')
          .upsert(
            { tenant_id: ctx.tenantId, app_name: data.appName, short_name: data.shortName, colors: lowercaseColors(data.colors), logo_url: data.logoUrl, icon_url: data.iconUrl },
            { onConflict: 'tenant_id' },
          )
          .select('*')
          .single(),
      );
      return m.toBranding(row);
    },
  };

  const modules: ModulesRepository = {
    async list(ctx) {
      return unwrap(await (await resolve(ctx)).from('tenant_modules').select('*').eq('tenant_id', ctx.tenantId).order('module')).map(m.toModule);
    },
    async setEnabled(ctx, module, enabled) {
      requirePlatformAdmin(ctx);
      return m.toModule(
        unwrap(await (await resolve(ctx)).from('tenant_modules').update({ enabled }).eq('tenant_id', ctx.tenantId).eq('module', module).select('*').single()),
      );
    },
  };

  const appConfig: AppConfigRepository = {
    async get(ctx) {
      return m.toAppConfig(unwrap(await (await resolve(ctx)).from('tenant_app_config').select('*').eq('tenant_id', ctx.tenantId).maybeSingle()));
    },
    async update(ctx, input) {
      requirePermission(ctx, 'settings', 'edit');
      const data = parseInput(TenantAppConfigInputSchema, input);
      return m.toAppConfig(
        unwrap(
          await (await resolve(ctx))
            .from('tenant_app_config')
            .update({ home_layout: data.homeLayout, links: data.links, contact: data.contact })
            .eq('tenant_id', ctx.tenantId)
            .select('*')
            .single(),
        ),
      );
    },
  };

  const storeInfo: StoreInfoRepository = {
    async get(ctx) {
      requirePlatformAdmin(ctx);
      return m.toStoreInfo(unwrap(await (await resolve(ctx)).from('tenant_store_info').select('*').eq('tenant_id', ctx.tenantId).maybeSingle()));
    },
    async update(ctx, input) {
      requirePlatformAdmin(ctx);
      const data = parseInput(TenantStoreInfoInputSchema, input);
      return m.toStoreInfo(
        unwrap(
          await (await resolve(ctx))
            .from('tenant_store_info')
            .update({
              ios_bundle_id: data.iosBundleId,
              android_package: data.androidPackage,
              eas_project_id: data.easProjectId,
              app_store_id: data.appStoreId,
              url_scheme: data.urlScheme,
              play_store_url: data.playStoreUrl,
              ios_status: data.iosStatus,
              android_status: data.androidStatus,
              ios_rejection_reason: data.iosRejectionReason,
              android_rejection_reason: data.androidRejectionReason,
              onboarding_checklist: data.onboardingChecklist,
            })
            .eq('tenant_id', ctx.tenantId)
            .select('*')
            .single(),
        ),
      );
    },
  };

  return { tenants, branding, modules, appConfig, storeInfo };
}
