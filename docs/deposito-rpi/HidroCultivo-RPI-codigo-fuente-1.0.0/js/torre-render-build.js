/**
 * Torre: SVG (torre/NFT/DWC), lista, tabla variedades, tutoriales, compatibilidad UI base.
 * Tras nutrientes y módulos setup. Siguiente: torre-render-main.js (renderTorre, gestos, stats).
 */

/** Reparte N ítems en filas/columnas para que quepan en UI/SVG (máx. columnas por fila). */
function hcDistribuirFilasColumnas(total, maxCols) {
  const n = Math.max(1, parseInt(String(total != null ? total : 1), 10) || 1);
  const maxC = Math.max(1, parseInt(String(maxCols != null ? maxCols : 6), 10) || 6);
  const cols = Math.min(maxC, n);
  const rows = Math.ceil(n / cols);
  return { rows, cols };
}

/** Filas RDWC inferidas para DWC multiválvula (misma lógica visual que vista cenital RDWC). */
function hcInferMcRowsRdwcStyle(total) {
  const n = Math.max(1, parseInt(String(total != null ? total : 1), 10) || 1);
  if (n <= 3) return 1;
  if (n === 4) return 2;
  if (n <= 5) return 1;
  if (n <= 12) return 2;
  if (n <= 18) return 3;
  return Math.min(4, Math.ceil(n / 6));
}

/**
 * DWC multiválvula: reparto de cubos como RDWC (rdwcPlanDistribuir) — filas centradas, 4 cubos → 2×2, etc.
 */
function hcDistribuirCubosMultivalvula(total) {
  const n = Math.max(1, parseInt(String(total != null ? total : 1), 10) || 1);
  if (typeof rdwcPlanDistribuir === 'function') {
    const rows = hcInferMcRowsRdwcStyle(n);
    const dist = rdwcPlanDistribuir(n, rows);
    const colsPerRow = [];
    for (let r = 0; r < dist.rows; r++) {
      const cells = dist.grid.filter((g) => g.row === r);
      colsPerRow.push(cells.length ? cells[0].colsInRow : 0);
    }
    return {
      sites: dist.sites,
      rows: dist.rows,
      cols: dist.cols,
      colsPerRow: colsPerRow,
      grid: dist.grid,
    };
  }
  if (n <= 5) {
    return { sites: n, rows: 1, cols: n, colsPerRow: [n], grid: null };
  }
  const top = Math.ceil(n / 2);
  const bot = Math.floor(n / 2);
  return { sites: n, rows: 2, cols: Math.max(top, bot), colsPerRow: [top, bot], grid: null };
}

/** Pasos cenital/alzado multiválvula (proporcional al tamaño del cubo). */
function hcDwcMcColRowSteps(cubeSz, gap) {
  const sz = Math.max(40, cubeSz || 56);
  const g = Math.max(0, gap != null ? gap : 14);
  return {
    colStep: Math.min(110, Math.max(sz + g, 78)),
    rowStep: Math.min(95, Math.max(sz + g * 0.85, 72)),
  };
}

/**
 * Posiciones de cubos (centro cx,cy y esquina bx,by) — misma regla que renderRdwcPlan.
 * @returns {{ positions, colStep, rowStep, cx, gridTop, gridBottom }}
 */
function hcDwcMcComputePositions(layout, W, planTop, cubeSz, gap) {
  const dist = layout || { rows: 1, cols: 1, grid: null, colsPerRow: [1] };
  const sz = Math.max(40, cubeSz || 56);
  const half = sz / 2;
  const steps = hcDwcMcColRowSteps(sz, gap);
  const colStep = steps.colStep;
  const rowStep = steps.rowStep;
  const cx = W / 2;
  const gridTop = planTop + 10;
  const positions = [];

  if (dist.grid && dist.grid.length) {
    for (let gi = 0; gi < dist.grid.length; gi++) {
      const g = dist.grid[gi];
      const rowW = (g.colsInRow - 1) * colStep;
      const rowLeft = cx - rowW / 2;
      const x = rowLeft + g.col * colStep;
      const y = gridTop + g.row * rowStep;
      positions.push({
        idx: g.idx,
        row: g.row,
        col: g.col,
        colsInRow: g.colsInRow,
        cx: x,
        cy: y,
        bx: x - half,
        by: y - half,
      });
    }
  } else {
    const colsPerRow = dist.colsPerRow || [dist.cols || 1];
    let idx = 0;
    for (let row = 0; row < (dist.rows || 1) && idx < (dist.sites || positions.length); row++) {
      const colsInRow = colsPerRow[row] || dist.cols || 1;
      const rowW = (colsInRow - 1) * colStep;
      const rowLeft = cx - rowW / 2;
      for (let col = 0; col < colsInRow && idx < (dist.sites || 999); col++, idx++) {
        const x = rowLeft + col * colStep;
        const y = gridTop + row * rowStep;
        positions.push({
          idx: idx,
          row: row,
          col: col,
          colsInRow: colsInRow,
          cx: x,
          cy: y,
          bx: x - half,
          by: y - half,
        });
      }
    }
  }

  const gridBottom =
    positions.length > 0 ? positions[positions.length - 1].by + sz : gridTop + sz;
  return { positions, colStep, rowStep, cx, gridTop, gridBottom, cubeSz: sz };
}

/** Índice de cubo → fila/columna con reparto multiválvula (filas pueden tener distinto nº de columnas). */
function hcMultivalvulaSlotDesdeIdx(idx, layout) {
  const i = Math.max(0, parseInt(String(idx != null ? idx : 0), 10) || 0);
  if (layout && layout.grid && layout.grid[i]) {
    const g = layout.grid[i];
    return { row: g.row, col: g.col, colsInRow: g.colsInRow };
  }
  if (!layout || !layout.colsPerRow || layout.rows === 1) {
    const c = layout && layout.colsPerRow ? layout.colsPerRow[0] : layout ? layout.cols : 1;
    return { row: 0, col: i, colsInRow: c };
  }
  if (i < layout.colsPerRow[0]) {
    return { row: 0, col: i, colsInRow: layout.colsPerRow[0] };
  }
  let acc = layout.colsPerRow[0];
  for (let r = 1; r < layout.colsPerRow.length; r++) {
    if (i < acc + layout.colsPerRow[r]) {
      return { row: r, col: i - acc, colsInRow: layout.colsPerRow[r] };
    }
    acc += layout.colsPerRow[r];
  }
  return { row: layout.rows - 1, col: 0, colsInRow: layout.colsPerRow[layout.colsPerRow.length - 1] || 1 };
}

/** Centra una fila de cubos dentro del ancho de la fila más ancha. */
function hcMultivalvulaRowInnerX(innerLeft, colsInRow, maxCols, cubeSz, gap) {
  const g = Math.max(0, gap != null ? gap : 0);
  const sz = Math.max(1, cubeSz);
  const rowW = colsInRow * sz + Math.max(0, colsInRow - 1) * g;
  const maxW = maxCols * sz + Math.max(0, maxCols - 1) * g;
  return innerLeft + (maxW - rowW) / 2;
}

// ══════════════════════════════════════════════════
// TORRE — RENDER
// ══════════════════════════════════════════════════
// Niveles contraíbles
const nivelesColapsados = new Set();

function toggleNivel(n) {
  const wrapper = document.getElementById(`nivel-wrapper-${n}`);
  const chevron = document.getElementById(`chevron-${n}`);
  if (!wrapper) return;
  if (nivelesColapsados.has(n)) {
    nivelesColapsados.delete(n);
    wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
    setTimeout(() => wrapper.style.maxHeight = 'none', 300);
    if (chevron) chevron.classList.remove('collapsed');
  } else {
    nivelesColapsados.add(n);
    wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
    requestAnimationFrame(() => wrapper.style.maxHeight = '0px');
    if (chevron) chevron.classList.add('collapsed');
  }
}

function setModo(modo) {
  modoActual = modo;
  state.modo = modo;
  saveState();
  document.querySelectorAll('#modoSelector .modo-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  const active = document.getElementById('modo-' + modo);
  if (active) {
    active.classList.add('active');
    active.setAttribute('aria-pressed', 'true');
  }
  refreshModoInfoText();
  renderTorre();
}

/** Texto bajo el selector de modo (Cultivo e instalación); respeta EC manual del checklist en modo lechuga. */
function refreshModoInfoText() {
  const el = document.getElementById('modoInfoText');
  if (!el) return;
  const m = MODOS_CULTIVO[modoActual];
  if (!m) return;
  const desc = typeof getModoInfoDescEfectivo === 'function' ? getModoInfoDescEfectivo(modoActual) : m.desc;
  el.textContent = desc + ' — Editar ficha o asignar cultivo (barra encima del esquema)';
}

/** Animaciones SMIL del esquema (preferencia + “reducir movimiento” del sistema). */
function torreSvgAnimacionesActivas() {
  if (state.configTorre && state.configTorre.torreAnimSvg === false) return false;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch (_) {}
  return true;
}

function ocultarTorreQuickTip() {
  const tipEl = document.getElementById('torreQuickTip');
  if (tipEl) tipEl.classList.add('setup-hidden');
}

let _torreFocusBarTimer = 0;
function mostrarBarraSeleccionCesta(n, c) {
  const bar = document.getElementById('torreCestaFocusBar');
  if (!bar) return;
  const dat = state.torre?.[n]?.[c];
  const vLista = dat?.variedad ? cultivoNombreLista(getCultivoDB(dat.variedad), dat.variedad) : 'Cesta vacía';
  const vEsc = escHtmlUi(vLista);
  bar.innerHTML = '<span class="torre-focus-title">Nivel ' + (n + 1) + ' · Cesta ' + (c + 1) + '</span>' +
    '<span class="torre-focus-meta"> · ' + vEsc + '</span>';
  bar.style.display = 'block';
  if (_torreFocusBarTimer) clearTimeout(_torreFocusBarTimer);
  _torreFocusBarTimer = setTimeout(() => {
    bar.style.display = 'none';
    _torreFocusBarTimer = 0;
  }, 4200);
}

function setTorreAnimSuaves(on) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.torreAnimSvg = !!on;
  saveState();
  renderTorre();
}

function aplicarVistaTorreUI() {
  const lista = state.configTorre?.torreVistaModo === 'lista';
  const esNftSwipe = state.configTorre?.tipoInstalacion === 'nft';
  const esTorre =
    state.configTorre?.tipoInstalacion !== 'nft' &&
    state.configTorre?.tipoInstalacion !== 'dwc' &&
    state.configTorre?.tipoInstalacion !== 'rdwc' &&
    state.configTorre?.tipoInstalacion !== 'srf';
  const subVista = state.configTorre?.torreDiagramaVista || 'esquema';
  const w = document.getElementById('torreSVGWrap');
  const lv = document.getElementById('torreListaVista');
  const bE = document.getElementById('btnTorreVistaEsquema');
  const bL = document.getElementById('btnTorreVistaLista');
  const bC = document.getElementById('btnTorreDiagCorte');
  const bF = document.getElementById('btnTorreDiagFlujo');
  const toolbar = document.getElementById('torreDiagramToolbar');
  const swipe = document.getElementById('torreSwipeHint');
  const nftHint = document.getElementById('torreNftDiagramHint');
  let swipeHidden = false;
  try {
    swipeHidden = localStorage.getItem(TORRE_SWIPE_HINT_LS) === '1';
  } catch (_) {}
  if (w) w.style.display = lista ? 'none' : '';
  if (lv) lv.style.display = lista ? 'block' : 'none';
  if (swipe) {
    if (lista || esNftSwipe) swipe.style.display = 'none';
    else if (swipeHidden) swipe.style.display = 'none';
    else swipe.style.display = '';
  }
  if (nftHint) {
    nftHint.style.display = lista || !esNftSwipe ? 'none' : '';
  }
  if (toolbar) {
    toolbar.classList.toggle('torre-diagram-toolbar--torre-vertical', esTorre);
  }
  if (esTorre && lista) {
    if (lv) lv.style.display = 'none';
    if (w) w.style.display = '';
  }
  if (bE) {
    bE.style.display = esTorre ? 'none' : '';
    if (!esTorre) {
      bE.classList.toggle('active', !lista);
      bE.setAttribute('aria-pressed', lista ? 'false' : 'true');
    }
  }
  if (bL) {
    bL.style.display = esTorre ? 'none' : '';
    if (!esTorre) {
      bL.classList.toggle('active', lista);
      bL.setAttribute('aria-pressed', lista ? 'true' : 'false');
    }
  }
  if (bC) {
    bC.style.display = 'none';
  }
  if (bF) {
    bF.style.display = 'none';
  }
}

function setTorreVistaModo(modo) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.torreVistaModo = modo === 'lista' ? 'lista' : 'esquema';
  saveState();
  renderTorre();
}

function setTorreDiagramaVista(vista) {
  if (!state.configTorre) state.configTorre = {};
  const v = vista === 'corte' || vista === 'flujo' ? vista : 'esquema';
  state.configTorre.torreDiagramaVista = v;
  state.configTorre.torreVistaModo = 'esquema';
  saveState();
  renderTorre();
}

/** Días de ciclo para color / fase / barra: incluye media vivero si la ficha lo indica (misma base que EC automático). */
function torreDiasCicloVisual(dat) {
  if (!dat || !dat.fecha) return 0;
  if (typeof getDiasEfectivosCicloBiologico === 'function') {
    return getDiasEfectivosCicloBiologico(dat, getCultivoDB(dat.variedad), Date.now());
  }
  return Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000));
}

