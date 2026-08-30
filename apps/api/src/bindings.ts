/**
 * QIMA runtime bindings contract (Cloudflare Workers / Pages).
 *
 * Traceability:
 * - doc 08 §11 Infrastructure Layer: provider details stay outside the domain.
 * - .agents/genspark/GENSPARK_DEPLOYMENT_SPEC.md: Cloudflare is the target platform.
 *
 * Phase 0 declares the minimum bindings needed for the tooling baseline.
 * Business tables are Phase 1 (doc 10 §24 Phase 1 — Database Foundation).
 */

export interface QimaBindings {
  /** D1 database binding. Optional in Phase 0: the skeleton must boot without it. */
  DB?: D1Database;

  // Environment contract — see `.env.example`. Secrets are provisioned through
  // the platform secret mechanism and are never committed.
  NODE_ENV?: string;
  APP_ENV?: string;
  WEB_URL?: string;
  LOG_LEVEL?: string;
  AUTH_SECRET?: string;
}
