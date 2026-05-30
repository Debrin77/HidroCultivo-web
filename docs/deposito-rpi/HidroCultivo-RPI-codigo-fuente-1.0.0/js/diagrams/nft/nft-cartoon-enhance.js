/**
 * Capa visual "cartoon" sobre el SVG técnico NFT (misma geometría y flujo).
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

  function stripScadaLayer(s) {
    s = s.replace(/\bnft-svg-diagram--scada\b/g, '');
    s = s.replace(/<rect class="nft-scada-bg"[^/]*\/>/gi, '');
    return s;
  }

  function tagGhostFlowPaths(s) {
    return s.replace(
      /<path d="([^"]*)" stroke="(#[0-9a-fA-F]{3,8})" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0\.45" stroke-width="5"\/>/g,
      '<path class="nft-flow-ghost" d="$1" stroke="$2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.45" stroke-width="5"/>'
    );
  }

  /** Colores y grosor cartoon; mantiene dasharray para la animación del flujo. */
  function stylizeFlowPaths(s) {
    s = s.replace(/(<path class="nft-flow-supply[^"]*"[^>]*?)stroke-width="[^"]*"/gi, '$1stroke-width="5.5"');
    s = s.replace(/(<path class="nft-flow-return[^"]*"[^>]*?)stroke-width="[^"]*"/gi, '$1stroke-width="5.5"');
    s = s.replace(/(<path class="nft-flow-supply[^"]*"[^>]*?)stroke="#2563eb"/gi, '$1stroke="#0ea5e9"');
    s = s.replace(/(<path class="nft-flow-return[^"]*"[^>]*?)stroke="#16a34a"/gi, '$1stroke="#22c55e"');
    return s;
  }

  function injectCartoonDefs(s, suf, vb) {
    const gid = 'nftToon' + suf;
    const defs =
      '<linearGradient id="' +
      gid +
      'Room" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ecfdf5"/>' +
      '<stop offset="50%" stop-color="#f0f9ff"/>' +
      '<stop offset="100%" stop-color="#fefce8"/></linearGradient>' +
    if (/<defs[\s>]/i.test(s)) {
      return s.replace(/<defs([^>]*)>/i, '<defs$1>' + defs);
    }
    return s.replace(/<svg([^>]*)>/i, '<svg$1><defs>' + defs + '</defs>');
  }

  function injectCartoonStyleBlock(s) {
    if (s.indexOf('nft-cartoon-css') >= 0) return s;
    const css =
      '<style type="text/css" class="nft-cartoon-css">' +
      '.nft-svg-diagram--cartoon .nft-scada-bg{display:none}' +
      '.nft-svg-diagram--cartoon .nft-flow-ghost{display:none}' +
      '.nft-svg-diagram--cartoon .nft-flow-supply,.nft-svg-diagram--cartoon .nft-flow-supply--cartoon{stroke:#0ea5e9!important;stroke-width:5.5px!important;opacity:1!important}' +
      '.nft-svg-diagram--cartoon .nft-flow-return,.nft-svg-diagram--cartoon .nft-flow-return--cartoon{stroke:#22c55e!important;stroke-width:5.5px!important;opacity:1!important}' +
      '.nft-svg-diagram--cartoon .nft-flow-legend text{fill:#0f766e!important;font-weight:800!important}' +
      '.nft-svg-diagram--cartoon .hc-diagram-view-label text{fill:#64748b!important;font-size:10px!important}' +
      '</style>';
    if (/<\/defs>/i.test(s)) {
      return s.replace(/<\/defs>/i, '</defs>' + css);
    }
    return s.replace(/<svg([^>]*)>/i, '<svg$1>' + css);
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

  function injectFrameAndBadge(s, vb) {
    if (!vb) return s;
    const pad = 10;
    const frame =
      '<rect class="nft-cartoon-frame" x="' +
      (vb.x + pad) +
      '" y="' +
      (vb.y + pad) +
      '" width="' +
      (vb.w - pad * 2) +
      '" height="' +
      (vb.h - pad * 2) +
      '" rx="16" fill="none" stroke="#4ade80" stroke-width="4" opacity="0.85" pointer-events="none"/>';
    const badge =
      '<g class="nft-cartoon-badge" pointer-events="none">' +
      '<rect x="' +
      (vb.x + vb.w - 168) +
      '" y="' +
      (vb.y + 14) +
      '" width="154" height="26" rx="13" fill="#166534" opacity="0.92"/>' +
      '<text x="' +
      (vb.x + vb.w - 91) +
      '" y="' +
      (vb.y + 31) +
      '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#ecfdf5">Vista cartoon · Medir</text>' +
      '</g>';
    return s.replace(/<\/svg>\s*$/i, frame + badge + '</svg>');
  }

  /**
   * @param {string} svgHtml
   * @param {{ medir?: boolean, disp?: string, paredIllo?: boolean }} [opts]
   */
  function enhanceNftDiagramCartoon(svgHtml, opts) {
    opts = opts || {};
    if (!svgHtml || typeof svgHtml !== 'string' || svgHtml.indexOf('<svg') < 0) return svgHtml;

    let s = svgHtml;
    const vb = parseViewBox(s);
    const suf = '_t' + String(Math.abs((vb ? vb.w * 7 + vb.h : 520) | 0) % 997);

    if (/\sclass="/i.test(s)) {
      s = s.replace(/<svg([^>]*)\sclass="/i, '<svg$1 class="nft-svg-diagram--cartoon hc-illo-diagram ');
    } else {
      s = s.replace(/<svg/i, '<svg class="nft-svg-diagram--cartoon hc-illo-diagram"');
    }

    if (!opts.paredIllo) {
      s = stripScadaLayer(s);
      s = tagGhostFlowPaths(s);
      s = stylizeFlowPaths(s);
      s = s.replace(/class="nft-flow-supply"/g, 'class="nft-flow-supply nft-flow-supply--cartoon"');
      s = s.replace(/class="nft-flow-return"/g, 'class="nft-flow-return nft-flow-return--cartoon"');
    }

    s = injectCartoonDefs(s, suf, vb);
    s = injectCartoonStyleBlock(s);
    s = injectRoomBackdrop(s, suf, vb);
    s = injectFrameAndBadge(s, vb);

    return s;
  }

  global.enhanceNftDiagramCartoon = enhanceNftDiagramCartoon;
})(typeof window !== 'undefined' ? window : globalThis);
