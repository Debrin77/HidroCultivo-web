import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {
  console,
  Math,
  parseInt,
  String,
  Number,
  isFinite,
  Infinity,
  undefined,
  Array,
  Object,
  JSON,
  Date,
  NFT_FLOW_SUPPLY: '#2563eb',
  NFT_FLOW_RETURN: '#16a34a',
  torreSvgAnimacionesActivas: () => false,
  escHtmlUi: (t) => String(t || ''),
  escAriaAttr: (t) => String(t || ''),
};
ctx.globalThis = ctx;
ctx.window = ctx;
const s = vm.createContext(ctx);
for (const f of [
  'js/hc-diagram-palette.js',
  'js/hc-setup-wizard-core.js',
  'js/diagrams/nft/nft-hydraulic-model.js',
  'js/hc-setup-wizard-pages.js',
  'js/hc-setup-wizard-nft-diagrams.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), s, { filename: f });
}

const svg = ctx.buildNftEscaleraDiagramSvg(4, 2, 8, 2, 40, '', {});
const re = /<rect x="([\d.]+)" y="([\d.]+)"[^>]*width="([\d.]+)"/g;
const tubes = [];
let m;
while ((m = re.exec(svg))) {
  tubes.push({ x: +m[1], y: +m[2], w: +m[3], cx: +m[1] + +m[3] / 2, xL: +m[1], xR: +m[1] + +m[3] });
}
tubes.sort((a, b) => a.y - b.y);
const mid = tubes.reduce((a, t) => a + t.cx, 0) / tubes.length;
const left = tubes.filter((t) => t.cx < mid - 30).sort((a, b) => a.y - b.y);
const right = tubes.filter((t) => t.cx > mid + 30).sort((a, b) => a.y - b.y);

console.log('tubes', tubes.length, 'mid', mid.toFixed(1));
for (const [side, arr] of [['L', left], ['R', right]]) {
  arr.forEach((t, i) => {
    console.log(
      side,
      i,
      'y',
      t.y.toFixed(0),
      'cx',
      t.cx.toFixed(1),
      'xL',
      t.xL.toFixed(1),
      'xR',
      t.xR.toFixed(1)
    );
  });
}
const outerTop = right[0].xR - left[0].xL;
const outerBot = right[right.length - 1].xR - left[left.length - 1].xL;
console.log('outer span top', outerTop.toFixed(1), 'bottom', outerBot.toFixed(1), outerBot > outerTop ? 'A' : 'V');

fs.writeFileSync(path.join(root, 'scripts', '_debug-esc2.svg'), svg);
