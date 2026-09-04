import type { MiddlewareHandler } from 'hono';
import { ERROR_STATUS, failure } from '@qima/shared';
import { hasRequiredPermission, hasRequiredRole } from '@qima/domain';
import type { AuthenticatedPrincipal, AuthorizationContext, RoleKey } from '@qima/domain';
import { getCurrentUser } from '../../application/authentication/get-current-user';
import { resolveAuthorizationContext } from '../../application/authorization/resolve-authorization-context';
import {
  createAccessAssignmentRepository,
  createUnitRepository,
  createUserRepository,
} from '../../infrastructure/database/repositories';
import { createSessionRepository } from '../../infrastructure/database/session-repository';
import { webCryptoSessionTokenService } from '../../infrastructure/security/session-token-service';
import type { QimaDatabase } from '../../infrastructure/database/d1-client';
import type { QimaBindings } from '../../bindings';
import { readBearerToken } from './bearer-token';

export interface AuthorizationVariables {
  principal: AuthenticatedPrincipal;
  authorization: AuthorizationContext;
}

type AuthorizationEnvironment = {
  Bindings: QimaBindings;
  Variables: AuthorizationVariables;
};

export interface AuthorizationPolicy {
  readonly organizationParam?: string;
  readonly organizationQuery?: string;
  readonly unitParam?: string;
  readonly unitQuery?: string;
  readonly roles?: readonly RoleKey[];
  readonly permission?: string;
}

function databaseOf(env: QimaBindings | undefined): QimaDatabase | null {
  const binding = env?.DB;
  return binding === undefined || binding === null ? null : (binding as unknown as QimaDatabase);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Authenticate once and attach an immutable principal to Hono request context. */
export const requireAuthentication: MiddlewareHandler<AuthorizationEnvironment> = async (c, next) => {
  const token = readBearerToken(c.req.header('authorization'));
  if (token === null) {
    return c.json(
      failure('UNAUTHENTICATED', 'A valid bearer token is required.'),
      ERROR_STATUS.UNAUTHENTICATED,
    );
  }

  const db = databaseOf(c.env);
  if (db === null) {
    return c.json(
      failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }

  try {
    const result = await getCurrentUser(
      { token },
      {
        sessions: createSessionRepository(db),
        sessionTokens: webCryptoSessionTokenService,
        users: createUserRepository(db),
      },
    );

    if (!result.ok) {
      return c.json(
        failure('UNAUTHENTICATED', 'A valid bearer token is required.'),
        ERROR_STATUS.UNAUTHENTICATED,
      );
    }

    c.set('principal', Object.freeze({ user: result.user }));
    await next();
  } catch {
    return c.json(
      failure('INTERNAL_ERROR', 'Authentication could not be completed.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
};

/** Resolve server-owned scope, role and permission state, then enforce a policy. */
export function requireAuthorization(
  policy: AuthorizationPolicy,
): MiddlewareHandler<AuthorizationEnvironment> {
  return async (c, next) => {
    const organizationId = policy.organizationParam
      ? (c.req.param(policy.organizationParam) ?? null)
      : policy.organizationQuery
        ? (c.req.query(policy.organizationQuery) ?? null)
        : null;
    const unitId = policy.unitParam
      ? (c.req.param(policy.unitParam) ?? null)
      : policy.unitQuery
        ? (c.req.query(policy.unitQuery) ?? null)
        : null;

    if (
      ((policy.organizationParam || policy.organizationQuery) &&
        (organizationId === null || !UUID_PATTERN.test(organizationId))) ||
      ((policy.unitParam || policy.unitQuery) &&
        (unitId === null || !UUID_PATTERN.test(unitId)))
    ) {
      return c.json(
        failure('VALIDATION_ERROR', 'A valid authorization scope is required.'),
        ERROR_STATUS.VALIDATION_ERROR,
      );
    }
    if (unitId !== null && organizationId === null) {
      return c.json(
        failure('VALIDATION_ERROR', 'Unit scope requires an organization scope.'),
        ERROR_STATUS.VALIDATION_ERROR,
      );
    }

    const db = databaseOf(c.env);
    if (db === null) {
      return c.json(
        failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
        ERROR_STATUS.INTERNAL_ERROR,
      );
    }

    try {
      if (organizationId !== null && unitId !== null) {
        const unit = await createUnitRepository(db).findById(organizationId, unitId);
        if (unit === null || unit.status !== 'active') {
          return c.json(
            failure('SCOPE_VIOLATION', 'The requested scope is not available.'),
            ERROR_STATUS.SCOPE_VIOLATION,
          );
        }
      }

      const principal = c.get('principal');
      const resolved = await resolveAuthorizationContext(
        principal.user.id,
        { organizationId, unitId },
        { accessAssignments: createAccessAssignmentRepository(db) },
      );

      if (!resolved.ok) {
        return c.json(
          failure('SCOPE_VIOLATION', 'The requested scope is not available.'),
          ERROR_STATUS.SCOPE_VIOLATION,
        );
      }
      if (!hasRequiredRole(resolved.context, policy.roles ?? [])) {
        return c.json(
          failure('FORBIDDEN', 'The required role is not assigned.'),
          ERROR_STATUS.FORBIDDEN,
        );
      }
      if (!hasRequiredPermission(resolved.context, policy.permission)) {
        return c.json(
          failure('FORBIDDEN', 'The required permission is not granted.'),
          ERROR_STATUS.FORBIDDEN,
        );
      }

      c.set('authorization', resolved.context);
      await next();
    } catch {
      return c.json(
        failure('INTERNAL_ERROR', 'Authorization could not be completed.'),
        ERROR_STATUS.INTERNAL_ERROR,
      );
    }
  };
}
