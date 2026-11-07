// Shaka Player publica sus tipos sin `export default`; lo añadimos para poder hacer `import shaka from …`.
import { readFile, appendFile } from 'node:fs/promises';
for (const f of ['shaka-player.ui.d.ts', 'shaka-player.ui.debug.d.ts']) {
  const p = new URL(`../node_modules/shaka-player/dist/${f}`, import.meta.url);
  try {
    const src = await readFile(p, 'utf8');
    if (!src.includes('export default shaka')) { await appendFile(p, '\nexport default shaka;\n'); console.log(`tipos de Shaka parcheados: ${f}`); }
  } catch { /* archivo ausente en esta versión */ }
}
