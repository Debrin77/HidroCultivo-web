/**
 * Simula buildNftActiveDiagramSvg (asistente) escalera 2 caras.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

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
  setTimeout,
  clearTimeout,
  NFT_FLOW_SUPPLY: '#2563eb',
  NFT_FLOW_RETURN: '#16a34a',
  torreSvgAnimacionesActivas: () => false,
  escHtmlUi: (t) => String(t || ''),
  escAriaAttr: (t) => String(t || ''),
};
ctx.globalThis = ctx;
ctx.window = ctx;
const sandbox = vm.createContext(ctx);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

function nftEscaleraCarasNormalizada(v) {
  const n = parseInt(String(v), 10);
  return n === 2 ? 2 : 1;
}
ctx.nftEscaleraCarasNormalizada = nftEscaleraCarasNormalizada;
ctx.nftDisposicionNormalizada = (v) => {
  const s = String(v || 'mesa').toLowerCase();
  return s === 'escalera' || s === 'pared' ? s : 'mesa';
};
ctx.nftHuecosDesdeCfg = (cfg) => parseInt(String(cfg.nftHuecosPorCanal || 8), 10);
ctx.getNftHidraulicaDesdeConfig = (cfg) => {
  const caras = nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras);
  const nv = parseInt(String(cfg.nftEscaleraNivelesCara || 4), 10);
  return { nCh: nv * caras, nHx: ctx.nftHuecosDesdeCfg(cfg), escaleraNiveles: nv, escaleraCaras: caras };
};
ctx.nftColectoresParaleloDesdeConfig = () => false;
ctx.parseNftMesaTubosPorNivelStr = () => [];

for (const f of [
  'js/hc-diagram-palette.js',
  'js/diagrams/nft/nft-hydraulic-model.js',
  'js/hc-setup-wizard-pages.js',
  'js/hc-setup-wizard-nft-diagrams.js',
  'js/diagrams/nft/nft-scada-bridge.js',
]) {
  load(f);
}

const cfg = {
  tipoInstalacion: 'nft',
  nftDisposicion: 'escalera',
  nftEscaleraCaras: 2,
  nftEscaleraNivelesCara: 4,
  nftHuecosPorCanal: 8,
  nftNumCanales: 8,
  nftPendientePct: 2,
};
const hyd = ctx.getNftHidraulicaDesdeConfig(cfg);
const canales = 4;
const huecos = 8;

let err = null;
let svg = '';
try {
  svg = ctx.buildNftActiveDiagramSvg(canales, huecos, 2, 40, '', {
    nftDisposicion: 'escalera',
    cfgSnapshot: cfg,
    escaleraNiveles: hyd.escaleraNiveles,
    escaleraCaras: hyd.escaleraCaras,
  });
} catch (e) {
  err = e;
}

const out = path.join(root, 'scripts', '_test-esc2-out.svg');
if (svg) fs.writeFileSync(out, svg, 'utf8');

console.log('error', err ? err.stack : null);
console.log('len', svg.length);
console.log('dos-caras', svg.includes('nft-escalera--dos-caras'));
console.log('una-cara', svg.includes('nft-escalera--una-cara'));
const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
console.log('viewBox', vb ? vb[1] + ' x ' + vb[2] : 'missing');

const nums = [...svg.matchAll(/\b(x|x1|x2|cx)="(-?[\d.]+)"/g)].map((m) => parseFloat(m[2]));
if (nums.length) {
  const minX = Math.min(...nums);
  const maxX = Math.max(...nums);
  console.log('x range', minX, maxX, 'vbW', vb ? vb[1] : '?');
  if (vb && (minX < -5 || maxX > parseFloat(vb[1]) + 5)) {
    console.log('WARN: content outside viewBox width');
  }
}
console.log('written', out);
