/**
 * Etiquetas mínimas en diagramas de sistema: volumen (L) y tipo de vista.
 */
(function (global) {
  'use strict';

  function escText(t) {
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatVolL(volL, opts) {
    opts = opts || {};
    if (volL != null && typeof volL === 'string') {
      const t = String(volL).trim();
      if (/L\s*$/i.test(t)) return t;
    }
    const v = Number(volL);
    if (!Number.isFinite(v) || v < 0) return opts.dash != null ? opts.dash : '—';
    if (v === 0 && opts.allowZero !== true) return opts.dash != null ? opts.dash : '—';
    const r = Math.round(v * 10) / 10;
    const n = r % 1 === 0 ? String(Math.round(r)) : String(r);
    return n + ' L';
  }

  function viewLabelText(view) {
    if (view === 'frontal' || view === 'front' || view === 'frente') return 'Vista frontal';
    if (view === 'cenital' || view === 'top' || view === 'superior' || view === 'plan') return 'Vista cenital';
    return '';
  }

  function viewLabelSvg(x, y, view, opts) {
    opts = opts || {};
    const text = viewLabelText(view);
    if (!text) return '';
    const anchor = opts.anchor || 'middle';
    const fs = opts.fontSize != null ? opts.fontSize : 9;
    const fill = opts.fill || '#64748b';
    const fw = opts.fontWeight || '800';
    const family = opts.fontFamily || 'Syne,sans-serif';
    const pe = opts.pointerEvents === false ? ' pointer-events="none"' : '';
    const cls = opts.className ? ' class="' + opts.className + '"' : ' class="hc-diagram-view-label"';
    return (
      '<text x="' +
      Number(x).toFixed(1) +
      '" y="' +
      Number(y).toFixed(1) +
      '" text-anchor="' +
      anchor +
      '" font-family="' +
      family +
      '" font-size="' +
      fs +
      '" font-weight="' +
      fw +
      '" fill="' +
      fill +
      '"' +
      cls +
      pe +
      '>' +
      escText(text) +
      '</text>'
    );
  }

  function volLabelSvg(x, y, volL, opts) {
    opts = opts || {};
    const text = formatVolL(volL, opts);
    const anchor = opts.anchor || 'middle';
    const fs = opts.fontSize != null ? opts.fontSize : 12;
    const fill = opts.fill || '#0369a1';
    const fw = opts.fontWeight || '900';
    const family = opts.fontFamily || 'Syne,sans-serif';
    const pe = opts.pointerEvents === false ? ' pointer-events="none"' : '';
    const cls = opts.className ? ' class="' + opts.className + '"' : ' class="hc-diagram-vol-label"';
    return (
      '<text x="' +
      Number(x).toFixed(1) +
      '" y="' +
      Number(y).toFixed(1) +
      '" text-anchor="' +
      anchor +
      '" font-family="' +
      family +
      '" font-size="' +
      fs +
      '" font-weight="' +
      fw +
      '" fill="' +
      fill +
      '"' +
      cls +
      pe +
      '>' +
      escText(text) +
      '</text>'
    );
  }

  global.hcDiagramFormatVolL = formatVolL;
  global.hcDiagramViewLabelText = viewLabelText;
  global.hcDiagramViewLabelSvg = viewLabelSvg;
  global.hcDiagramVolLabelSvg = volLabelSvg;
})(typeof window !== 'undefined' ? window : globalThis);
