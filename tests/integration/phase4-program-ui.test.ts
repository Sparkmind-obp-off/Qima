import { describe, expect, it } from 'vitest';
import app from '../../src/index';

describe('Phase 4 Program UI', () => {
  it.each([
    ['/programs', 'list'],
    ['/programs/new', 'create'],
    ['/programs/aaaaaaaa-0000-4000-8000-000000000501', 'detail'],
    ['/programs/aaaaaaaa-0000-4000-8000-000000000501/edit', 'edit'],
  ])('renders %s as a semantic Program screen', async (path, mode) => {
    const response = await app.request(path, {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain(`data-program-mode="${mode}"`);
    expect(html).toContain('id="scope-form"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('/static/programs.js');
    expect(html).not.toMatch(/style="/);
  });

  it('keeps the scope inputs explicit and marks secret token input as password', async () => {
    const html = await (await app.request('/programs', {}, { APP_ENV: 'test' })).text();
    expect(html).toContain('id="access-token" type="password"');
    expect(html).toContain('id="organization-id"');
    expect(html).toContain('id="unit-id"');
  });
});
