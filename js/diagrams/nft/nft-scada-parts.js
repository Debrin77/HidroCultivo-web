/**
 * Piezas SCADA para envoltorio NFT (leyenda, fondo, defs).
 */
(function (global) {
  'use strict';

  function tokens() {
    if (typeof HC_DIAG !== 'undefined' && HC_DIAG.nftScada) return HC_DIAG.nftScada;
    return global.NFT_SCADA || {};
  }

  function scadaDefs(suf) {
    suf = suf || '';
    const T = tokens();
    return (
      '<linearGradient id="nftScadaBg' +
      suf +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      T.bg1 +
      '"/><stop offset="100%" stop-color="' +
      T.bg0 +
      '"/></linearGradient>'
    );
  }

  function bgRect(w, h, suf) {
    return (
      '<rect class="nft-scada-bg" width="' +
      w +
      '" height="' +
      h +
      '" fill="url(#nftScadaBg' +
      (suf || '') +
      ')" pointer-events="none"/>'
    );
  }

  /** Franja superior con leyenda de flujo (vista cultivo). */
  function legendStrip(w, opts) {
    opts = opts || {};
    const T = tokens();
    const y = opts.y != null ? opts.y : 8;
    const h = opts.h != null ? opts.h : 22;
    const sub = opts.subtitle || 'Línea azul discontinua = sentido del agua · Toca un hueco para la ficha';
    const cx = w / 2;
    return (
      '<g class="nft-scada-legend" pointer-events="none" aria-hidden="true">' +
      '<rect x="8" y="' +
      y +
      '" width="' +
      (w - 16) +
      '" height="' +
      h +
      '" rx="8" fill="' +
      T.panelBg +
      '" stroke="' +
      T.panelBorder +
      '" stroke-width="1" opacity="0.94"/>' +
      '<circle cx="24" cy="' +
      (y + h / 2) +
      '" r="4" fill="' +
      T.legendSupply +
      '"/>' +
      '<text x="34" y="' +
      (y + h / 2 + 3.5) +
      '" font-size="8" font-weight="700" fill="' +
      T.ink +
      '">Flujo nutriente</text>' +
      '<line x1="' +
      (w / 2 - 40) +
      '" y1="' +
      (y + h / 2) +
      '" x2="' +
      (w / 2 + 40) +
      '" y2="' +
      (y + h / 2) +
      '" stroke="' +
      T.flow +
      '" stroke-width="2" stroke-dasharray="6 4" opacity="0.85"/>' +
      '<text x="' +
      cx +
      '" y="' +
      (y + h + 12) +
      '" text-anchor="middle" font-size="8" fill="' +
      T.inkSoft +
      '">' +
      sub +
      '</text>' +
      '</g>'
    );
  }

  global.nftScadaParts = {
    tokens: tokens,
    scadaDefs: scadaDefs,
    bgRect: bgRect,
    legendStrip: legendStrip,
  };
})(typeof window !== 'undefined' ? window : globalThis);
