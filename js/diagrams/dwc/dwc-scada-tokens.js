/**
 * Paleta SCADA didáctica DWC (estilo manual técnico / referencia NFT clara).
 * Cargar tras hc-diagram-palette.js.
 */
(function (global) {
  'use strict';

  var DWC_SCADA = {
    panelBg: '#eceff1',
    panelBorder: '#b0bec5',
    panelInner: '#fafafa',
    bg0: '#e4e7eb',
    bg1: '#f5f6f8',
    ink: '#37474f',
    inkSoft: '#607d8b',
    title: '#263238',
    flow: '#1976d2',
    flowGhost: '#90caf9',
    pipe: '#78909c',
    pipeHi: '#eceff1',
    pump: '#ff9800',
    pumpDark: '#e65100',
    tank: '#546e7a',
    tankFace: '#78909c',
    water: '#29b6f6',
    waterDeep: '#0277bd',
    lid: '#cfd8dc',
    plant: '#43a047',
    callout: '#455a64',
    calloutLine: '#90a4ae',
    sep: '#b0bec5',
  };

  if (typeof HC_DIAG !== 'undefined') {
    HC_DIAG.dwcScada = Object.assign({}, HC_DIAG.dwc || {}, DWC_SCADA);
  } else {
    global.HC_DIAG = { dwcScada: DWC_SCADA };
  }

  global.DWC_SCADA = DWC_SCADA;
})(typeof window !== 'undefined' ? window : globalThis);
