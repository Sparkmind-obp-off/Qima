import { Hono } from 'hono';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import type { ParticipantPatchInput } from '@qima/domain';
import {
  createParticipant,
  getParticipant,
  listParticipants,
  updateParticipant,
} from '../../application/participant/participant-use-cases';
import {
  createParticipantRepository,
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

export const participantRoutes = new Hono<{
  Bindings: QimaBindings;
  Variables: AuthorizationVariables;
}>();

const PARTICIPANT_FIELDS = [
  'name',
  'phone',
  'email',
  'date_of_birth',
  'gender',
  'status',
  'metadata',
] as const;
const READ_POLICY = {
  organizationQuery: 'organization_id',
  unitQuery: 'unit_id',
  permission: 'participants.read',
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
    return body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as JsonObject) : null;
  } catch {
    return null;
  }
}

function hasOnlyFields(body: JsonObject): boolean {
  return Object.keys(body).every((key) => (PARTICIPANT_FIELDS as readonly string[]).includes(key));
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

function metadataField(body: JsonObject): Readonly<Record<string, unknown>> | null | undefined | false {
  const value = body.metadata;
  if (value === undefined || value === null) return value;
  return typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : false;
}

function parseBody(body: JsonObject, create: boolean) {
  const name = stringField(body, 'name', create);
  const phone = nullableStringField(body, 'phone');
  const email = nullableStringField(body, 'email');
  const dateOfBirth = nullableStringField(body, 'date_of_birth');
  const gender = nullableStringField(body, 'gender');
  const status = stringField(body, 'status');
  const metadata = metadataField(body);
  if (
    name === null ||
    phone === false ||
    email === false ||
    dateOfBirth === false ||
    gender === false ||
    status === null ||
    metadata === false
  ) {
    return null;
  }
  return {
    ...(name === undefined ? {} : { name }),
    ...(phone === undefined ? {} : { phone }),
    ...(email === undefined ? {} : { email }),
    ...(dateOfBirth === undefined ? {} : { dateOfBirth }),
    ...(gender === undefined ? {} : { gender }),
    ...(status === undefined ? {} : { status }),
    ...(metadata === undefined ? {} : { metadata }),
  };
}

function listInput(query: (name: string) => string | undefined) {
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

function publicParticipant(participant: {
  id: string;
  unitId: string;
  name: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  status: string;
  metadata: Readonly<Record<string, unknown>> | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: participant.id,
    unit_id: participant.unitId,
    name: participant.name,
    phone: participant.phone,
    email: participant.email,
    date_of_birth: participant.dateOfBirth,
    gender: participant.gender,
    status: participant.status,
    metadata: participant.metadata,
    created_at: participant.createdAt,
    updated_at: participant.updatedAt,
  };
}

function failureFor(reason: ResourceFailureReason, message: string) {
  const code = reason === 'VALIDATION' ? 'VALIDATION_ERROR' : reason === 'CONFLICT' ? 'CONFLICT' : 'NOT_FOUND';
  return { body: failure(code, message), status: ERROR_STATUS[code] };
}

participantRoutes.use('*', requireAuthentication);

participantRoutes.get('/', requireAuthorization(READ_POLICY), async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  try {
    const result = await listParticipants(
      c.get('authorization').unitId as string,
      listInput((name) => c.req.query(name)),
      { participants: createParticipantRepository(db) },
    );
    if (!result.ok) {
      const mapped = failureFor(result.reason, result.message);
      return c.json(mapped.body, mapped.status);
    }
    return c.json(success({
      items: result.value.items.map(publicParticipant),
      page: result.value.page,
      limit: result.value.perPage,
      total: result.value.total,
    }));
  } catch {
    return c.json(failure('INTERNAL_ERROR', 'Participants could not be listed.'), 500);
  }
});

participantRoutes.post(
  '/',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'participants.create' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid participant body is required.'), 400);
    }
    const parsed = parseBody(body, true);
    if (parsed === null || parsed.name === undefined) {
      return c.json(failure('VALIDATION_ERROR', 'Participant fields are invalid.'), 400);
    }
    const authorization = c.get('authorization');
    try {
      const result = await createParticipant(
        authorization.organizationId as string,
        authorization.unitId as string,
        {
          name: parsed.name,
          phone: parsed.phone,
          email: parsed.email,
          dateOfBirth: parsed.dateOfBirth,
          gender: parsed.gender,
          status: parsed.status,
          metadata: parsed.metadata,
        },
        {
          participants: createParticipantRepository(db),
          units: createUnitRepository(db),
        },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicParticipant(result.value)), 201);
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Participant could not be created.'), 500);
    }
  },
);

participantRoutes.get('/:participantId', requireAuthorization(READ_POLICY), async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  try {
    const result = await getParticipant(
      c.get('authorization').unitId as string,
      c.req.param('participantId'),
      { participants: createParticipantRepository(db) },
    );
    if (!result.ok) {
      const mapped = failureFor(result.reason, result.message);
      return c.json(mapped.body, mapped.status);
    }
    return c.json(success(publicParticipant(result.value)));
  } catch {
    return c.json(failure('INTERNAL_ERROR', 'Participant could not be read.'), 500);
  }
});

participantRoutes.patch(
  '/:participantId',
  requireAuthorization({ ...READ_POLICY, roles: MANAGER_ROLES, permission: 'participants.update' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid participant patch is required.'), 400);
    }
    const parsed = parseBody(body, false);
    if (parsed === null) return c.json(failure('VALIDATION_ERROR', 'Participant fields are invalid.'), 400);
    const patch: ParticipantPatchInput = parsed;
    try {
      const result = await updateParticipant(
        c.get('authorization').unitId as string,
        c.req.param('participantId'),
        patch,
        { participants: createParticipantRepository(db) },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicParticipant(result.value)));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Participant could not be updated.'), 500);
    }
  },
);
