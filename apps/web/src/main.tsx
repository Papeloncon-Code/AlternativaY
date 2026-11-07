import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

import { loadYouTubeApi } from './youtube';
import { prewarmPlayer } from './player/warm';
const hasBridge = () => !!(window as unknown as { todotubeBridge?: { installed?: boolean } }).todotubeBridge?.installed;

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
// Precarga del reproductor oficial en cuanto el navegador está libre: al pulsar un vídeo ya está listo.
const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 1200)); // eslint-disable-line @typescript-eslint/no-explicit-any
idle(() => { if (hasBridge()) prewarmPlayer(); else loadYouTubeApi().catch(() => {}); });
