import {
  ACTIVITY_STATUSES,
  DomainValidationError,
  normalizePageRequest,
  validateActivityPatch,
  validateActivityValues,
  type Activity,
  type ActivityPatchInput,
  type ActivityRepository,
  type ActivityStatus,
  type Page,
  type PageRequest,
  type ProgramRepository,
  type UnitRepository,
} from '@qima/domain';
import type { ResourceResult } from '../organization/organization-use-cases';

interface ActivityDependencies {
  readonly activities: ActivityRepository;
}

interface ActivityRelationshipDependencies extends ActivityDependencies {
  readonly programs: ProgramRepository;
}

interface CreateActivityDependencies extends ActivityRelationshipDependencies {
  readonly units: UnitRepository;
  readonly generateId?: () => string;
}

async function programExistsInUnit(
  unitId: string,
  programId: string | null | undefined,
  programs: ProgramRepository,
): Promise<boolean> {
  return programId === null || programId === undefined || (await programs.findById(unitId, programId)) !== null;
}

export async function createActivity(
  organizationId: string,
  unitId: string,
  input: {
    readonly programId?: string | null;
    readonly title: string;
    readonly description?: string | null;
    readonly activityType: string;
    readonly startAt: string;
    readonly endAt?: string | null;
    readonly location?: string | null;
    readonly status?: string;
  },
  dependencies: CreateActivityDependencies,
): Promise<ResourceResult<Activity>> {
  try {
    if ((await dependencies.units.findById(organizationId, unitId)) === null) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Unit not found.' };
    }
    const values = validateActivityValues(input);
    if (!(await programExistsInUnit(unitId, values.programId, dependencies.programs))) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Program not found.' };
    }
    const id = (dependencies.generateId ?? (() => crypto.randomUUID()))();
    return { ok: true, value: await dependencies.activities.create(unitId, id, values) };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function listActivities(
  unitId: string,
  input:
    | (Partial<PageRequest> & {
        readonly search?: string;
        readonly status?: string;
        readonly programId?: string;
      })
    | undefined,
  dependencies: ActivityRelationshipDependencies,
): Promise<ResourceResult<Page<Activity>>> {
  try {
    const search = input?.search?.trim();
    if (search !== undefined && search.length > 200) {
      throw new DomainValidationError('search', 'search must not exceed 200 characters.');
    }
    const status = input?.status;
    if (status !== undefined && !(ACTIVITY_STATUSES as readonly string[]).includes(status)) {
      throw new DomainValidationError('status', 'status is invalid.');
    }
    const programId = input?.programId?.trim();
    if (
      programId !== undefined &&
      programId.length > 0 &&
      !(await programExistsInUnit(unitId, programId, dependencies.programs))
    ) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Program not found.' };
    }
    return {
      ok: true,
      value: await dependencies.activities.listByUnit(unitId, {
        ...normalizePageRequest(input),
        ...(search === undefined || search.length === 0 ? {} : { search }),
        ...(status === undefined ? {} : { status: status as ActivityStatus }),
        ...(programId === undefined || programId.length === 0 ? {} : { programId }),
      }),
    };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function getActivity(
  unitId: string,
  activityId: string,
  dependencies: ActivityDependencies,
): Promise<ResourceResult<Activity>> {
  const activity = await dependencies.activities.findById(unitId, activityId);
  return activity === null
    ? { ok: false, reason: 'NOT_FOUND', message: 'Activity not found.' }
    : { ok: true, value: activity };
}

export async function updateActivity(
  unitId: string,
  activityId: string,
  input: ActivityPatchInput,
  dependencies: ActivityRelationshipDependencies,
): Promise<ResourceResult<Activity>> {
  try {
    const current = await dependencies.activities.findById(unitId, activityId);
    if (current === null) return { ok: false, reason: 'NOT_FOUND', message: 'Activity not found.' };
    const patch = validateActivityPatch(input, current);
    if (!(await programExistsInUnit(unitId, patch.programId, dependencies.programs))) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Program not found.' };
    }
    const updated = await dependencies.activities.update(unitId, activityId, patch);
    return updated === null
      ? { ok: false, reason: 'NOT_FOUND', message: 'Activity not found.' }
      : { ok: true, value: updated };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function deleteActivity(
  unitId: string,
  activityId: string,
  dependencies: ActivityDependencies,
): Promise<ResourceResult<{ readonly deleted: true }>> {
  return (await dependencies.activities.softDelete(unitId, activityId))
    ? { ok: true, value: { deleted: true } }
    : { ok: false, reason: 'NOT_FOUND', message: 'Activity not found.' };
}
