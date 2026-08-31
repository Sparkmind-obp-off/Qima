-- QIMA — Phase 1 (Database Foundation) migration 0001
-- Tasks: T1.03 Base schema, T1.04 Organization schema, T1.05 Unit schema.
--
-- Traceability:
-- - doc 10 §24 PHASE 1 — DATABASE FOUNDATION (T1.01-T1.10).
-- - doc 06 §4 Organization Domain, §5 Unit Domain, §6 Site Domain,
--   §7 Domain Mapping, §39 ID Policy (UUID), §40 Timestamp Policy (UTC),
--   §41 Database Index Policy, §48 MVP Database Boundary.
-- - doc 06 §37 Domain Invariants: Unit.organization_id must reference an
--   existing Organization; Unit.slug unique within Organization.
--
-- Non-destructive and additive: no DROP, no data transformation
-- (.codex/IMPLEMENTATION_RULES.md §7 Data Rule).
--
-- Portability note: D1 is SQLite. Blueprint types map as
--   UUID -> TEXT, VARCHAR -> TEXT, TIMESTAMP -> TEXT (ISO-8601 UTC),
--   JSONB -> TEXT holding a JSON document, BOOLEAN -> INTEGER 0/1.
-- Every timestamp default is UTC to satisfy doc 06 §40.

-- ---------------------------------------------------------------------------
-- T1.04 — organizations (doc 06 §4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT,
  CONSTRAINT organizations_slug_unique UNIQUE (slug),
  CONSTRAINT organizations_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT organizations_slug_format CHECK (slug GLOB '[a-z0-9]*' AND slug NOT GLOB '*[^a-z0-9-]*')
);

-- doc 06 §41: organizations.slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);

-- ---------------------------------------------------------------------------
-- T1.05 — units (doc 06 §5)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general'
    CHECK (type IN ('general', 'school', 'boarding', 'community', 'branch')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT,
  -- doc 06 §37: Unit.organization_id must reference an existing Organization.
  CONSTRAINT units_organization_fk FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE RESTRICT,
  -- doc 06 §5: UNIQUE(organization_id, slug) — slug is unique per organization,
  -- deliberately NOT globally unique.
  CONSTRAINT units_organization_slug_unique UNIQUE (organization_id, slug),
  CONSTRAINT units_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT units_slug_format CHECK (slug GLOB '[a-z0-9]*' AND slug NOT GLOB '*[^a-z0-9-]*')
);

-- doc 06 §41: units.organization_id, units(organization_id, slug)
CREATE INDEX IF NOT EXISTS idx_units_organization_id ON units (organization_id);
CREATE INDEX IF NOT EXISTS idx_units_organization_slug ON units (organization_id, slug);

-- ---------------------------------------------------------------------------
-- sites (doc 06 §6) — required by the MVP database boundary (doc 06 §48) and
-- by domain resolution (doc 06 §7).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  -- JSONB -> TEXT holding a JSON document; validated by the application layer.
  branding_config TEXT NOT NULL DEFAULT '{}',
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  deleted_at TEXT,
  CONSTRAINT sites_unit_fk FOREIGN KEY (unit_id)
    REFERENCES units (id) ON DELETE RESTRICT,
  CONSTRAINT sites_unit_slug_unique UNIQUE (unit_id, slug),
  CONSTRAINT sites_name_not_blank CHECK (length(trim(name)) > 0)
);

-- doc 06 §41: sites.unit_id
CREATE INDEX IF NOT EXISTS idx_sites_unit_id ON sites (unit_id);

-- ---------------------------------------------------------------------------
-- domain_mappings (doc 06 §7) — domain resolution precedes operational scope.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domain_mappings (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom'
    CHECK (type IN ('custom', 'subdomain', 'platform')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'disabled')),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  CONSTRAINT domain_mappings_site_fk FOREIGN KEY (site_id)
    REFERENCES sites (id) ON DELETE CASCADE,
  -- doc 06 §7: domain is globally UNIQUE — a hostname resolves to exactly one site.
  CONSTRAINT domain_mappings_domain_unique UNIQUE (domain),
  CONSTRAINT domain_mappings_domain_lowercase CHECK (domain = lower(domain))
);

-- doc 06 §41: domain_mappings.domain, domain_mappings.site_id
CREATE INDEX IF NOT EXISTS idx_domain_mappings_domain ON domain_mappings (domain);
CREATE INDEX IF NOT EXISTS idx_domain_mappings_site_id ON domain_mappings (site_id);

-- At most one primary domain per site. A partial unique index is used because
-- the constraint applies only to rows where is_primary = 1.
CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_mappings_one_primary_per_site
  ON domain_mappings (site_id) WHERE is_primary = 1;
