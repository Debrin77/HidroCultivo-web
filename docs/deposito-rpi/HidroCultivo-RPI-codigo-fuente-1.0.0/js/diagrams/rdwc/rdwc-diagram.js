/**
 * Motor gráfico RDWC SCADA — manifold + anillo (hub), cestas interactivas.
 * Cargar tras rdwc-scada-parts.js y dwc-scada-viewport.js.
 */
(function (global) {
  'use strict';

  const RP = typeof rdwcScadaParts !== 'undefined' ? rdwcScadaParts : null;
  const SP = typeof dwcScadaParts !== 'undefined' ? dwcScadaParts : null;

  function rdwcPreferirLayoutHub(cfg) {
    const rows = Math.max(1, Math.min(4, parseInt(String((cfg || {}).rdwcRows || 1), 10) || 1));
    return rows < 2;
  }

  function rdwcPreferirLayoutPlan(cfg) {
    return typeof renderRdwcPlan === 'function';
  }

  function rdwcSiteInteractive(s, x, y, rn, c, rPot, cfg, idx, ta, tieneDifusor, layout) {
    const dat =
      typeof state !== 'undefined' && state.torre && state.torre[rn] && state.torre[rn][c]
        ? state.torre[rn][c]
        : { variedad: '', fecha: '', fotos: [] };
    const dias = dat.fecha && typeof torreDiasCicloVisual === 'function' ? torreDiasCicloVisual(dat) : 0;
    const est = dat.variedad && typeof getEstado === 'function' ? getEstado(dat.variedad, dias) : '';
    const diasBase = DIAS_COSECHA[dat.variedad] || 50;
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
    const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
    const cultEmoji = cult && cult.emoji ? String(cult.emoji) : '';
    const titLista = dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'Vacío';
    const isSelected = !!(window.editingCesta && editingCesta.nivel === rn && editingCesta.cesta === c);
    const multiKey = rn + ',' + c;
    const isMultiSel = torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
    const fotos = (dat.fotos || []).filter((f) => f && f.data);
    const ultimaFoto = fotos.length > 0 ? fotos[fotos.length - 1] : null;
    const clipId = `rdwc_sc_clip_${rn}_${c}`;
    const ariaMod = escAriaAttr(
      'Módulo RDWC ' +
        (idx + 1) +
        ', ' +
        titLista +
        (dias ? ', día ' + dias : '') +
        '. Pulsa para ficha.'
    );
    const modScale = layout === 'hub' ? 0.82 : 1;
    const modW = Math.min(56, rPot * 2.4) * modScale;
    const modH = Math.min(68, rPot * 2.9) * modScale;
    const esPlanRedondo = layout === 'plan';
    if (RP && layout !== 'overlay' && !esPlanRedondo) {
      s += RP.module3d(x, y, modW, modH, 0.62, tieneDifusor, ta, idx + 1);
    }
    if (SP && dat.variedad && layout === 'manifold') {
      s += SP.plantAccent(x, y - modH * 0.08, rPot * 0.9, true);
    }
    s += `<g data-n="${rn}" data-c="${c}" class="hc-cesta hc-cesta--interactive rdwc-mod-hit" role="button" tabindex="0" aria-label="${ariaMod}">`;
    const rx = (x - rPot).toFixed(1);
    const ry = (y - rPot).toFixed(1);
    const rw = (rPot * 2).toFixed(1);
    const rh = (rPot * 2).toFixed(1);
    if (layout === 'hub-mini' || layout === 'overlay') {
      s += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="${(rPot * 0.22).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>`;
    }
    if (esPlanRedondo && dat.variedad) {
      s += `<circle cx="${x}" cy="${y}" r="${rPot.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="2" opacity="0.92"/>`;
    }
    if (isMultiSel) {
      if (esPlanRedondo) {
        s += `<circle cx="${x}" cy="${y}" r="${(rPot + 5).toFixed(1)}" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="4 3" opacity="0.95"/>`;
      } else {
        s += `<rect x="${(x - rPot - 4).toFixed(1)}" y="${(y - rPot - 4).toFixed(1)}" width="${(rPot * 2 + 8).toFixed(1)}" height="${(rPot * 2 + 8).toFixed(1)}" rx="${(rPot * 0.28).toFixed(1)}"
        fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="4 3" opacity="0.95"/>`;
      }
    }
    if (isSelected) {
      if (esPlanRedondo) {
        s += `<circle cx="${x}" cy="${y}" r="${(rPot + 4).toFixed(1)}" fill="none" stroke="#22c55e" stroke-width="2.4" opacity="0.95"/>`;
      } else {
        s += `<rect x="${(x - rPot - 3).toFixed(1)}" y="${(y - rPot - 3).toFixed(1)}" width="${(rPot * 2 + 6).toFixed(1)}" height="${(rPot * 2 + 6).toFixed(1)}" rx="${(rPot * 0.26).toFixed(1)}"
        fill="none" stroke="#22c55e" stroke-width="2.4" opacity="0.95"/>`;
      }
    }
    if (ultimaFoto?.data) {
      if (esPlanRedondo) {
        s += `<defs><clipPath id="${clipId}"><circle cx="${x}" cy="${y}" r="${rPot.toFixed(1)}"/></clipPath></defs>`;
        s += `<image href="${ultimaFoto.data}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" opacity="0.88"/>`;
      } else {
        s += `<defs><clipPath id="${clipId}"><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="${(rPot * 0.22).toFixed(1)}"/></clipPath></defs>`;
        s += `<image href="${ultimaFoto.data}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" opacity="0.88"/>`;
      }
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
      RP &&
      (window.innerWidth < 768 ||
        (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches))
        ? 1.95
        : 1.55;
    s += `<circle cx="${x}" cy="${y}" r="${(rPot * hitMult).toFixed(1)}" fill="rgba(0,0,0,0)" class="hc-cesta-hit" pointer-events="all"/>`;
    s += `</g>`;
    return s;
  }

  function rdwcLoopHelpHit(cx, cy) {
    const f = (n) => Number(n).toFixed(1);
    return (
      `<g class="rdwc-loop-help-hit" role="button" tabindex="0" aria-label="Cómo funciona el anillo RDWC">` +
      `<title>Circuito cerrado: pulsa para ver impulsión (verde) y retorno (azul)</title>` +
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="11" fill="#fff" stroke="#cbd5e1" stroke-width="1"/>` +
      `<path d="M ${f(cx - 7)} ${f(cy - 1)} A 8 8 0 0 1 ${f(cx + 7)} ${f(cy - 1)}" fill="none" stroke="#16a34a" stroke-width="1.6" stroke-linecap="round"/>` +
      `<polygon points="${f(cx + 6)},${f(cy - 4)} ${f(cx + 11)},${f(cy - 1)} ${f(cx + 6)},${f(cy + 1)}" fill="#16a34a"/>` +
      `<path d="M ${f(cx + 7)} ${f(cy + 1)} A 8 8 0 0 1 ${f(cx - 7)} ${f(cy + 1)}" fill="none" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round"/>` +
      `<polygon points="${f(cx - 6)},${f(cy + 4)} ${f(cx - 11)},${f(cy + 1)} ${f(cx - 6)},${f(cy - 1)}" fill="#2563eb"/>` +
      `<text x="${f(cx + 16)}" y="${f(cy + 4)}" font-size="8.5" fill="#64748b">anillo</text></g>`
    );
  }

  function rdwcScadaDefs() {
    return `<defs>
      <linearGradient id="rdwcScadaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5f6f8"/><stop offset="100%" stop-color="#e4e7eb"/></linearGradient>
      <linearGradient id="rdwcWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#81d4fa"/><stop offset="100%" stop-color="#1565c0"/></linearGradient>
      <linearGradient id="rdwcTankBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#dbeafe"/></linearGradient>
      <linearGradient id="rdwcModShell" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#eceff1"/></linearGradient>
      <linearGradient id="rdwcPumpDome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffb74d"/><stop offset="100%" stop-color="#ff9800"/></linearGradient>
    </defs>`;
  }

  function renderRdwcHub(cfg) {
    const sites = Math.max(2, Math.min(64, parseInt(String(cfg.rdwcSites || 4), 10) || 4));
    const colsCfg = Math.max(1, Math.ceil(sites / Math.max(1, parseInt(String(cfg.rdwcRows || 1), 10) || 1)));
    const W = Math.min(540, Math.max(400, 320 + Math.min(sites, 12) * 12));
    const H = W + 24;
    const headerH = 52;
    const cx = W / 2;
    const cy = headerH + (H - headerH) / 2 + 4;
    const R = Math.min(W, H - headerH) * (0.34 - Math.min(0.08, Math.max(0, sites - 6) * 0.008));
    const supRx = Math.max(R - 28, R * 0.72);
    const supRy = supRx * 0.78;
    const retRx = R + 16;
    const retRy = retRx * 0.78;
    const rPot = Math.max(13, Math.min(22, 26 - sites * 0.35));
    const volMax = getVolumenDepositoMaxLitros(cfg);
    const volMez = getVolumenMezclaLitros(cfg);
    const pct =
      Number.isFinite(volMax) && Number.isFinite(volMez) && volMax > 0
        ? Math.max(0, Math.min(1, volMez / volMax))
        : 0.6;
    const ta = torreSvgAnimacionesActivas();
    const tieneDifusor = state.configTorre?.equipamiento?.includes('difusor') ?? true;
    const tieneCalentador = state.configTorre?.equipamiento?.includes('calentador') ?? true;
    const tankW = 100;
    const tankH = 54;
    const tankX = cx - tankW / 2;
    const tankY = cy - tankH / 2 - 4;
    const volLbl = Number.isFinite(volMez) ? Math.round(volMez * 10) / 10 + ' L' : '—';
    const recLh = Math.round(Number(cfg.rdwcRecirculationLh || 1200));
    const airLpm = Math.round(Number(cfg.rdwcAirLpm || 20));

    let s = rdwcScadaDefs();
    s += `<rect width="${W}" height="${H}" fill="url(#rdwcScadaBg)"/>`;
    if (RP && SP) {
      s += RP.sectionPanel(24, headerH - 6, W - 48, H - headerH - 20, 14);
    }
    if (typeof hcDiagramViewLabelSvg === 'function') {
      s += hcDiagramViewLabelSvg(W / 2, 16, 'cenital', { pointerEvents: false });
    }
    if (typeof hcDiagramVolLabelSvg === 'function') {
      s += hcDiagramVolLabelSvg(W / 2, 32, volLbl, { fontSize: 11, pointerEvents: false });
    }

    s += `<ellipse cx="${cx}" cy="${cy}" rx="${(R + 36).toFixed(1)}" ry="${((R + 36) * 0.78).toFixed(1)}" fill="#f1f5f9" stroke="#cfd8dc" stroke-width="1"/>`;
    if (RP) {
      s += RP.returnPath(
        `M ${cx} ${(cy - retRy).toFixed(1)} A ${retRx} ${retRy} 0 1 1 ${(cx - 0.1).toFixed(1)} ${(cy - retRy).toFixed(1)}`,
        ta,
        2.4
      );
      s += RP.supplyPath(
        `M ${cx} ${(cy - supRy).toFixed(1)} A ${supRx} ${supRy} 0 1 0 ${(cx + 0.1).toFixed(1)} ${(cy - supRy).toFixed(1)}`,
        ta,
        2.4
      );
    } else {
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${retRx.toFixed(1)}" ry="${retRy.toFixed(1)}" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-dasharray="6 4"/>`;
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${supRx.toFixed(1)}" ry="${supRy.toFixed(1)}" fill="none" stroke="#16a34a" stroke-width="2.2"/>`;
    }

    for (let idx = 0; idx < sites; idx++) {
      const ang = -Math.PI / 2 + (2 * Math.PI * idx) / sites;
      const rn = Math.floor(idx / colsCfg);
      const c = idx % colsCfg;
      const x = cx + R * Math.cos(ang);
      const y = cy + R * Math.sin(ang);
      const supX = cx + supRx * Math.cos(ang);
      const supY = cy + supRy * Math.sin(ang);
      const retX = cx + retRx * Math.cos(ang);
      const retY = cy + retRy * Math.sin(ang);
      if (RP) {
        s += RP.supplyPath(`M ${supX.toFixed(1)} ${supY.toFixed(1)} L ${x.toFixed(1)} ${(y - rPot - 6).toFixed(1)}`, ta, 1.6);
        s += RP.returnPath(`M ${x.toFixed(1)} ${(y + rPot + 6).toFixed(1)} L ${retX.toFixed(1)} ${retY.toFixed(1)}`, ta, 1.6);
        if (idx === 0) {
          s += RP.flowArrowSupply(supX, supY, x, y - rPot - 6, ta);
          s += RP.flowArrowReturn(x, y + rPot + 6, retX, retY, ta);
        }
      } else {
        s += `<line x1="${supX.toFixed(1)}" y1="${supY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - rPot - 3).toFixed(1)}" stroke="#16a34a" stroke-width="1.4"/>`;
        s += `<line x1="${x.toFixed(1)}" y1="${(y + rPot + 3).toFixed(1)}" x2="${retX.toFixed(1)}" y2="${retY.toFixed(1)}" stroke="#2563eb" stroke-width="1.4"/>`;
      }
      s = rdwcSiteInteractive(s, x, y, rn, c, rPot, cfg, idx, ta, tieneDifusor, 'hub');
    }

    const pumpY = cy + 8;
    if (RP) {
      s += RP.supplyPath(`M ${cx.toFixed(1)} ${(tankY + 8).toFixed(1)} L ${cx.toFixed(1)} ${(pumpY - 12).toFixed(1)} L ${cx.toFixed(1)} ${(cy - supRy).toFixed(1)}`, ta, 2);
      s += RP.returnPath(`M ${cx.toFixed(1)} ${(cy + retRy).toFixed(1)} L ${cx.toFixed(1)} ${(tankY + tankH - 8).toFixed(1)}`, ta, 2);
      s += RP.recircPump(cx, pumpY, 11, 'RECIRC');
      s += RP.controlTank(tankX, tankY, tankW, tankH, pct, tieneCalentador, false, ta, volLbl);
    } else {
      s += `<rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="12" fill="url(#rdwcTankBody)" stroke="#475569"/>`;
    }

    s += rdwcLoopHelpHit(cx + R * 0.55, H - 22);

    const pad = 14;
    return (
      `<svg class="torre-svg-diagram rdwc-svg-diagram rdwc-svg-diagram--hub rdwc-svg-diagram--scada svg-centered-block" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rdwcDiagTitle">` +
      `<title id="rdwcDiagTitle">RDWC · ${volLbl} · vista cenital</title>${s}</svg>`
    );
  }

  function renderRdwcManifold(cfg) {
    const rowsCfg = Math.max(1, Math.min(4, parseInt(String(cfg.rdwcRows || 1), 10) || 1));
    const sites = Math.max(2, Math.min(64, parseInt(String(cfg.rdwcSites || 4), 10) || 4));
    const colsCfg = Math.max(1, Math.ceil(sites / rowsCfg));
    const visGrid = hcDistribuirFilasColumnas(sites, 6);
    const visRows = visGrid.rows;
    const visCols = visGrid.cols;
    const W = Math.min(660, Math.max(460, 200 + visCols * 58));
    const headerH = 56;
    const blockW = Math.min(440, Math.max(260, 40 + visCols * 58));
    const blockH = Math.min(300, Math.max(128, 40 + visRows * 74));
    const left = (W - blockW) / 2;
    const top = headerH + 22;
    const cw = blockW / Math.max(1, visCols);
    const ch = blockH / Math.max(1, visRows);
    const rPot = Math.max(15, Math.min(28, Math.min(cw, ch) * 0.32));
    const supY = top - 8;
    const retY = top + blockH + 8;
    const gapManifoldTank = 28;
    const tankW = Math.min(380, Math.max(blockW + 16, W - 36));
    const tankH = 76;
    const tankX = (W - tankW) / 2;
    const tankY = retY + gapManifoldTank;
    const tankCx = tankX + tankW / 2;
    const footerH = 48;
    const H = Math.max(340, tankY + tankH + footerH);
    const volMax = getVolumenDepositoMaxLitros(cfg);
    const volMez = getVolumenMezclaLitros(cfg);
    const pct =
      Number.isFinite(volMax) && Number.isFinite(volMez) && volMax > 0
        ? Math.max(0, Math.min(1, volMez / volMax))
        : 0.6;
    const ta = torreSvgAnimacionesActivas();
    const tieneDifusor = state.configTorre?.equipamiento?.includes('difusor') ?? true;
    const tieneCalentador = state.configTorre?.equipamiento?.includes('calentador') ?? true;
    const pumpX = left + blockW / 2;
    const pumpY = visRows >= 2 ? top + ch : top + blockH / 2;
    const pumpR = visRows >= 2 ? 12 : 10;
    const manL = left + 14;
    const manR = left + blockW - 14;
    const volLbl = Number.isFinite(volMez) ? Math.round(volMez * 10) / 10 + ' L mezcla' : '—';
    const recLh = Math.round(Number(cfg.rdwcRecirculationLh || 1200));
    const airLpm = Math.round(Number(cfg.rdwcAirLpm || 20));

    let s = rdwcScadaDefs();
    s += `<rect width="${W}" height="${H}" fill="url(#rdwcScadaBg)"/>`;
    if (RP && SP) {
      s += RP.sectionPanel(left - 10, top - 12, blockW + 20, blockH + 24, 12);
      s += RP.sectionPanel(tankX - 10, tankY - 10, tankW + 20, tankH + 36, 12);
    }
    if (typeof hcDiagramViewLabelSvg === 'function') {
      s +=
        hcDiagramViewLabelSvg(W / 2, 16, 'cenital', { pointerEvents: false }) +
        hcDiagramViewLabelSvg(W / 2, tankY + tankH + 22, 'frontal', { pointerEvents: false });
    }
    if (typeof hcDiagramVolLabelSvg === 'function') {
      s += hcDiagramVolLabelSvg(W / 2, 32, volLbl, { fontSize: 11, pointerEvents: false });
    }

    if (RP) {
      s += RP.supplyPath(`M ${manL} ${supY} L ${manR} ${supY}`, ta, 2.6);
      s += RP.returnPath(`M ${manL} ${retY} L ${manR} ${retY}`, ta, 2.6);
      s += RP.flowArrowSupply(manL + 40, supY, manR - 40, supY, ta);
      s += RP.flowArrowReturn(manR - 50, retY, manL + 50, retY, ta);
    } else {
      s += `<line x1="${manL}" y1="${supY}" x2="${manR}" y2="${supY}" stroke="#16a34a" stroke-width="2.4"/>`;
      s += `<line x1="${manL}" y1="${retY}" x2="${manR}" y2="${retY}" stroke="#2563eb" stroke-width="2.4"/>`;
    }

    for (let idx = 0; idx < sites; idx++) {
      const vr = Math.floor(idx / visCols);
      const vc = idx % visCols;
      const rn = Math.floor(idx / colsCfg);
      const c = idx % colsCfg;
      const x = left + (vc + 0.5) * cw;
      const y = top + (vr + 0.5) * ch;
      if (RP) {
        s += RP.supplyPath(`M ${x.toFixed(1)} ${supY} L ${x.toFixed(1)} ${(y - rPot - 8).toFixed(1)}`, ta, 1.5);
        s += RP.returnPath(`M ${x.toFixed(1)} ${(y + rPot + 8).toFixed(1)} L ${x.toFixed(1)} ${retY}`, ta, 1.5);
      }
      s = rdwcSiteInteractive(s, x, y, rn, c, rPot, cfg, idx, ta, tieneDifusor, 'manifold');
    }

    if (RP) {
      s += RP.supplyPath(
        `M ${tankCx.toFixed(1)} ${tankY + 10} L ${pumpX.toFixed(1)} ${pumpY + pumpR} L ${pumpX.toFixed(1)} ${supY}`,
        ta,
        2.2
      );
      s += RP.returnPath(`M ${pumpX.toFixed(1)} ${retY} L ${pumpX.toFixed(1)} ${tankY + tankH - 8}`, ta, 2.2);
      s += RP.recircPump(pumpX, pumpY, pumpR, 'BOMBA');
      s += RP.controlTank(tankX, tankY, tankW, tankH, pct, tieneCalentador, tieneDifusor, ta, volLbl);
    } else {
      s += `<rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="14" fill="url(#rdwcTankBody)"/>`;
      s += `<circle cx="${pumpX}" cy="${pumpY}" r="${pumpR}" fill="#fef9c3" stroke="#16a34a" stroke-width="2"/>`;
    }

    s += rdwcLoopHelpHit(W / 2 - 120, H - 22);

    const pad = 14;
    return (
      `<svg class="torre-svg-diagram rdwc-svg-diagram rdwc-svg-diagram--scada svg-centered-block" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rdwcDiagTitle">` +
      `<title id="rdwcDiagTitle">RDWC · ${volLbl} · vista cenital y frontal</title>${s}</svg>`
    );
  }

  function buildRdwcDiagramSvg(cfg, torre, opts) {
    opts = opts || {};
    const prevCfg = typeof state !== 'undefined' ? state.configTorre : null;
    const prevTorre = typeof state !== 'undefined' ? state.torre : null;
    const c = cfg || (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    if (typeof state !== 'undefined') {
      state.configTorre = c;
      if (torre) state.torre = torre;
    }
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
    try {
      if (rdwcPreferirLayoutPlan(c)) {
        return renderRdwcPlan(c, rdwcSiteInteractive);
      }
      if (rdwcPreferirLayoutHub(c)) return renderRdwcHub(c);
      return renderRdwcManifold(c);
    } catch (drawErr) {
      try {
        console.error('buildRdwcDiagramSvg', drawErr);
      } catch (_) {}
      return (
        '<p class="torre-svg-fallback" role="status">No se pudo dibujar el sistema RDWC. Recarga la página (Ctrl+F5) e inténtalo de nuevo.</p>'
      );
    } finally {
      if (typeof state !== 'undefined') {
        state.configTorre = prevCfg;
        state.torre = prevTorre;
      }
    }
  }

  function generarSVGRdwc() {
    return buildRdwcDiagramSvg();
  }

  global.rdwcScadaDefs = rdwcScadaDefs;
  global.rdwcPreferirLayoutHub = rdwcPreferirLayoutHub;
  global.rdwcPreferirLayoutPlan = rdwcPreferirLayoutPlan;
  global.buildRdwcDiagramSvg = buildRdwcDiagramSvg;
  global.generarSVGRdwc = generarSVGRdwc;
})(typeof window !== 'undefined' ? window : globalThis);
