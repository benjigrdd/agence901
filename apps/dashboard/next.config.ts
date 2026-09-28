import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

import { STATIC_SECURITY_HEADERS } from './src/lib/security-headers';

const nextConfig: NextConfig = {
  // Build separe pour les tests E2E sur Supabase (NEXT_PUBLIC_* sont figees au build).
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@app/shared', '@app/data'],
  // Image autonome (Dockerfile) : le dashboard reste deployable hors Vercel (docs/souverainete.md).
  output: 'standalone',
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: STATIC_SECURITY_HEADERS }];
  },
  experimental: {
    // Active `forbidden()` : vraie reponse 403 quand le niveau de droit est insuffisant.
    authInterrupts: true,
    // Images redimensionnees (2 000 px, WebP) envoyees en data URL tant que le stockage est simule.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

// Source maps envoyees a Sentry au build si SENTRY_AUTH_TOKEN est defini (CI / Vercel), puis retirees du
// deploiement. Sans jeton : build normal, rien n'est envoye.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sentryUrl: process.env.SENTRY_URL ?? 'https://de.sentry.io/',
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
});
