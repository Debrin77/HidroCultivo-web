/**
 * Fase 2–3 DWC SCADA: zoom/pan (ratón + móvil: arrastre, pellizco, botones).
 */
(function (global) {
  'use strict';

  function parseViewBox(svg) {
    const raw = svg.getAttribute('viewBox');
    if (!raw) return null;
    const p = raw.trim().split(/[\s,]+/).map(Number);
    if (p.length < 4 || p.some((n) => !Number.isFinite(n))) return null;
    return { x: p[0], y: p[1], w: p[2], h: p[3] };
  }

  function setViewBox(svg, v) {
    svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
  }

  function cloneViewBox(v) {
    return { x: v.x, y: v.y, w: v.w, h: v.h };
  }

  function isMobileUi() {
    try {
      return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    } catch (_) {
      return (window.innerWidth || 999) < 768;
    }
  }

  function pointerDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pointerMid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function disposeDwcScadaViewport(wrap) {
    if (!wrap || !wrap._dwcScadaVp) return;
    const st = wrap._dwcScadaVp;
    if (st.wheelHandler) wrap.removeEventListener('wheel', st.wheelHandler);
    if (st.pointerDown) wrap.removeEventListener('pointerdown', st.pointerDown);
    if (st.pointerMove) wrap.removeEventListener('pointermove', st.pointerMove);
    if (st.pointerUp) wrap.removeEventListener('pointerup', st.pointerUp);
    if (st.pointerCancel) wrap.removeEventListener('pointercancel', st.pointerCancel);
    if (st.toolbar && st.toolbar.parentNode) st.toolbar.parentNode.removeChild(st.toolbar);
    if (st.hint && st.hint.parentNode) st.hint.parentNode.removeChild(st.hint);
    wrap.classList.remove(
      'torre-svg-canvas--dwc-scada-vp',
      'torre-svg-canvas--dwc-scada-panning',
      'torre-svg-canvas--dwc-scada-pinching',
      'torre-svg-canvas--dwc-scada-coarse'
    );
    delete wrap._dwcScadaVp;
  }

  function buildCestaTipHtml(n, c) {
    const dat = (typeof state !== 'undefined' && state.torre && state.torre[n] && state.torre[n][c]) || {};
    const _ti =
      typeof tipoInstalacionNormalizado === 'function'
        ? tipoInstalacionNormalizado(state.configTorre)
        : 'dwc';
    const vacioLbl =
      _ti === 'nft'
        ? 'Hueco vacío'
        : _ti === 'dwc'
          ? 'Maceta vacía'
          : _ti === 'rdwc'
            ? 'Módulo vacío'
            : _ti === 'srf'
              ? 'Hueco vacío'
              : 'Cesta vacía';
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
      .join(' · ');
    const cultTip = dat.variedad && typeof getCultivoDB === 'function' ? getCultivoDB(dat.variedad) : null;
    const iconTip =
      dat.variedad && typeof cultivoEmojiHtml === 'function'
        ? '<span class="torre-tip-icon" aria-hidden="true">' + cultivoEmojiHtml(cultTip, 1.5) + '</span>'
        : '';
    const nomTip =
      typeof cultivoNombreLista === 'function' ? cultivoNombreLista(cultTip, dat.variedad) : variedad;
    const esc = typeof escHtmlUi === 'function' ? escHtmlUi : (t) => String(t || '');
    const foot = isMobileUi()
      ? 'Toca para ficha · mantén pulsado vista rápida'
      : 'Clic para ficha · arrastra fondo para mover';
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
    if (isMobileUi()) return;
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

  function bindDiagramScadaViewport(wrap, opts) {
    opts = opts || {};
    const svgSel = opts.svgSelector || 'svg.dwc-svg-diagram--scada';
    const hintCopy =
      opts.hintText ||
      'Desliza · pellizca zoom · doble toque restablece · toca un módulo para la ficha';
    if (!wrap) return;
    disposeDwcScadaViewport(wrap);
    const svg = wrap.querySelector(svgSel);
    if (!svg) return;

    let initial = parseViewBox(svg);
    if (!initial) return;

    const mobile = isMobileUi();
    if (mobile) {
      const pad = 0.05;
      const fitted = {
        x: initial.x - initial.w * pad,
        y: initial.y - initial.h * pad,
        w: initial.w * (1 + pad * 2),
        h: initial.h * (1 + pad * 2),
      };
      setViewBox(svg, fitted);
      initial = cloneViewBox(fitted);
    }

    const minScale = 0.5;
    const maxScale = 3.2;
    const pointers = new Map();
    let panning = false;
    let panPid = null;
    let lastX = 0;
    let lastY = 0;
    let pinchDist0 = 0;
    let pinchVb0 = null;
    let lastTapAt = 0;
    let tapStart = null;

    function clampZoom(nw, nh) {
      let w = nw;
      let h = nh;
      const sc = initial.w / w;
      if (sc < minScale) {
        w = initial.w / minScale;
        h = initial.h / minScale;
      } else if (sc > maxScale) {
        w = initial.w / maxScale;
        h = initial.h / maxScale;
      }
      return { w, h };
    }

    function applyZoomAt(factor, clientX, clientY, baseV) {
      const v = baseV || parseViewBox(svg);
      const rect = svg.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const sx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const sy = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const fx = v.x + v.w * sx;
      const fy = v.y + v.h * sy;
      let nw = v.w / factor;
      let nh = v.h / factor;
      const cl = clampZoom(nw, nh);
      nw = cl.w;
      nh = cl.h;
      setViewBox(svg, { x: fx - nw * sx, y: fy - nh * sy, w: nw, h: nh });
    }

    function resetView() {
      setViewBox(svg, cloneViewBox(initial));
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'dwc-scada-vp-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Zoom del esquema');
    toolbar.innerHTML =
      '<button type="button" class="dwc-scada-vp-btn" data-act="out" aria-label="Alejar">−</button>' +
      '<button type="button" class="dwc-scada-vp-btn" data-act="in" aria-label="Acercar">+</button>' +
      '<button type="button" class="dwc-scada-vp-btn dwc-scada-vp-btn--reset" data-act="reset" aria-label="Restablecer vista">⌂</button>';
    wrap.appendChild(toolbar);

    let hint = null;
    if (mobile) {
      hint = document.createElement('div');
      hint.className = 'dwc-scada-vp-hint';
      hint.setAttribute('role', 'status');
      hint.innerHTML =
        '<span>' +
        hintCopy +
        '</span>' +
        '<button type="button" class="dwc-scada-vp-hint-close" aria-label="Ocultar ayuda">×</button>';
      wrap.appendChild(hint);
      hint.querySelector('.dwc-scada-vp-hint-close').addEventListener('click', () => {
        hint.classList.add('dwc-scada-vp-hint--hidden');
      });
    }

    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const act = btn.getAttribute('data-act');
      if (act === 'in') applyZoomAt(1.2, cx, cy);
      else if (act === 'out') applyZoomAt(1 / 1.2, cx, cy);
      else if (act === 'reset') resetView();
    });

    const wheelHandler = (e) => {
      if (!wrap.contains(svg) || mobile) return;
      e.preventDefault();
      applyZoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
    };
    if (!mobile) {
      wrap.addEventListener('wheel', wheelHandler, { passive: false });
    }

    function canPanTarget(t) {
      if (!t || !t.closest) return false;
      if (t.closest('.hc-cesta')) return false;
      if (t.closest('.hc-torre-rot-flecha')) return false;
      if (t.closest('.dwc-scada-vp-toolbar')) return false;
      if (t.closest('.dwc-scada-vp-hint')) return false;
      return !!(
        t.closest('svg.dwc-svg-diagram--scada') ||
        t.closest('svg.rdwc-svg-diagram--scada') ||
        t.closest('svg.nft-svg-diagram--scada') ||
        t.closest('svg.srf-svg-diagram--scada') ||
        t.closest('svg.torre-svg-diagram--scada') ||
        t === wrap
      );
    }

    function syncPinchStart() {
      if (pointers.size !== 2) {
        pinchDist0 = 0;
        pinchVb0 = null;
        return;
      }
      const pts = [...pointers.values()];
      pinchDist0 = pointerDist(pts[0], pts[1]);
      pinchVb0 = parseViewBox(svg);
      if (pinchDist0 < 8) pinchDist0 = 8;
    }

    const pointerDown = (e) => {
      if (!canPanTarget(e.target) && !e.target.closest(svgSel)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        panning = false;
        panPid = null;
        syncPinchStart();
        wrap.classList.add('torre-svg-canvas--dwc-scada-pinching');
        wrap.classList.remove('torre-svg-canvas--dwc-scada-panning');
        try {
          wrap.setPointerCapture(e.pointerId);
        } catch (_) {}
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (!canPanTarget(e.target)) return;
      tapStart = { x: e.clientX, y: e.clientY, t: Date.now() };
      panning = true;
      panPid = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      wrap.classList.add('torre-svg-canvas--dwc-scada-panning');
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const pointerMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2 && pinchVb0 && pinchDist0 > 0) {
        const pts = [...pointers.values()].slice(0, 2);
        const dist = pointerDist(pts[0], pts[1]);
        const mid = pointerMid(pts[0], pts[1]);
        const scale = dist / pinchDist0;
        applyZoomAt(scale, mid.x, mid.y, pinchVb0);
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (!panning || e.pointerId !== panPid) return;
      const v = parseViewBox(svg);
      const rect = svg.getBoundingClientRect();
      if (rect.width < 1) return;
      const dx = ((e.clientX - lastX) / rect.width) * v.w;
      const dy = ((e.clientY - lastY) / rect.height) * v.h;
      lastX = e.clientX;
      lastY = e.clientY;
      setViewBox(svg, { x: v.x - dx, y: v.y - dy, w: v.w, h: v.h });
      if (e.cancelable) e.preventDefault();
    };

    const pointerUp = (e) => {
      const wasPan = panning && e.pointerId === panPid;
      const hadPinch = pointers.size >= 2;

      if (pointers.has(e.pointerId)) {
        pointers.delete(e.pointerId);
      }

      if (pointers.size < 2) {
        wrap.classList.remove('torre-svg-canvas--dwc-scada-pinching');
        pinchDist0 = 0;
        pinchVb0 = null;
      }
      if (pointers.size === 2) {
        syncPinchStart();
      }

      if (e.pointerId === panPid) {
        panning = false;
        panPid = null;
        wrap.classList.remove('torre-svg-canvas--dwc-scada-panning');
      }

      try {
        wrap.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (!hadPinch && pointers.size === 0 && tapStart && canPanTarget(e.target)) {
        const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
        const dur = Date.now() - tapStart.t;
        if (moved < 16 && dur < 320) {
          const now = Date.now();
          if (now - lastTapAt < 400) {
            resetView();
            lastTapAt = 0;
          } else {
            lastTapAt = now;
          }
        }
        tapStart = null;
      }
    };

    wrap.addEventListener('pointerdown', pointerDown, { passive: false });
    wrap.addEventListener('pointermove', pointerMove, { passive: false });
    wrap.addEventListener('pointerup', pointerUp);
    wrap.addEventListener('pointercancel', pointerUp);

    wrap.classList.add('torre-svg-canvas--dwc-scada-vp');
    if (mobile) wrap.classList.add('torre-svg-canvas--dwc-scada-coarse');

    wrap._dwcScadaVp = {
      wheelHandler: wheelHandler,
      pointerDown: pointerDown,
      pointerMove: pointerMove,
      pointerUp: pointerUp,
      pointerCancel: pointerUp,
      toolbar: toolbar,
      hint: hint,
      initial: initial,
    };

    bindDwcScadaCestaHover(wrap);
  }

  function bindDwcScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap, {
      svgSelector: 'svg.dwc-svg-diagram--scada',
      hintText: 'Desliza · pellizca zoom · toca maceta',
    });
  }

  function bindRdwcScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap, { svgSelector: 'svg.rdwc-svg-diagram--scada' });
  }

  function bindNftScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap, {
      svgSelector: 'svg.nft-svg-diagram--scada',
      hintText:
        'Arrastra para mover · Pellizco para zoom · Doble toque restablece · Toca un hueco NFT para la ficha',
    });
  }

  function bindSrfScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap, { svgSelector: 'svg.srf-svg-diagram--scada' });
  }

  function bindTorreScadaViewport(wrap) {
    bindDiagramScadaViewport(wrap, {
      svgSelector: 'svg.torre-svg-diagram--scada',
      hintText:
        'Arrastra para mover · Pellizco para zoom · Flechas laterales giran la torre · Toca una cesta',
    });
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
