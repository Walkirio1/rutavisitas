const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(__dirname, 'android');
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  throw new Error('Falta AndroidManifest.xml. Ejecutá primero: npx cap add android');
}

let xml = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.CAMERA',
  'android.permission.POST_NOTIFICATIONS',
];

for (const p of perms) {
  if (!xml.includes(p)) {
    xml = xml.replace(
      '<application',
      `    <uses-permission android:name="${p}" />\n    <application`
    );
  }
}

fs.writeFileSync(manifestPath, xml, 'utf8');

const icon512 = path.join(root, 'icons', 'icon-512.png');
const icon192 = path.join(root, 'icons', 'icon-192.png');
const resDir = path.join(androidDir, 'app', 'src', 'main', 'res');
if (fs.existsSync(resDir) && fs.existsSync(icon512)) {
  for (const entry of fs.readdirSync(resDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('mipmap-')) continue;
    const dir = path.join(resDir, entry.name);
    const srcIcon = (entry.name.includes('mdpi') || entry.name.includes('hdpi')) && fs.existsSync(icon192) ? icon192 : icon512;
    for (const targetName of ['ic_launcher.png', 'ic_launcher_round.png']) {
      const dst = path.join(dir, targetName);
      if (fs.existsSync(dst)) fs.copyFileSync(srcIcon, dst);
    }
  }
}

console.log('PREPARE_ANDROID_OK');
