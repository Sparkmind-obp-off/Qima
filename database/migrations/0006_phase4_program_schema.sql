-- QIMA — Phase 4 Program Foundation (T4.01)
-- Additive, non-destructive D1 migration implementing doc 06 §9 and §26.
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  start_date TEXT,
  end_date TEXT,
  capacity INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT,
  CONSTRAINT programs_unit_fk FOREIGN KEY (unit_id)
    REFERENCES units (id) ON DELETE RESTRICT,
  CONSTRAINT programs_unit_slug_unique UNIQUE (unit_id, slug),
  CONSTRAINT programs_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT programs_slug_format CHECK (
    length(slug) BETWEEN 1 AND 64
    AND slug GLOB '[a-z0-9]*'
    AND slug NOT GLOB '*[^a-z0-9-]*'
    AND slug NOT LIKE '-%'
    AND slug NOT LIKE '%-'
    AND slug NOT LIKE '%--%'
  ),
  CONSTRAINT programs_start_date_format CHECK (start_date IS NULL OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT programs_end_date_format CHECK (end_date IS NULL OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT programs_date_order CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  CONSTRAINT programs_capacity_positive CHECK (capacity IS NULL OR capacity > 0)
);

CREATE INDEX IF NOT EXISTS idx_programs_unit_id ON programs (unit_id);
CREATE INDEX IF NOT EXISTS idx_programs_unit_slug ON programs (unit_id, slug);
CREATE INDEX IF NOT EXISTS idx_programs_unit_status ON programs (unit_id, status);
