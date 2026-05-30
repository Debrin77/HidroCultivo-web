/**
 * Layout procedural DWC (sin coordenadas en JSON). Fase 1 SCADA.
 */
(function (global) {
  'use strict';

  function buildDwcScadaLayout(cfg, opts) {
    opts = opts || {};
    const c = cfg || {};
    const esMulticubo =
      typeof dwcGetOxigenacionDiseno === 'function' && dwcGetOxigenacionDiseno(c) === 'cubos_independientes';
    const forma =
      typeof dwcNormalizeDepositoForma === 'function'
        ? dwcNormalizeDepositoForma(c.dwcDepositoForma)
        : c.dwcDepositoForma || 'prismatico';
    const esCilindrico = !esMulticubo && forma === 'cilindrico';
    const N = Math.max(1, Math.min(12, c.numNiveles || (typeof NUM_NIVELES !== 'undefined' ? NUM_NIVELES : 4)));
    const C = Math.max(1, Math.min(12, c.numCestas || (typeof NUM_CESTAS !== 'undefined' ? NUM_CESTAS : 4)));
    const nDraw = esCilindrico ? 1 : N;
    const cDraw = esCilindrico ? 1 : C;
    const S_mc = esMulticubo
      ? typeof dwcGetNumCubosIndependientes === 'function'
        ? Math.max(1, dwcGetNumCubosIndependientes(c))
        : Math.max(1, N * C)
      : 0;

    let mcCols = 1;
    let mcRows = 1;
    let mcCubeSz = 56;
    let mcGapPlan = 16;
    let mcGapFront = 14;
    if (esMulticubo) {
      const mcGrid =
        typeof hcDistribuirCubosMultivalvula === 'function'
          ? hcDistribuirCubosMultivalvula(S_mc)
          : typeof hcDistribuirFilasColumnas === 'function'
            ? (() => {
                const g = hcDistribuirFilasColumnas(S_mc, 6);
                return { rows: g.rows, cols: g.cols, colsPerRow: [g.cols] };
              })()
            : { cols: S_mc <= 6 ? S_mc : 6, rows: S_mc <= 6 ? 1 : 2, colsPerRow: [Math.ceil(S_mc / 2), Math.floor(S_mc / 2)] };
      mcCols = mcGrid.cols;
      mcRows = mcGrid.rows;
      mcCubeSz = S_mc <= 4 ? 78 : S_mc <= 6 ? 70 : 58;
      mcGapPlan = S_mc <= 4 ? 20 : 14;
      mcGapFront = S_mc <= 4 ? 18 : 12;
    }

    const planPad = esMulticubo ? 12 : 10;
    const dep =
      typeof dwcSvgDepDimsDesdeCfg === 'function' ? dwcSvgDepDimsDesdeCfg(c) : { L: null, W: null, P: null };
    let cilAspect = null;
    if (esCilindrico) {
      let diamCm = null;
      if (dep.L != null && dep.W != null) diamCm = (dep.L + dep.W) / 2;
      else {
        const L = Number(c.dwcDepositoLargoCm);
        const W = Number(c.dwcDepositoAnchoCm);
        if (Number.isFinite(L) && Number.isFinite(W) && L > 0 && W > 0) diamCm = (L + W) / 2;
        else if (Number.isFinite(L) && L > 0) diamCm = L;
        else if (Number.isFinite(W) && W > 0) diamCm = W;
      }
      if (diamCm == null || diamCm < 5) diamCm = 40;
      let profCm = dep.P != null ? dep.P : Number(c.dwcDepositoProfCm);
      if (!Number.isFinite(profCm) || profCm < 5) profCm = diamCm * 1.35;
      cilAspect = { diamCm, profCm, aspectH: Math.max(1.22, Math.min(2.1, profCm / diamCm)) };
    }

    const blockW = esMulticubo
      ? mcCols * mcCubeSz + Math.max(0, mcCols - 1) * mcGapPlan + planPad * 2
      : esCilindrico && cilAspect
        ? Math.min(280, Math.max(200, Math.round(170 + cilAspect.diamCm * 0.85)))
        : Math.min(320, Math.max(228, 28 + cDraw * 30));

    const W = esMulticubo ? Math.min(620, Math.max(480, 72 + mcCols * (mcCubeSz + mcGapPlan))) : 460;
    const H = esMulticubo ? 760 : esCilindrico ? 620 : 548;
    const planLeft = (W - blockW) / 2;
    const planW = blockW;
    const planTop = esMulticubo ? 44 : 54;
    const mcPlanFloorH = esMulticubo ? 58 : 0;
    const planH = esMulticubo
      ? mcRows * mcCubeSz + Math.max(0, mcRows - 1) * mcGapPlan + planPad * 2 + mcPlanFloorH
      : esCilindrico
        ? planW
        : Math.min(200, 28 + nDraw * 30);
    const planInnerX = planLeft + planPad;
    const planInnerY = planTop + planPad;
    const planInnerW = planW - planPad * 2;
    const planInnerH = planH - planPad * 2;
    const planBottom = planTop + planH;
    const tankStartY = planBottom + 48;
    const tankW = blockW;
    let tankH = 108;
    if (esCilindrico && cilAspect) {
      tankH = Math.round(Math.max(142, Math.min(215, tankW * cilAspect.aspectH)));
    }

    return {
      cfg: c,
      esMulticubo: esMulticubo,
      esCilindrico: esCilindrico,
      forma: forma,
      nDraw: nDraw,
      cDraw: cDraw,
      S_mc: S_mc,
      mcCols: mcCols,
      mcRows: mcRows,
      mcCubeSz: mcCubeSz,
      mcGapPlan: mcGapPlan,
      mcGapFront: mcGapFront,
      planPad: planPad,
      dep: dep,
      cilAspect: cilAspect,
      W: W,
      H: H,
      blockW: blockW,
      planLeft: planLeft,
      planW: planW,
      planTop: planTop,
      planH: planH,
      planInnerX: planInnerX,
      planInnerY: planInnerY,
      planInnerW: planInnerW,
      planInnerH: planInnerH,
      planBottom: planBottom,
      tankStartY: tankStartY,
      tankW: tankW,
      tankH: tankH,
      tankX: planLeft,
      cellW: esMulticubo ? mcCubeSz : planInnerW / cDraw,
      cellH: esMulticubo ? mcCubeSz : planInnerH / nDraw,
    };
  }

  global.buildDwcScadaLayout = buildDwcScadaLayout;
})(typeof window !== 'undefined' ? window : globalThis);
