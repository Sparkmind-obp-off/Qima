import { Hono } from 'hono';
import { ERROR_STATUS, failure, success } from '@qima/shared';
import type { OrganizationPatchInput, UnitPatchInput } from '@qima/domain';
import {
  createOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
  type ResourceFailureReason,
} from '../../application/organization/organization-use-cases';
import {
  createUnit,
  getUnit,
  listUnits,
  updateUnit,
} from '../../application/organization/unit-use-cases';
import {
  createAccessAssignmentRepository,
  createOrganizationRepository,
  createUnitRepository,
} from '../../infrastructure/database/repositories';
import type { QimaDatabase } from '../../infrastructure/database/d1-client';
import type { QimaBindings } from '../../bindings';
import {
  requireAuthentication,
  requireAuthorization,
  type AuthorizationVariables,
} from '../auth/authorization-middleware';

export const organizationRoutes = new Hono<{
  Bindings: QimaBindings;
  Variables: AuthorizationVariables;
}>();
export const unitRoutes = new Hono<{
  Bindings: QimaBindings;
  Variables: AuthorizationVariables;
}>();

const ORGANIZATION_FIELDS = ['name', 'slug', 'status', 'description'] as const;
const UNIT_FIELDS = ['name', 'slug', 'type', 'status', 'description'] as const;

type JsonObject = Record<string, unknown>;

function databaseOf(env: QimaBindings | undefined): QimaDatabase | null {
  const binding = env?.DB;
  return binding === undefined || binding === null ? null : (binding as unknown as QimaDatabase);
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

function hasOnlyFields(body: JsonObject, allowed: readonly string[]): boolean {
  return Object.keys(body).every((key) => allowed.includes(key));
}

function readString(body: JsonObject, key: string, required: boolean): string | undefined | null {
  const value = body[key];
  if (value === undefined) return required ? null : undefined;
  return typeof value === 'string' ? value : null;
}

function readNullableString(body: JsonObject, key: string): string | null | undefined | false {
  const value = body[key];
  if (value === undefined || value === null || typeof value === 'string') return value;
  return false;
}

function pageInput(query: (name: string) => string | undefined): { page?: number; perPage?: number } {
  const page = Number(query('page'));
  const perPage = Number(query('limit'));
  return {
    ...(Number.isFinite(page) ? { page } : {}),
    ...(Number.isFinite(perPage) ? { perPage } : {}),
  };
}

function publicOrganization(organization: {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    description: organization.description,
    created_at: organization.createdAt,
    updated_at: organization.updatedAt,
  };
}

function publicUnit(unit: {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: unit.id,
    organization_id: unit.organizationId,
    name: unit.name,
    slug: unit.slug,
    type: unit.type,
    status: unit.status,
    description: unit.description,
    created_at: unit.createdAt,
    updated_at: unit.updatedAt,
  };
}

function failureFor(reason: ResourceFailureReason, message: string) {
  const code =
    reason === 'VALIDATION' ? 'VALIDATION_ERROR' : reason === 'CONFLICT' ? 'CONFLICT' : 'NOT_FOUND';
  return { body: failure(code, message), status: ERROR_STATUS[code] };
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

organizationRoutes.use('*', requireAuthentication);

organizationRoutes.get('/', async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  try {
    const page = await listOrganizations(
      c.get('principal').user.id,
      pageInput((name) => c.req.query(name)),
      {
        organizations: createOrganizationRepository(db),
        accessAssignments: createAccessAssignmentRepository(db),
      },
    );
    return c.json(
      success({
        items: page.items.map(publicOrganization),
        page: page.page,
        limit: page.perPage,
        total: page.total,
      }),
    );
  } catch {
    return c.json(
      failure('INTERNAL_ERROR', 'Organizations could not be listed.'),
      ERROR_STATUS.INTERNAL_ERROR,
    );
  }
});

organizationRoutes.post(
  '/',
  requireAuthorization({ roles: ['SUPER_ADMIN'], permission: 'organizations.create' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body, ORGANIZATION_FIELDS)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid organization body is required.'), 400);
    }
    const name = readString(body, 'name', true);
    const slug = readString(body, 'slug', true);
    const status = readString(body, 'status', false);
    const description = readNullableString(body, 'description');
    if (
      typeof name !== 'string' ||
      typeof slug !== 'string' ||
      status === null ||
      description === false
    ) {
      return c.json(failure('VALIDATION_ERROR', 'Organization fields are invalid.'), 400);
    }
    try {
      const result = await createOrganization(
        { name, slug, ...(status === undefined ? {} : { status }), description },
        { organizations: createOrganizationRepository(db) },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicOrganization(result.value)), 201);
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Organization could not be created.'), 500);
    }
  },
);

organizationRoutes.get(
  '/:organizationId',
  requireAuthorization({ organizationParam: 'organizationId', permission: 'organizations.read' }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    try {
      const result = await getOrganization(c.req.param('organizationId'), {
        organizations: createOrganizationRepository(db),
      });
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicOrganization(result.value)));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Organization could not be read.'), 500);
    }
  },
);

