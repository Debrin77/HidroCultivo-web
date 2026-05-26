/**
 * Vista cenital RDWC — depósito de control, filas de cubos, impulsión/retorno y aire por cubo.
 * Referencia visual: manual kit modular RDWC (sin marcas).
 */
(function (global) {
  'use strict';

  const RP = typeof rdwcScadaParts !== 'undefined' ? rdwcScadaParts : null;

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

  function rdwcPlanFlowLegend(x, y) {
    return (
      '<g class="rdwc-plan-legend" transform="translate(' +
      x +
      ',' +
      y +
      ')" pointer-events="none" aria-hidden="true">' +
      '<line x1="0" y1="6" x2="22" y2="6" stroke="#16a34a" stroke-width="2.8" stroke-linecap="round"/>' +
      '<text x="26" y="9" font-size="9.5" fill="#166534" font-family="system-ui,sans-serif" font-weight="600">Impulsión (depósito → cubos)</text>' +
      '<line x1="0" y1="22" x2="22" y2="22" stroke="#2563eb" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="5 4"/>' +
      '<text x="26" y="25" font-size="9.5" fill="#1e40af" font-family="system-ui,sans-serif" font-weight="600">Retorno (cubos → depósito)</text>' +
      '<line x1="0" y1="38" x2="22" y2="38" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 3"/>' +
      '<text x="26" y="41" font-size="9.5" fill="#9a3412" font-family="system-ui,sans-serif" font-weight="600">Aire · piedra en cada cubo</text>' +
      '</g>'
    );
  }

  function rdwcPlanAirStone(cx, cy, ta) {
    const bub =
      ta && RP
        ? '<circle cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="2.2" fill="#7dd3fc" opacity="0.85"><animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite"/></circle>'
        : '<circle cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="2.2" fill="#7dd3fc" opacity="0.75"/>';
    return (
      '<g class="rdwc-air-stone" pointer-events="none" aria-hidden="true">' +
      '<ellipse cx="' +
      cx +
      '" cy="' +
      (cy + 1) +
      '" rx="5.5" ry="3.2" fill="#475569" stroke="#334155" stroke-width="0.9"/>' +
      bub +
      '</g>'
    );
  }

  function rdwcPlanAirPump(x, y, lpm, ta) {
    const lbl = Math.round(lpm) + ' L/min';
    return (
      '<g class="rdwc-air-pump" pointer-events="none" aria-hidden="true">' +
      '<rect x="' +
      (x - 18) +
      '" y="' +
      (y - 10) +
      '" width="36" height="20" rx="5" fill="#fff7ed" stroke="#ea580c" stroke-width="1.2"/>' +
      '<text x="' +
      x +
      '" y="' +
      (y + 1) +
      '" text-anchor="middle" font-size="7.5" font-weight="700" fill="#9a3412" font-family="system-ui,sans-serif">AIRE</text>' +
      '<text x="' +
      x +
      '" y="' +
      (y + 9) +
      '" text-anchor="middle" font-size="6.5" fill="#c2410c" font-family="system-ui,sans-serif">' +
      lbl +
      '</text>' +
      '</g>'
    );
  }

  /**
   * @param {object} cfg config torre RDWC
   * @param {function} siteInteractive fn(s, x, y, rn, c, rPot, cfg, idx, ta, dif, layout) -> string
   */
  function renderRdwcPlan(cfg, siteInteractive) {
    const dist = rdwcPlanDistribuir(cfg.rdwcSites, cfg.rdwcRows);
    const spacingCm = Math.max(20, Math.min(150, Number(cfg.rdwcCenterSpacingCm) || 45));
    const spacingPx = Math.min(72, Math.max(44, spacingCm * 1.05));
    const W = Math.min(720, Math.max(480, 120 + dist.cols * spacingPx));
    const headerH = 58;
    const tankH = 78;
    const tankGap = 24;
    const gridTop = headerH + 8;
    const gridH = dist.rows * spacingPx * 0.92;
    const H = gridTop + gridH + tankGap + tankH + 36;
    const cx = W / 2;
    const tankW = Math.min(220, Math.max(140, dist.cols * spacingPx * 0.55));
    const tankX = cx - tankW / 2;
    const tankY = H - tankH - 18;
    const supY = gridTop - 6;
    const retY = gridTop + gridH + 10;
    const airY = supY - 28;
    const volMax = typeof getVolumenDepositoMaxLitros === 'function' ? getVolumenDepositoMaxLitros(cfg) : null;
    const volMez = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : null;
    const pct =
      Number.isFinite(volMax) && Number.isFinite(volMez) && volMax > 0
        ? Math.max(0, Math.min(1, volMez / volMax))
        : 0.6;
    const ta = typeof torreSvgAnimacionesActivas === 'function' && torreSvgAnimacionesActivas();
    const tieneDifusor = cfg.equipamiento?.includes?.('difusor') ?? true;
    const tieneCalentador = cfg.equipamiento?.includes?.('calentador') ?? true;
    const volLbl = Number.isFinite(volMez) ? Math.round(volMez * 10) / 10 + ' L mezcla' : '—';
    const recLh = Math.round(Number(cfg.rdwcRecirculationLh) || 1200);
    const airLpm = Math.round(Number(cfg.rdwcAirLpm) || 20);
    const rPot = Math.max(14, Math.min(24, spacingPx * 0.28));
    const gridW = (dist.cols - 1) * spacingPx;
    const gridLeft = cx - gridW / 2;
    const colsCfg =
      typeof rdwcColsFromSitesRows === 'function'
        ? rdwcColsFromSitesRows(dist.sites, dist.rows)
        : dist.cols;

    const positions = [];
    for (let gi = 0; gi < dist.grid.length; gi++) {
      const g = dist.grid[gi];
      const rowW = (g.colsInRow - 1) * spacingPx;
      const rowLeft = cx - rowW / 2;
      const x = rowLeft + g.col * spacingPx;
      const y = gridTop + g.row * spacingPx * 0.92 + spacingPx * 0.46;
      const rn = Math.floor(g.idx / colsCfg);
      const c = g.idx % colsCfg;
      positions.push({ x: x, y: y, rn: rn, c: c, idx: g.idx, row: g.row });
    }

    let s = '';
    if (typeof global.rdwcScadaDefs === 'function') {
      s += global.rdwcScadaDefs();
    } else if (typeof rdwcScadaDefs === 'function') {
      s += rdwcScadaDefs();
    } else {
      s +=
        '<defs><linearGradient id="rdwcScadaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5f6f8"/><stop offset="100%" stop-color="#e4e7eb"/></linearGradient></defs>';
    }
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#rdwcScadaBg)"/>';

    if (typeof hcDiagramViewLabelSvg === 'function') {
      s += hcDiagramViewLabelSvg(W / 2, 14, 'cenital', { pointerEvents: false });
    }
    if (typeof hcDiagramVolLabelSvg === 'function') {
      s += hcDiagramVolLabelSvg(W / 2, 30, volLbl, { fontSize: 11, pointerEvents: false });
    }
    s += rdwcPlanFlowLegend(12, headerH - 4);

    const manL = gridLeft - 8;
    const manR = gridLeft + gridW + 8;
    if (RP) {
      s += RP.supplyPath('M ' + manL + ' ' + supY + ' L ' + manR + ' ' + supY, ta, 2.8);
      s += RP.returnPath('M ' + manL + ' ' + retY + ' L ' + manR + ' ' + retY, ta, 2.8);
      s += RP.flowArrowSupply(manL + 36, supY, manR - 36, supY, ta);
      s += RP.flowArrowReturn(manR - 40, retY, manL + 40, retY, ta);
    } else {
      s +=
        '<line x1="' + manL + '" y1="' + supY + '" x2="' + manR + '" y2="' + supY + '" stroke="#16a34a" stroke-width="2.6"/>' +
        '<line x1="' + manL + '" y1="' + retY + '" x2="' + manR + '" y2="' + retY + '" stroke="#2563eb" stroke-width="2.6" stroke-dasharray="6 4"/>';
    }

    s += rdwcPlanAirPump(cx, airY - 4, airLpm, ta);
    const airMainY = airY + 14;
    s +=
      '<line x1="' +
      manL +
      '" y1="' +
      airMainY +
      '" x2="' +
      manR +
      '" y2="' +
      airMainY +
      '" stroke="#ea580c" stroke-width="1.8" stroke-dasharray="4 3" opacity="0.9"/>';

    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      if (RP) {
        s += RP.supplyPath('M ' + P.x.toFixed(1) + ' ' + supY + ' L ' + P.x.toFixed(1) + ' ' + (P.y - rPot - 6).toFixed(1), ta, 1.5);
        s += RP.returnPath('M ' + P.x.toFixed(1) + ' ' + (P.y + rPot + 6).toFixed(1) + ' L ' + P.x.toFixed(1) + ' ' + retY, ta, 1.5);
        s +=
          '<path d="M ' +
          P.x.toFixed(1) +
          ' ' +
          airMainY +
          ' L ' +
          P.x.toFixed(1) +
          ' ' +
          (P.y + rPot * 0.35).toFixed(1) +
          '" fill="none" stroke="#fb923c" stroke-width="1.3" stroke-dasharray="3 2" opacity="0.85"/>';
      }
      s += rdwcPlanAirStone(P.x, P.y + rPot * 0.55, ta);
      if (typeof siteInteractive === 'function') {
        s = siteInteractive(s, P.x, P.y, P.rn, P.c, rPot, cfg, P.idx, ta, tieneDifusor, 'plan');
      }
    }

    const pumpX = cx;
    const pumpY = tankY + tankH * 0.42;
    if (RP) {
      s += RP.supplyPath(
        'M ' + pumpX.toFixed(1) + ' ' + (tankY + 12) + ' L ' + pumpX.toFixed(1) + ' ' + supY,
        ta,
        2.2
      );
      s += RP.returnPath('M ' + pumpX.toFixed(1) + ' ' + retY + ' L ' + pumpX.toFixed(1) + ' ' + (tankY + tankH - 10), ta, 2.2);
      s += RP.recircPump(pumpX, pumpY, 12, 'RECIRC');
      s += RP.controlTank(tankX, tankY, tankW, tankH, pct, tieneCalentador, tieneDifusor, ta, volLbl);
    } else {
      s +=
        '<rect x="' + tankX + '" y="' + tankY + '" width="' + tankW + '" height="' + tankH + '" rx="12" fill="#dbeafe" stroke="#475569"/>';
    }

    if (dist.rows >= 2) {
      s +=
        '<text x="' +
        (gridLeft - 4) +
        '" y="' +
        (gridTop + spacingPx * 0.5) +
        '" font-size="9" fill="#64748b" font-family="system-ui,sans-serif" text-anchor="end">fila 1</text>' +
        '<text x="' +
        (gridLeft - 4) +
        '" y="' +
        (gridTop + (dist.rows - 0.5) * spacingPx * 0.92) +
        '" font-size="9" fill="#64748b" font-family="system-ui,sans-serif" text-anchor="end">fila ' +
        dist.rows +
        '</text>';
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
      '<svg class="torre-svg-diagram rdwc-svg-diagram rdwc-svg-diagram--plan rdwc-svg-diagram--scada svg-centered-block" width="' +
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
