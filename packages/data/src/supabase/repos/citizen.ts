import type { Report } from '@app/shared';
import { CitizenPreferencesInputSchema, PushTokenInputSchema, ReportInputSchema } from '@app/shared';

import type { DataContext } from '../../context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { parseInput } from '../../list';
import type { CitizenRepository } from '../../ports';
import type { ClientResolver } from '../core';
import { check, pointToEwkt, toDataError, unwrap } from '../core';
import * as m from '../mappers';

/**
 * Parcours habitant (app mobile) : session anonyme Supabase ou compte email, RLS « ses propres donnees ».
 * `photos` : chemins deja deposes dans le bucket `report-photos` (`<commune>/<habitant>/…`).
 */
export function createCitizenRepository(resolve: ClientResolver): CitizenRepository {
  const requireCitizen = (ctx: DataContext) => {
    if (!ctx.session) throw new ForbiddenError('Session requise');
    return ctx.session;
  };

  const repo: CitizenRepository = {
    async getOrCreateProfile(ctx) {
      const session = requireCitizen(ctx);
      const db = (await resolve(ctx));
      const existing = (await db.from('citizen_profiles').select('*').eq('user_id', session.userId).maybeSingle()).data;
      if (existing) {
        if (existing.tenant_id !== ctx.tenantId) throw new NotFoundError('Commune introuvable');
        return m.toCitizenProfile(existing);
      }
      return m.toCitizenProfile(unwrap(await db.from('citizen_profiles').insert({ user_id: session.userId, tenant_id: ctx.tenantId }).select('*').single()));
    },

    async updatePreferences(ctx, input) {
      const session = requireCitizen(ctx);
      const data = parseInput(CitizenPreferencesInputSchema, input);
      await repo.getOrCreateProfile(ctx);
      return m.toCitizenProfile(
        unwrap(
          await (await resolve(ctx))
            .from('citizen_profiles')
            .update({
              district_ids: data.districtIds,
              topic_ids: data.topicIds,
              notification_prefs: data.notificationPrefs,
              waste_zone_id: data.wasteZoneId,
              contact_email: data.contactEmail,
              last_seen_at: new Date().toISOString(),
            })
            .eq('user_id', session.userId)
            .select('*')
            .single(),
        ),
      );
    },

    async listMyReports(ctx) {
      const session = requireCitizen(ctx);
      const db = (await resolve(ctx));
      const rows = unwrap(await db.from('v_reports').select('*').eq('tenant_id', ctx.tenantId).eq('reporter_id', session.userId).order('created_at', { ascending: false }));
      if (rows.length === 0) return [];
      const events = unwrap(await db.from('report_events').select('*').eq('tenant_id', ctx.tenantId).eq('visibility', 'public').in('report_id', rows.flatMap((r) => (r.id ? [r.id] : []))).order('created_at')).map(
        m.toReportEvent,
      );
      return rows.map((r) => {
        const report: Report = m.toReport(r, []);
        return { report, events: events.filter((e) => e.reportId === report.id) };
      });
    },

    async createReport(ctx, input) {
      const session = requireCitizen(ctx);
      const data = parseInput(ReportInputSchema, input);
      const db = await resolve(ctx);
      const byRequest = async () =>
        data.clientRequestId
          ? (await db.from('v_reports').select('*').eq('tenant_id', ctx.tenantId).eq('client_request_id', data.clientRequestId).maybeSingle()).data
          : null;
      // Renvoi depuis la file hors ligne : le signalement existe deja.
      const previous = await byRequest();
      if (previous) return m.toReport(previous, []);
      const inserted = await db
        .from('reports')
        .insert({
          tenant_id: ctx.tenantId,
          category_id: data.categoryId,
          description: data.description,
          point: pointToEwkt(data.point),
          address: data.address,
          contact_email: data.contactEmail,
          reporter_id: session.userId,
          client_request_id: data.clientRequestId,
        })
        .select('id')
        .single();
      if (inserted.error) {
        // Deux envois simultanes du meme signalement : on renvoie celui qui a ete enregistre.
        const raced = inserted.error.code === '23505' ? await byRequest() : null;
        if (raced) return m.toReport(raced, []);
        throw toDataError(inserted.error);
      }
      if (data.photos.length) {
        const own = `${ctx.tenantId}/${session.userId}/`;
        if (data.photos.some((p) => !p.startsWith(own))) throw new ValidationError('Photo invalide', [{ path: 'photos', message: 'Photo invalide' }]);
        check(await db.from('report_media').insert(data.photos.map((path) => ({ tenant_id: ctx.tenantId, report_id: inserted.data.id, path }))));
      }
      return m.toReport(unwrap(await db.from('v_reports').select('*').eq('id', inserted.data.id).single()), []);
    },

    async registerPushToken(ctx, input) {
      requireCitizen(ctx);
      const data = parseInput(PushTokenInputSchema, input);
      check(await (await resolve(ctx)).rpc('register_push_token', { p_token: data.token, p_platform: data.platform, p_locale: data.locale }));
    },

    async unregisterPushToken(ctx, token) {
      const session = requireCitizen(ctx);
      check(await (await resolve(ctx)).from('push_tokens').delete().eq('user_id', session.userId).eq('token', token));
    },

    async touch(ctx) {
      requireCitizen(ctx);
      check(await (await resolve(ctx)).rpc('touch_citizen'));
    },

    async deleteMyData(ctx) {
      requireCitizen(ctx);
      const { error } = await (await resolve(ctx)).functions.invoke('delete-account', { body: {} });
      if (error) throw new ForbiddenError('Suppression impossible pour ce compte');
    },

    async publicFeed(ctx) {
      const db = (await resolve(ctx));
      const now = new Date().toISOString();
      const [posts, events, places] = await Promise.all([
        db.from('posts').select('*').eq('tenant_id', ctx.tenantId).eq('status', 'published').order('publish_at', { ascending: false }).limit(50),
        db.from('v_events').select('*').eq('tenant_id', ctx.tenantId).eq('status', 'published').gte('ends_at', now).order('starts_at').limit(50),
        db.from('v_places').select('*').eq('tenant_id', ctx.tenantId),
      ]);
      return { posts: unwrap(posts).map(m.toPost), events: unwrap(events).map(m.toEvent), places: unwrap(places).map(m.toPlace) };
    },
  };
  return repo;
}
