import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { webCryptoSessionTokenService } from '../../apps/api/src/infrastructure/security/session-token-service';
import { createMigratedDatabase, type TestDatabase } from '../integration/sqlite-harness';

const ORG_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const ORG_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const UNIT_A1 = 'aaaaaaaa-0000-4000-8000-000000000101';
const UNIT_A2 = 'aaaaaaaa-0000-4000-8000-000000000102';
const UNIT_B1 = 'bbbbbbbb-0000-4000-8000-000000000101';
const ADMIN = '99999999-0000-4000-8000-000000000801';
const VIEWER = '99999999-0000-4000-8000-000000000802';
const OTHER_ADMIN = '99999999-0000-4000-8000-000000000803';
const PASSWORD = 'AccessBoundary#2026';

const ROLE = {
  SUPER_ADMIN: '11111111-0000-4000-8000-000000000001',
  ORG_ADMIN: '11111111-0000-4000-8000-000000000002',
  UNIT_ADMIN: '11111111-0000-4000-8000-000000000003',
  VIEWER: '11111111-0000-4000-8000-000000000007',
} as const;

function binding(database: TestDatabase) {
  return database.db as unknown as D1Database;
}

async function fixture() {
  const database = await createMigratedDatabase({ seed: true });
  const hash = await webCryptoPasswordHasher.hash(PASSWORD);
  database.raw
    .prepare('insert into organizations (id, name, slug, status) values (?, ?, ?, ?)')
    .run(ORG_A, 'Organization A', 'organization-a', 'active');
  database.raw
    .prepare('insert into organizations (id, name, slug, status) values (?, ?, ?, ?)')
    .run(ORG_B, 'Organization B', 'organization-b', 'active');

  const insertUnit = database.raw.prepare(
    'insert into units (id, organization_id, name, slug, status) values (?, ?, ?, ?, ?)',
  );
  insertUnit.run(UNIT_A1, ORG_A, 'Unit A1', 'unit-a1', 'active');
  insertUnit.run(UNIT_A2, ORG_A, 'Unit A2', 'unit-a2', 'active');
  insertUnit.run(UNIT_B1, ORG_B, 'Unit B1', 'unit-b1', 'active');

  const insertUser = database.raw.prepare(
    'insert into users (id, name, email, password_hash, status) values (?, ?, ?, ?, ?)',
  );
  insertUser.run(ADMIN, 'Unit Admin', 'unit-admin@example.com', hash, 'active');
  insertUser.run(VIEWER, 'Viewer', 'viewer@example.com', hash, 'active');
  insertUser.run(OTHER_ADMIN, 'Other Admin', 'other-admin@example.com', hash, 'active');

  const insertUnitRole = database.raw.prepare(
    'insert into user_unit_roles (id, user_id, unit_id, role_id) values (?, ?, ?, ?)',
  );
  insertUnitRole.run('assignment-admin-a1', ADMIN, UNIT_A1, ROLE.UNIT_ADMIN);
  insertUnitRole.run('assignment-viewer-a1', VIEWER, UNIT_A1, ROLE.VIEWER);
  insertUnitRole.run('assignment-admin-b1', OTHER_ADMIN, UNIT_B1, ROLE.UNIT_ADMIN);

  const env = { APP_ENV: 'test', DB: binding(database) };

  async function login(email: string): Promise<string> {
    const response = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: PASSWORD }),
      },
      env,
    );
    const body = (await response.json()) as { data: { access_token: string } };
    return body.data.access_token;
  }

  return { database, env, login };
}

function accessPath(organizationId = ORG_A, unitId = UNIT_A1): string {
  return `/api/v1/auth/access/organizations/${organizationId}/units/${unitId}`;
}

function bearer(token: string) {
  return { headers: { authorization: `Bearer ${token}` } };
}

