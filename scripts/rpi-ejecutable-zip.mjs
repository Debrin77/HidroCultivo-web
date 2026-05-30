/**
 * ZIP para casilla opcional «Ejecutable» en ACCEDA (solo acepta ZIP, no .txt suelto).
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
const outName = `HidroCultivo-RPI-ejecutable-nota-${ver}`;
const outDir = path.join(root, 'docs', 'deposito-rpi', outName);
const zipPath = path.join(root, 'docs', 'deposito-rpi', `${outName}.zip`);

const notaSrc = path.join(root, 'docs', 'deposito-rpi', 'NOTA-JUSTIFICACION-EJECUTABLE.txt');

const notaTexto = `HIDROCULTIVO v${ver} — NOTA SOBRE EJECUTABLE

Autor: ${D.autor} (NIF ${D.nif})

No se aporta binario ejecutable autocontenido (.exe / .apk) en este deposito porque:

1. La obra se ejecuta como aplicacion web (PWA): index.html, service-worker.js
   y modulos JavaScript en el deposito de codigo fuente.

2. La variante Android (es.hidrocultivo.app) se genera con Capacitor a partir
   del mismo codigo; el APK/AAB depende del entorno de compilacion del titular.

La identificacion del programa queda cubierta por el codigo fuente depositado,
la memoria del programa (PDF) con descripcion funcional y capturas de interfaz.

Castellon de la Plana, ${D.fechaObra}.
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'LEEME-EJECUTABLE.txt'), notaTexto, 'utf8');
if (fs.existsSync(notaSrc)) {
  fs.copyFileSync(notaSrc, path.join(outDir, 'NOTA-JUSTIFICACION-EJECUTABLE.txt'));
}

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

const kb = Math.round(fs.statSync(zipPath).size / 1024);
console.log('ZIP ejecutable (nota):', zipPath);
console.log('Tamaño:', kb, 'KB');
console.log('Sube este ZIP en ACCEDA → Ejecutable del programa (opcional).');
console.log('O deja la casilla vacia si la justificacion ya esta en la memoria PDF.');
