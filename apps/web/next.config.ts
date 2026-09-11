import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@etk/scoring', '@etk/rules-config', '@etk/items'],
  serverExternalPackages: ['@prisma/client', 'prisma'],
  poweredByHeader: false,
  outputFileTracingIncludes: { '/api/setup': ['./prisma/sql/**'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
