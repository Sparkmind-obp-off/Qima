export type AppEnvironment = 'development' | 'staging' | 'production' | 'test';

export interface QimaConfig {
  readonly nodeEnv: AppEnvironment;
  readonly appEnv: AppEnvironment;
  readonly databaseUrl?: string;
  readonly authSecret?: string;
  readonly webUrl: string;
  readonly apiUrl: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const appEnvironments = new Set<AppEnvironment>(['development', 'staging', 'production', 'test']);

function readEnvironment(value: string | undefined, fallback: AppEnvironment): AppEnvironment {
  if (value === undefined || value === '') {
    return fallback;
  }

  if (appEnvironments.has(value as AppEnvironment)) {
    return value as AppEnvironment;
  }

  throw new Error(`Unsupported QIMA environment: ${value}`);
}

function readUrl(name: string, value: string | undefined, fallback: string): string {
  const candidate = value === undefined || value === '' ? fallback : value;
  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid URL for ${name}`);
  }
}

export function loadQimaConfig(env: Record<string, string | undefined> = process.env): QimaConfig {
  const nodeEnv = readEnvironment(env.NODE_ENV, 'development');
  const appEnv = readEnvironment(env.APP_ENV, nodeEnv);

  return {
    nodeEnv,
    appEnv,
    databaseUrl: env.DATABASE_URL || undefined,
    authSecret: env.AUTH_SECRET || undefined,
    webUrl: readUrl('WEB_URL', env.WEB_URL, 'http://localhost:3000'),
    apiUrl: readUrl('API_URL', env.API_URL, 'http://localhost:3001'),
    logLevel: (env.LOG_LEVEL as QimaConfig['logLevel'] | undefined) ?? 'info',
  };
}
