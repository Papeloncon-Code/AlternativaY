import { Link } from 'react-router-dom';
import { shortThumb, thumb } from '../api';
import { ago } from '../format';

type Props = { id: string; title: string; channel: string; publishedAt?: number | null };

export default function ShortCard({ id, title, channel, publishedAt }: Props) {
  return (
    <Link to={`/shorts/${id}`} className="short" aria-label={`Ver Short: ${title}`}>
      <div className="short-th">
        <img src={shortThumb(id)} alt="" loading="lazy" width={405} height={720}
          onError={(e) => { const el = e.currentTarget; if (!el.dataset.fb) { el.dataset.fb = '1'; el.src = thumb(id); } }} />
      </div>
      <p className="short-title">{title}</p>
      <p className="card-meta">{channel}{publishedAt ? ` · ${ago(publishedAt)}` : ''}</p>
    </Link>
  );
}
