import { Link } from 'react-router-dom';
import { shortThumb, thumb } from '../api';

type Props = { id: string; startAt?: number; compact?: boolean; kind?: 'video' | 'short' };

export default function OwnPlayer({ id, startAt = 0, compact = false, kind = 'video' }: Props) {
  const seconds = Math.max(0, Math.floor(startAt));
  const href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) + (seconds > 0 ? '&t=' + seconds + 's' : '');
  const poster = kind === 'short' ? shortThumb(id) : thumb(id);
  if (compact) {
    return <div className="own-player own-player-compact" aria-label="Contenido externo">
      <img className="player-poster" src={poster} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <span>Contenido externo</span>
    </div>;
  }
  return <div className="own-player own-player-error" role="status">
    <img className="player-poster" src={poster} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
    <div className="player-poster-shade" />
    <div className="player-message">
      <span className="player-kicker">Contenido externo</span>
      <strong>{kind === 'short' ? 'Este Short se abre en su plataforma de origen' : 'Este vídeo se abre en su plataforma de origen'}</strong>
      <p>TodoTube conserva los metadatos y el enlace, pero no obtiene ni retransmite segmentos de YouTube. El Media Gateway reproduce archivos propios o licenciados publicados en Medios propios.</p>
      <div className="player-message-actions">
        <a className="btn primary" href={href} target="_blank" rel="noreferrer">Abrir origen</a>
        <Link className="btn" to="/medios">Medios propios</Link>
      </div>
    </div>
  </div>;
}