function torreListaColorCesta(n, c) {
  const dat = (state.torre[n] && state.torre[n][c]) ? state.torre[n][c] : { variedad: '', fecha: '' };
  const dias = dat.fecha ? torreDiasCicloVisual(dat) : 0;
  const est = dat.variedad ? getEstado(dat.variedad, dias) : '';
  if (!dat.variedad) return { border: 'rgba(15,23,42,0.12)', bg: '#f8fafc' };
  if (est === 'plantula') return { border: 'rgba(37,99,235,0.45)', bg: '#eff6ff' };
  if (est === 'crecimiento') return { border: 'rgba(22,163,74,0.45)', bg: '#f0fdf4' };
  if (est === 'madurez') return { border: 'rgba(217,119,6,0.5)', bg: '#fffbeb' };
  /* cosecha = listo para cortar — violeta, no rojo (evita confusión con error o lechuga roja) */
  return { border: 'rgba(126,34,206,0.45)', bg: '#faf5ff' };
}

function renderTorreLista() {
  const el = document.getElementById('torreListaVista');
  if (!el) return;
  const cfg = state.configTorre || {};
  const esNft = cfg.tipoInstalacion === 'nft';
  const esDwc = cfg.tipoInstalacion === 'dwc';
  const N = cfg.numNiveles || window.NUM_NIVELES_ACTIVO || NUM_NIVELES;
  const C = cfg.numCestas || window.NUM_CESTAS_ACTIVO || NUM_CESTAS;
  let h = '<div class="torre-lista-block">';
  for (let n = 0; n < N; n++) {
    h += '<div class="torre-lista-nivel-title">' +
      (esNft ? 'Canal ' : esDwc ? 'Fila ' : 'Nivel ') + (n + 1) + '</div>';
    h += '<div class="torre-lista-grid" role="group" aria-label="' +
      (esNft ? 'Huecos del canal ' : esDwc ? 'Macetas de la fila ' : 'Cestas del nivel ') + (n + 1) + '">';
    for (let c = 0; c < C; c++) {
      const dat = state.torre?.[n]?.[c] || {};
      const col = torreListaColorCesta(n, c);
      const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
      const tit = dat.variedad ? String(dat.variedad) : 'Vacía';
      const titLista = cultivoNombreLista(cult, dat.variedad);
      const titEsc = escHtmlUi(dat.variedad ? titLista : tit);
      const dias = dat.fecha ? torreDiasCicloVisual(dat) : null;
      const sub = dias !== null ? dias + ' d' : 'Sin fecha';
      const emoji = !dat.variedad ? '⚪' : (cult ? cultivoEmoji(cult) : '🌱');
      const faseEst = dat.variedad && dias !== null ? getEstado(dat.variedad, dias) : '';
      const faseLabels = { plantula: 'Plántula', crecimiento: 'Crecimiento', madurez: 'Maduración', cosecha: 'Listo para cosechar' };
      const faseTit = faseEst ? (faseLabels[faseEst] || faseEst) : '';
      const faseEmoji = faseEst ? getEmoji(faseEst) : '';
      const origL =
        typeof etiquetaOrigenPlantaBreve === 'function' ? etiquetaOrigenPlantaBreve(dat.origenPlanta) : '';
      const keys = Array.isArray(dat.fotoKeys) ? dat.fotoKeys : [];
      const ultFotoKey = keys.length ? keys[keys.length - 1] : '';
      const fkAttr = ultFotoKey
        ? ' data-foto-key="' + String(ultFotoKey).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"'
        : '';
      let ariaLabel = (esNft ? 'Hueco ' : esDwc ? 'Maceta ' : 'Cesta ') + (c + 1) + ', ' + (dat.variedad ? titLista : tit) + ', ' + sub;
      if (faseTit) ariaLabel += ', fase: ' + faseTit;
      if (origL) {
        const oa = typeof normalizarOrigenPlanta === 'function' ? normalizarOrigenPlanta(dat.origenPlanta) : '';
        if (oa === 'vivero') ariaLabel += ', origen vivero';
        else if (oa === 'germinacion') ariaLabel += ', origen germinación propia';
      }
      ariaLabel = ariaLabel.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const multiKeyLista = n + ',' + c;
      const multiLista =
        torreInteraccionModo === 'asignar' && !torreAsignarInstantaneo && torreCestasMultiSel.has(multiKeyLista);
      const ariaPressedLista =
        torreInteraccionModo === 'asignar' && !torreAsignarInstantaneo
          ? ' aria-pressed="' + (multiLista ? 'true' : 'false') + '"'
          : '';
      h += '<button type="button" class="torre-lista-cesta-btn' + (multiLista ? ' torre-lista-cesta-btn--multi-sel' : '') + '" data-n="' + n + '" data-c="' + c + '" ' +
        'aria-label="' + ariaLabel + '"' + ariaPressedLista + '>';
      h += '<span class="torre-lista-cesta-disc"' + fkAttr + ' style="--tl-disc-bc:' + col.border + ';--tl-disc-bg:' + col.bg + '">';
      h += '<span class="torre-lista-cesta-num" aria-hidden="true">' + (c + 1) + '</span>';
      h += '<span class="torre-lista-cesta-emoji" aria-hidden="true">' + emoji + '</span>';
      if (faseEmoji) {
        const ft = faseTit.replace(/"/g, '&quot;').replace(/</g, '&lt;');
        h += '<span class="torre-lista-fase-badge" title="' + ft + '" aria-hidden="true">' + faseEmoji + '</span>';
      }
      h += '</span>';
      h += '<span class="tl-t">' + titEsc + '</span>';
      h += '<span class="tl-s">' + sub + '</span>';
      if (origL) h += '<span class="tl-o">' + escHtmlUi(origL) + '</span>';
      h += '</button>';
    }
    h += '</div>';
  }
  h += '</div>';
  el.innerHTML = h;
  void hydrateTorreListaFotosDisc(el);
  el.onclick = (e) => {
    const btn = e.target.closest('.torre-lista-cesta-btn');
    if (!btn) return;
    const n = parseInt(btn.getAttribute('data-n'), 10);
    const c = parseInt(btn.getAttribute('data-c'), 10);
    torreOnCestaActivada(n, c);
  };
}

/** Última foto de la cesta (IndexedDB) como fondo del círculo en vista Lista */
async function hydrateTorreListaFotosDisc(container) {
  if (!container) return;
  const discs = container.querySelectorAll('.torre-lista-cesta-disc[data-foto-key]');
  for (const disc of discs) {
    const key = disc.getAttribute('data-foto-key');
    if (!key) continue;
    try {
      const o = await leerFotoIDB(key);
      if (!o || !o.data) continue;
      const emojiEl = disc.querySelector('.torre-lista-cesta-emoji');
      const img = document.createElement('img');
      img.className = 'torre-lista-disc-img';
      img.src = o.data;
      img.alt = '';
      disc.insertBefore(img, disc.firstChild);
      if (emojiEl) emojiEl.style.display = 'none';
    } catch (_) { /* sin foto en IDB */ }
  }
}

function torreOnCestaActivada(n, c) {
  ocultarTorreQuickTip();
  if (torreInteraccionModo === 'asignar') {
    const v = document.getElementById('torreAssignVariedad')?.value?.trim();
    if (torreAsignarInstantaneo) {
      if (!v) {
        showToast('Elige primero el cultivo en la lista de arriba', true);
        return;
      }
      aplicarCultivoACestaUna(n, c, v);
      torreDiagramHuecoFocus = { nivel: n, cesta: c };
      saveState();
      renderTorre();
      updateTorreStats();
      calcularRotacion();
      setTimeout(renderCompatGrid, 50);
      try {
        if (typeof hcNotificarCambioCultivoSistema === 'function') hcNotificarCambioCultivoSistema();
      } catch (_) {}
      const cult = getCultivoDB(v);
      mostrarBarraSeleccionCesta(n, c);
      const esNft = state.configTorre?.tipoInstalacion === 'nft';
      showToast(
        'Asignado: ' + cultivoNombreLista(getCultivoDB(v), v) +
        (esNft ? ' · canal ' + (n + 1) + ' · hueco ' + (c + 1) : ' · N' + (n + 1) + ' C' + (c + 1))
      );
    } else {
      const k = n + ',' + c;
      if (torreCestasMultiSel.has(k)) {
        torreCestasMultiSel.delete(k);
      } else {
        if (!v) {
          showToast('Elige primero el cultivo en la lista de arriba', true);
          return;
        }
        torreCestasMultiSel.add(k);
      }
      torreDiagramHuecoFocus = { nivel: n, cesta: c };
      actualizarBarraMultiSel();
      mostrarBarraSeleccionCesta(n, c);
      renderTorre();
    }
  } else {
    torreDiagramHuecoFocus = { nivel: n, cesta: c };
    mostrarBarraSeleccionCesta(n, c);
    openModal(n, c);
    renderTorre();
  }
}

/** Solo las cestas de un nivel (girar sin regenerar depósito/defs/animaciones). */
function generarSVGTorreCestasNivelHTML(n, rot) {
  const ta = torreSvgAnimacionesActivas();
  const cfg = state.configTorre || {};
  const numCestas = cfg.numCestas || window.NUM_CESTAS_ACTIVO || NUM_CESTAS;
  const SVG_W     = 360;
  const CX        = SVG_W / 2;
  const NIVEL_H   = 62;
  const NIVEL_GAP = 14;
  const CESTA_R   = 14;
  const MARG_T    = 54;
  const TORRE_RX  = 86;
  const TORRE_RY  = 18;
  const ny        = MARG_T + n * (NIVEL_H + NIVEL_GAP) + NIVEL_H / 2;
  const phase     = n * 0.55 + rot;
  const baskets   = [];

  for (let c = 0; c < numCestas; c++) {
    const dat  = (state.torre[n] && state.torre[n][c]) ? state.torre[n][c] : { variedad:'', fecha:'', fotos:[] };
    const dias = dat.fecha ? torreDiasCicloVisual(dat) : 0;
    const est  = dat.variedad ? getEstado(dat.variedad, dias) : '';
    const diasBase = DIAS_COSECHA[dat.variedad] || 50;
    const diasT = typeof torreGetDiasCosechaObjetivo === 'function'
      ? torreGetDiasCosechaObjetivo(diasBase, state.configTorre || {})
      : diasBase;
    const pct  = dat.variedad ? Math.min(100, Math.round((dias / diasT) * 100)) : 0;

    /** Icono encima de la cesta según etapa de crecimiento (🌱 🌿 🥬 ✂️) */
    let fill, stroke, phaseEmoji;
    if (!dat.variedad)            { fill='#f8fafc'; stroke='#cbd5e1'; phaseEmoji=''; }
    else if (est==='plantula')    { fill='#eff6ff'; stroke='#2563eb'; phaseEmoji=getEmoji(est); }
    else if (est==='crecimiento') { fill='#f0fdf4'; stroke='#15803d'; phaseEmoji=getEmoji(est); }
    else if (est==='madurez')     { fill='#fffbeb'; stroke='#b45309'; phaseEmoji=getEmoji(est); }
    else                          { fill='#fef2f2'; stroke='#b91c1c'; phaseEmoji=getEmoji(est); }

    const ang = (Math.PI * 2 * (c / numCestas)) + phase;
    const z = (Math.sin(ang) + 1) / 2;
    const scale = 0.78 + 0.34 * z;
    const opacity = 0.35 + 0.65 * z;
    const cx2 = CX + Math.cos(ang) * TORRE_RX;
    const cy2 = ny + Math.sin(ang) * TORRE_RY;

    const fotos = (dat.fotos || []).filter(f => f && f.data);
    const ultimaFoto = fotos.length > 0 ? fotos[fotos.length - 1] : null;

    baskets.push({ n, c, cx2, cy2, z, scale, opacity, fill, stroke, phaseEmoji, pct, est, dias, ultimaFoto });
  }

  let out = '';
  baskets.sort((a, b) => a.z - b.z).forEach((b) => {
    const r = (CESTA_R * b.scale);
    const clipId = `clip_${n}_${b.c}`;
    const isSelected = !!(window.editingCesta && editingCesta.nivel === b.n && editingCesta.cesta === b.c);
    const caraFrontal = b.z >= 0.42;
    const multiKey = b.n + ',' + b.c;
    const isMultiSel = torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);

    out += `<ellipse cx="${b.cx2.toFixed(1)}" cy="${(b.cy2 + 3.5).toFixed(1)}" rx="${(r*1.05).toFixed(1)}" ry="${(r*0.65).toFixed(1)}"
      fill="rgba(0,0,0,${(0.06 + 0.10*b.z).toFixed(3)})" opacity="${b.opacity.toFixed(2)}"/>`;

    const datAria = (state.torre[b.n] && state.torre[b.n][b.c]) ? state.torre[b.n][b.c] : {};
    const varTxt = datAria.variedad ? String(datAria.variedad) : 'vacía';
    const ariaCesta = caraFrontal
      ? escAriaAttr(`Cesta nivel ${b.n + 1} número ${b.c + 1}, ${varTxt}` +
          (b.dias ? ', día ' + b.dias + ' de cultivo' : '') + '. Pulsa para abrir ficha o asignar cultivo.')
      : '';
    const a11yAttrs = caraFrontal
      ? ` role="button" tabindex="0" aria-label="${ariaCesta}"`
      : ' aria-hidden="true" focusable="false"';
    const cestaInterClass = caraFrontal ? 'hc-cesta--interactive' : 'hc-cesta--static';
    out += `<g data-n="${b.n}" data-c="${b.c}" data-z="${b.z.toFixed(3)}" class="hc-cesta ${cestaInterClass} ${caraFrontal ? 'hc-cesta-pe-all' : 'hc-cesta-pe-none'}"${a11yAttrs} opacity="${b.opacity.toFixed(2)}">`;

    out += `<circle cx="${b.cx2.toFixed(1)}" cy="${b.cy2.toFixed(1)}" r="${r.toFixed(1)}" fill="${b.fill}" stroke="${b.stroke}" stroke-width="${(2.4*b.scale).toFixed(1)}"/>`;

    if (isMultiSel) {
      out += `<circle cx="${b.cx2.toFixed(1)}" cy="${b.cy2.toFixed(1)}" r="${(r+5).toFixed(1)}"
        fill="none" stroke="#f59e0b" stroke-width="${(2.8*b.scale).toFixed(1)}" stroke-dasharray="4 3" opacity="0.95"/>`;
    }
    if (isSelected) {
      out += `<circle cx="${b.cx2.toFixed(1)}" cy="${b.cy2.toFixed(1)}" r="${(r+4).toFixed(1)}"
        fill="none" stroke="#22c55e" stroke-width="${(2.6*b.scale).toFixed(1)}" opacity="0.9"/>`;
      out += `<circle cx="${b.cx2.toFixed(1)}" cy="${b.cy2.toFixed(1)}" r="${(r+7.5).toFixed(1)}"
        fill="none" stroke="rgba(34,197,94,0.25)" stroke-width="${(5.5*b.scale).toFixed(1)}" opacity="0.8"/>`;
    }

    if (b.ultimaFoto?.data) {
      out += `<defs><clipPath id="${clipId}"><circle cx="${b.cx2.toFixed(1)}" cy="${b.cy2.toFixed(1)}" r="${(r-1.6).toFixed(1)}"/></clipPath></defs>`;
      out += `<image href="${b.ultimaFoto.data}" x="${(b.cx2-r).toFixed(1)}" y="${(b.cy2-r).toFixed(1)}"
        width="${(r*2).toFixed(1)}" height="${(r*2).toFixed(1)}" preserveAspectRatio="xMidYMid slice"
        clip-path="url(#${clipId})" opacity="${(0.92).toFixed(2)}"></image>`;
      out += `<circle cx="${b.cx2.toFixed(1)}" cy="${b.cy2.toFixed(1)}" r="${(r-0.6).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="${(1.2*b.scale).toFixed(1)}"/>`;
    }

    if (b.pct > 0 && b.pct < 100) {
      const r2   = r + 5.2;
      const ang2  = (b.pct / 100) * 2 * Math.PI - Math.PI / 2;
      const x1e  = b.cx2 + r2 * Math.cos(-Math.PI/2);
      const y1e  = b.cy2 + r2 * Math.sin(-Math.PI/2);
      const x2e  = b.cx2 + r2 * Math.cos(ang2);
      const y2e  = b.cy2 + r2 * Math.sin(ang2);
      out += `<path d="M${x1e.toFixed(1)},${y1e.toFixed(1)} A${r2.toFixed(1)},${r2.toFixed(1)} 0 ${b.pct>50?1:0},1 ${x2e.toFixed(1)},${y2e.toFixed(1)}"
        fill="none" stroke="${b.stroke}" stroke-width="${(2.0*b.scale).toFixed(1)}" stroke-linecap="round" opacity="0.55"/>`;
    }

    if (b.phaseEmoji) {
      out += `<text x="${b.cx2.toFixed(1)}" y="${(b.cy2 - r - 4).toFixed(1)}" font-size="${(14*b.scale).toFixed(1)}" text-anchor="middle" opacity="0.95">${b.phaseEmoji}</text>`;
    } else if (!b.ultimaFoto?.data) {
      out += `<text x="${b.cx2.toFixed(1)}" y="${(b.cy2 + 3.5).toFixed(1)}" font-family="Inconsolata,monospace" font-size="${(12*b.scale).toFixed(1)}" font-weight="600" text-anchor="middle" fill="#cbd5e1">·</text>`;
    }

    if (b.dias && b.dias > 0 && b.phaseEmoji) {
      out += `<text x="${b.cx2.toFixed(1)}" y="${(b.cy2 + r + 11).toFixed(1)}" font-family="Inconsolata,monospace"
        font-size="${(8*b.scale).toFixed(1)}" font-weight="700" fill="${b.stroke}" text-anchor="middle">${b.dias}d</text>`;
    } else {
      out += `<text x="${b.cx2.toFixed(1)}" y="${(b.cy2 + r + 11).toFixed(1)}" font-family="Inconsolata,monospace"
        font-size="${(8*b.scale).toFixed(1)}" fill="#d1d5db" text-anchor="middle">${b.c+1}</text>`;
    }

    const hasFotos = !!(b.ultimaFoto?.data);
    const hasNotas = !!(state.torre?.[b.n]?.[b.c]?.notas && String(state.torre[b.n][b.c].notas).trim().length > 0);
    if (hasFotos) {
      const bx = b.cx2 - r + 5;
      const by = b.cy2 - r + 5;
      const pw = (14 * b.scale);
      const ph = (10 * b.scale);
      out += `<rect x="${(bx - pw / 2).toFixed(1)}" y="${(by - ph / 2).toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="${(2.2 * b.scale).toFixed(1)}"
        fill="#0f172a" opacity="0.88" stroke="rgba(255,255,255,0.25)" stroke-width="${(0.6*b.scale).toFixed(1)}"/>`;
      out += `<text x="${bx.toFixed(1)}" y="${(by + 3.2*b.scale).toFixed(1)}" font-family="Inconsolata,monospace" font-size="${(7*b.scale).toFixed(1)}" font-weight="800"
        text-anchor="middle" fill="#f8fafc">F</text>`;
    }
    if (hasNotas) {
      const bx = b.cx2 + r - 5;
      const by = b.cy2 - r + 5;
      const pw = (14 * b.scale);
      const ph = (10 * b.scale);
      out += `<rect x="${(bx - pw / 2).toFixed(1)}" y="${(by - ph / 2).toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="${(2.2 * b.scale).toFixed(1)}"
        fill="#334155" opacity="0.9" stroke="rgba(255,255,255,0.2)" stroke-width="${(0.6*b.scale).toFixed(1)}"/>`;
      out += `<text x="${bx.toFixed(1)}" y="${(by + 3.2*b.scale).toFixed(1)}" font-family="Inconsolata,monospace" font-size="${(7*b.scale).toFixed(1)}" font-weight="800"
        text-anchor="middle" fill="#f8fafc">N</text>`;
    }

    if (b.est === 'cosecha') {
      out += `<circle cx="${(b.cx2 + r - 2).toFixed(1)}" cy="${(b.cy2 - r + 2).toFixed(1)}" r="${(5*b.scale).toFixed(1)}" fill="#dc2626">
        ${ta ? `<animate attributeName="r" from="${(4*b.scale).toFixed(1)}" to="${(6*b.scale).toFixed(1)}" dur="0.7s" repeatCount="indefinite" direction="alternate"/>` : ''}
      </circle>`;
      out += `<text x="${(b.cx2 + r - 2).toFixed(1)}" y="${(b.cy2 - r + 6).toFixed(1)}" font-size="${(7*b.scale).toFixed(1)}" text-anchor="middle" fill="white">!</text>`;
    }

    if (caraFrontal) {
      out += `<circle cx="${b.cx2.toFixed(1)}" cy="${b.cy2.toFixed(1)}" r="${(r * 1.55).toFixed(1)}"
        fill="rgba(0,0,0,0)" stroke="none" pointer-events="all" class="hc-cesta-hit"/>`;
    }

    out += `</g>`;
  });
  return out;
}

