import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { createMigratedDatabase, type TestDatabase } from '../integration/sqlite-harness';

/** Phase 2 API contract tests — `GET /api/v1/auth/me` (task T2.05). */

const USER_ID = '99999999-0000-4000-8000-000000000701';
const EMAIL = 'api.me@example.com';
const PASSWORD = 'ApiCurrentUser#2026';
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
    insert into users (id, name, email, phone, password_hash, status)
    values ('${USER_ID}', 'API Current User', '${EMAIL}', '+628100000007', '${hash}', 'active');
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

function meRequest(token: string) {
  return { headers: { authorization: `Bearer ${token}` } };
}

describe('GET /api/v1/auth/me — authenticated user context', () => {
  it('returns the active session user through the canonical envelope', async () => {
    const context = await authenticatedEnv();
    try {
      const response = await app.request('/api/v1/auth/me', meRequest(context.token), context.env);
      const body = (await response.json()) as TestEnvelope;

      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        data: {
          user: {
            id: USER_ID,
            name: 'API Current User',
            email: EMAIL,
            status: 'active',
          },
          platform_roles: [],
          organizations: [],
          units: [],
          permissions: [],
        },
      });
    } finally {
      context.close();
    }
  });

  it('records successful session activity without exposing the bearer token', async () => {
    const context = await authenticatedEnv();
    try {
      const response = await app.request('/api/v1/auth/me', meRequest(context.token), context.env);
      const text = await response.text();
      const row = context.database.raw
        .prepare('select token_hash, last_used_at from sessions where user_id = ?')
        .get(USER_ID) as { token_hash: string; last_used_at: string | null };

      expect(row.last_used_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(row.token_hash).not.toBe(context.token);
      expect(text).not.toContain(context.token);
      expect(text).not.toContain('password');
    } finally {
      context.close();
    }
  });

  it('rejects a session whose user became suspended after login', async () => {
    const context = await authenticatedEnv();
    try {
      context.database.raw.prepare("update users set status = 'suspended' where id = ?").run(USER_ID);

      const response = await app.request('/api/v1/auth/me', meRequest(context.token), context.env);
      const body = (await response.json()) as TestEnvelope;

      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHENTICATED');
      const row = context.database.raw
        .prepare('select last_used_at from sessions where user_id = ?')
        .get(USER_ID) as { last_used_at: string | null };
      expect(row.last_used_at).toBeNull();
    } finally {
      context.close();
    }
  });

  it('rejects the same token after logout', async () => {
    const context = await authenticatedEnv();
    try {
      await app.request(
        '/api/v1/auth/logout',
        { method: 'POST', headers: meRequest(context.token).headers },
        context.env,
      );

      const response = await app.request('/api/v1/auth/me', meRequest(context.token), context.env);
      expect(response.status).toBe(401);
    } finally {
      context.close();
    }
  });
});

describe('GET /api/v1/auth/me — authentication boundary', () => {
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
    const response = await app.request('/api/v1/auth/me', { headers }, baseEnv);
    const body = (await response.json()) as TestEnvelope;

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe('UNAUTHENTICATED');
  });

  it('returns the same 401 response for unknown and revoked sessions', async () => {
    const context = await authenticatedEnv();
    try {
      await app.request(
        '/api/v1/auth/logout',
        { method: 'POST', headers: meRequest(context.token).headers },
        context.env,
      );
      const revoked = await app.request('/api/v1/auth/me', meRequest(context.token), context.env);
      const unknown = await app.request('/api/v1/auth/me', meRequest('A'.repeat(43)), context.env);

      expect(revoked.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(await revoked.text()).toBe(await unknown.text());
    } finally {
      context.close();
    }
  });

  it('does not accept POST on the current-user route', async () => {
    const response = await app.request('/api/v1/auth/me', { method: 'POST' }, baseEnv);
    expect(response.status).toBe(404);
  });
});

describe('GET /api/v1/auth/me — infrastructure failures', () => {
  it('returns 500 when a valid-looking token is supplied without a database binding', async () => {
    const response = await app.request('/api/v1/auth/me', meRequest('A'.repeat(43)), baseEnv);
    const body = (await response.json()) as TestEnvelope;

    expect(response.status).toBe(500);
    expect(body.error?.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 without leaking driver detail when session lookup fails', async () => {
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(':memory:');
    const database = {
      raw,
      db: asBinding({ raw } as unknown as TestDatabase),
    } as unknown as TestDatabase;

    try {
      const response = await app.request(
        '/api/v1/auth/me',
        meRequest('A'.repeat(43)),
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
