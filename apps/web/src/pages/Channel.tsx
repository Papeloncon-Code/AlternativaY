import { useTitle } from '../title';
import { useParams } from 'react-router-dom';
import { useChannels, useFeed } from '../data';
import Avatar from '../components/Avatar';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import BellMenu, { type Bell } from '../components/BellMenu';
import { setChannelBell } from '../push';
import { removeChannel } from '../api';
import { useStore } from '../store';
import { Empty } from '../components/States';
import { useState } from 'react';

export default function Channel() {
  const { id = '' } = useParams();
  const channels = useChannels();
  const feed = useFeed();
  const ownerKey = useStore((s) => s.ownerKey);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'videos' | 'shorts'>('videos');
  const c = channels.data?.find((x) => x.id === id);
  const vids = (feed.data ?? []).filter((v) => v.channelId === id);
  const name = c?.name ?? vids[0]?.channel ?? 'Canal';
  useTitle(name);
  const act = async (fn: () => Promise<unknown>) => { try { if (!ownerKey) throw new Error('Pon tu clave de propietario en Ajustes.'); await fn(); channels.reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  return (
    <div className="page">
      <header className="channel-head">
        <Avatar name={name} id={id} size={120} />
        <div>
          <h1>{name}</h1>
          <p className="sub">{vids.length} vídeos recientes{c?.status === 'verified' ? ' · avisos al momento' : ''}</p>
          {c && <BellMenu name={name} value={c.notify ?? 'all'} onChange={(v: Bell) => act(() => setChannelBell(id, v, ownerKey))} onUnfollow={() => act(() => removeChannel(id, ownerKey))} />}
          {msg && <p className="bad-text">{msg}</p>}
        </div>
      </header>
      <div className="tabs-bar" role="tablist" aria-label="Contenido del canal">
        {(['videos', 'shorts'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`tab-btn${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t === 'videos' ? `Vídeos (${vids.filter((v) => v.kind !== 'short').length})` : `Shorts (${vids.filter((v) => v.kind === 'short').length})`}
          </button>
        ))}
      </div>
      {tab === 'videos' && (vids.some((v) => v.kind !== 'short')
        ? <div className="vgrid">{vids.filter((v) => v.kind !== 'short').map((v) => <VideoCard key={v.id} {...v} title={v.title ?? v.id} />)}</div>
        : <Empty title="Sin vídeos recientes" />)}
      {tab === 'shorts' && (vids.some((v) => v.kind === 'short')
        ? <div className="shorts-grid">{vids.filter((v) => v.kind === 'short').map((v) => <ShortCard key={v.id} id={v.id} title={v.title ?? v.id} channel={v.channel} publishedAt={v.publishedAt} views={v.views} />)}</div>
        : <Empty title="Sin Shorts recientes" />)}
    </div>
  );
}
