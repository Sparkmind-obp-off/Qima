import {
  DomainValidationError,
  PROGRAM_STATUSES,
  normalizePageRequest,
  validateProgramPatch,
  validateProgramValues,
  type Page,
  type PageRequest,
  type Program,
  type ProgramPatchInput,
  type ProgramRepository,
  type ProgramStatus,
  type UnitRepository,
} from '@qima/domain';
import type { ResourceResult } from '../organization/organization-use-cases';

interface ProgramDependencies {
  readonly programs: ProgramRepository;
}

interface CreateProgramDependencies extends ProgramDependencies {
  readonly units: UnitRepository;
  readonly generateId?: () => string;
}

export async function createProgram(
  organizationId: string,
  unitId: string,
  input: {
    readonly name: string;
    readonly slug: string;
    readonly description?: string | null;
    readonly status?: string;
    readonly startDate?: string | null;
    readonly endDate?: string | null;
    readonly capacity?: number | null;
  },
  dependencies: CreateProgramDependencies,
): Promise<ResourceResult<Program>> {
  try {
    if ((await dependencies.units.findById(organizationId, unitId)) === null) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Unit not found.' };
    }
    const values = validateProgramValues(input);
    if ((await dependencies.programs.findBySlug(unitId, values.slug)) !== null) {
      return { ok: false, reason: 'CONFLICT', message: 'Program slug already exists in this unit.' };
    }
    const id = (dependencies.generateId ?? (() => crypto.randomUUID()))();
    return { ok: true, value: await dependencies.programs.create(unitId, id, values) };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function listPrograms(
  unitId: string,
  input:
    | (Partial<PageRequest> & { readonly search?: string; readonly status?: string })
    | undefined,
  dependencies: ProgramDependencies,
): Promise<ResourceResult<Page<Program>>> {
  try {
    const search = input?.search?.trim();
    if (search !== undefined && search.length > 160) {
      throw new DomainValidationError('search', 'search must not exceed 160 characters.');
    }
    const status = input?.status;
    if (status !== undefined && !(PROGRAM_STATUSES as readonly string[]).includes(status)) {
      throw new DomainValidationError('status', 'status is invalid.');
    }
    return {
      ok: true,
      value: await dependencies.programs.listByUnit(unitId, {
        ...normalizePageRequest(input),
        ...(search === undefined || search.length === 0 ? {} : { search }),
        ...(status === undefined ? {} : { status: status as ProgramStatus }),
      }),
    };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function getProgram(
  unitId: string,
  programId: string,
  dependencies: ProgramDependencies,
): Promise<ResourceResult<Program>> {
  const program = await dependencies.programs.findById(unitId, programId);
  return program === null
    ? { ok: false, reason: 'NOT_FOUND', message: 'Program not found.' }
    : { ok: true, value: program };
}

export async function updateProgram(
  unitId: string,
  programId: string,
  input: ProgramPatchInput,
  dependencies: ProgramDependencies,
): Promise<ResourceResult<Program>> {
  try {
    const current = await dependencies.programs.findById(unitId, programId);
    if (current === null) return { ok: false, reason: 'NOT_FOUND', message: 'Program not found.' };
    const patch = validateProgramPatch(input, current);
    if (patch.slug !== undefined) {
      const existing = await dependencies.programs.findBySlug(unitId, patch.slug);
      if (existing !== null && existing.id !== programId) {
        return { ok: false, reason: 'CONFLICT', message: 'Program slug already exists in this unit.' };
      }
    }
    const updated = await dependencies.programs.update(unitId, programId, patch);
    return updated === null
      ? { ok: false, reason: 'NOT_FOUND', message: 'Program not found.' }
      : { ok: true, value: updated };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function deleteProgram(
  unitId: string,
  programId: string,
  dependencies: ProgramDependencies,
): Promise<ResourceResult<{ readonly deleted: true }>> {
  return (await dependencies.programs.softDelete(unitId, programId))
    ? { ok: true, value: { deleted: true } }
    : { ok: false, reason: 'NOT_FOUND', message: 'Program not found.' };
}
