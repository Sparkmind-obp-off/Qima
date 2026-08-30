# QIMA — QUALITY GATES v1.0

## 1. Purpose

This document defines the mandatory quality gates that must be satisfied before QIMA work is considered complete, merge-ready, or releasable.

Quality is not equivalent to a green build. QIMA changes must be specification-compliant, behaviorally correct, secure, traceable, and validated at the appropriate level.

## 2. Gate Model

Every material implementation follows:

`SPEC → TRACE → IMPLEMENT → BUILD → TEST → SECURITY → VERIFY → ACCEPT`

A gate may be marked `PASS`, `FAIL`, or `BLOCKED`.

`BLOCKED` means the required evidence could not be produced because of an environment, dependency, specification, or external-system limitation. A blocked gate MUST NOT be reported as passed.

## 3. Gate 0 — Specification Integrity

### PASS criteria

- Applicable QIMA blueprint(s) identified.
- Requirement and acceptance criteria identified.
- Implementation scope is explicit.
- Dependencies and assumptions are known.
- No unresolved specification conflict affects the task.

### FAIL conditions

- Implementation proceeds against an unknown or conflicting contract.
- Requirements are silently reinterpreted.
- Scope is expanded without authorization.

## 4. Gate 1 — Traceability

### PASS criteria

The change can be traced through the applicable chain:

`Requirement → Capability → Module → Domain/Data → API → UI → Test`

Not every layer must exist for every change, but omitted layers must be demonstrably not applicable.

### Evidence

- Requirement/reference.
- Changed files/modules.
- Relevant tests.
- Traceability update when required.

## 5. Gate 2 — Architecture

### PASS criteria

- Module boundaries remain consistent with the approved architecture.
- Domain rules are separated from transport/presentation concerns.
- Infrastructure dependencies do not unnecessarily leak into domain logic.
- No unnecessary framework or dependency churn.
- No circular dependency or obvious architectural regression is introduced.

### FAIL conditions

- Feature logic is duplicated across layers.
- Security or business rules exist only in the UI.
- An implementation bypasses an established contract without documented justification.

## 6. Gate 3 — Build and Static Validation

Run all applicable repository checks, including:

- Format check.
- Lint.
- Type check.
- Compile/build.
- Static analysis where configured.

### PASS criteria

All required checks pass with no known implementation error.

### BLOCKED criteria

A required check cannot execute because of a documented environment or external dependency issue.

## 7. Gate 4 — Unit Tests

### PASS criteria

- Core domain logic has appropriate unit coverage.
- Business invariants have explicit tests where practical.
- Edge cases relevant to the changed behavior are covered.
- Tests pass.

Tests must validate behavior rather than merely increasing coverage percentages.

## 8. Gate 5 — Integration and Data Tests

For changes involving persistence, application services, or integrations:

### PASS criteria

- Database interactions behave according to the data contract.
- Migrations apply successfully.
- Relevant constraints and indexes behave as intended.
- Transactional behavior is validated where required.
- Integration tests pass.

Destructive migration behavior requires explicit review.

## 9. Gate 6 — API Contract

For API changes:

### PASS criteria

- Request validation works.
- Authentication requirements are enforced.
- Authorization requirements are enforced server-side.
- Success responses match the contract.
- Expected errors are represented correctly.
- Relevant idempotency behavior is validated.
- Existing consumers are not silently broken.

## 10. Gate 7 — Authorization and Isolation

This gate is mandatory for protected QIMA functionality.

### PASS criteria

- Unauthenticated access is rejected where required.
- Unauthorized roles/actions are rejected.
- Resource-level access is enforced.
- Organization/unit/tenant boundaries are enforced where applicable.
- Cross-scope access attempts fail safely.
- UI restrictions are not relied upon as the security boundary.

### FAIL conditions

Any confirmed unauthorized read, write, mutation, or scope escape is an immediate quality failure.

