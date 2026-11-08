export type Video = {
  views?: number | null;
  /** Segundos (pestaña pública «Vídeos» del canal); null si aún no se conoce. */
  duration?: number | null;
  likes?: number | null;
  id: string;
  title: string | null;
  publishedAt: number | null;
  channelId: string;
  channel: string;
  source: 'websub' | 'rss' | 'baseline';
  seenAt: number;
  kind: 'short' | 'video' | null;
};
export type Channel = {
  id: string;
  name: string;
  status: 'pending' | 'requested' | 'verified' | 'invalid';
  verifiedAt: number | null;
  lastError: string | null;
  notify: 'all' | 'noshorts' | 'none';
  avatar?: string | null;
  videos: number;
  header?: ChannelHeader | null;
};
// Cabecera pública del canal (la que ve cualquiera sin cuenta), leída una vez al día por el servidor.
export type ChannelHeader = {
  title?: string | null; verified?: boolean; handle?: string | null; subs?: string | null; videos?: string | null; about?: string | null;
  link?: { text: string; url: string; more: string | null } | null; banner?: string | null;
  featured?: { id: string; title: string | null; about: string | null; views: string | null; ago: string | null } | null;
};

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Error ${r.status}`);
  return r.json() as Promise<T>;
}

export const fetchFeed = (limit = 120, before?: number) => get<{ items: Video[] }>(`/api/feed?limit=${limit}${before ? `&before=${before}` : ''}`).then((d) => d.items);
export const fetchChannels = () => get<{ items: Channel[] }>('/api/channels').then((d) => d.items);

export async function addChannel(input: string, label: string, ownerKey: string) {
  const r = await fetch('/api/channels', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-owner-key': ownerKey },
    body: JSON.stringify({ input, label }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data as { id: string; created: boolean };
}

export async function removeChannel(id: string, ownerKey: string) {
  const r = await fetch(`/api/channels/${id}`, { method: 'DELETE', headers: { 'x-owner-key': ownerKey } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
}

export type VideoData = { id: string; views: number | null; likes: number | null; description: string | null };
// Todas las descripciones de una vez (el servidor no sabe qué vídeo abres); se guardan 10 min en memoria.
let descCache: { at: number; p: Promise<Map<string, VideoData>> } | null = null;
export function fetchVideo(id: string): Promise<VideoData | null> {
  if (!descCache || Date.now() - descCache.at > 600_000) {
    const p = get<{ items: { id: string; d: string | null; v: number | null; l: number | null }[] }>('/api/descriptions')
      .then((r) => new Map(r.items.map((x) => [x.id, { id: x.id, description: x.d, views: x.v, likes: x.l }])));
    p.catch(() => { descCache = null; });
    descCache = { at: Date.now(), p };
  }
  return descCache.p.then((m) => m.get(id) ?? null);
}
export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const shortThumb = (id: string) => `https://i.ytimg.com/vi/${id}/oar2.jpg`;
