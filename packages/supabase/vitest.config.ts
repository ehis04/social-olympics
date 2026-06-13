import { defineConfig } from 'vitest/config';

const isCI = process.env.CI === 'true';

export default defineConfig({
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
