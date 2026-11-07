import { NavLink, Outlet } from 'react-router-dom';
import Icon from './Icon';
import { useStore } from '../store';
import { useEffect } from 'react';

const items = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/suscripciones', label: 'Suscripciones', icon: 'subs' },
  { to: '/biblioteca', label: 'Biblioteca', icon: 'library' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
];

export default function Layout() {
  const theme = useStore((s) => s.theme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return (
    <div className="shell">
      <a className="skip" href="#main">Saltar al contenido</a>
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="TodoTube, inicio">
          <img src="/icon.svg" alt="" width={30} height={30} />
          <span>Todo<b>Tube</b></span>
        </NavLink>
        <nav aria-label="Principal">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className="navitem">
              <Icon name={i.icon} /> <span>{i.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-foot">v0.1 · web</p>
      </aside>
      <main id="main" className="main">
        <Outlet />
      </main>
      <nav className="bottombar" aria-label="Principal">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="tab">
            <Icon name={i.icon} />
            <span>{i.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
