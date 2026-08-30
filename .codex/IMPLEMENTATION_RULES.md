# QIMA — IMPLEMENTATION RULES v1.0

## 1. Purpose

These rules govern how Codex implements QIMA from the approved blueprint stack. They complement `AGENT_CAPABILITY_SPEC.md` and `QIMA_MASTER_EXECUTION_SPEC.md`.

The objective is to produce implementation that is traceable, testable, secure, maintainable, and faithful to the approved QIMA contracts.

## 2. Specification-First Rule

Before implementing a material feature, Codex MUST:

1. Identify the applicable blueprint document(s).
2. Identify the requirement, contract, acceptance criteria, and dependencies.
3. Inspect the current repository state.
4. Determine the smallest implementation scope that satisfies the contract.
5. Implement only after the above context is understood.

No implementation should be driven solely by an isolated user story when an authoritative QIMA contract already exists.

## 3. Traceability Rule

Every material code change MUST have a traceable reason.

Preferred traceability chain:

`Requirement → Capability → Module → Domain/Data → API → UI → Test`

When one of these layers is not applicable, Codex SHOULD explicitly state why.

## 4. Scope Rule

Codex MUST keep each change within the current execution scope.

Codex MUST NOT:

- Add speculative features.
- Introduce unrelated refactors.
- Replace approved architecture without cause.
- Expand MVP scope silently.
- Add dependencies when an existing approved dependency already solves the problem.

If a broader change is technically necessary, Codex MUST explain the dependency and impact before treating it as part of the implementation.

## 5. Architecture Rule

QIMA architecture MUST preserve clear separation between:

- Domain rules.
- Application/use-case orchestration.
- Infrastructure and persistence.
- API/transport concerns.
- UI/presentation concerns.
- Shared utilities and configuration.

Domain logic MUST NOT be hidden inside transport handlers or UI components when it represents reusable business rules.

Infrastructure details MUST NOT leak unnecessarily into domain contracts.

## 6. Domain Integrity Rule

Business invariants defined by QIMA contracts MUST be enforced at the appropriate authoritative boundary.

Codex MUST NOT rely solely on UI validation for security-sensitive or business-critical rules.

Validation SHOULD be layered:

`Input validation → Application validation → Domain invariant → Persistence constraint`

where applicable.

## 7. Data Rule

Database changes MUST be explicit and reproducible.

Codex MUST:

- Use migrations for schema changes.
- Preserve existing data unless destructive behavior is explicitly required.
- Define appropriate constraints and indexes.
- Avoid storing derived data when it can be safely computed unless the blueprint requires persistence.
- Keep seed data deterministic.
- Treat production data as immutable unless an approved migration requires transformation.

Destructive migrations require explicit review.

## 8. API Rule

API behavior MUST follow the approved API/domain contract.

For every material endpoint, Codex SHOULD define and validate:

- Request shape.
- Authentication requirements.
- Authorization requirements.
- Input validation.
- Business operation.
- Success response.
- Expected error responses.
- Idempotency behavior where relevant.
- Auditability where required.

API changes MUST NOT silently break established consumers.

## 9. Authorization Rule

Authorization MUST be enforced server-side.

The UI may hide unavailable actions, but UI hiding is never an authorization boundary.

Every protected operation MUST verify the acting principal and applicable organization/unit/resource scope before performing the operation.

Cross-organization or cross-unit data access MUST be denied unless explicitly authorized by the domain contract.

## 10. Multi-Tenancy / Isolation Rule

Where QIMA operates across organizations, units, branches, or other isolation boundaries, every relevant read and write MUST carry the correct scope.

Codex MUST treat missing scope as a security defect rather than defaulting to unrestricted access.

Queries MUST avoid accidental global reads when scoped reads are required.

## 11. UI Rule

UI implementation MUST follow the QIMA UX/UI specification.

Codex SHOULD:

- Reuse the defined design system.
- Keep screen responsibilities clear.
- Preserve predictable navigation.
- Represent loading, empty, success, validation-error, permission-denied, and system-error states where applicable.
- Avoid embedding business rules solely in presentation code.

UI should consume stable application/API contracts rather than recreate domain logic.

## 12. Error Handling Rule

Errors MUST be intentional and actionable.

Codex MUST NOT:

- Swallow exceptions silently.
- Return misleading success responses.
- Expose stack traces or secrets to end users.
- Use broad catch-and-ignore patterns to conceal defects.

