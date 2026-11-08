// Datos que solo puede obtener TU navegador a través del Puente (constitución: la extracción ocurre en el dispositivo).
// Se carga bajo demanda para no pesar en la primera visita.
import type { YTNodes } from 'youtubei.js/web';

export type RemoteVideo = { id: string; title: string; channel: string; channelId: string; channelAvatar?: string; duration?: string; views?: string; published?: string; live: boolean; short: boolean; verified?: boolean; snippet?: string };
export type RemoteChannel = { id: string; name: string; avatar?: string; subs?: string; videos?: string; handle?: string; about?: string; verified?: boolean };

const best = (t?: { url: string; width?: number }[]) => (t && t.length ? [...t].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0].url : undefined);
const abs = (u?: string) => (u && u.startsWith('//') ? `https:${u}` : u);

export async function searchAll(q: string): Promise<{ videos: RemoteVideo[]; channels: RemoteChannel[] }> {
  const { getInnertube } = await import('./player/innertube');
  const yt = await getInnertube();
  const res = await yt.search(q);
  const videos: RemoteVideo[] = []; const channels: RemoteChannel[] = [];
  for (const n of res.results ?? []) {
    if (n.type === 'Video') {
      const v = n as unknown as YTNodes.Video;
      videos.push({
        id: v.video_id, title: v.title?.toString() ?? '', channel: v.author?.name ?? '', channelId: v.author?.id ?? '',
        channelAvatar: abs(best(v.author?.thumbnails)), duration: v.duration?.text, views: v.short_view_count?.toString() || v.view_count?.toString(),
        published: v.published?.toString(), live: !!v.is_live,
        short: String((v.endpoint as unknown as { metadata?: { url?: string } } | undefined)?.metadata?.url ?? '').startsWith('/shorts/'),
      });
    } else if (n.type === 'Channel') {
      const c = n as unknown as YTNodes.Channel;
      channels.push({ id: c.id, name: c.author?.name ?? '', avatar: abs(best(c.author?.thumbnails)), subs: c.subscriber_count?.toString(), videos: c.video_count?.toString() });
    }
  }
  return { videos, channels };
}

export async function fetchChannelAvatar(id: string): Promise<string | undefined> {
  const { getInnertube } = await import('./player/innertube');
  const yt = await getInnertube();
  const ch = await yt.getChannel(id);
  return abs(best(ch.metadata?.avatar));
}
