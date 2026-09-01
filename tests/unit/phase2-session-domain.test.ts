import { describe, expect, it } from 'vitest';
import {
  SESSION_INVALID_REASONS,
  SESSION_TOKEN_BYTES,
  SESSION_TTL_SECONDS,
  SESSION_IMMUTABLE_COLUMNS,
  type Session,
  type SessionIssueInput,
  SessionPolicyError,
  assertIssuableSession,
  assertValidTokenHash,
  evaluateSession,
  isSessionExpired,
  isSessionRevoked,
  isValidTokenHash,
  sessionExpiryFrom,
  toUtcTimestamp,
} from '@qima/domain';

/**
 * Phase 2 task T2.02 — session domain rules.
 *
 * doc 06 §23 AUTH API (`expires_at` is part of the published login response).
 * doc 06 §42 API Security Contract: "Token/session expiration".
 * doc 05 §23 Authentication: the domain owns the rule, not the algorithm.
 *
 * These tests assert the domain invariants only. The same rules are enforced
 * again by migration 0004 against a real SQLite database in
 * tests/integration/phase2-session-migration.test.ts — the layering required by
 * IMPLEMENTATION_RULES §6, not duplication.
 */

const VALID_HASH = 'a'.repeat(64);

function sessionAt(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    userId: 'user-1',
    tokenHash: VALID_HASH,
    createdAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-01-01T12:00:00Z',
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    lastUsedAt: null,
    ...overrides,
  };
}

function issueInput(overrides: Partial<SessionIssueInput> = {}): SessionIssueInput {
  return {
    id: 'session-1',
    userId: 'user-1',
    tokenHash: VALID_HASH,
    expiresAt: '2026-01-01T12:00:00Z',
    ipAddress: null,
    userAgent: null,
    ...overrides,
  };
}

