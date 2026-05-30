import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const D = require('./rpi-memoria-data.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ver = D.versionSemver || '1.0.0';
const capturasDir = path.join(root, 'docs', 'deposito-rpi', `HidroCultivo-RPI-ejemplar-${ver}`, 'capturas');

fs.mkdirSync(capturasDir, { recursive: true });
console.log(capturasDir);

if (process.platform === 'win32') {
  spawn('explorer.exe', [capturasDir], { detached: true, stdio: 'ignore' }).unref();
} else if (process.platform === 'darwin') {
  spawn('open', [capturasDir], { detached: true, stdio: 'ignore' }).unref();
} else {
  spawn('xdg-open', [capturasDir], { detached: true, stdio: 'ignore' }).unref();
}
