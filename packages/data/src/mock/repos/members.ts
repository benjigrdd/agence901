import type { Membership, PermissionMap } from '@app/shared';
import {
  MemberInviteInputSchema,
  MemberPermissionsInputSchema,
  MembershipPermissionSchema,
  MembershipSchema,
  membershipStatus,
  ProfileSchema,
} from '@app/shared';

import type { DataContext } from '../../context';
import { ConflictError, NotFoundError } from '../../errors';
import type { MembersRepository, MemberView } from '../../ports';
import { applyList, byString, parseInput, requireStaff, requireTenantAdmin } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso, recordAudit } from '../runtime';

export const LAST_ADMIN_MESSAGE = 'Impossible : la commune doit garder au moins un administrateur actif';

export function permissionsOf(rt: MockRuntime, membership: Membership): PermissionMap {
  const map: PermissionMap = {};
  for (const row of rt.store.membershipPermissions.forTenant(membership.tenantId)) {
    if (row.membershipId === membership.id) map[row.module] = row.level;
  }
  return map;
}

export function createMembersRepository(rt: MockRuntime): MembersRepository {
  const { store } = rt;

  const view = (membership: Membership): MemberView => {
    const profile = store.profiles.get(membership.userId);
    if (!profile) throw new NotFoundError('Profil introuvable');
    return { membership, profile, permissions: permissionsOf(rt, membership), status: membershipStatus(membership) };
  };

  const getMembership = (ctx: DataContext, id: string) => {
    const membership = store.memberships.get(ctx.tenantId, id);
    if (!membership) throw new NotFoundError('Membre introuvable');
    return membership;
  };

  const activeAdmins = (tenantId: string) =>
    store.memberships.forTenant(tenantId).filter((m) => m.role === 'admin' && !m.disabledAt);

  const assertNotLastAdmin = (membership: Membership) => {
    const admins = activeAdmins(membership.tenantId);
    if (membership.role === 'admin' && !membership.disabledAt && admins.length <= 1) {
      throw new ConflictError(LAST_ADMIN_MESSAGE);
    }
  };

  const replacePermissions = (membership: Membership, permissions: PermissionMap) => {
    for (const row of store.membershipPermissions.forTenant(membership.tenantId)) {
      if (row.membershipId === membership.id) store.membershipPermissions.delete(row.id);
    }
    if (membership.role !== 'agent') return;
    const now = nowIso(rt);
    for (const [module, level] of Object.entries(permissions)) {
      const parsedModule = MembershipPermissionSchema.shape.module.safeParse(module);
      if (!parsedModule.success || !level) continue;
      store.membershipPermissions.set(
        parseInput(MembershipPermissionSchema, {
          id: rt.newId(),
          tenantId: membership.tenantId,
          membershipId: membership.id,
          module: parsedModule.data,
          level,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
  };

  return {
    async directory(ctx) {
      requireStaff(store, ctx);
      const ids = new Set(store.memberships.forTenant(ctx.tenantId).map((m) => m.userId));
      for (const id of store.platformAdminIds) ids.add(id);
      return [...ids].flatMap((userId) => {
        const profile = store.profiles.get(userId);
        return profile ? [{ userId, displayName: profile.displayName }] : [];
      });
    },

    async list(ctx, params) {
      requireTenantAdmin(store, ctx);
      const statuses = params?.filters?.status;
      const views = store.memberships
        .forTenant(ctx.tenantId)
        .map(view)
        .filter((v) => !statuses || statuses.includes(v.status));
      return applyList(views, params, {
        searchText: (v) => `${v.profile.displayName} ${v.profile.email}`,
        sorters: {
          name: byString((v: MemberView) => v.profile.displayName),
          email: byString((v: MemberView) => v.profile.email),
          role: byString((v: MemberView) => v.membership.role),
        },
        defaultSort: { field: 'name', direction: 'asc' },
      });
    },

    async invite(ctx, input) {
      const session = requireTenantAdmin(store, ctx);
      const data = parseInput(MemberInviteInputSchema, input);
      const email = data.email.toLowerCase();
      const now = nowIso(rt);
      let profile = [...store.profiles.values()].find((p) => p.email.toLowerCase() === email);
      if (profile && store.memberships.forTenant(ctx.tenantId).some((m) => m.userId === profile?.id)) {
        throw new ConflictError('Cette personne est déjà membre de la commune');
      }
      if (!profile) {
        profile = parseInput(ProfileSchema, {
          id: rt.newId(),
          displayName: data.displayName,
          email,
          avatarUrl: null,
          lastSignInAt: null,
          createdAt: now,
          updatedAt: now,
        });
        store.profiles.set(profile.id, profile);
      }
      const membership = parseInput(MembershipSchema, {
        id: rt.newId(),
        tenantId: ctx.tenantId,
        userId: profile.id,
        role: data.role,
        invitedAt: now,
        acceptedAt: null,
        disabledAt: null,
        createdAt: now,
        updatedAt: now,
      });
      store.memberships.set(membership);
      replacePermissions(membership, data.permissions);
      const result = view(membership);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'invite', entity: 'membership', entityId: membership.id, before: null, after: { email, role: data.role, permissions: result.permissions } });
      return result;
    },

    async updatePermissions(ctx, membershipId, input) {
      const session = requireTenantAdmin(store, ctx);
      const data = parseInput(MemberPermissionsInputSchema, input);
      const existing = getMembership(ctx, membershipId);
      if (existing.role === 'admin' && data.role !== 'admin') assertNotLastAdmin(existing);
      const before = { role: existing.role, permissions: permissionsOf(rt, existing) };
      const membership = parseInput(MembershipSchema, { ...existing, role: data.role, updatedAt: nowIso(rt) });
      store.memberships.set(membership);
      replacePermissions(membership, data.permissions);
      const result = view(membership);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'permissions', entity: 'membership', entityId: membership.id, before, after: { role: membership.role, permissions: result.permissions } });
      return result;
    },

    async disable(ctx, membershipId) {
      const session = requireTenantAdmin(store, ctx);
      const existing = getMembership(ctx, membershipId);
      if (existing.disabledAt) return view(existing);
      assertNotLastAdmin(existing);
      const membership = parseInput(MembershipSchema, { ...existing, disabledAt: nowIso(rt), updatedAt: nowIso(rt) });
      store.memberships.set(membership);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'disable', entity: 'membership', entityId: membership.id, before: existing, after: membership });
      return view(membership);
    },

    async enable(ctx, membershipId) {
      const session = requireTenantAdmin(store, ctx);
      const existing = getMembership(ctx, membershipId);
      const membership = parseInput(MembershipSchema, { ...existing, disabledAt: null, updatedAt: nowIso(rt) });
      store.memberships.set(membership);
      recordAudit(rt, { tenantId: ctx.tenantId, actorId: session.userId, action: 'enable', entity: 'membership', entityId: membership.id, before: existing, after: membership });
      return view(membership);
    },
  };
}
