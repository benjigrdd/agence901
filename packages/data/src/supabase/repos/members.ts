import type { MembershipStatus, PermissionMap } from '@app/shared';
import { MemberInviteInputSchema, MemberPermissionsInputSchema, membershipStatus, PermissionMapSchema } from '@app/shared';

import type { DataContext } from '../../context';
import { NotFoundError } from '../../errors';
import { applyList, byString, parseInput } from '../../list';
import type { MembersRepository, MemberView } from '../../ports';
import type { ClientResolver } from '../core';
import { check, requireStaff, requireTenantAdmin, unwrap } from '../core';
import * as m from '../mappers';
import { inviteMember } from './invitations';

export function createMembersRepository(resolve: ClientResolver): MembersRepository {
  const loadViews = async (ctx: DataContext): Promise<MemberView[]> => {
    const db = (await resolve(ctx));
    const [memberships, profiles, auth] = await Promise.all([
      db.from('memberships').select('*, membership_permissions (module, level)').eq('tenant_id', ctx.tenantId),
      db.from('profiles').select('*'),
      db.rpc('staff_last_sign_in', { p_tenant_id: ctx.tenantId }),
    ]);
    const rows = unwrap(memberships);
    const profileById = new Map(unwrap(profiles).map((p) => [p.id, p]));
    const authById = new Map(unwrap(auth).map((a) => [a.user_id, a]));
    return rows.flatMap((row) => {
      const profile = profileById.get(row.user_id);
      const info = authById.get(row.user_id);
      if (!profile || !info) return [];
      const { membership_permissions: perms, ...membershipRow } = row;
      const membership = m.toMembership(membershipRow);
      const permissions: PermissionMap = PermissionMapSchema.parse(Object.fromEntries(perms.map((p) => [p.module, p.level])));
      const status: MembershipStatus = membershipStatus(membership);
      return [{ membership, profile: m.toProfile(profile, info.email, info.last_sign_in_at), permissions, status }];
    });
  };

  const getView = async (ctx: DataContext, membershipId: string): Promise<MemberView> => {
    const view = (await loadViews(ctx)).find((v) => v.membership.id === membershipId);
    if (!view) throw new NotFoundError('Membre introuvable');
    return view;
  };

  return {
    async directory(ctx) {
      requireStaff(ctx);
      const db = (await resolve(ctx));
      const ids = unwrap(await db.from('memberships').select('user_id').eq('tenant_id', ctx.tenantId)).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const profiles = unwrap(await db.from('profiles').select('id, display_name').in('id', ids));
      return profiles.map((p) => ({ userId: p.id, displayName: p.display_name }));
    },

    async list(ctx, params) {
      requireTenantAdmin(ctx);
      const statuses = params?.filters?.status;
      const views = (await loadViews(ctx)).filter((v) => !statuses?.length || statuses.includes(v.status));
      return applyList(views, params, {
        searchText: (v) => `${v.profile.displayName} ${v.profile.email}`,
        sorters: { name: byString((v: MemberView) => v.profile.displayName), role: byString((v: MemberView) => v.membership.role) },
        defaultSort: { field: 'name', direction: 'asc' },
      });
    },

    async invite(ctx, input) {
      requireTenantAdmin(ctx);
      const data = parseInput(MemberInviteInputSchema, input);
      const { membershipId } = await inviteMember((await resolve(ctx)), { tenantId: ctx.tenantId, ...data, email: data.email.toLowerCase() });
      return getView(ctx, membershipId);
    },

    async updatePermissions(ctx, membershipId, input) {
      requireTenantAdmin(ctx);
      await getView(ctx, membershipId);
      const data = parseInput(MemberPermissionsInputSchema, input);
      check(await (await resolve(ctx)).rpc('set_member_permissions', { p_membership_id: membershipId, p_role: data.role, p_permissions: data.permissions }));
      return getView(ctx, membershipId);
    },

    async disable(ctx, membershipId) {
      requireTenantAdmin(ctx);
      await getView(ctx, membershipId);
      check(await (await resolve(ctx)).from('memberships').update({ disabled_at: new Date().toISOString() }).eq('tenant_id', ctx.tenantId).eq('id', membershipId));
      return getView(ctx, membershipId);
    },

    async enable(ctx, membershipId) {
      requireTenantAdmin(ctx);
      await getView(ctx, membershipId);
      check(await (await resolve(ctx)).from('memberships').update({ disabled_at: null }).eq('tenant_id', ctx.tenantId).eq('id', membershipId));
      return getView(ctx, membershipId);
    },
  };
}
