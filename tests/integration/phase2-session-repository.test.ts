import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_TTL_SECONDS,
  SessionPolicyError,
  evaluateSession,
  sessionExpiryFrom,
  toUtcTimestamp,
} from '@qima/domain';
import type { SessionRepository } from '@qima/domain';
import {
  createSessionRepository,
  listLiveSessionsForUser,
} from '../../apps/api/src/infrastructure/database/session-repository';
import { webCryptoSessionTokenService } from '../../apps/api/src/infrastructure/security/session-token-service';
import { createMigratedDatabase, expectRejected, type TestDatabase } from './sqlite-harness';

/**
 * Phase 2 task T2.02 — session repository (D1 adapter).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 task T2.02 Session management.
 * - doc 06 §44 Repository Contract; §42 "Token/session expiration".
 * - doc 09 §38 Session security.
 * - .codex/QUALITY_GATES.md Gate 5 (constraints behave as intended),
 *   Gate 10 (credential hygiene).
 *
 * These run the real repository against a real SQLite database with migration
 * 0004 applied. That matters here more than anywhere else in Phase 2: the
 * defects worth catching are a UNIQUE constraint that never fires, an
 * immutability trigger that never aborts, and a revocation predicate that
 * silently updates the wrong rows — none of which a mocked driver can detect.
 */

const USER = '99999999-0000-4000-8000-000000000001';
const OTHER_USER = '99999999-0000-4000-8000-000000000002';

/** Obviously synthetic hashes: correct shape, no credential value. */
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);

const ISSUED_AT = new Date('2026-01-01T00:00:00Z');
const EXPIRES_AT = sessionExpiryFrom(ISSUED_AT);

async function sessionDatabase(): Promise<TestDatabase> {
  const database = await createMigratedDatabase();

  database.exec(`
    insert into users (id, name, email, password_hash, status) values
      ('${USER}', 'Session User', 'session.user@example.com', 'pbkdf2-sha256$1$x$y', 'active'),
      ('${OTHER_USER}', 'Other User', 'other.user@example.com', 'pbkdf2-sha256$1$x$y', 'active');
  `);

  return database;
}

function issueInput(
  overrides: Partial<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'session-a',
    userId: overrides.userId ?? USER,
    tokenHash: overrides.tokenHash ?? HASH_A,
    expiresAt: overrides.expiresAt ?? EXPIRES_AT,
    ipAddress: overrides.ipAddress === undefined ? '203.0.113.10' : overrides.ipAddress,
    userAgent: overrides.userAgent === undefined ? 'qima-test/1.0' : overrides.userAgent,
  };
}

