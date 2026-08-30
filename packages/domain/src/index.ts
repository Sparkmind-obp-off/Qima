export interface OrganizationRef {
  readonly id: string;
  readonly name: string;
}

export interface UnitRef {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
}

export function assertSameOrganization(expectedOrganizationId: string, unit: UnitRef): void {
  if (unit.organizationId !== expectedOrganizationId) {
    throw new Error('Unit does not belong to the expected organization scope.');
  }
}