/** Torre vertical con giro 3D; NFT y DWC usan diagramas propios. */
function torreSvgEsTorreVerticalGiratoria() {
  const t = state.configTorre?.tipoInstalacion;
  return t !== 'nft' && t !== 'dwc' && t !== 'rdwc' && t !== 'srf';
}


/** Motor DWC: js/diagrams/dwc/dwc-diagram.js expone generarSVGDwc, buildDwcDiagramSvg, dwcSvgDepDimsDesdeCfg. */


/** Motor SRF SCADA: js/diagrams/srf/srf-diagram.js (buildSrfDiagramSvg). */
function generarSVGSrf() {
  if (typeof buildSrfDiagramSvg === 'function') {
    return buildSrfDiagramSvg();
  }
  return (
    '<p class="torre-svg-fallback" role="status">No se pudo cargar el esquema SRF. Recarga la página (Ctrl+F5).</p>'
  );
}


/** Motor RDWC SCADA: js/diagrams/rdwc/rdwc-diagram.js (buildRdwcDiagramSvg, rdwcPreferirLayoutHub). */
function generarSVGRdwc() {
  if (typeof buildRdwcDiagramSvg === 'function') {
    return buildRdwcDiagramSvg();
  }
  return (
    '<p class="torre-svg-fallback" role="status">No se pudo cargar el esquema RDWC. Recarga la página (Ctrl+F5).</p>'
  );
}


/** Núcleo torre (cestas + depósito). Envoltorio SCADA: js/diagrams/torre/torre-diagram.js */

/** Nivel visual del agua: mezcla en uso respecto a capacidad (≤ máx.). */
function nftSvgTankFillPct(volL, opts) {
  const o = opts || {};
  const cap = Number(o.capL);
  const mez = Number(o.mezL);
  const v = Math.max(5, Number(volL) || 20);
  if (Number.isFinite(cap) && cap > 0 && Number.isFinite(mez) && mez > 0) {
    return Math.min(0.94, Math.max(0.5, mez / cap));
  }
  return 0.87;
}

/** Depósito torre: cuerpo claro, agua con clip y superficie elíptica (Sistema + asistente). */
function nftSvgTankTorreStyle(tx, tankY, tankW, tankH, suf, volL, opts) {
  const o = opts || {};
  const Tg =
    typeof HC_DIAG !== 'undefined' && HC_DIAG.torre
      ? HC_DIAG.torre
      : { depBody0: '#f8fafc', depBody1: '#e2e8f0', depAgua0: '#7dd3fc', depAgua1: '#0284c7', depAguaOp0: '0.82', depAguaOp1: '0.92' };
  const gidBody = 'nftTkBody' + suf;
  const gidAqua = 'nftTkAq' + suf;
  const gidClip = 'nftTkClip' + suf;
  const cx = tx + tankW / 2;
  const vol = Math.max(5, parseInt(String(volL), 10) || 20);
  const volPct = nftSvgTankFillPct(vol, o);
  const aguaH = Math.round((tankH - 20) * volPct);
  const aguaY = tankY + tankH - 10 - aguaH;
  const aguaCol = '#0284c7';
  const ta = o.animate !== false && typeof torreSvgAnimacionesActivas === 'function' && torreSvgAnimacionesActivas();
  let defs = '';
  defs +=
    '<linearGradient id="' +
    gidBody +
    '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
    Tg.depBody0 +
    '"/><stop offset="100%" stop-color="' +
    Tg.depBody1 +
    '"/></linearGradient>';
  defs +=
    '<linearGradient id="' +
    gidAqua +
    '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
    Tg.depAgua0 +
    '" stop-opacity="' +
    (Tg.depAguaOp0 || '0.82') +
    '"/><stop offset="100%" stop-color="' +
    Tg.depAgua1 +
    '" stop-opacity="' +
    (Tg.depAguaOp1 || '0.92') +
    '"/></linearGradient>';
  defs +=
    '<clipPath id="' +
    gidClip +
    '"><rect x="' +
    (tx + 3) +
    '" y="' +
    (tankY + 3) +
    '" width="' +
    (tankW - 6) +
    '" height="' +
    (tankH - 6) +
    '" rx="10"/></clipPath>';
  let html = '';
  html +=
    '<rect x="' +
    tx +
    '" y="' +
    tankY +
    '" width="' +
    tankW +
    '" height="' +
    tankH +
    '" rx="12" fill="url(#' +
    gidBody +
    ')" stroke="#94a3b8" stroke-width="1.2"/>';
  html +=
    '<rect x="' +
    (tx + 3) +
    '" y="' +
    aguaY +
    '" width="' +
    (tankW - 6) +
    '" height="' +
    (aguaH + 7) +
    '" fill="url(#' +
    gidAqua +
    ')" clip-path="url(#' +
    gidClip +
    ')" opacity="0.92">';
  if (ta) {
    html +=
      '<animate attributeName="y" from="' +
      (aguaY + 2) +
      '" to="' +
      (aguaY - 2) +
      '" dur="2s" repeatCount="indefinite" direction="alternate"/>';
  }
  html += '</rect>';
  html +=
    '<ellipse cx="' +
    cx +
    '" cy="' +
    aguaY +
    '" rx="' +
    (tankW - 16) / 2 +
    '" ry="5" fill="' +
    aguaCol +
    '" opacity="0.3">';
  if (ta) {
    html +=
      '<animate attributeName="ry" from="4" to="6" dur="1.5s" repeatCount="indefinite" direction="alternate"/>';
  }
  html += '</ellipse>';
  return { defs: defs, html: html, volTextFill: aguaCol };
}

/**
 * Bomba de aire estilo torre (cúpula naranja + manguera curva + piedra + burbujas).
 * @param {object} [opts] — `canvasW`, `placement` (`torreRot` | `besideRight`), `gap`, `scale`
 */
