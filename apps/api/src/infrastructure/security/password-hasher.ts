/**
 * QIMA password hasher — Phase 2 task T2.01 (Authentication).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 task T2.01 Authentication.
 * - doc 06 §42 API Security Contract: "Secure password handling".
 * - doc 05 §23 Authentication: the provider is replaceable — this module is one
 *   implementation of the domain's `PasswordHasher` contract, not the contract.
 * - doc 08 §11 Infrastructure Layer: the algorithm choice stays here.
 * - .codex/IMPLEMENTATION_RULES.md §14 Dependency Rule: prefer native
 *   capability over a new dependency.
 *
 * Algorithm: PBKDF2-HMAC-SHA-256 via the Web Crypto API.
 *
 * Why PBKDF2 and not Argon2id/bcrypt: Cloudflare Workers exposes Web Crypto but
 * cannot run a native hashing addon, and a pure-JS bcrypt/Argon2 would both add
 * a dependency and blow the Worker CPU budget. PBKDF2 is the strongest
 * memory-hard-adjacent KDF actually available in this runtime, and it is
 * FIPS-approved for password storage. The encoded format records the algorithm
 * and iteration count, so a future runtime that offers Argon2id can be adopted
 * without invalidating stored hashes.
 */

import type { PasswordHasher } from '@qima/domain';

/** Encoded-hash format identifier. Changing the scheme requires a new label. */
const SCHEME = 'pbkdf2-sha256';

/**
 * Iteration count.
 *
 * Chosen against the Workers CPU limit rather than a desktop benchmark: a login
 * must complete inside the request budget, so an iteration count tuned for a
 * long-lived server would make authentication fail in production. The value is
 * recorded in every hash, so it can be raised later and old hashes still verify.
 */
const ITERATIONS = 100_000;

/** Salt length in bytes (128-bit, per NIST SP 800-132 minimum). */
const SALT_BYTES = 16;

/** Derived key length in bytes (256-bit, matching the SHA-256 output). */
const KEY_BYTES = 32;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      // `salt` is a view over a plain ArrayBuffer; passing the buffer keeps the
      // call valid under both the Workers and Node Web Crypto typings.
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BYTES * 8,
  );

  return new Uint8Array(bits);
}

/**
 * Constant-time comparison.
 *
 * A short-circuiting `===` on the derived key leaks, through response timing,
 * how many leading bytes matched — enough to reconstruct a hash byte by byte.
 * The loop below always inspects every byte.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return difference === 0;
}

/** Parsed representation of the encoded hash string. */
interface ParsedHash {
  readonly iterations: number;
  readonly salt: Uint8Array;
  readonly key: Uint8Array;
}

/**
 * Parse `pbkdf2-sha256$<iterations>$<salt-b64>$<key-b64>`.
 *
 * Returns `null` rather than throwing: a malformed stored hash must produce the
 * same observable outcome as a wrong password, never a distinguishable error.
 */
function parseEncodedHash(encoded: string): ParsedHash | null {
  const parts = encoded.split('$');

  if (parts.length !== 4 || parts[0] !== SCHEME) {
    return null;
  }

  const iterations = Number.parseInt(parts[1] ?? '', 10);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return null;
  }

  try {
    const salt = fromBase64(parts[2] ?? '');
    const key = fromBase64(parts[3] ?? '');

    if (salt.length === 0 || key.length === 0) {
      return null;
    }

    return { iterations, salt, key };
  } catch {
    return null;
  }
}

/**
 * Web Crypto implementation of the domain `PasswordHasher` contract.
 *
 * Stateless and safe to share across requests.
 */
export const webCryptoPasswordHasher: PasswordHasher = {
  async hash(plainPassword: string): Promise<string> {
    // A fresh random salt per credential: without it, identical passwords would
    // produce identical hashes and become searchable in bulk.
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const key = await deriveKey(plainPassword, salt, ITERATIONS);

    return `${SCHEME}$${ITERATIONS}$${toBase64(salt)}$${toBase64(key)}`;
  },

  async verify(plainPassword: string, encodedHash: string): Promise<boolean> {
    const parsed = parseEncodedHash(encodedHash);

    if (parsed === null) {
      return false;
    }

    try {
      // The stored iteration count is used, not the current constant, so hashes
      // written under an earlier cost setting keep verifying.
      const candidate = await deriveKey(plainPassword, parsed.salt, parsed.iterations);
      return timingSafeEqual(candidate, parsed.key);
    } catch {
      return false;
    }
  },
};

/** Exposed for verification and migration tooling; not part of the domain contract. */
export const PASSWORD_HASH_SCHEME = SCHEME;
export const PASSWORD_HASH_ITERATIONS = ITERATIONS;

/** True when an encoded hash is well-formed and uses the current scheme. */
export function isSupportedPasswordHash(encoded: string): boolean {
  return parseEncodedHash(encoded) !== null;
}

/**
 * True when a stored hash was produced with a weaker cost than the current
 * policy and should be re-hashed on the next successful login.
 */
export function needsRehash(encoded: string): boolean {
  const parsed = parseEncodedHash(encoded);
  return parsed === null || parsed.iterations < ITERATIONS;
}
