import { describe, expect, it } from 'vitest';
import { sessionExpiryFrom, toUtcTimestamp } from '@qima/domain';
import type { Session, SessionRepository, SessionTokenService } from '@qima/domain';
import { logoutUser } from '../../apps/api/src/application/authentication/logout-user';

/**
 * Phase 2 task T2.04 — logout application use case.
 *
 * Traceability: doc 10 §24 T2.04, doc 06 §23 logout contract, doc 09 §14
 * authentication testing, and Quality Gates 4, 7 and 10.
 */

const NOW = new Date('2026-01-01T06:00:00Z');
const SESSION_ID = '99999999-0000-4000-8000-000000000401';
const TOKEN = 'A'.repeat(43);
const TOKEN_HASH = 'a'.repeat(64);

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: SESSION_ID,
    userId: '99999999-0000-4000-8000-000000000402',
    tokenHash: TOKEN_HASH,
    expiresAt: sessionExpiryFrom(new Date('2026-01-01T00:00:00Z')),
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    createdAt: '2026-01-01T00:00:00Z',
    lastUsedAt: null,
    ...overrides,
  };
}

function doubles(found: Session | null = session()) {
  const calls = {
    hashedTokens: [] as string[],
    lookedUpHashes: [] as string[],
    revocations: [] as { id: string; at: string }[],
  };

  const sessionTokens: SessionTokenService = {
    async issue() {
      throw new Error('logout must never issue a token.');
    },
    async hash(rawToken) {
      calls.hashedTokens.push(rawToken);
      return TOKEN_HASH;
    },
  };

  const sessions: SessionRepository = {
    async issue() {
      throw new Error('logout must never issue a session.');
    },
    async findByTokenHash(tokenHash) {
      calls.lookedUpHashes.push(tokenHash);
      return found;
    },
    async revoke(id, revokedAt) {
      calls.revocations.push({ id, at: revokedAt });
    },
    async revokeAllForUser() {
      throw new Error('logout must revoke only the presented session.');
    },
    async touch() {
      throw new Error('logout must not mark a session as active.');
    },
  };

  return { calls, sessions, sessionTokens };
}

function dependencies(parts: ReturnType<typeof doubles>) {
  return {
    sessions: parts.sessions,
    sessionTokens: parts.sessionTokens,
    now: () => NOW,
  };
}

describe('logout use case — active session', () => {
  it('hashes the raw token, finds the session and revokes it', async () => {
    const parts = doubles();

    const result = await logoutUser({ token: TOKEN }, dependencies(parts));

    expect(result).toEqual({ ok: true });
    expect(parts.calls.hashedTokens).toEqual([TOKEN]);
    expect(parts.calls.lookedUpHashes).toEqual([TOKEN_HASH]);
    expect(parts.calls.revocations).toEqual([
      { id: SESSION_ID, at: toUtcTimestamp(NOW) },
    ]);
  });

  it('never passes the raw token to the repository', async () => {
    const parts = doubles();

    await logoutUser({ token: TOKEN }, dependencies(parts));

    expect(parts.calls.lookedUpHashes).not.toContain(TOKEN);
    expect(JSON.stringify(parts.calls.revocations)).not.toContain(TOKEN);
  });
});

describe('logout use case — invalid session', () => {
  it.each([
    ['unknown', null],
    ['expired', session({ expiresAt: '2026-01-01T05:59:59Z' })],
    ['revoked', session({ revokedAt: '2026-01-01T04:00:00Z' })],
  ] as const)('returns one indistinguishable result for a %s session', async (_label, found) => {
    const parts = doubles(found);

    const result = await logoutUser({ token: TOKEN }, dependencies(parts));

    expect(result).toEqual({ ok: false, reason: 'INVALID_SESSION' });
    expect(parts.calls.revocations).toHaveLength(0);
  });

  it('propagates repository failures for the controller to map to 500', async () => {
    const parts = doubles();
    const failing: SessionRepository = {
      ...parts.sessions,
      async findByTokenHash() {
        throw new Error('database unavailable');
      },
    };

    await expect(
      logoutUser(
        { token: TOKEN },
        { ...dependencies(parts), sessions: failing },
      ),
    ).rejects.toThrow('database unavailable');
  });
});
