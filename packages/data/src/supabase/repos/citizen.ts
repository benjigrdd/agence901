import type { Report } from '@app/shared';
import { CitizenPreferencesInputSchema, ReportInputSchema } from '@app/shared';

import type { DataContext } from '../../context';
import { ForbiddenError, NotFoundError } from '../../errors';
import { parseInput } from '../../list';
import type { CitizenRepository } from '../../ports';
import type { ClientResolver } from '../core';
import { check, pointToEwkt, unwrap } from '../core';
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
      const db = (await resolve(ctx));
      const created = unwrap(
        await db
          .from('reports')
          .insert({
            tenant_id: ctx.tenantId,
            category_id: data.categoryId,
            description: data.description,
            point: pointToEwkt(data.point),
            address: data.address,
            contact_email: data.contactEmail,
            reporter_id: session.userId,
          })
          .select('id')
          .single(),
      );
      if (data.photos.length) {
        check(await db.from('report_media').insert(data.photos.map((path) => ({ tenant_id: ctx.tenantId, report_id: created.id, path }))));
      }
      return m.toReport(unwrap(await db.from('v_reports').select('*').eq('id', created.id).single()), []);
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
