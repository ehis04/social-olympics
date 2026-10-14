/*
 * This file defines the eslint.config module.
 */

import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  // Build output from Next.js, OpenNext (Cloudflare) and Playwright is never linted.
  { ignores: ['.next/**', '.open-next/**', '.wrangler/**', 'test-results/**', 'playwright-report/**'] },
  ...nextVitals,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export default config;
