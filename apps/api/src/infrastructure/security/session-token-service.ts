/**
 * QIMA session token service — Phase 2 task T2.02 (Session management).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.02 Session management.
 * - doc 06 §23 AUTH API: the login response publishes `access_token`, which is
 *   the raw value this service mints exactly once.
 * - doc 06 §42 API Security Contract: "Token/session expiration".
 * - doc 05 §23 Authentication: the provider is replaceable — this module is one
 *   implementation of the domain's `SessionTokenService` contract, never the
 *   contract itself.
 * - doc 08 §11 Infrastructure Layer: the encoding and digest choices stay here.
 * - .codex/IMPLEMENTATION_RULES.md §14 Dependency Rule: native Web Crypto is
 *   used rather than adding a crypto dependency.
 *
 * Algorithm: 256 bits of `crypto.getRandomValues` randomness, encoded as
 * unpadded base64url for transport, stored as a hex SHA-256 digest.
 *
 * Why SHA-256 and not a password KDF: a session token is server-generated
 * cryptographic randomness with no dictionary to attack, so key stretching adds
 * CPU cost to *every* authenticated request while buying no additional
 * resistance. The password case is different and is handled by
 * `password-hasher.ts` (PBKDF2) — the two must not be conflated.
 *
 * Why the digest is unsalted: the stored hash must be reproducible from the
 * client-supplied token alone, because the lookup is `WHERE token_hash = ?`. A
 * per-row salt would make that lookup impossible without first finding the row.
 *
 * Runtime: `crypto.getRandomValues`, `crypto.subtle.digest`, `TextEncoder` and
 * `btoa` are all available in the Cloudflare Workers runtime, so this file runs
 * unchanged in production. `Math.random()` is never used: it is not a CSPRNG and
 * its output would be predictable enough to forge live sessions.
 */

import { SESSION_TOKEN_BYTES, SessionPolicyError } from '@qima/domain';
import type { IssuedToken, SessionTokenService } from '@qima/domain';

/**
 * Length of the transport encoding of a `SESSION_TOKEN_BYTES` token.
 *
 * Derived rather than hard-coded so the token width and its validation can
 * never drift apart: unpadded base64url encodes 3 bytes into 4 characters.
 */
export const SESSION_TOKEN_ENCODED_LENGTH = Math.ceil((SESSION_TOKEN_BYTES * 4) / 3);

/** Length of the hex SHA-256 digest stored in `sessions.token_hash`. */
const TOKEN_HASH_LENGTH = 64;

/** Character set of unpadded base64url (RFC 4648 §5). */
const ENCODED_TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${SESSION_TOKEN_ENCODED_LENGTH}}$`);

/**
 * Encode bytes as unpadded base64url.
 *
 * base64url rather than plain base64 because the token travels in an
 * `Authorization` header and may end up in a cookie: `+`, `/` and `=` are all
 * characters that some intermediary will percent-encode or truncate, and a
 * mangled token is indistinguishable from a forged one at the lookup.
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Render a digest as the lowercase hex the schema CHECK constraint enforces. */
function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
}

/** Hex SHA-256 of a UTF-8 string, via the runtime's Web Crypto. */
async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded as unknown as BufferSource);

  return toHex(new Uint8Array(digest));
}

/**
 * True when `value` has the shape of a token this service issues.
 *
 * Exported for the transport layer (T2.03/T2.09), which can reject a malformed
 * bearer value before touching the database. The check is on shape only — it
 * proves nothing about authenticity.
 */
export function isWellFormedSessionToken(value: string): boolean {
  return ENCODED_TOKEN_PATTERN.test(value);
}

/**
 * Web Crypto implementation of the domain `SessionTokenService` contract.
 *
 * Stateless and safe to share across requests. It holds no secret material: the
 * digest is keyless by design, so there is no key to rotate or to leak.
 */
export const webCryptoSessionTokenService: SessionTokenService = {
  async issue(): Promise<IssuedToken> {
    // 256 bits from the platform CSPRNG. This is the only place a raw session
    // token comes into existence.
    const raw = crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES));
    const token = toBase64Url(raw);
    const tokenHash = await sha256Hex(token);

    // Frozen so no caller downstream can mutate `token` into `tokenHash` (or
    // vice versa) and accidentally persist a bearer credential.
    return Object.freeze({ token, tokenHash });
  },

  async hash(rawToken: string): Promise<string> {
    // Validation lives on the read path deliberately: `hash` is the only
    // entry point a client-supplied token reaches, and an empty or malformed
    // value must fail here rather than becoming a pointless database lookup.
    // The transport layer maps this failure to 401, never to 500 (doc 06 §22).
    if (rawToken.length === 0) {
      throw new SessionPolicyError('token', 'session token is required.');
    }
    if (!isWellFormedSessionToken(rawToken)) {
      throw new SessionPolicyError(
        'token',
        `session token must be ${SESSION_TOKEN_ENCODED_LENGTH} base64url characters.`,
      );
    }

    return sha256Hex(rawToken);
  },
};

/** Exposed for verification tooling; not part of the domain contract. */
export const SESSION_TOKEN_HASH_ALGORITHM = 'sha-256';
export const SESSION_TOKEN_ENCODING = 'base64url';
export const SESSION_TOKEN_HASH_LENGTH = TOKEN_HASH_LENGTH;
