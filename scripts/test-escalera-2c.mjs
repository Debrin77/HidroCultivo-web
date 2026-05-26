/**
 * Smoke test: escalera NFT 2 caras genera SVG sin lanzar error.
 */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

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

const chain = [
  'js/hc-diagram-palette.js',
  'js/diagrams/nft/nft-hydraulic-model.js',
  'js/hc-setup-wizard-pages.js',
  'js/hc-setup-wizard-nft-diagrams.js',
];

for (const f of chain) {
  try {
    load(f);
  } catch (e) {
    console.error('LOAD FAIL', f, e.message);
    process.exit(1);
  }
}

function nftEscaleraCarasNormalizada(v) {
  const n = parseInt(String(v), 10);
  return n === 2 ? 2 : 1;
}
ctx.nftEscaleraCarasNormalizada = nftEscaleraCarasNormalizada;

const cases = [
  { nv: 4, caras: 2, huecos: 8, label: 'num caras' },
  { nv: 4, caras: '2', huecos: 8, label: 'str caras' },
  { nv: 3, caras: 2, huecos: 30, label: 'max huecos' },
  { nv: 1, caras: 2, huecos: 2, label: 'min nv' },
];

let failed = 0;
for (const c of cases) {
  try {
    const svg = ctx.buildNftEscaleraDiagramSvg(c.nv, c.caras, c.huecos, 2, 40, 't', {});
    const ok =
      typeof svg === 'string' &&
      svg.includes('nft-escalera--dos-caras') &&
      svg.includes('viewBox="0 0') &&
      svg.length > 500;
    const vb = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    console.log(
      c.label,
      ok ? 'OK' : 'BAD',
      'len',
      svg.length,
      'vb',
      vb ? vb[1] + 'x' + vb[2] : '?',
      'class2c',
      svg.includes('dos-caras')
    );
    if (!ok) failed++;
  } catch (e) {
    console.log(c.label, 'THROW', e.message);
    failed++;
  }
}

process.exit(failed ? 1 : 0);
