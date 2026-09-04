-- QIMA — Phase 6 deterministic Participant permissions (T6.07).
INSERT OR IGNORE INTO permissions (id, key, resource, action, description) VALUES
  ('22222222-0000-4000-8000-000000000023', 'participants.read', 'participants', 'read',
   'View participants inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000024', 'participants.create', 'participants', 'create',
   'Create participants inside an authorized unit.'),
  ('22222222-0000-4000-8000-000000000025', 'participants.update', 'participants', 'update',
   'Update participants inside an authorized unit.');

INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-phase6-manager-' || r.id || '-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('SUPER_ADMIN', 'ORG_ADMIN', 'UNIT_ADMIN')
   AND p.resource = 'participants';

INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT 'rp-phase6-reader-' || r.id || '-' || p.id, r.id, p.id
  FROM roles r CROSS JOIN permissions p
 WHERE r.key IN ('STAFF', 'TEACHER', 'EDITOR', 'VIEWER')
   AND p.key = 'participants.read';
