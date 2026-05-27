/**
 * Motor gráfico SRF SCADA — balsa flotante + estanque.
 */
(function (global) {
  'use strict';

  const SP = typeof srfScadaParts !== 'undefined' ? srfScadaParts : null;

  function srfScadaDefs() {
    return `<defs>
      <linearGradient id="srfScadaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5f6f8"/><stop offset="100%" stop-color="#e4e7eb"/></linearGradient>
      <linearGradient id="srfWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bae6fd"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>
      <linearGradient id="srfRaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>
    </defs>`;
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
    if (SP) {
      s += SP.sectionPanel(planLeft - 8, planTop - 8, planW + 16, planH + 16, 14);
      s += SP.sectionPanel(tankX - 8, tankY - 8, tankW + 16, tankH + 20, 12);
    }
    if (typeof hcDiagramViewLabelSvg === 'function') {
      s +=
        hcDiagramViewLabelSvg(planLeft + planW / 2, viewCenitalY, 'cenital', { pointerEvents: false }) +
        hcDiagramViewLabelSvg(tankX + tankW / 2, viewFrontalY, 'frontal', { pointerEvents: false });
    }

    s += `<rect x="${planInnerX}" y="${planInnerY}" width="${planInnerW}" height="${planInnerH}" rx="8" fill="url(#srfRaft)" stroke="#64748b" stroke-width="1.3"/>`;

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
        let fill = '#f8fafc';
        let stroke = '#94a3b8';
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
        s += `<g data-n="${rn}" data-c="${col}" class="hc-cesta hc-cesta--interactive srf-pot-hit" role="button" tabindex="0" aria-label="${aria}">`;
        s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Rpot.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
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
      '" class="srf-frontal-water" fill="url(#srfWater)" opacity="0.92"/>';
    s +=
      '<line x1="' +
      waterX.toFixed(1) +
      '" y1="' +
      wTop.toFixed(1) +
      '" x2="' +
      (waterX + waterW).toFixed(1) +
      '" y2="' +
      wTop.toFixed(1) +
      '" stroke="#00acc1" stroke-width="1.2" opacity="0.75"/>';
    s +=
      '<rect x="' +
      waterX.toFixed(1) +
      '" y="' +
      raftY.toFixed(1) +
      '" width="' +
      waterW.toFixed(1) +
      '" height="' +
      raftH +
      '" rx="4" class="srf-frontal-raft" fill="url(#srfRaft)" stroke="#94a3b8" stroke-width="1"/>';

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
        '" fill="#f0f9ff" opacity="0.5" stroke="#7dd3fc" stroke-width="0.8" stroke-dasharray="3 2"/>';
    }

    if (tieneDifusor) {
      const stonePad = 14;
      const nStones = Math.min(6, Math.ceil(tankW / 70));
      const stoneYs = [];
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
          '" rx="9" ry="4" fill="#64748b" stroke="#475569" stroke-width="0.8"/>';
        if (ta) {
          s +=
            '<circle cx="' +
            ax.toFixed(1) +
            '" cy="' +
            (stoneY - 2).toFixed(1) +
            '" r="1.2" fill="#bae6fd" opacity="0"><animate attributeName="cy" to="' +
            (wTop + 6).toFixed(1) +
            '" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="1.2s" repeatCount="indefinite"/></circle>';
        }
      }
      const pumpW = 54;
      const pumpH = 40;
      const pumpGap = 18;
      const pumpX = tankX + tankW + pumpGap;
      const pumpY = tankY + (tankH - pumpH) / 2;
      const pumpCx = pumpX + pumpW / 2;
      const pumpOutX = pumpX;
      const pumpOutY = pumpY + pumpH * 0.55;
      const tankWallX = tankX + tankW - rimIn;
      s += '<g class="srf-ext-pump-outside" aria-hidden="true">';
      if (typeof dwcSvgAirPumpExternal === 'function') {
        const pumpMc = dwcSvgAirPumpExternal(pumpX, pumpY, 1);
        s += pumpMc.svg;
      } else {
        s +=
          '<g class="srf-ext-pump" filter="drop-shadow(0 2px 5px rgba(15,23,42,0.12))">' +
          '<rect x="' +
          (pumpX + 4).toFixed(1) +
          '" y="' +
          (pumpY + 14).toFixed(1) +
          '" width="' +
          (pumpW - 8).toFixed(1) +
          '" height="' +
          (pumpH - 10).toFixed(1) +
          '" rx="5" fill="#37474f" stroke="#1e293b" stroke-width="1.5"/>' +
          '<ellipse cx="' +
          pumpCx.toFixed(1) +
          '" cy="' +
          (pumpY + 12).toFixed(1) +
          '" rx="' +
          ((pumpW - 10) / 2).toFixed(1) +
          '" ry="12" fill="#fb923c" stroke="#c2410c" stroke-width="2"/>' +
          '</g>';
      }
      if (stoneYs.length) {
        const mid = stoneYs[Math.floor(stoneYs.length / 2)];
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
          mid.stoneY.toFixed(1) +
          ' L ' +
          mid.ax.toFixed(1) +
          ' ' +
          mid.stoneY.toFixed(1);
        s +=
          '<path d="' +
          hoseD +
          '" fill="none" stroke="#eceff1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>' +
          '<path d="' +
          hoseD +
          '" fill="none" stroke="#90a4ae" stroke-width="1" stroke-linecap="round" opacity="0.35"/>';
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
            '" fill="none" stroke="#cfd8dc" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>';
        }
      }
      s += '</g>';
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
      `<svg class="torre-svg-diagram srf-svg-diagram srf-svg-diagram--scada svg-centered-block" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="srfDiagTitle">` +
      `<title id="srfDiagTitle">SRF · ${volNum != null ? volNum + ' L' : '—'} · vista cenital y frontal</title>${s}</svg>`
    );
  }

  function generarSVGSrf() {
    return buildSrfDiagramSvg();
  }

  global.buildSrfDiagramSvg = buildSrfDiagramSvg;
  global.generarSVGSrf = generarSVGSrf;
})(typeof window !== 'undefined' ? window : globalThis);
