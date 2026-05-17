/**
 * SRF reco UI en asistente/sistema + bienvenida + script matriz cestas.
 */
const fs = require('fs');
const path = require('path');
const indexPath = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(indexPath, 'utf8');

function ensureScript() {
  const tag = '  <script src="js/hc-cultivo-cesta-matrix.js?v=2026-05-15"></script>\r\n';
  if (!h.includes('hc-cultivo-cesta-matrix.js')) {
    h = h.replace(
      /(\s*<script src="js\/hc-setup-wizard-srf\.js[^"]*"><\/script>)/,
      tag + '$1'
    );
  }
  h = h.replace(
    /js\/hc-setup-wizard-srf\.js\?v=[^"]+/,
    'js/hc-setup-wizard-srf.js?v=2026-05-15-srf-reco'
  );
  h = h.replace(/js\/hc-setup-consejos\.js\?v=[^"]+/, 'js/hc-setup-consejos.js?v=2026-05-15-cesta-matrix');
}

const setupBalsa =
  '        <p class="setup-dwc-section-kicker">Balsa EPS</p>\r\n' +
  '        <div class="setup-dwc-grid-2">\r\n' +
  '          <motion><label class="form-label setup-dwc-label" for="setupSrfBalsaGrosorMm">Grosor balsa (mm)</label><input type="number" id="setupSrfBalsaGrosorMm" class="setup-dwc-input" min="15" max="80" step="1" placeholder="40" oninput="try{onSetupSrfInput()}catch(e){}"></div>\r\n';

// Rewrite setupBalsa without motion typo
const setupBalsaOk =
  '        <p class="setup-dwc-section-kicker">Balsa EPS</p>\r\n' +
  '        <div class="setup-dwc-grid-2">\r\n' +
  '          <div><label class="form-label setup-dwc-label" for="setupSrfBalsaGrosorMm">Grosor balsa (mm)</label><input type="number" id="setupSrfBalsaGrosorMm" class="setup-dwc-input" min="15" max="80" step="1" placeholder="40" oninput="try{onSetupSrfInput()}catch(e){}"></div>\r\n' +
  '          <div><label class="form-label setup-dwc-label" for="setupSrfEspaciamientoCm">Separación huecos (cm)</label><input type="number" id="setupSrfEspaciamientoCm" class="setup-dwc-input" min="8" max="60" step="1" placeholder="20" oninput="try{onSetupSrfInput()}catch(e){}"></div>\r\n' +
  '        </div>\r\n';

const setupReco =
  '        <p id="setupSrfCultivoRecoStatus" class="setup-dwc-reco-status setup-hidden" role="status" aria-live="polite"></p>\r\n' +
  '        <p id="setupSrfCestaRecoStatus" class="setup-dwc-reco-status setup-hidden" role="status" aria-live="polite"></p>\r\n' +
  '        <div class="setup-nft-aplicar-reco-row setup-mt-8">\r\n' +
  '          <button type="button" class="btn btn-secondary btn-sm" id="setupSrfAplicarCultivoBtn" onclick="aplicarSrfRecoCultivo(\'setup\')" disabled>Aplicar estanque (cultivo)</button>\r\n' +
  '          <button type="button" class="btn btn-secondary btn-sm" id="setupSrfAplicarCestaBtn" onclick="aplicarSrfRecoCesta(\'setup\')" disabled>Aplicar cesta (cultivo)</button>\r\n' +
  '        </div>\r\n';

if (!h.includes('id="setupSrfBalsaGrosorMm"')) {
  const anchor = '        <p class="setup-dwc-section-kicker">Cesta (net pot)</p>';
  if (h.includes(anchor)) h = h.replace(anchor, setupBalsaOk + anchor);
}
if (!h.includes('setupSrfCultivoRecoStatus')) {
  const lit = '        <div id="setupSrfLitrosSolucionBlock"';
  if (h.includes(lit)) h = h.replace(lit, setupReco + lit);
}

const sysReco =
  '          <p id="sysSrfCultivoRecoStatus" class="setup-dwc-reco-status setup-hidden" role="status" aria-live="polite"></p>\r\n' +
  '          <p id="sysSrfCestaRecoStatus" class="setup-dwc-reco-status setup-hidden" role="status" aria-live="polite"></p>\r\n' +
  '          <div class="setup-nft-aplicar-reco-row setup-mt-8">\r\n' +
  '            <button type="button" class="btn btn-secondary btn-sm" id="sysSrfAplicarCultivoBtn" onclick="aplicarSrfRecoCultivo(\'sys\')" disabled>Aplicar estanque (cultivo)</button>\r\n' +
  '            <button type="button" class="btn btn-secondary btn-sm" id="sysSrfAplicarCestaBtn" onclick="aplicarSrfRecoCesta(\'sys\')" disabled>Aplicar cesta (cultivo)</button>\r\n' +
  '          </div>\r\n';

if (!h.includes('sysSrfCultivoRecoStatus')) {
  const needle =
    '          <div id="sysSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></motion></motion></div>\r\n          <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaSrfDesdeFormulario()">';
  const needle2 =
    '          <div id="sysSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></div>\r\n          <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaSrfDesdeFormulario()">';
  if (h.includes(needle2)) {
    h = h.replace(
      needle2,
      '          <div id="sysSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></div>\r\n' +
        sysReco +
        '          <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaSrfDesdeFormulario()">'
    );
  }
}

h = h.replace(
  /<p class="welcome-lead">HIDROCultivo centraliza[\s\S]*?<\/p>/,
  '<p class="welcome-lead">HIDROCultivo centraliza tu operativa diaria: <strong>cinco sistemas hidropónicos</strong> (torre, NFT, DWC, RDWC y SRF) con <strong>cálculos recomendados</strong> de volumen, cestas, bombeo y aireación; más <strong>asistente de mediciones</strong>, <strong>herramientas PRO</strong>, <strong>nutrientes por cultivo y fase</strong> y <strong>meteorología local</strong>.</p>'
);

h = h.replace(
  /<span class="welcome-kpi"><svg class="hc-ico" aria-hidden="true" focusable="false"><use href="#hc-i-layers"\/><\/svg><strong>5<\/strong> sistemas hidropónicos<\/span>/,
  '<span class="welcome-kpi"><svg class="hc-ico" aria-hidden="true" focusable="false"><use href="#hc-i-layers"/></svg><strong>5</strong> sistemas con cálculos guiados</span>'
);

h = h.replace(
  /<p>Torre, NFT, DWC, RDWC o SRF con estructura consistente desde el primer día\.<\/p>/,
  '<p>Torre, NFT, DWC, RDWC o SRF: geometría, litros, cestas, bomba y checklist desde el asistente.</p>'
);

h = h.replace(
  /<p>Soporte de decisiones según etapa, tipo de cultivo y objetivo de manejo\.<\/p>/,
  '<p>Recomendaciones por cultivo, baby leaf o planta completa, y validación de cestas en cada sistema.</p>'
);

h = h.replace(
  /Elige el tipo de sistema: <strong>torre vertical<\/strong>[\s\S]*?su municipio y clima<\/strong>\. Cambia de activa en Inicio o en Cultivo e instalación\./,
  'Elige <strong>torre vertical</strong>, <strong>NFT</strong>, <strong>DWC</strong>, <strong>RDWC</strong> o <strong>SRF</strong> (balsa flotante). Cada sistema guarda geometría, nutrientes y <strong>checklist de recarga</strong> con <strong>cálculos automáticos</strong>: litros de mezcla, bomba o aireador, Ø de cesta y compatibilidad con el cultivo que selecciones. Puedes tener <strong>varias instalaciones mezclando tipos</strong>; cada una guarda <strong>su municipio y clima</strong>. Cambia de activa en Inicio o en Cultivo e instalación.'
);

ensureScript();
fs.writeFileSync(indexPath, h, 'utf8');
console.log('patched', {
  matrixScript: h.includes('hc-cultivo-cesta-matrix'),
  setupBalsa: h.includes('setupSrfBalsaGrosorMm'),
  setupReco: h.includes('setupSrfCultivoRecoStatus'),
  sysReco: h.includes('sysSrfCultivoRecoStatus'),
});
