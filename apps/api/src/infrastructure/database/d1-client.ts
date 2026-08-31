/**
 * QIMA D1 database client — Phase 1 task T1.01 (Database connection).
 *
 * Traceability:
 * - doc 10 §24 PHASE 1 task T1.01 Database connection.
 * - doc 08 §11 Infrastructure Layer: the database driver is confined here and
 *   never leaks into the domain.
 * - doc 08 §12 Error Handling Rule: a missing binding is an explicit,
 *   actionable failure — never a silent fallback that pretends to work.
 *
 * The client is intentionally thin: it resolves the binding, exposes typed
 * helpers, and translates driver failures into a QIMA-safe error. Query shapes
 * belong to the repositories that own them.
 */

/** Raised when the database is unusable. Carries no driver internals. */
export class DatabaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

export class DatabaseQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseQueryError';
  }
}

/**
 * Minimal structural contract of the D1 API actually used by QIMA.
 *
 * Declared structurally rather than importing `D1Database` so that the
 * repositories can also run against any driver exposing the same surface —
 * which is what makes the migration integration tests possible without a
 * Workers runtime (doc 09 Testing Pyramid).
 */
export interface QimaPreparedStatement {
  bind(...values: unknown[]): QimaPreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

export interface QimaDatabase {
  prepare(query: string): QimaPreparedStatement;
}

/**
 * Resolve the D1 binding from the runtime environment.
 *
 * Throws instead of returning `null`: callers that need the database must fail
 * loudly, and callers that merely probe availability check the binding
 * themselves.
 */
export function requireDatabase(binding: QimaDatabase | undefined): QimaDatabase {
  if (binding === undefined || binding === null) {
    throw new DatabaseUnavailableError('Database binding is not configured for this environment.');
  }
  return binding;
}

/** Fetch at most one row. */
export async function queryFirst<T>(
  db: QimaDatabase,
  sql: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  try {
    return await db.prepare(sql).bind(...params).first<T>();
  } catch {
    // Driver detail is deliberately dropped: doc 08 §12 forbids forwarding
    // internal errors outward.
    throw new DatabaseQueryError('Database query failed.');
  }
}

/** Fetch all matching rows. */
export async function queryAll<T>(
  db: QimaDatabase,
  sql: string,
  params: readonly unknown[] = [],
): Promise<readonly T[]> {
  try {
    const result = await db.prepare(sql).bind(...params).all<T>();
    return result.results ?? [];
  } catch {
    throw new DatabaseQueryError('Database query failed.');
  }
}

/** Execute a write statement. */
export async function execute(
  db: QimaDatabase,
  sql: string,
  params: readonly unknown[] = [],
): Promise<void> {
  try {
    await db.prepare(sql).bind(...params).run();
  } catch {
    throw new DatabaseQueryError('Database write failed.');
  }
}

/**
 * Count rows for a scoped query (doc 06 §34 Pagination).
 *
 * `sql` must already include its scope predicate; this helper never builds an
 * unscoped count.
 */
export async function queryCount(
  db: QimaDatabase,
  sql: string,
  params: readonly unknown[] = [],
): Promise<number> {
  const row = await queryFirst<{ total: number }>(db, sql, params);
  return row?.total ?? 0;
}
