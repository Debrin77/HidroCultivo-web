const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');

const sysBlock =
  '          <motion id="sysDwcMedidasTroncoWrap" class="setup-hidden torre-dwc-grid-3 dwc-tronco-medidas-grid">\r\n' +
  '            <div><label class="form-label torre-dwc-lbl-mono" for="sysDwcLargoInfCm">L inf</label><input type="number" id="sysDwcLargoInfCm" class="torre-dwc-input" min="5" max="300" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></div>\r\n' +
  '            <div><label class="form-label torre-dwc-lbl-mono" for="sysDwcAnchoInfCm">A inf</label><input type="number" id="sysDwcAnchoInfCm" class="torre-dwc-input" min="5" max="300" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></div>\r\n' +
  '            <div><label class="form-label torre-dwc-lbl-mono" for="sysDwcLargoCm">L sup</label><input type="number" id="sysDwcLargoCm" class="torre-dwc-input" min="5" max="300" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></motion>\r\n' +
  '            <div><label class="form-label torre-dwc-lbl-mono" for="sysDwcAnchoCm">A sup</label><input type="number" id="sysDwcAnchoCm" class="torre-dwc-input" min="5" max="300" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></div>\r\n' +
  '            <div><label class="form-label torre-dwc-lbl-mono" for="sysDwcProfCm">H cm</label><input type="number" id="sysDwcProfCm" class="torre-dwc-input" min="5" max="200" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></div>\r\n' +
  '          </div>\r\n' +
  '          <div id="sysDwcTroncoVolBlock" class="setup-hidden dwc-tronco-vol-block" role="status" aria-live="polite">\r\n' +
  '            <div class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">Total</span><span id="sysDwcTroncoVolTotal" class="dwc-tronco-vol-val">—</span></div>\r\n' +
  '            <div class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">Óptimo</span><span id="sysDwcTroncoVolOptimo" class="dwc-tronco-vol-val">—</span></div>\r\n' +
  '          </div>\r\n';

const sysBlockOk = sysBlock.replace(/<\/?motion>/g, (tag) => (tag.startsWith('</') ? '</div>' : '<motion>'.replace('motion', 'motion'))).replace(/<motion>/g, '<div>');

const setupBlock =
  '        <div id="setupDwcMedidasTroncoWrap" class="setup-hidden setup-dwc-grid-3 dwc-tronco-medidas-grid">\r\n' +
  '          <motion><label class="form-label setup-dwc-label" for="setupDwcLargoInfCm">L inf (cm)</label><input type="number" id="setupDwcLargoInfCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></div>\r\n' +
  '          <div><label class="form-label setup-dwc-label" for="setupDwcAnchoInfCm">A inf (cm)</label><input type="number" id="setupDwcAnchoInfCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></div>\r\n' +
  '          <div><label class="form-label setup-dwc-label" for="setupDwcLargoCm">L sup (cm)</label><input type="number" id="setupDwcLargoCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></div>\r\n' +
  '          <div><label class="form-label setup-dwc-label" for="setupDwcAnchoCm">A sup (cm)</label><input type="number" id="setupDwcAnchoCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></div>\r\n' +
  '          <div><label class="form-label setup-dwc-label" for="setupDwcProfCm">H (cm)</label><input type="number" id="setupDwcProfCm" min="5" max="200" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></div>\r\n' +
  '        </div>\r\n' +
  '        <div id="setupDwcTroncoVolBlock" class="setup-hidden dwc-tronco-vol-block" role="status" aria-live="polite">\r\n' +
  '          <div class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">Total</span><span id="setupDwcTroncoVolTotal" class="dwc-tronco-vol-val">—</span></div>\r\n' +
  '          <div class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">Óptimo</span><span id="setupDwcTroncoVolOptimo" class="dwc-tronco-vol-val">—</span></div>\r\n' +
  '        </div>\r\n';

const setupBlockOk = setupBlock.replace(/<\/?motion>/g, '');

if (!h.includes('sysDwcMedidasTroncoWrap')) {
  const a = '          </motion>\r\n          <details class="torre-vol-detalles torre-sistema-details-spaced">';
  const a2 = '          </motion>\r\n          <details id="sysDwcVolDetallesWrap" class="torre-vol-detalles torre-sistema-details-spaced">';
  if (h.includes(a2)) {
    /* already */
  } else if (h.includes('          </div>\r\n          <details class="torre-vol-detalles torre-sistema-details-spaced">')) {
    h = h.replace(
      '          </div>\r\n          <details class="torre-vol-detalles torre-sistema-details-spaced">',
      '          </div>\r\n' + sysBlockOk.replace(/<\/?motion>/g, '') + '          <details id="sysDwcVolDetallesWrap" class="torre-vol-detalles torre-sistema-details-spaced">'
    );
  } else {
    console.error('sys anchor missing');
    process.exit(1);
  }
}

// fix sys block - write directly without motion
const SYS =
  '          <div id="sysDwcMedidasTroncoWrap" class="setup-hidden torre-dwc-grid-3 dwc-tronco-medidas-grid">\r\n' +
  '            <div><label class="form-label torre-dwc-lbl-mono" for="sysDwcLargoInfCm">L inf</label><input type="number" id="sysDwcLargoInfCm" class="torre-dwc-input" min="5" max="300" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></div>\r\n' +
  '            <motion><label class="form-label torre-dwc-lbl-mono" for="sysDwcAnchoInfCm">A inf</label><input type="number" id="sysDwcAnchoInfCm" class="torre-dwc-input" min="5" max="300" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></div>\r\n';

// I'll use StrReplace on index.html directly via reading and manual write

console.log('run manual str replace in agent');
