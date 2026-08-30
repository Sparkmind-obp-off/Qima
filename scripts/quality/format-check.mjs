import { readFile } from 'node:fs/promises';
import { collectCheckedFiles } from './files.mjs';

const files = await collectCheckedFiles();
const failures = [];

for (const file of files) {
  const text = await readFile(file, 'utf8');
  if (!text.endsWith('\n')) {
    failures.push(`${file}: missing trailing newline`);
  }
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) {
      failures.push(`${file}:${index + 1}: trailing whitespace`);
    }
  });
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`QIMA format check passed for ${files.length} files.`);
