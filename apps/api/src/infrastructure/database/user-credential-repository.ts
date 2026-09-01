/**
 * QIMA D1 user-credential repository — Phase 2 task T2.03 (Login API).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.03 Login API.
 * - doc 06 §44 Repository Contract, §49 Implementation Rule: the contract lives
 *   in the domain (`UserCredentialRepository`), the SQL lives here.
 * - doc 06 §42 API Security Contract: "Secure password handling".
 * - doc 06 §38 Soft Delete Policy: a soft-deleted account must not authenticate.
 * - doc 08 §11 Infrastructure Layer: the driver stays confined to this layer.
 *
 * SECURITY BOUNDARY — this is the ONLY module in QIMA that selects
 * `users.password_hash`.
 *
 * `createUserRepository` deliberately does not, and must not: it is the general
 * user read consumed by profile, listing and reporting code, and a credential
 * field on that path would eventually be serialized into a response. Keeping
 * the credential read in its own single-method adapter means every access to
 * stored credential material is grep-able to one file, one query, and one
 * caller (the login use case) — which is stronger than the Phase 1 boundary,
 * not weaker than it.
 *
 * Nothing here decides whether a login succeeds. The hash is returned as opaque
 * material; verification is `PasswordHasher.verify` and the status rule is
 * `canAuthenticate`, both of which live outside this file.
 */

import { normalizeEmail } from '@qima/domain';
import type { UserCredential, UserCredentialRepository, UserStatus } from '@qima/domain';
import { queryFirst, type QimaDatabase } from './d1-client';

interface UserCredentialRow {
  id: string;
  status: string;
  password_hash: string;
}

/**
 * D1 implementation of the domain `UserCredentialRepository` contract.
 *
 * The query filters `deleted_at is null` rather than returning the row and
 * leaving the check to the caller: a soft-deleted account is not an account
 * (doc 06 §38), and making its exclusion a property of the only credential
 * query in the system means no future caller can forget it.
 *
 * `email` is normalized here as well as in the use case. That is not redundant
 * defence for its own sake — `users.email` is stored lowercase under a CHECK
 * constraint (migration 0002), so a non-normalized parameter would silently
 * match nothing and present a valid account as "unknown user".
 */
export function createUserCredentialRepository(db: QimaDatabase): UserCredentialRepository {
  return {
    async findByEmail(email: string): Promise<UserCredential | null> {
      const row = await queryFirst<UserCredentialRow>(
        db,
        `select id, status, password_hash
           from users
          where email = ?
            and deleted_at is null`,
        [normalizeEmail(email)],
      );

      if (row === null) {
        return null;
      }

      // Frozen so the hash cannot be mutated in place by a downstream caller
      // and re-persisted, and so the object shape stays exactly the three
      // fields the contract publishes.
      return Object.freeze({
        userId: row.id,
        status: row.status as UserStatus,
        passwordHash: row.password_hash,
      });
    },
  };
}
