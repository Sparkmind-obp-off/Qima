/**
 * QIMA domain core.
 *
 * Traceability:
 * - doc 05 §10 Domain Layer: the domain must not depend on HTTP, React, a
 *   database driver, Cloudflare, or a storage provider. This module has no
 *   infrastructure imports for exactly that reason.
 * - doc 05 §13 Request Context / doc 08 §21 Scope Context.
 * - doc 08 §20 Authorization Contract: authorization is resolved server-side.
 * - .codex/IMPLEMENTATION_RULES.md §10 Multi-Tenancy / Isolation Rule:
 *   missing scope is a security defect, never a permissive default.
 *
 * Contents:
 * - Phase 0: scope/isolation primitives (this file).
 * - Phase 1: identity/organization entities, invariants, schema contract and
 *   repository contracts (re-exported below).
 * - Phase 2: authentication credential policy and hashing contract; session
 *   entity, validity rules, token contract and repository contract.
 *
 * Phase boundary: operational business entities (Program, Activity,
 * Participant, Registration, Attendance, Content) belong to Phase 4+ and are
 * intentionally NOT defined here.
 */

// Phase 1 — Database Foundation (doc 10 §24).
export * from './identity';
export * from './organization';
export * from './program';
export * from './activity';
export * from './repositories';
export * from './schema';

// Phase 2 — Authentication & Access (doc 10 §24).
export * from './authentication';
export * from './authorization';
export * from './session';

/** Server-resolved authorization scope carried by every authenticated request. */
export interface RequestContext {
  readonly userId: string;
  readonly organizationId: string;
  /** Unit scope. `null` means an organization-level principal, never "all units". */
  readonly unitId: string | null;
  readonly siteId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

/** Minimal unit shape needed to evaluate organization ownership in Phase 0. */
export interface UnitScope {
  readonly id: string;
  readonly organizationId: string;
}

export class ScopeViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScopeViolationError';
  }
}

/**
 * Reject a unit that does not belong to the expected organization.
 *
 * Enforces the QIMA isolation invariant: cross-organization access is denied
 * unless the domain contract explicitly authorizes it.
 */
export function assertSameOrganization(expectedOrganizationId: string, unit: UnitScope): void {
  if (!expectedOrganizationId) {
    throw new ScopeViolationError('Organization scope is required and must not be empty.');
  }
  if (unit.organizationId !== expectedOrganizationId) {
    throw new ScopeViolationError('Unit does not belong to the expected organization scope.');
  }
}

/**
 * Reject a request context that cannot read the requested unit.
 *
 * An organization-level principal (`unitId === null`) may read units inside its
 * own organization. A unit-scoped principal may only read its own unit.
 */
export function assertUnitReadable(context: RequestContext, unit: UnitScope): void {
  assertSameOrganization(context.organizationId, unit);

  if (context.unitId !== null && context.unitId !== unit.id) {
    throw new ScopeViolationError('Unit is outside the caller unit scope.');
  }
}

/**
 * Require an explicit permission on the request context.
 *
 * UI visibility is never an authorization boundary (doc 08 §20).
 */
export function assertPermission(context: RequestContext, permission: string): void {
  if (!context.permissions.includes(permission)) {
    throw new ScopeViolationError(`Missing required permission: ${permission}`);
  }
}
