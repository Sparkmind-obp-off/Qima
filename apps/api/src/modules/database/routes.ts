/**
 * QIMA database foundation routes — Phase 1.
 *
 * Traceability:
 * - doc 10 §24 PHASE 1 exit criteria: "Fresh database migration",
 *   "Constraints validated", "Seed works" must be verifiable against a real
 *   deployment, not only in CI.
 * - doc 06 §20 API Architecture: mounted under `/api/v1`.
 * - doc 06 §21 API Response Contract: the shared envelope is used throughout.
 * - doc 08 §18 Controller Contract: controllers stay thin; the schema logic
 *   lives in the infrastructure layer.
 *
 * SECURITY BOUNDARY — deliberate design decision:
 * These endpoints expose ONLY schema-level metadata (table/index presence,
 * role and permission catalogue). They never expose tenant rows. Tenant data
 * endpoints require the authentication and authorization stack, which is
 * Phase 2 (doc 10 §24 PHASE 2), so exposing organization/unit/user *data*
 * here would create an unauthenticated read path — explicitly forbidden by
 * .codex/IMPLEMENTATION_RULES.md §9 Authorization Rule.
 *
 * The role/permission catalogue is seeded system reference data, identical for
 * every tenant, and contains no personal data.
 */

import { Hono } from 'hono';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import {
  createPermissionRepository,
  createRoleRepository,
} from '../../infrastructure/database/repositories';
import { verifyPhase1Schema } from '../../infrastructure/database/schema-inspector';
import type { QimaDatabase } from '../../infrastructure/database/d1-client';
import type { QimaBindings } from '../../bindings';

export const databaseRoutes = new Hono<{ Bindings: QimaBindings }>();

/** Resolve the binding as the structural database contract used internally. */
function resolveDatabase(env: QimaBindings | undefined): QimaDatabase | null {
  const binding = env?.DB;
  return binding === undefined || binding === null ? null : (binding as unknown as QimaDatabase);
}

/**
 * Schema verification probe.
 *
 * Reports whether the Phase 1 migration set has actually been applied to the
 * bound database. Returns HTTP 500 when the schema is incomplete: a
 * half-migrated database is a real failure and must not be reported as `ok`
 * (doc 08 §12 — no misleading success responses).
 */
databaseRoutes.get('/schema', async (c) => {
  const db = resolveDatabase(c.env);

  if (db === null) {
    return c.json(
      failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }

  try {
    const verification = await verifyPhase1Schema(db);

    if (!verification.complete) {
      return c.json(
        failure(
          'INTERNAL_ERROR',
          `Phase 1 schema is incomplete. Missing tables: ${
            verification.missingTables.join(', ') || 'none'
          }. Missing indexes: ${verification.missingIndexes.join(', ') || 'none'}.`,
        ),
        ERROR_STATUS.INTERNAL_ERROR,
      );
    }

    return c.json(
      success({
        phase: 'phase-1-database-foundation',
        schema: 'complete',
        tableCount: verification.tableCount,
      }),
    );
  } catch {
    return c.json(
      failure('INTERNAL_ERROR', 'Schema verification failed.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
});

/**
 * Seeded access-control catalogue.
 *
 * Verifies the "Seed works" exit criterion against a live database. System
 * reference data only — no tenant rows, no personal data.
 */
databaseRoutes.get('/access-catalog', async (c) => {
  const db = resolveDatabase(c.env);

  if (db === null) {
    return c.json(
      failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }

  try {
    const roleRepository = createRoleRepository(db);
    const permissionRepository = createPermissionRepository(db);

    const [roles, permissions] = await Promise.all([
      roleRepository.list(),
      permissionRepository.list(),
    ]);

    return c.json(
      success({
        roles: roles.map((role) => ({
          key: role.key,
          name: role.name,
          scopeLevel: role.scopeLevel,
          isSystem: role.isSystem,
        })),
        permissions: permissions.map((permission) => permission.key),
      }),
    );
  } catch {
    return c.json(
      failure('INTERNAL_ERROR', 'Access catalogue lookup failed.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
});