describe('session repository — issue', () => {
  let database: TestDatabase;
  let sessions: SessionRepository;

  beforeEach(async () => {
    database = await sessionDatabase();
    sessions = createSessionRepository(database.db, () => ISSUED_AT);
  });

  it('persists a session and returns it mapped to the domain shape', async () => {
    const session = await sessions.issue(issueInput());

    expect(session.id).toBe('session-a');
    expect(session.userId).toBe(USER);
    expect(session.tokenHash).toBe(HASH_A);
    expect(session.expiresAt).toBe(EXPIRES_AT);
    expect(session.ipAddress).toBe('203.0.113.10');
    expect(session.userAgent).toBe('qima-test/1.0');
    database.close();
  });

  it('is born neither revoked nor used', async () => {
    const session = await sessions.issue(issueInput());

    // A session that arrives already revoked or already "used" would corrupt
    // both the logout signal and the activity evidence.
    expect(session.revokedAt).toBeNull();
    expect(session.lastUsedAt).toBeNull();
    database.close();
  });

  it('stamps created_at in the exact stored timestamp format', async () => {
    const session = await sessions.issue(issueInput());

    // The schema compares expires_at > created_at as TEXT, so a millisecond or
    // offset-bearing value would make that comparison wrong, not merely ugly.
    expect(session.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    database.close();
  });

  it('records provenance as null when it is unknown', async () => {
    const session = await sessions.issue(issueInput({ ipAddress: null, userAgent: null }));

    // Absent provenance must stay absent: an empty string would later read as
    // "recorded, but blank" during a session security review.
    expect(session.ipAddress).toBeNull();
    expect(session.userAgent).toBeNull();
    database.close();
  });

  it('writes the token hash into token_hash and nothing else', async () => {
    await sessions.issue(issueInput());

    const row = database.raw
      .prepare('select token_hash from sessions where id = ?')
      .get('session-a') as { token_hash: string };

    expect(row.token_hash).toBe(HASH_A);
    database.close();
  });

  it('rejects a raw session token supplied where a hash belongs', async () => {
    // The failure that this whole design exists to prevent: a caller passing
    // the bearer token instead of its digest.
    const issued = await webCryptoSessionTokenService.issue();

    await expect(sessions.issue(issueInput({ tokenHash: issued.token }))).rejects.toBeInstanceOf(
      SessionPolicyError,
    );

    const count = database.raw.prepare('select count(*) as total from sessions').get() as {
      total: number;
    };
    // Rejected before the insert, so no row exists to leak the raw token.
    expect(count.total).toBe(0);
    database.close();
  });

  it('accepts the real hash produced by the token service', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    const session = await sessions.issue(issueInput({ tokenHash: issued.tokenHash }));

    // End-to-end shape agreement between the token service and the column.
    expect(session.tokenHash).toBe(issued.tokenHash);
    expect(session.tokenHash).not.toBe(issued.token);
    database.close();
  });

  it('rejects an expiry at or before the creation instant', async () => {
    await expect(
      sessions.issue(issueInput({ expiresAt: '2026-01-01T00:00:00Z' })),
    ).rejects.toBeInstanceOf(SessionPolicyError);
    await expect(
      sessions.issue(issueInput({ expiresAt: '2025-12-31T23:59:59Z' })),
    ).rejects.toBeInstanceOf(SessionPolicyError);
    database.close();
  });

  it('rejects an expiry that is not in the stored timestamp format', async () => {
    // '2026-01-02T00:00:00.000Z' sorts BEFORE '2026-01-02T00:00:00Z' as text
    // but looks correct to a human — exactly the drift the guard exists for.
    await expect(
      sessions.issue(issueInput({ expiresAt: '2026-01-02T00:00:00.000Z' })),
    ).rejects.toBeInstanceOf(SessionPolicyError);
    await expect(
      sessions.issue(issueInput({ expiresAt: '2026-01-02T07:00:00+07:00' })),
    ).rejects.toBeInstanceOf(SessionPolicyError);
    database.close();
  });

  it('rejects a missing user id or session id', async () => {
    await expect(sessions.issue(issueInput({ id: '' }))).rejects.toBeInstanceOf(SessionPolicyError);
    await expect(sessions.issue(issueInput({ userId: '' }))).rejects.toBeInstanceOf(
      SessionPolicyError,
    );
    database.close();
  });

  it('refuses a second session with the same token hash', async () => {
    await sessions.issue(issueInput({ id: 'session-a', tokenHash: HASH_A }));

    // The UNIQUE constraint is what stops one hash from ambiguously
    // authenticating two users. It must fail loudly, not overwrite.
    await expect(sessions.issue(issueInput({ id: 'session-b', tokenHash: HASH_A }))).rejects.toThrow();
    database.close();
  });

  it('refuses a session for a user that does not exist', async () => {
    await expect(
      sessions.issue(issueInput({ userId: '99999999-0000-4000-8000-00000000ffff' })),
    ).rejects.toThrow();
    database.close();
  });

  it('uses the domain lifetime when the caller derives expiry from it', async () => {
    const session = await sessions.issue(issueInput());

    const lifetimeSeconds =
      (new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime()) / 1000;
    expect(lifetimeSeconds).toBe(SESSION_TTL_SECONDS);
    database.close();
  });
});

