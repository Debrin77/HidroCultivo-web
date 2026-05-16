const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
if (!s.includes('id="sysRdwcLitrosUtilesHint"')) {
  const needle = '            </motion></div>' + nl + '            <div id="sysRdwcMontajeDiyExtra"';
  const needle2 = '            </div>' + nl + '            <motion id="sysRdwcMontajeDiyExtra"';
  const needle3 = '            </div>' + nl + '            <motion id="sysRdwcMontajeDiyExtra"';
  const real = '            </div>' + nl + '            <div id="sysRdwcMontajeDiyExtra"';
  const ins =
    '            </div>' +
    nl +
    '            <p id="sysRdwcLitrosUtilesHint" class="torre-nft-p-soft setup-dwc-help" role="status" aria-live="polite"></p>' +
    nl +
    '            <div id="sysRdwcMontajeDiyExtra"';
  if (s.includes(real)) s = s.replace(real, ins);
  else {
    console.error('sys hint anchor not found');
    process.exit(1);
  }
}
s = s.replace('<motion id="setupRdwcMontajeDiyExtra"', '<motion id="setupRdwcMontajeDiyExtra"');
s = s.split('<motion id="setupRdwcMontajeDiyExtra"').join('<div id="setupRdwcMontajeDiyExtra"');
fs.writeFileSync(p, s);
console.log('fixed hints and motion tag');
