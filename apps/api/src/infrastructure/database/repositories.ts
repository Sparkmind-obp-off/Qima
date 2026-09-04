/**
 * QIMA D1 repository implementations — Phase 1 (Database Foundation).
 *
 * Traceability:
 * - doc 06 §44 Repository Contract, §49 Implementation Rule.
 * - doc 06 §19 Multi-Tenant Isolation: EVERY scoped query below carries its
 *   scope predicate. There is no `select * from units` without
 *   `where organization_id = ?`.
 * - doc 06 §38 Soft Delete Policy: soft-deleted rows never appear in normal
 *   queries.
 * - doc 08 §11 Infrastructure Layer: SQL and row mapping live here, not in the
 *   domain.
 *
 * Phase 1 provides reads plus the audit append. Organization/unit mutations are
 * Phase 3 (doc 10 §24) and are intentionally absent.
 */

import type {
  AccessAssignmentRepository,
  Activity,
  ActivityListRequest,
  ActivityPatch,
  ActivityRepository,
  ActivityStatus,
  ActivityValues,
  AuditEvent,
  AuditEventInput,
  AuditRepository,
  DomainMapping,
  DomainMappingRepository,
  EntityStatus,
  Organization,
  OrganizationPatch,
  OrganizationRepository,
  OrganizationValues,
  Page,
  PageRequest,
  Permission,
  PermissionRepository,
  Program,
  ProgramListRequest,
  ProgramPatch,
  ProgramRepository,
  ProgramStatus,
  ProgramValues,
  Role,
  RoleKey,
  RoleRepository,
  ScopeLevel,
  ScopedRoleAssignment,
  Site,
  SiteRepository,
  Unit,
  UnitPatch,
  UnitRepository,
  UnitType,
  UnitValues,
  User,
  UserRepository,
  UserStatus,
} from '@qima/domain';
import { execute, queryAll, queryCount, queryFirst, type QimaDatabase } from './d1-client';

// ---------------------------------------------------------------------------
// Row shapes and mappers (snake_case persistence -> camelCase domain)
// ---------------------------------------------------------------------------

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface UnitRow extends OrganizationRow {
  organization_id: string;
  type: string;
}

