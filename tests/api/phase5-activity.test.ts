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
const ACTIVITY_A1 = 'aaaaaaaa-0000-4000-8000-000000000601';
const ACTIVITY_A2 = 'aaaaaaaa-0000-4000-8000-000000000602';
const ACTIVITY_B1 = 'bbbbbbbb-0000-4000-8000-000000000601';
const UNIT_ADMIN_A = '99999999-0000-4000-8000-000000000903';
const VIEWER_A = '99999999-0000-4000-8000-000000000904';
const ORG_ADMIN_A = '99999999-0000-4000-8000-000000000902';
const PASSWORD = 'Phase5Boundary#2026';

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
    insert into programs (id, unit_id, name, slug, status) values
      ('${PROGRAM_A1}', '${UNIT_A1}', 'Program A1', 'program-a1', 'published'),
      ('${PROGRAM_A2}', '${UNIT_A2}', 'Program A2', 'program-a2', 'published'),
      ('${PROGRAM_B1}', '${UNIT_B1}', 'Program B1', 'program-b1', 'published');
    insert into activities (id, unit_id, program_id, title, activity_type, start_at, location, status) values
      ('${ACTIVITY_A1}', '${UNIT_A1}', '${PROGRAM_A1}', 'Activity A1', 'kajian', '2026-09-10T08:00:00Z', 'Aula A1', 'draft'),
      ('${ACTIVITY_A2}', '${UNIT_A2}', '${PROGRAM_A2}', 'Activity A2', 'kelas', '2026-09-11T08:00:00Z', 'Aula A2', 'published'),
      ('${ACTIVITY_B1}', '${UNIT_B1}', '${PROGRAM_B1}', 'Activity B1', 'kelas', '2026-09-12T08:00:00Z', 'Aula B1', 'draft');
    insert into users (id, name, email, password_hash, status) values
      ('${UNIT_ADMIN_A}', 'Unit Admin A', 'unit-a@example.com', '${hash}', 'active'),
      ('${VIEWER_A}', 'Viewer A', 'viewer-a@example.com', '${hash}', 'active'),
      ('${ORG_ADMIN_A}', 'Org Admin A', 'org-a@example.com', '${hash}', 'active');
    insert into user_unit_roles (id, user_id, unit_id, role_id) values
      ('phase5-unit-a', '${UNIT_ADMIN_A}', '${UNIT_A1}', '${ROLE.UNIT_ADMIN}'),
      ('phase5-viewer-a', '${VIEWER_A}', '${UNIT_A1}', '${ROLE.VIEWER}');
    insert into user_organization_roles (id, user_id, organization_id, role_id)
      values ('phase5-org-a', '${ORG_ADMIN_A}', '${ORG_A}', '${ROLE.ORG_ADMIN}');
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

function path(unitId: string, activityId = '', query = '') {
  const organizationId = unitId === UNIT_B1 ? ORG_B : ORG_A;
  return `/api/v1/activities${activityId ? `/${activityId}` : ''}?organization_id=${organizationId}&unit_id=${unitId}${query}`;
}

