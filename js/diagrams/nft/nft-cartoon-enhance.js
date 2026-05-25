/**
 * Capa visual "cartoon" sobre el SVG técnico NFT (misma geometría y flujo).
 * Usar en Medir; Cultivo e instalación sigue con el esquema SCADA estándar.
 */
(function (global) {
  'use strict';

  function parseViewBox(svgHtml) {
    const m = String(svgHtml).match(/viewBox=["']([^"']+)["']/i);
    if (!m) return null;
    const p = m[1].trim().split(/[\s,]+/).map(Number);
    if (p.length < 4 || p.some((n) => !Number.isFinite(n))) return null;
    return { x: p[0], y: p[1], w: p[2], h: p[3] };
  }

  function tagGhostFlowPaths(s) {
    return s.replace(
      /<path d="([^"]*)" stroke="(#[0-9a-fA-F]{3,8})" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0\.45" stroke-width="5"\/>/g,
      '<path class="nft-flow-ghost" d="$1" stroke="$2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.45" stroke-width="5"/>'
    );
  }

  function stripFlowAnimations(s) {
    return s.replace(/<animate attributeName="stroke-dashoffset"[^/]*\/>\s*/g, '');
  }

  function injectCartoonDefs(s, suf, vb) {
    const W = vb ? vb.w : 520;
    const H = vb ? vb.h : 400;
    const gid = 'nftToon' + suf;
    const defs =
      '<filter id="' +
      gid +
      'Sh" x="-6%" y="-6%" width="112%" height="112%">' +
      '<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.14"/></filter>' +
      '<linearGradient id="' +
      gid +
      'Room" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#f0fdf4"/>' +
      '<stop offset="45%" stop-color="#f8fafc"/>' +
      '<stop offset="100%" stop-color="#ecfdf5"/></linearGradient>';
    if (/<defs[\s>]/i.test(s)) {
      return s.replace(/<defs([^>]*)>/i, '<defs$1>' + defs);
    }
    return s.replace(/<svg([^>]*)>/i, '<svg$1><defs>' + defs + '</defs>');
  }

  function injectRoomBackdrop(s, suf, vb) {
    if (!vb || s.indexOf('nft-cartoon-room') >= 0) return s;
    const gid = 'nftToon' + suf;
    const room =
      '<rect class="nft-cartoon-room" x="' +
      vb.x +
      '" y="' +
      vb.y +
      '" width="' +
      vb.w +
      '" height="' +
      vb.h +
      '" fill="url(#' +
      gid +
      'Room)" pointer-events="none"/>';
    if (/<\/defs>/i.test(s)) {
      return s.replace(/<\/defs>/i, '</defs>' + room);
    }
    return s.replace(/<svg([^>]*)>/i, '<svg$1>' + room);
  }

  /**
   * @param {string} svgHtml
   * @param {{ medir?: boolean }} [opts]
   */
  function enhanceNftDiagramCartoon(svgHtml, opts) {
    opts = opts || {};
    if (!svgHtml || typeof svgHtml !== 'string' || svgHtml.indexOf('<svg') < 0) return svgHtml;

    let s = svgHtml;
    const vb = parseViewBox(s);
    const suf = '_t' + String(Math.abs((vb ? vb.w * 7 + vb.h : 520) | 0) % 997);

    if (s.indexOf('nft-svg-diagram--cartoon') < 0) {
      if (/\sclass="/i.test(s)) {
        s = s.replace(/<svg([^>]*)\sclass="/i, '<svg$1 class="nft-svg-diagram--cartoon hc-illo-diagram ');
      } else {
        s = s.replace(/<svg/i, '<svg class="nft-svg-diagram--cartoon hc-illo-diagram"');
      }
    }

    s = stripFlowAnimations(s);
    s = tagGhostFlowPaths(s);
    s = injectCartoonDefs(s, suf, vb);
    s = injectRoomBackdrop(s, suf, vb);

    s = s.replace(/class="nft-flow-supply"/g, 'class="nft-flow-supply nft-flow-supply--cartoon"');
    s = s.replace(/class="nft-flow-return"/g, 'class="nft-flow-return nft-flow-return--cartoon"');

    return s;
  }

  global.enhanceNftDiagramCartoon = enhanceNftDiagramCartoon;
})(typeof window !== 'undefined' ? window : globalThis);
