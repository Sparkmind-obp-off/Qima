/**
 * QIMA login use case — Phase 2 task T2.03 (Login API).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.03 Login API.
 * - doc 06 §23 AUTH API: `POST /api/v1/auth/login` publishes `access_token` and
 *   `expires_at`; both are produced here, never in the controller.
 * - doc 06 §42 API Security Contract: "Secure password handling",
 *   "Token/session expiration", and the prohibition on account-enumeration.
 * - doc 08 §10 Application Layer: Input -> Validation -> Domain operation ->
 *   Repository -> Output.
 * - doc 08 §12 Presentation Layer / §43 Domain Service Boundary: the controller
 *   is transport only; the authentication decision lives here.
 * - .codex/IMPLEMENTATION_RULES.md §6: layered validation — transport checks
 *   shape, this layer orchestrates, the domain owns the rules.
 *
 * This module contains NO new business rule and NO cryptography. The credential
 * policy (`canAuthenticate`, `normalizeEmail`), the session lifetime
 * (`sessionExpiryFrom`) and the hashing/token algorithms all already exist from
 * T2.01/T2.02; T2.03 is the orchestration that makes them reachable as a
 * working login.
 *
 * SECURITY PROPERTIES this use case is responsible for:
 *
 * 1. The password is ALWAYS verified — including for an unknown account, where
 *    it is verified against a decoy hash. Skipping the derivation on the
 *    unknown-account path would make "no such user" measurably faster than
 *    "wrong password" and turn response latency into an account-enumeration
 *    oracle (doc 06 §42).
 * 2. Verification happens BEFORE the account-status rule is applied, for the
 *    same reason: a suspended account must not answer faster than an active one.
 * 3. A session is created only after authentication has fully succeeded.
 * 4. Only the token *hash* is persisted; the raw token is returned to the
 *    caller exactly once and is never logged.
 * 5. The password hash never leaves this layer — the success result carries the
 *    `User` entity, which by contract has no credential field.
 *
 * Out of scope by design: audit logging of authentication events. `LOGIN` is in
 * the doc 06 §15 action vocabulary and migration 0003 already anticipates it,
 * but an honest audit trail for this endpoint needs (a) the tenant scope that
 * T2.05/T2.08 resolve and (b) a transactional boundary that the current
 * `QimaDatabase` contract does not expose, so writing it now would produce a
 * partially-scoped, non-atomic trail. It is recorded as a known limitation
 * rather than half-implemented here.
 */

import {
  PASSWORD_MAX_LENGTH,
  canAuthenticate,
  normalizeEmail,
  sessionExpiryFrom,
} from '@qima/domain';
import type {
  PasswordHasher,
  SessionRepository,
  SessionTokenService,
  User,
  UserCredentialRepository,
  UserRepository,
} from '@qima/domain';

/**
 * A well-formed encoded hash with no known preimage, used to equalize the cost
 * of the unknown-account path with the wrong-password path.
 *
 * It is NOT a secret: the salt and derived key are random bytes, so no password
 * verifies against it and there is nothing to leak. It is a literal rather than
 * a value derived at module load because the Workers runtime restricts work in
 * the global scope, and it carries the same scheme and iteration count as
 * `webCryptoPasswordHasher` so the decoy derivation costs exactly what a real
 * one does. Should the hasher's cost change, `verify` still honours the
 * iteration count recorded in this string, so the equalization stays valid.
 */
export const DECOY_PASSWORD_HASH =
  'pbkdf2-sha256$100000$H69SJKbalUu6UHcOWKo2qg==$AWq1++Bt4yYztlEiOXXExoTzgjh1LBtsGeK51uZajLg=';

/** Collaborators the login use case needs. Injected, never imported directly. */
export interface LoginDependencies {
  readonly credentials: UserCredentialRepository;
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly passwordHasher: PasswordHasher;
  readonly sessionTokens: SessionTokenService;
  /** Injected for determinism under test; never client-supplied. */
  readonly now?: () => Date;
  /** doc 06 §39 ID Policy: session ids are server-generated UUIDs. */
  readonly generateId?: () => string;
}

/**
 * Login input.
 *
 * `ipAddress` and `userAgent` are request provenance recorded on the session
 * (doc 09 §38). They are transport-derived facts, so the controller supplies
 * them; the use case never reads a request object itself (doc 08 §9).
 */
