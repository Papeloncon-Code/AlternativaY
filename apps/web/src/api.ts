export type Video = {
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

export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const shortThumb = (id: string) => `https://i.ytimg.com/vi/${id}/oar2.jpg`;
