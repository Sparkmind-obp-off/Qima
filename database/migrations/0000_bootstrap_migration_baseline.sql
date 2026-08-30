-- QIMA — Phase 0 migration tooling baseline
--
-- Traceability:
-- - Phase 0 scope item 7 (.codex/PHASE_0_EXECUTION_SCOPE.md §3):
--   "Database tooling/migration baseline without implementing business tables
--   prematurely."
-- - doc 10 §24: business schema (organization, unit, user, role, permission,
--   audit) is Phase 1 — Database Foundation and MUST NOT appear here.
--
-- Purpose: prove the migration pipeline applies reproducibly against a fresh
-- database. This migration is additive and non-destructive.

CREATE TABLE IF NOT EXISTS qima_schema_baseline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase TEXT NOT NULL,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO qima_schema_baseline (phase, description)
SELECT 'phase-0', 'QIMA migration tooling baseline established.'
WHERE NOT EXISTS (
  SELECT 1 FROM qima_schema_baseline WHERE phase = 'phase-0'
);
