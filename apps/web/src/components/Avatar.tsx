import { hue, initials } from '../format';
// Avatar del canal: iniciales sobre un color estable por canal (la foto real llegará con el puente o Android).
export default function Avatar({ name, id, size = 36 }: { name: string; id: string; size?: number }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: `hsl(${hue(id)} 32% 34%)` }}>
      {initials(name)}
    </span>
  );
}
