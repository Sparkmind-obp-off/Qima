import { describe, expect, it } from 'vitest';
import {
  ScopeViolationError,
  assertPermission,
  assertSameOrganization,
  assertUnitReadable,
  type RequestContext,
  type UnitScope,
} from '@qima/domain';

/**
 * Unit tests — QIMA scope/isolation invariants.
 *
 * Traceability: doc 05 §13 Request Context, doc 08 §20-§21,
 * .codex/IMPLEMENTATION_RULES.md §10 Multi-Tenancy / Isolation Rule,
 * Quality Gate 7 (Authorization and Isolation).
 */

const unitInOrgA: UnitScope = { id: 'unit-1', organizationId: 'org-a' };
const unitInOrgB: UnitScope = { id: 'unit-9', organizationId: 'org-b' };

function context(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    userId: 'user-1',
    organizationId: 'org-a',
    unitId: 'unit-1',
    siteId: null,
    roles: ['unit_admin'],
    permissions: ['unit.read'],
    ...overrides,
  };
}

describe('assertSameOrganization', () => {
  it('accepts a unit owned by the expected organization', () => {
    expect(() => assertSameOrganization('org-a', unitInOrgA)).not.toThrow();
  });

  it('rejects a unit from another organization', () => {
    expect(() => assertSameOrganization('org-a', unitInOrgB)).toThrow(ScopeViolationError);
  });

  it('treats an empty organization scope as a defect, not as unrestricted access', () => {
    expect(() => assertSameOrganization('', unitInOrgA)).toThrow(/Organization scope is required/);
  });
});

describe('assertUnitReadable', () => {
  it('allows a unit-scoped principal to read its own unit', () => {
    expect(() => assertUnitReadable(context(), unitInOrgA)).not.toThrow();
  });

  it('denies a unit-scoped principal reading a sibling unit', () => {
    const sibling: UnitScope = { id: 'unit-2', organizationId: 'org-a' };

    expect(() => assertUnitReadable(context(), sibling)).toThrow(/outside the caller unit scope/);
  });

  it('allows an organization-level principal to read units in its organization', () => {
    const orgPrincipal = context({ unitId: null, roles: ['org_admin'] });
    const sibling: UnitScope = { id: 'unit-2', organizationId: 'org-a' };

    expect(() => assertUnitReadable(orgPrincipal, sibling)).not.toThrow();
  });

  it('denies an organization-level principal crossing into another organization', () => {
    const orgPrincipal = context({ unitId: null, roles: ['org_admin'] });

    expect(() => assertUnitReadable(orgPrincipal, unitInOrgB)).toThrow(ScopeViolationError);
  });
});

describe('assertPermission', () => {
  it('accepts a granted permission', () => {
    expect(() => assertPermission(context(), 'unit.read')).not.toThrow();
  });

  it('rejects a permission that was not granted', () => {
    expect(() => assertPermission(context(), 'unit.delete')).toThrow(/unit.delete/);
  });

  it('rejects every permission when the permission list is empty', () => {
    expect(() => assertPermission(context({ permissions: [] }), 'unit.read')).toThrow(
      ScopeViolationError,
    );
  });
});
