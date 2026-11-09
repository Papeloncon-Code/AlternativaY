import { readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['shaka-player.ui.d.ts', 'shaka-player.ui.debug.d.ts'];

for (const name of files) {
  const target = path.join(root, 'node_modules', 'shaka-player', 'dist', name);
  const source = await readFile(target, 'utf8');
  if (!source.includes('export default shaka')) {
    await appendFile(target, '\nexport default shaka;\n');
  }
}
