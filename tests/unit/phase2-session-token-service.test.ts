import { describe, expect, it } from 'vitest';
import { SESSION_TOKEN_BYTES, SessionPolicyError, isValidTokenHash } from '@qima/domain';
import {
  SESSION_TOKEN_ENCODED_LENGTH,
  SESSION_TOKEN_HASH_LENGTH,
  isWellFormedSessionToken,
  webCryptoSessionTokenService,
} from '../../apps/api/src/infrastructure/security/session-token-service';

/**
 * Phase 2 task T2.02 — session token service (infrastructure).
 *
 * doc 06 §42 "Token/session expiration"; doc 05 §23 replaceable provider.
 *
 * These tests exercise the real Web Crypto implementation rather than a mock:
 * the defects that matter here — a non-random token, a non-deterministic hash,
 * a raw token leaking into the stored form — are exactly the ones a mocked
 * crypto layer would hide.
 */

describe('webCryptoSessionTokenService.issue', () => {
  it('issues a non-empty raw token and its stored hash', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    expect(issued.token.length).toBeGreaterThan(0);
    expect(issued.tokenHash.length).toBeGreaterThan(0);
  });

  it('encodes the token at the width implied by the domain entropy setting', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    // 32 bytes -> 43 unpadded base64url characters. Asserted against the
    // derived constant so token width and validation cannot drift apart.
    expect(SESSION_TOKEN_ENCODED_LENGTH).toBe(Math.ceil((SESSION_TOKEN_BYTES * 4) / 3));
    expect(issued.token).toHaveLength(SESSION_TOKEN_ENCODED_LENGTH);
  });

  it('emits url-safe characters only', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    // A token carrying `+`, `/` or `=` can be mangled by an intermediary, and a
    // mangled token is indistinguishable from a forged one at lookup time.
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(issued.token).not.toContain('=');
  });

  it('produces a hash that satisfies the domain token-hash contract', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    expect(isValidTokenHash(issued.tokenHash)).toBe(true);
    expect(issued.tokenHash).toHaveLength(SESSION_TOKEN_HASH_LENGTH);
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never exposes the raw token inside its own hash', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    expect(issued.tokenHash).not.toContain(issued.token);
    expect(issued.tokenHash).not.toBe(issued.token);
  });

  it('issues a different token on every call', async () => {
    const issuances = await Promise.all(
      Array.from({ length: 50 }, () => webCryptoSessionTokenService.issue()),
    );

    const tokens = new Set(issuances.map((issued) => issued.token));
    const hashes = new Set(issuances.map((issued) => issued.tokenHash));

    // A repeated token would let one user's session authenticate another's, and
    // would violate the `sessions_token_hash_unique` constraint on insert.
    expect(tokens.size).toBe(issuances.length);
    expect(hashes.size).toBe(issuances.length);
  });

  it('returns a frozen result so the raw token cannot be swapped into the hash', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    expect(Object.isFrozen(issued)).toBe(true);
  });

  it('pairs the token with the hash of that exact token', async () => {
    const issued = await webCryptoSessionTokenService.issue();

    // The issue path and the read path must agree, otherwise a freshly issued
    // session would fail its own first authenticated request.
    await expect(webCryptoSessionTokenService.hash(issued.token)).resolves.toBe(issued.tokenHash);
  });

  it('spreads randomness across the token space', async () => {
    const issuances = await Promise.all(
      Array.from({ length: 20 }, () => webCryptoSessionTokenService.issue()),
    );

    // A degenerate generator (a counter, a timestamp, a constant prefix) would
    // collapse the leading characters; a CSPRNG does not.
    const leading = new Set(issuances.map((issued) => issued.token.slice(0, 4)));
    expect(leading.size).toBeGreaterThan(1);
  });
});

