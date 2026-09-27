import type { PlaceInput, PostInput } from '@app/shared';
import { richTextFromPlainText } from '@app/shared';
import { describe, expect, it } from 'vitest';

import type { DataContext } from '../context';
import { DataError, ForbiddenError, NotFoundError, ValidationError } from '../errors';
import type { PersonaKey } from '../personas';
import { PERSONA_SESSIONS, TENANT_IDS, USER_IDS } from '../personas';
import type { Repositories } from '../ports';

/*
 * Suite de contrats commune a tous les adaptateurs. Elle suppose les memes donnees
 * initiales (communes `demo-alpha` et `demo-beta`, personas) : au lot 14, elle sera
 * rejouee sur l'adaptateur Supabase avec un jeu de donnees equivalent.
 */

export const ctxOf = (persona: PersonaKey, tenant: keyof typeof TENANT_IDS): DataContext => ({
  session: PERSONA_SESSIONS[persona],
  tenantId: TENANT_IDS[tenant],
});

export const samplePostInput: PostInput = {
  type: 'news',
  title: 'Contrat : actualité de test',
  summary: 'Résumé de test',
  body: richTextFromPlainText('Corps de test'),
  coverMediaId: null,
  publishAt: null,
  unpublishAt: null,
  districtIds: [],
  topicIds: [],
  pinned: false,
  alertLevel: null,
  sendPush: false,
};

const samplePlaceInput = (categoryId: string): PlaceInput => ({
  categoryId,
  name: 'Lieu de test',
  point: { lat: 47.39, lng: 0.69 },
  address: '1 rue du Test',
  openingHours: null,
  phone: null,
  website: null,
  description: null,
  accessibility: { wheelchair: 'unknown', toilets: false },
  photoMediaId: null,
  source: 'manual',
  externalId: null,
});

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

type Call = (repos: Repositories) => Promise<unknown>;

