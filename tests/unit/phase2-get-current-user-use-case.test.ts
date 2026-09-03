import { describe, expect, it } from 'vitest';
import { sessionExpiryFrom, toUtcTimestamp } from '@qima/domain';
import type {
  Session,
  SessionRepository,
  SessionTokenService,
  User,
  UserRepository,
} from '@qima/domain';
import { getCurrentUser } from '../../apps/api/src/application/authentication/get-current-user';

/** Phase 2 T2.05 — authenticated user context application contract. */

const NOW = new Date('2026-01-01T06:00:00Z');
const TOKEN = 'A'.repeat(43);
const TOKEN_HASH = 'a'.repeat(64);
const SESSION_ID = '99999999-0000-4000-8000-000000000601';
const USER_ID = '99999999-0000-4000-8000-000000000602';

function user(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    name: 'Current User',
    email: 'current.user@example.com',
    phone: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    ...overrides,
  };
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: SESSION_ID,
    userId: USER_ID,
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

function doubles(foundSession: Session | null = session(), foundUser: User | null = user()) {
  const calls = {
    hashedTokens: [] as string[],
    lookedUpHashes: [] as string[],
    userIds: [] as string[],
    touches: [] as { id: string; at: string }[],
  };

  const sessionTokens: SessionTokenService = {
    async issue() {
      throw new Error('user context must never issue a token.');
    },
    async hash(rawToken) {
      calls.hashedTokens.push(rawToken);
      return TOKEN_HASH;
    },
  };

  const sessions: SessionRepository = {
    async issue() {
      throw new Error('user context must never issue a session.');
    },
    async findByTokenHash(tokenHash) {
      calls.lookedUpHashes.push(tokenHash);
      return foundSession;
    },
    async revoke() {
      throw new Error('user context must never revoke a session.');
    },
    async revokeAllForUser() {
      throw new Error('user context must never revoke sessions.');
    },
    async touch(id, lastUsedAt) {
      calls.touches.push({ id, at: lastUsedAt });
    },
  };

  const users: UserRepository = {
    async findById(id) {
      calls.userIds.push(id);
      return foundUser;
    },
    async findByEmail() {
      throw new Error('user context resolves identity from the session user id.');
    },
  };

  return { calls, sessionTokens, sessions, users };
}

function dependencies(parts: ReturnType<typeof doubles>) {
  return {
    sessionTokens: parts.sessionTokens,
    sessions: parts.sessions,
    users: parts.users,
    now: () => NOW,
  };
}

describe('get current user — active session', () => {
  it('hashes the bearer token, resolves the session user and records activity', async () => {
    const parts = doubles();

    const result = await getCurrentUser({ token: TOKEN }, dependencies(parts));

    expect(result).toEqual({ ok: true, user: user() });
    expect(parts.calls.hashedTokens).toEqual([TOKEN]);
    expect(parts.calls.lookedUpHashes).toEqual([TOKEN_HASH]);
    expect(parts.calls.userIds).toEqual([USER_ID]);
    expect(parts.calls.touches).toEqual([{ id: SESSION_ID, at: toUtcTimestamp(NOW) }]);
  });

  it('never passes the raw bearer token to a repository', async () => {
    const parts = doubles();

    await getCurrentUser({ token: TOKEN }, dependencies(parts));

    expect(parts.calls.lookedUpHashes).not.toContain(TOKEN);
    expect(JSON.stringify(parts.calls.touches)).not.toContain(TOKEN);
    expect(JSON.stringify(parts.calls.userIds)).not.toContain(TOKEN);
  });
});

describe('get current user — rejected identity', () => {
  it.each([
    ['unknown session', null],
    ['expired session', session({ expiresAt: '2026-01-01T05:59:59Z' })],
    ['revoked session', session({ revokedAt: '2026-01-01T04:00:00Z' })],
  ] as const)('rejects an %s without reading or touching the user', async (_label, found) => {
    const parts = doubles(found);

    const result = await getCurrentUser({ token: TOKEN }, dependencies(parts));

    expect(result.ok).toBe(false);
    expect(parts.calls.userIds).toHaveLength(0);
    expect(parts.calls.touches).toHaveLength(0);
  });

  it.each([
    ['missing', null],
    ['inactive', user({ status: 'inactive' })],
    ['suspended', user({ status: 'suspended' })],
    ['invited', user({ status: 'invited' })],
  ] as const)('rejects a %s user without marking the session as used', async (_label, found) => {
    const parts = doubles(session(), found);

    const result = await getCurrentUser({ token: TOKEN }, dependencies(parts));

    expect(result).toEqual({ ok: false, reason: 'USER_NOT_AUTHENTICATABLE' });
    expect(parts.calls.touches).toHaveLength(0);
  });

  it('propagates repository failure for the controller to map safely', async () => {
    const parts = doubles();
    const users: UserRepository = {
      ...parts.users,
      async findById() {
        throw new Error('database unavailable');
      },
    };

    await expect(
      getCurrentUser({ token: TOKEN }, { ...dependencies(parts), users }),
    ).rejects.toThrow('database unavailable');
  });
});
