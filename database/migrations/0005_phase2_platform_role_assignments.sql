-- QIMA — Phase 2 (Authentication & Access) migration 0005
-- Task T2.06: explicit platform-level role assignments.
--
-- Organization and unit assignments already exist from migration 0002. A
-- dedicated platform table is required because SUPER_ADMIN has no tenant id and
-- must never be inferred from a request parameter or from a tenant assignment.

CREATE TABLE IF NOT EXISTS user_platform_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT user_platform_roles_user_fk FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_platform_roles_role_fk FOREIGN KEY (role_id)
    REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT user_platform_roles_unique UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_platform_roles_user_id
  ON user_platform_roles (user_id);
