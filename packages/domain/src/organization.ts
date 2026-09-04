import {
  ENTITY_STATUSES,
  UNIT_TYPES,
  DomainValidationError,
  assertValidSlug,
  type EntityStatus,
  type UnitType,
} from './identity';

const NAME_MAX_LENGTH = 160;
const DESCRIPTION_MAX_LENGTH = 2_000;

export interface OrganizationValues {
  readonly name: string;
  readonly slug: string;
  readonly status: EntityStatus;
  readonly description: string | null;
}

export interface UnitValues extends OrganizationValues {
  readonly type: UnitType;
}

export interface OrganizationPatch {
  readonly name?: string;
  readonly slug?: string;
  readonly status?: EntityStatus;
  readonly description?: string | null;
}

export interface UnitPatch extends OrganizationPatch {
  readonly type?: UnitType;
}

export interface OrganizationPatchInput {
  readonly name?: string;
  readonly slug?: string;
  readonly status?: string;
  readonly description?: string | null;
}

export interface UnitPatchInput extends OrganizationPatchInput {
  readonly type?: string;
}

function normalizeName(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new DomainValidationError('name', 'name is required.');
  }
  if (normalized.length > NAME_MAX_LENGTH) {
    throw new DomainValidationError('name', `name must not exceed ${NAME_MAX_LENGTH} characters.`);
  }
  return normalized;
}

function normalizeDescription(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  if (normalized.length > DESCRIPTION_MAX_LENGTH) {
    throw new DomainValidationError(
      'description',
      `description must not exceed ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
  }
  return normalized.length === 0 ? null : normalized;
}

function assertStatus(value: string): asserts value is EntityStatus {
  if (!(ENTITY_STATUSES as readonly string[]).includes(value)) {
    throw new DomainValidationError('status', 'status is invalid.');
  }
}

function assertUnitType(value: string): asserts value is UnitType {
  if (!(UNIT_TYPES as readonly string[]).includes(value)) {
    throw new DomainValidationError('type', 'type is invalid.');
  }
}

export function validateOrganizationValues(input: {
  readonly name: string;
  readonly slug: string;
  readonly status?: string;
  readonly description?: string | null;
}): OrganizationValues {
  const slug = input.slug.trim();
  assertValidSlug('slug', slug);
  const status = input.status ?? 'active';
  assertStatus(status);

  return Object.freeze({
    name: normalizeName(input.name),
    slug,
    status,
    description: normalizeDescription(input.description),
  });
}

export function validateUnitValues(input: {
  readonly name: string;
  readonly slug: string;
  readonly type: string;
  readonly status?: string;
  readonly description?: string | null;
}): UnitValues {
  const organization = validateOrganizationValues(input);
  assertUnitType(input.type);
  return Object.freeze({ ...organization, type: input.type });
}

export function validateOrganizationPatch(input: OrganizationPatchInput): OrganizationPatch {
  if (
    input.name === undefined &&
    input.slug === undefined &&
    input.status === undefined &&
    input.description === undefined
  ) {
    throw new DomainValidationError('body', 'at least one field must be provided.');
  }

  const output: {
    name?: string;
    slug?: string;
    status?: EntityStatus;
    description?: string | null;
  } = {};
  if (input.name !== undefined) output.name = normalizeName(input.name);
  if (input.slug !== undefined) {
    const slug = input.slug.trim();
    assertValidSlug('slug', slug);
    output.slug = slug;
  }
  if (input.status !== undefined) {
    assertStatus(input.status);
    output.status = input.status;
  }
  if (input.description !== undefined) output.description = normalizeDescription(input.description);
  return Object.freeze(output);
}

export function validateUnitPatch(input: UnitPatchInput): UnitPatch {
  if (
    input.name === undefined &&
    input.slug === undefined &&
    input.status === undefined &&
    input.description === undefined &&
    input.type === undefined
  ) {
    throw new DomainValidationError('body', 'at least one field must be provided.');
  }
  const organizationPatch =
    input.name === undefined &&
    input.slug === undefined &&
    input.status === undefined &&
    input.description === undefined
      ? {}
      : validateOrganizationPatch(input);
  if (input.type !== undefined) {
    assertUnitType(input.type);
  }
  return Object.freeze({
    ...organizationPatch,
    ...(input.type === undefined ? {} : { type: input.type }),
  });
}
