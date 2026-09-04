import { describe, expect, it } from 'vitest';
import app from '../../src/index';

describe('Phase 5 Activity UI', () => {
  it.each([
    ['/activities', 'list'],
    ['/activities/new', 'create'],
    ['/activities/aaaaaaaa-0000-4000-8000-000000000601', 'detail'],
    ['/activities/aaaaaaaa-0000-4000-8000-000000000601/edit', 'edit'],
  ])('renders %s as a semantic Activity screen', async (path, mode) => {
    const response = await app.request(path, {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain(`data-activity-mode="${mode}"`);
    expect(html).toContain('id="scope-form"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('/static/activities.js');
    expect(html).toContain('href="/programs"');
    expect(html).not.toMatch(/style="/);
  });

  it('keeps scope inputs explicit and the bearer token secret from shoulder surfing', async () => {
    const html = await (await app.request('/activities', {}, { APP_ENV: 'test' })).text();
    expect(html).toContain('id="access-token" type="password"');
    expect(html).toContain('id="organization-id"');
    expect(html).toContain('id="unit-id"');
  });
});