function torreSvgDepositoAirDwc(depX, depY, depW, depH, animate, opts) {
  if (typeof dwcSvgAirPumpDraw !== 'function' && typeof dwcSvgAirPumpExternal !== 'function') {
    return { defs: '', html: '' };
  }
  opts = opts && typeof opts === 'object' ? opts : {};
  const pumpNomW = 54;
  const placement = opts.placement === 'besideRight' ? 'besideRight' : 'torreRot';
  const rotBtnR = 17;
  const rotBtnPad = 6;
  const rotRightOuter = depX + depW + rotBtnPad + rotBtnR * 2;
  const gapAfterRot = 8;
  const gapBeside = opts.gap != null ? Number(opts.gap) : 16;
  let pumpScale =
    opts.scale != null && Number.isFinite(Number(opts.scale))
      ? Math.max(0.66, Math.min(1.45, Number(opts.scale)))
      : placement === 'besideRight'
        ? Math.max(0.76, Math.min(1.05, 0.8 + Math.min(180, depW) / 900))
        : 0.88;
  let pumpX = placement === 'besideRight' ? depX + depW + gapBeside : rotRightOuter + gapAfterRot;
  const canvasW = Number(opts.canvasW);
  if (Number.isFinite(canvasW) && canvasW > 0) {
    const margin = 8;
    const maxRight = canvasW - margin;
    let pumpW = pumpNomW * pumpScale;
    while (pumpX + pumpW > maxRight && pumpScale > 0.66) {
      pumpScale = Math.round((pumpScale - 0.04) * 100) / 100;
      pumpW = pumpNomW * pumpScale;
    }
    if (pumpX + pumpW > maxRight) {
      pumpScale = Math.max(0.66, (maxRight - pumpX - 2) / pumpNomW);
    }
  }
  const pumpH = 40 * pumpScale;
  const pumpY = depY + depH - pumpH - 2;
  const piedraX = depX + Math.round(depW * 0.55);
  const piedraY = depY + depH - 11;
  const wallX = depX + depW - 3;
  const entryY = depY + depH * 0.52;
  let pumpOutX = pumpX;
  let pumpOutY = pumpY + pumpH * 0.55;
  let pumpBlock = '';
  if (typeof dwcSvgAirPumpDraw === 'function') {
    const drawn = dwcSvgAirPumpDraw(pumpX, pumpY, pumpScale);
    pumpBlock = drawn.svg;
    if (drawn.outlets && drawn.outlets[0]) {
      pumpOutX = drawn.outlets[0].x;
      pumpOutY = drawn.outlets[0].y;
    }
  } else {
    const pump = dwcSvgAirPumpExternal(0, 0, 1);
    const inner = pump.svg.replace(/fill="url\(#dwcPumpDome\)"/g, 'fill="#ff9800"');
    const o0 = pump.outlets[0] || { x: 0, y: 29 };
    pumpOutX = pumpX + o0.x * pumpScale;
    pumpOutY = pumpY + o0.y * pumpScale;
    pumpBlock =
      '<g transform="translate(' +
      pumpX.toFixed(1) +
      ' ' +
      pumpY.toFixed(1) +
      ') scale(' +
      pumpScale.toFixed(3) +
      ')">' +
      inner +
      '</g>';
  }
  const gClass = placement === 'besideRight' ? 'hc-air-torre-style' : 'torre-dwc-air';
  let html = '<g class="' + gClass + '">' + pumpBlock;
  if (typeof dwcSvgAirHosePumpToStone === 'function') {
    html += dwcSvgAirHosePumpToStone(pumpOutX, pumpOutY, wallX, entryY, piedraX, piedraY, 1.8, 0.95);
  }
  html +=
    '<ellipse cx="' +
    piedraX.toFixed(1) +
    '" cy="' +
    piedraY.toFixed(1) +
    '" rx="9" ry="5" fill="#9ca3af" stroke="#57534e" stroke-width="0.9"/>';
  if (animate !== false) {
    html += torreSvgAirBubbles(piedraX, piedraY, depY + 12);
  }
  html += '</g>';
  return { defs: '', html: html };
}

/** Burbujas desde la piedra difusora (mismo efecto que legacy / tankFront). */
function torreSvgAirBubbles(cx, cy, waterTopY) {
  const ta =
    typeof torreSvgAnimacionesActivas === 'function' ? torreSvgAnimacionesActivas() : false;
  let s = '';
  const y0 = cy - 4;
  const y1 = Math.max(waterTopY + 6, cy - 28);
  for (let i = 0; i < 8; i++) {
    const dx = ((i % 5) - 2) * 4.5;
    const r = 1.3 + (i % 3) * 0.7;
    const dur = (1.1 + i * 0.12).toFixed(2);
    const delay = (i * 0.15).toFixed(2);
    if (ta) {
      s +=
        '<circle cx="' +
        (cx + dx).toFixed(1) +
        '" cy="' +
        y0.toFixed(1) +
        '" r="' +
        r +
        '" fill="#93c5fd" stroke="#0ea5e9" stroke-width="0.6" opacity="0">' +
        '<animate attributeName="cy" from="' +
        y0.toFixed(1) +
        '" to="' +
        y1.toFixed(1) +
        '" dur="' +
        dur +
        's" begin="' +
        delay +
        's" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;0.85;0.85;0" dur="' +
        dur +
        's" begin="' +
        delay +
        's" repeatCount="indefinite"/></circle>';
    } else {
      s +=
        '<circle cx="' +
        (cx + dx).toFixed(1) +
        '" cy="' +
        y0.toFixed(1) +
        '" r="' +
        r +
        '" fill="#93c5fd" stroke="#0ea5e9" stroke-width="0.6" opacity="0.55"/>';
    }
  }
  return s;
}

function torreSvgDepositoCompleto(depX, depY, depW, depH, volL, opts) {
  const o = opts || {};
  let defs = '';
  let html = '';
  const pack = nftSvgTankTorreStyle(depX, depY, depW, depH, o.suf || 'Sys', volL, {
    animate: o.animate !== false,
    capL: o.capL,
    mezL: o.mezL,
  });
  defs += pack.defs || '';
  html += pack.html || '';
  if (o.difusor !== false) {
    const air = torreSvgDepositoAirDwc(depX, depY, depW, depH, o.animate !== false, {
      canvasW: o.canvasW,
    });
    defs += air.defs || '';
    html += air.html || '';
  }
  return { defs: defs, html: html };
}
/** HTML de aireador torre a la derecha del depósito (NFT, Medir, etc.). */
function hcSvgAireadorHtmlAtTank(tx, tankY, tankW, tankH, opts) {
  if (typeof torreSvgDepositoAirDwc !== 'function') return '';
  const air = torreSvgDepositoAirDwc(tx, tankY, tankW, tankH, opts && opts.animate !== false, Object.assign({ placement: 'besideRight', gap: 16 }, opts || {}));
  return air.html || '';
}

if (typeof window !== 'undefined') {
  window.nftSvgTankFillPct = nftSvgTankFillPct;
  window.nftSvgTankTorreStyle = nftSvgTankTorreStyle;
  window.torreSvgDepositoAirDwc = torreSvgDepositoAirDwc;
  window.hcSvgAireadorHtmlAtTank = hcSvgAireadorHtmlAtTank;
  window.torreSvgDepositoCompleto = torreSvgDepositoCompleto;
}

function _buildTorreSvgLegacy() {
  // Usar configuración REAL de la torre activa
  const cfg = state.configTorre || {};
  const numNiveles = cfg.numNiveles || window.NUM_NIVELES_ACTIVO || NUM_NIVELES;
  const nivelesActivos = Array.from({length: numNiveles}, (_, i) => i);
  const rot = (cfg._torreRotRad || 0);

  // ── Dimensiones ───────────────────────────────────────────────────────────
  const SVG_W     = 408;
  const CX        = SVG_W / 2;
  const NIVEL_H   = 62;
  const NIVEL_GAP = 14;
  const EJE_W     = 12;
  const MARG_T    = 54;   // espacio para rociador
  const DEP_H     = 90;   // altura depósito
  const DEP_W     = 200;
  const DEP_GAP   = 18;   // espacio entre torre y depósito
  const TORRE_W   = 190;  // ancho visual del cilindro
  const TORRE_RX  = 86;   // radio X para cestas alrededor
  const TORRE_RY  = 18;   // profundidad isométrica (maqueta simplificada)

  const torreaH = numNiveles * NIVEL_H + (numNiveles - 1) * NIVEL_GAP;
  const SVG_H   = MARG_T + torreaH + DEP_GAP + DEP_H + 30;

  const nivelY = (n) => MARG_T + n * (NIVEL_H + NIVEL_GAP) + NIVEL_H / 2;
  const DEP_Y  = MARG_T + torreaH + DEP_GAP;
  const DEP_X  = (SVG_W - DEP_W) / 2;

  // Volumen: etiqueta y nivel siguen el mismo criterio que DWC — litros de mezcla / trabajo (≤ máx.); la última medición solo ajusta el nivel si existe.
  const volCapRaw = getVolumenDepositoMaxLitros(cfg);
  const volCap =
    volCapRaw != null && Number.isFinite(volCapRaw) && volCapRaw > 0 ? volCapRaw : null;
  const volMezRef =
    typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : null;
  const volMez =
    volMezRef != null && Number.isFinite(volMezRef) && volMezRef > 0 ? volMezRef : null;
  const volMedido =
    state.ultimaMedicion?.vol != null &&
    String(state.ultimaMedicion.vol).trim() !== '' &&
    Number.isFinite(parseFloat(String(state.ultimaMedicion.vol).replace(',', '.')))
      ? parseFloat(String(state.ultimaMedicion.vol).replace(',', '.'))
      : null;
  const volNivelIlust =
    volMedido != null
      ? volMedido
      : volMez != null
        ? volMez
        : volCap != null
          ? volCap * 0.78
          : null;
  const volPct =
    volCap != null && volNivelIlust != null && volCap > 0
      ? Math.min(1, Math.max(0, volNivelIlust / volCap))
      : 0;
  const tieneDifusor   = state.configTorre?.equipamiento?.includes('difusor')   ?? true;
  const tieneCalentador= state.configTorre?.equipamiento?.includes('calentador') ?? true;
  const ta = torreSvgAnimacionesActivas();

  let s = '';
  const Tg =
    typeof HC_DIAG !== 'undefined' && HC_DIAG.torre
      ? HC_DIAG.torre
      : {
          eje0: '#86efac',
          eje1: '#22c55e',
          body0: '#e8ebf0',
          body1: '#f8fafc',
          body2: '#dce1e8',
          body3: '#f8fafc',
          body4: '#e8ebf0',
          glow0: '#86efac',
          depAgua0: '#7dd3fc',
          depAgua1: '#0284c7',
          depAguaOp0: '0.82',
          depAguaOp1: '0.92',
          depBody0: '#f8fafc',
          depBody1: '#e2e8f0',
        };

  // ── DEFS (paleta unificada hc-diagram-palette.js) ───────────────────────────
  s += `<defs>
    <linearGradient id="ejeGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${Tg.eje0}"/>
      <stop offset="100%" stop-color="${Tg.eje1}"/>
    </linearGradient>
    <linearGradient id="torreBodyGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${Tg.body0}"/>
      <stop offset="22%" stop-color="${Tg.body1}"/>
      <stop offset="50%" stop-color="${Tg.body2}"/>
      <stop offset="78%" stop-color="${Tg.body3}"/>
      <stop offset="100%" stop-color="${Tg.body4}"/>
    </linearGradient>
    <linearGradient id="torreGlowGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${Tg.glow0}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${Tg.glow0}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="depAguaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${Tg.depAgua0}" stop-opacity="${Tg.depAguaOp0}"/>
      <stop offset="100%" stop-color="${Tg.depAgua1}" stop-opacity="${Tg.depAguaOp1}"/>
    </linearGradient>
    <linearGradient id="depBodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${Tg.depBody0}"/>
      <stop offset="100%" stop-color="${Tg.depBody1}"/>
    </linearGradient>
    <clipPath id="depClip">
      <rect x="${DEP_X+3}" y="${DEP_Y+3}" width="${DEP_W-6}" height="${DEP_H-6}" rx="10"/>
    </clipPath>
  </defs>`;

  const ejeTop = MARG_T - 36;
  const ejeBot = DEP_Y + 8;

  // Eje central (hub): detrás de cestas; no tapa el cultivo al girar
  s += `<g class="hc-torre-eje" pointer-events="none" aria-hidden="true">
    <rect x="${CX-EJE_W/2}" y="${ejeTop}" width="${EJE_W}" height="${ejeBot-ejeTop}"
      rx="${EJE_W/2}" fill="url(#ejeGrad)" opacity="0.88"/>
    <line x1="${CX}" y1="${ejeTop+10}" x2="${CX}" y2="${ejeBot-4}"
      stroke="#0ea5e9" stroke-width="2.25" stroke-dasharray="7 8" stroke-linecap="round" opacity="0.48">
      ${ta ? `<animate attributeName="stroke-dashoffset" from="0" to="34" dur="1s" repeatCount="indefinite" calcMode="linear"/>` : ''}
    </line>
    <ellipse cx="${CX}" cy="${ejeTop}" rx="24" ry="11" fill="#f1f5f9" stroke="#64748b" stroke-width="1.1"/>
  </g>`;
  if (ta) {
    const gotas = [-20,-10,0,10,20];
    gotas.forEach((dx, i) => {
      const delay = i * 0.18;
      s += `<circle cx="${CX+dx}" cy="${ejeTop+16}" r="2.5" fill="#93c5fd" opacity="0.75">
        <animate attributeName="cy" from="${ejeTop+14}" to="${ejeTop+26}"
          dur="0.9s" begin="${delay}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.8" to="0"
          dur="0.9s" begin="${delay}s" repeatCount="indefinite"/>
      </circle>`;
    });
  }

  // ── NIVELES (rueda) Y CESTAS ─────────────────────────────────────────────
  for (let n = 0; n < numNiveles; n++) {
    const ny     = nivelY(n);
    const activo = nivelesActivos.includes(n);
    const opNiv = activo ? 1 : 0.38;
    s += `<ellipse class="hc-torre-nivel-rueda" cx="${CX}" cy="${ny}" rx="${TORRE_RX}" ry="${TORRE_RY + 2}"
      fill="none" stroke="#cbd5e1" stroke-width="1.3" opacity="${opNiv}"/>`;
    if (activo) {
      s += `<ellipse cx="${CX}" cy="${ny}" rx="${TORRE_RX - 3}" ry="${TORRE_RY}"
        fill="none" stroke="#86efac" stroke-width="1" opacity="0.35"/>`;
    }

    if (!activo) continue;

    s += `<g id="hc-baskets-n-${n}" class="hc-torre-nivel-cestas">${generarSVGTorreCestasNivelHTML(n, rot)}</g>`;
  }

  // ── DEPÓSITO ──────────────────────────────────────────────────────────────
  // Cuerpo exterior
  s += `<rect x="${DEP_X}" y="${DEP_Y}" width="${DEP_W}" height="${DEP_H}"
    rx="12" fill="url(#depBodyGrad)" stroke="#94a3b8" stroke-width="1.2"/>`;

  // Nivel del agua
  const aguaH   = Math.round(volPct * (DEP_H - 20));
  const aguaY   = DEP_Y + DEP_H - 10 - aguaH;
  const aguaCol = volPct < 0.5 ? '#e11d48' : volPct < 0.7 ? '#d97706' : '#0284c7';
  s += `<rect x="${DEP_X+3}" y="${aguaY}" width="${DEP_W-6}" height="${aguaH+7}"
    rx="0" fill="url(#depAguaGrad)" clip-path="url(#depClip)" opacity="0.8">
    ${ta ? `<animate attributeName="y" from="${aguaY+2}" to="${aguaY-2}" dur="2s" repeatCount="indefinite" direction="alternate"/>` : ''}
  </rect>`;
  // Espejo del agua (superficie)
  s += `<ellipse cx="${CX}" cy="${aguaY}" rx="${(DEP_W-16)/2}" ry="5"
    fill="${aguaCol}" opacity="0.3">
    ${ta ? `<animate attributeName="ry" from="4" to="6" dur="1.5s" repeatCount="indefinite" direction="alternate"/>` : ''}
  </ellipse>`;

  // Volumen fuera del depósito: siempre litros de referencia para dosis (mezcla); si hay medición distinta, el nivel ya la refleja arriba.
  const volTorreLitros =
    volMez != null
      ? Math.round(volMez * 10) / 10
      : volMedido != null && Number.isFinite(Number(volMedido))
        ? Math.round(Number(volMedido) * 10) / 10
        : volCap != null
          ? Math.round(Number(volCap) * 10) / 10
          : null;
  if (typeof hcDiagramVolLabelSvg === 'function') {
    s += hcDiagramVolLabelSvg(CX, DEP_Y + DEP_H + 30, volTorreLitros, {
      fill: aguaCol,
      fontSize: 20,
      pointerEvents: false,
    });
  } else {
    const volTorreTexto = volTorreLitros != null ? volTorreLitros + ' L' : '—';
    s += `<text x="${CX}" y="${DEP_Y + DEP_H + 30}" font-family="Syne,sans-serif"
      font-size="20" font-weight="900" fill="${aguaCol}" text-anchor="middle" letter-spacing="0.02em">${volTorreTexto}</text>`;
  }
  // ── CALENTADOR ────────────────────────────────────────────────────────────
  if (tieneCalentador) {
    const hx = DEP_X + 20;
    const hy = aguaY + aguaH / 2;
    // Cuerpo calentador
    s += `<rect x="${hx-5}" y="${DEP_Y+DEP_H-40}" width="10" height="30"
      rx="5" fill="#f97316" stroke="#ea580c" stroke-width="1.5"/>`;
    // Luz piloto
    s += `<circle cx="${hx}" cy="${DEP_Y+DEP_H-44}" r="4" fill="#fbbf24">
      ${ta ? `<animate attributeName="opacity" from="0.6" to="1" dur="1.5s" repeatCount="indefinite" direction="alternate"/>` : ''}
    </circle>`;
  }

  // ── DIFUSOR DE AIRE (bomba DWC + manguera a piedra) ───────────────────────
  if (tieneDifusor) {
    const airLeg = torreSvgDepositoAirDwc(DEP_X, DEP_Y, DEP_W, DEP_H, ta, { canvasW: SVG_W });
    s += airLeg.html;
    if (ta) {
      const ax = DEP_X + Math.round(DEP_W * 0.55);
      const ay = DEP_Y + DEP_H - 11;
      const burbs = [[-8, 0], [-3, 0], [2, 0], [7, 0], [-5, 0], [4, 0]];
      burbs.forEach(([dx], i) => {
        const bx = ax + dx + ((i % 3) - 1) * 3;
        const byStart = ay - 5;
        const byEnd = aguaY - 10;
        const delay = (i * 0.28).toFixed(2);
        const dur = (1.2 + i * 0.15).toFixed(2);
        s += `<circle cx="${bx}" cy="${byStart}" r="${1.5 + (i % 2) * 0.5}" fill="#93c5fd" opacity="0">
          <animate attributeName="cy" from="${byStart}" to="${byEnd}"
            dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="linear"/>
          <animate attributeName="opacity" values="0;0.8;0.8;0"
            dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
          <animate attributeName="r" from="1.5" to="3"
            dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        </circle>`;
      });
    }
  }


  // Flechas girar maqueta (solo aquí, a lados del depósito)
  const btnR = 17;
  const yBtn = DEP_Y + DEP_H / 2;
  const xL = DEP_X - 6 - btnR;
  const xR = DEP_X + DEP_W + 6 + btnR;
  /* Punta hacia el exterior (alejada del depósito); la base mira al centro. */
  const triL = `M ${xL - 7} ${yBtn} L ${xL + 5} ${yBtn - 8} L ${xL + 5} ${yBtn + 8} Z`;
  const triR = `M ${xR + 7} ${yBtn} L ${xR - 5} ${yBtn - 8} L ${xR - 5} ${yBtn + 8} Z`;
  s += `<g class="hc-torre-rot-flecha" data-rot-dir="1" role="button" tabindex="0" aria-label="Girar maqueta a la izquierda" focusable="true">
    <circle cx="${xL}" cy="${yBtn}" r="${btnR}" fill="rgba(248,250,252,0.97)" stroke="#64748b" stroke-width="1.3"/>
    <path d="${triL}" fill="#1e293b" pointer-events="none"/>
  </g>`;
  s += `<g class="hc-torre-rot-flecha" data-rot-dir="-1" role="button" tabindex="0" aria-label="Girar maqueta a la derecha" focusable="true">
    <circle cx="${xR}" cy="${yBtn}" r="${btnR}" fill="rgba(248,250,252,0.97)" stroke="#64748b" stroke-width="1.3"/>
    <path d="${triR}" fill="#1e293b" pointer-events="none"/>
  </g>`;

  // Conexión depósito → eje (tubito de subida)
  s += `<line x1="${CX}" y1="${DEP_Y}" x2="${CX}" y2="${ejeBot}"
    stroke="#64748b" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round" opacity="0.38">
    ${ta ? `<animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.8s" repeatCount="indefinite" calcMode="linear"/>` : ''}
  </line>`;

  return `<svg class="torre-svg-diagram svg-centered-block" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}"
    xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

