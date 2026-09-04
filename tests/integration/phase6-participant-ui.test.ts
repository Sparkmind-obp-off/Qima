import { describe, expect, it } from 'vitest';
import app from '../../src/index';

describe('Phase 6 Participant UI', () => {
  it.each([
    ['/participants', 'list'],
    ['/participants/new', 'create'],
    ['/participants/aaaaaaaa-0000-4000-8000-000000000701', 'detail'],
    ['/participants/aaaaaaaa-0000-4000-8000-000000000701/edit', 'edit'],
  ])('renders %s as a semantic Participant screen', async (path, mode) => {
    const response = await app.request(path, {}, { APP_ENV: 'test' });
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain(`data-participant-mode="${mode}"`);
    expect(html).toContain('id="scope-form"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('/static/participants.js');
    expect(html).toContain('href="/activities"');
    expect(html).not.toMatch(/style="/);
  });

  it('keeps scope explicit and masks the bearer token', async () => {
    const html = await (await app.request('/participants', {}, { APP_ENV: 'test' })).text();
    expect(html).toContain('id="access-token" type="password"');
    expect(html).toContain('id="organization-id"');
    expect(html).toContain('id="unit-id"');
  });
});
