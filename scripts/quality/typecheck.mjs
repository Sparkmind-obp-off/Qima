import { collectCheckedFiles } from './files.mjs';

const typescriptFiles = (await collectCheckedFiles()).filter((file) => file.endsWith('.ts'));

if (typescriptFiles.length > 0) {
  console.error(`Unexpected TypeScript files in dependency-free Phase 0 bootstrap:\n${typescriptFiles.join('\n')}`);
  process.exit(1);
}

console.log('QIMA type boundary check passed: runtime bootstrap uses dependency-free JavaScript modules.');