export interface LoginCommand {
  readonly email: string;
  readonly password: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/**
 * Result of a successful login.
 *
 * `token` is the raw `access_token` of doc 06 §23 and exists only in this
 * object and in the response body it is written into.
 */
export interface LoginSuccess {
  readonly user: User;
  readonly token: string;
  readonly expiresAt: string;
  readonly sessionId: string;
}

/**
 * Why a login was refused.
 *
 * Carried for the server's own benefit — an operator needs to tell "wrong
 * password" from "account suspended" — but the transport layer maps both
 * credential outcomes to the SAME 401 body, because a differentiated response
 * would tell an attacker which emails are registered (doc 06 §42).
 *
 * `INVALID_REQUEST` is different in kind: it describes a malformed call, not an
 * account, so it may be reported as a 400 without leaking anything.
 */
export const LOGIN_FAILURE_REASONS = [
  'INVALID_REQUEST',
  'INVALID_CREDENTIALS',
  'ACCOUNT_NOT_AUTHENTICATABLE',
] as const;

export type LoginFailureReason = (typeof LOGIN_FAILURE_REASONS)[number];

export type LoginResult =
  | { readonly ok: true; readonly value: LoginSuccess }
  | { readonly ok: false; readonly reason: LoginFailureReason };

function rejected(reason: LoginFailureReason): LoginResult {
  return Object.freeze({ ok: false as const, reason });
}

/**
 * Authenticate an email/password pair and issue a session.
 *
 * Returns a result object instead of throwing on failure: a wrong password is
 * an expected outcome of this operation, and modelling it as an exception would
 * push the security-relevant branch into a `catch` block where an unrelated
 * infrastructure error could be mistaken for a failed login. Infrastructure
 * faults DO still throw, and the controller maps them to 500 — so a database
 * outage can never be reported to a client as "invalid credentials".
 */
export async function loginUser(
  command: LoginCommand,
  dependencies: LoginDependencies,
): Promise<LoginResult> {
  const {
    credentials,
    users,
    sessions,
    passwordHasher,
    sessionTokens,
    now = () => new Date(),
    generateId = () => crypto.randomUUID(),
  } = dependencies;

  // ---------------------------------------------------------------------
  // 1. Input. Shape only — the credential policy is deliberately NOT applied
  //    at login (see `assertValidPassword`): rejecting a password for being
  //    "too short" would both lock out accounts whose credential predates a
  //    policy change and reveal which submitted strings could be credentials.
  //    The upper bound IS enforced, because it is a CPU-exhaustion control.
  // ---------------------------------------------------------------------
  const email = normalizeEmail(command.email);

  if (email.length === 0 || command.password.length === 0) {
    return rejected('INVALID_REQUEST');
  }
  if (command.password.length > PASSWORD_MAX_LENGTH) {
    return rejected('INVALID_REQUEST');
  }

  // ---------------------------------------------------------------------
  // 2. Credential lookup, through the single-purpose credential adapter.
  // ---------------------------------------------------------------------
  const credential = await credentials.findByEmail(email);

  // ---------------------------------------------------------------------
  // 3. Password verification — performed on EVERY path.
  // ---------------------------------------------------------------------
  const passwordMatches = await passwordHasher.verify(
    command.password,
    credential?.passwordHash ?? DECOY_PASSWORD_HASH,
  );

  if (credential === null || !passwordMatches) {
    return rejected('INVALID_CREDENTIALS');
  }

  // ---------------------------------------------------------------------
  // 4. Account status rule (domain: only `active` may authenticate). Applied
  //    after verification so the timing of this branch reveals nothing, and
  //    before session issuance so a suspended account cannot trade a still
  //    valid password for a token.
  // ---------------------------------------------------------------------
  if (!canAuthenticate(credential.status)) {
    return rejected('ACCOUNT_NOT_AUTHENTICATABLE');
  }

  // The response body needs the user *entity*, which is read through the
  // ordinary `UserRepository` — the credential adapter intentionally cannot
  // supply it. A null here means the account was soft-deleted between the two
  // reads; that is a failed login, not a 500, and certainly not a session.
  const user = await users.findById(credential.userId);

  if (user === null) {
    return rejected('INVALID_CREDENTIALS');
  }

  // ---------------------------------------------------------------------
  // 5. Session issuance. First point at which any state is created.
  // ---------------------------------------------------------------------
  const issuedAt = now();
  const { token, tokenHash } = await sessionTokens.issue();

  const session = await sessions.issue({
    id: generateId(),
    userId: user.id,
    tokenHash,
    expiresAt: sessionExpiryFrom(issuedAt),
    ipAddress: command.ipAddress,
    userAgent: command.userAgent,
  });

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      user,
      // The raw token is returned, never the hash that was persisted.
      token,
      expiresAt: session.expiresAt,
      sessionId: session.id,
    }),
  });
}
