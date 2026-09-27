import type { Session } from '@app/shared';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { ctxOf } from '../contract';
import { TENANT_IDS } from '../personas';
import type { Database } from './database.types';
import { createSupabaseRepositories } from './index';
import { LOCAL_ANON_KEY, LOCAL_SUPABASE_URL, localPersonaResolver } from './local-personas';

/**
 * Parcours de la future app mobile, sur Supabase local avec de VRAIES sessions anonymes :
 *   SUPABASE_CONTRACT=1 pnpm --filter @app/data exec vitest run src/supabase
 */
const run = process.env.SUPABASE_CONTRACT === '1' ? describe : describe.skip;

run('app habitant sur Supabase (session anonyme)', () => {
  it('signale avec photo, le personnel le voit, puis l’habitant supprime ses données', async () => {
    const app = createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: anon, error } = await app.auth.signInAnonymously();
    expect(error).toBeNull();
    const userId = anon.user?.id ?? '';
    const session: Session = { userId, isPlatformAdmin: false, aal: 'aal1', memberships: [] };
    const ctx = { session, tenantId: TENANT_IDS.alpha };
    const citizen = createSupabaseRepositories(() => app).citizen;

    const profile = await citizen.getOrCreateProfile(ctx);
    expect(profile.userId).toBe(userId);

    // Photo deposee dans le dossier de l'habitant, puis signalement.
    const photoPath = `${TENANT_IDS.alpha}/${userId}/${crypto.randomUUID()}.png`;
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0));
    const upload = await app.storage.from('report-photos').upload(photoPath, png, { contentType: 'image/png' });
    expect(upload.error).toBeNull();
    const category = (await createSupabaseRepositories(() => app).reportCategories.list(ctx))[0];
    const report = await citizen.createReport(ctx, {
      categoryId: category?.id ?? '',
      description: 'Banc cassé près de l’école.',
      point: { lat: 47.39, lng: 0.69 },
      address: '5 rue de l’École',
      contactEmail: 'habitant@exemple.test',
      photos: [photoPath],
      clientRequestId: crypto.randomUUID(),
    });
    expect(report.reference).toMatch(/^\d{4}-\d{5}$/);

    // Le personnel voit le signalement et sa photo (URL signee), l'habitant reste pseudonymise.
    const staff = createSupabaseRepositories(localPersonaResolver());
    const detail = await staff.reports.get(ctxOf('admin-alpha', 'alpha'), report.id);
    expect(detail.report.photos).toHaveLength(1);
    expect(detail.report.photos[0]).toContain('token=');
    expect(detail.reporterAlias).toMatch(/^Habitant n° [0-9A-F]{4}$/);

    await citizen.registerPushToken(ctx, { token: `ExponentPushToken[${crypto.randomUUID()}]`, platform: 'android', locale: 'fr' });

    // RGPD : suppression ; le signalement reste pour la commune, sans lien ni email.
    await citizen.deleteMyData(ctx);
    const after = await staff.reports.get(ctxOf('admin-alpha', 'alpha'), report.id);
    expect(after.report.reporterId).toBeNull();
    expect(after.report.contactEmail).toBeNull();
  });

  it('un admin invite un agent via l’Edge Function (sans clé service côté dashboard)', async () => {
    const repos = createSupabaseRepositories(localPersonaResolver());
    const admin = ctxOf('admin-alpha', 'alpha');
    const email = `invite-${crypto.randomUUID().slice(0, 8)}@exemple.test`;
    const member = await repos.members.invite(admin, { email, displayName: 'Nouvel agent', role: 'agent', permissions: { news: 'read', reports: 'edit' } });
    expect(member.status).toBe('invited');
    expect(member.permissions).toEqual({ news: 'read', reports: 'edit' });
    await expect(repos.members.invite(admin, { email, displayName: 'Nouvel agent', role: 'agent', permissions: {} })).rejects.toThrow('déjà membre');
  });
});
