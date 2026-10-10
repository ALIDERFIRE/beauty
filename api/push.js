// Función de Vercel: envía notificaciones push a los dispositivos suscritos.
// Variables de entorno necesarias (Vercel > Settings > Environment Variables):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  -> se generan con: npx web-push generate-vapid-keys
//   VAPID_SUBJECT                        -> mailto:su-correo@gmail.com
//   PUSH_SECRET                          -> clave larga inventada; la misma se carga en Configuración del panel
const webpush = require('web-push');

module.exports = async (req, res) => {
  // GET: la página pide la clave pública para suscribirse
  if (req.method === 'GET') {
    return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }

  if (!process.env.PUSH_SECRET || b.secret !== process.env.PUSH_SECRET) {
    return res.status(401).json({ ok: false, error: 'Clave push incorrecta (PUSH_SECRET)' });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ ok: false, error: 'Faltan las claves VAPID en Vercel' });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const url = typeof b.url === 'string' && /^\/(?![/\\])/.test(b.url) && b.url.length < 200 ? b.url : '/';
  const payload = JSON.stringify({
    title: String(b.title || 'Beauty Coiffure').slice(0, 120),
    body: String(b.body || '').slice(0, 400),
    url
  });
  const subs = Array.isArray(b.subs) ? b.subs.slice(0, 200) : [];
  const r = await Promise.all(subs.map(s =>
    webpush.sendNotification(s, payload)
      .then(() => ({ ok: true }))
      .catch(e => ({ ok: false, status: e.statusCode, endpoint: s && s.endpoint }))
  ));

  return res.status(200).json({
    ok: true,
    enviadas: r.filter(x => x.ok).length,
    // suscripciones que ya no existen (se desinstaló la app o se quitó el permiso)
    vencidas: r.filter(x => x.status === 404 || x.status === 410).map(x => x.endpoint)
  });
};
