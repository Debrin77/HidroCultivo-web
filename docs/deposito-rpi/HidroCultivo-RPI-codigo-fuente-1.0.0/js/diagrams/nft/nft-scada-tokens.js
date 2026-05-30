/**
 * Paleta SCADA NFT (manual técnico: flujo azul, tubos grises, depósito verde).
 * Cargar tras hc-diagram-palette.js.
 */
(function (global) {
  'use strict';

  var NFT_SCADA = {
    bg0: '#e8eaed',
    bg1: '#f4f6f8',
    panelBg: '#eceff1',
    panelBorder: '#b0bec5',
    ink: '#263238',
    inkSoft: '#607d8b',
    title: '#14532d',
    flow: '#1976d2',
    flowGhost: '#90caf9',
    pipe: '#78909c',
    canal: '#0369a1',
    tank: '#166534',
    legendSupply: '#1d4ed8',
    legendReturn: '#0369a1',
    callout: '#455a64',
    calloutLine: '#90a4ae',
  };

  if (typeof HC_DIAG !== 'undefined') {
    HC_DIAG.nftScada = Object.assign({}, HC_DIAG.nft || {}, NFT_SCADA);
  } else {
    global.HC_DIAG = { nftScada: NFT_SCADA };
  }

  global.NFT_SCADA = NFT_SCADA;
})(typeof window !== 'undefined' ? window : globalThis);
