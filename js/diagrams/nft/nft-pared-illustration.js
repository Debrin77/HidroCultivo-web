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
    const hr = Math.max(6.2, Math.min(13.2, (spanTube / Math.max(huecosN - 1, 1)) * 0.51));
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

  function buildDecor(L, suf) {
    const gidWall = 'nftPiWall' + suf;
    const gidCh = 'nftPiCh' + suf;
    const gidTk = 'nftPiTk' + suf;
    const gidAq = 'nftPiAq' + suf;
    const P = typeof HC_DIAG !== 'undefined' && HC_DIAG.nft ? HC_DIAG.nft : {};
    const wallTop = L.topPad - 18;
    const wallBot = L.yRow(L.nCh - 1) + L.tubeH + 28;
    const wallX = L.xL - 22;
    const wallW = L.xR - L.xL + 44;

    let s = '';
    s +=
      '<defs>' +
      '<linearGradient id="' +
      gidWall +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#e8ecf1"/>' +
      '<stop offset="55%" stop-color="#d5dce6"/>' +
      '<stop offset="100%" stop-color="#c5ced9"/></linearGradient>' +
      '<linearGradient id="' +
      gidCh +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#5eb8e8"/>' +
      '<stop offset="45%" stop-color="#0284c7"/>' +
      '<stop offset="100%" stop-color="#0369a1"/></linearGradient>' +
      '<linearGradient id="' +
      gidTk +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#22c55e"/>' +
      '<stop offset="100%" stop-color="#15803d"/></linearGradient>' +
      '<linearGradient id="' +
      gidAq +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.85"/>' +
      '<stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.75"/></linearGradient>' +
      '<filter id="nftPiSh' +
      suf +
      '" x="-8%" y="-8%" width="116%" height="116%">' +
      '<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.18"/></filter>' +
      '</defs>';

    s +=
      '<rect class="nft-pi-sky" width="' +
      L.Wsvg +
      '" height="' +
      L.H +
      '" fill="#eef2f7" pointer-events="none"/>';

    s +=
      '<rect class="nft-pi-wall" x="' +
      fq(wallX) +
      '" y="' +
      fq(wallTop) +
      '" width="' +
      fq(wallW) +
      '" height="' +
      fq(wallBot - wallTop) +
      '" rx="14" fill="url(#' +
      gidWall +
      ')" stroke="#94a3b8" stroke-width="1.2" pointer-events="none"/>';

    s +=
      '<line x1="' +
      fq(L.xL - 14) +
      '" y1="' +
      fq(wallTop + 8) +
      '" x2="' +
      fq(L.xL - 14) +
      '" y2="' +
      fq(wallBot - 6) +
      '" stroke="#64748b" stroke-width="3.5" stroke-linecap="round" opacity="0.35" pointer-events="none"/>';
    s +=
      '<line x1="' +
      fq(L.xR + 14) +
      '" y1="' +
      fq(wallTop + 8) +
      '" x2="' +
      fq(L.xR + 14) +
      '" y2="' +
      fq(wallBot - 6) +
      '" stroke="#64748b" stroke-width="3.5" stroke-linecap="round" opacity="0.35" pointer-events="none"/>';

    for (let i = 0; i < L.nCh; i++) {
      const yRi = L.yRow(i);
      const yc = yRi - L.tubeH / 2;
      const bracketY = yRi + L.tubeH / 2 + 4;
      s +=
        '<line x1="' +
        fq(L.xL - 10) +
        '" y1="' +
        fq(bracketY) +
        '" x2="' +
        fq(L.xR + 10) +
        '" y2="' +
        fq(bracketY) +
        '" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" opacity="0.28" pointer-events="none"/>';

      s +=
        '<rect x="' +
        fq(L.xL + 1) +
        '" y="' +
        fq(yc + 2) +
        '" width="' +
        fq(L.xR - L.xL - 2) +
        '" height="' +
        L.tubeH +
        '" rx="10" fill="#0c4a6e" opacity="0.22" pointer-events="none"/>';
      s +=
        '<rect x="' +
        L.xL +
        '" y="' +
        yc +
        '" width="' +
        (L.xR - L.xL) +
        '" height="' +
        L.tubeH +
        '" rx="11" fill="url(#' +
        gidCh +
        ')" stroke="#075985" stroke-width="1.15" filter="url(#nftPiSh' +
        suf +
        ')" pointer-events="none"/>';
      s +=
        '<line x1="' +
        L.xL +
        '" y1="' +
        yc +
        '" x2="' +
        L.xR +
        '" y2="' +
        yc +
        '" stroke="#bae6fd" stroke-width="1.1" opacity="0.65" pointer-events="none"/>';
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
    if (L.showDifusor) {
      const ax = L.tx + L.tankW - 18;
      const ay = L.tankY + L.tankH - 16;
      s +=
        '<ellipse cx="' +
        ax +
        '" cy="' +
        ay +
        '" rx="12" ry="6.5" fill="#94a3b8" stroke="#64748b" stroke-width="1.1" pointer-events="none"/>';
      for (let bi = 0; bi < 4; bi++) {
        s +=
          '<circle cx="' +
          (ax + (bi % 2) * 3 - 1) +
          '" cy="' +
          (ay - 8 - bi * 3) +
          '" r="1.5" fill="#e2e8f0" opacity="0.9" pointer-events="none"/>';
      }
    }

    s +=
      '<text class="nft-pi-caption" x="' +
      (L.Wsvg / 2) +
      '" y="28" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#475569" pointer-events="none">NFT en pared · vista ilustrada</text>';

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
        const gy = y - L.tubeH * 0.55;
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
            numBelow: true,
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
    const decor = buildDecor(L, suf);
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
