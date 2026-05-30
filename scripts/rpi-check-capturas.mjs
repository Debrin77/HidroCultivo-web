/**
 * Comprueba capturas del depósito RPI: nombres canónicos 01-08 o ≥8 PNG con índice.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const D = require('./rpi-memoria-data.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ver = D.versionSemver || '1.0.0';
const capturasDir = path.join(root, 'docs', 'deposito-rpi', `HidroCultivo-RPI-ejemplar-${ver}`, 'capturas');

const CANONICAL = [
  '01-inicio.png',
  '02-asistente-torre.png',
  '03-sistema-diagrama.png',
  '04-checklist-recarga.png',
  '05-mediciones-historial.png',
  '06-consejos.png',
  '07-exportar-estado.png',
  '08-ayuda-fragmento.png',
];
const ALT_02 = '02-asistente-nft.png';
const IMG_RE = /\.(png|jpe?g|webp)$/i;

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => IMG_RE.test(f)).sort((a, b) => a.localeCompare(b, 'es'));
}

function statKb(filePath) {
  return Math.round(fs.statSync(filePath).size / 1024);
}

if (!fs.existsSync(capturasDir)) {
  console.error('No existe la carpeta:', capturasDir);
  console.error('Ejecuta antes: npm run rpi:deposito');
  process.exit(1);
}

const images = listImages(capturasDir);
let canonOk = 0;
const canonMissing = [];

for (const name of CANONICAL) {
  const p = path.join(capturasDir, name);
  if (name === '02-asistente-torre.png') {
    if (fs.existsSync(p)) {
      canonOk++;
      console.log('OK (canónico)', name, `(${statKb(p)} KB)`);
    } else if (fs.existsSync(path.join(capturasDir, ALT_02))) {
      canonOk++;
      console.log('OK (canónico)', ALT_02, `(${statKb(path.join(capturasDir, ALT_02))} KB)`);
    } else {
      canonMissing.push(name);
    }
    continue;
  }
  if (fs.existsSync(p)) {
    canonOk++;
    console.log('OK (canónico)', name, `(${statKb(p)} KB)`);
  } else {
    canonMissing.push(name);
  }
}

const hasIndice = fs.existsSync(path.join(capturasDir, 'INDICE-CAPTURAS.md'));
const minImages = 8;
const richDeposit = images.length >= minImages;

console.log('\n--- Capturas en carpeta ---');
console.log('Imágenes:', images.length);
for (const f of images) {
  console.log(' •', f, `(${statKb(path.join(capturasDir, f))} KB)`);
}
if (hasIndice) console.log('\nÍndice: INDICE-CAPTURAS.md presente');

if (canonOk === 8) {
  console.log(`\n${canonOk}/8 nombres canónicos — Paso 3 completo.`);
  process.exit(0);
}

if (richDeposit) {
  console.log(`\n✓ Depósito RPI: ${images.length} capturas (mínimo ${minImages}). Nombres descriptivos válidos.`);
  if (!hasIndice) {
    console.warn('  Aviso: falta INDICE-CAPTURAS.md (recomendado para el expediente).');
  }
  console.log('Paso 3 completo. Siguiente: npm run rpi:zip');
  process.exit(0);
}

console.log(`\n${images.length}/${minImages} imágenes — faltan capturas.`);
console.log('Guía: docs/RPI-PASO-03-CAPTURAS.md');
console.log('Carpeta:', capturasDir);
process.exit(1);
