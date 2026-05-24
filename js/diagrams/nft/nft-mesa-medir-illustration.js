/**
 * NFT mesa: vista ilustrada isométrica para pestaña Medir (solo lectura).
 * Generada desde config guardada; no sustituye el esquema técnico del asistente.
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

  /** Proyección isométrica: eje X → derecha-abajo, Y → izquierda-abajo, Z → arriba. */
  function iso(x, y, z, O, sc) {
    const ox = O.x;
    const oy = O.y;
    const s = sc != null ? sc : 1;
    return {
      x: ox + (x - y) * 0.866 * s,
      y: oy + (x + y) * 0.5 * s - z * s,
    };
  }

  function computeMesaMedirLayout(cfg, equipOpts) {
    const EO = equipOpts || {};
    const hyd =
      typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 4, nHx: 8 };
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

    const nTiers = tiers ? tiers.length : 1;
    const maxTubes = tiers ? Math.max.apply(null, tiers) : hyd.nCh;
    const totalTubes = tiers ? tiers.reduce((a, b) => a + b, 0) : hyd.nCh;
    const huecosN = Math.min(30, Math.max(2, hx));
    const multinivel = !!tiers;

    const W = Math.max(520, 180 + maxTubes * 72 + (multinivel ? 40 : 0));
    const H = multinivel ? Math.max(420, 200 + nTiers * 88) : Math.max(380, 200 + hyd.nCh * 36);

    return {
      cfg: cfg,
      hyd: hyd,
      vol: vol,
      huecosN: huecosN,
      tiers: tiers,
      nTiers: nTiers,
      maxTubes: maxTubes,
      totalTubes: totalTubes,
      nCh: hyd.nCh,
      multinivel: multinivel,
      W: W,
      H: H,
      showCalentador: EO.calentador !== false && (cfg.equipamiento || []).indexOf('calentador') >= 0,
      showDifusor: EO.difusor !== false && (cfg.equipamiento || []).indexOf('difusor') >= 0,
      pend: cfg.nftPendientePct != null ? cfg.nftPendientePct : 2,
    };
  }

  function boxIsoPath(x, y, z, w, d, h, O, sc) {
    const p000 = iso(x, y, z, O, sc);
    const p100 = iso(x + w, y, z, O, sc);
    const p010 = iso(x, y + d, z, O, sc);
    const p110 = iso(x + w, y + d, z, O, sc);
    const p001 = iso(x, y, z + h, O, sc);
    const p101 = iso(x + w, y, z + h, O, sc);
    const p011 = iso(x, y + d, z + h, O, sc);
    return {
      top:
        'M ' +
        fq(p001.x) +
        ' ' +
        fq(p001.y) +
        ' L ' +
        fq(p101.x) +
        ' ' +
        fq(p101.y) +
        ' L ' +
        fq(p011.x) +
        ' ' +
        fq(p011.y) +
        ' L ' +
        fq(p001.x) +
        ' ' +
        fq(p001.y) +
        ' Z',
      left:
        'M ' +
        fq(p001.x) +
        ' ' +
        fq(p001.y) +
        ' L ' +
        fq(p000.x) +
        ' ' +
        fq(p000.y) +
        ' L ' +
        fq(p010.x) +
        ' ' +
        fq(p010.y) +
        ' L ' +
        fq(p011.x) +
        ' ' +
        fq(p011.y) +
        ' Z',
      right:
        'M ' +
        fq(p101.x) +
        ' ' +
        fq(p101.y) +
        ' L ' +
        fq(p100.x) +
        ' ' +
        fq(p100.y) +
        ' L ' +
        fq(p110.x) +
        ' ' +
        fq(p110.y) +
        ' L ' +
        fq(p011.x) +
        ' ' +
        fq(p011.y) +
        ' Z',
      front:
        'M ' +
        fq(p000.x) +
        ' ' +
        fq(p000.y) +
        ' L ' +
        fq(p100.x) +
        ' ' +
        fq(p100.y) +
        ' L ' +
        fq(p110.x) +
        ' ' +
        fq(p110.y) +
        ' L ' +
        fq(p010.x) +
        ' ' +
        fq(p010.y) +
        ' Z',
    };
  }

  function channelIsoPaths(x, y, z, w, d, h, gidBase, stroke) {
    const O = { x: 88, y: 52 };
    const sc = 1;
    const b = boxIsoPath(x, y, z, w, d, h, O, sc);
    return (
      '<path d="' +
      b.left +
      '" fill="url(#' +
      gidBase +
      'TL)" stroke="' +
      stroke +
      '" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<path d="' +
      b.right +
      '" fill="url(#' +
      gidBase +
      'TR)" stroke="' +
      stroke +
      '" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<path d="' +
      b.top +
      '" fill="url(#' +
      gidBase +
      'TT)" stroke="' +
      stroke +
      '" stroke-width="1.15" stroke-linejoin="round"/>' +
      '<path d="' +
      b.front +
      '" fill="url(#' +
      gidBase +
      'TF)" opacity="0.35" stroke="' +
      stroke +
      '" stroke-width="0.9"/>'
    );
  }

  function plantEllipseHtml(gx, gy, hr, dat, cult) {
    const fill = dat && dat.variedad ? '#86efac' : '#d1fae5';
    const stroke = dat && dat.variedad ? '#15803d' : '#94a3b8';
    let h =
      '<ellipse cx="' +
      fq(gx) +
      '" cy="' +
      fq(gy) +
      '" rx="' +
      fq(hr) +
      '" ry="' +
      fq(hr * 0.72) +
      '" fill="' +
      fill +
      '" stroke="' +
      stroke +
      '" stroke-width="1.1" pointer-events="none"/>';
    if (dat && dat.variedad && typeof global.cultivoEmoji === 'function') {
      const em = global.cultivoEmoji(cult);
      if (em) {
        h +=
          '<text x="' +
          fq(gx) +
          '" y="' +
          fq(gy + 1) +
          '" text-anchor="middle" dominant-baseline="central" font-size="' +
          Math.min(11, hr * 1.1) +
          '" pointer-events="none">' +
          em +
          '</text>';
      }
    }
    return h;
  }

  function buildMesaMedirDefs(gidBase) {
    const P = typeof HC_DIAG !== 'undefined' && HC_DIAG.nft ? HC_DIAG.nft : {};
    const ch0 = P.canalGrad0 || '#f5e6c8';
    const ch1 = P.canalGrad1 || '#c9a66b';
    let s = '<defs>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'TL" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' +
      ch0 +
      '"/><stop offset="100%" stop-color="#d4b896"/></linearGradient>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'TR" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8d4b8"/><stop offset="100%" stop-color="' +
      ch1 +
      '"/></linearGradient>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'TT" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#faf6ef"/><stop offset="100%" stop-color="' +
      ch0 +
      '"/></linearGradient>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'TF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a8a29e"/><stop offset="100%" stop-color="#78716c"/></linearGradient>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'Tbl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e7e5e4"/><stop offset="100%" stop-color="#a8a29e"/></linearGradient>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'Tk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'Aq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>';
    s +=
      '<linearGradient id="' +
      gidBase +
      'Bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0fdf4"/><stop offset="55%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#ecfdf5"/></linearGradient>';
    s += '</defs>';
    return s;
  }

  function buildScene(L, suf) {
    const gidBase = 'nftMiMesa' + suf;
    const P = typeof HC_DIAG !== 'undefined' && HC_DIAG.nft ? HC_DIAG.nft : {};
    let s = '';
    const O = { x: 88, y: 52 };
    const sc = 1;
    const tableW = Math.max(4, L.maxTubes) * 2.2 + 2;
    const tableD = L.multinivel ? 3.2 : 2.6;
    const tableH = 0.35;
    const tb = boxIsoPath(0, 0, 0, tableW, tableD, tableH, O, sc);
    s += '<path d="' + tb.top + '" fill="url(#' + gidBase + 'Tbl)" stroke="#78716c" stroke-width="1.2"/>';
    s += '<path d="' + tb.left + '" fill="#d6d3d1" stroke="#78716c" stroke-width="1"/>';
    s += '<path d="' + tb.right + '" fill="#a8a29e" stroke="#78716c" stroke-width="1"/>';

    const tubeW = 1.85;
    const tubeD = 0.55;
    const tubeH = 0.42;
    const gap = 0.35;
    let gIdx = 0;

    if (L.multinivel && L.tiers) {
      for (let t = 0; t < L.nTiers; t++) {
        const nt = L.tiers[t];
        const zBase = tableH + 0.08 + t * (tubeH + 0.55);
        const shelf = boxIsoPath(-0.15, -0.1, zBase - 0.06, tableW + 0.2, tableD + 0.15, 0.08, O, sc);
        s +=
          '<path d="' +
          shelf.top +
          '" fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.9" opacity="0.95"/>';
        for (let k = 0; k < nt; k++) {
          const x0 = 0.5 + k * (tubeW + gap);
          s += channelIsoPaths(x0, 0.35, zBase, tubeW, tubeD, tubeH, gidBase, '#92400e');
          const nHx = L.huecosN;
          for (let j = 0; j < nHx; j++) {
            const along = nHx <= 1 ? 0.5 : j / (nHx - 1);
            const px = x0 + 0.2 + along * (tubeW - 0.35);
            const py = 0.35 + tubeD * 0.5;
            const pTop = iso(px, py, zBase + tubeH + 0.02, O, sc);
            let dat = { variedad: '' };
            if (global.state && global.state.torre[gIdx] && global.state.torre[gIdx][j]) {
              dat = global.state.torre[gIdx][j];
            }
            const cult =
              dat.variedad && typeof global.getCultivoDB === 'function' ? global.getCultivoDB(dat.variedad) : null;
            s += plantEllipseHtml(pTop.x, pTop.y, 5.5, dat, cult);
          }
          gIdx++;
        }
      }
    } else {
      const nT = Math.max(1, L.nCh);
      for (let i = 0; i < nT; i++) {
        const x0 = 0.45 + i * (tubeW + gap);
        const z0 = tableH + 0.1;
        s += channelIsoPaths(x0, 0.4, z0, tubeW, tubeD, tubeH, gidBase, '#92400e');
        const nHx = L.huecosN;
        for (let j = 0; j < nHx; j++) {
          const along = nHx <= 1 ? 0.5 : j / (nHx - 1);
          const px = x0 + 0.18 + along * (tubeW - 0.32);
          const py = 0.4 + tubeD * 0.5;
          const pTop = iso(px, py, z0 + tubeH + 0.02, O, sc);
          let dat = { variedad: '' };
          if (global.state && global.state.torre[i] && global.state.torre[i][j]) {
            dat = global.state.torre[i][j];
          }
          const cult =
            dat.variedad && typeof global.getCultivoDB === 'function' ? global.getCultivoDB(dat.variedad) : null;
          s += plantEllipseHtml(pTop.x, pTop.y, 5.5, dat, cult);
        }
      }
    }

    const tankX = tableW + 0.6;
    const tankY = 0.2;
    const tankZ = 0;
    const tankW = 2.4;
    const tankD = 1.4;
    const tankH = 1.05;
    const tk = boxIsoPath(tankX, tankY, tankZ, tankW, tankD, tankH, O, sc);
    s += '<path d="' + tk.left + '" fill="url(#' + gidBase + 'Tk)" stroke="#64748b" stroke-width="1.2"/>';
    s += '<path d="' + tk.right + '" fill="#e2e8f0" stroke="#64748b" stroke-width="1.2"/>';
    s += '<path d="' + tk.top + '" fill="url(#' + gidBase + 'Tk)" stroke="#64748b" stroke-width="1.2"/>';
    const waterH = tankH * 0.72;
    const wk = boxIsoPath(tankX + 0.12, tankY + 0.12, tankZ + 0.08, tankW - 0.22, tankD - 0.22, waterH, O, sc);
    s += '<path d="' + wk.top + '" fill="url(#' + gidBase + 'Aq)" opacity="0.92" stroke="#0369a1" stroke-width="0.8"/>';
    const tLabel = iso(tankX + tankW / 2, tankY + tankD / 2, tankZ + waterH * 0.45, O, sc);
    s +=
      '<text x="' +
      fq(tLabel.x) +
      '" y="' +
      fq(tLabel.y) +
      '" text-anchor="middle" fill="#ecfdf5" font-size="13" font-weight="800" font-family="system-ui,sans-serif" pointer-events="none">' +
      L.vol +
      ' L</text>';

    const pump = iso(tankX + tankW + 0.35, tankY + 0.5, 0, O, sc);
    s +=
      '<rect x="' +
      fq(pump.x) +
      '" y="' +
      fq(pump.y) +
      '" width="22" height="16" rx="3" fill="#334155" stroke="#1e293b" stroke-width="1" pointer-events="none"/>';
    s +=
      '<text x="' +
      fq(pump.x + 11) +
      '" y="' +
      fq(pump.y + 11) +
      '" text-anchor="middle" font-size="7" fill="#e2e8f0" font-family="system-ui,sans-serif" pointer-events="none">BOMBA</text>';

    if (L.showDifusor && typeof global.nftSvgAireadorEnSuelo === 'function') {
      const tank2d = { tx: L.W * 0.72, tankY: L.H - 118, tankW: 120, tankH: 88 };
      s += global.nftSvgAireadorEnSuelo(tank2d.tx, tank2d.tankY, tank2d.tankW, tank2d.tankH, P);
    }

    const flowHint =
      typeof NFT_FLOW_SUPPLY !== 'undefined'
        ? NFT_FLOW_SUPPLY
        : '#2563eb';
    const flowRet = typeof NFT_FLOW_RETURN !== 'undefined' ? NFT_FLOW_RETURN : '#16a34a';
    const p0 = iso(-0.3, tableD + 0.3, tableH * 0.5, O, sc);
    const p1 = iso(tableW * 0.3, tableD + 0.5, tableH + 0.5, O, sc);
    s +=
      '<path d="M ' +
      fq(p0.x) +
      ' ' +
      fq(p0.y) +
      ' L ' +
      fq(p1.x) +
      ' ' +
      fq(p1.y) +
      '" stroke="' +
      flowHint +
      '" stroke-width="2.5" fill="none" stroke-dasharray="6 4" opacity="0.75" pointer-events="none"/>';
    const pR = iso(tankX, tankY + tankD * 0.5, tankH + 0.2, O, sc);
    s +=
      '<path d="M ' +
      fq(p1.x) +
      ' ' +
      fq(p1.y) +
      ' L ' +
      fq(pR.x) +
      ' ' +
      fq(pR.y) +
      '" stroke="' +
      flowRet +
      '" stroke-width="2.5" fill="none" stroke-dasharray="5 4" opacity="0.75" pointer-events="none"/>';

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
    const gidBase = 'nftMiMesa' + suf;
    const scene = buildScene(L, suf);
    const foot = L.multinivel
      ? 'Mesa multinivel · ' + L.tiers.join('+') + ' tubos/nivel · ' + L.vol + ' L'
      : 'Mesa · ' + L.nCh + ' tubos × ' + L.huecosN + ' huecos · ' + L.vol + ' L';

    return (
      '<svg class="torre-svg-diagram nft-mesa-medir-illustration nft-diagram--scroll hc-illo-diagram medir-vista-illo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      L.W +
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
      buildMesaMedirDefs(gidBase) +
      '<rect width="100%" height="100%" fill="url(#' +
      gidBase +
      'Bg)"/>' +
      '<g class="nft-mesa-medir-scene" pointer-events="none">' +
      scene +
      '</g>' +
      '<text x="' +
      (L.W - 14) +
      '" y="22" text-anchor="end" font-size="10" fill="#64748b" font-family="system-ui,sans-serif" pointer-events="none">Vista ilustrada · orientativa</text>' +
      '</svg>'
    );
  }

  global.buildNftMesaMedirIllustrationSvg = buildNftMesaMedirIllustrationSvg;
  global.nftMesaMedirComputeLayout = computeMesaMedirLayout;
})(typeof window !== 'undefined' ? window : globalThis);
