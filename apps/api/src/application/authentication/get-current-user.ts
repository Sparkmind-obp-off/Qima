import { canAuthenticate, evaluateSession, toUtcTimestamp } from '@qima/domain';
import type {
  SessionInvalidReason,
  SessionRepository,
  SessionTokenService,
  User,
  UserRepository,
} from '@qima/domain';

/**
 * Phase 2 task T2.05 — resolve the user represented by an active bearer session.
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.05 User context.
 * - doc 06 §23 AUTH API: `GET /api/v1/auth/me` returns the authenticated user.
 * - doc 08 §20 Authorization Contract: authentication precedes role, permission
 *   and scope resolution; those remain T2.06-T2.08.
 * - doc 09 §14 Authentication Testing: expired tokens and protected endpoints.
 *
 * The raw token reaches only `SessionTokenService.hash`. A session alone is not
 * sufficient: the linked user must still exist and remain active. This prevents
 * a session issued before account suspension or soft deletion from continuing
 * to authenticate requests.
 */

export interface GetCurrentUserQuery {
  readonly token: string;
}

export interface GetCurrentUserDependencies {
  readonly sessions: SessionRepository;
  readonly sessionTokens: SessionTokenService;
  readonly users: UserRepository;
  readonly now?: () => Date;
}

export type GetCurrentUserFailureReason = SessionInvalidReason | 'USER_NOT_AUTHENTICATABLE';

export type GetCurrentUserResult =
  | { readonly ok: true; readonly user: User }
  | { readonly ok: false; readonly reason: GetCurrentUserFailureReason };

export async function getCurrentUser(
  query: GetCurrentUserQuery,
  dependencies: GetCurrentUserDependencies,
): Promise<GetCurrentUserResult> {
  const tokenHash = await dependencies.sessionTokens.hash(query.token);
  const session = await dependencies.sessions.findByTokenHash(tokenHash);
  const now = (dependencies.now ?? (() => new Date()))();
  const check = evaluateSession(session, now);

  if (!check.ok) {
    return Object.freeze({ ok: false as const, reason: check.reason });
  }

  const user = await dependencies.users.findById(check.session.userId);
  if (user === null || !canAuthenticate(user.status)) {
    return Object.freeze({
      ok: false as const,
      reason: 'USER_NOT_AUTHENTICATABLE' as const,
    });
  }

  await dependencies.sessions.touch(check.session.id, toUtcTimestamp(now));

  return Object.freeze({ ok: true as const, user });
}
