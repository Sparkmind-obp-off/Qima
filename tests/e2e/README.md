# QIMA End-to-End Tests

End-to-end coverage is defined by doc 09 §4 (Testing Pyramid) and Quality
Gate 9 (End-to-End Critical Journeys).

## Phase 0 status

**No E2E specs exist yet — intentionally.**

Quality Gate 9 applies to *critical user journeys*. Phase 0 implements no user
journey: there is no authentication, no organization/unit management, and no
product screen (`.codex/PHASE_0_EXECUTION_SCOPE.md` §4). Writing an E2E spec now
would test the bootstrap shell, not a journey, and would create a misleading
quality signal.

Phase 0 verification is therefore covered by:

- `tests/unit/` — config, domain scope invariants, response envelope
- `tests/api/` — `/api/v1` transport contract
- `tests/integration/` — web + API composition
- post-deployment HTTP verification of the live deployment

## First required E2E journey

**Phase 2 — Authentication & Access** (doc 10 §24): login success, login
failure, and rejection of unauthenticated access to a protected route.

This directory is excluded from the default `npm test` run (see
`vitest.config.ts`) so that an empty E2E suite can never be misreported as
passing coverage.
