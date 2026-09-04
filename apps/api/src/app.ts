/**
 * QIMA API surface.
 *
 * Traceability:
 * - Phase 0 task T0.04 (Configure API application) — doc 10 §24.
 * - Phase 1 (Database Foundation): the `/database/*` schema verification
 *   routes — doc 10 §24 PHASE 1 exit criteria.
 * - Phase 2 (Authentication & Access): the `/auth/*` routes — doc 10 §24
 *   PHASE 2, tasks T2.03 Login API, T2.04 Logout and T2.05 User context.
 * - doc 05 §11 API Layer: base path is `/api/v1`.
 * - doc 05 §12 API Rule / doc 08 §18 Controller Contract: controllers stay thin.
 * - doc 08 §13 Shared Module: responses use the shared envelope.
 *
 * Phase boundary: this file exposes infrastructure endpoints, schema
 * verification and the login/logout/current-user endpoints. The tenant resource routes listed in
 * doc 08 §17 (organizations, units, programs, ...) require the authorization
 * stack from T2.05-T2.09 and are deliberately NOT implemented here.
 */

import { Hono } from 'hono';
import { loadQimaConfig } from '@qima/config';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import type { QimaBindings } from './bindings';
import { authRoutes } from './modules/auth/routes';
import { databaseRoutes } from './modules/database/routes';
import { organizationRoutes, unitRoutes } from './modules/organization/routes';
import { programRoutes } from './modules/program/routes';
import { QIMA_CURRENT_PHASE } from './phase';

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
      phase: QIMA_CURRENT_PHASE,
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

/**
 * Phase 1 — Database Foundation routes (doc 10 §24).
 *
 * Registered before the catch-all so the wildcard below cannot shadow them.
 */
api.route('/database', databaseRoutes);

/**
 * Phase 2 — Authentication & Access routes (doc 10 §24), tasks T2.03–T2.05.
 *
 * Registered before the catch-all for the same reason as `/database`: the
 * wildcard below would otherwise answer every `/auth/*` call with 404.
 */
api.route('/auth', authRoutes);

/** Phase 3 — Organization & Unit resource routes (doc 06 §24-§25). */
api.route('/organizations', organizationRoutes);
api.route('/units', unitRoutes);

/** Phase 4 — Program resource routes (doc 06 §26). */
api.route('/programs', programRoutes);

/** Unknown API routes must not fall through to the web surface. */
api.all('*', (c) =>
  c.json(failure('NOT_FOUND', 'API route not found.'), ERROR_STATUS.NOT_FOUND),
);
