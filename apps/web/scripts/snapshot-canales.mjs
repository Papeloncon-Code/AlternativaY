// Copia de respaldo de los canales seguidos (nombre, foto y cabecera pública) para cuando D1 no responda.
// Uso: node scripts/snapshot-canales.mjs > fallback-channels.json   (lee las mismas páginas públicas que el cron diario)
import { readChannelPreview } from '../../../spikes/websub/src/index.js';
const CHANNELS = JSON.parse(process.argv[2] ?? '[]');
const out = [];
for (const { id, name, notify } of CHANNELS) {
  let r = {};
  try { r = await readChannelPreview(fetch, id); } catch (e) { r = { error: String(e) }; }
  out.push({ id, name, status: 'verified', verifiedAt: null, lastError: null, notify: notify ?? 'all', avatar: r.avatar ?? null, header: r.header ?? null, videos: 0 });
  process.stderr.write(`${name}: ${r.status ?? r.error} foto=${!!r.avatar} cabecera=${!!r.header}\n`);
}
process.stdout.write(JSON.stringify(out));
