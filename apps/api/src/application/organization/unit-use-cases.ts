import {
  DomainValidationError,
  normalizePageRequest,
  validateUnitPatch,
  validateUnitValues,
  type OrganizationRepository,
  type Page,
  type PageRequest,
  type Unit,
  type UnitPatchInput,
  type UnitRepository,
} from '@qima/domain';
import type { ResourceResult } from './organization-use-cases';

interface UnitDependencies {
  readonly units: UnitRepository;
}

interface CreateUnitDependencies extends UnitDependencies {
  readonly organizations: OrganizationRepository;
  readonly generateId?: () => string;
}

export async function createUnit(
  organizationId: string,
  input: {
    readonly name: string;
    readonly slug: string;
    readonly type: string;
    readonly status?: string;
    readonly description?: string | null;
  },
  dependencies: CreateUnitDependencies,
): Promise<ResourceResult<Unit>> {
  try {
    const organization = await dependencies.organizations.findById(organizationId);
    if (organization === null) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Organization not found.' };
    }
    const values = validateUnitValues(input);
    if ((await dependencies.units.findBySlug(organizationId, values.slug)) !== null) {
      return { ok: false, reason: 'CONFLICT', message: 'Unit slug already exists in this organization.' };
    }
    const id = (dependencies.generateId ?? (() => crypto.randomUUID()))();
    return { ok: true, value: await dependencies.units.create(organizationId, id, values) };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function listUnits(
  organizationId: string,
  page: Partial<PageRequest> | undefined,
  dependencies: UnitDependencies,
): Promise<Page<Unit>> {
  return dependencies.units.listByOrganization(organizationId, normalizePageRequest(page));
}

export async function getUnit(
  organizationId: string,
  unitId: string,
  dependencies: UnitDependencies,
): Promise<ResourceResult<Unit>> {
  const unit = await dependencies.units.findById(organizationId, unitId);
  return unit === null
    ? { ok: false, reason: 'NOT_FOUND', message: 'Unit not found.' }
    : { ok: true, value: unit };
}

export async function updateUnit(
  organizationId: string,
  unitId: string,
  input: UnitPatchInput,
  dependencies: UnitDependencies,
): Promise<ResourceResult<Unit>> {
  try {
    const patch = validateUnitPatch(input);
    if (patch.slug !== undefined) {
      const existing = await dependencies.units.findBySlug(organizationId, patch.slug);
      if (existing !== null && existing.id !== unitId) {
        return {
          ok: false,
          reason: 'CONFLICT',
          message: 'Unit slug already exists in this organization.',
        };
      }
    }
    const updated = await dependencies.units.update(organizationId, unitId, patch);
    return updated === null
      ? { ok: false, reason: 'NOT_FOUND', message: 'Unit not found.' }
      : { ok: true, value: updated };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}
