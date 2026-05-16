const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

if (s.includes('id="setupRdwcRecoDesglose"')) {
  console.log('desglose already present');
  process.exit(0);
}

const old =
  '          <motion id="setupRdwcRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
  nl +
  '            <p class="setup-dwc-litros-solucion-label">Resultados recomendados</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-valor" id="setupRdwcRecoValor">—</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-hint" id="setupRdwcRecoHint"></p>' +
  nl +
  '          </div>';

const oldReal =
  '          <div id="setupRdwcRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
  nl +
  '            <p class="setup-dwc-litros-solucion-label">Resultados recomendados</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-valor" id="setupRdwcRecoValor">—</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-hint" id="setupRdwcRecoHint"></p>' +
  nl +
  '          </div>';

const neu =
  '          <div id="setupRdwcRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
  nl +
  '            <p class="setup-dwc-litros-solucion-label">Agua útil del circuito (calculada)</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-valor" id="setupRdwcRecoValor">—</p>' +
  nl +
  '            <ul id="setupRdwcRecoDesglose" class="setup-rdwc-litros-desglose" aria-label="Desglose de litros útiles">' +
  nl +
  '              <li>Reservorio de control: <strong id="setupRdwcRecoControlL">—</strong> L</li>' +
  nl +
  '              <li>Por cubo <span id="setupRdwcRecoCuboDetalle" class="setup-rdwc-litros-desglose-sub"></span>: <strong id="setupRdwcRecoCuboL">—</strong> L × <strong id="setupRdwcRecoSites">—</strong> cubos = <strong id="setupRdwcRecoCubosSum">—</strong> L</li>' +
  nl +
  '              <li class="setup-rdwc-litros-desglose-suma">Suma (total circuito): <strong id="setupRdwcRecoSuma">—</strong> L</li>' +
  nl +
  '            </ul>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-hint" id="setupRdwcRecoHint"></p>' +
  nl +
  '            <p id="setupRdwcRecoManualNote" class="setup-rdwc-litros-manual-note setup-hidden" role="note"></p>' +
  nl +
  '          </motion></div>';

const neuFixed = neu.replace(/<\/motion><\/motion>/g, '').replace('<motion id="setupRdwcRecoBlock"', '<div id="setupRdwcRecoBlock"').replace('</motion></motion>', '</motion></motion>');

const neuOk =
  '          <div id="setupRdwcRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
  nl +
  '            <p class="setup-dwc-litros-solucion-label">Agua útil del circuito (calculada)</p>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-valor" id="setupRdwcRecoValor">—</p>' +
  nl +
  '            <ul id="setupRdwcRecoDesglose" class="setup-rdwc-litros-desglose" aria-label="Desglose de litros útiles">' +
  nl +
  '              <li>Reservorio de control: <strong id="setupRdwcRecoControlL">—</strong> L</li>' +
  nl +
  '              <li>Por cubo <span id="setupRdwcRecoCuboDetalle" class="setup-rdwc-litros-desglose-sub"></span>: <strong id="setupRdwcRecoCuboL">—</strong> L × <strong id="setupRdwcRecoSites">—</strong> cubos = <strong id="setupRdwcRecoCubosSum">—</strong> L</li>' +
  nl +
  '              <li class="setup-rdwc-litros-desglose-suma">Suma (total circuito): <strong id="setupRdwcRecoSuma">—</strong> L</li>' +
  nl +
  '            </ul>' +
  nl +
  '            <p class="setup-dwc-litros-solucion-hint" id="setupRdwcRecoHint"></p>' +
  nl +
  '            <p id="setupRdwcRecoManualNote" class="setup-rdwc-litros-manual-note setup-hidden" role="note"></p>' +
  nl +
  '          </div>';

if (!s.includes(oldReal)) {
  console.error('anchor not found');
  process.exit(1);
}
s = s.replace(oldReal, neuOk);
fs.writeFileSync(p, s);
console.log('patched reco desglose html');
