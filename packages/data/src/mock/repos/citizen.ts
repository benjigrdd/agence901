import type { CitizenProfile, Event, Post } from '@app/shared';
import {
  CitizenPreferencesInputSchema,
  CitizenProfileSchema,
  DEFAULT_NOTIFICATION_PREFS,
  formatReportReference,
  parseReportReference,
  ReportEventSchema,
  ReportInputSchema,
  ReportSchema,
} from '@app/shared';

import type { DataContext } from '../../context';
import { ValidationError } from '../../errors';
import type { CitizenRepository } from '../../ports';
import { parseInput, requireCitizen, requireTenant } from '../access';
import type { MockRuntime } from '../runtime';
import { nowIso } from '../runtime';

export function createCitizenRepository(rt: MockRuntime): CitizenRepository {
  const { store } = rt;

  const findProfile = (ctx: DataContext, userId: string) =>
    store.citizens.forTenant(ctx.tenantId).find((c) => c.userId === userId);

  const nextReference = (tenantId: string, year: number): string => {
    const max = store.reports
      .forTenant(tenantId)
      .map((r) => parseReportReference(r.reference))
      .filter((ref): ref is { year: number; n: number } => ref !== null && ref.year === year)
      .reduce((m, ref) => Math.max(m, ref.n), 0);
    return formatReportReference(year, max + 1);
  };

  const isLive = (item: { status: string; publishAt: string | null }, now: number) =>
    item.status === 'published' && (!item.publishAt || Date.parse(item.publishAt) <= now);

  return {
    async getOrCreateProfile(ctx) {
      const session = requireCitizen(store, ctx);
      const now = nowIso(rt);
      const existing = findProfile(ctx, session.userId);
      const profile: CitizenProfile = existing
        ? { ...existing, lastSeenAt: now }
        : parseInput(CitizenProfileSchema, {
            id: rt.newId(),
            tenantId: ctx.tenantId,
            userId: session.userId,
            locale: 'fr',
            districtIds: [],
            topicIds: [],
            notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
            wasteZoneId: null,
            contactEmail: null,
            lastSeenAt: now,
            createdAt: now,
            updatedAt: now,
          });
      store.citizens.set(profile);
      return profile;
    },

    async updatePreferences(ctx, input) {
      const session = requireCitizen(store, ctx);
      const data = parseInput(CitizenPreferencesInputSchema, input);
      const districtIds = store.districts.forTenant(ctx.tenantId).map((d) => d.id);
      const topicIds = store.topics.forTenant(ctx.tenantId).map((t) => t.id);
      if (data.districtIds.some((id) => !districtIds.includes(id)) || data.topicIds.some((id) => !topicIds.includes(id))) {
        throw new ValidationError('Préférences invalides');
      }
      if (data.wasteZoneId && !store.wasteZones.get(ctx.tenantId, data.wasteZoneId)) {
        throw new ValidationError('Zone de collecte inconnue');
      }
      const current = findProfile(ctx, session.userId) ?? (await this.getOrCreateProfile(ctx));
      const next = parseInput(CitizenProfileSchema, { ...current, ...data, updatedAt: nowIso(rt) });
      store.citizens.set(next);
      return next;
    },

    async listMyReports(ctx) {
      const session = requireCitizen(store, ctx);
      const events = store.reportEvents.forTenant(ctx.tenantId);
      return store.reports
        .forTenant(ctx.tenantId)
        .filter((r) => r.reporterId === session.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((report) => ({
          report,
          // L'habitant ne voit jamais les notes internes.
          events: events
            .filter((e) => e.reportId === report.id && e.visibility === 'public')
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        }));
    },

    async createReport(ctx, input) {
      const session = requireCitizen(store, ctx);
      const data = parseInput(ReportInputSchema, input);
      if (!store.reportCategories.get(ctx.tenantId, data.categoryId)) {
        throw new ValidationError('Catégorie inconnue', [{ path: 'categoryId', message: 'Catégorie inconnue' }]);
      }
      const now = rt.now();
      const nowString = now.toISOString();
      const report = parseInput(ReportSchema, {
        ...data,
        id: rt.newId(),
        tenantId: ctx.tenantId,
        reference: nextReference(ctx.tenantId, now.getUTCFullYear()),
        status: 'new',
        priority: 'normal',
        serviceId: null,
        duplicateOfId: null,
        reporterId: session.userId,
        aiSuggestion: null,
        resolvedAt: null,
        createdAt: nowString,
        updatedAt: nowString,
      });
      store.reports.set(report);
      store.reportEvents.set(
        parseInput(ReportEventSchema, {
          id: rt.newId(),
          tenantId: ctx.tenantId,
          reportId: report.id,
          kind: 'status_change',
          fromStatus: null,
          toStatus: 'new',
          message: 'Signalement reçu.',
          visibility: 'public',
          authorId: null,
          createdAt: nowString,
          updatedAt: nowString,
        }),
      );
      return report;
    },

    async publicFeed(ctx) {
      requireTenant(store, ctx.tenantId);
      const now = rt.now().getTime();
      const posts: Post[] = store.posts
        .forTenant(ctx.tenantId)
        .filter((p) => isLive(p, now) && (!p.unpublishAt || Date.parse(p.unpublishAt) > now))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.publishAt ?? '').localeCompare(a.publishAt ?? ''));
      const events: Event[] = store.events
        .forTenant(ctx.tenantId)
        .filter((e) => isLive(e, now))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const visibleCategories = new Set(
        store.placeCategories
          .forTenant(ctx.tenantId)
          .filter((c) => !c.hidden)
          .map((c) => c.id),
      );
      const places = store.places.forTenant(ctx.tenantId).filter((p) => visibleCategories.has(p.categoryId));
      return { posts, events, places };
    },
  };
}
