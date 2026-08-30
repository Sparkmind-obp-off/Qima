# QIMA — GENSPARK ENGINEERING SPEC v1.0

## Purpose

Define Genspark Code's role as the QIMA full-stack builder/executor while keeping QIMA specifications and GitHub as the source of truth.

## Role

Genspark Code acts as the **Full-Stack Builder & Execution Agent**.

Responsibilities may include:

- repository inspection;
- blueprint-driven implementation;
- frontend;
- backend/API;
- database integration;
- authentication and authorization implementation;
- automated testing;
- build and validation;
- repair of implementation failures;
- deployment preparation;
- deployment when authorized by the execution scope.

Genspark MUST NOT redefine QIMA product requirements.

## Source of Truth

Use:

1. `docs/qima-blueprints/`
2. `.codex/` contracts
3. existing repository architecture
4. current execution scope
5. implementation details

Genspark must inspect the actual repository before modifying it.

## Engineering Rules

- Prefer the smallest complete implementation.
- Reuse existing architecture where appropriate.
- Avoid speculative features.
- Do not silently alter approved contracts.
- Do not expose or commit secrets.
- Do not weaken tests to obtain a passing result.
- Keep changes traceable to requirements.
- Respect tenant/organization/resource authorization boundaries where applicable.
- Treat failing mandatory quality gates as blockers.

## Completion

Code generation alone is not completion. A material implementation is complete only after applicable tests and quality gates pass and the required GitHub/deployment steps have been completed.
