import { DomainValidationError } from './identity';

export const ACTIVITY_STATUSES = ['draft', 'published', 'archived'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export interface Activity {
  readonly id: string;
  readonly unitId: string;
  readonly programId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly activityType: string;
  readonly startAt: string;
  readonly endAt: string | null;
  readonly location: string | null;
  readonly status: ActivityStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface ActivityValues {
  readonly programId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly activityType: string;
  readonly startAt: string;
  readonly endAt: string | null;
  readonly location: string | null;
  readonly status: ActivityStatus;
}

export interface ActivityPatch {
  readonly programId?: string | null;
  readonly title?: string;
  readonly description?: string | null;
  readonly activityType?: string;
  readonly startAt?: string;
  readonly endAt?: string | null;
  readonly location?: string | null;
  readonly status?: ActivityStatus;
}

export interface ActivityPatchInput {
  readonly programId?: string | null;
  readonly title?: string;
  readonly description?: string | null;
  readonly activityType?: string;
  readonly startAt?: string;
  readonly endAt?: string | null;
  readonly location?: string | null;
  readonly status?: string;
}

const TITLE_MAX_LENGTH = 200;
const TYPE_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 2_000;
const LOCATION_MAX_LENGTH = 300;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function normalizeRequiredText(field: 'title' | 'activityType', value: string): string {
  const normalized = value.trim();
  const maximum = field === 'title' ? TITLE_MAX_LENGTH : TYPE_MAX_LENGTH;
  if (normalized.length === 0) throw new DomainValidationError(field, `${field} is required.`);
  if (normalized.length > maximum) {
    throw new DomainValidationError(field, `${field} must not exceed ${maximum} characters.`);
  }
  return normalized;
}

function normalizeOptionalText(
  field: 'description' | 'location',
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  const maximum = field === 'description' ? DESCRIPTION_MAX_LENGTH : LOCATION_MAX_LENGTH;
  if (normalized.length > maximum) {
    throw new DomainValidationError(field, `${field} must not exceed ${maximum} characters.`);
  }
  return normalized.length === 0 ? null : normalized;
}

function normalizeProgramId(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const programId = value.trim();
  if (!UUID_PATTERN.test(programId)) {
    throw new DomainValidationError('programId', 'programId must be a valid UUID.');
  }
  return programId;
}

function normalizeTimestamp(field: 'startAt' | 'endAt', value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const timestamp = new Date(value);
  if (
    !UTC_TIMESTAMP_PATTERN.test(value) ||
    Number.isNaN(timestamp.getTime()) ||
    timestamp.toISOString().replace('.000Z', 'Z') !== value
  ) {
    throw new DomainValidationError(field, `${field} must be a valid UTC timestamp.`);
  }
  return value;
}

function normalizeStatus(value: string | undefined): ActivityStatus {
  const status = value ?? 'draft';
  if (!(ACTIVITY_STATUSES as readonly string[]).includes(status)) {
    throw new DomainValidationError('status', 'status is invalid.');
  }
  return status as ActivityStatus;
}

function assertTimeOrder(startAt: string, endAt: string | null): void {
  if (endAt !== null && endAt < startAt) {
    throw new DomainValidationError('endAt', 'endAt must be on or after startAt.');
  }
}

export function validateActivityValues(input: {
  readonly programId?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly activityType: string;
  readonly startAt: string;
  readonly endAt?: string | null;
  readonly location?: string | null;
  readonly status?: string;
}): ActivityValues {
  const startAt = normalizeTimestamp('startAt', input.startAt);
  if (startAt === null) throw new DomainValidationError('startAt', 'startAt is required.');
  const endAt = normalizeTimestamp('endAt', input.endAt);
  assertTimeOrder(startAt, endAt);
  return Object.freeze({
    programId: normalizeProgramId(input.programId),
    title: normalizeRequiredText('title', input.title),
    description: normalizeOptionalText('description', input.description),
    activityType: normalizeRequiredText('activityType', input.activityType),
    startAt,
    endAt,
    location: normalizeOptionalText('location', input.location),
    status: normalizeStatus(input.status),
  });
}

export function validateActivityPatch(input: ActivityPatchInput, current: Activity): ActivityPatch {
  if (Object.values(input).every((value) => value === undefined)) {
    throw new DomainValidationError('body', 'at least one field must be provided.');
  }
  const startAt = input.startAt === undefined ? current.startAt : normalizeTimestamp('startAt', input.startAt);
  if (startAt === null) throw new DomainValidationError('startAt', 'startAt is required.');
  const endAt = input.endAt === undefined ? current.endAt : normalizeTimestamp('endAt', input.endAt);
  assertTimeOrder(startAt, endAt);

  const patch: {
    programId?: string | null;
    title?: string;
    description?: string | null;
    activityType?: string;
    startAt?: string;
    endAt?: string | null;
    location?: string | null;
    status?: ActivityStatus;
  } = {};
  if (input.programId !== undefined) patch.programId = normalizeProgramId(input.programId);
  if (input.title !== undefined) patch.title = normalizeRequiredText('title', input.title);
  if (input.description !== undefined) patch.description = normalizeOptionalText('description', input.description);
  if (input.activityType !== undefined) {
    patch.activityType = normalizeRequiredText('activityType', input.activityType);
  }
  if (input.startAt !== undefined) patch.startAt = startAt;
  if (input.endAt !== undefined) patch.endAt = endAt;
  if (input.location !== undefined) patch.location = normalizeOptionalText('location', input.location);
  if (input.status !== undefined) patch.status = normalizeStatus(input.status);
  return Object.freeze(patch);
}
