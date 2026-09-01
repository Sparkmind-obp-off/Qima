import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { SESSION_TTL_SECONDS } from '@qima/domain';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { isWellFormedSessionToken } from '../../apps/api/src/infrastructure/security/session-token-service';
import { createMigratedDatabase, type TestDatabase } from '../integration/sqlite-harness';

/**
 * Phase 2 API contract tests — `POST /api/v1/auth/login` (task T2.03).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 task T2.03 Login API.
 * - doc 06 §23 AUTH API: request `{ email, password }`, response
 *   `{ data: { user, access_token, expires_at } }`.
 * - doc 06 §21 API Response Contract, §22 HTTP Status Contract.
 * - doc 06 §42 API Security Contract: no account-enumeration signal, no
 *   credential material in a response.
 * - .codex/QUALITY_GATES.md Gate 6 (API contract), Gate 10 (security).
 *
 * The bindings passed to `app.request` are a real migrated SQLite database, so
 * these tests exercise the same code path a deployed Worker takes: real PBKDF2
 * verification, a real `sessions` insert, and the real response envelope.
 */

interface TestEnvelope {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}

const USER_ID = '99999999-0000-4000-8000-000000000301';
const SUSPENDED_ID = '99999999-0000-4000-8000-000000000302';
const DELETED_ID = '99999999-0000-4000-8000-000000000303';

const EMAIL = 'api.login@example.com';
const SUSPENDED_EMAIL = 'api.suspended@example.com';
const DELETED_EMAIL = 'api.deleted@example.com';

const PASSWORD = 'ApiLoginPass#2026';
const WRONG_PASSWORD = 'ApiLoginPass#2027';

const baseEnv = { APP_ENV: 'test' } as const;

/** Adapt the harness database to the shape a D1 binding exposes. */
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

async function loginEnv() {
  const database = await createMigratedDatabase();
  const hash = await webCryptoPasswordHasher.hash(PASSWORD);

  database.exec(`
    insert into users (id, name, email, phone, password_hash, status, deleted_at) values
      ('${USER_ID}', 'Api Login', '${EMAIL}', '+628100000001', '${hash}', 'active', null),
      ('${SUSPENDED_ID}', 'Api Suspended', '${SUSPENDED_EMAIL}', null, '${hash}', 'suspended', null),
      ('${DELETED_ID}', 'Api Deleted', '${DELETED_EMAIL}', null, '${hash}', 'active', '2026-01-01T00:00:00Z');
  `);

  return {
    env: { ...baseEnv, DB: asBinding(database) },
    database,
    close: () => database.close(),
  };
}

function loginRequest(body: unknown, options: { raw?: string } = {}) {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'cf-connecting-ip': '203.0.113.44',
      'user-agent': 'qima-contract-test/1.0',
    },
    body: options.raw ?? JSON.stringify(body),
  };
}

