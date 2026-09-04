-- QIMA — Phase 5 deterministic Activity permissions (T5.07).
INSERT OR IGNORE INTO permissions (id, key, resource, action, description) VALUES
  ('22222222-0000-4000-8000-000000000019', 'activities.read', 'activities', 'read',
   'View activities inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000020', 'activities.create', 'activities', 'create',
   'Create activities inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000021', 'activities.update', 'activities', 'update',
   'Update activities inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000022', 'activities.delete', 'activities', 'delete',
   'Soft-delete activities inside an authorized unit.');

-- Platform, organization, and unit administrators manage the complete lifecycle.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-phase5-manager-' || r.id || '-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('SUPER_ADMIN', 'ORG_ADMIN', 'UNIT_ADMIN')
   AND p.resource = 'activities';

-- Operational and observer roles may read, but cannot mutate, Activity resources.
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-phase5-reader-' || r.id || '-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('STAFF', 'TEACHER', 'EDITOR', 'VIEWER')
   AND p.key = 'activities.read';
