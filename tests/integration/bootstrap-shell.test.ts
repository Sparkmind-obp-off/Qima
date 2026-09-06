import { describe, expect, it } from 'vitest';
import app from '../../src/index';
import { QIMA_CURRENT_PHASE } from '../../apps/api/src/phase';

/**
 * Integration tests — web surface + API composition boundary.
 *
 * Traceability: doc 08 §2 (one application system, modular internals),
 * doc 07 §11 (design tokens), Quality Gate 8 (UX/UI Behavior).
 */

describe('GET /', () => {
  it('serves the bootstrap shell as HTML', async () => {
    const response = await app.request('/', {}, { APP_ENV: 'test' });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('renders the resolved runtime context', async () => {
    const response = await app.request('/', {}, { APP_ENV: 'staging' });
    const html = await response.text();

    expect(html).toContain('id="environment-value">staging<');
    expect(html).toContain('id="api-base-path-value">/api/v1<');
  });

  it('consumes design tokens instead of inline hardcoded colors', async () => {
    const response = await app.request('/', {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(html).toContain('/static/tokens.css');
    expect(html).not.toMatch(/style="[^"]*#[0-9a-fA-F]{6}/);
  });

  it('declares an explicit loading state for the async health probe', async () => {
    const response = await app.request('/', {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(html).toContain('class="state-loading"');
    expect(html).toContain('aria-live="polite"');
  });

  it('never renders a secret value into the shell', async () => {
    const response = await app.request(
      '/',
      {},
      { APP_ENV: 'test', AUTH_SECRET: 'integration-secret' },
    );
    const html = await response.text();

    expect(html).not.toContain('integration-secret');
  });
});

describe('phase reporting consistency', () => {
  it('renders the phase the artifact actually implements', async () => {
    const response = await app.request('/', {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(html).toContain(`id="phase-value">${QIMA_CURRENT_PHASE}<`);
  });

  it('never advertises a phase that disagrees with /api/v1/meta', async () => {
    const metaResponse = await app.request('/api/v1/meta', {}, { APP_ENV: 'test' });
    const meta = (await metaResponse.json()) as { data: { phase: string } };

    const shellResponse = await app.request('/', {}, { APP_ENV: 'test' });
    const html = await shellResponse.text();

    expect(html).toContain(`id="phase-value">${meta.data.phase}<`);
  });

  it('labels the completed Participant artifact as Phase 6', async () => {
    const response = await app.request('/', {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(html).toContain('Phase 6 — Participant');
    expect(html).not.toContain('Phase 7 — Registration');
  });
});

describe('surface composition', () => {
  it('keeps the API mounted under /api/v1 without shadowing the web root', async () => {
    const apiResponse = await app.request('/api/v1/health', {}, { APP_ENV: 'test' });
    const webResponse = await app.request('/', {}, { APP_ENV: 'test' });

    expect(apiResponse.headers.get('content-type')).toContain('application/json');
    expect(webResponse.headers.get('content-type')).toContain('text/html');
  });
});

describe('P1 meeting demo surfaces', () => {
  it.each(['/demo', '/demo/admin/login', '/demo/admin'])(
    'serves %s as an explicit non-production HTML experience',
    async (path) => {
      const response = await app.request(path, {}, { APP_ENV: 'test' });
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(html).toContain('DEMO');
      expect(html).toMatch(/tidak (tersimpan|terhubung|memerlukan)/i);
    },
  );

  it('exposes an accessible public journey and unit context', async () => {
    const response = await app.request('/demo', {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(html).toContain('id="main-content"');
    expect(html).toContain('id="program-grid"');
    expect(html).toContain('id="demo-flow"');
    expect(html).toContain('id="flow-content" aria-live="polite"');
    expect(html).toContain('aria-label="Navigasi utama"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('QIMA PLATFORM');
    expect(html).toContain('RQ Blumbang');
  });

  it('keeps the admin demo connected to public and unit context', async () => {
    const response = await app.request('/demo/admin', {}, { APP_ENV: 'test' });
    const html = await response.text();

    expect(html).toContain('href="/demo"');
    expect(html).toContain('id="admin-unit-switcher"');
    expect(html).toContain('id="admin-sidebar"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Data operasional statis');
  });

  it('keeps unit identity hooks available across the public, login, and admin journey', async () => {
    const publicHtml = await (await app.request('/demo', {}, { APP_ENV: 'test' })).text();
    const loginHtml = await (await app.request('/demo/admin/login', {}, { APP_ENV: 'test' })).text();
    const adminHtml = await (await app.request('/demo/admin', {}, { APP_ENV: 'test' })).text();

    expect(publicHtml).toContain('data-unit="qima"');
    expect(loginHtml).toContain('id="login-unit-name"');
    expect(adminHtml).toContain('data-admin-unit-name');
  });
});
