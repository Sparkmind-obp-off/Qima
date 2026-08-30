/**
 * QIMA API surface — Phase 0 skeleton.
 *
 * Traceability:
 * - Phase 0 task T0.04 (Configure API application) — doc 10 §24.
 * - doc 05 §11 API Layer: base path is `/api/v1`.
 * - doc 05 §12 API Rule / doc 08 §18 Controller Contract: controllers stay thin.
 * - doc 08 §13 Shared Module: responses use the shared envelope.
 *
 * Phase 0 boundary: this file exposes ONLY infrastructure endpoints
 * (`/health`, `/meta`). The resource routes listed in doc 08 §17
 * (auth, organizations, units, programs, ...) belong to Phase 1+ and are
 * deliberately NOT implemented here.
 */

import { Hono } from 'hono';
import { loadQimaConfig } from '@qima/config';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import type { QimaBindings } from './bindings';

export const api = new Hono<{ Bindings: QimaBindings }>();

/**
 * Liveness probe. Intentionally unauthenticated: it exposes no tenant data.
 * Used by the deployment spec's post-deploy health check.
 */
api.get('/health', (c) => {
  const config = loadQimaConfig(c.env as unknown as Record<string, string | undefined>);

  return c.json(
    success({
      service: 'qima-api',
      status: 'ok',
      environment: config.appEnv,
      apiVersion: 'v1',
    }),
  );
});

/**
 * Deployment metadata for post-deploy verification.
 *
 * Reports only whether infrastructure is wired — never secret values
 * (doc 08 §21 Configuration Rule, Quality Gate 10).
 */
api.get('/meta', (c) => {
  const config = loadQimaConfig(c.env as unknown as Record<string, string | undefined>);

  return c.json(
    success({
      service: 'qima-api',
      phase: 'phase-0-bootstrap',
      apiBasePath: config.apiBasePath,
      environment: config.appEnv,
      databaseBound: c.env?.DB !== undefined,
      authSecretConfigured: config.hasAuthSecret,
    }),
  );
});

/**
 * Database connectivity probe.
 *
 * Returns BLOCKED-style failure rather than a misleading success when the D1
 * binding is absent (doc 08 §12 Error Handling Rule).
 */
api.get('/health/database', async (c) => {
  if (c.env?.DB === undefined) {
    return c.json(
      failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }

  try {
    const row = await c.env.DB.prepare('select 1 as ok').first<{ ok: number }>();
    return c.json(success({ database: 'reachable', probe: row?.ok ?? null }));
  } catch {
    // Internal error details are never forwarded to the client.
    return c.json(
      failure('INTERNAL_ERROR', 'Database probe failed.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
});

/** Unknown API routes must not fall through to the web surface. */
api.all('*', (c) =>
  c.json(failure('NOT_FOUND', 'API route not found.'), ERROR_STATUS.NOT_FOUND),
);