function generarSVGTorre() {
  if (typeof buildTorreDiagramSvg === 'function') {
    return buildTorreDiagramSvg();
  }
  return _buildTorreSvgLegacy();
}

/** Referencia de germinación en sustrato (casa), antes del trasplante al hidro — no es el EC del depósito de la torre. */
function torreTablaLineaSemilleroGerminacionHtml(cultivo) {
  if (!cultivo || !cultivo.fases || !cultivo.fases.germinacion) return '';
  const g = cultivo.fases.germinacion;
  const ec =
    Array.isArray(g.ec) && g.ec.length >= 2 && Number.isFinite(Number(g.ec[0])) && Number.isFinite(Number(g.ec[1]))
      ? Math.round(Number(g.ec[0])) + '–' + Math.round(Number(g.ec[1]))
      : null;
  const ph =
    Array.isArray(g.ph) && g.ph.length >= 2 && Number.isFinite(Number(g.ph[0])) && Number.isFinite(Number(g.ph[1]))
      ? Number(g.ph[0]).toFixed(1) + '–' + Number(g.ph[1]).toFixed(1)
      : null;
  const d = Number(g.dias);
  const dTxt = Number.isFinite(d) && d > 0 ? '~' + Math.round(d) + ' d en sustrato' : '';
  const parts = [];
  if (ec) parts.push('EC ' + ec + ' µS/cm');
  if (ph) parts.push('pH ' + ph);
  if (dTxt) parts.push(dTxt);
  if (parts.length === 0) return '';
  return (
    '<div class="torre-prog-ec-fase torre-prog-ec-fase--semillero" ' +
    'title="Germinación en casa (semillero / sustrato húmedo). No uses este EC en el depósito hasta tener plántula y trasplantar al sistema.">' +
    '<span class="torre-prog-semillero-tag">Semillero</span> ' +
    escHtmlUi(parts.join(' · ')) +
    '</div>'
  );
}

// ── Tabla resumen de variedades debajo del SVG ───────────────────────────────
function renderTablaVariedades() {
  const el = document.getElementById('tablaVariedades');
  if (!el) return;

  const cfg = state.configTorre || {};
  const numNiveles = cfg.numNiveles || NUM_NIVELES;
  const plantas = [];

  for (let n = 0; n < numNiveles; n++) {
    (state.torre[n] || []).forEach((c, ci) => {
      if (!c || !c.variedad) return;
      const cultivo = getCultivoDB(c.variedad);
      const dias =
        c.fecha && typeof getDiasEfectivosCicloBiologico === 'function'
          ? getDiasEfectivosCicloBiologico(c, cultivo, Date.now())
          : c.fecha
            ? getDias(c.fecha)
            : null;
      const diasBase = cultivo?.dias || 45;
      const diasTotal = typeof torreGetDiasCosechaObjetivo === 'function'
        ? torreGetDiasCosechaObjetivo(diasBase, cfg)
        : diasBase;
      const pct    = dias !== null ? Math.min(100, Math.round((dias / diasTotal) * 100)) : null;
      const estado = dias === null ? 'Sin fecha'
        : pct >= 100 ? 'Cosechar'
        : pct >= 70  ? 'Madurez'
        : pct >= 30  ? 'Crecimiento'
        : 'Plántula';
      const color  = pct >= 100 ? '#6d28d9'
        : pct >= 70  ? '#d97706'
        : pct >= 30  ? '#16a34a'
        : '#2563eb';
      const rangoEc =
        typeof torreRangoEcPhCestaParaMostrar === 'function' ? torreRangoEcPhCestaParaMostrar(c, cfg) : null;
      plantas.push({
        n,
        ci,
        variedad: c.variedad,
        dias,
        diasTotal,
        pct,
        estado,
        color,
        fecha: c.fecha || '',
        ecMin: rangoEc ? rangoEc.ecMin : cultivo?.ecMin,
        ecMax: rangoEc ? rangoEc.ecMax : cultivo?.ecMax,
        ecFaseKey: rangoEc ? rangoEc.faseKey : null,
        ecSinFecha: rangoEc ? rangoEc.sinFecha : true,
        origenPlanta: c.origenPlanta,
      });
    });
  }

  if (plantas.length === 0) {
    el.innerHTML = '';
    return;
  }

  // Ordenar: primero los que toca cosechar, luego por nivel
  plantas.sort((a, b) => (b.pct||0) - (a.pct||0));

  let html = '<div class="torre-prog-wrap">' +
    '<div class="torre-prog-head">' +
    '<span>N·C</span><span>Variedad</span><span>Días</span><span>Estado</span>' +
    '<span title="EC según edad de ciclo: días en hidro + media en vivero si marcaste «Plántula de vivero» (como en Medir). Debajo, referencia Semillero si aplica.">EC (µS/cm)</span>' +
    '</div>';

  const faseEcEtq = {
    germinacion: 'Germinación',
    plantula: 'Plántula',
    vegetativo: 'Vegetativo',
    prefloracion: 'Prefloración',
    floracion: 'Floración',
    fructificacion: 'Fructificación',
  };

  plantas.forEach((p, i) => {
    const rowTone = i % 2 === 0 ? 'torre-prog-row--odd' : 'torre-prog-row--even';
    const diasText = p.dias !== null ? p.dias + '/' + p.diasTotal : '—';
    const ecText = p.ecMin != null && p.ecMax != null ? p.ecMin + '–' + p.ecMax : '—';
    const faseEcLine =
      p.ecFaseKey && faseEcEtq[p.ecFaseKey]
        ? '<div class="torre-prog-ec-fase">' + escHtmlUi(faseEcEtq[p.ecFaseKey]) + '</div>'
        : p.ecSinFecha && ecText !== '—'
          ? '<div class="torre-prog-ec-fase torre-prog-ec-fase--muted">Sin fase por días · rango general del cultivo</div>'
          : '';
    const cultRow  = getCultivoDB(p.variedad);
    const semilleroLine = torreTablaLineaSemilleroGerminacionHtml(cultRow);
    const origTxt =
      typeof etiquetaOrigenPlantaBreve === 'function' ? etiquetaOrigenPlantaBreve(p.origenPlanta) : '';

    // Barra de progreso mini
    const barW = p.pct !== null ? Math.min(100, p.pct) : 0;
    const barColor = p.color;

    html += '<div class="torre-prog-row ' + rowTone + '">' +
      '<span class="torre-prog-nc">' + (p.n+1) + '·' + (p.ci+1) + '</span>' +
      '<div class="torre-prog-cell-min">' +
        '<div class="torre-prog-var-row">' +
        '<span class="torre-prog-emoji-wrap" aria-hidden="true">' + cultivoEmojiHtml(cultRow, 1.4) + '</span>' +
        '<div class="torre-prog-var-inner">' +
        '<div class="torre-prog-var-name">' + escHtmlUi(cultivoNombreLista(cultRow, p.variedad)) + '</div>' +
        (origTxt ? '<div class="torre-prog-origen">' + origTxt + '</div>' : '') +
        (p.pct !== null ? '<div class="torre-prog-bar-track">' +
          '<div class="torre-prog-bar-fill" style="--tp-bar-w:' + barW + '%;--tp-bar-bg:' + barColor + '"></div>' +
          '</div>' : '') +
        '</div></div></div>' +
      '<span class="torre-prog-dias">' + diasText + '</span>' +
      '<span class="torre-prog-estado" style="--tp-est-c:' + barColor + ';--tp-est-bg:' + barColor + '15">' +
        p.estado + '</span>' +
      '<span class="torre-prog-ec">' +
        ecText +
        faseEcLine +
        semilleroLine +
        '</span>' +
      '</div>';
  });

  html += '</div>';
  el.innerHTML = html;
}