describe('session repository — findByTokenHash', () => {
  let database: TestDatabase;
  let sessions: SessionRepository;

  beforeEach(async () => {
    database = await sessionDatabase();
    sessions = createSessionRepository(database.db, () => ISSUED_AT);
  });

  it('finds the session belonging to the hash', async () => {
    await sessions.issue(issueInput({ id: 'session-a', tokenHash: HASH_A }));
    await sessions.issue(issueInput({ id: 'session-b', tokenHash: HASH_B, userId: OTHER_USER }));

    const found = await sessions.findByTokenHash(HASH_B);

    expect(found?.id).toBe('session-b');
    expect(found?.userId).toBe(OTHER_USER);
    database.close();
  });

  it('returns null for an unknown hash instead of an arbitrary session', async () => {
    await sessions.issue(issueInput());

    // Returning "some session" on a miss would authenticate the wrong user.
    expect(await sessions.findByTokenHash(HASH_C)).toBeNull();
    database.close();
  });

  it('rejects a raw token on the lookup path before it reaches SQL', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    await expect(sessions.findByTokenHash(issued.token)).rejects.toBeInstanceOf(SessionPolicyError);
    await expect(sessions.findByTokenHash('')).rejects.toBeInstanceOf(SessionPolicyError);
    await expect(sessions.findByTokenHash('A'.repeat(64))).rejects.toBeInstanceOf(
      SessionPolicyError,
    );
    database.close();
  });

  it('binds the hash as a parameter, so SQL metacharacters cannot inject', async () => {
    await sessions.issue(issueInput());

    // Rejected by the hash-shape guard rather than reaching the query at all.
    await expect(sessions.findByTokenHash("' or '1'='1")).rejects.toBeInstanceOf(
      SessionPolicyError,
    );

    const count = database.raw.prepare('select count(*) as total from sessions').get() as {
      total: number;
    };
    expect(count.total).toBe(1);
    database.close();
  });

  it('still returns a revoked session so the domain can report REVOKED', async () => {
    await sessions.issue(issueInput());
    await sessions.revoke('session-a', '2026-01-01T01:00:00Z');

    const found = await sessions.findByTokenHash(HASH_A);

    // Filtering revoked rows in SQL would collapse REVOKED into NOT_FOUND and
    // erase the logout event from the audit trail (doc 06 §15).
    expect(found).not.toBeNull();
    expect(found?.revokedAt).toBe('2026-01-01T01:00:00Z');
    expect(evaluateSession(found, new Date('2026-01-01T02:00:00Z'))).toEqual({
      ok: false,
      reason: 'REVOKED',
    });
    database.close();
  });

  it('still returns an expired session so the domain can report EXPIRED', async () => {
    await sessions.issue(issueInput());

    const found = await sessions.findByTokenHash(HASH_A);
    const afterExpiry = new Date('2026-01-02T00:00:00Z');

    expect(found).not.toBeNull();
    expect(evaluateSession(found, afterExpiry)).toEqual({ ok: false, reason: 'EXPIRED' });
    database.close();
  });

  it('yields a live session that the domain accepts', async () => {
    await sessions.issue(issueInput());

    const found = await sessions.findByTokenHash(HASH_A);
    const check = evaluateSession(found, new Date('2026-01-01T06:00:00Z'));

    expect(check.ok).toBe(true);
    database.close();
  });
});

describe('session repository — revoke', () => {
  let database: TestDatabase;
  let sessions: SessionRepository;

  beforeEach(async () => {
    database = await sessionDatabase();
    sessions = createSessionRepository(database.db, () => ISSUED_AT);
  });

  it('marks the session as ended without deleting the row', async () => {
    await sessions.issue(issueInput());

    await sessions.revoke('session-a', '2026-01-01T03:00:00Z');

    const found = await sessions.findByTokenHash(HASH_A);
    expect(found?.revokedAt).toBe('2026-01-01T03:00:00Z');
    database.close();
  });

  it('is idempotent and preserves the original revocation instant', async () => {
    await sessions.issue(issueInput());
    await sessions.revoke('session-a', '2026-01-01T03:00:00Z');

    await sessions.revoke('session-a', '2026-01-01T09:00:00Z');

    // The first revocation is the logout event; a later repeat must not move it.
    const found = await sessions.findByTokenHash(HASH_A);
    expect(found?.revokedAt).toBe('2026-01-01T03:00:00Z');
    database.close();
  });

  it('does not touch other sessions', async () => {
    await sessions.issue(issueInput({ id: 'session-a', tokenHash: HASH_A }));
    await sessions.issue(issueInput({ id: 'session-b', tokenHash: HASH_B }));

    await sessions.revoke('session-a', '2026-01-01T03:00:00Z');

    expect((await sessions.findByTokenHash(HASH_B))?.revokedAt).toBeNull();
    database.close();
  });

  it('treats an unknown session id as a no-op', async () => {
    await sessions.issue(issueInput());

    await expect(sessions.revoke('session-unknown', '2026-01-01T03:00:00Z')).resolves.toBeUndefined();

    expect((await sessions.findByTokenHash(HASH_A))?.revokedAt).toBeNull();
    database.close();
  });

  it('rejects a revocation timestamp that is not in stored format', async () => {
    await sessions.issue(issueInput());

    await expect(sessions.revoke('session-a', '')).rejects.toBeInstanceOf(SessionPolicyError);
    await expect(sessions.revoke('session-a', '2026-01-01T03:00:00.000Z')).rejects.toBeInstanceOf(
      SessionPolicyError,
    );
    database.close();
  });
});

