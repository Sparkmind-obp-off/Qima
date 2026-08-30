/**
 * QIMA shared primitives.
 *
 * Traceability:
 * - doc 08 §13 Shared Module: only genuinely generic building blocks are
 *   allowed here (errors, result types, pagination).
 * - doc 05 §12 API Rule: the API must return a standardized response shape.
 *
 * Phase 0 provides the response envelope and error taxonomy ONLY. No business
 * rules live here.
 */

/** Canonical QIMA error codes usable by transport and application layers. */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'SCOPE_VIOLATION',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface SuccessEnvelope<T> {
  readonly ok: true;
  readonly data: T;
}

export interface FailureEnvelope {
  readonly ok: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
  };
}

export type Envelope<T> = SuccessEnvelope<T> | FailureEnvelope;

/** Wrap a successful result in the canonical QIMA response envelope. */
export function success<T>(data: T): SuccessEnvelope<T> {
  return Object.freeze({ ok: true as const, data });
}

/**
 * Wrap a failure in the canonical QIMA response envelope.
 *
 * The message must be safe for client consumption: internal details and stack
 * traces must never be passed here (doc 05 §"Internal stack traces", doc 08 §12).
 */
export function failure(code: ErrorCode, message: string): FailureEnvelope {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({ code, message }),
  });
}

/**
 * HTTP status mapping for the QIMA error taxonomy, used by the API transport
 * layer. Values are literal types so transport frameworks can narrow them to
 * their own status-code unions without a cast.
 */
export const ERROR_STATUS = Object.freeze({
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SCOPE_VIOLATION: 403,
  INTERNAL_ERROR: 500,
} as const satisfies Record<ErrorCode, number>);

export type ErrorStatus = (typeof ERROR_STATUS)[ErrorCode];
