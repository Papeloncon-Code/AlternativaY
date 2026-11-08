import { useState } from 'react';
import { Link } from 'react-router-dom';
import { shortThumb, thumb } from '../api';
import { ago, fmtViews } from '../format';

type Props = { id: string; title: string; channel: string; publishedAt?: number | null; views?: number | null };

export default function ShortCard({ id, title, channel, publishedAt, views }: Props) {
  const fallback = thumb(id);
  const [src, setSrc] = useState(shortThumb(id));
  const fallbackOrHide = () => setSrc((current) => current === fallback ? '' : fallback);
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const tooSmall = img.naturalWidth < 200 || img.naturalHeight < 90;
    const landscapeInsteadOfShort = src !== fallback && img.naturalWidth / Math.max(1, img.naturalHeight) > 1.15;
    if (tooSmall || landscapeInsteadOfShort) fallbackOrHide();
  };
  return (
    <Link to={`/shorts/${id}`} className="short" aria-label={`Ver Short: ${title}`}>
      <div className="short-th">
        {src && <img src={src} alt="" loading="lazy" width={405} height={720} onLoad={onLoad} onError={fallbackOrHide} />}
      </div>
      <p className="short-title">{title}</p>
      <p className="card-meta">{fmtViews(views) || [channel, publishedAt ? ago(publishedAt) : ''].filter(Boolean).join(' · ')}</p>
    </Link>
  );
}
