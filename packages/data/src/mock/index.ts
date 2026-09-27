import type { AalLevel, Event, EventInput, Post, PostInput, Session } from '@app/shared';
import { EventInputSchema, EventSchema, PostInputSchema, PostSchema } from '@app/shared';

import type { EventFilters, PostFilters, Repositories } from '../ports';
import { createFixtures, validateFixtures } from './fixtures';
import { createAuditRepositories } from './repos/audit-usage';
import { createCitizenRepository } from './repos/citizen';
import { createOpenDataRepository } from './repos/open-data';
import { createContentRepository } from './repos/content';
import { createMediaRepository } from './repos/media';
import { createMembersRepository, permissionsOf } from './repos/members';
import { createNotificationsRepository } from './repos/notifications';
import { createPlacesRepositories } from './repos/places';
import { createReportsRepository } from './repos/reports';
import { createTenancyRepositories } from './repos/tenancy';
import { createTerritoryRepositories } from './repos/territory';
import type { MockRuntime } from './runtime';
import { randomUuid } from './runtime';
import type { MockStore } from './store';
import { createStore } from './store';

export type MockOptions = {
  /** Nouveau store isole (tests) plutot que le singleton partage. */
  fresh?: boolean;
  /** Latence simulee par appel, en millisecondes (`MOCK_LATENCY_MS`). */
  latencyMs?: number;
  now?: () => Date;
};

export type MockEnvironment = {
  repos: Repositories;
  store: MockStore;
  /** Session reconstruite depuis les appartenances courantes (personas de dev). */
  sessionForUser(userId: string, aal: AalLevel): Session | null;
};

const GLOBAL_KEY = '__appMockStore__';
type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: MockStore };

/** Store charge depuis les fixtures, valide par zod (echec bruyant si invalide). */
export function createMockStore(now: Date = new Date()): MockStore {
  const data = createFixtures(now);
  validateFixtures(data);
  return createStore(data);
}

function sharedStore(now: Date): MockStore {
  // Singleton sur globalThis : survit au rechargement a chaud de Next.
  const g: GlobalWithStore = globalThis;
  g[GLOBAL_KEY] ??= createMockStore(now);
  return g[GLOBAL_KEY];
}

export function resetMockStore(): void {
  const g: GlobalWithStore = globalThis;
  delete g[GLOBAL_KEY];
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function withLatency<T extends object>(target: T, ms: number): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value: unknown = Reflect.get(obj, prop, receiver);
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          await delay(ms);
          return value.apply(obj, args);
        };
      }
      if (value !== null && typeof value === 'object') return withLatency(value, ms);
      return value;
    },
  });
}

export function createMockEnvironment(options: MockOptions = {}): MockEnvironment {
  const now = options.now ?? (() => new Date());
  const store = options.fresh ? createMockStore(now()) : sharedStore(now());
  const rt: MockRuntime = { store, now, newId: randomUuid };

  const posts = createContentRepository<Post, PostInput, PostFilters>(rt, {
    module: 'news',
    entity: 'post',
    collection: store.posts,
    schema: PostSchema,
    inputSchema: PostInputSchema,
    matches: (p, f) =>
      (!f.status?.length || f.status.includes(p.status)) &&
      (!f.type?.length || f.type.includes(p.type)) &&
      (!f.districtId || p.districtIds.includes(f.districtId)) &&
      (!f.topicId || p.topicIds.includes(f.topicId)),
    searchText: (p) => `${p.title} ${p.summary}`,
  });

  const events = createContentRepository<Event, EventInput, EventFilters>(rt, {
    module: 'events',
    entity: 'event',
    collection: store.events,
    schema: EventSchema,
    inputSchema: EventInputSchema,
    matches: (e, f) =>
      (!f.status?.length || f.status.includes(e.status)) &&
      (!f.category?.length || f.category.includes(e.category)) &&
      // Un evenement recurrent peut avoir des occurrences dans la periode : on le garde.
      (!f.from || e.rrule !== null || e.endsAt >= f.from) &&
      (!f.to || e.startsAt <= f.to),
    searchText: (e) => `${e.title} ${e.organizer ?? ''}`,
    sorters: { startsAt: (a, b) => a.startsAt.localeCompare(b.startsAt) },
  });

  const repos: Repositories = {
    ...createTenancyRepositories(rt),
    members: createMembersRepository(rt),
    posts,
    events,
    media: createMediaRepository(rt),
    ...createPlacesRepositories(rt),
    reports: createReportsRepository(rt),
    ...createTerritoryRepositories(rt),
    notifications: createNotificationsRepository(rt),
    ...createAuditRepositories(rt),
    citizen: createCitizenRepository(rt),
    openData: createOpenDataRepository(rt),
  };

  const sessionForUser = (userId: string, aal: AalLevel): Session | null => {
    const isPlatformAdmin = store.platformAdminIds.has(userId);
    const memberships = store.memberships
      .all()
      .filter((m) => m.userId === userId && !m.disabledAt)
      .map((m) => ({ tenantId: m.tenantId, role: m.role, permissions: permissionsOf(rt, m) }));
    return { userId, isPlatformAdmin, aal, memberships };
  };

  const latency = options.latencyMs ?? 0;
  return { repos: latency > 0 ? withLatency(repos, latency) : repos, store, sessionForUser };
}

export function createMockRepositories(options?: MockOptions): Repositories {
  return createMockEnvironment(options).repos;
}

export { createFixtures, validateFixtures } from './fixtures';
export type { MockData, MockStore } from './store';
