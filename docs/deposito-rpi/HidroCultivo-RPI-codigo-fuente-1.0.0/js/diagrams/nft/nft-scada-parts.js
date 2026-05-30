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

  /** Sin leyenda explicativa en el SVG (solo volumen y vista en el diagrama). */
  function legendStrip(w, opts) {
    return '';
  }

  global.nftScadaParts = {
    tokens: tokens,
    scadaDefs: scadaDefs,
    bgRect: bgRect,
    legendStrip: legendStrip,
  };
})(typeof window !== 'undefined' ? window : globalThis);
