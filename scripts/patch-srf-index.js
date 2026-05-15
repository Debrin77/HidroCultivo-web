const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const D = 'div';

const srfCard = [
  '          <button type="button" class="equip-card setup-tipo-instalacion-card" id="setupCardTipoSrf"',
  "            onclick=\"seleccionarTipoInstalacionSetup('srf')\"",
  '            aria-pressed="false" aria-label="SRF: balsa flotante sobre estanque">',
  '            <' + D + ' class="setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-layers"/></svg></' + D + '>',
  '            <' + D + ' class="setup-tipo-name">SRF</' + D + '>',
  '            <' + D + ' class="setup-tipo-hint">Balsa flotante</' + D + '>',
  '          </button>',
].join('\n');

const srfInline = [
  '          <button type="button" class="equip-card setup-tipo-instalacion-card" id="setupInlineTipoSrf"',
  "            onclick=\"seleccionarTipoInstalacionSetup('srf')\"",
  '            aria-pressed="false" aria-label="SRF"><span class="setup-inline-tipo-ico" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-layers"/></svg></span> SRF</button>',
].join('\n');

if (!h.includes('setupCardTipoSrf')) {
  const anchor =
    '            <' + D + ' class="setup-tipo-hint">Recirculación continua</' + D + '>\n          </button>\n        </' + D + '>';
  if (h.includes(anchor)) {
    h = h.replace(anchor, anchor.replace('</button>', '</button>\n' + srfCard));
  }
}

if (!h.includes('setupInlineTipoSrf')) {
  h = h.replace(
    '<span class="setup-inline-tipo-ico" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-refresh"/></svg></span> RDWC</button>',
    '<span class="setup-inline-tipo-ico" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-refresh"/></svg></span> RDWC</button>\n' +
      srfInline
  );
}

const srfBlockMatch = h.match(
  /(\s*)<div id="setupSrfDetalleWrap" class="setup-hidden">[\s\S]*?<div id="setupSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"><\/motion>\s*<\/div>\s*/
);
if (srfBlockMatch) {
  const block = srfBlockMatch[0].replace(/^\s+/, '      ');
  h = h.replace(srfBlockMatch[0], '\n');
  const afterDwc =
    '        <' + D + ' id="setupVolMezclaSlotDwc" class="setup-dwc-vol-mezcla-slot setup-mt-10" aria-label="Litros de solución en el asistente DWC"></' + D + '>\n        </' + D + '>\n      </' + D + '>\n\n      <' + D + ' id="setupNftBuilderWrap"';
  if (h.includes(afterDwc) && !h.includes('setupSrfDetalleWrap')) {
    h = h.replace(
      afterDwc,
      '        <' + D + ' id="setupVolMezclaSlotDwc" class="setup-dwc-vol-mezcla-slot setup-mt-10" aria-label="Litros de solución en el asistente DWC"></' + D + '>\n        </' + D + '>\n      </' + D + '>\n\n' + block + '\n      <' + D + ' id="setupNftBuilderWrap"'
    );
  }
}

h = h.replace(
  'torre vertical</strong>, <strong>NFT</strong>, <strong>DWC</strong> o <strong>RDWC</strong>',
  'torre vertical</strong>, <strong>NFT</strong>, <strong>DWC</strong>, <strong>RDWC</strong> o <strong>SRF</strong> (balsa flotante)'
);

