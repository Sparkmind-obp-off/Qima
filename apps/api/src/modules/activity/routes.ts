import { Hono } from 'hono';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import type { ActivityPatchInput } from '@qima/domain';
import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  updateActivity,
} from '../../application/activity/activity-use-cases';
import {
  createActivityRepository,
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

export const activityRoutes = new Hono<{
  Bindings: QimaBindings;
  Variables: AuthorizationVariables;
}>();

const ACTIVITY_FIELDS = [
  'program_id',
  'title',
  'description',
  'activity_type',
  'start_at',
  'end_at',
  'location',
  'status',
] as const;
const READ_POLICY = {
  organizationQuery: 'organization_id',
  unitQuery: 'unit_id',
  permission: 'activities.read',
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
    (ACTIVITY_FIELDS as readonly string[]).includes(key),
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

function listInput(query: (name: string) => string | undefined): {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  programId?: string;
} {
  const page = Number(query('page'));
  const perPage = Number(query('limit'));
  const search = query('search');
  const status = query('status');
  const programId = query('program_id');
  return {
    ...(Number.isFinite(page) ? { page } : {}),
    ...(Number.isFinite(perPage) ? { perPage } : {}),
    ...(search === undefined ? {} : { search }),
    ...(status === undefined ? {} : { status }),
    ...(programId === undefined ? {} : { programId }),
  };
}

function publicActivity(activity: {
  id: string;
  unitId: string;
  programId: string | null;
  title: string;
  description: string | null;
  activityType: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: activity.id,
    unit_id: activity.unitId,
    program_id: activity.programId,
    title: activity.title,
    description: activity.description,
    activity_type: activity.activityType,
    start_at: activity.startAt,
    end_at: activity.endAt,
    location: activity.location,
    status: activity.status,
    created_at: activity.createdAt,
    updated_at: activity.updatedAt,
  };
}

function failureFor(reason: ResourceFailureReason, message: string) {
  const code =
    reason === 'VALIDATION' ? 'VALIDATION_ERROR' : reason === 'CONFLICT' ? 'CONFLICT' : 'NOT_FOUND';
  return { body: failure(code, message), status: ERROR_STATUS[code] };
}

function parseBody(body: JsonObject, create: boolean) {
  const programId = nullableStringField(body, 'program_id');
  const title = stringField(body, 'title', create);
  const description = nullableStringField(body, 'description');
  const activityType = stringField(body, 'activity_type', create);
  const startAt = stringField(body, 'start_at', create);
  const endAt = nullableStringField(body, 'end_at');
  const location = nullableStringField(body, 'location');
  const status = stringField(body, 'status');
  if (
    programId === false ||
    title === null ||
    description === false ||
    activityType === null ||
    startAt === null ||
    endAt === false ||
    location === false ||
    status === null
  ) {
    return null;
  }
  return {
    ...(programId === undefined ? {} : { programId }),
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
    ...(activityType === undefined ? {} : { activityType }),
    ...(startAt === undefined ? {} : { startAt }),
    ...(endAt === undefined ? {} : { endAt }),
    ...(location === undefined ? {} : { location }),
    ...(status === undefined ? {} : { status }),
  };
}

activityRoutes.use('*', requireAuthentication);

activityRoutes.get('/', requireAuthorization(READ_POLICY), async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  const unitId = c.get('authorization').unitId as string;
  try {
    const result = await listActivities(unitId, listInput((name) => c.req.query(name)), {
      activities: createActivityRepository(db),
      programs: createProgramRepository(db),
    });
    if (!result.ok) {
      const mapped = failureFor(result.reason, result.message);
      return c.json(mapped.body, mapped.status);
    }
    return c.json(
      success({
        items: result.value.items.map(publicActivity),
        page: result.value.page,
        limit: result.value.perPage,
        total: result.value.total,
      }),
    );
  } catch {
    return c.json(failure('INTERNAL_ERROR', 'Activities could not be listed.'), 500);
  }
});

activityRoutes.post(
  '/',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'activities.create' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid activity body is required.'), 400);
    }
    const parsed = parseBody(body, true);
    if (
      parsed === null ||
      parsed.title === undefined ||
      parsed.activityType === undefined ||
      parsed.startAt === undefined
    ) {
      return c.json(failure('VALIDATION_ERROR', 'Activity fields are invalid.'), 400);
    }
    const authorization = c.get('authorization');
    try {
      const result = await createActivity(
        authorization.organizationId as string,
        authorization.unitId as string,
        {
          programId: parsed.programId,
          title: parsed.title,
          description: parsed.description,
          activityType: parsed.activityType,
          startAt: parsed.startAt,
          endAt: parsed.endAt,
          location: parsed.location,
          status: parsed.status,
        },
        {
          activities: createActivityRepository(db),
          programs: createProgramRepository(db),
          units: createUnitRepository(db),
        },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicActivity(result.value)), 201);
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Activity could not be created.'), 500);
    }
  },
);

activityRoutes.get('/:activityId', requireAuthorization(READ_POLICY), async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  try {
    const result = await getActivity(
      c.get('authorization').unitId as string,
      c.req.param('activityId'),
      { activities: createActivityRepository(db) },
    );
    if (!result.ok) {
      const mapped = failureFor(result.reason, result.message);
      return c.json(mapped.body, mapped.status);
    }
    return c.json(success(publicActivity(result.value)));
  } catch {
    return c.json(failure('INTERNAL_ERROR', 'Activity could not be read.'), 500);
  }
});

activityRoutes.patch(
  '/:activityId',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'activities.update' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid activity patch is required.'), 400);
    }
    const parsed = parseBody(body, false);
    if (parsed === null) return c.json(failure('VALIDATION_ERROR', 'Activity fields are invalid.'), 400);
    const patch: ActivityPatchInput = parsed;
    try {
      const result = await updateActivity(
        c.get('authorization').unitId as string,
        c.req.param('activityId'),
        patch,
        {
          activities: createActivityRepository(db),
          programs: createProgramRepository(db),
        },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicActivity(result.value)));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Activity could not be updated.'), 500);
    }
  },
);

activityRoutes.delete(
  '/:activityId',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'activities.delete' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    try {
      const result = await deleteActivity(
        c.get('authorization').unitId as string,
        c.req.param('activityId'),
        { activities: createActivityRepository(db) },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(result.value));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Activity could not be deleted.'), 500);
    }
  },
);
