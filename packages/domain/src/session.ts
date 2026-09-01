/**
 * QIMA session domain — Phase 2 task T2.02 (Session management).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.02.
 * - doc 06 §23 AUTH API: the login response returns `access_token` and
 *   `expires_at`, so the session lifetime is part of the published contract and
 *   must be a domain rule rather than a handler constant.
 * - doc 06 §42 API Security Contract: "Token/session expiration".
 * - doc 05 §23 Authentication: the authentication *provider* is replaceable, so
 *   this module defines the token contract and never the algorithm.
 * - doc 05 §10 Domain Layer / doc 08 §9: no HTTP, driver or provider import.
 * - .codex/IMPLEMENTATION_RULES.md §6: validation is layered — session validity
 *   is a domain invariant, mirrored (not replaced) by the database CHECK
 *   constraints in migration 0004 and by transport-level checks.
 *
 * Scope of this module: the session *entity*, its validity rules, the token
 * generation/hashing *contract*, and the repository contract. The Web Crypto
 * implementation is infrastructure (`apps/api/src/infrastructure/security`);
 * the login and logout endpoints are T2.03/T2.04 and the authorization
 * middleware is T2.09 — none of them are defined here.
 */

import { DomainValidationError } from './identity';

// ---------------------------------------------------------------------------
// Session entity (doc 06 §42, migration 0004)
// ---------------------------------------------------------------------------

/**
 * A persisted authentication session.
 *
 * Mirrors the `sessions` table, with one deliberate omission: the raw token is
 * NOT a field. The raw token exists only in the client's possession and in the
 * memory of the request that issued it, so no shape in the domain can carry it
 * into a repository, a log line, or a response body by accident.
 */
export interface Session {
  readonly id: string;
  readonly userId: string;
  /** Hex-encoded SHA-256 of the raw token (64 lowercase hex characters). */
  readonly tokenHash: string;
  /** Absolute expiry, UTC ISO-8601 (doc 06 §40). */
  readonly expiresAt: string;
  /** Set when the session was explicitly ended (logout, T2.04). */
  readonly revokedAt: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
}

/**
 * Fields supplied when a session is issued.
 *
 * `expiresAt` is server-computed and `tokenHash` is derived, so neither can be
 * taken from a client. `revokedAt` and `lastUsedAt` are absent by construction:
 * a session cannot be born revoked or already used.
 */
export type SessionIssueInput = Pick<
  Session,
  'id' | 'userId' | 'tokenHash' | 'expiresAt' | 'ipAddress' | 'userAgent'
>;

// ---------------------------------------------------------------------------
// Lifetime policy (doc 06 §23 `expires_at`, §42 "Token/session expiration")
// ---------------------------------------------------------------------------

/**
 * Session lifetime in seconds (12 hours).
 *
 * Chosen to cover one working day of QIMA administration without spanning
 * multiple days: a session left open on a shared school or office computer must
 * expire on its own, because logout cannot be relied upon. It is deliberately
 * an absolute lifetime, not an idle timeout — an attacker holding a stolen
 * token can trivially keep an idle timer alive, so only an absolute bound puts
 * a ceiling on the value of a leaked token.
 */
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

/**
 * Length in bytes of the raw session token before encoding.
 *
 * 32 bytes = 256 bits of entropy, matching the SHA-256 digest it is hashed
 * into: a shorter token would become the weakest link, and a longer one would
 * add no strength beyond the digest width.
 */
export const SESSION_TOKEN_BYTES = 32;

/** Shape of a stored token hash: exactly the hex SHA-256 the schema enforces. */
const TOKEN_HASH_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Reasons a session cannot authenticate a request.
 *
 * A closed vocabulary, so the transport layer maps outcomes deliberately and
 * cannot invent an authentication state that the domain does not define.
 */
export const SESSION_INVALID_REASONS = ['NOT_FOUND', 'EXPIRED', 'REVOKED'] as const;
export type SessionInvalidReason = (typeof SESSION_INVALID_REASONS)[number];

/** Raised when a session record or token violates the domain contract. */
export class SessionPolicyError extends DomainValidationError {
  constructor(field: string, message: string) {
    super(field, message);
    this.name = 'SessionPolicyError';
  }
}

// ---------------------------------------------------------------------------
// Validity rules
// ---------------------------------------------------------------------------

/**
 * Compute the absolute expiry for a session issued at `issuedAt`.
 *
 * Kept in the domain, and expressed in UTC ISO-8601 (doc 06 §40), so login
 * (T2.03) and any future refresh path cannot drift apart on the lifetime that
 * the API publishes as `expires_at`.
 */
export function sessionExpiryFrom(issuedAt: Date, ttlSeconds: number = SESSION_TTL_SECONDS): string {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new SessionPolicyError('expiresAt', 'session ttl must be a positive number of seconds.');
  }

  const expiry = new Date(issuedAt.getTime() + ttlSeconds * 1000);
  return toUtcTimestamp(expiry);
}

/**
 * Serialize an instant into the exact timestamp format the schema stores.
 *
 * The `sessions` CHECK constraint compares `expires_at > created_at` as text,
 * which is only correct while both sides use this one fixed-width UTC format;
 * a locale-dependent or offset-bearing string would make the comparison
 * silently wrong.
 */
export function toUtcTimestamp(instant: Date): string {
  const time = instant.getTime();

  if (!Number.isFinite(time)) {
    throw new SessionPolicyError('timestamp', 'timestamp must be a valid instant.');
  }

  return `${instant.toISOString().slice(0, 19)}Z`;
}

