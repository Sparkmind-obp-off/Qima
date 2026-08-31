import { describe, expect, it } from 'vitest';
import { PHASE1_REQUIRED_INDEXES, PHASE1_TABLES } from '@qima/domain';
import { verifyPhase1Schema } from '../../apps/api/src/infrastructure/database/schema-inspector';
import { createMigratedDatabase, expectRejected, readMigrations } from './sqlite-harness';

/**
 * Phase 1 migration tests — doc 10 §24 exit criterion "Fresh database migration".
 *
 * These tests apply the real migration files to a real SQLite database, so they
 * fail if the SQL is invalid, out of order, or diverges from the schema contract
 * declared by the domain.
 */

describe('Phase 1 migrations', () => {
  it('apply cleanly to a fresh database', async () => {
    const database = await createMigratedDatabase();

    try {
      const verification = await verifyPhase1Schema(database.db);

      expect(verification.missingTables).toEqual([]);
      expect(verification.missingIndexes).toEqual([]);
      expect(verification.complete).toBe(true);
    } finally {
      database.close();
    }
  });

  it('create every table declared by the domain schema contract', async () => {
    const database = await createMigratedDatabase();

    try {
      const rows = database.raw
        .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
        .all() as { name: string }[];
      const present = new Set(rows.map((row) => row.name));

      for (const table of PHASE1_TABLES) {
        expect(present.has(table), `missing table: ${table}`).toBe(true);
      }
    } finally {
      database.close();
    }
  });

  it('create every index required by the index policy (doc 06 §41)', async () => {
    const database = await createMigratedDatabase();

    try {
      const rows = database.raw
        .prepare("select name from sqlite_master where type = 'index' and name not like 'sqlite_%'")
        .all() as { name: string }[];
      const present = new Set(rows.map((row) => row.name));

      for (const index of PHASE1_REQUIRED_INDEXES) {
        expect(present.has(index), `missing index: ${index}`).toBe(true);
      }
    } finally {
      database.close();
    }
  });

  it('are idempotent: re-applying the full set does not fail or duplicate', async () => {
    const database = await createMigratedDatabase();

    try {
      for (const migration of await readMigrations()) {
        database.exec(migration.sql);
      }

      const verification = await verifyPhase1Schema(database.db);
      expect(verification.complete).toBe(true);

      // The Phase 0 baseline marker must not be inserted twice.
      const row = database.raw
        .prepare("select count(*) as total from qima_schema_baseline where phase = 'phase-0'")
        .get() as { total: number };
      expect(row.total).toBe(1);
    } finally {
      database.close();
    }
  });

  it('contain no destructive statement (IMPLEMENTATION_RULES §7)', async () => {
    for (const migration of await readMigrations()) {
      const sql = migration.sql.toUpperCase();

      expect(sql, `${migration.name} must not DROP TABLE`).not.toMatch(/\bDROP\s+TABLE\b/);
      expect(sql, `${migration.name} must not DROP COLUMN`).not.toMatch(/\bDROP\s+COLUMN\b/);
      expect(sql, `${migration.name} must not TRUNCATE`).not.toMatch(/\bTRUNCATE\b/);
    }
  });

  it('declare no operational Phase 4+ table (phase boundary)', async () => {
    const database = await createMigratedDatabase();

    try {
      const rows = database.raw
        .prepare("select name from sqlite_master where type = 'table'")
        .all() as { name: string }[];
      const present = new Set(rows.map((row) => row.name));

      // doc 10 §24: these belong to Phase 4 and later. Their presence now would
      // mean Phase 1 quietly implemented future scope.
      for (const future of [
        'programs',
        'activities',
        'participants',
        'registrations',
        'attendance_records',
        'contents',
      ]) {
        expect(present.has(future), `Phase 4+ table leaked into Phase 1: ${future}`).toBe(false);
      }
    } finally {
      database.close();
    }
  });

  it('enable foreign key enforcement rather than assuming the default', async () => {
    const database = await createMigratedDatabase();

    try {
      const row = database.raw.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
      expect(row.foreign_keys).toBe(1);
    } finally {
      database.close();
    }
  });
});

