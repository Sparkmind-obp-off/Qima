import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { QIMA_CURRENT_PHASE, QIMA_PHASE_IDS } from '../../apps/api/src/phase';

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
 * API contract tests — infrastructure endpoints.
 *
 * Traceability: doc 05 §11 API Layer (`/api/v1` base path), doc 08 §17,
 * Quality Gate 6 (API Contract).
 *
 * These tests assert the transport contract of the infrastructure endpoints and
 * the absence of premature resource routes. The `phase` field reported by
 * `/meta` advances with the implemented phase, so it is asserted against the
 * canonical phase identifier rather than a frozen Phase 0 literal — otherwise
 * every phase transition would look like a regression instead of progress.
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
    // The reported phase must be the declared current phase and must belong to
    // the doc 10 §24 vocabulary — an invented or stale label is a defect.
    expect(body.data?.phase).toBe(QIMA_CURRENT_PHASE);
    expect(QIMA_PHASE_IDS).toContain(body.data?.phase);
  });

  it('reports the phase actually implemented by this artifact', async () => {
    // Phase 1 is the Database Foundation (doc 10 §24). Guarding the value here
    // keeps `/meta` honest: it may not advertise a phase whose scope is absent.
    expect(QIMA_CURRENT_PHASE).toBe('phase-1-database-foundation');
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

  /**
   * Updated by T2.03 (.codex/IMPLEMENTATION_RULES.md §16): `/api/v1/auth/login`
   * was previously asserted to be absent, which was correct while Phase 2 had
   * no transport surface. The login endpoint now legitimately exists, so the
   * assertion moves to the routes that are still genuinely unimplemented —
   * organizations and units are Phase 3 (doc 10 §24).
   */
  it('confirms not-yet-implemented resource routes are absent', async () => {
    for (const path of ['/api/v1/organizations', '/api/v1/units']) {
      const response = await app.request(path, {}, baseEnv);
      expect(response.status).toBe(404);
    }
  });

  /**
   * Phase 2 is partially implemented: T2.03 supplies login, while logout
   * (T2.04) and the user-context endpoint (T2.05+) do not exist yet. They must
   * answer 404 rather than a stub, so a client cannot mistake a placeholder for
   * a working capability (.codex/IMPLEMENTATION_RULES.md §3 Phase Rule).
   */
  it('confirms the remaining Phase 2 auth endpoints are not implemented yet', async () => {
    const logout = await app.request('/api/v1/auth/logout', { method: 'POST' }, baseEnv);
    expect(logout.status).toBe(404);

    const me = await app.request('/api/v1/auth/me', {}, baseEnv);
    expect(me.status).toBe(404);
  });
});
