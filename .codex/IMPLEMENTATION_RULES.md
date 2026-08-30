# QIMA Implementation Rules

- Implement the smallest complete solution required by the active phase.
- Keep web and API as separate application surfaces under `apps/`.
- Keep reusable contracts and utilities under `packages/`.
- Read runtime configuration through centralized config utilities instead of scattered direct environment access.
- Do not commit real secrets, credentials, or private keys.
- Do not bypass organization/unit authorization boundaries in application code.
