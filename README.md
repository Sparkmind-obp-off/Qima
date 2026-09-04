# QIMA

QIMA — Quality & Integrated Management Application.

This repository is the implementation baseline for QIMA v1.0.

## Execution Baseline

Implementation follows:

`QIMA — MASTER TRACEABILITY MATRIX + IMPLEMENTATION EXECUTION PLAN v1.0`

## URLs

- **Production**: https://qima.pages.dev
- **Health**: https://qima.pages.dev/api/v1/health
- **Database health**: https://qima.pages.dev/api/v1/health/database
- **GitHub**: https://github.com/Sparkmind-obp-off/Qima

## Current Phase

- **Phase 0 — Project Bootstrap** — implemented and verified.
- **Phase 1 — Database Foundation** — implemented and verified.
- **Phase 2 — Authentication & Access** — implemented and verified end-to-end:
  credential security, sessions, login/logout, user context, deterministic role
  and permission resolution, server-owned organization/unit scope, reusable
  authorization middleware, and access-isolation tests.
- **Phase 3 — Organization & Unit** — implemented and verified end-to-end:
  organization and unit create/read/list/update APIs, organization ownership,
  server-owned scope, role/permission enforcement, cross-organization isolation,
  and IDOR regression coverage.
- **Phase 4 — Program** — implemented and verified end-to-end: scoped Program
  schema/domain/repository, create/read/list/update/delete API, Program list/detail/form
  UI, authorization, organization/unit isolation, and IDOR regression coverage.
- **Phase 5 — Activity** — implemented and verified end-to-end: Unit-owned Activity
  schema/domain/repository, optional same-Unit Program relationship, create/read/list/update/delete
  API, Activity list/detail/form UI, authorization, scope isolation, and IDOR coverage.

`QIMA_CURRENT_PHASE` (`apps/api/src/phase.ts`) reports `phase-5-activity` because
all doc 10 §24 Phase 5 exit criteria passed the repository quality gates.

Participant and all later business modules remain deliberately unimplemented.

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

## Phase 1 — Completed Baseline

- Identity / organization / unit schema with scope-isolation constraints
- Access control schema (roles, permissions, assignments)
- Audit and settings schema
- Repository contracts in the domain, D1 adapters in infrastructure
- Reference seed data, plus `/api/v1/database/*` schema-verification endpoints

## Phase 2 — Implemented Tasks

| Task  | Scope                                            | Status      |
| ----- | ------------------------------------------------ | ----------- |
| T2.01 | Credential policy + PBKDF2 password hashing       | Complete    |
| T2.02 | Session schema, token service, session repository | Complete    |
| T2.03 | Login API (`POST /api/v1/auth/login`)             | Complete    |
| T2.04 | Logout API (`POST /api/v1/auth/logout`)           | Complete    |
| T2.05 | User context (`GET /api/v1/auth/me`)               | Complete |
| T2.06 | Deterministic platform/organization/unit role resolution | Complete |
| T2.07 | Centralized `resource.action` permission resolution | Complete |
| T2.08 | Server-owned organization and unit scope context   | Complete |
| T2.09 | Reusable authentication/authorization middleware   | Complete |
| T2.10 | Authentication, role, permission, scope and IDOR tests | Complete |

T2.03 composes the pieces above rather than adding business rules of its own:

```text
request → transport shape check → credential lookup → password verification
        → account status rule → session token issuance → session persistence
        → authentication response
```

Layer ownership (doc 08 §10/§12):

- `apps/api/src/modules/auth/routes.ts` — transport only: JSON shape, header
  provenance, status mapping. It makes no authentication decision.
- `apps/api/src/application/authentication/login-user.ts` — the decision, and
  the anti-enumeration and session-issuance ordering guarantees.
- `apps/api/src/infrastructure/database/user-credential-repository.ts` — the
  single credential read.
- `packages/domain/src/authentication.ts` — the rules (`canAuthenticate`,
  `normalizeEmail`) and the `UserCredentialRepository` contract.
