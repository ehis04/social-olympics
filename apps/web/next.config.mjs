const isDevelopment = process.env.NODE_ENV !== 'production';

const supabaseImageSources = isDevelopment
  ? "https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321"
  : 'https://*.supabase.co';

const supabaseConnectSources = isDevelopment
  ? "https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 ws://127.0.0.1:54321 http://localhost:54321 ws://localhost:54321"
  : 'https://*.supabase.co wss://*.supabase.co';

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: [
    '@repo/ui',
    '@repo/types',
    '@repo/constants',
    '@repo/validations',
    '@repo/scoring',
    '@repo/supabase',
  ],
  images: {
    dangerouslyAllowLocalIP: isDevelopment,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  typedRoutes: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${supabaseImageSources}`,
              "font-src 'self'",
              `connect-src 'self' ${supabaseConnectSources} https://*.upstash.io`,
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default config;
