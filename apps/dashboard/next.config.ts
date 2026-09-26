import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@app/shared', '@app/data'],
  experimental: {
    // Active `forbidden()` : vraie reponse 403 quand le niveau de droit est insuffisant.
    authInterrupts: true,
    // Images redimensionnees (2 000 px, WebP) envoyees en data URL tant que le stockage est simule.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