- `apps/api/src/application/authentication/logout-user.ts` — hashes the presented
  token, validates the session through domain rules, and revokes only that session.
- `apps/api/src/application/authentication/get-current-user.ts` — resolves an active
  bearer session to its still-active user and records successful session activity.

## Phase 3 — Implemented Tasks

| Task  | Scope | Status |
| ----- | ----- | ------ |
| T3.01 | Organization create/read/list/update | Complete |
| T3.02 | Unit create/read/list/update | Complete |
| T3.03 | Organization → Unit ownership and foreign-key relationship | Complete |
| T3.04 | Server-owned organization and unit scope | Complete |
| T3.05 | Role and `resource.action` unit authorization | Complete |
| T3.06 | Cross-organization, cross-unit, IDOR, and regression tests | Complete |

The authoritative API contract (doc 06 §24–§25) defines GET, POST, and PATCH for
organizations and units; unrestricted hard-delete endpoints are intentionally not
part of Phase 3. Unit ownership cannot be changed through the patch boundary.

Traceability:

- `ORG-001` → Organization domain → `organizations` → repository/use cases →
  `/api/v1/organizations` → organization authorization tests.
- `UNIT-001` → Unit domain → `units` → scoped repository/use cases →
  `/api/v1/units` → unit scope and isolation tests.
- `ACC-001` → persisted assignments → Phase 2 authorization middleware →
  protected Phase 3 routes → cross-scope/IDOR tests.

## Phase 4 — Implemented Tasks

| Task | Scope | Status |
| ---- | ----- | ------ |
| T4.01 | Program schema, constraints, indexes, and Unit foreign key | Complete |
| T4.02 | Program domain state and validation invariants | Complete |
| T4.03 | Unit-scoped Program repository | Complete |
| T4.04 | CreateProgram | Complete |
| T4.05 | UpdateProgram | Complete |
| T4.06 | ListPrograms with bounded pagination/filtering | Complete |
| T4.07 | Authenticated and authorized Program API | Complete |
| T4.08 | Program list, detail, create, and edit UI | Complete |
| T4.09 | Domain, migration, repository, API, UI, isolation, and IDOR tests | Complete |

Traceability: `PROG-001` → Program domain → `programs` → `ProgramRepository` →
CreateProgram / UpdateProgram / ListPrograms → `/api/v1/programs` → Program UI →
Phase 4 test suites. Program ownership remains immutable and server-enforced through
the authorized organization/unit context.

## Phase 5 — Implemented Tasks

| Task | Scope | Status |
| ---- | ----- | ------ |
| T5.01 | Activity schema, relationships, constraints, and indexes | Complete |
| T5.02 | Activity domain lifecycle and schedule validation | Complete |
| T5.03 | Unit-scoped Activity repository | Complete |
| T5.04 | Create/Read/Update/List/Delete Activity use cases | Complete |
| T5.05 | Authenticated and authorized Activity API | Complete |
| T5.06 | Activity list, detail, create, and edit UI | Complete |
| T5.07 | Domain, migration, repository, API, UI, security, and regression tests | Complete |

Traceability: `ACT-001` → Activity domain → `activities` → `ActivityRepository` →
CreateActivity / UpdateActivity / ListActivities → `/api/v1/activities` → Activity UI →
Phase 5 test suites. Activity Unit ownership is server-controlled; optional Program
associations are accepted only when the Program belongs to the same authorized Unit.

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

Phase 2 tasks T2.03–T2.05 add authentication entry points:

| Method | Path                  | Response       | Purpose                        |
| ------ | --------------------- | -------------- | ------------------------------ |
| POST   | `/api/v1/auth/login`  | 200 / 400 / 401 / 500 JSON | Authenticate and issue a session |
| POST   | `/api/v1/auth/logout` | 200 / 401 / 500 JSON       | Revoke the presented active session |
| GET    | `/api/v1/auth/me`     | 200 / 401 / 500 JSON       | Resolve user plus assigned access context |
| GET    | `/api/v1/auth/access/organizations/:organizationId/units/:unitId` | 200 / 401 / 403 / 500 JSON | Phase 2 protected authorization proof |

