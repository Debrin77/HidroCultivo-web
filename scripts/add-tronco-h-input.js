const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const tag = 'd' + 'iv';
const close = '</' + tag + '>';
const sysH =
  '<' + tag + '><label class="form-label torre-dwc-lbl-mono" for="sysDwcTroncoAlturaCm">H cm</label>' +
  '<input type="number" id="sysDwcTroncoAlturaCm" class="torre-dwc-input" min="5" max="200" step="0.5" placeholder="—" inputmode="decimal" oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}">' +
  close;
const setupH =
  '<' + tag + '><label class="form-label setup-dwc-label" for="setupDwcTroncoAlturaCm">H</label>' +
  '<input type="number" id="setupDwcTroncoAlturaCm" min="5" max="200" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}">' +
  close;
if (!h.includes('id="sysDwcTroncoAlturaCm"')) {
  const needle = 'id="sysDwcAnchoSupCm"';
  const i = h.indexOf(needle);
  const end = h.indexOf(close, i);
  if (end > 0) {
    h = h.slice(0, end + close.length) + '\n            ' + sysH + h.slice(end + close.length);
  }
}
if (!h.includes('id="setupDwcTroncoAlturaCm"')) {
  const needle = 'id="setupDwcAnchoSupCm"';
  const i = h.indexOf(needle, h.indexOf('setupDwcMedidasTroncoWrap'));
  const end = h.indexOf(close, i);
  if (end > 0) {
    h = h.slice(0, end + close.length) + '\n          ' + setupH + h.slice(end + close.length);
  }
}
fs.writeFileSync(p, h);
console.log('sys', h.includes('sysDwcTroncoAlturaCm'), 'setup', h.includes('setupDwcTroncoAlturaCm'));
