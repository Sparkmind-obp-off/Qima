/**
 * QIMA domain repository contracts — Phase 1 (Database Foundation).
 *
 * Traceability:
 * - doc 06 §44 Repository Contract, §49 Implementation Rule
 *   (Domain Entity -> Migration -> Repository -> Use Case).
 * - doc 08 §9 Domain Layer: the domain owns the repository *contract*; the
 *   D1 implementation lives in the infrastructure layer.
 * - doc 06 §19 Multi-Tenant Isolation: every scoped read carries its scope.
 *   The contract makes the scope a REQUIRED argument, so an unscoped read
 *   cannot even be expressed through this interface.
 *
 * Phase 1 exposes read/lookup operations plus the audit append operation.
 * Mutating organization/unit use cases are Phase 3
 * (doc 10 §24 PHASE 3 — ORGANIZATION & UNIT) and are not declared here.
 */

import type {
  AuditEvent,
  DomainMapping,
  Organization,
  Permission,
  Role,
  Site,
  Unit,
  User,
} from './identity';

/** doc 06 §34 Pagination. */
export interface PageRequest {
  readonly page: number;
  readonly perPage: number;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  list(page: PageRequest): Promise<Page<Organization>>;
}

/**
 * Unit reads are always organization-scoped: `organizationId` is required on
 * every method, including `findById`, so a caller cannot fetch a unit merely by
 * knowing its identifier (doc 06 §8).
 */
export interface UnitRepository {
  findById(organizationId: string, id: string): Promise<Unit | null>;
  findBySlug(organizationId: string, slug: string): Promise<Unit | null>;
  listByOrganization(organizationId: string, page: PageRequest): Promise<Page<Unit>>;
}

export interface SiteRepository {
  findById(unitId: string, id: string): Promise<Site | null>;
  listByUnit(unitId: string, page: PageRequest): Promise<Page<Site>>;
}

/**
 * Domain resolution runs BEFORE any tenant scope exists (doc 06 §7), so this
 * lookup is intentionally global — it is the operation that establishes scope.
 */
export interface DomainMappingRepository {
  resolve(domain: string): Promise<DomainMapping | null>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

export interface RoleRepository {
  findByKey(key: string): Promise<Role | null>;
  list(): Promise<readonly Role[]>;
  /** Permissions granted to a role through `role_permissions`. */
  listPermissions(roleId: string): Promise<readonly Permission[]>;
}

export interface PermissionRepository {
  findByKey(key: string): Promise<Permission | null>;
  list(): Promise<readonly Permission[]>;
}

/**
 * Access assignment reads (doc 06 §8 / T1.09).
 *
 * These are the ONLY source of a principal's scope. There is no method that
 * returns "all units" for a user without an explicit assignment row.
 */
export interface AccessAssignmentRepository {
  listOrganizationRoleKeys(userId: string, organizationId: string): Promise<readonly string[]>;
  listUnitRoleKeys(userId: string, unitId: string): Promise<readonly string[]>;
  /** Effective permission keys resolved from the user's assigned roles. */
  resolvePermissionKeys(userId: string, organizationId: string, unitId: string | null): Promise<readonly string[]>;
}

/**
 * Audit repository (doc 06 §15).
 *
 * Append-only by contract: there is no update or delete method, mirroring the
 * database triggers. The input omits server-owned fields (`id`, `createdAt`).
 */
export type AuditEventInput = Omit<AuditEvent, 'id' | 'createdAt'>;

export interface AuditRepository {
  append(event: AuditEventInput): Promise<AuditEvent>;
  listByOrganization(organizationId: string, page: PageRequest): Promise<Page<AuditEvent>>;
}

/** Normalize and bound a pagination request (doc 06 §34). */
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export function normalizePageRequest(input: Partial<PageRequest> | undefined): PageRequest {
  const rawPage = input?.page ?? 1;
  const rawPerPage = input?.perPage ?? DEFAULT_PER_PAGE;

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const perPage =
    Number.isFinite(rawPerPage) && rawPerPage >= 1
      ? Math.min(Math.floor(rawPerPage), MAX_PER_PAGE)
      : DEFAULT_PER_PAGE;

  return { page, perPage };
}
