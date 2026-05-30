/**
 * ZIP "Totalidad del código fuente" para ACCEDA / RPI (programa de ordenador).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const D = require('./rpi-memoria-data.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ver = D.versionSemver || '1.0.0';
const outName = `HidroCultivo-RPI-codigo-fuente-${ver}`;
const outDir = path.join(root, 'docs', 'deposito-rpi', outName);
const zipPath = path.join(root, 'docs', 'deposito-rpi', `${outName}.zip`);

const COPY_DIRS = ['js', 'css', 'icons'];
const COPY_FILES = [
  'index.html',
  'manifest.json',
  'service-worker.js',
  'capacitor.config.json',
  'package.json',
  'package-lock.json',
];

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyRecursive(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    mkdirp(dest);
    for (const name of fs.readdirSync(src)) {
      if (name === 'node_modules' || name === '.git') continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    mkdirp(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

rimraf(outDir);
mkdirp(outDir);

for (const f of COPY_FILES) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) copyRecursive(src, path.join(outDir, f));
}

for (const d of COPY_DIRS) {
  const src = path.join(root, d);
  if (fs.existsSync(src)) copyRecursive(src, path.join(outDir, d));
}

const leeme = `HIDROCULTIVO v${ver} — CODIGO FUENTE (totalidad depositada)
Autor: ${D.autor}
NIF: ${D.nif}
Titulo: ${D.titulo}

Contenido: index.html, manifest.json, service-worker.js, package.json,
capacitor.config.json, carpetas js/ (logica e interfaz), css/, icons/.

Excluido: node_modules, www generado, proyectos android/ios nativos,
dependencias de terceros instalables via npm.

Expediente ACCEDA: completar al subir.
`;
fs.writeFileSync(path.join(outDir, 'LEEME-CODIGO-FUENTE.txt'), leeme, 'utf8');

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

if (process.platform === 'win32') {
  const ps = `Compress-Archive -LiteralPath '${outDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
} else {
  spawnSync('zip', ['-r', zipPath, outName], {
    cwd: path.join(root, 'docs', 'deposito-rpi'),
    encoding: 'utf8',
  });
}

const mb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log('ZIP codigo fuente:', zipPath);
console.log('Tamaño:', mb, 'MB');
console.log('\nSube este archivo en ACCEDA → * Totalidad del codigo fuente');
