import type { RoleKey, ScopeLevel, User } from './identity';

/** One explicit server-owned role assignment. */
export interface ScopedRoleAssignment {
  readonly roleKey: RoleKey;
  readonly scopeLevel: ScopeLevel;
  readonly organizationId: string | null;
  readonly unitId: string | null;
}

export interface AuthorizationScope {
  readonly organizationId: string | null;
  readonly unitId: string | null;
}

export interface AuthorizationContext extends AuthorizationScope {
  readonly userId: string;
  readonly roles: readonly RoleKey[];
  readonly permissions: readonly string[];
}

export interface AuthenticatedPrincipal {
  readonly user: User;
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort()) as readonly T[];
}

/**
 * Resolve effective roles for a requested Platform -> Organization -> Unit scope.
 * Invalidly shaped assignments are ignored defensively; persisted scope metadata
 * must agree with the assignment table that produced it.
 */
export function resolveEffectiveRoles(
  assignments: readonly ScopedRoleAssignment[],
  scope: AuthorizationScope,
): readonly RoleKey[] {
  const roles = assignments
    .filter((assignment) => {
      if (assignment.scopeLevel === 'platform') {
        return assignment.organizationId === null && assignment.unitId === null;
      }
      if (assignment.scopeLevel === 'organization') {
        return (
          scope.organizationId !== null &&
          assignment.organizationId === scope.organizationId &&
          assignment.unitId === null
        );
      }
      return (
        scope.organizationId !== null &&
        scope.unitId !== null &&
        assignment.organizationId === scope.organizationId &&
        assignment.unitId === scope.unitId
      );
    })
    .map((assignment) => assignment.roleKey);

  return uniqueSorted(roles);
}

/** A scope is valid only when at least one explicit assignment resolves into it. */
export function hasExplicitScopeAccess(
  assignments: readonly ScopedRoleAssignment[],
  scope: AuthorizationScope,
): boolean {
  return resolveEffectiveRoles(assignments, scope).length > 0;
}

export function hasRequiredRole(
  context: Pick<AuthorizationContext, 'roles'>,
  requiredRoles: readonly RoleKey[],
): boolean {
  return requiredRoles.length === 0 || requiredRoles.some((role) => context.roles.includes(role));
}

export function hasRequiredPermission(
  context: Pick<AuthorizationContext, 'permissions'>,
  permission: string | undefined,
): boolean {
  return permission === undefined || context.permissions.includes(permission);
}

export function normalizePermissionKeys(keys: readonly string[]): readonly string[] {
  return uniqueSorted(keys);
}