describe('POST /api/v1/auth/login — success contract (doc 06 §23)', () => {
  it('returns 200 with user, access_token and expires_at', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: PASSWORD }),
        context.env,
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as TestEnvelope;
      expect(body.ok).toBe(true);
      expect(body.data).toBeDefined();

      // Published field names are part of the contract and are snake_case.
      expect(Object.keys(body.data ?? {}).sort()).toEqual([
        'access_token',
        'expires_at',
        'user',
      ]);
    } finally {
      context.close();
    }
  });

  it('publishes a well-formed session token', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: PASSWORD }),
        context.env,
      );

      const body = (await response.json()) as TestEnvelope;
      const token = body.data?.access_token as string;

      expect(typeof token).toBe('string');
      expect(isWellFormedSessionToken(token)).toBe(true);
    } finally {
      context.close();
    }
  });

  it('persists a session whose stored hash is not the published token', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: PASSWORD }),
        context.env,
      );

      const body = (await response.json()) as TestEnvelope;
      const token = body.data?.access_token as string;

      const rows = context.database.raw
        .prepare('select id, user_id, token_hash, ip_address, user_agent from sessions')
        .all() as { user_id: string; token_hash: string; ip_address: string; user_agent: string }[];

      expect(rows).toHaveLength(1);
      expect(rows[0]?.user_id).toBe(USER_ID);
      // The decisive Gate 10 assertion at the storage layer: the bearer value
      // the client received must not be what the database holds.
      expect(rows[0]?.token_hash).not.toBe(token);
      expect(rows[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/);
      // Request provenance is recorded from transport headers (doc 09 §38).
      expect(rows[0]?.ip_address).toBe('203.0.113.44');
      expect(rows[0]?.user_agent).toBe('qima-contract-test/1.0');
    } finally {
      context.close();
    }
  });

  it('returns expires_at consistent with the declared session TTL', async () => {
    const context = await loginEnv();
    try {
      const before = Date.now();
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: PASSWORD }),
        context.env,
      );
      const after = Date.now();

      const body = (await response.json()) as TestEnvelope;
      const expiresAt = Date.parse(body.data?.expires_at as string);

      expect(Number.isNaN(expiresAt)).toBe(false);
      expect(expiresAt).toBeGreaterThanOrEqual(before + SESSION_TTL_SECONDS * 1000 - 5000);
      expect(expiresAt).toBeLessThanOrEqual(after + SESSION_TTL_SECONDS * 1000 + 5000);
    } finally {
      context.close();
    }
  });

  it('never returns credential material in the response body (Gate 10)', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: PASSWORD }),
        context.env,
      );

      const text = await response.text();

      // Neither the submitted password nor any stored hash may be echoed.
      expect(text).not.toContain(PASSWORD);
      expect(text).not.toContain('pbkdf2-sha256');
      expect(text).not.toContain('password_hash');
      expect(text).not.toContain('passwordHash');
    } finally {
      context.close();
    }
  });

  it('projects the public user fields only', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: PASSWORD }),
        context.env,
      );

      const body = (await response.json()) as TestEnvelope;
      const user = body.data?.user as Record<string, unknown>;

      expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name', 'status']);
      expect(user.id).toBe(USER_ID);
      expect(user.email).toBe(EMAIL);
      expect(user.status).toBe('active');
      // Phone is a profile detail, not part of an authentication response.
      expect(user).not.toHaveProperty('phone');
    } finally {
      context.close();
    }
  });

  it('accepts a mixed-case email (stored emails are lowercase)', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: 'API.Login@Example.COM', password: PASSWORD }),
        context.env,
      );

      expect(response.status).toBe(200);
    } finally {
      context.close();
    }
  });
});

describe('POST /api/v1/auth/login — authentication failures (doc 06 §42)', () => {
  it('returns 401 UNAUTHENTICATED for a wrong password', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: WRONG_PASSWORD }),
        context.env,
      );

      expect(response.status).toBe(401);

      const body = (await response.json()) as TestEnvelope;
      expect(body.ok).toBe(false);
      expect(body.error?.code).toBe('UNAUTHENTICATED');
    } finally {
      context.close();
    }
  });

  it('creates no session when authentication fails', async () => {
    const context = await loginEnv();
    try {
      await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: WRONG_PASSWORD }),
        context.env,
      );

      const count = context.database.raw
        .prepare('select count(*) as total from sessions')
        .get() as { total: number };

      expect(count.total).toBe(0);
    } finally {
      context.close();
    }
  });

  it('answers identically for an unknown email and a wrong password', async () => {
    const context = await loginEnv();
    try {
      const unknown = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: 'nobody.at.all@example.com', password: PASSWORD }),
        context.env,
      );
      const wrong = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: WRONG_PASSWORD }),
        context.env,
      );

      // Byte-identical bodies and equal status: this is the account-enumeration
      // defence, and it is the single most important assertion in this file.
      expect(unknown.status).toBe(wrong.status);
      expect(await unknown.text()).toBe(await wrong.text());
    } finally {
      context.close();
    }
  });

  it('answers identically for a suspended account and a wrong password', async () => {
    const context = await loginEnv();
    try {
      const suspended = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: SUSPENDED_EMAIL, password: PASSWORD }),
        context.env,
      );
      const wrong = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: WRONG_PASSWORD }),
        context.env,
      );

      // A distinguishable "account suspended" response would confirm the email
      // is registered, which doc 06 §42 forbids.
      expect(suspended.status).toBe(401);
      expect(await suspended.text()).toBe(await wrong.text());
    } finally {
      context.close();
    }
  });

  it('issues no session for a suspended account with the correct password', async () => {
    const context = await loginEnv();
    try {
      await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: SUSPENDED_EMAIL, password: PASSWORD }),
        context.env,
      );

      const count = context.database.raw
        .prepare('select count(*) as total from sessions')
        .get() as { total: number };

      expect(count.total).toBe(0);
    } finally {
      context.close();
    }
  });

  it('refuses a soft-deleted account (doc 06 §38)', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: DELETED_EMAIL, password: PASSWORD }),
        context.env,
      );

      expect(response.status).toBe(401);

      const count = context.database.raw
        .prepare('select count(*) as total from sessions')
        .get() as { total: number };
      expect(count.total).toBe(0);
    } finally {
      context.close();
    }
  });

  it('does not echo the submitted password in a failure response', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: WRONG_PASSWORD }),
        context.env,
      );

      expect(await response.text()).not.toContain(WRONG_PASSWORD);
    } finally {
      context.close();
    }
  });
});

