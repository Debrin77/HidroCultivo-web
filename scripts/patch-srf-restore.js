const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const t = 'd' + 'iv';

const setupSrfBlock = [
  '      <' + t + ' id="setupSrfDetalleWrap" class="setup-hidden">',
  '        <' + t + ' class="setup-dwc-title">SRF · balsa flotante (DFT)</' + t + '>',
  '        <p class="setup-dwc-help"><strong>Estanque común</strong> con solución nutritiva y <strong>balsa</strong> (poliestireno) perforada. Las raíces cuelgan en el agua. Oxigenación con <strong>bomba de aire</strong> o modo <strong>Kratky</strong> (cámara de aire bajo la balsa, sin aireador).</p>',
  '        <' + t + ' id="setupSrfPreviewSection" class="setup-dwc-preview-section">',
  '          <p class="setup-dwc-preview-kicker">Vista previa</p>',
  '          <' + t + ' class="torre-preview torre-preview--srf" id="setupSrfPreview" role="img" aria-live="polite"></' + t + '>',
  '        </' + t + '>',
  '        <' + t + ' class="setup-dwc-grid-2">',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfCanalLargoCm">Largo estanque (cm)</label><input type="number" id="setupSrfCanalLargoCm" class="setup-dwc-input" min="20" max="600" step="1" placeholder="120" oninput="try{updateTorreBuilder()}catch(e){}"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfCanalAnchoCm">Ancho estanque (cm)</label><input type="number" id="setupSrfCanalAnchoCm" class="setup-dwc-input" min="20" max="400" step="1" placeholder="60" oninput="try{updateTorreBuilder()}catch(e){}"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfProfundidadCm">Profundidad útil agua (cm)</label><input type="number" id="setupSrfProfundidadCm" class="setup-dwc-input" min="10" max="50" step="0.5" placeholder="25" oninput="try{updateTorreBuilder()}catch(e){}"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfNumPlantas">Nº plantas (huecos)</label><input type="number" id="setupSrfNumPlantas" class="setup-dwc-input" min="1" max="64" step="1" placeholder="8" oninput="try{updateTorreBuilder()}catch(e){}"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfFilas">Filas en balsa</label><input type="number" id="setupSrfFilas" class="setup-dwc-input" min="1" max="8" step="1" placeholder="1" oninput="try{updateTorreBuilder()}catch(e){}"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfOxigenacionModo">Oxigenación</label><select id="setupSrfOxigenacionModo" class="setup-dwc-input" onchange="try{srfRefreshOxigenacionUi(\'setup\');updateTorreBuilder()}catch(e){}"><option value="aireador">Bomba de aire (recirculante)</option><option value="kratky">Kratky (cámara de aire, sin aireador)</option></select></' + t + '>',
  '          <' + t + ' id="setupSrfAirWrap"><label class="form-label setup-dwc-label" for="setupSrfAirLpm">Aireación (L/min)</label><input type="number" id="setupSrfAirLpm" class="setup-dwc-input" min="0.5" max="300" step="0.5" placeholder="8"></' + t + '>',
  '          <' + t + ' id="setupSrfKratkyGapWrap" class="setup-hidden"><label class="form-label setup-dwc-label" for="setupSrfKratkyGapCm">Hueco aire bajo balsa (cm)</label><input type="number" id="setupSrfKratkyGapCm" class="setup-dwc-input" min="2" max="40" step="0.5" placeholder="8"></' + t + '>',
  '          <' + t + ' id="setupSrfCirculanteWrap"><label class="form-label setup-dwc-label"><input type="checkbox" id="setupSrfCirculante" checked onchange="try{srfRefreshOxigenacionUi(\'setup\')}catch(e){}"> Recirculación de solución</label></' + t + '>',
  '          <' + t + ' id="setupSrfRecircWrap"><label class="form-label setup-dwc-label" for="setupSrfRecircLh">Recirculación (L/h)</label><input type="number" id="setupSrfRecircLh" class="setup-dwc-input" min="0" max="8000" step="10" placeholder="400"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfNetPotMm">Ø aro net pot (mm)</label><input type="number" id="setupSrfNetPotMm" class="setup-dwc-input" min="25" max="120" step="1" placeholder="50"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfBalsaGrosorMm">Grosor balsa (mm)</label><input type="number" id="setupSrfBalsaGrosorMm" class="setup-dwc-input" min="15" max="80" step="1" placeholder="40"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfVolTrabajoL">Litros útiles en estanque</label><input type="number" id="setupSrfVolTrabajoL" class="setup-dwc-input" min="0.5" max="5000" step="0.1" placeholder="vacío = capacidad" oninput="try{updateTorreBuilder()}catch(e){}"></' + t + '>',
  '          <' + t + '><label class="form-label setup-dwc-label" for="setupSrfVolumenManualL">Volumen manual (L, opc.)</label><input type="number" id="setupSrfVolumenManualL" class="setup-dwc-input" min="1" max="5000" step="0.1" placeholder="si difiere de L×A×P" oninput="try{updateTorreBuilder()}catch(e){}"></' + t + '>',
  '        </' + t + '>',
  '        <' + t + ' id="setupSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></' + t + '>',
  '      </' + t + '>',
].join('\n');

if (!h.includes('setupSrfDetalleWrap')) {
  h = h.replace(
    '      <' + t + ' id="setupNftBuilderWrap" class="setup-hidden">',
    setupSrfBlock + '\n\n      <' + t + ' id="setupNftBuilderWrap" class="setup-hidden">'
  );
}

if (!h.includes('setupCardTipoSrf')) {
  const ins = [
    '          <button type="button" class="equip-card setup-tipo-instalacion-card" id="setupCardTipoSrf"',
    "            onclick=\"seleccionarTipoInstalacionSetup('srf')\"",
    '            aria-pressed="false" aria-label="SRF: balsa flotante sobre estanque">',
    '            <' + t + ' class="setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-layers"/></svg></' + t + '>',
    '            <' + t + ' class="setup-tipo-name">SRF</' + t + '>',
    '            <' + t + ' class="setup-tipo-hint">Balsa flotante</' + t + '>',
    '          </button>',
  ].join('\n');
  const marker = 'id="setupCardTipoRdwc"';
  const start = h.indexOf(marker);
  if (start >= 0) {
    const hint = h.indexOf('Recirculación continua', start);
    const close = hint >= 0 ? h.indexOf('</button>', hint) : -1;
    if (close >= 0) {
      h = h.slice(0, close + '</button>'.length) + '\n' + ins + h.slice(close + '</button>'.length);
    }
  }
}

h = h.replace('\n<div id="setupDwcSoloBloque">', '\n        <div id="setupDwcSoloBloque">');

fs.writeFileSync(p, h);
console.log({
  card: h.includes('setupCardTipoSrf'),
  block: h.includes('setupSrfDetalleWrap'),
  inline: h.includes('setupInlineTipoSrf'),
});
