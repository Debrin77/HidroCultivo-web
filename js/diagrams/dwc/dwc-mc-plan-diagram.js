/**
 * Vista cenital DWC multiválvula — estilo visual RDWC, solo cubos + manguera de aire a difusora.
 * Independiente de rdwc-plan-diagram.js y de la galería RDWC (sin depósito ni tuberías de agua).
 */
(function (global) {
  'use strict';

  const PLAN_CHROME_H = 52;
  const C_AIR_RIM = '#166534';
  const C_AIR_BODY = '#22c55e';

  function f1(n) {
    return Number(n).toFixed(1);
  }

  function dwcMcPlanDefs() {
    return (
      '<defs>' +
      '<linearGradient id="dwcMcPlanBg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#fafaf9"/><stop offset="100%" stop-color="#e7e5e4"/>' +
      '</linearGradient>' +
      '<linearGradient id="dwcMcPlanWater" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#81d4fa"/><stop offset="100%" stop-color="#1565c0"/>' +
      '</linearGradient>' +
      '<linearGradient id="dwcMcPumpDome" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffb74d"/><stop offset="100%" stop-color="#ff9800"/>' +
      '</linearGradient>' +
      '</defs>'
    );
  }

  /** Cubo cenital (circular o prismático regular según forma seleccionada). */
  function dwcMcPlanBucket(cx, cy, r, ta, esPrismatico) {
    let o = '<g class="dwc-mc-plan-bucket" pointer-events="none" aria-hidden="true">';
    let stoneY = cy + r * 0.38;
    if (esPrismatico) {
      const side = r * 2;
      const x = cx - r;
      const y = cy - r;
      const inPad = 4;
      const corePad = r * 0.27;
      o +=
        '<rect x="' +
        f1(x) +
        '" y="' +
        f1(y) +
        '" width="' +
        f1(side) +
        '" height="' +
        f1(side) +
        '" rx="10" fill="#e8e4df" stroke="#78716c" stroke-width="2"/>' +
        '<rect x="' +
        f1(x + inPad) +
        '" y="' +
        f1(y + inPad) +
        '" width="' +
        f1(side - inPad * 2) +
        '" height="' +
        f1(side - inPad * 2) +
        '" rx="8" fill="url(#dwcMcPlanWater)" opacity="0.75"/>' +
        '<rect x="' +
        f1(x + corePad) +
        '" y="' +
        f1(y + corePad) +
        '" width="' +
        f1(side - corePad * 2) +
        '" height="' +
        f1(side - corePad * 2) +
        '" rx="8" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>' +
        '<rect x="' +
        f1(x + corePad + 4) +
        '" y="' +
        f1(y + corePad + 4) +
        '" width="' +
        f1(side - (corePad + 4) * 2) +
        '" height="' +
        f1(side - (corePad + 4) * 2) +
        '" rx="7" fill="#334155" opacity="0.35"/>';
      stoneY = cy + r * 0.42;
    } else {
      const rim = r * 0.7;
      const waterR = r - 4;
      o +=
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
        '" fill="url(#dwcMcPlanWater)" opacity="0.75"/>' +
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
    }
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
    return { svg: o, stoneX: cx, stoneY: stoneY };
  }

  function dwcMcPlanAirTube(d, sw, dashed) {
    const w = sw || 2.6;
    const dash = dashed === false ? '' : ' stroke-dasharray="6 4"';
    return (
      '<g class="dwc-mc-plan-air-tube">' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      C_AIR_RIM +
      '" stroke-width="' +
      (w + 1.6) +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      dash +
      '/>' +
      '<path d="' +
      d +
      '" fill="none" stroke="' +
      C_AIR_BODY +
      '" stroke-width="' +
      w +
      '" stroke-linecap="round" stroke-linejoin="round"' +
      dash +
      '/>' +
      '</g>'
    );
  }

  function dwcMcPlanAirColumnSpineX(ci, nCols, colCenters, bucketR, airPumpX) {
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
   * Aire en tramos rectos (ortogonal), igual que RDWC plan:
   * bomba ↓ raíl horizontal ↓ por columna → tramo horizontal → piedra en cada cubo.
   */
  function dwcMcPlanAirRoutes(positions, byCol, bucketR, airRailY, pumpOutX, pumpOutY, dist) {
    if (!positions.length) return '';
    let s = '';
    const sorted = positions.slice().sort((a, b) => a.x - b.x || a.col - b.col);
    let railX0 = sorted[0].x;
    let railX1 = sorted[sorted.length - 1].x;

    s += dwcMcPlanAirTube(
      'M ' + f1(pumpOutX) + ' ' + f1(pumpOutY) + ' L ' + f1(pumpOutX) + ' ' + f1(airRailY),
      2.8
    );
    if (dist.sites <= 1) {
      const P = sorted[0];
      const entryY = P.y + bucketR * 0.48;
      s += dwcMcPlanAirTube('M ' + f1(P.x) + ' ' + f1(airRailY) + ' L ' + f1(P.x) + ' ' + f1(entryY), 2.3);
      const mainRailD =
        railX1 - railX0 > 2
          ? 'M ' + f1(railX0) + ' ' + f1(airRailY) + ' L ' + f1(railX1) + ' ' + f1(airRailY)
          : '';
      if (mainRailD) s += dwcMcPlanAirTube(mainRailD, 2.8);
      return s;
    }

    if (dist.rows <= 1) {
      for (let i = 0; i < sorted.length; i++) {
        const P = sorted[i];
        const entryY = P.y + bucketR * 0.48;
        s += dwcMcPlanAirTube('M ' + f1(P.x) + ' ' + f1(airRailY) + ' L ' + f1(P.x) + ' ' + f1(entryY), 2.3);
      }
      const mainRailD =
        railX1 - railX0 > 2
          ? 'M ' + f1(railX0) + ' ' + f1(airRailY) + ' L ' + f1(railX1) + ' ' + f1(airRailY)
          : '';
      if (mainRailD) s += dwcMcPlanAirTube(mainRailD, 2.8);
      return s;
    }

    // Excepción solicitada: SOLO para 7 recipientes.
    // Fila superior desde línea superior; fila inferior desde bajada izquierda por línea inferior separada.
    if (dist.sites === 7 && dist.rows === 2) {
      const topBuckets = sorted.filter((p) => p.row === 0).sort((a, b) => a.x - b.x);
      const lowerBuckets = sorted.filter((p) => p.row > 0).sort((a, b) => a.x - b.x);
      if (topBuckets.length) {
        railX0 = Math.min(railX0, topBuckets[0].x - bucketR * 0.95);
        // En 7 cubos no debe sobrepasar el último punto de suministro superior.
        railX1 = topBuckets[topBuckets.length - 1].x;
      }
      const mainRailD =
        railX1 - railX0 > 2
          ? 'M ' + f1(railX0) + ' ' + f1(airRailY) + ' L ' + f1(railX1) + ' ' + f1(airRailY)
          : '';
      if (mainRailD) s += dwcMcPlanAirTube(mainRailD, 2.8);

      // Arriba: suministro solo desde la línea superior.
      for (let i = 0; i < topBuckets.length; i++) {
        const P = topBuckets[i];
        const entryY = P.y + bucketR * 0.48;
        s += dwcMcPlanAirTube('M ' + f1(P.x) + ' ' + f1(airRailY) + ' L ' + f1(P.x) + ' ' + f1(entryY), 2.25);
      }

      // Abajo: bajada izquierda + reparto inferior separado de recipientes.
      if (lowerBuckets.length) {
        const leftFeedX = railX0;
        let maxLowerEntryY = lowerBuckets[0].y + bucketR * 0.48;
        let maxLowerBottomY = lowerBuckets[0].y + bucketR;
        let maxLowerX = lowerBuckets[0].x;
        for (let i = 1; i < lowerBuckets.length; i++) {
          maxLowerEntryY = Math.max(maxLowerEntryY, lowerBuckets[i].y + bucketR * 0.48);
          maxLowerBottomY = Math.max(maxLowerBottomY, lowerBuckets[i].y + bucketR);
          maxLowerX = Math.max(maxLowerX, lowerBuckets[i].x);
        }
        // La línea inferior debe quedar por debajo de los recipientes.
        const lowerRailY = maxLowerBottomY + Math.max(12, bucketR * 0.28);
        const lowerRailX1 = maxLowerX + bucketR * 0.25;
        s += dwcMcPlanAirTube(
          'M ' + f1(leftFeedX) + ' ' + f1(airRailY) + ' L ' + f1(leftFeedX) + ' ' + f1(lowerRailY),
          2.3
        );
        s += dwcMcPlanAirTube(
          'M ' + f1(leftFeedX) + ' ' + f1(lowerRailY) + ' L ' + f1(lowerRailX1) + ' ' + f1(lowerRailY),
          2.3
        );
        for (let i = 0; i < lowerBuckets.length; i++) {
          const P = lowerBuckets[i];
          const entryY = P.y + bucketR * 0.48;
          s += dwcMcPlanAirTube('M ' + f1(P.x) + ' ' + f1(lowerRailY) + ' L ' + f1(P.x) + ' ' + f1(entryY), 2.2);
        }
      }
      return s;
    }

    const colKeys = Object.keys(byCol)
      .map(Number)
      .sort((a, b) => a - b);
    const colCenters = colKeys.map((ck) => byCol[ck][0].x);
    const nCols = colKeys.length;
    if (dist.rows > 1 && nCols > 0) {
      const spineXs = [];
      for (let ci = 0; ci < colKeys.length; ci++) {
        const sx = dwcMcPlanAirColumnSpineX(ci, nCols, colCenters, bucketR, pumpOutX);
        spineXs.push(sx);
      }
      railX0 = Math.min(railX0, ...spineXs);
      railX1 = Math.max(railX1, ...spineXs);
    }
    for (let ci = 0; ci < colKeys.length; ci++) {
      const ck = colKeys[ci];
      const list = byCol[ck].sort((a, b) => a.row - b.row);
      if (!list.length) continue;
      const spineX = dwcMcPlanAirColumnSpineX(ci, nCols, colCenters, bucketR, pumpOutX);
      const spineSign = spineX < list[0].x ? -1 : 1;
      const top = list[0];
      const topEntryY = top.y + bucketR * 0.48;
      s += dwcMcPlanAirTube('M ' + f1(spineX) + ' ' + f1(airRailY) + ' L ' + f1(spineX) + ' ' + f1(topEntryY), 2.3);
      const hasLower = list.length > 1;
      let lowerRailY = null;
      if (hasLower) {
        let maxY = topEntryY;
        for (let li = 1; li < list.length; li++) {
          maxY = Math.max(maxY, list[li].y + bucketR * 0.48);
        }
        lowerRailY = maxY + Math.max(10, bucketR * 0.22);
        s += dwcMcPlanAirTube(
          'M ' + f1(spineX) + ' ' + f1(airRailY) + ' L ' + f1(spineX) + ' ' + f1(lowerRailY),
          2.3
        );
      }
      for (let i = 0; i < list.length; i++) {
        const P = list[i];
        const entryX = P.x + spineSign * bucketR * 0.42;
        const entryY = P.y + bucketR * 0.48;
        if (i === 0) {
          s += dwcMcPlanAirTube(
            'M ' + f1(spineX) + ' ' + f1(entryY) + ' L ' + f1(entryX) + ' ' + f1(entryY),
            2.2
          );
        } else if (lowerRailY != null) {
          s += dwcMcPlanAirTube(
            'M ' + f1(spineX) + ' ' + f1(lowerRailY) + ' L ' + f1(entryX) + ' ' + f1(lowerRailY) + ' L ' + f1(entryX) + ' ' + f1(entryY),
            2.2
          );
        }
      }
    }
    const mainRailD =
      railX1 - railX0 > 2
        ? 'M ' + f1(railX0) + ' ' + f1(airRailY) + ' L ' + f1(railX1) + ' ' + f1(airRailY)
        : '';
    if (mainRailD) s += dwcMcPlanAirTube(mainRailD, 2.8);
    return s;
  }

  function dwcMcPlanAirPumpBadge(cx, cy, lpm) {
    const w = 56;
    const h = 40;
    const px = cx - w / 2;
    const py = cy - h / 2;
    const outX = cx;
    const outY = py + h - 1;
    const svg =
      '<g class="dwc-mc-air-badge" pointer-events="none" aria-hidden="true">' +
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(py + h + 6) +
      '" rx="20" ry="4.5" fill="rgba(15,23,42,0.14)"/>' +
      '<rect x="' +
      f1(px + 4) +
      '" y="' +
      f1(py + 15) +
      '" width="' +
      f1(w - 8) +
      '" height="' +
      f1(h - 11) +
      '" rx="5" fill="#37474f" stroke="#1e293b" stroke-width="1.8"/>' +
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(py + 12) +
      '" rx="' +
      f1((w - 10) / 2) +
      '" ry="13" fill="url(#dwcMcPumpDome)" stroke="#e65100" stroke-width="2"/>' +
      '<ellipse cx="' +
      f1(cx - 8) +
      '" cy="' +
      f1(py + 8) +
      '" rx="7" ry="3" fill="rgba(255,255,255,0.45)"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(py + h * 0.52) +
      '" r="9" fill="#eceff1" stroke="#78909c" stroke-width="1.2"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(py + h * 0.52) +
      '" r="4.5" fill="none" stroke="#90a4ae" stroke-width="0.9"/>' +
      '<rect x="' +
      f1(cx - 31) +
      '" y="' +
      f1(py - 27) +
      '" width="62" height="20" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>' +
      '<text x="' +
      f1(cx) +
      '" y="' +
      f1(py - 13) +
      '" text-anchor="middle" font-size="9" font-weight="800" fill="#14532d" font-family="system-ui,sans-serif">AIRE</text>' +
      '</g>';
    return { svg: svg, outX: outX, outY: outY };
  }

  function dwcMcPlanChrome(W) {
    let o = '<g class="dwc-mc-plan-chrome" pointer-events="none" aria-hidden="true">';
    if (typeof hcDiagramViewLabelSvg === 'function') {
      o += hcDiagramViewLabelSvg(10, 18, 'cenital', { pointerEvents: false, anchor: 'start' });
    }
    o +=
      '<text x="' +
      (W - 12) +
      '" y="14" text-anchor="end" font-size="8" font-weight="600" fill="#166534" font-family="system-ui,sans-serif">Solo aire · multiválvula</text>';
    o += '</g>';
    return o;
  }

  function dwcMcPlanRowsLabel(x, y, rows) {
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

  /** Maceta interactiva sobre el cubo (índice de cubo = c, fila siempre 0). */
  function dwcMcSiteInteractive(s, x, y, c, rPot, cfg, idx, ta) {
    const rn = 0;
    const dat =
      typeof state !== 'undefined' && state.torre && state.torre[rn] && state.torre[rn][c]
        ? state.torre[rn][c]
        : { variedad: '', fecha: '', fotos: [] };
    const dias = dat.fecha && typeof torreDiasCicloVisual === 'function' ? torreDiasCicloVisual(dat) : 0;
    const est = dat.variedad && typeof getEstado === 'function' ? getEstado(dat.variedad, dias) : '';
    const diasBase = typeof DIAS_COSECHA !== 'undefined' ? DIAS_COSECHA[dat.variedad] || 50 : 50;
    const diasT =
      typeof torreGetDiasCosechaObjetivo === 'function'
        ? torreGetDiasCosechaObjetivo(diasBase, cfg)
        : diasBase;
    const pctC = dat.variedad ? Math.min(100, Math.round((dias / diasT) * 100)) : 0;
    let fill = '#f8fafc';
    let stroke = '#94a3b8';
    let phaseEmoji = '';
    if (dat.variedad) {
      if (est === 'plantula') {
        fill = '#eff6ff';
        stroke = '#2563eb';
      } else if (est === 'crecimiento') {
        fill = '#f0fdf4';
        stroke = '#15803d';
      } else if (est === 'madurez') {
        fill = '#fffbeb';
        stroke = '#b45309';
      } else {
        fill = '#faf5ff';
        stroke = '#7c3aed';
      }
      if (typeof getEmoji === 'function') phaseEmoji = getEmoji(est) || '';
    }
    const cult = dat.variedad && typeof getCultivoDB === 'function' ? getCultivoDB(dat.variedad) : null;
    const cultEmoji = cult && cult.emoji ? String(cult.emoji) : '';
    const titLista =
      dat.variedad && typeof cultivoNombreLista === 'function'
        ? cultivoNombreLista(cult, dat.variedad)
        : dat.variedad || 'Vacío';
    const isSelected = !!(window.editingCesta && editingCesta.nivel === rn && editingCesta.cesta === c);
    const multiKey = rn + ',' + c;
    const isMultiSel =
      typeof torreInteraccionModo !== 'undefined' &&
      torreInteraccionModo === 'asignar' &&
      typeof torreCestasMultiSel !== 'undefined' &&
      torreCestasMultiSel.has(multiKey);
    const fotos = (dat.fotos || []).filter((f) => f && f.data);
    const ultimaFoto = fotos.length > 0 ? fotos[fotos.length - 1] : null;
    const clipId = 'dwc_mc_clip_' + idx;
    const ariaMod =
      typeof escAriaAttr === 'function'
        ? escAriaAttr(
            'Cubo DWC ' +
              (idx + 1) +
              ', ' +
              titLista +
              (dias ? ', día ' + dias : '') +
              '. Pulsa para ficha.'
          )
        : 'Cubo ' + (idx + 1);

    s += `<g data-n="${rn}" data-c="${c}" class="hc-cesta hc-cesta--interactive dwc-mc-mod-hit" role="button" tabindex="0" aria-label="${ariaMod}">`;
    if (dat.variedad) {
      s += `<circle cx="${x}" cy="${y}" r="${rPot.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="2" opacity="0.92"/>`;
    }
    if (isMultiSel) {
      s += `<circle cx="${x}" cy="${y}" r="${(rPot + 5).toFixed(1)}" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="4 3" opacity="0.95"/>`;
    }
    if (isSelected) {
      s += `<circle cx="${x}" cy="${y}" r="${(rPot + 4).toFixed(1)}" fill="none" stroke="#22c55e" stroke-width="2.4" opacity="0.95"/>`;
    }
    if (ultimaFoto?.data) {
      s += `<defs><clipPath id="${clipId}"><circle cx="${x}" cy="${y}" r="${rPot.toFixed(1)}"/></clipPath></defs>`;
      s += `<image href="${ultimaFoto.data}" x="${(x - rPot).toFixed(1)}" y="${(y - rPot).toFixed(1)}" width="${(rPot * 2).toFixed(1)}" height="${(rPot * 2).toFixed(1)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" opacity="0.88"/>`;
    }
    if (pctC > 0 && pctC < 100 && dat.variedad) {
      const r2 = rPot + 4;
      const ang2 = (pctC / 100) * 2 * Math.PI - Math.PI / 2;
      s += `<path d="M${(x + r2 * Math.cos(-Math.PI / 2)).toFixed(1)},${(y + r2 * Math.sin(-Math.PI / 2)).toFixed(1)} A${r2},${r2} 0 ${pctC > 50 ? 1 : 0},1 ${(x + r2 * Math.cos(ang2)).toFixed(1)},${(y + r2 * Math.sin(ang2)).toFixed(1)}"
        fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>`;
    }
    const emoFs = Math.min(16, Math.max(11, rPot * 0.88));
    if (cultEmoji || phaseEmoji) {
      s += `<text x="${x}" y="${(y - 1).toFixed(1)}" text-anchor="middle" font-size="${emoFs.toFixed(1)}" dominant-baseline="middle">${cultEmoji || phaseEmoji}</text>`;
    }
    if (dias > 0 && dat.variedad) {
      s += `<text x="${x}" y="${(y + rPot - 7).toFixed(1)}" font-family="Inconsolata,monospace" font-size="8" font-weight="700" fill="${stroke}" text-anchor="middle">${dias}d</text>`;
    }
    const hitMult =
      window.innerWidth < 768 ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
        ? 1.95
        : 1.55;
    s += `<circle cx="${x}" cy="${y}" r="${(rPot * hitMult).toFixed(1)}" fill="rgba(0,0,0,0)" class="hc-cesta-hit" pointer-events="all"/>`;
    s += '</g>';
    return s;
  }

  /**
   * @param {object} cfg
   * @param {function} [siteInteractive]
   */
  function renderDwcMcPlan(cfg, siteInteractive) {
    const c = cfg || {};
    const forma = typeof dwcNormalizeDepositoForma === 'function' ? dwcNormalizeDepositoForma(c.dwcDepositoForma) : c.dwcDepositoForma;
    const esPrismatico = forma === 'prismatico' || forma === 'prismatico_regular';
    const S =
      typeof dwcGetNumCubosIndependientes === 'function'
        ? Math.max(1, dwcGetNumCubosIndependientes(c))
        : Math.max(1, parseInt(String(c.numNiveles || 1), 10) || 1);
    const dist =
      typeof hcDistribuirCubosMultivalvula === 'function'
        ? hcDistribuirCubosMultivalvula(S)
        : { sites: S, rows: 1, cols: S, colsPerRow: [S], grid: null };
    const spacingCm = 45;
    const colStep = Math.min(138, Math.max(96, spacingCm * 1.35));
    const rowStep = Math.min(105, Math.max(78, spacingCm * 1));
    const bucketR = Math.max(26, Math.min(38, 36 - dist.cols * 0.8));
    const marginX = 56;
    const gridW = (dist.cols - 1) * colStep;
    const gridH = (dist.rows - 1) * rowStep;
    const W = Math.min(720, Math.max(400, marginX * 2 + gridW + bucketR * 2 + 24));
    const cx = W / 2;
    const gridTop = PLAN_CHROME_H + 72;
    const H = gridTop + gridH + bucketR * 2 + 36;
    const ta = typeof torreSvgAnimacionesActivas === 'function' && torreSvgAnimacionesActivas();
    const tieneDifusor = c.equipamiento?.includes?.('difusor') ?? true;
    const airLpm =
      typeof dwcRecomendacionDifusorCompletaDesdeConfig === 'function'
        ? Math.round(Number(dwcRecomendacionDifusorCompletaDesdeConfig(c)?.lpmSug) || 20)
        : 20;
    const volPerCubo =
      typeof dwcLitrosUtilesPorCuboMultivalvula === 'function' ? dwcLitrosUtilesPorCuboMultivalvula(c) : null;
    const volLbl =
      volPerCubo != null && Number.isFinite(volPerCubo)
        ? Math.round(volPerCubo * 10) / 10 + ' L/cubo'
        : typeof getVolumenMezclaLitros === 'function' && Number.isFinite(getVolumenMezclaLitros(c))
          ? Math.round(getVolumenMezclaLitros(c) * 10) / 10 + ' L/cubo'
          : '—';

    const positions = [];
    if (dist.grid && dist.grid.length) {
      for (let gi = 0; gi < dist.grid.length; gi++) {
        const g = dist.grid[gi];
        const rowW = (g.colsInRow - 1) * colStep;
        const rowLeft = cx - rowW / 2;
        positions.push({
          x: rowLeft + g.col * colStep,
          y: gridTop + g.row * rowStep,
          rn: g.row,
          c: g.col,
          idx: g.idx,
          row: g.row,
          col: g.col,
        });
      }
    } else if (typeof hcDwcMcComputePositions === 'function') {
      const lay = hcDwcMcComputePositions(dist, W, PLAN_CHROME_H, bucketR * 2, 14);
      for (let i = 0; i < lay.positions.length; i++) {
        const p = lay.positions[i];
        positions.push({ x: p.cx, y: p.cy, rn: p.row, c: p.col, idx: p.idx, row: p.row, col: p.col });
      }
    }

    const byCol = {};
    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      if (!byCol[P.col]) byCol[P.col] = [];
      byCol[P.col].push(P);
    }

    const airRailY = gridTop - bucketR - 10;
    const airBadgeY = airRailY - 34;
    const pumpOutX = cx;
    const pumpOutY = airBadgeY + 24;

    let s = dwcMcPlanDefs();
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#dwcMcPlanBg)"/>';
    s += dwcMcPlanChrome(W);

    if (dist.rows >= 2) {
      s += dwcMcPlanRowsLabel(22, gridTop + gridH / 2, dist.rows);
    }

    const rPot = bucketR * 0.7;
    s += '<g class="dwc-mc-plan-buckets">';
    for (let pi = 0; pi < positions.length; pi++) {
      const P = positions[pi];
      s += dwcMcPlanBucket(P.x, P.y, bucketR, ta, esPrismatico).svg;
      if (typeof siteInteractive === 'function') {
        try {
          s = siteInteractive(s, P.x, P.y, P.idx, rPot, c, P.idx, ta);
        } catch (e) {
          try {
            console.warn('dwcMcSiteInteractive', e);
          } catch (_) {}
        }
      }
    }
    s += '</g>';

    s += '<g class="dwc-mc-plan-air" aria-hidden="true">';
    if (tieneDifusor) {
      const pump = dwcMcPlanAirPumpBadge(cx, airBadgeY, airLpm);
      s += pump.svg;
      s += dwcMcPlanAirRoutes(
        positions,
        byCol,
        bucketR,
        airRailY,
        pump.outX != null ? pump.outX : pumpOutX,
        pump.outY != null ? pump.outY : pumpOutY,
        dist
      );
    }
    s += '</g>';

    if (volLbl && typeof hcDiagramVolLabelSvg === 'function') {
      s += hcDiagramVolLabelSvg(cx, H - 14, volLbl, { fontSize: 11, pointerEvents: false });
    } else if (volLbl) {
      s +=
        '<text x="' +
        cx +
        '" y="' +
        (H - 14) +
        '" text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1" font-family="Syne,sans-serif">' +
        volLbl +
        '</text>';
    }

    const title =
      'DWC multiválvula · ' +
      S +
      ' cubo' +
      (S === 1 ? '' : 's') +
      ' · ' +
      dist.rows +
      (dist.rows === 1 ? ' fila' : ' filas') +
      ' · vista cenital · solo aire';

    return (
      '<svg class="torre-svg-diagram dwc-svg-diagram dwc-svg-diagram--multicubo dwc-svg-diagram--mc-plan svg-centered-block" data-hc-dwc-mc-plan="v2" width="' +
      W +
      '" height="' +
      H +
      '" viewBox="0 0 ' +
      W +
      ' ' +
      H +
      '" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dwcMcPlanTitle">' +
      '<title id="dwcMcPlanTitle">' +
      title.replace(/&/g, '&amp;').replace(/</g, '&lt;') +
      '</title>' +
      s +
      '</svg>'
    );
  }

  global.renderDwcMcPlan = renderDwcMcPlan;
  global.dwcMcSiteInteractive = dwcMcSiteInteractive;
})(typeof window !== 'undefined' ? window : globalThis);
