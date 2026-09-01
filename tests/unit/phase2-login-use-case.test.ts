import { describe, expect, it } from 'vitest';
import { SESSION_TTL_SECONDS, sessionExpiryFrom, toUtcTimestamp } from '@qima/domain';
import type {
  PasswordHasher,
  Session,
  SessionIssueInput,
  SessionRepository,
  SessionTokenService,
  User,
  UserCredential,
  UserCredentialRepository,
  UserRepository,
  UserStatus,
} from '@qima/domain';
import {
  DECOY_PASSWORD_HASH,
  loginUser,
} from '../../apps/api/src/application/authentication/login-user';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';

/**
 * Phase 2 task T2.03 — login use case (application layer).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.03 Login API.
 * - doc 06 §23 AUTH API: `access_token` / `expires_at` are produced by this layer.
 * - doc 06 §42 API Security Contract: secure password handling, session
 *   expiration, and no account-enumeration signal.
 * - doc 08 §10 Application Layer: Input -> Validation -> Domain -> Repository -> Output.
 * - .codex/QUALITY_GATES.md Gate 4 (unit tests), Gate 10 (credential hygiene).
 *
 * What these tests are actually for: the login use case owns three properties
 * that no other layer can be held responsible for, and each of them fails
 * SILENTLY if it regresses — a login that still returns 200 for the right
 * password looks perfectly healthy while leaking whether an email is
 * registered. So the assertions below target the invariants rather than the
 * happy path:
 *
 * 1. the password is verified on EVERY path, including the unknown-account path;
 * 2. no state is created unless authentication fully succeeded;
 * 3. only the token hash is persisted, never the raw token.
 */

const USER_ID = '99999999-0000-4000-8000-000000000101';
const EMAIL = 'login.user@example.com';
const PASSWORD = 'CorrectHorse#2026';
const ISSUED_AT = new Date('2026-01-01T08:00:00Z');
const SESSION_ID = '99999999-0000-4000-8000-0000000000aa';

/** Obviously synthetic: correct shape, no credential value. */
const TOKEN_HASH = 'f'.repeat(64);
const RAW_TOKEN = 'raw-session-token-value';

