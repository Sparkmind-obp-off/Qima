import { describe, expect, it } from 'vitest';
import { validateParticipantValues } from '@qima/domain';
import { createParticipantRepository } from '../../apps/api/src/infrastructure/database/repositories';
import { createMigratedDatabase, expectRejected } from './sqlite-harness';

const ORG_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const ORG_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const UNIT_A = 'aaaaaaaa-0000-4000-8000-000000000101';
const UNIT_B = 'bbbbbbbb-0000-4000-8000-000000000101';

async function fixture() {
  const database = await createMigratedDatabase();
  database.exec(`
    insert into organizations (id, name, slug) values
      ('${ORG_A}', 'Organization A', 'organization-a'),
      ('${ORG_B}', 'Organization B', 'organization-b');
    insert into units (id, organization_id, name, slug) values
      ('${UNIT_A}', '${ORG_A}', 'Unit A', 'unit-a'),
      ('${UNIT_B}', '${ORG_B}', 'Unit B', 'unit-b');
  `);
  return database;
}

const values = validateParticipantValues({
  name: 'Ahmad Fauzan',
  phone: '08123456789',
  email: 'ahmad@example.com',
  dateOfBirth: '2010-01-01',
  gender: 'Laki-laki',
  metadata: { source: 'admin' },
});

describe('Phase 6 Participant migration and repository', () => {
  it('enforces Unit ownership, required fields, metadata integrity, and scoped indexes', async () => {
    const database = await fixture();
    try {
      const repository = createParticipantRepository(database.db);
      expect((await repository.create(UNIT_A, 'participant-a', values)).unitId).toBe(UNIT_A);
      expectRejected(() => database.exec("insert into participants (id, unit_id, name) values ('orphan', 'missing', 'Orphan')"));
      expectRejected(() => database.exec(`insert into participants (id, unit_id, name) values ('blank', '${UNIT_A}', ' ')`));
      expectRejected(() => database.exec(`insert into participants (id, unit_id, name, metadata) values ('bad-json', '${UNIT_A}', 'Bad', '[]')`));
      const indexes = database.raw.prepare("select name from sqlite_master where type = 'index' and name like 'idx_participants_%'").all() as { name: string }[];
      expect(indexes.map((row) => row.name).sort()).toEqual([
        'idx_participants_unit_created_at',
        'idx_participants_unit_id',
        'idx_participants_unit_name',
        'idx_participants_unit_status',
      ]);
    } finally {
      database.close();
    }
  });

  it('creates, reads, updates, searches, filters and paginates only inside Unit scope', async () => {
    const database = await fixture();
    try {
      const repository = createParticipantRepository(database.db);
      await repository.create(UNIT_A, 'participant-a', values);
      await repository.create(UNIT_B, 'participant-b', validateParticipantValues({ name: 'Other Tenant', email: 'other@example.com' }));

      expect(await repository.findById(UNIT_B, 'participant-a')).toBeNull();
      expect((await repository.listByUnit(UNIT_A, { page: 1, perPage: 1 })).items).toHaveLength(1);
      expect((await repository.listByUnit(UNIT_A, { page: 2, perPage: 1 })).items).toHaveLength(0);
      expect((await repository.listByUnit(UNIT_A, { page: 1, perPage: 20, search: 'ahmad@example' })).total).toBe(1);
      expect((await repository.listByUnit(UNIT_A, { page: 1, perPage: 20, status: 'inactive' })).total).toBe(0);
      expect(await repository.update(UNIT_B, 'participant-a', { name: 'Compromised' })).toBeNull();
      expect((await repository.update(UNIT_A, 'participant-a', { status: 'inactive', metadata: { reviewed: true } }))?.status).toBe('inactive');
      expect((await repository.findById(UNIT_A, 'participant-a'))?.metadata).toEqual({ reviewed: true });
    } finally {
      database.close();
    }
  });
});
