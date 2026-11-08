// Convierte las direcciones web de un texto (descripciones) en enlaces, como en la referencia.
// Solo http(s); se abren en otra pestaña sin enviar de dónde vienes.
const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;
export default function Linkify({ text }: { text: string }) {
  const out: (string | JSX.Element)[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(<a key={i} className="linkified" href={m[0]} target="_blank" rel="noopener noreferrer nofollow">{m[0].length > 60 ? `${m[0].slice(0, 57)}…` : m[0]}</a>);
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
