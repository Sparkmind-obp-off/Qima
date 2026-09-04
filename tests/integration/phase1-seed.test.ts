import { describe, expect, it } from 'vitest';
import { ROLE_KEYS, assertValidPermissionKey } from '@qima/domain';
import {
  createPermissionRepository,
  createRoleRepository,
} from '../../apps/api/src/infrastructure/database/repositories';
import { createMigratedDatabase, readSeeds } from './sqlite-harness';

/**
 * Phase 1 seed tests — doc 10 §24 exit criterion "Seed works".
 *
 * The seed is system reference data (roles, permissions, grants). These tests
 * assert that it applies, that it is deterministic under re-application, and
 * that it contains no credential or personal data (Quality Gate 10).
 */

describe('Phase 1 seed', () => {
  it('applies to a freshly migrated database', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const roles = database.raw.prepare('select count(*) as total from roles').get() as {
        total: number;
      };
      const permissions = database.raw
        .prepare('select count(*) as total from permissions')
        .get() as { total: number };
      const grants = database.raw
        .prepare('select count(*) as total from role_permissions')
        .get() as { total: number };

      expect(roles.total).toBe(ROLE_KEYS.length);
      expect(permissions.total).toBeGreaterThan(0);
      expect(grants.total).toBeGreaterThan(0);
    } finally {
      database.close();
    }
  });

  it('is deterministic: re-running produces byte-identical state', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const snapshot = () =>
        JSON.stringify({
          roles: database.raw.prepare('select * from roles order by id').all(),
          permissions: database.raw.prepare('select * from permissions order by id').all(),
          grants: database.raw.prepare('select * from role_permissions order by id').all(),
        });

      const before = snapshot();

      for (const seed of await readSeeds()) {
        database.exec(seed.sql);
      }

      expect(snapshot()).toBe(before);
    } finally {
      database.close();
    }
  });

  it('seeds exactly the documented role catalogue (doc 06 §3.2)', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const rows = database.raw.prepare('select key from roles order by key').all() as {
        key: string;
      }[];

      expect(rows.map((row) => row.key)).toEqual([...ROLE_KEYS].sort());
    } finally {
      database.close();
    }
  });

  it('assigns each role a scope level consistent with its meaning (doc 06 §8)', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const rows = database.raw.prepare('select key, scope_level from roles').all() as {
        key: string;
        scope_level: string;
      }[];
      const byKey = new Map(rows.map((row) => [row.key, row.scope_level]));

      expect(byKey.get('SUPER_ADMIN')).toBe('platform');
      expect(byKey.get('ORG_ADMIN')).toBe('organization');
      // Every remaining role acts inside a single unit.
      for (const key of ['UNIT_ADMIN', 'STAFF', 'TEACHER', 'EDITOR', 'VIEWER']) {
        expect(byKey.get(key), `${key} must be unit-scoped`).toBe('unit');
      }
    } finally {
      database.close();
    }
  });

  it('seeds permission keys that satisfy the domain key contract', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const rows = database.raw.prepare('select key from permissions').all() as { key: string }[];

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        // Throws if the seeded key violates `resource.action` (doc 06 §3.3).
        expect(() => assertValidPermissionKey(row.key)).not.toThrow();
      }
    } finally {
      database.close();
    }
  });

  it('seeds Program permissions without granting later-phase capabilities', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const rows = database.raw.prepare('select distinct resource from permissions').all() as {
        resource: string;
      }[];
      const resources = new Set(rows.map((row) => row.resource));

      expect(resources.has('programs')).toBe(true);

      // doc 10 §24: these capabilities arrive after Phase 4.
      for (const future of ['activities', 'participants', 'registrations']) {
        expect(resources.has(future), `premature permission resource: ${future}`).toBe(false);
      }
    } finally {
      database.close();
    }
  });

  it('grants SUPER_ADMIN every seeded permission', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const roleRepository = createRoleRepository(database.db);
      const permissionRepository = createPermissionRepository(database.db);

      const superAdmin = await roleRepository.findByKey('SUPER_ADMIN');
      expect(superAdmin).not.toBeNull();

      const granted = await roleRepository.listPermissions(superAdmin!.id);
      const all = await permissionRepository.list();

      expect(granted.map((p) => p.key).sort()).toEqual(all.map((p) => p.key).sort());
    } finally {
      database.close();
    }
  });

  it('restricts VIEWER to read-only permissions', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const roleRepository = createRoleRepository(database.db);
      const viewer = await roleRepository.findByKey('VIEWER');
      const granted = await roleRepository.listPermissions(viewer!.id);

      expect(granted.length).toBeGreaterThan(0);
      for (const permission of granted) {
        expect(permission.action, `VIEWER must not hold ${permission.key}`).toBe('read');
      }
    } finally {
      database.close();
    }
  });

  it('does not grant a unit-level role any organization mutation permission', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      const roleRepository = createRoleRepository(database.db);

      for (const key of ['UNIT_ADMIN', 'STAFF', 'TEACHER', 'EDITOR', 'VIEWER']) {
        const role = await roleRepository.findByKey(key);
        const granted = await roleRepository.listPermissions(role!.id);
        const keys = granted.map((p) => p.key);

        expect(keys, `${key} must not update the organization`).not.toContain(
          'organizations.update',
        );
      }
    } finally {
      database.close();
    }
  });

  it('contains no credential material or personal data (Quality Gate 10)', async () => {
    // Asserted against the seed source, so a future edit that adds a seeded user
    // with a password is caught even before it is applied.
    for (const seed of await readSeeds()) {
      const sql = seed.sql.toLowerCase();

      expect(sql, `${seed.name} must not seed users`).not.toMatch(/insert\s+(or\s+ignore\s+)?into\s+users/);
      expect(sql, `${seed.name} must not contain a password`).not.toContain('password_hash');
      expect(sql, `${seed.name} must not contain a token`).not.toMatch(/ghp_|sk-|bearer\s/);
    }
  });

  it('seeds no tenant rows: organizations and units stay empty', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      for (const table of ['organizations', 'units', 'sites', 'users', 'audit_logs']) {
        const row = database.raw.prepare(`select count(*) as total from ${table}`).get() as {
          total: number;
        };
        expect(row.total, `${table} must not be seeded`).toBe(0);
      }
    } finally {
      database.close();
    }
  });
});
