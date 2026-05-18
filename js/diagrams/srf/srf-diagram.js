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
    const W = Math.min(720, Math.max(480, 120 + C * 56));
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
    const secTop = planTop + planH + 36;
    const canalH = 92;
    const canalW = planW;
    const canalX = planLeft;
    const canalY = secTop;
    const raftY = canalY + 8;
    const raftH = 22;
    const waterY = canalY + raftH + (esKratky ? Math.min(28, Number(cfg.srfKratkyGapCm) || 8) * 1.2 : 6);
    const waterBottom = canalY + canalH - 6;
    const ta = typeof torreSvgAnimacionesActivas === 'function' ? torreSvgAnimacionesActivas() : false;
    const tieneDifusor = (state.configTorre?.equipamiento?.includes('difusor') ?? true) && !esKratky;
    const profCm = Number(cfg.srfProfundidadCm) || 25;
    const balsaMm = cfg.srfBalsaGrosorMm || 40;
    const recLh = Math.round(Number(cfg.srfRecircLh) || 400);

    let s = srfScadaDefs();
    s += `<rect width="${W}" height="900" fill="url(#srfScadaBg)"/>`;
    if (SP) {
      s += SP.header(W, 'SRF · balsa flotante', N + '×' + C + ' · estanque ' + profCm + ' cm · ' + (esKratky ? 'Kratky' : 'aireación'));
      s += SP.sectionPanel(planLeft - 8, planTop - 8, planW + 16, planH + 16, 14);
      s += SP.sectionLabel(planLeft, planTop - 2, 'VISTA SUPERIOR — BALSA (' + balsaMm + ' mm)');
      s += SP.sectionPanel(canalX - 8, canalY - 8, canalW + 16, canalH + 20, 12);
      s += SP.sectionLabel(canalX, canalY - 2, 'CORTE ESTANQUE');
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

    if (tieneDifusor) {
      const pumpY = planTop - 18;
      s += `<rect x="${planLeft}" y="${pumpY}" width="${planW}" height="16" rx="5" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.1"/>`;
      s += `<text x="${(planLeft + planW / 2).toFixed(1)}" y="${(pumpY + 11).toFixed(1)}" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" font-weight="900" fill="#0369a1">BOMBA AIRE · estanque</text>`;
    }

    s += `<rect x="${(canalX + 8).toFixed(1)}" y="${raftY}" width="${(canalW - 16).toFixed(1)}" height="${raftH}" rx="4" fill="url(#srfRaft)" stroke="#94a3b8" stroke-width="1"/>`;
    const wTop = waterBottom - (waterBottom - waterY) * volPct;
    s += `<rect x="${(canalX + 10).toFixed(1)}" y="${wTop.toFixed(1)}" width="${(canalW - 20).toFixed(1)}" height="${(waterBottom - wTop).toFixed(1)}" fill="url(#srfWater)" opacity="0.92"/>`;
    s += `<line x1="${(canalX + 10).toFixed(1)}" y1="${wTop.toFixed(1)}" x2="${(canalX + canalW - 10).toFixed(1)}" y2="${wTop.toFixed(1)}" stroke="#00acc1" stroke-width="1.2" opacity="0.75"/>`;

    if (esKratky) {
      s += `<rect x="${(canalX + 10).toFixed(1)}" y="${(raftY + raftH).toFixed(1)}" width="${(canalW - 20).toFixed(1)}" height="${(wTop - raftY - raftH).toFixed(1)}" fill="#f0f9ff" opacity="0.5" stroke="#7dd3fc" stroke-width="0.8" stroke-dasharray="3 2"/>`;
      s += `<text x="${(canalX + canalW / 2).toFixed(1)}" y="${(waterY - 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="#0369a1" font-weight="700">Cámara de aire (Kratky)</text>`;
    }

    if (tieneDifusor) {
      const nStones = Math.min(6, Math.ceil(canalW / 70));
      for (let ai = 0; ai < nStones; ai++) {
        const ax =
          canalX + 30 + ai * ((canalW - 60) / Math.max(1, nStones - 1 || 1));
        s += `<ellipse cx="${ax.toFixed(1)}" cy="${(waterBottom - 8).toFixed(1)}" rx="9" ry="4" fill="#64748b" stroke="#475569" stroke-width="0.8"/>`;
        if (ta) {
          s += `<circle cx="${ax.toFixed(1)}" cy="${(waterBottom - 10).toFixed(1)}" r="1.2" fill="#bae6fd" opacity="0"><animate attributeName="cy" to="${(wTop + 6).toFixed(1)}" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0" dur="1.2s" repeatCount="indefinite"/></circle>`;
        }
      }
    }

    if (circ) {
      s += `<text x="${(canalX + canalW - 12).toFixed(1)}" y="${(canalY + 14).toFixed(1)}" text-anchor="end" font-size="8" fill="#16a34a" font-weight="700">↻ ${recLh} L/h</text>`;
    }

    const volLbl =
      volMez != null
        ? '~' + (Math.round(volMez * 10) / 10) + ' L en estanque' + (volPer != null ? ' · ~' + volPer + ' L/planta' : '')
        : '—';
    s += `<text x="${(canalX + canalW / 2).toFixed(1)}" y="${(canalY + canalH + 16).toFixed(1)}" text-anchor="middle" font-family="Inconsolata,monospace" font-size="12" font-weight="800" fill="#0369a1">${volLbl}</text>`;

    const H = canalY + canalH + 36;
    const pad = 12;
    return (
      `<svg class="torre-svg-diagram srf-svg-diagram srf-svg-diagram--scada svg-centered-block" width="${W}" height="${H}" viewBox="${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="srfDiagTitle">` +
      `<title id="srfDiagTitle">SRF balsa flotante: ${n} plantas, estanque ${profCm} cm. Toca cada maceta.</title>${s}</svg>`
    );
  }

  function generarSVGSrf() {
    return buildSrfDiagramSvg();
  }

  global.buildSrfDiagramSvg = buildSrfDiagramSvg;
  global.generarSVGSrf = generarSVGSrf;
})(typeof window !== 'undefined' ? window : globalThis);