describe('POST /api/v1/auth/login — request validation (Gate 6)', () => {
  it('returns 400 for a body that is not valid JSON', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest(null, { raw: 'not-json' }),
        context.env,
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as TestEnvelope;
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    } finally {
      context.close();
    }
  });

  it.each([
    ['missing password', { email: EMAIL }],
    ['missing email', { password: PASSWORD }],
    ['empty object', {}],
    ['non-string password', { email: EMAIL, password: 12345 }],
    ['object password', { email: EMAIL, password: { toString: 'x' } }],
    ['non-string email', { email: 42, password: PASSWORD }],
    ['null email', { email: null, password: PASSWORD }],
    ['empty email', { email: '', password: PASSWORD }],
    ['empty password', { email: EMAIL, password: '' }],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, payload) => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest(payload),
        context.env,
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as TestEnvelope;
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    } finally {
      context.close();
    }
  });

  it.each([
    ['an array body', []],
    ['a string body', 'email=x'],
    ['a numeric body', 7],
  ])('returns 400 for %s', async (_label, payload) => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest(payload),
        context.env,
      );

      expect(response.status).toBe(400);
    } finally {
      context.close();
    }
  });

  it('returns 400 for an over-long password without hashing it', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: 'a'.repeat(257) }),
        context.env,
      );

      // A CPU-exhaustion control: an unbounded password would run PBKDF2 over
      // arbitrary input on an unauthenticated endpoint.
      expect(response.status).toBe(400);
    } finally {
      context.close();
    }
  });

  it('does not accept GET on the login route', async () => {
    const context = await loginEnv();
    try {
      const response = await app.request('/api/v1/auth/login', {}, context.env);

      // Credentials must never be submittable in a URL, where they would be
      // captured by proxy and access logs.
      expect(response.status).toBe(404);
    } finally {
      context.close();
    }
  });
});

describe('POST /api/v1/auth/login — infrastructure failures (doc 08 §12)', () => {
  it('returns 500, not 401, when the database binding is absent', async () => {
    const response = await app.request(
      '/api/v1/auth/login',
      loginRequest({ email: EMAIL, password: PASSWORD }),
      baseEnv,
    );

    // Reporting a missing binding as "invalid credentials" would tell a user
    // their password is wrong when the deployment is simply misconfigured.
    expect(response.status).toBe(500);

    const body = (await response.json()) as TestEnvelope;
    expect(body.error?.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 without leaking driver detail when a query fails', async () => {
    // An unmigrated database: the "half-deployed" failure mode, where the
    // `users` table does not exist at all.
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(':memory:');

    try {
      const DB = {
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
      };

      const response = await app.request(
        '/api/v1/auth/login',
        loginRequest({ email: EMAIL, password: PASSWORD }),
        { ...baseEnv, DB },
      );

      expect(response.status).toBe(500);

      const text = await response.text();
      expect(text).not.toContain('no such table');
      expect(text).not.toContain(PASSWORD);
    } finally {
      raw.close();
    }
  });
});
