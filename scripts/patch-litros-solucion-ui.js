const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
const D = 'd' + 'iv';
let h = fs.readFileSync(p, 'utf8');

const block =
  `\n        <${D} id="setupDwcLitrosSolucionBlock" class="setup-dwc-litros-solucion-block" role="status" aria-live="polite">\n` +
  `          <p class="setup-dwc-litros-solucion-label" id="setupDwcLitrosSolucionLabel">Litros de solución en el depósito</p>\n` +
  `          <p class="setup-dwc-litros-solucion-valor" id="setupDwcLitrosSolucionValor">—</p>\n` +
  `          <p class="setup-dwc-litros-solucion-hint" id="setupDwcLitrosSolucionHint">Se actualiza al indicar medidas del cubo y de la cesta (llenado seguro bajo la maceta + cámara de aire).</p>\n` +
  `        </${D}>\n`;

const re = new RegExp(
  `(id="setupDwcPotHmm"[^>]*oninput="try\\{onSetupDwcMedidasInput\\(\\)\\}catch\\(e\\)\\{}"[^>]*>\\s*</${D}>\\s*</${D}>)\\s*(<${D} id="setupDwcDepUnidoExtrasWrap")`,
  'm'
);

if (!h.includes('setupDwcLitrosSolucionBlock')) {
  if (!re.test(h)) {
    console.error('insert point not found');
    process.exit(1);
  }
  h = h.replace(re, `$1${block}$2`);
  console.log('inserted litros solucion block');
} else {
  console.log('block already exists');
}

h = h.replace(
  'id="setupVolMezclaSlotDwc" class="setup-dwc-vol-mezcla-slot setup-mt-10 setup-dwc-dep-unido-only"',
  'id="setupVolMezclaSlotDwc" class="setup-hidden" aria-hidden="true"'
);

fs.writeFileSync(p, h);
console.log('ok');
