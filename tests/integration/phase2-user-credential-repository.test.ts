import { beforeEach, describe, expect, it } from 'vitest';
import type { UserCredentialRepository } from '@qima/domain';
import { createUserCredentialRepository } from '../../apps/api/src/infrastructure/database/user-credential-repository';
import { createUserRepository } from '../../apps/api/src/infrastructure/database/repositories';
import { webCryptoPasswordHasher } from '../../apps/api/src/infrastructure/security/password-hasher';
import { createMigratedDatabase, type TestDatabase } from './sqlite-harness';

/**
 * Phase 2 task T2.03 — user credential repository (D1 adapter).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 task T2.03 Login API.
 * - doc 06 §44 Repository Contract, §49 Implementation Rule.
 * - doc 06 §38 Soft Delete Policy: a soft-deleted account is not an account.
 * - doc 06 §42 API Security Contract: secure password handling.
 * - .codex/QUALITY_GATES.md Gate 5 (data contract), Gate 10 (credential hygiene).
 *
 * These run against a real migrated SQLite database rather than a mocked
 * driver, because the defects worth catching here are database-level: a query
 * that forgets `deleted_at is null`, and an email predicate that silently
 * matches nothing because `users.email` is stored lowercase under a CHECK
 * constraint (migration 0002). A mock would agree with itself in both cases.
 */

const ACTIVE = '99999999-0000-4000-8000-000000000201';
const SUSPENDED = '99999999-0000-4000-8000-000000000202';
const DELETED = '99999999-0000-4000-8000-000000000203';

const ACTIVE_EMAIL = 'active.person@example.com';
const SUSPENDED_EMAIL = 'suspended.person@example.com';
const DELETED_EMAIL = 'deleted.person@example.com';

const PASSWORD = 'CredentialRepo#2026';

/** Obviously synthetic stored hash for rows whose hash value is irrelevant. */
const PLACEHOLDER_HASH = 'pbkdf2-sha256$1$x$y';

async function credentialDatabase(): Promise<{
  database: TestDatabase;
  realHash: string;
}> {
  const database = await createMigratedDatabase();
  // A genuine PBKDF2 hash for the active row: the repository must return
  // material that actually verifies, not merely a non-empty string.
  const realHash = await webCryptoPasswordHasher.hash(PASSWORD);

  database.exec(`
    insert into users (id, name, email, password_hash, status, deleted_at) values
      ('${ACTIVE}', 'Active Person', '${ACTIVE_EMAIL}', '${realHash}', 'active', null),
      ('${SUSPENDED}', 'Suspended Person', '${SUSPENDED_EMAIL}', '${PLACEHOLDER_HASH}', 'suspended', null),
      ('${DELETED}', 'Deleted Person', '${DELETED_EMAIL}', '${PLACEHOLDER_HASH}', 'active', '2026-01-01T00:00:00Z');
  `);

  return { database, realHash };
}

describe('user credential repository — findByEmail', () => {
  let database: TestDatabase;
  let credentials: UserCredentialRepository;
  let realHash: string;

  beforeEach(async () => {
    const created = await credentialDatabase();
    database = created.database;
    realHash = created.realHash;
    credentials = createUserCredentialRepository(database.db);
  });

  it('returns exactly the three contract fields for an existing account', async () => {
    const credential = await credentials.findByEmail(ACTIVE_EMAIL);

    expect(credential).not.toBeNull();
    expect(credential?.userId).toBe(ACTIVE);
    expect(credential?.status).toBe('active');
    expect(credential?.passwordHash).toBe(realHash);

    // The contract publishes three fields and no more: a wider shape would
    // tempt a caller to use this as a general user lookup.
    expect(Object.keys(credential ?? {}).sort()).toEqual(['passwordHash', 'status', 'userId']);
  });

  it('returns a hash that actually verifies the stored password', async () => {
    const credential = await credentials.findByEmail(ACTIVE_EMAIL);

    // Proves the column round-trips intact — a truncated or re-encoded hash
    // would still be a non-empty string but would fail every login.
    await expect(
      webCryptoPasswordHasher.verify(PASSWORD, credential?.passwordHash ?? ''),
    ).resolves.toBe(true);
  });

  it('returns the credential of a non-active account without judging it', async () => {
    const credential = await credentials.findByEmail(SUSPENDED_EMAIL);

    // The status rule belongs to the domain (`canAuthenticate`), not to SQL:
    // filtering suspended rows here would make the login use case unable to
    // distinguish "suspended" from "unknown" and would move a business rule
    // into the infrastructure layer (doc 08 §11).
    expect(credential?.status).toBe('suspended');
    expect(credential?.userId).toBe(SUSPENDED);
  });

  it('excludes a soft-deleted account (doc 06 §38)', async () => {
    const credential = await credentials.findByEmail(DELETED_EMAIL);

    // A soft-deleted account must be indistinguishable from a non-existent one.
    expect(credential).toBeNull();
  });

  it('returns null for an unknown email', async () => {
    const credential = await credentials.findByEmail('nobody.here@example.com');

    expect(credential).toBeNull();
  });

  it('normalizes a mixed-case or padded email before querying', async () => {
    // `users.email` is stored lowercase under a CHECK constraint, so a
    // non-normalized parameter would match nothing and present a valid account
    // as "unknown user".
    const upper = await credentials.findByEmail('ACTIVE.PERSON@EXAMPLE.COM');
    const padded = await credentials.findByEmail('  Active.Person@Example.com  ');

    expect(upper?.userId).toBe(ACTIVE);
    expect(padded?.userId).toBe(ACTIVE);
  });

  it('returns a frozen record so the hash cannot be mutated in place', async () => {
    const credential = await credentials.findByEmail(ACTIVE_EMAIL);

    expect(Object.isFrozen(credential)).toBe(true);
  });

  it('treats an email as a bound parameter, not interpolated SQL', async () => {
    const injected = await credentials.findByEmail("' or 1=1 --");

    // A concatenated query would return the first user row here.
    expect(injected).toBeNull();
  });
});

describe('credential read boundary (Gate 10)', () => {
  it('is the only repository that exposes a password hash', async () => {
    const { database } = await credentialDatabase();

    const users = createUserRepository(database.db);
    const user = await users.findById(ACTIVE);

    // The general user read must not carry credential material — that is the
    // Phase 1 boundary T2.03 must preserve rather than widen.
    expect(user).not.toBeNull();
    expect(Object.keys(user ?? {})).not.toContain('passwordHash');
    expect(JSON.stringify(user)).not.toContain('pbkdf2-sha256');
  });

  it('confirms only one source module selects users.password_hash', async () => {
    const { readdir, readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');

    /** Recursively collect the API source files. */
    async function collect(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true });
      const found: string[] = [];
      for (const entry of entries) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          found.push(...(await collect(path)));
        } else if (entry.name.endsWith('.ts')) {
          found.push(path);
        }
      }
      return found;
    }

    const sources = await collect('apps/api/src');
    const selectors: string[] = [];

    for (const file of sources) {
      const text = await readFile(file, 'utf8');
      // Match an actual SQL selection of the column, not a comment mentioning it.
      if (/select[^;]*\bpassword_hash\b/is.test(text)) {
        selectors.push(file);
      }
    }

    // The security boundary stated in the repository's own header, asserted as
    // a test so a future feature cannot quietly add a second credential read.
    expect(selectors).toEqual([
      'apps/api/src/infrastructure/database/user-credential-repository.ts',
    ]);
  });
});
