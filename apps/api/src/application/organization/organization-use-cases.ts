import {
  DomainValidationError,
  normalizePageRequest,
  validateOrganizationPatch,
  validateOrganizationValues,
  type AccessAssignmentRepository,
  type Organization,
  type OrganizationPatchInput,
  type OrganizationRepository,
  type Page,
  type PageRequest,
} from '@qima/domain';

export type ResourceFailureReason = 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND';
export type ResourceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: ResourceFailureReason; readonly message: string };

interface OrganizationDependencies {
  readonly organizations: OrganizationRepository;
}

interface CreateOrganizationDependencies extends OrganizationDependencies {
  readonly generateId?: () => string;
}

export async function createOrganization(
  input: { readonly name: string; readonly slug: string; readonly status?: string; readonly description?: string | null },
  dependencies: CreateOrganizationDependencies,
): Promise<ResourceResult<Organization>> {
  try {
    const values = validateOrganizationValues(input);
    if ((await dependencies.organizations.findBySlug(values.slug)) !== null) {
      return { ok: false, reason: 'CONFLICT', message: 'Organization slug already exists.' };
    }
    const id = (dependencies.generateId ?? (() => crypto.randomUUID()))();
    return { ok: true, value: await dependencies.organizations.create(id, values) };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}

export async function listOrganizations(
  userId: string,
  page: Partial<PageRequest> | undefined,
  dependencies: OrganizationDependencies & { readonly accessAssignments: AccessAssignmentRepository },
): Promise<Page<Organization>> {
  const normalizedPage = normalizePageRequest(page);
  const assignments = await dependencies.accessAssignments.listAssignments(userId);
  const platformPermissions = await dependencies.accessAssignments.resolvePermissionKeys(
    userId,
    null,
    null,
  );
  if (platformPermissions.includes('organizations.read')) {
    return dependencies.organizations.list(normalizedPage);
  }

  const candidateIds = [
    ...new Set(
      assignments
        .map((assignment) => assignment.organizationId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const permissionChecks = await Promise.all(
    candidateIds.map(async (organizationId) => ({
      organizationId,
      permissions: await dependencies.accessAssignments.resolvePermissionKeys(
        userId,
        organizationId,
        null,
      ),
    })),
  );
  return dependencies.organizations.listByIds(
    permissionChecks
      .filter(({ permissions }) => permissions.includes('organizations.read'))
      .map(({ organizationId }) => organizationId),
    normalizedPage,
  );
}

export async function getOrganization(
  organizationId: string,
  dependencies: OrganizationDependencies,
): Promise<ResourceResult<Organization>> {
  const organization = await dependencies.organizations.findById(organizationId);
  return organization === null
    ? { ok: false, reason: 'NOT_FOUND', message: 'Organization not found.' }
    : { ok: true, value: organization };
}

export async function updateOrganization(
  organizationId: string,
  input: OrganizationPatchInput,
  dependencies: OrganizationDependencies,
): Promise<ResourceResult<Organization>> {
  try {
    const patch = validateOrganizationPatch(input);
    if (patch.slug !== undefined) {
      const existing = await dependencies.organizations.findBySlug(patch.slug);
      if (existing !== null && existing.id !== organizationId) {
        return { ok: false, reason: 'CONFLICT', message: 'Organization slug already exists.' };
      }
    }
    const updated = await dependencies.organizations.update(organizationId, patch);
    return updated === null
      ? { ok: false, reason: 'NOT_FOUND', message: 'Organization not found.' }
      : { ok: true, value: updated };
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return { ok: false, reason: 'VALIDATION', message: error.message };
    }
    throw error;
  }
}
