/**
 * Vista cenital RDWC — hidráulica según manual:
 * Impulsión: depósito → eje → tubería de reparto (abajo) → sube a cubos.
 * Retorno: codos 90° cubos superiores → depósito; bajante por columna; cierra por eje al depósito.
 */
(function (global) {
  'use strict';

  const RP = typeof rdwcScadaParts !== 'undefined' ? rdwcScadaParts : null;
  const C_IMPULSE = '#ca8a04';
  const C_SUPPLY = '#db2777';
  const C_RETURN = '#ea580c';

  function f1(n) {
    return Number(n).toFixed(1);
  }

  function rdwcPlanDistribuir(sites, rows) {
    const s = Math.max(1, Math.min(64, parseInt(String(sites), 10) || 4));
    const r = Math.max(1, Math.min(4, parseInt(String(rows), 10) || 1));
    // Compacto 2 filas: marco de 2 columnas en fila 0 (pareja). Con 1 cubo queda el hueco derecho vacío.
    if (r === 2 && (s === 1 || s === 2)) {
      const grid =
        s === 2
          ? [
              { idx: 0, row: 0, col: 0, colsInRow: 2 },
              { idx: 1, row: 0, col: 1, colsInRow: 2 },
            ]
          : [{ idx: 0, row: 0, col: 0, colsInRow: 2 }];
      return { sites: s, rows: r, cols: 2, grid: grid };
    }
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
    const sites = Math.max(2, parseInt(String((cfg && cfg.rdwcSites) || 4), 10) || 4);
    const rows = Math.max(1, Math.min(4, parseInt(String((cfg && cfg.rdwcRows) || 1), 10) || 1));
    const pumpPos = rows >= 3 || sites >= 9 ? 'bomba al lado del depósito' : 'bomba sobre depósito';
    return (
      '<text x="' +
      x +
      '" y="' +
      y +
      '" font-size="8" fill="#166534" font-family="system-ui,sans-serif">Aire: ~' +
      h.airMainLenCm +
      ' cm línea · ~' +
      h.airStoneHoseCm +
      ' cm/cubo × ' +
      h.airStones +
      ' · ' +
      pumpPos +
      '</text>'
    );
  }

  const TUBE_STYLE = {
    impulse: { rim: '#713f12', body: '#ca8a04', shine: '#fef9c3' },
    supply: { rim: '#831843', body: '#ec4899', shine: '#fce7f3' },
    plant: { rim: '#713f12', body: '#eab308', shine: '#fef9c3' },
    return: { rim: '#9a3412', body: '#f97316', shine: '#ffedd5' },
    air: { rim: '#166534', body: '#22c55e' },
  };

  function rdwcPlanLegendTube(x1, y, x2, kind) {
    const st = TUBE_STYLE[kind] || TUBE_STYLE.return;
    const w = 4.5;
    const dash = kind === 'air' ? ' stroke-dasharray="4 3"' : '';
    return (
      '<line x1="' +
      x1 +
      '" y1="' +
      y +
      '" x2="' +
      x2 +
      '" y2="' +
      y +
      '" stroke="' +
      st.rim +
      '" stroke-width="' +
      (w + 2) +
      '" stroke-linecap="round"' +
      dash +
      '/>' +
      '<line x1="' +
      x1 +
      '" y1="' +
      y +
      '" x2="' +
      x2 +
      '" y2="' +
      y +
      '" stroke="' +
      st.body +
      '" stroke-width="' +
      w +
      '" stroke-linecap="round"' +
      dash +
      '/>'
    );
  }

  function rdwcPlanFlowLegend(x, y) {
    return (
      '<g class="rdwc-plan-legend" transform="translate(' +
      x +
      ',' +
      y +
      ')" pointer-events="none" aria-hidden="true">' +
      rdwcPlanLegendTube(0, 6, 16, 'impulse') +
      '<text x="20" y="9" font-size="8" fill="#854d0e" font-family="system-ui,sans-serif" font-weight="600">Impulsión (depósito)</text>' +
      rdwcPlanLegendTube(0, 18, 16, 'supply') +
      '<text x="20" y="21" font-size="8" fill="#9d174d" font-family="system-ui,sans-serif" font-weight="600">Reparto inferior</text>' +
      rdwcPlanLegendTube(0, 30, 16, 'plant') +
      '<text x="20" y="33" font-size="8" fill="#854d0e" font-family="system-ui,sans-serif" font-weight="600">Subida a cubos (plantas)</text>' +
      rdwcPlanLegendTube(0, 42, 16, 'return') +
      '<text x="20" y="45" font-size="8" fill="#9a3412" font-family="system-ui,sans-serif" font-weight="600">Anillo retorno (cubos↔depósito)</text>' +
      rdwcPlanLegendTube(0, 54, 16, 'air') +
      '<text x="20" y="57" font-size="8" fill="#166534" font-family="system-ui,sans-serif" font-weight="600">Aire</text>' +
      '</g>'
    );
  }

  /** Puntos M/L de un path ortogonal. */
  function rdwcPlanPathPoints(d) {
    const pts = [];
    const re = /([ML])\s*([\d.+-]+)\s+([\d.+-]+)/gi;
    let m;
    while ((m = re.exec(d))) {
      pts.push({ x: parseFloat(m[2]), y: parseFloat(m[3]) });
    }
    return pts;
  }

  /** Aire: trazo discontinuo simple (el brillo triple desalineaba el patrón). */
  function rdwcPlanAirTubePath(d, sw) {
    const st = TUBE_STYLE.air;
    const w = sw || 2.6;
    const dash = ' stroke-dasharray="6 4"';
    return (
      '<g class="rdwc-plan-tube rdwc-plan-tube--air">' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      st.rim +
      '" stroke-width="' +
      (w + 1.6) +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      dash +
      '/>' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      st.body +
      '" stroke-width="' +
      w +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      dash +
      '/>' +
      '</g>'
    );
  }

  /** Tubería doble línea (borde + cuerpo + brillo). */
  function rdwcPlanTubePath(d, kind, ta, sw) {
    if (kind === 'air') return rdwcPlanAirTubePath(d, sw);
    const st = TUBE_STYLE[kind] || TUBE_STYLE.return;
    const w = sw || 5;
    let o =
      '<g class="rdwc-plan-tube rdwc-plan-tube--' +
      kind +
      '">' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      st.rim +
      '" stroke-width="' +
      (w + 2.8) +
      '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      st.body +
      '" stroke-width="' +
      w +
      '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      st.shine +
      '" stroke-width="' +
      Math.max(1, w * 0.35) +
      '" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>';
    if (ta) {
      o +=
        '<path class="rdwc-plan-tube-flow" d="' +
        d +
        '" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="5 6" opacity="0.45">' +
        '<animate attributeName="stroke-dashoffset" from="22" to="0" dur="1.4s" repeatCount="indefinite"/></path>';
    }
    o += '</g>';
    return o;
  }

  function rdwcAirPumpAnchor(cx, tankCy, tankR, diagramW, preferSide) {
    const onLid = !preferSide && diagramW >= 380;
    const px = onLid ? cx : cx + tankR + 20;
    const py = onLid ? tankCy - tankR * 0.52 : tankCy - tankR * 0.15;
    return {
      onLid: onLid,
      px: px,
      py: py,
      outX: onLid ? px : px - 14,
      outY: onLid ? py + 11 : py,
    };
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

  /** Bomba de aire sobre la tapa del depósito (o al lado si no cabe). */
  function rdwcPlanAirPumpOnTank(cx, tankCy, tankR, lpm, diagramW, preferSide) {
    const a = rdwcAirPumpAnchor(cx, tankCy, tankR, diagramW, preferSide);
    const px = a.px;
    const py = a.py;
    const lbl = Math.round(lpm) + ' L/min';
    let o = '<g class="rdwc-air-pump" pointer-events="none" aria-hidden="true">';
    o +=
      '<rect x="' +
      f1(px - 22) +
      '" y="' +
      f1(py - 11) +
      '" width="44" height="22" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>' +
      '<rect x="' +
      f1(px - 16) +
      '" y="' +
      f1(py - 7) +
      '" width="32" height="12" rx="3" fill="#dcfce7" stroke="#4ade80" stroke-width="0.8"/>' +
      '<text x="' +
      f1(px) +
      '" y="' +
      f1(py + 1) +
      '" text-anchor="middle" font-size="6.5" font-weight="800" fill="#14532d" font-family="system-ui,sans-serif">AIRE</text>' +
      '<text x="' +
      f1(px) +
      '" y="' +
      f1(py + 9) +
      '" text-anchor="middle" font-size="5.5" fill="#15803d" font-family="system-ui,sans-serif">' +
      lbl +
      '</text>' +
      '</g>';
    return o;
  }

  function rdwcPlanPipeManual(d, kind, ta, sw) {
    return rdwcPlanTubePath(d, kind, ta, sw);
  }

  /** Codo 90°: cubo superior → lateral del depósito (manual, sin T). */
  function rdwcPlanReturnElbowTop(P, cx, tankCy, tankR, bucketR, colIndex, totalCols, ta) {
    const exitY = P.y - bucketR * 0.88;
    const bendY = exitY - 16;
    const tankPortY = tankCy + tankR * 0.22;
    let tankPortX = cx;
    if (totalCols <= 1) tankPortX = cx;
    else if (P.x < cx - 2) tankPortX = cx - tankR * 0.72;
    else if (P.x > cx + 2) tankPortX = cx + tankR * 0.72;
    else tankPortX = colIndex === 0 ? cx - tankR * 0.72 : cx + tankR * 0.72;
    const d =
      'M ' +
      f1(P.x) +
      ' ' +
      f1(exitY) +
      ' L ' +
      f1(P.x) +
      ' ' +
      f1(bendY) +
      ' L ' +
      f1(tankPortX) +
      ' ' +
      f1(bendY) +
      ' L ' +
      f1(tankPortX) +
      ' ' +
      f1(tankPortY);
    return rdwcPlanTubePath(d, 'return', ta, 4.8);
  }

  /** Retorno por columna: fila superior → inferior (parte del circuito cerrado). */
  function rdwcPlanReturnColumn(top, bottom, bucketR, ta) {
    const d =
      'M ' +
      f1(top.x) +
      ' ' +
      f1(top.y + bucketR * 0.52) +
      ' L ' +
      f1(bottom.x) +
      ' ' +
      f1(bottom.y - bucketR * 0.52);
    return rdwcPlanTubePath(d, 'return', ta, 4.8);
  }

  /**
   * Impulsión: depósito → eje (amarillo) → reparto inferior (rosa) → codos 90° suben a cubos inferiores.
   */
  function rdwcPlanImpulsionSupply(s, cx, tankBottom, pumpY, trunkX, tapY, bottomBuckets, ta) {
    s += rdwcPlanTubePath(
      'M ' + f1(cx) + ' ' + f1(tankBottom) + ' L ' + f1(cx) + ' ' + f1(pumpY + 10),
      'impulse',
      ta,
      5
    );
    if (RP) {
      s += RP.recircPump(cx, pumpY, 11, '');
    } else {
      s +=
        '<circle cx="' + f1(cx) + '" cy="' + f1(pumpY) + '" r="10" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>' +
        '<circle cx="' + f1(cx) + '" cy="' + f1(pumpY) + '" r="5" fill="#334155"/>';
    }
    s += rdwcPlanTubePath('M ' + f1(cx) + ' ' + f1(pumpY - 10) + ' L ' + f1(cx) + ' ' + f1(tapY), 'impulse', ta, 5);
    if (!bottomBuckets.length) return s;
    const xs = bottomBuckets.map((p) => p.x).sort((a, b) => a - b);
    const leftX = xs[0];
    const rightX = xs[xs.length - 1];
    s += rdwcPlanTubePath(
      'M ' + f1(leftX) + ' ' + f1(tapY) + ' L ' + f1(rightX) + ' ' + f1(tapY),
      'supply',
      ta,
      5.2
    );
    for (let i = 0; i < bottomBuckets.length; i++) {
      const P = bottomBuckets[i];
      s += rdwcPlanTubePath(
        'M ' + f1(P.x) + ' ' + f1(tapY) + ' L ' + f1(P.x) + ' ' + f1(P.y + P.r * 0.56),
        'plant',
        ta,
        4.2
      );
    }
    return s;
  }

  /**
   * Retorno: cubos inferiores → eje (naranja) → sube al depósito (cierra el círculo).
   */
  function rdwcPlanReturnClose(s, cx, tankBottom, trunkX, tapY, bottomBuckets, ta) {
    if (!bottomBuckets.length) return s;
    for (let i = 0; i < bottomBuckets.length; i++) {
      const P = bottomBuckets[i];
      s += rdwcPlanTubePath(
        'M ' + f1(P.x) + ' ' + f1(P.y + P.r * 0.52) + ' L ' + f1(P.x) + ' ' + f1(tapY),
        'return',
        ta,
        4.2
      );
    }
    s += rdwcPlanTubePath(
      'M ' + f1(trunkX) + ' ' + f1(tapY) + ' L ' + f1(trunkX) + ' ' + f1(tankBottom + 6),
      'return',
      ta,
      5
    );
    return s;
  }

  /**
   * Trazo suave del anillo hidráulico (circuito cerrado) — referencia PDF.
   */
  function rdwcPlanLoopTrace(s, cx, tankCy, tankR, tankBottom, tapY, topBuckets, bottomBuckets, byCol, bucketR, ta) {
    if (!topBuckets.length || !bottomBuckets.length) return s;
    const leftTop = topBuckets.reduce((a, b) => (a.x < b.x ? a : b));
    const rightTop = topBuckets.reduce((a, b) => (a.x > b.x ? a : b));
    const leftBot = bottomBuckets.reduce((a, b) => (a.x < b.x ? a : b));
    const rightBot = bottomBuckets.reduce((a, b) => (a.x > b.x ? a : b));
    const tankL = cx - tankR * 0.75;
    const tankRgt = cx + tankR * 0.75;
    const tankIn = tankCy + tankR * 0.2;
    const bendY = leftTop.y - bucketR - 14;

    let d =
      'M ' +
      f1(tankL) +
      ' ' +
      f1(tankIn) +
      ' L ' +
      f1(tankL) +
      ' ' +
      f1(bendY) +
      ' L ' +
      f1(leftTop.x) +
      ' ' +
      f1(bendY) +
      ' L ' +
      f1(leftTop.x) +
      ' ' +
      f1(leftTop.y - bucketR * 0.7);
    const listL = (byCol[leftTop.col] || []).sort((a, b) => a.row - b.row);
    if (listL.length >= 2) {
      d +=
        ' L ' +
        f1(listL[listL.length - 1].x) +
        ' ' +
        f1(listL[listL.length - 1].y - bucketR * 0.55);
    }
    d +=
      ' L ' +
      f1(leftBot.x) +
      ' ' +
      f1(tapY) +
      ' L ' +
      f1(rightBot.x) +
      ' ' +
      f1(tapY) +
      ' L ' +
      f1(rightBot.x) +
      ' ' +
      f1(rightBot.y - bucketR * 0.55);
    const listR = (byCol[rightTop.col] || []).sort((a, b) => a.row - b.row);
    if (listR.length >= 2) {
      d += ' L ' + f1(listR[0].x) + ' ' + f1(listR[0].y + bucketR * 0.55);
    }
    d +=
      ' L ' +
      f1(rightTop.x) +
      ' ' +
      f1(bendY) +
      ' L ' +
      f1(tankRgt) +
      ' ' +
      f1(bendY) +
      ' L ' +
      f1(tankRgt) +
      ' ' +
      f1(tankIn);
    s +=
      '<path class="rdwc-plan-loop-trace" d="' +
      d +
      '" fill="none" stroke="' +
      TUBE_STYLE.return.body +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 5" opacity="0.35" pointer-events="none"/>';
    return s;
  }

  /**
   * Aire: salida bomba → un colector → bajante lateral por columna → rama a cada cubo.
   * Sin rejilla horizontal extra (evita líneas confusas sobre el diagrama).
   */
  function rdwcPlanAirRoutes(s, positions, byCol, bucketR, tankCx, tankCy, tankR, gridLeft, gridRight, gridTop, pumpAnchor, dist) {
    if (!positions.length) return s;
    const compactTop = dist.rows >= 2 && positions.every((p) => p.row === 0);
    const airRailY = compactTop ? gridTop - bucketR * 0.32 : tankCy - tankR * 0.15;
    const sideOff = bucketR * 1.22;

    s += rdwcPlanAirTubePath(
      'M ' + f1(pumpAnchor.outX) + ' ' + f1(pumpAnchor.outY) + ' L ' + f1(tankCx) + ' ' + f1(airRailY),
      2.8
    );
    s += rdwcPlanAirTubePath(
      'M ' + f1(gridLeft - bucketR * 0.65) + ' ' + f1(airRailY) + ' L ' + f1(gridRight + bucketR * 0.65) + ' ' + f1(airRailY),
      2.8
    );

    const colKeys = Object.keys(byCol)
      .map(Number)
      .sort((a, b) => a - b);
    for (let ci = 0; ci < colKeys.length; ci++) {
      const ck = colKeys[ci];
      const list = byCol[ck].sort((a, b) => a.row - b.row);
      if (!list.length) continue;
      const bx = list[0].x;
      const sideX =
        ci === 0
          ? bx - sideOff
          : ci >= colKeys.length - 1
            ? bx + sideOff
            : bx + (ci % 2 === 0 ? -1 : 1) * bucketR * 1.15;
      s += rdwcPlanAirTubePath(
        'M ' + f1(bx) + ' ' + f1(airRailY) + ' L ' + f1(sideX) + ' ' + f1(airRailY),
        2.4
      );
      for (let i = 0; i < list.length; i++) {
        const P = list[i];
        const entryX = P.x + (sideX < P.x ? bucketR * 0.42 : -bucketR * 0.42);
        const entryY = P.y + bucketR * 0.48;
        s += rdwcPlanAirTubePath(
          'M ' + f1(sideX) + ' ' + f1(airRailY) + ' L ' + f1(sideX) + ' ' + f1(entryY) + ' L ' + f1(entryX) + ' ' + f1(entryY),
          2.2
        );
      }
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
    const colStep = Math.min(138, Math.max(96, spacingCm * 1.35));
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

    const tankBottom = tankCy + tankR;
    const bottomRowY = gridTop + (dist.rows - 1) * rowStep;
    const manifoldY = bottomRowY + bucketR + 20;

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
    const preferSideAirPump = dist.rows >= 3 || dist.sites >= 9;

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

    const pumpY = tankBottom + 26;
    const tapY = manifoldY;
    const trunkX = cx;
    const gridLeft = cx - gridW / 2;
    const gridRight = cx + gridW / 2;
    const airPumpAnchor = rdwcAirPumpAnchor(cx, tankCy, tankR, W, preferSideAirPump);

    const byCol = {};
    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      if (!byCol[P.col]) byCol[P.col] = [];
      byCol[P.col].push(P);
    }

    const bottomBuckets = positions.filter((p) => p.row === dist.rows - 1);
    const topBuckets = positions.filter((p) => p.row === 0);

    let pipes = '<g class="rdwc-plan-pipes" aria-hidden="true">';

    if (dist.rows >= 2) {
      pipes = rdwcPlanLoopTrace(
        pipes,
        cx,
        tankCy,
        tankR,
        tankBottom,
        tapY,
        topBuckets,
        bottomBuckets,
        byCol,
        bucketR,
        ta
      );
      pipes = rdwcPlanImpulsionSupply(pipes, cx, tankBottom, pumpY, trunkX, tapY, bottomBuckets, ta);
      Object.keys(byCol).forEach((ck) => {
        const list = byCol[ck].sort((a, b) => a.row - b.row);
        if (list.length >= 2) {
          pipes += rdwcPlanReturnColumn(list[0], list[list.length - 1], bucketR, ta);
        }
      });
      for (let i = 0; i < topBuckets.length; i++) {
        const P = topBuckets[i];
        pipes += rdwcPlanReturnElbowTop(P, cx, tankCy, tankR, bucketR, P.col, dist.cols, ta);
      }
      pipes = rdwcPlanReturnClose(pipes, cx, tankBottom, trunkX, tapY, bottomBuckets, ta);
    } else {
      const tap1Y = (positions[0] ? positions[0].y : gridTop) + bucketR * 0.62;
      pipes = rdwcPlanImpulsionSupply(pipes, cx, tankBottom, pumpY, trunkX, tap1Y, positions, ta);
      for (let i = 0; i < positions.length; i++) {
        pipes += rdwcPlanReturnElbowTop(positions[i], cx, tankCy, tankR, bucketR, positions[i].col, dist.cols, ta);
      }
      pipes = rdwcPlanReturnClose(pipes, cx, tankBottom, trunkX, tap1Y, positions, ta);
    }

    pipes = rdwcPlanAirRoutes(
      pipes,
      positions,
      byCol,
      bucketR,
      cx,
      tankCy,
      tankR,
      gridLeft,
      gridRight,
      gridTop,
      airPumpAnchor,
      dist
    );
    pipes += '</g>';
    s += pipes;

    s += '<g class="rdwc-plan-vessels">';
    s += rdwcPlanRoundTank(cx, tankCy, tankR, pct, volLbl);
    s += rdwcPlanAirPumpOnTank(cx, tankCy, tankR, airLpm, W, preferSideAirPump);

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
