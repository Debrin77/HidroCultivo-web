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
  'js/diagrams/nft/nft-hydraulic-model.js',
  'js/hc-setup-wizard-pages.js',
  'js/hc-setup-wizard-nft-diagrams.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), s, { filename: f });
}
ctx.nftEscaleraCarasNormalizada = (v) => (parseInt(String(v), 10) === 2 ? 2 : 1);
ctx.nftEscaleraCarasDesdeCfgYUi = () => 2;

const svg = ctx.buildNftEscaleraDiagramSvg(4, 2, 8, 2, 40, 't', {});
const re = /<rect x="([\d.]+)"[^>]*width="([\d.]+)"/g;
const rects = [];
let m;
while ((m = re.exec(svg))) {
  const x = +m[1];
  const w = +m[2];
  rects.push({ x, w, cx: x + w / 2 });
}
const mid = rects.reduce((a, r) => a + r.cx, 0) / rects.length;
const left = rects.filter((r) => r.cx < mid - 30).length;
const right = rects.filter((r) => r.cx > mid + 30).length;
console.log('tubes', rects.length, 'left', left, 'right', right, 'mid', Math.round(mid));
console.log('ok', left === 4 && right === 4 && svg.includes('dos-caras'));
