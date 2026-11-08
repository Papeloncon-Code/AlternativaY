import type { CSSProperties } from 'react';

type Props = {
  id: string;
  title: string;
  startAt?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Reproducción de YouTube dentro de TodoTube mediante el reproductor oficial incrustado.
 * No extrae ni retransmite segmentos: YouTube entrega el vídeo directamente al iframe.
 * Sus controles, atribución y elementos de marca permanecen visibles.
 */
export default function YouTubePlayer({ id, title, startAt = 0, className = '', style }: Props) {
  const seconds = Math.max(0, Math.floor(startAt));
  const params = new URLSearchParams({
    autoplay: '1',
    controls: '1',
    playsinline: '1',
    rel: '0',
    fs: '1',
  });
  if (seconds > 0) params.set('start', String(seconds));

  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params.toString()}`;

  return (
    <div className={`youtube-player ${className}`.trim()} style={style}>
      <iframe
        className="youtube-player-frame"
        src={src}
        title={`Reproductor de YouTube: ${title}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
      />
    </div>
  );
}
