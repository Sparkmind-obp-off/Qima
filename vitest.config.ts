import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * QIMA test configuration — Phase 0 task T0.09 (Configure test framework).
 *
 * Test layout follows doc 09 §4 Testing Pyramid and the repository test
 * directories: tests/unit, tests/integration, tests/api, tests/e2e.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@qima/config': resolve(import.meta.dirname, 'packages/config/src/index.ts'),
      '@qima/shared': resolve(import.meta.dirname, 'packages/shared/src/index.ts'),
      '@qima/domain': resolve(import.meta.dirname, 'packages/domain/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // tests/e2e requires a running deployment; it is excluded from the default
    // unit/integration/api run and executed explicitly instead.
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
  },
});
