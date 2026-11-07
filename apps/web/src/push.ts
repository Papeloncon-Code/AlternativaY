// Avisos push del navegador (Web Push). La suscripción se guarda en el servidor solo con la clave de propietario (v0.1).
const b64uToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function enablePush(ownerKey: string) {
  if (!pushSupported()) throw new Error('Este navegador no admite avisos push.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Has bloqueado las notificaciones para TodoTube. Actívalas en los ajustes del navegador.');
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const { publicKey } = await (await fetch('/api/push/key')).json();
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
  const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json', 'x-owner-key': ownerKey }, body: JSON.stringify(sub.toJSON()) });
  if (!r.ok) { await sub.unsubscribe(); throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`); }
}

export async function disablePush(ownerKey: string) {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json', 'x-owner-key': ownerKey }, body: JSON.stringify({ endpoint: sub.endpoint }) });
  await sub.unsubscribe();
}

export async function setChannelBell(id: string, notify: 'all' | 'noshorts' | 'none', ownerKey: string) {
  const r = await fetch(`/api/channels/${id}/notify`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-owner-key': ownerKey }, body: JSON.stringify({ notify }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
}
