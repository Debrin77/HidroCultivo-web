/**
 * Paleta SCADA torre vertical.
 */
(function (global) {
  'use strict';

  var TORRE_SCADA = {
    bg0: '#e4e7eb',
    bg1: '#f5f6f8',
    ink: '#37474f',
    inkSoft: '#607d8b',
    eje: '#22c55e',
    flow: '#0ea5e9',
  };

  if (typeof HC_DIAG !== 'undefined') {
    HC_DIAG.torreScada = Object.assign({}, HC_DIAG.torre || {}, TORRE_SCADA);
  } else {
    global.HC_DIAG = { torreScada: TORRE_SCADA };
  }

  global.TORRE_SCADA = TORRE_SCADA;
})(typeof window !== 'undefined' ? window : globalThis);
