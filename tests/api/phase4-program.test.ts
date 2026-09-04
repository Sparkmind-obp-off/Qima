import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { createMigratedDatabase, type TestDatabase } from '../integration/sqlite-harness';

const ORG_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const ORG_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const UNIT_A1 = 'aaaaaaaa-0000-4000-8000-000000000101';
const UNIT_A2 = 'aaaaaaaa-0000-4000-8000-000000000102';
const UNIT_B1 = 'bbbbbbbb-0000-4000-8000-000000000101';
const PROGRAM_A1 = 'aaaaaaaa-0000-4000-8000-000000000501';
const PROGRAM_A2 = 'aaaaaaaa-0000-4000-8000-000000000502';
const PROGRAM_B1 = 'bbbbbbbb-0000-4000-8000-000000000501';
const UNIT_ADMIN_A = '99999999-0000-4000-8000-000000000903';
const VIEWER_A = '99999999-0000-4000-8000-000000000904';
const ORG_ADMIN_A = '99999999-0000-4000-8000-000000000902';
const PASSWORD = 'Phase4Boundary#2026';

const ROLE = {
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
  database.exec(`
    insert into organizations (id, name, slug, status) values
      ('${ORG_A}', 'Organization A', 'organization-a', 'active'),
      ('${ORG_B}', 'Organization B', 'organization-b', 'active');
    insert into units (id, organization_id, name, slug, type, status) values
      ('${UNIT_A1}', '${ORG_A}', 'Unit A1', 'unit-a1', 'community', 'active'),
      ('${UNIT_A2}', '${ORG_A}', 'Unit A2', 'unit-a2', 'school', 'active'),
      ('${UNIT_B1}', '${ORG_B}', 'Unit B1', 'unit-b1', 'boarding', 'active');
    insert into programs (id, unit_id, name, slug, status, capacity) values
      ('${PROGRAM_A1}', '${UNIT_A1}', 'Program A1', 'program-a1', 'draft', 20),
      ('${PROGRAM_A2}', '${UNIT_A2}', 'Program A2', 'program-a2', 'published', 30),
      ('${PROGRAM_B1}', '${UNIT_B1}', 'Program B1', 'program-b1', 'draft', 40);
    insert into users (id, name, email, password_hash, status) values
      ('${UNIT_ADMIN_A}', 'Unit Admin A', 'unit-a@example.com', '${hash}', 'active'),
      ('${VIEWER_A}', 'Viewer A', 'viewer-a@example.com', '${hash}', 'active'),
      ('${ORG_ADMIN_A}', 'Org Admin A', 'org-a@example.com', '${hash}', 'active');
    insert into user_unit_roles (id, user_id, unit_id, role_id) values
      ('phase4-unit-a', '${UNIT_ADMIN_A}', '${UNIT_A1}', '${ROLE.UNIT_ADMIN}'),
      ('phase4-viewer-a', '${VIEWER_A}', '${UNIT_A1}', '${ROLE.VIEWER}');
    insert into user_organization_roles (id, user_id, organization_id, role_id)
      values ('phase4-org-a', '${ORG_ADMIN_A}', '${ORG_A}', '${ROLE.ORG_ADMIN}');
  `);
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
    return ((await response.json()) as { data: { access_token: string } }).data.access_token;
  }
  return { database, env, login };
}

