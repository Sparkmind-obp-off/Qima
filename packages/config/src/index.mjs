const appEnvironments = new Set(['development', 'staging', 'production', 'test']);
const logLevels = new Set(['debug', 'info', 'warn', 'error']);

function readEnvironment(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  if (appEnvironments.has(value)) {
    return value;
  }

  throw new Error(`Unsupported QIMA environment: ${value}`);
}

function readLogLevel(value) {
  if (value === undefined || value === '') {
    return 'info';
  }

  if (logLevels.has(value)) {
    return value;
  }

  throw new Error(`Unsupported QIMA log level: ${value}`);
}

function readUrl(name, value, fallback) {
  const candidate = value === undefined || value === '' ? fallback : value;
  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid URL for ${name}`);
  }
}

export function loadQimaConfig(env = process.env) {
  const nodeEnv = readEnvironment(env.NODE_ENV, 'development');
  const appEnv = readEnvironment(env.APP_ENV, nodeEnv);

  return Object.freeze({
    nodeEnv,
    appEnv,
    databaseUrl: env.DATABASE_URL || undefined,
    authSecret: env.AUTH_SECRET || undefined,
    webUrl: readUrl('WEB_URL', env.WEB_URL, 'http://localhost:3000'),
    apiUrl: readUrl('API_URL', env.API_URL, 'http://localhost:3001'),
    logLevel: readLogLevel(env.LOG_LEVEL),
  });
}
