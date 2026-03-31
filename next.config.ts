import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:locale(en|ru)/auth/callback',
        destination: '/auth/callback',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