describe('session repository — revokeAllForUser', () => {
  let database: TestDatabase;
  let sessions: SessionRepository;

  beforeEach(async () => {
    database = await sessionDatabase();
    sessions = createSessionRepository(database.db, () => ISSUED_AT);
  });

  it('revokes every live session of the user and reports the count', async () => {
    await sessions.issue(issueInput({ id: 'session-a', tokenHash: HASH_A }));
    await sessions.issue(issueInput({ id: 'session-b', tokenHash: HASH_B }));

    const revoked = await sessions.revokeAllForUser(USER, '2026-01-01T04:00:00Z');

    expect(revoked).toBe(2);
    expect((await sessions.findByTokenHash(HASH_A))?.revokedAt).toBe('2026-01-01T04:00:00Z');
    expect((await sessions.findByTokenHash(HASH_B))?.revokedAt).toBe('2026-01-01T04:00:00Z');
    database.close();
  });

  it('leaves other users signed in', async () => {
    await sessions.issue(issueInput({ id: 'session-a', tokenHash: HASH_A }));
    await sessions.issue(issueInput({ id: 'session-c', tokenHash: HASH_C, userId: OTHER_USER }));

    const revoked = await sessions.revokeAllForUser(USER, '2026-01-01T04:00:00Z');

    // A suspension of one account must never end another account's sessions.
    expect(revoked).toBe(1);
    expect((await sessions.findByTokenHash(HASH_C))?.revokedAt).toBeNull();
    database.close();
  });

  it('does not re-stamp an already revoked session and excludes it from the count', async () => {
    await sessions.issue(issueInput({ id: 'session-a', tokenHash: HASH_A }));
    await sessions.issue(issueInput({ id: 'session-b', tokenHash: HASH_B }));
    await sessions.revoke('session-a', '2026-01-01T02:00:00Z');

    const revoked = await sessions.revokeAllForUser(USER, '2026-01-01T04:00:00Z');

    expect(revoked).toBe(1);
    expect((await sessions.findByTokenHash(HASH_A))?.revokedAt).toBe('2026-01-01T02:00:00Z');
    expect((await sessions.findByTokenHash(HASH_B))?.revokedAt).toBe('2026-01-01T04:00:00Z');
    database.close();
  });

  it('reports zero for a user with no live session', async () => {
    expect(await sessions.revokeAllForUser(USER, '2026-01-01T04:00:00Z')).toBe(0);
    database.close();
  });

  it('rejects a malformed revocation timestamp', async () => {
    await expect(sessions.revokeAllForUser(USER, 'yesterday')).rejects.toBeInstanceOf(
      SessionPolicyError,
    );
    database.close();
  });
});

describe('session repository — touch', () => {
  let database: TestDatabase;
  let sessions: SessionRepository;

  beforeEach(async () => {
    database = await sessionDatabase();
    sessions = createSessionRepository(database.db, () => ISSUED_AT);
  });

  it('records activity on a live session', async () => {
    await sessions.issue(issueInput());

    await sessions.touch('session-a', '2026-01-01T05:00:00Z');

    expect((await sessions.findByTokenHash(HASH_A))?.lastUsedAt).toBe('2026-01-01T05:00:00Z');
    database.close();
  });

  it('advances the activity timestamp on each request', async () => {
    await sessions.issue(issueInput());

    await sessions.touch('session-a', '2026-01-01T05:00:00Z');
    await sessions.touch('session-a', '2026-01-01T06:00:00Z');

    expect((await sessions.findByTokenHash(HASH_A))?.lastUsedAt).toBe('2026-01-01T06:00:00Z');
    database.close();
  });

  it('refuses to record activity on a revoked session', async () => {
    await sessions.issue(issueInput());
    await sessions.revoke('session-a', '2026-01-01T03:00:00Z');

    await sessions.touch('session-a', '2026-01-01T05:00:00Z');

    // Stamping a revoked session would make a rejected request look accepted
    // during a session security review (doc 09 §38).
    expect((await sessions.findByTokenHash(HASH_A))?.lastUsedAt).toBeNull();
    database.close();
  });

  it('refuses to record activity after expiry', async () => {
    await sessions.issue(issueInput());

    await sessions.touch('session-a', '2026-01-02T00:00:00Z');

    expect((await sessions.findByTokenHash(HASH_A))?.lastUsedAt).toBeNull();
    database.close();
  });

  it('treats an unknown session id as a no-op', async () => {
    await expect(sessions.touch('session-unknown', '2026-01-01T05:00:00Z')).resolves.toBeUndefined();
    database.close();
  });

  it('rejects a malformed activity timestamp', async () => {
    await sessions.issue(issueInput());

    await expect(sessions.touch('session-a', '2026-01-01 05:00:00')).rejects.toBeInstanceOf(
      SessionPolicyError,
    );
    database.close();
  });
});

