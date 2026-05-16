const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const nl = h.includes('\r\n') ? '\r\n' : '\n';

const start = h.indexOf('<motion id="setupSrfDetalleWrap"'.replace('motion', 'div'));
const endIdx = h.indexOf('<motion id="setupNftBuilderWrap"'.replace('motion', 'motion'));
const start2 = h.indexOf('<div id="setupSrfDetalleWrap"');
const end2 = h.indexOf('<div id="setupNftBuilderWrap"');
const s = start2 >= 0 ? start2 : start;
const e = end2 >= 0 ? end2 : endIdx;
if (s < 0 || e < 0) {
  console.log('not found', s, e);
  process.exit(1);
}

const block =
  '<div id="setupSrfDetalleWrap" class="setup-hidden">' +
  nl +
  '        <div class="setup-dwc-title">SRF · balsa flotante</div>' +
  nl +
  '        <p class="setup-dwc-help">Mide el <strong>estanque</strong>, la <strong>rejilla en la balsa</strong> (filas × plantas por fila) y la <strong>cesta</strong> (Ø y profundidad). Los litros de solución y la bomba de aire se calculan en tiempo real.</p>' +
  nl +
  '        <div id="setupSrfPreviewSection" class="setup-dwc-preview-section">' +
  nl +
  '          <p class="setup-dwc-preview-kicker">Vista previa</p>' +
  nl +
  '          <div class="torre-preview torre-preview--srf" id="setupSrfPreview" role="img" aria-live="polite"></div>' +
  nl +
  '        </div>' +
  nl +
  '        <p class="setup-dwc-section-kicker">Estanque</p>' +
  nl +
  '        <div class="setup-dwc-grid-2">' +
  nl +
  '          <div><label class="form-label setup-dwc-label" for="setupSrfCanalLargoCm">Largo estanque (cm)</label><input type="number" id="setupSrfCanalLargoCm" class="setup-dwc-input" min="20" max="600" step="1" placeholder="120" oninput="try{onSetupSrfInput()}catch(e){}"></div>' +
  nl +
  '          <div><label class="form-label setup-dwc-label" for="setupSrfCanalAnchoCm">Ancho estanque (cm)</label><input type="number" id="setupSrfCanalAnchoCm" class="setup-dwc-input" min="20" max="400" step="1" placeholder="60" oninput="try{onSetupSrfInput()}catch(e){}"></motion>' +
  nl;

