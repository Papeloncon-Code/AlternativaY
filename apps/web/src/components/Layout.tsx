import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Logo from './Logo';
import Avatar from './Avatar';
import { useStore, actions } from '../store';
import { useChannels, useFeed } from '../data';
import { ago } from '../format';
import { thumb } from '../api';

const MAIN = [
  { to: '/', label: 'Principal', icon: 'home', end: true },
  { to: '/shorts', label: 'Shorts', icon: 'shorts' },
  { to: '/suscripciones', label: 'Suscripciones', icon: 'subs' },
];
const YOU = [
  { to: '/historial', label: 'Historial', icon: 'hist' },
  { to: '/ver-mas-tarde', label: 'Ver más tarde', icon: 'clock' },
  { to: '/me-gusta', label: 'Vídeos que me gustan', icon: 'like' },
];
const DAY = 86_400_000;

function useTheme() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme'); else root.dataset.theme = theme;
  }, [theme]);
}

function Notifications() {
  const feed = useFeed();
  const [open, setOpen] = useState(false);
  const seenAt = useStore((s) => s.notifSeenAt);
  const [openedSeenAt, setOpenedSeenAt] = useState(seenAt);
  const ref = useRef<HTMLDivElement>(null);
  const items = useMemo(() => (feed.data ?? []).filter((v) => v.source !== 'baseline' && Date.now() - v.seenAt < 2 * DAY).slice(0, 12), [feed.data]);
  const unseen = items.filter((v) => v.seenAt > seenAt).length;
  const toggle = () => {
    if (!open) { setOpenedSeenAt(seenAt); actions.markNotificationsSeen(); }
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="notif" ref={ref}>
      <button type="button" className="icon-btn" aria-label={unseen ? `Avisos: ${unseen} sin ver` : 'Avisos'} aria-expanded={open} onClick={toggle}>
        <Icon name="bell" size={22} />
        {unseen > 0 && <span className="notif-count">{unseen > 9 ? '9+' : unseen}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="dialog" aria-label="Avisos">
          <div className="notif-head"><b>Avisos</b><Link to="/ajustes" onClick={() => setOpen(false)} aria-label="Ajustes de avisos"><Icon name="settings" size={20} /></Link></div>
          {items.length === 0 && <p className="notif-empty">Cuando tus canales publiquen, lo verás aquí al momento.</p>}
          <ul>
            {items.map((v) => (
              <li key={v.id}>
                <Link to={`/ver/${v.id}${v.kind === 'short' ? '?short=1' : ''}`} onClick={() => setOpen(false)} className="notif-item">
                  <span className={`notif-dot${v.seenAt > openedSeenAt ? '' : ' seen'}`} aria-hidden="true" />
                  <Avatar name={v.channel} id={v.channelId} size={40} />
                  <span className="notif-text"><b>{v.channel}</b> ha subido: {v.title}<small>{ago(v.seenAt)}</small></span>
                  <img src={thumb(v.id)} alt="" width={86} height={48} loading="lazy" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  useTheme();
  const sidebar = useStore((s) => s.sidebar);
  const channels = useChannels();
  const feed = useFeed();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState(new URLSearchParams(location.search).get('q') ?? '');
  const [mobileSearch, setMobileSearch] = useState(false);
  const isWatch = location.pathname.startsWith('/ver/');
  const freshBy = useMemo(() => {
    const m = new Set<string>();
    (feed.data ?? []).forEach((v) => { if (v.source !== 'baseline' && Date.now() - v.seenAt < DAY) m.add(v.channelId); });
    return m;
  }, [feed.data]);
  const subs = (channels.data ?? []).filter((c) => c.status !== 'invalid');
  const [allSubs, setAllSubs] = useState(false);

  function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/buscar?q=${encodeURIComponent(q.trim())}`);
    setMobileSearch(false);
  }

  const mode = isWatch ? 'overlay' : sidebar;
  return (
    <div className={`app side-${mode}`}>
      <a className="skip" href="#main">Saltar al contenido</a>
      <header className={`topbar${mobileSearch ? ' searching' : ''}`}>
        <div className="top-left">
          <button type="button" className="icon-btn menu-btn" aria-label="Menú" onClick={() => actions.toggleSidebar()}><Icon name="menu" size={22} /></button>
          <Link to="/" className="logo-link" aria-label="TodoTube, inicio"><Logo /></Link>
        </div>
        <form className="search" role="search" onSubmit={search}>
          {mobileSearch && <button type="button" className="icon-btn" aria-label="Cerrar búsqueda" onClick={() => setMobileSearch(false)}><Icon name="back" size={20} /></button>}
          <input id="q" type="search" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar vídeos y canales" autoComplete="off" />
          <button type="submit" className="search-btn" aria-label="Buscar"><Icon name="search2" size={20} /></button>
        </form>
        <div className="top-right">
          <button type="button" className="icon-btn only-mobile" aria-label="Buscar" onClick={() => setMobileSearch(true)}><Icon name="search2" size={22} /></button>
          <Notifications />
          <Link to="/tu" className="me" aria-label="Tú"><Icon name="user" size={18} /></Link>
        </div>
      </header>

      <nav className="rail" aria-label="Principal">
        {[...MAIN, { to: '/tu', label: 'Tú', icon: 'user', end: false }].map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="rail-item"><Icon name={i.icon} size={24} /><span>{i.label}</span></NavLink>
        ))}
      </nav>

      <aside className="side" aria-label="Menú">
        <nav className="side-group">
          {MAIN.map((i) => <NavLink key={i.to} to={i.to} end={i.end} className="side-item"><Icon name={i.icon} size={22} /><span>{i.label}</span></NavLink>)}
        </nav>
        <div className="side-group">
          <NavLink to="/suscripciones" className="side-title">Suscripciones <Icon name="next" size={16} /></NavLink>
          {(allSubs ? subs : subs.slice(0, 7)).map((c) => (
            <NavLink key={c.id} to={`/canal/${c.id}`} className="side-item">
              <Avatar name={c.name} id={c.id} size={24} />
              <span className="ellipsis">{c.name}</span>
              {freshBy.has(c.id) && <span className="new-dot" aria-label="Novedades" />}
            </NavLink>
          ))}
          {subs.length > 7 && (
            <button type="button" className="side-item" onClick={() => setAllSubs((v) => !v)}>
              <Icon name="chevron" size={22} /><span>{allSubs ? 'Mostrar menos' : `Mostrar ${subs.length - 7} más`}</span>
            </button>
          )}
        </div>
        <div className="side-group">
          <NavLink to="/tu" className="side-title">Tú <Icon name="next" size={16} /></NavLink>
          {YOU.map((i) => <NavLink key={i.to} to={i.to} className="side-item"><Icon name={i.icon} size={22} /><span>{i.label}</span></NavLink>)}
        </div>
        <div className="side-group">
          <NavLink to="/ajustes" className="side-item"><Icon name="settings" size={22} /><span>Ajustes</span></NavLink>
          <NavLink to="/puente" className="side-item"><Icon name="play" size={22} /><span>TodoTube Puente</span></NavLink>
        </div>
        <p className="side-foot">TodoTube · web v0.2</p>
      </aside>
      {mode === 'overlay' && sidebar === 'full' && <button type="button" className="scrim" aria-label="Cerrar menú" onClick={() => actions.toggleSidebar()} />}

      <main id="main" className="main"><Outlet /></main>

      <nav className="bottombar" aria-label="Principal">
        {[...MAIN, { to: '/tu', label: 'Tú', icon: 'user', end: false }].map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="tab"><Icon name={i.icon} size={22} /><span>{i.label}</span></NavLink>
        ))}
      </nav>
    </div>
  );
}
