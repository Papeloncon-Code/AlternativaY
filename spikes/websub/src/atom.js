// Parser mínimo del Atom de YouTube (WebSub y RSS público). Regex: barato en CPU.
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENT[m] ?? m);
const pick = (block, re) => { const m = block.match(re); return m ? decode(m[1].trim()) : null; };
const num = (s) => (s == null ? null : Number(s));
const ts = (s) => { const t = s ? Date.parse(s) : NaN; return Number.isNaN(t) ? null : t; };

export function parseAtom(xml, maxEntries = Infinity) {
  const entries = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) && entries.length < maxEntries) {
    const b = m[1];
    const videoId = pick(b, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoId) continue;
    entries.push({
      videoId,
      channelId: pick(b, /<yt:channelId>([^<]+)<\/yt:channelId>/),
      title: pick(b, /<title>([^<]*)<\/title>/),
      published: ts(pick(b, /<published>([^<]+)<\/published>/)),
      updated: ts(pick(b, /<updated>([^<]+)<\/updated>/)),
      // Solo en el RSS público (el aviso WebSub no las trae): datos públicos que muestra cualquier lector de feeds.
      views: num(pick(b, /<media:statistics[^>]*\bviews="(\d+)"/)),
      likes: num(pick(b, /<media:starRating[^>]*\bcount="(\d+)"/)),
      description: (pick(b, /<media:description>([\s\S]*?)<\/media:description>/) ?? null)?.slice(0, 5000) ?? null,
      isShort: /<link rel="alternate" href="[^"]*\/shorts\//.test(b) ? true : /<link rel="alternate" href="[^"]*\/watch\?v=/.test(b) ? false : null,
    });
  }
  const deleted = [];
  const dre = /<at:deleted-entry[^>]*ref="yt:video:([^"]+)"[^>]*when="([^"]+)"/g;
  while ((m = dre.exec(xml))) deleted.push({ videoId: m[1], when: ts(m[2]) });
  return { entries, deleted };
}

export async function hmacSha1Hex(secret, body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// "Nuevo" = no visto antes y publicado hace menos de 48 h (descarta ediciones de vídeos viejos).
export const NEW_WINDOW_MS = 48 * 3600 * 1000;
export const isFresh = (published, now) => published != null && now - published < NEW_WINDOW_MS;
