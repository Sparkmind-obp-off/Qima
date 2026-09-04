import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  validateActivityPatch,
  validateActivityValues,
  type Activity,
} from '@qima/domain';

const PROGRAM_ID = 'aaaaaaaa-0000-4000-8000-000000000501';
const current: Activity = {
  id: 'activity-1',
  unitId: 'unit-1',
  programId: PROGRAM_ID,
  title: 'Kajian Pekanan',
  description: null,
  activityType: 'kajian',
  startAt: '2026-09-10T08:00:00Z',
  endAt: '2026-09-10T10:00:00Z',
  location: 'Aula',
  status: 'draft',
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
  deletedAt: null,
};

describe('Phase 5 Activity domain', () => {
  it('normalizes a valid Activity and defaults its lifecycle to draft', () => {
    expect(
      validateActivityValues({
        programId: PROGRAM_ID,
        title: '  Kajian Pekanan  ',
        description: '  Pembinaan rutin  ',
        activityType: '  kajian  ',
        startAt: '2026-09-10T08:00:00Z',
        endAt: '2026-09-10T10:00:00Z',
        location: '  Aula Utama  ',
      }),
    ).toEqual({
      programId: PROGRAM_ID,
      title: 'Kajian Pekanan',
      description: 'Pembinaan rutin',
      activityType: 'kajian',
      startAt: '2026-09-10T08:00:00Z',
      endAt: '2026-09-10T10:00:00Z',
      location: 'Aula Utama',
      status: 'draft',
    });
  });

  it('allows a Unit-owned Activity without a Program', () => {
    expect(
      validateActivityValues({
        title: 'Rapat Unit',
        activityType: 'meeting',
        startAt: '2026-09-10T08:00:00Z',
      }).programId,
    ).toBeNull();
  });

  it.each([
    ['blank title', { title: ' ', activityType: 'kajian', startAt: '2026-09-10T08:00:00Z' }],
    ['blank type', { title: 'Valid', activityType: ' ', startAt: '2026-09-10T08:00:00Z' }],
    ['invalid Program ID', { title: 'Valid', activityType: 'kajian', programId: 'bad', startAt: '2026-09-10T08:00:00Z' }],
    ['invalid status', { title: 'Valid', activityType: 'kajian', status: 'active', startAt: '2026-09-10T08:00:00Z' }],
    ['non-UTC start', { title: 'Valid', activityType: 'kajian', startAt: '2026-09-10T08:00:00+07:00' }],
    ['invalid start', { title: 'Valid', activityType: 'kajian', startAt: 'not-a-date' }],
    ['impossible start date', { title: 'Valid', activityType: 'kajian', startAt: '2026-02-31T08:00:00Z' }],
    ['end before start', { title: 'Valid', activityType: 'kajian', startAt: '2026-09-10T10:00:00Z', endAt: '2026-09-10T08:00:00Z' }],
  ])('rejects %s', (_label, input) => {
    expect(() => validateActivityValues(input)).toThrow(DomainValidationError);
  });

  it('validates a patch against the resulting schedule and supports Program removal', () => {
    expect(validateActivityPatch({ status: 'published', programId: null }, current)).toEqual({
      programId: null,
      status: 'published',
    });
    expect(() => validateActivityPatch({ startAt: '2026-09-10T11:00:00Z' }, current)).toThrow(
      DomainValidationError,
    );
    expect(() => validateActivityPatch({}, current)).toThrow(DomainValidationError);
  });
});
