import { evaluateSession, toUtcTimestamp } from '@qima/domain';
import type { SessionRepository, SessionTokenService } from '@qima/domain';

/**
 * Phase 2 task T2.04 — invalidate the active session represented by a bearer token.
 *
 * Traceability:
 * - doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS, task T2.04 Logout.
 * - doc 06 §23 AUTH API: `POST /api/v1/auth/logout` invalidates the active token.
 * - doc 08 §10 Application Layer: authentication decisions stay outside HTTP handlers.
 * - doc 09 §14 Authentication Testing: logout must be covered as an auth boundary.
 *
 * The raw bearer token reaches only `SessionTokenService.hash`; repositories receive
 * the digest exclusively. Revoked, expired and unknown sessions intentionally collapse
 * into one result so the caller cannot use logout as a session-state oracle.
 */

export interface LogoutCommand {
  readonly token: string;
}

export interface LogoutDependencies {
  readonly sessions: SessionRepository;
  readonly sessionTokens: SessionTokenService;
  readonly now?: () => Date;
}

export type LogoutResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'INVALID_SESSION' };

export async function logoutUser(
  command: LogoutCommand,
  dependencies: LogoutDependencies,
): Promise<LogoutResult> {
  const tokenHash = await dependencies.sessionTokens.hash(command.token);
  const session = await dependencies.sessions.findByTokenHash(tokenHash);
  const now = (dependencies.now ?? (() => new Date()))();
  const check = evaluateSession(session, now);

  if (!check.ok) {
    return Object.freeze({ ok: false as const, reason: 'INVALID_SESSION' as const });
  }

  await dependencies.sessions.revoke(check.session.id, toUtcTimestamp(now));

  return Object.freeze({ ok: true as const });
}
