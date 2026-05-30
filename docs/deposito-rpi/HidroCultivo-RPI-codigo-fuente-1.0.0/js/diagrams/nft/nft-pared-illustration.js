/**
 * NFT pared: vista ilustrada para Cultivo e instalación (sin líneas de flujo).
 * El asistente sigue usando buildNftSerpentineDiagramSvg (esquema técnico).
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

  /** Misma geometría de huecos que buildNftSerpentineDiagramSvg (pared). */
  function computeParedLayout(canales, huecos, volL, equipOpts) {
    const EO = equipOpts || {};
    const nCh = Math.min(Math.max(parseInt(String(canales), 10) || 1, 1), 24);
    const huecosN = Math.min(Math.max(parseInt(String(huecos), 10) || 2, 2), 30);
    const vol = Math.min(200, Math.max(5, parseInt(String(volL), 10) || 20));
    const W0 =
      typeof nftDiagramCanvasW0 === 'function'
        ? nftDiagramCanvasW0()
        : 520;
    const compactSerpHeader = nCh * huecosN > 20;
    const hdrSerpPad =
      typeof nftDiagramHeaderTypography === 'function'
        ? nftDiagramHeaderTypography(W0, { compact: compactSerpHeader, withLegend: false })
        : { topPadMin: 44 };
    const rowStep = Math.max(58, Math.min(74, Math.floor(840 / Math.max(nCh, 1))));
    const topPad = Math.max(44, hdrSerpPad.topPadMin);
    const botTank = 162;
    const H = topPad + nCh * rowStep + botTank;
    const marginX = 34;
    const xL = marginX;
    const xR = W0 - marginX;
    const tubeH = 17;
    const tubeVisH = 22;
    const padFlow = 14;
    const tankY = H - botTank + 4;
    const tankH = 102;
    const tankW = Math.min(400, Math.round(152 + vol * 0.72));
    const tx = (W0 - tankW) / 2;
    const waterTop = tankY + 6;
    const waterH = tankH - 16;
    const altCmSerp =
      EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0
        ? Math.round(Number(EO.nftAlturaBombeoCm))
        : null;
    const legHintSerp = { volL: vol, nCanales: nCh, nTubosTotal: nCh, alturaBadgeNTubos: nCh };
    const legTierSerp =
      typeof nftDiagramLegibilityHint === 'function'
        ? nftDiagramLegibilityHint(legHintSerp)
        : 0;
    const volFsSerp =
      typeof nftTankVolumeFontSize === 'function'
        ? nftTankVolumeFontSize(vol, legTierSerp)
        : 14;
    const altBadgeSerp =
      typeof nftAlturaBadgeBesideTank === 'function'
        ? nftAlturaBadgeBesideTank(altCmSerp, tx, tankY, tankW, tankH, W0, legHintSerp)
        : { canvasW: W0, html: '' };
    const Wsvg = altBadgeSerp.canvasW;
    const yRow = (i) => topPad + i * rowStep + Math.floor(rowStep / 2);
    const spanTube = xR - xL - 2 * padFlow;
    const hr = Math.max(7.5, Math.min(15, (spanTube / Math.max(huecosN - 1, 1)) * 0.58));
    const holeNumFsSerp = (nCh >= 10 ? 8.5 : nCh >= 6 ? 9.25 : 10) + 0.85;
    const compactSerp = nCh * huecosN > 20;

    return {
      nCh,
      huecosN,
      vol,
      Wsvg,
      H,
      xL,
      xR,
      topPad,
      rowStep,
      tubeH,
      tubeVisH,
      padFlow,
      tankY,
      tankH,
      tankW,
      tx,
      waterTop,
      waterH,
      volFsSerp,
      altBadgeSerp,
      yRow,
      spanTube,
      hr,
      holeNumFsSerp,
      compactSerp,
      showCalentador: EO.calentador === true,
      showDifusor: EO.difusor === true,
    };
  }

  /** Tubería PVC gris en zigzag por los laterales (decorativa, sin líneas azules de esquema). */
  function buildPlumbingZigzag(L) {
    const m = 11;
    const xPL = L.xL - m;
    const xPR = L.xR + m;
    let s = '<g class="nft-pi-plumbing" pointer-events="none">';
    const pipeSt =
      'stroke="#e2e8f0" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"';
    const pipeInner = 'stroke="#cbd5e1" stroke-width="2.2" fill="none" stroke-linecap="round"';
    for (let i = 0; i < L.nCh - 1; i++) {
      const yA = L.yRow(i);
      const yB = L.yRow(i + 1);
      const l2r = i % 2 === 0;
      const xA = l2r ? L.xR - L.padFlow + 4 : L.xL + L.padFlow - 4;
      const xVert = l2r ? xPR : xPL;
      const xB = l2r ? L.xR - L.padFlow + 4 : L.xL + L.padFlow - 4;
      s += '<path d="M ' + fq(xA) + ' ' + fq(yA) + ' L ' + fq(xVert) + ' ' + fq(yA) + ' L ' + fq(xVert) + ' ' + fq(yB) + ' L ' + fq(xB) + ' ' + fq(yB) + '" ' + pipeSt + '/>';
      s += '<path d="M ' + fq(xA) + ' ' + fq(yA) + ' L ' + fq(xVert) + ' ' + fq(yA) + ' L ' + fq(xVert) + ' ' + fq(yB) + ' L ' + fq(xB) + ' ' + fq(yB) + '" ' + pipeInner + '/>';
    }
    const yBot = L.yRow(L.nCh - 1);
    const yTank = L.tankY + 8;
    s +=
      '<path d="M ' +
      fq(xPL) +
      ' ' +
      fq(yBot) +
      ' L ' +
      fq(xPL) +
      ' ' +
      fq(yTank) +
      ' L ' +
      fq(L.tx + 14) +
      ' ' +
      fq(yTank) +
      '" ' +
      pipeSt +
      '/>';
    s +=
      '<path d="M ' +
      fq(L.tx + L.tankW - 14) +
      ' ' +
      fq(yTank) +
      ' L ' +
      fq(xPR) +
      ' ' +
      fq(yTank) +
      ' L ' +
      fq(xPR) +
      ' ' +
      fq(yBot) +
      '" ' +
      pipeSt +
      '/>';
    s += '</g>';
    return s;
  }

  function buildDecor(L, suf, equipOpts) {
    const gidWall = 'nftPiWall' + suf;
    const gidCh = 'nftPiCh' + suf;
    const gidLed = 'nftPiLed' + suf;
    const gidTk = 'nftPiTk' + suf;
    const gidAq = 'nftPiAq' + suf;
    const wallTop = L.topPad - 22;
    const wallBot = L.yRow(L.nCh - 1) + L.tubeVisH + 36;
    const wallX = L.xL - 28;
    const wallW = L.xR - L.xL + 56;

    let s = '';
    s +=
      '<defs>' +
      '<linearGradient id="' +
      gidWall +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#f1f5f9"/>' +
      '<stop offset="100%" stop-color="#dbe3ed"/></linearGradient>' +
      '<linearGradient id="' +
      gidCh +
      '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#a67c52"/>' +
      '<stop offset="40%" stop-color="#7a5230"/>' +
      '<stop offset="100%" stop-color="#5c3d22"/></linearGradient>' +
      '<linearGradient id="' +
      gidLed +
      '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#f9a8d4" stop-opacity="0.15"/>' +
      '<stop offset="50%" stop-color="#e879f9" stop-opacity="0.55"/>' +
      '<stop offset="100%" stop-color="#f9a8d4" stop-opacity="0.15"/></linearGradient>' +
      '<linearGradient id="' +
      gidTk +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#334155"/>' +
      '<stop offset="100%" stop-color="#1e293b"/></linearGradient>' +
      '<linearGradient id="' +
      gidAq +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>' +
      '<stop offset="100%" stop-color="#0284c7" stop-opacity="0.85"/></linearGradient>' +
      '<filter id="nftPiSh' +
      suf +
      '" x="-8%" y="-8%" width="116%" height="116%">' +
      '<feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.22"/></filter>' +
      '</defs>';

    s +=
      '<rect class="nft-pi-room" width="' +
      L.Wsvg +
      '" height="' +
      L.H +
      '" fill="#f8fafc" pointer-events="none"/>';

    s +=
      '<rect class="nft-pi-wall" x="' +
      fq(wallX) +
      '" y="' +
      fq(wallTop) +
      '" width="' +
      fq(wallW) +
      '" height="' +
      fq(wallBot - wallTop) +
      '" rx="10" fill="url(#' +
      gidWall +
      ')" stroke="#94a3b8" stroke-width="1" pointer-events="none"/>';

    s +=
      '<line x1="' +
      fq(L.xL - 18) +
      '" y1="' +
      fq(wallTop + 6) +
      '" x2="' +
      fq(L.xL - 18) +
      '" y2="' +
      fq(wallBot - 4) +
      '" stroke="#475569" stroke-width="5" stroke-linecap="round" opacity="0.45" pointer-events="none"/>';
    s +=
      '<line x1="' +
      fq(L.xR + 18) +
      '" y1="' +
      fq(wallTop + 6) +
      '" x2="' +
      fq(L.xR + 18) +
      '" y2="' +
      fq(wallBot - 4) +
      '" stroke="#475569" stroke-width="5" stroke-linecap="round" opacity="0.45" pointer-events="none"/>';

    const esInterior =
      typeof global.nftCfgEsInterior === 'function'
        ? global.nftCfgEsInterior(equipOpts || {})
        : false;

    for (let i = 0; i < L.nCh; i++) {
      const yRi = L.yRow(i);
      const yc = yRi - L.tubeVisH * 0.35;
      if (esInterior) {
        const ledY = yc - 10;
        s +=
          '<rect x="' +
          (L.xL - 6) +
          '" y="' +
          ledY +
          '" width="' +
          (L.xR - L.xL + 12) +
          '" height="5" rx="2.5" fill="url(#' +
          gidLed +
          ')" opacity="0.85" pointer-events="none"/>';
        s +=
          '<rect x="' +
          (L.xL - 4) +
          '" y="' +
          (ledY - 18) +
          '" width="' +
          (L.xR - L.xL + 8) +
          '" height="20" fill="#fdf4ff" opacity="0.35" pointer-events="none"/>';
      }

      const bracketY = yRi + L.tubeVisH * 0.42;
      s +=
        '<path d="M ' +
        fq(L.xL - 16) +
        ' ' +
        fq(bracketY) +
        ' L ' +
        fq(L.xL - 4) +
        ' ' +
        fq(bracketY - 5) +
        ' L ' +
        fq(L.xL - 4) +
        ' ' +
        fq(bracketY + 5) +
        ' Z" fill="#64748b" opacity="0.5" pointer-events="none"/>';
      s +=
        '<path d="M ' +
        fq(L.xR + 16) +
        ' ' +
        fq(bracketY) +
        ' L ' +
        fq(L.xR + 4) +
        ' ' +
        fq(bracketY - 5) +
        ' L ' +
        fq(L.xR + 4) +
        ' ' +
        fq(bracketY + 5) +
        ' Z" fill="#64748b" opacity="0.5" pointer-events="none"/>';

      s +=
        '<rect x="' +
        fq(L.xL + 2) +
        '" y="' +
        fq(yc + 3) +
        '" width="' +
        fq(L.xR - L.xL - 4) +
        '" height="' +
        L.tubeVisH +
        '" rx="12" fill="#3d2814" opacity="0.35" pointer-events="none"/>';
      s +=
        '<rect x="' +
        L.xL +
        '" y="' +
        yc +
        '" width="' +
        (L.xR - L.xL) +
        '" height="' +
        L.tubeVisH +
        '" rx="12" fill="url(#' +
        gidCh +
        ')" stroke="#4a3220" stroke-width="1.2" filter="url(#nftPiSh' +
        suf +
        ')" pointer-events="none"/>';
      s +=
        '<line x1="' +
        L.xL +
        '" y1="' +
        (yc + 3) +
        '" x2="' +
        L.xR +
        '" y2="' +
        (yc + 3) +
        '" stroke="#c4a574" stroke-width="1.4" opacity="0.75" pointer-events="none"/>';

      const capR = 7;
      s +=
        '<circle cx="' +
        (L.xL + 2) +
        '" cy="' +
        yRi +
        '" r="' +
        capR +
        '" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" pointer-events="none"/>';
      s +=
        '<circle cx="' +
        (L.xR - 2) +
        '" cy="' +
        yRi +
        '" r="' +
        capR +
        '" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" pointer-events="none"/>';

      if (i === L.nCh - 1) {
        const wY = yc + L.tubeVisH * 0.55;
        s +=
          '<rect x="' +
          L.xL +
          '" y="' +
          wY +
          '" width="' +
          (L.xR - L.xL) +
          '" height="' +
          (L.tubeVisH * 0.42) +
          '" fill="#0ea5e9" opacity="0.35" pointer-events="none"/>';
        for (let bi = 0; bi < 6; bi++) {
          s +=
            '<circle cx="' +
            (L.xL + 20 + bi * ((L.xR - L.xL - 40) / 5)) +
            '" cy="' +
            (wY + 6 + (bi % 2) * 3) +
            '" r="1.8" fill="#e0f2fe" opacity="0.9" pointer-events="none"/>';
        }
      }

    }

    s += buildPlumbingZigzag(L);

    s +=
      '<rect x="' +
      L.tx +
      '" y="' +
      L.tankY +
      '" width="' +
      L.tankW +
      '" height="' +
      L.tankH +
      '" rx="12" fill="url(#' +
      gidTk +
      ')" stroke="#166534" stroke-width="1.4" filter="url(#nftPiSh' +
      suf +
      ')" pointer-events="none"/>';
    s +=
      '<rect x="' +
      (L.tx + 4) +
      '" y="' +
      L.waterTop +
      '" width="' +
      (L.tankW - 8) +
      '" height="' +
      L.waterH +
      '" rx="8" fill="url(#' +
      gidAq +
      ')" opacity="0.92" pointer-events="none"/>';
    s += L.altBadgeSerp.html;

    const volCx = L.tx + L.tankW / 2;
    s +=
      '<text x="' +
      volCx +
      '" y="' +
      (L.tankY + Math.floor(L.tankH / 2) + 5) +
      '" text-anchor="middle" fill="#ecfdf5" font-size="' +
      L.volFsSerp +
      '" font-weight="800" font-family="system-ui,sans-serif" pointer-events="none">' +
      L.vol +
      ' L</text>';

    if (L.showCalentador) {
      const hx = L.tx + 18;
      s +=
        '<rect x="' +
        (hx - 5) +
        '" y="' +
        (L.tankY + L.tankH - 36) +
        '" width="10" height="30" rx="5" fill="#f97316" stroke="#c2410c" stroke-width="1.1" pointer-events="none"/>';
    }
    if (L.showDifusor && typeof global.nftSvgAireadorEnSuelo === 'function') {
      const P = typeof HC_DIAG !== 'undefined' && HC_DIAG.nft ? HC_DIAG.nft : {};
      s += global.nftSvgAireadorEnSuelo(L.tx, L.tankY, L.tankW, L.tankH, P);
    } else {
      const pumpScale = Math.max(0.84, Math.min(1.24, 0.9 + L.nCh * 0.015));
      const px = L.tx + 12;
      const py = L.waterTop + L.waterH * 0.5 - 20 * pumpScale;
      s += drawUnifiedPump(px, py, pumpScale);
    }

    return { html: s, gidCh: gidCh };
  }

  function buildPlants(L, P, interactive) {
    let plants = '';
    const slotAlongRow = L.huecosN <= 1 ? L.spanTube : L.spanTube / Math.max(1, L.huecosN - 1);

    for (let i = 0; i < L.nCh; i++) {
      const y = L.yRow(i);
      const rtl = i % 2 === 1;
      for (let j = 0; j < L.huecosN; j++) {
        const t = L.huecosN <= 1 ? 0.5 : j / (L.huecosN - 1);
        const gx = rtl ? L.xR - L.padFlow - t * L.spanTube : L.xL + L.padFlow + t * L.spanTube;
        const gy = y - L.tubeVisH * 0.92;
        const numShow = j + 1;
        let dat = { variedad: '', fecha: '' };
        if (interactive && global.state && global.state.torre[i] && global.state.torre[i][j]) {
          dat = global.state.torre[i][j];
        }
        const cult =
          dat.variedad && typeof global.getCultivoDB === 'function' ? global.getCultivoDB(dat.variedad) : null;
        const col =
          interactive && typeof global.torreListaColorCesta === 'function'
            ? global.torreListaColorCesta(i, j)
            : { bg: P.plantEmptyBg || '#f8fafc', border: P.plantEmptyBorder || '#cbd5e1' };

        if (typeof global.hcIlloNftHuecoLayer === 'function') {
          plants += global.hcIlloNftHuecoLayer(gx, gy, L.hr, i, j, dat, cult, interactive, P, {
            compact: L.compactSerp,
            numBelow: false,
            sinTexto: true,
            numShow: numShow,
            extraDy: 5,
            slotAlong: slotAlongRow,
          });
        } else if (interactive) {
          const dias =
            dat.fecha && typeof global.torreDiasCicloVisual === 'function'
              ? global.torreDiasCicloVisual(dat)
              : null;
          let ariaTxt = 'Canal T' + (i + 1) + ', hueco ' + (j + 1);
          ariaTxt += dat.variedad ? ', ' + dat.variedad : ', vacío';
          if (dias !== null) ariaTxt += ', día ' + dias;
          plants +=
            '<g class="hc-cesta hc-nft-hueco" data-n="' +
            i +
            '" data-c="' +
            j +
            '" role="button" tabindex="0" aria-label="' +
            (typeof global.escAriaAttr === 'function' ? global.escAriaAttr(ariaTxt) : ariaTxt) +
            '">';
          plants +=
            '<circle cx="' +
            fq(gx) +
            '" cy="' +
            fq(gy) +
            '" r="' +
            fq(L.hr) +
            '" fill="' +
            col.bg +
            '" stroke="' +
            col.border +
            '" stroke-width="1.35"/>';
          const ptrR =
            typeof global.nftHuecoPointerRadius === 'function'
              ? global.nftHuecoPointerRadius(L.hr, true, slotAlongRow)
              : L.hr + 4;
          plants +=
            '<circle cx="' +
            fq(gx) +
            '" cy="' +
            fq(gy) +
            '" r="' +
            fq(ptrR) +
            '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>';
          plants += '</g>';
        }
      }
    }
    return plants;
  }

  function buildNftParedIllustrationSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
    const EO = equipOpts || {};
    const interactive = EO.interactive === true;
    const suf =
      svgIdSuffix != null && String(svgIdSuffix).trim() !== ''
        ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
        : '';
    const tid = 'nftPiTitle' + suf;
    const L = computeParedLayout(canales, huecos, volL, equipOpts);
    const P = typeof HC_DIAG !== 'undefined' && HC_DIAG.nft ? HC_DIAG.nft : {};
    const decor = buildDecor(L, suf, equipOpts);
    let plants = buildPlants(L, P, interactive);

    if (interactive) {
      plants = '<g class="nft-pi-plants">' + plants + '</g>';
    }

    const foot = L.vol + ' L · ' + L.nCh + ' tubos × ' + L.huecosN + ' huecos';

    return (
      '<svg class="torre-svg-diagram nft-pared-illustration nft-diagram--scroll hc-illo-diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      L.Wsvg +
      ' ' +
      L.H +
      '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' +
      tid +
      '">' +
      '<title id="' +
      tid +
      '">' +
      escSvg('NFT pared · ' + foot) +
      '</title>' +
      '<g class="nft-pi-decor" pointer-events="none">' +
      decor.html +
      '</g>' +
      plants +
      '</svg>'
    );
  }

  global.buildNftParedIllustrationSvg = buildNftParedIllustrationSvg;
  global.nftParedComputeLayout = computeParedLayout;
})(typeof window !== 'undefined' ? window : globalThis);
