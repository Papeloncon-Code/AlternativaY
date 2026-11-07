import type { ReactNode } from 'react';
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (<div className="empty" role="status"><h2>{title}</h2>{children}</div>);
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error" role="alert">
      <p>{message}</p>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}
export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: n }, (_, i) => <div key={i} className="card skeleton"><div className="thumb" /><div className="sk-line" /><div className="sk-line short" /></div>)}
    </div>
  );
}
