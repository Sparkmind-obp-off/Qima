import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Shared file collector for the QIMA quality scripts.
 * Phase 0 tasks T0.06 (lint) and T0.07 (formatter).
 */

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.wrangler',
  'node_modules',
  'dist',
  'build',
  'coverage',
  // Authoritative blueprint documents are inputs, not source under our control.
  'qima-blueprints',
]);

const CHECKED_EXTENSIONS = ['.ts', '.js', '.mjs', '.json', '.jsonc', '.css', '.sql', '.md'];

function hasCheckedExtension(path) {
  return CHECKED_EXTENSIONS.some((extension) => path.endsWith(extension));
}

export async function collectCheckedFiles(directory = '.') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        files.push(...(await collectCheckedFiles(path)));
      }
      continue;
    }

    if (entry.isFile() && hasCheckedExtension(path)) {
      files.push(path);
    }
  }

  return files.sort();
}

export function reportFailures(label, failures, checkedCount) {
  if (failures.length > 0) {
    console.error(`${label} failed:\n${failures.join('\n')}`);
    process.exit(1);
  }

  console.log(`${label} passed for ${checkedCount} files.`);
}
