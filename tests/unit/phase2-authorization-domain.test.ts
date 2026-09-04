import { describe, expect, it } from 'vitest';
import {
  hasExplicitScopeAccess,
  hasRequiredPermission,
  hasRequiredRole,
  resolveEffectiveRoles,
} from '@qima/domain';
import type { ScopedRoleAssignment } from '@qima/domain';

const assignments: readonly ScopedRoleAssignment[] = [
  {
    roleKey: 'VIEWER',
    scopeLevel: 'unit',
    organizationId: 'org-a',
    unitId: 'unit-a',
  },
  {
    roleKey: 'ORG_ADMIN',
    scopeLevel: 'organization',
    organizationId: 'org-a',
    unitId: null,
  },
  {
    roleKey: 'UNIT_ADMIN',
    scopeLevel: 'unit',
    organizationId: 'org-a',
    unitId: 'unit-a',
  },
];

describe('Phase 2 authorization domain', () => {
  it('resolves effective roles deterministically and without duplicates', () => {
    const forward = resolveEffectiveRoles(assignments, {
      organizationId: 'org-a',
      unitId: 'unit-a',
    });
    const reversed = resolveEffectiveRoles([...assignments].reverse(), {
      organizationId: 'org-a',
      unitId: 'unit-a',
    });

    expect(forward).toEqual(['ORG_ADMIN', 'UNIT_ADMIN', 'VIEWER']);
    expect(reversed).toEqual(forward);
  });

  it('does not infer access from a supplied organization or unit id', () => {
    expect(
      hasExplicitScopeAccess(assignments, { organizationId: 'org-b', unitId: 'unit-a' }),
    ).toBe(false);
    expect(
      hasExplicitScopeAccess(assignments, { organizationId: 'org-a', unitId: 'unit-b' }),
    ).toBe(true); // the explicit organization role applies to units inside org-a
    expect(
      hasExplicitScopeAccess(
        assignments.filter((assignment) => assignment.scopeLevel === 'unit'),
        { organizationId: 'org-a', unitId: 'unit-b' },
      ),
    ).toBe(false);
  });

  it('enforces role and permission requirements independently', () => {
    const context = {
      roles: ['UNIT_ADMIN'] as const,
      permissions: ['units.read'] as const,
    };

    expect(hasRequiredRole(context, ['UNIT_ADMIN'])).toBe(true);
    expect(hasRequiredRole(context, ['ORG_ADMIN'])).toBe(false);
    expect(hasRequiredPermission(context, 'units.read')).toBe(true);
    expect(hasRequiredPermission(context, 'units.update')).toBe(false);
  });
});