if (!h.includes('sistemaSrfAyudaCard')) {
  const g = (s) => '<' + D + '>' + s + '</' + D + '>';
  const sysSrf = [
    '      <' + D + ' id="sistemaSrfAyudaCard" class="torre-dwc-card torre-sistema-panel--srf setup-hidden">',
    '        <button type="button" id="btnToggleSistemaSrf" class="torre-sistema-panel-head torre-sistema-panel-head--srf"',
    '          aria-expanded="true" aria-controls="sistemaSrfAyudaBody" onclick="toggleSistemaSrfPanel()">',
    '          <span class="torre-sistema-panel-head-stack">',
    '            <span id="sistemaSrfAyudaPanelKicker" class="torre-sistema-panel-kicker">SRF · balsa flotante</span>',
    '            <span id="sistemaSrfResumen" class="torre-sistema-panel-sub"></span>',
    '          </span>',
    '          <span class="config-section-collapse-chevron" aria-hidden="true">▼</span>',
    '        </button>',
    '        <' + D + ' id="sistemaSrfAyudaBody" class="torre-dwc-inner torre-sistema-panel-body">',
    '          <p class="torre-nft-p"><strong>Estanque común</strong> con balsa flotante (poliestireno). Mide <strong>L × A × profundidad útil</strong> del agua y cuenta <strong>huecos en la balsa</strong>.</p>',
    '          <' + D + ' class="torre-dwc-grid-2">',
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfCanalLargoCm">Largo estanque (cm)</label><input type="number" id="sysSrfCanalLargoCm" class="torre-dwc-input" min="20" max="600" step="1" placeholder="120">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfCanalAnchoCm">Ancho estanque (cm)</label><input type="number" id="sysSrfCanalAnchoCm" class="torre-dwc-input" min="20" max="400" step="1" placeholder="60">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfProfundidadCm">Profundidad útil agua (cm)</label><input type="number" id="sysSrfProfundidadCm" class="torre-dwc-input" min="10" max="50" step="0.5" placeholder="25">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfNumPlantas">Nº plantas (huecos)</label><input type="number" id="sysSrfNumPlantas" class="torre-dwc-input" min="1" max="64" step="1" placeholder="8">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfFilas">Filas en balsa</label><input type="number" id="sysSrfFilas" class="torre-dwc-input" min="1" max="8" step="1" placeholder="1">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfOxigenacionModo">Oxigenación</label><select id="sysSrfOxigenacionModo" class="torre-dwc-input" onchange="try{srfRefreshOxigenacionUi(\'sys\')}catch(e){}"><option value="aireador">Bomba de aire</option><option value="kratky">Kratky (cámara de aire)</option></select>'),
    '            <' + D + ' id="sysSrfAirWrap">' + g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfAirLpm">Aireación (L/min)</label><input type="number" id="sysSrfAirLpm" class="torre-dwc-input" min="0.5" max="300" step="0.5" placeholder="8">').slice(5),
    '            <' + D + ' id="sysSrfKratkyGapWrap" class="setup-hidden">' + g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfKratkyGapCm">Hueco aire bajo balsa (cm)</label><input type="number" id="sysSrfKratkyGapCm" class="torre-dwc-input" min="2" max="40" step="0.5" placeholder="8">').slice(5),
    '            <' + D + ' id="sysSrfCirculanteWrap">' + g('<label class="form-label torre-dwc-lbl-mono"><input type="checkbox" id="sysSrfCirculante" checked onchange="try{srfRefreshOxigenacionUi(\'sys\')}catch(e){}"> Recirculación de solución</label>').slice(5),
    '            <' + D + ' id="sysSrfRecircWrap">' + g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfRecircLh">Recirculación (L/h)</label><input type="number" id="sysSrfRecircLh" class="torre-dwc-input" min="0" max="8000" step="10" placeholder="400">').slice(5),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfNetPotMm">Ø aro net pot (mm)</label><input type="number" id="sysSrfNetPotMm" class="torre-dwc-input" min="25" max="120" step="1" placeholder="50">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfBalsaGrosorMm">Grosor balsa (mm)</label><input type="number" id="sysSrfBalsaGrosorMm" class="torre-dwc-input" min="15" max="80" step="1" placeholder="40">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfVolTrabajoL">Litros útiles en estanque</label><input type="number" id="sysSrfVolTrabajoL" class="torre-dwc-input" min="0.5" max="5000" step="0.1" placeholder="vacío = capacidad">'),
    g('<label class="form-label torre-dwc-lbl-mono" for="sysSrfVolumenManualL">Volumen manual (L, opc.)</label><input type="number" id="sysSrfVolumenManualL" class="torre-dwc-input" min="1" max="5000" step="0.1" placeholder="si difiere de L×A×P">'),
    '          </' + D + '>',
    '          <' + D + ' id="sysSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></' + D + '>',
    '          <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaSrfDesdeFormulario()">Guardar datos SRF</button>',
    '        </' + D + '>',
    '      </' + D + '>',
  ].join('\n');
  h = h.replace(
    '      <!-- Esquema / lista y gráfico (torre, NFT o DWC) -->',
    sysSrf + '\n\n      <!-- Esquema / lista y gráfico (torre, NFT o DWC) -->'
  );
}

fs.writeFileSync(p, h);
console.log({
  card: h.includes('setupCardTipoSrf'),
  inline: h.includes('setupInlineTipoSrf'),
  block: h.includes('setupSrfDetalleWrap'),
  sys: h.includes('sistemaSrfAyudaCard'),
});