describe('Phase 1 constraints', () => {
  const ORG = "'org-1', 'Yayasan Satu', 'yayasan-satu'";

  it('reject a unit whose organization does not exist (referential integrity)', async () => {
    const database = await createMigratedDatabase();

    try {
      const error = expectRejected(() => {
        database.exec(
          "insert into units (id, organization_id, name, slug) values ('u-1', 'org-missing', 'Unit', 'unit')",
        );
      });

      expect(error.message).toMatch(/FOREIGN KEY/i);
    } finally {
      database.close();
    }
  });

  it('allow the same unit slug in different organizations but not within one', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec(`insert into organizations (id, name, slug) values (${ORG})`);
      database.exec(
        "insert into organizations (id, name, slug) values ('org-2', 'Yayasan Dua', 'yayasan-dua')",
      );

      database.exec(
        "insert into units (id, organization_id, name, slug) values ('u-1', 'org-1', 'Pusat', 'pusat')",
      );

      // Same slug, different organization — permitted by doc 06 §5.
      database.exec(
        "insert into units (id, organization_id, name, slug) values ('u-2', 'org-2', 'Pusat', 'pusat')",
      );

      // Same slug, same organization — must be rejected.
      const error = expectRejected(() => {
        database.exec(
          "insert into units (id, organization_id, name, slug) values ('u-3', 'org-1', 'Pusat Lain', 'pusat')",
        );
      });

      expect(error.message).toMatch(/UNIQUE/i);
    } finally {
      database.close();
    }
  });

  it('reject an organization slug that is not URL-safe', async () => {
    const database = await createMigratedDatabase();

    try {
      for (const slug of ['Yayasan Satu', 'YAYASAN', 'yayasan_satu', 'yayasan.satu']) {
        const error = expectRejected(() => {
          database.exec(
            `insert into organizations (id, name, slug) values ('org-x', 'X', '${slug}')`,
          );
        });
        expect(error.message, `slug should be rejected: ${slug}`).toMatch(/CHECK|constraint/i);
      }
    } finally {
      database.close();
    }
  });

  it('reject a blank organization name', async () => {
    const database = await createMigratedDatabase();

    try {
      const error = expectRejected(() => {
        database.exec("insert into organizations (id, name, slug) values ('org-x', '   ', 'orgx')");
      });
      expect(error.message).toMatch(/CHECK|constraint/i);
    } finally {
      database.close();
    }
  });

  it('reject an invalid organization status', async () => {
    const database = await createMigratedDatabase();

    try {
      const error = expectRejected(() => {
        database.exec(
          "insert into organizations (id, name, slug, status) values ('org-x', 'X', 'orgx', 'deleted')",
        );
      });
      expect(error.message).toMatch(/CHECK|constraint/i);
    } finally {
      database.close();
    }
  });

  it('enforce lowercase, globally unique user emails', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec(
        "insert into users (id, name, email, password_hash) values ('u-1', 'Ali', 'ali@example.com', 'hash')",
      );

      const uppercase = expectRejected(() => {
        database.exec(
          "insert into users (id, name, email, password_hash) values ('u-2', 'Budi', 'Budi@Example.com', 'hash')",
        );
      });
      expect(uppercase.message).toMatch(/CHECK|constraint/i);

      const duplicate = expectRejected(() => {
        database.exec(
          "insert into users (id, name, email, password_hash) values ('u-3', 'Ali Dua', 'ali@example.com', 'hash')",
        );
      });
      expect(duplicate.message).toMatch(/UNIQUE/i);
    } finally {
      database.close();
    }
  });

  it('reject a malformed user email', async () => {
    const database = await createMigratedDatabase();

    try {
      for (const email of ['ali', 'ali@', '@example.com', 'ali@example']) {
        const error = expectRejected(() => {
          database.exec(
            `insert into users (id, name, email, password_hash) values ('u-x', 'X', '${email}', 'hash')`,
          );
        });
        expect(error.message, `email should be rejected: ${email}`).toMatch(/CHECK|constraint/i);
      }
    } finally {
      database.close();
    }
  });

  it('reject an empty password hash so a credential-less account cannot exist', async () => {
    const database = await createMigratedDatabase();

    try {
      const error = expectRejected(() => {
        database.exec(
          "insert into users (id, name, email, password_hash) values ('u-x', 'X', 'x@example.com', '')",
        );
      });
      expect(error.message).toMatch(/CHECK|constraint/i);
    } finally {
      database.close();
    }
  });

  it('enforce the resource.action permission key contract in the database', async () => {
    const database = await createMigratedDatabase();

    try {
      // key must equal resource || '.' || action
      const mismatched = expectRejected(() => {
        database.exec(
          "insert into permissions (id, key, resource, action) values ('p-1', 'units.write', 'units', 'update')",
        );
      });
      expect(mismatched.message).toMatch(/CHECK|constraint/i);

      // uppercase keys are rejected
      const uppercase = expectRejected(() => {
        database.exec(
          "insert into permissions (id, key, resource, action) values ('p-2', 'Units.Read', 'Units', 'Read')",
        );
      });
      expect(uppercase.message).toMatch(/CHECK|constraint/i);

      // a valid key is accepted
      database.exec(
        "insert into permissions (id, key, resource, action) values ('p-3', 'units.read', 'units', 'read')",
      );
    } finally {
      database.close();
    }
  });

  it('allow at most one primary domain per site', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec(`insert into organizations (id, name, slug) values (${ORG})`);
      database.exec(
        "insert into units (id, organization_id, name, slug) values ('u-1', 'org-1', 'Pusat', 'pusat')",
      );
      database.exec("insert into sites (id, unit_id, name, slug) values ('s-1', 'u-1', 'Situs', 'situs')");

      database.exec(
        "insert into domain_mappings (id, site_id, domain, is_primary) values ('d-1', 's-1', 'satu.example.com', 1)",
      );

      const second = expectRejected(() => {
        database.exec(
          "insert into domain_mappings (id, site_id, domain, is_primary) values ('d-2', 's-1', 'dua.example.com', 1)",
        );
      });
      expect(second.message).toMatch(/UNIQUE/i);

      // A non-primary additional domain is still allowed.
      database.exec(
        "insert into domain_mappings (id, site_id, domain, is_primary) values ('d-3', 's-1', 'tiga.example.com', 0)",
      );
    } finally {
      database.close();
    }
  });

  it('keep a hostname globally unique across sites (doc 06 §7)', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec(`insert into organizations (id, name, slug) values (${ORG})`);
      database.exec(
        "insert into units (id, organization_id, name, slug) values ('u-1', 'org-1', 'Pusat', 'pusat')",
      );
      database.exec("insert into sites (id, unit_id, name, slug) values ('s-1', 'u-1', 'A', 'a')");
      database.exec("insert into sites (id, unit_id, name, slug) values ('s-2', 'u-1', 'B', 'b')");

      database.exec(
        "insert into domain_mappings (id, site_id, domain) values ('d-1', 's-1', 'sama.example.com')",
      );

      const error = expectRejected(() => {
        database.exec(
          "insert into domain_mappings (id, site_id, domain) values ('d-2', 's-2', 'sama.example.com')",
        );
      });
      expect(error.message).toMatch(/UNIQUE/i);
    } finally {
      database.close();
    }
  });

  it('reject a duplicate role assignment', async () => {
    const database = await createMigratedDatabase({ seed: true });

    try {
      database.exec(`insert into organizations (id, name, slug) values (${ORG})`);
      database.exec(
        "insert into users (id, name, email, password_hash) values ('u-1', 'Ali', 'ali@example.com', 'hash')",
      );

      const role = database.raw.prepare("select id from roles where key = 'ORG_ADMIN'").get() as {
        id: string;
      };

      database.exec(
        `insert into user_organization_roles (id, user_id, organization_id, role_id) values ('a-1', 'u-1', 'org-1', '${role.id}')`,
      );

      const error = expectRejected(() => {
        database.exec(
          `insert into user_organization_roles (id, user_id, organization_id, role_id) values ('a-2', 'u-1', 'org-1', '${role.id}')`,
        );
      });
      expect(error.message).toMatch(/UNIQUE/i);
    } finally {
      database.close();
    }
  });

  it('prevent deleting an organization that still owns units (ON DELETE RESTRICT)', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec(`insert into organizations (id, name, slug) values (${ORG})`);
      database.exec(
        "insert into units (id, organization_id, name, slug) values ('u-1', 'org-1', 'Pusat', 'pusat')",
      );

      const error = expectRejected(() => {
        database.exec("delete from organizations where id = 'org-1'");
      });
      expect(error.message).toMatch(/FOREIGN KEY|constraint/i);
    } finally {
      database.close();
    }
  });

  it('enforce per-scope setting key uniqueness (doc 06 §16)', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec(`insert into organizations (id, name, slug) values (${ORG})`);
      database.exec(
        "insert into organization_settings (id, organization_id, key, value) values ('os-1', 'org-1', 'branding', '{}')",
      );

      const error = expectRejected(() => {
        database.exec(
          "insert into organization_settings (id, organization_id, key, value) values ('os-2', 'org-1', 'branding', '{}')",
        );
      });
      expect(error.message).toMatch(/UNIQUE/i);
    } finally {
      database.close();
    }
  });
});