/** True when `value` is a well-formed stored token hash. */
export function isValidTokenHash(value: string): boolean {
  return TOKEN_HASH_PATTERN.test(value);
}

/**
 * Guard applied before a token hash is persisted or looked up.
 *
 * Enforced in the domain as well as in the database so a raw bearer token can
 * never reach the `token_hash` column — the failure surfaces at the call site
 * instead of as an opaque SQLite constraint error.
 */
export function assertValidTokenHash(value: string): void {
  if (value.length === 0) {
    throw new SessionPolicyError('tokenHash', 'session token hash is required.');
  }
  if (!isValidTokenHash(value)) {
    throw new SessionPolicyError(
      'tokenHash',
      'session token hash must be 64 lowercase hexadecimal characters.',
    );
  }
}

/**
 * Validate a session about to be issued.
 *
 * `expiresAt` must be strictly after `createdAt`; a session that expires at its
 * own creation instant is dead on arrival and would be indistinguishable, at
 * read time, from an ordinary expiry.
 */
export function assertIssuableSession(input: SessionIssueInput, createdAt: string): void {
  if (input.id.length === 0) {
    throw new SessionPolicyError('id', 'session id is required.');
  }
  if (input.userId.length === 0) {
    throw new SessionPolicyError('userId', 'session userId is required.');
  }

  assertValidTokenHash(input.tokenHash);

  if (input.expiresAt.length === 0) {
    throw new SessionPolicyError('expiresAt', 'session expiresAt is required.');
  }
  if (input.expiresAt <= createdAt) {
    throw new SessionPolicyError('expiresAt', 'session expiresAt must be after createdAt.');
  }
}

/** True when the session's absolute expiry has passed at `now`. */
export function isSessionExpired(session: Session, now: Date): boolean {
  return session.expiresAt <= toUtcTimestamp(now);
}

/** True when the session was explicitly ended (logout, T2.04). */
export function isSessionRevoked(session: Session): boolean {
  return session.revokedAt !== null;
}

/**
 * Outcome of validating a session for an authenticated request.
 *
 * Unlike the credential check (T2.01), the reason IS carried here: this result
 * is consumed by server-side code that must distinguish "expired, ask the user
 * to sign in again" from "revoked, treat as hostile" for audit purposes. The
 * reason must not be echoed verbatim to the client, which sees only 401
 * (doc 06 §22).
 */
export type SessionCheck =
  | { readonly ok: true; readonly session: Session }
  | { readonly ok: false; readonly reason: SessionInvalidReason };

/**
 * Decide whether a session may authenticate a request.
 *
 * Order is deliberate: revocation is reported before expiry, because an
 * explicitly revoked session that has since also expired is still a logout
 * event, and collapsing it into "expired" would lose that fact in the audit
 * trail (doc 06 §15).
 */
export function evaluateSession(session: Session | null, now: Date): SessionCheck {
  if (session === null) {
    return Object.freeze({ ok: false as const, reason: 'NOT_FOUND' as const });
  }
  if (isSessionRevoked(session)) {
    return Object.freeze({ ok: false as const, reason: 'REVOKED' as const });
  }
  if (isSessionExpired(session, now)) {
    return Object.freeze({ ok: false as const, reason: 'EXPIRED' as const });
  }

  return Object.freeze({ ok: true as const, session });
}

// ---------------------------------------------------------------------------
// Token contract (doc 05 §23 — replaceable provider)
// ---------------------------------------------------------------------------

/** A freshly issued token: the raw value for the client, the hash for storage. */
export interface IssuedToken {
  /** Returned to the client exactly once. Never persisted, never logged. */
  readonly token: string;
  /** Hex SHA-256 of `token`; this is what the `sessions` row stores. */
  readonly tokenHash: string;
}

/**
 * Session token contract owned by the domain and implemented by infrastructure.
 *
 * Two operations rather than one, because the lookup path only ever has a
 * client-supplied token: `hash` lets a request derive the stored form without
 * being able to mint a new session, which keeps token *issuance* out of the
 * read path entirely.
 */
export interface SessionTokenService {
  /** Generate a cryptographically random token and its stored hash. */
  issue(): Promise<IssuedToken>;
  /** Derive the stored hash of a client-supplied raw token. */
  hash(rawToken: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Repository contract (doc 06 §44 Repository Contract)
// ---------------------------------------------------------------------------

/**
 * Session persistence contract.
 *
 * `findByTokenHash` takes a hash, never a raw token: the interface makes it
 * impossible for a repository implementation to receive a bearer credential,
 * so no query log or driver trace can ever contain one.
 *
 * There is no `delete`: a session is revoked, not removed, so the audit trail
 * can distinguish "logged out" from "never existed" (doc 06 §15). Expiry sweeps
 * are an operational concern and are not part of the request-path contract.
 */
export interface SessionRepository {
  issue(input: SessionIssueInput): Promise<Session>;
  /** Lookup used on every authenticated request. */
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  /** Mark a single session as ended (logout, T2.04). Idempotent. */
  revoke(id: string, revokedAt: string): Promise<void>;
  /** Revoke every live session of a user (account suspension, credential reset). */
  revokeAllForUser(userId: string, revokedAt: string): Promise<number>;
  /** Record request activity on a live session. */
  touch(id: string, lastUsedAt: string): Promise<void>;
}