function request(token: string, method = 'GET', body?: unknown) {
  return {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

function path(unitId: string, programId = '') {
  return `/api/v1/programs${programId ? `/${programId}` : ''}?organization_id=${
    unitId === UNIT_B1 ? ORG_B : ORG_A
  }&unit_id=${unitId}`;
}

describe('Phase 4 Program API', () => {
  it('rejects unauthenticated access with the canonical envelope', async () => {
    const context = await fixture();
    try {
      const response = await app.request(path(UNIT_A1), undefined, context.env);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    } finally {
      context.database.close();
    }
  });

  it('allows a unit admin to create and list Programs in its assigned unit', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const created = await app.request(
        path(UNIT_A1),
        request(token, 'POST', {
          name: 'Program Tahsin',
          description: 'Perbaikan bacaan',
          start_date: '2026-09-01',
          end_date: '2026-12-31',
          capacity: 25,
        }),
        context.env,
      );
      expect(created.status).toBe(201);
      expect(await created.json()).toMatchObject({
        ok: true,
        data: { unit_id: UNIT_A1, name: 'Program Tahsin', slug: 'program-tahsin', status: 'draft' },
      });

      const listed = await app.request(path(UNIT_A1), request(token), context.env);
      const body = (await listed.json()) as { data: { items: { unit_id: string }[]; total: number } };
      expect(listed.status).toBe(200);
      expect(body.data.total).toBe(2);
      expect(body.data.items.every((item) => item.unit_id === UNIT_A1)).toBe(true);
    } finally {
      context.database.close();
    }
  });

  it('validates input, rejects mass-assigned scope and reports duplicate slugs', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const invalid = await app.request(
        path(UNIT_A1),
        request(token, 'POST', {
          name: 'Invalid',
          slug: 'invalid',
          start_date: '2026-12-31',
          end_date: '2026-01-01',
          capacity: 0,
        }),
        context.env,
      );
      expect(invalid.status).toBe(400);

      const scopeInjection = await app.request(
        path(UNIT_A1),
        request(token, 'POST', {
          name: 'Injected',
          slug: 'injected',
          organization_id: ORG_B,
          unit_id: UNIT_B1,
        }),
        context.env,
      );
      expect(scopeInjection.status).toBe(400);
      expect(
        context.database.raw.prepare("select count(*) as total from programs where slug = 'injected'").get(),
      ).toMatchObject({ total: 0 });

      const duplicate = await app.request(
        path(UNIT_A1),
        request(token, 'POST', { name: 'Duplicate', slug: 'program-a1' }),
        context.env,
      );
      expect(duplicate.status).toBe(409);
    } finally {
      context.database.close();
    }
  });

  it.each([
    ['another unit in the same organization', UNIT_A2, PROGRAM_A2],
    ['another organization', UNIT_B1, PROGRAM_B1],
  ])('rejects unit scope escalation and IDOR for %s', async (_label, unitId, programId) => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const response = await app.request(path(unitId, programId), request(token), context.env);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'SCOPE_VIOLATION' } });
    } finally {
      context.database.close();
    }
  });

  it('rejects an organization and unit pair that does not represent real ownership', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const response = await app.request(
        `/api/v1/programs?organization_id=${ORG_A}&unit_id=${UNIT_B1}`,
        request(token),
        context.env,
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'SCOPE_VIOLATION' } });
    } finally {
      context.database.close();
    }
  });

  it('hides a known Program when the authorized scope points at another unit', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const response = await app.request(path(UNIT_A2, PROGRAM_A1), request(token), context.env);
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    } finally {
      context.database.close();
    }
  });

  it('rejects direct cross-unit update IDOR without mutating the target Program', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const response = await app.request(
        path(UNIT_A1, PROGRAM_A2),
        request(token, 'PATCH', { name: 'Compromised through IDOR' }),
        context.env,
      );
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
      expect(
        context.database.raw.prepare('select name from programs where id = ?').get(PROGRAM_A2),
      ).toMatchObject({ name: 'Program A2' });
    } finally {
      context.database.close();
    }
  });

  it('allows read-only roles to read but rejects create, update, and delete', async () => {
    const context = await fixture();
    try {
      const token = await context.login('viewer-a@example.com');
      expect((await app.request(path(UNIT_A1, PROGRAM_A1), request(token), context.env)).status).toBe(200);
      for (const [method, body] of [
        ['POST', { name: 'Escalated', slug: 'escalated' }],
        ['PATCH', { name: 'Escalated' }],
        ['DELETE', undefined],
      ] as const) {
        const response = await app.request(
          method === 'POST' ? path(UNIT_A1) : path(UNIT_A1, PROGRAM_A1),
          request(token, method, body),
          context.env,
        );
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
      }
    } finally {
      context.database.close();
    }
  });

  it('updates lifecycle fields and soft-deletes only inside the authorized unit', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const updated = await app.request(
        path(UNIT_A1, PROGRAM_A1),
        request(token, 'PATCH', { status: 'published', capacity: 45 }),
        context.env,
      );
      expect(updated.status).toBe(200);
      expect(await updated.json()).toMatchObject({ data: { status: 'published', capacity: 45 } });

      const deleted = await app.request(
        path(UNIT_A1, PROGRAM_A1),
        request(token, 'DELETE'),
        context.env,
      );
      expect(deleted.status).toBe(200);
      expect(await deleted.json()).toEqual({ ok: true, data: { deleted: true } });
      expect((await app.request(path(UNIT_A1, PROGRAM_A1), request(token), context.env)).status).toBe(404);
    } finally {
      context.database.close();
    }
  });

  it('rejects malformed or missing authorization scope before repository access', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      for (const target of [
        `/api/v1/programs?organization_id=${ORG_A}`,
        `/api/v1/programs?organization_id=${ORG_A}&unit_id=not-a-uuid`,
      ]) {
        const response = await app.request(target, request(token), context.env);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      }
    } finally {
      context.database.close();
    }
  });
});
