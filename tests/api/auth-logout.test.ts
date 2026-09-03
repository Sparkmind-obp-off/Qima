import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { createMigratedDatabase, type TestDatabase } from '../integration/sqlite-harness';

/**
 * Phase 2 API contract tests — `POST /api/v1/auth/logout` (task T2.04).
 *
 * These tests exercise the complete Worker path against migrated SQLite:
 * bearer parsing, token hashing, session lookup, domain validity and revocation.
 */

const USER_ID = '99999999-0000-4000-8000-000000000501';
const EMAIL = 'api.logout@example.com';
const PASSWORD = 'ApiLogoutPass#2026';
const baseEnv = { APP_ENV: 'test' } as const;

interface TestEnvelope {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

function asBinding(database: TestDatabase) {
  return {
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
}

async function authenticatedEnv() {
  const database = await createMigratedDatabase();
  const hash = await webCryptoPasswordHasher.hash(PASSWORD);
  database.exec(`
    insert into users (id, name, email, password_hash, status)
    values ('${USER_ID}', 'API Logout', '${EMAIL}', '${hash}', 'active');
  `);
  const env = { ...baseEnv, DB: asBinding(database) };
  const login = await app.request(
    '/api/v1/auth/login',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    },
    env,
  );
  const body = (await login.json()) as TestEnvelope;

  return {
    database,
    env,
    token: body.data?.access_token as string,
    close: () => database.close(),
  };
}

function logoutRequest(token: string) {
  return {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  };
}

describe('POST /api/v1/auth/logout — success contract', () => {
  it('returns 200 and invalidates the presented active session', async () => {
    const context = await authenticatedEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/logout',
        logoutRequest(context.token),
        context.env,
      );
      const body = (await response.json()) as TestEnvelope;

      expect(response.status).toBe(200);
      expect(body).toEqual({ ok: true, data: { logged_out: true } });

      const row = context.database.raw
        .prepare('select revoked_at from sessions where user_id = ?')
        .get(USER_ID) as { revoked_at: string | null };
      expect(row.revoked_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    } finally {
      context.close();
    }
  });

  it('revokes only the session represented by the bearer token', async () => {
    const context = await authenticatedEnv();
    try {
      const secondLogin = await app.request(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
        },
        context.env,
      );
      const secondBody = (await secondLogin.json()) as TestEnvelope;
      const secondToken = secondBody.data?.access_token as string;

      await app.request('/api/v1/auth/logout', logoutRequest(context.token), context.env);

      const secondLogout = await app.request(
        '/api/v1/auth/logout',
        logoutRequest(secondToken),
        context.env,
      );
      expect(secondLogout.status).toBe(200);
    } finally {
      context.close();
    }
  });
});

describe('POST /api/v1/auth/logout — authentication boundary', () => {
  it.each([
    ['missing header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['empty bearer', 'Bearer '],
    ['additional whitespace', `Bearer  ${'A'.repeat(43)}`],
    ['comma-joined credentials', `Bearer ${'A'.repeat(43)},Bearer ${'B'.repeat(43)}`],
    ['malformed token', 'Bearer not-a-qima-token'],
  ])('returns 401 UNAUTHENTICATED for %s', async (_label, authorization) => {
    const headers: Record<string, string> =
      authorization === undefined ? {} : { authorization };
    const response = await app.request('/api/v1/auth/logout', { method: 'POST', headers }, baseEnv);
    const body = (await response.json()) as TestEnvelope;

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe('UNAUTHENTICATED');
  });

  it('returns the same 401 response for unknown and already-revoked tokens', async () => {
    const context = await authenticatedEnv();
    try {
      await app.request('/api/v1/auth/logout', logoutRequest(context.token), context.env);

      const repeated = await app.request(
        '/api/v1/auth/logout',
        logoutRequest(context.token),
        context.env,
      );
      const unknown = await app.request(
        '/api/v1/auth/logout',
        logoutRequest('A'.repeat(43)),
        context.env,
      );

      expect(repeated.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(await repeated.text()).toBe(await unknown.text());
    } finally {
      context.close();
    }
  });

  it('does not accept GET on the logout route', async () => {
    const response = await app.request('/api/v1/auth/logout', {}, baseEnv);
    expect(response.status).toBe(404);
  });
});

describe('POST /api/v1/auth/logout — infrastructure failures', () => {
  it('returns 500 when a valid-looking token is supplied without a database binding', async () => {
    const response = await app.request(
      '/api/v1/auth/logout',
      logoutRequest('A'.repeat(43)),
      baseEnv,
    );
    const body = (await response.json()) as TestEnvelope;

    expect(response.status).toBe(500);
    expect(body.error?.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 without leaking driver detail when session lookup fails', async () => {
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(':memory:');
    const database = {
      raw,
      db: {
        prepare(query: string) {
          let bound: unknown[] = [];
          const statement = {
            bind(...values: unknown[]) {
              bound = values;
              return statement;
            },
            async first() {
              return raw.prepare(query).get(...(bound as never[])) ?? null;
            },
            async all() {
              return { results: raw.prepare(query).all(...(bound as never[])) };
            },
            async run() {
              return raw.prepare(query).run(...(bound as never[]));
            },
          };
          return statement;
        },
      },
    } as unknown as TestDatabase;

    try {
      const response = await app.request(
        '/api/v1/auth/logout',
        logoutRequest('A'.repeat(43)),
        { ...baseEnv, DB: asBinding(database) },
      );
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).not.toContain('no such table');
      expect(text).not.toContain('select');
    } finally {
      raw.close();
    }
  });
});
