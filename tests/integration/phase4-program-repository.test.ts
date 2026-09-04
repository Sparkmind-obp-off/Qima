import { describe, expect, it } from 'vitest';
import { validateProgramValues } from '@qima/domain';
import { createProgramRepository } from '../../apps/api/src/infrastructure/database/repositories';
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

const values = validateProgramValues({
  name: 'Tahfidz',
  slug: 'tahfidz',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  capacity: 30,
});

describe('Phase 4 Program migration and repository', () => {
  it('enforces unit ownership, scoped slug uniqueness, dates, capacity and indexes', async () => {
    const database = await fixture();
    try {
      const repository = createProgramRepository(database.db);
      await repository.create(UNIT_A, 'program-a', values);
      await repository.create(UNIT_B, 'program-b', values);

      await expect(repository.create(UNIT_A, 'program-duplicate', values)).rejects.toThrow(
        'Database write failed.',
      );
      const duplicate = expectRejected(() =>
        database.exec(
          `insert into programs (id, unit_id, name, slug) values ('raw-duplicate', '${UNIT_A}', 'Duplicate', 'tahfidz')`,
        ),
      );
      expect(duplicate.message).toMatch(/UNIQUE/i);
      expectRejected(() =>
        database.exec(
          "insert into programs (id, unit_id, name, slug) values ('orphan', 'missing', 'Orphan', 'orphan')",
        ),
      );
      expectRejected(() =>
        database.exec(
          `insert into programs (id, unit_id, name, slug, capacity) values ('bad-capacity', '${UNIT_A}', 'Bad', 'bad-capacity', 0)`,
        ),
      );
      for (const slug of ['-leading', 'trailing-', 'double--hyphen']) {
        expectRejected(() =>
          database.exec(
            `insert into programs (id, unit_id, name, slug) values ('bad-${slug}', '${UNIT_A}', 'Bad', '${slug}')`,
          ),
        );
      }
      expectRejected(() =>
        database.exec(
          `insert into programs (id, unit_id, name, slug, start_date, end_date) values ('bad-date', '${UNIT_A}', 'Bad', 'bad-date', '2026-12-31', '2026-01-01')`,
        ),
      );

      const indexes = database.raw
        .prepare("select name from sqlite_master where type = 'index' and name like 'idx_programs_%'")
        .all() as { name: string }[];
      expect(indexes.map((row) => row.name).sort()).toEqual([
        'idx_programs_unit_id',
        'idx_programs_unit_slug',
        'idx_programs_unit_status',
      ]);
    } finally {
      database.close();
    }
  });

  it('requires unit scope for read, update, list, and soft delete', async () => {
    const database = await fixture();
    try {
      const repository = createProgramRepository(database.db);
      await repository.create(UNIT_A, 'program-a', values);

      expect(await repository.findById(UNIT_B, 'program-a')).toBeNull();
      expect((await repository.listByUnit(UNIT_B, { page: 1, perPage: 20 })).items).toEqual([]);
      expect(await repository.update(UNIT_B, 'program-a', { name: 'Compromised' })).toBeNull();
      expect(await repository.softDelete(UNIT_B, 'program-a')).toBe(false);

      expect((await repository.update(UNIT_A, 'program-a', { status: 'published' }))?.status).toBe(
        'published',
      );
      expect(await repository.softDelete(UNIT_A, 'program-a')).toBe(true);
      expect(await repository.findById(UNIT_A, 'program-a')).toBeNull();
      expect(
        database.raw.prepare('select deleted_at from programs where id = ?').get('program-a'),
      ).toMatchObject({ deleted_at: expect.any(String) });
    } finally {
      database.close();
    }
  });
});
