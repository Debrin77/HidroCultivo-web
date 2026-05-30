/**
 * Crea ZIP del ejemplar RPI (carpeta completa con capturas).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const D = require('./rpi-memoria-data.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ver = D.versionSemver || '1.0.0';
const folderName = `HidroCultivo-RPI-ejemplar-${ver}`;
const srcDir = path.join(root, 'docs', 'deposito-rpi', folderName);
const zipPath = path.join(root, 'docs', 'deposito-rpi', `${folderName}.zip`);

if (!fs.existsSync(srcDir)) {
  console.error('No existe:', srcDir);
  console.error('Ejecuta: npm run rpi:deposito');
  process.exit(1);
}

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

if (process.platform === 'win32') {
  const ps = `Compress-Archive -LiteralPath '${srcDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
} else {
  const r = spawnSync('zip', ['-r', zipPath, folderName], {
    cwd: path.join(root, 'docs', 'deposito-rpi'),
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.error('Instala zip o usa Windows.');
    process.exit(1);
  }
}

const mb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log('ZIP creado:', zipPath);
console.log('Tamaño:', mb, 'MB');
console.log('Adjunta este archivo en la sede si el trámite lo permite.');
