import { beforeEach, describe, expect, it } from 'vitest';
import {
  createAccessAssignmentRepository,
  createAuditRepository,
  createDomainMappingRepository,
  createOrganizationRepository,
  createSiteRepository,
  createUnitRepository,
  createUserRepository,
} from '../../apps/api/src/infrastructure/database/repositories';
import { normalizePageRequest } from '@qima/domain';
import { createMigratedDatabase, expectRejected, type TestDatabase } from './sqlite-harness';

/**
 * Phase 1 repository tests — multi-tenant isolation.
 *
 * Traceability:
 * - doc 06 §19 Multi-Tenant Isolation, §18 Data Ownership Rule.
 * - .codex/IMPLEMENTATION_RULES.md §10: unit access must come from an explicit
 *   authorization assignment, never from knowing a unit_id.
 * - .codex/QUALITY_GATES.md Gate 9 (Isolation).
 *
 * These are the security tests of Phase 1. They run the real repositories
 * against a real database containing TWO tenants, and assert that tenant A can
 * never observe tenant B — the failure mode that a single-tenant fixture would
 * hide completely.
 */

const ORG_A = 'org-aaaa';
const ORG_B = 'org-bbbb';
const UNIT_A = 'unit-aaaa';
const UNIT_B = 'unit-bbbb';
const SITE_A = 'site-aaaa';
const SITE_B = 'site-bbbb';
const USER = 'user-1';

const page = normalizePageRequest({ page: 1, perPage: 50 });

async function twoTenantDatabase(): Promise<TestDatabase> {
  const database = await createMigratedDatabase({ seed: true });

  database.exec(`
    insert into organizations (id, name, slug) values
      ('${ORG_A}', 'Yayasan A', 'yayasan-a'),
      ('${ORG_B}', 'Yayasan B', 'yayasan-b');

    insert into units (id, organization_id, name, slug) values
      ('${UNIT_A}', '${ORG_A}', 'Unit A', 'unit-a'),
      ('${UNIT_B}', '${ORG_B}', 'Unit B', 'unit-b');

    insert into sites (id, unit_id, name, slug) values
      ('${SITE_A}', '${UNIT_A}', 'Situs A', 'situs-a'),
      ('${SITE_B}', '${UNIT_B}', 'Situs B', 'situs-b');

    insert into domain_mappings (id, site_id, domain, status, is_primary) values
      ('dm-a', '${SITE_A}', 'a.example.com', 'active', 1),
      ('dm-b', '${SITE_B}', 'b.example.com', 'active', 1),
      ('dm-p', '${SITE_B}', 'pending.example.com', 'pending', 0);

    insert into users (id, name, email, password_hash) values
      ('${USER}', 'Ali', 'ali@example.com', 'argon2-hash-value');
  `);

  return database;
}

describe('unit repository isolation', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await twoTenantDatabase();
  });

  it('does not return another organization unit even when its id is known', async () => {
    const units = createUnitRepository(database.db);

    // Correct scope resolves.
    expect(await units.findById(ORG_A, UNIT_A)).not.toBeNull();

    // Knowing UNIT_B's id is not sufficient: the caller is scoped to ORG_A.
    expect(await units.findById(ORG_A, UNIT_B)).toBeNull();

    database.close();
  });

  it('does not leak another organization unit through a slug lookup', async () => {
    const units = createUnitRepository(database.db);

    expect(await units.findBySlug(ORG_A, 'unit-a')).not.toBeNull();
    expect(await units.findBySlug(ORG_A, 'unit-b')).toBeNull();

    database.close();
  });

  it('lists only units of the requested organization', async () => {
    const units = createUnitRepository(database.db);

    const listed = await units.listByOrganization(ORG_A, page);

    expect(listed.total).toBe(1);
    expect(listed.items.map((unit) => unit.id)).toEqual([UNIT_A]);

    database.close();
  });

  it('excludes soft-deleted units from reads (doc 06 §38)', async () => {
    const units = createUnitRepository(database.db);

    database.exec(
      `update units set deleted_at = '2026-01-01T00:00:00Z' where id = '${UNIT_A}'`,
    );

    expect(await units.findById(ORG_A, UNIT_A)).toBeNull();
    expect((await units.listByOrganization(ORG_A, page)).total).toBe(0);

    database.close();
  });
});

describe('site repository isolation', () => {
  it('does not return a site belonging to another unit', async () => {
    const database = await twoTenantDatabase();

    try {
      const sites = createSiteRepository(database.db);

      expect(await sites.findById(UNIT_A, SITE_A)).not.toBeNull();
      expect(await sites.findById(UNIT_A, SITE_B)).toBeNull();
      expect((await sites.listByUnit(UNIT_A, page)).items.map((s) => s.id)).toEqual([SITE_A]);
    } finally {
      database.close();
    }
  });

  it('parses JSON configuration columns into objects', async () => {
    const database = await twoTenantDatabase();

    try {
      database.exec(
        `update sites set branding_config = '{"primaryColor":"#0f766e"}' where id = '${SITE_A}'`,
      );

      const site = await createSiteRepository(database.db).findById(UNIT_A, SITE_A);
      expect(site?.brandingConfig).toEqual({ primaryColor: '#0f766e' });
    } finally {
      database.close();
    }
  });

  it('does not crash on a malformed JSON configuration column', async () => {
    const database = await twoTenantDatabase();

    try {
      database.exec(`update sites set settings = 'not-json' where id = '${SITE_A}'`);

      const site = await createSiteRepository(database.db).findById(UNIT_A, SITE_A);
      expect(site?.settings).toEqual({});
    } finally {
      database.close();
    }
  });
});

