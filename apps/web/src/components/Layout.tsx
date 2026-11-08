import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import Icon from './Icon';
import Logo from './Logo';
import Avatar from './Avatar';
import { useStore, actions, getState } from '../store';
import { useChannels, useFeed } from '../data';
import { ago } from '../format';
import { thumb } from '../api';
import { Toaster, toast } from '../toast';
import { syncAvatars } from '../avatars';
import PermissionPrompt from './PermissionPrompt';
import { SaveDialogHost } from './SaveDialog';
import PlayerHost from './PlayerHost';
import SearchBox from './SearchBox';
import AccountMenu from './AccountMenu';
import { setChannelBell } from '../push';
import type { Video } from '../api';

const MAIN = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/shorts', label: 'Shorts', icon: 'shorts' },
  { to: '/suscripciones', label: 'Suscripciones', icon: 'subs' },
];
const YOU = [
  { to: '/historial', label: 'Historial', icon: 'hist' },
  { to: '/ver-mas-tarde', label: 'Ver más tarde', icon: 'clock' },
  { to: '/me-gusta', label: 'Vídeos que me gustan', icon: 'like' },
  { to: '/medios', label: 'Medios propios', icon: 'library' },
];
const DAY = 86_400_000;

function useTheme() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme'); else root.dataset.theme = theme;
  }, [theme]);
}

