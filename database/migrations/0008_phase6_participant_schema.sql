-- QIMA — Phase 6 Participant Foundation (T6.01)
-- Additive, non-destructive D1 migration implementing doc 06 §11 and §28.
-- Participant ownership is explicit and immutable through unit_id.
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth TEXT,
  gender TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT participants_unit_fk FOREIGN KEY (unit_id)
    REFERENCES units (id) ON DELETE RESTRICT,
  CONSTRAINT participants_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT participants_email_not_blank CHECK (email IS NULL OR length(trim(email)) > 0),
  CONSTRAINT participants_phone_not_blank CHECK (phone IS NULL OR length(trim(phone)) > 0),
  CONSTRAINT participants_date_of_birth_format CHECK (
    date_of_birth IS NULL OR date_of_birth GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  CONSTRAINT participants_metadata_object CHECK (
    metadata IS NULL OR (json_valid(metadata) AND json_type(metadata) = 'object')
  )
);

CREATE INDEX IF NOT EXISTS idx_participants_unit_id ON participants (unit_id);
CREATE INDEX IF NOT EXISTS idx_participants_unit_status ON participants (unit_id, status);
CREATE INDEX IF NOT EXISTS idx_participants_unit_name ON participants (unit_id, name);
CREATE INDEX IF NOT EXISTS idx_participants_unit_created_at ON participants (unit_id, created_at);