export function describeRepositoryContract(name: string, createRepos: () => Repositories): void {
  describe(`contrat des dépôts — ${name}`, () => {
    // Administrateur d'Alpha qui tente d'agir sur Bêta.
    const intruder = () => ctxOf('admin-alpha', 'beta');

    describe('isolation : lecture croisée interdite', () => {
      const cases: [string, Call][] = [
        ['tenants.get', (r) => r.tenants.get(intruder())],
        ['members.list', (r) => r.members.list(intruder())],
        ['posts.list', (r) => r.posts.list(intruder())],
        ['posts.counts', (r) => r.posts.counts(intruder())],
        ['events.list', (r) => r.events.list(intruder())],
        ['media.list', (r) => r.media.list(intruder())],
        ['places.list', (r) => r.places.list(intruder())],
        ['reports.list', (r) => r.reports.list(intruder())],
        ['reports.stats', (r) => r.reports.stats(intruder())],
        ['services.list', (r) => r.services.list(intruder())],
        ['districts.stats', (r) => r.districts.stats(intruder())],
        ['notifications.list', (r) => r.notifications.list(intruder())],
        ['notifications.estimateAudience', (r) => r.notifications.estimateAudience(intruder(), { type: 'all', ids: [] })],
        ['audit.list', (r) => r.audit.list(intruder())],
        ['usage.daily', (r) => r.usage.daily(intruder(), { from: '2000-01-01', to: '2100-01-01' })],
        ['tenants.getBySlug', (r) => r.tenants.getBySlug({ session: PERSONA_SESSIONS['admin-alpha'] }, 'demo-beta')],
      ];
      it.each(cases)('%s → NotFoundError', async (_label, call) => {
        await expect(call(createRepos())).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    describe('isolation : écriture croisée interdite', () => {
      const cases: [string, Call][] = [
        ['posts.create', (r) => r.posts.create(intruder(), samplePostInput)],
        [
          'events.create',
          (r) =>
            r.events.create(intruder(), {
              title: 'Test',
              description: richTextFromPlainText('Test'),
              category: 'other',
              startsAt: '2030-01-01T10:00:00Z',
              endsAt: '2030-01-01T12:00:00Z',
              allDay: false,
              rrule: null,
              placeId: null,
              location: null,
              organizer: null,
              price: null,
              registrationUrl: null,
              coverMediaId: null,
              accessible: true,
              publishAt: null,
            }),
        ],
        [
          'media.upload',
          (r) =>
            r.media.upload(intruder(), { name: 'a.png', mime: 'image/png', dataUrl: PNG_DATA_URL, width: 1, height: 1 }, { altText: 'Test', decorative: false, credit: null }),
        ],
        ['places.create', (r) => r.places.create(intruder(), samplePlaceInput(USER_IDS.adminAlpha))],
        [
          'placeCategories.create',
          (r) => r.placeCategories.create(intruder(), { key: 'test', label: 'Test', icon: 'map-pin', color: '#000000', hidden: false }),
        ],
        ['districts.create', (r) => r.districts.create(intruder(), { name: 'Test', color: '#000000', geom: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] } })],
        ['topics.create', (r) => r.topics.create(intruder(), { label: 'Test', order: 0 })],
        ['services.create', (r) => r.services.create(intruder(), { name: 'Test', email: null })],
        ['reportCategories.create', (r) => r.reportCategories.create(intruder(), { label: 'Test', icon: 'map-pin', defaultServiceId: null, slaDays: 7 })],
        [
          'procedures.create',
          (r) => r.procedures.create(intruder(), { category: 'other', title: 'Test', description: 'Test', kind: 'link', value: 'https://exemple.test', order: 0 }),
        ],
        ['environment.zones.create', (r) => r.environment.zones.create(intruder(), { name: 'Test', geom: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] } })],
        ['environment.sortingGuide.create', (r) => r.environment.sortingGuide.create(intruder(), { name: 'Test', bin: 'other', advice: 'Test' })],
        [
          'notifications.create',
          (r) =>
            r.notifications.create(intruder(), { title: 'Test', body: 'Test', target: { type: 'all', ids: [] }, linkedEntity: null, scheduledAt: null, urgent: false, justification: null }),
        ],
        ['members.invite', (r) => r.members.invite(intruder(), { email: 'x@exemple.test', displayName: 'X', role: 'agent', permissions: {} })],
        [
          'appConfig.update',
          (r) =>
            r.appConfig.update(intruder(), {
              homeLayout: [],
              links: { legalNotice: null, privacy: null, accessibility: null },
              contact: { openingHours: null, phone: null, email: null, address: null },
            }),
        ],
      ];
      it.each(cases)('%s → NotFoundError', async (_label, call) => {
        await expect(call(createRepos())).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    describe('isolation : identifiants d’une autre commune', () => {
      it('un élément de Bêta demandé dans le contexte d’Alpha est introuvable', async () => {
        const repos = createRepos();
        const beta = ctxOf('admin-beta', 'beta');
        const alpha = ctxOf('admin-alpha', 'alpha');
        const post = (await repos.posts.list(beta)).items[0];
        const report = (await repos.reports.list(beta)).items[0];
        const media = (await repos.media.list(beta)).items[0];
        const place = (await repos.places.list(beta)).items[0];
        expect(post && report && media && place).toBeTruthy();
        await expect(repos.posts.get(alpha, post?.id ?? '')).rejects.toBeInstanceOf(NotFoundError);
        await expect(repos.reports.get(alpha, report?.report.id ?? '')).rejects.toBeInstanceOf(NotFoundError);
        await expect(repos.media.get(alpha, media?.media.id ?? '')).rejects.toBeInstanceOf(NotFoundError);
        await expect(repos.places.get(alpha, place?.id ?? '')).rejects.toBeInstanceOf(NotFoundError);
        await expect(repos.reports.addNote(alpha, report?.report.id ?? '', 'Intrusion')).rejects.toBeInstanceOf(NotFoundError);
      });

      it('le super-admin accède aux deux communes', async () => {
        const repos = createRepos();
        const tenants = await repos.tenants.list({ session: PERSONA_SESSIONS['platform-admin'] });
        expect(tenants.items.map((t) => t.id).sort()).toEqual([TENANT_IDS.alpha, TENANT_IDS.beta].sort());
        await expect(repos.reports.list(ctxOf('platform-admin', 'beta'))).resolves.toBeTruthy();
      });
    });

    describe("critères d'acceptation du lot 02", () => {
      it('agent-alpha qui liste les signalements de demo-beta reçoit NotFoundError', async () => {
        await expect(createRepos().reports.list(ctxOf('agent-alpha', 'beta'))).rejects.toBeInstanceOf(NotFoundError);
      });

      it('agent-alpha ne peut pas publier mais peut soumettre à validation', async () => {
        const repos = createRepos();
        const agent = ctxOf('agent-alpha', 'alpha');
        const post = await repos.posts.create(agent, samplePostInput);
        expect(post.status).toBe('draft');
        const publish = repos.posts.transition(agent, post.id, { to: 'published' });
        await expect(publish).rejects.toBeInstanceOf(ForbiddenError);
        await expect(publish).rejects.toThrow("Vous n'avez pas les droits pour publier");
        const submitted = await repos.posts.transition(agent, post.id, { to: 'pending_review' });
        expect(submitted.status).toBe('pending_review');
      });

      it('admin-alpha ne peut refuser une actualité qu’avec un commentaire', async () => {
        const repos = createRepos();
        const agent = ctxOf('agent-alpha', 'alpha');
        const admin = ctxOf('admin-alpha', 'alpha');
        const post = await repos.posts.create(agent, samplePostInput);
        await repos.posts.transition(agent, post.id, { to: 'pending_review' });
        await expect(repos.posts.transition(admin, post.id, { to: 'draft' })).rejects.toBeInstanceOf(ValidationError);
        await expect(repos.posts.transition(admin, post.id, { to: 'draft', comment: '   ' })).rejects.toBeInstanceOf(ValidationError);
        const rejected = await repos.posts.transition(admin, post.id, { to: 'draft', comment: 'Ajoutez une photo.' });
        expect(rejected.status).toBe('draft');
        const reviews = await repos.posts.reviews(agent, post.id);
        expect(reviews.map((r) => r.action)).toEqual(['submitted', 'rejected']);
        expect(reviews[1]?.comment).toBe('Ajoutez une photo.');
      });

      it('staff-aal1 ne peut rien lire côté personnel', async () => {
        const repos = createRepos();
        const staff = ctxOf('staff-aal1', 'alpha');
        for (const call of [
          () => repos.posts.list(staff),
          () => repos.reports.list(staff),
          () => repos.members.list(staff),
          () => repos.tenants.get(staff),
          () => repos.media.list(staff),
        ]) {
          const error: unknown = await call().catch((e: unknown) => e);
          expect(error).toBeInstanceOf(ForbiddenError);
          expect(error instanceof DataError ? error.code : null).toBe('aal2_required');
        }
        const tenants = await repos.tenants.list({ session: PERSONA_SESSIONS['staff-aal1'] });
        expect(tenants.items).toHaveLength(0);
      });

      it('citizen-alpha ne voit que ses signalements et le contenu publié d’Alpha', async () => {
        const repos = createRepos();
        const citizen = ctxOf('citizen-alpha', 'alpha');
        const mine = await repos.citizen.listMyReports(citizen);
        expect(mine.length).toBeGreaterThan(0);
        expect(mine.every((m) => m.report.reporterId === USER_IDS.citizenAlpha)).toBe(true);
        expect(mine.every((m) => m.events.every((e) => e.visibility === 'public'))).toBe(true);
        const feed = await repos.citizen.publicFeed(citizen);
        expect(feed.posts.length).toBeGreaterThan(0);
        expect(feed.posts.every((p) => p.status === 'published' && p.tenantId === TENANT_IDS.alpha)).toBe(true);
        expect(feed.events.every((e) => e.status === 'published' && e.tenantId === TENANT_IDS.alpha)).toBe(true);
        await expect(repos.reports.list(citizen)).rejects.toBeInstanceOf(NotFoundError);
        await expect(repos.posts.list(citizen)).rejects.toBeInstanceOf(NotFoundError);
      });

      it('un renvoi du même signalement (file hors ligne) ne crée pas de doublon', async () => {
        const repos = createRepos();
        const citizen = ctxOf('citizen-alpha', 'alpha');
        const category = (await repos.reportCategories.list(citizen))[0];
        const input = {
          categoryId: category?.id ?? '',
          description: 'Lampadaire éteint depuis hier soir.',
          point: { lat: 47.39, lng: 0.69 },
          address: '3 rue du Test',
          contactEmail: null,
          photos: [],
          clientRequestId: crypto.randomUUID(),
        };
        const first = await repos.citizen.createReport(citizen, input);
        const again = await repos.citizen.createReport(citizen, input);
        expect(again.id).toBe(first.id);
        expect(first.status).toBe('new');
        const mine = await repos.citizen.listMyReports(citizen);
        const created = mine.find((r) => r.report.id === first.id);
        expect(created?.events.map((e) => e.message)).toContain('Signalement reçu.');
      });

      it('l’habitant enregistre son jeton push et signale son activité', async () => {
        const repos = createRepos();
        const citizen = ctxOf('citizen-alpha', 'alpha');
        const token = `ExponentPushToken[contrat-${crypto.randomUUID()}]`;
        await repos.citizen.registerPushToken(citizen, { token, platform: 'ios', locale: 'fr' });
        await repos.citizen.registerPushToken(citizen, { token, platform: 'ios', locale: 'fr' });
        await repos.citizen.touch(citizen);
        await repos.citizen.unregisterPushToken(citizen, token);
      });

      it('un média sans texte alternatif (et non décoratif) est rejeté', async () => {
        const repos = createRepos();
        const agent = ctxOf('agent-alpha', 'alpha');
        const file = { name: 'a.png', mime: 'image/png', dataUrl: PNG_DATA_URL, width: 1, height: 1 };
        await expect(repos.media.upload(agent, file, { altText: '', decorative: false, credit: null })).rejects.toBeInstanceOf(ValidationError);
        const decorative = await repos.media.upload(agent, file, { altText: '', decorative: true, credit: null });
        expect(decorative.decorative).toBe(true);
      });

      it('chaque écriture du personnel crée une entrée d’audit', async () => {
        const repos = createRepos();
        const admin = ctxOf('admin-alpha', 'alpha');
        const before = (await repos.audit.list(admin, { pageSize: 1 })).total;
        const post = await repos.posts.create(admin, samplePostInput);
        await repos.posts.update(admin, post.id, { ...samplePostInput, title: 'Titre modifié' });
        await repos.posts.transition(admin, post.id, { to: 'published' });
        const category = (await repos.placeCategories.list(admin))[0];
        await repos.places.create(admin, samplePlaceInput(category?.id ?? ''));
        const report = (await repos.reports.list(admin)).items.find((i) => i.report.status !== 'duplicate');
        await repos.reports.addNote(admin, report?.report.id ?? '', 'Note de test');
        await repos.topics.create(admin, { label: 'Test', order: 99 });
        const after = await repos.audit.list(admin, { pageSize: 100 });
        expect(after.total).toBe(before + 6);
        const update = after.items.find((e) => e.entityId === post.id && e.action === 'update');
        expect(update?.diff.title).toEqual({ before: samplePostInput.title, after: 'Titre modifié' });
      });
    });
  });
}