describe('Phase 2 protected authorization surface', () => {
  it('accepts a valid session with the required explicit role, permission and unit scope', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-admin@example.com');
      const response = await app.request(accessPath(), bearer(token), context.env);
      const body = (await response.json()) as { ok: boolean; data: Record<string, unknown> };

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data).toMatchObject({
        authorized: true,
        scope: { organization_id: ORG_A, unit_id: UNIT_A1 },
        roles: ['UNIT_ADMIN'],
      });
    } finally {
      context.database.close();
    }
  });

  it.each([
    ['missing session', undefined],
    ['invalid session', 'A'.repeat(43)],
  ])('rejects %s', async (_label, token) => {
    const context = await fixture();
    try {
      const response = await app.request(
        accessPath(),
        token === undefined ? undefined : bearer(token),
        context.env,
      );
      expect(response.status).toBe(401);
      expect((await response.json()) as object).toMatchObject({
        ok: false,
        error: { code: 'UNAUTHENTICATED' },
      });
    } finally {
      context.database.close();
    }
  });

  it('rejects expired and revoked sessions with the same authentication boundary', async () => {
    const context = await fixture();
    try {
      const expired = 'E'.repeat(43);
      const expiredHash = await webCryptoSessionTokenService.hash(expired);
      context.database.raw
        .prepare(
          `insert into sessions (id, user_id, token_hash, created_at, expires_at)
           values (?, ?, ?, '1999-01-01T00:00:00Z', '2000-01-01T00:00:00Z')`,
        )
        .run('expired-session', ADMIN, expiredHash);
      const expiredResponse = await app.request(accessPath(), bearer(expired), context.env);

      const revoked = await context.login('viewer@example.com');
      await app.request(
        '/api/v1/auth/logout',
        { method: 'POST', headers: bearer(revoked).headers },
        context.env,
      );
      const revokedResponse = await app.request(accessPath(), bearer(revoked), context.env);

      expect(expiredResponse.status).toBe(401);
      expect(revokedResponse.status).toBe(401);
      expect(await expiredResponse.text()).toBe(await revokedResponse.text());
    } finally {
      context.database.close();
    }
  });

  it('rejects a valid scoped user without an allowed role', async () => {
    const context = await fixture();
    try {
      const token = await context.login('viewer@example.com');
      const response = await app.request(accessPath(), bearer(token), context.env);
      expect(response.status).toBe(403);
      expect((await response.json()) as object).toMatchObject({
        error: { code: 'FORBIDDEN' },
      });
    } finally {
      context.database.close();
    }
  });

  it('checks permission independently after accepting the role', async () => {
    const context = await fixture();
    try {
      context.database.raw
        .prepare(
          `delete from role_permissions where role_id = ? and permission_id =
             (select id from permissions where key = 'units.update')`,
        )
        .run(ROLE.UNIT_ADMIN);
      const token = await context.login('unit-admin@example.com');
      const response = await app.request(accessPath(), bearer(token), context.env);
      expect(response.status).toBe(403);
      expect((await response.json()) as object).toMatchObject({
        error: { code: 'FORBIDDEN' },
      });
    } finally {
      context.database.close();
    }
  });

  it.each([
    ['wrong organization', ORG_B, UNIT_A1],
    ['another unit in the same organization', ORG_A, UNIT_A2],
    ['another organization and its valid unit', ORG_B, UNIT_B1],
  ])('rejects IDOR/scope manipulation: %s', async (_label, organizationId, unitId) => {
    const context = await fixture();
    try {
      const token = await context.login('unit-admin@example.com');
      const response = await app.request(
        accessPath(organizationId, unitId),
        bearer(token),
        context.env,
      );
      expect(response.status).toBe(403);
      expect((await response.json()) as object).toMatchObject({
        error: { code: 'SCOPE_VIOLATION' },
      });
    } finally {
      context.database.close();
    }
  });

  it('accepts an explicit organization assignment throughout that organization only', async () => {
    const context = await fixture();
    try {
      context.database.raw
        .prepare(
          'insert into user_organization_roles (id, user_id, organization_id, role_id) values (?, ?, ?, ?)',
        )
        .run('assignment-org-admin-a', ADMIN, ORG_A, ROLE.ORG_ADMIN);
      const token = await context.login('unit-admin@example.com');

      expect(
        (await app.request(accessPath(ORG_A, UNIT_A2), bearer(token), context.env)).status,
      ).toBe(200);
      expect(
        (await app.request(accessPath(ORG_B, UNIT_B1), bearer(token), context.env)).status,
      ).toBe(403);
    } finally {
      context.database.close();
    }
  });

  it('accepts an explicit platform assignment without deriving it from tenant input', async () => {
    const context = await fixture();
    try {
      context.database.raw
        .prepare('insert into user_platform_roles (id, user_id, role_id) values (?, ?, ?)')
        .run('assignment-super-admin', ADMIN, ROLE.SUPER_ADMIN);
      const token = await context.login('unit-admin@example.com');
      const response = await app.request(accessPath(ORG_B, UNIT_B1), bearer(token), context.env);
      expect(response.status).toBe(200);
    } finally {
      context.database.close();
    }
  });
});
