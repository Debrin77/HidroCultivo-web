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
    panelPlanBg: '#ecfdf5',
    panelPlanBorder: '#34d399',
    panelTankBg: '#f0f9ff',
    panelTankBorder: '#38bdf8',
    ink: '#263238',
    inkSoft: '#607d8b',
    title: '#0f172a',
    water: '#0284c7',
    waterLight: '#7dd3fc',
    waterSurface: '#38bdf8',
    raft: '#e2e8f0',
    raftStroke: '#0d9488',
    raftFrontStroke: '#0284c7',
    tank: '#475569',
    tankRim: '#0f172a',
    tankInner: '#f1f5f9',
    potEmptyFill: '#e0f2fe',
    potEmptyStroke: '#38bdf8',
    holeGuide: '#7dd3fc',
    stoneFill: '#5eead4',
    stoneStroke: '#0f766e',
    bubble: '#bae6fd',
    airHose: '#4ade80',
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
