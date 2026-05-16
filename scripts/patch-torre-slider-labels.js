const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const d = 'd' + 'iv';
const reN = new RegExp(
  '<' +
    d +
    ' class="torre-control-row">\\s*<input type="range" class="torre-slider" id="sliderNiveles"[^>]+>\\s*<span id="valNiveles" class="visually-hidden"[^>]*>\\d+<\\/span>\\s*<\\/' +
    d +
    '>',
  'm'
);
const reC = new RegExp(
  '<' +
    d +
    ' class="torre-control-row">\\s*<input type="range" class="torre-slider" id="sliderCestas"[^>]+>\\s*<span id="valCestas" class="visually-hidden"[^>]*>\\d+<\\/span>\\s*<\\/' +
    d +
    '>',
  'm'
);
const newN =
  '<' +
  d +
  ' class="torre-control-row">\n            <' +
  d +
  ' class="torre-control-label">\n              Niveles\n              <span class="torre-control-val" id="valNiveles" aria-live="polite">5</span>\n            </' +
  d +
  '>\n            <input type="range" class="torre-slider" id="sliderNiveles"\n              min="1" max="10" value="5" oninput="onTorreSlidersInput()"\n              aria-label="Niveles de la torre" aria-valuemin="1" aria-valuemax="10" aria-valuenow="5">\n          </' +
  d +
  '>';
const newC =
  '<' +
  d +
  ' class="torre-control-row">\n            <' +
  d +
  ' class="torre-control-label">\n              Cestas por nivel\n              <span class="torre-control-val" id="valCestas" aria-live="polite">5</span>\n            </' +
  d +
  '>\n            <input type="range" class="torre-slider" id="sliderCestas"\n              min="1" max="8" value="5" oninput="onTorreSlidersInput()"\n              aria-label="Cestas por nivel" aria-valuemin="1" aria-valuemax="8" aria-valuenow="5">\n          </' +
  d +
  '>';
const onlySetup = (s) => s.includes('setupTorreBuilderControlsSlot');
const idx = h.indexOf('setupTorreBuilderControlsSlot');
if (idx < 0) {
  console.error('slot not found');
  process.exit(1);
}
const before = h.slice(0, idx);
const after = h.slice(idx);
const a2 = reN.test(after) ? before + after.replace(reN, newN) : h;
if (!reN.test(after)) {
  console.error('niveles re no match in slot');
  process.exit(1);
}
let out = before + after.replace(reN, newN);
const idx2 = out.indexOf('setupTorreBuilderControlsSlot');
const chunk = out.slice(idx2);
if (!reC.test(chunk)) {
  console.error('cestas re no match');
  process.exit(1);
}
out = out.slice(0, idx2) + chunk.replace(reC, newC);
fs.writeFileSync(p, out);
console.log('ok');
