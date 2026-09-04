import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Integration tests — deployment artifact contract.
 *
 * Traceability: .agents/genspark/GENSPARK_DEPLOYMENT_SPEC.md (Cloudflare Pages
 * target), doc 08 §4 (Canonical Repository Structure), Quality Gate 2 (Build).
 *
 * Regression guard: the Cloudflare Pages plugin resolves `src/index.tsx` by
 * default, while the QIMA deployment entry point is `src/index.ts`. That
 * mismatch produced a worker bundle which type-checked, built, and passed every
 * source-level test, yet failed at runtime with
 * "Can't import modules from ['/src/index.tsx', '/app/server.ts']".
 * Source-level tests cannot detect it, so the built artifact is asserted here.
 *
 * These assertions require `npm run build` to have produced ./dist, which the
 * `verify` script guarantees (build runs before test).
 */

const distDir = resolve(import.meta.dirname, '../../dist');

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe('worker bundle', () => {
  it('is emitted from the declared QIMA entry point', async () => {
    const workerPath = resolve(distDir, '_worker.js');
    expect(await exists(workerPath)).toBe(true);

    const bundle = await readFile(workerPath, 'utf8');

    // The plugin default must not leak into the artifact.
    expect(bundle).not.toContain('src/index.tsx');
    expect(bundle).not.toContain('/app/server.ts');
  });

  it('actually contains the composed application routes', async () => {
    const bundle = await readFile(resolve(distDir, '_worker.js'), 'utf8');

    // Proof that the app code is bundled, not just the plugin scaffold.
    expect(bundle).toContain('/api/v1');
    expect(bundle).toContain('qima-api');
    expect(bundle).toContain('/organizations');
    expect(bundle).toContain('/units');
    expect(bundle).toContain('/programs');
    expect(bundle).toContain('/activities');
    expect(bundle).toContain('API route not found.');
  });

  it('registers the terminal boundaries as route-level constructs', async () => {
    const bundle = await readFile(resolve(distDir, '_worker.js'), 'utf8');

    // Regression guard: the Pages plugin forwards the not-found handler with
    // `worker.notFound(app.notFoundHandler)`, but `notFoundHandler` is a
    // private field in Hono 4.x and reads `undefined`. Likewise
    // `worker.route()` does not copy an `onError` handler. Both boundaries must
    // therefore exist as a wildcard route / middleware to survive bundling —
    // otherwise unmatched requests fail at runtime with HTTP 500
    // "Context is not finalized" while every source-level test still passes.
    expect(bundle).toContain('Resource not found.');
    expect(bundle).toContain('Unexpected server error.');
    expect(bundle).toMatch(/\.all\(\s*`\*`|\.all\(\s*['"]\*['"]/);
    expect(bundle).toMatch(/\.use\(\s*`\*`|\.use\(\s*['"]\*['"]/);
  });
});

describe('static assets', () => {
  it('ships the design tokens and bootstrap client script', async () => {
    expect(await exists(resolve(distDir, 'static/tokens.css'))).toBe(true);
    expect(await exists(resolve(distDir, 'static/bootstrap.js'))).toBe(true);
    expect(await exists(resolve(distDir, 'static/programs.js'))).toBe(true);
  });

  it('excludes static assets from the worker route so they are served directly', async () => {
    const routes = JSON.parse(await readFile(resolve(distDir, '_routes.json'), 'utf8')) as {
      include: string[];
      exclude: string[];
    };

    expect(routes.include).toContain('/*');
    expect(routes.exclude).toContain('/static/*');
  });
});

describe('artifact secret hygiene', () => {
  it('never embeds a real credential in the deployed bundle', async () => {
    const bundle = await readFile(resolve(distDir, '_worker.js'), 'utf8');

    // Quality Gate 10: the bundle may reference binding NAMES, never values.
    expect(bundle).not.toMatch(/AUTH_SECRET\s*[:=]\s*['"][^'"]+['"]/);
    expect(bundle).not.toMatch(/\bsk-[A-Za-z0-9]{20,}/);
    expect(bundle).not.toMatch(/\bghp_[A-Za-z0-9]{20,}/);
  });
});
