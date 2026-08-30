export function assertSameOrganization(expectedOrganizationId, unit) {
  if (unit.organizationId !== expectedOrganizationId) {
    throw new Error('Unit does not belong to the expected organization scope.');
  }
}
