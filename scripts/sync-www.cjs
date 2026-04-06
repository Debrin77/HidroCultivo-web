/**
 * Copia el sitio estático a www/ para Capacitor (no incluye node_modules).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

const files = ['index.html', 'manifest.json', 'service-worker.js'];
const dirs = ['css', 'js', 'icons'];

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rmrf(www);
fs.mkdirSync(www, { recursive: true });

for (const f of files) {
  copyFile(path.join(root, f), path.join(www, f));
}
for (const d of dirs) {
  const src = path.join(root, d);
  if (fs.existsSync(src)) copyDir(src, path.join(www, d));
}

console.log('www/ sincronizado desde la raíz del repo.');
