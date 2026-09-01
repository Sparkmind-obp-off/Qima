/**
 * QIMA schema inspector — Phase 1 task T1.02 (Migration system).
 *
 * Traceability:
 * - doc 10 §24 PHASE 1 exit criteria: "Fresh database migration",
 *   "Constraints validated".
 * - doc 06 §41 Database Index Policy.
 * - .codex/QUALITY_GATES.md §8 Gate 5: "Migrations apply successfully.
 *   Relevant constraints and indexes behave as intended."
 *
 * Purpose: verify at runtime that the database actually matches the Phase 1
 * schema contract declared by the domain. This turns "the migration file
 * exists" into "the applied database has the required tables and indexes",
 * which is the property the exit criteria require.
 *
 * Read-only by design: this module never issues DDL.
 */

import {
  PHASE1_REQUIRED_INDEXES,
  PHASE1_TABLES,
  PHASE2_REQUIRED_INDEXES,
  PHASE2_TABLES,
} from '@qima/domain';
import { queryAll, type QimaDatabase } from './d1-client';

export interface SchemaVerification {
  readonly complete: boolean;
  readonly missingTables: readonly string[];
  readonly missingIndexes: readonly string[];
  readonly tableCount: number;
}

/** List user tables present in the database (SQLite internal tables excluded). */
export async function listTables(db: QimaDatabase): Promise<readonly string[]> {
  const rows = await queryAll<{ name: string }>(
    db,
    "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%' order by name",
  );
  return rows.map((row) => row.name);
}

/** List explicitly created indexes (auto-indexes from UNIQUE excluded). */
export async function listIndexes(db: QimaDatabase): Promise<readonly string[]> {
  const rows = await queryAll<{ name: string }>(
    db,
    "select name from sqlite_master where type = 'index' and name not like 'sqlite_%' order by name",
  );
  return rows.map((row) => row.name);
}

/**
 * Compare the live database against the Phase 1 schema contract.
 *
 * Reports what is missing rather than throwing, so a caller can surface a
 * precise, non-secret diagnostic (doc 08 §12).
 */
export async function verifyPhase1Schema(db: QimaDatabase): Promise<SchemaVerification> {
  return verifySchema(db, PHASE1_TABLES, PHASE1_REQUIRED_INDEXES);
}

/**
 * Compare the live database against the Phase 2 schema contract (T2.02).
 *
 * Kept separate from the Phase 1 check so a deployment can report exactly which
 * phase's migrations are missing, instead of a single opaque "schema incomplete".
 */
export async function verifyPhase2Schema(db: QimaDatabase): Promise<SchemaVerification> {
  return verifySchema(db, PHASE2_TABLES, PHASE2_REQUIRED_INDEXES);
}

/** Shared comparison used by the per-phase verifiers. */
async function verifySchema(
  db: QimaDatabase,
  requiredTables: readonly string[],
  requiredIndexes: readonly string[],
): Promise<SchemaVerification> {
  const [tables, indexes] = await Promise.all([listTables(db), listIndexes(db)]);

  const tableSet = new Set(tables);
  const indexSet = new Set(indexes);

  const missingTables = requiredTables.filter((table) => !tableSet.has(table));
  const missingIndexes = requiredIndexes.filter((index) => !indexSet.has(index));

  return {
    complete: missingTables.length === 0 && missingIndexes.length === 0,
    missingTables,
    missingIndexes,
    tableCount: tables.length,
  };
}
