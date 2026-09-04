import { describe, expect, it } from 'vitest';
import { validateActivityValues } from '@qima/domain';
import { createActivityRepository } from '../../apps/api/src/infrastructure/database/repositories';
import { createMigratedDatabase, expectRejected } from './sqlite-harness';

const ORG_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const ORG_B = 'bbbbbbbb-0000-4000-8000-000000000001';
const UNIT_A = 'aaaaaaaa-0000-4000-8000-000000000101';
const UNIT_B = 'bbbbbbbb-0000-4000-8000-000000000101';
const PROGRAM_A = 'aaaaaaaa-0000-4000-8000-000000000501';
const PROGRAM_B = 'bbbbbbbb-0000-4000-8000-000000000501';

async function fixture() {
  const database = await createMigratedDatabase();
  database.exec(`
    insert into organizations (id, name, slug) values
      ('${ORG_A}', 'Organization A', 'organization-a'),
      ('${ORG_B}', 'Organization B', 'organization-b');
    insert into units (id, organization_id, name, slug) values
      ('${UNIT_A}', '${ORG_A}', 'Unit A', 'unit-a'),
      ('${UNIT_B}', '${ORG_B}', 'Unit B', 'unit-b');
    insert into programs (id, unit_id, name, slug) values
      ('${PROGRAM_A}', '${UNIT_A}', 'Program A', 'program-a'),
      ('${PROGRAM_B}', '${UNIT_B}', 'Program B', 'program-b');
  `);
  return database;
}

const values = validateActivityValues({
  programId: PROGRAM_A,
  title: 'Kajian Pekanan',
  activityType: 'kajian',
  startAt: '2026-09-10T08:00:00Z',
  endAt: '2026-09-10T10:00:00Z',
  location: 'Aula',
});

describe('Phase 5 Activity migration and repository', () => {
  it('enforces Unit ownership, same-Unit Program relationship, schedule and indexes', async () => {
    const database = await fixture();
    try {
      const repository = createActivityRepository(database.db);
      expect((await repository.create(UNIT_A, 'activity-a', values)).programId).toBe(PROGRAM_A);

      expectRejected(() =>
        database.exec(
          `insert into activities (id, unit_id, program_id, title, activity_type, start_at)
           values ('cross-program', '${UNIT_A}', '${PROGRAM_B}', 'Cross', 'kajian', '2026-09-10T08:00:00Z')`,
        ),
      );
      expectRejected(() =>
        database.exec(
          `insert into activities (id, unit_id, title, activity_type, start_at)
           values ('orphan', 'missing', 'Orphan', 'kajian', '2026-09-10T08:00:00Z')`,
        ),
      );
      expectRejected(() =>
        database.exec(
          `insert into activities (id, unit_id, title, activity_type, start_at, end_at)
           values ('bad-time', '${UNIT_A}', 'Bad', 'kajian', '2026-09-10T10:00:00Z', '2026-09-10T08:00:00Z')`,
        ),
      );

      const indexes = database.raw
        .prepare("select name from sqlite_master where type = 'index' and name like 'idx_activities_%'")
        .all() as { name: string }[];
      expect(indexes.map((row) => row.name).sort()).toEqual([
        'idx_activities_program_id',
        'idx_activities_unit_id',
        'idx_activities_unit_start_at',
        'idx_activities_unit_status',
      ]);
    } finally {
      database.close();
    }
  });

  it('creates, reads, updates, filters, paginates and soft-deletes only inside Unit scope', async () => {
    const database = await fixture();
    try {
      const repository = createActivityRepository(database.db);
      await repository.create(UNIT_A, 'activity-a', values);
      await repository.create(
        UNIT_B,
        'activity-b',
        validateActivityValues({
          programId: PROGRAM_B,
          title: 'Other Tenant Activity',
          activityType: 'meeting',
          startAt: '2026-09-11T08:00:00Z',
        }),
      );

      expect(await repository.findById(UNIT_B, 'activity-a')).toBeNull();
      expect((await repository.listByUnit(UNIT_A, { page: 1, perPage: 1 })).items).toHaveLength(1);
      expect((await repository.listByUnit(UNIT_A, { page: 2, perPage: 1 })).items).toHaveLength(0);
      expect(
        (await repository.listByUnit(UNIT_A, { page: 1, perPage: 20, programId: PROGRAM_A })).total,
      ).toBe(1);
      expect(
        (await repository.listByUnit(UNIT_A, { page: 1, perPage: 20, search: 'aula' })).total,
      ).toBe(1);
      expect(await repository.update(UNIT_B, 'activity-a', { title: 'Compromised' })).toBeNull();
      expect((await repository.update(UNIT_A, 'activity-a', { status: 'published' }))?.status).toBe(
        'published',
      );
      expect(await repository.softDelete(UNIT_B, 'activity-a')).toBe(false);
      expect(await repository.softDelete(UNIT_A, 'activity-a')).toBe(true);
      expect(await repository.findById(UNIT_A, 'activity-a')).toBeNull();
    } finally {
      database.close();
    }
  });
});
