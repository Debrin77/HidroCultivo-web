/**
 * Vista cenital RDWC — montaje tipo manual (2+ filas):
 * depósito arriba, cubos redondos, impulsión rosa abajo, retorno naranja en L,
 * uniones grises entre cubos, bomba de aire sobre el depósito.
 */
(function (global) {
  'use strict';

  const RP = typeof rdwcScadaParts !== 'undefined' ? rdwcScadaParts : null;
  const C_SUPPLY = '#db2777';
  const C_RETURN = '#ea580c';
  const C_LINK = '#94a3b8';

  function f1(n) {
    return Number(n).toFixed(1);
  }

  function rdwcPlanDistribuir(sites, rows) {
    const s = Math.max(2, Math.min(64, parseInt(String(sites), 10) || 4));
    const r = Math.max(1, Math.min(4, parseInt(String(rows), 10) || 1));
    const cols = Math.max(1, Math.ceil(s / r));
    const grid = [];
    let idx = 0;
    for (let row = 0; row < r && idx < s; row++) {
      const nInRow = row < r - 1 ? cols : s - idx;
      for (let c = 0; c < nInRow && idx < s; c++) {
        grid.push({ idx: idx, row: row, col: c, colsInRow: nInRow });
        idx++;
      }
    }
    return { sites: s, rows: r, cols: cols, grid: grid };
  }

  function rdwcPlanAirHints(x, y, cfg) {
    const h = typeof rdwcMontajeHintsForConfig === 'function' ? rdwcMontajeHintsForConfig(cfg) : null;
    if (!h) return '';
    return (
      '<text x="' +
      x +
      '" y="' +
      y +
      '" font-size="8" fill="#9a3412" font-family="system-ui,sans-serif">Aire: ~' +
      h.airMainLenCm +
      ' cm línea · ~' +
      h.airStoneHoseCm +
      ' cm/cubo × ' +
      h.airStones +
      ' · bomba sobre depósito</text>'
    );
  }

  function rdwcPlanFlowLegend(x, y) {
    return (
      '<g class="rdwc-plan-legend" transform="translate(' +
      x +
      ',' +
      y +
      ')" pointer-events="none" aria-hidden="true">' +
      '<line x1="0" y1="6" x2="18" y2="6" stroke="' +
      C_SUPPLY +
      '" stroke-width="3" stroke-linecap="round"/>' +
      '<text x="22" y="9" font-size="8.5" fill="#9d174d" font-family="system-ui,sans-serif" font-weight="600">Impulsión (depósito → cubos)</text>' +
      '<line x1="0" y1="20" x2="18" y2="20" stroke="' +
      C_RETURN +
      '" stroke-width="3" stroke-linecap="round"/>' +
      '<text x="22" y="23" font-size="8.5" fill="#9a3412" font-family="system-ui,sans-serif" font-weight="600">Retorno (cubos → depósito)</text>' +
      '<line x1="0" y1="34" x2="18" y2="34" stroke="' +
      C_LINK +
      '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<text x="22" y="37" font-size="8.5" fill="#475569" font-family="system-ui,sans-serif" font-weight="600">Unión entre cubos</text>' +
      '<line x1="0" y1="48" x2="18" y2="48" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="3 2"/>' +
      '<text x="22" y="51" font-size="8.5" fill="#9a3412" font-family="system-ui,sans-serif" font-weight="600">Aire</text>' +
      '</g>'
    );
  }

  function rdwcPlanRoundBucket(cx, cy, r, idx, ta) {
    const rim = r * 0.7;
    const waterR = r - 4;
    let o =
      '<g class="rdwc-plan-bucket" pointer-events="none" aria-hidden="true">' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(r) +
      '" fill="#e8e4df" stroke="#78716c" stroke-width="2"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(waterR) +
      '" fill="url(#rdwcWater)" opacity="0.75"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(rim) +
      '" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(rim - 4) +
      '" fill="#334155" opacity="0.35"/>';
    const stoneY = cy + r * 0.38;
    o +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(stoneY) +
      '" rx="5.5" ry="3" fill="#64748b" stroke="#334155" stroke-width="0.7"/>';
    if (ta) {
      o +=
        '<circle cx="' +
        f1(cx) +
        '" cy="' +
        f1(stoneY) +
        '" r="1.8" fill="#7dd3fc"><animate attributeName="opacity" values="0.35;1;0.35" dur="2s" repeatCount="indefinite"/></circle>';
    }
    o += '</g>';
    return o;
  }

  function rdwcPlanRoundTank(cx, cy, r, pct, volLbl) {
    const waterR = r - 5;
    const fillH = Math.max(0.2, Math.min(0.92, pct || 0.6));
    const innerR = waterR * Math.sqrt(fillH);
    let o =
      '<g class="rdwc-plan-tank" pointer-events="none" aria-hidden="true">' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(r) +
      '" fill="#e8e4df" stroke="#57534e" stroke-width="2.2"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(innerR) +
      '" fill="url(#rdwcWater)" opacity="0.9"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy - r * 0.15) +
      '" r="' +
      f1(r * 0.55) +
      '" fill="#1e293b" stroke="#0f172a" stroke-width="1.2" opacity="0.85"/>';
    const volOnly = String(volLbl || '').replace(/\s*mezcla\s*$/i, '').trim();
    if (volOnly) {
      o +=
        '<text x="' +
        f1(cx) +
        '" y="' +
        f1(cy + r + 14) +
        '" text-anchor="middle" font-size="9" font-weight="700" fill="#0369a1" font-family="system-ui,sans-serif">' +
        volOnly.replace(/&/g, '&amp;') +
        '</text>';
    }
    o += '</g>';
    return o;
  }

  function rdwcPlanAirPumpOnTank(cx, tankCy, tankR, lpm) {
    const py = tankCy - tankR - 14;
    return (
      '<g class="rdwc-air-pump rdwc-air-pump--on-tank" pointer-events="none" aria-hidden="true">' +
      '<rect x="' +
      f1(cx - 20) +
      '" y="' +
      f1(py - 9) +
      '" width="40" height="18" rx="5" fill="#fff7ed" stroke="#ea580c" stroke-width="1.3"/>' +
      '<text x="' +
      f1(cx) +
      '" y="' +
      f1(py + 2) +
      '" text-anchor="middle" font-size="7" font-weight="800" fill="#9a3412" font-family="system-ui,sans-serif">AIRE ' +
      Math.round(lpm) +
      '</text>' +
      '</g>'
    );
  }

  /** Tubería estilo manual: rosa impulsión, naranja retorno, gris unión. */
  function rdwcPlanPipeManual(d, kind, ta, sw) {
    const w = sw || 3.2;
    let stroke = C_LINK;
    let dash = '';
    if (kind === 'supply') {
      stroke = C_SUPPLY;
    } else if (kind === 'return') {
      stroke = C_RETURN;
    } else if (kind === 'air') {
      stroke = '#fb923c';
      dash = ' stroke-dasharray="4 3"';
    }
    let anim = '';
    if (ta && (kind === 'supply' || kind === 'return')) {
      anim =
        '<path class="rdwc-manual-flow" d="' +
        d +
        '" fill="none" stroke="' +
        stroke +
        '" stroke-width="' +
        (w - 0.8) +
        '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 5" opacity="0.55">' +
        '<animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.3s" repeatCount="indefinite"/></path>';
    }
    return (
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      stroke +
      '" stroke-width="' +
      w +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      dash +
      '/>' +
      anim
    );
  }

  /** Retorno: bus horizontal por encima de la 1.ª fila → laterales del depósito (sin cruzar cubos). */
  function rdwcPlanReturnBus(s, topBuckets, bucketR, gridTop, gridW, cx, tankCy, tankR, ta) {
    if (!topBuckets.length) return s;
    const returnBusY = gridTop - bucketR - 18;
    const gridLeft = cx - gridW / 2;
    const gridRight = cx + gridW / 2;
    const tankInY = tankCy + tankR * 0.2;

    for (let i = 0; i < topBuckets.length; i++) {
      const P = topBuckets[i];
      const stubTop = P.y - bucketR - 4;
      s += rdwcPlanPipeManual(
        'M ' + f1(P.x) + ' ' + f1(stubTop) + ' L ' + f1(P.x) + ' ' + f1(returnBusY),
        'return',
        ta,
        2.8
      );
    }

    const busL = gridLeft - bucketR * 0.35;
    const busR = gridRight + bucketR * 0.35;
    s += rdwcPlanPipeManual('M ' + f1(busL) + ' ' + f1(returnBusY) + ' L ' + f1(busR) + ' ' + f1(returnBusY), 'return', ta, 3.2);

    const tankLeftX = cx - tankR * 0.78;
    const tankRightX = cx + tankR * 0.78;
    s += rdwcPlanPipeManual(
      'M ' +
        f1(busL) +
        ' ' +
        f1(returnBusY) +
        ' L ' +
        f1(tankLeftX) +
        ' ' +
        f1(returnBusY) +
        ' L ' +
        f1(tankLeftX) +
        ' ' +
        f1(tankInY),
      'return',
      ta,
      3.2
    );
    s += rdwcPlanPipeManual(
      'M ' +
        f1(busR) +
        ' ' +
        f1(returnBusY) +
        ' L ' +
        f1(tankRightX) +
        ' ' +
        f1(returnBusY) +
        ' L ' +
        f1(tankRightX) +
        ' ' +
        f1(tankInY),
      'return',
      ta,
      3.2
    );
    return s;
  }

  /** Aire: rail bajo depósito + bajante lateral por columna (no atraviesa cubos). */
  function rdwcPlanAirRoutes(s, positions, byCol, bucketR, tankCx, tankBottom, tankR, cols, ta) {
    const airRailY = tankBottom + 8;
    s += rdwcPlanPipeManual(
      'M ' + f1(tankCx - tankR * 0.85) + ' ' + f1(airRailY) + ' L ' + f1(tankCx + tankR * 0.85) + ' ' + f1(airRailY),
      'air',
      false,
      1.8
    );
    const colKeys = Object.keys(byCol)
      .map(Number)
      .sort((a, b) => a - b);
    for (let ci = 0; ci < colKeys.length; ci++) {
      const ck = colKeys[ci];
      const list = byCol[ck].sort((a, b) => a.row - b.row);
      if (!list.length) continue;
      const bx = list[0].x;
      const sideX = ci === 0 ? bx - bucketR * 1.22 : ci >= colKeys.length - 1 ? bx + bucketR * 1.22 : bx + (ci % 2 === 0 ? -1 : 1) * bucketR * 1.15;
      s += rdwcPlanPipeManual(
        'M ' + f1(bx) + ' ' + f1(airRailY) + ' L ' + f1(sideX) + ' ' + f1(airRailY),
        'air',
        false,
        1.5
      );
      for (let i = 0; i < list.length; i++) {
        const P = list[i];
        const entryX = P.x + (sideX < P.x ? bucketR * 0.42 : -bucketR * 0.42);
        const entryY = P.y + bucketR * 0.48;
        s += rdwcPlanPipeManual(
          'M ' + f1(sideX) + ' ' + f1(airRailY) + ' L ' + f1(sideX) + ' ' + f1(entryY) + ' L ' + f1(entryX) + ' ' + f1(entryY),
          'air',
          false,
          1.4
        );
      }
    }
    return s;
  }

  /** Manifold rosa abajo + eje en el hueco central; bomba entre depósito y cubos. */
  function rdwcPlanManualSpine(s, trunkX, tankBottom, gridTop, manifoldY, bottomBuckets, pumpY, ta) {
    if (!bottomBuckets.length) return s;
    const xs = bottomBuckets.map((p) => p.x).sort((a, b) => a - b);
    const leftX = xs[0];
    const rightX = xs[xs.length - 1];
    const tapY = manifoldY + 6;

    s += rdwcPlanPipeManual(
      'M ' + f1(leftX) + ' ' + f1(tapY) + ' L ' + f1(rightX) + ' ' + f1(tapY),
      'supply',
      ta,
      4
    );
    for (let i = 0; i < bottomBuckets.length; i++) {
      const P = bottomBuckets[i];
      s += rdwcPlanPipeManual(
        'M ' + f1(P.x) + ' ' + f1(P.y + P.r * 0.58) + ' L ' + f1(P.x) + ' ' + f1(tapY),
        'supply',
        ta,
        2.8
      );
    }
    const spineEnterY = gridTop + 8;
    s += rdwcPlanPipeManual(
      'M ' + f1(trunkX) + ' ' + f1(tapY) + ' L ' + f1(trunkX) + ' ' + f1(spineEnterY),
      'supply',
      ta,
      3.2
    );
    s += rdwcPlanPipeManual(
      'M ' + f1(trunkX) + ' ' + f1(spineEnterY) + ' L ' + f1(trunkX) + ' ' + f1(pumpY + 12),
      'supply',
      ta,
      3.2
    );
    s += rdwcPlanPipeManual(
      'M ' + f1(trunkX) + ' ' + f1(pumpY - 12) + ' L ' + f1(trunkX) + ' ' + f1(tankBottom),
      'supply',
      ta,
      3.2
    );
    if (RP) {
      s += RP.recircPump(trunkX, pumpY, 11, '');
    } else {
      s +=
        '<circle cx="' + f1(trunkX) + '" cy="' + f1(pumpY) + '" r="10" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>' +
        '<circle cx="' + f1(trunkX) + '" cy="' + f1(pumpY) + '" r="5" fill="#334155"/>';
    }
    return s;
  }

  function rdwcPlanRowsLabel(x, y, rows) {
    const txt = rows === 1 ? '1 FILA' : rows + ' FILAS';
    return (
      '<text x="' +
      f1(x) +
      '" y="' +
      f1(y) +
      '" font-size="11" font-weight="800" fill="#334155" font-family="Syne,system-ui,sans-serif" text-anchor="middle" transform="rotate(-90 ' +
      f1(x) +
      ',' +
      f1(y) +
      ')">' +
      txt +
      '</text>'
    );
  }

  /**
   * @param {object} cfg config torre RDWC
   * @param {function} siteInteractive
   */
  function renderRdwcPlan(cfg, siteInteractive) {
    const dist = rdwcPlanDistribuir(cfg.rdwcSites, cfg.rdwcRows);
    const spacingCm = Math.max(20, Math.min(150, Number(cfg.rdwcCenterSpacingCm) || 45));
    const colStep = Math.min(120, Math.max(82, spacingCm * 1.2));
    const rowStep = Math.min(105, Math.max(78, spacingCm * 1));
    const colsCfg =
      typeof rdwcColsFromSitesRows === 'function'
        ? rdwcColsFromSitesRows(dist.sites, dist.rows)
        : dist.cols;

    const bucketR = Math.max(26, Math.min(38, 36 - dist.cols * 0.8));
    const tankR = Math.max(40, Math.min(54, 42 + Math.min(6, dist.sites * 0.2)));
    const marginX = 72;
    const gridW = (dist.cols - 1) * colStep;
    const gridH = (dist.rows - 1) * rowStep;
    const W = Math.min(780, Math.max(420, marginX * 2 + gridW + bucketR * 2 + 40));
    const cx = W / 2;
    const tankCy = 56 + tankR;
    const gridTop = tankCy + tankR + 50;
    const H = gridTop + gridH + bucketR * 2 + 56;

    const trunkX = cx;
    const tankBottom = tankCy + tankR;
    const manifoldY = gridTop + (dist.rows - 1) * rowStep + bucketR * 0.95;

    const volMax = typeof getVolumenDepositoMaxLitros === 'function' ? getVolumenDepositoMaxLitros(cfg) : null;
    const volMez = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : null;
    const pct =
      Number.isFinite(volMax) && Number.isFinite(volMez) && volMax > 0
        ? Math.max(0, Math.min(1, volMez / volMax))
        : 0.6;
    const ta = typeof torreSvgAnimacionesActivas === 'function' && torreSvgAnimacionesActivas();
    const tieneDifusor = cfg.equipamiento?.includes?.('difusor') ?? true;
    const volLbl = Number.isFinite(volMez) ? Math.round(volMez * 10) / 10 + ' L mezcla' : '—';
    const recLh = Math.round(Number(cfg.rdwcRecirculationLh) || 1200);
    const airLpm = Math.round(Number(cfg.rdwcAirLpm) || 20);
    const rPot = bucketR;

    const positions = [];
    for (let gi = 0; gi < dist.grid.length; gi++) {
      const g = dist.grid[gi];
      const rowW = (g.colsInRow - 1) * colStep;
      const rowLeft = cx - rowW / 2;
      const x = rowLeft + g.col * colStep;
      const y = gridTop + g.row * rowStep;
      const rn = Math.floor(g.idx / colsCfg);
      const c = g.idx % colsCfg;
      positions.push({ x: x, y: y, rn: rn, c: c, idx: g.idx, row: g.row, col: g.col, r: bucketR });
    }

    let s = '';
    if (typeof global.rdwcScadaDefs === 'function') {
      s += global.rdwcScadaDefs();
    } else if (typeof rdwcScadaDefs === 'function') {
      s += rdwcScadaDefs();
    } else {
      s +=
        '<defs><linearGradient id="rdwcScadaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fafaf9"/><stop offset="100%" stop-color="#e7e5e4"/></linearGradient></defs>';
    }
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#rdwcScadaBg)"/>';

    if (typeof hcDiagramViewLabelSvg === 'function') {
      s += hcDiagramViewLabelSvg(W / 2, 10, 'cenital', { pointerEvents: false });
    }

    s += rdwcPlanFlowLegend(W - 175, 6);
    s += rdwcPlanAirHints(10, H - 10, cfg);

    if (dist.rows >= 2) {
      s += rdwcPlanRowsLabel(22, gridTop + gridH / 2, dist.rows);
    }

    const pumpY = tankBottom + 22;
    let pipes = '<g class="rdwc-plan-pipes" aria-hidden="true">';

    /* Uniones grises: vertical (misma columna) y horizontal (misma fila) — manual */
    const byCol = {};
    const byRow = {};
    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      const ck = P.col;
      const rk = P.row;
      if (!byCol[ck]) byCol[ck] = [];
      if (!byRow[rk]) byRow[rk] = [];
      byCol[ck].push(P);
      byRow[rk].push(P);
    }
    Object.keys(byCol).forEach((ck) => {
      const list = byCol[ck].sort((a, b) => a.row - b.row);
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const b = list[i + 1];
        pipes += rdwcPlanPipeManual(
          'M ' + f1(a.x) + ' ' + f1(a.y + bucketR * 0.5) + ' L ' + f1(b.x) + ' ' + f1(b.y - bucketR * 0.5),
          'link',
          false,
          4.5
        );
      }
    });
    Object.keys(byRow).forEach((rk) => {
      const list = byRow[rk].sort((a, b) => a.col - b.col);
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const b = list[i + 1];
        pipes += rdwcPlanPipeManual(
          'M ' + f1(a.x + bucketR * 0.5) + ' ' + f1(a.y) + ' L ' + f1(b.x - bucketR * 0.5) + ' ' + f1(b.y),
          'link',
          false,
          4.5
        );
      }
    });

    const bottomBuckets = positions.filter((p) => p.row === dist.rows - 1);
    const topBuckets = positions.filter((p) => p.row === 0);

    if (dist.rows >= 2) {
      pipes = rdwcPlanManualSpine(pipes, trunkX, tankBottom, gridTop, manifoldY, bottomBuckets, pumpY, ta);
      pipes = rdwcPlanReturnBus(pipes, topBuckets, bucketR, gridTop, gridW, cx, tankCy, tankR, ta);
    } else {
      pipes += rdwcPlanPipeManual(
        'M ' + f1(trunkX) + ' ' + f1(tankBottom) + ' L ' + f1(trunkX) + ' ' + f1(pumpY + 12),
        'supply',
        ta,
        3.5
      );
      if (RP) pipes += RP.recircPump(trunkX, pumpY, 11, '');
      const rowY = positions[0] ? positions[0].y : gridTop;
      const leftX = positions.length ? Math.min.apply(null, positions.map((p) => p.x)) : cx;
      const rightX = positions.length ? Math.max.apply(null, positions.map((p) => p.x)) : cx;
      const tap1Y = rowY + bucketR * 0.65;
      pipes += rdwcPlanPipeManual(
        'M ' + f1(leftX) + ' ' + f1(tap1Y) + ' L ' + f1(rightX) + ' ' + f1(tap1Y),
        'supply',
        ta,
        3.5
      );
      for (let pi = 0; pi < positions.length; pi++) {
        const P = positions[pi];
        pipes += rdwcPlanPipeManual(
          'M ' + f1(P.x) + ' ' + f1(tap1Y) + ' L ' + f1(P.x) + ' ' + f1(P.y + bucketR * 0.48),
          'supply',
          ta,
          2.8
        );
      }
      pipes = rdwcPlanReturnBus(pipes, positions, bucketR, gridTop, gridW, cx, tankCy, tankR, ta);
    }

    pipes = rdwcPlanAirRoutes(pipes, positions, byCol, bucketR, cx, tankBottom, tankR, dist.cols, ta);
    pipes += '</g>';
    s += pipes;

    s += '<g class="rdwc-plan-vessels">';
    s += rdwcPlanRoundTank(cx, tankCy, tankR, pct, volLbl);
    s += rdwcPlanAirPumpOnTank(cx, tankCy, tankR, airLpm);

    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      s += rdwcPlanRoundBucket(P.x, P.y, bucketR, P.idx, ta);
      if (typeof siteInteractive === 'function') {
        s = siteInteractive(s, P.x, P.y, P.rn, P.c, rPot, cfg, P.idx, ta, tieneDifusor, 'plan');
      }
    }
    s += '</g>';

    const title =
      'RDWC · ' + dist.sites + ' cubos · ' + dist.rows + ' filas · ' + volLbl + ' · recirc. ' + recLh + ' L/h';

    return (
      '<svg class="torre-svg-diagram rdwc-svg-diagram rdwc-svg-diagram--plan rdwc-svg-diagram--plan-manual rdwc-svg-diagram--scada svg-centered-block" width="' +
      W +
      '" height="' +
      H +
      '" viewBox="0 0 ' +
      W +
      ' ' +
      H +
      '" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rdwcDiagTitle">' +
      '<title id="rdwcDiagTitle">' +
      title.replace(/&/g, '&amp;').replace(/</g, '&lt;') +
      '</title>' +
      s +
      '</svg>'
    );
  }

  global.rdwcPlanDistribuir = rdwcPlanDistribuir;
  global.renderRdwcPlan = renderRdwcPlan;
})(typeof window !== 'undefined' ? window : globalThis);
