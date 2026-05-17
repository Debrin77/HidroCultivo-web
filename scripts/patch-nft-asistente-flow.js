/**
 * NFT setup assistant: reorder (counts → diagram → results → rest), zero slider defaults, results dl.
 */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

const oldRecoInner =
  '          <div id="setupNftRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
  nl +
  '            <p class="setup-dwc-litros-solucion-label">Bomba y circuito (orientativo)</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-valor" id="setupNftRecoValor">—</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-hint" id="setupNftRecoHint"></p>' +
  nl +
  '          </div>';

const newRecoInner =
  '          <motion id="setupNftRecoBlock" class="setup-nft-resultados setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">'
    .replace(/<motion /g, '<div ')
    .replace(/<\/motion>/g, '</motion>');

const newRecoInnerFixed =
  '          <div id="setupNftRecoBlock" class="setup-nft-resultados setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
  nl +
  '            <p class="setup-dwc-litros-solucion-label">Resultados</p>' +
  nl +
  '            <dl class="setup-nft-resultados-dl">' +
  nl +
  '              <dt>Depósito impulsión</dt><dd id="setupNftRecoDeposito">—</dd>' +
  nl +
  '              <dt>Bomba 24 h</dt><dd id="setupNftRecoBomba">—</dd>' +
  nl +
  '              <dt>Aireador</dt><dd id="setupNftRecoAire">—</dd>' +
  nl +
  '            </dl>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-hint setup-hidden" id="setupNftRecoHint" aria-hidden="true"></p>' +
  nl +
  '          </div>';

const headOld =
  '        <div class="torre-builder">' +
  nl +
  '          <div>' +
  nl +
  '            <motion class="torre-preview nft-schematic-host" id="nftPreview" aria-live="polite"></motion>'.replace(
    /<motion /g,
    '<motion '
  );

const headOldFixed =
  '        <div class="torre-builder">' +
  nl +
  '          <div>' +
  nl +
  '            <div class="torre-preview nft-schematic-host" id="nftPreview" aria-live="polite"></div>' +
  nl +
  '          </div>' +
  nl +
  oldRecoInner +
  nl +
  '          <div class="torre-controls">';

const headNew =
  '        <div class="torre-builder">' +
  nl +
  '          <div class="torre-controls setup-nft-controls-top" id="setupNftControlsTop">';

if (!s.includes(headOldFixed)) {
  console.error('head block not found');
  process.exit(1);
}

s = s.replace(headOldFixed, headNew);

const splitAnchor =
  '              <input type="range" class="torre-slider" id="sliderNftPendiente"' +
  nl +
  '                min="1" max="4" value="2" step="1" oninput="updateNftSetupPreview()">' +
  nl +
  '            </div>' +
  nl +
  '            <div class="setup-nft-cesta-wrap setup-mt-10">';

const previewCol =
  '              <input type="range" class="torre-slider" id="sliderNftPendiente"' +
  nl +
  '                min="0" max="4" value="0" step="1" oninput="updateNftSetupPreview()">' +
  nl +
  '            </div>' +
  nl +
  '          </div>' +
  nl +
  '          <div class="setup-nft-preview-col">' +
  nl +
  '            <div class="torre-preview nft-schematic-host" id="nftPreview" aria-live="polite"></div>' +
  nl +
  newRecoInnerFixed +
  nl +
  '          </motion>' +
  nl +
  '          <div class="torre-controls setup-nft-controls-rest" id="setupNftControlsRest">' +
  nl +
  '            <div class="setup-nft-cesta-wrap setup-mt-10">';

const previewColFixed = previewCol.replace(
  '          </motion>' + nl + '          <div class="torre-controls',
  '          </div>' + nl + '          <div class="torre-controls'
);

if (!s.includes(splitAnchor)) {
  console.error('split anchor not found');
  process.exit(1);
}

s = s.replace(splitAnchor, previewColFixed);

// Slider defaults 0
s = s.replace(
  'id="sliderNftCanales"' + nl + '                min="1" max="24" value="4"',
  'id="sliderNftCanales"' + nl + '                min="0" max="24" value="0"'
);
s = s.replace(
  'id="sliderNftHuecos"' + nl + '                min="2" max="30" value="8"',
  'id="sliderNftHuecos"' + nl + '                min="0" max="30" value="0"'
);
s = s.replace(
  '<span class="torre-control-val" id="valNftCanales">4</span>',
  '<span class="torre-control-val" id="valNftCanales">0</span>'
);
s = s.replace(
  '<span class="torre-control-val" id="valNftHuecos">8</span>',
  '<span class="torre-control-val" id="valNftHuecos">0</span>'
);
s = s.replace(
  '<span class="torre-control-val" id="valNftPendiente">2<span class="setup-inline-unit-percent">%</span></span>',
  '<span class="torre-control-val" id="valNftPendiente">0<span class="setup-inline-unit-percent">%</span></span>'
);

// Cache bust
s = s.replace(
  'hc-setup-wizard-pages.js?v=2026-05-15-rdwc-nft-setup',
  'hc-setup-wizard-pages.js?v=2026-05-15-nft-asistente'
);
s = s.replace(
  'hc-setup-wizard-nft-diagrams.js?v=2026-05-15-setup-preview',
  'hc-setup-wizard-nft-diagrams.js?v=2026-05-15-nft-asistente'
);
if (!s.includes('nft-asistente')) {
  s = s.replace('main.css?v=', 'main.css?v=2026-05-15-nft-asistente&orig=');
}

fs.writeFileSync(p, s);
console.log('patched index.html (NFT asistente flow)');
