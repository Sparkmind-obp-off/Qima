import { spawnSync } from 'node:child_process';
import { collectCheckedFiles } from './files.mjs';

const files = (await collectCheckedFiles()).filter((file) => file.endsWith('.mjs'));
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push(`${file}: ${result.stderr || result.stdout}`.trim());
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`QIMA build check passed for ${files.length} JavaScript modules.`);
