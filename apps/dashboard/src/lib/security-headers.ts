/**
 * En-tetes de securite du dashboard. La CSP est calculee a chaque requete (nonce des scripts) par le
 * proxy ; les autres en-tetes sont statiques (`next.config.ts`).
 */

export type CspOptions = {
  nonce: string;
  isDev: boolean;
  /** URL du projet Supabase (API, Auth, Storage). */
  supabaseUrl?: string | undefined;
  /** Style de carte (MapTiler en production). */
  mapStyleUrl?: string | undefined;
  /** DSN Sentry (region UE) : seul son hote d'ingestion est autorise. */
  sentryDsn?: string | undefined;
};

const origin = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/** Services appeles depuis le navigateur ou dont les images sont affichees. */
export const ALWAYS_ALLOWED = {
  maps: ['https://api.maptiler.com', 'https://demotiles.maplibre.org'],
  // API Adresse et geo.api.gouv.fr : appelees cote serveur aujourd'hui, autorisees pour les composants client.
  geo: ['https://data.geopf.fr', 'https://geo.api.gouv.fr'],
};

export function buildCsp({ nonce, isDev, supabaseUrl, mapStyleUrl, sentryDsn }: CspOptions): string {
  const supabase = origin(supabaseUrl);
  const map = origin(mapStyleUrl);
  const sentry = origin(sentryDsn);
  const unique = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => Boolean(v)))];
  const connect = unique(["'self'", supabase, supabase?.replace(/^http/, 'ws') ?? null, map, ...ALWAYS_ALLOWED.maps, ...ALWAYS_ALLOWED.geo, sentry]);
  const images = unique(["'self'", 'data:', 'blob:', supabase, map, ...ALWAYS_ALLOWED.maps]);
  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])]],
    // Styles en ligne (attributs `style` de React, MapLibre) : risque limite, les scripts restent stricts.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', images],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', connect],
    // MapLibre charge ses workers depuis des blobs.
    ['worker-src', ["'self'", 'blob:']],
    ['child-src', ["'self'", 'blob:']],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
    ...(isDev ? [] : ([['upgrade-insecure-requests', []]] as [string, string[]][])),
  ];
  return directives.map(([name, values]) => [name, ...values].join(' ')).join('; ');
}

/** Nonce aleatoire (128 bits), different a chaque requete. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** En-tetes statiques appliques a toutes les reponses. */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    // Geolocalisation autorisee pour le dashboard lui-meme (placement d'un point) ; le reste est coupe.
    value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];
