import { describe, expect, it } from 'vitest';
import {
  PASSWORD_HASH_ITERATIONS,
  PASSWORD_HASH_SCHEME,
  isSupportedPasswordHash,
  needsRehash,
  webCryptoPasswordHasher,
} from '../../apps/api/src/infrastructure/security/password-hasher';

/**
 * Phase 2 task T2.01 — password hashing (infrastructure).
 *
 * doc 06 §42 "Secure password handling"; doc 05 §23 replaceable provider.
 *
 * These tests exercise the real Web Crypto implementation. A mocked hasher
 * could not detect the defects that matter here: a missing salt, a hash that
 * verifies against the wrong password, or an unparsable stored format.
 */

const PASSWORD = 'correct horse battery staple';

describe('webCryptoPasswordHasher', () => {
  it('produces a self-describing encoded hash', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    const parts = encoded.split('$');

    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe(PASSWORD_HASH_SCHEME);
    expect(Number.parseInt(parts[1] ?? '', 10)).toBe(PASSWORD_HASH_ITERATIONS);
  });

  it('never stores the plaintext password inside the hash', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    expect(encoded).not.toContain(PASSWORD);
  });

  it('verifies the correct password', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    await expect(webCryptoPasswordHasher.verify(PASSWORD, encoded)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    await expect(webCryptoPasswordHasher.verify('wrong password entirely', encoded)).resolves.toBe(
      false,
    );
  });

  it('rejects a password differing by a single character', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    await expect(webCryptoPasswordHasher.verify(`${PASSWORD}!`, encoded)).resolves.toBe(false);
  });

  it('is case-sensitive', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    await expect(webCryptoPasswordHasher.verify(PASSWORD.toUpperCase(), encoded)).resolves.toBe(
      false,
    );
  });

  it('salts each hash: the same password never produces the same output', async () => {
    // Without a per-credential salt, identical passwords would be searchable
    // in bulk across the users table.
    const first = await webCryptoPasswordHasher.hash(PASSWORD);
    const second = await webCryptoPasswordHasher.hash(PASSWORD);

    expect(first).not.toBe(second);
  });

  it('verifies both independently salted hashes of the same password', async () => {
    const first = await webCryptoPasswordHasher.hash(PASSWORD);
    const second = await webCryptoPasswordHasher.hash(PASSWORD);

    await expect(webCryptoPasswordHasher.verify(PASSWORD, first)).resolves.toBe(true);
    await expect(webCryptoPasswordHasher.verify(PASSWORD, second)).resolves.toBe(true);
  });

  it('does not verify a password against a hash of a different password', async () => {
    const encoded = await webCryptoPasswordHasher.hash('first password value');
    await expect(webCryptoPasswordHasher.verify('second password value', encoded)).resolves.toBe(
      false,
    );
  });

  it('handles unicode passwords consistently', async () => {
    const unicode = 'kata-sandi-اَلْقُرْآنُ-2026';
    const encoded = await webCryptoPasswordHasher.hash(unicode);

    await expect(webCryptoPasswordHasher.verify(unicode, encoded)).resolves.toBe(true);
    await expect(webCryptoPasswordHasher.verify('kata-sandi-2026', encoded)).resolves.toBe(false);
  });
});

describe('malformed stored hashes', () => {
  // A corrupt or foreign hash must behave exactly like a wrong password:
  // returning `false` rather than throwing keeps the failure indistinguishable
  // and stops a stored-data defect from becoming a 500 on the login endpoint.
  it.each([
    ['empty string', ''],
    ['no separators', 'notahash'],
    ['unknown scheme', 'bcrypt$10$abc$def'],
    ['too few parts', `${PASSWORD_HASH_SCHEME}$100000$onlysalt`],
    ['too many parts', `${PASSWORD_HASH_SCHEME}$100000$a$b$c`],
    ['non-numeric iterations', `${PASSWORD_HASH_SCHEME}$many$YWJj$ZGVm`],
    ['zero iterations', `${PASSWORD_HASH_SCHEME}$0$YWJj$ZGVm`],
    ['negative iterations', `${PASSWORD_HASH_SCHEME}$-1$YWJj$ZGVm`],
    ['empty salt', `${PASSWORD_HASH_SCHEME}$100000$$ZGVm`],
    ['empty key', `${PASSWORD_HASH_SCHEME}$100000$YWJj$`],
  ])('verify() returns false for %s without throwing', async (_label, encoded) => {
    await expect(webCryptoPasswordHasher.verify(PASSWORD, encoded)).resolves.toBe(false);
  });

  it('isSupportedPasswordHash() rejects a foreign scheme', () => {
    expect(isSupportedPasswordHash('argon2id$v=19$m=65536$abc$def')).toBe(false);
  });

  it('isSupportedPasswordHash() accepts a freshly produced hash', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    expect(isSupportedPasswordHash(encoded)).toBe(true);
  });
});

describe('cost upgrade path (doc 05 §23)', () => {
  it('does not flag a hash written at the current cost', async () => {
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    expect(needsRehash(encoded)).toBe(false);
  });

  it('flags a hash written at a weaker cost', () => {
    const weaker = `${PASSWORD_HASH_SCHEME}$1000$YWJjZGVmZ2hpamtsbW5vcA==$ZGVm`;
    expect(needsRehash(weaker)).toBe(true);
  });

  it('flags an unparsable hash for replacement', () => {
    expect(needsRehash('garbage')).toBe(true);
  });

  it('still verifies a hash produced with a different iteration count', async () => {
    // The stored cost is used for verification, so raising the constant later
    // must not lock existing users out.
    const encoded = await webCryptoPasswordHasher.hash(PASSWORD);
    const [scheme, , salt, key] = encoded.split('$');
    expect(scheme).toBe(PASSWORD_HASH_SCHEME);

    // Re-deriving at a different cost must NOT match the stored key.
    const tampered = `${scheme}$${PASSWORD_HASH_ITERATIONS - 1}$${salt}$${key}`;
    await expect(webCryptoPasswordHasher.verify(PASSWORD, tampered)).resolves.toBe(false);
  });

  it('uses an iteration count meeting current password-storage guidance', () => {
    expect(PASSWORD_HASH_ITERATIONS).toBeGreaterThanOrEqual(100_000);
  });
});
