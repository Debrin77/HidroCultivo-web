/**
 * Envuelve los SVG NFT existentes con capa SCADA (clase, fondo, leyenda).
 * Cargar tras hc-setup-wizard-pages.js (buildNftActiveDiagramSvg).
 */
(function (global) {
  'use strict';

  const NP = typeof nftScadaParts !== 'undefined' ? nftScadaParts : null;

  function parseViewBoxFromSvg(svg) {
    const m = String(svg).match(/viewBox=["']([^"']+)["']/i);
    if (!m) return null;
    const p = m[1].trim().split(/[\s,]+/).map(Number);
    if (p.length < 4 || p.some((n) => !Number.isFinite(n))) return null;
    return { w: p[2], h: p[3] };
  }

  function enhanceNftDiagramScada(svgHtml, opts) {
    opts = opts || {};
    if (!svgHtml || typeof svgHtml !== 'string' || svgHtml.indexOf('<svg') < 0) return svgHtml;

    let s = svgHtml;
    if (s.indexOf('nft-svg-diagram--scada') < 0) {
      s = s.replace(/<svg([^>]*)\sclass="/i, '<svg$1 class="nft-svg-diagram--scada ');
      if (s.indexOf('nft-svg-diagram--scada') < 0) {
        s = s.replace(/<svg/i, '<svg class="nft-svg-diagram--scada"');
      }
    }

    const vb = parseViewBoxFromSvg(s);
    const W = vb ? vb.w : 500;
    const H = vb ? vb.h : 400;
    const suf = '_sc' + String(Math.abs(W | 0) % 997);

    if (NP && s.indexOf('nftScadaBg' + suf) < 0) {
      const injDefs = '<defs>' + NP.scadaDefs(suf) + '</defs>';
      if (/<defs[\s>]/i.test(s)) {
        s = s.replace(/<defs([^>]*)>/i, '<defs$1>' + NP.scadaDefs(suf));
      } else {
        s = s.replace(/<svg([^>]*)>/i, '<svg$1>' + injDefs);
      }
      const bg = NP.bgRect(W, H, suf);
      const legend = '';
      if (/<\/defs>/i.test(s)) {
        s = s.replace(/<\/defs>/i, '</defs>' + bg + legend);
      } else {
        s = s.replace(/<svg([^>]*)>/i, '<svg$1>' + bg + legend);
      }
    }

    return s;
  }

  function wrapBuildNftActiveDiagramSvg() {
    if (global._nftScadaBridgeWrapped) return;
    const orig = global.buildNftActiveDiagramSvg;
    if (typeof orig !== 'function') return;
    global.buildNftActiveDiagramSvg = function (canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
      const EO = equipOpts || {};
      const svg = orig.call(this, canales, huecos, pendPct, volL, svgIdSuffix, EO);
      if (EO.cartoonMedir === true) return svg;
      return enhanceNftDiagramScada(svg, { interactive: EO.interactive === true });
    };
    global._nftScadaBridgeWrapped = true;
  }

  wrapBuildNftActiveDiagramSvg();
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wrapBuildNftActiveDiagramSvg);
  }

  global.enhanceNftDiagramScada = enhanceNftDiagramScada;
  global.wrapBuildNftActiveDiagramSvg = wrapBuildNftActiveDiagramSvg;
})(typeof window !== 'undefined' ? window : globalThis);
