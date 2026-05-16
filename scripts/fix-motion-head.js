const fs = require('fs');
const p = require('path').join(__dirname, '..', 'js', 'app-hc-setup-onboarding.js');
let s = fs.readFileSync(p, 'utf8');
const bad = "        '<motion class=\"bomba-res-cell-lab\">Head necesario</div>'.replace('motion', 'motion') +";
const good = "        '<div class=\"bomba-res-cell-lab\">Head necesario</div>' +";
if (!s.includes(bad)) {
  console.log('pattern not found, maybe fixed');
  process.exit(0);
}
s = s.replace(bad, good);
fs.writeFileSync(p, s);
console.log('ok');
