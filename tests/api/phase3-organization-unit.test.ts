import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { createMigratedDatabase, type TestDatabase } from '../integration/sqlite-harness';

const ORG_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const ORG_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const UNIT_A1 = 'aaaaaaaa-0000-4000-8000-000000000101';
const UNIT_A2 = 'aaaaaaaa-0000-4000-8000-000000000102';
const UNIT_B1 = 'bbbbbbbb-0000-4000-8000-000000000101';
const SUPER = '99999999-0000-4000-8000-000000000901';
const ORG_ADMIN_A = '99999999-0000-4000-8000-000000000902';
const UNIT_ADMIN_A = '99999999-0000-4000-8000-000000000903';
const VIEWER_A = '99999999-0000-4000-8000-000000000904';
const ORG_ADMIN_B = '99999999-0000-4000-8000-000000000905';
const PASSWORD = 'Phase3Boundary#2026';

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
  database.exec(`
    insert into organizations (id, name, slug, status) values
      ('${ORG_A}', 'Organization A', 'organization-a', 'active'),
      ('${ORG_B}', 'Organization B', 'organization-b', 'active');
    insert into units (id, organization_id, name, slug, type, status) values
      ('${UNIT_A1}', '${ORG_A}', 'Unit A1', 'unit-a1', 'community', 'active'),
      ('${UNIT_A2}', '${ORG_A}', 'Unit A2', 'unit-a2', 'school', 'active'),
      ('${UNIT_B1}', '${ORG_B}', 'Unit B1', 'unit-b1', 'boarding', 'active');
    insert into users (id, name, email, password_hash, status) values
      ('${SUPER}', 'Super Admin', 'super@example.com', '${hash}', 'active'),
      ('${ORG_ADMIN_A}', 'Org Admin A', 'org-a@example.com', '${hash}', 'active'),
      ('${UNIT_ADMIN_A}', 'Unit Admin A', 'unit-a@example.com', '${hash}', 'active'),
      ('${VIEWER_A}', 'Viewer A', 'viewer-a@example.com', '${hash}', 'active'),
      ('${ORG_ADMIN_B}', 'Org Admin B', 'org-b@example.com', '${hash}', 'active');
    insert into user_platform_roles (id, user_id, role_id)
      values ('phase3-super', '${SUPER}', '${ROLE.SUPER_ADMIN}');
    insert into user_organization_roles (id, user_id, organization_id, role_id) values
      ('phase3-org-a', '${ORG_ADMIN_A}', '${ORG_A}', '${ROLE.ORG_ADMIN}'),
      ('phase3-org-b', '${ORG_ADMIN_B}', '${ORG_B}', '${ROLE.ORG_ADMIN}');
    insert into user_unit_roles (id, user_id, unit_id, role_id) values
      ('phase3-unit-a', '${UNIT_ADMIN_A}', '${UNIT_A1}', '${ROLE.UNIT_ADMIN}'),
      ('phase3-viewer-a', '${VIEWER_A}', '${UNIT_A1}', '${ROLE.VIEWER}');
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

describe('Phase 3 Organization API', () => {
  it('requires authentication and returns the canonical envelope', async () => {
    const context = await fixture();
    try {
      const response = await app.request('/api/v1/organizations', undefined, context.env);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { code: 'UNAUTHENTICATED' },
      });
    } finally {
      context.database.close();
    }
  });

  it('allows only a platform-authorized actor to create organizations', async () => {
    const context = await fixture();
    try {
      const superToken = await context.login('super@example.com');
      const created = await app.request(
        '/api/v1/organizations',
        request(superToken, 'POST', {
          name: 'Organization C',
          slug: 'organization-c',
          description: 'Created in Phase 3',
        }),
        context.env,
      );
      expect(created.status).toBe(201);
      expect(await created.json()).toMatchObject({
        ok: true,
        data: { name: 'Organization C', slug: 'organization-c', status: 'active' },
      });

      const orgAdminToken = await context.login('org-a@example.com');
      const forbidden = await app.request(
        '/api/v1/organizations',
        request(orgAdminToken, 'POST', { name: 'Escalated', slug: 'escalated' }),
        context.env,
      );
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toMatchObject({ error: { code: 'SCOPE_VIOLATION' } });
    } finally {
      context.database.close();
    }
  });

  it('validates input and reports duplicate organization slugs as conflicts', async () => {
    const context = await fixture();
    try {
      const token = await context.login('super@example.com');
      const invalid = await app.request(
        '/api/v1/organizations',
        request(token, 'POST', { name: '', slug: 'Invalid Slug' }),
        context.env,
      );
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });

      const duplicate = await app.request(
        '/api/v1/organizations',
        request(token, 'POST', { name: 'Duplicate', slug: 'organization-a' }),
        context.env,
      );
      expect(duplicate.status).toBe(409);
      expect(await duplicate.json()).toMatchObject({ error: { code: 'CONFLICT' } });
    } finally {
      context.database.close();
    }
  });

  it('lists and reads only server-assigned organization scope', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const listed = await app.request('/api/v1/organizations', request(token), context.env);
      const listedBody = (await listed.json()) as { data: { items: { id: string }[] } };
      expect(listed.status).toBe(200);
      expect(listedBody.data.items.map((item) => item.id)).toEqual([ORG_A]);

      expect(
        (
          await app.request(`/api/v1/organizations/${ORG_A}`, request(token), context.env)
        ).status,
      ).toBe(200);
      const crossOrganization = await app.request(
        `/api/v1/organizations/${ORG_B}`,
        request(token),
        context.env,
      );
      expect(crossOrganization.status).toBe(403);
      expect(await crossOrganization.json()).toMatchObject({
        error: { code: 'SCOPE_VIOLATION' },
      });
    } finally {
      context.database.close();
    }
  });

  it('allows an organization admin to update only its own organization', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const updated = await app.request(
        `/api/v1/organizations/${ORG_A}`,
        request(token, 'PATCH', { description: 'Updated safely' }),
        context.env,
      );
      expect(updated.status).toBe(200);
      expect(await updated.json()).toMatchObject({ data: { description: 'Updated safely' } });

      const tampered = await app.request(
        `/api/v1/organizations/${ORG_B}`,
        request(token, 'PATCH', { name: 'Compromised' }),
        context.env,
      );
      expect(tampered.status).toBe(403);
      expect(
        context.database.raw.prepare('select name from organizations where id = ?').get(ORG_B),
      ).toMatchObject({ name: 'Organization B' });
    } finally {
      context.database.close();
    }
  });
});

describe('Phase 3 Unit API and isolation', () => {
  it('creates and lists units only inside an authorized organization', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const created = await app.request(
        `/api/v1/units?organization_id=${ORG_A}`,
        request(token, 'POST', { name: 'Unit A3', slug: 'unit-a3', type: 'community' }),
        context.env,
      );
      expect(created.status).toBe(201);
      expect(await created.json()).toMatchObject({
        ok: true,
        data: { organization_id: ORG_A, slug: 'unit-a3' },
      });

      const listed = await app.request(
        `/api/v1/units?organization_id=${ORG_A}`,
        request(token),
        context.env,
      );
      const body = (await listed.json()) as { data: { items: { organization_id: string }[] } };
      expect(body.data.items).toHaveLength(3);
      expect(body.data.items.every((unit) => unit.organization_id === ORG_A)).toBe(true);

      const crossOrganization = await app.request(
        `/api/v1/units?organization_id=${ORG_B}`,
        request(token, 'POST', { name: 'Injected', slug: 'injected', type: 'community' }),
        context.env,
      );
      expect(crossOrganization.status).toBe(403);
      expect(
        context.database.raw.prepare("select count(*) as total from units where slug = 'injected'").get(),
      ).toMatchObject({ total: 0 });
    } finally {
      context.database.close();
    }
  });

  it('rejects nonexistent relationships, invalid input, and scoped duplicate slugs', async () => {
    const context = await fixture();
    try {
      const token = await context.login('super@example.com');
      const missingOrganization = 'cccccccc-0000-4000-8000-000000000001';
      const nonexistent = await app.request(
        `/api/v1/units?organization_id=${missingOrganization}`,
        request(token, 'POST', { name: 'Orphan', slug: 'orphan', type: 'community' }),
        context.env,
      );
      expect(nonexistent.status).toBe(404);

      const invalid = await app.request(
        `/api/v1/units?organization_id=${ORG_A}`,
        request(token, 'POST', { name: 'Invalid', slug: 'Invalid Slug', type: 'unknown' }),
        context.env,
      );
      expect(invalid.status).toBe(400);

      const duplicate = await app.request(
        `/api/v1/units?organization_id=${ORG_A}`,
        request(token, 'POST', { name: 'Duplicate', slug: 'unit-a1', type: 'community' }),
        context.env,
      );
      expect(duplicate.status).toBe(409);
    } finally {
      context.database.close();
    }
  });

  it.each([
    ['another unit in the same organization', ORG_A, UNIT_A2],
    ['another organization unit', ORG_B, UNIT_B1],
    ['tampered organization for own unit', ORG_B, UNIT_A1],
  ])('rejects unit IDOR: %s', async (_label, organizationId, unitId) => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const response = await app.request(
        `/api/v1/units/${unitId}?organization_id=${organizationId}`,
        request(token),
        context.env,
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'SCOPE_VIOLATION' } });
    } finally {
      context.database.close();
    }
  });

  it('allows a unit admin to read and update its own unit but not move ownership', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const read = await app.request(
        `/api/v1/units/${UNIT_A1}?organization_id=${ORG_A}`,
        request(token),
        context.env,
      );
      expect(read.status).toBe(200);

      const updated = await app.request(
        `/api/v1/units/${UNIT_A1}?organization_id=${ORG_A}`,
        request(token, 'PATCH', { name: 'Unit A1 Updated' }),
        context.env,
      );
      expect(updated.status).toBe(200);
      expect(await updated.json()).toMatchObject({
        data: { name: 'Unit A1 Updated', organization_id: ORG_A },
      });

      const ownershipAttempt = await app.request(
        `/api/v1/units/${UNIT_A1}?organization_id=${ORG_A}`,
        request(token, 'PATCH', { organization_id: ORG_B }),
        context.env,
      );
      expect(ownershipAttempt.status).toBe(400);
      expect(
        context.database.raw.prepare('select organization_id from units where id = ?').get(UNIT_A1),
      ).toMatchObject({ organization_id: ORG_A });
    } finally {
      context.database.close();
    }
  });

  it('enforces role and permission restrictions on unit mutation', async () => {
    const context = await fixture();
    try {
      const viewer = await context.login('viewer-a@example.com');
      const response = await app.request(
        `/api/v1/units/${UNIT_A1}?organization_id=${ORG_A}`,
        request(viewer, 'PATCH', { name: 'Privilege Escalation' }),
        context.env,
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    } finally {
      context.database.close();
    }
  });
});
