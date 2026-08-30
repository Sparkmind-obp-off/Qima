import { describe, expect, it } from 'vitest';
import app from '../../src/index';

/** QIMA envelope shape for assertions, avoiding `any` in tests. */
interface TestEnvelope {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

async function readEnvelope(response: Response): Promise<TestEnvelope> {
  return (await response.json()) as TestEnvelope;
}

/**
 * API contract tests — Phase 0 infrastructure endpoints.
 *
 * Traceability: doc 05 §11 API Layer (`/api/v1` base path), doc 08 §17,
 * Quality Gate 6 (API Contract).
 *
 * Phase 0 exposes only infrastructure endpoints, so these tests assert the
 * transport contract and the absence of premature resource routes.
 */

const baseEnv = { APP_ENV: 'test' } as const;

describe('GET /api/v1/health', () => {
  it('responds with the canonical success envelope', async () => {
    const response = await app.request('/api/v1/health', {}, baseEnv);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      data: { service: 'qima-api', status: 'ok', environment: 'test', apiVersion: 'v1' },
    });
  });
});

describe('GET /api/v1/meta', () => {
  it('reports infrastructure wiring without leaking secret values', async () => {
    const response = await app.request('/api/v1/meta', {}, {
      APP_ENV: 'test',
      AUTH_SECRET: 'unit-test-secret',
    });

    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).not.toContain('unit-test-secret');

    const body = JSON.parse(text) as TestEnvelope;
    expect(body.ok).toBe(true);
    expect(body.data?.authSecretConfigured).toBe(true);
    expect(body.data?.databaseBound).toBe(false);
    expect(body.data?.phase).toBe('phase-0-bootstrap');
  });
});

describe('GET /api/v1/health/database', () => {
  it('fails explicitly when the database binding is absent instead of faking success', async () => {
    const response = await app.request('/api/v1/health/database', {}, baseEnv);

    expect(response.status).toBe(500);

    const body = await readEnvelope(response);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('INTERNAL_ERROR');
  });

  it('reports reachability when a database binding is provided', async () => {
    const DB = {
      prepare: () => ({ first: async () => ({ ok: 1 }) }),
    };

    const response = await app.request('/api/v1/health/database', {}, { ...baseEnv, DB });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ ok: true, data: { database: 'reachable', probe: 1 } });
  });

  it('does not leak internal error detail when the probe throws', async () => {
    const DB = {
      prepare: () => ({
        first: async () => {
          throw new Error('D1_ERROR: internal table qima_secret missing');
        },
      }),
    };

    const response = await app.request('/api/v1/health/database', {}, { ...baseEnv, DB });

    expect(response.status).toBe(500);

    const text = await response.text();
    expect(text).not.toContain('qima_secret');
    expect(text).not.toContain('D1_ERROR');
  });
});

describe('unknown API routes', () => {
  it('returns a NOT_FOUND envelope rather than falling through to HTML', async () => {
    const response = await app.request('/api/v1/programs', {}, baseEnv);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await readEnvelope(response);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('confirms Phase 1+ resource routes are not implemented yet', async () => {
    for (const path of ['/api/v1/auth/login', '/api/v1/organizations', '/api/v1/units']) {
      const response = await app.request(path, {}, baseEnv);
      expect(response.status).toBe(404);
    }
  });
});
