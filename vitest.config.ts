import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    reporters: ['default'],
    hookTimeout: 15000,
    testTimeout: 20000,
    typecheck: {
      enabled: true,
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
    },
  },
});
