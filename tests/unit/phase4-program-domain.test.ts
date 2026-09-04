import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  validateProgramPatch,
  validateProgramValues,
  type Program,
} from '@qima/domain';

const current: Program = {
  id: 'program-1',
  unitId: 'unit-1',
  name: 'Tahfidz',
  slug: 'tahfidz',
  description: null,
  status: 'draft',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  capacity: 30,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
  deletedAt: null,
};

describe('Phase 4 Program domain', () => {
  it('normalizes a valid Program and defaults its lifecycle to draft', () => {
    expect(
      validateProgramValues({
        name: '  Program Tahfidz  ',
        slug: 'program-tahfidz',
        description: '  Pembinaan hafalan  ',
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        capacity: 30,
      }),
    ).toEqual({
      name: 'Program Tahfidz',
      slug: 'program-tahfidz',
      description: 'Pembinaan hafalan',
      status: 'draft',
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      capacity: 30,
    });
  });

  it.each([
    ['blank name', { name: ' ', slug: 'valid' }],
    ['invalid slug', { name: 'Valid', slug: 'Invalid Slug' }],
    ['invalid status', { name: 'Valid', slug: 'valid', status: 'active' }],
    ['invalid start date', { name: 'Valid', slug: 'valid', startDate: '2026-99-01' }],
    ['impossible calendar date', { name: 'Valid', slug: 'valid', startDate: '2026-02-31' }],
    ['end before start', { name: 'Valid', slug: 'valid', startDate: '2026-09-02', endDate: '2026-09-01' }],
    ['zero capacity', { name: 'Valid', slug: 'valid', capacity: 0 }],
    ['fractional capacity', { name: 'Valid', slug: 'valid', capacity: 1.5 }],
  ])('rejects %s', (_label, input) => {
    expect(() => validateProgramValues(input)).toThrow(DomainValidationError);
  });

  it('validates a patch against the resulting complete date range', () => {
    expect(validateProgramPatch({ endDate: '2027-01-01', status: 'published' }, current)).toEqual({
      endDate: '2027-01-01',
      status: 'published',
    });
    expect(() => validateProgramPatch({ startDate: '2027-01-01' }, current)).toThrow(
      DomainValidationError,
    );
    expect(() => validateProgramPatch({}, current)).toThrow(DomainValidationError);
  });
});
