-- QIMA — Phase 1 seed: system roles and permissions.
--
-- Traceability:
-- - doc 10 §24 PHASE 1 exit criteria: "Seed works".
-- - doc 06 §3.2 Role catalogue, §3.3 Permission pattern (`resource.action`).
-- - .codex/IMPLEMENTATION_RULES.md §7 Data Rule: seeds MUST be deterministic.
--
-- Determinism: every identifier below is a fixed, literal UUID and every insert
-- is `INSERT OR IGNORE`. Re-running this seed converges to the same state and
-- never duplicates a row.
--
-- Contains NO personal data and NO credentials (Quality Gate 10). User accounts
-- are created through the Phase 2 authentication flow, not seeded here.

-- ---------------------------------------------------------------------------
-- Roles (doc 06 §3.2)
--
-- `scope_level` records where a role may be assigned: SUPER_ADMIN is a platform
-- principal, ORG_ADMIN acts organization-wide, the rest act within a unit.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO roles (id, key, name, description, scope_level, is_system) VALUES
  ('11111111-0000-4000-8000-000000000001', 'SUPER_ADMIN', 'Super Admin',
   'Platform-level administrator.', 'platform', 1),
  ('11111111-0000-4000-8000-000000000002', 'ORG_ADMIN', 'Organization Admin',
   'Administers a single organization and its units.', 'organization', 1),
  ('11111111-0000-4000-8000-000000000003', 'UNIT_ADMIN', 'Unit Admin',
   'Administers a single unit.', 'unit', 1),
  ('11111111-0000-4000-8000-000000000004', 'STAFF', 'Staff',
   'Operational staff within a unit.', 'unit', 1),
  ('11111111-0000-4000-8000-000000000005', 'TEACHER', 'Teacher',
   'Teaching staff within a unit.', 'unit', 1),
  ('11111111-0000-4000-8000-000000000006', 'EDITOR', 'Editor',
   'Manages content within a unit.', 'unit', 1),
  ('11111111-0000-4000-8000-000000000007', 'VIEWER', 'Viewer',
   'Read-only access within a unit.', 'unit', 1);

-- ---------------------------------------------------------------------------
-- Permissions (doc 06 §3.3)
--
-- Only permissions for capabilities whose schema exists after Phase 1 are
-- seeded. Program / activity / participant / registration / attendance
-- permissions arrive with their own phases (doc 10 §24) — seeding them now
-- would grant rights over tables that do not exist yet.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO permissions (id, key, resource, action, description) VALUES
  ('22222222-0000-4000-8000-000000000001', 'organizations.read', 'organizations', 'read',
   'View organization data.'),
  ('22222222-0000-4000-8000-000000000002', 'organizations.update', 'organizations', 'update',
   'Update organization data.'),
  ('22222222-0000-4000-8000-000000000003', 'units.read', 'units', 'read',
   'View units.'),
  ('22222222-0000-4000-8000-000000000004', 'units.create', 'units', 'create',
   'Create units.'),
  ('22222222-0000-4000-8000-000000000005', 'units.update', 'units', 'update',
   'Update units.'),
  ('22222222-0000-4000-8000-000000000006', 'users.read', 'users', 'read',
   'View users.'),
  ('22222222-0000-4000-8000-000000000007', 'users.create', 'users', 'create',
   'Invite or create users.'),
  ('22222222-0000-4000-8000-000000000008', 'users.update', 'users', 'update',
   'Update users.'),
  ('22222222-0000-4000-8000-000000000009', 'sites.read', 'sites', 'read',
   'View sites.'),
  ('22222222-0000-4000-8000-000000000010', 'sites.update', 'sites', 'update',
   'Update sites.'),
  ('22222222-0000-4000-8000-000000000011', 'audit.read', 'audit', 'read',
   'Read audit logs.'),
  ('22222222-0000-4000-8000-000000000012', 'settings.read', 'settings', 'read',
   'Read configuration settings.'),
  ('22222222-0000-4000-8000-000000000013', 'settings.update', 'settings', 'update',
   'Update configuration settings.');

-- ---------------------------------------------------------------------------
-- Role -> permission grants (doc 05 §18)
--
-- Grants are derived by rule rather than enumerated by hand, so the mapping
-- stays consistent as the permission catalogue grows:
--
--   SUPER_ADMIN  every seeded permission
--   ORG_ADMIN    every seeded permission except platform-only concerns
--   UNIT_ADMIN   unit-facing read + update, plus audit read
--   STAFF        unit-facing read
--   TEACHER      unit-facing read
--   EDITOR       unit-facing read + site update
--   VIEWER       read-only
--
-- The join-table id is derived deterministically from the role and permission
-- ids so re-running the seed produces identical rows.
-- ---------------------------------------------------------------------------

-- SUPER_ADMIN — all permissions.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-super-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key = 'SUPER_ADMIN';

-- ORG_ADMIN — all permissions currently defined for tenant administration.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-orgadmin-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key = 'ORG_ADMIN';

-- UNIT_ADMIN — unit-facing administration; no organization mutation.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-unitadmin-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key = 'UNIT_ADMIN'
   AND p.key IN (
     'organizations.read',
     'units.read',
     'units.update',
     'users.read',
     'users.create',
     'users.update',
     'sites.read',
     'sites.update',
     'audit.read',
     'settings.read',
     'settings.update'
   );

-- STAFF — operational reads.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-staff-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key = 'STAFF'
   AND p.key IN ('organizations.read', 'units.read', 'users.read', 'sites.read', 'settings.read');

-- TEACHER — operational reads.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-teacher-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key = 'TEACHER'
   AND p.key IN ('organizations.read', 'units.read', 'sites.read');

-- EDITOR — content-facing: reads plus site update.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-editor-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key = 'EDITOR'
   AND p.key IN ('organizations.read', 'units.read', 'sites.read', 'sites.update');

-- VIEWER — read-only.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-viewer-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key = 'VIEWER'
   AND p.key IN ('organizations.read', 'units.read', 'sites.read');
