import { describe, expect, it } from 'vitest';

import { buildCsp, createNonce, STATIC_SECURITY_HEADERS } from './security-headers';

const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `) || d === name);

describe('CSP', () => {
  const csp = buildCsp({
    nonce: 'abc123',
    isDev: false,
    supabaseUrl: 'https://xyz.supabase.co',
    mapStyleUrl: 'https://api.maptiler.com/maps/streets/style.json?key=k',
    sentryDsn: 'https://key@o1.ingest.de.sentry.io/42',
  });

  it('scripts : nonce de la requete et strict-dynamic, ni unsafe-inline ni unsafe-eval en production', () => {
    expect(directive(csp, 'script-src')).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('connect-src limité à Supabase, carte, API Adresse, geo.api.gouv.fr et Sentry', () => {
    expect(directive(csp, 'connect-src')?.split(' ').slice(1).sort()).toEqual(
      [
        "'self'",
        'https://xyz.supabase.co',
        'wss://xyz.supabase.co',
        'https://api.maptiler.com',
        'https://demotiles.maplibre.org',
        'https://data.geopf.fr',
        'https://geo.api.gouv.fr',
        'https://o1.ingest.de.sentry.io',
      ].sort(),
    );
    expect(csp).not.toContain('key=k');
  });

  it('interdit l’intégration dans un cadre et les objets', () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'upgrade-insecure-requests')).toBeDefined();
  });

  it('développement : unsafe-eval (outils React), pas de montée en HTTPS', () => {
    const dev = buildCsp({ nonce: 'n', isDev: true });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(dev, 'upgrade-insecure-requests')).toBeUndefined();
  });

  it('nonce aléatoire différent à chaque appel', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe('en-têtes statiques', () => {
  it('HSTS 2 ans, nosniff, referrer strict', () => {
    const get = (key: string) => STATIC_SECURITY_HEADERS.find((h) => h.key === key)?.value;
    expect(get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
    expect(get('X-Content-Type-Options')).toBe('nosniff');
    expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(get('Permissions-Policy')).toContain('camera=()');
  });
});
