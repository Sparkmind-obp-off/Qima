-- QIMA — Phase 4 deterministic Program permissions (T4.07).
INSERT OR IGNORE INTO permissions (id, key, resource, action, description) VALUES
  ('22222222-0000-4000-8000-000000000015', 'programs.read', 'programs', 'read',
   'View programs inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000016', 'programs.create', 'programs', 'create',
   'Create programs inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000017', 'programs.update', 'programs', 'update',
   'Update programs inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000018', 'programs.delete', 'programs', 'delete',
   'Soft-delete programs inside an authorized unit.');

-- Platform, organization, and unit administrators manage the complete lifecycle.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-phase4-manager-' || r.id || '-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('SUPER_ADMIN', 'ORG_ADMIN', 'UNIT_ADMIN')
   AND p.resource = 'programs';

-- Operational and observer roles may read, but cannot mutate, Program resources.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-phase4-reader-' || r.id || '-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('STAFF', 'TEACHER', 'EDITOR', 'VIEWER')
   AND p.key = 'programs.read';
