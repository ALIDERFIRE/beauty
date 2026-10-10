// Service worker: recibe las notificaciones push y abre la aplicación al tocarlas.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // sin caché: los datos siempre se piden al servidor

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Beauty Coiffure', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  const esPanel = url.indexOf('/admin') === 0;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    // Si ya hay una ventana abierta del mismo lado (panel o web del cliente), se enfoca esa
    for (const c of l) {
      const panel = new URL(c.url).pathname.indexOf('/admin') === 0;
      if (panel === esPanel && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(url);
  }));
});
