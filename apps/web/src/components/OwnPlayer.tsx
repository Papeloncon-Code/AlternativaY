import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { shortThumb, thumb } from '../api';

type Props = { id: string; startAt?: number; compact?: boolean; kind?: 'video' | 'short' };

export default function OwnPlayer({ id, startAt = 0, compact = false, kind = 'video' }: Props) {
  const seconds = Math.max(0, Math.floor(startAt));
  const href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) + (seconds > 0 ? '&t=' + seconds + 's' : '');
  const fallbackPoster = thumb(id);
  const [posterSrc, setPosterSrc] = useState(kind === 'short' ? shortThumb(id) : fallbackPoster);
  const posterFailed = () => {
    if (kind === 'short' && posterSrc !== fallbackPoster) setPosterSrc(fallbackPoster);
    else setPosterSrc('');
  };
  const validatePoster = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const invalidDimensions = img.naturalWidth < 200 || img.naturalHeight < 90;
    const nonVerticalShortImage = kind === 'short' && posterSrc !== fallbackPoster &&
      img.naturalWidth / Math.max(1, img.naturalHeight) > 1.15;
    if (invalidDimensions || nonVerticalShortImage) posterFailed();
  };
  const poster = posterSrc ? <img className="player-poster" src={posterSrc} alt="" aria-hidden="true" onLoad={validatePoster} onError={posterFailed} /> : null;

  if (compact) {
    return <div className="own-player own-player-compact" aria-label="Contenido externo">
      {poster}
      <span>Contenido externo</span>
    </div>;
  }
  return <div className="own-player own-player-error" role="status">
    {poster}
    <div className="player-poster-shade" />
    <div className="player-message">
      <span className="player-kicker">Contenido externo</span>
      <strong>{kind === 'short' ? 'Este Short se abre en YouTube' : 'Este vídeo se abre en YouTube'}</strong>
      <p>TodoTube muestra sus datos y el enlace. No retransmite vídeos de YouTube; aquí se reproducen archivos propios o licenciados.</p>
      <div className="player-message-actions">
        <a className="btn primary" href={href} target="_blank" rel="noreferrer">Abrir origen</a>
        <Link className="btn player-media-link" to="/medios">Medios propios</Link>
      </div>
    </div>
  </div>;
}
