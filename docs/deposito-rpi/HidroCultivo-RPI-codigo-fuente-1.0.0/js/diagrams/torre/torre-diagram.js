/**
 * Diagrama de torre: diseño hc-illo (maqueta 3D) con fallback legacy.
 */
(function (global) {
  'use strict';

  /** Quita etiquetas de vista (p. ej. «Vista frontal») que tapaban la torre en Cultivo e instalación. */
  function stripTorreDiagramViewLabels(svg) {
    if (!svg || typeof svg !== 'string') return svg;
    return svg
      .replace(/<text\b[^>]*\bclass="[^"]*hc-diagram-view-label[^"]*"[^>]*>[\s\S]*?<\/text>/gi, '')
      .replace(
        /<text\b[^>]*>[\s]*Vista\s+frontal[\s]*<\/text>/gi,
        ''
      );
  }

  function tagTorreScada(svg) {
    if (!svg || typeof svg !== 'string' || svg.indexOf('<svg') < 0) return svg;
    if (svg.indexOf('hc-illo-torre') >= 0) {
      return stripTorreDiagramViewLabels(svg);
    }
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
            '" fill="url(#torreScadaBg)" pointer-events="none"/>'
        );
      }
    }
    return stripTorreDiagramViewLabels(s);
  }

  function torreDiagramSvgLooksValid(svg) {
    return (
      svg &&
      typeof svg === 'string' &&
      svg.indexOf('<svg') >= 0 &&
      svg.indexOf('hc-baskets-n-0') >= 0
    );
  }

  /** Diseño acordado (hc-illo); legacy solo si falla. */
  function hcRenderTorreDiagramHtml() {
    if (typeof hcIlloGenerarSVGTorre === 'function') {
      try {
        const illo = hcIlloGenerarSVGTorre();
        if (torreDiagramSvgLooksValid(illo) && illo.indexOf('hc-illo-torre') >= 0) {
          return stripTorreDiagramViewLabels(illo);
        }
      } catch (e) {
        try {
          console.error('hcIlloGenerarSVGTorre', e);
        } catch (_) {}
      }
    }
    if (typeof _buildTorreSvgLegacy === 'function') {
      try {
        const leg = _buildTorreSvgLegacy();
        if (torreDiagramSvgLooksValid(leg)) {
          return tagTorreScada(leg);
        }
      } catch (e2) {
        try {
          console.error('_buildTorreSvgLegacy', e2);
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
