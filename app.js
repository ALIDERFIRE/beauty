// Conecta las páginas alojadas en Vercel con el backend de Apps Script y maneja las notificaciones push.
window.EXTERNO = true;
(function () {
  function llamar(fn, args, h) {
    if (!window.API_URL || window.API_URL.indexOf('https://') !== 0) { if (h.ko) h.ko(new Error('Falta pegar la URL de Apps Script en config.js')); return; }
    // Se envía como texto plano para que el navegador no haga la consulta previa (CORS) que Apps Script no responde
    fetch(window.API_URL, { method: 'POST', body: JSON.stringify({ fn: fn, args: args }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) { if (h.ok) h.ok(j.data); } else if (h.ko) h.ko(new Error((j && j.error) || 'Error del servidor')); },
            function () { if (h.ko) h.ko(new Error('Sin conexión con el servidor. Probá de nuevo.')); });
  }
  function runner(h) {
    return new Proxy({}, { get: function (_, k) {
      if (k === 'withSuccessHandler') return function (f) { return runner({ ok: f, ko: h.ko }); };
      if (k === 'withFailureHandler') return function (f) { return runner({ ok: h.ok, ko: f }); };
      return function () { llamar(k, Array.prototype.slice.call(arguments), h); };
    } });
  }
  window.google = { script: { run: runner({}) } };
})();

var PUSH = {
  ok: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  b64: function (s) {
    s = (s + '===='.slice(0, (4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(s), a = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  },
  // Pide permiso y devuelve la suscripción de este dispositivo. Debe llamarse desde un clic.
  suscribir: function () {
    if (!PUSH.ok) {
      var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      return Promise.reject(new Error(ios ? 'En iPhone: tocá Compartir → "Agregar a inicio", abrí la app desde ese ícono y activá los avisos ahí.' : 'Este navegador no admite notificaciones.'));
    }
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') throw new Error('No se dio permiso para las notificaciones.');
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return fetch('/api/push').then(function (r) { return r.json(); }).then(function (j) {
        if (!j.publicKey) throw new Error('Faltan las claves VAPID en Vercel.');
        return reg.pushManager.getSubscription().then(function (s) {
          return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: PUSH.b64(j.publicKey) });
        });
      });
    }).then(function (s) { return s.toJSON(); });
  }
};
if (PUSH.ok) navigator.serviceWorker.register('/sw.js').catch(function () {});
