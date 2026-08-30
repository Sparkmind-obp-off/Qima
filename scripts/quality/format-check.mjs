import { readFile } from 'node:fs/promises';
import { collectCheckedFiles, reportFailures } from './files.mjs';

/**
 * QIMA format check — Phase 0 task T0.07 (Configure formatter).
 *
 * Dependency-free by design (.codex/IMPLEMENTATION_RULES.md §14 Dependency
 * Rule: avoid adding a dependency when native capability is sufficient).
 */

const files = await collectCheckedFiles();
const failures = [];

for (const file of files) {
  const text = await readFile(file, 'utf8');

  if (text.length > 0 && !text.endsWith('\n')) {
    failures.push(`${file}: missing trailing newline`);
  }

  if (text.includes('\r\n') && !file.includes('qima-blueprints')) {
    failures.push(`${file}: CRLF line endings are not allowed`);
  }

  if (text.includes('\t')) {
    failures.push(`${file}: tabs are not allowed, use spaces`);
  }

  text.split('\n').forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      failures.push(`${file}:${index + 1}: trailing whitespace`);
    }
  });
}

reportFailures('QIMA format check', failures, files.length);
