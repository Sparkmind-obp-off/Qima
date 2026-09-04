import {
  PARTICIPANT_STATUSES,
  DomainValidationError,
  normalizePageRequest,
  validateParticipantPatch,
  validateParticipantValues,
  type Page,
  type PageRequest,
  type Participant,
  type ParticipantInput,
  type ParticipantPatchInput,
  type ParticipantRepository,
  type ParticipantStatus,
  type UnitRepository,
} from '@qima/domain';
import type { ResourceResult } from '../organization/organization-use-cases';

interface ParticipantDependencies {
  readonly participants: ParticipantRepository;
}

interface CreateParticipantDependencies extends ParticipantDependencies {
  readonly units: UnitRepository;
  readonly generateId?: () => string;
}

export async function createParticipant(
  organizationId: string,
  unitId: string,
  input: ParticipantInput,
  dependencies: CreateParticipantDependencies,
): Promise<ResourceResult<Participant>> {
  try {
    if ((await dependencies.units.findById(organizationId, unitId)) === null) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Unit not found.' };
    }
    const values = validateParticipantValues(input);
    const id = (dependencies.generateId ?? (() => crypto.randomUUID()))();
    return { ok: true, value: await dependencies.participants.create(unitId, id, values) };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function listParticipants(
  unitId: string,
  input: (Partial<PageRequest> & { readonly search?: string; readonly status?: string }) | undefined,
  dependencies: ParticipantDependencies,
): Promise<ResourceResult<Page<Participant>>> {
  try {
    const search = input?.search?.trim();
    if (search !== undefined && search.length > 200) {
      throw new DomainValidationError('search', 'search must not exceed 200 characters.');
    }
    const status = input?.status;
    if (status !== undefined && !(PARTICIPANT_STATUSES as readonly string[]).includes(status)) {
      throw new DomainValidationError('status', 'status is invalid.');
    }
    return {
      ok: true,
      value: await dependencies.participants.listByUnit(unitId, {
        ...normalizePageRequest(input),
        ...(search === undefined || search.length === 0 ? {} : { search }),
        ...(status === undefined ? {} : { status: status as ParticipantStatus }),
      }),
    };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function getParticipant(
  unitId: string,
  participantId: string,
  dependencies: ParticipantDependencies,
): Promise<ResourceResult<Participant>> {
  const participant = await dependencies.participants.findById(unitId, participantId);
  return participant === null
    ? { ok: false, reason: 'NOT_FOUND', message: 'Participant not found.' }
    : { ok: true, value: participant };
}

export async function updateParticipant(
  unitId: string,
  participantId: string,
  input: ParticipantPatchInput,
  dependencies: ParticipantDependencies,
): Promise<ResourceResult<Participant>> {
  try {
    if ((await dependencies.participants.findById(unitId, participantId)) === null) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Participant not found.' };
    }
    const patch = validateParticipantPatch(input);
    const updated = await dependencies.participants.update(unitId, participantId, patch);
    return updated === null
      ? { ok: false, reason: 'NOT_FOUND', message: 'Participant not found.' }
      : { ok: true, value: updated };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}
