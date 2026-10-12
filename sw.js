// Service worker: la app abre aunque no haya señal.
// - Archivos de la app: red primero (siempre la versión nueva), con respaldo en caché.
// - Librerías externas (mapas, Excel, PDF, fuentes): caché primero.
// - Todo lo demás (Google Drive, geocodificación, mapa base) va directo a la red.
const CACHE = 'sube-v47';
const TILES = 'sube-tiles'; // mapa guardado para usar sin señal (no se borra al actualizar)
const PRECACHE = [
  './', './index.html', './manifest.webmanifest', './planilla-predeterminada.pdf', './privacidad.html', './terminos.html', './icons/icon-192.png',
  './css/01-base.css',
  './css/02-movil-y-entrada.css',
  './css/03-nuevo-diseno.css',
  './css/04-cristal.css',
  './css/05-fondos-y-barra.css',
  './css/06-ajustes-finos.css',
  './css/07-pantalla-entrada.css',
  './css/08-perfil.css',
  './css/09-plantilla.css',
  './css/10-mapa.css',
  './css/11-campos.css',
  './js/00-errores.js',
  './js/01-base.js',
  './js/02-puntos.js',
  './js/03-lectura-fotos.js',
  './js/04-mapa-offline-y-copia.js',
  './js/05-excel-y-cierre.js',
  './js/06-visitas-historial.js',
  './js/07-planillas.js',
  './js/08-informe-dialogos.js',
  './js/09-mapa-geocodificacion.js',
  './js/10-tema-navegacion.js',
  './js/11-busqueda-direcciones.js',
  './js/12-drive-sesion.js',
  './js/13-drive-api.js',
  './js/14-envios-pendientes.js',
  './js/15-autosave.js',
  './js/16-app-instalacion.js',
  './js/17-diagnostico.js',
  './js/18-perfil.js',
  './js/19-plantilla.js',
  './js/20-campos.js',
  './js/21-firma-pdf.js',
  './js/22-disenador-pdf.js',
  './js/23-detector-pdf.js',
  './js/25-ubicacion.js',
  './js/26-equipo.js',
  './js/27-dupla.js',
  './js/99-arranque.js'
];
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k))))
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
  } else if (url.hostname.endsWith('tile.openstreetmap.org')) {
    // mapa: primero lo guardado, si no hay, la red (y se guarda para la próxima)
    const clave = 'https://tile.openstreetmap.org' + url.pathname;
    e.respondWith(
      caches.open(TILES).then(c => c.match(clave).then(m => m || fetch(clave, { mode: 'cors' }).then(res => {
        if (res.ok) c.put(clave, res.clone()).catch(() => {});
        return res;
      }).catch(() => fetch(req))))
    );
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(m => m || fetch(req).then(res => { guardar(req, res); return res; }))
    );
  }
});