describe('audit_logs append-only contract (doc 06 §15)', () => {
  async function seededAudit() {
    const database = await createMigratedDatabase();
    database.exec(
      "insert into audit_logs (id, action, resource_type) values ('a-1', 'CREATE', 'organization')",
    );
    return database;
  }

  it('accepts an append', async () => {
    const database = await seededAudit();

    try {
      const row = database.raw.prepare('select count(*) as total from audit_logs').get() as {
        total: number;
      };
      expect(row.total).toBe(1);
    } finally {
      database.close();
    }
  });

  it('rejects UPDATE at the database level, not merely in application code', async () => {
    const database = await seededAudit();

    try {
      const error = expectRejected(() => {
        database.exec("update audit_logs set action = 'DELETE' where id = 'a-1'");
      });
      expect(error.message).toMatch(/append-only/i);
    } finally {
      database.close();
    }
  });

  it('rejects reassigning an event to another tenant', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec(
        "insert into organizations (id, name, slug) values ('org-1', 'A', 'a'), ('org-2', 'B', 'b')",
      );
      database.exec(
        "insert into audit_logs (id, organization_id, action, resource_type) values ('a-3', 'org-1', 'CREATE', 'unit')",
      );

      // The content columns are immutable, so an attacker's remaining lever is
      // the scope column: moving an event into another tenant's trail.
      const error = expectRejected(() => {
        database.exec("update audit_logs set organization_id = 'org-2' where id = 'a-3'");
      });
      expect(error.message).toMatch(/append-only/i);
    } finally {
      database.close();
    }
  });

  it('still allows the declared ON DELETE SET NULL foreign-key action', async () => {
    const database = await createMigratedDatabase();

    try {
      database.exec("insert into organizations (id, name, slug) values ('org-1', 'A', 'a')");
      database.exec(
        "insert into audit_logs (id, organization_id, action, resource_type) values ('a-4', 'org-1', 'DELETE', 'organization')",
      );

      // Regression guard: a blanket BEFORE UPDATE trigger aborts this cascade,
      // which would make any audited organization impossible to delete.
      database.exec("delete from organizations where id = 'org-1'");

      const row = database.raw
        .prepare("select organization_id, action from audit_logs where id = 'a-4'")
        .get() as { organization_id: string | null; action: string };

      expect(row.organization_id).toBeNull();
      expect(row.action).toBe('DELETE');
    } finally {
      database.close();
    }
  });

  it('rejects DELETE at the database level', async () => {
    const database = await seededAudit();

    try {
      const error = expectRejected(() => {
        database.exec("delete from audit_logs where id = 'a-1'");
      });
      expect(error.message).toMatch(/append-only/i);
    } finally {
      database.close();
    }
  });

  it('allows a platform-level event with no tenant or actor', async () => {
    const database = await createMigratedDatabase();

    try {
      // A failed pre-authentication LOGIN has no organization, unit or user.
      database.exec(
        "insert into audit_logs (id, action, resource_type) values ('a-2', 'LOGIN', 'session')",
      );

      const row = database.raw
        .prepare("select organization_id, unit_id, user_id from audit_logs where id = 'a-2'")
        .get() as { organization_id: null; unit_id: null; user_id: null };

      expect(row.organization_id).toBeNull();
      expect(row.unit_id).toBeNull();
      expect(row.user_id).toBeNull();
    } finally {
      database.close();
    }
  });
});
