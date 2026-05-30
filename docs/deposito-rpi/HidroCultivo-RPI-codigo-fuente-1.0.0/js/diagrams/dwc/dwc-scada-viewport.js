/**
 * Tooltips de escritorio en cestas/huecos SCADA (sin zoom/pan).
 */
(function (global) {
  'use strict';

  function isMobileUi() {
    try {
      return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    } catch (_) {
      return (window.innerWidth || 999) < 768;
    }
  }

  function disposeDwcScadaViewport(wrap) {
    if (!wrap) return;
    wrap.querySelectorAll('.dwc-scada-vp-toolbar, .dwc-scada-vp-hint').forEach((el) => el.remove());
    wrap.classList.remove(
      'torre-svg-canvas--dwc-scada-vp',
      'torre-svg-canvas--dwc-scada-panning',
      'torre-svg-canvas--dwc-scada-pinching',
      'torre-svg-canvas--dwc-scada-coarse'
    );
    if (wrap._dwcScadaVp) delete wrap._dwcScadaVp;
  }

  function buildCestaTipHtml(n, c) {
    const dat = (typeof state !== 'undefined' && state.torre && state.torre[n] && state.torre[n][c]) || {};
    const _ti =
      typeof tipoInstalacionNormalizado === 'function'
        ? tipoInstalacionNormalizado(state.configTorre)
        : 'dwc';
    const vacioLbl =
      _ti === 'nft'
        ? 'Hueco vacÃ­o'
        : _ti === 'dwc'
          ? 'Maceta vacÃ­a'
          : _ti === 'rdwc'
            ? 'MÃ³dulo vacÃ­o'
            : _ti === 'srf'
              ? 'Hueco vacÃ­o'
              : 'Cesta vacÃ­a';
    const variedad = dat.variedad || vacioLbl;
    const dias = dat.fecha ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000)) : null;
    const fotos = (dat.fotos || []).length;
    const notas = (dat.notas || '').trim();
    const meta = [
      dias !== null ? dias + ' d' : '',
      fotos ? fotos + ' foto' + (fotos === 1 ? '' : 's') : '',
      notas ? 'Notas' : '',
    ]
      .filter(Boolean)
      .join(' Â· ');
    const cultTip = dat.variedad && typeof getCultivoDB === 'function' ? getCultivoDB(dat.variedad) : null;
    const iconTip =
      dat.variedad && typeof cultivoEmojiHtml === 'function'
        ? '<span class="torre-tip-icon" aria-hidden="true">' + cultivoEmojiHtml(cultTip, 1.5) + '</span>'
        : '';
    const nomTip =
      typeof cultivoNombreLista === 'function' ? cultivoNombreLista(cultTip, dat.variedad) : variedad;
    const esc = typeof escHtmlUi === 'function' ? escHtmlUi : (t) => String(t || '');
    const foot = isMobileUi() ? 'Toca para abrir la ficha' : 'Clic para abrir la ficha';
    return (
      '<div class="torre-tip-head">' +
      iconTip +
      '<div class="torre-tip-title">' +
      esc(nomTip) +
      '</div></div>' +
      (meta ? '<div class="torre-tip-meta">' + meta + '</div>' : '<div class="torre-tip-meta">' + foot + '</div>')
    );
  }

  function bindDwcScadaCestaHover(wrap) {
    if (!wrap || isMobileUi()) return;
    const tipEl = document.getElementById('torreQuickTip');
    if (!tipEl) return;
    const hideTip = () => tipEl.classList.add('setup-hidden');
    const showTip = (html, x, y) => {
      tipEl.innerHTML = html;
      tipEl.classList.remove('setup-hidden');
      const pad = 10;
      const ww = window.innerWidth || 390;
      const wh = window.innerHeight || 800;
      const w = 280;
      let left = x + 14;
      let top = y + 12;
      if (left + w + pad > ww) left = Math.max(pad, x - w - 14);
      if (top + 130 + pad > wh) top = Math.max(pad, y - 130);
      tipEl.style.left = left + 'px';
      tipEl.style.top = top + 'px';
    };

    wrap.querySelectorAll('.hc-cesta.hc-cesta--interactive').forEach((el) => {
      if (el._dwcScadaHoverBound) return;
      el._dwcScadaHoverBound = true;
      const n = parseInt(el.getAttribute('data-n'), 10);
      const c = parseInt(el.getAttribute('data-c'), 10);
      el.addEventListener('mouseenter', (ev) => {
        if (ev.pointerType === 'touch') return;
        showTip(buildCestaTipHtml(n, c), ev.clientX, ev.clientY);
      });
      el.addEventListener('mousemove', (ev) => {
        if (ev.pointerType === 'touch') return;
        if (!tipEl.classList.contains('setup-hidden')) {
          showTip(buildCestaTipHtml(n, c), ev.clientX, ev.clientY);
        }
      });
      el.addEventListener('mouseleave', hideTip);
    });
  }

  function bindDiagramScadaViewport(wrap) {
    if (!wrap) return;
    disposeDwcScadaViewport(wrap);
    bindDwcScadaCestaHover(wrap);
  }

  function bindDwcScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap);
  }

  function bindRdwcScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap);
  }

  function bindNftScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap);
  }

  function bindSrfScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap);
  }

  function bindTorreScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap);
  }

  global.disposeDwcScadaViewport = disposeDwcScadaViewport;
  global.bindDiagramScadaViewport = bindDiagramScadaViewport;
  global.bindDwcScadaViewport = bindDwcScadaViewport;
  global.bindRdwcScadaViewport = bindRdwcScadaViewport;
  global.bindNftScadaViewport = bindNftScadaViewport;
  global.bindSrfScadaViewport = bindSrfScadaViewport;
  global.bindTorreScadaViewport = bindTorreScadaViewport;
  global.bindDwcScadaCestaHover = bindDwcScadaCestaHover;
})(typeof window !== 'undefined' ? window : globalThis);

