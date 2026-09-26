import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@app/shared', '@app/data'],
  experimental: {
    // Active `forbidden()` : vraie reponse 403 quand le niveau de droit est insuffisant.
    authInterrupts: true,
  },
};

export default nextConfig;
