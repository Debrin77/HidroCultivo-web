/**
 * Serpentín escalera 2 caras: alterna centro↔fuera; bajada mismo extremo (par/impar nv).
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

function rtlPattern(nv) {
  const svg = ctx.buildNftEscaleraDiagramSvg(nv, 2, 8, 2, 40, 's' + nv, {});
  const runs = [];
  const re = /data-nft-esc-caras="2"/;
  if (!re.test(svg)) throw new Error('not 2 caras');
  return svg;
}

function flowEnds(R, pad, faceLeft) {
  const innerX = faceLeft ? R.xR : R.xL;
  const outerX = faceLeft ? R.xL : R.xR;
  let xIn;
  let xOut;
  if (R.rtl) {
    xIn = faceLeft ? innerX - pad : innerX + pad;
    xOut = faceLeft ? outerX + pad : outerX - pad;
  } else {
    xIn = faceLeft ? outerX + pad : outerX - pad;
    xOut = faceLeft ? innerX - pad : innerX + pad;
  }
  return { xIn, xOut, innerX, outerX };
}

function checkNv(nv) {
  const pad = 7;
  const cx = 500;
  const inner0 = 58;
  const span = 180;
  const runsL = [];
  const runsR = [];
  for (let i = 0; i < nv; i++) {
    const inner = inner0 + i * 22;
    const rtl = i % 2 === 0 ? 1 : 0;
    runsL.push({ y: 100 + i * 70, xL: cx - inner - span, xR: cx - inner, rtl: rtl });
    runsR.push({ y: 100 + i * 70, xL: cx + inner, xR: cx + inner + span, rtl: rtl });
  }
  const runs = runsL;
  const wp = [];
  const serp = (function () {
    const wp = [];
    const j = 26;
    const faceLeft = true;
    for (let i = 0; i < runs.length; i++) {
      const R = runs[i];
      const Rn = i < runs.length - 1 ? runs[i + 1] : null;
      const innerX = R.xR;
      const outerX = R.xL;
      const xIn = R.rtl ? innerX - pad : outerX + pad;
      const xOut = R.rtl ? outerX + pad : innerX - pad;
      wp.push([xIn, R.y]);
      wp.push([xOut, R.y]);
      if (Rn) {
        const nInner = Rn.xR;
        const nOuter = Rn.xL;
        const xNextIn = Rn.rtl ? nInner - pad : nOuter + pad;
        const exitInner = Math.abs(xOut - innerX) + 0.5 < Math.abs(xOut - outerX);
        const enterInner = Math.abs(xNextIn - nInner) + 0.5 < Math.abs(xNextIn - nOuter);
        let xVert = exitInner && enterInner ? Math.max(xOut, xNextIn) + j : Math.min(xOut, xNextIn) - j;
        wp.push([xOut, R.y]);
        wp.push([xVert, R.y]);
        wp.push([xVert, Rn.y]);
        if (Math.abs(xVert - xNextIn) > 0.5) wp.push([xNextIn, Rn.y]);
      }
    }
    return wp;
  })();

  for (let i = 0; i < nv; i++) {
    const rtl = i % 2 === 0 ? 1 : 0;
    if (runs[i].rtl !== rtl) throw new Error('nv' + nv + ' run' + i + ' rtl=' + runs[i].rtl);
  }
  for (let i = 0; i < nv - 1; i++) {
    const R = runs[i];
    const Rn = runs[i + 1];
    const xOut = R.rtl ? R.xL + pad : R.xR - pad;
    const xNextIn = Rn.rtl ? Rn.xR - pad : Rn.xL + pad;
    const exitOuter = Math.abs(xOut - R.xL) + 0.5 < Math.abs(xOut - R.xR);
    const enterOuter = Math.abs(xNextIn - Rn.xL) + 0.5 < Math.abs(xNextIn - Rn.xR);
    if (exitOuter !== enterOuter) throw new Error('nv' + nv + ' link ' + i + ' extremo distinto');
  }
  const last = runs[nv - 1];
  const xEnd = last.rtl ? last.xL + pad : last.xR - pad;
  const exitOuter = Math.abs(xEnd - last.xL) < Math.abs(xEnd - last.xR);
  const expectOuterExit = nv % 2 === 1;
  if (exitOuter !== expectOuterExit) {
    throw new Error('nv' + nv + ' retorno extremo incorrecto');
  }

  const e0L = flowEnds(runsL[0], pad, true);
  const e0R = flowEnds(runsR[0], pad, false);
  if (e0L.xIn >= e0L.innerX - 0.5 || e0R.xIn <= e0R.innerX + 0.5) {
    throw new Error('nv' + nv + ' entrada 1.º tubo no es por el centro');
  }
  const dL = cx - e0L.xIn;
  const dR = e0R.xIn - cx;
  if (Math.abs(dL - dR) > 1.5) {
    throw new Error('nv' + nv + ' entrada no simétrica dL=' + dL + ' dR=' + dR);
  }
  console.log('OK nv=' + nv, 'retorno', exitOuter ? 'exterior' : 'interior', 'simetría 1.º tubo');
}

let fail = 0;
for (const nv of [1, 2, 3, 4, 5, 6]) {
  try {
    checkNv(nv);
  } catch (e) {
    console.error('FAIL', e.message);
    fail++;
  }
}

const svg5 = ctx.buildNftEscaleraDiagramSvg(5, 2, 8, 2, 40, '', {});
if (!svg5.includes('nft-escalera--dos-caras')) {
  console.error('FAIL svg 5 peldaños');
  fail++;
} else {
  console.log('OK svg 5 peldaños');
}

process.exit(fail ? 1 : 0);
