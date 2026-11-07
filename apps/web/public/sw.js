// Service worker de TodoTube: muestra los avisos push (vídeos nuevos de tus canales) y abre el vídeo al tocarlos.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'TodoTube', body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'TodoTube', {
    body: d.body || 'Hay un vídeo nuevo',
    icon: '/icon.svg',
    badge: '/icon.svg',
    image: d.image,
    tag: d.tag,
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const same = wins.find((w) => w.url.startsWith(self.location.origin));
    if (same) { await same.focus(); return same.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
