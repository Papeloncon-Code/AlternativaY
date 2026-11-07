// Logo propio de TodoTube: play dentro de un círculo + punto de aviso (lo que nos diferencia: avisar al momento).
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="15" cy="17" r="14" fill="var(--logo-circle)" />
        <path d="M11.5 11v12l10-6z" fill="var(--logo-play)" />
        <circle cx="26.5" cy="5.5" r="4.5" fill="var(--live)" stroke="var(--bg)" strokeWidth="2.5" />
      </svg>
      {!compact && <span className="logo-word">todo<b>tube</b></span>}
    </span>
  );
}
