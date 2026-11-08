import { useState } from 'react';
import { hue, initials } from '../format';
import { useAvatar } from '../avatars';

// Avatar del canal: su foto real si la tenemos (Puente o servidor); si no, iniciales sobre un color estable.
export default function Avatar({ name, id, size = 36, src }: { name: string; id: string; size?: number; src?: string }) {
  const known = useAvatar(id);
  const raw = src ?? known;
  const px = Math.min(900, Math.round(size * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)));
  const url = raw && /^https:\/\/yt[34]\.(ggpht|googleusercontent)\.com\//.test(raw) ? raw.replace(/=s\d+(-|$)/, `=s${Math.max(px, 48)}$1`) : raw;
  const [failed, setFailed] = useState<string | null>(null);
  if (url && failed !== url) {
    return <img className="avatar" src={url} alt="" aria-hidden="true" width={size} height={size} loading="lazy" referrerPolicy="no-referrer"
      style={{ width: size, height: size }} onError={() => setFailed(url)} />;
  }
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: `hsl(${hue(id)} 32% 34%)` }}>
      {initials(name)}
    </span>
  );
}
