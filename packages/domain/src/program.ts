import { DomainValidationError, assertValidSlug } from './identity';

export const PROGRAM_STATUSES = ['draft', 'published', 'archived'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export interface Program {
  readonly id: string;
  readonly unitId: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly status: ProgramStatus;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly capacity: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface ProgramValues {
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly status: ProgramStatus;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly capacity: number | null;
}

export interface ProgramPatch {
  readonly name?: string;
  readonly slug?: string;
  readonly description?: string | null;
  readonly status?: ProgramStatus;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly capacity?: number | null;
}

export interface ProgramPatchInput {
  readonly name?: string;
  readonly slug?: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly capacity?: number | null;
}

const NAME_MAX_LENGTH = 160;
const DESCRIPTION_MAX_LENGTH = 2_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeName(value: string): string {
  const name = value.trim();
  if (name.length === 0) throw new DomainValidationError('name', 'name is required.');
  if (name.length > NAME_MAX_LENGTH) {
    throw new DomainValidationError('name', `name must not exceed ${NAME_MAX_LENGTH} characters.`);
  }
  return name;
}

function normalizeDescription(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const description = value.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new DomainValidationError(
      'description',
      `description must not exceed ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
  }
  return description.length === 0 ? null : description;
}

function normalizeDate(field: 'startDate' | 'endDate', value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!DATE_PATTERN.test(value)) {
    throw new DomainValidationError(field, `${field} must be a valid YYYY-MM-DD date.`);
  }

  const [yearText = '', monthText = '', dayText = ''] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new DomainValidationError(field, `${field} must be a valid YYYY-MM-DD date.`);
  }
  return value;
}

function normalizeCapacity(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 1 || value > 1_000_000) {
    throw new DomainValidationError('capacity', 'capacity must be a positive integer.');
  }
  return value;
}

function normalizeStatus(value: string | undefined): ProgramStatus {
  const status = value ?? 'draft';
  if (!(PROGRAM_STATUSES as readonly string[]).includes(status)) {
    throw new DomainValidationError('status', 'status is invalid.');
  }
  return status as ProgramStatus;
}

function assertDateOrder(startDate: string | null, endDate: string | null): void {
  if (startDate !== null && endDate !== null && endDate < startDate) {
    throw new DomainValidationError('endDate', 'endDate must be on or after startDate.');
  }
}

export function validateProgramValues(input: {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly capacity?: number | null;
}): ProgramValues {
  const slug = input.slug.trim();
  assertValidSlug('slug', slug);
  const startDate = normalizeDate('startDate', input.startDate);
  const endDate = normalizeDate('endDate', input.endDate);
  assertDateOrder(startDate, endDate);
  return Object.freeze({
    name: normalizeName(input.name),
    slug,
    description: normalizeDescription(input.description),
    status: normalizeStatus(input.status),
    startDate,
    endDate,
    capacity: normalizeCapacity(input.capacity),
  });
}

export function validateProgramPatch(input: ProgramPatchInput, current: Program): ProgramPatch {
  if (Object.values(input).every((value) => value === undefined)) {
    throw new DomainValidationError('body', 'at least one field must be provided.');
  }
  const startDate =
    input.startDate === undefined ? current.startDate : normalizeDate('startDate', input.startDate);
  const endDate = input.endDate === undefined ? current.endDate : normalizeDate('endDate', input.endDate);
  assertDateOrder(startDate, endDate);

  const patch: {
    name?: string;
    slug?: string;
    description?: string | null;
    status?: ProgramStatus;
    startDate?: string | null;
    endDate?: string | null;
    capacity?: number | null;
  } = {};
  if (input.name !== undefined) patch.name = normalizeName(input.name);
  if (input.slug !== undefined) {
    const slug = input.slug.trim();
    assertValidSlug('slug', slug);
    patch.slug = slug;
  }
  if (input.description !== undefined) patch.description = normalizeDescription(input.description);
  if (input.status !== undefined) patch.status = normalizeStatus(input.status);
  if (input.startDate !== undefined) patch.startDate = startDate;
  if (input.endDate !== undefined) patch.endDate = endDate;
  if (input.capacity !== undefined) patch.capacity = normalizeCapacity(input.capacity);
  return Object.freeze(patch);
}