describe('domain resolution (doc 06 §7)', () => {
  it('resolves an active hostname to exactly one site', async () => {
    const database = await twoTenantDatabase();

    try {
      const mappings = createDomainMappingRepository(database.db);

      expect((await mappings.resolve('a.example.com'))?.siteId).toBe(SITE_A);
      expect((await mappings.resolve('b.example.com'))?.siteId).toBe(SITE_B);
    } finally {
      database.close();
    }
  });

  it('refuses to resolve a hostname that is not active yet', async () => {
    const database = await twoTenantDatabase();

    try {
      // A pending domain must not establish scope: it has not been verified.
      expect(await createDomainMappingRepository(database.db).resolve('pending.example.com')).toBeNull();
    } finally {
      database.close();
    }
  });

  it('returns null for an unknown hostname instead of a default tenant', async () => {
    const database = await twoTenantDatabase();

    try {
      expect(await createDomainMappingRepository(database.db).resolve('unknown.example.com')).toBeNull();
    } finally {
      database.close();
    }
  });
});

describe('user repository credential hygiene (Quality Gate 10)', () => {
  it('never returns the password hash', async () => {
    const database = await twoTenantDatabase();

    try {
      const user = await createUserRepository(database.db).findById(USER);

      expect(user).not.toBeNull();
      expect(JSON.stringify(user)).not.toContain('argon2-hash-value');
      expect(Object.keys(user as object)).not.toContain('passwordHash');
      expect(Object.keys(user as object)).not.toContain('password_hash');
    } finally {
      database.close();
    }
  });

  it('looks a user up case-insensitively by normalizing the input', async () => {
    const database = await twoTenantDatabase();

    try {
      const users = createUserRepository(database.db);

      expect((await users.findByEmail('ALI@EXAMPLE.COM'))?.id).toBe(USER);
    } finally {
      database.close();
    }
  });
});

describe('access assignment resolution (T1.09)', () => {
  async function withAssignments() {
    const database = await twoTenantDatabase();

    const roleId = (key: string) =>
      (database.raw.prepare('select id from roles where key = ?').get(key) as { id: string }).id;

    return { database, roleId };
  }

  it('returns no permission at all for a user with no assignment', async () => {
    const { database } = await withAssignments();

    try {
      const access = createAccessAssignmentRepository(database.db);

      // Absence of an assignment is a denial, never a permissive default.
      expect(await access.resolvePermissionKeys(USER, ORG_A, null)).toEqual([]);
      expect(await access.listOrganizationRoleKeys(USER, ORG_A)).toEqual([]);
    } finally {
      database.close();
    }
  });

  it('resolves permissions from an organization assignment', async () => {
    const { database, roleId } = await withAssignments();

    try {
      database.exec(
        `insert into user_organization_roles (id, user_id, organization_id, role_id)
         values ('a-1', '${USER}', '${ORG_A}', '${roleId('ORG_ADMIN')}')`,
      );

      const access = createAccessAssignmentRepository(database.db);

      expect(await access.listOrganizationRoleKeys(USER, ORG_A)).toEqual(['ORG_ADMIN']);
      expect(await access.resolvePermissionKeys(USER, ORG_A, null)).toContain('units.read');

      // The same user has nothing in the other organization.
      expect(await access.listOrganizationRoleKeys(USER, ORG_B)).toEqual([]);
      expect(await access.resolvePermissionKeys(USER, ORG_B, null)).toEqual([]);
    } finally {
      database.close();
    }
  });

  it('does not widen permissions when an unrelated unit id is supplied', async () => {
    const { database, roleId } = await withAssignments();

    try {
      // The user administers UNIT_B, which belongs to ORG_B.
      database.exec(
        `insert into user_unit_roles (id, user_id, unit_id, role_id)
         values ('a-2', '${USER}', '${UNIT_B}', '${roleId('UNIT_ADMIN')}')`,
      );

      const access = createAccessAssignmentRepository(database.db);

      // Acting inside ORG_A while passing UNIT_B must contribute nothing: the
      // unit does not belong to the organization being acted in.
      expect(await access.resolvePermissionKeys(USER, ORG_A, UNIT_B)).toEqual([]);

      // Acting inside the correct organization does grant the unit permissions.
      expect(await access.resolvePermissionKeys(USER, ORG_B, UNIT_B)).toContain('units.update');
    } finally {
      database.close();
    }
  });

  it('ignores a unit assignment whose unit has been soft-deleted', async () => {
    const { database, roleId } = await withAssignments();

    try {
      database.exec(
        `insert into user_unit_roles (id, user_id, unit_id, role_id)
         values ('a-3', '${USER}', '${UNIT_B}', '${roleId('UNIT_ADMIN')}')`,
      );
      database.exec(`update units set deleted_at = '2026-01-01T00:00:00Z' where id = '${UNIT_B}'`);

      const access = createAccessAssignmentRepository(database.db);
      expect(await access.resolvePermissionKeys(USER, ORG_B, UNIT_B)).toEqual([]);
    } finally {
      database.close();
    }
  });

  it('deduplicates permissions granted by several roles', async () => {
    const { database, roleId } = await withAssignments();

    try {
      database.exec(
        `insert into user_organization_roles (id, user_id, organization_id, role_id) values
           ('a-4', '${USER}', '${ORG_A}', '${roleId('ORG_ADMIN')}'),
           ('a-5', '${USER}', '${ORG_A}', '${roleId('VIEWER')}')`,
      );

      const keys = await createAccessAssignmentRepository(database.db).resolvePermissionKeys(
        USER,
        ORG_A,
        null,
      );

      expect(new Set(keys).size).toBe(keys.length);
      expect([...keys]).toEqual([...keys].sort());
    } finally {
      database.close();
    }
  });
});

