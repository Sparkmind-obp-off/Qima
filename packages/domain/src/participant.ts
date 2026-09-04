import { DomainValidationError } from './identity';

export const PARTICIPANT_STATUSES = ['active', 'inactive'] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export interface Participant {
  readonly id: string;
  readonly unitId: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly dateOfBirth: string | null;
  readonly gender: string | null;
  readonly status: ParticipantStatus;
  readonly metadata: Readonly<Record<string, unknown>> | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ParticipantValues {
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly dateOfBirth: string | null;
  readonly gender: string | null;
  readonly status: ParticipantStatus;
  readonly metadata: Readonly<Record<string, unknown>> | null;
}

export interface ParticipantPatch {
  readonly name?: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly dateOfBirth?: string | null;
  readonly gender?: string | null;
  readonly status?: ParticipantStatus;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
}

export interface ParticipantInput {
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly dateOfBirth?: string | null;
  readonly gender?: string | null;
  readonly status?: string;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
}

export interface ParticipantPatchInput {
  readonly name?: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly dateOfBirth?: string | null;
  readonly gender?: string | null;
  readonly status?: string;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
}

const NAME_MAX_LENGTH = 200;
const PHONE_MAX_LENGTH = 40;
const EMAIL_MAX_LENGTH = 254;
const GENDER_MAX_LENGTH = 40;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredName(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) throw new DomainValidationError('name', 'name is required.');
  if (normalized.length > NAME_MAX_LENGTH) {
    throw new DomainValidationError('name', `name must not exceed ${NAME_MAX_LENGTH} characters.`);
  }
  return normalized;
}

function optionalText(
  field: 'phone' | 'email' | 'gender',
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  const maximum = field === 'email' ? EMAIL_MAX_LENGTH : field === 'phone' ? PHONE_MAX_LENGTH : GENDER_MAX_LENGTH;
  if (normalized.length > maximum) {
    throw new DomainValidationError(field, `${field} must not exceed ${maximum} characters.`);
  }
  if (normalized.length === 0) return null;
  if (field === 'email' && !EMAIL_PATTERN.test(normalized)) {
    throw new DomainValidationError('email', 'email must be valid.');
  }
  return field === 'email' ? normalized.toLowerCase() : normalized;
}

function optionalDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === '') return null;
  const normalized = value.trim();
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (!DATE_PATTERN.test(normalized) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new DomainValidationError('dateOfBirth', 'dateOfBirth must be a valid date.');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (normalized > today) throw new DomainValidationError('dateOfBirth', 'dateOfBirth cannot be in the future.');
  return normalized;
}

function statusOf(value: string | undefined): ParticipantStatus {
  const status = value ?? 'active';
  if (!(PARTICIPANT_STATUSES as readonly string[]).includes(status)) {
    throw new DomainValidationError('status', 'status is invalid.');
  }
  return status as ParticipantStatus;
}

function metadataOf(value: Readonly<Record<string, unknown>> | null | undefined) {
  if (value === null || value === undefined) return null;
  return Object.freeze({ ...value });
}

export function validateParticipantValues(input: ParticipantInput): ParticipantValues {
  return Object.freeze({
    name: requiredName(input.name),
    phone: optionalText('phone', input.phone),
    email: optionalText('email', input.email),
    dateOfBirth: optionalDate(input.dateOfBirth),
    gender: optionalText('gender', input.gender),
    status: statusOf(input.status),
    metadata: metadataOf(input.metadata),
  });
}

export function validateParticipantPatch(input: ParticipantPatchInput): ParticipantPatch {
  if (Object.values(input).every((value) => value === undefined)) {
    throw new DomainValidationError('body', 'at least one field must be provided.');
  }
  const patch: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    status?: ParticipantStatus;
    metadata?: Readonly<Record<string, unknown>> | null;
  } = {};
  if (input.name !== undefined) patch.name = requiredName(input.name);
  if (input.phone !== undefined) patch.phone = optionalText('phone', input.phone);
  if (input.email !== undefined) patch.email = optionalText('email', input.email);
  if (input.dateOfBirth !== undefined) patch.dateOfBirth = optionalDate(input.dateOfBirth);
  if (input.gender !== undefined) patch.gender = optionalText('gender', input.gender);
  if (input.status !== undefined) patch.status = statusOf(input.status);
  if (input.metadata !== undefined) patch.metadata = metadataOf(input.metadata);
  return Object.freeze(patch);
}