function poblarTorreAssignSelect() {
  const sel = document.getElementById('torreAssignVariedad');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Elige un cultivo —</option>';
  const grupos = {};
  CULTIVOS_DB.forEach(c => {
    if (!grupos[c.grupo]) grupos[c.grupo] = [];
    grupos[c.grupo].push(c);
  });
  const nombreGrupos = {
    lechugas:'Lechugas', hojas:'Hojas verdes', asiaticas:'Asiáticas / Mostaza',
    hierbas:'Hierbas', frutos:'Frutos', fresas:'Fresas',
    raices:'Raíces', microgreens:'Microgreens'
  };
  Object.entries(grupos).forEach(([gKey, cultivos]) => {
    const og = document.createElement('optgroup');
    og.label = nombreGrupos[gKey] || gKey;
    cultivos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nombre;
      opt.innerHTML = cultivoEmojiHtml(c, 1.05) + ' ' + escOptionHtml(cultivoNombreLista(c, c.nombre));
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
  if (prev) sel.value = prev;
}

function onTorreInstantToggle(cb) {
  torreAsignarInstantaneo = !!cb.checked;
  if (torreAsignarInstantaneo) torreCestasMultiSel.clear();
  actualizarTorreAssignAyuda();
  actualizarBarraMultiSel();
  renderTorre();
}

function actualizarBarraMultiSel() {
  const bar = document.getElementById('torreAssignMultiBar');
  const cnt = document.getElementById('torreAssignCount');
  const btnAplicar = document.getElementById('torreBtnAplicarSeleccion');
  const btnLimpiar = bar ? bar.querySelector('button.btn-ghost') : null;
  if (!bar || !cnt) return;
  const n = torreCestasMultiSel.size;
  const multiMode = torreInteraccionModo === 'asignar' && !torreAsignarInstantaneo;
  bar.style.display = multiMode ? 'flex' : 'none';
  const esNft = state.configTorre?.tipoInstalacion === 'nft';
  const esDwc = state.configTorre?.tipoInstalacion === 'dwc';
  const esRdwc = state.configTorre?.tipoInstalacion === 'rdwc';
  const hintQuitar = ' · 2.º toque = quitar';
  cnt.textContent =
    n === 0
      ? (esNft
        ? 'Toca huecos en el esquema NFT o en Lista (marca ámbar)' + hintQuitar
        : esDwc
          ? 'Toca macetas en el esquema DWC o en Lista (marca ámbar)' + hintQuitar
          : esRdwc
            ? 'Toca módulos RDWC en el esquema o en Lista (marca ámbar)' + hintQuitar
            : 'Toca cestas en la torre o en Lista (marca ámbar)' + hintQuitar)
      : n === 1
        ? (esNft ? '1 hueco seleccionado' + hintQuitar : esDwc ? '1 maceta seleccionada' + hintQuitar : esRdwc ? '1 módulo seleccionado' + hintQuitar : '1 cesta seleccionada' + hintQuitar)
        : (esNft ? n + ' huecos seleccionados' + hintQuitar : esDwc ? n + ' macetas seleccionadas' + hintQuitar : esRdwc ? n + ' módulos seleccionados' + hintQuitar : n + ' cestas seleccionadas' + hintQuitar);
  if (btnAplicar) {
    btnAplicar.disabled = n === 0;
    btnAplicar.style.opacity = n === 0 ? '0.55' : '1';
    btnAplicar.style.pointerEvents = n === 0 ? 'none' : 'auto';
  }
  if (btnLimpiar) {
    btnLimpiar.disabled = n === 0;
    btnLimpiar.style.opacity = n === 0 ? '0.45' : '1';
  }
}

function sincronizarTextosPanelInteraccionSistema() {
  const t = tipoInstalacionNormalizado(state.configTorre);
  const esNft = t === 'nft';
  const esDwc = t === 'dwc';
  const esRdwc = t === 'rdwc';
  const esSrf = t === 'srf';
  const tit = document.getElementById('torreInteraccionTitulo');
  const modRap = document.getElementById('torreAssignModoRapidoTxt');
  const finHint = document.getElementById('torreAssignFinalizarHint');
  const btnUpd = document.getElementById('btnActualizarInstalacionSistema');
  if (tit) {
    tit.textContent = esNft ? 'Huecos en el montaje NFT'
      : esDwc ? 'Macetas en el DWC' : esRdwc ? 'Módulos en el RDWC' : esSrf ? 'Plantas en la balsa SRF' : 'Cestas en la torre vertical';
  }
  if (btnUpd) {
    btnUpd.textContent = esNft ? '🔄 Actualizar NFT'
      : esDwc ? '🔄 Actualizar DWC' : esRdwc ? '🔄 Actualizar RDWC' : esSrf ? '🔄 Actualizar SRF' : '🔄 Actualizar torre';
  }
  if (modRap) {
    modRap.textContent = esNft
      ? 'Modo rápido: un toque = asignar ese hueco al instante'
      : esDwc
        ? 'Modo rápido: un toque = asignar esa maceta al instante'
        : esRdwc
          ? 'Modo rápido: un toque = asignar ese módulo al instante'
        : esSrf
          ? 'Modo rápido: un toque = asignar esa planta al instante'
        : 'Modo rápido: un toque = asignar esa cesta al instante';
  }
  try {
    sincronizarTorreAssignNftAtajos();
  } catch (_) {}
  if (finHint) {
    finHint.innerHTML = esNft
      ? 'Vuelve a <strong>Editar ficha</strong> y usa <strong>Actualizar NFT</strong> arriba si hace falta.'
      : esDwc
        ? 'Vuelve a <strong>Editar ficha</strong> y usa <strong>Actualizar DWC</strong> arriba si hace falta.'
        : esRdwc
          ? 'Vuelve a <strong>Editar ficha</strong> y usa <strong>Actualizar RDWC</strong> arriba si hace falta.'
        : esSrf
          ? 'Vuelve a <strong>Editar ficha</strong> y usa <strong>Actualizar SRF</strong> arriba si hace falta.'
        : 'Vuelve a <strong>Editar ficha</strong> y usa <strong>Actualizar torre</strong> arriba si hace falta.';
  }
}

function actualizarTorreAssignAyuda() {
  const el = document.getElementById('torreAssignAyuda');
  if (!el) return;
  if (torreInteraccionModo !== 'asignar') {
    el.textContent = '';
    return;
  }
  sincronizarTorreAssignNftAtajos();
  const t = tipoInstalacionNormalizado(state.configTorre);
  const esNft = t === 'nft';
  const esParedIllo =
    esNft &&
    nftDisposicionNormalizada(state.configTorre?.nftDisposicion) === 'pared';
  const esDwc = t === 'dwc';
  const esRdwc = t === 'rdwc';
  if (torreAsignarInstantaneo) {
    el.innerHTML = esNft
      ? 'Cultivo y fecha → <strong>tocar huecos</strong> (o Lista) rellena al momento. Luego <strong>Finalizar asignación</strong>.'
      : esDwc
        ? 'Cultivo y fecha → <strong>tocar macetas</strong> (o Lista) rellena al momento. Luego <strong>Finalizar asignación</strong>.'
        : esRdwc
          ? 'Cultivo y fecha → <strong>tocar módulos</strong> RDWC (o Lista) rellena al momento. Luego <strong>Finalizar asignación</strong>.'
        : 'Cultivo y fecha → <strong>tocar cestas</strong> visibles (gira la torre si hace falta). Luego <strong>Finalizar asignación</strong>.';
  } else {
    el.innerHTML = esNft
      ? esParedIllo
        ? 'Vista ilustrada: <strong>anillo ámbar</strong> al marcar macetas. Usa <strong>Marcar todos</strong>, <strong>Marcar tubo</strong> o <strong>Aplicar a TODO</strong> abajo. Luego <strong>Finalizar asignación</strong>.'
        : 'Marca varios <strong>huecos</strong> (marca ámbar en esquema o lista). <strong>Vuelve a tocar</strong> uno marcado para quitarlo. Luego <strong>Aplicar a selección</strong> → <strong>Finalizar asignación</strong>. También <strong>Limpiar selección</strong>.'
      : esDwc
        ? 'Marca varias <strong>macetas</strong> (marca ámbar). <strong>Vuelve a tocar</strong> una marcada para quitarla. Luego <strong>Aplicar a selección</strong> → <strong>Finalizar asignación</strong>. También <strong>Limpiar selección</strong>.'
        : esRdwc
          ? 'Marca varios <strong>módulos RDWC</strong> (marca ámbar). <strong>Vuelve a tocar</strong> uno marcado para quitarlo. Luego <strong>Aplicar a selección</strong> → <strong>Finalizar asignación</strong>. También <strong>Limpiar selección</strong>.'
        : 'Marca <strong>cestas</strong> (marca ámbar en maqueta o lista). <strong>Vuelve a tocar</strong> una marcada para quitarla. Luego <strong>Aplicar a selección</strong> → <strong>Finalizar asignación</strong>. También <strong>Limpiar selección</strong>.';
  }
}

function tutorialAsignarOcultoPorUsuario() {
  try {
    return localStorage.getItem(TUTORIAL_ASIGNAR_LS) === '1';
  } catch (_) {
    return false;
  }
}

function cerrarTutorialAsignarCultivo(noVolverAMostrar) {
  const ov = document.getElementById('tutorialAsignarOverlay');
  if (ov) {
    a11yDialogClosed(ov);
    if (ov._escHandler) document.removeEventListener('keydown', ov._escHandler);
    ov.remove();
  }
  if (noVolverAMostrar) {
    try {
      localStorage.setItem(TUTORIAL_ASIGNAR_LS, '1');
    } catch (_) {}
  }
}

/** Tutorial la primera vez (o force:true desde “Ver tutorial”) */
function abrirTutorialAsignarCultivo(opts) {
  const force = opts && opts.force === true;
  if (!force && tutorialAsignarOcultoPorUsuario()) return;
  const exist = document.getElementById('tutorialAsignarOverlay');
  if (exist) {
    if (force) cerrarTutorialAsignarCultivo(false);
    else return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'tutorialAsignarOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tutorialAsignarTitulo');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10050',
    'background:rgba(15,23,42,0.72)', 'display:flex',
    'align-items:flex-end', 'justify-content:center',
    'padding:16px', 'padding-bottom:max(16px,env(safe-area-inset-bottom))',
    'box-sizing:border-box', '-webkit-tap-highlight-color:transparent'
  ].join(';');

  const tTut = tipoInstalacionNormalizado(state.configTorre);
  const esNftTut = tTut === 'nft';
  const esDwcTut = tTut === 'dwc';
  const titTut = esNftTut ? '🪴 Asignar cultivo en NFT'
    : esDwcTut ? '🫧 Asignar cultivo en DWC' : '🌱 Asignar cultivo en torre vertical';
  const subTut = esNftTut
    ? 'Rellena muchos huecos (canales) sin abrir la ficha uno a uno.'
    : esDwcTut
      ? 'Rellena muchas macetas del DWC sin abrir la ficha una por una.'
      : 'En unos segundos llenas muchas cestas sin abrir la ficha una por una.';
  const paso1Tut = esNftTut
    ? '<strong class="tut-strong-green">Elige cultivo y fecha</strong> en los campos de arriba. Sin cultivo, la app te avisará si tocas un hueco.'
    : esDwcTut
      ? '<strong class="tut-strong-green">Elige cultivo y fecha</strong> en los campos de arriba. Sin cultivo, la app te avisará si tocas una maceta.'
      : '<strong class="tut-strong-green">Elige cultivo y fecha</strong> en los campos de arriba. Sin cultivo elegido, la app te avisará si tocas una cesta.';
  const paso2Tut = esNftTut
    ? '<strong class="tut-strong-blue">Todos los huecos del esquema son visibles</strong> (cada canal en su tubo). También puedes usar <strong>Lista</strong>. No hace falta girar la maqueta.'
    : esDwcTut
      ? '<strong class="tut-strong-blue">Las macetas del DWC</strong> aparecen en el esquema y en <strong>Lista</strong>. No hay que girar maqueta como en torre vertical.'
      : '<strong class="tut-strong-blue">Solo cuentan las cestas de cara</strong> (las que ves al frente). <strong>Gira</strong> con el dedo o el botón ⟲ para llegar a las de atrás. Así evitas equivocarte de hueco.';
  const paso3Tut = esNftTut
    ? '<strong class="tut-strong-amber">Por defecto:</strong> toca varios <strong>huecos</strong> (marca ámbar en esquema o Lista). <strong>Otro toque en el mismo hueco</strong> lo quita de la selección. Pulsa <em>Aplicar a selección</em> o <em>Limpiar selección</em>. <strong>Modo rápido:</strong> cada toque asigna un hueco al instante.'
    : esDwcTut
      ? '<strong class="tut-strong-amber">Por defecto:</strong> toca varias <strong>macetas</strong> (marca ámbar). <strong>Otro toque</strong> en una marcada la quita. Pulsa <em>Aplicar a selección</em> o <em>Limpiar selección</em>. <strong>Modo rápido:</strong> cada toque asigna una maceta al instante.'
      : '<strong class="tut-strong-amber">Por defecto:</strong> toca varias cestas (marca ámbar en maqueta o Lista). <strong>Otro toque</strong> en una marcada la quita. Pulsa <em>Aplicar a selección</em> o <em>Limpiar selección</em>. <strong>Marca «Modo rápido»</strong> si prefieres que <strong>cada toque</strong> asigne de inmediato una sola cesta.';
  const paso4Tut = esNftTut
    ? 'Para <strong>fotos, notas o vaciar</strong> un hueco, vuelve a <strong>Editar ficha</strong> y tócalo en el esquema o en Lista.'
    : esDwcTut
      ? 'Para <strong>fotos, notas o vaciar</strong> una maceta, vuelve a <strong>Editar ficha</strong> y tócala en el esquema o en Lista.'
      : 'Para <strong>fotos, notas o vaciar</strong> una cesta, vuelve a <strong>Editar ficha</strong> y tócala.';

  overlay.innerHTML =
    '<div class="tut-sheet">' +
      '<div class="tut-handle"></div>' +
      '<div class="tut-head">' +
        '<div id="tutorialAsignarTitulo" class="tut-title">' + titTut + '</div>' +
        '<div class="tut-sub">' + subTut + '</div>' +
      '</div>' +
      '<div class="tut-steps">' +
        '<div class="tut-step-row tut-step-row--green">' +
          '<span class="tut-step-num">1</span>' +
          '<div class="tut-step-body">' + paso1Tut + '</div></div>' +
        '<div class="tut-step-row tut-step-row--blue">' +
          '<span class="tut-step-num">2</span>' +
          '<div class="tut-step-body">' + paso2Tut + '</div></div>' +
        '<div class="tut-step-row tut-step-row--amber">' +
          '<span class="tut-step-num">3</span>' +
          '<div class="tut-step-body">' + paso3Tut + '</div></div>' +
        '<div class="tut-step-row tut-step-row--muted">' +
          '<span class="tut-step-num">4</span>' +
          '<div class="tut-step-body">' + paso4Tut + '</div></div>' +
      '</div>' +
      '<div class="tut-foot">' +
        '<label class="tut-label-check">' +
          '<input type="checkbox" id="tutorialAsignarNoMas" class="tut-input-check">' +
          'No volver a mostrar este tutorial automáticamente</label>' +
        '<button type="button" id="tutorialAsignarBtnOk" class="btn btn-primary tut-btn-sheet-primary">' +
          'Entendido, empezar</button>' +
        '<button type="button" id="tutorialAsignarBtnSoloCerrar" class="tut-btn-sheet-ghost">' +
          'Cerrar</button>' +
      '</div>' +
    '</div>';

  const stop = (e) => { e.stopPropagation(); };
  overlay.querySelector('div').addEventListener('click', stop);
  overlay.addEventListener('click', () => cerrarTutorialAsignarCultivo(false));

  overlay.querySelector('#tutorialAsignarBtnOk').addEventListener('click', (e) => {
    e.stopPropagation();
    const chk = overlay.querySelector('#tutorialAsignarNoMas');
    cerrarTutorialAsignarCultivo(chk && chk.checked);
    showToast(
      esNftTut
        ? '💡 Cultivo arriba → marca huecos (2.º toque quita) → Aplicar a selección'
        : esDwcTut
          ? '💡 Cultivo arriba → marca macetas (2.º toque quita) → Aplicar a selección'
          : '💡 Cultivo arriba → marca cestas (2.º toque quita) → Aplicar a selección'
    );
  });
  overlay.querySelector('#tutorialAsignarBtnSoloCerrar').addEventListener('click', (e) => {
    e.stopPropagation();
    cerrarTutorialAsignarCultivo(false);
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') cerrarTutorialAsignarCultivo(false);
  };
  overlay._escHandler = escHandler;
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
}

function actualizarTorreEditarAyuda() {
  const el = document.getElementById('torreEditarAyuda');
  if (!el) return;
  if (torreInteraccionModo !== 'editar') {
    el.textContent = '';
    return;
  }
  if (state.configTorre?.tipoInstalacion === 'nft') {
    el.innerHTML =
      'Con <strong>Editar ficha</strong>, toca un <strong>hueco</strong> en el esquema NFT o en <strong>Lista</strong> para abrir la ficha (variedad, fecha, fotos y notas).';
    return;
  }
  if (state.configTorre?.tipoInstalacion === 'dwc') {
    el.innerHTML =
      'Con <strong>Editar ficha</strong>, toca una <strong>maceta</strong> en el esquema DWC o en <strong>Lista</strong>: ficha con variedad, fecha, fotos y notas.';
    return;
  }
  el.innerHTML = 'Toca una cesta en el <strong>esquema</strong> (de cara) o usa <strong>Lista</strong> abajo: ficha con variedad, fecha, fotos y notas. Flechas al depósito o desliza para ver el reverso.';
}

function tutorialTorrePestanaCompleta() {
  try {
    return localStorage.getItem(TUTORIAL_TORRE_TAB_LS) === '1';
  } catch (_) {
    return false;
  }
}

function tutorialEditarOcultoPorUsuario() {
  try {
    return localStorage.getItem(TUTORIAL_EDITAR_LS) === '1';
  } catch (_) {
    return false;
  }
}

/** marcarVisto: guarda guía como vista. encadenarEditar: solo con marcarVisto, abre tutorial Editar. */
function cerrarTutorialTorrePestana(marcarVisto, encadenarEditar) {
  const ov = document.getElementById('tutorialTorrePestanaOverlay');
  if (ov) {
    a11yDialogClosed(ov);
    if (ov._escHandler) document.removeEventListener('keydown', ov._escHandler);
    ov.remove();
  }
  if (marcarVisto) {
    try {
      localStorage.setItem(TUTORIAL_TORRE_TAB_LS, '1');
    } catch (_) {}
    if (encadenarEditar === true) {
      setTimeout(() => abrirTutorialEditarCultivo({ force: false }), 420);
    }
  }
}

/** Primera visita a la pestaña Torre (o force: botón «Guía pantalla») */
function abrirTutorialTorrePestanaSiPrimeraVez(opts) {
  const force = opts && opts.force === true;
  if (!force && tutorialTorrePestanaCompleta()) return;
  const old = document.getElementById('tutorialTorrePestanaOverlay');
  if (old) {
    if (force) cerrarTutorialTorrePestana(false, false);
    else return;
  }
  const exist = document.getElementById('tutorialAsignarOverlay') ||
    document.getElementById('tutorialEditarOverlay');
  if (!force && exist) return;

  const overlay = document.createElement('div');
  overlay.id = 'tutorialTorrePestanaOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tutorialTorreTabTitulo');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10070',
    'background:rgba(15,23,42,0.76)', 'display:flex',
    'align-items:flex-end', 'justify-content:center',
    'padding:16px', 'padding-bottom:max(16px,env(safe-area-inset-bottom))',
    'box-sizing:border-box', '-webkit-tap-highlight-color:transparent'
  ].join(';');

  overlay.innerHTML =
    '<div class="tut-sheet tut-sheet--dim">' +
      '<div class="tut-handle"></div>' +
      '<div class="tut-head tut-head--tight">' +
        '<div id="tutorialTorreTabTitulo" class="tut-title tut-title--lg">⚙️ Ayuda de Cultivo e instalación</div>' +
        '<div class="tut-sub tut-sub--mt">Resumen rápido de dónde está cada ajuste importante.</div>' +
      '</div>' +
      '<div class="tut-steps">' +
        '<div class="tut-callout tut-callout--green">' +
          '<strong class="tut-strong-green">Instalación activa</strong> · Arriba eliges el tipo de montaje (Torre/NFT/DWC), cambias nombre y ubicación.</div>' +
        '<div class="tut-callout tut-callout--blue">' +
          '<strong class="tut-strong-blue">Estrategia EC/pH</strong> · En torre: asistente de configuración y checklist de recarga (no en esta pestaña).</div>' +
        '<div class="tut-callout tut-callout--amber">' +
          '<strong class="tut-strong-amber">Montaje por tipo</strong> · Si es NFT o DWC, revisa primero sus bloques de montaje/depósito y guarda.</div>' +
        '<div class="tut-callout tut-callout--muted">' +
          '<strong>Fichas de plantas</strong> · Usa <em>Editar ficha</em> para variedad y fecha por hueco/maceta. Con fechas válidas, el calendario y las recomendaciones por fase serán precisos.</div>' +
      '</div>' +
      '<div class="tut-foot">' +
        '<button type="button" id="tutorialTorreTabOk" class="btn btn-primary tut-btn-sheet-primary">' +
          'Entendido</button>' +
        '<button type="button" id="tutorialTorreTabLuego" class="tut-btn-sheet-ghost">' +
          'Cerrar</button>' +
      '</div></div>';

  const inner = overlay.querySelector('div');
  inner.addEventListener('click', (e) => e.stopPropagation());
  overlay.addEventListener('click', () => cerrarTutorialTorrePestana(false, false));

  overlay.querySelector('#tutorialTorreTabOk').addEventListener('click', (e) => {
    e.stopPropagation();
    cerrarTutorialTorrePestana(true, true);
  });
  overlay.querySelector('#tutorialTorreTabLuego').addEventListener('click', (e) => {
    e.stopPropagation();
    cerrarTutorialTorrePestana(true, false);
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') cerrarTutorialTorrePestana(false, false);
  };
  overlay._escHandler = escHandler;
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
}

function cerrarTutorialEditarCultivo(noVolverAMostrar) {
  const ov = document.getElementById('tutorialEditarOverlay');
  if (ov) {
    a11yDialogClosed(ov);
    if (ov._escHandler) document.removeEventListener('keydown', ov._escHandler);
    ov.remove();
  }
  if (noVolverAMostrar) {
    try {
      localStorage.setItem(TUTORIAL_EDITAR_LS, '1');
    } catch (_) {}
  }
}

function abrirTutorialEditarCultivo(opts) {
  const force = opts && opts.force === true;
  if (!force && tutorialEditarOcultoPorUsuario()) return;
  const ex = document.getElementById('tutorialEditarOverlay');
  if (ex) {
    if (force) cerrarTutorialEditarCultivo(false);
    else return;
  }
  if (document.getElementById('tutorialTorrePestanaOverlay') && !force) return;

  const overlay = document.createElement('div');
  overlay.id = 'tutorialEditarOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tutorialEditarTitulo');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10060',
    'background:rgba(15,23,42,0.72)', 'display:flex',
    'align-items:flex-end', 'justify-content:center',
    'padding:16px', 'padding-bottom:max(16px,env(safe-area-inset-bottom))',
    'box-sizing:border-box', '-webkit-tap-highlight-color:transparent'
  ].join(';');

  const tEd = tipoInstalacionNormalizado(state.configTorre);
  const esNftEd = tEd === 'nft';
  const esDwcEd = tEd === 'dwc';
  const titEd = esNftEd ? '✏️ Editar ficha de un hueco NFT'
    : esDwcEd ? '✏️ Editar ficha de una maceta DWC' : '✏️ Editar ficha de una cesta';
  const paso1Ed = esNftEd
    ? 'Activa <strong class="tut-strong-blue">Editar ficha</strong> (arriba). Toca un <strong>hueco</strong> en el esquema o en Lista para abrir el panel completo.'
    : esDwcEd
      ? 'Activa <strong class="tut-strong-blue">Editar ficha</strong> (arriba). Toca una <strong>maceta</strong> en el esquema DWC o en Lista para abrir el panel completo.'
      : 'Activa <strong class="tut-strong-blue">Editar ficha</strong> (arriba). Así cada toque abre el panel con todos los datos de esa cesta.';
  const paso3Ed = esNftEd
    ? '<strong class="tut-strong-amber">Fotos y notas</strong> quedan guardadas con el hueco. Mantén pulsado un hueco en el esquema para un resumen rápido.'
    : esDwcEd
      ? '<strong class="tut-strong-amber">Fotos y notas</strong> quedan guardadas con la maceta. Mantén pulsada una maceta para un resumen rápido.'
      : '<strong class="tut-strong-amber">Fotos y notas</strong> quedan guardadas con la planta. Mantén pulsada una cesta para ver un resumen rápido.';
  const paso4Ed = esNftEd
    ? 'En NFT <strong>todos los huecos</strong> del dibujo responden al toque; no hace falta girar la maqueta.'
    : esDwcEd
      ? 'En DWC <strong>todas las macetas</strong> del esquema responden al toque; revisa también <strong>Lista</strong> si prefieres lista lineal.'
      : 'Solo responden las cestas de <strong>cara</strong>. <strong>Gira</strong> con las flechas al depósito o deslizando. El gesto de giro no pisa el toque en una cesta.';

  overlay.innerHTML =
    '<div class="tut-sheet">' +
      '<div class="tut-handle"></div>' +
      '<div class="tut-head">' +
        '<div id="tutorialEditarTitulo" class="tut-title">' + titEd + '</div>' +
        '<div class="tut-sub">Ideal para afinar una planta o añadir fotos y notas.</div>' +
      '</div>' +
      '<div class="tut-steps">' +
        '<div class="tut-step-row tut-step-row--blue">' +
          '<span class="tut-step-num">1</span>' +
          '<div class="tut-step-body">' + paso1Ed + '</div></div>' +
        '<div class="tut-step-row tut-step-row--green">' +
          '<span class="tut-step-num">2</span>' +
          '<div class="tut-step-body"><strong class="tut-strong-green">Variedad y fecha</strong> ' +
          'definen el seguimiento y el diario fotográfico. Puedes vaciar o <strong>cosechar y registrar</strong> desde la misma ficha.</div></div>' +
        '<div class="tut-step-row tut-step-row--amber">' +
          '<span class="tut-step-num">3</span>' +
          '<div class="tut-step-body">' + paso3Ed + '</div></div>' +
        '<div class="tut-step-row tut-step-row--muted">' +
          '<span class="tut-step-num">4</span>' +
          '<div class="tut-step-body">' + paso4Ed + '</div></div>' +
      '</div>' +
      '<div class="tut-foot">' +
        '<label class="tut-label-check">' +
          '<input type="checkbox" id="tutorialEditarNoMas" class="tut-input-check tut-input-check--blue">' +
          'No volver a mostrar este tutorial automáticamente</label>' +
        '<button type="button" id="tutorialEditarBtnOk" class="btn btn-primary tut-btn-sheet-primary tut-btn-sheet-primary--blue">' +
          'Listo</button>' +
        '<button type="button" id="tutorialEditarBtnCerrar" class="tut-btn-sheet-ghost">' +
          'Cerrar</button>' +
      '</div></div>';

  const stop = (e) => { e.stopPropagation(); };
  overlay.querySelector('div').addEventListener('click', stop);
  overlay.addEventListener('click', () => cerrarTutorialEditarCultivo(false));

  overlay.querySelector('#tutorialEditarBtnOk').addEventListener('click', (e) => {
    e.stopPropagation();
    const chk = overlay.querySelector('#tutorialEditarNoMas');
    cerrarTutorialEditarCultivo(chk && chk.checked);
    showToast(esNftEd ? '💡 Toca un hueco en el esquema o Lista para abrir su ficha' : '💡 Toca una cesta para abrir su ficha');
  });
  overlay.querySelector('#tutorialEditarBtnCerrar').addEventListener('click', (e) => {
    e.stopPropagation();
    cerrarTutorialEditarCultivo(false);
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') cerrarTutorialEditarCultivo(false);
  };
  overlay._escHandler = escHandler;
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
}

