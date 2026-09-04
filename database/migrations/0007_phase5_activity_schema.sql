-- QIMA — Phase 5 Activity Foundation (T5.01)
-- Additive, non-destructive D1 migration implementing doc 06 §10 and §27.
-- A foreign key guarantees Program existence; scope triggers guarantee that an
-- optional Program belongs to the same Unit as its Activity (doc 06 §37).
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  program_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT,
  CONSTRAINT activities_unit_fk FOREIGN KEY (unit_id)
    REFERENCES units (id) ON DELETE RESTRICT,
  CONSTRAINT activities_program_fk FOREIGN KEY (program_id)
    REFERENCES programs (id) ON DELETE RESTRICT,
  CONSTRAINT activities_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT activities_type_not_blank CHECK (length(trim(activity_type)) > 0),
  CONSTRAINT activities_start_at_format CHECK (
    start_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z'
  ),
  CONSTRAINT activities_end_at_format CHECK (
    end_at IS NULL OR end_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z'
  ),
  CONSTRAINT activities_time_order CHECK (end_at IS NULL OR end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS idx_activities_unit_id ON activities (unit_id);
CREATE INDEX IF NOT EXISTS idx_activities_program_id ON activities (program_id);
CREATE INDEX IF NOT EXISTS idx_activities_unit_status ON activities (unit_id, status);
CREATE INDEX IF NOT EXISTS idx_activities_unit_start_at ON activities (unit_id, start_at);

CREATE TRIGGER IF NOT EXISTS activities_program_unit_insert
BEFORE INSERT ON activities
WHEN NEW.program_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM programs
     WHERE id = NEW.program_id AND unit_id = NEW.unit_id AND deleted_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'activity program must belong to the same active unit');
END;

CREATE TRIGGER IF NOT EXISTS activities_program_unit_update
BEFORE UPDATE OF unit_id, program_id ON activities
WHEN NEW.program_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM programs
     WHERE id = NEW.program_id AND unit_id = NEW.unit_id AND deleted_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'activity program must belong to the same active unit');
END;
