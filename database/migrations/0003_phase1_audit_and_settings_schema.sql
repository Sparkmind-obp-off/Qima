-- QIMA — Phase 1 (Database Foundation) migration 0003
-- Task: T1.10 Audit schema (plus the configuration tables the audit/settings
-- boundary depends on).
--
-- Traceability:
-- - doc 10 §24 PHASE 1 — DATABASE FOUNDATION (T1.10 Audit schema).
-- - doc 06 §15 Audit Domain: audit_logs is APPEND-ONLY.
-- - doc 06 §16 Configuration Domain: configuration is separated from
--   operational data; UNIQUE(organization_id, key) and UNIQUE(unit_id, key).
-- - doc 06 §41 Database Index Policy.

-- ---------------------------------------------------------------------------
-- T1.10 — audit_logs (doc 06 §15)
--
-- organization_id / unit_id / user_id are NULLABLE by contract: platform-level
-- and pre-authentication events (e.g. a failed LOGIN) have no tenant or actor.
-- ON DELETE SET NULL preserves the audit record when a referenced entity is
-- removed — an audit trail must survive the deletion of its subject.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  unit_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  -- JSONB -> TEXT holding a JSON document.
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT audit_logs_organization_fk FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_unit_fk FOREIGN KEY (unit_id)
    REFERENCES units (id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_user_fk FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_action_not_blank CHECK (length(trim(action)) > 0),
  CONSTRAINT audit_logs_resource_type_not_blank CHECK (length(trim(resource_type)) > 0)
);

-- doc 06 §41: audit_logs.organization_id, .unit_id, .user_id, .created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_unit_id ON audit_logs (unit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs (resource_type, resource_id);

-- doc 06 §15: "Audit log bersifat append-only. Application layer tidak
-- menyediakan operasi normal untuk mengubah audit record."
--
-- Enforced in the database, not only in application code, so an append-only
-- trail cannot be silently rewritten by any writer.
--
-- The guard is deliberately split in two, and is scoped `BEFORE UPDATE OF
-- <columns>` rather than `BEFORE UPDATE`:
--
--   A blanket BEFORE UPDATE trigger also fires for the `SET NULL` write that
--   SQLite performs itself when a referenced organization/unit/user is deleted.
--   That made the trigger abort the foreign-key action, so deleting any entity
--   which had ever been audited failed outright — the audit trail silently
--   became an undeletable-tenant bug instead of a durable record. Restricting
--   the first trigger to the content columns keeps every author-visible field
--   immutable while still allowing the declared ON DELETE SET NULL to complete.
--
-- The second trigger closes the gap that opens up: the scope columns are left
-- writable by the first trigger, so re-pointing an existing event at a
-- different tenant would otherwise be possible. Setting a scope column to NULL
-- is permitted (that is exactly the foreign-key action); changing it to another
-- non-NULL value is not.
CREATE TRIGGER IF NOT EXISTS audit_logs_no_update
BEFORE UPDATE OF
  id, action, resource_type, resource_id, metadata, ip_address, user_agent, created_at
ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'audit_logs is append-only: UPDATE is not permitted');
END;

CREATE TRIGGER IF NOT EXISTS audit_logs_no_rescope
BEFORE UPDATE ON audit_logs
WHEN (new.organization_id IS NOT NULL AND new.organization_id IS NOT old.organization_id)
  OR (new.unit_id IS NOT NULL AND new.unit_id IS NOT old.unit_id)
  OR (new.user_id IS NOT NULL AND new.user_id IS NOT old.user_id)
BEGIN
  SELECT RAISE(ABORT, 'audit_logs is append-only: an event cannot be reassigned to another scope');
END;

CREATE TRIGGER IF NOT EXISTS audit_logs_no_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'audit_logs is append-only: DELETE is not permitted');
END;

-- ---------------------------------------------------------------------------
-- organization_settings / unit_settings (doc 06 §16)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT organization_settings_organization_fk FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  -- doc 06 §16: UNIQUE(organization_id, key)
  CONSTRAINT organization_settings_unique UNIQUE (organization_id, key),
  CONSTRAINT organization_settings_key_not_blank CHECK (length(trim(key)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_organization_id
  ON organization_settings (organization_id);

CREATE TABLE IF NOT EXISTS unit_settings (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT unit_settings_unit_fk FOREIGN KEY (unit_id)
    REFERENCES units (id) ON DELETE CASCADE,
  -- doc 06 §16: UNIQUE(unit_id, key)
  CONSTRAINT unit_settings_unique UNIQUE (unit_id, key),
  CONSTRAINT unit_settings_key_not_blank CHECK (length(trim(key)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_unit_settings_unit_id ON unit_settings (unit_id);
