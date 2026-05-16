const fs = require('fs');
const path = require('path');
let h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const onSetup = ' oninput="try{updateTorreBuilder()}catch(e){}"';
const onSys = ' oninput="try{srfRefreshSysFormLive()}catch(e){}"';
const onSysOx = ' onchange="try{srfRefreshOxigenacionUi(\'sys\');srfRefreshSysFormLive()}catch(e){}"';

function ensureAfterNetPot(block, prefix, onAttr) {
  const netId = prefix + 'SrfNetPotMm';
  const hId = prefix + 'SrfNetPotHeightMm';
  const eId = prefix + 'SrfEspaciamientoCm';
  if (h.includes(hId)) return h;
  const needle =
    'id="' + netId + '" class="' +
    (prefix === 'setup' ? 'setup-dwc-input' : 'torre-dwc-input') +
    '" min="25" max="120" step="1" placeholder="50"';
  const idx = h.indexOf(needle);
  if (idx < 0) return h;
  const close = h.indexOf('>', idx);
  if (close < 0) return h;
  const insert =
    h.slice(0, close + 1) +
    '\n          <div><label class="form-label ' +
    (prefix === 'setup' ? 'setup-dwc-label' : 'torre-dwc-lbl-mono') +
    '" for="' +
    hId +
    '">Altura cesta (mm)</label><input type="number" id="' +
    hId +
    '" class="' +
    (prefix === 'setup' ? 'setup-dwc-input' : 'torre-dwc-input') +
    '" min="30" max="200" step="1" placeholder="75"' +
    onAttr +
    '></motion>\n          <div><label class="form-label ' +
    (prefix === 'setup' ? 'setup-dwc-label' : 'torre-dwc-lbl-mono') +
    '" for="' +
    eId +
    '">Separación huecos (cm)</label><input type="number" id="' +
    eId +
    '" class="' +
    (prefix === 'setup' ? 'setup-dwc-input' : 'torre-dwc-input') +
    '" min="8" max="60" step="1" placeholder="20"' +
    onAttr +
    '></div>';
  return insert + h.slice(close + 1);
}

h = ensureAfterNetPot(h, 'setup', onSetup);
h = ensureAfterNetPot(h, 'sys', onSys);

const sysIds = [
  'sysSrfCanalLargoCm',
  'sysSrfCanalAnchoCm',
  'sysSrfProfundidadCm',
  'sysSrfNumPlantas',
  'sysSrfFilas',
  'sysSrfAirLpm',
  'sysSrfKratkyGapCm',
  'sysSrfRecircLh',
  'sysSrfNetPotMm',
  'sysSrfNetPotHeightMm',
  'sysSrfEspaciamientoCm',
  'sysSrfBalsaGrosorMm',
  'sysSrfVolTrabajoL',
  'sysSrfVolumenManualL',
];
sysIds.forEach((id) => {
  const re = new RegExp('(id="' + id + '"[^>]*)(>)', '');
  h = h.replace(re, (m, a, b) => (a.includes('oninput=') ? m : a + onSys + b));
});
h = h.replace(
  /id="sysSrfOxigenacionModo"([^>]*onchange=")[^"]*(")/,
  'id="sysSrfOxigenacionModo"$1try{srfRefreshOxigenacionUi(\'sys\');srfRefreshSysFormLive()}catch(e){}$2'
);
h = h.replace(
  /id="sysSrfCirculante"([^>]*onchange=")[^"]*(")/,
  'id="sysSrfCirculante"$1try{srfRefreshOxigenacionUi(\'sys\');srfRefreshSysFormLive()}catch(e){}$2'
);

h = h.replace(/<motion>/g, '<motion>').replace(/<\/motion>/g, '</div>');
h = h.replace(/<motion>/g, '<div>');

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), h);
console.log('setupSrfNetPotHeightMm', h.includes('setupSrfNetPotHeightMm'));
console.log('sysSrfNetPotHeightMm', h.includes('sysSrfNetPotHeightMm'));
console.log('srfRefreshSysFormLive refs', (h.match(/srfRefreshSysFormLive/g) || []).length);
