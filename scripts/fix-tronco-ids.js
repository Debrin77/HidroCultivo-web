const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');

function patchBlock(h, wrapId, volId) {
  const a = h.indexOf('id="' + wrapId + '"');
  if (a < 0) return h;
  const b = h.indexOf('id="' + volId + '"', a);
  if (b < 0) return h;
  let chunk = h.slice(a, b);
  chunk = chunk
    .replace(/for="([^"]*LargoCm)">L sup/g, 'for="$1SupCm">L sup')
    .replace(/id="([^"]*LargoCm)"/g, 'id="$1SupCm"')
    .replace(/for="([^"]*AnchoCm)">A sup/g, 'for="$1SupCm">A sup')
    .replace(/id="([^"]*AnchoCm)"/g, 'id="$1SupCm"');
  return h.slice(0, a) + chunk + h.slice(b);
}

h = patchBlock(h, 'sysDwcMedidasTroncoWrap', 'sysDwcTroncoVolBlock');
h = patchBlock(h, 'setupDwcMedidasTroncoWrap', 'setupDwcTroncoVolBlock');

fs.writeFileSync(p, h, 'utf8');
console.log('fixed tronco sup ids');
