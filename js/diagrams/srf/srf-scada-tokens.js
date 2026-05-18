/**
 * Paleta SCADA SRF (balsa flotante / estanque).
 */
(function (global) {
  'use strict';

  var SRF_SCADA = {
    bg0: '#e4e7eb',
    bg1: '#f5f6f8',
    panelBg: '#eceff1',
    panelBorder: '#b0bec5',
    ink: '#263238',
    inkSoft: '#607d8b',
    title: '#0f172a',
    water: '#0284c7',
    waterLight: '#7dd3fc',
    raft: '#e2e8f0',
    raftStroke: '#64748b',
    tank: '#475569',
    flow: '#16a34a',
    air: '#64748b',
  };

  if (typeof HC_DIAG !== 'undefined') {
    HC_DIAG.srfScada = Object.assign({}, HC_DIAG.dwc || {}, SRF_SCADA);
  } else {
    global.HC_DIAG = { srfScada: SRF_SCADA };
  }

  global.SRF_SCADA = SRF_SCADA;
})(typeof window !== 'undefined' ? window : globalThis);
