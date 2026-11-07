import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Subscriptions from './pages/Subscriptions';
import Shorts from './pages/Shorts';
import ShortsPlayer from './pages/ShortsPlayer';
import Search from './pages/Search';
import Channel from './pages/Channel';
import You, { YouList } from './pages/You';
import { Navigate } from 'react-router-dom';
import Settings from './pages/Settings';
import Bridge from './pages/Bridge';
import { Empty } from './components/States';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/ver/:id', element: <Watch /> },
      { path: '/suscripciones', element: <Subscriptions /> },
      { path: '/shorts', element: <Shorts /> },
      { path: '/shorts/:id', element: <ShortsPlayer /> },
      { path: '/buscar', element: <Search /> },
      { path: '/canal/:id', element: <Channel /> },
      { path: '/tu', element: <You /> },
      { path: '/historial', element: <YouList kind="historial" /> },
      { path: '/ver-mas-tarde', element: <YouList kind="ver-mas-tarde" /> },
      { path: '/me-gusta', element: <YouList kind="me-gusta" /> },
      { path: '/biblioteca', element: <Navigate to="/tu" replace /> },
      { path: '/ajustes', element: <Settings /> },
      { path: '/puente', element: <Bridge /> },
      { path: '*', element: <div className="page"><Empty title="Página no encontrada" /></div> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
