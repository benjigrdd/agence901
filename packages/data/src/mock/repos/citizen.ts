import type { CitizenProfile, Event, Post } from '@app/shared';
import {
  CitizenDataExportSchema,
  CitizenPreferencesInputSchema,
  CitizenProfileSchema,
  DEFAULT_NOTIFICATION_PREFS,
  formatReportReference,
  parseReportReference,
  PushTokenInputSchema,
  PushTokenSchema,
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
  /** `clientRequestId` → signalement deja cree (idempotence des renvois de l'app). */
  const requestIds = new Map<string, string>();

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
      const retry = data.clientRequestId ? requestIds.get(`${ctx.tenantId}:${data.clientRequestId}`) : undefined;
      const already = retry ? store.reports.get(ctx.tenantId, retry) : undefined;
      if (already) return already;
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
      if (data.clientRequestId) requestIds.set(`${ctx.tenantId}:${data.clientRequestId}`, report.id);
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

    async registerPushToken(ctx, input) {
      const session = requireCitizen(store, ctx);
      const data = parseInput(PushTokenInputSchema, input);
      const now = nowIso(rt);
      const existing = store.pushTokens.all().find((t) => t.token === data.token);
      // Un meme appareil peut changer d'habitant (reinstallation) : le jeton est rattache au dernier.
      if (existing) store.pushTokens.delete(existing.id);
      store.pushTokens.set(
        parseInput(PushTokenSchema, { id: existing?.id ?? rt.newId(), tenantId: ctx.tenantId, userId: session.userId, ...data, lastSeenAt: now, invalidAt: null, createdAt: existing?.createdAt ?? now, updatedAt: now }),
      );
    },

    async unregisterPushToken(ctx, token) {
      const session = requireCitizen(store, ctx);
      const existing = store.pushTokens.forTenant(ctx.tenantId).find((t) => t.token === token && t.userId === session.userId);
      if (existing) store.pushTokens.delete(existing.id);
    },

    async touch(ctx) {
      const session = requireCitizen(store, ctx);
      const profile = store.citizens.forTenant(ctx.tenantId).find((c) => c.userId === session.userId);
      if (profile) store.citizens.set({ ...profile, lastSeenAt: nowIso(rt), updatedAt: nowIso(rt) });
    },

    async deleteMyData(ctx) {
      const session = requireCitizen(store, ctx);
      for (const profile of store.citizens.all().filter((c) => c.userId === session.userId)) store.citizens.delete(profile.id);
      for (const token of store.pushTokens.all().filter((t) => t.userId === session.userId)) store.pushTokens.delete(token.id);
      // Les signalements restent utiles a la commune : detaches de l'habitant et sans email.
      for (const report of store.reports.all().filter((r) => r.reporterId === session.userId)) {
        store.reports.set({ ...report, reporterId: null, contactEmail: null, updatedAt: nowIso(rt) });
      }
    },

    async exportMyData(ctx) {
      const session = requireCitizen(store, ctx);
      const tenant = requireTenant(store, ctx.tenantId);
      const profile = store.citizens.all().find((c) => c.userId === session.userId);
      const categories = new Map(store.reportCategories.forTenant(ctx.tenantId).map((c) => [c.id, c.label]));
      return CitizenDataExportSchema.parse({
        exportedAt: nowIso(rt),
        profile: profile
          ? {
              commune: tenant.name,
              locale: profile.locale,
              districtIds: profile.districtIds,
              topicIds: profile.topicIds,
              notificationPrefs: profile.notificationPrefs,
              wasteZoneId: profile.wasteZoneId,
              contactEmail: profile.contactEmail,
              consentAt: profile.createdAt,
              lastSeenAt: profile.lastSeenAt,
              createdAt: profile.createdAt,
            }
          : null,
        pushTokens: store.pushTokens
          .all()
          .filter((t) => t.userId === session.userId)
          .map((t) => ({ platform: t.platform, locale: t.locale, createdAt: t.createdAt, lastSeenAt: t.lastSeenAt })),
        reports: store.reports
          .all()
          .filter((r) => r.reporterId === session.userId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((r) => ({
            reference: r.reference,
            category: categories.get(r.categoryId) ?? '',
            description: r.description,
            address: r.address,
            position: r.point,
            status: r.status,
            contactEmail: r.contactEmail,
            createdAt: r.createdAt,
            resolvedAt: r.resolvedAt,
            photos: r.photos,
            publicHistory: store.reportEvents
              .all()
              .filter((e) => e.reportId === r.id && e.visibility === 'public')
              .map((e) => ({ at: e.createdAt, status: e.toStatus, message: e.message })),
          })),
      });
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
