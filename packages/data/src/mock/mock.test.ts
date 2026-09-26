import { CONTENT_STATUSES, POST_TYPES, REPORT_STATUSES } from '@app/shared';
import { describe, expect, it } from 'vitest';

import { ctxOf, describeRepositoryContract } from '../contract';
import { ConflictError, NotImplementedError } from '../errors';
import { createRepositories } from '../index';
import { PERSONA_SESSIONS, TENANT_IDS, USER_IDS } from '../personas';
import { createFixtures, validateFixtures } from './fixtures';
import { LAST_ADMIN_MESSAGE } from './repos/members';
import { createMockEnvironment, createMockRepositories } from './index';

describeRepositoryContract('mock', () => createMockRepositories({ fresh: true }));

describe('fixtures', () => {
  const now = new Date('2026-09-26T10:00:00Z');
  const data = createFixtures(now);

  it('passent toutes la validation zod', () => {
    expect(() => validateFixtures(data)).not.toThrow();
  });

  it('sont déterministes', () => {
    const again = createFixtures(now);
    expect(again.posts.map((p) => p.id)).toEqual(data.posts.map((p) => p.id));
    expect(again.reports.map((r) => r.reference)).toEqual(data.reports.map((r) => r.reference));
  });

  it.each([TENANT_IDS.alpha, TENANT_IDS.beta])('respectent les volumes demandés pour %s', (tenantId) => {
    const of = <T extends { tenantId: string }>(rows: T[]) => rows.filter((r) => r.tenantId === tenantId);
    expect(of(data.districts)).toHaveLength(3);
    expect(of(data.wasteZones)).toHaveLength(2);
    expect(of(data.posts)).toHaveLength(15);
    expect(of(data.events)).toHaveLength(12);
    expect(of(data.events).filter((e) => e.rrule)).toHaveLength(2);
    expect(of(data.places)).toHaveLength(30);
    expect(of(data.placeCategories)).toHaveLength(12);
    expect(of(data.reportCategories)).toHaveLength(5);
    expect(of(data.services)).toHaveLength(3);
    expect(of(data.reports)).toHaveLength(25);
    expect(of(data.procedures)).toHaveLength(8);
    expect(of(data.topics)).toHaveLength(6);
    expect(of(data.sortingGuide)).toHaveLength(20);
    expect(of(data.media)).toHaveLength(10);
    expect(of(data.notifications).filter((n) => n.sentAt)).toHaveLength(6);
    expect(of(data.usage)).toHaveLength(90);

    const posts = of(data.posts);
    expect(new Set(posts.map((p) => p.status))).toEqual(new Set(CONTENT_STATUSES));
    expect(new Set(posts.map((p) => p.type))).toEqual(new Set(POST_TYPES));
    const activeAlerts = posts.filter(
      (p) => p.type === 'alert' && p.status === 'published' && (!p.unpublishAt || Date.parse(p.unpublishAt) > now.getTime()),
    );
    expect(activeAlerts).toHaveLength(1);
    expect(new Set(of(data.reports).map((r) => r.status))).toEqual(new Set(REPORT_STATUSES));
    expect(of(data.reports).every((r) => of(data.reportEvents).some((e) => e.reportId === r.id))).toBe(true);
  });

  it('utilisent des communes clairement fictives', () => {
    expect(data.tenants.map((t) => t.name)).toEqual(['Commune Démo Alpha', 'Commune Démo Bêta']);
    expect(data.tenants.map((t) => t.inseeCode)).toEqual(['99001', '99002']);
    expect(data.profiles.every((p) => p.email.endsWith('.test'))).toBe(true);
  });
});

describe('mock : règles spécifiques', () => {
  it('interdit de désactiver ou rétrograder le dernier administrateur', async () => {
    const { repos, store } = createMockEnvironment({ fresh: true });
    const admin = ctxOf('admin-beta', 'beta');
    const membership = store.memberships.forTenant(TENANT_IDS.beta).find((m) => m.userId === USER_IDS.adminBeta);
    expect(membership).toBeDefined();
    await expect(repos.members.disable(admin, membership?.id ?? '')).rejects.toThrow(LAST_ADMIN_MESSAGE);
    await expect(repos.members.updatePermissions(admin, membership?.id ?? '', { role: 'agent', permissions: {} })).rejects.toBeInstanceOf(ConflictError);
  });

  it('reconstruit les sessions des personas depuis les appartenances', () => {
    const env = createMockEnvironment({ fresh: true });
    expect(env.sessionForUser(USER_IDS.agentAlpha, 'aal2')).toEqual(PERSONA_SESSIONS['agent-alpha']);
    expect(env.sessionForUser(USER_IDS.platformAdmin, 'aal2')).toEqual(PERSONA_SESSIONS['platform-admin']);
  });

  it('ajoute une latence simulée si demandé', async () => {
    const repos = createMockRepositories({ fresh: true, latencyMs: 5 });
    const started = Date.now();
    await repos.tenants.list({ session: PERSONA_SESSIONS['platform-admin'] });
    expect(Date.now() - started).toBeGreaterThanOrEqual(4);
  });

  it("l'adaptateur Supabase n'est pas encore disponible", () => {
    expect(() => createRepositories({ source: 'supabase', client: null })).toThrow(NotImplementedError);
  });
});
