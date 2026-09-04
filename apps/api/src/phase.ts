/**
 * QIMA implementation phase identity.
 *
 * Traceability:
 * - doc 10 §24 Implementation Phases: the phase sequence is a contract, not a
 *   free-form label.
 * - .codex/IMPLEMENTATION_RULES.md §3 Phase Rule: a phase must not claim
 *   capability it has not implemented.
 *
 * Why this module exists: the `/api/v1/meta` endpoint reports which phase the
 * deployed artifact actually implements, and post-deploy verification relies on
 * that value. Keeping the identifier in one place means the endpoint, the tests
 * and the deployment checks can never disagree about it, while the closed
 * vocabulary below stops an arbitrary or invented phase string from being
 * reported as if it were real.
 */

/** Phase identifiers defined by doc 10 §24, in implementation order. */
export const QIMA_PHASE_IDS = [
  'phase-0-bootstrap',
  'phase-1-database-foundation',
  'phase-2-authentication-access',
  'phase-3-organization-unit',
  'phase-4-program',
  'phase-5-activity',
] as const;

export type QimaPhaseId = (typeof QIMA_PHASE_IDS)[number];

/**
 * The phase this artifact implements.
 *
 * Advanced only when the phase's exit criteria (doc 10 §24) are actually met.
 */
export const QIMA_CURRENT_PHASE: QimaPhaseId = 'phase-5-activity';