function setTorreInteraccionModo(m, opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  torreInteraccionModo = m;
  const edEx = document.getElementById('torreEditarExtra');
  if (edEx) edEx.style.display = m === 'editar' ? 'block' : 'none';
  const bE = document.getElementById('torreModoEditar');
  const bA = document.getElementById('torreModoAsignar');
  const p  = document.getElementById('torreAssignPanel');
  if (bE) {
    bE.classList.toggle('active', m === 'editar');
    bE.setAttribute('aria-pressed', m === 'editar' ? 'true' : 'false');
  }
  if (bA) {
    bA.classList.toggle('active', m === 'asignar');
    bA.setAttribute('aria-pressed', m === 'asignar' ? 'true' : 'false');
  }
  if (p) p.style.display = m === 'asignar' ? 'block' : 'none';
  if (m === 'editar') {
    torreCestasMultiSel.clear();
  } else {
    poblarTorreAssignSelect();
    const fd = document.getElementById('torreAssignFecha');
    if (fd && !fd.value) fd.value = new Date().toISOString().slice(0, 10);
    const inst = document.getElementById('torreAssignInstant');
    if (inst) inst.checked = torreAsignarInstantaneo;
    if (typeof onTorreAssignOrigenChange === 'function') onTorreAssignOrigenChange();
  }
  actualizarTorreAssignAyuda();
  actualizarTorreEditarAyuda();
  actualizarBarraMultiSel();
  sincronizarTorreAssignNftAtajos();
  renderTorre();
  const skipTut = o.skipTutorial === true || o.desdePostSetup === true;
  if (m === 'asignar' && !skipTut) {
    setTimeout(() => abrirTutorialAsignarCultivo({ force: false }), 320);
  }
}

