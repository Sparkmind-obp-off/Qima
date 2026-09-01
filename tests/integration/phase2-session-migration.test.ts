import { describe, expect, it } from 'vitest';
import {
  PHASE2_REQUIRED_INDEXES,
  PHASE2_TABLES,
  SESSION_IMMUTABLE_COLUMNS,
} from '@qima/domain';
import { verifyPhase2Schema } from '../../apps/api/src/infrastructure/database/schema-inspector';
import { createMigratedDatabase, expectRejected, readMigrations } from './sqlite-harness';

/**
 * Phase 2 task T2.02 — session schema.
 *
 * doc 10 §24 PHASE 2; doc 06 §42 "Token/session expiration"; doc 09 §38
 * "Session security".
 *
 * These tests apply the real migration files to a real SQLite database, so a
 * CHECK constraint that never fires or a trigger that never aborts is caught
 * here rather than in production.
 */

const USER_ID = '99999999-0000-4000-8000-000000000001';
const OTHER_USER_ID = '99999999-0000-4000-8000-000000000002';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

/** Insert the user rows the session foreign key depends on. */
function seedUsers(database: Awaited<ReturnType<typeof createMigratedDatabase>>): void {
  database.exec(`
    INSERT INTO users (id, name, email, password_hash, status) VALUES
      ('${USER_ID}', 'Session User', 'session.user@example.com', 'pbkdf2-sha256$1$x$y', 'active'),
      ('${OTHER_USER_ID}', 'Other User', 'other.user@example.com', 'pbkdf2-sha256$1$x$y', 'active');
  `);
}

