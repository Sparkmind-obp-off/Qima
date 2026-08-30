import { readFile } from 'node:fs/promises';
import { collectCheckedFiles } from './files.mjs';

const files = await collectCheckedFiles();
const failures = [];

for (const file of files) {
  const text = await readFile(file, 'utf8');
  if (text.includes('\t')) {
    failures.push(`${file}: tabs are not allowed`);
  }
  if (/process\.env\.(?!QIMA_START_SERVER)/.test(text) && !file.includes('packages/config/src/index.ts')) {
    failures.push(`${file}: direct process.env access must go through @qima/config`);
  }
  if (file !== 'scripts/quality/lint.mjs' && /AUTH_SECRET=.+\\S/.test(text) && !file.endsWith('.env.example')) {
    failures.push(`${file}: possible committed auth secret`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`QIMA lint passed for ${files.length} files.`);