// fix motion typo in block - rewrite without typo
const B =
  `<motion id="setupSrfDetalleWrap" class="setup-hidden">
        <div class="setup-dwc-title">SRF · balsa flotante</div>
        <p class="setup-dwc-help">Mide el <strong>estanque</strong>, la <strong>rejilla en la balsa</strong> (filas × plantas por fila) y la <strong>cesta</strong> (Ø y profundidad). Los litros de solución y la bomba de aire se calculan en tiempo real.</p>
        <div id="setupSrfPreviewSection" class="setup-dwc-preview-section">
          <p class="setup-dwc-preview-kicker">Vista previa</p>
          <div class="torre-preview torre-preview--srf" id="setupSrfPreview" role="img" aria-live="polite"></div>
        </div>
        <p class="setup-dwc-section-kicker">Estanque</p>
        <div class="setup-dwc-grid-2">
          <div><label class="form-label setup-dwc-label" for="setupSrfCanalLargoCm">Largo estanque (cm)</label><input type="number" id="setupSrfCanalLargoCm" class="setup-dwc-input" min="20" max="600" step="1" placeholder="120" oninput="try{onSetupSrfInput()}catch(e){}"></div>
          <div><label class="form-label setup-dwc-label" for="setupSrfCanalAnchoCm">Ancho estanque (cm)</label><input type="number" id="setupSrfCanalAnchoCm" class="setup-dwc-input" min="20" max="400" step="1" placeholder="60" oninput="try{onSetupSrfInput()}catch(e){}"></div>
          <div><label class="form-label setup-dwc-label" for="setupSrfProfundidadCm">Profundidad útil agua (cm)</label><input type="number" id="setupSrfProfundidadCm" class="setup-dwc-input" min="10" max="50" step="0.5" placeholder="25" oninput="try{onSetupSrfInput()}catch(e){}"></div>
        </div>
        <p class="setup-dwc-section-kicker">Balsa · huecos</p>
        <motion class="setup-dwc-grid-2">
          <div><label class="form-label setup-dwc-label" for="setupSrfFilas">Filas en balsa</label><input type="number" id="setupSrfFilas" class="setup-dwc-input" min="1" max="8" step="1" placeholder="2" oninput="try{onSetupSrfInput()}catch(e){}"></div>
          <div><label class="form-label setup-dwc-label" for="setupSrfPlantasPorFila">Plantas por fila</label><input type="number" id="setupSrfPlantasPorFila" class="setup-dwc-input" min="1" max="16" step="1" placeholder="4" oninput="try{onSetupSrfInput()}catch(e){}"></div>
        </div>
        <p class="setup-dwc-section-kicker">Cesta (net pot)</p>
        <div class="setup-dwc-grid-2">
          <div><label class="form-label setup-dwc-label" for="setupSrfNetPotMm">Diámetro cesta (mm)</label><input type="number" id="setupSrfNetPotMm" class="setup-dwc-input" min="25" max="120" step="1" placeholder="50" oninput="try{onSetupSrfInput()}catch(e){}"></div>
          <div><label class="form-label setup-dwc-label" for="setupSrfNetPotHeightMm">Profundidad cesta (mm)</label><input type="number" id="setupSrfNetPotHeightMm" class="setup-dwc-input" min="30" max="200" step="1" placeholder="75" oninput="try{onSetupSrfInput()}catch(e){}"></div>
          <div><label class="form-label setup-dwc-label" for="setupSrfObjetivoCultivo">Objetivo de cultivo</label><select id="setupSrfObjetivoCultivo" class="setup-dwc-input" onchange="try{onSetupSrfInput()}catch(e){}"><option value="final">Planta adulta</option><option value="baby">Baby leaf</option></select></div>
          <div><label class="form-label setup-dwc-label" for="setupSrfOxigenacionModo">Oxigenación</label><select id="setupSrfOxigenacionModo" class="setup-dwc-input" onchange="try{srfRefreshOxigenacionUi('setup');onSetupSrfInput()}catch(e){}"><option value="aireador">Bomba de aire</option><option value="kratky">Kratky (sin aireador)</option></select></div>
          <div id="setupSrfKratkyGapWrap" class="setup-hidden"><label class="form-label setup-dwc-label" for="setupSrfKratkyGapCm">Cámara de aire bajo balsa (cm)</label><input type="number" id="setupSrfKratkyGapCm" class="setup-dwc-input" min="2" max="40" step="0.5" placeholder="8" oninput="try{onSetupSrfInput()}catch(e){}"></div>
        </div>
        <div id="setupSrfLitrosSolucionBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">
          <p class="setup-dwc-litros-solucion-label">Litros de solución en el estanque</p>
          <p class="setup-dwc-litros-solucion-valor" id="setupSrfLitrosSolucionValor">—</p>
          <p class="setup-dwc-litros-solucion-hint" id="setupSrfLitrosSolucionHint"></p>
        </div>
        <div id="setupSrfBombaRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8 setup-hidden" role="status" aria-live="polite">
          <p class="setup-dwc-litros-solucion-label">Bomba de aire recomendada</p>
          <p class="setup-dwc-litros-solucion-valor" id="setupSrfBombaRecoValor">—</p>
          <p class="setup-dwc-litros-solucion-hint" id="setupSrfBombaRecoHint"></p>
        </div>
        <motion id="setupVolMezclaSlotSrf" class="setup-mt-8"></div>
        <div id="setupSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></div>
      </div>

      <div id="setupNftBuilderWrap"`;

const fixed = B.replace(/<\/?motion\b[^>]*>/g, (m) =>
  m.startsWith('</') ? '</div>' : m.replace('motion', 'div').replace('<motion', '<motion').replace('motion', 'div')
);
// simpler
const fixed2 = B.replace(/<motion/g, '<div').replace(/<\/motion>/g, '</div>');

h = h.slice(0, s) + fixed2 + h.slice(e);
fs.writeFileSync(p, h);
console.log('ok', h.includes('setupSrfPlantasPorFila'));
