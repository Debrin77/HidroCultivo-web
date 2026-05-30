/**
 * Paso 3 RPI: genera carpeta de depósito (sin capturas — las añades tú).
 * Uso: npm run rpi:deposito
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
const outDir = path.join(root, 'docs', 'deposito-rpi', `HidroCultivo-RPI-ejemplar-${ver}`);
const fuenteDir = path.join(outDir, 'fuente-representativa');
const capturasDir = path.join(outDir, 'capturas');

const MODULOS_CLAVE = [
  ['index.html', 'Interfaz principal y estructura de la aplicacion'],
  ['manifest.json', 'Manifiesto PWA'],
  ['capacitor.config.json', 'Configuracion Capacitor (appId, webDir)'],
  ['js/hc-bootstrap-config.js', 'Inicializacion y configuracion global'],
  ['js/hc-setup-wizard-core.js', 'Asistente de configuracion (nucleo)'],
  ['js/hc-setup-wizard-pages.js', 'Asistente: paginas y vistas previa'],
  ['js/hc-setup-calc-core.js', 'Calculos hidraulicos y volumenes'],
  ['js/hc-setup-checklist.js', 'Checklist de recarga'],
  ['js/hc-setup-consejos.js', 'Consejos tecnicos'],
  ['js/torre-render-build.js', 'Diagramas torre y deposito'],
  ['js/hc-diagram-illo.js', 'Ilustraciones y diagramas por sistema'],
  ['js/diagrams/dwc/dwc-diagram.js', 'Diagrama DWC'],
  ['js/hc-setup-wizard-nft-diagrams.js', 'Diagramas y logica NFT'],
  ['js/diagrams/nft/nft-scada-bridge.js', 'Puente diagramas NFT SCADA'],
  ['js/diagrams/srf/srf-diagram.js', 'Diagrama SRF'],
  ['js/diagrams/rdwc/rdwc-diagram.js', 'Diagrama RDWC'],
  ['js/meteo-forecast-dashboard.js', 'Panel meteorologico'],
  ['js/backup-capacitor.js', 'Exportacion/importacion (stub web; bundle en nativo)'],
  ['css/main.css', 'Estilos principales'],
];

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyIfExists(src, dest) {
  const abs = path.join(root, src);
  if (!fs.existsSync(abs)) {
    console.warn('  (omitido, no existe)', src);
    return false;
  }
  mkdirp(path.dirname(dest));
  fs.copyFileSync(abs, dest);
  return true;
}

mkdirp(capturasDir);
mkdirp(fuenteDir);

const memoriaPdf = path.join(
  root,
  'docs',
  'memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0_imprimible.pdf'
);
const memoriaStd = path.join(
  root,
  'docs',
  'memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf'
);

const portadaScript = path.join(root, 'scripts', 'generate-rpi-portada.js');
if (fs.existsSync(portadaScript)) {
  spawnSync('node', [portadaScript], { cwd: root, encoding: 'utf8' });
}
const portadaPdf = path.join(outDir, 'PORTADA-EJEMPLAR-RPI.pdf');
if (!fs.existsSync(portadaPdf)) {
  const portadaDocs = path.join(root, 'docs', 'PORTADA-EJEMPLAR-RPI.pdf');
  if (fs.existsSync(portadaDocs)) fs.copyFileSync(portadaDocs, portadaPdf);
}

if (fs.existsSync(memoriaPdf)) {
  fs.copyFileSync(memoriaPdf, path.join(outDir, path.basename(memoriaPdf)));
}
if (fs.existsSync(memoriaStd)) {
  fs.copyFileSync(memoriaStd, path.join(outDir, path.basename(memoriaStd)));
} else {
  console.warn('Ejecuta antes: npm run rpi:memoria');
}

let lista = `HidroCultivo v${ver} — modulos representativos del deposito\n`;
lista += `Generado: ${new Date().toISOString().slice(0, 10)}\n\n`;
let n = 0;
for (const [rel, desc] of MODULOS_CLAVE) {
  const dest = path.join(fuenteDir, rel);
  if (copyIfExists(rel, dest)) {
    n++;
    lista += `${rel}\n  ${desc}\n\n`;
  }
}
fs.writeFileSync(path.join(fuenteDir, 'lista-modulos-principales.txt'), lista, 'utf8');

const readme = `Titulo: ${D.tituloLargo}
Version del ejemplar: ${ver}
Fecha de este deposito: ${D.fechaDeposito || '[completar al presentar]'}
Fecha de la obra (version congelada): ${D.fechaObra}
Autor y titular: ${D.autor}
NIF: ${D.nif}
Contacto: ${D.email}
Domicilio (referencia interna): ${D.domicilio}
Comunidad autonoma: ${D.comunidadAutonoma}

Descripcion breve:
Aplicacion web/PWA y Android (Capacitor) para gestion de cultivos hidroponicos:
torre, NFT, DWC, RDWC y SRF; calculos orientativos, diagramas, checklist,
mediciones e historial local.

Identificador Android: ${D.appId}
Plataformas: ${D.plataformas}

Contenido de esta carpeta:
- Memoria tecnica PDF (firmada en papel o segun indique el tramite)
- fuente-representativa/ (${n} archivos clave + lista-modulos-principales.txt)
- capturas/ (ANADIR 8-12 capturas PNG antes de comprimir el ZIP)

Instruccion: no incluir node_modules, android/, claves ni .env.
`;
fs.writeFileSync(path.join(outDir, 'README-RPI.txt'), readme, 'utf8');

const ident = `appName: ${D.titulo}
applicationId: ${D.appId}
versionName: ${D.version}
versionSemver: ${ver}
capacitorWebDir: www
platforms: ${D.plataformas}
`;
fs.writeFileSync(path.join(outDir, 'identificacion-app.txt'), ident, 'utf8');

fs.writeFileSync(
  path.join(capturasDir, 'LEEME-capturas.txt'),
  `Coloca aqui capturas PNG numeradas, por ejemplo:
01-inicio.png
02-asistente-torre.png
03-sistema-diagrama.png
04-checklist-recarga.png
05-mediciones-historial.png
06-consejos.png
07-exportar-estado.png
08-ayuda-fragmento.png
`,
  'utf8'
);

console.log('\nCarpeta de deposito lista:\n ', outDir);
console.log('\nSiguiente: anade capturas en capturas/ y comprime a ZIP si el tramite lo pide.');
console.log('  PowerShell: Compress-Archive -Path "' + outDir + '" -DestinationPath "' + outDir + '.zip" -Force\n');
