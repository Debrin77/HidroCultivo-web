const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
h = h.replace(/\r?\n<div id="setupDwcDepUnidoExtrasWrap"/, '\n        <div id="setupDwcDepUnidoExtrasWrap"');
fs.writeFileSync(p, h);
console.log('ok');
