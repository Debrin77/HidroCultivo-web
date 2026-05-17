const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

if (!s.includes('setupNftCestaRecoStatus')) {
  const needle =
    '              </div>' + nl + '            </motion>' + nl + '            <div class="setup-nft-channel-wrap">';
  const needle2 =
    '              </div>' + nl + '            </div>' + nl + '            <motion class="setup-nft-channel-wrap">';
  const real =
    '              </div>' + nl + '            </div>' + nl + '            <div class="setup-nft-channel-wrap">';
  const ins =
    '              </div>' + nl +
    '              <p id="setupNftCestaRecoStatus" class="setup-nft-compat-status setup-hidden" role="status" aria-live="polite"></p>' +
    nl + '            </div>' + nl + '            <div class="setup-nft-channel-wrap">';
  if (!s.includes(real)) {
    console.error('setup anchor missing');
    process.exit(1);
  }
  s = s.replace(real, ins);
}

if (!s.includes('sysNftCestaRecoStatus')) {
  const sys =
    '<p id="sysNftCultivoRecoStatus" class="torre-nft-p-note setup-hidden" role="status" aria-live="polite"></p>';
  if (!s.includes(sys)) {
    console.error('sys cultivo status missing');
    process.exit(1);
  }
  s = s.replace(
    sys,
    sys +
      nl +
      '        <p id="sysNftCestaRecoStatus" class="torre-nft-p-note setup-hidden" role="status" aria-live="polite"></p>'
  );
}

s = s.replace(
  /hc-setup-wizard-nft-diagrams\.js\?v=[^"]+/,
  'hc-setup-wizard-nft-diagrams.js?v=2026-05-15-nft-compat'
);

fs.writeFileSync(p, s);
console.log('patched NFT cesta reco status elements');
