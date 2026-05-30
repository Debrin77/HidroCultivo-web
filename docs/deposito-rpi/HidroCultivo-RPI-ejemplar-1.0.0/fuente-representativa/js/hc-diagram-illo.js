/**
 * Diagramas interpretativos (estilo ilustración) — DWC, RDWC, SRF, torre, huecos NFT.
 * SVG escalable (solo viewBox), IDs únicos por instancia, interactividad hc-cesta.
 */
(function () {
  'use strict';

  var HC_ILLO = {
    ink: '#0f2744',
    inkSoft: '#334155',
    water0: '#4fc3f7',
    water1: '#0288d1',
    water2: '#01579b',
    waterGlass: 'rgba(79,195,247,0.35)',
    lid: '#546e7a',
    lidHi: '#90a4ae',
    lidDark: '#37474f',
    pot: '#eceff1',
    potRim: '#ffffff',
    potInner: '#b0bec5',
    mesh: '#78909c',
    pump: '#ff9800',
    pumpHi: '#ffb74d',
    pumpDark: '#e65100',
    pipe: '#1976d2',
    flow: '#22c55e',
    bubble: '#ffffff',
    stone: '#546e7a',
    stoneHi: '#78909c',
    cal: '#fb923c',
    bg0: '#e3f2fd',
    bg1: '#bbdefb',
    bucket: '#42a5f5',
    bucketHi: '#64b5f6',
    bucketDeep: '#1565c0',
    bucketRim: '#37474f',
    spec: 'rgba(255,255,255,0.72)',
  };

  var _seq = 0;

  function uid(prefix) {
    _seq += 1;
    var slot =
      typeof state !== 'undefined' && state.torreActiva != null ? String(state.torreActiva) : '0';
    return (prefix || 'illo') + '-' + slot + '-' + _seq;
  }

  function esc(t) {
    return String(t || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAria(t) {
    return typeof escAriaAttr === 'function' ? escAriaAttr(t) : esc(t);
  }

  function animOn() {
    return typeof torreSvgAnimacionesActivas === 'function' ? torreSvgAnimacionesActivas() : false;
  }

  function cellData(n, c) {
    var t = typeof state !== 'undefined' ? state.torre : null;
    return t && t[n] && t[n][c] ? t[n][c] : { variedad: '', fecha: '', fotos: [], notas: '' };
  }

  function f1(n) {
    return Number(n).toFixed(1);
  }

  /** Etiquetas sin halo blanco global (evita textos ilegibles sobre tapa gris). */
  function illoText(x, y, txt, kind, anchor) {
    anchor = anchor || 'middle';
    var cls = 'hc-illo-label';
    if (kind === 'title') cls += ' hc-illo-label--title';
    else if (kind === 'subtitle') cls += ' hc-illo-label--subtitle';
    else if (kind === 'section') cls += ' hc-illo-label--section';
    else if (kind === 'vol') cls += ' hc-illo-label--vol';
    else if (kind === 'hint') cls += ' hc-illo-label--hint';
    return (
      '<text class="' +
      cls +
      '" x="' +
      f1(x) +
      '" y="' +
      f1(y) +
      '" text-anchor="' +
      anchor +
      '">' +
      esc(txt) +
      '</text>'
    );
  }

  function svgWrap(cls, vbW, vbH, titleId, title, body, pad) {
    pad = pad == null ? 18 : pad;
    var vb = -pad + ' ' + -pad + ' ' + (vbW + pad * 2) + ' ' + (vbH + pad * 2);
    return (
      '<svg class="torre-svg-diagram hc-illo-diagram ' +
      cls +
      '" viewBox="' +
      vb +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="' +
      esc(titleId) +
      '">' +
      '<title id="' +
      esc(titleId) +
      '">' +
      esc(title) +
      '</title>' +
      body +
      '</svg>'
    );
  }

  function defsBlock(u) {
    return (
      '<defs>' +
      '<linearGradient id="' +
      u +
      '-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' +
      HC_ILLO.bg0 +
      '"/><stop offset="100%" stop-color="' +
      HC_ILLO.bg1 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      u +
      '-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
      HC_ILLO.water0 +
      '"/><stop offset="100%" stop-color="' +
      HC_ILLO.water1 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      u +
      '-tank" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' +
      HC_ILLO.water2 +
      '"/><stop offset="40%" stop-color="' +
      HC_ILLO.water0 +
      '"/><stop offset="100%" stop-color="' +
      HC_ILLO.water2 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      u +
      '-lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
      HC_ILLO.lidHi +
      '"/><stop offset="55%" stop-color="' +
      HC_ILLO.lid +
      '"/><stop offset="100%" stop-color="' +
      HC_ILLO.lidDark +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      u +
      '-tank-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
      HC_ILLO.bucketHi +
      '"/><stop offset="45%" stop-color="' +
      HC_ILLO.bucket +
      '"/><stop offset="100%" stop-color="' +
      HC_ILLO.bucketDeep +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      u +
      '-water-inner" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#81d4fa" stop-opacity="0.9"/><stop offset="100%" stop-color="' +
      HC_ILLO.water1 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      u +
      '-pump-dome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
      HC_ILLO.pumpHi +
      '"/><stop offset="100%" stop-color="' +
      HC_ILLO.pump +
      '"/></linearGradient>' +
      '<pattern id="' +
      u +
      '-mesh" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 4 L4 0" stroke="' +
      HC_ILLO.mesh +
      '" stroke-width="0.45" opacity="0.35"/></pattern>' +
      '<filter id="' +
      u +
      '-sh" x="-12%" y="-12%" width="124%" height="124%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.18"/></filter>' +
      '<filter id="' +
      u +
      '-glow"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>'
    );
  }

  /** Punto en tapa isométrica (rejilla N×C). */
  function dwcLidPoint(ox, oy, lidW, skX, skY, col, cols, row, rows) {
    var tx = cols <= 1 ? 0.5 : col / (cols - 1);
    var ty = rows <= 1 ? 0.5 : row / (rows - 1);
    var x0 = ox;
    var y0 = oy;
    var x1 = ox + lidW;
    var y1 = oy;
    var x2 = ox + lidW + skX;
    var y2 = oy + skY;
    var x3 = ox + skX;
    var y3 = oy + skY;
    var cx =
      (1 - tx) * (1 - ty) * x0 + tx * (1 - ty) * x1 + tx * ty * x2 + (1 - tx) * ty * x3;
    var cy =
      (1 - tx) * (1 - ty) * y0 + tx * (1 - ty) * y1 + tx * ty * y2 + (1 - tx) * ty * y3;
    return { x: cx, y: cy };
  }

  /** Maceta vista superior con aro blanco y rejilla interna (estilo referencia). */
  function netPotTop(cx, cy, r, u, n, c, cfg, extraClass) {
    var gid = u + '-np-' + n + '-' + c;
    var dat = cellData(n, c);
    var aria = escAria((dat.variedad || 'Hueco vacío') + ', fila ' + (n + 1) + ' columna ' + (c + 1));
    var s = '';
    s +=
      '<g id="' +
      gid +
      '" data-n="' +
      n +
      '" data-c="' +
      c +
      '" class="hc-cesta hc-cesta--interactive hc-illo-pot ' +
      (extraClass || 'dwc-maceta') +
      '" role="button" tabindex="0" aria-label="' +
      aria +
      '">';
    s +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy + 1) +
      '" rx="' +
      f1(r + 1) +
      '" ry="' +
      f1(r * 0.38 + 1) +
      '" fill="rgba(15,23,42,0.12)"/>';
    s +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" rx="' +
      f1(r + 2.5) +
      '" ry="' +
      f1(r * 0.42 + 1.2) +
      '" fill="' +
      HC_ILLO.potRim +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2.2"/>';
    s +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" rx="' +
      f1(r) +
      '" ry="' +
      f1(r * 0.38) +
      '" fill="' +
      HC_ILLO.potInner +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="1.4"/>';
    s +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" rx="' +
      f1(r - 1) +
      '" ry="' +
      f1(r * 0.34) +
      '" fill="url(#' +
      u +
      '-mesh)" opacity="0.85"/>';
    var nSlats = 5;
    for (var si = 0; si < nSlats; si++) {
      var t = (si + 1) / (nSlats + 1);
      var xL = cx - r * 0.72 + t * r * 1.44;
      s +=
        '<line x1="' +
        f1(xL) +
        '" y1="' +
        f1(cy - r * 0.28) +
        '" x2="' +
        f1(xL) +
        '" y2="' +
        f1(cy + r * 0.28) +
        '" stroke="' +
        HC_ILLO.mesh +
        '" stroke-width="0.9" opacity="0.7"/>';
    }
    s +=
      '<ellipse cx="' +
      f1(cx - r * 0.35) +
      '" cy="' +
      f1(cy - r * 0.12) +
      '" rx="' +
      f1(r * 0.22) +
      '" ry="' +
      f1(r * 0.08) +
      '" fill="' +
      HC_ILLO.spec +
      '" opacity="0.55"/>';
    s += '</g>';
    return s;
  }

  function airStone(x, y, u, ta, scale) {
    scale = scale || 1;
    var rx = 14 * scale;
    var ry = 5 * scale;
    var s = '';
    s +=
      '<ellipse cx="' +
      f1(x) +
      '" cy="' +
      f1(y) +
      '" rx="' +
      f1(rx) +
      '" ry="' +
      f1(ry) +
      '" fill="' +
      HC_ILLO.stone +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="1.5"/>';
    for (var pi = 0; pi < 6; pi++) {
      var ang = (pi / 6) * Math.PI * 2;
      s +=
        '<circle cx="' +
        f1(x + Math.cos(ang) * rx * 0.45) +
        '" cy="' +
        f1(y + Math.sin(ang) * ry * 0.35) +
        '" r="' +
        f1(1.2 * scale) +
        '" fill="' +
        HC_ILLO.stoneHi +
        '" opacity="0.85"/>';
    }
    s += bubbles(x, y - 4, y - 38 * scale, ta, Math.round(9 * scale));
    return s;
  }

  function airPumpModern(x, y, w, h, u) {
    w = w || 56;
    h = h || 40;
    var cx = x + w / 2;
    return (
      '<g filter="url(#' +
      u +
      '-sh)">' +
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(y + h + 7) +
      '" rx="' +
      f1(w * 0.42) +
      '" ry="5" fill="rgba(15,23,42,0.15)"/>' +
      '<rect x="' +
      f1(x + 4) +
      '" y="' +
      f1(y + h - 4) +
      '" width="' +
      (w - 8) +
      '" height="6" rx="2" fill="#263238"/>' +
      '<rect x="' +
      f1(x + 6) +
      '" y="' +
      f1(y + h - 2) +
      '" width="5" height="4" rx="1" fill="#1e293b"/>' +
      '<rect x="' +
      f1(x + w - 11) +
      '" y="' +
      f1(y + h - 2) +
      '" width="5" height="4" rx="1" fill="#1e293b"/>' +
      '<rect x="' +
      f1(x + 3) +
      '" y="' +
      f1(y + 14) +
      '" width="' +
      (w - 6) +
      '" height="' +
      (h - 12) +
      '" rx="5" fill="#37474f" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>' +
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(y + 12) +
      '" rx="' +
      f1(w / 2 - 4) +
      '" ry="' +
      f1(14) +
      '" fill="url(#' +
      u +
      '-pump-dome)" stroke="' +
      HC_ILLO.pumpDark +
      '" stroke-width="2"/>' +
      '<ellipse cx="' +
      f1(cx - w * 0.12) +
      '" cy="' +
      f1(y + 8) +
      '" rx="' +
      f1(w * 0.18) +
      '" ry="4" fill="' +
      HC_ILLO.spec +
      '" opacity="0.5"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(y + h * 0.55) +
      '" r="' +
      f1(Math.min(11, w * 0.16)) +
      '" fill="#eceff1" stroke="' +
      HC_ILLO.inkSoft +
      '" stroke-width="1.2"/>' +
      '<circle cx="' +
      f1(cx) +
      '" cy="' +
      f1(y + h * 0.55) +
      '" r="' +
      f1(Math.min(6, w * 0.09)) +
      '" fill="none" stroke="' +
      HC_ILLO.mesh +
      '" stroke-width="0.8" opacity="0.6"/>' +
      '</g>'
    );
  }

  /**
   * Depósito DWC en vista 3/4 con frontal semitransparente (referencia: cubo azul + tapa + bomba).
   */
  function dwcHeroSingleTank(W, N, C, cfg, u, volPct, ta, tieneDifusor, tieneCalentador) {
    var forma = dwcFormaIllo(cfg);
    var skX = Math.min(52, 28 + N * 4);
    var skY = Math.min(30, 16 + N * 3);
    var lidW = Math.min(360, Math.max(200, 88 + C * 26));
    var ox = (W - lidW - skX) / 2;
    var oy = 58;
    var tankH = Math.min(128, 96 + Math.round(N * 4));
    var xBL = ox;
    var yBL = oy;
    var xBR = ox + lidW;
    var yBR = oy;
    var xFR = ox + lidW + skX;
    var yFR = oy + skY;
    var xFL = ox + skX;
    var yFL = oy + skY;
    var botInset = forma === 'troncopiramidal' ? Math.min(34, lidW * 0.11) : 0;
    var xFLb = xFL + botInset;
    var xFRb = xFR - botInset;
    var yBotFL = yFL + tankH;
    var yBotFR = yFR + tankH;
    var yBotBL = yBL + tankH;
    var yBotBR = yBR + tankH;
    var waterY = yBotFL - tankH * (1 - volPct);
    var s = '';

    s +=
      '<ellipse cx="' +
      f1(ox + lidW / 2 + skX / 2) +
      '" cy="' +
      f1(yBotFR + 14) +
      '" rx="' +
      f1(lidW * 0.48) +
      '" ry="10" fill="rgba(15,23,42,0.1)"/>';

    s +=
      '<polygon points="' +
      f1(xBR) +
      ',' +
      f1(yBR) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yFR) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yBotFR) +
      ' ' +
      f1(xBR) +
      ',' +
      f1(yBotBR) +
      '" fill="url(#' +
      u +
      '-tank-body)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2.2" stroke-linejoin="round"/>';

    s +=
      '<polygon points="' +
      f1(xFL) +
      ',' +
      f1(yFL) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yFR) +
      ' ' +
      f1(xFRb) +
      ',' +
      f1(yBotFR) +
      ' ' +
      f1(xFLb) +
      ',' +
      f1(yBotFL) +
      '" fill="url(#' +
      u +
      '-tank-body)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2.4" stroke-linejoin="round" opacity="0.92"/>';

    s +=
      '<clipPath id="' +
      u +
      '-hero-clip"><polygon points="' +
      f1(xFL + 3) +
      ',' +
      f1(yFL + 8) +
      ' ' +
      f1(xFR - 3) +
      ',' +
      f1(yFR + 8) +
      ' ' +
      f1(xFRb - 3) +
      ',' +
      f1(yBotFR - 6) +
      ' ' +
      f1(xFLb + 3) +
      ',' +
      f1(yBotFL - 6) +
      '"/></clipPath>';
    s += '<g clip-path="url(#' + u + '-hero-clip)">';
    s +=
      '<polygon points="' +
      f1(xFLb) +
      ',' +
      f1(waterY) +
      ' ' +
      f1(xFRb) +
      ',' +
      f1(waterY) +
      ' ' +
      f1(xFRb) +
      ',' +
      f1(yBotFR) +
      ' ' +
      f1(xFLb) +
      ',' +
      f1(yBotFL) +
      '" fill="url(#' +
      u +
      '-water-inner)"/>';
    if (waterY > yFL + 14) {
      var airL = xFL + (xFLb - xFL) * ((waterY - yFL) / tankH);
      var airR = xFR - (xFR - xFRb) * ((waterY - yFL) / tankH);
      s +=
        '<polygon points="' +
        f1(xFL) +
        ',' +
        f1(yFL + 8) +
        ' ' +
        f1(xFR) +
        ',' +
        f1(yFR + 8) +
        ' ' +
        f1(airR) +
        ',' +
        f1(waterY) +
        ' ' +
        f1(airL) +
        ',' +
        f1(waterY) +
        '" fill="#e1f5fe" opacity="0.75"/>';
    }
    var stoneN = C >= 4 ? 2 : 1;
    for (var st = 0; st < stoneN; st++) {
      var sx = xFLb + ((st + 1) / (stoneN + 1)) * (xFRb - xFLb);
      if (tieneDifusor) s += airStone(sx, yBotFL - 14, u, ta, stoneN === 1 ? 1 : 0.85);
    }
    s += '</g>';

    s +=
      '<line x1="' +
      f1(xFL) +
      '" y1="' +
      f1(yFL) +
      '" x2="' +
      f1(xFL) +
      '" y2="' +
      f1(yBotFL) +
      '" stroke="' +
      HC_ILLO.spec +
      '" stroke-width="2" opacity="0.45"/>';
    s +=
      '<line x1="' +
      f1(xBL) +
      '" y1="' +
      f1(yBL) +
      '" x2="' +
      f1(xFL) +
      '" y2="' +
      f1(yFL) +
      '" stroke="' +
      HC_ILLO.spec +
      '" stroke-width="1.8" opacity="0.35"/>';

    s +=
      '<polygon points="' +
      f1(xBL) +
      ',' +
      f1(yBL) +
      ' ' +
      f1(xBR) +
      ',' +
      f1(yBR) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yFR) +
      ' ' +
      f1(xFL) +
      ',' +
      f1(yFL) +
      '" fill="url(#' +
      u +
      '-lid)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2.6" stroke-linejoin="round" filter="url(#' +
      u +
      '-sh)"/>';
    s +=
      '<polygon points="' +
      f1(xBL + 4) +
      ',' +
      f1(yBL + 5) +
      ' ' +
      f1(xBR - 4) +
      ',' +
      f1(yBR + 5) +
      ' ' +
      f1(xFR - 6) +
      ',' +
      f1(yFR + 7) +
      ' ' +
      f1(xFL + 6) +
      ',' +
      f1(yFL + 7) +
      '" fill="none" stroke="' +
      HC_ILLO.lidHi +
      '" stroke-width="1" opacity="0.5"/>';
    if (forma === 'troncopiramidal') {
      var tIn = 16;
      var tBot = lidW - 32;
      var tcx = ox + lidW / 2 + skX / 2;
      s +=
        '<path d="M ' +
        f1(tcx - (lidW - 2 * tIn) / 2) +
        ' ' +
        f1(oy + 6) +
        ' L ' +
        f1(tcx + (lidW - 2 * tIn) / 2) +
        ' ' +
        f1(oy + 6) +
        ' L ' +
        f1(tcx + tBot / 2) +
        ' ' +
        f1(oy + skY - 4) +
        ' L ' +
        f1(tcx - tBot / 2) +
        ' ' +
        f1(oy + skY - 4) +
        ' Z" fill="none" stroke="' +
        HC_ILLO.inkSoft +
        '" stroke-width="1.3" opacity="0.55"/>';
    }

    var potR = Math.max(7, Math.min(15, (lidW / C) * 0.22));
    for (var rn = 0; rn < N; rn++) {
      for (var cc = 0; cc < C; cc++) {
        var pt = dwcLidPoint(ox, oy, lidW, skX, skY, cc, C, rn, N);
        s += netPotTop(pt.x, pt.y, potR, u, rn, cc, cfg, 'dwc-maceta');
      }
    }

    if (tieneDifusor) {
      var pumpX = xFR + 22;
      var pumpY = oy + skY * 0.5;
      if (typeof hcSvgAirPumpTorreBlock === 'function') {
        s += hcSvgAirPumpTorreBlock(pumpX, pumpY, 1.02);
      } else {
        s += airPumpModern(pumpX, pumpY, 56, 42, u);
      }
      s +=
        '<path d="M ' +
        f1(pumpX + 4) +
        ' ' +
        f1(pumpY + 22) +
        ' Q ' +
        f1(pumpX - 28) +
        ' ' +
        f1(yBotFL - 20) +
        ' ' +
        f1(xFL + (xFR - xFL) * 0.35) +
        ' ' +
        f1(yBotFL - 10) +
        '" fill="none" stroke="#eceff1" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>';
      if (stoneN >= 2) {
        s +=
          '<path d="M ' +
          f1(pumpX + 8) +
          ' ' +
          f1(pumpY + 24) +
          ' Q ' +
          f1(pumpX - 10) +
          ' ' +
          f1(yBotFL - 8) +
          ' ' +
          f1(xFL + (xFR - xFL) * 0.65) +
          ' ' +
          f1(yBotFL - 10) +
          '" fill="none" stroke="#eceff1" stroke-width="2" stroke-linecap="round" opacity="0.75"/>';
      }
    }

    s +=
      '<path d="M ' +
      f1(xBL - 6) +
      ' ' +
      f1(yBL + tankH * 0.45) +
      ' L ' +
      f1(xBL - 18) +
      ' ' +
      f1(yBL + tankH * 0.38) +
      ' L ' +
      f1(xBL - 18) +
      ' ' +
      f1(yBL + tankH * 0.52) +
      ' Z" fill="' +
      HC_ILLO.pipe +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="1.5"/>';
    s +=
      '<rect x="' +
      f1(xBL - 20) +
      '" y="' +
      f1(yBL + tankH * 0.36) +
      '" width="4" height="' +
      f1(tankH * 0.18) +
      '" rx="1" fill="' +
      HC_ILLO.pipe +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="1"/>';

    if (tieneCalentador) {
      s +=
        '<rect x="' +
        f1(xFL + 10) +
        '" y="' +
        f1(yFL + 16) +
        '" width="7" height="' +
        f1(tankH - 36) +
        '" rx="3" fill="' +
        HC_ILLO.cal +
        '" stroke="' +
        HC_ILLO.pumpDark +
        '" stroke-width="1.2" opacity="0.9"/>';
    }

    var footY = yBotFR + 36;
    return { svg: s, footY: footY, ox: ox, lidW: lidW, skX: skX };
  }

  /** Cubo DWC mini (multiválvula): misma familia visual, escala reducida. */
  function dwcMiniBucket(cx, cy, bw, bh, idx, u, cfg, ta, tieneDifusor) {
    var skX = bw * 0.22;
    var skY = bh * 0.14;
    var ox = cx - bw / 2;
    var oy = cy - bh / 2 + 4;
    var lidW = bw - 4;
    var tankH = bh * 0.52;
    var xBL = ox;
    var yBL = oy;
    var xBR = ox + lidW;
    var xFR = ox + lidW + skX;
    var yFR = oy + skY;
    var xFL = ox + skX;
    var yFL = oy + skY;
    var yBotFL = yFL + tankH;
    var yBotFR = yFR + tankH;
    var s = '';
    s +=
      '<polygon points="' +
      f1(xBR) +
      ',' +
      f1(yBL) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yFR) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yBotFR) +
      ' ' +
      f1(xBR) +
      ',' +
      f1(yBotFL) +
      '" fill="url(#' +
      u +
      '-tank-body)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="1.8"/>';
    s +=
      '<polygon points="' +
      f1(xFL) +
      ',' +
      f1(yFL) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yFR) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yBotFR) +
      ' ' +
      f1(xFL) +
      ',' +
      f1(yBotFL) +
      '" fill="url(#' +
      u +
      '-water-inner)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2" opacity="0.95"/>';
    s +=
      '<polygon points="' +
      f1(xBL) +
      ',' +
      f1(yBL) +
      ' ' +
      f1(xBR) +
      ',' +
      f1(yBL) +
      ' ' +
      f1(xFR) +
      ',' +
      f1(yFR) +
      ' ' +
      f1(xFL) +
      ',' +
      f1(yFL) +
      '" fill="url(#' +
      u +
      '-lid)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>';
    var pr = Math.min(10, bw * 0.14);
    s += netPotTop(cx, oy + skY * 0.45, pr, u, 0, idx, cfg, 'dwc-maceta');
    if (tieneDifusor) s += airStone(cx, yBotFL - 6, u, ta, 0.55);
    s +=
      '<text x="' +
      f1(cx) +
      '" y="' +
      f1(yBotFR + 12) +
      '" text-anchor="middle" font-family="Inconsolata,monospace" font-size="7" font-weight="700" fill="' +
      HC_ILLO.inkSoft +
      '">' +
      (idx + 1) +
      '</text>';
    return s;
  }

  function dwcHeroMultivalve(W, S, mcCols, mcRows, cfg, u, volEtiqueta, ta, tieneDifusor) {
    var gap = 14;
    var bw = Math.min(96, Math.max(72, (W - 100 - (mcCols - 1) * gap) / mcCols));
    var bh = Math.min(108, bw * 1.12);
    var gridW = mcCols * bw + (mcCols - 1) * gap;
    var x0 = (W - gridW) / 2;
    var y0 = 78;
    var s = '';
    if (typeof hcSvgAirPumpTorreBlock === 'function') {
      s += hcSvgAirPumpTorreBlock(W - 88, 52, 1.12);
    } else {
      s += airPumpModern(W - 88, 52, 62, 46, u);
    }
    s +=
      '<rect x="' +
      f1(W - 94) +
      '" y="48" width="74" height="54" rx="10" fill="rgba(255,255,255,0.35)" stroke="' +
      HC_ILLO.pumpDark +
      '" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.85"/>';
    s += illoText(W - 57, 66, 'BOMBA', 'section');
    s += illoText(W - 57, 78, 'MULTIVÁLVULA', 'hint');
    for (var idx = 0; idx < S; idx++) {
      var fr = Math.floor(idx / mcCols);
      var fc = idx % mcCols;
      var bx = x0 + fc * (bw + gap) + bw / 2;
      var by = y0 + fr * (bh + gap) + bh / 2;
      s += dwcMiniBucket(bx, by, bw, bh, idx, u, cfg, ta, tieneDifusor);
      if (tieneDifusor) {
        s +=
          '<path d="M ' +
          f1(W - 86) +
          ' ' +
          f1(78) +
          ' Q ' +
          f1((W - 86 + bx) / 2) +
          ' ' +
          f1(by - bh * 0.35) +
          ' ' +
          f1(bx) +
          ' ' +
          f1(by - bh * 0.42) +
          '" fill="none" stroke="#eceff1" stroke-width="2" stroke-linecap="round" opacity="' +
          (0.55 + (idx % 3) * 0.12) +
          '"/>';
      }
    }
    var footY = y0 + mcRows * (bh + gap) + 8;
    return { svg: s, footY: footY };
  }

  function flowArrow(x1, y1, x2, y2) {
    var mx = (x1 + x2) / 2;
    var my = (y1 + y2) / 2;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var ax = mx + Math.cos(ang) * 6;
    var ay = my + Math.sin(ang) * 6;
    var p1x = ax - Math.cos(ang - 0.45) * 7;
    var p1y = ay - Math.sin(ang - 0.45) * 7;
    var p2x = ax - Math.cos(ang + 0.45) * 7;
    var p2y = ay - Math.sin(ang + 0.45) * 7;
    return (
      '<line x1="' +
      f1(x1) +
      '" y1="' +
      f1(y1) +
      '" x2="' +
      f1(x2) +
      '" y2="' +
      f1(y2) +
      '" stroke="' +
      HC_ILLO.pipe +
      '" stroke-width="3.2" stroke-linecap="round"/>' +
      '<polygon points="' +
      f1(ax) +
      ',' +
      f1(ay) +
      ' ' +
      f1(p1x) +
      ',' +
      f1(p1y) +
      ' ' +
      f1(p2x) +
      ',' +
      f1(p2y) +
      '" fill="' +
      HC_ILLO.flow +
      '"/>'
    );
  }

  function bubbles(cx, y0, y1, ta, n) {
    var s = '';
    n = n || 7;
    for (var i = 0; i < n; i++) {
      var dx = ((i % 5) - 2) * 4.5;
      var r = 1.3 + (i % 3) * 0.7;
      var dur = (1.1 + i * 0.12).toFixed(2);
      var delay = (i * 0.15).toFixed(2);
      s +=
        '<circle cx="' +
        f1(cx + dx) +
        '" cy="' +
        f1(y0) +
        '" r="' +
        r +
        '" fill="' +
        HC_ILLO.bubble +
        '" stroke="' +
        HC_ILLO.water0 +
        '" stroke-width="0.6" opacity="0">';
      if (ta) {
        s +=
          '<animate attributeName="cy" from="' +
          f1(y0) +
          '" to="' +
          f1(y1) +
          '" dur="' +
          dur +
          's" begin="' +
          delay +
          's" repeatCount="indefinite"/>' +
          '<animate attributeName="opacity" values="0;0.95;0.95;0" dur="' +
          dur +
          's" begin="' +
          delay +
          's" repeatCount="indefinite"/>';
      }
      s += '</circle>';
    }
    return s;
  }

  function airPump(x, y, w, h, u) {
    w = w || 52;
    h = h || 36;
    return (
      '<g filter="url(#' +
      u +
      '-sh)">' +
      '<rect x="' +
      f1(x) +
      '" y="' +
      f1(y + 6) +
      '" width="' +
      w +
      '" height="5" rx="2" fill="#1e293b"/>' +
      '<rect x="' +
      f1(x + 3) +
      '" y="' +
      f1(y) +
      '" width="' +
      (w - 6) +
      '" height="' +
      h +
      '" rx="6" fill="' +
      HC_ILLO.pump +
      '" stroke="' +
      HC_ILLO.pumpDark +
      '" stroke-width="2"/>' +
      '<rect x="' +
      f1(x + 8) +
      '" y="' +
      f1(y + 6) +
      '" width="' +
      (w - 16) +
      '" height="' +
      (h - 12) +
      '" rx="3" fill="' +
      HC_ILLO.pumpHi +
      '" opacity="0.55"/>' +
      '<line x1="' +
      f1(x + w - 10) +
      '" y1="' +
      f1(y + 10) +
      '" x2="' +
      f1(x + w - 10) +
      '" y2="' +
      f1(y + h - 8) +
      '" stroke="' +
      HC_ILLO.pumpDark +
      '" stroke-width="1.2" opacity="0.5"/>' +
      '<text x="' +
      f1(x + w / 2) +
      '" y="' +
      f1(y + h + 14) +
      '" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" font-weight="800" fill="' +
      HC_ILLO.inkSoft +
      '">AIRE</text>' +
      '</g>'
    );
  }

  function waterPump(x, y, r) {
    r = r || 14;
    return (
      '<circle cx="' +
      f1(x) +
      '" cy="' +
      f1(y) +
      '" r="' +
      r +
      '" fill="' +
      HC_ILLO.pump +
      '" stroke="' +
      HC_ILLO.pumpDark +
      '" stroke-width="2"/>' +
      '<path d="M ' +
      f1(x - r * 0.35) +
      ' ' +
      f1(y) +
      ' L ' +
      f1(x + r * 0.45) +
      ' ' +
      f1(y) +
      ' M ' +
      f1(x) +
      ' ' +
      f1(y - r * 0.35) +
      ' L ' +
      f1(x) +
      ' ' +
      f1(y + r * 0.35) +
      '" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'
    );
  }

  /**
   * Maceta / hueco interactivo (vista cenital u oblicua).
   * @param {object} o — n,c,cx,cy,rx,ry,uid,cfg,topView,label,extraClass
   */
  function maceta(o) {
    var n = o.n;
    var c = o.c;
    var cx = o.cx;
    var cy = o.cy;
    var rx = o.rx != null ? o.rx : o.r || 14;
    var ry = o.ry != null ? o.ry : rx * 0.72;
    var u = o.uid;
    var cfg = o.cfg || (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    var topView = o.topView !== false;
    var dat = o.dat || cellData(n, c);
    var dias =
      dat.fecha && typeof torreDiasCicloVisual === 'function'
        ? torreDiasCicloVisual(dat)
        : dat.fecha
          ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000))
          : 0;
    var est = dat.variedad && typeof getEstado === 'function' ? getEstado(dat.variedad, dias) : '';
    var cult = dat.variedad && typeof getCultivoDB === 'function' ? getCultivoDB(dat.variedad) : null;
    var cultEmoji =
      cult && cult.emoji
        ? String(cult.emoji)
        : dat.variedad && typeof cultivoEmoji === 'function'
          ? cultivoEmoji(cult)
          : est && typeof getEmoji === 'function'
            ? getEmoji(est)
            : '';
    var diasBase = typeof DIAS_COSECHA !== 'undefined' && DIAS_COSECHA[dat.variedad] ? DIAS_COSECHA[dat.variedad] : 50;
    var diasT =
      typeof torreGetDiasCosechaObjetivo === 'function'
        ? torreGetDiasCosechaObjetivo(diasBase, cfg)
        : diasBase;
    var pct = dat.variedad ? Math.min(100, Math.round((dias / diasT) * 100)) : 0;
    var isSelected =
      typeof editingCesta !== 'undefined' &&
      editingCesta &&
      editingCesta.nivel === n &&
      editingCesta.cesta === c;
    var isFocused =
      typeof torreDiagramHuecoFocus !== 'undefined' &&
      torreDiagramHuecoFocus &&
      torreDiagramHuecoFocus.nivel === n &&
      torreDiagramHuecoFocus.cesta === c;
    var multiKey = n + ',' + c;
    var isMulti =
      typeof torreInteraccionModo !== 'undefined' &&
      torreInteraccionModo === 'asignar' &&
      typeof torreCestasMultiSel !== 'undefined' &&
      torreCestasMultiSel.has(multiKey);
    var tieneCultivo = !!(dat && dat.variedad);
    var fotos = (dat.fotos || []).filter(function (f) {
      return f && f.data;
    });
    var ultimaFoto = fotos.length > 0 ? fotos[fotos.length - 1] : null;
    var varTxt = dat.variedad ? String(dat.variedad) : 'vacía';
    var aria = escAria(
      (o.label || 'Maceta fila ' + (n + 1) + ' columna ' + (c + 1)) +
        ', ' +
        varTxt +
        (dias ? ', día ' + dias : '') +
        '. Pulsa para ficha o asignar cultivo.'
    );
    var gid = u + '-pot-' + n + '-' + c;
    var clipId = u + '-clip-' + n + '-' + c;
    var stroke = dat.variedad ? HC_ILLO.flow : HC_ILLO.ink;
    if (est === 'plantula') stroke = '#2563eb';
    else if (est === 'crecimiento') stroke = '#15803d';
    else if (est === 'madurez') stroke = '#b45309';
    else if (est === 'cosecha') stroke = '#7c3aed';

    var out = '';
    if (!topView) {
      out +=
        '<ellipse cx="' +
        f1(cx) +
        '" cy="' +
        f1(cy + 3) +
        '" rx="' +
        f1(rx * 1.05) +
        '" ry="' +
        f1(ry * 0.5) +
        '" fill="rgba(15,23,42,0.08)"/>';
    }
    out +=
      '<g id="' +
      gid +
      '" data-n="' +
      n +
      '" data-c="' +
      c +
      '" class="hc-cesta hc-cesta--interactive hc-illo-pot ' +
      (o.extraClass || '') +
      '" role="button" tabindex="0" aria-label="' +
      aria +
      '">';
    var potFill = tieneCultivo ? '#fffbeb' : HC_ILLO.pot;
    var potStroke = tieneCultivo ? stroke : HC_ILLO.ink;
    var potSw = tieneCultivo ? 2 : 2.4;
    out +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" rx="' +
      f1(rx) +
      '" ry="' +
      f1(ry) +
      '" fill="' +
      potFill +
      '" stroke="' +
      potStroke +
      '" stroke-width="' +
      potSw +
      '"/>';
    var mx = cx - rx * 0.55;
    var my0 = cy - ry * 0.35;
    var my1 = cy + ry * 0.35;
    out +=
      '<line x1="' +
      f1(mx) +
      '" y1="' +
      f1(my0) +
      '" x2="' +
      f1(mx) +
      '" y2="' +
      f1(my1) +
      '" stroke="' +
      HC_ILLO.mesh +
      '" stroke-width="1" opacity="0.65"/>' +
      '<line x1="' +
      f1(cx) +
      '" y1="' +
      f1(my0) +
      '" x2="' +
      f1(cx) +
      '" y2="' +
      f1(my1) +
      '" stroke="' +
      HC_ILLO.mesh +
      '" stroke-width="1" opacity="0.65"/>' +
      '<line x1="' +
      f1(cx + rx * 0.55) +
      '" y1="' +
      f1(my0) +
      '" x2="' +
      f1(cx + rx * 0.55) +
      '" y2="' +
      f1(my1) +
      '" stroke="' +
      HC_ILLO.mesh +
      '" stroke-width="1" opacity="0.65"/>';
    if (isMulti) {
      out +=
        '<ellipse cx="' +
        f1(cx) +
        '" cy="' +
        f1(cy) +
        '" rx="' +
        f1(rx + 5) +
        '" ry="' +
        f1(ry + 4) +
        '" fill="none" stroke="#f59e0b" stroke-width="2.4" stroke-dasharray="4 3"/>';
    }
    if (isSelected || isFocused) {
      out +=
        '<ellipse cx="' +
        f1(cx) +
        '" cy="' +
        f1(cy) +
        '" rx="' +
        f1(rx + 4) +
        '" ry="' +
        f1(ry + 3) +
        '" fill="none" stroke="#22c55e" stroke-width="2.6"/>';
    }
    if (ultimaFoto && ultimaFoto.data) {
      out +=
        '<defs><clipPath id="' +
        clipId +
        '"><ellipse cx="' +
        f1(cx) +
        '" cy="' +
        f1(cy) +
        '" rx="' +
        f1(rx - 1) +
        '" ry="' +
        f1(ry - 1) +
        '"/></clipPath></defs>';
      out +=
        '<image href="' +
        ultimaFoto.data +
        '" x="' +
        f1(cx - rx) +
        '" y="' +
        f1(cy - ry) +
        '" width="' +
        f1(rx * 2) +
        '" height="' +
        f1(ry * 2) +
        '" preserveAspectRatio="xMidYMid slice" clip-path="url(#' +
        clipId +
        ')" opacity="0.92"/>';
    }
    var onGreyLid =
      o.onGreyLid === true ||
      (topView && o.extraClass && String(o.extraClass).indexOf('dwc-maceta') >= 0);
    if (pct > 0 && pct < 100 && dat.variedad) {
      var r2 = Math.max(rx, ry) + 5;
      var ang2 = (pct / 100) * 2 * Math.PI - Math.PI / 2;
      var x1e = cx + r2 * Math.cos(-Math.PI / 2);
      var y1e = cy + r2 * Math.sin(-Math.PI / 2);
      var x2e = cx + r2 * Math.cos(ang2);
      var y2e = cy + r2 * Math.sin(ang2);
      var progStroke = onGreyLid ? '#ffffff' : stroke;
      out +=
        '<path class="hc-illo-progress" d="M' +
        f1(x1e) +
        ',' +
        f1(y1e) +
        ' A' +
        f1(r2) +
        ',' +
        f1(r2) +
        ' 0 ' +
        (pct > 50 ? 1 : 0) +
        ',1 ' +
        f1(x2e) +
        ',' +
        f1(y2e) +
        '" fill="none" stroke="' +
        progStroke +
        '" stroke-width="2.4" stroke-linecap="round" opacity="' +
        (onGreyLid ? '0.95' : '0.55') +
        '"/>';
    }
    var textoEnMaceta = !o.sinTexto || isSelected || isMulti || isFocused || tieneCultivo;
    if (textoEnMaceta) {
      if (cultEmoji) {
        var emFs = tieneCultivo ? Math.min(14, Math.max(9, rx * 0.82)) : Math.min(16, Math.max(10, rx * 0.95));
        if (isSelected || isMulti || isFocused) {
          emFs = Math.min(22, Math.max(14, rx * 1.12));
        }
        out +=
          '<text x="' +
          f1(cx) +
          '" y="' +
          f1(cy + (topView ? 1 : -2)) +
          '" text-anchor="middle" dominant-baseline="central" font-size="' +
          emFs +
          '" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif" pointer-events="none">' +
          cultEmoji +
          '</text>';
      }
      var subY = cy + ry + (topView ? 10 : 14);
      if (dias > 0 && dat.variedad) {
        var diasFill = onGreyLid ? '#ffffff' : stroke;
        out +=
          '<text class="hc-illo-dias" x="' +
          f1(cx) +
          '" y="' +
          f1(subY) +
          '" font-family="Inconsolata,monospace" font-size="7.5" font-weight="800" fill="' +
          diasFill +
          '" text-anchor="middle">' +
          dias +
          'd</text>';
      } else if (!cultEmoji && !o.sinTexto) {
        out +=
          '<text x="' +
          f1(cx) +
          '" y="' +
          f1(cy + 3) +
          '" font-family="Inconsolata,monospace" font-size="8" fill="' +
          HC_ILLO.mesh +
          '" text-anchor="middle">·</text>';
      }
    }
    out +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" rx="' +
      f1(rx * 1.6) +
      '" ry="' +
      f1(ry * 1.6) +
      '" fill="rgba(0,0,0,0)" class="hc-cesta-hit" pointer-events="all"/>';
    out += '</g>';
    return out;
  }

  function tankIsoPlan(x, y, w, d, u) {
    var sk = d * 0.42;
    var x1 = x;
    var y1 = y;
    var x2 = x + w;
    var y2 = y;
    var x3 = x + w + sk;
    var y3 = y - sk * 0.55;
    var x4 = x + sk;
    var y4 = y - sk * 0.55;
    var s = '';
    s +=
      '<polygon points="' +
      f1(x3) +
      ',' +
      f1(y3) +
      ' ' +
      f1(x4) +
      ',' +
      f1(y4) +
      ' ' +
      f1(x1) +
      ',' +
      f1(y1) +
      ' ' +
      f1(x2) +
      ',' +
      f1(y2) +
      '" fill="' +
      HC_ILLO.water2 +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2" stroke-linejoin="round"/>';
    s +=
      '<polygon points="' +
      f1(x2) +
      ',' +
      f1(y2) +
      ' ' +
      f1(x3) +
      ',' +
      f1(y3) +
      ' ' +
      f1(x4 + w * 0.02) +
      ',' +
      f1(y2 + d * 0.38) +
      ' ' +
      f1(x1 + w * 0.02) +
      ',' +
      f1(y2 + d * 0.38) +
      '" fill="url(#' +
      u +
      '-tank)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2" stroke-linejoin="round"/>';
  s +=
      '<polygon points="' +
      f1(x1) +
      ',' +
      f1(y1) +
      ' ' +
      f1(x2) +
      ',' +
      f1(y2) +
      ' ' +
      f1(x2 + w * 0.02) +
      ',' +
      f1(y2 + d * 0.38) +
      ' ' +
      f1(x1 + w * 0.02) +
      ',' +
      f1(y2 + d * 0.38) +
      '" fill="url(#' +
      u +
      '-water)" opacity="0.35" stroke="none"/>';
    return { svg: s, lidPoly: { x1: x1, y1: y1, x2: x2, y2: y2, x3: x3, y3: y3, x4: x4, y4: y4 }, frontY: y2 + d * 0.38 };
  }

  function lidOnIso(lp, pad, u) {
    var cx = (lp.x1 + lp.x2) / 2;
    var cy = (lp.y1 + lp.y4) / 2 - pad * 0.2;
    var hw = (lp.x2 - lp.x1) / 2 - pad;
    var hd = (lp.y1 - lp.y4) / 2 - pad * 0.5;
    return (
      '<polygon points="' +
      f1(lp.x1 + pad) +
      ',' +
      f1(lp.y1 - pad * 0.3) +
      ' ' +
      f1(lp.x2 - pad) +
      ',' +
      f1(lp.y2 - pad * 0.3) +
      ' ' +
      f1(lp.x3 - pad) +
      ',' +
      f1(lp.y3 + pad * 0.2) +
      ' ' +
      f1(lp.x4 + pad) +
      ',' +
      f1(lp.y4 + pad * 0.2) +
      '" fill="url(#' +
      u +
      '-lid)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy) +
      '" rx="' +
      f1(hw) +
      '" ry="' +
      f1(hd) +
      '" fill="none" stroke="' +
      HC_ILLO.lidHi +
      '" stroke-width="1" opacity="0.35"/>'
    );
  }

  function dwcFormaIllo(cfg) {
    if (typeof dwcNormalizeDepositoForma === 'function') {
      return dwcNormalizeDepositoForma(cfg && cfg.dwcDepositoForma);
    }
    var f = String((cfg && cfg.dwcDepositoForma) || 'prismatico').toLowerCase();
    if (f === 'cilindrico' || f === 'troncopiramidal') return f;
    return 'prismatico';
  }

  /** Misma caja de layout para tapa (plano) y alzado (mismo ancho blockW). */
  function dwcLayoutUnificado(N, C, W) {
    var planPad = 12;
    var blockW = Math.min(320, Math.max(228, 28 + C * 30));
    var planH = Math.min(200, Math.max(88, 28 + N * 30));
    var planLeft = (W - blockW) / 2;
    var planTop = 50;
    var innerX = planLeft + planPad;
    var innerY = planTop + planPad;
    var innerW = blockW - planPad * 2;
    var innerH = planH - planPad * 2;
    return {
      blockW: blockW,
      planH: planH,
      planLeft: planLeft,
      planTop: planTop,
      innerX: innerX,
      innerY: innerY,
      innerW: innerW,
      innerH: innerH,
      cellW: innerW / Math.max(1, C),
      cellH: innerH / Math.max(1, N),
    };
  }

  /** Plano superior: tapa + rejilla N×C (sin isometría mezclada). */
  function dwcVistaSuperiorTapa(L, N, C, u, cfg) {
    var s = '';
    s +=
      '<rect x="' +
      f1(L.planLeft) +
      '" y="' +
      f1(L.planTop) +
      '" width="' +
      L.blockW +
      '" height="' +
      L.planH +
      '" rx="12" fill="rgba(255,255,255,0.55)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>' +
      '<rect x="' +
      f1(L.innerX) +
      '" y="' +
      f1(L.innerY) +
      '" width="' +
      f1(L.innerW) +
      '" height="' +
      f1(L.innerH) +
      '" rx="8" fill="url(#' +
      u +
      '-lid)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>' +
      illoText(L.planLeft + L.blockW / 2, L.planTop + 14, 'Vista cenital', 'section');
    var formaPlan = dwcFormaIllo(cfg);
    if (formaPlan === 'troncopiramidal') {
      var topIn = 14;
      var botW = L.innerW - 28;
      var cxP = L.innerX + L.innerW / 2;
      var yT = L.innerY + 4;
      var yB = L.innerY + L.innerH - 4;
      s +=
        '<path d="M ' +
        f1(cxP - (L.innerW - 2 * topIn) / 2) +
        ' ' +
        f1(yT) +
        ' L ' +
        f1(cxP + (L.innerW - 2 * topIn) / 2) +
        ' ' +
        f1(yT) +
        ' L ' +
        f1(cxP + botW / 2) +
        ' ' +
        f1(yB) +
        ' L ' +
        f1(cxP - botW / 2) +
        ' ' +
        f1(yB) +
        ' Z" fill="none" stroke="' +
        HC_ILLO.inkSoft +
        '" stroke-width="1.25" opacity="0.55"/>';
    } else if (formaPlan === 'cilindrico') {
      var rcx = L.innerX + L.innerW / 2;
      var rcy = L.innerY + L.innerH / 2;
      var rr = Math.min(L.innerW, L.innerH) / 2 - 5;
      s +=
        '<circle cx="' +
        f1(rcx) +
        '" cy="' +
        f1(rcy) +
        '" r="' +
        f1(rr) +
        '" fill="none" stroke="' +
        HC_ILLO.inkSoft +
        '" stroke-width="1.2" opacity="0.5"/>';
    }
    for (var rn = 0; rn < N; rn++) {
      for (var cc = 0; cc < C; cc++) {
        var pcx = L.innerX + (cc + 0.5) * L.cellW;
        var pcy = L.innerY + (rn + 0.5) * L.cellH;
        var prx = Math.max(8, Math.min(18, L.cellW * 0.36, L.cellH * 0.36));
        s += maceta({
          n: rn,
          c: cc,
          cx: pcx,
          cy: pcy,
          rx: prx,
          ry: prx * 0.88,
          uid: u,
          cfg: cfg,
          extraClass: 'dwc-maceta',
          onGreyLid: true,
        });
      }
    }
    if (N > 1) {
    }
    return s;
  }

  /**
   * Alzado frontal: mismo ancho que la tapa; orificios alineados por columna con el plano.
   */
  function dwcVistaFrontalDeposito(L, N, C, volPct, u, ta, tieneDifusor, tieneCalentador, cfg) {
    var sepY = L.planTop + L.planH + 32;
    var tankH = 112;
    var x = L.planLeft;
    var w = L.blockW;
    var rim = 12;
    var formaF = dwcFormaIllo(cfg);
    var innerX = x + 10;
    var innerY = sepY + rim + 4;
    var innerW = w - 20;
    var innerH = tankH - rim - 10;
    var waterTop = innerY + innerH * (1 - volPct);
    var stoneX = innerX + innerW - 28;
    var lidLineY = sepY + rim - 1;
    var airH = Math.max(0, waterTop - innerY);
    var clipInner = '';
    var troncoG = null;
    var s = '';
    s += illoText(x + w / 2, sepY - 10, 'Vista frontal', 'section');
    s +=
      '<line x1="' +
      f1(L.planLeft) +
      '" y1="' +
      f1(sepY - 4) +
      '" x2="' +
      f1(L.planLeft + L.blockW) +
      '" y2="' +
      f1(sepY - 4) +
      '" stroke="' +
      HC_ILLO.inkSoft +
      '" stroke-width="1" stroke-dasharray="5 4" opacity="0.45"/>';
    s +=
      '<rect x="' +
      f1(x) +
      '" y="' +
      f1(sepY) +
      '" width="' +
      w +
      '" height="' +
      rim +
      '" rx="5" fill="url(#' +
      u +
      '-lid)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>';
    if (formaF === 'troncopiramidal') {
      var padT = 8;
      var yt = sepY + rim + 6;
      var yb = sepY + tankH - 8;
      var cxm = x + w / 2;
      var wt = w - 2 * padT;
      var wb = Math.max(56, wt - 48);
      var xLt = cxm - wt / 2;
      var xRt = cxm + wt / 2;
      var xLb = cxm - wb / 2;
      var xRb = cxm + wb / 2;
      innerY = yt;
      innerH = yb - yt;
      var uFill = Math.min(1, Math.max(0, volPct));
      waterTop = yb - innerH * uFill;
      airH = Math.max(0, waterTop - innerY);
      var uS = Math.max(0, Math.min(1, innerH > 0 ? (waterTop - yt) / innerH : 0));
      var xLs = xLt + (xLb - xLt) * uS;
      var xRs = xRt + (xRb - xRt) * uS;
      stoneX = xRb - Math.max(24, (xRb - xLb) * 0.2);
      troncoG = { xLt: xLt, xRt: xRt, xLb: xLb, xRb: xRb, yt: yt, yb: yb, waterTop: waterTop, xLs: xLs, xRs: xRs };
      clipInner =
        '<polygon points="' +
        f1(xLt) +
        ',' +
        f1(yt) +
        ' ' +
        f1(xRt) +
        ',' +
        f1(yt) +
        ' ' +
        f1(xRb) +
        ',' +
        f1(yb) +
        ' ' +
        f1(xLb) +
        ',' +
        f1(yb) +
        '"/>';
      s +=
        '<polygon points="' +
        f1(xLt) +
        ',' +
        f1(yt - 1) +
        ' ' +
        f1(xRt) +
        ',' +
        f1(yt - 1) +
        ' ' +
        f1(xRt) +
        ',' +
        f1(yt) +
        ' ' +
        f1(xLt) +
        ',' +
        f1(yt) +
        '" fill="' +
        HC_ILLO.lidHi +
        '" stroke="' +
        HC_ILLO.ink +
        '" stroke-width="1.1"/>';
      s +=
        '<polygon points="' +
        f1(xLt) +
        ',' +
        f1(yt) +
        ' ' +
        f1(xRt) +
        ',' +
        f1(yt) +
        ' ' +
        f1(xRb) +
        ',' +
        f1(yb) +
        ' ' +
        f1(xLb) +
        ',' +
        f1(yb) +
        '" fill="url(#' +
        u +
        '-tank)" stroke="' +
        HC_ILLO.ink +
        '" stroke-width="2"/>';
    } else {
      s +=
        '<rect x="' +
        f1(x + 6) +
        '" y="' +
        f1(sepY + rim - 2) +
        '" width="' +
        (w - 12) +
        '" height="' +
        (tankH - rim + 4) +
        '" rx="10" fill="url(#' +
        u +
        '-tank)" stroke="' +
        HC_ILLO.ink +
        '" stroke-width="2"/>';
      clipInner =
        '<rect x="' +
        f1(innerX) +
        '" y="' +
        f1(innerY) +
        '" width="' +
        innerW +
        '" height="' +
        innerH +
        '" rx="6"/>';
    }
    s += '<clipPath id="' + u + '-fclip">' + clipInner + '</clipPath>';
    s += '<g clip-path="url(#' + u + '-fclip)">';
    if (troncoG) {
      if (airH > 6) {
        s +=
          '<polygon points="' +
          f1(troncoG.xLt) +
          ',' +
          f1(troncoG.yt) +
          ' ' +
          f1(troncoG.xRt) +
          ',' +
          f1(troncoG.yt) +
          ' ' +
          f1(troncoG.xRs) +
          ',' +
          f1(troncoG.waterTop) +
          ' ' +
          f1(troncoG.xLs) +
          ',' +
          f1(troncoG.waterTop) +
          '" fill="#f0f9ff" opacity="0.95"/>';
        if (airH > 20) {
          s += illoText(troncoG.xRs - 6, troncoG.yt + airH / 2 + 3, 'Cámara de aire', 'hint', 'end');
        }
        s +=
          '<line x1="' +
          f1(troncoG.xLs + (troncoG.xRs - troncoG.xLs) * 0.12) +
          '" y1="' +
          f1(troncoG.waterTop) +
          '" x2="' +
          f1(troncoG.xRs - (troncoG.xRs - troncoG.xLs) * 0.12) +
          '" y2="' +
          f1(troncoG.waterTop) +
          '" stroke="#38bdf8" stroke-width="1.2" opacity="0.7"/>';
      }
      s +=
        '<polygon points="' +
        f1(troncoG.xLs) +
        ',' +
        f1(troncoG.waterTop) +
        ' ' +
        f1(troncoG.xRs) +
        ',' +
        f1(troncoG.waterTop) +
        ' ' +
        f1(troncoG.xRb) +
        ',' +
        f1(troncoG.yb) +
        ' ' +
        f1(troncoG.xLb) +
        ',' +
        f1(troncoG.yb) +
        '" fill="url(#' +
        u +
        '-water)"/>';
    } else {
      if (airH > 6) {
        s +=
          '<rect x="' +
          f1(innerX) +
          '" y="' +
          f1(innerY) +
          '" width="' +
          innerW +
          '" height="' +
          f1(airH) +
          '" fill="#f0f9ff" opacity="0.95"/>' +
          '<rect x="' +
          f1(innerX) +
          '" y="' +
          f1(innerY) +
          '" width="' +
          innerW +
          '" height="' +
          f1(airH) +
          '" fill="none" stroke="#7dd3fc" stroke-width="1" stroke-dasharray="4 3" opacity="0.65"/>';
        if (airH > 20) {
          s += illoText(innerX + innerW - 6, innerY + airH / 2 + 3, 'Cámara de aire', 'hint', 'end');
        }
        s +=
          '<line x1="' +
          f1(innerX + 6) +
          '" y1="' +
          f1(waterTop) +
          '" x2="' +
          f1(innerX + innerW - 6) +
          '" y2="' +
          f1(waterTop) +
          '" stroke="#38bdf8" stroke-width="1.2" opacity="0.7"/>';
      }
      s +=
        '<rect x="' +
        f1(innerX) +
        '" y="' +
        f1(waterTop) +
        '" width="' +
        innerW +
        '" height="' +
        f1(innerY + innerH - waterTop) +
        '" fill="url(#' +
        u +
        '-water)"/>';
    }
    for (var cc = 0; cc < C; cc++) {
      var planCx = L.innerX + (cc + 0.5) * L.cellW;
      var fx = troncoG
        ? troncoG.xLt + ((planCx - L.innerX) / L.innerW) * (troncoG.xRt - troncoG.xLt)
        : innerX + ((planCx - L.innerX) / L.innerW) * innerW;
      var neckRx = Math.max(6, Math.min(11, L.cellW * 0.28));
      s +=
        '<line x1="' +
        f1(planCx) +
        '" y1="' +
        f1(L.planTop + L.planH) +
        '" x2="' +
        f1(fx) +
        '" y2="' +
        f1(lidLineY) +
        '" stroke="' +
        HC_ILLO.inkSoft +
        '" stroke-width="0.9" stroke-dasharray="3 2" opacity="0.45"/>';
      s +=
        '<ellipse cx="' +
        f1(fx) +
        '" cy="' +
        f1(lidLineY + 2) +
        '" rx="' +
        f1(neckRx) +
        '" ry="4" fill="' +
        HC_ILLO.pot +
        '" stroke="' +
        HC_ILLO.ink +
        '" stroke-width="1.6"/>';
      if (N >= 1) {
        var stemBot = Math.max(lidLineY + 6, waterTop - 1);
        s +=
          '<line x1="' +
          f1(fx) +
          '" y1="' +
          f1(lidLineY + 5) +
          '" x2="' +
          f1(fx) +
          '" y2="' +
          f1(stemBot) +
          '" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>';
        if (waterTop < innerY + innerH - 12) {
          var rootEnd = Math.min(waterTop + (innerY + innerH - waterTop) * 0.45, innerY + innerH - 16);
          s +=
            '<line x1="' +
            f1(fx) +
            '" y1="' +
            f1(waterTop + 2) +
            '" x2="' +
            f1(fx) +
            '" y2="' +
            f1(rootEnd) +
            '" stroke="rgba(21,128,61,0.45)" stroke-width="2.2" stroke-linecap="round"/>';
        }
      }
    }
    s += '</g>';
    for (cc = 0; cc < C; cc++) {
      var planCx2 = L.innerX + (cc + 0.5) * L.cellW;
      var fx2 = troncoG
        ? troncoG.xLt + ((planCx2 - L.innerX) / L.innerW) * (troncoG.xRt - troncoG.xLt)
        : innerX + ((planCx2 - L.innerX) / L.innerW) * innerW;
      var neckRx2 = Math.max(6, Math.min(11, L.cellW * 0.28));
      s +=
        '<ellipse cx="' +
        f1(fx2) +
        '" cy="' +
        f1(lidLineY + 2) +
        '" rx="' +
        f1(neckRx2) +
        '" ry="4" fill="none" stroke="' +
        HC_ILLO.lidHi +
        '" stroke-width="1" opacity="0.8"/>';
    }
    if (tieneDifusor) {
      s +=
        '<ellipse cx="' +
        f1(stoneX) +
        '" cy="' +
        f1(innerY + innerH - 8) +
        '" rx="12" ry="5" fill="' +
        HC_ILLO.stone +
        '" stroke="' +
        HC_ILLO.ink +
        '" stroke-width="1.2"/>';
      s += bubbles(stoneX, innerY + innerH - 12, waterTop + 6, ta, 8);
    }
    if (tieneCalentador) {
      var hx = innerX + 20;
      s +=
        '<rect x="' +
        f1(hx - 4) +
        '" y="' +
        f1(innerY + 8) +
        '" width="8" height="' +
        f1(innerH - 20) +
        '" rx="4" fill="' +
        HC_ILLO.cal +
        '" stroke="' +
        HC_ILLO.pumpDark +
        '" stroke-width="1"/>';
    }
    return { svg: s, sepY: sepY, tankH: tankH, footY: sepY + tankH + 28 };
  }

  function tankFront(x, y, w, h, volPct, u, ta, tieneDifusor, tieneCalentador) {
    var rim = 12;
    var innerX = x + 10;
    var innerY = y + rim + 4;
    var innerW = w - 20;
    var innerH = h - rim - 10;
    var waterTop = innerY + innerH * (1 - volPct);
    var stoneX = innerX + innerW - 28;
    var s = '';
    s +=
      '<rect x="' +
      f1(x) +
      '" y="' +
      f1(y) +
      '" width="' +
      w +
      '" height="' +
      rim +
      '" rx="5" fill="url(#' +
      u +
      '-lid)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>' +
      '<rect x="' +
      f1(x + 6) +
      '" y="' +
      f1(y + rim - 2) +
      '" width="' +
      (w - 12) +
      '" height="' +
      (h - rim + 4) +
      '" rx="10" fill="url(#' +
      u +
      '-tank)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>' +
      '<clipPath id="' +
      u +
      '-fclip-simple"><rect x="' +
      f1(innerX) +
      '" y="' +
      f1(innerY) +
      '" width="' +
      innerW +
      '" height="' +
      innerH +
      '" rx="6"/></clipPath>' +
      '<g clip-path="url(#' +
      u +
      '-fclip-simple)">' +
      '<rect x="' +
      f1(innerX) +
      '" y="' +
      f1(waterTop) +
      '" width="' +
      innerW +
      '" height="' +
      f1(innerY + innerH - waterTop) +
      '" fill="url(#' +
      u +
      '-water)"/>' +
      '</g>';
    if (tieneDifusor) {
      s +=
        '<ellipse cx="' +
        f1(stoneX) +
        '" cy="' +
        f1(innerY + innerH - 8) +
        '" rx="12" ry="5" fill="' +
        HC_ILLO.stone +
        '" stroke="' +
        HC_ILLO.ink +
        '" stroke-width="1.2"/>';
      s += bubbles(stoneX, innerY + innerH - 12, waterTop + 6, ta, 8);
    }
    if (tieneCalentador) {
      var hx = innerX + 22;
      s +=
        '<rect x="' +
        f1(hx - 4) +
        '" y="' +
        f1(innerY + 8) +
        '" width="8" height="' +
        f1(innerH - 20) +
        '" rx="4" fill="' +
        HC_ILLO.cal +
        '" stroke="' +
        HC_ILLO.pumpDark +
        '" stroke-width="1"/>';
    }
    return s;
  }

  function bucket3d(cx, cy, w, h, n, c, u, cfg, label) {
    var rx = w * 0.42;
    var ry = rx * 0.38;
    var lidY = cy - h / 2 + 6;
    var bodyY = lidY + 8;
    var bodyH = h - 14;
    var s = '';
    s +=
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(cy + h / 2 - 2) +
      '" rx="' +
      f1(rx + 4) +
      '" ry="' +
      f1(ry) +
      '" fill="rgba(15,23,42,0.1)"/>';
    s +=
      '<rect x="' +
      f1(cx - rx) +
      '" y="' +
      f1(bodyY) +
      '" width="' +
      f1(rx * 2) +
      '" height="' +
      bodyH +
      '" rx="6" fill="' +
      HC_ILLO.bucketHi +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>' +
      '<ellipse cx="' +
      f1(cx) +
      '" cy="' +
      f1(lidY) +
      '" rx="' +
      f1(rx + 2) +
      '" ry="' +
      f1(ry + 1) +
      '" fill="url(#' +
      u +
      '-lid)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>';
    s += maceta({
      n: n,
      c: c,
      cx: cx,
      cy: lidY - 2,
      rx: Math.min(rx - 4, 16),
      ry: Math.min(ry, 11),
      uid: u,
      cfg: cfg,
      topView: true,
      label: label || 'Cubo ' + (c + 1),
      extraClass: 'dwc-maceta',
    });
    return s;
  }

  /**
   * DWC: delega en buildDwcDiagramSvg / generarSVGDwc (js/diagrams/dwc/dwc-diagram.js).
   */
  window.hcIlloGenerarSVGDwc = function (cfgOverride) {
    if (typeof buildDwcDiagramSvg === 'function') {
      if (!cfgOverride) return buildDwcDiagramSvg();
      var draft = Object.assign({ tipoInstalacion: 'dwc' }, cfgOverride);
      var N = Math.max(1, draft.numNiveles || 1);
      var C = Math.max(1, draft.numCestas || 1);
      var emptyCell = function () {
        return { variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] };
      };
      var torrePreview = [];
      for (var n = 0; n < N; n++) {
        var row = [];
        for (var c = 0; c < C; c++) row.push(emptyCell());
        torrePreview.push(row);
      }
      return buildDwcDiagramSvg(draft, torrePreview);
    }
    if (typeof generarSVGDwc !== 'function') return '';
    return generarSVGDwc();
  };

  window.hcIlloGenerarSVGSrf = function () {
    if (typeof buildSrfDiagramSvg === 'function') {
      return buildSrfDiagramSvg();
    }
    var cfg = (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    if (typeof srfEnsureConfigDefaults === 'function') srfEnsureConfigDefaults(cfg);
    var grid =
      typeof srfDistribuirPlantas === 'function'
        ? srfDistribuirPlantas(cfg)
        : { rows: cfg.numNiveles || 2, cols: cfg.numCestas || 4, total: 8 };
    var N = grid.rows;
    var C = grid.cols;
    var u = uid('srf');
    var W = Math.min(680, 120 + C * 54);
    var planTop = 52;
    var planPad = 16;
    var planW = W - 56;
    var planH = Math.min(200, 40 + N * 40);
    var planX = (W - planW) / 2;
    var ta = animOn();
    var volMez =
      typeof srfVolumenSeguroLitrosDesdeConfig === 'function'
        ? srfVolumenSeguroLitrosDesdeConfig(cfg)
        : typeof getVolumenMezclaLitros === 'function'
          ? getVolumenMezclaLitros(cfg)
          : null;
    var esKratky =
      typeof srfNormalizeOxigenacionModo === 'function' && srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo) === 'kratky';
    var tieneDifusor = (cfg.equipamiento ? cfg.equipamiento.indexOf('difusor') >= 0 : true) && !esKratky;
    var body = defsBlock(u);
    body += '<rect width="' + W + '" height="800" fill="url(#' + u + '-bg)"/>';
    body +=
      '<text x="' +
      (W / 2) +
      '" y="28" text-anchor="middle" font-family="Syne,sans-serif" font-size="16" font-weight="900" fill="' +
      HC_ILLO.ink +
      '">SRF · balsa flotante</text>';
    var iso = tankIsoPlan(planX, planTop, planW, planH * 0.55, u);
    body += iso.svg;
    body += lidOnIso(iso.lidPoly, 12, u);
    var inX = planX + planPad;
    var inY = planTop + planPad;
    var inW = planW - planPad * 2;
    var inH = planH - planPad * 2;
    var cW = inW / C;
    var cH = inH / N;
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < C; c++) {
        body += maceta({
          n: r,
          c: c,
          cx: inX + (c + 0.5) * cW,
          cy: inY + (r + 0.5) * cH,
          rx: Math.min(16, cW * 0.34),
          ry: Math.min(12, cH * 0.3),
          uid: u,
          cfg: cfg,
          extraClass: 'srf-maceta',
        });
      }
    }
    if (tieneDifusor) {
      if (typeof hcSvgAirPumpTorreBlock === 'function') {
        body += hcSvgAirPumpTorreBlock(planX + planW + 8, planTop, 0.95);
      } else {
        body += airPump(planX + planW + 8, planTop, 48, 32, u);
      }
    }
    var secY = planTop + planH + 44;
    body += tankFront(planX, secY, planW, 86, 0.62, u, ta, tieneDifusor, false);
    body +=
      '<text x="' +
      (W / 2) +
      '" y="' +
      (secY + 110) +
      '" text-anchor="middle" font-family="Syne,sans-serif" font-size="18" font-weight="900" fill="' +
      HC_ILLO.water1 +
      '">~' +
      (volMez != null ? volMez : '—') +
      ' L</text>';
    return svgWrap('srf-svg-diagram hc-illo-srf', W, secY + 130, u + '-title', 'SRF ' + N + '×' + C, body);
  };

  window.hcIlloGenerarSVGRdwc = function () {
    if (typeof buildRdwcDiagramSvg === 'function') {
      return buildRdwcDiagramSvg();
    }
    var cfg = (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(cfg);
    var sites = Math.max(2, Math.min(64, parseInt(String(cfg.rdwcSites || 4), 10) || 4));
    var rowsCfg = Math.max(1, Math.min(4, parseInt(String(cfg.rdwcRows || 1), 10) || 1));
    var colsCfg = Math.max(1, Math.ceil(sites / rowsCfg));
    var vis = typeof hcDistribuirFilasColumnas === 'function' ? hcDistribuirFilasColumnas(sites, 6) : { rows: 1, cols: sites };
    var visRows = vis.rows;
    var visCols = vis.cols;
    var u = uid('rdwc');
    var W = Math.min(720, 200 + visCols * 78);
    var top = 58;
    var blockW = Math.min(480, 48 + visCols * 72);
    var blockH = Math.min(260, 48 + visRows * 82);
    var left = (W - blockW) / 2;
    var cw = blockW / visCols;
    var ch = blockH / visRows;
    var ta = animOn();
    var volMez = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : null;
    var body = defsBlock(u);
    body += '<rect width="' + W + '" height="900" fill="url(#' + u + '-bg)"/>';
    body +=
      '<text x="' +
      (W / 2) +
      '" y="28" text-anchor="middle" font-family="Syne,sans-serif" font-size="16" font-weight="900" fill="' +
      HC_ILLO.ink +
      '">RDWC · recirculación</text>';
    body +=
      '<text x="' +
      (W / 2) +
      '" y="44" text-anchor="middle" font-size="10" fill="' +
      HC_ILLO.inkSoft +
      '">Flechas verdes = impulsión · azul = retorno</text>';
    var supY = top - 4;
    var retY = top + blockH + 4;
    body +=
      '<rect x="' +
      f1(left) +
      '" y="' +
      f1(top) +
      '" width="' +
      blockW +
      '" height="' +
      blockH +
      '" rx="14" fill="rgba(255,255,255,0.5)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.35"/>';
    body += flowArrow(left + 16, supY, left + blockW - 16, supY);
    body += flowArrow(left + blockW - 16, retY, left + 16, retY);
    for (var idx = 0; idx < sites; idx++) {
      var vr = Math.floor(idx / visCols);
      var vc = idx % visCols;
      var rn = Math.floor(idx / colsCfg);
      var cc = idx % colsCfg;
      var bx = left + (vc + 0.5) * cw;
      var by = top + (vr + 0.5) * ch;
      body += bucket3d(bx, by, Math.min(64, cw - 8), 76, rn, cc, u, cfg, 'Sitio ' + (idx + 1));
    }
    var pumpX = left + blockW / 2;
    var pumpY = top + blockH + 28;
    body += waterPump(pumpX, pumpY, 16);
    var tankW = Math.min(320, blockW + 24);
    var tankX = (W - tankW) / 2;
    var tankY = pumpY + 36;
    body += tankFront(tankX, tankY, tankW, 72, 0.58, u, ta, true, false);
    if (typeof hcSvgAirPumpTorreBlock === 'function') {
      body += hcSvgAirPumpTorreBlock(tankX + tankW + 12, tankY + 8, 0.88);
    } else {
      body += airPump(tankX + tankW + 12, tankY + 8, 44, 30, u);
    }
    body +=
      flowArrow(pumpX, pumpY + 16, pumpX, tankY) +
      flowArrow(left + blockW - 20, retY + 4, tankX + tankW - 20, tankY + 12);
    body +=
      '<text x="' +
      (W / 2) +
      '" y="' +
      (tankY + 100) +
      '" text-anchor="middle" font-family="Syne,sans-serif" font-size="18" font-weight="900" fill="' +
      HC_ILLO.water1 +
      '">' +
      (volMez != null ? Math.round(volMez * 10) / 10 + ' L control' : '—') +
      '</text>';
    return svgWrap('rdwc-svg-diagram hc-illo-rdwc', W, tankY + 120, u + '-title', 'RDWC ' + sites + ' sitios', body);
  };

  function illoTorreEquipList(cfg) {
    var e = cfg && cfg.equipamiento;
    if (Array.isArray(e)) return e;
    if (
      typeof state !== 'undefined' &&
      state.configTorre &&
      Array.isArray(state.configTorre.equipamiento)
    ) {
      return state.configTorre.equipamiento;
    }
    return [];
  }

  function hcIlloTorreLayout(cfg) {
    var numNiveles = Math.max(1, Math.min(12, parseInt(cfg.numNiveles, 10) || 5));
    var W = 408;
    var CX = W / 2;
    var NIVEL_H = 58;
    var GAP = 12;
    var MARG_T = 54;
    var TORRE_RX = 98;
    var TORRE_RY = 17;
    var torH = numNiveles * NIVEL_H + (numNiveles - 1) * GAP;
    var DEP_H = 88;
    var DEP_W = 200;
    var depY = MARG_T + torH + 20;
    var depX = (W - DEP_W) / 2;
    var H = depY + DEP_H + 32;
    return {
      W: W,
      CX: CX,
      NIVEL_H: NIVEL_H,
      GAP: GAP,
      MARG_T: MARG_T,
      TORRE_RX: TORRE_RX,
      TORRE_RY: TORRE_RY,
      torH: torH,
      DEP_H: DEP_H,
      DEP_W: DEP_W,
      depY: depY,
      depX: depX,
      H: H,
      numNiveles: numNiveles,
    };
  }

  function hcIlloTorreNivelCestasHTML(n, rot, u, cfg, L) {
    var numCestas = Math.max(1, Math.min(10, parseInt(cfg.numCestas, 10) || 5));
    var cy = L.MARG_T + n * (L.NIVEL_H + L.GAP) + L.NIVEL_H / 2;
    var phase = n * 0.55 + (rot || 0);
    var items = [];
    var c;
    for (c = 0; c < numCestas; c++) {
      var ang = (Math.PI * 2 * (c / numCestas)) + phase;
      var z = (Math.sin(ang) + 1) / 2;
      var scale = 0.84 + 0.22 * z;
      var opacity = 0.4 + 0.6 * z;
      items.push({
        c: c,
        px: L.CX + Math.cos(ang) * L.TORRE_RX,
        py: cy + Math.sin(ang) * L.TORRE_RY,
        z: z,
        scale: scale,
        opacity: opacity,
      });
    }
    items.sort(function (a, b) {
      return a.z - b.z;
    });
    var out = '';
    items.forEach(function (it) {
      var caraFrontal = it.z >= 0.38;
      out += '<g opacity="' + it.opacity.toFixed(2) + '"' + (caraFrontal ? '' : ' pointer-events="none"') + '>';
      out += maceta({
        n: n,
        c: it.c,
        cx: it.px,
        cy: it.py,
        rx: 11.6 * it.scale,
        ry: 8.1 * it.scale,
        uid: u,
        cfg: cfg,
        topView: true,
        extraClass: 'torre-maceta',
      });
      out += '</g>';
    });
    return out;
  }

  /** Eje central (hub de la torre): detrás de cestas; anillos de nivel solo contorno para no cortarlo. */
  function hcIlloTorreEjeCentralSvg(L, u, ta) {
    var out =
      '<g class="hc-torre-eje" pointer-events="none" aria-hidden="true">' +
      '<rect x="' +
      f1(L.CX - 7) +
      '" y="' +
      f1(L.MARG_T - 8) +
      '" width="14" height="' +
      f1(L.torH + 16) +
      '" rx="7" fill="url(#' +
      u +
      '-water)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>';
    if (ta) {
      out +=
        '<line x1="' +
        f1(L.CX) +
        '" y1="' +
        f1(L.MARG_T) +
        '" x2="' +
        f1(L.CX) +
        '" y2="' +
        f1(L.depY) +
        '" stroke="#0ea5e9" stroke-width="2" stroke-dasharray="6 7" opacity="0.45">' +
        '<animate attributeName="stroke-dashoffset" from="0" to="26" dur="1s" repeatCount="indefinite"/></line>';
    }
    out +=
      '<ellipse cx="' +
      f1(L.CX) +
      '" cy="' +
      f1(L.MARG_T - 22) +
      '" rx="24" ry="10" fill="#f1f5f9" stroke="#64748b" stroke-width="1.1"/>' +
      '</g>';
    return out;
  }

  function hcIlloTorreNivelRotHint(cx, cy, rx) {
    return (
      '<g class="hc-torre-nivel-rot-hint" pointer-events="none" aria-hidden="true" opacity="0.5">' +
      '<text x="' +
      f1(cx - rx - 26) +
      '" y="' +
      f1(cy + 5) +
      '" font-family="Syne,sans-serif" font-size="16" font-weight="800" fill="#64748b">‹</text>' +
      '<text x="' +
      f1(cx + rx + 20) +
      '" y="' +
      f1(cy + 5) +
      '" font-family="Syne,sans-serif" font-size="16" font-weight="800" fill="#64748b">›</text>' +
      '</g>'
    );
  }

  function hcIlloTorreRotFlechas(depX, depY, depW, depH) {
    var btnR = 17;
    var yBtn = depY + depH / 2;
    var xL = depX - 6 - btnR;
    var xR = depX + depW + 6 + btnR;
    var triL = 'M ' + f1(xL - 7) + ' ' + f1(yBtn) + ' L ' + f1(xL + 5) + ' ' + f1(yBtn - 8) + ' L ' + f1(xL + 5) + ' ' + f1(yBtn + 8) + ' Z';
    var triR = 'M ' + f1(xR + 7) + ' ' + f1(yBtn) + ' L ' + f1(xR - 5) + ' ' + f1(yBtn - 8) + ' L ' + f1(xR - 5) + ' ' + f1(yBtn + 8) + ' Z';
    return (
      '<g class="hc-torre-rot-flecha" data-rot-dir="1" role="button" tabindex="0" aria-label="Girar niveles a la izquierda">' +
      '<circle cx="' +
      f1(xL) +
      '" cy="' +
      f1(yBtn) +
      '" r="' +
      btnR +
      '" fill="rgba(248,250,252,0.97)" stroke="#64748b" stroke-width="1.3"/>' +
      '<path d="' +
      triL +
      '" fill="#1e293b" pointer-events="none"/></g>' +
      '<g class="hc-torre-rot-flecha" data-rot-dir="-1" role="button" tabindex="0" aria-label="Girar niveles a la derecha">' +
      '<circle cx="' +
      f1(xR) +
      '" cy="' +
      f1(yBtn) +
      '" r="' +
      btnR +
      '" fill="rgba(248,250,252,0.97)" stroke="#64748b" stroke-width="1.3"/>' +
      '<path d="' +
      triR +
      '" fill="#1e293b" pointer-events="none"/></g>'
    );
  }

  function hcIlloTorreDwcAirSvg(depX, depY, depW, depH, tieneDifusor, ta, canvasW) {
    if (!tieneDifusor) return { defs: '', html: '' };
    if (typeof torreSvgDepositoAirDwc === 'function') {
      var airOpts = {};
      if (Number.isFinite(Number(canvasW)) && Number(canvasW) > 0) {
        airOpts.canvasW = Number(canvasW);
      }
      return torreSvgDepositoAirDwc(depX, depY, depW, depH, ta !== false, airOpts);
    }
    return { defs: '', html: '' };
  }

  /** Layout fijo de la vista «Sistema de cultivo» (440px, panel colorido). */
  function hcIlloTorreLayoutSistema(cfg) {
    var numNiveles = Math.max(1, Math.min(12, parseInt(cfg.numNiveles, 10) || 5));
    var W = 440;
    var NIVEL_H = 58;
    var GAP = 12;
    var MARG_T = 50;
    var torH = numNiveles * NIVEL_H + (numNiveles - 1) * GAP;
    var DEP_H = 88;
    var DEP_W = 188;
    var panelX = 18;
    var leftZoneW = 272;
    var leftX = panelX + 14;
    var centerX = leftX + leftZoneW * 0.5;
    var topY = MARG_T + 4;
    var depY = topY + torH + 24;
    return {
      W: W,
      H: MARG_T + torH + 24 + DEP_H + 40,
      CX: centerX,
      centerX: centerX,
      topY: topY,
      torH: torH,
      NIVEL_H: NIVEL_H,
      GAP: GAP,
      MARG_T: topY - NIVEL_H / 2,
      TORRE_RX: 86,
      TORRE_RY: 14,
      depX: centerX - 94,
      depY: depY,
      DEP_W: DEP_W,
      DEP_H: DEP_H,
      leftX: leftX,
      leftZoneW: leftZoneW,
      panelX: panelX,
      numNiveles: numNiveles,
    };
  }

  /** Macetas en anillo frontal (vista acordada); respeta rotación por nivel. */
  function hcIlloTorreNivelCestasFrontal(n, rot, u, cfg, L) {
    var numCestas = Math.max(1, Math.min(10, parseInt(cfg.numCestas, 10) || 5));
    var cy = L.MARG_T + n * (L.NIVEL_H + L.GAP) + L.NIVEL_H / 2;
    var phase = n * 0.55 + (rot || 0);
    var items = [];
    var c;
    for (c = 0; c < numCestas; c++) {
      var ang = (c / numCestas) * Math.PI * 2 - Math.PI / 2 + phase;
      var z = (Math.sin(ang) + 1) / 2;
      var scale = 0.84 + 0.22 * z;
      var opacity = 0.42 + 0.58 * z;
      items.push({
        c: c,
        px: L.CX + Math.cos(ang) * L.TORRE_RX,
        py: cy + Math.sin(ang) * L.TORRE_RY,
        z: z,
        scale: scale,
        opacity: opacity,
      });
    }
    items.sort(function (a, b) {
      return a.z - b.z;
    });
    var out = '';
    items.forEach(function (it) {
      var caraFrontal = it.z >= 0.38;
      out += '<g opacity="' + it.opacity.toFixed(2) + '"' + (caraFrontal ? '' : ' pointer-events="none"') + '>';
      out += maceta({
        n: n,
        c: it.c,
        cx: it.px,
        cy: it.py,
        rx: 13.4 * it.scale,
        ry: 9.3 * it.scale,
        uid: u,
        cfg: cfg,
        topView: false,
        extraClass: 'torre-maceta torre-maceta--sistema',
      });
      out += '</g>';
    });
    return out;
  }

  window.hcIlloTorreLayout = hcIlloTorreLayout;
  window.hcIlloTorreLayoutSistema = hcIlloTorreLayoutSistema;
  window.hcIlloTorreNivelCestasHTML = hcIlloTorreNivelCestasHTML;
  window.hcIlloTorreNivelCestasFrontal = hcIlloTorreNivelCestasFrontal;

  /**
   * Vista colorida de torre para Cultivo e instalación (panel, macetas 3D, depósito con agua).
   * Sin líneas de impulsión/retorno ni panel «Resumen técnico»; bomba DWC unificada.
   */
  function hcIlloTorreEsquemaSistemaColorido(cfg, u, numNiveles, numCestas, volCap, volMez, volPct, ta) {
    var rot = cfg._torreRotRad || 0;
    var equip = illoTorreEquipList(cfg);
    var tieneDifusor = !equip.length || equip.indexOf('difusor') >= 0;
    var volTankL =
      volMez != null && Number.isFinite(Number(volMez)) && volMez > 0
        ? volMez
        : volCap != null && Number.isFinite(Number(volCap))
          ? Number(volCap) * 0.78
          : 20;
    var Lp = hcIlloTorreLayoutSistema(cfg);
    var W = Lp.W;
    var H = Lp.H;
    var centerX = Lp.centerX;
    var topY = Lp.topY;
    var torH = Lp.torH;
    var depY = Lp.depY;
    var depX = Lp.depX;
    var depW = Lp.DEP_W;
    var DEP_H = Lp.DEP_H;
    var panelX = Lp.panelX;
    var panelY = 14;
    var panelW = W - 36;
    var panelH = H - 24;
    var leftX = Lp.leftX;
    var leftZoneW = Lp.leftZoneW;
    var body = '';
    body += '<rect width="' + W + '" height="' + H + '" fill="url(#' + u + '-bg)"/>';
    body +=
      '<rect x="' +
      f1(panelX) +
      '" y="' +
      f1(panelY) +
      '" width="' +
      f1(panelW) +
      '" height="' +
      f1(panelH) +
      '" rx="16" fill="rgba(255,255,255,0.74)" stroke="#cbd5e1" stroke-width="1.2"/>';
    body +=
      '<rect x="' +
      f1(panelX + 1) +
      '" y="' +
      f1(panelY + 1) +
      '" width="' +
      f1(panelW - 2) +
      '" height="54" rx="15" fill="rgba(148,163,184,0.09)"/>';
    body +=
      '<text x="' +
      f1(centerX) +
      '" y="30" text-anchor="middle" font-family="Syne,sans-serif" font-size="11" font-weight="700" fill="#64748b" letter-spacing="0.04em">SISTEMA DE CULTIVO</text>';
    body +=
      '<text x="' +
      f1(centerX) +
      '" y="49" text-anchor="middle" font-family="Syne,sans-serif" font-size="24" font-weight="900" fill="' +
      HC_ILLO.ink +
      '">Torre vertical</text>';
    body +=
      '<rect x="' +
      f1(leftX + 28) +
      '" y="' +
      f1(topY - 4) +
      '" width="' +
      f1(leftZoneW - 56) +
      '" height="' +
      f1(torH + 22) +
      '" rx="20" fill="rgba(186,230,253,0.38)" stroke="#7dd3fc" stroke-width="1.2"/>';
    body +=
      '<ellipse cx="' +
      f1(centerX) +
      '" cy="' +
      f1(topY + torH + 12) +
      '" rx="86" ry="14" fill="rgba(15,23,42,0.08)"/>';
    body +=
      '<rect x="' +
      f1(centerX - 8) +
      '" y="' +
      f1(topY + 2) +
      '" width="16" height="' +
      f1(torH - 4) +
      '" rx="8" fill="url(#' +
      u +
      '-water)" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2.2"/>';
    body +=
      '<rect x="' +
      f1(centerX - 2.4) +
      '" y="' +
      f1(topY + 10) +
      '" width="4.8" height="' +
      f1(Math.max(20, torH - 20)) +
      '" rx="2.4" fill="rgba(255,255,255,0.42)"/>';
    var n;
    var NIVEL_H = Lp.NIVEL_H;
    var GAP = Lp.GAP;
    for (n = 0; n < numNiveles; n++) {
      var cy = topY + n * (NIVEL_H + GAP) + NIVEL_H / 2;
      body += '<g id="hc-baskets-n-' + n + '">' + hcIlloTorreNivelCestasFrontal(n, rot, u, cfg, Lp) + '</g>';
      body +=
        '<text x="' +
        f1(leftX + 18) +
        '" y="' +
        f1(cy + 4) +
        '" text-anchor="middle" font-family="Inconsolata,monospace" font-size="10" font-weight="800" fill="#64748b">N' +
        (n + 1) +
        '</text>';
    }
    body += '<ellipse cx="' + f1(centerX) + '" cy="' + f1(depY + DEP_H + 8) + '" rx="' + f1(depW * 0.44) + '" ry="6" fill="rgba(15,23,42,0.1)"/>';
    var defsExtra = '';
    var depBlock = { defs: '', html: '' };
    if (typeof torreSvgDepositoCompleto === 'function') {
      depBlock = torreSvgDepositoCompleto(depX, depY, depW, DEP_H, volTankL, {
        suf: u + 'Tk',
        animate: ta,
        capL: volCap,
        mezL: volMez,
        difusor: tieneDifusor,
        canvasW: W,
      });
    } else {
      depBlock.html = tankFront(depX, depY, depW, DEP_H, Math.max(0.55, volPct), u, ta, false, false);
      if (tieneDifusor) {
        var airFb = hcIlloTorreDwcAirSvg(depX, depY, depW, DEP_H, true, ta, W);
        depBlock.defs += airFb.defs || '';
        depBlock.html += airFb.html || '';
      }
    }
    defsExtra += depBlock.defs || '';
    body += depBlock.html || '';
    if (typeof hcDiagramVolLabelSvg === 'function') {
      body += hcDiagramVolLabelSvg(centerX, depY + DEP_H + 28, volMez != null ? volMez : volTankL, {
        fontSize: 20,
        fill: HC_ILLO.water1,
        pointerEvents: false,
      });
    }
    body += hcIlloTorreRotFlechas(depX, depY, depW, DEP_H);
    return { W: W, H: H, body: body, defsExtra: defsExtra };
  }

  function torreAllBasketsPanel(u, cfg, x0, y0, nNiv, nCes, stepX, stepY, rx, ry) {
    var body = '';
    for (var n = 0; n < nNiv; n++) {
      var y = y0 + n * stepY;
      body +=
        '<text x="' +
        f1(x0 - 24) +
        '" y="' +
        f1(y + 4) +
        '" text-anchor="end" font-family="Syne,sans-serif" font-size="11" font-weight="800" fill="' +
        HC_ILLO.inkSoft +
        '">N' +
        (n + 1) +
        '</text>';
      for (var c = 0; c < nCes; c++) {
        var x = x0 + c * stepX;
        body += maceta({
          n: n,
          c: c,
          cx: x,
          cy: y,
          rx: rx,
          ry: ry,
          uid: u,
          cfg: cfg,
          topView: true,
          extraClass: 'torre-maceta torre-maceta--panel',
          label: 'Nivel ' + (n + 1) + ', cesta ' + (c + 1),
        });
      }
    }
    return body;
  }

  window.hcIlloGenerarSVGTorre = function () {
    /* No llamar buildTorreDiagramSvg: torre-diagram.js ya delega aquí (bucle infinito). */
    var cfg = (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    var numNiveles = Math.max(1, Math.min(12, parseInt(cfg.numNiveles, 10) || 5));
    var numCestas = Math.max(1, Math.min(10, parseInt(cfg.numCestas, 10) || 5));
    var u = uid('torre');
    var vista = cfg.torreDiagramaVista || 'esquema';
    var W = vista === 'esquema' ? 360 : 560;
    var CX = W / 2;
    var NIVEL_H = 58;
    var GAP = 12;
    var torH = numNiveles * NIVEL_H + (numNiveles - 1) * GAP;
    var MARG_T = 50;
    var DEP_H = 88;
    var H = MARG_T + torH + 24 + DEP_H + 40;
    var ta = animOn();
    var volCap = typeof getVolumenDepositoMaxLitros === 'function' ? getVolumenDepositoMaxLitros(cfg) : null;
    var volMez = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : null;
    var volPct = volCap > 0 && volMez > 0 ? Math.min(1, volMez / volCap) : 0.65;
    var body = defsBlock(u);
    if (vista === 'corte' || vista === 'flujo') {
      body += '<rect width="' + W + '" height="' + H + '" fill="url(#' + u + '-bg)"/>';
      var isFlujo = vista === 'flujo';
      var shellX = 56;
      var shellW = 168;
      var headY = MARG_T - 8;
      var depYv = MARG_T + torH + 24;
      var depXv = 40;
      var depWv = 220;
      body +=
        '<text x="' +
        f1(W / 2) +
        '" y="26" text-anchor="middle" font-family="Syne,sans-serif" font-size="16" font-weight="900" fill="' +
        HC_ILLO.ink +
        '">Torre vertical · vista ' +
        esc(vista) +
        '</text>';
      body +=
        '<rect x="' +
        f1(shellX) +
        '" y="' +
        f1(MARG_T) +
        '" width="' +
        f1(shellW) +
        '" height="' +
        f1(torH) +
        '" rx="20" fill="rgba(255,255,255,0.55)" stroke="#94a3b8" stroke-width="1.4"/>';
      body +=
        '<rect x="' +
        f1(shellX + shellW / 2 - 8) +
        '" y="' +
        f1(MARG_T + 12) +
        '" width="16" height="' +
        f1(torH - 24) +
        '" rx="7" fill="#0ea5e9" opacity="' +
        (isFlujo ? '0.85' : '0.45') +
        '" stroke="#0f2744" stroke-width="1.1"/>';
      body +=
        '<ellipse cx="' +
        f1(shellX + shellW / 2) +
        '" cy="' +
        f1(headY + 8) +
        '" rx="26" ry="10" fill="#22c55e" stroke="#14532d" stroke-width="1.4"/>';
      for (var nl = 0; nl < numNiveles; nl++) {
        var yL = MARG_T + nl * (NIVEL_H + GAP) + NIVEL_H * 0.5;
        body +=
          '<line x1="' +
          f1(shellX + 12) +
          '" y1="' +
          f1(yL) +
          '" x2="' +
          f1(shellX + shellW - 12) +
          '" y2="' +
          f1(yL) +
          '" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>';
      }
      body += tankFront(depXv, depYv, depWv, DEP_H, volPct, u, ta, true, true);
      var airCorte = hcIlloTorreDwcAirSvg(depXv, depYv, depWv, DEP_H, true, ta, W);
      if (airCorte.defs) body = body.replace('</defs>', airCorte.defs + '</defs>');
      body += airCorte.html;
      body +=
        '<path d="M ' +
        f1(depXv + depWv - 20) +
        ' ' +
        f1(depYv + 12) +
        ' L ' +
        f1(shellX + shellW / 2) +
        ' ' +
        f1(depYv + 12) +
        ' L ' +
        f1(shellX + shellW / 2) +
        ' ' +
        f1(headY + 8) +
        '" fill="none" stroke="#0ea5e9" stroke-width="' +
        (isFlujo ? '3.6' : '2.6') +
        '" stroke-linecap="round" opacity="0.92"/>';
      body +=
        '<path d="M ' +
        f1(shellX + shellW - 18) +
        ' ' +
        f1(MARG_T + 18) +
        ' L ' +
        f1(shellX + shellW + 12) +
        ' ' +
        f1(MARG_T + 18) +
        ' L ' +
        f1(shellX + shellW + 12) +
        ' ' +
        f1(depYv + 14) +
        ' L ' +
        f1(depXv + 24) +
        ' ' +
        f1(depYv + 14) +
        '" fill="none" stroke="#22c55e" stroke-width="' +
        (isFlujo ? '3.4' : '2.4') +
        '" stroke-linecap="round" opacity="0.9"/>';
      var panelX = 316;
      var panelY = MARG_T + 18;
      body +=
        '<rect x="' +
        f1(panelX - 28) +
        '" y="' +
        f1(panelY - 24) +
        '" width="' +
        f1(Math.max(188, numCestas * 36 + 44)) +
        '" height="' +
        f1(Math.max(140, numNiveles * 46 + 36)) +
        '" rx="12" fill="rgba(255,255,255,0.72)" stroke="#cbd5e1" stroke-width="1.1"/>';
      body +=
        '<text x="' +
        f1(panelX + 40) +
        '" y="' +
        f1(panelY - 8) +
        '" text-anchor="middle" font-family="Syne,sans-serif" font-size="11" font-weight="800" fill="' +
        HC_ILLO.inkSoft +
        '">Cestas seleccionables</text>';
      body += torreAllBasketsPanel(
        u,
        cfg,
        panelX,
        panelY + 14,
        numNiveles,
        numCestas,
        34,
        44,
        11.5,
        8.2
      );
      body +=
        '<text x="' +
        f1(depXv + depWv / 2) +
        '" y="' +
        f1(depYv + DEP_H + 26) +
        '" text-anchor="middle" font-family="Syne,sans-serif" font-size="17" font-weight="900" fill="' +
        HC_ILLO.water1 +
        '">' +
        (volMez != null ? Math.round(volMez * 10) / 10 + ' L' : '—') +
        '</text>';
      return svgWrap(
        'torre-svg-diagram hc-illo-torre hc-illo-torre--' + esc(vista),
        W,
        depYv + DEP_H + 40,
        u + '-title',
        'Torre ' + numNiveles + ' niveles · ' + vista,
        body
      );
    }
    /* Esquema único (Cultivo e instalación): torre 3D + depósito DWC; Medir no duplica este SVG. */
    var L = hcIlloTorreLayout(cfg);
    W = L.W;
    H = L.H;
    var rot = cfg._torreRotRad || 0;
    var equip = illoTorreEquipList(cfg);
    var tieneDifusor = !equip.length || equip.indexOf('difusor') >= 0;
    var tieneCalentador = equip.indexOf('calentador') >= 0;
    var volTankL =
      volMez != null && Number.isFinite(Number(volMez)) && volMez > 0
        ? volMez
        : volCap != null && Number.isFinite(Number(volCap))
          ? Number(volCap) * 0.78
          : 20;
    body += '<rect width="' + L.W + '" height="' + L.H + '" fill="url(#' + u + '-bg)"/>';
    body += hcIlloTorreEjeCentralSvg(L, u, ta);
    var n;
    for (n = 0; n < numNiveles; n++) {
      var cyN = L.MARG_T + n * (L.NIVEL_H + L.GAP) + L.NIVEL_H / 2;
      body +=
        '<ellipse class="hc-torre-nivel-rueda" cx="' +
        f1(L.CX) +
        '" cy="' +
        f1(cyN) +
        '" rx="' +
        f1(L.TORRE_RX + 4) +
        '" ry="' +
        f1(L.TORRE_RY + 3) +
        '" fill="none" stroke="#84cc16" stroke-width="1.5" opacity="0.72"/>';
      body += '<g id="hc-baskets-n-' + n + '" class="hc-torre-nivel-cestas">' + hcIlloTorreNivelCestasHTML(n, rot, u, cfg, L) + '</g>';
      body += hcIlloTorreNivelRotHint(L.CX, cyN, L.TORRE_RX);
    }
    body += '<ellipse cx="' + f1(L.CX) + '" cy="' + f1(L.depY + L.DEP_H + 8) + '" rx="' + f1(L.DEP_W * 0.44) + '" ry="6" fill="rgba(15,23,42,0.1)"/>';
    var depBlock = { defs: '', html: '' };
    if (typeof torreSvgDepositoCompleto === 'function') {
      depBlock = torreSvgDepositoCompleto(L.depX, L.depY, L.DEP_W, L.DEP_H, volTankL, {
        suf: u + 'Tk',
        animate: ta,
        capL: volCap,
        mezL: volMez,
        difusor: tieneDifusor,
        canvasW: L.W,
      });
    } else {
      depBlock.html = tankFront(L.depX, L.depY, L.DEP_W, L.DEP_H, Math.max(0.55, volPct), u, ta, false, tieneCalentador);
      if (tieneDifusor) {
        var airFb = hcIlloTorreDwcAirSvg(L.depX, L.depY, L.DEP_W, L.DEP_H, true, ta, L.W);
        depBlock.defs += airFb.defs || '';
        depBlock.html += airFb.html || '';
      }
    }
    if (depBlock.defs) {
      if (body.indexOf('</defs>') >= 0) {
        body = body.replace('</defs>', depBlock.defs + '</defs>');
      } else {
        body = '<defs>' + depBlock.defs + '</defs>' + body;
      }
    }
    body += depBlock.html || '';
    if (tieneCalentador) {
      body +=
        '<rect x="' +
        f1(L.depX + 16) +
        '" y="' +
        f1(L.depY + L.DEP_H - 36) +
        '" width="8" height="26" rx="4" fill="#f97316" stroke="#ea580c" stroke-width="1"/>';
    }
    if (typeof hcDiagramVolLabelSvg === 'function') {
      body += hcDiagramVolLabelSvg(L.CX, L.depY + L.DEP_H + 28, volMez != null ? volMez : volTankL, {
        fontSize: 20,
        fill: HC_ILLO.water1,
        pointerEvents: false,
      });
    }
    body += hcIlloTorreRotFlechas(L.depX, L.depY, L.DEP_W, L.DEP_H);
    var ariaTorre =
      numNiveles +
      (numNiveles === 1 ? ' nivel' : ' niveles') +
      ', ' +
      numCestas +
      (numCestas === 1 ? ' cesta' : ' cestas');
    return svgWrap('torre-svg-diagram hc-illo-torre hc-illo-torre--esquema', W, L.H, u + '-title', ariaTorre, body);
  };

  /** Hueco NFT interactivo (sustituye círculo plano en serpentín/mesa/escalera). */
  window.hcIlloNftHuecoLayer = function (gx, gy, hr, i, j, dat, cult, interactive, P, opts) {
    opts = opts || {};
    var u = opts.uid || uid('nft');
    var compact = !!opts.compact;
    var numShow = opts.numShow != null ? opts.numShow : j + 1;
    if (!interactive) {
      if (opts.sinTexto) {
        return (
          '<ellipse cx="' +
          f1(gx) +
          '" cy="' +
          gy +
          '" rx="' +
          f1(hr) +
          '" ry="' +
          f1(hr * 0.88) +
          '" fill="' +
          HC_ILLO.pot +
          '" stroke="' +
          HC_ILLO.ink +
          '" stroke-width="2"/>'
        );
      }
      var em =
        dat && dat.variedad && typeof cultivoEmoji === 'function' ? cultivoEmoji(cult) : '';
      var s =
        '<ellipse cx="' +
        f1(gx) +
        '" cy="' +
        gy +
        '" rx="' +
        f1(hr) +
        '" ry="' +
        f1(hr * 0.88) +
        '" fill="' +
        HC_ILLO.pot +
        '" stroke="' +
        HC_ILLO.ink +
        '" stroke-width="2"/>';
      if (em) {
        s +=
          '<text x="' +
          f1(gx) +
          '" y="' +
          gy +
          '" text-anchor="middle" dominant-baseline="central" font-size="' +
          Math.min(14, hr * 1.2) +
          '">' +
          em +
          '</text>';
      }
      if (opts.numBelow && typeof nftSvgHuecoNumBelowHole === 'function') {
        s += nftSvgHuecoNumBelowHole(gx, gy, hr, numShow, Math.max(7, hr * 0.55), compact, opts.extraDy || 0);
      }
      return s;
    }
    if (opts.sinTexto) {
      return maceta({
        n: i,
        c: j,
        cx: gx,
        cy: gy,
        rx: hr,
        ry: hr * 0.88,
        uid: u,
        cfg: typeof state !== 'undefined' ? state.configTorre : {},
        topView: true,
        dat: dat,
        label: 'Canal T' + (i + 1) + ', hueco ' + (j + 1),
        extraClass: 'hc-nft-hueco hc-illo-nft-hole',
        sinTexto: true,
      });
    }
    var out = maceta({
      n: i,
      c: j,
      cx: gx,
      cy: gy,
      rx: hr,
      ry: hr * 0.88,
      uid: u,
      cfg: typeof state !== 'undefined' ? state.configTorre : {},
      topView: true,
      dat: dat,
      label: 'Canal T' + (i + 1) + ', hueco ' + (j + 1),
      extraClass: 'hc-nft-hueco hc-illo-nft-hole',
    });
    if (opts.numBelow && typeof nftSvgHuecoNumBelowHole === 'function') {
      out += nftSvgHuecoNumBelowHole(gx, gy, hr, numShow, Math.max(7, hr * 0.55), compact, opts.extraDy || 0);
    }
    return out;
  };
})();
