import { describe, expect, it } from 'vitest';
import {
  AUTHENTICATABLE_USER_STATUSES,
  CREDENTIAL_FAILURE,
  CredentialPolicyError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_STATUSES,
  assertValidPassword,
  canAuthenticate,
  credentialAccepted,
  credentialRejected,
  normalizeEmail,
} from '@qima/domain';

/**
 * Phase 2 task T2.01 — credential policy (domain).
 *
 * doc 06 §42 API Security Contract: "Secure password handling".
 * doc 05 §23 Authentication: the domain owns the rule, not the algorithm.
 */

describe('password policy (doc 06 §42)', () => {
  it('accepts a password at the minimum length', () => {
    expect(() => assertValidPassword('a'.repeat(PASSWORD_MIN_LENGTH))).not.toThrow();
  });

  it('rejects an empty password', () => {
    expect(() => assertValidPassword('')).toThrow(CredentialPolicyError);
  });

  it('rejects a password below the minimum length', () => {
    expect(() => assertValidPassword('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toThrow(
      CredentialPolicyError,
    );
  });

  it('rejects a password above the maximum length', () => {
    // The upper bound is a DoS control: an unbounded input would let a caller
    // force the KDF to consume the whole request CPU budget.
    expect(() => assertValidPassword('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toThrow(
      CredentialPolicyError,
    );
  });

  it('accepts a password at the maximum length', () => {
    expect(() => assertValidPassword('a'.repeat(PASSWORD_MAX_LENGTH))).not.toThrow();
  });

  it('rejects a whitespace-only password of sufficient length', () => {
    expect(() => assertValidPassword(' '.repeat(PASSWORD_MIN_LENGTH + 4))).toThrow(
      CredentialPolicyError,
    );
  });

  it('reports the failing field so transport can map it to a validation error', () => {
    try {
      assertValidPassword('short');
      throw new Error('expected the policy to reject the password');
    } catch (error) {
      expect(error).toBeInstanceOf(CredentialPolicyError);
      expect((error as CredentialPolicyError).field).toBe('password');
    }
  });

  it('never includes the submitted password in the error message', () => {
    // A policy error is logged and returned; echoing the credential would leak
    // it into logs and responses (Quality Gate 10).
    const submitted = 'tiny';

    try {
      assertValidPassword(submitted);
      throw new Error('expected the policy to reject the password');
    } catch (error) {
      expect((error as Error).message).not.toContain(submitted);
    }
  });

  it('enforces a minimum length above the common 8-character default', () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(12);
  });
});

describe('email normalization (doc 06 §8)', () => {
  it('lowercases and trims so login matches the stored canonical form', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('is idempotent', () => {
    const once = normalizeEmail('User@Example.com');
    expect(normalizeEmail(once)).toBe(once);
  });

  it('produces the lowercase form required by the users.email CHECK constraint', () => {
    const normalized = normalizeEmail('MiXeD@Case.Example');
    expect(normalized).toBe(normalized.toLowerCase());
  });
});

describe('credential check result', () => {
  it('carries the user id on success', () => {
    expect(credentialAccepted('user-1')).toEqual({ ok: true, userId: 'user-1' });
  });

  it('returns a single opaque reason on failure (no enumeration oracle)', () => {
    // doc 06 §42: the client must not learn whether the email exists.
    expect(credentialRejected()).toEqual({ ok: false, reason: CREDENTIAL_FAILURE });
  });

  it('is frozen so a caller cannot mutate an authentication outcome', () => {
    const result = credentialAccepted('user-1');
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe('authenticatable status (doc 06 §3.1)', () => {
  it('permits only active users', () => {
    expect(canAuthenticate('active')).toBe(true);
  });

  it.each(['invited', 'inactive', 'suspended'])('rejects %s users', (status) => {
    // An invited account is not yet an account; a suspended one must not be
    // able to trade a still-valid password for a session.
    expect(canAuthenticate(status)).toBe(false);
  });

  it('rejects an unknown status rather than defaulting to permissive', () => {
    expect(canAuthenticate('superuser')).toBe(false);
    expect(canAuthenticate('')).toBe(false);
  });

  it('only lists statuses that exist in the user lifecycle', () => {
    for (const status of AUTHENTICATABLE_USER_STATUSES) {
      expect(USER_STATUSES).toContain(status);
    }
  });
});
