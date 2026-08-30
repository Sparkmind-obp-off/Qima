# QIMA — PHASE 0 EXECUTION SCOPE v1.0

## 1. Mission

Execute Phase 0 of QIMA as the repository and engineering foundation phase.

The goal is to make the repository structurally ready for implementation without prematurely building product functionality that belongs to later phases.

## 2. Mandatory Inputs

Before changing code, Codex MUST read:

- `docs/qima-blueprints/` and identify the authoritative QIMA blueprint documents available there.
- `.codex/AGENT_CAPABILITY_SPEC.md`
- `.codex/QIMA_MASTER_EXECUTION_SPEC.md`
- `.codex/IMPLEMENTATION_RULES.md`
- `.codex/QUALITY_GATES.md`
- `README.md`
- Existing repository configuration and source files.

Codex MUST inspect the actual repository state rather than assuming the repository matches an expected template.

## 3. Phase 0 Scope

Phase 0 covers:

1. Repository structure validation.
2. Development/runtime baseline identification.
3. Package/workspace configuration where required by the approved architecture.
4. Environment configuration baseline using safe example values only.
5. Application/API skeleton only where required by the approved architecture.
6. Shared/domain package boundaries where required.
7. Database tooling/migration baseline without implementing business tables prematurely.
8. Test runner and quality-tool baseline.
9. CI/validation baseline when supported by the repository architecture.
10. Local developer setup documentation.
11. Verification of the Phase 0 quality gates.

## 4. Explicit Non-Goals

Phase 0 MUST NOT prematurely implement:

- Full business modules.
- Production domain workflows.
- Unapproved database entities.
- Unapproved API endpoints.
- Final UI screens beyond an infrastructure-required shell.
- Billing/payment functionality.
- Production secrets or credentials.
- Destructive database operations.
- Speculative integrations.

If a Phase 1+ capability appears necessary, Codex MUST document the dependency instead of silently expanding Phase 0.

## 5. Execution Procedure

Codex MUST follow this sequence:

### Step 1 — Inspect

Inventory the repository, existing files, package manager, runtime, build configuration, tests, documentation, and blueprint files.

### Step 2 — Trace

Map the required Phase 0 foundation to the applicable blueprint and repository contracts.

### Step 3 — Plan

Produce a concise implementation plan identifying:

- files to create/change;
- tools/commands to run;
- dependencies;
- risks;
- expected verification evidence.

### Step 4 — Implement

Implement the smallest complete foundation required by the approved architecture.

### Step 5 — Execute

Run the available setup, build, type-check, lint, and test commands relevant to the repository.

### Step 6 — Repair

Fix failures at the root cause. Do not suppress failing checks or weaken tests solely to obtain a green result.

### Step 7 — Verify

Confirm that the Phase 0 foundation matches the blueprint, repository rules, and quality gates.

### Step 8 — Report

Report changed files, commands executed, results, blockers, and remaining work.

### Step 9 — Commit

Create a scoped commit only after the relevant gates pass. If a critical gate is blocked, do not represent the phase as complete.

## 6. Phase 0 Deliverables

Expected deliverables are determined by the actual repository architecture, but may include:

```text
repository configuration
package/workspace configuration
safe environment example
application/API skeleton
shared/domain boundaries
database migration tooling baseline
test configuration
lint/type-check/build configuration
CI validation configuration
developer setup documentation
Phase 0 verification evidence
```

Codex MUST NOT create an artifact merely because it appears in this list if the approved architecture does not require it.

## 7. Acceptance Criteria

Phase 0 passes only when:

- The repository can be installed/configured using documented steps.
- The intended development runtime is reproducible.
- The project can execute its baseline build/check commands.
- The test framework is operational where required.
- The database tooling baseline is reproducible where required.
- Environment configuration contains no real secrets.
- Repository/module boundaries are consistent with the approved architecture.
- No unauthorized product functionality was introduced.
- Relevant security and isolation foundations are not bypassed.
- Quality gates applicable to Phase 0 pass.
- Any blocked validation is explicitly documented.

## 8. Stop Conditions

Codex MUST STOP and report a blocker when:

- Blueprint conflicts cannot be resolved safely.
- Required architecture information is missing and cannot be inferred without material risk.
- A requested change would redefine product scope.
- A destructive operation is required but not approved.
- Required external credentials/secrets are unavailable.
- Repository state indicates an unexpected incompatible architecture.

## 9. Phase 0 Exit Record

The final report MUST contain:

```text
Phase: 0 — Project Bootstrap
Status: PASS | BLOCKED | FAIL
Blueprints inspected:
Files changed:
Commands executed:
Build result:
Test result:
Lint/type-check result:
Database baseline result:
Security result:
Quality gates:
Known limitations:
Next phase:
Commit:
```

## 10. Next Phase Boundary

A successful Phase 0 establishes the engineering foundation only.

The next implementation phase must be derived from the approved QIMA Master Traceability Matrix and execution plan. Codex MUST NOT self-promote Phase 1 functionality into Phase 0 merely because the foundation is available.
