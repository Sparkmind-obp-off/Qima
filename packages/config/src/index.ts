/**
 * QIMA configuration boundary.
 *
 * Traceability:
 * - Phase 0 task T0.10 (Create environment contract) — doc 10 §24.
 * - doc 08 §21 Configuration Rule: environment-specific configuration is
 *   externalized; the repository carries safe defaults only.
 *
 * This module is the ONLY place allowed to read raw environment values.
 * Every other module must consume `loadQimaConfig()`.
 */

export const APP_ENVIRONMENTS = ['development', 'staging', 'production', 'test'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Raw environment source: Node `process.env` or a Cloudflare Workers binding object. */
export type EnvSource = Record<string, string | undefined>;

export interface QimaConfig {
  readonly nodeEnv: AppEnvironment;
  readonly appEnv: AppEnvironment;
  readonly apiBasePath: string;
  readonly webUrl: string;
  readonly logLevel: LogLevel;
  /** True only when an auth secret has been provisioned. The value itself is never exposed. */
  readonly hasAuthSecret: boolean;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function readEnvironment(value: string | undefined, fallback: AppEnvironment): AppEnvironment {
  if (value === undefined || value === '') {
    return fallback;
  }
  if ((APP_ENVIRONMENTS as readonly string[]).includes(value)) {
    return value as AppEnvironment;
  }
  throw new ConfigurationError(`Unsupported QIMA environment: ${value}`);
}

function readLogLevel(value: string | undefined): LogLevel {
  if (value === undefined || value === '') {
    return 'info';
  }
  if ((LOG_LEVELS as readonly string[]).includes(value)) {
    return value as LogLevel;
  }
  throw new ConfigurationError(`Unsupported QIMA log level: ${value}`);
}

function readUrl(name: string, value: string | undefined, fallback: string): string {
  const candidate = value === undefined || value === '' ? fallback : value;
  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    throw new ConfigurationError(`Invalid URL for ${name}`);
  }
}

/**
 * Resolve the QIMA runtime configuration from a raw environment source.
 *
 * Secrets are never returned. Only their presence is reported, so that
 * configuration objects remain safe to log (doc 08 §12 Error Handling Rule).
 */
export function loadQimaConfig(env: EnvSource = {}): QimaConfig {
  const nodeEnv = readEnvironment(env.NODE_ENV, 'development');
  const appEnv = readEnvironment(env.APP_ENV, nodeEnv);

  return Object.freeze({
    nodeEnv,
    appEnv,
    apiBasePath: '/api/v1',
    webUrl: readUrl('WEB_URL', env.WEB_URL, 'http://localhost:3000'),
    logLevel: readLogLevel(env.LOG_LEVEL),
    hasAuthSecret: typeof env.AUTH_SECRET === 'string' && env.AUTH_SECRET.length > 0,
  });
}
