const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
if (h.includes('sysDwcTroncoAlturaCm')) {
  console.log('already');
  process.exit(0);
}
const tag = 'd' + 'iv';
const ins =
  '\n            <' +
  tag +
  '><label class="form-label torre-dwc-lbl-mono" for="sysDwcTroncoAlturaCm">H cm</label>' +
  '<input type="number" id="sysDwcTroncoAlturaCm" class="torre-dwc-input" min="5" max="200" step="0.5" placeholder="—" inputmode="decimal" ' +
  'oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}"></' +
  tag +
  '>';
const marker = 'sysDwcMedidasTroncoWrap';
const wrapStart = h.indexOf('id="' + marker + '"');
const supPos = h.indexOf('sysDwcAnchoSupCm', wrapStart);
const end = h.indexOf('</' + tag + '>', supPos);
h = h.slice(0, end + ('</' + tag + '>').length) + ins + h.slice(end + ('</' + tag + '>').length);
fs.writeFileSync(p, h);
console.log('ok', h.includes('sysDwcTroncoAlturaCm'));
