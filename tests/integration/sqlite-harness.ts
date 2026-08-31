/**
 * QIMA migration test harness — Phase 1 (Database Foundation).
 *
 * Traceability:
 * - doc 10 §24 PHASE 1 exit criteria: "Fresh database migration",
 *   "Constraints validated", "Seed works".
 * - .codex/QUALITY_GATES.md Gate 5: "Migrations apply successfully. Relevant
 *   constraints and indexes behave as intended."
 * - .codex/IMPLEMENTATION_RULES.md §14 Dependency Rule: prefer native
 *   capability over a new dependency.
 *
 * Why a real database: D1 is SQLite. Node 22 ships `node:sqlite`, so the Phase 1
 * migrations can be applied to a genuine in-memory SQLite database and the
 * declared constraints can be exercised for real. Asserting against a mocked
 * driver would only prove the mock agrees with itself — it could not detect a
 * CHECK constraint that never fires or a foreign key that was never enforced,
 * which is exactly what the exit criteria are about.
 *
 * The harness also adapts SQLite to the `QimaDatabase` structural contract, so
 * the production repositories are tested as-is rather than through a parallel
 * implementation.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { QimaDatabase, QimaPreparedStatement } from '../../apps/api/src/infrastructure/database/d1-client';

const MIGRATIONS_DIR = 'database/migrations';
const SEEDS_DIR = 'database/seeds';

/** Read the migration files in the order wrangler would apply them. */
export async function readMigrations(): Promise<readonly { name: string; sql: string }[]> {
  const entries = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();

  return Promise.all(
    entries.map(async (name) => ({
      name,
      sql: await readFile(join(MIGRATIONS_DIR, name), 'utf8'),
    })),
  );
}

export async function readSeeds(): Promise<readonly { name: string; sql: string }[]> {
  const entries = (await readdir(SEEDS_DIR)).filter((name) => name.endsWith('.sql')).sort();

  return Promise.all(
    entries.map(async (name) => ({
      name,
      sql: await readFile(join(SEEDS_DIR, name), 'utf8'),
    })),
  );
}

/**
 * Adapt `node:sqlite` to the `QimaDatabase` contract used by the repositories.
 *
 * `DatabaseSync` is synchronous; the contract is promise-based, so results are
 * simply wrapped. Booleans are converted to integers because SQLite has no
 * boolean type and the D1 driver applies the same coercion.
 */
function adapt(db: DatabaseSync): QimaDatabase {
  return {
    prepare(query: string): QimaPreparedStatement {
      let bound: unknown[] = [];

      const statement: QimaPreparedStatement = {
        bind(...values: unknown[]) {
          bound = values.map((value) => (typeof value === 'boolean' ? (value ? 1 : 0) : value));
          return statement;
        },
        async first<T>() {
          const row = db.prepare(query).get(...(bound as never[]));
          return (row ?? null) as T | null;
        },
        async all<T>() {
          const rows = db.prepare(query).all(...(bound as never[]));
          return { results: rows as T[] };
        },
        async run() {
          return db.prepare(query).run(...(bound as never[]));
        },
      };

      return statement;
    },
  };
}

export interface TestDatabase {
  readonly raw: DatabaseSync;
  readonly db: QimaDatabase;
  /** Run arbitrary SQL directly; throws on constraint violation. */
  exec(sql: string): void;
  close(): void;
}

/**
 * Create a fresh in-memory database with every Phase 1 migration applied.
 *
 * Foreign keys are enabled explicitly: SQLite defaults them OFF, so a test that
 * forgot this would silently pass while cross-tenant referential integrity was
 * not enforced at all.
 */
export async function createMigratedDatabase(options?: { seed?: boolean }): Promise<TestDatabase> {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');

  for (const migration of await readMigrations()) {
    raw.exec(migration.sql);
  }

  if (options?.seed === true) {
    for (const seed of await readSeeds()) {
      raw.exec(seed.sql);
    }
  }

  return {
    raw,
    db: adapt(raw),
    exec(sql: string) {
      raw.exec(sql);
    },
    close() {
      raw.close();
    },
  };
}

/** Assert that a statement is rejected by the database, not by application code. */
export function expectRejected(run: () => void): Error {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error('Expected the database to reject the statement, but it succeeded.');
}
