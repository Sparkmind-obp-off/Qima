import { describe, expect, it } from 'vitest';
import {
  createOrganizationRepository,
  createUnitRepository,
} from '../../apps/api/src/infrastructure/database/repositories';
import { normalizePageRequest } from '@qima/domain';
import { createMigratedDatabase, expectRejected } from './sqlite-harness';

const ORG_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const ORG_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const UNIT_A = 'aaaaaaaa-0000-4000-8000-000000000101';
const UNIT_B = 'bbbbbbbb-0000-4000-8000-000000000101';
const page = normalizePageRequest({ page: 1, perPage: 20 });

describe('Phase 3 organization and unit repositories', () => {
  it('creates and updates organizations through the repository boundary', async () => {
    const database = await createMigratedDatabase();
    try {
      const organizations = createOrganizationRepository(database.db);
      const created = await organizations.create(ORG_A, {
        name: 'Organization A',
        slug: 'organization-a',
        status: 'active',
        description: null,
      });
      expect(created.id).toBe(ORG_A);
      expect((await organizations.update(ORG_A, { name: 'Organization A Updated' }))?.name).toBe(
        'Organization A Updated',
      );
      expect((await organizations.listByIds([ORG_A], page)).items.map((item) => item.id)).toEqual([
        ORG_A,
      ]);
      expect((await organizations.listByIds([ORG_B], page)).total).toBe(0);
    } finally {
      database.close();
    }
  });

  it('enforces organization foreign keys and organization-scoped slug uniqueness', async () => {
    const database = await createMigratedDatabase();
    try {
      database.exec(`
        insert into organizations (id, name, slug) values
          ('${ORG_A}', 'Organization A', 'organization-a'),
          ('${ORG_B}', 'Organization B', 'organization-b');
      `);
      const units = createUnitRepository(database.db);
      await units.create(ORG_A, UNIT_A, {
        name: 'Shared Name A',
        slug: 'shared-slug',
        type: 'community',
        status: 'active',
        description: null,
      });
      await units.create(ORG_B, UNIT_B, {
        name: 'Shared Name B',
        slug: 'shared-slug',
        type: 'school',
        status: 'active',
        description: null,
      });

      expect((await units.findById(ORG_A, UNIT_A))?.organizationId).toBe(ORG_A);
      expect(await units.findById(ORG_A, UNIT_B)).toBeNull();
      expect((await units.listByOrganization(ORG_A, page)).items.map((item) => item.id)).toEqual([
        UNIT_A,
      ]);

      expectRejected(() =>
        database.exec(
          `insert into units (id, organization_id, name, slug) values
           ('unit-duplicate', '${ORG_A}', 'Duplicate', 'shared-slug')`,
        ),
      );
      expectRejected(() =>
        database.exec(
          `insert into units (id, organization_id, name, slug) values
           ('unit-orphan', 'cccccccc-0000-4000-8000-000000000001', 'Orphan', 'orphan')`,
        ),
      );
    } finally {
      database.close();
    }
  });

  it('never moves a unit across organizations during an update', async () => {
    const database = await createMigratedDatabase();
    try {
      database.exec(`
        insert into organizations (id, name, slug) values
          ('${ORG_A}', 'Organization A', 'organization-a'),
          ('${ORG_B}', 'Organization B', 'organization-b');
        insert into units (id, organization_id, name, slug)
          values ('${UNIT_A}', '${ORG_A}', 'Unit A', 'unit-a');
      `);
      const units = createUnitRepository(database.db);
      expect(await units.update(ORG_B, UNIT_A, { name: 'Tampered' })).toBeNull();
      expect((await units.findById(ORG_A, UNIT_A))?.name).toBe('Unit A');
    } finally {
      database.close();
    }
  });
});
