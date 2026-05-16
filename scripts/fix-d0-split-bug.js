const fs = require('fs');
const p = require('path').join(__dirname, '..', 'js', 'hc-setup-wizard-dwc.js');
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/\s*\)\.split\('div'\)\.join\(D\);\n\}/, ';\n}');
fs.writeFileSync(p, s);
console.log(s.includes("split('div')") ? 'still broken' : 'fixed');
