// Service worker: la app abre aunque no haya señal.
// - Archivos de la app: red primero (siempre la versión nueva), con respaldo en caché.
// - Librerías externas (mapas, Excel, PDF, fuentes): caché primero.
// - Todo lo demás (Google Drive, geocodificación, mapa base) va directo a la red.
const CACHE = 'sube-v3';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './planilla-predeterminada.pdf', './icons/icon-192.png'];
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function guardar(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copia = res.clone();
    caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
  }
}

function redPrimero(req) {
  return new Promise(resolve => {
    let listo = false;
    const fin = r => { if (!listo && r) { listo = true; resolve(r); } };
    const desdeCache = () => caches.match(req).then(m => m || caches.match('./index.html'));
    // con mala señal, después de 4 s se usa lo guardado (si existe)
    const t = setTimeout(() => desdeCache().then(fin), 4000);
    fetch(req, { cache: 'no-cache' })
      .then(res => { clearTimeout(t); guardar(req, res); fin(res); })
      .catch(() => { clearTimeout(t); desdeCache().then(m => fin(m || Response.error())); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(redPrimero(req));
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(m => m || fetch(req).then(res => { guardar(req, res); return res; }))
    );
  }
});
