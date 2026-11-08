import { hasBridge } from './bridge';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

import { prewarmPlayer } from './player/warm';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
// Con el Puente se prepara el reproductor propio. Sin él no se precarga nada de YouTube: su script fija cookies
// de seguimiento aunque no veas ningún vídeo (revisión independiente, hallazgo G1).
const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 1200)); // eslint-disable-line @typescript-eslint/no-explicit-any
idle(() => { if (hasBridge()) prewarmPlayer(); });
