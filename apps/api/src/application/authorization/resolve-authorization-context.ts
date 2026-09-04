import {
  hasExplicitScopeAccess,
  normalizePermissionKeys,
  resolveEffectiveRoles,
} from '@qima/domain';
import type {
  AccessAssignmentRepository,
  AuthorizationContext,
  AuthorizationScope,
} from '@qima/domain';

export interface ResolveAuthorizationContextDependencies {
  readonly accessAssignments: AccessAssignmentRepository;
}

export type ResolveAuthorizationContextResult =
  | { readonly ok: true; readonly context: AuthorizationContext }
  | { readonly ok: false; readonly reason: 'SCOPE_DENIED' };

/** Resolve roles, permissions and scope exclusively from persisted assignments. */
export async function resolveAuthorizationContext(
  userId: string,
  scope: AuthorizationScope,
  dependencies: ResolveAuthorizationContextDependencies,
): Promise<ResolveAuthorizationContextResult> {
  const assignments = await dependencies.accessAssignments.listAssignments(userId);

  if (!hasExplicitScopeAccess(assignments, scope)) {
    return Object.freeze({ ok: false as const, reason: 'SCOPE_DENIED' as const });
  }

  const roles = resolveEffectiveRoles(assignments, scope);
  const permissions = normalizePermissionKeys(
    await dependencies.accessAssignments.resolvePermissionKeys(
      userId,
      scope.organizationId,
      scope.unitId,
    ),
  );

  return Object.freeze({
    ok: true as const,
    context: Object.freeze({
      userId,
      organizationId: scope.organizationId,
      unitId: scope.unitId,
      roles,
      permissions,
    }),
  });
}

/** Resolve the complete server-owned access summary returned by `/auth/me`. */
export async function resolveAccessSummary(
  userId: string,
  dependencies: ResolveAuthorizationContextDependencies,
): Promise<{
  readonly organizations: readonly { id: string; roles: readonly string[] }[];
  readonly units: readonly { id: string; organization_id: string; roles: readonly string[] }[];
  readonly platform_roles: readonly string[];
  readonly permissions: readonly string[];
}> {
  const assignments = await dependencies.accessAssignments.listAssignments(userId);
  const platformRoles = resolveEffectiveRoles(assignments, {
    organizationId: null,
    unitId: null,
  });

  const organizationIds = [
    ...new Set(
      assignments
        .map((assignment) => assignment.organizationId)
        .filter((id): id is string => id !== null),
    ),
  ].sort();
  const unitScopes = [
    ...new Map(
      assignments
        .filter(
          (assignment) => assignment.organizationId !== null && assignment.unitId !== null,
        )
        .map((assignment) => [
          `${assignment.organizationId}:${assignment.unitId}`,
          { organizationId: assignment.organizationId as string, unitId: assignment.unitId as string },
        ]),
    ).values(),
  ].sort((left, right) => left.unitId.localeCompare(right.unitId));

  const organizations = organizationIds.map((organizationId) => ({
    id: organizationId,
    roles: resolveEffectiveRoles(assignments, { organizationId, unitId: null }),
  }));
  const units = unitScopes.map(({ organizationId, unitId }) => ({
    id: unitId,
    organization_id: organizationId,
    roles: resolveEffectiveRoles(assignments, { organizationId, unitId }),
  }));

  const permissionSets = await Promise.all([
    dependencies.accessAssignments.resolvePermissionKeys(userId, null, null),
    ...organizationIds.map((organizationId) =>
      dependencies.accessAssignments.resolvePermissionKeys(userId, organizationId, null),
    ),
    ...unitScopes.map(({ organizationId, unitId }) =>
      dependencies.accessAssignments.resolvePermissionKeys(userId, organizationId, unitId),
    ),
  ]);

  return Object.freeze({
    platform_roles: platformRoles,
    organizations: Object.freeze(organizations),
    units: Object.freeze(units),
    permissions: normalizePermissionKeys(permissionSets.flat()),
  });
}
