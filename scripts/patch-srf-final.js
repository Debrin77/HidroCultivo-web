const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const tag = 'd' + 'iv';

if (!h.includes('setupCardTipoSrf')) {
  const ins = [
    '          <button type="button" class="equip-card setup-tipo-instalacion-card" id="setupCardTipoSrf"',
    "            onclick=\"seleccionarTipoInstalacionSetup('srf')\"",
    '            aria-pressed="false" aria-label="SRF: balsa flotante sobre estanque">',
    '            <' + tag + ' class="setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-layers"/></svg></' + tag + '>',
    '            <' + tag + ' class="setup-tipo-name">SRF</' + tag + '>',
    '            <' + tag + ' class="setup-tipo-hint">Balsa flotante</' + tag + '>',
    '          </button>',
  ].join('\n');
  const anchor =
    '            <' + tag + ' class="setup-tipo-hint">Recirculación continua</' + tag + '>\n          </button>\n        </' + tag + '>';
  h = h.replace(anchor, anchor.replace('</button>', '</button>\n' + ins));
}

const blockRe = new RegExp(
  '\\s*<' +
    tag +
    ' id="setupSrfDetalleWrap" class="setup-hidden">[\\s\\S]*?<' +
    tag +
    ' id="setupSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></' +
    tag +
    '>\\s*</' +
    tag +
    '>\\s*(?=<div id="setupDwcSoloBloque">)'
);
const m = h.match(blockRe);
if (m) {
  const block = m[0].replace(/^\s+/, '      ');
  h = h.replace(m[0], '\n');
  const anchor = '      </' + tag + '>\n\n      <' + tag + ' id="setupNftBuilderWrap"';
  if (h.includes(anchor) && (h.match(/setupSrfDetalleWrap/g) || []).length === 0) {
    h = h.replace(anchor, '      </' + tag + '>\n\n' + block + '\n      <' + tag + ' id="setupNftBuilderWrap"');
  }
}

fs.writeFileSync(p, h);
console.log({
  card: h.includes('setupCardTipoSrf'),
  blocks: (h.match(/setupSrfDetalleWrap/g) || []).length,
});
