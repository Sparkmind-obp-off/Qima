/**
 * QIMA authentication routes — Phase 2 task T2.03 (Login API).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.03 Login API.
 * - doc 06 §23 AUTH API: `POST /api/v1/auth/login`, request `{ email, password }`,
 *   response `{ data: { user, access_token, expires_at } }`.
 * - doc 06 §21 API Response Contract / §22 HTTP Status Contract.
 * - doc 06 §42 API Security Contract: no account-enumeration signal.
 * - doc 08 §12 Presentation Layer, §18 Controller Contract, §43 Domain Service
 *   Boundary: the controller performs transport work only and delegates the
 *   authentication decision to the use case.
 *
 * SCOPE — T2.03 only. `POST /auth/logout` is T2.04 and `GET /auth/me` needs the
 * user-context and permission resolution of T2.05-T2.08, so neither is
 * registered here. Declaring them now as stubs would let a client believe a
 * capability exists that does not (.codex/IMPLEMENTATION_RULES.md §3).
 *
 * SECURITY BOUNDARY — this endpoint is intentionally unauthenticated (it is how
 * authentication begins) but it is NOT unprotected: it never echoes a submitted
 * password, never reveals whether an email is registered, and never returns a
 * password hash. Nothing in this file logs the request body.
 */

import { Hono } from 'hono';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import { loginUser } from '../../application/authentication/login-user';
import type { LoginFailureReason } from '../../application/authentication/login-user';
import { createSessionRepository } from '../../infrastructure/database/session-repository';
import { createUserCredentialRepository } from '../../infrastructure/database/user-credential-repository';
import { createUserRepository } from '../../infrastructure/database/repositories';
import { webCryptoPasswordHasher } from '../../infrastructure/security/password-hasher';
import { webCryptoSessionTokenService } from '../../infrastructure/security/session-token-service';
import type { QimaDatabase } from '../../infrastructure/database/d1-client';
import type { QimaBindings } from '../../bindings';

export const authRoutes = new Hono<{ Bindings: QimaBindings }>();

/** Resolve the binding as the structural database contract used internally. */
function resolveDatabase(env: QimaBindings | undefined): QimaDatabase | null {
  const binding = env?.DB;
  return binding === undefined || binding === null ? null : (binding as unknown as QimaDatabase);
}

/**
 * Transport-level shape check (doc 08 §19: transport validates format, the
 * domain validates meaning).
 *
 * Returns the two fields as strings or `null` when the body is not the object
 * doc 06 §23 specifies. A non-string `password` is rejected here rather than
 * coerced: `String(someObject)` would be hashed as `"[object Object]"`, which is
 * a value an attacker can submit deliberately.
 */
function readCredentials(body: unknown): { email: string; password: string } | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }

  return { email, password };
}

/**
 * Public representation of a user (doc 06 §23 `data.user`).
 *
 * An explicit projection rather than passing the entity through: the `User`
 * contract has no credential field today, and this mapping means a future field
 * added to the entity cannot appear in an unauthenticated response by default.
 * Field names are snake_case to match the published API contract, while the
 * domain stays camelCase.
 */
function publicUser(user: {
  id: string;
  name: string;
  email: string;
  status: string;
}): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
  };
}

/**
 * Map a use-case failure onto the HTTP contract.
 *
 * `INVALID_CREDENTIALS` and `ACCOUNT_NOT_AUTHENTICATABLE` MUST produce byte
 * identical responses: distinguishing them would tell a caller that a given
 * email exists and merely has the wrong state, which is exactly the
 * enumeration oracle doc 06 §42 forbids. The distinction is preserved in the
 * use-case result for server-side use, and discarded here.
 */
function failureResponse(reason: LoginFailureReason): {
  code: 'VALIDATION_ERROR' | 'UNAUTHENTICATED';
  message: string;
} {
  if (reason === 'INVALID_REQUEST') {
    return {
      code: 'VALIDATION_ERROR',
      message: 'A valid email and password are required.',
    };
  }

  return { code: 'UNAUTHENTICATED', message: 'Invalid email or password.' };
}

/**
 * `POST /api/v1/auth/login` (doc 06 §23).
 *
 * 200 on success, 400 on a malformed request, 401 on any authentication
 * failure, 500 only when infrastructure is genuinely unavailable.
 */
authRoutes.post('/login', async (c) => {
  const db = resolveDatabase(c.env);

  if (db === null) {
    // An honest infrastructure failure. Reporting it as 401 would tell a user
    // their password is wrong when the database is simply not bound
    // (doc 08 §12 — no misleading responses).
    return c.json(
      failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }

  // A body that is not JSON is a transport error, so it is handled before the
  // use case is reached and never becomes a 500.
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      failure('VALIDATION_ERROR', 'Request body must be valid JSON.'),
      ERROR_STATUS.VALIDATION_ERROR,
    );
  }

  const submitted = readCredentials(body);

  if (submitted === null) {
    return c.json(
      failure('VALIDATION_ERROR', 'A valid email and password are required.'),
      ERROR_STATUS.VALIDATION_ERROR,
    );
  }

  try {
    const result = await loginUser(
      {
        email: submitted.email,
        password: submitted.password,
        // Provenance for session-security review (doc 09 §38). Client-supplied
        // and therefore recorded as evidence only — never trusted as identity.
        ipAddress: c.req.header('cf-connecting-ip') ?? null,
        userAgent: c.req.header('user-agent') ?? null,
      },
      {
        credentials: createUserCredentialRepository(db),
        users: createUserRepository(db),
        sessions: createSessionRepository(db),
        passwordHasher: webCryptoPasswordHasher,
        sessionTokens: webCryptoSessionTokenService,
      },
    );

    if (!result.ok) {
      const { code, message } = failureResponse(result.reason);
      return c.json(failure(code, message), ERROR_STATUS[code]);
    }

    return c.json(
      success({
        user: publicUser(result.value.user),
        // Published names come from doc 06 §23 and are part of the contract.
        access_token: result.value.token,
        expires_at: result.value.expiresAt,
      }),
    );
  } catch {
    // Infrastructure fault. The caught value is deliberately not inspected or
    // forwarded: it may reference the submitted credential, and doc 08 §12
    // forbids leaking internal detail outward.
    return c.json(
      failure('INTERNAL_ERROR', 'Authentication could not be completed.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
});
