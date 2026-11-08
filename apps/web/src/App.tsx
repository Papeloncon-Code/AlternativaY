import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Subscriptions from './pages/Subscriptions';
import ManageSubscriptions from './pages/ManageSubscriptions';
import Shorts from './pages/Shorts';
import ShortsPlayer from './pages/ShortsPlayer';
import Search from './pages/Search';
import Channel from './pages/Channel';
import You, { YouList } from './pages/You';
import { Navigate } from 'react-router-dom';
import Playlist from './pages/Playlist';
import Privacy from './pages/Privacy';
import Settings from './pages/Settings';
import MediaLibrary from './pages/MediaLibrary';
import MediaWatch from './pages/MediaWatch';
import { Empty } from './components/States';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/ver/:id', element: <Watch /> },
      { path: '/suscripciones', element: <Subscriptions /> },
      { path: '/suscripciones/gestionar', element: <ManageSubscriptions /> },
      { path: '/shorts', element: <Shorts /> },
      { path: '/shorts/:id', element: <ShortsPlayer /> },
      { path: '/buscar', element: <Search /> },
      { path: '/canal/:id', element: <Channel /> },
      { path: '/canal/:id/:tab', element: <Channel /> },
      { path: '/tu', element: <You /> },
      { path: '/historial', element: <YouList kind="historial" /> },
      { path: '/ver-mas-tarde', element: <YouList kind="ver-mas-tarde" /> },
      { path: '/me-gusta', element: <YouList kind="me-gusta" /> },
      { path: '/lista/:id', element: <Playlist /> },
      { path: '/biblioteca', element: <Navigate to="/tu" replace /> },
      { path: '/ajustes', element: <Settings /> },
      { path: '/medios', element: <MediaLibrary /> },
      { path: '/medios/:id', element: <MediaWatch /> },
      { path: '/privacidad', element: <Privacy /> },
      { path: '*', element: <div className="page"><Empty title="Esta página no existe"><p>Puede que el enlace esté mal escrito o que la página ya no esté.</p><Link className="btn primary" to="/">Ir a Principal</Link></Empty></div> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
