const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const d = 'd' + 'iv';
const dupSys = new RegExp(
  '<' + d + '><label class="form-label torre-dwc-lbl-mono" for="sysDwcProfCm">H cm</label><input type="number" id="sysDwcProfCm"[^>]+></' + d + '>',
  'g'
);
const dupSetup = new RegExp(
  '<' + d + '><label class="form-label setup-dwc-label" for="setupDwcProfCm">H \\(cm\\)</label><input type="number" id="setupDwcProfCm"[^>]+></' + d + '>',
  'g'
);
s = s.replace(dupSys, '');
s = s.replace(dupSetup, '');
s = s.replace(/for="setupDwcLargoInfCm">L inf \(cm\)/g, 'for="setupDwcLargoInfCm">L inf');
s = s.replace(/for="setupDwcAnchoInfCm">A inf \(cm\)/g, 'for="setupDwcAnchoInfCm">A inf');
s = s.replace(/for="setupDwcLargoSupCm">L sup \(cm\)/g, 'for="setupDwcLargoSupCm">L sup');
s = s.replace(/for="setupDwcAnchoSupCm">A sup \(cm\)/g, 'for="setupDwcAnchoSupCm">A sup');
s = s.replace(/<motion>/g, '<' + d + '>');
fs.writeFileSync(p, s);
console.log('setupDwcProfCm', (s.match(/id="setupDwcProfCm"/g) || []).length);
console.log('sysDwcProfCm', (s.match(/id="sysDwcProfCm"/g) || []).length);
