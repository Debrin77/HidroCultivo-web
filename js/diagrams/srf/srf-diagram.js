/**
 * Motor gráfico SRF SCADA — balsa flotante + estanque.
 */
(function (global) {
  'use strict';

  const SP = typeof srfScadaParts !== 'undefined' ? srfScadaParts : null;

  function srfScadaDefs() {
    return (
      '<defs>' +
      '<linearGradient id="srfScadaBg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#ecfdf5"/>' +
      '<stop offset="42%" stop-color="#f0f9ff"/>' +
      '<stop offset="100%" stop-color="#fef9c3"/>' +
      '</linearGradient>' +
      '<linearGradient id="srfWater" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#7dd3fc"/>' +
      '<stop offset="40%" stop-color="#38bdf8"/>' +
      '<stop offset="100%" stop-color="#0369a1"/>' +
      '</linearGradient>' +
      '<linearGradient id="srfWaterShine" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#e0f2fe" stop-opacity="0"/>' +
      '<stop offset="50%" stop-color="#ffffff" stop-opacity="0.45"/>' +
      '<stop offset="100%" stop-color="#e0f2fe" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="srfRaft" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff"/>' +
      '<stop offset="55%" stop-color="#e0f2fe"/>' +
      '<stop offset="100%" stop-color="#bae6fd"/>' +
      '</linearGradient>' +
      '<linearGradient id="srfTankInner" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#f8fafc"/>' +
      '<stop offset="100%" stop-color="#e2e8f0"/>' +
      '</linearGradient>' +
      '<linearGradient id="srfKratkyAir" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#fef9c3"/>' +
      '<stop offset="100%" stop-color="#e0f2fe"/>' +
      '</linearGradient>' +
      '<filter id="srfSoftShadow" x="-15%" y="-15%" width="130%" height="130%">' +
      '<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0c4a6e" flood-opacity="0.16"/>' +
      '</filter>' +
      '<filter id="srfPotShadow" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#15803d" flood-opacity="0.22"/>' +
      '</filter>' +
      '</defs>'
    );
  }

  function srfTok() {
    if (typeof HC_DIAG !== 'undefined' && HC_DIAG.srfScada) return HC_DIAG.srfScada;
    return typeof SRF_SCADA !== 'undefined' ? SRF_SCADA : {};
  }

  function buildSrfDiagramSvg(cfg, torre, opts) {
    opts = opts || {};
    const prevCfg = typeof state !== 'undefined' ? state.configTorre : null;
    const prevTorre = typeof state !== 'undefined' ? state.torre : null;
    const c = cfg || (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    if (typeof state !== 'undefined') {
      state.configTorre = c;
      if (torre) state.torre = torre;
    }
    if (typeof srfEnsureConfigDefaults === 'function') srfEnsureConfigDefaults(c);
    try {
      return renderSrfScada(c);
    } finally {
      if (typeof state !== 'undefined') {
        state.configTorre = prevCfg;
        state.torre = prevTorre;
      }
    }
  }

  function renderSrfScada(cfg) {
    const grid =
      typeof srfDistribuirPlantas === 'function'
        ? srfDistribuirPlantas(cfg)
        : typeof hcDistribuirFilasColumnas === 'function'
          ? hcDistribuirFilasColumnas(Math.max(1, (cfg.numNiveles || 1) * (cfg.numCestas || 1)), 8)
          : { rows: 2, cols: 4, total: 8 };
    const N = grid.rows;
    const C = grid.cols;
    const n = grid.total;
    const modoOx =
      typeof srfNormalizeOxigenacionModo === 'function' ? srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo) : 'aireador';
    const esKratky = modoOx === 'kratky';
    const circ = !esKratky && cfg.srfCirculante !== false;
    const volMax =
      typeof srfCapacidadLitrosDesdeConfig === 'function' ? srfCapacidadLitrosDesdeConfig(cfg) : getVolumenDepositoMaxLitros(cfg);
    const volSeg =
      typeof srfVolumenSeguroLitrosDesdeConfig === 'function' ? srfVolumenSeguroLitrosDesdeConfig(cfg) : null;
    const volMezRaw = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : volMax;
    const volMez = volSeg != null && volSeg > 0 ? volSeg : volMezRaw;
    const volPct =
      volMax != null && volMez != null && Number.isFinite(volMax) && Number.isFinite(volMez) && volMax > 0
        ? Math.min(1, Math.max(0, volMez / volMax))
        : 0.65;
    const volPer =
      typeof srfLitrosPorPlanta === 'function'
        ? srfLitrosPorPlanta(cfg)
        : volMax != null && n > 0
          ? Math.round((volMax / n) * 10) / 10
          : null;
    const tieneDifusor = (state.configTorre?.equipamiento?.includes('difusor') ?? true) && !esKratky;
    const frontalPumpGutter = tieneDifusor ? 80 : 0;
    const W = Math.min(780, Math.max(480, 120 + C * 56) + frontalPumpGutter);
    const headerH = 48;
    const planTop = headerH + 8;
    const planPad = 14;
    const planW = W - 48;
    const planH = Math.min(220, Math.max(100, 36 + N * 44));
    const planLeft = (W - planW) / 2;
    const planInnerX = planLeft + planPad;
    const planInnerY = planTop + planPad;
    const planInnerW = planW - planPad * 2;
    const planInnerH = planH - planPad * 2;
    const cellW = planInnerW / Math.max(1, C);
    const cellH = planInnerH / Math.max(1, N);
    const Rpot = Math.max(10, Math.min(22, Math.min(cellW, cellH) * 0.34));
    const planPanelTop = planTop - 8;
    const interViewGap = 40;
    const secTop = planTop + planH + interViewGap;
    const viewCenitalY = planPanelTop - 8;
    const viewFrontalY = planTop + planH + interViewGap * 0.45;
    const tankH = 92;
    const tankW = planW - frontalPumpGutter;
    const tankX = planLeft;
    const tankY = secTop;
    const rimSw = 2.4;
    const rimIn = rimSw / 2;
    const waterX = tankX + rimIn;
    const waterW = tankW - rimSw;
    const waterBottom = tankY + tankH - rimIn;
    const raftH = 22;
    const waterY =
      tankY + raftH + (esKratky ? Math.min(28, Number(cfg.srfKratkyGapCm) || 8) * 1.2 : 6);
    const ta = typeof torreSvgAnimacionesActivas === 'function' ? torreSvgAnimacionesActivas() : false;
    const profCm = Number(cfg.srfProfundidadCm) || 25;
    const balsaMm = cfg.srfBalsaGrosorMm || 40;
    const recLh = Math.round(Number(cfg.srfRecircLh) || 400);

    let s = srfScadaDefs();
    s += `<rect width="${W}" height="900" fill="url(#srfScadaBg)"/>`;
    if (SP && typeof SP.sectionPanelTinted === 'function') {
      s += SP.sectionPanelTinted(planLeft - 8, planTop - 8, planW + 16, planH + 16, 14, 'plan');
      s += SP.sectionPanelTinted(tankX - 8, tankY - 8, tankW + 16, tankH + 20, 12, 'tank');
    } else if (SP) {
      s += SP.sectionPanel(planLeft - 8, planTop - 8, planW + 16, planH + 16, 14);
      s += SP.sectionPanel(tankX - 8, tankY - 8, tankW + 16, tankH + 20, 12);
    }
    if (typeof hcDiagramViewLabelSvg === 'function') {
      s +=
        hcDiagramViewLabelSvg(planLeft + planW / 2, viewCenitalY, 'cenital', { pointerEvents: false }) +
        hcDiagramViewLabelSvg(tankX + tankW / 2, viewFrontalY, 'frontal', { pointerEvents: false });
    }

    const T = srfTok();
    s +=
      '<rect class="srf-plan-raft" x="' +
      planInnerX.toFixed(1) +
      '" y="' +
      planInnerY.toFixed(1) +
      '" width="' +
      planInnerW.toFixed(1) +
      '" height="' +
      planInnerH.toFixed(1) +
      '" rx="8" fill="url(#srfRaft)" stroke="' +
      (T.raftStroke || '#0d9488') +
      '" stroke-width="1.6" filter="url(#srfSoftShadow)"/>';

    for (let rn = 0; rn < N; rn++) {
      for (let col = 0; col < C; col++) {
        const hx = planInnerX + (col + 0.5) * cellW;
        const hy = planInnerY + (rn + 0.5) * cellH;
        const hR = Math.max(4, Rpot * 0.42);
        s +=
          '<circle class="srf-plan-hole" cx="' +
          hx.toFixed(1) +
          '" cy="' +
          hy.toFixed(1) +
          '" r="' +
          hR.toFixed(1) +
          '" fill="' +
          (T.holeGuide || '#7dd3fc') +
          '" fill-opacity="0.28" stroke="' +
          (T.potEmptyStroke || '#38bdf8') +
          '" stroke-width="0.9" stroke-opacity="0.55" aria-hidden="true"/>';
      }
    }

    for (let rn = 0; rn < N; rn++) {
      for (let col = 0; col < C; col++) {
        const cx = planInnerX + (col + 0.5) * cellW;
        const cy = planInnerY + (rn + 0.5) * cellH;
        const dat =
          state.torre && state.torre[rn] && state.torre[rn][col]
            ? state.torre[rn][col]
            : { variedad: '', fecha: '', fotos: [] };
        const dias =
          dat.fecha && typeof torreDiasCicloVisual === 'function' ? torreDiasCicloVisual(dat) : 0;
        const est = dat.variedad && typeof getEstado === 'function' ? getEstado(dat.variedad, dias) : '';
        let fill = T.potEmptyFill || '#e0f2fe';
        let stroke = T.potEmptyStroke || '#38bdf8';
        if (dat.variedad) {
          if (est === 'plantula') {
            fill = '#dbeafe';
            stroke = '#2563eb';
          } else if (est === 'crecimiento') {
            fill = '#bbf7d0';
            stroke = '#15803d';
          } else if (est === 'madurez') {
            fill = '#fde68a';
            stroke = '#b45309';
          } else {
            fill = '#e9d5ff';
            stroke = '#7c3aed';
          }
        }
        const cult = dat.variedad && typeof getCultivoDB === 'function' ? getCultivoDB(dat.variedad) : null;
        const cultEmoji = cult && cult.emoji ? String(cult.emoji) : '';
        const titLista = dat.variedad
          ? typeof cultivoNombreLista === 'function'
            ? cultivoNombreLista(cult, dat.variedad)
            : dat.variedad
          : 'Vacía';
        const aria = typeof escAriaAttr === 'function'
          ? escAriaAttr('Planta fila ' + (rn + 1) + ' col ' + (col + 1) + ', ' + titLista + '. Pulsa para ficha.')
          : 'Planta ' + (rn + 1) + '-' + (col + 1);
        const potFilter = dat.variedad ? ' filter="url(#srfPotShadow)"' : '';
        s += `<g data-n="${rn}" data-c="${col}" class="hc-cesta hc-cesta--interactive srf-pot-hit" role="button" tabindex="0" aria-label="${aria}">`;
        s +=
          '<circle cx="' +
          cx.toFixed(1) +
          '" cy="' +
          cy.toFixed(1) +
          '" r="' +
          Rpot.toFixed(1) +
          '" fill="' +
          fill +
          '" stroke="' +
          stroke +
          '" stroke-width="2.2"' +
          potFilter +
          '/>';
        if (cultEmoji) {
          s += `<text x="${cx.toFixed(1)}" y="${(cy + 1).toFixed(1)}" text-anchor="middle" font-size="${Math.min(14, Rpot * 0.9).toFixed(1)}" dominant-baseline="middle">${cultEmoji}</text>`;
        }
        if (dias > 0 && dat.variedad) {
          s += `<text x="${cx.toFixed(1)}" y="${(cy + Rpot - 4).toFixed(1)}" text-anchor="middle" font-family="Inconsolata,monospace" font-size="7" font-weight="700" fill="${stroke}">${dias}d</text>`;
        }
        const hitMult =
          window.innerWidth < 768 ||
          (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
            ? 1.85
            : 1.45;
        s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(Rpot * hitMult).toFixed(1)}" fill="rgba(0,0,0,0)" class="hc-cesta-hit" pointer-events="all"/>`;
        s += `</g>`;
      }
    }

    const wTop = waterBottom - (waterBottom - waterY) * volPct;
    const drawFrontalBaskets = true;
    const raftY = Math.max(tankY + 2, wTop - raftH);
    if (SP && typeof SP.frontalTankInner === 'function') {
      s += SP.frontalTankInner(tankX, tankY, tankW, tankH, rimIn);
    } else {
      s +=
        '<rect class="srf-frontal-tank__inner" x="' +
        waterX.toFixed(1) +
        '" y="' +
        tankY +
        '" width="' +
        waterW.toFixed(1) +
        '" height="' +
        (tankH - rimIn).toFixed(1) +
        '" fill="#f1f5f9" aria-hidden="true"/>';
    }
    s +=
      '<rect x="' +
      waterX.toFixed(1) +
      '" y="' +
      wTop.toFixed(1) +
      '" width="' +
      waterW.toFixed(1) +
      '" height="' +
      Math.max(0, waterBottom - wTop).toFixed(1) +
      '" class="srf-frontal-water" fill="url(#srfWater)" opacity="0.96"/>';
    const shineH = Math.min(14, Math.max(4, waterBottom - wTop));
    s +=
      '<rect x="' +
      waterX.toFixed(1) +
      '" y="' +
      wTop.toFixed(1) +
      '" width="' +
      waterW.toFixed(1) +
      '" height="' +
      shineH.toFixed(1) +
      '" class="srf-frontal-water-shine" fill="url(#srfWaterShine)" opacity="0.7" aria-hidden="true"/>';
    s +=
      '<line x1="' +
      waterX.toFixed(1) +
      '" y1="' +
      wTop.toFixed(1) +
      '" x2="' +
      (waterX + waterW).toFixed(1) +
      '" y2="' +
      wTop.toFixed(1) +
      '" stroke="' +
      (T.waterSurface || '#38bdf8') +
      '" stroke-width="1.8" opacity="0.9"/>';
    if (!drawFrontalBaskets && !esKratky && wTop > raftY + raftH + 4) {
      const rootY = raftY + raftH + 2;
      const rootH = Math.min(18, wTop - rootY - 2);
      if (rootH > 3) {
        s += '<g class="srf-frontal-roots" aria-hidden="true" opacity="0.55">';
        const rootN = Math.min(5, Math.ceil(waterW / 48));
        for (let ri = 0; ri < rootN; ri++) {
          const rx = waterX + waterW * ((ri + 0.5) / rootN);
          s +=
            '<path d="M ' +
            rx.toFixed(1) +
            ' ' +
            rootY.toFixed(1) +
            ' q ' +
            (ri % 2 === 0 ? -4 : 4).toFixed(1) +
            ' ' +
            (rootH * 0.45).toFixed(1) +
            ' 0 ' +
            rootH.toFixed(1) +
            '" fill="none" stroke="#22c55e" stroke-width="1.4" stroke-linecap="round"/>';
        }
        s += '</g>';
      }
    }

    if (esKratky) {
      s +=
        '<rect x="' +
        waterX.toFixed(1) +
        '" y="' +
        (raftY + raftH).toFixed(1) +
        '" width="' +
        waterW.toFixed(1) +
        '" height="' +
        Math.max(0, wTop - raftY - raftH).toFixed(1) +
        '" fill="url(#srfKratkyAir)" opacity="0.72" stroke="#fbbf24" stroke-width="1" stroke-dasharray="4 3"/>';
    }

    const stonePad = 14;
    const stoneYs = [];
    if (tieneDifusor) {
      const nStones = Math.min(6, Math.ceil(tankW / 70));
      for (let ai = 0; ai < nStones; ai++) {
        const ax =
          waterX +
          stonePad +
          ai * ((waterW - stonePad * 2) / Math.max(1, nStones - 1 || 1));
        const stoneY = waterBottom - 6;
        stoneYs.push({ ax, stoneY });
        s +=
          '<ellipse cx="' +
          ax.toFixed(1) +
          '" cy="' +
          stoneY.toFixed(1) +
          '" rx="9" ry="4" fill="' +
          (T.stoneFill || '#5eead4') +
          '" stroke="' +
          (T.stoneStroke || '#0f766e') +
          '" stroke-width="1"/><ellipse cx="' +
          (ax - 3).toFixed(1) +
          '" cy="' +
          (stoneY - 1).toFixed(1) +
          '" rx="3" ry="1.2" fill="#ffffff" opacity="0.35" aria-hidden="true"/>';
        if (ta) {
          s +=
            '<circle cx="' +
            ax.toFixed(1) +
            '" cy="' +
            (stoneY - 2).toFixed(1) +
            '" r="1.4" fill="' +
            (T.bubble || '#bae6fd') +
            '" opacity="0"><animate attributeName="cy" to="' +
            (wTop + 6).toFixed(1) +
            '" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="1.2s" repeatCount="indefinite"/></circle>';
        }
      }
    }

    if (SP && typeof SP.frontalTankRim === 'function') {
      s += SP.frontalTankRim(tankX, tankY, tankW, tankH);
    } else {
      const bot = tankY + tankH;
      s +=
        '<g class="srf-frontal-tank-rim" aria-hidden="true">' +
        '<path d="M ' +
        tankX.toFixed(1) +
        ' ' +
        tankY +
        ' L ' +
        tankX.toFixed(1) +
        ' ' +
        bot.toFixed(1) +
        ' L ' +
        (tankX + tankW).toFixed(1) +
        ' ' +
        bot.toFixed(1) +
        ' L ' +
        (tankX + tankW).toFixed(1) +
        ' ' +
        tankY +
        '" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="miter"/>' +
        '</g>';
    }

    const lidSeatY = tankY + 1;
    if (SP && typeof SP.frontalTankLidSeat === 'function') {
      s += SP.frontalTankLidSeat(tankX, lidSeatY, tankW);
    } else {
      s +=
        '<line x1="' +
        tankX.toFixed(1) +
        '" y1="' +
        (lidSeatY + 2.2).toFixed(1) +
        '" x2="' +
        (tankX + tankW).toFixed(1) +
        '" y2="' +
        (lidSeatY + 2.2).toFixed(1) +
        '" stroke="#94a3b8" stroke-width="0.9" stroke-linecap="round" opacity="0.65" aria-hidden="true"/>';
    }
    if (SP && typeof SP.frontalRaftLid === 'function') {
      s += SP.frontalRaftLid(waterX, raftY, waterW, raftH, T.raftFrontStroke || '#0284c7');
    } else {
      s +=
        '<rect x="' +
        waterX.toFixed(1) +
        '" y="' +
        raftY.toFixed(1) +
        '" width="' +
        waterW.toFixed(1) +
        '" height="' +
        raftH +
        '" rx="4" class="srf-frontal-raft srf-frontal-raft-lid" fill="url(#srfRaft)" stroke="' +
        (T.raftFrontStroke || '#0284c7') +
        '" stroke-width="1.4" filter="url(#srfSoftShadow)"/>';
    }

    if (drawFrontalBaskets) {
      const basketN = Math.min(6, Math.max(1, C));
      const rimW = 17;
      const rimH = 4.4;
      const bodyTopW = 14.2;
      const bodyBotW = 7.6;
      const bodyH = 19.5;
      for (let bi = 0; bi < basketN; bi++) {
        const bx = waterX + waterW * ((bi + 0.5) / basketN);
        const rimY = raftY + 2.2;
        const bodyY = rimY - 1.6;
        const bodyBottom = bodyY + bodyH;
        s +=
          '<g class="srf-frontal-basket" aria-hidden="true" opacity="0.95">' +
          '<ellipse cx="' +
          bx.toFixed(1) +
          '" cy="' +
          rimY.toFixed(1) +
          '" rx="' +
          (rimW * 0.5).toFixed(1) +
          '" ry="' +
          rimH.toFixed(1) +
          '" fill="#d7b980" stroke="#b0894a" stroke-width="0.9"/>' +
          '<path d="M ' +
          (bx - bodyTopW * 0.5).toFixed(1) +
          ' ' +
          bodyY.toFixed(1) +
          ' L ' +
          (bx + bodyTopW * 0.5).toFixed(1) +
          ' ' +
          bodyY.toFixed(1) +
          ' L ' +
          (bx + bodyBotW * 0.5).toFixed(1) +
          ' ' +
          bodyBottom.toFixed(1) +
          ' L ' +
          (bx - bodyBotW * 0.5).toFixed(1) +
          ' ' +
          bodyBottom.toFixed(1) +
          ' Z" fill="#d9bd88" stroke="#a67c3c" stroke-width="0.8"/>' +
          '<line x1="' +
          (bx - 2.2).toFixed(1) +
          '" y1="' +
          (bodyY + 1.8).toFixed(1) +
          '" x2="' +
          (bx - 2.4).toFixed(1) +
          '" y2="' +
          (bodyBottom - 1).toFixed(1) +
          '" stroke="#b0894a" stroke-width="0.55" opacity="0.75"/>' +
          '<line x1="' +
          bx.toFixed(1) +
          '" y1="' +
          (bodyY + 1.5).toFixed(1) +
          '" x2="' +
          bx.toFixed(1) +
          '" y2="' +
          (bodyBottom - 1).toFixed(1) +
          '" stroke="#b0894a" stroke-width="0.55" opacity="0.75"/>' +
          '<line x1="' +
          (bx + 2.2).toFixed(1) +
          '" y1="' +
          (bodyY + 1.8).toFixed(1) +
          '" x2="' +
          (bx + 2.4).toFixed(1) +
          '" y2="' +
          (bodyBottom - 1).toFixed(1) +
          '" stroke="#b0894a" stroke-width="0.55" opacity="0.75"/>';
        if (!esKratky) {
          const rootLen = Math.max(4, Math.min(16, wTop - bodyBottom - 2));
          if (rootLen > 4) {
            s +=
              '<path d="M ' +
              bx.toFixed(1) +
              ' ' +
              bodyBottom.toFixed(1) +
              ' q -2.6 ' +
              (rootLen * 0.5).toFixed(1) +
              ' 0 ' +
              rootLen.toFixed(1) +
              '" fill="none" stroke="#d1cab3" stroke-width="1.05" stroke-linecap="round" opacity="0.9"/>' +
              '<path d="M ' +
              bx.toFixed(1) +
              ' ' +
              bodyBottom.toFixed(1) +
              ' q 2.6 ' +
              (rootLen * 0.5).toFixed(1) +
              ' 0 ' +
              rootLen.toFixed(1) +
              '" fill="none" stroke="#d1cab3" stroke-width="1.05" stroke-linecap="round" opacity="0.9"/>';
          }
        }
        s += '</g>';
      }
    }

    if (tieneDifusor) {
      const pumpW = 54;
      const pumpH = 40;
      const pumpGap = 18;
      const pumpX = tankX + tankW + pumpGap;
      const pumpY = tankY + tankH - pumpH - 6;
      const pumpCx = pumpX + pumpW / 2;
      const tankWallX = tankX + tankW - rimIn;
      let pumpOutX = pumpX;
      let pumpOutY = pumpY + pumpH * 0.55;
      s += '<g class="srf-ext-pump-outside hc-air-pump-torre" aria-hidden="true">';
      const pumpScaleSrf = Math.max(0.76, Math.min(1.05, pumpH / 40));
      if (typeof global.dwcSvgAirPumpDraw === 'function') {
        const drawn = global.dwcSvgAirPumpDraw(pumpX, pumpY, pumpScaleSrf);
        s += drawn.svg;
        if (drawn.outlets && drawn.outlets[0]) {
          pumpOutX = drawn.outlets[0].x;
          pumpOutY = drawn.outlets[0].y;
        }
      } else if (typeof global.hcSvgAirPumpTorreBlock === 'function') {
        s += global.hcSvgAirPumpTorreBlock(pumpX, pumpY, pumpScaleSrf);
        pumpOutX = pumpX;
        pumpOutY = pumpY + pumpH * 0.55;
      } else if (typeof global.dwcSvgAirPumpExternal === 'function') {
        const pumpMc = global.dwcSvgAirPumpExternal(pumpX, pumpY, 1);
        const inner = pumpMc.svg.replace(/fill="url\(#dwcPumpDome\)"/g, 'fill="#ff9800"');
        s +=
          '<g class="srf-ext-pump" transform="translate(' +
          pumpX.toFixed(1) +
          ' ' +
          pumpY.toFixed(1) +
          ') scale(' +
          pumpScaleSrf.toFixed(3) +
          ')">' +
          inner +
          '</g>';
        if (pumpMc.outlets && pumpMc.outlets[0]) {
          pumpOutX = pumpX + pumpMc.outlets[0].x * pumpScaleSrf;
          pumpOutY = pumpY + pumpMc.outlets[0].y * pumpScaleSrf;
        }
      }
      if (stoneYs.length) {
        const mid = stoneYs[Math.floor(stoneYs.length / 2)];
        const hoseEntryY = waterBottom - 5;
        const hoseD =
          'M ' +
          pumpOutX.toFixed(1) +
          ' ' +
          pumpOutY.toFixed(1) +
          ' L ' +
          (tankWallX - 2).toFixed(1) +
          ' ' +
          pumpOutY.toFixed(1) +
          ' L ' +
          (tankWallX - 2).toFixed(1) +
          ' ' +
          hoseEntryY.toFixed(1) +
          ' L ' +
          (tankWallX - 2).toFixed(1) +
          ' ' +
          mid.stoneY.toFixed(1) +
          ' L ' +
          mid.ax.toFixed(1) +
          ' ' +
          mid.stoneY.toFixed(1);
        s +=
          '<path d="' +
          hoseD +
          '" fill="none" stroke="#ecfdf5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>' +
          '<path d="' +
          hoseD +
          '" fill="none" stroke="' +
          (T.airHose || '#4ade80') +
          '" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>';
        for (const st of stoneYs) {
          const branch =
            'M ' +
            mid.ax.toFixed(1) +
            ' ' +
            mid.stoneY.toFixed(1) +
            ' L ' +
            st.ax.toFixed(1) +
            ' ' +
            st.stoneY.toFixed(1);
          s +=
            '<path d="' +
            branch +
            '" fill="none" stroke="#86efac" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>';
        }
      }
      s += '</g>';
    }

    const volNum = volMez != null ? Math.round(volMez * 10) / 10 : null;
    const volLabelY = tankY + tankH + 28;
    if (typeof hcDiagramVolLabelSvg === 'function') {
      s += hcDiagramVolLabelSvg(tankX + tankW / 2, volLabelY, volNum, { fontSize: 12, pointerEvents: false });
    } else {
      const volLbl = volNum != null ? volNum + ' L' : '—';
      s +=
        '<text x="' +
        (tankX + tankW / 2).toFixed(1) +
        '" y="' +
        volLabelY.toFixed(1) +
        '" text-anchor="middle" font-family="Inconsolata,monospace" font-size="12" font-weight="800" fill="#0369a1">' +
        volLbl +
        '</text>';
    }

    const H = volLabelY + 18;
    const pad = 12;
    return (
      `<svg class="torre-svg-diagram srf-svg-diagram srf-svg-diagram--scada srf-svg-diagram--vivid svg-centered-block" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="srfDiagTitle">` +
      `<title id="srfDiagTitle">SRF · ${volNum != null ? volNum + ' L' : '—'} · vista cenital y frontal</title>${s}</svg>`
    );
  }

  function generarSVGSrf() {
    return buildSrfDiagramSvg();
  }

  global.buildSrfDiagramSvg = buildSrfDiagramSvg;
  global.generarSVGSrf = generarSVGSrf;
})(typeof window !== 'undefined' ? window : globalThis);
