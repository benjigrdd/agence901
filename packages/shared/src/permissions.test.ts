import { describe, expect, it } from 'vitest';

import type { Module, PermissionLevel } from './enums';
import { MODULES, PERMISSION_LEVELS } from './enums';
import type { Session } from './permissions';
import { accessibleTenants, can, isTenantAdmin } from './permissions';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const USER = '00000000-0000-4000-8000-000000000001';

const agentPermissions: Partial<Record<Module, PermissionLevel>> = {
  news: 'edit',
  events: 'publish',
  reports: 'edit',
  media: 'edit',
  audit: 'publish',
};

function session(overrides: Partial<Session>): Session {
  return { userId: USER, isPlatformAdmin: false, aal: 'aal2', memberships: [], ...overrides };
}

const platformAdmin = session({ isPlatformAdmin: true });
const adminA = session({ memberships: [{ tenantId: A, role: 'admin', permissions: {} }] });
const agentA = session({ memberships: [{ tenantId: A, role: 'agent', permissions: agentPermissions }] });
const adminAal1 = session({ aal: 'aal1', memberships: [{ tenantId: A, role: 'admin', permissions: {} }] });
const platformAal1 = session({ aal: 'aal1', isPlatformAdmin: true });

const RANK: Record<PermissionLevel, number> = { read: 1, edit: 2, publish: 3 };

describe('can() — matrice rôles × modules × niveaux', () => {
  for (const module of MODULES) {
    for (const level of PERMISSION_LEVELS) {
      it(`${module}/${level}`, () => {
        expect(can(platformAdmin, A, module, level)).toBe(true);
        expect(can(platformAdmin, B, module, level)).toBe(true);

        expect(can(adminA, A, module, level)).toBe(true);
        expect(can(adminA, B, module, level)).toBe(false);

        const granted = agentPermissions[module];
        const expected = module !== 'audit' && granted !== undefined && RANK[granted] >= RANK[level];
        expect(can(agentA, A, module, level)).toBe(expected);
        expect(can(agentA, B, module, level)).toBe(false);

        expect(can(adminAal1, A, module, level)).toBe(false);
        expect(can(platformAal1, A, module, level)).toBe(false);
        expect(can(null, A, module, level)).toBe(false);
      });
    }
  }

  it("refuse le journal d'audit à un agent même si le droit est configuré", () => {
    expect(can(agentA, A, 'audit', 'read')).toBe(false);
  });
});

describe('accessibleTenants / isTenantAdmin', () => {
  it('liste les communes du personnel, toutes pour le super-admin, aucune sans aal2', () => {
    expect(accessibleTenants(agentA)).toEqual({ kind: 'some', tenantIds: [A] });
    expect(accessibleTenants(platformAdmin)).toEqual({ kind: 'all' });
    expect(accessibleTenants(adminAal1)).toEqual({ kind: 'some', tenantIds: [] });
    expect(accessibleTenants(null)).toEqual({ kind: 'some', tenantIds: [] });
  });

  it('distingue admin et agent', () => {
    expect(isTenantAdmin(adminA, A)).toBe(true);
    expect(isTenantAdmin(agentA, A)).toBe(false);
    expect(isTenantAdmin(adminA, B)).toBe(false);
    expect(isTenantAdmin(adminAal1, A)).toBe(false);
  });
});
