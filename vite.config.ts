import { defineConfig } from 'vite';
import pages from '@hono/vite-cloudflare-pages';

/**
 * QIMA build configuration — Phase 0 task T0.01/T0.03/T0.04.
 * Target: Cloudflare Pages (.agents/genspark/GENSPARK_DEPLOYMENT_SPEC.md).
 *
 * `entry` must be declared explicitly: the plugin default resolves
 * `src/index.tsx`, while the QIMA deployment entry point is `src/index.ts`
 * (no JSX at the composition layer). Without it the plugin emits a worker that
 * fails at runtime with "Can't import modules from ['/src/index.tsx', ...]".
 */
export default defineConfig({
  plugins: [pages({ entry: 'src/index.ts' })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
