import { describe, expect, it } from 'vitest';

import { scrubSentryEvent, scrubString } from './sentry-scrub';

describe('scrubString', () => {
  it('masque emails, coordonnées, jetons et paramètres de requête', () => {
    expect(scrubString('Échec pour habitant3@exemple.test')).toBe('Échec pour [email]');
    expect(scrubString('position 47.39412, 0.68481')).toBe('position [coordonnees]');
    expect(scrubString('SRID=4326;POINT(0.684812 47.394121)')).toBe('SRID=4326;POINT([coordonnees])');
    expect(scrubString('Authorization: Bearer abc.def-ghi')).toBe('Authorization: [jeton]');
    expect(scrubString('jeton ExponentPushToken[xxxx-yyyy]')).toBe('jeton [jeton]');
    expect(scrubString('https://app.test/demo-alpha/carte?q=rue+des+lilas&lat=47.3')).toBe('https://app.test/demo-alpha/carte');
  });

  it('laisse intacts les identifiants et références', () => {
    expect(scrubString('Signalement SIG-2026-00042 (3fa85f64-5717-4562-b3fc-2c963f66afa6)')).toBe('Signalement SIG-2026-00042 (3fa85f64-5717-4562-b3fc-2c963f66afa6)');
  });
});

describe('scrubSentryEvent', () => {
  it('nettoie toute la structure de l’événement', () => {
    const event = {
      message: 'Erreur pour marie@commune.fr',
      user: { id: 'u1', email: 'marie@commune.fr', ip_address: '1.2.3.4' },
      request: {
        url: 'https://app.test/demo-alpha/signalements?email=marie@commune.fr',
        query_string: 'email=marie@commune.fr',
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlMTIz', 'User-Agent': 'Firefox' },
        cookies: { 'sb-access-token': 'x' },
      },
      exception: { values: [{ type: 'Error', value: 'Point hors commune : 47.39412, 0.68481' }] },
      breadcrumbs: [{ message: 'fetch', data: { url: 'https://x.supabase.co/rest/v1/reports?contact_email=eq.a@b.fr', point: { lat: 47.3, lng: 0.6 } } }],
      contexts: { report: { lat: 47.39, lng: 0.68, contactEmail: 'a@b.fr' } },
    };
    const out = scrubSentryEvent(event);
    const text = JSON.stringify(out);
    expect(text).not.toMatch(/@commune\.fr|a@b\.fr|47\.39|0\.68|eyJ|sb-access-token|1\.2\.3\.4/);
    expect(out.user).toEqual({ id: 'u1' });
    expect(out.request.url).toBe('https://app.test/demo-alpha/signalements');
    expect(out.request.headers['User-Agent']).toBe('Firefox');
    expect(out.exception.values[0]?.value).toBe('Point hors commune : [coordonnees]');
  });
});
