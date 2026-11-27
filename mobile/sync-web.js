const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(__dirname, 'www');

const FILES = [
  'index.html',
  'manifest.webmanifest',
  'planilla-predeterminada.pdf',
  'privacidad.html',
  'terminos.html',
];
const DIRS = ['js', 'css', 'lib', 'icons', 'fonts'];

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

for (const f of FILES) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(www, f));
}

for (const d of DIRS) {
  const src = path.join(root, d);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(www, d), { recursive: true });
}

if (!fs.existsSync(path.join(www, 'index.html'))) {
  throw new Error('No se encontró www/index.html tras copiar activos');
}

console.log('SYNC_WEB_OK');
