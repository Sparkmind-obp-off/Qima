import { readFile } from 'node:fs/promises';
import { collectCheckedFiles, reportFailures } from './files.mjs';

/**
 * QIMA architecture lint — Phase 0 task T0.06 (Configure lint).
 *
 * This lint enforces the QIMA *architectural* contracts that a generic
 * style linter cannot check:
 *
 * 1. Domain purity — doc 05 §10 / doc 08 §9: the domain layer must not depend
 *    on HTTP, React, a database driver, Cloudflare, or a hosting provider.
 * 2. Dependency direction — doc 08 §14: Presentation -> Application -> Domain.
 *    The domain must never import an app surface.
 * 3. Configuration boundary — doc 08 §21: raw environment access is confined to
 *    `packages/config`.
 * 4. Secret hygiene — Quality Gate 10: no assigned secret literals in source.
 *
 * Rules are additive: later phases extend this file rather than weakening it.
 */

const SELF = 'scripts/quality/lint.mjs';

const DOMAIN_FORBIDDEN_IMPORTS = [
  'hono',
  'react',
  'node:http',
  'node:fs',
  '@cloudflare',
  'wrangler',
];

const files = await collectCheckedFiles();
const sourceFiles = files.filter((file) => file.endsWith('.ts') || file.endsWith('.mjs'));
const failures = [];

for (const file of sourceFiles) {
  if (file === SELF) {
    continue;
  }

  const text = await readFile(file, 'utf8');
  const importTargets = [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );

  // Rule 1 + 2 — domain layer purity and dependency direction.
  if (file.startsWith('packages/domain/')) {
    for (const target of importTargets) {
      if (DOMAIN_FORBIDDEN_IMPORTS.some((forbidden) => target.startsWith(forbidden))) {
        failures.push(`${file}: domain layer must not import "${target}" (doc 05 §10)`);
      }
      if (target.includes('apps/')) {
        failures.push(`${file}: domain layer must not import an app surface (doc 08 §14)`);
      }
    }
  }

  // Rule 2 — shared primitives must stay generic.
  if (file.startsWith('packages/shared/')) {
    for (const target of importTargets) {
      if (target.includes('apps/') || target.startsWith('@qima/')) {
        failures.push(`${file}: shared layer must not depend on "${target}" (doc 08 §13)`);
      }
    }
  }

  // Rule 3 — raw environment access is confined to the config package.
  if (!file.startsWith('packages/config/') && !file.startsWith('scripts/')) {
    if (/process\s*\.\s*env\s*\./.test(text)) {
      failures.push(`${file}: read environment through @qima/config, not process.env (doc 08 §21)`);
    }
  }

  // Rule 4 — no hard-coded secret literals.
  //
  // Production source may never assign a secret literal at all. Test files must
  // be able to assert non-leakage, so they may assign a short, obviously fake
  // fixture value — but a real-looking credential (long, high-entropy, or a
  // known token prefix) is rejected everywhere.
  const isTestFile = file.startsWith('tests/');

  for (const match of text.matchAll(
    /\b(AUTH_SECRET|CLOUDFLARE_API_TOKEN|API_KEY|PRIVATE_KEY|SECRET_KEY)\s*[:=]\s*['"]([^'"]+)['"]/g,
  )) {
    const [, name, value] = match;

    if (!isTestFile) {
      failures.push(`${file}: hard-coded secret "${name}" (Quality Gate 10)`);
      continue;
    }
    if (value.length > 24 || /^(sk-|ghp_|xox|eyJ)/.test(value) || /[A-Za-z0-9+/=]{28,}/.test(value)) {
      failures.push(`${file}: test fixture for "${name}" looks like a real credential`);
    }
  }

  // Known credential formats are forbidden in every file, including tests.
  if (/\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/.test(text)) {
    failures.push(`${file}: real credential format detected (Quality Gate 10)`);
  }
}

reportFailures('QIMA architecture lint', failures, sourceFiles.length);