describe('audit repository (doc 06 §15)', () => {
  it('appends an event with a server-assigned id and timestamp', async () => {
    const database = await twoTenantDatabase();

    try {
      const audit = createAuditRepository(database.db, () => 'audit-fixed-id');

      const event = await audit.append({
        organizationId: ORG_A,
        unitId: UNIT_A,
        userId: USER,
        action: 'CREATE',
        resourceType: 'unit',
        resourceId: UNIT_A,
        metadata: { name: 'Unit A' },
        ipAddress: '203.0.113.10',
        userAgent: 'vitest',
      });

      expect(event.id).toBe('audit-fixed-id');
      expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(event.metadata).toEqual({ name: 'Unit A' });
    } finally {
      database.close();
    }
  });

  it('lists audit events of one organization only', async () => {
    const database = await twoTenantDatabase();

    try {
      let counter = 0;
      const audit = createAuditRepository(database.db, () => `audit-${++counter}`);

      const base = {
        unitId: null,
        userId: USER,
        resourceType: 'organization',
        resourceId: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
      } as const;

      await audit.append({ ...base, organizationId: ORG_A, action: 'UPDATE' });
      await audit.append({ ...base, organizationId: ORG_B, action: 'UPDATE' });

      const listed = await audit.listByOrganization(ORG_A, page);

      expect(listed.total).toBe(1);
      expect(listed.items[0]?.organizationId).toBe(ORG_A);
    } finally {
      database.close();
    }
  });

  it('cannot rewrite history: the trigger blocks an update to an appended event', async () => {
    const database = await twoTenantDatabase();

    try {
      const audit = createAuditRepository(database.db, () => 'audit-immutable');

      await audit.append({
        organizationId: ORG_A,
        unitId: null,
        userId: USER,
        action: 'LOGIN',
        resourceType: 'session',
        resourceId: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
      });

      const error = expectRejected(() => {
        database.exec("update audit_logs set action = 'LOGOUT' where id = 'audit-immutable'");
      });
      expect(error.message).toMatch(/append-only/i);
    } finally {
      database.close();
    }
  });

  it('preserves an audit record when its organization is deleted (ON DELETE SET NULL)', async () => {
    const database = await twoTenantDatabase();

    try {
      const audit = createAuditRepository(database.db, () => 'audit-survivor');

      await audit.append({
        organizationId: ORG_A,
        unitId: null,
        userId: null,
        action: 'DELETE',
        resourceType: 'organization',
        resourceId: ORG_A,
        metadata: null,
        ipAddress: null,
        userAgent: null,
      });

      // Remove the dependents first: units are RESTRICT-protected by design.
      database.exec(`delete from domain_mappings where site_id = '${SITE_A}'`);
      database.exec(`delete from sites where id = '${SITE_A}'`);
      database.exec(`delete from units where id = '${UNIT_A}'`);
      database.exec(`delete from organizations where id = '${ORG_A}'`);

      const row = database.raw
        .prepare("select organization_id, action from audit_logs where id = 'audit-survivor'")
        .get() as { organization_id: string | null; action: string };

      // The trail survives the deletion of its subject.
      expect(row.action).toBe('DELETE');
      expect(row.organization_id).toBeNull();
    } finally {
      database.close();
    }
  });
});

describe('organization repository pagination (doc 06 §34)', () => {
  it('reports the total independently of the page size', async () => {
    const database = await twoTenantDatabase();

    try {
      const organizations = createOrganizationRepository(database.db);

      const firstPage = await organizations.list(normalizePageRequest({ page: 1, perPage: 1 }));

      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.total).toBe(2);

      const secondPage = await organizations.list(normalizePageRequest({ page: 2, perPage: 1 }));
      expect(secondPage.items).toHaveLength(1);
      expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
    } finally {
      database.close();
    }
  });
});
