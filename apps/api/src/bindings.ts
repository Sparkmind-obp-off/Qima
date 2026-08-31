/**
 * QIMA runtime bindings contract (Cloudflare Workers / Pages).
 *
 * Traceability:
 * - doc 08 §11 Infrastructure Layer: provider details stay outside the domain.
 * - .agents/genspark/GENSPARK_DEPLOYMENT_SPEC.md: Cloudflare is the target platform.
 *
 * The binding set is unchanged by Phase 1: the database foundation adds schema
 * and repositories, not new infrastructure (doc 10 §24 Phase 1).
 */

export interface QimaBindings {
  /**
   * D1 database binding. Optional by design: the application must still boot
   * and report an honest diagnostic when the binding is absent, rather than
   * failing opaquely at import time (doc 08 §12).
   */
  DB?: D1Database;

  // Environment contract — see `.env.example`. Secrets are provisioned through
  // the platform secret mechanism and are never committed.
  NODE_ENV?: string;
  APP_ENV?: string;
  WEB_URL?: string;
  LOG_LEVEL?: string;
  AUTH_SECRET?: string;
}