Phase 3 resource entry points (all require bearer authentication):

| Method | Path | Scope / purpose |
| ------ | ---- | --------------- |
| GET / POST | `/api/v1/organizations` | List assigned organizations / platform-authorized create |
| GET / PATCH | `/api/v1/organizations/:organizationId` | Scoped organization read/update |
| GET / POST | `/api/v1/units?organization_id=:organizationId` | Scoped unit list/create |
| GET / PATCH | `/api/v1/units/:unitId?organization_id=:organizationId` | Organization + unit scoped read/update |

Phase 4 Program entry points require bearer authentication plus an authorized
`organization_id` / `unit_id` scope pair:

| Method | Path | Scope / purpose |
| ------ | ---- | --------------- |
| GET / POST | `/api/v1/programs?organization_id=:organizationId&unit_id=:unitId` | Scoped list/create |
| GET / PATCH / DELETE | `/api/v1/programs/:programId?organization_id=:organizationId&unit_id=:unitId` | Scoped read/update/soft-delete |
| GET | `/programs` | Program list UI |
| GET | `/programs/new` | Program creation UI |
| GET | `/programs/:programId` | Program detail UI |
| GET | `/programs/:programId/edit` | Program edit UI |

Phase 5 Activity entry points require bearer authentication plus an authorized
`organization_id` / `unit_id` scope pair:

| Method | Path | Scope / purpose |
| ------ | ---- | --------------- |
| GET / POST | `/api/v1/activities?organization_id=:organizationId&unit_id=:unitId` | Scoped list/create; optional `program_id`, `status`, `search`, `page`, and `limit` filters |
| GET / PATCH / DELETE | `/api/v1/activities/:activityId?organization_id=:organizationId&unit_id=:unitId` | Scoped read/update/soft-delete |
| GET | `/activities` | Activity list UI |
| GET | `/activities/new` | Activity creation UI |
| GET | `/activities/:activityId` | Activity detail UI |
| GET | `/activities/:activityId/edit` | Activity edit UI |

Request body (doc 06 §23) — JSON only, no query parameters:

```json
{ "email": "user@example.com", "password": "…" }
```

Success response:

```json
{
  "ok": true,
  "data": {
    "user": { "id": "…", "name": "…", "email": "…", "status": "active" },
    "access_token": "…",
    "expires_at": "2026-01-01T12:00:00Z"
  }
}
```

Status contract:

- `400 VALIDATION_ERROR` — body is not JSON, or `email`/`password` is missing,
  non-string, empty, or the password exceeds 256 characters (a CPU-exhaustion
  bound on an unauthenticated endpoint).
- `401 UNAUTHENTICATED` — wrong password, unknown email, non-active account, or
  a soft-deleted account. All four return a **byte-identical** body, because a
  differentiated response would reveal which emails are registered
  (doc 06 §42). The password is verified on every path — including the unknown
  account path, against a decoy hash — so response latency cannot be used as an
  enumeration oracle either.
- `500 INTERNAL_ERROR` — the D1 binding is missing or a query failed. An
  infrastructure fault is never reported as invalid credentials.

The `access_token` is returned exactly once; only its SHA-256 hash is stored in
`sessions.token_hash`. No path accepts credentials in a URL — `GET
/api/v1/auth/login` is 404, so credentials cannot be captured by access logs.

No other path accepts query parameters.

Logout requires `Authorization: Bearer <access_token>`. A successful request returns
`{ "ok": true, "data": { "logged_out": true } }`. Missing, malformed, unknown,
expired, and already-revoked tokens all return the same `401 UNAUTHENTICATED`
response, so the endpoint cannot disclose session state. The raw token is hashed
before lookup and never reaches D1.

