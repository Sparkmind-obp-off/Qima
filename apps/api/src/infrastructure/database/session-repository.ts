/**
 * QIMA D1 session repository — Phase 2 task T2.02 (Session management).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.02 Session management.
 * - doc 06 §44 Repository Contract, §49 Implementation Rule: SQL and row
 *   mapping live in infrastructure, the contract lives in the domain.
 * - doc 06 §42 API Security Contract: "Token/session expiration".
 * - doc 06 §39 ID Policy, §40 Timestamp Policy (UTC ISO-8601).
 * - doc 08 §11 Infrastructure Layer: the driver stays confined to this layer.
 * - .codex/IMPLEMENTATION_RULES.md §6: validation is layered — the domain
 *   invariants asserted here are mirrored by the CHECK constraints and the
 *   immutability trigger in migration 0004, not replaced by them.
 *
 * Scope: persistence of the `sessions` table declared by migration 0004,
 * implementing the domain `SessionRepository` contract. The login and logout
 * endpoints (T2.03/T2.04) and the authorization middleware (T2.09) are NOT
 * implemented here; this adapter only reads and writes rows.
 *
 * SECURITY BOUNDARY — this file never sees a raw session token. Every entry
 * point takes a token *hash*, so no SQL parameter, driver trace or query log
 * produced below can contain a bearer credential. `session-token-service.ts`
 * owns the raw token, and it never crosses into this module.
 */

import {
  assertIssuableSession,
  assertValidTokenHash,
  SessionPolicyError,
  toUtcTimestamp,
} from '@qima/domain';
import type { Session, SessionIssueInput, SessionRepository } from '@qima/domain';
import { execute, queryAll, queryCount, queryFirst, type QimaDatabase } from './d1-client';

// ---------------------------------------------------------------------------
// Row shape and mapper (snake_case persistence -> camelCase domain)
// ---------------------------------------------------------------------------

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

/**
 * Shape of the fixed-width UTC timestamp the `sessions` table stores.
 *
 * This is not a new domain rule: it is the exact output of the domain's
 * `toUtcTimestamp`, asserted at the persistence boundary because the schema
 * compares `expires_at > created_at` as *text*. A value carrying milliseconds
 * or a `+07:00` offset would compare wrongly and silently produce a session
 * that never expires — or one that is dead on arrival.
 */
