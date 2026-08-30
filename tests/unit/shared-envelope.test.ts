import { describe, expect, it } from 'vitest';
import { ERROR_CODES, ERROR_STATUS, failure, success } from '@qima/shared';

/**
 * Unit tests — QIMA standardized response envelope.
 *
 * Traceability: doc 05 §12 API Rule (standardized response), doc 08 §13.
 */

describe('response envelope', () => {
  it('wraps success payloads in the canonical shape', () => {
    expect(success({ service: 'qima' })).toEqual({ ok: true, data: { service: 'qima' } });
  });

  it('wraps failures with a code and a client-safe message', () => {
    expect(failure('VALIDATION_ERROR', 'Invalid input')).toEqual({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    });
  });

  it('returns frozen envelopes so responses cannot be mutated downstream', () => {
    const envelope = failure('FORBIDDEN', 'Denied');

    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.error)).toBe(true);
  });

  it('maps every error code to an HTTP status', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });

  it('maps authorization failures to 401/403 rather than 200', () => {
    expect(ERROR_STATUS.UNAUTHENTICATED).toBe(401);
    expect(ERROR_STATUS.FORBIDDEN).toBe(403);
    expect(ERROR_STATUS.SCOPE_VIOLATION).toBe(403);
  });
});
