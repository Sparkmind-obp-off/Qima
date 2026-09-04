import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  validateParticipantPatch,
  validateParticipantValues,
} from '@qima/domain';

describe('Phase 6 Participant domain', () => {
  it('normalizes a valid Participant and defaults status to active', () => {
    expect(validateParticipantValues({
      name: '  Ahmad Fauzan  ',
      phone: ' 08123456789 ',
      email: ' AHMAD@EXAMPLE.COM ',
      dateOfBirth: '2010-01-01',
      gender: ' Laki-laki ',
      metadata: { source: 'admin' },
    })).toEqual({
      name: 'Ahmad Fauzan',
      phone: '08123456789',
      email: 'ahmad@example.com',
      dateOfBirth: '2010-01-01',
      gender: 'Laki-laki',
      status: 'active',
      metadata: { source: 'admin' },
    });
  });

  it('normalizes optional blank contact fields to null', () => {
    expect(validateParticipantValues({ name: 'Fatimah', phone: ' ', email: '' })).toMatchObject({
      phone: null,
      email: null,
      dateOfBirth: null,
      gender: null,
      metadata: null,
    });
  });

  it.each([
    ['blank name', { name: ' ' }],
    ['invalid email', { name: 'Valid', email: 'not-an-email' }],
    ['invalid date', { name: 'Valid', dateOfBirth: '2010-02-31' }],
    ['future birth date', { name: 'Valid', dateOfBirth: '2999-01-01' }],
    ['invalid status', { name: 'Valid', status: 'pending' }],
  ])('rejects %s', (_label, input) => {
    expect(() => validateParticipantValues(input)).toThrow(DomainValidationError);
  });

  it('validates normalized updates and rejects an empty patch', () => {
    expect(validateParticipantPatch({ email: ' NEW@EXAMPLE.COM ', status: 'inactive' })).toEqual({
      email: 'new@example.com',
      status: 'inactive',
    });
    expect(() => validateParticipantPatch({})).toThrow(DomainValidationError);
  });
});
