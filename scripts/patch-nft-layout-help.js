const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const needle =
  '              <p class="setup-nft-layout-help">' +
  nl +
  '                <strong>Mesa</strong>: tubos horizontales en paralelo o en varios niveles';
if (!s.includes(needle)) {
  console.error('anchor not found');
  process.exit(1);
}
const replacement =
  '              <p class="setup-nft-layout-help setup-nft-layout-help--brief">' +
  nl +
  '                <strong>Mesa</strong>: tubos en paralelo o varios niveles. <strong>Escalera</strong>: peldaños inclinados (1–2 caras). <strong>Pared</strong>: tubos en zigzag en el muro. Indica la altura de bombeo si el agua sube al primer tubo.' +
  nl +
  '              </p>' +
  nl +
  '              <p class="setup-nft-layout-help setup-nft-layout-help--full">' +
  nl +
  '                <strong>Mesa</strong>: tubos horizontales en paralelo o en varios niveles';
s = s.replace(needle, replacement);
fs.writeFileSync(p, s);
console.log('patched index.html');
