# QIMA — GENSPARK DEPLOYMENT SPEC v1.0

## Purpose

Define the controlled deployment contract for QIMA when Genspark Code has the required deployment capability and credentials.

## Deployment Target

Preferred runtime/deployment platform:

**Cloudflare**

The exact Cloudflare product (Pages, Workers, or another approved service) MUST follow the actual QIMA architecture and repository configuration. Do not assume a platform variant without inspection.

## Deployment Pipeline

`BUILD → TEST → VERIFY → GITHUB COMMIT/PUSH → DEPLOY → HEALTH CHECK → POST-DEPLOY VERIFY`

Deployment is not considered successful merely because a deployment command returns without an obvious error.

## Preconditions

Before deployment:

- applicable quality gates pass;
- build succeeds;
- required tests pass;
- no critical security issue is unresolved;
- environment variables/secrets are configured through the approved secret mechanism;
- deployment configuration is understood;
- GitHub contains the intended implementation state.

## Secrets

Never commit or expose:

- Cloudflare API tokens;
- account credentials;
- private keys;
- production environment secrets.

Use the platform's secure environment/secret mechanism.

## Deployment Safety

- Inspect existing deployment configuration before changing it.
- Do not destroy existing production resources without explicit authorization.
- Do not overwrite unrelated deployments.
- Prefer a reversible deployment strategy where supported.
- Record the resulting deployment identifier/URL.

## Post-Deployment Verification

After deployment, verify applicable:

- public application availability;
- critical routes;
- frontend rendering;
- backend/API responses;
- authentication;
- authorization boundaries;
- database connectivity;
- critical user journey;
- runtime errors.

A deployment that cannot be verified must be reported as `BLOCKED`, not `PASS`.

## Failure Handling

If deployment fails:

`CAPTURE → CLASSIFY → ROOT CAUSE → REPAIR → TEST → DEPLOY AGAIN → VERIFY`

Do not hide deployment failures.

## Completion

Deployment is complete only when:

`DEPLOYMENT PASS + POST-DEPLOY VERIFICATION PASS`

If credentials, permissions, platform availability, or required infrastructure are missing, report the exact blocker.
