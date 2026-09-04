import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  validateOrganizationPatch,
  validateOrganizationValues,
  validateUnitPatch,
  validateUnitValues,
} from '@qima/domain';

describe('Phase 3 organization and unit domain validation', () => {
  it('normalizes valid organization values', () => {
    expect(
      validateOrganizationValues({
        name: '  QIMA Foundation  ',
        slug: 'qima-foundation',
        description: '  Parent organization  ',
      }),
    ).toEqual({
      name: 'QIMA Foundation',
      slug: 'qima-foundation',
      status: 'active',
      description: 'Parent organization',
    });
  });

  it.each([
    [{ name: '', slug: 'valid' }, 'name'],
    [{ name: 'Valid', slug: 'Invalid Slug' }, 'slug'],
    [{ name: 'Valid', slug: 'valid', status: 'deleted' }, 'status'],
  ])('rejects invalid organization input %#', (input, field) => {
    expect(() => validateOrganizationValues(input)).toThrowError(DomainValidationError);
    try {
      validateOrganizationValues(input);
    } catch (error) {
      expect((error as DomainValidationError).field).toBe(field);
    }
  });

  it('accepts only known unit types', () => {
    expect(validateUnitValues({ name: 'Unit A', slug: 'unit-a', type: 'community' }).type).toBe(
      'community',
    );
    expect(() => validateUnitValues({ name: 'Unit A', slug: 'unit-a', type: 'unknown' })).toThrow(
      DomainValidationError,
    );
  });

  it('requires at least one patch field and preserves explicit null', () => {
    expect(() => validateOrganizationPatch({})).toThrow(DomainValidationError);
    expect(validateOrganizationPatch({ description: null })).toEqual({ description: null });
    expect(() => validateUnitPatch({})).toThrow(DomainValidationError);
    expect(validateUnitPatch({ type: 'boarding' })).toEqual({ type: 'boarding' });
  });
});
