# QIMA

QIMA — Quality & Integrated Management Application.

This repository is the implementation baseline for QIMA v1.0.

## Execution Baseline

Implementation follows:

`QIMA — MASTER TRACEABILITY MATRIX + IMPLEMENTATION EXECUTION PLAN v1.0`

## Current Phase

**Phase 0 — Project Bootstrap**

## Principles

- Contract-first implementation
- Scope-safe architecture
- Server-side authorization
- Multi-unit / multi-organization isolation
- Test-driven quality gates
- Reproducible deployment

## Planned Structure

```text
apps/
  web/
  api/
packages/
  domain/
  shared/
  config/
database/
  migrations/
  seeds/
tests/
  unit/
  integration/
  api/
  e2e/
docs/
  qima-blueprints/
```

See [`docs/qima-blueprints/README.md`](docs/qima-blueprints/README.md) for the ordered QIMA blueprint stack covering product, architecture, data, UX/UI, implementation, QA, and execution contracts.


## Phase 0 Bootstrap

This repository is bootstrapped as an npm workspace with separate web/API application surfaces and shared packages.

### Commands

```bash
npm install
npm run build
npm run lint
npm run format:check
npm run typecheck
npm test
```

Start targets are provided for the Phase 0 web and API bootstraps:

```bash
npm run start:web
npm run start:api
```