function insertSession(
  database: Awaited<ReturnType<typeof createMigratedDatabase>>,
  overrides: Partial<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: string;
    createdAt: string;
  }> = {},
): void {
  const id = overrides.id ?? 'session-1';
  const userId = overrides.userId ?? USER_ID;
  const tokenHash = overrides.tokenHash ?? HASH_A;
  const createdAt = overrides.createdAt ?? '2026-01-01T00:00:00Z';
  const expiresAt = overrides.expiresAt ?? '2026-01-02T00:00:00Z';

  database.exec(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES ('${id}', '${userId}', '${tokenHash}', '${expiresAt}', '${createdAt}');
  `);
}

describe('Phase 2 session migration', () => {
  it('applies cleanly on top of the Phase 1 baseline', async () => {
    const database = await createMigratedDatabase();

    try {
      const verification = await verifyPhase2Schema(database.db);

      expect(verification.missingTables).toEqual([]);
      expect(verification.missingIndexes).toEqual([]);
      expect(verification.complete).toBe(true);
    } finally {
      database.close();
    }
  });

  it('creates every table declared by the Phase 2 schema contract', async () => {
    const database = await createMigratedDatabase();

    try {
      const rows = database.raw
        .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
        .all() as { name: string }[];
      const present = new Set(rows.map((row) => row.name));

      for (const table of PHASE2_TABLES) {
        expect(present.has(table), `missing table: ${table}`).toBe(true);
      }
    } finally {
      database.close();
    }
  });

  it('creates every required session index', async () => {
    const database = await createMigratedDatabase();

    try {
      const rows = database.raw
        .prepare("select name from sqlite_master where type = 'index' and name not like 'sqlite_%'")
        .all() as { name: string }[];
      const present = new Set(rows.map((row) => row.name));

      for (const index of PHASE2_REQUIRED_INDEXES) {
        expect(present.has(index), `missing index: ${index}`).toBe(true);
      }
    } finally {
      database.close();
    }
  });

  it('is idempotent: re-applying the full migration set does not fail', async () => {
    const database = await createMigratedDatabase();

    try {
      for (const migration of await readMigrations()) {
        database.exec(migration.sql);
      }

      const verification = await verifyPhase2Schema(database.db);
      expect(verification.complete).toBe(true);
    } finally {
      database.close();
    }
  });

  it('leaves the Phase 1 tables untouched (additive migration)', async () => {
    // .codex/IMPLEMENTATION_RULES.md §7: migrations are additive.
    const database = await createMigratedDatabase();

    try {
      const columns = database.raw.prepare('pragma table_info(users)').all() as { name: string }[];
      const names = columns.map((column) => column.name);

      expect(names).toContain('password_hash');
      expect(names).toContain('status');
    } finally {
      database.close();
    }
  });
});

describe('session constraints (doc 06 §42)', () => {
  it('accepts a well-formed session row', async () => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      expect(() => insertSession(database)).not.toThrow();
    } finally {
      database.close();
    }
  });

  it('rejects a session for a user that does not exist', async () => {
    const database = await createMigratedDatabase();

    try {
      const error = expectRejected(() =>
        insertSession(database, { userId: 'ghost-user' }),
      );
      expect(error.message).toMatch(/FOREIGN KEY/i);
    } finally {
      database.close();
    }
  });

  it('rejects a raw (non-hashed) token in token_hash', async () => {
    // The CHECK exists so a writer cannot accidentally persist a bearer token.
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      expectRejected(() => insertSession(database, { tokenHash: 'plain-session-token' }));
    } finally {
      database.close();
    }
  });

  it.each([
    ['too short', 'a'.repeat(63)],
    ['too long', 'a'.repeat(65)],
    ['uppercase hex', 'A'.repeat(64)],
    ['non-hex characters', 'z'.repeat(64)],
  ])('rejects a token hash that is %s', async (_label, tokenHash) => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      expectRejected(() => insertSession(database, { tokenHash }));
    } finally {
      database.close();
    }
  });

  it('rejects a duplicate token hash', async () => {
    // Two sessions sharing a hash would make the lookup ambiguous and could
    // authenticate the wrong user.
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      insertSession(database, { id: 'session-1', tokenHash: HASH_A });

      expectRejected(() =>
        insertSession(database, { id: 'session-2', userId: OTHER_USER_ID, tokenHash: HASH_A }),
      );
    } finally {
      database.close();
    }
  });

  it('allows the same user to hold several distinct sessions', async () => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      insertSession(database, { id: 'session-1', tokenHash: HASH_A });

      expect(() =>
        insertSession(database, { id: 'session-2', tokenHash: HASH_B }),
      ).not.toThrow();
    } finally {
      database.close();
    }
  });

  it('rejects a session that expires at or before its creation instant', async () => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);

      expectRejected(() =>
        insertSession(database, {
          createdAt: '2026-01-02T00:00:00Z',
          expiresAt: '2026-01-01T00:00:00Z',
        }),
      );
      expectRejected(() =>
        insertSession(database, {
          id: 'session-equal',
          tokenHash: HASH_B,
          createdAt: '2026-01-02T00:00:00Z',
          expiresAt: '2026-01-02T00:00:00Z',
        }),
      );
    } finally {
      database.close();
    }
  });

  it('deletes a user\u2019s sessions when the user is deleted', async () => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      insertSession(database);

      database.exec(`DELETE FROM users WHERE id = '${USER_ID}';`);

      const remaining = database.raw
        .prepare('select count(*) as total from sessions')
        .get() as { total: number };
      expect(remaining.total).toBe(0);
    } finally {
      database.close();
    }
  });
});

describe('session identity immutability (privilege-escalation guard)', () => {
  it.each(SESSION_IMMUTABLE_COLUMNS)('rejects an UPDATE of %s', async (column) => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      insertSession(database);

      const value = column === 'token_hash' ? HASH_B : column === 'user_id' ? OTHER_USER_ID : '2020-01-01T00:00:00Z';

      const error = expectRejected(() =>
        database.exec(`UPDATE sessions SET ${column} = '${value}' WHERE id = 'session-1';`),
      );
      expect(error.message).toMatch(/immutable/i);
    } finally {
      database.close();
    }
  });

  it('permits revocation (logout writes revoked_at)', async () => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      insertSession(database);

      expect(() =>
        database.exec(
          "UPDATE sessions SET revoked_at = '2026-01-01T12:00:00Z' WHERE id = 'session-1';",
        ),
      ).not.toThrow();

      const row = database.raw
        .prepare("select revoked_at from sessions where id = 'session-1'")
        .get() as { revoked_at: string | null };
      expect(row.revoked_at).toBe('2026-01-01T12:00:00Z');
    } finally {
      database.close();
    }
  });

  it('permits activity tracking (last_used_at)', async () => {
    const database = await createMigratedDatabase();

    try {
      seedUsers(database);
      insertSession(database);

      expect(() =>
        database.exec(
          "UPDATE sessions SET last_used_at = '2026-01-01T06:00:00Z' WHERE id = 'session-1';",
        ),
      ).not.toThrow();
    } finally {
      database.close();
    }
  });
});
