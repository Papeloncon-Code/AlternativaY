import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Subscriptions from './pages/Subscriptions';
import Library from './pages/Library';
import Settings from './pages/Settings';
import { Empty } from './components/States';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/ver/:id', element: <Watch /> },
      { path: '/suscripciones', element: <Subscriptions /> },
      { path: '/biblioteca', element: <Library /> },
      { path: '/ajustes', element: <Settings /> },
      { path: '*', element: <div className="page"><Empty title="Página no encontrada" /></div> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
