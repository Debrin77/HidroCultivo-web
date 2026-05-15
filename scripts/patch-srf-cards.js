const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');

const cardLines = [
  '          <button type="button" class="equip-card setup-tipo-instalacion-card" id="setupCardTipoSrf"',
  "            onclick=\"seleccionarTipoInstalacionSetup('srf')\"",
  '            aria-pressed="false" aria-label="SRF: balsa flotante sobre estanque">',
  '            <div class="setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-layers"/></svg></motion>',
  '            <div class="setup-tipo-name">SRF</div>',
  '            <div class="setup-tipo-hint">Balsa flotante</div>',
  '          </button>',
];
const card = cardLines.join('\n').split('motion').join('div');

const inline = [
  '          <button type="button" class="equip-card setup-tipo-instalacion-card" id="setupInlineTipoSrf"',
  "            onclick=\"seleccionarTipoInstalacionSetup('srf')\"",
  '            aria-pressed="false" aria-label="SRF"><span class="setup-inline-tipo-ico" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-layers"/></svg></span> SRF</button>',
].join('\n');

if (!h.includes('setupCardTipoSrf')) {
  const anchor =
    '            <motion class="setup-tipo-hint">Recirculación continua</div>\n          </button>';
  const anchorOk = anchor.split('motion').join('motion');
  const anchor2 =
    '            <div class="setup-tipo-hint">Recirculación continua</div>\n          </button>';
  if (h.includes(anchor2)) {
    h = h.replace(anchor2, anchor2 + '\n' + card);
  }
}

if (!h.includes('setupInlineTipoSrf')) {
  h = h.replace(
    '<span class="setup-inline-tipo-ico" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-refresh"/></svg></span> RDWC</button>',
    '<span class="setup-inline-tipo-ico" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-refresh"/></svg></span> RDWC</button>\n' +
      inline
  );
}

h = h.replace(
  '        </div>\n                <motion id="setupSrfDetalleWrap"'.split('motion').join('div'),
  '        </div>\n        <div id="setupSrfDetalleWrap"'
);

fs.writeFileSync(p, h);
console.log({
  card: h.includes('setupCardTipoSrf'),
  inline: h.includes('setupInlineTipoSrf'),
});
