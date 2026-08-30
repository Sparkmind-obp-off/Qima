import { describe, expect, it } from 'vitest';
import { ConfigurationError, loadQimaConfig } from '@qima/config';

/**
 * Unit tests — QIMA configuration contract.
 *
 * Traceability: Phase 0 task T0.10 (environment contract), doc 08 §21,
 * Quality Gate 4 (Unit Tests), Quality Gate 10 (secret hygiene).
 */

describe('loadQimaConfig', () => {
  it('resolves safe defaults when no environment is provided', () => {
    const config = loadQimaConfig({});

    expect(config.nodeEnv).toBe('development');
    expect(config.appEnv).toBe('development');
    expect(config.apiBasePath).toBe('/api/v1');
    expect(config.webUrl).toBe('http://localhost:3000');
    expect(config.logLevel).toBe('info');
  });

  it('never exposes the auth secret value, only its presence', () => {
    const config = loadQimaConfig({ AUTH_SECRET: 'super-secret-value' });

    expect(config.hasAuthSecret).toBe(true);
    expect(JSON.stringify(config)).not.toContain('super-secret-value');
  });

  it('reports a missing auth secret as absent', () => {
    expect(loadQimaConfig({}).hasAuthSecret).toBe(false);
    expect(loadQimaConfig({ AUTH_SECRET: '' }).hasAuthSecret).toBe(false);
  });

  it('inherits APP_ENV from NODE_ENV when APP_ENV is unset', () => {
    expect(loadQimaConfig({ NODE_ENV: 'production' }).appEnv).toBe('production');
  });

  it('allows APP_ENV to override NODE_ENV explicitly', () => {
    const config = loadQimaConfig({ NODE_ENV: 'production', APP_ENV: 'staging' });

    expect(config.nodeEnv).toBe('production');
    expect(config.appEnv).toBe('staging');
  });

  it('rejects an unsupported environment instead of silently defaulting', () => {
    expect(() => loadQimaConfig({ APP_ENV: 'prod' })).toThrow(ConfigurationError);
  });

  it('rejects an unsupported log level', () => {
    expect(() => loadQimaConfig({ LOG_LEVEL: 'verbose' })).toThrow(ConfigurationError);
  });

  it('rejects a malformed public URL', () => {
    expect(() => loadQimaConfig({ WEB_URL: 'not-a-url' })).toThrow(ConfigurationError);
  });

  it('normalizes a trailing slash on the web URL', () => {
    expect(loadQimaConfig({ WEB_URL: 'https://qima.example/' }).webUrl).toBe(
      'https://qima.example',
    );
  });

  it('returns an immutable configuration object', () => {
    const config = loadQimaConfig({});

    expect(Object.isFrozen(config)).toBe(true);
  });
});
