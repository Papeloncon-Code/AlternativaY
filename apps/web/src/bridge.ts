// Detección única de TodoTube Puente. La extensión inyecta su script un poco después de que arranque la página
// y avisa con el evento `todotube-bridge-ready`, así que hay que escucharlo además de comprobarlo al inicio.
import { useSyncExternalStore } from 'react';

type BridgeApi = { installed: boolean; version: string; fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
export const bridgeApi = (): BridgeApi | undefined => (window as unknown as { todotubeBridge?: BridgeApi }).todotubeBridge;
export const hasBridge = () => !!bridgeApi()?.installed;

const listeners = new Set<() => void>();
if (typeof window !== 'undefined') window.addEventListener('todotube-bridge-ready', () => listeners.forEach((l) => l()));
export function useBridge(): boolean {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), hasBridge);
}
/** Espera hasta `ms` a que aparezca el puente (para decidir sin parpadeos). */
export function whenBridge(ms = 1500): Promise<boolean> {
  if (hasBridge()) return Promise.resolve(true);
  return new Promise((res) => {
    const t = setTimeout(() => { listeners.delete(on); res(hasBridge()); }, ms);
    const on = () => { clearTimeout(t); listeners.delete(on); res(true); };
    listeners.add(on);
  });
}