describe('session repository — persistence invariants', () => {
  let database: TestDatabase;
  let sessions: SessionRepository;

  beforeEach(async () => {
    database = await sessionDatabase();
    sessions = createSessionRepository(database.db, () => ISSUED_AT);
  });

  it('cannot rewrite a session onto another user', async () => {
    await sessions.issue(issueInput());

    const error = expectRejected(() => {
      database.exec(`update sessions set user_id = '${OTHER_USER}' where id = 'session-a';`);
    });

    // Privilege escalation by rewriting a session instead of authenticating.
    expect(error.message).toContain('immutable');
    database.close();
  });

  it('cannot swap the token that unlocks a session', async () => {
    await sessions.issue(issueInput());

    const error = expectRejected(() => {
      database.exec(`update sessions set token_hash = '${HASH_B}' where id = 'session-a';`);
    });

    expect(error.message).toContain('immutable');
    database.close();
  });

  it('deletes sessions with the user they belong to', async () => {
    await sessions.issue(issueInput());

    database.exec(`delete from users where id = '${USER}';`);

    // ON DELETE CASCADE: a deleted account must not leave usable sessions.
    expect(await sessions.findByTokenHash(HASH_A)).toBeNull();
    database.close();
  });

  it('never stores a raw token anywhere in the sessions table', async () => {
    const issued = await webCryptoSessionTokenService.issue();
    await sessions.issue(issueInput({ tokenHash: issued.tokenHash }));

    const rows = database.raw.prepare('select * from sessions').all() as Record<string, unknown>[];
    const serialized = JSON.stringify(rows);

    // The whole-row assertion is deliberate: it also catches a raw token that
    // leaked into ip_address or user_agent, not just into token_hash.
    expect(serialized).not.toContain(issued.token);
    expect(serialized).toContain(issued.tokenHash);
    database.close();
  });
});

describe('live session listing (operational read)', () => {
  let database: TestDatabase;
  let sessions: SessionRepository;

  beforeEach(async () => {
    database = await sessionDatabase();
    sessions = createSessionRepository(database.db, () => ISSUED_AT);
  });

  it('lists only the live sessions of the requested user', async () => {
    await sessions.issue(issueInput({ id: 'session-a', tokenHash: HASH_A }));
    await sessions.issue(issueInput({ id: 'session-b', tokenHash: HASH_B }));
    await sessions.issue(issueInput({ id: 'session-c', tokenHash: HASH_C, userId: OTHER_USER }));
    await sessions.revoke('session-b', '2026-01-01T02:00:00Z');

    const live = await listLiveSessionsForUser(
      database.db,
      USER,
      new Date('2026-01-01T06:00:00Z'),
    );

    expect(live.map((session) => session.id)).toEqual(['session-a']);
    database.close();
  });

  it('excludes expired sessions', async () => {
    await sessions.issue(issueInput());

    const live = await listLiveSessionsForUser(
      database.db,
      USER,
      new Date('2026-01-02T00:00:00Z'),
    );

    expect(live).toEqual([]);
    database.close();
  });

  it('compares expiry against the same stored timestamp format', async () => {
    await sessions.issue(issueInput());

    // Guards against the listing drifting to a different timestamp rendering
    // than the column, which would make the text comparison wrong.
    expect(toUtcTimestamp(new Date('2026-01-01T06:00:00Z'))).toBe('2026-01-01T06:00:00Z');
    const live = await listLiveSessionsForUser(
      database.db,
      USER,
      new Date('2026-01-01T06:00:00Z'),
    );
    expect(live).toHaveLength(1);
    database.close();
  });
});