Errors SHOULD preserve enough structured context for debugging while respecting security and privacy boundaries.

## 13. Security Rule

Security is a default requirement, not a later phase.

Codex MUST:

- Never hard-code secrets.
- Validate untrusted input.
- Apply least privilege.
- Protect authentication and authorization boundaries.
- Avoid unsafe dynamic execution.
- Avoid exposing sensitive internal details.
- Review dependency and configuration changes for security impact.

Security-sensitive changes require additional validation.

## 14. Dependency Rule

Prefer the existing project stack and approved dependencies.

A new dependency MUST have a concrete implementation reason and SHOULD be minimized when native or already-installed functionality is sufficient.

Codex MUST avoid unnecessary framework churn.

## 15. Testing Rule

Every material behavior change MUST have appropriate verification.

Test selection should follow the risk:

- Pure domain logic → unit tests.
- Persistence/application interaction → integration tests.
- API contract → API/integration tests.
- Critical user journey → end-to-end tests.
- Security boundary → explicit authorization/security tests.

Tests MUST validate behavior and acceptance criteria, not merely implementation details.

## 16. Test Integrity Rule

Codex MUST NOT modify or delete a failing test solely to make the build pass.

A test may be changed when:

- The specification changed legitimately.
- The test encoded an incorrect expectation.
- The implementation contract was clarified.

Such changes MUST be explained in the implementation report.

## 17. Validation Rule

Before declaring completion, Codex MUST run all relevant available checks, such as:

- Formatting.
- Linting.
- Type checking.
- Unit tests.
- Integration/API tests.
- End-to-end tests.
- Build/package validation.

If a required check cannot run because of environment limitations, Codex MUST report that limitation explicitly.

## 18. Repair Rule

When a validation fails, Codex MUST investigate before changing anything.

Repair loop:

`FAIL → CLASSIFY → ROOT CAUSE → REPAIR → RE-RUN → VERIFY`

Codex SHOULD fix the root cause rather than suppressing the symptom.

## 19. Refactoring Rule

Refactoring is allowed when it improves correctness, maintainability, or contract compliance within scope.

Refactoring MUST preserve externally required behavior unless the specification explicitly changes it.

Large unrelated refactors should be separated from feature implementation.

## 20. File and Module Rule

Files and modules SHOULD have one clear responsibility.

Codex SHOULD prefer cohesive modules and avoid:

- God modules.
- Circular dependencies.
- Duplicate business rules.
- Copy-pasted authorization logic.
- Hidden global mutable state.

Module boundaries should reflect the QIMA domain and implementation contracts.

## 21. Configuration Rule

Environment-specific configuration MUST be externalized.

Repository files MAY contain safe defaults and `.env.example` documentation, but MUST NOT contain real credentials, tokens, private keys, or production secrets.

## 22. Git Rule

Commits SHOULD be:

- Small enough to understand.
- Related to one coherent objective.
- Named clearly using an action-oriented message.
- Free of unrelated generated or temporary files.

Preferred pattern:

`<type>: <short description>`

Examples:

- `feat: implement organization scope validation`
- `fix: enforce unit authorization on member lookup`
- `test: add API authorization coverage`
- `docs: update implementation traceability`

## 23. Generated Artifacts Rule

Temporary build artifacts, local caches, secrets, editor files, and environment-specific output MUST NOT be committed unless explicitly required by the project contract.

## 24. Documentation Rule

When implementation changes an externally meaningful behavior, the relevant documentation or contract reference MUST be updated when required.

Documentation MUST describe the implementation that actually exists, not an aspirational future state.

## 25. Blueprint Modification Rule

Codex MUST treat the existing QIMA blueprint documents as authoritative inputs.

Codex MUST NOT silently rewrite them to match code.

If implementation reveals an inconsistency, Codex MUST:

1. Identify the exact conflict.
2. Explain its implementation impact.
3. Propose the smallest resolution.
4. Wait for an authoritative decision when the conflict affects scope, domain, security, or architecture.

## 26. Completion Report Rule

At the end of a material implementation task, Codex SHOULD report:

- What changed.
- Why it changed.
- Blueprint/requirement traceability.
- Files/modules affected.
- Tests and validation executed.
- Results.
- Known limitations.
- Remaining follow-up work.

## 27. Non-Negotiable Principle

The implementation is considered successful only when it is:

`SPEC-COMPLIANT + TRACEABLE + TESTED + VERIFIED + SAFE`

A green build alone is not sufficient evidence of QIMA correctness.
