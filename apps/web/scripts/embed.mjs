// Empaqueta dist/ dentro del Worker (assets.generated.js). Evita la subida de assets separada,
// que en este entorno falla porque el proxy sustituye el token temporal de subida (401).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const root = 'dist';
const files = {};
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const type = TYPES[extname(p)];
    if (!type) throw new Error(`Tipo no soportado para embeber: ${p}`);
    files['/' + relative(root, p).split('\\').join('/')] = { type, body: readFileSync(p, 'utf8') };
  }
})(root);
writeFileSync('assets.generated.js', `export default ${JSON.stringify(files)};\n`);
console.log(`Embebidos ${Object.keys(files).length} archivos`);
