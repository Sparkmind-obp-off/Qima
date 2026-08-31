/**
 * QIMA identity & organization domain — Phase 1 (Database Foundation).
 *
 * Traceability:
 * - doc 10 §24 PHASE 1 tasks T1.04 (Organization), T1.05 (Unit),
 *   T1.06 (User), T1.07 (Role), T1.08 (Permission), T1.09 (Scope
 *   relationships), T1.10 (Audit).
 * - doc 06 §3 Domain Entities, §4-§8, §15, §37 Domain Invariants,
 *   §39 ID Policy, §40 Timestamp Policy.
 * - doc 06 §49 Implementation Rule: Domain Entity -> Migration -> Repository.
 *   The entity contract is therefore defined here, before persistence.
 * - doc 05 §10 Domain Layer / doc 08 §9: no HTTP, database driver, or hosting
 *   provider is imported by this module.
 *
 * Phase boundary: Program / Activity / Participant / Registration /
 * Attendance / Content entities belong to Phase 4+ and are NOT defined here.
 */

// ---------------------------------------------------------------------------
// Shared value contracts
// ---------------------------------------------------------------------------

/** Lifecycle status shared by organization, unit and site (doc 06 §4-§6). */
export const ENTITY_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

/** doc 06 §3.1: user lifecycle begins at `invited`, not `active`. */
export const USER_STATUSES = ['invited', 'active', 'inactive', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const UNIT_TYPES = ['general', 'school', 'boarding', 'community', 'branch'] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const DOMAIN_MAPPING_TYPES = ['custom', 'subdomain', 'platform'] as const;
export type DomainMappingType = (typeof DOMAIN_MAPPING_TYPES)[number];

export const DOMAIN_MAPPING_STATUSES = ['pending', 'active', 'disabled'] as const;
export type DomainMappingStatus = (typeof DOMAIN_MAPPING_STATUSES)[number];

/** doc 06 §8: Platform -> Organization -> Unit. */
export const SCOPE_LEVELS = ['platform', 'organization', 'unit'] as const;
export type ScopeLevel = (typeof SCOPE_LEVELS)[number];

/** doc 06 §3.2 role catalogue. */
export const ROLE_KEYS = [
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'UNIT_ADMIN',
  'STAFF',
  'TEACHER',
  'EDITOR',
  'VIEWER',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** doc 06 §15 audit action vocabulary. */
export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'PUBLISH',
  'APPROVE',
  'REJECT',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Every Phase 1 record carries UTC timestamps (doc 06 §40). */
export interface Timestamps {
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** doc 06 §38 Soft Delete Policy. */
export interface SoftDeletable {
  readonly deletedAt: string | null;
}

// ---------------------------------------------------------------------------
// Entities (doc 06 §4-§8, §15, §16)
// ---------------------------------------------------------------------------

export interface Organization extends Timestamps, SoftDeletable {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: EntityStatus;
  readonly description: string | null;
}

export interface Unit extends Timestamps, SoftDeletable {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly type: UnitType;
  readonly status: EntityStatus;
  readonly description: string | null;
}

export interface Site extends Timestamps, SoftDeletable {
  readonly id: string;
  readonly unitId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: EntityStatus;
  readonly brandingConfig: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, unknown>>;
}

export interface DomainMapping extends Timestamps {
  readonly id: string;
  readonly siteId: string;
  readonly domain: string;
  readonly type: DomainMappingType;
  readonly status: DomainMappingStatus;
  readonly isPrimary: boolean;
}

/**
 * User (doc 06 §3.1).
 *
 * `passwordHash` is deliberately NOT part of this contract: the domain never
 * needs the credential material, and excluding it makes accidental exposure
 * through a domain object impossible (Quality Gate 10).
 */
export interface User extends Timestamps, SoftDeletable {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly status: UserStatus;
}

export interface Role extends Timestamps {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly scopeLevel: ScopeLevel;
  readonly isSystem: boolean;
}

export interface Permission {
  readonly id: string;
  readonly key: string;
  readonly resource: string;
  readonly action: string;
  readonly description: string | null;
  readonly createdAt: string;
}

export interface UserOrganizationRole {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly roleId: string;
  readonly createdAt: string;
}

export interface UserUnitRole {
  readonly id: string;
  readonly userId: string;
  readonly unitId: string;
  readonly roleId: string;
  readonly createdAt: string;
}

export interface AuditEvent {
  readonly id: string;
  readonly organizationId: string | null;
  readonly unitId: string | null;
  readonly userId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly metadata: Readonly<Record<string, unknown>> | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
}

// ---------------------------------------------------------------------------
// Domain invariants (doc 06 §37, §36 Validation Rules)
// ---------------------------------------------------------------------------

export class DomainValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'DomainValidationError';
    this.field = field;
  }
}

/** Slug contract shared by organization / unit / site (doc 06 §4, §5). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 64;

/**
 * Validate a slug.
 *
 * A slug is part of an addressable identity, so its shape is a domain rule
 * rather than a presentation concern. The same rule is mirrored as a database
 * CHECK constraint — layered validation per IMPLEMENTATION_RULES §6.
 */
export function assertValidSlug(field: string, value: string): void {
  if (value.length === 0) {
    throw new DomainValidationError(field, `${field} is required.`);
  }
  if (value.length > SLUG_MAX_LENGTH) {
    throw new DomainValidationError(field, `${field} must not exceed ${SLUG_MAX_LENGTH} characters.`);
  }
  if (!SLUG_PATTERN.test(value)) {
    throw new DomainValidationError(
      field,
      `${field} must contain lowercase letters, digits and single hyphens only.`,
    );
  }
}

/**
 * Validate an email address at the domain boundary (doc 06 §36).
 *
 * Intentionally conservative: it rejects clearly invalid input without trying
 * to fully implement RFC 5322, which is not a domain responsibility.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function assertValidEmail(value: string): void {
  if (value.length === 0) {
    throw new DomainValidationError('email', 'email is required.');
  }
  if (value !== value.toLowerCase()) {
    throw new DomainValidationError('email', 'email must be stored in lowercase.');
  }
  if (!EMAIL_PATTERN.test(value)) {
    throw new DomainValidationError('email', 'email format is invalid.');
  }
}

/** Permission keys follow `resource.action` (doc 06 §3.3). */
export function assertValidPermissionKey(value: string): void {
  const parts = value.split('.');

  if (parts.length !== 2) {
    throw new DomainValidationError('permission', 'permission key must be "resource.action".');
  }

  const [resource, action] = parts;

  if (resource === undefined || action === undefined || resource === '' || action === '') {
    throw new DomainValidationError('permission', 'permission key must be "resource.action".');
  }
  if (value !== value.toLowerCase()) {
    throw new DomainValidationError('permission', 'permission key must be lowercase.');
  }
}

/** Split a validated permission key into its parts. */
export function parsePermissionKey(value: string): { resource: string; action: string } {
  assertValidPermissionKey(value);
  const [resource = '', action = ''] = value.split('.');
  return { resource, action };
}

/**
 * doc 06 §37: a unit belongs to exactly one organization, and that
 * organization must be the expected one.
 */
export function assertUnitBelongsToOrganization(
  unit: Pick<Unit, 'organizationId'>,
  organizationId: string,
): void {
  if (organizationId.length === 0) {
    throw new DomainValidationError('organizationId', 'organizationId is required.');
  }
  if (unit.organizationId !== organizationId) {
    throw new DomainValidationError(
      'organizationId',
      'unit does not belong to the expected organization.',
    );
  }
}

/**
 * doc 06 §6: a site belongs to exactly one unit.
 */
export function assertSiteBelongsToUnit(site: Pick<Site, 'unitId'>, unitId: string): void {
  if (unitId.length === 0) {
    throw new DomainValidationError('unitId', 'unitId is required.');
  }
  if (site.unitId !== unitId) {
    throw new DomainValidationError('unitId', 'site does not belong to the expected unit.');
  }
}

/**
 * Reject a role assignment whose scope level does not match the assignment
 * target (doc 06 §8, §3.2).
 *
 * A unit-level role must not be granted organization-wide, and an
 * organization-level role must not be pinned to a single unit: both would
 * silently change the effective blast radius of the role.
 */
export function assertRoleAssignableAtScope(
  role: Pick<Role, 'key' | 'scopeLevel'>,
  target: ScopeLevel,
): void {
  if (role.scopeLevel !== target) {
    throw new DomainValidationError(
      'roleId',
      `role ${role.key} is scoped to ${role.scopeLevel} and cannot be assigned at ${target} level.`,
    );
  }
}

/**
 * Normalize a hostname for domain resolution (doc 06 §7).
 *
 * Resolution happens before any operational scope is established, so the
 * hostname must be canonical: lowercase, trimmed, no trailing dot, no port.
 */
export function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const withoutPort = trimmed.split(':')[0] ?? '';
  const normalized = withoutPort.replace(/\.$/, '');

  if (normalized.length === 0) {
    throw new DomainValidationError('domain', 'domain is required.');
  }
  if (!/^[a-z0-9.-]+$/.test(normalized) || normalized.startsWith('-') || normalized.endsWith('-')) {
    throw new DomainValidationError('domain', 'domain format is invalid.');
  }

  return normalized;
}

/** doc 06 §15: audit actions come from a known vocabulary. */
export function assertKnownAuditAction(value: string): void {
  if (!(AUDIT_ACTIONS as readonly string[]).includes(value)) {
    throw new DomainValidationError('action', `unknown audit action: ${value}`);
  }
}
