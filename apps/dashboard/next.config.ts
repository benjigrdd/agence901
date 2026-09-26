import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@app/shared', '@app/data'],
};

export default nextConfig;
