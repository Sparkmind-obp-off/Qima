import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { createMigratedDatabase, type TestDatabase } from '../integration/sqlite-harness';

const ORG_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const ORG_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const UNIT_A1 = 'aaaaaaaa-0000-4000-8000-000000000101';
const UNIT_A2 = 'aaaaaaaa-0000-4000-8000-000000000102';
const UNIT_B1 = 'bbbbbbbb-0000-4000-8000-000000000101';
const PARTICIPANT_A1 = 'aaaaaaaa-0000-4000-8000-000000000701';
const PARTICIPANT_A2 = 'aaaaaaaa-0000-4000-8000-000000000702';
const PARTICIPANT_B1 = 'bbbbbbbb-0000-4000-8000-000000000701';
const UNIT_ADMIN_A = '99999999-0000-4000-8000-000000000903';
const VIEWER_A = '99999999-0000-4000-8000-000000000904';
const ORG_ADMIN_A = '99999999-0000-4000-8000-000000000902';
const PASSWORD = 'Phase6Boundary#2026';

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
    insert into participants (id, unit_id, name, phone, email, status) values
      ('${PARTICIPANT_A1}', '${UNIT_A1}', 'Participant A1', '0811', 'a1@example.com', 'active'),
      ('${PARTICIPANT_A2}', '${UNIT_A2}', 'Participant A2', '0822', 'a2@example.com', 'inactive'),
      ('${PARTICIPANT_B1}', '${UNIT_B1}', 'Participant B1', '0833', 'b1@example.com', 'active');
    insert into users (id, name, email, password_hash, status) values
      ('${UNIT_ADMIN_A}', 'Unit Admin A', 'unit-a@example.com', '${hash}', 'active'),
      ('${VIEWER_A}', 'Viewer A', 'viewer-a@example.com', '${hash}', 'active'),
      ('${ORG_ADMIN_A}', 'Org Admin A', 'org-a@example.com', '${hash}', 'active');
    insert into user_unit_roles (id, user_id, unit_id, role_id) values
      ('phase6-unit-a', '${UNIT_ADMIN_A}', '${UNIT_A1}', '${ROLE.UNIT_ADMIN}'),
      ('phase6-viewer-a', '${VIEWER_A}', '${UNIT_A1}', '${ROLE.VIEWER}');
    insert into user_organization_roles (id, user_id, organization_id, role_id)
      values ('phase6-org-a', '${ORG_ADMIN_A}', '${ORG_A}', '${ROLE.ORG_ADMIN}');
  `);
  const env = { APP_ENV: 'test', DB: binding(database) };
  async function login(email: string): Promise<string> {
    const response = await app.request('/api/v1/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    }, env);
    return ((await response.json()) as { data: { access_token: string } }).data.access_token;
  }
  return { database, env, login };
}

function request(token: string, method = 'GET', body?: unknown) {
  return {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

function path(unitId: string, participantId = '', query = '') {
  const organizationId = unitId === UNIT_B1 ? ORG_B : ORG_A;
  return `/api/v1/participants${participantId ? `/${participantId}` : ''}?organization_id=${organizationId}&unit_id=${unitId}${query}`;
}

describe('Phase 6 Participant API', () => {
  it('rejects unauthenticated access with the canonical envelope', async () => {
    const context = await fixture();
    try {
      const response = await app.request(path(UNIT_A1), undefined, context.env);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    } finally { context.database.close(); }
  });

  it('allows an authorized Unit admin to create, read, update and list Participants', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const created = await app.request(path(UNIT_A1), request(token, 'POST', {
        name: '  Ahmad Baru  ', phone: '0812345', email: 'AHMAD@EXAMPLE.COM',
        date_of_birth: '2011-02-03', gender: 'Laki-laki', metadata: { source: 'admin' },
      }), context.env);
      expect(created.status).toBe(201);
      const createdBody = (await created.json()) as { data: { id: string } };
      expect(createdBody).toMatchObject({ data: {
        unit_id: UNIT_A1, name: 'Ahmad Baru', email: 'ahmad@example.com', status: 'active', metadata: { source: 'admin' },
      } });

      const read = await app.request(path(UNIT_A1, createdBody.data.id), request(token), context.env);
      expect(read.status).toBe(200);
      const updated = await app.request(path(UNIT_A1, createdBody.data.id), request(token, 'PATCH', {
        status: 'inactive', phone: '0899', metadata: { reviewed: true },
      }), context.env);
      expect(updated.status).toBe(200);
      expect(await updated.json()).toMatchObject({ data: { status: 'inactive', phone: '0899', metadata: { reviewed: true } } });

      const listed = await app.request(path(UNIT_A1, '', '&status=inactive&search=ahmad'), request(token), context.env);
      expect(listed.status).toBe(200);
      expect(await listed.json()).toMatchObject({ data: { total: 1, items: [{ unit_id: UNIT_A1 }] } });
    } finally { context.database.close(); }
  });

  it('validates payloads and rejects client-owned organization or Unit fields', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      for (const body of [
        { name: '' },
        { name: 'Bad email', email: 'bad' },
        { name: 'Bad date', date_of_birth: '2010-02-31' },
        { name: 'Injected', organization_id: ORG_B, unit_id: UNIT_B1 },
        { name: 'Bad metadata', metadata: [] },
      ]) {
        const response = await app.request(path(UNIT_A1), request(token, 'POST', body), context.env);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      }
      expect(context.database.raw.prepare("select count(*) as total from participants where name = 'Injected'").get()).toMatchObject({ total: 0 });
    } finally { context.database.close(); }
  });

  it.each([
    ['another Unit in the same organization', UNIT_A2, PARTICIPANT_A2],
    ['another organization', UNIT_B1, PARTICIPANT_B1],
  ])('rejects scope escalation and known-ID access for %s', async (_label, unitId, participantId) => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      const response = await app.request(path(unitId, participantId), request(token), context.env);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: 'SCOPE_VIOLATION' } });
    } finally { context.database.close(); }
  });

  it('hides a known Participant ID and blocks cross-Unit update IDOR within an authorized organization', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      expect((await app.request(path(UNIT_A2, PARTICIPANT_A1), request(token), context.env)).status).toBe(404);
      const update = await app.request(path(UNIT_A2, PARTICIPANT_A1), request(token, 'PATCH', { name: 'Compromised' }), context.env);
      expect(update.status).toBe(404);
      expect(context.database.raw.prepare('select name from participants where id = ?').get(PARTICIPANT_A1)).toMatchObject({ name: 'Participant A1' });
    } finally { context.database.close(); }
  });

  it('blocks manipulated organization/unit pairs, query tampering and pagination enumeration', async () => {
    const context = await fixture();
    try {
      const token = await context.login('org-a@example.com');
      const manipulated = await app.request(`/api/v1/participants?organization_id=${ORG_A}&unit_id=${UNIT_B1}`, request(token), context.env);
      expect(manipulated.status).toBe(403);
      const unitToken = await context.login('unit-a@example.com');
      const paged = await app.request(path(UNIT_A1, '', '&page=999999&limit=999999&search=%25_%5C'), request(unitToken), context.env);
      const body = (await paged.json()) as { data: { items: unknown[]; page: number; limit: number; total: number } };
      expect(paged.status).toBe(200);
      expect(body.data).toMatchObject({ items: [], page: 999999, limit: 100, total: 0 });
      const invalid = await app.request(path(UNIT_A1, '', '&status=admin'), request(unitToken), context.env);
      expect(invalid.status).toBe(400);
    } finally { context.database.close(); }
  });

  it('allows read-only roles to read but rejects create and update mutations', async () => {
    const context = await fixture();
    try {
      const token = await context.login('viewer-a@example.com');
      expect((await app.request(path(UNIT_A1, PARTICIPANT_A1), request(token), context.env)).status).toBe(200);
      for (const [target, method, body] of [
        [path(UNIT_A1), 'POST', { name: 'Escalated' }],
        [path(UNIT_A1, PARTICIPANT_A1), 'PATCH', { name: 'Escalated' }],
      ] as const) {
        const response = await app.request(target, request(token, method, body), context.env);
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
      }
    } finally { context.database.close(); }
  });

  it('rejects missing or malformed scope and invalid patch bodies', async () => {
    const context = await fixture();
    try {
      const token = await context.login('unit-a@example.com');
      for (const [target, method, body] of [
        [`/api/v1/participants?organization_id=${ORG_A}`, 'GET', undefined],
        [`/api/v1/participants?organization_id=${ORG_A}&unit_id=bad`, 'GET', undefined],
        [path(UNIT_A1, PARTICIPANT_A1), 'PATCH', {}],
      ] as const) {
        const response = await app.request(target, request(token, method, body), context.env);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      }
    } finally { context.database.close(); }
  });
});