describe('Phase 5 Activity API', () => {
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

  it('allows an authorized Unit admin to create, read, update and list Activities', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const created = await app.request(
        path(UNIT_A1),
        request(token, 'POST', {
          program_id: PROGRAM_A1,
          title: 'Kajian Baru',
          description: 'Pembinaan rutin',
          activity_type: 'kajian',
          start_at: '2026-09-20T08:00:00Z',
          end_at: '2026-09-20T10:00:00Z',
          location: 'Aula Utama',
        }),
        context.env,
      );
      expect(created.status).toBe(201);
      const createdBody = (await created.json()) as { data: { id: string } };
      expect(createdBody).toMatchObject({
        data: { unit_id: UNIT_A1, program_id: PROGRAM_A1, title: 'Kajian Baru', status: 'draft' },
      });

      const updated = await app.request(
        path(UNIT_A1, createdBody.data.id),
        request(token, 'PATCH', { status: 'published', location: 'Masjid' }),
        context.env,
      );
      expect(updated.status).toBe(200);
      expect(await updated.json()).toMatchObject({ data: { status: 'published', location: 'Masjid' } });

      const listed = await app.request(
        path(UNIT_A1, '', `&program_id=${PROGRAM_A1}&status=published&search=masjid`),
        request(token),
        context.env,
      );
      expect(listed.status).toBe(200);
      expect(await listed.json()).toMatchObject({ data: { total: 1, items: [{ unit_id: UNIT_A1 }] } });
    } finally {
      context.database.close();
    }
  });

  it('supports a Unit-owned Activity without Program association', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const response = await app.request(
        path(UNIT_A1),
        request(token, 'POST', {
          program_id: null,
          title: 'Rapat Unit',
          activity_type: 'meeting',
          start_at: '2026-09-20T08:00:00Z',
        }),
        context.env,
      );
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ data: { unit_id: UNIT_A1, program_id: null } });
    } finally {
      context.database.close();
    }
  });

  it('validates requests and rejects client-owned organization or Unit fields', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      for (const body of [
        { title: '', activity_type: 'kajian', start_at: '2026-09-20T08:00:00Z' },
        { title: 'Bad', activity_type: 'kajian', start_at: '2026-09-20T10:00:00Z', end_at: '2026-09-20T08:00:00Z' },
        { title: 'Injected', activity_type: 'kajian', start_at: '2026-09-20T08:00:00Z', organization_id: ORG_B, unit_id: UNIT_B1 },
      ]) {
        const response = await app.request(path(UNIT_A1), request(token, 'POST', body), context.env);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      }
      expect(
        context.database.raw.prepare("select count(*) as total from activities where title = 'Injected'").get(),
      ).toMatchObject({ total: 0 });
    } finally {
      context.database.close();
    }
  });

  it.each([
    ['another Unit in the same organization', UNIT_A2, ACTIVITY_A2],
    ['another organization', UNIT_B1, ACTIVITY_B1],
  ])('rejects scope escalation and known-ID access for %s', async (_label, unitId, activityId) => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const response = await app.request(path(unitId, activityId), request(token), context.env);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'SCOPE_VIOLATION' } });
    } finally {
      context.database.close();
    }
  });

  it('hides a known Activity ID and blocks cross-Unit update IDOR inside authorized organization', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const read = await app.request(path(UNIT_A2, ACTIVITY_A1), request(token), context.env);
      expect(read.status).toBe(404);
      const update = await app.request(
        path(UNIT_A2, ACTIVITY_A1),
        request(token, 'PATCH', { title: 'Compromised' }),
        context.env,
      );
      expect(update.status).toBe(404);
      expect(
        context.database.raw.prepare('select title from activities where id = ?').get(ACTIVITY_A1),
      ).toMatchObject({ title: 'Activity A1' });
    } finally {
      context.database.close();
    }
  });

  it('rejects inaccessible Program relationships on create, update, and list filtering', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      for (const [target, method, body] of [
        [path(UNIT_A1), 'POST', { program_id: PROGRAM_A2, title: 'Cross', activity_type: 'kajian', start_at: '2026-09-20T08:00:00Z' }],
        [path(UNIT_A1, ACTIVITY_A1), 'PATCH', { program_id: PROGRAM_B1 }],
        [path(UNIT_A1, '', `&program_id=${PROGRAM_A2}`), 'GET', undefined],
      ] as const) {
        const response = await app.request(target, request(token, method, body), context.env);
        expect(response.status).toBe(404);
        expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
      }
      expect(
        context.database.raw.prepare('select program_id from activities where id = ?').get(ACTIVITY_A1),
      ).toMatchObject({ program_id: PROGRAM_A1 });
    } finally {
      context.database.close();
    }
  });

  it('keeps pagination server-scoped despite large or tampered page parameters', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const response = await app.request(
        path(UNIT_A1, '', '&page=999999&limit=999999'),
        request(token),
        context.env,
      );
      const body = (await response.json()) as {
        data: { items: { unit_id: string }[]; page: number; limit: number; total: number };
      };
      expect(response.status).toBe(200);
      expect(body.data.page).toBe(999999);
      expect(body.data.limit).toBe(100);
      expect(body.data.total).toBe(1);
      expect(body.data.items).toEqual([]);
    } finally {
      context.database.close();
    }
  });

  it('rejects a manipulated organization and Unit ownership pair', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const response = await app.request(
        `/api/v1/activities?organization_id=${ORG_A}&unit_id=${UNIT_B1}`,
        request(token),
        context.env,
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'SCOPE_VIOLATION' } });
    } finally {
      context.database.close();
    }
  });

  it('allows read-only roles to read but rejects create, update, and delete', async () => {
    const context = await fixture();
    try {
      const token = await context.login('viewer-a@example.com');
      expect((await app.request(path(UNIT_A1, ACTIVITY_A1), request(token), context.env)).status).toBe(200);
      for (const [method, body] of [
        ['POST', { title: 'Escalated', activity_type: 'kajian', start_at: '2026-09-20T08:00:00Z' }],
        ['PATCH', { title: 'Escalated' }],
        ['DELETE', undefined],
      ] as const) {
        const response = await app.request(
          method === 'POST' ? path(UNIT_A1) : path(UNIT_A1, ACTIVITY_A1),
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

  it('soft-deletes only inside the authorized Unit and returns missing-resource semantics', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const missing = await app.request(
        path(UNIT_A1, 'aaaaaaaa-0000-4000-8000-000000009999'),
        request(token),
        context.env,
      );
      expect(missing.status).toBe(404);
      const deleted = await app.request(path(UNIT_A1, ACTIVITY_A1), request(token, 'DELETE'), context.env);
      expect(deleted.status).toBe(200);
      expect(await deleted.json()).toEqual({ ok: true, data: { deleted: true } });
      expect((await app.request(path(UNIT_A1, ACTIVITY_A1), request(token), context.env)).status).toBe(404);
    } finally {
      context.database.close();
    }
  });

  it('rejects malformed or missing scope and invalid list filters', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      for (const target of [
        `/api/v1/activities?organization_id=${ORG_A}`,
        `/api/v1/activities?organization_id=${ORG_A}&unit_id=not-a-uuid`,
        path(UNIT_A1, '', '&status=invalid'),
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
