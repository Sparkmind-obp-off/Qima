import { Hono } from 'hono';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import type { ProgramPatchInput } from '@qima/domain';
import {
  createProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  updateProgram,
} from '../../application/program/program-use-cases';
import {
  createProgramRepository,
  createUnitRepository,
} from '../../infrastructure/database/repositories';
import type { QimaDatabase } from '../../infrastructure/database/d1-client';
import type { QimaBindings } from '../../bindings';
import {
  requireAuthentication,
  requireAuthorization,
  type AuthorizationVariables,
} from '../auth/authorization-middleware';
import type { ResourceFailureReason } from '../../application/organization/organization-use-cases';

export const programRoutes = new Hono<{
  Bindings: QimaBindings;
  Variables: AuthorizationVariables;
}>();

const PROGRAM_FIELDS = [
  'name',
  'slug',
  'description',
  'status',
  'start_date',
  'end_date',
  'capacity',
] as const;
const READ_POLICY = {
  organizationQuery: 'organization_id',
  unitQuery: 'unit_id',
  permission: 'programs.read',
} as const;
const MANAGER_ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'UNIT_ADMIN'] as const;
type JsonObject = Record<string, unknown>;

function databaseOf(env: QimaBindings | undefined): QimaDatabase | null {
  const binding = env?.DB;
  return binding === undefined || binding === null ? null : (binding as unknown as QimaDatabase);
}

function requiredDatabase(env: QimaBindings | undefined): QimaDatabase | Response {
  return (
    databaseOf(env) ??
    Response.json(
      failure('INTERNAL_ERROR', 'Database binding is not configured for this environment.'),
      { status: ERROR_STATUS.INTERNAL_ERROR },
    )
  );
}

async function readJsonObject(request: { json(): Promise<unknown> }): Promise<JsonObject | null> {
  try {
    const body = await request.json();
    return body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as JsonObject)
      : null;
  } catch {
    return null;
  }
}

function hasOnlyFields(body: JsonObject): boolean {
  return Object.keys(body).every((key) =>
    (PROGRAM_FIELDS as readonly string[]).includes(key),
  );
}

function stringField(body: JsonObject, key: string, required = false): string | undefined | null {
  const value = body[key];
  if (value === undefined) return required ? null : undefined;
  return typeof value === 'string' ? value : null;
}

function nullableStringField(body: JsonObject, key: string): string | null | undefined | false {
  const value = body[key];
  if (value === undefined || value === null || typeof value === 'string') return value;
  return false;
}

function nullableNumberField(body: JsonObject, key: string): number | null | undefined | false {
  const value = body[key];
  if (value === undefined || value === null || typeof value === 'number') return value;
  return false;
}

function defaultSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function listInput(query: (name: string) => string | undefined): {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
} {
  const page = Number(query('page'));
  const perPage = Number(query('limit'));
  const search = query('search');
  const status = query('status');
  return {
    ...(Number.isFinite(page) ? { page } : {}),
    ...(Number.isFinite(perPage) ? { perPage } : {}),
    ...(search === undefined ? {} : { search }),
    ...(status === undefined ? {} : { status }),
  };
}

function publicProgram(program: {
  id: string;
  unitId: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: program.id,
    unit_id: program.unitId,
    name: program.name,
    slug: program.slug,
    description: program.description,
    status: program.status,
    start_date: program.startDate,
    end_date: program.endDate,
    capacity: program.capacity,
    created_at: program.createdAt,
    updated_at: program.updatedAt,
  };
}

function failureFor(reason: ResourceFailureReason, message: string) {
  const code =
    reason === 'VALIDATION' ? 'VALIDATION_ERROR' : reason === 'CONFLICT' ? 'CONFLICT' : 'NOT_FOUND';
  return { body: failure(code, message), status: ERROR_STATUS[code] };
}

function parseBody(body: JsonObject, create: boolean) {
  const name = stringField(body, 'name', create);
  const slug = stringField(body, 'slug');
  const description = nullableStringField(body, 'description');
  const status = stringField(body, 'status');
  const startDate = nullableStringField(body, 'start_date');
  const endDate = nullableStringField(body, 'end_date');
  const capacity = nullableNumberField(body, 'capacity');
  if (
    name === null ||
    slug === null ||
    description === false ||
    status === null ||
    startDate === false ||
    endDate === false ||
    capacity === false
  ) {
    return null;
  }
  return {
    ...(name === undefined ? {} : { name }),
    ...(slug === undefined ? {} : { slug }),
    ...(description === undefined ? {} : { description }),
    ...(status === undefined ? {} : { status }),
    ...(startDate === undefined ? {} : { startDate }),
    ...(endDate === undefined ? {} : { endDate }),
    ...(capacity === undefined ? {} : { capacity }),
  };
}

programRoutes.use('*', requireAuthentication);

programRoutes.get('/', requireAuthorization(READ_POLICY), async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  const unitId = c.get('authorization').unitId as string;
  try {
    const result = await listPrograms(unitId, listInput((name) => c.req.query(name)), {
      programs: createProgramRepository(db),
    });
    if (!result.ok) {
      const mapped = failureFor(result.reason, result.message);
      return c.json(mapped.body, mapped.status);
    }
    return c.json(
      success({
        items: result.value.items.map(publicProgram),
        page: result.value.page,
        limit: result.value.perPage,
        total: result.value.total,
      }),
    );
  } catch {
    return c.json(failure('INTERNAL_ERROR', 'Programs could not be listed.'), 500);
  }
});

programRoutes.post(
  '/',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'programs.create' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid program body is required.'), 400);
    }
    const parsed = parseBody(body, true);
    if (parsed === null || parsed.name === undefined) {
      return c.json(failure('VALIDATION_ERROR', 'Program fields are invalid.'), 400);
    }
    const authorization = c.get('authorization');
    try {
      const result = await createProgram(
        authorization.organizationId as string,
        authorization.unitId as string,
        {
          name: parsed.name,
          slug: parsed.slug ?? defaultSlug(parsed.name),
          description: parsed.description,
          status: parsed.status,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          capacity: parsed.capacity,
        },
        {
          programs: createProgramRepository(db),
          units: createUnitRepository(db),
        },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicProgram(result.value)), 201);
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Program could not be created.'), 500);
    }
  },
);

programRoutes.get('/:programId', requireAuthorization(READ_POLICY), async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  try {
    const result = await getProgram(
      c.get('authorization').unitId as string,
      c.req.param('programId'),
      { programs: createProgramRepository(db) },
    );
    if (!result.ok) {
      const mapped = failureFor(result.reason, result.message);
      return c.json(mapped.body, mapped.status);
    }
    return c.json(success(publicProgram(result.value)));
  } catch {
    return c.json(failure('INTERNAL_ERROR', 'Program could not be read.'), 500);
  }
});

programRoutes.patch(
  '/:programId',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'programs.update' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid program patch is required.'), 400);
    }
    const parsed = parseBody(body, false);
    if (parsed === null) return c.json(failure('VALIDATION_ERROR', 'Program fields are invalid.'), 400);
    const patch: ProgramPatchInput = parsed;
    try {
      const result = await updateProgram(
        c.get('authorization').unitId as string,
        c.req.param('programId'),
        patch,
        { programs: createProgramRepository(db) },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicProgram(result.value)));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Program could not be updated.'), 500);
    }
  },
);

programRoutes.delete(
  '/:programId',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'programs.delete' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    try {
      const result = await deleteProgram(
        c.get('authorization').unitId as string,
        c.req.param('programId'),
        { programs: createProgramRepository(db) },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(result.value));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Program could not be deleted.'), 500);
    }
  },
);