describe('session lifetime policy (doc 06 §42)', () => {
  it('publishes an absolute lifetime, not an idle timeout', () => {
    // An idle timer can be kept alive indefinitely by whoever holds a stolen
    // token, so only an absolute bound caps the value of a leak.
    expect(SESSION_TTL_SECONDS).toBe(12 * 60 * 60);
  });

  it('derives expiry by adding the ttl to the issuing instant', () => {
    expect(sessionExpiryFrom(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01T12:00:00Z');
  });

  it('honours an explicit ttl override', () => {
    expect(sessionExpiryFrom(new Date('2026-01-01T00:00:00Z'), 60)).toBe('2026-01-01T00:01:00Z');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects ttl %p', (ttl) => {
    expect(() => sessionExpiryFrom(new Date('2026-01-01T00:00:00Z'), ttl)).toThrow(
      SessionPolicyError,
    );
  });

  it('uses 256 bits of token entropy, matching the sha-256 digest width', () => {
    expect(SESSION_TOKEN_BYTES * 8).toBe(256);
  });
});

describe('utc timestamp format (doc 06 §40)', () => {
  it('emits the fixed-width second-precision form the schema compares as text', () => {
    // The `expires_at > created_at` CHECK is a text comparison, so a
    // millisecond or offset-bearing variant would silently break ordering.
    expect(toUtcTimestamp(new Date('2026-01-01T00:00:00.123Z'))).toBe('2026-01-01T00:00:00Z');
  });

  it('keeps lexical order equal to chronological order', () => {
    const earlier = toUtcTimestamp(new Date('2026-01-01T00:00:00Z'));
    const later = toUtcTimestamp(new Date('2026-01-01T00:00:01Z'));
    expect(earlier < later).toBe(true);
  });

  it('rejects an invalid instant', () => {
    expect(() => toUtcTimestamp(new Date('not-a-date'))).toThrow(SessionPolicyError);
  });
});

describe('token hash contract (migration 0004 CHECK)', () => {
  it('accepts a 64-character lowercase hex digest', () => {
    expect(isValidTokenHash(VALID_HASH)).toBe(true);
    expect(() => assertValidTokenHash(VALID_HASH)).not.toThrow();
  });

  it.each([
    ['empty', ''],
    ['too short', 'a'.repeat(63)],
    ['too long', 'a'.repeat(65)],
    ['uppercase hex', 'A'.repeat(64)],
    ['non-hex character', `${'a'.repeat(63)}z`],
    ['a plausible raw token', 'raw-session-token-value'],
  ])('rejects %s', (_label, value) => {
    expect(isValidTokenHash(value)).toBe(false);
    expect(() => assertValidTokenHash(value)).toThrow(SessionPolicyError);
  });

  it('reports the failing field so the caller sees the cause, not a driver error', () => {
    try {
      assertValidTokenHash('');
      expect.unreachable('expected SessionPolicyError');
    } catch (error) {
      expect(error).toBeInstanceOf(SessionPolicyError);
      expect((error as SessionPolicyError).field).toBe('tokenHash');
    }
  });
});

describe('issuable session guard', () => {
  const createdAt = '2026-01-01T00:00:00Z';

  it('accepts a well-formed issue input', () => {
    expect(() => assertIssuableSession(issueInput(), createdAt)).not.toThrow();
  });

  it('rejects a missing id', () => {
    expect(() => assertIssuableSession(issueInput({ id: '' }), createdAt)).toThrow(
      SessionPolicyError,
    );
  });

  it('rejects a missing userId', () => {
    expect(() => assertIssuableSession(issueInput({ userId: '' }), createdAt)).toThrow(
      SessionPolicyError,
    );
  });

  it('rejects a raw token in place of a hash', () => {
    expect(() =>
      assertIssuableSession(issueInput({ tokenHash: 'raw-token' }), createdAt),
    ).toThrow(SessionPolicyError);
  });

  it('rejects an expiry equal to creation (dead on arrival)', () => {
    expect(() => assertIssuableSession(issueInput({ expiresAt: createdAt }), createdAt)).toThrow(
      SessionPolicyError,
    );
  });

  it('rejects an expiry before creation', () => {
    expect(() =>
      assertIssuableSession(issueInput({ expiresAt: '2025-12-31T23:59:59Z' }), createdAt),
    ).toThrow(SessionPolicyError);
  });

  it('rejects an empty expiry', () => {
    expect(() => assertIssuableSession(issueInput({ expiresAt: '' }), createdAt)).toThrow(
      SessionPolicyError,
    );
  });

  it('does not expose a raw token field on the issue input', () => {
    // The raw token must never be able to reach a repository through this shape.
    expect(Object.keys(issueInput())).not.toContain('token');
  });
});

describe('session validity (doc 06 §42)', () => {
  const now = new Date('2026-01-01T06:00:00Z');

  it('treats a live session as valid', () => {
    const result = evaluateSession(sessionAt(), now);
    expect(result.ok).toBe(true);
  });

  it('rejects a missing session without inventing a state', () => {
    const result = evaluateSession(null, now);
    expect(result).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });

  it('rejects an expired session', () => {
    const session = sessionAt({ expiresAt: '2026-01-01T05:59:59Z' });
    expect(isSessionExpired(session, now)).toBe(true);
    expect(evaluateSession(session, now)).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('treats expiry as inclusive: a session expiring exactly now is dead', () => {
    const session = sessionAt({ expiresAt: '2026-01-01T06:00:00Z' });
    expect(isSessionExpired(session, now)).toBe(true);
  });

  it('rejects a revoked session', () => {
    const session = sessionAt({ revokedAt: '2026-01-01T03:00:00Z' });
    expect(isSessionRevoked(session)).toBe(true);
    expect(evaluateSession(session, now)).toEqual({ ok: false, reason: 'REVOKED' });
  });

  it('reports revocation ahead of expiry so a logout stays visible in the audit trail', () => {
    const session = sessionAt({
      revokedAt: '2026-01-01T03:00:00Z',
      expiresAt: '2026-01-01T05:00:00Z',
    });
    expect(evaluateSession(session, now)).toEqual({ ok: false, reason: 'REVOKED' });
  });

  it('returns a frozen result so a caller cannot rewrite an authentication outcome', () => {
    const result = evaluateSession(sessionAt(), now);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('closes the invalid-reason vocabulary', () => {
    expect([...SESSION_INVALID_REASONS]).toEqual(['NOT_FOUND', 'EXPIRED', 'REVOKED']);
  });
});

describe('session contract alignment with the schema', () => {
  it('never treats an immutable column as mutable in the entity contract', () => {
    // Only revokedAt and lastUsedAt may change after issuance; the schema
    // trigger enforces the same rule.
    const mutableFields = ['revokedAt', 'lastUsedAt'];
    for (const column of SESSION_IMMUTABLE_COLUMNS) {
      const camel = column.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      expect(mutableFields).not.toContain(camel);
    }
  });
});
