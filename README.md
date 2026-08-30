# QIMA

QIMA — Quality & Integrated Management Application.

This repository is the implementation baseline for QIMA v1.0.

## Execution Baseline

Implementation follows:

`QIMA — MASTER TRACEABILITY MATRIX + IMPLEMENTATION EXECUTION PLAN v1.0`

## Current Phase

**Phase 0 — Project Bootstrap** — implemented and verified.

Phase 0 delivers the engineering foundation only. Product functionality
(authentication, organizations, units, programs, dashboards) belongs to
Phase 1+ and is deliberately not implemented — see
[`.codex/PHASE_0_EXECUTION_SCOPE.md`](.codex/PHASE_0_EXECUTION_SCOPE.md) §4
Explicit Non-Goals.

## Principles

- Contract-first implementation
- Scope-safe architecture
- Server-side authorization
- Multi-unit / multi-organization isolation
- Test-driven quality gates
- Reproducible deployment

## Repository Structure

```text
apps/
  web/            presentation surface (bootstrap shell only in Phase 0)
  api/            API transport surface (infrastructure endpoints only)
packages/
  domain/         pure domain layer (no HTTP / DB / provider imports)
  shared/         response envelope + error taxonomy
  config/         the ONLY module allowed to read raw environment values
database/
  migrations/     D1 migrations (canonical path, doc 08 §4)
  seeds/          Phase 1 seed data
tests/
  unit/           domain, shared and config units
  integration/    surface composition, request boundary, build artifact
  api/            API contract tests
  e2e/            Phase 3+ (excluded from the default test run)
scripts/quality/  architecture lint + format check
docs/
  qima-blueprints/  authoritative QIMA blueprint stack
.codex/           execution contracts and quality gates
.agents/genspark/ engineering, execution and deployment specs
.github/workflows/ CI quality-gate baseline
src/index.ts      deployment entry point (composes web + api)
```

See [`docs/qima-blueprints/README.md`](docs/qima-blueprints/README.md) for the
ordered QIMA blueprint stack covering product, architecture, data, UX/UI,
implementation, QA, and execution contracts.

## Phase 0 — Completed Baseline

- Repository structure and npm workspaces (`apps/*`, `packages/*`)
- Module boundaries: `domain` (pure), `shared` (envelope), `config` (env access)
- Web surface: bootstrap shell driven by design tokens (doc 07 §11)
- API surface: infrastructure endpoints under `/api/v1`
- Terminal request boundaries (404 / 500) that survive Pages bundling
- Environment contract (`.env.example`) with no real secrets
- D1 migration tooling baseline (`database/migrations`)
- Quality tooling: architecture lint, format check, type-check, build, tests
- CI quality-gate workflow
- Cloudflare Pages build + local runtime verified

## Functional Entry Points

| Method | Path                      | Response      | Purpose                                        |
| ------ | ------------------------- | ------------- | ---------------------------------------------- |
| GET    | `/`                       | 200 HTML      | Bootstrap shell (proves the deployment is live) |
| GET    | `/api/v1/health`          | 200 JSON      | Liveness probe                                  |
| GET    | `/api/v1/meta`            | 200 JSON      | Deployment metadata (booleans only, no secrets) |
| GET    | `/api/v1/health/database` | 200 / 500 JSON | D1 connectivity probe                          |
| ANY    | `/api/**` (unmatched)     | 404 JSON      | `NOT_FOUND` envelope, never HTML                |
| ANY    | `/**` (unmatched)         | 404 JSON      | `NOT_FOUND` envelope                            |
| GET    | `/static/tokens.css`      | 200 CSS       | Design tokens                                   |
| GET    | `/static/bootstrap.js`    | 200 JS        | Shell client script                             |

No path accepts query parameters in Phase 0.

### Response Envelope

Every API response uses the canonical envelope (doc 05 §12):

```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "…" } }
```

Error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `SCOPE_VIOLATION`, `INTERNAL_ERROR`.

## Data Architecture

- **Storage**: Cloudflare D1 (binding `DB`, database `qima-production`)
- **Migrations**: `database/migrations`, applied via wrangler
- **Phase 0 schema**: `qima_schema_baseline` only — a migration-tooling marker.
  No business tables exist yet; entities are owned by Phase 1
  (doc 10 §24 Phase 1 — Database Foundation).
- **Secrets**: never in the repository. `AUTH_SECRET` and any provider token are
  provisioned as deployment secrets; `.dev.vars` (git-ignored) is used locally.
- **`database_id` in `wrangler.jsonc`** is an all-zero placeholder, not a real
  identifier. Local runs resolve the database by name; the deploying account
  owner substitutes the provisioned UUID.

## Developer Setup

```bash
# Requirements: Node.js >= 22, npm >= 10
npm install

# Apply the D1 migration baseline to the local database
npm run db:migrate:local

# Full quality gate chain (format, lint, type-check, build, test)
npm run verify

# Local runtime (Cloudflare Workers runtime via wrangler)
npm run build
npm run dev:sandbox        # http://localhost:3000
```

Verify a running instance:

```bash
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/health/database
```

### Available Commands

| Command                    | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `npm run verify`           | Full quality gate chain                       |
| `npm run build`            | Cloudflare Pages build into `./dist`          |
| `npm run typecheck`        | `tsc --noEmit`                                |
| `npm run lint`             | QIMA architecture lint                        |
| `npm run format:check`     | Formatting gate                                |
| `npm test`                 | Unit + integration + API tests                |
| `npm run db:migrate:local` | Apply migrations to the local D1 instance     |
| `npm run db:migrate:prod`  | Apply migrations to the remote D1 instance    |
| `npm run dev:sandbox`      | Run the built worker on port 3000             |

## Testing

The suite follows the doc 09 testing pyramid:

- `tests/unit/` — config resolution, shared envelope, domain scope rules
- `tests/api/` — API contract and secret-leakage assertions
- `tests/integration/` — surface composition, request boundary, build artifact
- `tests/e2e/` — Phase 3+, excluded from `npm test` so an empty suite can never
  be misreported as coverage

`tests/integration/build-artifact.test.ts` asserts the **built** `dist/_worker.js`.
This is deliberate: source-level tests cannot detect a bundling failure, and two
real Phase 0 defects (a wrong plugin entry point, and terminal boundaries being
dropped during bundling) passed every source test while failing at runtime.

## Deployment

- **Platform**: Cloudflare Pages (Workers runtime)
- **Build output**: `./dist` (`_worker.js` + `static/`)
- **Entry point**: `src/index.ts` (declared explicitly in `vite.config.ts`;
  the plugin default `src/index.tsx` does not exist in this repository)
- **Tech stack**: Hono + TypeScript + Vite + Cloudflare D1
- **Runtime verification**: `/`, `/api/v1/health`, `/api/v1/meta`,
  `/api/v1/health/database`, static assets and the 404 boundary
- **Status**: Phase 0 verified locally on the Workers runtime

Deployment requires a Cloudflare account with a provisioned D1 database; the
account owner supplies `database_id` and any secret at deploy time.

## Not Yet Implemented (Phase 1+)

- Authentication and session handling (Phase 2)
- Organization / unit / program domain entities and endpoints (Phase 1)
- Business database schema and seed data (Phase 1)
- Product UI screens beyond the bootstrap shell (Phase 3+)
- End-to-end critical journey tests (Phase 3+)
- Reporting, billing and external integrations (later phases)

## Next Recommended Step

Phase 1 — Database Foundation (doc 10 §24): define the approved organization /
unit / program entities as D1 migrations, with scope-isolation tests before any
endpoint is exposed.
