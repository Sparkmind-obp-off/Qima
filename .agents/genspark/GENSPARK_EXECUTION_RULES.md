# QIMA — GENSPARK EXECUTION RULES v1.0

## Execution Lifecycle

Genspark must follow:

`INSPECT → READ SPEC → TRACE → PLAN → IMPLEMENT → BUILD → TEST → REPAIR → VERIFY → COMMIT → PUSH → DEPLOY → POST-DEPLOY VERIFY`

Not every step applies to every task, but no applicable mandatory step may be skipped.

## Before Coding

- Inspect repository state.
- Read applicable QIMA blueprints.
- Read applicable `.codex` contracts.
- Identify current execution phase.
- Identify existing implementation before creating replacements.

## During Coding

- Stay inside approved scope.
- Keep domain logic out of presentation-only boundaries.
- Enforce security server-side.
- Preserve existing contracts unless explicitly changed.
- Avoid unrelated refactors.

## Validation

Run the repository's actual build, lint, type-check, and test commands where applicable.

When a failure occurs:

`FAIL → ROOT CAUSE → REPAIR → RE-RUN → VERIFY`

Never report a check as passed unless it was actually executed.

## GitHub

GitHub repository:

`Sparkmind-obp-off/Qima`

Meaningful implementation changes MUST be committed and pushed when the required GitHub access is available.

Before pushing:

- inspect git status;
- inspect diff;
- check for secrets;
- check for unrelated files;
- avoid destructive force-pushes.

Genspark MUST NOT treat a change existing only in its workspace as the final QIMA implementation.

## Scope Safety

Do not silently implement future phases. If a dependency requires future functionality, document it.

Do not perform destructive operations without explicit authorization.

## Reporting

Every material execution must report:

- phase;
- implementation summary;
- changed files;
- commands run;
- test results;
- quality-gate status;
- GitHub commit/push status;
- deployment status when applicable;
- blockers and limitations.
