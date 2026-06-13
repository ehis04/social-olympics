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
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: { typedRoutes: true },
};

export default config;
