/**
 * Vista cenital RDWC — hidráulica según manual:
 * Impulsión (amarillo): depósito → bomba. Reparto (rosa): bomba → manifold → cubos inferiores.
 * Retorno (naranja): cubos → manifold (mismo racor) → eje al depósito; filas superiores con codo al depósito.
 * 1 fila: misma lógica (manifold + retorno al depósito), sin circuito en serie entre cubos.
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
    // 2 cubos · 2 filas: marco 2×2 (como 4×2), un cubo por fila — no en línea horizontal ni columna estrecha.
    if (s === 2 && r === 2) {
      return {
        sites: s,
        rows: r,
        cols: 2,
        grid: [
          { idx: 0, row: 0, col: 0, colsInRow: 2 },
          { idx: 1, row: 1, col: 0, colsInRow: 2 },
        ],
      };
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

  function rdwcPlanBucketsSorted(positions) {
    return positions.slice().sort((a, b) => a.x - b.x || a.col - b.col);
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

  const PLAN_CHROME_H = 56;

  /** Leyenda de tuberías; rightX = borde derecho del bloque (alineado a la derecha del SVG). */
  function rdwcPlanFlowLegend(rightX, y) {
    const legendW = 118;
    return (
      '<g class="rdwc-plan-legend" transform="translate(' +
      (rightX - legendW) +
      ',' +
      y +
      ')" pointer-events="none" aria-hidden="true">' +
      rdwcPlanLegendTube(0, 6, 16, 'impulse') +
      '<text x="20" y="9" font-size="8" fill="#854d0e" font-family="system-ui,sans-serif" font-weight="600">Impulsión</text>' +
      rdwcPlanLegendTube(0, 18, 16, 'supply') +
      '<text x="20" y="21" font-size="8" fill="#9d174d" font-family="system-ui,sans-serif" font-weight="600">Reparto</text>' +
      rdwcPlanLegendTube(0, 30, 16, 'return') +
      '<text x="20" y="33" font-size="8" fill="#9a3412" font-family="system-ui,sans-serif" font-weight="600">Retorno</text>' +
      rdwcPlanLegendTube(0, 42, 16, 'air') +
      '<text x="20" y="45" font-size="8" fill="#166534" font-family="system-ui,sans-serif" font-weight="600">Aire</text>' +
      '</g>'
    );
  }

  /** Cabecera fija: título de vista (izq.) y leyenda (der.) sin invadir el depósito. */
  function rdwcPlanChromeSvg(W) {
    let o =
      '<g class="rdwc-plan-chrome" data-hc-layout="v3" pointer-events="none" aria-hidden="true">' +
      '<rect x="0" y="0" width="' +
      W +
      '" height="' +
      PLAN_CHROME_H +
      '" fill="rgba(250,250,249,0.96)"/>';
    if (typeof hcDiagramViewLabelSvg === 'function') {
      o += hcDiagramViewLabelSvg(10, 18, 'cenital', { pointerEvents: false, anchor: 'start' });
    }
    o += rdwcPlanFlowLegend(W - 8, 6);
    o += '</g>';
    return o;
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
      '" stroke-linecap="round" stroke-linejoin="miter"/>' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      st.body +
      '" stroke-width="' +
      w +
      '" stroke-linecap="round" stroke-linejoin="miter"/>' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      st.shine +
      '" stroke-width="' +
      Math.max(1, w * 0.35) +
      '" stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>';
    o += '</g>';
    return o;
  }

  function rdwcAirPumpAnchor(cx, tankCy, tankR, diagramW, preferSide, opts) {
    opts = opts || {};
    const sites = Math.max(0, parseInt(String(opts.sites || 0), 10) || 0);
    const rows = Math.max(1, parseInt(String(opts.rows || 1), 10) || 1);
    const onLid = !preferSide && diagramW >= 380;
    const px = onLid ? cx : cx + tankR + 20;
    let py = onLid ? tankCy - tankR * 0.52 : tankCy - tankR * 0.15;
    if (!onLid && rows === 2 && sites >= 10) {
      // En 10+ cubos con 2 filas, se eleva la bomba lateral para no solaparse con el reservorio.
      py = tankCy - tankR * 0.42;
    }
    return {
      onLid: onLid,
      px: px,
      py: py,
      outX: px,
      outY: py + 11,
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
  function rdwcPlanAirPumpOnTank(cx, tankCy, tankR, lpm, diagramW, preferSide, dist) {
    const a = rdwcAirPumpAnchor(cx, tankCy, tankR, diagramW, preferSide, {
      sites: dist && dist.sites,
      rows: dist && dist.rows,
    });
    const px = a.px;
    const py = a.py;
    const w = 56;
    const h = 40;
    const x = px - w / 2;
    const y = py - h / 2;
    let o = '<g class="rdwc-air-pump" pointer-events="none" aria-hidden="true">';
    o +=
      '<ellipse cx="' +
      f1(px) +
      '" cy="' +
      f1(y + h + 6) +
      '" rx="20" ry="4.5" fill="rgba(15,23,42,0.14)"/>' +
      '<rect x="' +
      f1(x + 4) +
      '" y="' +
      f1(y + 15) +
      '" width="' +
      f1(w - 8) +
      '" height="' +
      f1(h - 11) +
      '" rx="5" fill="#37474f" stroke="#1e293b" stroke-width="1.8"/>' +
      '<ellipse cx="' +
      f1(px) +
      '" cy="' +
      f1(y + 12) +
      '" rx="' +
      f1((w - 10) / 2) +
      '" ry="13" fill="url(#rdwcPumpDome)" stroke="#e65100" stroke-width="2"/>' +
      '<ellipse cx="' +
      f1(px - 8) +
      '" cy="' +
      f1(y + 8) +
      '" rx="7" ry="3" fill="rgba(255,255,255,0.45)"/>' +
      '<circle cx="' +
      f1(px) +
      '" cy="' +
      f1(y + h * 0.52) +
      '" r="9" fill="#eceff1" stroke="#78909c" stroke-width="1.2"/>' +
      '<circle cx="' +
      f1(px) +
      '" cy="' +
      f1(y + h * 0.52) +
      '" r="4.5" fill="none" stroke="#90a4ae" stroke-width="0.9"/>' +
      '<rect x="' +
      f1(px - 31) +
      '" y="' +
      f1(y - 27) +
      '" width="62" height="20" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>' +
      '<text x="' +
      f1(px) +
      '" y="' +
      f1(y - 13) +
      '" text-anchor="middle" font-size="9" font-weight="800" fill="#14532d" font-family="system-ui,sans-serif">AIRE</text>' +
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

  /** Codo 90° ortogonal (3 puntos) — esquinas visibles en racores. */
  function rdwcPlanTubeElbow(x1, y1, x2, y2, x3, y3, kind, ta, sw) {
    const d = 'M ' + f1(x1) + ' ' + f1(y1) + ' L ' + f1(x2) + ' ' + f1(y2) + ' L ' + f1(x3) + ' ' + f1(y3);
    return rdwcPlanTubePath(d, kind, ta, sw);
  }

  /** Racor inferior: rosa y naranja en el mismo eje vertical (manifold ↔ cubo). */
  function rdwcPlanBucketLowerPort(P, tapY, ta) {
    const br = P.r || 30;
    const portY = P.y + br * 0.52;
    let o = '';
    o += rdwcPlanTubePath(
      'M ' + f1(P.x) + ' ' + f1(tapY) + ' L ' + f1(P.x) + ' ' + f1(portY),
      'supply',
      ta,
      4
    );
    o += rdwcPlanTubePath(
      'M ' + f1(P.x) + ' ' + f1(portY) + ' L ' + f1(P.x) + ' ' + f1(tapY),
      'return',
      ta,
      4
    );
    return o;
  }

  /** Enlace de retorno en serie entre cubos adyacentes. */
  function rdwcPlanReturnSeriesLink(A, B, bucketR, ta) {
    const yA = A.y + bucketR * 0.52;
    const yB = B.y + bucketR * 0.52;
    const midX = (A.x + B.x) / 2;
    const d =
      'M ' +
      f1(A.x) +
      ' ' +
      f1(yA) +
      ' L ' +
      f1(midX) +
      ' ' +
      f1(yA) +
      ' L ' +
      f1(midX) +
      ' ' +
      f1(yB) +
      ' L ' +
      f1(B.x) +
      ' ' +
      f1(yB);
    return rdwcPlanTubePath(d, 'return', ta, 4.2);
  }

  /**
   * Circuito en serie (1 fila / compacto): impulsión + retorno cubo a cubo; último → depósito.
   */
  function rdwcPlanSeriesHydraulics(s, positions, cx, tankCy, tankR, tankBottom, pumpY, trunkX, bucketR, cols, ta) {
    const sorted = rdwcPlanBucketsSorted(positions);
    if (!sorted.length) return s;
    const tapY = sorted[0].y + bucketR + 20;
    s = rdwcPlanImpulsionSupply(s, cx, tankBottom, pumpY, trunkX, tapY, sorted, ta);
    for (let i = 0; i < sorted.length - 1; i++) {
      s += rdwcPlanReturnSeriesLink(sorted[i], sorted[i + 1], bucketR, ta);
    }
    const last = sorted[sorted.length - 1];
    s += rdwcPlanReturnElbowTop(last, cx, tankCy, tankR, bucketR, last.col, cols, ta);
    return s;
  }

  function rdwcPlanManifoldSpan(bucketXs, feederX) {
    const xs = bucketXs.slice().sort((a, b) => a - b);
    if (!xs.length) return { leftX: feederX, rightX: feederX };
    return {
      leftX: Math.min(xs[0], feederX),
      rightX: Math.max(xs[xs.length - 1], feederX),
    };
  }

  /**
   * Impulsión: depósito → bomba (amarillo). Reparto rosa: bomba → manifold → racor en cubos inferiores.
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
    if (!bottomBuckets.length) return s;
    const span = rdwcPlanManifoldSpan(
      bottomBuckets.map((p) => p.x),
      trunkX
    );
    s += rdwcPlanTubePath(
      'M ' + f1(cx) + ' ' + f1(pumpY - 10) + ' L ' + f1(cx) + ' ' + f1(tapY),
      'supply',
      ta,
      5
    );
    if (span.rightX - span.leftX > 1) {
      s += rdwcPlanTubePath(
        'M ' + f1(span.leftX) + ' ' + f1(tapY) + ' L ' + f1(span.rightX) + ' ' + f1(tapY),
        'supply',
        ta,
        5.2
      );
    }
    for (let i = 0; i < bottomBuckets.length; i++) {
      s += rdwcPlanBucketLowerPort(bottomBuckets[i], tapY, ta);
    }
    return s;
  }

  /** Retorno: eje central en el manifold (vertical, sin tramo horizontal en tapY) → depósito. */
  function rdwcPlanReturnClose(s, cx, tankBottom, trunkX, tapY, bottomBuckets, ta) {
    if (!bottomBuckets.length) return s;
    s += rdwcPlanTubePath(
      'M ' + f1(trunkX) + ' ' + f1(tapY) + ' L ' + f1(trunkX) + ' ' + f1(tankBottom + 6),
      'return',
      ta,
      5
    );
    return s;
  }

  function rdwcPlanAirColumnSpineX(ci, nCols, colCenters, bucketR, airPumpX) {
    if (nCols <= 1) {
      const bx = colCenters[0];
      if (airPumpX >= bx + 1) return bx - bucketR * 1.18;
      return bx + bucketR * 1.18;
    }
    if (ci === 0) return colCenters[0] - bucketR * 1.12;
    if (ci === nCols - 1) return colCenters[nCols - 1] + bucketR * 1.12;
    return (colCenters[ci - 1] + colCenters[ci]) / 2;
  }

  /**
   * Aire: siempre desde la bomba (vertical) → reparto entre cubos → bajada a cada cubo.
   */
  function rdwcPlanAirRoutes(s, positions, byCol, bucketR, tankCy, tankR, gridTop, pumpAnchor, dist) {
    if (!positions.length) return s;
    const sorted = rdwcPlanBucketsSorted(positions);
    const airRailY = tankCy - tankR * 0.15;
    const railX0 = sorted[0].x;
    const railX1 = sorted[sorted.length - 1].x;

    s += rdwcPlanAirTubePath(
      'M ' + f1(pumpAnchor.outX) + ' ' + f1(pumpAnchor.outY) + ' L ' + f1(pumpAnchor.outX) + ' ' + f1(airRailY),
      2.8
    );
    if (railX1 - railX0 > 2) {
      s += rdwcPlanAirTubePath(
        'M ' + f1(railX0) + ' ' + f1(airRailY) + ' L ' + f1(railX1) + ' ' + f1(airRailY),
        2.8
      );
    }

    const singleBucket = dist.sites <= 1;
    if (singleBucket) {
      const P = sorted[0];
      const entryY = P.y + bucketR * 0.48;
      const offX = P.x - bucketR * 0.18;
      s += rdwcPlanAirTubePath(
        'M ' +
          f1(P.x) +
          ' ' +
          f1(airRailY) +
          ' L ' +
          f1(offX) +
          ' ' +
          f1(airRailY) +
          ' L ' +
          f1(offX) +
          ' ' +
          f1(entryY) +
          ' L ' +
          f1(P.x) +
          ' ' +
          f1(entryY),
        2.2
      );
      return s;
    }

    const colKeys = Object.keys(byCol)
      .map(Number)
      .sort((a, b) => a - b);
    const colCenters = colKeys.map((ck) => byCol[ck][0].x);
    const nCols = colKeys.length;
    for (let ci = 0; ci < colKeys.length; ci++) {
      const ck = colKeys[ci];
      const list = byCol[ck].sort((a, b) => a.row - b.row);
      if (!list.length) continue;
      const spineX = rdwcPlanAirColumnSpineX(ci, nCols, colCenters, bucketR, pumpAnchor.outX);
      const spineSign = spineX < list[0].x ? -1 : 1;
      const lastY = list[list.length - 1].y + bucketR * 0.48;
      if (Math.abs(spineX - pumpAnchor.outX) > 2) {
        s += rdwcPlanAirTubePath(
          'M ' + f1(pumpAnchor.outX) + ' ' + f1(airRailY) + ' L ' + f1(spineX) + ' ' + f1(airRailY),
          2.4
        );
      }
      s += rdwcPlanAirTubePath(
        'M ' + f1(spineX) + ' ' + f1(airRailY) + ' L ' + f1(spineX) + ' ' + f1(lastY),
        2.3
      );
      for (let i = 0; i < list.length; i++) {
        const P = list[i];
        const entryX = P.x + spineSign * bucketR * 0.42;
        const entryY = P.y + bucketR * 0.48;
        s += rdwcPlanAirTubePath(
          'M ' + f1(spineX) + ' ' + f1(entryY) + ' L ' + f1(entryX) + ' ' + f1(entryY),
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
    const bucketR = Math.max(26, Math.min(38, 36 - dist.cols * 0.8));
    const tankR = Math.max(40, Math.min(54, 42 + Math.min(6, dist.sites * 0.2)));
    const marginX = 72;
    const gridW = (dist.cols - 1) * colStep;
    const gridH = (dist.rows - 1) * rowStep;
    const W = Math.min(780, Math.max(420, marginX * 2 + gridW + bucketR * 2 + 40));
    const cx = W / 2;
    const tankCy = PLAN_CHROME_H + 14 + tankR;
    const gridTop = tankCy + tankR + 50;
    const H = gridTop + gridH + bucketR * 2 + 40;

    const tankBottom = tankCy + tankR;

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
      positions.push({
        x: x,
        y: y,
        rn: g.row,
        c: g.col,
        idx: g.idx,
        row: g.row,
        col: g.col,
        r: bucketR,
      });
    }

    const bottomRowY = gridTop + (dist.rows - 1) * rowStep;
    const manifoldY = bottomRowY + bucketR + 20;

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
    s += rdwcPlanChromeSvg(W);

    const rowsLabelY = dist.rows >= 2 ? gridTop + gridH / 2 : gridTop + bucketR * 0.55;
    s += rdwcPlanRowsLabel(22, rowsLabelY, dist.rows);

    const pumpY = tankBottom + 26;
    const tapY = manifoldY;
    const trunkX = cx;
    const gridLeft = cx - gridW / 2;
    const gridRight = cx + gridW / 2;
    const airPumpAnchor = rdwcAirPumpAnchor(cx, tankCy, tankR, W, preferSideAirPump, {
      sites: dist.sites,
      rows: dist.rows,
    });

    const byCol = {};
    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      if (!byCol[P.col]) byCol[P.col] = [];
      byCol[P.col].push(P);
    }

    const bottomBuckets = positions.filter((p) => p.row === dist.rows - 1);
    const topBuckets = dist.rows > 1 ? positions.filter((p) => p.row === 0) : [];

    let pipes = '<g class="rdwc-plan-pipes" aria-hidden="true">';
    pipes = rdwcPlanImpulsionSupply(pipes, cx, tankBottom, pumpY, trunkX, tapY, bottomBuckets, ta);
    Object.keys(byCol).forEach((ck) => {
      const list = byCol[ck].sort((a, b) => a.row - b.row);
      if (dist.rows > 1 && list.length >= 2) {
        pipes += rdwcPlanReturnColumn(list[0], list[list.length - 1], bucketR, ta);
      }
    });
    for (let i = 0; i < topBuckets.length; i++) {
      const P = topBuckets[i];
      pipes += rdwcPlanReturnElbowTop(P, cx, tankCy, tankR, bucketR, P.col, dist.cols, ta);
    }
    pipes = rdwcPlanReturnClose(pipes, cx, tankBottom, trunkX, tapY, bottomBuckets, ta);

    pipes += '</g>';
    s += pipes;

    s += '<g class="rdwc-plan-vessels">';
    s += rdwcPlanRoundTank(cx, tankCy, tankR, pct, volLbl);
    s += rdwcPlanAirPumpOnTank(cx, tankCy, tankR, airLpm, W, preferSideAirPump, dist);

    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      s += rdwcPlanRoundBucket(P.x, P.y, bucketR, P.idx, ta);
      if (typeof siteInteractive === 'function') {
        try {
          s = siteInteractive(s, P.x, P.y, P.rn, P.c, rPot, cfg, P.idx, ta, tieneDifusor, 'plan');
        } catch (siteErr) {
          try {
            console.warn('rdwcPlan siteInteractive', siteErr);
          } catch (_) {}
        }
      }
    }
    s += '</g>';

    s +=
      '<g class="rdwc-plan-air-pipes" aria-hidden="true">' +
      rdwcPlanAirRoutes('', positions, byCol, bucketR, tankCy, tankR, gridTop, airPumpAnchor, dist) +
      '</g>';

    const title =
      'RDWC · ' + dist.sites + ' cubos · ' + dist.rows + ' filas · ' + volLbl + ' · recirc. ' + recLh + ' L/h';

    return (
      '<svg class="torre-svg-diagram rdwc-svg-diagram rdwc-svg-diagram--plan rdwc-svg-diagram--plan-manual rdwc-svg-diagram--scada svg-centered-block" data-hc-rdwc-plan="v3" width="' +
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