const STORED_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function assertStoredTimestamp(field: string, value: string): void {
  if (value.length === 0) {
    throw new SessionPolicyError(field, `session ${field} is required.`);
  }
  if (!STORED_TIMESTAMP_PATTERN.test(value)) {
    throw new SessionPolicyError(
      field,
      `session ${field} must be a UTC timestamp of the form YYYY-MM-DDTHH:MM:SSZ.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * D1 implementation of the domain `SessionRepository` contract.
 *
 * `now` is injected — following the `createAuditRepository` convention — so the
 * creation instant is deterministic under test. It is NOT a caller-supplied
 * field: a client must never be able to influence when a session was born,
 * because `created_at` is one side of the expiry comparison.
 */
export function createSessionRepository(
  db: QimaDatabase,
  now: () => Date = () => new Date(),
): SessionRepository {
  return {
    /**
     * Persist a newly issued session.
     *
     * `created_at` is written explicitly rather than left to the column
     * default: the domain validates `expiresAt > createdAt` before the insert,
     * and validating against a value the database would compute separately
     * would leave a gap where the two disagree.
     */
    async issue(input: SessionIssueInput): Promise<Session> {
      const createdAt = toUtcTimestamp(now());

      // Domain invariants first: an invalid session fails at the call site with
      // a typed error, not as an opaque SQLite constraint violation.
      assertStoredTimestamp('expiresAt', input.expiresAt);
      assertIssuableSession(input, createdAt);

      await execute(
        db,
        `insert into sessions
           (id, user_id, token_hash, expires_at, ip_address, user_agent, created_at)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          input.userId,
          input.tokenHash,
          input.expiresAt,
          input.ipAddress,
          input.userAgent,
          createdAt,
        ],
      );

      const row = await queryFirst<SessionRow>(db, 'select * from sessions where id = ?', [
        input.id,
      ]);
      if (row === null) {
        // A session that cannot be read back was never issued. Returning a
        // fabricated object here would hand the caller a token that
        // authenticates nothing.
        throw new SessionPolicyError('id', 'Session could not be persisted.');
      }

      return toSession(row);
    },

    /**
     * Lookup performed on every authenticated request.
     *
     * Deliberately returns the row WITHOUT filtering revoked or expired
     * sessions: the domain's `evaluateSession` must be able to tell REVOKED
     * from EXPIRED from NOT_FOUND (doc 06 §15). Filtering here would collapse
     * all three into "not found" and destroy that distinction in the audit
     * trail. Validity remains a domain decision, never an implicit SQL one.
     */
    async findByTokenHash(tokenHash: string): Promise<Session | null> {
      // Guard before the query, not after: this is the boundary that keeps a
      // raw bearer token out of the `token_hash` parameter entirely.
      assertValidTokenHash(tokenHash);

      const row = await queryFirst<SessionRow>(
        db,
        'select * from sessions where token_hash = ?',
        [tokenHash],
      );

      return row === null ? null : toSession(row);
    },

    /**
     * End a single session (logout, T2.04).
     *
     * Idempotent through `revoked_at is null`: a repeated logout is a no-op and
     * cannot overwrite the original revocation timestamp, which is the value
     * the audit trail relies on. An unknown id is also a no-op — the caller
     * already holds no live session either way, and reporting "not found" here
     * would let a caller probe for the existence of session ids.
     */
    async revoke(id: string, revokedAt: string): Promise<void> {
      assertStoredTimestamp('revokedAt', revokedAt);

      await execute(db, 'update sessions set revoked_at = ? where id = ? and revoked_at is null', [
        revokedAt,
        id,
      ]);
    },

    /**
     * Revoke every live session of a user (account suspension, credential
     * reset) and report how many were ended.
     *
     * The count is taken with the same predicate immediately before the update
     * rather than read from a driver result object: `changes` is exposed
     * differently by D1 and by other drivers implementing `QimaDatabase`, and a
     * shape-dependent read here would break silently on one of them. The count
     * is informational (audit sizing); the revocation itself is what must be
     * exact, and the single UPDATE statement guarantees that.
     */
    async revokeAllForUser(userId: string, revokedAt: string): Promise<number> {
      assertStoredTimestamp('revokedAt', revokedAt);

      const affected = await queryCount(
        db,
        'select count(*) as total from sessions where user_id = ? and revoked_at is null',
        [userId],
      );

      await execute(
        db,
        'update sessions set revoked_at = ? where user_id = ? and revoked_at is null',
        [revokedAt, userId],
      );

      return affected;
    },

    /**
     * Record request activity on a live session.
     *
     * The predicate refuses to touch a revoked or already-expired session:
     * `last_used_at` is read as evidence of genuine activity during session
     * security review (doc 09 §38), so stamping it on a dead session would make
     * a rejected request look like an accepted one. `lastUsedAt` doubles as the
     * "now" of the comparison — it IS the instant of the request being served.
     */
    async touch(id: string, lastUsedAt: string): Promise<void> {
      assertStoredTimestamp('lastUsedAt', lastUsedAt);

      await execute(
        db,
        `update sessions
            set last_used_at = ?
          where id = ?
            and revoked_at is null
            and expires_at > ?`,
        [lastUsedAt, id, lastUsedAt],
      );
    },
  };
}

/**
 * Live sessions of a user, most recently created first.
 *
 * Exposed as a standalone read rather than added to the domain contract: the
 * request path does not need it, and widening `SessionRepository` for an
 * operational query would put a non-request concern into the contract that
 * T2.09 depends on. Kept here so a future "active sessions" screen has one
 * correct implementation to reuse instead of inventing its own SQL.
 */
export async function listLiveSessionsForUser(
  db: QimaDatabase,
  userId: string,
  at: Date,
): Promise<readonly Session[]> {
  const rows = await queryAll<SessionRow>(
    db,
    `select * from sessions
      where user_id = ?
        and revoked_at is null
        and expires_at > ?
      order by created_at desc, id desc`,
    [userId, toUtcTimestamp(at)],
  );

  return rows.map(toSession);
}