function NotificationThumbnail({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="notif-thumb-empty" aria-hidden="true" />
    : <img src={thumb(id)} alt="" width={86} height={48} loading="lazy" onError={() => setFailed(true)} />;
}

function Notifications() {
  const feed = useFeed();
  const [open, setOpen] = useState(false);
  const seenAt = useStore((s) => s.notifSeenAt);
  const [openedSeenAt, setOpenedSeenAt] = useState(seenAt);
  const ref = useRef<HTMLDivElement>(null);
  const hiddenN = useStore((s) => s.notifHidden);
  const [menuFor, setMenuFor] = useState('');
  const items = useMemo(() => (feed.data ?? []).filter((v) => v.source !== 'baseline' && Date.now() - v.seenAt < 2 * DAY && !hiddenN[v.id]).slice(0, 12), [feed.data, hiddenN]);
  const unseen = items.filter((v) => v.seenAt > seenAt).length;
  const toggle = () => {
    if (!open) { setOpenedSeenAt(seenAt); actions.markNotificationsSeen(); }
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) { setMenuFor(''); return; }
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') { if (menuFor) setMenuFor(''); else setOpen(false); } return; }
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t)) setOpen(false);
      else if (!t.closest('.notif-menu, .notif-kebab')) setMenuFor('');
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open, menuFor]);
  const hide = (v: Video) => {
    actions.hideNotification(v.id); setMenuFor('');
    toast('Aviso ocultado', { label: 'Deshacer', run: () => actions.unhideNotification(v.id) });
  };
  const muteChannel = async (v: Video) => {
    setMenuFor('');
    const key = getState().ownerKey;
    if (!key) { toast('Pon tu clave de propietario en Ajustes para cambiar los avisos'); return; }
    try { await setChannelBell(v.channelId, 'none', key); toast(`Avisos de ${v.channel} desactivados`); }
    catch (e) { toast(e instanceof Error ? e.message : 'No se pudo cambiar'); }
  };
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
              <li key={v.id} className="notif-li">
                <Link to={v.kind === 'short' ? `/shorts/${v.id}` : `/ver/${v.id}`} onClick={() => setOpen(false)} className="notif-item">
                  <span className={`notif-dot${v.seenAt > openedSeenAt ? '' : ' seen'}`} aria-hidden="true" />
                  <Avatar name={v.channel} id={v.channelId} size={40} />
                  <span className="notif-text"><span className="notif-line"><b>{v.channel}</b> ha subido{v.kind === 'short' ? ' un Short' : ''}: {v.title}</span><small>{ago(v.seenAt)}</small></span>
                  <NotificationThumbnail id={v.id} />
                </Link>
                <button type="button" className="icon-btn notif-kebab" aria-label="Opciones del aviso" aria-haspopup="menu" aria-expanded={menuFor === v.id}
                  onClick={() => setMenuFor((m) => (m === v.id ? '' : v.id))}><Icon name="more" size={20} /></button>
                {menuFor === v.id && (
                  <div className="menu notif-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => hide(v)}><Icon name="eyeOff" size={20} />Ocultar este aviso</button>
                    <button type="button" role="menuitem" onClick={() => void muteChannel(v)}><Icon name="bellOff" size={20} />Desactivar todos los avisos de {v.channel}</button>
                    <Link role="menuitem" to={`/canal/${v.channelId}`} onClick={() => setOpen(false)}><Icon name="user" size={20} />Ir al canal</Link>
                  </div>
                )}
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
  const playlists = useStore((s) => s.playlists);
  const focus = useStore((s) => s.focus);
  const channels = useChannels();
  const feed = useFeed();
  const location = useLocation();
  const [mobileSearch, setMobileSearch] = useState(false);
  const isWatch = location.pathname.startsWith('/ver/');
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { setDrawer(false); }, [location.pathname]);
  useEffect(() => { if (!drawer) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [drawer]);
  const onMenu = () => (isWatch || window.innerWidth <= 1312 ? setDrawer((d) => !d) : actions.toggleSidebar());
  const freshBy = useMemo(() => {
    const m = new Set<string>();
    (feed.data ?? []).forEach((v) => { if (v.source !== 'baseline' && Date.now() - v.seenAt < DAY) m.add(v.channelId); });
    return m;
  }, [feed.data]);
  const subs = (channels.data ?? []).filter((c) => c.status !== 'invalid');
  useEffect(() => { if (channels.data) void syncAvatars(channels.data); }, [channels.data]);
  const [allSubs, setAllSubs] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '/' && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) {
        e.preventDefault();
        if (window.innerWidth <= 792) setMobileSearch(true);
        setTimeout(() => (document.getElementById('q') as HTMLInputElement | null)?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mode = isWatch ? 'overlay' : sidebar;
  return (
    <div className={`app side-${mode}${drawer ? ' drawer-open' : ''}${focus ? ' focus' : ''}`}>
      <a className="skip" href="#main">Saltar al contenido</a>
      <header className={`topbar${mobileSearch ? ' searching' : ''}`}>
        <div className="top-left">
          <button type="button" className="icon-btn menu-btn" aria-label="Menú" aria-expanded={isWatch ? drawer : undefined} onClick={onMenu}><Icon name="menu" size={22} /></button>
          <Link to="/" className="logo-link" aria-label="TodoTube, inicio"><Logo /></Link>
        </div>
        <SearchBox mobile={mobileSearch} onClose={() => setMobileSearch(false)} />
        <div className="top-right">
          <button type="button" className="icon-btn only-mobile" aria-label="Buscar" onClick={() => { setMobileSearch(true); setTimeout(() => (document.getElementById('q') as HTMLInputElement | null)?.focus(), 0); }}><Icon name="search2" size={22} /></button>
          <Notifications />
          <AccountMenu />
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
          {playlists.map((p) => <NavLink key={p.id} to={`/lista/${p.id}`} className="side-item"><Icon name="library" size={22} /><span className="ellipsis">{p.name}</span></NavLink>)}
        </div>
        <div className="side-group">
          <NavLink to="/ajustes" className="side-item"><Icon name="settings" size={22} /><span>Ajustes</span></NavLink>
          <NavLink to="/privacidad" className="side-item"><Icon name="shield" size={22} /><span>Privacidad</span></NavLink>
        </div>
      </aside>
      {drawer && <button type="button" className="scrim" aria-label="Cerrar menú" onClick={() => setDrawer(false)} />}

      <main id="main" className="main"><Outlet /></main>
      <ScrollRestoration />
      <Toaster />
      <PermissionPrompt />
      <SaveDialogHost />
      <PlayerHost />

      <nav className="bottombar" aria-label="Principal">
        {[...MAIN, { to: '/tu', label: 'Tú', icon: 'user', end: false }].map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="tab"><Icon name={i.icon} size={22} /><span>{i.label}</span></NavLink>
        ))}
      </nav>
    </div>
  );
}
