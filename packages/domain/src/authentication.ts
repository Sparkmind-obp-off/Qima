/**
 * QIMA authentication domain — Phase 2 tasks T2.01 (Authentication) and the
 * credential-read contract required by T2.03 (Login API).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, tasks T2.01 and T2.03.
 * - doc 06 §42 API Security Contract: "Secure password handling".
 * - doc 05 §23 Authentication: the authentication *provider* is replaceable,
 *   so the domain must depend on a contract rather than on a hashing library.
 * - doc 05 §10 Domain Layer / doc 08 §9: no HTTP, driver or provider import.
 * - .codex/IMPLEMENTATION_RULES.md §6: validation is layered — the credential
 *   policy is a domain rule, mirrored (not replaced) by transport validation.
 *
 * Scope of this module: the credential *rules*, the hashing *contract*, and the
 * narrow credential-read contract the login use case depends on. The actual
 * cryptographic implementation is infrastructure and lives in
 * `apps/api/src/infrastructure/security`, which keeps the domain free of any
 * algorithm choice and lets the algorithm be replaced without touching a
 * business rule (doc 05 §23).
 *
 * Phase boundary: session issuance/validation (T2.02), the logout endpoint
 * (T2.04) and authorization middleware (T2.09) are separate tasks and are NOT
 * defined here. T2.03 orchestrates the pieces defined here; it does not add
 * business rules of its own.
 */

import { DomainValidationError } from './identity';
import type { UserStatus } from './identity';

// ---------------------------------------------------------------------------
// Credential policy (doc 06 §42 "Secure password handling")
// ---------------------------------------------------------------------------

/**
 * Minimum password length.
 *
 * QIMA accounts administer tenant data, so the floor is deliberately above the
 * common 8-character default. Length is the property that actually resists
 * offline attack; composition rules ("one symbol, one digit") mainly push users
 * toward predictable substitutions, so they are intentionally not imposed.
 */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Maximum password length.
 *
 * An upper bound is a denial-of-service control, not a security downgrade:
 * without it, a caller could submit a multi-megabyte string and force the key
 * derivation function to burn the request's entire CPU budget.
 */
export const PASSWORD_MAX_LENGTH = 256;

/** Raised when supplied credentials do not satisfy the domain policy. */
export class CredentialPolicyError extends DomainValidationError {
  constructor(message: string) {
    super('password', message);
    this.name = 'CredentialPolicyError';
  }
}

/**
 * Validate a plaintext password against the QIMA credential policy.
 *
 * Applied when a credential is *set* (invitation, reset, change) — never on
 * login. Enforcing the policy at login would reject legitimate accounts whose
 * password predates a policy change, and would leak, through differing error
 * responses, whether a submitted string could possibly be a stored credential.
 */
export function assertValidPassword(value: string): void {
  if (value.length === 0) {
    throw new CredentialPolicyError('password is required.');
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new CredentialPolicyError(
      `password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    throw new CredentialPolicyError(
      `password must not exceed ${PASSWORD_MAX_LENGTH} characters.`,
    );
  }
  if (value.trim().length === 0) {
    throw new CredentialPolicyError('password must not consist only of whitespace.');
  }
}

/**
 * Normalize a submitted email into its canonical stored form (doc 06 §8:
 * `users.email` is unique and stored lowercase).
 *
 * Login must apply the same normalization as account creation, otherwise
 * `User@example.com` would fail to match a stored `user@example.com` and the
 * uniqueness guarantee would be silently bypassed at the lookup boundary.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Hashing contract (doc 05 §23 — replaceable provider)
// ---------------------------------------------------------------------------

/**
 * Password hashing contract owned by the domain and implemented by
 * infrastructure.
 *
 * `verify` returns a boolean rather than throwing on mismatch: a wrong password
 * is an expected outcome of authentication, not an exceptional condition, and
 * distinguishing "malformed stored hash" from "wrong password" through the
 * control flow would hand an attacker an oracle. Both resolve to `false`.
 */
export interface PasswordHasher {
  /** Derive a self-describing encoded hash from a plaintext password. */
  hash(plainPassword: string): Promise<string>;
  /** Verify a plaintext password against an encoded hash. Never throws. */
  verify(plainPassword: string, encodedHash: string): Promise<boolean>;
}

/**
 * Outcome of a credential check.
 *
 * Deliberately does not distinguish "unknown email" from "wrong password":
 * doc 06 §42 forbids handing the client an account-enumeration oracle, so the
 * authentication use case can only observe success or failure.
 */
export const CREDENTIAL_FAILURE = 'INVALID_CREDENTIALS' as const;

export type CredentialCheck =
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly reason: typeof CREDENTIAL_FAILURE };

export function credentialAccepted(userId: string): CredentialCheck {
  return Object.freeze({ ok: true as const, userId });
}

export function credentialRejected(): CredentialCheck {
  return Object.freeze({ ok: false as const, reason: CREDENTIAL_FAILURE });
}

/**
 * User statuses permitted to authenticate (doc 06 §3.1 lifecycle).
 *
 * `invited` is excluded on purpose: an invitation is not yet an account, and an
 * `inactive`/`suspended` user must not be able to trade a still-valid password
 * for a session. Authorization alone cannot cover this — the account must fail
 * to authenticate at all.
 */
export const AUTHENTICATABLE_USER_STATUSES = ['active'] as const;

export function canAuthenticate(status: string): boolean {
  return (AUTHENTICATABLE_USER_STATUSES as readonly string[]).includes(status);
}

// ---------------------------------------------------------------------------
// Credential read contract (doc 06 §44, required by T2.03 Login API)
// ---------------------------------------------------------------------------

/**
 * The credential record needed to authenticate one account, and nothing else.
 *
 * Why this exists as a SEPARATE contract instead of widening
 * `UserRepository` (doc 06 §44) to return `password_hash`:
 *
 * `UserRepository` is the general-purpose user read used by every future
 * feature — profile screens, member lists, audit rendering, reports. Adding a
 * `passwordHash` field there would put credential material on the read path of
 * code that has no business touching it, and one careless `c.json(user)` would
 * publish a password hash. The Phase 1 implementation selects an explicit
 * column list precisely so that cannot happen (Quality Gate 10), and T2.03 must
 * not undo that.
 *
 * Instead, the credential read is its own capability with its own contract:
 * exactly one caller (the login use case), exactly one reason to exist, and no
 * `name`/`phone`/timestamps that would tempt a caller to use it as a general
 * user lookup. The security boundary is therefore preserved rather than
 * weakened — the hash becomes reachable through one auditable interface instead
 * of through every user read in the system.
 *
 * `status` is included because authentication must be refused for a non-active
 * account (see `canAuthenticate`) and the decision has to be made *before* a
 * session is issued — an authorization check after the fact would be too late.
 */
export interface UserCredential {
  readonly userId: string;
  readonly status: UserStatus;
  /** Encoded hash as produced by `PasswordHasher.hash`. Never returned to a client. */
  readonly passwordHash: string;
}

/**
 * Credential lookup used solely by authentication.
 *
 * Keyed by email only: login is the one operation that identifies an account by
 * a client-supplied value, and there is deliberately no `findById` here —
 * nothing in QIMA has a legitimate reason to fetch a password hash for a user
 * it has already identified.
 *
 * Returns `null` for both "no such account" and "soft-deleted account", so the
 * use case cannot accidentally derive an account-enumeration signal from the
 * repository's return shape (doc 06 §42).
 */
export interface UserCredentialRepository {
  /** `email` must already be normalized with `normalizeEmail`. */
  findByEmail(email: string): Promise<UserCredential | null>;
}
