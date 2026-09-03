/**
 * QIMA authentication routes — Phase 2 tasks T2.03 (Login API) and T2.04 (Logout).
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, tasks T2.03 Login API and
 *   T2.04 Logout.
 * - doc 06 §23 AUTH API: login issues a token and `POST /api/v1/auth/logout`
 *   invalidates the active authentication session represented by that token.
 * - doc 06 §21 API Response Contract / §22 HTTP Status Contract.
 * - doc 06 §42 API Security Contract: no account-enumeration signal.
 * - doc 08 §12 Presentation Layer, §18 Controller Contract, §43 Domain Service
 *   Boundary: the controller performs transport work only and delegates the
 *   authentication decision to the use case.
 *
 * SCOPE — T2.03 and T2.04 only. `GET /auth/me` needs the user-context and
 * permission resolution of T2.05-T2.08, so it is not registered here. Declaring
 * it now as a stub would let a client believe a capability exists that does not
 * (.codex/IMPLEMENTATION_RULES.md §3).
 *
 * SECURITY BOUNDARY — login is intentionally unauthenticated (it is how
 * authentication begins), while logout requires an active bearer session.
 * Neither route logs credentials or tokens, and no raw token reaches a repository.
 */

import { Hono } from 'hono';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import { loginUser } from '../../application/authentication/login-user';
import type { LoginFailureReason } from '../../application/authentication/login-user';
import { logoutUser } from '../../application/authentication/logout-user';
import { createSessionRepository } from '../../infrastructure/database/session-repository';
import { createUserCredentialRepository } from '../../infrastructure/database/user-credential-repository';
import { createUserRepository } from '../../infrastructure/database/repositories';
import { webCryptoPasswordHasher } from '../../infrastructure/security/password-hasher';
import {
  isWellFormedSessionToken,
  webCryptoSessionTokenService,
} from '../../infrastructure/security/session-token-service';
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
 * Read one RFC 6750-style bearer credential without accepting ambiguous input.
 *
 * Shape validation is intentionally transport-level; authenticity remains an
 * application/domain decision.
 */
function readBearerToken(authorization: string | undefined): string | null {
  if (authorization === undefined) {
    return null;
  }

  const match = /^Bearer ([^\s,]+)$/i.exec(authorization);
  const token = match?.[1];

  return token !== undefined && isWellFormedSessionToken(token) ? token : null;
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

/**
 * `POST /api/v1/auth/logout` (doc 06 §23, T2.04).
 *
 * 200 after revoking the active session, 401 for every missing, malformed,
 * unknown, expired or already-revoked credential, and 500 only for an actual
 * infrastructure failure. Invalid-session responses are deliberately identical.
 */
authRoutes.post('/logout', async (c) => {
  const token = readBearerToken(c.req.header('authorization'));

  if (token === null) {
    return c.json(
      failure('UNAUTHENTICATED', 'A valid bearer token is required.'),
      ERROR_STATUS.UNAUTHENTICATED,
    );
  }

  const db = resolveDatabase(c.env);
  if (db === null) {
    return c.json(
      failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }

  try {
    const result = await logoutUser(
      { token },
      {
        sessions: createSessionRepository(db),
        sessionTokens: webCryptoSessionTokenService,
      },
    );

    if (!result.ok) {
      return c.json(
        failure('UNAUTHENTICATED', 'A valid bearer token is required.'),
        ERROR_STATUS.UNAUTHENTICATED,
      );
    }

    return c.json(success({ logged_out: true }));
  } catch {
    return c.json(
      failure('INTERNAL_ERROR', 'Logout could not be completed.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
});