interface ProgramRow {
  id: string;
  unit_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ActivityRow {
  id: string;
  unit_id: string;
  program_id: string | null;
  title: string;
  description: string | null;
  activity_type: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SiteRow {
  id: string;
  unit_id: string;
  name: string;
  slug: string;
  status: string;
  branding_config: string;
  settings: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface DomainMappingRow {
  id: string;
  site_id: string;
  domain: string;
  type: string;
  status: string;
  is_primary: number;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope_level: string;
  is_system: number;
  created_at: string;
  updated_at: string;
}

interface PermissionRow {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: string;
}

interface AuditLogRow {
  id: string;
  organization_id: string | null;
  unit_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Parse a JSON column defensively.
 *
 * Persisted JSON is validated on write, but a malformed value must not crash a
 * read path; an empty object is a safe, non-misleading substitute for a
 * configuration blob.
 */
function parseJsonObject(value: string | null): Readonly<Record<string, unknown>> {
  if (value === null || value === '') {
    return Object.freeze({});
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.freeze(parsed as Record<string, unknown>);
    }
    return Object.freeze({});
  } catch {
    return Object.freeze({});
  }
}

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as EntityStatus,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toUnit(row: UnitRow): Unit {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    type: row.type as UnitType,
    status: row.status as EntityStatus,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    unitId: row.unit_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status as ProgramStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    capacity: row.capacity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    unitId: row.unit_id,
    programId: row.program_id,
    title: row.title,
    description: row.description,
    activityType: row.activity_type,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    status: row.status as ActivityStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    unitId: row.unit_id,
    name: row.name,
    slug: row.slug,
    status: row.status as EntityStatus,
    brandingConfig: parseJsonObject(row.branding_config),
    settings: parseJsonObject(row.settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toDomainMapping(row: DomainMappingRow): DomainMapping {
  return {
    id: row.id,
    siteId: row.site_id,
    domain: row.domain,
    type: row.type as DomainMapping['type'],
    status: row.status as DomainMapping['status'],
    isPrimary: row.is_primary === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status as UserStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toRole(row: RoleRow): Role {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    scopeLevel: row.scope_level as ScopeLevel,
    isSystem: row.is_system === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPermission(row: PermissionRow): Permission {
  return {
    id: row.id,
    key: row.key,
    resource: row.resource,
    action: row.action,
    description: row.description,
    createdAt: row.created_at,
  };
}

function toAuditEvent(row: AuditLogRow): AuditEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    unitId: row.unit_id,
    userId: row.user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata === null ? null : parseJsonObject(row.metadata),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function offsetOf(page: PageRequest): number {
  return (page.page - 1) * page.perPage;
}

function toPage<T>(items: readonly T[], page: PageRequest, total: number): Page<T> {
  return { items, page: page.page, perPage: page.perPage, total };
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export function createOrganizationRepository(db: QimaDatabase): OrganizationRepository {
  return {
    async create(id: string, values: OrganizationValues) {
      await execute(
        db,
        `insert into organizations (id, name, slug, status, description)
         values (?, ?, ?, ?, ?)`,
        [id, values.name, values.slug, values.status, values.description],
      );
      const created = await this.findById(id);
      if (created === null) throw new Error('Organization could not be persisted.');
      return created;
    },

    async findById(id) {
      const row = await queryFirst<OrganizationRow>(
        db,
        'select * from organizations where id = ? and deleted_at is null',
        [id],
      );
      return row === null ? null : toOrganization(row);
    },

    async findBySlug(slug) {
      const row = await queryFirst<OrganizationRow>(
        db,
        'select * from organizations where slug = ? and deleted_at is null',
        [slug],
      );
      return row === null ? null : toOrganization(row);
    },

    async list(page) {
      const rows = await queryAll<OrganizationRow>(
        db,
        'select * from organizations where deleted_at is null order by name limit ? offset ?',
        [page.perPage, offsetOf(page)],
      );
      const total = await queryCount(
        db,
        'select count(*) as total from organizations where deleted_at is null',
      );
      return toPage(rows.map(toOrganization), page, total);
    },

    async listByIds(ids, page) {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return toPage([], page, 0);
      const placeholders = uniqueIds.map(() => '?').join(', ');
      const rows = await queryAll<OrganizationRow>(
        db,
        `select * from organizations where id in (${placeholders}) and deleted_at is null
         order by name limit ? offset ?`,
        [...uniqueIds, page.perPage, offsetOf(page)],
      );
      const total = await queryCount(
        db,
        `select count(*) as total from organizations
         where id in (${placeholders}) and deleted_at is null`,
        uniqueIds,
      );
      return toPage(rows.map(toOrganization), page, total);
    },

    async update(id: string, patch: OrganizationPatch) {
      const columns: string[] = [];
      const values: unknown[] = [];
      for (const [field, column] of [
        ['name', 'name'],
        ['slug', 'slug'],
        ['status', 'status'],
        ['description', 'description'],
      ] as const) {
        if (patch[field] !== undefined) {
          columns.push(`${column} = ?`);
          values.push(patch[field]);
        }
      }
      if (columns.length === 0) return this.findById(id);
      columns.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
      await execute(
        db,
        `update organizations set ${columns.join(', ')} where id = ? and deleted_at is null`,
        [...values, id],
      );
      return this.findById(id);
    },
  };
}

export function createUnitRepository(db: QimaDatabase): UnitRepository {
  return {
    async create(organizationId: string, id: string, values: UnitValues) {
      await execute(
        db,
        `insert into units (id, organization_id, name, slug, type, status, description)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          values.name,
          values.slug,
          values.type,
          values.status,
          values.description,
        ],
      );
      const created = await this.findById(organizationId, id);
      if (created === null) throw new Error('Unit could not be persisted.');
      return created;
    },

    // Scope predicate is present even on the by-id lookup: knowing a unit id is
    // never sufficient to read it (doc 06 §8).
    async findById(organizationId, id) {
      const row = await queryFirst<UnitRow>(
        db,
        'select * from units where organization_id = ? and id = ? and deleted_at is null',
        [organizationId, id],
      );
      return row === null ? null : toUnit(row);
    },

    async findBySlug(organizationId, slug) {
      const row = await queryFirst<UnitRow>(
        db,
        'select * from units where organization_id = ? and slug = ? and deleted_at is null',
        [organizationId, slug],
      );
      return row === null ? null : toUnit(row);
    },

    async listByOrganization(organizationId, page) {
      const rows = await queryAll<UnitRow>(
        db,
        'select * from units where organization_id = ? and deleted_at is null order by name limit ? offset ?',
        [organizationId, page.perPage, offsetOf(page)],
      );
      const total = await queryCount(
        db,
        'select count(*) as total from units where organization_id = ? and deleted_at is null',
        [organizationId],
      );
      return toPage(rows.map(toUnit), page, total);
    },

    async update(organizationId: string, id: string, patch: UnitPatch) {
      const columns: string[] = [];
      const values: unknown[] = [];
      for (const [field, column] of [
        ['name', 'name'],
        ['slug', 'slug'],
        ['status', 'status'],
        ['description', 'description'],
        ['type', 'type'],
      ] as const) {
        if (patch[field] !== undefined) {
          columns.push(`${column} = ?`);
          values.push(patch[field]);
        }
      }
      if (columns.length === 0) return this.findById(organizationId, id);
      columns.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
      await execute(
        db,
        `update units set ${columns.join(', ')}
         where organization_id = ? and id = ? and deleted_at is null`,
        [...values, organizationId, id],
      );
      return this.findById(organizationId, id);
    },
  };
}

export function createProgramRepository(db: QimaDatabase): ProgramRepository {
  return {
    async create(unitId: string, id: string, values: ProgramValues) {
      await execute(
        db,
        `insert into programs
           (id, unit_id, name, slug, description, status, start_date, end_date, capacity)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          unitId,
          values.name,
          values.slug,
          values.description,
          values.status,
          values.startDate,
          values.endDate,
          values.capacity,
        ],
      );
      const created = await this.findById(unitId, id);
      if (created === null) throw new Error('Program could not be persisted.');
      return created;
    },

    async findById(unitId, id) {
      const row = await queryFirst<ProgramRow>(
        db,
        'select * from programs where unit_id = ? and id = ? and deleted_at is null',
        [unitId, id],
      );
      return row === null ? null : toProgram(row);
    },

    async findBySlug(unitId, slug) {
      const row = await queryFirst<ProgramRow>(
        db,
        'select * from programs where unit_id = ? and slug = ? and deleted_at is null',
        [unitId, slug],
      );
      return row === null ? null : toProgram(row);
    },

    async listByUnit(unitId, request: ProgramListRequest) {
      const predicates = ['unit_id = ?', 'deleted_at is null'];
      const parameters: unknown[] = [unitId];
      if (request.status !== undefined) {
        predicates.push('status = ?');
        parameters.push(request.status);
      }
      if (request.search !== undefined) {
        predicates.push('(lower(name) like ? escape \'\\\' or lower(slug) like ? escape \'\\\')');
        const pattern = `%${request.search
          .toLowerCase()
          .replace(/\\/g, '\\\\')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_')}%`;
        parameters.push(pattern, pattern);
      }
      const where = predicates.join(' and ');
      const rows = await queryAll<ProgramRow>(
        db,
        `select * from programs where ${where}
         order by created_at desc, name limit ? offset ?`,
        [...parameters, request.perPage, offsetOf(request)],
      );
      const total = await queryCount(db, `select count(*) as total from programs where ${where}`, parameters);
      return toPage(rows.map(toProgram), request, total);
    },

    async update(unitId: string, id: string, patch: ProgramPatch) {
      const columns: string[] = [];
      const values: unknown[] = [];
      for (const [field, column] of [
        ['name', 'name'],
        ['slug', 'slug'],
        ['description', 'description'],
        ['status', 'status'],
        ['startDate', 'start_date'],
        ['endDate', 'end_date'],
        ['capacity', 'capacity'],
      ] as const) {
        if (patch[field] !== undefined) {
          columns.push(`${column} = ?`);
          values.push(patch[field]);
        }
      }
      if (columns.length === 0) return this.findById(unitId, id);
      columns.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
      await execute(
        db,
        `update programs set ${columns.join(', ')}
         where unit_id = ? and id = ? and deleted_at is null`,
        [...values, unitId, id],
      );
      return this.findById(unitId, id);
    },

    async softDelete(unitId, id) {
      const existing = await this.findById(unitId, id);
      if (existing === null) return false;
      await execute(
        db,
        `update programs
            set deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
          where unit_id = ? and id = ? and deleted_at is null`,
        [unitId, id],
      );
      return true;
    },
  };
}

export function createActivityRepository(db: QimaDatabase): ActivityRepository {
  return {
    async create(unitId: string, id: string, values: ActivityValues) {
      await execute(
        db,
        `insert into activities
           (id, unit_id, program_id, title, description, activity_type, start_at, end_at, location, status)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          unitId,
          values.programId,
          values.title,
          values.description,
          values.activityType,
          values.startAt,
          values.endAt,
          values.location,
          values.status,
        ],
      );
      const created = await this.findById(unitId, id);
      if (created === null) throw new Error('Activity could not be persisted.');
      return created;
    },

    async findById(unitId, id) {
      const row = await queryFirst<ActivityRow>(
        db,
        'select * from activities where unit_id = ? and id = ? and deleted_at is null',
        [unitId, id],
      );
      return row === null ? null : toActivity(row);
    },

    async listByUnit(unitId, request: ActivityListRequest) {
      const predicates = ['unit_id = ?', 'deleted_at is null'];
      const parameters: unknown[] = [unitId];
      if (request.status !== undefined) {
        predicates.push('status = ?');
        parameters.push(request.status);
      }
      if (request.programId !== undefined) {
        predicates.push('program_id = ?');
        parameters.push(request.programId);
      }
      if (request.search !== undefined) {
        predicates.push(
          `(lower(title) like ? escape '\\' or lower(activity_type) like ? escape '\\' or lower(coalesce(location, '')) like ? escape '\\')`,
        );
        const pattern = `%${request.search
          .toLowerCase()
          .replace(/\\/g, '\\\\')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_')}%`;
        parameters.push(pattern, pattern, pattern);
      }
      const where = predicates.join(' and ');
      const rows = await queryAll<ActivityRow>(
        db,
        `select * from activities where ${where}
         order by start_at desc, title limit ? offset ?`,
        [...parameters, request.perPage, offsetOf(request)],
      );
      const total = await queryCount(db, `select count(*) as total from activities where ${where}`, parameters);
      return toPage(rows.map(toActivity), request, total);
    },

    async update(unitId: string, id: string, patch: ActivityPatch) {
      const columns: string[] = [];
      const values: unknown[] = [];
      for (const [field, column] of [
        ['programId', 'program_id'],
        ['title', 'title'],
        ['description', 'description'],
        ['activityType', 'activity_type'],
        ['startAt', 'start_at'],
        ['endAt', 'end_at'],
        ['location', 'location'],
        ['status', 'status'],
      ] as const) {
        if (patch[field] !== undefined) {
          columns.push(`${column} = ?`);
          values.push(patch[field]);
        }
      }
      if (columns.length === 0) return this.findById(unitId, id);
      columns.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
      await execute(
        db,
        `update activities set ${columns.join(', ')}
         where unit_id = ? and id = ? and deleted_at is null`,
        [...values, unitId, id],
      );
      return this.findById(unitId, id);
    },

    async softDelete(unitId, id) {
      const existing = await this.findById(unitId, id);
      if (existing === null) return false;
      await execute(
        db,
        `update activities
            set deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
          where unit_id = ? and id = ? and deleted_at is null`,
        [unitId, id],
      );
      return true;
    },
  };
}

export function createSiteRepository(db: QimaDatabase): SiteRepository {
  return {
    async findById(unitId, id) {
      const row = await queryFirst<SiteRow>(
        db,
        'select * from sites where unit_id = ? and id = ? and deleted_at is null',
        [unitId, id],
      );
      return row === null ? null : toSite(row);
    },

    async listByUnit(unitId, page) {
      const rows = await queryAll<SiteRow>(
        db,
        'select * from sites where unit_id = ? and deleted_at is null order by name limit ? offset ?',
        [unitId, page.perPage, offsetOf(page)],
      );
      const total = await queryCount(
        db,
        'select count(*) as total from sites where unit_id = ? and deleted_at is null',
        [unitId],
      );
      return toPage(rows.map(toSite), page, total);
    },
  };
}

export function createDomainMappingRepository(db: QimaDatabase): DomainMappingRepository {
  return {
    // Global by contract: this lookup establishes scope, it does not consume it
    // (doc 06 §7). Only an active mapping may resolve.
    async resolve(domain) {
      const row = await queryFirst<DomainMappingRow>(
        db,
        "select * from domain_mappings where domain = ? and status = 'active'",
        [domain],
      );
      return row === null ? null : toDomainMapping(row);
    },
  };
}

export function createUserRepository(db: QimaDatabase): UserRepository {
  return {
    // `password_hash` is never selected: the domain User contract excludes it,
    // so it cannot leak through a repository read (Quality Gate 10).
    async findById(id) {
      const row = await queryFirst<UserRow>(
        db,
        'select id, name, email, phone, status, created_at, updated_at, deleted_at from users where id = ? and deleted_at is null',
        [id],
      );
      return row === null ? null : toUser(row);
    },

    async findByEmail(email) {
      const row = await queryFirst<UserRow>(
        db,
        'select id, name, email, phone, status, created_at, updated_at, deleted_at from users where email = ? and deleted_at is null',
        [email.toLowerCase()],
      );
      return row === null ? null : toUser(row);
    },
  };
}

export function createRoleRepository(db: QimaDatabase): RoleRepository {
  return {
    async findByKey(key) {
      const row = await queryFirst<RoleRow>(db, 'select * from roles where key = ?', [key]);
      return row === null ? null : toRole(row);
    },

    async list() {
      const rows = await queryAll<RoleRow>(db, 'select * from roles order by scope_level, key');
      return rows.map(toRole);
    },

    async listPermissions(roleId) {
      const rows = await queryAll<PermissionRow>(
        db,
        `select p.* from permissions p
           join role_permissions rp on rp.permission_id = p.id
          where rp.role_id = ?
          order by p.key`,
        [roleId],
      );
      return rows.map(toPermission);
    },
  };
}

export function createPermissionRepository(db: QimaDatabase): PermissionRepository {
  return {
    async findByKey(key) {
      const row = await queryFirst<PermissionRow>(db, 'select * from permissions where key = ?', [
        key,
      ]);
      return row === null ? null : toPermission(row);
    },

    async list() {
      const rows = await queryAll<PermissionRow>(db, 'select * from permissions order by key');
      return rows.map(toPermission);
    },
  };
}

export function createAccessAssignmentRepository(db: QimaDatabase): AccessAssignmentRepository {
  return {
    async listAssignments(userId) {
      interface AssignmentRow {
        role_key: RoleKey;
        scope_level: ScopeLevel;
        organization_id: string | null;
        unit_id: string | null;
      }

      const rows = await queryAll<AssignmentRow>(
        db,
        `select r.key as role_key, r.scope_level, null as organization_id, null as unit_id
           from user_platform_roles upr
           join roles r on r.id = upr.role_id
          where upr.user_id = ? and r.scope_level = 'platform'
          union all
         select r.key as role_key, r.scope_level, uor.organization_id, null as unit_id
           from user_organization_roles uor
           join roles r on r.id = uor.role_id
           join organizations o on o.id = uor.organization_id
          where uor.user_id = ? and r.scope_level = 'organization'
            and o.deleted_at is null and o.status = 'active'
          union all
         select r.key as role_key, r.scope_level, u.organization_id, uur.unit_id
           from user_unit_roles uur
           join roles r on r.id = uur.role_id
           join units u on u.id = uur.unit_id
           join organizations o on o.id = u.organization_id
          where uur.user_id = ? and r.scope_level = 'unit'
            and u.deleted_at is null and u.status = 'active'
            and o.deleted_at is null and o.status = 'active'
          order by scope_level, organization_id, unit_id, role_key`,
        [userId, userId, userId],
      );

      return rows.map(
        (row): ScopedRoleAssignment => ({
          roleKey: row.role_key,
          scopeLevel: row.scope_level,
          organizationId: row.organization_id,
          unitId: row.unit_id,
        }),
      );
    },

    async listOrganizationRoleKeys(userId, organizationId) {
      const rows = await queryAll<{ key: RoleKey }>(
        db,
        `select r.key from roles r
           join user_organization_roles uor on uor.role_id = r.id
           join organizations o on o.id = uor.organization_id
          where uor.user_id = ? and uor.organization_id = ?
            and r.scope_level = 'organization'
            and o.deleted_at is null and o.status = 'active'
          order by r.key`,
        [userId, organizationId],
      );
      return rows.map((row) => row.key);
    },

    async listUnitRoleKeys(userId, unitId) {
      const rows = await queryAll<{ key: RoleKey }>(
        db,
        `select r.key from roles r
           join user_unit_roles uur on uur.role_id = r.id
           join units u on u.id = uur.unit_id
          where uur.user_id = ? and uur.unit_id = ?
            and r.scope_level = 'unit'
            and u.deleted_at is null and u.status = 'active'
          order by r.key`,
        [userId, unitId],
      );
      return rows.map((row) => row.key);
    },

    async resolvePermissionKeys(userId, organizationId, unitId) {
      const platformRows = await queryAll<{ key: string }>(
        db,
        `select distinct p.key from permissions p
           join role_permissions rp on rp.permission_id = p.id
           join user_platform_roles upr on upr.role_id = rp.role_id
           join roles r on r.id = upr.role_id
          where upr.user_id = ? and r.scope_level = 'platform'`,
        [userId],
      );

      const organizationRows =
        organizationId === null
          ? []
          : await queryAll<{ key: string }>(
              db,
              `select distinct p.key from permissions p
                 join role_permissions rp on rp.permission_id = p.id
                 join user_organization_roles uor on uor.role_id = rp.role_id
                 join roles r on r.id = uor.role_id
                 join organizations o on o.id = uor.organization_id
                where uor.user_id = ? and uor.organization_id = ?
                  and r.scope_level = 'organization'
                  and o.deleted_at is null and o.status = 'active'`,
              [userId, organizationId],
            );

      const unitRows =
        organizationId === null || unitId === null
          ? []
          : await queryAll<{ key: string }>(
              db,
              `select distinct p.key from permissions p
                 join role_permissions rp on rp.permission_id = p.id
                 join user_unit_roles uur on uur.role_id = rp.role_id
                 join roles r on r.id = uur.role_id
                 join units u on u.id = uur.unit_id
                 join organizations o on o.id = u.organization_id
                where uur.user_id = ? and uur.unit_id = ? and u.organization_id = ?
                  and r.scope_level = 'unit'
                  and u.deleted_at is null and u.status = 'active'
                  and o.deleted_at is null and o.status = 'active'`,
              [userId, unitId, organizationId],
            );

      const keys = new Set<string>();
      for (const row of [...platformRows, ...organizationRows, ...unitRows]) {
        keys.add(row.key);
      }
      return [...keys].sort();
    },
  };
}

/**
 * Audit repository (doc 06 §15).
 *
 * `append` is the only write. `id` and `created_at` are server-assigned so a
 * caller cannot backdate or overwrite an entry (doc 06 §39 ID Policy).
 */
export function createAuditRepository(
  db: QimaDatabase,
  generateId: () => string = () => crypto.randomUUID(),
): AuditRepository {
  return {
    async append(event: AuditEventInput) {
      const id = generateId();
      const metadata = event.metadata === null ? null : JSON.stringify(event.metadata);

      await execute(
        db,
        `insert into audit_logs
           (id, organization_id, unit_id, user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          event.organizationId,
          event.unitId,
          event.userId,
          event.action,
          event.resourceType,
          event.resourceId,
          metadata,
          event.ipAddress,
          event.userAgent,
        ],
      );

      const row = await queryFirst<AuditLogRow>(db, 'select * from audit_logs where id = ?', [id]);
      if (row === null) {
        // An append that cannot be read back is a real failure, not a no-op.
        throw new Error('Audit event could not be persisted.');
      }
      return toAuditEvent(row);
    },

    async listByOrganization(organizationId, page) {
      const rows = await queryAll<AuditLogRow>(
        db,
        'select * from audit_logs where organization_id = ? order by created_at desc, id desc limit ? offset ?',
        [organizationId, page.perPage, offsetOf(page)],
      );
      const total = await queryCount(
        db,
        'select count(*) as total from audit_logs where organization_id = ?',
        [organizationId],
      );
      return toPage(rows.map(toAuditEvent), page, total);
    },
  };
}
