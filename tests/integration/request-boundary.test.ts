import { describe, expect, it } from 'vitest';
import app from '../../src/index';

/**
 * Integration tests — terminal request boundary.
 *
 * Traceability: doc 08 §12 (Error Handling Rule), doc 05 §12 (API Rule),
 * Quality Gate 3 (Runtime Behavior).
 *
 * Regression guard: an unmatched route previously left the Hono context
 * unfinalized, which the Cloudflare Pages worker wrapper surfaced as an opaque
 * HTTP 500 ("Context is not finalized") in the real runtime even though the
 * mounted routes themselves were correct. Every request must be finalized by
 * the application with a canonical envelope.
 */

interface Envelope {
  ok: boolean;
  error?: { code: string; message: string };
}

async function readEnvelope(response: Response): Promise<Envelope> {
  return (await response.json()) as Envelope;
}

const baseEnv = { APP_ENV: 'test' };

describe('unmatched web routes', () => {
  it('finalizes with 404 instead of an unfinalized context', async () => {
    const response = await app.request('/nonexistent-page', {}, baseEnv);

    expect(response.status).toBe(404);

    const body = await readEnvelope(response);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('finalizes unmatched nested web paths', async () => {
    for (const path of ['/admin', '/dashboard/units', '/a/b/c']) {
      const response = await app.request(path, {}, baseEnv);
      expect(response.status).toBe(404);
    }
  });
});

describe('unversioned API paths', () => {
  it('answers with a JSON envelope, never HTML', async () => {
    for (const path of ['/api', '/api/', '/api/health', '/api/v2/health']) {
      const response = await app.request(path, {}, baseEnv);

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain('application/json');

      const body = await readEnvelope(response);
      expect(body.error?.code).toBe('NOT_FOUND');
      expect(body.error?.message).toBe('API route not found.');
    }
  });
});

describe('non-GET methods on unmatched routes', () => {
  it('finalizes rather than falling through', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await app.request('/api/v1/not-a-route', { method }, baseEnv);
      expect(response.status).toBe(404);
    }
  });
});
