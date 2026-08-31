import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { createMigratedDatabase } from '../integration/sqlite-harness';

/**
 * Phase 1 API contract tests — `/api/v1/database/*`.
 *
 * Traceability:
 * - doc 10 §24 PHASE 1 exit criteria, verified through the real HTTP surface.
 * - doc 06 §21 API Response Contract (shared envelope).
 * - .codex/IMPLEMENTATION_RULES.md §9 Authorization Rule: these endpoints must
 *   expose schema/reference metadata only, never tenant rows.
 *
 * The bindings passed to `app.request` are a real migrated SQLite database, so
 * these tests exercise the same code path a deployed Worker takes.
 */

interface TestEnvelope {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

const baseEnv = { APP_ENV: 'test' } as const;

async function envWithDatabase(options?: { seed?: boolean; migrate?: boolean }) {
  const database =
    options?.migrate === false
      ? await (async () => {
          // An empty, unmigrated database: the "half-deployed" failure mode.
          const { DatabaseSync } = await import('node:sqlite');
          const raw = new DatabaseSync(':memory:');
          return { raw, db: { prepare: (q: string) => raw.prepare(q) }, close: () => raw.close() };
        })()
      : await createMigratedDatabase({ seed: options?.seed });

  // Adapt the harness database to the shape a D1 binding exposes.
  const DB = {
    prepare(query: string) {
      let bound: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          bound = values;
          return statement;
        },
        async first() {
          return database.raw.prepare(query).get(...(bound as never[])) ?? null;
        },
        async all() {
          return { results: database.raw.prepare(query).all(...(bound as never[])) };
        },
        async run() {
          return database.raw.prepare(query).run(...(bound as never[]));
        },
      };
      return statement;
    },
  };

  return { env: { ...baseEnv, DB }, close: () => database.close() };
}

describe('GET /api/v1/database/schema', () => {
  it('reports a complete schema against a migrated database', async () => {
    const { env, close } = await envWithDatabase();

    try {
      const response = await app.request('/api/v1/database/schema', {}, env);

      expect(response.status).toBe(200);

      const body = (await response.json()) as TestEnvelope;
      expect(body.ok).toBe(true);
      expect(body.data?.schema).toBe('complete');
      expect(body.data?.phase).toBe('phase-1-database-foundation');
    } finally {
      close();
    }
  });

  it('fails loudly when the schema is missing rather than reporting ok', async () => {
    const { env, close } = await envWithDatabase({ migrate: false });

    try {
      const response = await app.request('/api/v1/database/schema', {}, env);

      // A half-migrated deployment is a real failure: it must not read as healthy.
      expect(response.status).toBe(500);

      const body = (await response.json()) as TestEnvelope;
      expect(body.ok).toBe(false);
      expect(body.error?.code).toBe('INTERNAL_ERROR');
      expect(body.error?.message).toMatch(/incomplete/i);
    } finally {
      close();
    }
  });

  it('fails explicitly when no database binding is configured', async () => {
    const response = await app.request('/api/v1/database/schema', {}, baseEnv);

    expect(response.status).toBe(500);

    const body = (await response.json()) as TestEnvelope;
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('INTERNAL_ERROR');
  });
});

describe('GET /api/v1/database/access-catalog', () => {
  it('returns the seeded role and permission catalogue', async () => {
    const { env, close } = await envWithDatabase({ seed: true });

    try {
      const response = await app.request('/api/v1/database/access-catalog', {}, env);

      expect(response.status).toBe(200);

      const body = (await response.json()) as TestEnvelope;
      expect(body.ok).toBe(true);

      const roles = body.data?.roles as { key: string; scopeLevel: string }[];
      const permissions = body.data?.permissions as string[];

      expect(roles.map((role) => role.key)).toContain('ORG_ADMIN');
      expect(permissions).toContain('units.read');
    } finally {
      close();
    }
  });

  it('exposes no tenant data and no credential field', async () => {
    const { env, close } = await envWithDatabase({ seed: true });

    try {
      // Tenant rows and a user exist in the database; the response must ignore them.
      const response = await app.request('/api/v1/database/access-catalog', {}, env);
      const text = await response.text();

      expect(text).not.toContain('password');
      expect(text).not.toContain('email');
      expect(text.toLowerCase()).not.toContain('organization_id');
    } finally {
      close();
    }
  });
});

describe('Phase 2+ resource routes remain unimplemented', () => {
  it('does not expose tenant resource endpoints yet', async () => {
    const { env, close } = await envWithDatabase({ seed: true });

    try {
      // Phase 1 is the database foundation only: authenticated tenant reads
      // require the Phase 2 authorization stack (doc 10 §24). A route that
      // answered here would be an unauthenticated tenant read path.
      for (const path of [
        '/api/v1/auth/login',
        '/api/v1/organizations',
        '/api/v1/units',
        '/api/v1/users',
        '/api/v1/audit-logs',
      ]) {
        const response = await app.request(path, {}, env);
        expect(response.status, `${path} must not be implemented yet`).toBe(404);
      }
    } finally {
      close();
    }
  });
});
