-- QIMA — Phase 1 (Database Foundation) migration 0002
-- Tasks: T1.06 User schema, T1.07 Role schema, T1.08 Permission schema,
--        T1.09 Scope relationships.
--
-- Traceability:
-- - doc 10 §24 PHASE 1 — DATABASE FOUNDATION.
-- - doc 06 §3.1 User, §3.2 Role, §3.3 Permission, §8 User & Access Domain,
--   §41 Database Index Policy, §48 MVP Database Boundary.
-- - doc 05 §18 Database Architecture: `role_permissions` join table.
-- - .codex/IMPLEMENTATION_RULES.md §10 Multi-Tenancy / Isolation Rule:
--   unit access must come from an explicit authorization assignment, never
--   from knowing a unit_id.
--
-- Phase 1 boundary: this migration defines the access *schema* only.
-- Authentication, session management and authorization middleware are
-- Phase 2 (doc 10 §24 PHASE 2 — AUTHENTICATION & ACCESS) and are NOT
-- implemented here.

-- ---------------------------------------------------------------------------
-- T1.06 — users (doc 06 §3.1, §8)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  -- Only a hash is ever stored; no plaintext credential column exists
  -- (Quality Gate 10 / doc 06 §42 API Security Contract).
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'inactive', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT,
  -- doc 06 §8: email UNIQUE. Stored lowercase so uniqueness is case-insensitive.
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_email_format CHECK (email LIKE '%_@_%._%'),
  CONSTRAINT users_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT users_password_hash_not_blank CHECK (length(password_hash) > 0)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- ---------------------------------------------------------------------------
-- T1.07 — roles (doc 06 §3.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  -- Stable machine key, e.g. ORG_ADMIN (doc 06 §3.2).
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- Scope level the role may be assigned at (doc 06 §8 scope hierarchy:
  -- Platform -> Organization -> Unit).
  scope_level TEXT NOT NULL
    CHECK (scope_level IN ('platform', 'organization', 'unit')),
  -- System roles are seeded and must not be edited by tenants.
  is_system INTEGER NOT NULL DEFAULT 1 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT roles_key_unique UNIQUE (key),
  CONSTRAINT roles_key_format CHECK (key = upper(key) AND length(trim(key)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_roles_key ON roles (key);
CREATE INDEX IF NOT EXISTS idx_roles_scope_level ON roles (scope_level);

-- ---------------------------------------------------------------------------
-- T1.08 — permissions (doc 06 §3.3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  -- doc 06 §3.3: permissions use the `resource.action` pattern.
  key TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT permissions_key_unique UNIQUE (key),
  CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action),
  -- The key must be exactly `resource.action`, enforced in the database so no
  -- writer can bypass the naming contract.
  CONSTRAINT permissions_key_matches_parts CHECK (key = resource || '.' || action),
  CONSTRAINT permissions_key_lowercase CHECK (key = lower(key)),
  CONSTRAINT permissions_resource_no_dot CHECK (resource NOT LIKE '%.%'),
  CONSTRAINT permissions_action_no_dot CHECK (action NOT LIKE '%.%')
);

CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions (key);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions (resource);

-- ---------------------------------------------------------------------------
-- role_permissions (doc 05 §18) — role is a bundle of permissions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id)
    REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id)
    REFERENCES permissions (id) ON DELETE CASCADE,
  -- A permission is granted to a role at most once.
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON role_permissions (permission_id);

-- ---------------------------------------------------------------------------
-- T1.09 — scope relationships (doc 06 §8)
--
-- Access is an EXPLICIT assignment row. There is no implicit inheritance path
-- that grants unit access from organization membership alone; a principal that
-- must act on a unit needs either an organization-scoped role (evaluated by the
-- domain layer) or a unit assignment row.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_organization_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT user_organization_roles_user_fk FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_organization_roles_organization_fk FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT user_organization_roles_role_fk FOREIGN KEY (role_id)
    REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT user_organization_roles_unique UNIQUE (user_id, organization_id, role_id)
);

-- doc 06 §41: user_organization_roles.user_id, .organization_id
CREATE INDEX IF NOT EXISTS idx_user_organization_roles_user_id
  ON user_organization_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_organization_roles_organization_id
  ON user_organization_roles (organization_id);

CREATE TABLE IF NOT EXISTS user_unit_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT user_unit_roles_user_fk FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_unit_roles_unit_fk FOREIGN KEY (unit_id)
    REFERENCES units (id) ON DELETE CASCADE,
  CONSTRAINT user_unit_roles_role_fk FOREIGN KEY (role_id)
    REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT user_unit_roles_unique UNIQUE (user_id, unit_id, role_id)
);

-- doc 06 §41: user_unit_roles.user_id, .unit_id
CREATE INDEX IF NOT EXISTS idx_user_unit_roles_user_id ON user_unit_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_unit_roles_unit_id ON user_unit_roles (unit_id);
