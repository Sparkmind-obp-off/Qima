import assert from 'node:assert/strict';
import test from 'node:test';
import { loadQimaConfig } from '../../packages/config/src/index.mjs';
import { assertSameOrganization } from '../../packages/domain/src/index.mjs';
import { failure, success } from '../../packages/shared/src/index.mjs';

test('loads default QIMA config without secrets', () => {
  const config = loadQimaConfig({});

  assert.equal(config.appEnv, 'development');
  assert.equal(config.webUrl, 'http://localhost:3000');
  assert.equal(config.apiUrl, 'http://localhost:3001');
  assert.equal(config.authSecret, undefined);
});

test('wraps API success and failure responses consistently', () => {
  assert.deepEqual(success({ service: 'qima' }), { ok: true, data: { service: 'qima' } });
  assert.deepEqual(failure('VALIDATION_ERROR', 'Invalid input'), {
    ok: false,
    error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
  });
});

test('rejects cross-organization unit access', () => {
  assert.throws(
    () => assertSameOrganization('org-a', { id: 'unit-1', organizationId: 'org-b', name: 'RQ' }),
    /expected organization scope/,
  );
});
