import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build separe pour les tests E2E sur Supabase (NEXT_PUBLIC_* sont figees au build).
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@app/shared', '@app/data'],
  experimental: {
    // Active `forbidden()` : vraie reponse 403 quand le niveau de droit est insuffisant.
    authInterrupts: true,
    // Images redimensionnees (2 000 px, WebP) envoyees en data URL tant que le stockage est simule.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
