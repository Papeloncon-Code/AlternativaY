import { useEffect } from 'react';
import type { PlayerHandle, VideoDetails } from '../player/handle';
import type { Meta } from '../store';
type Props = { id: string; meta: Meta; startAt: number; onFail?: (reason: string) => void; onEnded?: () => void; onReady?: (h: PlayerHandle) => void; onDetails?: (d: VideoDetails) => void; loop?: boolean };
const MESSAGE = 'Este enlace corresponde a YouTube. TodoTube no obtiene ni retransmite sus segmentos. El Gateway reproduce únicamente archivos propios o distribuidos con autorización y cargados en la biblioteca de medios.';
export default function OwnPlayer({ id, onFail }: Props) {
  useEffect(() => { onFail?.(MESSAGE); }, [id, onFail]);
  return <div className="own-player own-player-error" role="status">
    <strong>Reproductor de TodoTube</strong>
    <p>{MESSAGE}</p>
    <a className="btn primary" href={'https://www.youtube.com/watch?v=' + encodeURIComponent(id)} target="_blank" rel="noreferrer">Abrir el vídeo original</a>
    <a className="btn" href="/medios">Abrir medios propios</a>
  </div>;
}