`GET /api/v1/auth/me` uses the same strict bearer boundary. It returns only the
public user projection (`id`, `name`, `email`, `status`) for an active session whose
user still exists and remains active, then updates `sessions.last_used_at`. A user
suspended, deactivated, or soft-deleted after login is rejected. Organization,
unit, role, and permission context is resolved from explicit server-owned
assignments. Client-supplied identifiers never grant access by themselves.

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
- **Schema**: migrations `0000`–`0003` deliver the Phase 1 identity, access
  control, audit and settings schema; migration `0004` adds sessions, `0005`
  adds explicit platform-role assignments, `0006` adds the Unit-owned Program
  schema, and additive migration `0007` adds Activity plus same-Unit Program integrity.
- **Credential boundary**: `users.password_hash` is selected by exactly ONE
  module, `apps/api/src/infrastructure/database/user-credential-repository.ts`.
  The general user read (`createUserRepository`) selects an explicit column list
  that excludes it, so credential material cannot leak through a profile,
  listing or reporting read. This is asserted by a test, not only by convention.
- **Sessions**: store a hex SHA-256 `token_hash`, never a raw token. Lifetime is
  an absolute 12 hours (`SESSION_TTL_SECONDS`), not an idle timeout, so a leaked
  token has a hard ceiling on its value.
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

- `tests/unit/` — config/shared primitives, Phase 2 authentication and
  authorization, Phase 3 organization/unit rules, Phase 4 Program invariants, and
  Phase 5 Activity lifecycle/schedule invariants.
- `tests/api/` — authentication contracts plus organization/unit/Program/Activity
  success, validation, permission, Program relationship, cross-scope, query tampering,
  pagination enumeration, and IDOR behavior.
- `tests/integration/` — surface composition, request boundary, build artifact,
  migrations, repository isolation, credential persistence, organization/unit and
  Program and Activity persistence, foreign keys, scoped mutation, and Program/Activity UI routes.
- `tests/e2e/` — reserved for later browser-level journeys and excluded from
  `npm test` so an empty suite is never misreported as coverage.

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
- **Runtime verification**: `/`, `/programs`, `/api/v1/health`, `/api/v1/meta`,
  `/api/v1/health/database`, authentication routes, protected organization/unit
  and Program routes, static assets, and the later-phase 404 boundary.
- **Status**: Active at https://qima.pages.dev. Phase 0–5 are verified locally;
  production health, database connectivity, Phase 5 metadata/UI, the protected
  Activity authentication boundary, and post-Phase-5 routes were verified after deployment.
- **Production data**: D1 migrations `0000`–`0007` are applied to
  `qima-production`; deterministic role/permission seeds, including Program and
  Activity permissions with their scoped role grants, are applied.
- **Last deployed**: 2026-09-04 via the BYOK Cloudflare Pages workflow
  (`https://caf22bc0.qima.pages.dev`, promoted at `https://qima.pages.dev`).

Deployment uses the account-owned `qima` Pages project and `qima-production`
D1 database. The committed `database_id` remains a safe placeholder; the account
owner supplies the real binding and any secret only during deployment. The Phase 5
production deployment is linked to Git commit `c07103e`.

## Not Yet Implemented

- Audit logging of authentication events. `LOGIN` is in the doc 06 §15 action
  vocabulary and migration 0003 anticipates it, but an honest trail needs the
  tenant scope resolved by T2.05/T2.08 and a transactional boundary the current
  `QimaDatabase` contract does not expose. Recorded as a known limitation rather
  than half-implemented.
- Login rate limiting / lockout. The endpoint bounds password length and
  equalizes response timing, but throttling repeated attempts needs a shared
  counter (D1 or KV) and belongs with the wider authentication hardening task.
- Participant lifecycle and API (Phase 6)
- Product UI screens beyond the bootstrap shell, Program, and Activity screens,
  including login and later resource screens
- Browser-level end-to-end critical journey tests
- Reporting, billing and external integrations (later phases)

## Next Recommended Step

Phase 5 is complete. Keep Phase 6 Participant unimplemented until its execution cycle
is explicitly authorized; preserve the verified Program → Activity scope boundary.
