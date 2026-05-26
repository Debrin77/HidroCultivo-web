/**
 * Regresión: escalera 2 caras → 8 tubos, clase dos-caras, data-caras=2.
 */
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

let fail = 0;

const svgDirect = ctx.buildNftEscaleraDiagramSvg(4, 2, 8, 2, 40, 't', { cfgSnapshot: {} });
if (!svgDirect.includes('nft-escalera--dos-caras') || svgDirect.includes('nft-escalera--una-cara')) {
  console.error('FAIL buildNftEscaleraDiagramSvg(4, 2) sin UI');
  fail++;
} else {
  console.log('OK escalera directa 2 caras');
}

const cfg = {
  nftDisposicion: 'escalera',
  nftEscaleraCaras: 2,
  nftEscaleraNivelesCara: 4,
  nftHuecosPorCanal: 8,
};
const svgActive = ctx.buildNftActiveDiagramSvg(4, 8, 2, 40, '', {
  nftDisposicion: 'escalera',
  cfgSnapshot: cfg,
  escaleraNiveles: 4,
  escaleraCaras: 2,
});
if (!svgActive.includes('data-nft-esc-caras="2"') && !svgActive.includes("data-nft-esc-caras='2'")) {
  const m = svgActive.match(/data-nft-esc-caras="(\d)"/);
  console.error('FAIL active diagram caras=', m ? m[1] : '?');
  fail++;
} else {
  console.log('OK buildNftActiveDiagramSvg 2 caras');
}

const chCount = (svgDirect.match(/fill="url\(#nftEscCh[^"]*\)"/g) || []).length;
if (chCount !== 8) {
  console.error('FAIL tube count', chCount, 'expected 8');
  fail++;
} else {
  console.log('OK 8 channel rects');
}

if (!svgDirect.includes('Cara izquierda') || !svgDirect.includes('Cara derecha')) {
  console.error('FAIL face labels');
  fail++;
} else {
  console.log('OK face labels');
}

process.exit(fail ? 1 : 0);
