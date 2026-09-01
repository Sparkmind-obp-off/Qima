/**
 * QIMA canonical schema contract — Phase 1 (Database Foundation).
 *
 * Traceability:
 * - doc 10 §24 PHASE 1 — DATABASE FOUNDATION (T1.03-T1.10).
 * - doc 06 §4-§8, §15, §16 (entity tables), §41 (index policy),
 *   §48 (MVP database boundary).
 * - doc 05 §10 Domain Layer: no infrastructure import — this module describes
 *   the expected schema shape as data, it does not talk to a database.
 *
 * Purpose: a single declarative description of the schema that Phase 1
 * migrations must produce. Migrations remain the executable source of truth;
 * this contract lets the application and the integration tests verify that the
 * applied database actually matches the blueprint instead of trusting that the
 * SQL was written correctly.
 *
 * Phase boundary: operational tables (programs, activities, participants,
 * registrations, attendance_records, contents) belong to Phase 4+ and are
 * deliberately absent.
 */

/** Table names introduced by the Phase 1 database foundation. */
export const PHASE1_TABLES = [
  'organizations',
  'units',
  'sites',
  'domain_mappings',
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'user_organization_roles',
  'user_unit_roles',
  'audit_logs',
  'organization_settings',
  'unit_settings',
] as const;

export type Phase1Table = (typeof PHASE1_TABLES)[number];

/** Indexes required by doc 06 §41 for the Phase 1 tables. */
export const PHASE1_REQUIRED_INDEXES = [
  'idx_organizations_slug',
  'idx_units_organization_id',
  'idx_units_organization_slug',
  'idx_sites_unit_id',
  'idx_domain_mappings_domain',
  'idx_domain_mappings_site_id',
  'idx_users_email',
  'idx_roles_key',
  'idx_permissions_key',
  'idx_role_permissions_role_id',
  'idx_role_permissions_permission_id',
  'idx_user_organization_roles_user_id',
  'idx_user_organization_roles_organization_id',
  'idx_user_unit_roles_user_id',
  'idx_user_unit_roles_unit_id',
  'idx_audit_logs_organization_id',
  'idx_audit_logs_unit_id',
  'idx_audit_logs_user_id',
  'idx_audit_logs_created_at',
] as const;

/**
 * Columns that carry the tenant scope for each scoped Phase 1 table
 * (doc 06 §18 Data Ownership Rule, §19 Multi-Tenant Isolation).
 *
 * A table listed here must never be read without a predicate on its scope
 * column. `audit_logs` is scoped but nullable by contract (doc 06 §15).
 */
export const PHASE1_SCOPE_COLUMNS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  units: ['organization_id'],
  sites: ['unit_id'],
  domain_mappings: ['site_id'],
  user_organization_roles: ['user_id', 'organization_id'],
  user_unit_roles: ['user_id', 'unit_id'],
  organization_settings: ['organization_id'],
  unit_settings: ['unit_id'],
  audit_logs: ['organization_id', 'unit_id'],
});

/**
 * Tables that are append-only by contract (doc 06 §15).
 *
 * The application layer must not expose an update or delete operation for
 * these; the database enforces the same rule with triggers.
 */
export const APPEND_ONLY_TABLES = ['audit_logs'] as const;

// ---------------------------------------------------------------------------
// Phase 2 — Authentication & Access (doc 10 §24)
// ---------------------------------------------------------------------------

/** Tables introduced by Phase 2 task T2.02 (Session management). */
export const PHASE2_TABLES = ['sessions'] as const;

export type Phase2Table = (typeof PHASE2_TABLES)[number];

/**
 * Indexes required by the Phase 2 session schema.
 *
 * `idx_sessions_token_hash` backs the lookup performed on every authenticated
 * request; the other two back user-wide revocation and expiry sweeps.
 */
export const PHASE2_REQUIRED_INDEXES = [
  'idx_sessions_token_hash',
  'idx_sessions_user_id',
  'idx_sessions_expires_at',
] as const;

/**
 * Scope column for the session table.
 *
 * A session is owned by exactly one user, so `user_id` is its isolation
 * boundary: no session read may omit it except the token-hash lookup, which is
 * the operation that *establishes* identity (doc 06 §19).
 */
export const PHASE2_SCOPE_COLUMNS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  sessions: ['user_id'],
});

/**
 * Columns of `sessions` that must never change after issuance.
 *
 * Rewriting a live session onto another account would be privilege escalation,
 * so the database enforces this with a trigger and the contract records it
 * here (doc 06 §42).
 */
export const SESSION_IMMUTABLE_COLUMNS = ['user_id', 'token_hash', 'created_at'] as const;