function userEntity(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    name: 'Login User',
    email: EMAIL,
    phone: null,
    status: 'active',
    createdAt: toUtcTimestamp(ISSUED_AT),
    updatedAt: toUtcTimestamp(ISSUED_AT),
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Recording test doubles.
 *
 * Hand-written rather than generated: the point of every test here is *which
 * collaborator was called and with what*, so the call log is the assertion
 * surface, not an implementation detail.
 */
interface Recorder {
  readonly credentialLookups: string[];
  readonly verifications: { password: string; hash: string }[];
  readonly userLookups: string[];
  readonly issuedSessions: SessionIssueInput[];
  /** Mutable: incremented by the token-service double on each `issue()`. */
  tokensIssued: number;
}

interface Doubles {
  readonly recorder: Recorder;
  readonly credentials: UserCredentialRepository;
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly passwordHasher: PasswordHasher;
  readonly sessionTokens: SessionTokenService;
}

function doubles(options: {
  credential?: UserCredential | null;
  user?: User | null;
  passwordMatches?: boolean;
  /** Use the real PBKDF2 hasher instead of a stub (for the decoy-cost test). */
  realHasher?: boolean;
} = {}): Doubles {
  const recorder: Recorder = {
    credentialLookups: [],
    verifications: [],
    userLookups: [],
    issuedSessions: [],
    tokensIssued: 0,
  };

  const credentials: UserCredentialRepository = {
    async findByEmail(email) {
      recorder.credentialLookups.push(email);
      return options.credential ?? null;
    },
  };

  const users: UserRepository = {
    async findById(id) {
      recorder.userLookups.push(id);
      return options.user === undefined ? userEntity() : options.user;
    },
    async findByEmail() {
      throw new Error('login must not identify a user through the general email read.');
    },
  };

  const sessions: SessionRepository = {
    async issue(input) {
      recorder.issuedSessions.push(input);
      const session: Session = {
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        createdAt: toUtcTimestamp(ISSUED_AT),
        lastUsedAt: null,
      };
      return session;
    },
    async findByTokenHash() {
      throw new Error('login must not read an existing session.');
    },
    async revoke() {
      throw new Error('login must not revoke a session (that is T2.04).');
    },
    async revokeAllForUser(): Promise<number> {
      throw new Error('login must not mass-revoke sessions.');
    },
    async touch() {
      throw new Error('login must not touch a session.');
    },
  };

  const passwordHasher: PasswordHasher = options.realHasher === true
    ? {
        hash: (plain) => webCryptoPasswordHasher.hash(plain),
        async verify(plain, encoded) {
          recorder.verifications.push({ password: plain, hash: encoded });
          return webCryptoPasswordHasher.verify(plain, encoded);
        },
      }
    : {
        async hash() {
          throw new Error('login must never hash a new credential.');
        },
        async verify(plain, encoded) {
          recorder.verifications.push({ password: plain, hash: encoded });
          return options.passwordMatches ?? true;
        },
      };

  const sessionTokens: SessionTokenService = {
    async issue() {
      recorder.tokensIssued += 1;
      return { token: RAW_TOKEN, tokenHash: TOKEN_HASH };
    },
    async hash() {
      throw new Error('login must not derive a hash from a client-supplied token.');
    },
  };

  return { recorder, credentials, users, sessions, passwordHasher, sessionTokens };
}

function activeCredential(status: UserStatus = 'active'): UserCredential {
  return { userId: USER_ID, status, passwordHash: 'pbkdf2-sha256$100000$stored$hash' };
}

function command(overrides: Partial<Parameters<typeof loginUser>[0]> = {}) {
  return {
    email: EMAIL,
    password: PASSWORD,
    ipAddress: '203.0.113.10',
    userAgent: 'qima-test/1.0',
    ...overrides,
  };
}

function dependencies(parts: Doubles) {
  return {
    credentials: parts.credentials,
    users: parts.users,
    sessions: parts.sessions,
    passwordHasher: parts.passwordHasher,
    sessionTokens: parts.sessionTokens,
    now: () => ISSUED_AT,
    generateId: () => SESSION_ID,
  };
}

describe('login use case — successful authentication', () => {
  it('issues a session and returns the raw token exactly once', async () => {
    const parts = doubles({ credential: activeCredential() });

    const result = await loginUser(command(), dependencies(parts));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.token).toBe(RAW_TOKEN);
    expect(result.value.sessionId).toBe(SESSION_ID);
    expect(result.value.user.id).toBe(USER_ID);
    expect(parts.recorder.tokensIssued).toBe(1);
  });

  it('persists the token hash and never the raw token (Gate 10)', async () => {
    const parts = doubles({ credential: activeCredential() });

    await loginUser(command(), dependencies(parts));

    expect(parts.recorder.issuedSessions).toHaveLength(1);
    const persisted = parts.recorder.issuedSessions[0];
    expect(persisted?.tokenHash).toBe(TOKEN_HASH);
    // The decisive assertion: the raw bearer value must appear nowhere in the
    // row that is written to the database.
    expect(JSON.stringify(persisted)).not.toContain(RAW_TOKEN);
  });

  it('derives expires_at from the domain session policy, not from the client', async () => {
    const parts = doubles({ credential: activeCredential() });

    const result = await loginUser(command(), dependencies(parts));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.expiresAt).toBe(sessionExpiryFrom(ISSUED_AT));
    // Cross-checked against the declared TTL so a silent policy change in
    // either place is caught rather than mirrored.
    const ttlMs = Date.parse(result.value.expiresAt) - ISSUED_AT.getTime();
    expect(ttlMs).toBe(SESSION_TTL_SECONDS * 1000);
  });

  it('records request provenance on the session (doc 09 §38)', async () => {
    const parts = doubles({ credential: activeCredential() });

    await loginUser(
      command({ ipAddress: '198.51.100.7', userAgent: 'qima-agent/9.9' }),
      dependencies(parts),
    );

    expect(parts.recorder.issuedSessions[0]?.ipAddress).toBe('198.51.100.7');
    expect(parts.recorder.issuedSessions[0]?.userAgent).toBe('qima-agent/9.9');
  });

  it('normalizes the submitted email before the credential lookup', async () => {
    const parts = doubles({ credential: activeCredential() });

    await loginUser(command({ email: '  LOGIN.User@Example.COM  ' }), dependencies(parts));

    expect(parts.recorder.credentialLookups).toEqual([EMAIL]);
  });

  it('reads the user entity through the general user repository, by id', async () => {
    const parts = doubles({ credential: activeCredential() });

    await loginUser(command(), dependencies(parts));

    // `findByEmail` on the double throws: login must identify the account via
    // the credential adapter and then load the entity by id, so a general
    // email read can never become the authentication path.
    expect(parts.recorder.userLookups).toEqual([USER_ID]);
  });

  it('returns a user entity that carries no credential material', async () => {
    const parts = doubles({ credential: activeCredential() });

    const result = await loginUser(command(), dependencies(parts));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.value.user)).not.toContain('passwordHash');
    expect(JSON.stringify(result.value.user)).not.toContain('pbkdf2-sha256');
  });
});

