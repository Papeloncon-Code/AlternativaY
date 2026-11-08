type Props = { id: string; startAt?: number; compact?: boolean; kind?: 'video' | 'short' };

export default function OwnPlayer({ id, startAt = 0, compact = false, kind = 'video' }: Props) {
  const time = Math.max(0, Math.floor(startAt));
  const href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) + (time > 0 ? '&t=' + time + 's' : '');
  if (compact) {
    return <div className="own-player own-player-compact" aria-label="Contenido externo">
      <span>Contenido externo</span>
    </div>;
  }
  return <div className="own-player own-player-error" role="status">
    <div className="player-message">
      <span className="player-kicker">Contenido externo</span>
      <strong>{kind === 'short' ? 'Este Short se abre en su plataforma de origen' : 'Este vídeo se abre en su plataforma de origen'}</strong>
      <p>TodoTube muestra sus metadatos, pero no obtiene ni retransmite sus segmentos. El Media Gateway reproduce archivos propios o licenciados publicados en Medios propios.</p>
      <a className="btn primary" href={href} target="_blank" rel="noreferrer">Abrir origen</a>
    </div>
  </div>;
}
