const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
const D = 'd' + 'iv';
let h = fs.readFileSync(p, 'utf8');
if (h.includes('seccionTuboDiametroOculto')) {
  console.log('already hidden');
  process.exit(0);
}
h = h.replace(
  '      <!-- Tubo y bomba — solo para torres DIY/personalizadas -->',
  '      <!-- Bomba orientativa torre (no se pregunta Ø tubo central) -->'
);
h = h.replace(
  '          Tubo central y bomba',
  '          Bomba de riego (orientativa)'
);
const start = '        <!-- Diámetro del tubo -->';
const end = '        <!-- Altura de la torre -->';
const i0 = h.indexOf(start);
const i1 = h.indexOf(end);
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  console.error('markers not found', i0, i1);
  process.exit(1);
}
const inner = h.slice(i0, i1);
const wrapped =
  `        <${D} id="seccionTuboDiametroOculto" class="setup-hidden" aria-hidden="true">\n` + inner + `        </${D}>\n\n`;
h = h.slice(0, i0) + wrapped + h.slice(i1);
fs.writeFileSync(p, h);
console.log('ok');
