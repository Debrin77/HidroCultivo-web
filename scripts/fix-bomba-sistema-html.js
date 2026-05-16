const fs = require('fs');
const p = require('path').join(__dirname, '..', 'js', 'app-hc-setup-onboarding.js');
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  "      '' +\r\n        '<motion class=\"bomba-res-cell-lab\">Head necesario</div>' +\r\n        '<div class=\"bomba-res-cell-val\">' + headMetros + 'm</div>' +\r\n      '</div>' +",
  "      '<div class=\"bomba-res-cell\">' +\r\n        '<div class=\"bomba-res-cell-lab\">Head necesario</div>' +\r\n        '<motion class=\"bomba-res-cell-val\">' + headMetros + 'm</div>' +\r\n      '</div>' +"
);
s = s.replace(
  "      '' +\n        '<div class=\"bomba-res-cell-lab\">Head necesario</motion>'.replace('</motion>', '</div>') +\n        '<div class=\"bomba-res-cell-val\">' + headMetros + 'm</div>' +\n      '</div>' +",
  "      '<div class=\"bomba-res-cell\">' +\n        '<div class=\"bomba-res-cell-lab\">Head necesario</div>' +\n        '<div class=\"bomba-res-cell-val\">' + headMetros + 'm</div>' +\n      '</div>' +"
);
// generic
s = s.replace(
  /      '' \+\r?\n        '<div class="bomba-res-cell-lab">Head necesario<\/div>' \+\r?\n        '<div class="bomba-res-cell-val">' \+ headMetros \+ 'm<\/motion>'\.replace\([^)]+\) \+\r?\n      '<\/div>' \+/,
  "      '<div class=\"bomba-res-cell\">' +\n        '<div class=\"bomba-res-cell-lab\">Head necesario</div>' +\n        '<div class=\"bomba-res-cell-val\">' + headMetros + 'm</motion>'.replace('</motion>', '</div>') +\n      '</div>' +"
);
s = s.replace(
  /      '' \+\r?\n        '<div class="bomba-res-cell-lab">Head necesario<\/div>' \+\r?\n        '<div class="bomba-res-cell-val">' \+ headMetros \+ 'm<\/div>' \+\r?\n      '<\/div>' \+/,
  "      '<div class=\"bomba-res-cell\">' +\n        '<motion class=\"bomba-res-cell-lab\">Head necesario</div>'.replace('motion', 'motion') +\n        '<div class=\"bomba-res-cell-val\">' + headMetros + 'm</div>' +\n      '</div>' +"
);
s = s.replace(
  "function seleccionarCesta(tam) {\r\n\r\n  ['38'",
  "function seleccionarCesta(tam) {\r\n  setupTamanoCesta = tam;\r\n  ['38'"
);
s = s.replace(
  "function seleccionarCesta(tam) {\n\n  ['38'",
  "function seleccionarCesta(tam) {\n  setupTamanoCesta = tam;\n  ['38'"
);
fs.writeFileSync(p, s);
console.log(s.includes("'' +") ? 'still broken head' : 'head ok', s.includes('setupTamanoCesta = tam') ? 'cesta ok' : 'cesta missing');