organizationRoutes.patch(
  '/:organizationId',
  requireAuthorization({
    organizationParam: 'organizationId',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
    permission: 'organizations.update',
  }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body, ORGANIZATION_FIELDS)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid organization patch is required.'), 400);
    }
    const name = readString(body, 'name', false);
    const slug = readString(body, 'slug', false);
    const status = readString(body, 'status', false);
    const description = readNullableString(body, 'description');
    if (name === null || slug === null || status === null || description === false) {
      return c.json(failure('VALIDATION_ERROR', 'Organization fields are invalid.'), 400);
    }
    const patch: OrganizationPatchInput = {
      ...(name === undefined ? {} : { name }),
      ...(slug === undefined ? {} : { slug }),
      ...(status === undefined ? {} : { status }),
      ...(description === undefined ? {} : { description }),
    };
    try {
      const result = await updateOrganization(c.req.param('organizationId'), patch, {
        organizations: createOrganizationRepository(db),
      });
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicOrganization(result.value)));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Organization could not be updated.'), 500);
    }
  },
);

unitRoutes.use('*', requireAuthentication);
const unitReadPolicy = { organizationQuery: 'organization_id', permission: 'units.read' } as const;

unitRoutes.get('/', requireAuthorization(unitReadPolicy), async (c) => {
  const db = requiredDatabase(c.env);
  if (db instanceof Response) return db;
  const organizationId = c.get('authorization').organizationId as string;
  try {
    const page = await listUnits(organizationId, pageInput((name) => c.req.query(name)), {
      units: createUnitRepository(db),
    });
    return c.json(
      success({
        items: page.items.map(publicUnit),
        page: page.page,
        limit: page.perPage,
        total: page.total,
      }),
    );
  } catch {
    return c.json(failure('INTERNAL_ERROR', 'Units could not be listed.'), 500);
  }
});

unitRoutes.post(
  '/',
  requireAuthorization({
    organizationQuery: 'organization_id',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
    permission: 'units.create',
  }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body, UNIT_FIELDS)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid unit body is required.'), 400);
    }
    const name = readString(body, 'name', true);
    const slug = readString(body, 'slug', true);
    const type = readString(body, 'type', true);
    const status = readString(body, 'status', false);
    const description = readNullableString(body, 'description');
    if (
      typeof name !== 'string' ||
      typeof slug !== 'string' ||
      typeof type !== 'string' ||
      status === null ||
      description === false
    ) {
      return c.json(failure('VALIDATION_ERROR', 'Unit fields are invalid.'), 400);
    }
    const organizationId = c.get('authorization').organizationId as string;
    try {
      const result = await createUnit(
        organizationId,
        { name, slug, type, ...(status === undefined ? {} : { status }), description },
        {
          organizations: createOrganizationRepository(db),
          units: createUnitRepository(db),
        },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicUnit(result.value)), 201);
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Unit could not be created.'), 500);
    }
  },
);

unitRoutes.get(
  '/:unitId',
  requireAuthorization({
    organizationQuery: 'organization_id',
    unitParam: 'unitId',
    permission: 'units.read',
  }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const organizationId = c.get('authorization').organizationId as string;
    try {
      const result = await getUnit(organizationId, c.req.param('unitId'), {
        units: createUnitRepository(db),
      });
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicUnit(result.value)));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Unit could not be read.'), 500);
    }
  },
);

unitRoutes.patch(
  '/:unitId',
  requireAuthorization({
    organizationQuery: 'organization_id',
    unitParam: 'unitId',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'UNIT_ADMIN'],
    permission: 'units.update',
  }),
  async (c) => {
    const db = requiredDatabase(c.env);
    if (db instanceof Response) return db;
    const body = await readJsonObject(c.req);
    if (body === null || !hasOnlyFields(body, UNIT_FIELDS)) {
      return c.json(failure('VALIDATION_ERROR', 'A valid unit patch is required.'), 400);
    }
    const name = readString(body, 'name', false);
    const slug = readString(body, 'slug', false);
    const type = readString(body, 'type', false);
    const status = readString(body, 'status', false);
    const description = readNullableString(body, 'description');
    if (
      name === null ||
      slug === null ||
      type === null ||
      status === null ||
      description === false
    ) {
      return c.json(failure('VALIDATION_ERROR', 'Unit fields are invalid.'), 400);
    }
    const patch: UnitPatchInput = {
      ...(name === undefined ? {} : { name }),
      ...(slug === undefined ? {} : { slug }),
      ...(type === undefined ? {} : { type }),
      ...(status === undefined ? {} : { status }),
      ...(description === undefined ? {} : { description }),
    };
    const authorization = c.get('authorization');
    try {
      const result = await updateUnit(
        authorization.organizationId as string,
        c.req.param('unitId'),
        patch,
        { units: createUnitRepository(db) },
      );
      if (!result.ok) {
        const mapped = failureFor(result.reason, result.message);
        return c.json(mapped.body, mapped.status);
      }
      return c.json(success(publicUnit(result.value)));
    } catch {
      return c.json(failure('INTERNAL_ERROR', 'Unit could not be updated.'), 500);
    }
  },
);
