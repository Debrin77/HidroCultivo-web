/**
 * Vista cenital RDWC — depósito redondo arriba, filas de cubos redondos, eje central equilibrado.
 * Referencia: manual kit modular (2 filas, impulsión/retorno, aire por cubo).
 */
(function (global) {
  'use strict';

  const RP = typeof rdwcScadaParts !== 'undefined' ? rdwcScadaParts : null;

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
      '" font-size="8" fill="#9a3412" font-family="system-ui,sans-serif" font-weight="500">Aire: línea ~' +
      h.airMainLenCm +
      ' cm · tubo/cubo ~' +
      h.airStoneHoseCm +
      ' cm × ' +
      h.airStones +
      '</text>'
    );
  }

  function rdwcPlanFlowLegend(x, y) {
    return (
      '<g class="rdwc-plan-legend" transform="translate(' +
      x +
      ',' +
      y +
      ')" pointer-events="none" aria-hidden="true">' +
      '<line x1="0" y1="6" x2="20" y2="6" stroke="#16a34a" stroke-width="2.6" stroke-linecap="round"/>' +
      '<text x="24" y="9" font-size="9" fill="#166534" font-family="system-ui,sans-serif" font-weight="600">Impulsión</text>' +
      '<line x1="0" y1="20" x2="20" y2="20" stroke="#2563eb" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="5 4"/>' +
      '<text x="24" y="23" font-size="9" fill="#1e40af" font-family="system-ui,sans-serif" font-weight="600">Retorno</text>' +
      '<line x1="0" y1="34" x2="20" y2="34" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"/>' +
      '<text x="24" y="37" font-size="9" fill="#9a3412" font-family="system-ui,sans-serif" font-weight="600">Aire</text>' +
      '<line x1="0" y1="48" x2="20" y2="48" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>' +
      '<text x="24" y="51" font-size="9" fill="#475569" font-family="system-ui,sans-serif" font-weight="600">Unión entre cubos (fila)</text>' +
      '</g>'
    );
  }

  /** Cubo de cultivo visto desde arriba (círculo + aro net pot). */
  function rdwcPlanRoundBucket(cx, cy, r, idx, ta) {
    const rim = r * 0.72;
    const waterR = r - 5;
    let o =
      '<g class="rdwc-plan-bucket" pointer-events="none" aria-hidden="true">' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(r) +
      '" fill="#f1f5f9" stroke="#64748b" stroke-width="2.2"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(waterR) +
      '" fill="url(#rdwcWater)" opacity="0.88"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(rim) +
      '" fill="none" stroke="#334155" stroke-width="2.5" stroke-dasharray="2 1.5" opacity="0.55"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(rim - 3) +
      '" fill="#e2e8f0" stroke="#475569" stroke-width="1"/>' +
      '<text x="' +
      f1(cx) +
      '" y="' +
      f1(cy + 1) +
      '" text-anchor="middle" font-size="' +
      Math.max(8, Math.round(r * 0.38)) +
      '" font-weight="700" fill="#475569" font-family="system-ui,sans-serif">' +
      (idx + 1) +
      '</text>';
    const stoneY = cy + r * 0.42;
    o +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(stoneY) +
      '" rx="6" ry="3.5" fill="#64748b" stroke="#334155" stroke-width="0.8"/>';
    if (ta) {
      o +=
        '<circle cx="' +
        f1(cx) +
        '" cy="' +
        f1(stoneY) +
        '" r="2" fill="#7dd3fc"><animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/></circle>';
    }
    o += '</g>';
    return o;
  }

  /** Depósito de control (círculo) + etiqueta de volumen. */
  function rdwcPlanRoundTank(cx, cy, r, pct, volLbl) {
    const waterR = r - 6;
    const fillH = Math.max(0.2, Math.min(0.92, pct || 0.6));
    const innerR = waterR * Math.sqrt(fillH);
    let o =
      '<g class="rdwc-plan-tank" pointer-events="none" aria-hidden="true">' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(r + 4) +
      '" fill="rgba(37,99,235,0.08)" stroke="none"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(r) +
      '" fill="url(#rdwcTankBody)" stroke="#1e40af" stroke-width="2.4"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" r="' +
      f1(innerR) +
      '" fill="url(#rdwcWater)" opacity="0.95"/>' +
      '<text x="' +
      f1(cx) +
      '" y="' +
      f1(cy + 4) +
      '" text-anchor="middle" font-size="11" font-weight="800" fill="#1e3a8a" font-family="Syne,system-ui,sans-serif">Control</text>';
    const volOnly = String(volLbl || '').replace(/\s*mezcla\s*$/i, '').trim();
    if (volOnly) {
      o +=
        '<text x="' +
        f1(cx) +
        '" y="' +
        f1(cy + 18) +
        '" text-anchor="middle" font-size="10" font-weight="700" fill="#0369a1" font-family="system-ui,sans-serif">' +
        volOnly.replace(/&/g, '&amp;') +
        '</text>';
    }
    o += '</g>';
    return o;
  }

  /** Bomba de aire sobre el depósito (como montaje habitual). */
  function rdwcPlanAirPumpOnTank(cx, tankCy, tankR, lpm) {
    const py = tankCy - tankR - 16;
    const lbl = Math.round(lpm) + ' L/min';
    return (
      '<g class="rdwc-air-pump rdwc-air-pump--on-tank" pointer-events="none" aria-hidden="true">' +
      '<line x1="' +
      f1(cx) +
      '" y1="' +
      f1(py + 12) +
      '" x2="' +
      f1(cx) +
      '" y2="' +
      f1(tankCy - tankR + 2) +
      '" stroke="#fb923c" stroke-width="2" stroke-dasharray="3 2" opacity="0.85"/>' +
      '<rect x="' +
      f1(cx - 22) +
      '" y="' +
      f1(py - 11) +
      '" width="44" height="22" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="1.4"/>' +
      '<text x="' +
      f1(cx) +
      '" y="' +
      f1(py + 2) +
      '" text-anchor="middle" font-size="7.5" font-weight="800" fill="#9a3412" font-family="system-ui,sans-serif">AIRE</text>' +
      '<text x="' +
      f1(cx) +
      '" y="' +
      f1(py + 10) +
      '" text-anchor="middle" font-size="6.5" fill="#c2410c" font-family="system-ui,sans-serif">' +
      lbl +
      '</text>' +
      '</g>'
    );
  }

  function rdwcPlanPipe(d, kind, ta, sw) {
    if (RP) {
      if (kind === 'supply') return RP.supplyPath(d, ta, sw);
      if (kind === 'return') return RP.returnPath(d, ta, sw);
    }
    const stroke = kind === 'supply' ? '#16a34a' : kind === 'return' ? '#2563eb' : '#94a3b8';
    const dash = kind === 'return' ? ' stroke-dasharray="6 4"' : kind === 'link' ? '' : '';
    return (
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      stroke +
      '" stroke-width="' +
      (sw || 2.4) +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      dash +
      '/>'
    );
  }

  function rdwcPlanAirPath(d) {
    return (
      '<path d="' +
      d +
      '" fill="none" stroke="#ea580c" stroke-width="1.6" stroke-dasharray="4 3" stroke-linecap="round" opacity="0.9"/>'
    );
  }

  /**
   * @param {object} cfg config torre RDWC
   * @param {function} siteInteractive fn(s, x, y, rn, c, rPot, cfg, idx, ta, dif, layout) -> string
   */
  function renderRdwcPlan(cfg, siteInteractive) {
    const dist = rdwcPlanDistribuir(cfg.rdwcSites, cfg.rdwcRows);
    const spacingCm = Math.max(20, Math.min(150, Number(cfg.rdwcCenterSpacingCm) || 45));
    const colStep = Math.min(118, Math.max(78, spacingCm * 1.15));
    const rowStep = Math.min(100, Math.max(72, spacingCm * 0.95));
    const colsCfg =
      typeof rdwcColsFromSitesRows === 'function'
        ? rdwcColsFromSitesRows(dist.sites, dist.rows)
        : dist.cols;

    const bucketR = Math.max(24, Math.min(36, 34 - dist.cols * 1.2));
    const tankR = Math.max(38, Math.min(52, 40 + Math.min(8, dist.sites * 0.25)));
    const marginX = 56;
    const gridW = (dist.cols - 1) * colStep;
    const gridH = (dist.rows - 1) * rowStep;
    const W = Math.min(760, Math.max(400, marginX * 2 + gridW + bucketR * 2));
    const headerH = 52;
    const cx = W / 2;
    const tankCy = headerH + tankR + 28;
    const gridTop = tankCy + tankR + 44;
    const gridLeft = cx - gridW / 2;
    const H = gridTop + gridH + bucketR + 48;

    const trunkX = cx;
    const tankBottom = tankCy + tankR;
    const gridBottom = gridTop + gridH;

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
      positions.push({ x: x, y: y, rn: rn, c: c, idx: g.idx, row: g.row, col: g.col });
    }

    let s = '';
    if (typeof global.rdwcScadaDefs === 'function') {
      s += global.rdwcScadaDefs();
    } else if (typeof rdwcScadaDefs === 'function') {
      s += rdwcScadaDefs();
    } else {
      s +=
        '<defs><linearGradient id="rdwcScadaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#e8ecf1"/></linearGradient></defs>';
    }
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#rdwcScadaBg)"/>';

    if (typeof hcDiagramViewLabelSvg === 'function') {
      s += hcDiagramViewLabelSvg(W / 2, 12, 'cenital', { pointerEvents: false });
    }

    s += rdwcPlanFlowLegend(W - 168, 8);
    s += rdwcPlanAirHints(12, H - 14, cfg);

    /* Unión vertical entre cubos de la misma columna (misma x, filas consecutivas) */
    const byCol = {};
    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      const key = P.x.toFixed(0);
      if (!byCol[key]) byCol[key] = [];
      byCol[key].push(P);
    }
    Object.keys(byCol).forEach((key) => {
      const list = byCol[key].sort((a, b) => a.row - b.row);
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const b = list[i + 1];
        const d =
          'M ' +
          f1(a.x) +
          ' ' +
          f1(a.y + bucketR * 0.55) +
          ' L ' +
          f1(b.x) +
          ' ' +
          f1(b.y - bucketR * 0.55);
        s += rdwcPlanPipe(d, 'link', false, 4.2);
      }
    });

    /* Eje central: impulsión (depósito → abajo) y retorno (cubos → depósito) */
    const trunkBottom = gridBottom + bucketR * 0.35;
    s += rdwcPlanPipe('M ' + f1(trunkX) + ' ' + f1(tankBottom) + ' L ' + f1(trunkX) + ' ' + f1(trunkBottom), 'supply', ta, 3);
    s += rdwcPlanPipe('M ' + f1(trunkX) + ' ' + f1(gridTop - bucketR * 0.2) + ' L ' + f1(trunkX) + ' ' + f1(tankBottom - 4), 'return', ta, 3);

    /* Ramales por cubo + aire desde bomba sobre depósito */
    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      const supD =
        'M ' +
        f1(trunkX) +
        ' ' +
        f1(P.y) +
        ' L ' +
        f1(P.x) +
        ' ' +
        f1(P.y);
      const retD =
        'M ' +
        f1(P.x) +
        ' ' +
        f1(P.y - bucketR * 0.75) +
        ' L ' +
        f1(trunkX) +
        ' ' +
        f1(P.y - bucketR * 0.75);
      s += rdwcPlanPipe(supD, 'supply', ta, 2);
      s += rdwcPlanPipe(retD, 'return', ta, 2);
      s += rdwcPlanAirPath(
        'M ' +
          f1(trunkX) +
          ' ' +
          f1(tankBottom + 8) +
          ' L ' +
          f1(trunkX) +
          ' ' +
          f1(P.y) +
          ' L ' +
          f1(P.x) +
          ' ' +
          f1(P.y + bucketR * 0.35)
      );
    }

    if (RP) {
      s += RP.recircPump(trunkX, tankCy + tankR * 0.15, 11, '');
    }

    s += rdwcPlanRoundTank(cx, tankCy, tankR, pct, volLbl);
    s += rdwcPlanAirPumpOnTank(cx, tankCy, tankR, airLpm);

    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      s += rdwcPlanRoundBucket(P.x, P.y, bucketR, P.idx, ta);
      if (typeof siteInteractive === 'function') {
        s = siteInteractive(s, P.x, P.y, P.rn, P.c, rPot, cfg, P.idx, ta, tieneDifusor, 'plan');
      }
    }

    if (dist.rows >= 1) {
      for (let row = 0; row < dist.rows; row++) {
        const yMid = gridTop + row * rowStep;
        s +=
          '<text x="' +
          f1(gridLeft - bucketR - 14) +
          '" y="' +
          f1(yMid + 4) +
          '" font-size="9" fill="#64748b" font-family="system-ui,sans-serif" text-anchor="end" font-weight="600">fila ' +
          (row + 1) +
          '</text>';
      }
    }

    if (dist.cols >= 2) {
      s +=
        '<text x="' +
        f1(cx) +
        '" y="' +
        f1(H - 26) +
        '" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="system-ui,sans-serif" font-weight="600">' +
        dist.cols +
        ' cubos por fila · ' +
        dist.rows +
        ' filas</text>';
    }

    const title =
      'RDWC · ' +
      dist.sites +
      ' cubos · ' +
      dist.rows +
      ' filas · ' +
      volLbl +
      ' · recirc. ' +
      recLh +
      ' L/h';

    return (
      '<svg class="torre-svg-diagram rdwc-svg-diagram rdwc-svg-diagram--plan rdwc-svg-diagram--plan-balanced rdwc-svg-diagram--scada svg-centered-block" width="' +
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