function sincronizarTorreAssignNftAtajos() {
  const box = document.getElementById('torreAssignNftAtajos');
  if (!box) return;
  const esNft = tipoInstalacionNormalizado(state.configTorre) === 'nft';
  const asignar = torreInteraccionModo === 'asignar';
  box.classList.toggle('setup-hidden', !(esNft && asignar));
  const sel = document.getElementById('torreAssignNftTuboSel');
  if (!sel || !esNft) return;
  const hyd =
    typeof getNftHidraulicaDesdeConfig === 'function'
      ? getNftHidraulicaDesdeConfig(state.configTorre || {})
      : { nCh: state.configTorre?.numNiveles || 1 };
  const nCh = Math.max(1, hyd.nCh || 1);
  const prev = sel.value;
  sel.innerHTML = '';
  for (let i = 0; i < nCh; i++) {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = 'Tubo ' + (i + 1);
    sel.appendChild(o);
  }
  if (prev !== '' && parseInt(prev, 10) < nCh) sel.value = prev;
}

function nftAsignarSeleccionarTodosHuecos() {
  if (torreInteraccionModo !== 'asignar') return;
  const cfg = state.configTorre || {};
  if (tipoInstalacionNormalizado(cfg) !== 'nft') return;
  const hyd = typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 1 };
  const hx = Math.max(1, parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? 1), 10) || 1);
  torreAsignarInstantaneo = false;
  const inst = document.getElementById('torreAssignInstant');
  if (inst) inst.checked = false;
  torreCestasMultiSel.clear();
  for (let i = 0; i < hyd.nCh; i++) {
    for (let j = 0; j < hx; j++) torreCestasMultiSel.add(i + ',' + j);
  }
  actualizarBarraMultiSel();
  actualizarTorreAssignAyuda();
  renderTorre();
  showToast('Marcados todos los huecos (' + torreCestasMultiSel.size + '). Pulsa Aplicar a selección.');
}

function nftAsignarSeleccionarTuboDesdeSelect() {
  const sel = document.getElementById('torreAssignNftTuboSel');
  if (!sel) return;
  nftAsignarSeleccionarTubo(parseInt(sel.value, 10));
}

function nftAsignarSeleccionarTubo(tuboIndex) {
  if (torreInteraccionModo !== 'asignar') return;
  const cfg = state.configTorre || {};
  if (tipoInstalacionNormalizado(cfg) !== 'nft') return;
  const ti = parseInt(String(tuboIndex), 10);
  if (!Number.isFinite(ti) || ti < 0) return;
  const hyd = typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 1 };
  if (ti >= hyd.nCh) {
    showToast('Tubo no válido', true);
    return;
  }
  const hx = Math.max(1, parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? 1), 10) || 1);
  torreAsignarInstantaneo = false;
  const inst = document.getElementById('torreAssignInstant');
  if (inst) inst.checked = false;
  torreCestasMultiSel.clear();
  for (let j = 0; j < hx; j++) torreCestasMultiSel.add(ti + ',' + j);
  actualizarBarraMultiSel();
  actualizarTorreAssignAyuda();
  renderTorre();
  showToast('Marcado tubo ' + (ti + 1) + ' (' + hx + ' huecos). Pulsa Aplicar a selección.');
}

function aplicarCultivoATodosLosHuecosNft() {
  if (torreInteraccionModo !== 'asignar') return;
  const cfg = state.configTorre || {};
  if (tipoInstalacionNormalizado(cfg) !== 'nft') return;
  const v = document.getElementById('torreAssignVariedad')?.value?.trim();
  if (!v) {
    showToast('Elige primero el cultivo en la lista de arriba', true);
    return;
  }
  const hyd = typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 1 };
  const hx = Math.max(1, parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? 1), 10) || 1);
  let n = 0;
  for (let i = 0; i < hyd.nCh; i++) {
    for (let j = 0; j < hx; j++) {
      aplicarCultivoACestaUna(i, j, v);
      n++;
    }
  }
  torreCestasMultiSel.clear();
  saveState();
  renderTorre();
  updateTorreStats();
  calcularRotacion();
  setTimeout(renderCompatGrid, 50);
  try {
    if (typeof hcNotificarCambioCultivoSistema === 'function') hcNotificarCambioCultivoSistema();
  } catch (_) {}
  actualizarBarraMultiSel();
  showToast(
    '🌱 ' + cultivoNombreLista(getCultivoDB(v), v) + ' en los ' + n + ' huecos (todos los tubos)'
  );
}

function aplicarCultivoACestaUna(n, c, variedad) {
  if (!state.torre[n] || !state.torre[n][c]) return;
  const row = state.torre[n][c];
  const fechaInp = document.getElementById('torreAssignFecha')?.value?.trim();
  const hoy = new Date().toISOString().slice(0, 10);
  row.variedad = variedad;
  row.fecha = fechaInp || row.fecha || hoy;
  if (!Array.isArray(row.fotos)) row.fotos = [];
  if (!Array.isArray(row.fotoKeys)) row.fotoKeys = [];
  const orSel = document.getElementById('torreAssignOrigen');
  row.origenPlanta =
    typeof normalizarOrigenPlanta === 'function' && orSel
      ? normalizarOrigenPlanta(orSel.value)
      : '';
}

function aplicarCultivoSeleccionMultiple() {
  const v = document.getElementById('torreAssignVariedad')?.value?.trim();
  if (!v) {
    showToast('Selecciona un cultivo en la lista', true);
    return;
  }
  if (torreCestasMultiSel.size === 0) {
    const t = tipoInstalacionNormalizado(state.configTorre);
    const msgSel = t === 'nft'
      ? 'Toca huecos en el esquema NFT o en Lista para seleccionarlos (modo varias)'
      : t === 'dwc'
        ? 'Toca macetas en el esquema DWC o en Lista para seleccionarlas (modo varias)'
        : 'Toca cestas en la torre vertical o en Lista para seleccionarlas (modo varias)';
    showToast(msgSel, true);
    return;
  }
  const nAplicar = torreCestasMultiSel.size;
  torreCestasMultiSel.forEach(key => {
    const [ns, cs] = key.split(',');
    aplicarCultivoACestaUna(parseInt(ns, 10), parseInt(cs, 10), v);
  });
  torreCestasMultiSel.clear();
  saveState();
  renderTorre();
  updateTorreStats();
  calcularRotacion();
  setTimeout(renderCompatGrid, 50);
  try {
    if (typeof hcNotificarCambioCultivoSistema === 'function') hcNotificarCambioCultivoSistema();
  } catch (_) {}
  actualizarBarraMultiSel();
  const tA = tipoInstalacionNormalizado(state.configTorre);
  const uHueco = tA === 'nft' ? ' hueco' : tA === 'dwc' ? ' maceta' : ' cesta';
  const uHuecos = tA === 'nft' ? ' huecos' : tA === 'dwc' ? ' macetas' : ' cestas';
  showToast('🌱 ' + cultivoNombreLista(getCultivoDB(v), v) + ' aplicado a ' + nAplicar + (nAplicar === 1 ? uHueco : uHuecos));
}

function limpiarSeleccionCestas() {
  torreCestasMultiSel.clear();
  actualizarBarraMultiSel();
  renderTorre();
}

/** Tras asignar cultivos: salir de modo asignar, volver a editar ficha y sincronizar (equivalente a Editar + botón Actualizar *). */
function finalizarAsignacionCultivos() {
  if (torreInteraccionModo !== 'asignar') return;
  torreCestasMultiSel.clear();
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  setTorreInteraccionModo('editar');
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    calcularRiego();
  }
  if (document.getElementById('tab-meteo')?.classList.contains('active')) {
    cargarMeteo();
  }
  if (document.getElementById('tab-calendario')?.classList.contains('active')) {
    renderCalendario();
  }
  const tFin = tipoInstalacionNormalizado(state.configTorre);
  const pieFin = tFin === 'nft' ? 'huecos NFT' : tFin === 'dwc' ? 'macetas DWC' : tFin === 'rdwc' ? 'módulos RDWC' : 'cestas';
  showToast('✅ Asignación finalizada · modo edición (' + pieFin + ')');
  try {
    if (typeof hcNotificarCambioCultivoSistema === 'function') hcNotificarCambioCultivoSistema();
  } catch (_) {}
  try {
    if (
      state &&
      state.hcPostSetupChecklistPendiente &&
      !window._hcPostSetupChecklistPreguntaMostrada &&
      typeof hcPreguntarChecklistPostSetupSiListo === 'function'
    ) {
      setTimeout(() => hcPreguntarChecklistPostSetupSiListo(), 320);
    }
  } catch (_) {}
}

/** Leyendas y botones del bloque esquema: torre vertical ≠ NFT (sin mezclar). */
function actualizarChromePanelEsquemaPorTipo() {
  const cfg = state.configTorre || {};
  const esNft = cfg.tipoInstalacion === 'nft';
  const esDwc = cfg.tipoInstalacion === 'dwc';
  const esRdwc = cfg.tipoInstalacion === 'rdwc';
  const intro = document.getElementById('torreEsquemaSub');
  if (intro) {
    if (esNft) {
      intro.classList.remove('setup-hidden');
      const dN = nftDisposicionNormalizada(cfg.nftDisposicion);
      const dEt =
        dN === 'pared' ? 'pared' : dN === 'escalera' ? 'escalera' : 'mesa';
      intro.innerHTML =
        dN === 'pared'
          ? '<strong>NFT pared</strong> · tubos marrones, <strong>flujo del agua</strong> (línea discontinua) y depósito con aireador. <strong>Toca un hueco</strong> o <strong>Lista</strong>.'
          : '<strong>NFT</strong> · ' +
            dEt +
            '. Agua en <strong>azul discontinuo</strong> (si animaciones activas). <strong>Toca hueco</strong> o <strong>Lista</strong>. Altura al 1.º canal: asistente o montaje arriba.';
    } else if (esDwc) {
      intro.classList.remove('setup-hidden');
      intro.innerHTML =
        '<strong>DWC</strong>: tapa arriba, depósito abajo. <strong>Toca maceta</strong> o usa <strong>Lista</strong>.';
    } else if (esRdwc) {
      intro.innerHTML =
        '<strong>RDWC</strong>: <strong>recirculación continua</strong> (envío/retorno), aireación principal en los <strong>módulos/cubos</strong> y apoyo opcional en el depósito de control. Fase del cultivo <strong>encima</strong> de cada módulo. <strong>Toca módulo</strong> o <strong>Lista</strong>.';
      intro.classList.remove('setup-hidden');
    } else {
      intro.innerHTML = '';
      intro.classList.add('setup-hidden');
    }
  }
  const leg = document.getElementById('torreDiagramLegend');
  if (leg) {
    if (esNft) {
      leg.classList.remove('setup-hidden');
      leg.innerHTML =
        '<span class="k-dep">Depósito</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-niv">Canales</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-ces">Huecos</span>';
    } else if (esDwc) {
      leg.classList.remove('setup-hidden');
      leg.innerHTML =
        '<span class="k-dep">Depósito</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-niv">Filas</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-ces">Macetas</span>' +
        '<span class="k-hint"> · tocar</span>';
    } else if (esRdwc) {
      leg.classList.remove('setup-hidden');
      leg.innerHTML =
        '<span class="k-dep">Depósito control</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-niv">Filas</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-ces">Módulos</span>' +
        '<span class="k-hint"> · tocar</span>';
    } else {
      leg.innerHTML = '';
      leg.classList.add('setup-hidden');
    }
  }
  const animLbl = document.getElementById('torreAnimSuavesLabel');
  if (animLbl) animLbl.style.display = '';
}

function disposeNftThreeIfAny(wrap) {
  if (!wrap || typeof wrap._nftThreeDispose !== 'function') return;
  try {
    wrap._nftThreeDispose();
  } catch (e) {}
  wrap._nftThreeDispose = null;
}


