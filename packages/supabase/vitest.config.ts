/*
 * This file defines the vitest.config module.
 */

import { defineConfig } from 'vitest/config';

const isCI = process.env.CI === 'true';

export default defineConfig({
  // This server-only package must not inherit CSS tooling from parent projects.
  css: { postcss: { plugins: [] } },
  test: {
    globals: true,
    environment: 'node',

    exclude: isCI
      ? ['**/node_modules/**', '**/tests/**']
      : ['**/node_modules/**'],
    passWithNoTests: true,
    testTimeout: 15000,
  },
});