describe('webCryptoSessionTokenService.hash', () => {
  it('is deterministic for the same token', async () => {
    const { token } = await webCryptoSessionTokenService.issue();

    const first = await webCryptoSessionTokenService.hash(token);
    const second = await webCryptoSessionTokenService.hash(token);

    // Determinism is what makes `WHERE token_hash = ?` a viable lookup.
    expect(first).toBe(second);
  });

  it('maps different tokens to different hashes', async () => {
    const a = await webCryptoSessionTokenService.issue();
    const b = await webCryptoSessionTokenService.issue();

    await expect(webCryptoSessionTokenService.hash(a.token)).resolves.not.toBe(
      await webCryptoSessionTokenService.hash(b.token),
    );
  });

  it('changes the hash completely for a single-character difference', async () => {
    const { token } = await webCryptoSessionTokenService.issue();
    const flippedChar = token.startsWith('A') ? 'B' : 'A';
    const neighbour = `${flippedChar}${token.slice(1)}`;

    const original = await webCryptoSessionTokenService.hash(token);
    const changed = await webCryptoSessionTokenService.hash(neighbour);

    expect(changed).not.toBe(original);
  });

  it('never returns the raw token', async () => {
    const { token } = await webCryptoSessionTokenService.issue();
    const hash = await webCryptoSessionTokenService.hash(token);

    // The repository layer receives only this value, so it must not carry the
    // bearer credential in any form.
    expect(hash).not.toBe(token);
    expect(hash).not.toContain(token);
  });

  it('produces a hash conforming to the stored format', async () => {
    const { token } = await webCryptoSessionTokenService.issue();
    const hash = await webCryptoSessionTokenService.hash(token);

    expect(isValidTokenHash(hash)).toBe(true);
  });

  it('is case-sensitive', async () => {
    const { token } = await webCryptoSessionTokenService.issue();
    const swapped = token
      .split('')
      .map((char) => (char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase()))
      .join('');

    if (swapped === token) {
      // Extremely unlikely (token is base64url), but keep the assertion honest.
      expect(swapped).toBe(token);
      return;
    }

    await expect(webCryptoSessionTokenService.hash(swapped)).resolves.not.toBe(
      await webCryptoSessionTokenService.hash(token),
    );
  });

  it('rejects an empty token', async () => {
    await expect(webCryptoSessionTokenService.hash('')).rejects.toThrow(SessionPolicyError);
  });

  it.each([
    ['too short', 'a'.repeat(SESSION_TOKEN_ENCODED_LENGTH - 1)],
    ['too long', 'a'.repeat(SESSION_TOKEN_ENCODED_LENGTH + 1)],
    ['padded base64', `${'a'.repeat(SESSION_TOKEN_ENCODED_LENGTH - 1)}=`],
    ['non-url-safe base64', `${'a'.repeat(SESSION_TOKEN_ENCODED_LENGTH - 1)}/`],
    ['whitespace', ` ${'a'.repeat(SESSION_TOKEN_ENCODED_LENGTH - 1)}`],
    ['a plausible identifier used as a bearer token', 'session-1234'],
  ])('rejects a malformed token (%s)', async (_label, value) => {
    // Rejected on the read path so a malformed credential fails as an
    // authentication error, not as a database round trip.
    await expect(webCryptoSessionTokenService.hash(value)).rejects.toThrow(SessionPolicyError);
  });
});

describe('session token shape guard', () => {
  it('accepts a token the service issued', async () => {
    const { token } = await webCryptoSessionTokenService.issue();
    expect(isWellFormedSessionToken(token)).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['a stored hash rather than a token', 'a'.repeat(SESSION_TOKEN_HASH_LENGTH)],
    ['a bare uuid', '3f1c9c3e-0000-4000-8000-000000000000'],
  ])('rejects %s', (_label, value) => {
    expect(isWellFormedSessionToken(value)).toBe(false);
  });
});

describe('runtime compatibility (Cloudflare Workers)', () => {
  it('uses only Web Crypto primitives available in the Workers runtime', () => {
    expect(typeof crypto.getRandomValues).toBe('function');
    expect(typeof crypto.subtle.digest).toBe('function');
    expect(typeof btoa).toBe('function');
    expect(typeof TextEncoder).toBe('function');
  });

  it('does not depend on Math.random for token generation', async () => {
    const original = Math.random;

    // If the implementation reached for Math.random, this would throw rather
    // than silently returning a predictable token.
    Math.random = () => {
      throw new Error('Math.random must not be used for credential generation.');
    };

    try {
      const issued = await webCryptoSessionTokenService.issue();
      expect(issued.token).toHaveLength(SESSION_TOKEN_ENCODED_LENGTH);
    } finally {
      Math.random = original;
    }
  });
});