describe('login use case — rejected authentication', () => {
  it('rejects a wrong password without issuing a session', async () => {
    const parts = doubles({ credential: activeCredential(), passwordMatches: false });

    const result = await loginUser(command(), dependencies(parts));

    expect(result).toMatchObject({ ok: false, reason: 'INVALID_CREDENTIALS' });
    expect(parts.recorder.issuedSessions).toHaveLength(0);
    expect(parts.recorder.tokensIssued).toBe(0);
  });

  it('rejects an unknown account with the same reason as a wrong password', async () => {
    const parts = doubles({ credential: null, passwordMatches: false });

    const result = await loginUser(command(), dependencies(parts));

    // Identical reason for "no such account" and "wrong password": the
    // enumeration defence starts here, not only at the transport layer.
    expect(result).toMatchObject({ ok: false, reason: 'INVALID_CREDENTIALS' });
    expect(parts.recorder.issuedSessions).toHaveLength(0);
  });

  it('verifies a password against the decoy hash when the account is unknown', async () => {
    const parts = doubles({ credential: null, passwordMatches: false });

    await loginUser(command(), dependencies(parts));

    // The critical anti-enumeration property: the derivation still happens, so
    // the unknown-account path costs what the wrong-password path costs.
    expect(parts.recorder.verifications).toHaveLength(1);
    expect(parts.recorder.verifications[0]?.hash).toBe(DECOY_PASSWORD_HASH);
  });

  it('never authenticates the decoy hash itself', async () => {
    // If the decoy were ever verifiable, an unknown email plus the matching
    // password would authenticate a non-existent account.
    const verified = await webCryptoPasswordHasher.verify(PASSWORD, DECOY_PASSWORD_HASH);
    expect(verified).toBe(false);
  });

  it('accepts the decoy hash as well-formed so the derivation really runs', async () => {
    const parts = doubles({ credential: null, realHasher: true });

    const result = await loginUser(command(), dependencies(parts));

    // A malformed decoy would make `verify` return false immediately, without
    // deriving a key — silently removing the timing equalization. Asserting the
    // real hasher's parse succeeds is what keeps the defence honest.
    const { isSupportedPasswordHash } = await import(
      '../../apps/api/src/infrastructure/security/password-hasher'
    );
    expect(isSupportedPasswordHash(DECOY_PASSWORD_HASH)).toBe(true);
    expect(result).toMatchObject({ ok: false, reason: 'INVALID_CREDENTIALS' });
  });

  it.each(['suspended', 'inactive'] as const)(
    'refuses a %s account after verifying the password',
    async (status) => {
      const parts = doubles({
        credential: activeCredential(status as UserStatus),
        passwordMatches: true,
      });

      const result = await loginUser(command(), dependencies(parts));

      expect(result).toMatchObject({ ok: false, reason: 'ACCOUNT_NOT_AUTHENTICATABLE' });
      // Verification must have already happened: refusing *before* it would
      // make a suspended account answer measurably faster than an active one.
      expect(parts.recorder.verifications).toHaveLength(1);
      // And no session may exist for an account that may not authenticate.
      expect(parts.recorder.issuedSessions).toHaveLength(0);
    },
  );

  it('refuses a suspended account even when the password is correct', async () => {
    const parts = doubles({
      credential: activeCredential('suspended'),
      passwordMatches: true,
    });

    const result = await loginUser(command(), dependencies(parts));

    expect(result.ok).toBe(false);
    expect(parts.recorder.tokensIssued).toBe(0);
  });

  it('rejects an account soft-deleted between the credential and entity reads', async () => {
    const parts = doubles({ credential: activeCredential(), user: null });

    const result = await loginUser(command(), dependencies(parts));

    // A race, not a server fault: it must be a failed login, never a 500 and
    // never a session for a deleted account.
    expect(result).toMatchObject({ ok: false, reason: 'INVALID_CREDENTIALS' });
    expect(parts.recorder.issuedSessions).toHaveLength(0);
  });
});

describe('login use case — input boundaries (Gate 10 input validation)', () => {
  it.each([
    ['empty email', { email: '' }],
    ['whitespace-only email', { email: '   ' }],
    ['empty password', { password: '' }],
  ])('rejects %s as INVALID_REQUEST without touching the repository', async (_label, override) => {
    const parts = doubles({ credential: activeCredential() });

    const result = await loginUser(command(override), dependencies(parts));

    expect(result).toMatchObject({ ok: false, reason: 'INVALID_REQUEST' });
    expect(parts.recorder.credentialLookups).toHaveLength(0);
    expect(parts.recorder.verifications).toHaveLength(0);
  });

  it('rejects an over-long password before any key derivation (CPU exhaustion)', async () => {
    const parts = doubles({ credential: activeCredential() });

    const result = await loginUser(
      command({ password: 'a'.repeat(257) }),
      dependencies(parts),
    );

    expect(result).toMatchObject({ ok: false, reason: 'INVALID_REQUEST' });
    expect(parts.recorder.verifications).toHaveLength(0);
  });

  it('accepts a short password so a pre-policy credential can still log in', async () => {
    const parts = doubles({ credential: activeCredential(), passwordMatches: true });

    const result = await loginUser(command({ password: 'abc' }), dependencies(parts));

    // The credential *policy* governs registration, not login: enforcing a
    // minimum length here would lock out accounts created before a policy
    // change and reveal which submitted strings could be credentials.
    expect(result.ok).toBe(true);
    expect(parts.recorder.verifications).toHaveLength(1);
  });

  it('propagates an infrastructure fault instead of reporting invalid credentials', async () => {
    const parts = doubles({ credential: activeCredential() });
    const failing = {
      ...dependencies(parts),
      credentials: {
        async findByEmail(): Promise<UserCredential | null> {
          throw new Error('Database query failed.');
        },
      },
    };

    // A database outage must never be presented to a client as a wrong
    // password; the controller is responsible for mapping this to a 500.
    await expect(loginUser(command(), failing)).rejects.toThrow('Database query failed.');
  });
});
