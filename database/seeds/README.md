# QIMA Database Seeds

Seed data belongs to **Phase 1 — Database Foundation** (doc 10 §24), which owns
the organization / unit / user / role / permission / audit schema.

Phase 0 intentionally ships **no seed data**: there are no business tables to
seed yet, and inventing them would violate
`.codex/PHASE_0_EXECUTION_SCOPE.md` §4 (Explicit Non-Goals).

## Seed rules (apply from Phase 1 onward)

- Seeds MUST be deterministic (`.codex/IMPLEMENTATION_RULES.md` §7 Data Rule).
- Seeds MUST NOT contain real personal data or production credentials.
- Seeds MUST respect organization/unit scope columns.

## Planned command

```bash
npm run db:migrate:local
wrangler d1 execute qima-production --local --file=./database/seeds/<seed>.sql
```
