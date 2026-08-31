import { describe, expect, it } from 'vitest';
import {
  APPEND_ONLY_TABLES,
  DomainValidationError,
  PHASE1_SCOPE_COLUMNS,
  PHASE1_TABLES,
  assertKnownAuditAction,
  assertRoleAssignableAtScope,
  assertSiteBelongsToUnit,
  assertUnitBelongsToOrganization,
  assertValidEmail,
  assertValidPermissionKey,
  assertValidSlug,
  normalizeDomain,
  normalizePageRequest,
  parsePermissionKey,
} from '@qima/domain';

/**
 * Phase 1 domain unit tests.
 *
 * Traceability:
 * - doc 06 §36 Validation Rules, §37 Domain Invariants, §34 Pagination.
 * - doc 09 §4 Testing Pyramid: domain rules are covered at the unit level.
 *
 * These assert the domain invariants in isolation, without a database, so a
 * broken rule is attributed to the domain rather than to persistence.
 */

describe('slug validation (doc 06 §4, §5)', () => {
  it('accepts a canonical slug', () => {
    for (const slug of ['a', 'yayasan', 'yayasan-satu', 'unit-2', 'a-b-c']) {
      expect(() => assertValidSlug('slug', slug)).not.toThrow();
    }
  });

  it('rejects a slug that is not URL-safe', () => {
    for (const slug of [
      '',
      'Yayasan',
      'yayasan satu',
      'yayasan_satu',
      'yayasan.satu',
      '-yayasan',
      'yayasan-',
      'yayasan--satu',
      'a'.repeat(65),
    ]) {
      expect(() => assertValidSlug('slug', slug), `should reject: "${slug}"`).toThrow(
        DomainValidationError,
      );
    }
  });

  it('names the offending field on the error so a caller can map it to input', () => {
    try {
      assertValidSlug('organizationSlug', 'Invalid Slug');
      throw new Error('expected a validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainValidationError);
      expect((error as DomainValidationError).field).toBe('organizationSlug');
    }
  });
});

describe('email validation (doc 06 §36)', () => {
  it('accepts a normalized address', () => {
    for (const email of ['ali@example.com', 'a.b+tag@sub.example.co.id']) {
      expect(() => assertValidEmail(email)).not.toThrow();
    }
  });

  it('rejects a non-lowercase address so uniqueness stays case-insensitive', () => {
    expect(() => assertValidEmail('Ali@Example.com')).toThrow(DomainValidationError);
  });

  it('rejects a malformed address', () => {
    for (const email of ['', 'ali', 'ali@', '@example.com', 'ali@example', 'a b@example.com']) {
      expect(() => assertValidEmail(email), `should reject: "${email}"`).toThrow(
        DomainValidationError,
      );
    }
  });
});

describe('permission key contract (doc 06 §3.3)', () => {
  it('accepts and parses a `resource.action` key', () => {
    expect(parsePermissionKey('units.read')).toEqual({ resource: 'units', action: 'read' });
  });

  it('rejects a key that is not exactly resource.action', () => {
    for (const key of ['units', 'units.read.all', '.read', 'units.', 'Units.Read']) {
      expect(() => assertValidPermissionKey(key), `should reject: "${key}"`).toThrow(
        DomainValidationError,
      );
    }
  });
});

describe('ownership invariants (doc 06 §37)', () => {
  it('accepts a unit inside its own organization', () => {
    expect(() =>
      assertUnitBelongsToOrganization({ organizationId: 'org-1' }, 'org-1'),
    ).not.toThrow();
  });

  it('rejects a unit from another organization', () => {
    expect(() => assertUnitBelongsToOrganization({ organizationId: 'org-2' }, 'org-1')).toThrow(
      DomainValidationError,
    );
  });

  it('treats a missing organization scope as an error, never as a wildcard', () => {
    // An empty scope must not be interpreted as "any organization".
    expect(() => assertUnitBelongsToOrganization({ organizationId: 'org-1' }, '')).toThrow(
      DomainValidationError,
    );
  });

  it('rejects a site from another unit', () => {
    expect(() => assertSiteBelongsToUnit({ unitId: 'unit-2' }, 'unit-1')).toThrow(
      DomainValidationError,
    );
    expect(() => assertSiteBelongsToUnit({ unitId: 'unit-1' }, '')).toThrow(DomainValidationError);
  });
});

describe('role scope assignment (doc 06 §8)', () => {
  it('allows a role at its own scope level', () => {
    expect(() =>
      assertRoleAssignableAtScope({ key: 'ORG_ADMIN', scopeLevel: 'organization' }, 'organization'),
    ).not.toThrow();
  });

  it('refuses to grant a unit role organization-wide', () => {
    // This would silently widen the role's blast radius.
    expect(() =>
      assertRoleAssignableAtScope({ key: 'UNIT_ADMIN', scopeLevel: 'unit' }, 'organization'),
    ).toThrow(DomainValidationError);
  });

  it('refuses to pin an organization role to a single unit', () => {
    expect(() =>
      assertRoleAssignableAtScope({ key: 'ORG_ADMIN', scopeLevel: 'organization' }, 'unit'),
    ).toThrow(DomainValidationError);
  });

  it('refuses to assign a platform role inside a tenant', () => {
    expect(() =>
      assertRoleAssignableAtScope({ key: 'SUPER_ADMIN', scopeLevel: 'platform' }, 'organization'),
    ).toThrow(DomainValidationError);
  });
});

describe('domain normalization (doc 06 §7)', () => {
  it('canonicalizes a hostname before resolution', () => {
    expect(normalizeDomain('  A.Example.COM  ')).toBe('a.example.com');
    expect(normalizeDomain('a.example.com.')).toBe('a.example.com');
    expect(normalizeDomain('a.example.com:8443')).toBe('a.example.com');
  });

  it('rejects a hostname that cannot identify a site', () => {
    for (const value of ['', '   ', 'a_b.example.com', '-example.com', 'example.com-']) {
      expect(() => normalizeDomain(value), `should reject: "${value}"`).toThrow(
        DomainValidationError,
      );
    }
  });
});

describe('audit action vocabulary (doc 06 §15)', () => {
  it('accepts a documented action', () => {
    for (const action of ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE']) {
      expect(() => assertKnownAuditAction(action)).not.toThrow();
    }
  });

  it('rejects an undocumented or lowercase action', () => {
    for (const action of ['create', 'PURGE', '']) {
      expect(() => assertKnownAuditAction(action)).toThrow(DomainValidationError);
    }
  });
});

describe('pagination normalization (doc 06 §34)', () => {
  it('applies documented defaults', () => {
    expect(normalizePageRequest(undefined)).toEqual({ page: 1, perPage: 20 });
  });

  it('caps perPage so a caller cannot request an unbounded read', () => {
    expect(normalizePageRequest({ perPage: 5000 }).perPage).toBe(100);
  });

  it('coerces nonsensical input to a safe request instead of throwing', () => {
    expect(normalizePageRequest({ page: 0, perPage: 0 })).toEqual({ page: 1, perPage: 20 });
    expect(normalizePageRequest({ page: -3, perPage: -1 })).toEqual({ page: 1, perPage: 20 });
    expect(normalizePageRequest({ page: Number.NaN, perPage: Number.NaN })).toEqual({
      page: 1,
      perPage: 20,
    });
    expect(normalizePageRequest({ page: 2.7, perPage: 10.9 })).toEqual({ page: 2, perPage: 10 });
  });
});

describe('schema contract (doc 06 §48 MVP boundary)', () => {
  it('declares no Phase 4+ operational table', () => {
    for (const future of ['programs', 'activities', 'participants', 'registrations']) {
      expect(PHASE1_TABLES as readonly string[]).not.toContain(future);
    }
  });

  it('declares a scope column for every tenant-scoped table', () => {
    // A scoped table without a declared scope column could be read unscoped.
    for (const table of ['units', 'sites', 'organization_settings', 'unit_settings']) {
      expect(PHASE1_SCOPE_COLUMNS[table]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('marks audit_logs as append-only', () => {
    expect(APPEND_ONLY_TABLES as readonly string[]).toContain('audit_logs');
  });
});
