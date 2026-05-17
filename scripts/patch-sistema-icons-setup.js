const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');

const map = [
  ['setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-antenna"/></svg></motion>', 'SETUP_TORRE'],
  ['setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-layers"/></svg></motion>', 'SETUP_NFT_OR_SRF'],
];

const replacements = [
  [
    /<div class="setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-antenna"\/><\/svg><\/motion>/,
    '<div class="setup-tipo-icon" aria-hidden="true"><svg class="hc-ico" focusable="false"><use href="#hc-i-sys-torre"/></svg></motion>',
  ],
];

// Fix typos - use exact strings from file
const pairs = [
  ['<use href="#hc-i-antenna"/></svg></motion>', 'antenna'],
  ['<use href="#hc-i-antenna"/></svg></motion>', 'antenna2'],
];

const fixes = [
  {
    from: 'id="setupCardTipoTorre"',
    old: '#hc-i-antenna',
    neu: '#hc-i-sys-torre',
  },
  {
    from: 'id="setupCardTipoNft"',
    old: '#hc-i-layers',
    neu: '#hc-i-sys-nft',
  },
  {
    from: 'id="setupCardTipoDwc"',
    old: '#hc-i-bubbles',
    neu: '#hc-i-sys-dwc',
  },
  {
    from: 'id="setupCardTipoRdwc"',
    old: '#hc-i-refresh',
    neu: '#hc-i-sys-rdwc',
  },
  {
    from: 'id="setupCardTipoSrf"',
    old: '#hc-i-layers',
    neu: '#hc-i-sys-srf',
  },
  {
    from: 'id="setupInlineTipoTorre"',
    old: '#hc-i-antenna',
    neu: '#hc-i-sys-torre',
  },
  {
    from: 'id="setupInlineTipoNft"',
    old: '#hc-i-layers',
    neu: '#hc-i-sys-nft',
  },
  {
    from: 'id="setupInlineTipoDwc"',
    old: '#hc-i-bubbles',
    neu: '#hc-i-sys-dwc',
  },
  {
    from: 'id="setupInlineTipoRdwc"',
    old: '#hc-i-refresh',
    neu: '#hc-i-sys-rdwc',
  },
  {
    from: 'id="setupInlineTipoSrf"',
    old: '#hc-i-layers',
    neu: '#hc-i-sys-srf',
  },
];

for (const f of fixes) {
  const i = s.indexOf(f.from);
  if (i < 0) {
    console.error('missing', f.from);
    process.exit(1);
  }
  const slice = s.slice(i, i + 600);
  if (!slice.includes(f.old)) {
    console.error('old icon not near', f.from, f.old);
    process.exit(1);
  }
  const j = s.indexOf(f.old, i);
  s = s.slice(0, j) + f.neu + s.slice(j + f.old.length);
}

if (!s.includes('hc-sistema-icons.js')) {
  s = s.replace(
    '<script src="js/app-hc-torres-badges-notifs.js',
    '<script src="js/hc-sistema-icons.js?v=2026-05-15-sistema-ico"></script>\n  <script src="js/app-hc-torres-badges-notifs.js'
  );
}

fs.writeFileSync(p, s);
console.log('setup sistema icons patched');
