/**
 * NFT mesa: vista ilustrada 2D para pestaña Medir (solo lectura).
 * Sin IA: SVG paramétrico en coordenadas de píxeles (mismo criterio que nft-pared-illustration).
 */
(function (global) {
  'use strict';

  function escSvg(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function fq(v) {
    const n = Math.round(Number(v) * 100) / 100;
    return Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(2);
  }

  function drawUnifiedPump(px, py, scale) {
    const sc = Number.isFinite(Number(scale)) ? Math.max(0.75, Math.min(1.3, Number(scale))) : 1;
    if (typeof global.dwcSvgAirPumpDraw === 'function') {
      return (
        '<g class="nft-illo-pump hc-air-pump-torre" pointer-events="none">' +
        global.dwcSvgAirPumpDraw(px, py, sc).svg +
        '</g>'
      );
    }
    if (typeof global.dwcSvgAirPumpExternal === 'function') {
      const pump = global.dwcSvgAirPumpExternal(0, 0, 1);
      const inner = pump.svg.replace(/fill="url\(#dwcPumpDome\)"/g, 'fill="#ff9800"');
      return (
        '<g class="nft-illo-pump hc-air-pump-torre" transform="translate(' +
        fq(px) +
        ' ' +
        fq(py) +
        ') scale(' +
        fq(sc) +
        ')" pointer-events="none">' +
        inner +
        '</g>'
      );
    }
    const w = 54 * sc;
    const h = 40 * sc;
    const cx = px + w / 2;
    return (
      '<g class="nft-illo-pump" filter="drop-shadow(0 2px 5px rgba(15,23,42,0.12))" pointer-events="none">' +
      '<ellipse cx="' + fq(cx) + '" cy="' + fq(py + h + 6 * sc) + '" rx="' + fq(w * 0.4) + '" ry="' + fq(4.5 * sc) + '" fill="rgba(15,23,42,0.14)"/>' +
      '<rect x="' + fq(px + 4 * sc) + '" y="' + fq(py + 15 * sc) + '" width="' + fq(w - 8 * sc) + '" height="' + fq(h - 11 * sc) + '" rx="' + fq(5 * sc) + '" fill="#37474f" stroke="#1e293b" stroke-width="' + fq(1.8 * sc) + '"/>' +
      '<ellipse cx="' + fq(cx) + '" cy="' + fq(py + 12 * sc) + '" rx="' + fq((w - 10 * sc) / 2) + '" ry="' + fq(13 * sc) + '" fill="#ff9800" stroke="#e65100" stroke-width="' + fq(2 * sc) + '"/>' +
      '<ellipse cx="' + fq(cx - 8 * sc) + '" cy="' + fq(py + 8 * sc) + '" rx="' + fq(7 * sc) + '" ry="' + fq(3 * sc) + '" fill="rgba(255,255,255,0.45)"/>' +
      '<circle cx="' + fq(cx) + '" cy="' + fq(py + h * 0.52) + '" r="' + fq(9 * sc) + '" fill="#eceff1" stroke="#78909c" stroke-width="' + fq(1.2 * sc) + '"/>' +
      '<circle cx="' + fq(cx) + '" cy="' + fq(py + h * 0.52) + '" r="' + fq(4.5 * sc) + '" fill="none" stroke="#90a4ae" stroke-width="' + fq(0.9 * sc) + '"/>' +
      '</g>'
    );
  }

  function computeMesaMedirLayout(cfg, equipOpts) {
    const EO = equipOpts || {};
    const hyd =
      typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 4 };
    const hx =
      typeof nftHuecosDesdeCfg === 'function'
        ? nftHuecosDesdeCfg(cfg)
        : parseInt(String(cfg.nftHuecosPorCanal || cfg.numCestas), 10) || 8;
    const volRaw =
      typeof getVolumenMezclaLitros === 'function'
        ? getVolumenMezclaLitros(cfg)
        : typeof getVolumenDepositoMaxLitros === 'function'
          ? getVolumenDepositoMaxLitros(cfg)
          : 40;
    const vol = Math.min(200, Math.max(5, parseInt(String(volRaw), 10) || 40));

    let tiers = null;
    if (cfg.nftMesaMultinivel && typeof parseNftMesaTubosPorNivelStr === 'function') {
      tiers = parseNftMesaTubosPorNivelStr(cfg.nftMesaTubosPorNivelStr);
      if (!tiers || tiers.length < 2) tiers = null;
    }

    const nCh = Math.max(1, hyd.nCh || 4);
    const huecosN = Math.min(30, Math.max(2, hx));
    const multinivel = !!tiers;
    const nTiers = tiers ? tiers.length : 1;
    const maxTubes = tiers ? Math.max.apply(null, tiers) : nCh;

    const W0 =
      typeof nftDiagramCanvasW0 === 'function' ? nftDiagramCanvasW0() : 520;
    const topPad = 44;
    const botTank = 158;
    const marginX = 40;
    const tubeRowH = Math.max(32, Math.min(44, Math.floor(320 / Math.max(multinivel ? nTiers : nCh, 1))));
    const shelfH = multinivel ? tubeRowH + 28 : 0;
    const tierGap = 14;

    let sceneH;
    if (multinivel) {
      sceneH = topPad + nTiers * shelfH + (nTiers - 1) * tierGap + 24;
    } else {
      sceneH = topPad + nCh * tubeRowH + 36;
    }

    const Wsvg = Math.max(W0, marginX * 2 + Math.max(280, maxTubes * 56 + 80));
    const H = sceneH + botTank;
    const xL = marginX + 12;
    const xR = Wsvg - marginX - 12;
    const spanTube = xR - xL;
    const tableY = topPad + (multinivel ? nTiers * (shelfH + tierGap) - tierGap : nCh * tubeRowH) + 8;
    const tableH = 14;
    const tankY = H - botTank + 6;
    const tankH = 100;
    const tankW = Math.min(380, Math.round(148 + vol * 0.7));
    const tx = (Wsvg - tankW) / 2;
    const waterTop = tankY + 8;
    const waterH = tankH - 18;
    const hr = Math.max(6.5, Math.min(12, spanTube / Math.max(huecosN - 1, 1) * 0.42));

    const legHint = { volL: vol, nCanales: multinivel ? maxTubes : nCh, nTubosTotal: multinivel ? tiers.reduce((a, b) => a + b, 0) : nCh };
    const legTier =
      typeof nftDiagramLegibilityHint === 'function' ? nftDiagramLegibilityHint(legHint) : 0;
    const volFs =
      typeof nftTankVolumeFontSize === 'function' ? nftTankVolumeFontSize(vol, legTier) : 14;
    const altCm =
      EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0
        ? Math.round(Number(EO.nftAlturaBombeoCm))
        : null;
    const altBadge =
      typeof nftAlturaBadgeBesideTank === 'function'
        ? nftAlturaBadgeBesideTank(altCm, tx, tankY, tankW, tankH, Wsvg, legHint)
        : { canvasW: Wsvg, html: '' };

    return {
      cfg: cfg,
      vol: vol,
      huecosN: huecosN,
      tiers: tiers,
      nTiers: nTiers,
      maxTubes: maxTubes,
      nCh: nCh,
      multinivel: multinivel,
      Wsvg: altBadge.canvasW,
      H: H,
      topPad: topPad,
      botTank: botTank,
      xL: xL,
      xR: xR,
      spanTube: spanTube,
      tubeRowH: tubeRowH,
      shelfH: shelfH,
      tierGap: tierGap,
      tableY: tableY,
      tableH: tableH,
      tankY: tankY,
      tankH: tankH,
      tankW: tankW,
      tx: tx,
      waterTop: waterTop,
      waterH: waterH,
      hr: hr,
      volFs: volFs,
      altBadge: altBadge,
      showCalentador: EO.calentador === true,
      showDifusor: EO.difusor === true,
    };
  }

  function yTubeRow(L, i) {
    return L.topPad + 18 + i * L.tubeRowH;
  }

  function yTierBase(L, t) {
    return L.topPad + 12 + t * (L.shelfH + L.tierGap);
  }

  function drawTubeChannel(s, x0, y0, w, h, gidCh) {
    s +=
      '<rect x="' +
      fq(x0) +
      '" y="' +
      fq(y0) +
      '" width="' +
      fq(w) +
      '" height="' +
      h +
      '" rx="5" fill="url(#' +
      gidCh +
      ')" stroke="#78350f" stroke-width="1.2" pointer-events="none"/>';
    s +=
      '<rect x="' +
      fq(x0 + 3) +
      '" y="' +
      fq(y0 + 4) +
      '" width="' +
      fq(w - 6) +
      '" height="' +
      (h - 8) +
      '" rx="3" fill="#fef3c7" opacity="0.55" pointer-events="none"/>';
  }

  function drawPlantsOnTube(s, L, P, gIdx, x0, y0, w, interactive) {
    const nHx = L.huecosN;
    const slotW = nHx <= 1 ? w * 0.5 : w / Math.max(1, nHx - 1);
    for (let j = 0; j < nHx; j++) {
      const t = nHx <= 1 ? 0.5 : j / (nHx - 1);
      const gx = x0 + 8 + t * Math.max(0, w - 16);
      const gy = y0 - L.hr * 0.85;
      let dat = { variedad: '', fecha: '' };
      if (global.state && global.state.torre[gIdx] && global.state.torre[gIdx][j]) {
        dat = global.state.torre[gIdx][j];
      }
      const cult =
        dat.variedad && typeof global.getCultivoDB === 'function' ? global.getCultivoDB(dat.variedad) : null;
      if (typeof global.hcIlloNftHuecoLayer === 'function') {
        s += global.hcIlloNftHuecoLayer(gx, gy, L.hr, gIdx, j, dat, cult, false, P, {
          compact: nHx > 12,
          numBelow: false,
          sinTexto: true,
          numShow: j + 1,
          extraDy: 4,
          slotAlong: slotW,
        });
      } else {
        const fill = dat.variedad ? '#86efac' : '#d1fae5';
        const stroke = dat.variedad ? '#15803d' : '#94a3b8';
        s +=
          '<ellipse cx="' +
          fq(gx) +
          '" cy="' +
          fq(gy) +
          '" rx="' +
          fq(L.hr) +
          '" ry="' +
          fq(L.hr * 0.72) +
          '" fill="' +
          fill +
          '" stroke="' +
          stroke +
          '" stroke-width="1.1" pointer-events="none"/>';
      }
    }
  }

  function buildScene(L, suf, equipOpts) {
    const P = typeof HC_DIAG !== 'undefined' && HC_DIAG.nft ? HC_DIAG.nft : {};
    const gidCh = 'nftMmCh' + suf;
    const gidTbl = 'nftMmTbl' + suf;
    const gidTk = 'nftMmTk' + suf;
    const gidAq = 'nftMmAq' + suf;
    const gidBg = 'nftMmBg' + suf;
    let s = '';
    let gIdx = 0;

    s +=
      '<defs>' +
      '<linearGradient id="' +
      gidBg +
      '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0fdf4"/><stop offset="55%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#ecfdf5"/></linearGradient>' +
      '<linearGradient id="' +
      gidCh +
      '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a67c52"/><stop offset="100%" stop-color="#5c3d22"/></linearGradient>' +
      '<linearGradient id="' +
      gidTbl +
      '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e7e5e4"/><stop offset="100%" stop-color="#a8a29e"/></linearGradient>' +
      '<linearGradient id="' +
      gidTk +
      '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/></linearGradient>' +
      '<linearGradient id="' +
      gidAq +
      '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>' +
      '</defs>';

    s +=
      '<rect width="' +
      L.Wsvg +
      '" height="' +
      L.H +
      '" fill="url(#' +
      gidBg +
      ')" pointer-events="none"/>';

    const tableX = L.xL - 20;
    const tableW = L.xR - L.xL + 40;
    s +=
      '<rect x="' +
      fq(tableX) +
      '" y="' +
      fq(L.tableY) +
      '" width="' +
      fq(tableW) +
      '" height="' +
      L.tableH +
      '" rx="6" fill="url(#' +
      gidTbl +
      ')" stroke="#78716c" stroke-width="1.2" pointer-events="none"/>';
    s +=
      '<rect x="' +
      fq(tableX + 8) +
      '" y="' +
      fq(L.tableY + L.tableH) +
      '" width="10" height="22" rx="2" fill="#78716c" pointer-events="none"/>';
    s +=
      '<rect x="' +
      fq(tableX + tableW - 18) +
      '" y="' +
      fq(L.tableY + L.tableH) +
      '" width="10" height="22" rx="2" fill="#78716c" pointer-events="none"/>';

    const tubeH = 18;

    if (L.multinivel && L.tiers) {
      for (let t = 0; t < L.nTiers; t++) {
        const nt = L.tiers[t];
        const ty = yTierBase(L, t);
        const shelfW = L.xR - L.xL + 8;
        s +=
          '<rect x="' +
          fq(L.xL - 4) +
          '" y="' +
          fq(ty - 6) +
          '" width="' +
          fq(shelfW) +
          '" height="' +
          (L.shelfH + 4) +
          '" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" opacity="0.95" pointer-events="none"/>';
        const gap = 10;
        const tw = (L.spanTube - gap * (nt - 1)) / Math.max(1, nt);
        for (let k = 0; k < nt; k++) {
          const x0 = L.xL + k * (tw + gap);
          const y0 = ty + 10;
          drawTubeChannel(s, x0, y0, tw, tubeH, gidCh);
          drawPlantsOnTube(s, L, P, gIdx, x0, y0, tw, false);
          gIdx++;
        }
        s +=
          '<text x="' +
          fq(L.xL - 2) +
          '" y="' +
          fq(ty + 14) +
          '" text-anchor="end" font-size="9" fill="#64748b" font-weight="700" font-family="system-ui,sans-serif" pointer-events="none">N' +
          (t + 1) +
          '</text>';
      }
    } else {
      for (let i = 0; i < L.nCh; i++) {
        const y0 = yTubeRow(L, i) + 4;
        drawTubeChannel(s, L.xL, y0, L.spanTube, tubeH, gidCh);
        drawPlantsOnTube(s, L, P, i, L.xL, y0, L.spanTube, false);
      }
    }

    s +=
      '<rect x="' +
      L.tx +
      '" y="' +
      L.tankY +
      '" width="' +
      L.tankW +
      '" height="' +
      L.tankH +
      '" rx="10" fill="url(#' +
      gidTk +
      ')" stroke="#166534" stroke-width="1.4" pointer-events="none"/>';
    s +=
      '<rect x="' +
      (L.tx + 5) +
      '" y="' +
      L.waterTop +
      '" width="' +
      (L.tankW - 10) +
      '" height="' +
      L.waterH +
      '" rx="8" fill="url(#' +
      gidAq +
      ')" opacity="0.92" pointer-events="none"/>';
    s += L.altBadge.html;
    s +=
      '<text x="' +
      (L.tx + L.tankW / 2) +
      '" y="' +
      (L.tankY + Math.floor(L.tankH / 2) + 5) +
      '" text-anchor="middle" fill="#ecfdf5" font-size="' +
      L.volFs +
      '" font-weight="800" font-family="system-ui,sans-serif" pointer-events="none">' +
      L.vol +
      ' L</text>';

    if (L.showCalentador) {
      s +=
        '<rect x="' +
        (L.tx + 14) +
        '" y="' +
        (L.tankY + L.tankH - 34) +
        '" width="10" height="28" rx="5" fill="#f97316" stroke="#c2410c" stroke-width="1.1" pointer-events="none"/>';
    }

    if (L.showDifusor && typeof global.nftSvgAireadorEnSuelo === 'function') {
      s += global.nftSvgAireadorEnSuelo(L.tx, L.tankY, L.tankW, L.tankH, P);
    }
    if (typeof global.nftSvgRecircPumpBesideTank === 'function') {
      const rec = global.nftSvgRecircPumpBesideTank(
        L.tx,
        L.tankY,
        L.tankW,
        L.tankH,
        L.waterTop,
        L.waterH,
        L.Wsvg,
        {
          nTubosHint: L.multinivel && L.tiers ? L.tiers.reduce((a, b) => a + b, 0) : L.nCh,
          nTiers: L.nTiers,
          reserveRightForAir: L.showDifusor,
        }
      );
      s += rec.svg;
    } else if (!L.showDifusor) {
      const pumpScale = Math.max(0.82, Math.min(1.2, 0.9 + (L.multinivel ? L.nTiers * 0.06 : 0)));
      const px = L.tx + L.tankW + 12;
      const py = L.waterTop + L.waterH * 0.5 - 20 * pumpScale;
      s += drawUnifiedPump(px, py, pumpScale);
    }

    const flowSupply = typeof NFT_FLOW_SUPPLY !== 'undefined' ? NFT_FLOW_SUPPLY : '#2563eb';
    const flowReturn = typeof NFT_FLOW_RETURN !== 'undefined' ? NFT_FLOW_RETURN : '#16a34a';
    const yMid = L.multinivel ? yTierBase(L, 0) + 20 : yTubeRow(L, 0);
    s +=
      '<path d="M ' +
      fq(L.tx - 28) +
      ' ' +
      fq(L.tankY + 20) +
      ' L ' +
      fq(L.xL - 8) +
      ' ' +
      fq(yMid) +
      '" stroke="' +
      flowSupply +
      '" stroke-width="2.5" fill="none" stroke-dasharray="6 4" opacity="0.7" pointer-events="none"/>';
    s +=
      '<path d="M ' +
      fq(L.xR + 12) +
      ' ' +
      fq(yMid + 8) +
      ' L ' +
      fq(L.tx + L.tankW + 8) +
      ' ' +
      fq(L.tankY + 14) +
      '" stroke="' +
      flowReturn +
      '" stroke-width="2.5" fill="none" stroke-dasharray="5 4" opacity="0.7" pointer-events="none"/>';

    return s;
  }

  function buildNftMesaMedirIllustrationSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
    const EO = equipOpts || {};
    const cfg = EO.cfgSnapshot || {};
    const suf =
      svgIdSuffix != null && String(svgIdSuffix).trim() !== ''
        ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
        : 'Medir';
    const tid = 'nftMesaMi' + suf;
    const L = computeMesaMedirLayout(cfg, EO);
    const scene = buildScene(L, suf, EO);
    const tubFoot =
      L.tiers && typeof global.nftMesaTubosUniformLabel === 'function'
        ? global.nftMesaTubosUniformLabel(L.tiers)
        : L.tiers
          ? L.tiers.join('+')
          : '';
    const foot = L.multinivel
      ? 'Mesa multinivel · ' + tubFoot + ' tubos/nivel · ' + L.vol + ' L'
      : 'Mesa · ' + L.nCh + ' tubos × ' + L.huecosN + ' huecos · ' + L.vol + ' L';

    return (
      '<svg class="torre-svg-diagram nft-mesa-medir-illustration nft-diagram--scroll hc-illo-diagram medir-vista-illo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      L.Wsvg +
      ' ' +
      L.H +
      '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' +
      tid +
      '" pointer-events="none">' +
      '<title id="' +
      tid +
      '">' +
      escSvg('NFT mesa · vista ilustrada · ' + foot) +
      '</title>' +
      '<g class="nft-mesa-medir-scene" pointer-events="none">' +
      scene +
      '</g>' +
      '<text x="' +
      (L.Wsvg - 14) +
      '" y="22" text-anchor="end" font-size="10" fill="#64748b" font-family="system-ui,sans-serif" pointer-events="none">Vista ilustrada · orientativa</text>' +
      '</svg>'
    );
  }

  global.buildNftMesaMedirIllustrationSvg = buildNftMesaMedirIllustrationSvg;
  global.nftMesaMedirComputeLayout = computeMesaMedirLayout;
})(typeof window !== 'undefined' ? window : globalThis);