## 11. Gate 8 — UX/UI Behavior

For user-facing changes:

### PASS criteria

- Screens follow the approved UX/UI specification.
- Navigation is consistent.
- Loading state is handled where needed.
- Empty state is handled where needed.
- Validation errors are understandable.
- Permission-denied state is handled where relevant.
- System errors are represented safely.
- Accessibility and interaction requirements applicable to the screen are validated.

## 12. Gate 9 — End-to-End Critical Journeys

Critical user journeys MUST be verified end-to-end when applicable.

### PASS criteria

The journey succeeds from the user's entry point through the relevant UI, API/application layer, persistence, and resulting state.

At minimum, critical paths should cover their primary success and important failure/authorization cases.

## 13. Gate 10 — Security and Secrets

### PASS criteria

- No secrets are committed.
- No credentials are hard-coded.
- Sensitive error details are not exposed.
- Input boundaries are validated.
- Authorization is enforced server-side.
- Security-sensitive dependencies/configuration are reviewed.
- Logs do not expose sensitive values.

Any confirmed secret exposure is an immediate failure.

## 14. Gate 11 — Regression Safety

### PASS criteria

- Existing relevant tests continue to pass.
- No unrelated behavior is intentionally broken.
- Changed contracts have compatibility impact assessed.
- Regressions discovered during implementation are repaired or explicitly documented as blockers.

## 15. Gate 12 — Repair Verification

A change that required a repair is not complete until the repaired failure is re-tested.

Required loop:

`FAIL → ROOT CAUSE → REPAIR → RE-RUN → PASS`

The original failing command/test must be re-run after the repair whenever technically possible.

## 16. Gate 13 — Documentation and Traceability Update

### PASS criteria

- Documentation reflects actual implemented behavior.
- Relevant blueprint/contract references remain accurate.
- Traceability records are updated when required.
- Known limitations are documented.

Documentation MUST NOT claim functionality that has not been implemented and verified.

## 17. Gate 14 — Git Hygiene

### PASS criteria

- Changes are scoped to the intended task.
- No secrets or temporary artifacts are committed.
- Commit messages clearly describe the change.
- Generated files are committed only when intentionally required.
- The working change set is understandable and reviewable.

## 18. Definition of READY

A material change is `READY` only when:

- Specification Gate = PASS.
- Traceability Gate = PASS.
- Architecture Gate = PASS.
- Required build/static checks = PASS.
- Required tests = PASS.
- Required security/isolation checks = PASS.
- Relevant UX/API/data gates = PASS.
- No unresolved critical defect exists.
- Any non-critical limitation is documented.

## 19. Definition of DONE

A change is `DONE` only when it is:

`SPEC-COMPLIANT + IMPLEMENTED + TESTED + SECURE + TRACEABLE + VERIFIED`

A change must NOT be marked DONE when a mandatory gate is `FAIL` or when a critical gate is `BLOCKED` without an explicit release decision.

## 20. Release Blockers

The following automatically block completion/release until resolved or explicitly waived by an authorized decision-maker:

- Security vulnerability affecting the changed behavior.
- Unauthorized data access or scope escape.
- Data corruption risk.
- Broken critical user journey.
- Failing mandatory acceptance test.
- Unresolved specification conflict affecting correctness.
- Secret/credential exposure.
- Destructive migration without approval.
- Known critical regression.

## 21. Evidence Requirement

For each material task, Codex SHOULD provide a compact evidence record containing:

```text
Task:
Specification:
Traceability:
Implementation:
Validation commands:
Test results:
Security checks:
Known limitations:
Commit:
Final gate status:
```

## 22. Final Principle

QIMA does not accept “it builds” as the definition of quality.

The final standard is:

`BUILD → TEST → SECURITY → TRACEABILITY → SPECIFICATION → VERIFIED BEHAVIOR`

Only verified behavior that satisfies the approved QIMA contract may pass the quality gates.
