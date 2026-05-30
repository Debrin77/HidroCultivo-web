/**
 * Paleta SCADA RDWC — impulsión verde, retorno azul (estilo manual técnico).
 */
(function (global) {
  'use strict';

  var RDWC_SCADA = {
    panelBg: '#eceff1',
    panelBorder: '#b0bec5',
    panelInner: '#fafafa',
    bg0: '#e8eaed',
    bg1: '#f5f6f8',
    ink: '#263238',
    inkSoft: '#607d8b',
    title: '#1e293b',
    supply: '#16a34a',
    supplyFlow: '#22c55e',
    supplyGhost: '#86efac',
    return: '#2563eb',
    returnFlow: '#3b82f6',
    returnGhost: '#93c5fd',
    pump: '#ff9800',
    pumpDark: '#e65100',
    tank: '#546e7a',
    tankFace: '#78909c',
    water: '#29b6f6',
    waterDeep: '#1565c0',
    module: '#cfd8dc',
    plant: '#43a047',
    callout: '#37474f',
    calloutLine: '#90a4ae',
    sep: '#b0bec5',
  };

  if (typeof HC_DIAG !== 'undefined') {
    HC_DIAG.rdwcScada = Object.assign({}, HC_DIAG.rdwc || {}, RDWC_SCADA);
  }

  global.RDWC_SCADA = RDWC_SCADA;
})(typeof window !== 'undefined' ? window : globalThis);
