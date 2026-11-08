// Páginas públicas de YouTube leídas por el servidor (constitución §I.2, ADR-006 enmienda 6): la página de resultados de
// búsqueda y las páginas públicas de cualquier canal. Solo lo que ve cualquiera sin cuenta; si YouTube pide comprobar
// que no somos un robot, se devuelve un error y no se insiste (nada de eludir controles).
import { sliceJsonObject, readChannelPreview, readChannelVideos } from '../../../spikes/websub/src/index.js';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const txt = (t) => (t?.simpleText ?? (t?.runs ?? []).map((r) => r?.text ?? '').join('')) || '';
const abs = (u) => (typeof u === 'string' && u.startsWith('//') ? `https:${u}` : u);
const IMG_HOST = /^yt[34]\.(ggpht|googleusercontent)\.com$/;
const safeImg = (u, size) => {
  try { const x = new URL(abs(u)); return x.protocol === 'https:' && IMG_HOST.test(x.hostname) ? x.href.replace(/=s\d+(-|$)/, `=s${size}$1`) : undefined; } catch { return undefined; }
};
const best = (t) => (Array.isArray(t) && t.length ? [...t].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0].url : undefined);

function* objects(html, key) {
  let from = 0;
  for (;;) {
    const i = html.indexOf(key, from);
    if (i < 0) return;
    const obj = sliceJsonObject(html.slice(i + key.length, i + key.length + 60_000));
    from = i + key.length;
    if (!obj) continue;
    try { yield JSON.parse(obj); } catch { /* objeto raro: se salta */ }
    from = i + key.length + obj.length;
  }
}

export function parseSearch(html) {
  const videos = []; const channels = []; const seen = new Set();
  for (const v of objects(html, '"videoRenderer":')) {
    if (!/^[\w-]{11}$/.test(v.videoId ?? '') || seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    const owner = v.ownerText?.runs?.[0];
    const url = v.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?? '';
    const live = (v.badges ?? []).some((b) => /LIVE/.test(b?.metadataBadgeRenderer?.style ?? '')) || /EN DIRECTO|LIVE/i.test(txt(v.viewCountText)) && !v.lengthText;
    videos.push({
      id: v.videoId, title: txt(v.title).slice(0, 200), channel: owner?.text ?? '', channelId: owner?.navigationEndpoint?.browseEndpoint?.browseId ?? '',
      channelAvatar: safeImg(best(v.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails), 68),
      verified: (v.ownerBadges ?? []).some((b) => /VERIFIED/.test(b?.metadataBadgeRenderer?.style ?? '')),
      duration: txt(v.lengthText) || undefined, views: v.shortViewCountText?.accessibility?.accessibilityData?.label || txt(v.viewCountText) || undefined,
      published: txt(v.publishedTimeText) || undefined, snippet: txt(v.detailedMetadataSnippets?.[0]?.snippetText).slice(0, 300) || undefined,
      live, short: url.startsWith('/shorts/'),
    });
    if (videos.length >= 40) break;
  }
  for (const c of objects(html, '"channelRenderer":')) {
    if (!/^UC[\w-]{22}$/.test(c.channelId ?? '')) continue;
    // YouTube pone el @usuario en «subscriberCountText» y los suscriptores en «videoCountText» en este bloque.
    const a = txt(c.subscriberCountText); const b = txt(c.videoCountText);
    channels.push({
      id: c.channelId, name: txt(c.title).slice(0, 100), avatar: safeImg(best(c.thumbnail?.thumbnails), 176),
      handle: a.startsWith('@') ? a : undefined, subs: a.startsWith('@') ? b : a || undefined, videos: a.startsWith('@') ? undefined : b || undefined,
      about: txt(c.descriptionSnippet).slice(0, 300) || undefined,
      verified: (c.ownerBadges ?? []).some((x) => /VERIFIED/.test(x?.metadataBadgeRenderer?.style ?? '')),
    });
    if (channels.length >= 5) break;
  }
  return { videos, channels };
}

export async function searchPublic(q) {
  const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=es&gl=ES`, { headers: { 'user-agent': UA, 'accept-language': 'es' } });
  if (!r.ok) throw new Error(`YouTube respondió ${r.status}`);
  const html = await r.text();
  if (!html.includes('ytInitialData')) throw new Error('YouTube no devolvió resultados (posible comprobación anti-robots)');
  return parseSearch(html);
}

// Cualquier canal (también los que no sigues): cabecera pública y los ~30 vídeos más recientes.
export async function channelPublic(id) {
  const [home, vids] = await Promise.all([readChannelPreview(fetch, id), readChannelVideos(fetch, id)]);
  if (!home.header && !vids.lockups?.length) throw new Error(`YouTube respondió ${home.status ?? vids.status}`);
  const now = Date.now();
  const name = home.header?.title ?? home.name ?? id;
  return {
    channel: { id, name, avatar: home.avatar ?? null, header: home.header ?? vids.header ?? null },
    videos: (vids.lockups ?? []).map((l) => ({
      id: l.id, title: l.title, publishedAt: l.age != null ? now - l.age : null, channelId: id, channel: name, source: 'baseline',
      seenAt: 0, kind: 'video', views: l.views ?? null, likes: null, duration: l.dur ?? null,
    })),
  };
}
