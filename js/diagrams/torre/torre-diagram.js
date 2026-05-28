/**
 * Envoltorio SCADA para diagrama de torre (usa _buildTorreSvgLegacy en torre-render-build.js).
 */
(function (global) {
  'use strict';

  function tagTorreScada(svg) {
    if (!svg || typeof svg !== 'string' || svg.indexOf('<svg') < 0) return svg;
    let s = svg;
    if (s.indexOf('torre-svg-diagram--scada') < 0) {
      s = s.replace(/class="([^"]*)"/, 'class="torre-svg-diagram--scada $1"');
    }
    if (s.indexOf('torreScadaBg') < 0) {
      const vbM = s.match(/viewBox=["']([^"']+)["']/i);
      let vx = 0;
      let vy = 0;
      let vw = 360;
      let vh = 400;
      if (vbM) {
        const p = vbM[1].trim().split(/[\s,]+/).map(Number);
        if (p.length >= 4) {
          vx = p[0] || 0;
          vy = p[1] || 0;
          vw = p[2];
          vh = p[3];
        }
      }
      const grad =
        '<linearGradient id="torreScadaBg" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#f5f6f8"/><stop offset="100%" stop-color="#e4e7eb"/></linearGradient>';
      if (/<defs[\s>]/i.test(s)) {
        s = s.replace(/<defs([^>]*)>/i, '<defs$1>' + grad);
        s = s.replace(
          /<\/defs>/i,
          '</defs><rect class="torre-scada-bg" x="' +
            vx +
            '" y="' +
            vy +
            '" width="' +
            vw +
            '" height="' +
            vh +
            '" fill="url(#torreScadaBg)" pointer-events="none"/>' +
            (s.indexOf('hc-illo-torre') < 0 && typeof hcDiagramViewLabelSvg === 'function'
              ? hcDiagramViewLabelSvg(vx + vw / 2, vy + 14, 'frontal', { pointerEvents: false })
              : s.indexOf('hc-illo-torre') < 0
                ? '<text x="' +
                  (vx + vw / 2) +
                  '" y="' +
                  (vy + 14) +
                  '" text-anchor="middle" font-family="Syne,sans-serif" font-size="9" font-weight="800" fill="#475569" pointer-events="none">Vista frontal</text>'
                : '')
        );
      }
    }
    return s;
  }

  /** HTML del diagrama de torre para #torreSVGWrap (legacy estable primero). */
  function hcRenderTorreDiagramHtml() {
    if (typeof _buildTorreSvgLegacy === 'function') {
      try {
        const leg = _buildTorreSvgLegacy();
        if (leg && leg.indexOf('<svg') >= 0) {
          try {
            return tagTorreScada(leg);
          } catch (tagErr) {
            try {
              console.error('tagTorreScada', tagErr);
            } catch (_) {}
            return leg;
          }
        }
      } catch (e2) {
        try {
          console.error('_buildTorreSvgLegacy', e2);
        } catch (_) {}
      }
    }
    if (typeof hcIlloGenerarSVGTorre === 'function') {
      try {
        const illo = hcIlloGenerarSVGTorre();
        if (illo && illo.indexOf('<svg') >= 0) {
          try {
            return tagTorreScada(illo);
          } catch (tagErr2) {
            return illo;
          }
        }
      } catch (e) {
        try {
          console.error('hcIlloGenerarSVGTorre', e);
        } catch (_) {}
      }
    }
    return '<p class="torre-svg-fallback" role="status">No se pudo cargar el esquema de torre. Recarga la página (Ctrl+F5).</p>';
  }

  function buildTorreDiagramSvg() {
    return hcRenderTorreDiagramHtml();
  }

  function generarSVGTorre() {
    return hcRenderTorreDiagramHtml();
  }

  global.tagTorreScada = tagTorreScada;
  global.hcRenderTorreDiagramHtml = hcRenderTorreDiagramHtml;
  global.buildTorreDiagramSvg = buildTorreDiagramSvg;
  global.generarSVGTorre = generarSVGTorre;
})(typeof window !== 'undefined' ? window : globalThis);
