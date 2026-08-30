import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', 'qima-blueprints']);
const checkedExtensions = new Set(['.js', '.mjs', '.ts', '.json', '.md', '.example', '.gitignore']);

function hasCheckedExtension(path) {
  return [...checkedExtensions].some((extension) => path.endsWith(extension));
}

export async function collectCheckedFiles(directory = '.') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
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
