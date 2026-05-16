const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const o =
  'id="setupSrfBombaRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8 setup-hidden"';
const n = 'id="setupSrfBombaRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8"';
if (!h.includes(o)) {
  console.error('pattern not found');
  process.exit(1);
}
h = h.replace(o, n);
fs.writeFileSync(p, h);
console.log('ok');
