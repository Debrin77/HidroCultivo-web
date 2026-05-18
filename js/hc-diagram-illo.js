/**
 * Diagramas interpretativos (estilo ilustración) — DWC, RDWC, SRF, torre, huecos NFT.
 * SVG escalable (solo viewBox), IDs únicos por instancia, interactividad hc-cesta.
 */
(function () {
  'use strict';

  var HC_ILLO = {
    ink: '#1e3a5f',
    inkSoft: '#334155',
    water0: '#38bdf8',
    water1: '#0284c7',
    water2: '#0369a1',
    lid: '#475569',
    lidHi: '#64748b',
    lidDark: '#334155',
    pot: '#f8fafc',
    potRim: '#cbd5e1',
    mesh: '#94a3b8',
    pump: '#f97316',
    pumpHi: '#fdba74',
    pumpDark: '#c2410c',
    pipe: '#2563eb',
    flow: '#22c55e',
    bubble: '#ffffff',
    stone: '#64748b',
    cal: '#fb923c',
    bg0: '#f0f9ff',
    bg1: '#e0f2fe',
    bucket: '#94a3b8',
    bucketHi: '#cbd5e1',
    bucketRim: '#475569',
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
      '"/><stop offset="100%" stop-color="' +
      HC_ILLO.lidDark +
      '"/></linearGradient>' +
      '<filter id="' +
      u +
      '-sh" x="-8%" y="-8%" width="116%" height="116%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.12"/></filter>' +
      '</defs>'
    );
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
      typeof window.editingCesta !== 'undefined' &&
      editingCesta &&
      editingCesta.nivel === n &&
      editingCesta.cesta === c;
    var multiKey = n + ',' + c;
    var isMulti =
      typeof torreInteraccionModo !== 'undefined' &&
      torreInteraccionModo === 'asignar' &&
      typeof torreCestasMultiSel !== 'undefined' &&
      torreCestasMultiSel.has(multiKey);
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
      HC_ILLO.pot +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2.4"/>';
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
    if (isSelected) {
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
    if (pct > 0 && pct < 100 && dat.variedad) {
      var r2 = Math.max(rx, ry) + 5;
      var ang2 = (pct / 100) * 2 * Math.PI - Math.PI / 2;
      var x1e = cx + r2 * Math.cos(-Math.PI / 2);
      var y1e = cy + r2 * Math.sin(-Math.PI / 2);
      var x2e = cx + r2 * Math.cos(ang2);
      var y2e = cy + r2 * Math.sin(ang2);
      out +=
        '<path d="M' +
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
        stroke +
        '" stroke-width="2" stroke-linecap="round" opacity="0.55"/>';
    }
    if (cultEmoji) {
      var emFs = Math.min(16, Math.max(10, rx * 0.95));
      out +=
        '<text x="' +
        f1(cx) +
        '" y="' +
        f1(cy + (topView ? 1 : -2)) +
        '" text-anchor="middle" dominant-baseline="central" font-size="' +
        emFs +
        '" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">' +
        cultEmoji +
        '</text>';
    }
    var subY = cy + ry + (topView ? 11 : 14);
    if (dias > 0 && dat.variedad) {
      out +=
        '<text x="' +
        f1(cx) +
        '" y="' +
        f1(subY) +
        '" font-family="Inconsolata,monospace" font-size="7.5" font-weight="800" fill="' +
        stroke +
        '" text-anchor="middle">' +
        dias +
        'd</text>';
    } else if (!cultEmoji) {
      out +=
        '<text x="' +
        f1(cx) +
        '" y="' +
        f1(cy + 3) +
        '" font-family="Inconsolata,monospace" font-size="8" fill="' +
        HC_ILLO.mesh +
        '" text-anchor="middle">·</text>';
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
      '" rx="5" fill="' +
      HC_ILLO.lidHi +
      '" stroke="' +
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
      '-fclip"><rect x="' +
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
      '-fclip)">' +
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

  window.hcIlloGenerarSVGDwc = function () {
    var cfg = (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    var N = Math.max(1, Math.min(12, cfg.numNiveles || 2));
    var C = Math.max(1, Math.min(12, cfg.numCestas || 3));
    var ta = animOn();
    var volMax = typeof getVolumenDepositoMaxLitros === 'function' ? getVolumenDepositoMaxLitros(cfg) : null;
    var volTrabajo = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : null;
    var volEtiqueta =
      volTrabajo != null && Number.isFinite(volTrabajo) ? Math.round(volTrabajo * 10) / 10 : '—';
    var volPct =
      volMax != null && volTrabajo != null && volMax > 0
        ? Math.min(1, Math.max(0, volTrabajo / volMax))
        : 0.55;
    var tieneDifusor = cfg.equipamiento ? cfg.equipamiento.indexOf('difusor') >= 0 : true;
    var tieneCalentador = cfg.equipamiento ? cfg.equipamiento.indexOf('calentador') >= 0 : true;
    var esMulticubo =
      typeof dwcGetOxigenacionDiseno === 'function' && dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes';
    var S_mc = esMulticubo
      ? typeof dwcGetNumCubosIndependientes === 'function'
        ? Math.max(1, dwcGetNumCubosIndependientes(cfg))
        : N * C
      : 0;
    var mcCols = 1;
    var mcRows = 1;
    if (esMulticubo) {
      var g =
        typeof hcDistribuirFilasColumnas === 'function'
          ? hcDistribuirFilasColumnas(S_mc, 6)
          : { cols: S_mc, rows: 1 };
      mcCols = g.cols;
      mcRows = g.rows;
    }
    var u = uid('dwc');
    var W = esMulticubo ? Math.min(640, 120 + mcCols * 92) : Math.min(560, 100 + C * 38);
    var planW = Math.min(340, 40 + C * 34);
    var planD = Math.min(200, 36 + N * 28);
    var planX = (W - planW) / 2 - planD * 0.2;
    var planY = 56;
    var body = defsBlock(u);
    body += '<rect width="' + W + '" height="900" fill="url(#' + u + '-bg)"/>';
    body +=
      '<text x="' +
      (W / 2) +
      '" y="28" text-anchor="middle" font-family="Syne,sans-serif" font-size="16" font-weight="900" fill="' +
      HC_ILLO.ink +
      '" class="diag-label-strong">DWC · depósito ' +
      (esMulticubo ? 'multiválvula' : N + '×' + C) +
      '</text>';
    body +=
      '<text x="' +
      (W / 2) +
      '" y="44" text-anchor="middle" font-size="10" fill="' +
      HC_ILLO.inkSoft +
      '" class="diag-label-soft">Toca cada maceta para asignar cultivo</text>';

    if (esMulticubo) {
      var gap = 18;
      var bw = Math.min(80, (W - 48 - (mcCols - 1) * gap) / mcCols);
      var bh = 88;
      var gridW = mcCols * bw + (mcCols - 1) * gap;
      var x0 = (W - gridW) / 2;
      var y0 = 68;
      body += airPump(W - 76, y0, 48, 32, u);
      body +=
        '<line x1="' +
        f1(W - 52) +
        '" y1="' +
        f1(y0 + 18) +
        '" x2="' +
        f1(W - gridW / 2 - 20) +
        '" y2="' +
        f1(y0 + 18) +
        '" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>';
      for (var idx = 0; idx < S_mc; idx++) {
        var fr = Math.floor(idx / mcCols);
        var fc = idx % mcCols;
        var bx = x0 + fc * (bw + gap) + bw / 2;
        var by = y0 + fr * (bh + gap) + bh / 2;
        body += bucket3d(bx, by, bw, bh, 0, idx, u, cfg, 'Cubo ' + (idx + 1));
      }
      var footY = y0 + mcRows * (bh + gap) + 20;
      body +=
        '<text x="' +
        (W / 2) +
        '" y="' +
        footY +
        '" text-anchor="middle" font-family="Syne,sans-serif" font-size="18" font-weight="900" fill="' +
        HC_ILLO.water1 +
        '">' +
        volEtiqueta +
        ' L</text>';
      return svgWrap('dwc-svg-diagram dwc-svg-diagram--multicubo hc-illo-dwc', W, footY + 24, u + '-title', 'DWC multiválvula', body);
    }

    var iso = tankIsoPlan(planX, planY, planW, planD, u);
    body += iso.svg;
    body += lidOnIso(iso.lidPoly, 14, u);
    var cellW = (planW - 28) / C;
    var cellD = (planD - 20) / N;
    for (var rn = 0; rn < N; rn++) {
      for (var cc = 0; cc < C; cc++) {
        var pcx = planX + 14 + (cc + 0.5) * cellW + cellD * 0.15;
        var pcy = planY + 10 + (rn + 0.5) * cellD - rn * 2;
        body += maceta({
          n: rn,
          c: cc,
          cx: pcx,
          cy: pcy,
          rx: Math.min(15, cellW * 0.32),
          ry: Math.min(11, cellD * 0.28),
          uid: u,
          cfg: cfg,
          extraClass: 'dwc-maceta',
        });
      }
    }
    if (tieneDifusor) {
      body += airPump(planX + planW + planD * 0.35 + 12, planY + 8, 50, 34, u);
      body +=
        '<path d="M ' +
        f1(planX + planW + 8) +
        ' ' +
        f1(planY + 22) +
        ' Q ' +
        f1(planX + planW + 28) +
        ' ' +
        f1(planY + 8) +
        ' ' +
        f1(planX + planW + 8) +
        ' ' +
        f1(planY + planD * 0.5) +
        '" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="4 3"/>';
    }
    var sepY = planY + planD + 52;
    body +=
      '<text x="' +
      (W / 2) +
      '" y="' +
      (sepY - 10) +
      '" text-anchor="middle" font-family="Syne,sans-serif" font-size="9" font-weight="800" fill="' +
      HC_ILLO.inkSoft +
      '" letter-spacing="0.12em">PROYECCIÓN FRONTAL · DEPÓSITO</text>';
    var fY = sepY + 6;
    var fH = 100;
    var fX = (W - planW) / 2;
    body += tankFront(fX, fY, planW, fH, volPct, u, ta, tieneDifusor, tieneCalentador);
    var volY = fY + fH + 28;
    body +=
      '<text x="' +
      (W / 2) +
      '" y="' +
      volY +
      '" text-anchor="middle" font-family="Syne,sans-serif" font-size="20" font-weight="900" fill="' +
      HC_ILLO.water1 +
      '">' +
      volEtiqueta +
      ' L</text>';
    return svgWrap('dwc-svg-diagram hc-illo-dwc', W, volY + 16, u + '-title', 'DWC ' + N + ' por ' + C, body);
  };

  window.hcIlloGenerarSVGSrf = function () {
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
    if (tieneDifusor) body += airPump(planX + planW + 8, planTop, 48, 32, u);
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
    body += airPump(tankX + tankW + 12, tankY + 8, 44, 30, u);
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

  window.hcIlloGenerarSVGTorre = function () {
    var cfg = (typeof state !== 'undefined' ? state.configTorre : {}) || {};
    var numNiveles = cfg.numNiveles || 5;
    var numCestas = cfg.numCestas || 5;
    var u = uid('torre');
    var W = 380;
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
    body += '<rect width="' + W + '" height="' + H + '" fill="url(#' + u + '-bg)"/>';
    body +=
      '<text x="' +
      CX +
      '" y="26" text-anchor="middle" font-family="Syne,sans-serif" font-size="16" font-weight="900" fill="' +
      HC_ILLO.ink +
      '">Torre vertical</text>';
    body +=
      '<rect x="' +
      f1(CX - 6) +
      '" y="' +
      MARG_T +
      '" width="12" height="' +
      torH +
      '" rx="6" fill="' +
      HC_ILLO.flow +
      '" stroke="' +
      HC_ILLO.ink +
      '" stroke-width="2"/>';
    var RX = 78;
    for (var n = 0; n < numNiveles; n++) {
      var cy = MARG_T + n * (NIVEL_H + GAP) + NIVEL_H / 2;
      body +=
        '<ellipse cx="' +
        CX +
        '" cy="' +
        cy +
        '" rx="' +
        RX +
        '" ry="14" fill="none" stroke="' +
        HC_ILLO.lidHi +
        '" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5"/>';
      for (var c = 0; c < numCestas; c++) {
        var ang = (c / numCestas) * Math.PI * 2 - Math.PI / 2;
        var px = CX + Math.cos(ang) * RX;
        var py = cy + Math.sin(ang) * 14;
        body += maceta({
          n: n,
          c: c,
          cx: px,
          cy: py,
          rx: 13,
          ry: 9,
          uid: u,
          cfg: cfg,
          extraClass: 'torre-maceta',
        });
      }
    }
    var depY = MARG_T + torH + 24;
    body += tankFront(CX - 90, depY, 180, DEP_H, volPct, u, ta, true, true);
    body +=
      '<text x="' +
      CX +
      '" y="' +
      (depY + DEP_H + 26) +
      '" text-anchor="middle" font-family="Syne,sans-serif" font-size="17" font-weight="900" fill="' +
      HC_ILLO.water1 +
      '">' +
      (volMez != null ? Math.round(volMez * 10) / 10 + ' L' : '—') +
      '</text>';
    return svgWrap('torre-svg-diagram hc-illo-torre', W, depY + DEP_H + 40, u + '-title', 'Torre ' + numNiveles + ' niveles', body);
  };

  /** Hueco NFT interactivo (sustituye círculo plano en serpentín/mesa/escalera). */
  window.hcIlloNftHuecoLayer = function (gx, gy, hr, i, j, dat, cult, interactive, P, opts) {
    opts = opts || {};
    var u = opts.uid || uid('nft');
    var compact = !!opts.compact;
    var numShow = opts.numShow != null ? opts.numShow : j + 1;
    if (!interactive) {
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
