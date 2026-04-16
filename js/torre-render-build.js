/**
 * Torre: SVG (torre/NFT/DWC), lista, tabla variedades, tutoriales, compatibilidad UI base.
 * Tras nutrientes y módulos setup. Siguiente: torre-render-main.js (renderTorre, gestos, stats).
 */

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
  // Update info
  const m = MODOS_CULTIVO[modo];
  document.getElementById('modoInfoText').textContent =
    `${m.desc} — Editar ficha o asignar cultivo (barra encima del esquema)`;
  renderTorre();
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
  const w = document.getElementById('torreSVGWrap');
  const lv = document.getElementById('torreListaVista');
  const bE = document.getElementById('btnTorreVistaEsquema');
  const bL = document.getElementById('btnTorreVistaLista');
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
  if (bE) {
    bE.classList.toggle('active', !lista);
    bE.setAttribute('aria-pressed', lista ? 'false' : 'true');
  }
  if (bL) {
    bL.classList.toggle('active', lista);
    bL.setAttribute('aria-pressed', lista ? 'true' : 'false');
  }
}

function setTorreVistaModo(modo) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.torreVistaModo = modo === 'lista' ? 'lista' : 'esquema';
  saveState();
  renderTorre();
}

function torreListaColorCesta(n, c) {
  const dat = (state.torre[n] && state.torre[n][c]) ? state.torre[n][c] : { variedad: '', fecha: '' };
  const dias = dat.fecha ? Math.floor((Date.now() - new Date(dat.fecha)) / 86400000) : 0;
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
      const dias = dat.fecha ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000)) : null;
      const sub = dias !== null ? dias + ' d' : 'Sin fecha';
      const emoji = !dat.variedad ? '⚪' : (cult ? cultivoEmoji(cult) : '🌱');
      const faseEst = dat.variedad && dias !== null ? getEstado(dat.variedad, dias) : '';
      const faseLabels = { plantula: 'Plántula', crecimiento: 'Crecimiento', madurez: 'Maduración', cosecha: 'Listo para cosechar' };
      const faseTit = faseEst ? (faseLabels[faseEst] || faseEst) : '';
      const faseEmoji = faseEst ? getEmoji(faseEst) : '';
      const keys = Array.isArray(dat.fotoKeys) ? dat.fotoKeys : [];
      const ultFotoKey = keys.length ? keys[keys.length - 1] : '';
      const fkAttr = ultFotoKey
        ? ' data-foto-key="' + String(ultFotoKey).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"'
        : '';
      let ariaLabel = (esNft ? 'Hueco ' : esDwc ? 'Maceta ' : 'Cesta ') + (c + 1) + ', ' + (dat.variedad ? titLista : tit) + ', ' + sub;
      if (faseTit) ariaLabel += ', fase: ' + faseTit;
      ariaLabel = ariaLabel.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      h += '<button type="button" class="torre-lista-cesta-btn" data-n="' + n + '" data-c="' + c + '" ' +
        'aria-label="' + ariaLabel + '">';
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
    if (!v) {
      showToast('Elige primero el cultivo en la lista de arriba', true);
      return;
    }
    if (torreAsignarInstantaneo) {
      aplicarCultivoACestaUna(n, c, v);
      saveState();
      renderTorre();
      updateTorreStats();
      calcularRotacion();
      setTimeout(renderCompatGrid, 50);
      const cult = getCultivoDB(v);
      mostrarBarraSeleccionCesta(n, c);
      const esNft = state.configTorre?.tipoInstalacion === 'nft';
      showToast(
        'Asignado: ' + cultivoNombreLista(getCultivoDB(v), v) +
        (esNft ? ' · canal ' + (n + 1) + ' · hueco ' + (c + 1) : ' · N' + (n + 1) + ' C' + (c + 1))
      );
    } else {
      const k = n + ',' + c;
      if (torreCestasMultiSel.has(k)) torreCestasMultiSel.delete(k);
      else torreCestasMultiSel.add(k);
      actualizarBarraMultiSel();
      mostrarBarraSeleccionCesta(n, c);
      renderTorre();
    }
  } else {
    mostrarBarraSeleccionCesta(n, c);
    openModal(n, c);
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
    const dias = dat.fecha ? Math.floor((Date.now() - new Date(dat.fecha)) / 86400000) : 0;
    const est  = dat.variedad ? getEstado(dat.variedad, dias) : '';
    const diasT = DIAS_COSECHA[dat.variedad] || 50;
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
  return t !== 'nft' && t !== 'dwc';
}

/**
 * DWC: tapa en vista cenital (rejilla + macetas tocables) y debajo alzado frontal
 * del depósito con solución, calentador y aireador si aplica.
 */
function generarSVGDwc() {
  const cfg = state.configTorre || {};
  const N = Math.max(1, Math.min(12, cfg.numNiveles || window.NUM_NIVELES_ACTIVO || NUM_NIVELES));
  const C = Math.max(1, Math.min(12, cfg.numCestas || window.NUM_CESTAS_ACTIVO || NUM_CESTAS));
  const ta = torreSvgAnimacionesActivas();
  const volMax = getVolumenDepositoMaxLitros(cfg);
  const volTrabajo = getVolumenMezclaLitros(cfg);
  /** Litros mostrados: siempre el volumen de mezcla / trabajo (≤ máx.), no la última medición ni un % fijo del máx. */
  const volEtiqueta = Math.round(volTrabajo * 10) / 10;
  /** Nivel del agua en el dibujo: fracción útil mezcla / capacidad física del depósito. */
  const volPct = Math.min(1, Math.max(0, volTrabajo / Math.max(1, volMax)));
  const tieneDifusor = state.configTorre?.equipamiento?.includes('difusor') ?? true;
  const tieneCalentador = state.configTorre?.equipamiento?.includes('calentador') ?? true;
  const objSpec =
    typeof dwcGetObjetivoSpec === 'function' && typeof dwcGetObjetivoCultivo === 'function'
      ? dwcGetObjetivoSpec(dwcGetObjetivoCultivo(cfg))
      : { label: 'Lechuga final', litrosTxt: '3–5 L/planta', ccTxt: '15–25 cm' };
  const rejModo =
    typeof dwcGetRejillaModoPreferido === 'function'
      ? dwcGetRejillaModoPreferido(cfg)
      : (cfg.dwcRejillaModoPreferido === 'max' ? 'max' : 'objetivo');
  const rejTxt = rejModo === 'max' ? 'principal: máxima geométrica' : 'principal: recomendada por objetivo';
  const recoCultivo =
    typeof dwcRecomendacionCultivoDesdeConfig === 'function'
      ? dwcRecomendacionCultivoDesdeConfig(cfg)
      : '';

  const W = 400;
  const H = 518;

  /* Mismo ancho exterior para tapa (cenital) y depósito (frente), alineados. */
  const blockW = Math.min(320, Math.max(228, 28 + C * 30));
  const planLeft = (W - blockW) / 2;
  const planW = blockW;
  const planTop = 54;
  const planPad = 10;
  const planH = Math.min(200, 28 + N * 30);
  const planInnerX = planLeft + planPad;
  const planInnerY = planTop + planPad;
  const planInnerW = planW - planPad * 2;
  const planInnerH = planH - planPad * 2;
  const cellW = planInnerW / C;
  const cellH = planInnerH / N;
  const Rpot = Math.max(7, Math.min(20, Math.min(cellW, cellH) * 0.38));

  function macetaSvg(n, c, cx, cy, r, topView) {
    const dat =
      state.torre && state.torre[n] && state.torre[n][c]
        ? state.torre[n][c]
        : { variedad: '', fecha: '', fotos: [] };
    const dias = dat.fecha ? Math.floor((Date.now() - new Date(dat.fecha)) / 86400000) : 0;
    const est = dat.variedad ? getEstado(dat.variedad, dias) : '';
    const diasT = DIAS_COSECHA[dat.variedad] || 50;
    const pct = dat.variedad ? Math.min(100, Math.round((dias / diasT) * 100)) : 0;
    let fill, stroke, phaseEmoji;
    if (!dat.variedad) {
      fill = '#f8fafc';
      stroke = '#94a3b8';
      phaseEmoji = '';
    } else if (est === 'plantula') {
      fill = '#eff6ff';
      stroke = '#2563eb';
      phaseEmoji = getEmoji(est);
    } else if (est === 'crecimiento') {
      fill = '#f0fdf4';
      stroke = '#15803d';
      phaseEmoji = getEmoji(est);
    } else if (est === 'madurez') {
      fill = '#fffbeb';
      stroke = '#b45309';
      phaseEmoji = getEmoji(est);
    } else {
      fill = '#faf5ff';
      stroke = '#7c3aed';
      phaseEmoji = getEmoji(est);
    }
    const clipId = `dwc_clip_${n}_${c}`;
    const isSelected = !!(window.editingCesta && editingCesta.nivel === n && editingCesta.cesta === c);
    const multiKey = n + ',' + c;
    const isMultiSel = torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
    const fotos = (dat.fotos || []).filter((f) => f && f.data);
    const ultimaFoto = fotos.length > 0 ? fotos[fotos.length - 1] : null;
    const varTxt = dat.variedad ? String(dat.variedad) : 'vacía';
    const ariaCesta = escAriaAttr(
      `Maceta fila ${n + 1} columna ${c + 1}, ${varTxt}` +
        (dias ? ', día ' + dias + ' de cultivo' : '') +
        '. Pulsa para abrir ficha o asignar cultivo.'
    );

    let o = '';
    if (!topView) {
      o += `<ellipse cx="${cx.toFixed(1)}" cy="${(cy + 4).toFixed(1)}" rx="${(r * 1.08).toFixed(1)}" ry="${(r * 0.55).toFixed(1)}"
        fill="rgba(15,23,42,0.07)" opacity="0.85"/>`;
    } else {
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 2.2).toFixed(1)}" fill="none" stroke="#cbd5e1" stroke-width="1.1" opacity="0.9"/>`;
    }
    o += `<g data-n="${n}" data-c="${c}" class="hc-cesta hc-cesta--interactive dwc-maceta hc-cesta-pe-all" role="button" tabindex="0" aria-label="${ariaCesta}">`;
    o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${topView ? 2 : 2.2}"/>`;
    if (isMultiSel) {
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 5).toFixed(1)}"
        fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-dasharray="4 3" opacity="0.95"/>`;
    }
    if (isSelected) {
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 4).toFixed(1)}"
        fill="none" stroke="#22c55e" stroke-width="2.5" opacity="0.9"/>`;
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 7.5).toFixed(1)}"
        fill="none" stroke="rgba(34,197,94,0.22)" stroke-width="5" opacity="0.85"/>`;
    }
    if (ultimaFoto?.data) {
      o += `<defs><clipPath id="${clipId}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 1.5).toFixed(1)}"/></clipPath></defs>`;
      o += `<image href="${ultimaFoto.data}" x="${(cx - r).toFixed(1)}" y="${(cy - r).toFixed(1)}"
        width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" preserveAspectRatio="xMidYMid slice"
        clip-path="url(#${clipId})" opacity="0.93"></image>`;
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 0.5).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.1"/>`;
    }
    if (pct > 0 && pct < 100) {
      const r2 = r + 5;
      const ang2 = (pct / 100) * 2 * Math.PI - Math.PI / 2;
      const x1e = cx + r2 * Math.cos(-Math.PI / 2);
      const y1e = cy + r2 * Math.sin(-Math.PI / 2);
      const x2e = cx + r2 * Math.cos(ang2);
      const y2e = cy + r2 * Math.sin(ang2);
      o += `<path d="M${x1e.toFixed(1)},${y1e.toFixed(1)} A${r2.toFixed(1)},${r2.toFixed(1)} 0 ${pct > 50 ? 1 : 0},1 ${x2e.toFixed(1)},${y2e.toFixed(1)}"
        fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;
    }
    const emoFs = topView ? Math.min(13, Math.max(8, r * 0.95)) : 14;
    if (phaseEmoji) {
      o += `<text x="${cx.toFixed(1)}" y="${(topView ? cy + 2 : cy - r - 5).toFixed(1)}" font-size="${emoFs}" text-anchor="middle" dominant-baseline="${topView ? 'central' : 'alphabetic'}" opacity="0.95">${phaseEmoji}</text>`;
    } else if (!ultimaFoto?.data) {
      const dotFs = topView ? Math.min(11, r * 0.9) : 11;
      o += `<text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-family="Inconsolata,monospace" font-size="${dotFs}" font-weight="600" text-anchor="middle" fill="#cbd5e1">·</text>`;
    }
    const subFs = topView ? Math.min(7.5, r * 0.55) : 8;
    const subY = topView ? cy + r * 0.85 : cy + r + 12;
    if (dias > 0 && phaseEmoji) {
      o += `<text x="${cx.toFixed(1)}" y="${subY.toFixed(1)}" font-family="Inconsolata,monospace"
        font-size="${subFs}" font-weight="700" fill="${stroke}" text-anchor="middle">${dias}d</text>`;
    } else {
      o += `<text x="${cx.toFixed(1)}" y="${subY.toFixed(1)}" font-family="Inconsolata,monospace"
        font-size="${(subFs - 0.5).toFixed(1)}" fill="#94a3b8" text-anchor="middle">${c + 1}</text>`;
    }
    const notasRaw = state.torre && state.torre[n] && state.torre[n][c] ? state.torre[n][c].notas : '';
    const hasNotas = !!(notasRaw && String(notasRaw).trim().length > 0);
    if (ultimaFoto?.data) {
      o += `<rect x="${(cx - r + 2).toFixed(1)}" y="${(cy - r + 2).toFixed(1)}" width="14" height="10" rx="2"
        fill="#0f172a" opacity="0.88"/><text x="${(cx - r + 9).toFixed(1)}" y="${(cy - r + 10).toFixed(1)}" font-family="Inconsolata,monospace" font-size="7" font-weight="800" text-anchor="middle" fill="#f8fafc">F</text>`;
    }
    if (hasNotas) {
      o += `<rect x="${(cx + r - 16).toFixed(1)}" y="${(cy - r + 2).toFixed(1)}" width="14" height="10" rx="2"
        fill="#334155" opacity="0.9"/><text x="${(cx + r - 9).toFixed(1)}" y="${(cy - r + 10).toFixed(1)}" font-family="Inconsolata,monospace" font-size="7" font-weight="800" text-anchor="middle" fill="#f8fafc">N</text>`;
    }
    if (est === 'cosecha') {
      o += `<circle cx="${(cx + r - 2).toFixed(1)}" cy="${(cy - r + 2).toFixed(1)}" r="5" fill="#7c3aed">${
        ta ? `<animate attributeName="r" values="4;6.5;4" dur="1.5s" repeatCount="indefinite"/>` : ''
      }</circle>`;
      o += `<text x="${(cx + r - 2).toFixed(1)}" y="${(cy - r + 6).toFixed(1)}" font-size="7" text-anchor="middle" fill="white">✓</text>`;
    }
    o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 1.55).toFixed(1)}"
      fill="rgba(0,0,0,0)" stroke="none" pointer-events="all" class="hc-cesta-hit"/>`;
    o += `</g>`;
    return o;
  }

  const planBottom = planTop + planH;
  const tankStartY = planBottom + 48;
  const tankW = blockW;
  const tankH = 108;
  const tankX = planLeft;
  const rimH = 14;
  const innerPad = 10;
  const innerX = tankX + innerPad;
  const innerY = tankStartY + rimH + 4;
  const innerW = tankW - innerPad * 2;
  const innerH = tankH - rimH - 8;
  const waterTopY = innerY + innerH * (1 - volPct);
  const innerBottom = innerY + innerH;

  let s = '';
  s += `<defs>
    <linearGradient id="dwcBgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ecfeff"/><stop offset="55%" stop-color="#f0fdfa"/><stop offset="100%" stop-color="#eff6ff"/>
    </linearGradient>
    <linearGradient id="dwcWaterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.75"/><stop offset="55%" stop-color="#0ea5e9" stop-opacity="0.92"/><stop offset="100%" stop-color="#0369a1" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="dwcTankFace" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e2e8f0"/><stop offset="45%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="dwcLidTop" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8eef4"/>
    </linearGradient>
    <clipPath id="dwcTankInnerClip">
      <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="5"/>
    </clipPath>
  </defs>`;

  s += `<rect width="${W}" height="${H}" fill="url(#dwcBgGrad)"/>`;

  /* ── Tapa vista cenital ── */
  s += `<rect x="${planLeft}" y="${planTop}" width="${planW}" height="${planH}" rx="14" fill="url(#dwcLidTop)" stroke="#64748b" stroke-width="1.5" filter="drop-shadow(0 3px 10px rgba(15,23,42,0.08))"/>`;
  s += `<rect x="${planInnerX}" y="${planInnerY}" width="${planInnerW}" height="${planInnerH}" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>`;
  for (let gi = 1; gi < C; gi++) {
    const x = planInnerX + gi * cellW;
    s += `<line x1="${x.toFixed(1)}" y1="${planInnerY}" x2="${x.toFixed(1)}" y2="${planInnerY + planInnerH}" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  for (let gj = 1; gj < N; gj++) {
    const y = planInnerY + gj * cellH;
    s += `<line x1="${planInnerX}" y1="${y.toFixed(1)}" x2="${planInnerX + planInnerW}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`;
  }

  for (let n = 0; n < N; n++) {
    for (let c = 0; c < C; c++) {
      const cx = planInnerX + (c + 0.5) * cellW;
      const cy = planInnerY + (n + 0.5) * cellH;
      s += macetaSvg(n, c, cx, cy, Rpot, true);
    }
  }

  s += `<text x="${W / 2}" y="${planBottom + 11}" text-anchor="middle" fill="#94a3b8" font-size="7.5" font-weight="600" font-family="Inconsolata,monospace">Misma disposición que Lista (fila 1 arriba)</text>`;

  /* Separador cenital → frontal */
  const sepY = planBottom + 30;
  s += `<text x="${W / 2}" y="${sepY - 5}" text-anchor="middle" fill="#475569" font-size="9.5" font-weight="800" font-family="Syne,sans-serif" letter-spacing="0.04em">PROYECCIÓN FRONTAL · DEPÓSITO</text>`;
  s += `<line x1="36" y1="${sepY}" x2="${W - 36}" y2="${sepY}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="5 4"/>`;

  /* ── Alzado depósito (mismo ancho que tapa) ── */
  const tankFaceInset = 4;
  s += `<rect x="${tankX}" y="${tankStartY}" width="${tankW}" height="${rimH}" rx="5" fill="#f1f5f9" stroke="#64748b" stroke-width="1.3"/>`;
  s += `<rect x="${tankX + tankFaceInset}" y="${tankStartY + rimH - 2}" width="${tankW - tankFaceInset * 2}" height="${tankH - rimH + 6}" rx="10" fill="url(#dwcTankFace)" stroke="#94a3b8" stroke-width="1.2"/>`;
  s += `<rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="5" fill="rgba(255,255,255,0.35)" stroke="none"/>`;

  s += `<g clip-path="url(#dwcTankInnerClip)">`;
  s += `<rect x="${innerX}" y="${innerY}" width="${innerW}" height="${Math.max(0, waterTopY - innerY).toFixed(1)}" fill="#f0f9ff" opacity="0.5"/>`;
  s += `<rect x="${innerX}" y="${waterTopY.toFixed(1)}" width="${innerW}" height="${(innerBottom - waterTopY).toFixed(1)}" fill="url(#dwcWaterGrad)"/>`;
  if (ta) {
    s += `<path d="M ${innerX + 18} ${innerY + innerH * 0.35} Q ${innerX + innerW / 2} ${innerY + innerH * 0.28} ${innerX + innerW - 22} ${innerY + innerH * 0.4}" fill="none" stroke="#bae6fd" stroke-width="1" opacity="0.4">
      <animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.6s" repeatCount="indefinite"/>
    </path>`;
  }
  s += `</g>`;
  s += `<rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="5" fill="none" stroke="#0ea5e9" stroke-width="1.2" opacity="0.35"/>`;

  const hx = innerX + 22;
  const stoneX = innerX + innerW - 32;
  const stoneY = innerBottom - 10;

  if (tieneCalentador) {
    const hTop = innerBottom - 52;
    s += `<rect x="${hx - 5}" y="${hTop}" width="10" height="${innerBottom - hTop - 2}" rx="5" fill="#f97316" stroke="#c2410c" stroke-width="1.1"/>`;
    s += `<circle cx="${hx}" cy="${hTop - 5}" r="4.5" fill="#fbbf24">${ta ? `<animate attributeName="opacity" values="0.55;1;0.55" dur="1.4s" repeatCount="indefinite"/>` : ''}</circle>`;
    s += `<text x="${hx}" y="${innerBottom + 11}" font-family="Inconsolata,monospace" font-size="7" fill="#9a3412" text-anchor="middle" font-weight="800">CAL</text>`;
  }

  if (tieneDifusor) {
    const tubeTop = tankStartY - 4;
    s += `<line x1="${stoneX}" y1="${tubeTop}" x2="${stoneX}" y2="${stoneY - 9}" stroke="#64748b" stroke-width="1.8" stroke-dasharray="4 3"/>`;
    s += `<ellipse cx="${stoneX}" cy="${stoneY}" rx="13" ry="6.5" fill="#9ca3af" stroke="#57534e" stroke-width="1.1"/>`;
    s += `<text x="${stoneX}" y="${innerBottom + 11}" font-family="Inconsolata,monospace" font-size="7" fill="#475569" text-anchor="middle" font-weight="800">AIRE</text>`;
    if (ta) {
      for (let i = 0; i < 8; i++) {
        const dx = (i % 5 - 2) * 4;
        const delay = (i * 0.2).toFixed(2);
        const dur = (1.05 + i * 0.1).toFixed(2);
        const y0 = stoneY - 4;
        const y1 = waterTopY + 8;
        s += `<circle cx="${stoneX + dx}" cy="${y0}" r="${1.4 + (i % 2) * 0.6}" fill="#e0f2fe" opacity="0">
          <animate attributeName="cy" from="${y0}" to="${y1}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="linear"/>
          <animate attributeName="opacity" values="0;0.9;0.9;0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        </circle>`;
      }
    }
  }

  /* Color por litros de mezcla (no por % del máx.): depósito grande + poca mezcla es válido. */
  const volCol = volEtiqueta < 6 ? '#e11d48' : volEtiqueta < 12 ? '#d97706' : '#0284c7';
  s += `<text x="${W / 2}" y="${tankStartY + tankH + 22}" font-family="Syne,sans-serif" font-size="14" font-weight="800" fill="${volCol}" text-anchor="middle">${volEtiqueta} L</text>`;
  const pieVol =
    volTrabajo < volMax - 0.05
      ? `Mezcla objetivo · máx. depósito ${Math.round(volMax * 10) / 10} L`
      : 'Volumen de trabajo · depósito DWC';
  s += `<text x="${W / 2}" y="${tankStartY + tankH + 36}" font-family="Inconsolata,monospace" font-size="8" fill="#64748b" text-anchor="middle">${pieVol}</text>`;

  const pieTxt =
    torreInteraccionModo === 'asignar'
      ? 'Asignar: cultivo arriba · toca macetas en la tapa (vista superior) o Lista'
      : 'Editar: macetas en planta o Lista · Abajo: frente del depósito (ilustrativo)';
  const recoEstado = recoCultivo
    ? (recoCultivo.estado === 'ok' ? 'OK' : recoCultivo.estado === 'warn' ? 'Ajustar' : 'No recomendado')
    : '';
  const pieReco = recoCultivo ? ` · cesta ${recoCultivo.perfil.cestaTxt} · ${recoEstado}` : '';
  s += `<text x="${W / 2}" y="${H - 18}" font-family="Inconsolata,monospace" font-size="7.2" fill="#64748b" text-anchor="middle" font-weight="600">Objetivo ${objSpec.label} · ${rejTxt}${pieReco}</text>`;
  s += `<text x="${W / 2}" y="${H - 7}" font-family="Inconsolata,monospace" font-size="7.5" fill="#94a3b8" text-anchor="middle" font-weight="500">${pieTxt}</text>`;

  const pad = 14;
  const vbW = W + pad * 2;
  const vbH = H + pad * 2;
  return (
    `<svg class="torre-svg-diagram dwc-svg-diagram svg-centered-block" width="${W}" height="${H}" viewBox="${-pad} ${-pad} ${vbW} ${vbH}" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dwcDiagTitle">` +
    `<title id="dwcDiagTitle">DWC: tapa superior ${N} por ${C} macetas; objetivo ${objSpec.label}. ${recoCultivo ? 'Cesta recomendada ' + recoCultivo.perfil.cestaTxt + '.' : ''} Debajo, frente del depósito con solución. Toca una maceta para la ficha.</title>${s}</svg>`
  );
}

function generarSVGTorre() {
  // Usar configuración REAL de la torre activa
  const cfg = state.configTorre || {};
  const numNiveles = cfg.numNiveles || window.NUM_NIVELES_ACTIVO || NUM_NIVELES;
  const nivelesActivos = Array.from({length: numNiveles}, (_, i) => i);
  const rot = (cfg._torreRotRad || 0);

  // ── Dimensiones ───────────────────────────────────────────────────────────
  const SVG_W     = 360;
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

  // Volumen actual del depósito
  const volConfig  = getVolumenDepositoMaxLitros(cfg);
  const volActual  = state.ultimaMedicion?.vol ? parseFloat(state.ultimaMedicion.vol) : volConfig * 0.8;
  const volPct     = Math.min(1, Math.max(0, volActual / volConfig));
  const tieneDifusor   = state.configTorre?.equipamiento?.includes('difusor')   ?? true;
  const tieneCalentador= state.configTorre?.equipamiento?.includes('calentador') ?? true;
  const ta = torreSvgAnimacionesActivas();

  let s = '';

  // ── DEFS (paleta diagrama técnico, baja saturación) ───────────────────────
  s += `<defs>
    <linearGradient id="ejeGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#86efac"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
    <linearGradient id="torreBodyGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e8ebf0"/>
      <stop offset="22%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#dce1e8"/>
      <stop offset="78%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e8ebf0"/>
    </linearGradient>
    <linearGradient id="torreGlowGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#86efac" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#86efac" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="depAguaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="depBodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <clipPath id="depClip">
      <rect x="${DEP_X+3}" y="${DEP_Y+3}" width="${DEP_W-6}" height="${DEP_H-6}" rx="10"/>
    </clipPath>
  </defs>`;

  // ── EJE CENTRAL ───────────────────────────────────────────────────────────
  const ejeTop = MARG_T - 36;
  const ejeBot = DEP_Y + 8;
  s += `<rect x="${CX-EJE_W/2}" y="${ejeTop}" width="${EJE_W}" height="${ejeBot-ejeTop}"
    rx="${EJE_W/2}" fill="url(#ejeGrad)" opacity="0.88"/>`;

  // Agua cayendo (animada si ta)
  s += `<line x1="${CX}" y1="${ejeTop+10}" x2="${CX}" y2="${ejeBot-4}"
    stroke="#0ea5e9" stroke-width="2.25" stroke-dasharray="7 8" stroke-linecap="round" opacity="0.48">
    ${ta ? `<animate attributeName="stroke-dashoffset" from="0" to="34" dur="1s" repeatCount="indefinite" calcMode="linear"/>` : ''}
  </line>`;

  // ── ROCIADOR ──────────────────────────────────────────────────────────────
  s += `<ellipse cx="${CX}" cy="${ejeTop}" rx="24" ry="11"
    fill="#f1f5f9" stroke="#64748b" stroke-width="1.1"/>`;
  s += `<text x="${CX}" y="${ejeTop+4}" font-family="Inconsolata,monospace" font-size="6.5" font-weight="800"
    fill="#64748b" text-anchor="middle" letter-spacing="0.24em">IRR</text>`;
  // Gotas (solo con animación)
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

  // ── NIVELES Y CESTAS ──────────────────────────────────────────────────────
  for (let n = 0; n < numNiveles; n++) {
    const ny     = nivelY(n);
    const activo = nivelesActivos.includes(n);
    const bodyX = CX - TORRE_W / 2;
    const bodyY = ny - (NIVEL_H/2 - 6);
    const bodyH = (NIVEL_H - 12);

    // Cuerpo de cilindro por nivel (modular, queda más “torre redonda”)
    s += `<rect x="${bodyX}" y="${bodyY}" width="${TORRE_W}" height="${bodyH}" rx="18"
      fill="url(#torreBodyGrad)" stroke="#cbd5e1" stroke-width="1" opacity="${activo ? 1 : 0.38}"/>`;
    // Glow suave cuando está activo
    if (activo) {
      s += `<rect x="${bodyX+2}" y="${bodyY+2}" width="${TORRE_W-4}" height="${bodyH-4}" rx="16"
        fill="url(#torreGlowGrad)" opacity="1"/>`;
    }

    // Etiqueta nivel
    s += `<text x="${bodyX-10}" y="${ny+4}" font-family="Syne,sans-serif" font-size="10" font-weight="800"
      fill="${activo ? '#166534' : '#94a3b8'}" text-anchor="end" letter-spacing="0.06em">N${n+1}</text>`;

    if (!activo) continue;

    // Cestas por nivel en <g> propio: al girar solo se actualiza este fragmento (mucho más fluido).
    s += `<g id="hc-baskets-n-${n}">${generarSVGTorreCestasNivelHTML(n, rot)}</g>`;
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

  // Texto volumen: centrado en el agua visible (antes: aguaY-8 pegaba al techo si el depósito iba lleno)
  const aguaBottom = aguaY + aguaH + 7;
  const volTextIdeal = (aguaY + aguaBottom) / 2 + 5;
  const volTextY = Math.max(
    DEP_Y + 16,
    Math.min(DEP_Y + DEP_H - 26, volTextIdeal)
  );
  s += `<text x="${CX}" y="${volTextY}" font-family="Syne,sans-serif"
    font-size="15" font-weight="800" fill="${aguaCol}" text-anchor="middle" letter-spacing="0.02em">${volActual}L</text>`;

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
    s += `<text x="${hx}" y="${DEP_Y+DEP_H-50}" font-family="Inconsolata,monospace" font-size="6.5" text-anchor="middle" fill="#c2410c" font-weight="800" letter-spacing="0.08em">ΔT</text>`;
    s += `<text x="${hx}" y="${DEP_Y+DEP_H+14}" font-family="Inconsolata,monospace"
      font-size="8" fill="#ea580c" text-anchor="middle" font-weight="600">CAL</text>`;
  }

  // ── DIFUSOR DE AIRE ───────────────────────────────────────────────────────
  if (tieneDifusor) {
    const ax  = DEP_X + DEP_W - 28;
    const ay  = DEP_Y + DEP_H - 16; // piedra en el fondo

    // Tubito de aire (desde fuera hasta el fondo)
    s += `<line x1="${ax}" y1="${DEP_Y-8}" x2="${ax}" y2="${ay-10}"
      stroke="#6b7280" stroke-width="1.5" stroke-dasharray="3 2"/>`;

    // Piedra difusora
    s += `<ellipse cx="${ax}" cy="${ay}" rx="12" ry="6"
      fill="#9ca3af" stroke="#6b7280" stroke-width="1.5"/>`;
    s += `<ellipse cx="${ax}" cy="${ay}" rx="10" ry="4" fill="#d1d5db" opacity="0.6"/>`;

    // Burbujas (animadas si ta)
    if (ta) {
      const burbs = [[-8,0], [-3,0], [2,0], [7,0], [-5,0], [4,0]];
      burbs.forEach(([dx], i) => {
        const bx    = ax + dx + (i%3 - 1) * 3;
        const byStart = ay - 5;
        const byEnd   = aguaY - 10;
        const delay   = (i * 0.28).toFixed(2);
        const dur     = (1.2 + i * 0.15).toFixed(2);
        s += `<circle cx="${bx}" cy="${byStart}" r="${1.5 + (i%2)*0.5}" fill="#93c5fd" opacity="0">
          <animate attributeName="cy" from="${byStart}" to="${byEnd}"
            dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="linear"/>
          <animate attributeName="opacity" values="0;0.8;0.8;0"
            dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
          <animate attributeName="r" from="1.5" to="3"
            dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        </circle>`;
      });
    }

    s += `<text x="${ax}" y="${DEP_Y+DEP_H+14}" font-family="Inconsolata,monospace"
      font-size="8" fill="#6b7280" text-anchor="middle" font-weight="600">AIR</text>`;
  }

  s += `<text x="${CX}" y="${DEP_Y+DEP_H-14}" font-family="Inconsolata,monospace"
    font-size="8.5" fill="#64748b" text-anchor="middle" font-weight="600">Riego por ciclos · programador</text>`;

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

  const pieTxt = torreInteraccionModo === 'asignar'
    ? 'Asignar: cultivo arriba → toca cestas (esquema o lista). Flechas al depósito o desliza para el reverso.'
    : 'Editar: cesta en el esquema o en vista lista · Maqueta simplificada, no escala real';
  s += `<text x="${CX}" y="${SVG_H-6}" font-family="Inconsolata,monospace"
    font-size="8" fill="#94a3b8" text-anchor="middle" font-weight="500">${pieTxt}</text>`;

  return `<svg class="torre-svg-diagram svg-centered-block" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}"
    xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
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
      const dias   = c.fecha ? getDias(c.fecha) : null;
      const cultivo = getCultivoDB(c.variedad);
      const diasTotal = cultivo?.dias || 45;
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
      plantas.push({ n, ci, variedad: c.variedad, dias, diasTotal, pct, estado, color,
        fecha: c.fecha || '', ecMin: cultivo?.ecMin, ecMax: cultivo?.ecMax });
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
    '<span>N·C</span><span>Variedad</span><span>Días</span><span>Estado</span><span>EC</span>' +
    '</div>';

  plantas.forEach((p, i) => {
    const rowTone = i % 2 === 0 ? 'torre-prog-row--odd' : 'torre-prog-row--even';
    const diasText = p.dias !== null ? p.dias + '/' + p.diasTotal : '—';
    const ecText   = p.ecMin ? p.ecMin + '-' + p.ecMax : '—';
    const cultRow  = getCultivoDB(p.variedad);

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
        (p.pct !== null ? '<div class="torre-prog-bar-track">' +
          '<div class="torre-prog-bar-fill" style="--tp-bar-w:' + barW + '%;--tp-bar-bg:' + barColor + '"></div>' +
          '</div>' : '') +
        '</div></div></div>' +
      '<span class="torre-prog-dias">' + diasText + '</span>' +
      '<span class="torre-prog-estado" style="--tp-est-c:' + barColor + ';--tp-est-bg:' + barColor + '15">' +
        p.estado + '</span>' +
      '<span class="torre-prog-ec">' + ecText + '</span>' +
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
  cnt.textContent =
    n === 0
      ? (esNft
        ? 'Toca huecos en el esquema NFT o en Lista (anillo ámbar)'
        : esDwc
          ? 'Toca macetas en el esquema DWC o en Lista (anillo ámbar)'
          : 'Toca cestas en la torre vertical o en Lista (anillo ámbar)')
      : n === 1
        ? (esNft ? '1 hueco seleccionado' : esDwc ? '1 maceta seleccionada' : '1 cesta seleccionada')
        : (esNft ? n + ' huecos seleccionados' : esDwc ? n + ' macetas seleccionadas' : n + ' cestas seleccionadas');
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
  const tit = document.getElementById('torreInteraccionTitulo');
  const modRap = document.getElementById('torreAssignModoRapidoTxt');
  const finHint = document.getElementById('torreAssignFinalizarHint');
  const btnUpd = document.getElementById('btnActualizarInstalacionSistema');
  if (tit) {
    tit.textContent = esNft ? 'Huecos en el sistema NFT'
      : esDwc ? 'Macetas en el DWC' : 'Cestas en la torre vertical';
  }
  if (btnUpd) {
    btnUpd.textContent = esNft ? '🔄 Actualizar NFT'
      : esDwc ? '🔄 Actualizar DWC' : '🔄 Actualizar torre';
  }
  if (modRap) {
    modRap.textContent = esNft
      ? 'Modo rápido: un toque = asignar ese hueco al instante'
      : esDwc
        ? 'Modo rápido: un toque = asignar esa maceta al instante'
        : 'Modo rápido: un toque = asignar esa cesta al instante';
  }
  if (finHint) {
    finHint.innerHTML = esNft
      ? 'Cuando termines, pulsa aquí para volver a <strong>Editar ficha</strong> y guardar el NFT (botón <strong>Actualizar NFT</strong> arriba si cambiaste más datos).'
      : esDwc
        ? 'Cuando termines, pulsa aquí para volver a <strong>Editar ficha</strong> y guardar el DWC (botón <strong>Actualizar DWC</strong> arriba si cambiaste más datos).'
        : 'Cuando hayas terminado de colocar cultivos, pulsa aquí para volver a <strong>Editar ficha</strong> y sincronizar la torre (botón <strong>Actualizar torre</strong> arriba si cambiaste más datos).';
  }
}

function actualizarTorreAssignAyuda() {
  const el = document.getElementById('torreAssignAyuda');
  if (!el) return;
  if (torreInteraccionModo !== 'asignar') {
    el.textContent = '';
    return;
  }
  const t = tipoInstalacionNormalizado(state.configTorre);
  const esNft = t === 'nft';
  const esDwc = t === 'dwc';
  if (torreAsignarInstantaneo) {
    el.innerHTML = esNft
      ? 'Elige cultivo y fecha; luego <strong>cada toque en un hueco del esquema</strong> (o en Lista) lo rellena al momento. Al terminar, pulsa <strong>Finalizar asignación</strong>.'
      : esDwc
        ? 'Elige cultivo y fecha; luego <strong>cada toque en una maceta</strong> del esquema (o en Lista) la rellena al momento. Al terminar, pulsa <strong>Finalizar asignación</strong>.'
        : 'Elige cultivo y fecha; luego <strong>cada toque</strong> en una cesta visible la rellena al momento. Gira la torre para la cara trasera. Al terminar, pulsa <strong>Finalizar asignación</strong>.';
  } else {
    el.innerHTML = esNft
      ? 'Elige cultivo y fecha; <strong>toca varios huecos</strong> en el esquema o en Lista (anillo ámbar) y pulsa <strong>Aplicar a selección</strong>. Toca de nuevo uno marcado para quitarlo. Luego <strong>Finalizar asignación</strong>.'
      : esDwc
        ? 'Elige cultivo y fecha; <strong>toca varias macetas</strong> en el esquema o en Lista (anillo ámbar) y pulsa <strong>Aplicar a selección</strong>. Toca de nuevo una marcada para quitarla. Luego <strong>Finalizar asignación</strong>.'
        : 'Elige cultivo y fecha; <strong>toca</strong> varias cestas (anillo ámbar) y pulsa <strong>Aplicar a selección</strong>. Toca de nuevo una marcada para quitarla. Cuando hayas acabado, pulsa <strong>Finalizar asignación</strong>.';
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
    : esDwcTut ? '🌊 Asignar cultivo en DWC' : '🌱 Asignar cultivo en torre vertical';
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
    ? '<strong class="tut-strong-amber">Por defecto:</strong> toca varios <strong>huecos</strong> en el dibujo (anillo ámbar) y pulsa <em>Aplicar a selección</em>. <strong>Modo rápido:</strong> cada toque asigna un hueco al instante.'
    : esDwcTut
      ? '<strong class="tut-strong-amber">Por defecto:</strong> toca varias <strong>macetas</strong> (anillo ámbar) y pulsa <em>Aplicar a selección</em>. <strong>Modo rápido:</strong> cada toque asigna una maceta al instante.'
      : '<strong class="tut-strong-amber">Por defecto:</strong> toca varias cestas (anillo ámbar) y pulsa <em>Aplicar a selección</em>. <strong>Marca «Modo rápido»</strong> si prefieres que <strong>cada toque</strong> asigne de inmediato una sola cesta.';
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
        ? '💡 Elige cultivo arriba, marca huecos en el esquema o Lista y pulsa Aplicar a selección'
        : esDwcTut
          ? '💡 Elige cultivo arriba, marca macetas en el esquema o Lista y pulsa Aplicar a selección'
          : '💡 Elige cultivo arriba, marca cestas y pulsa Aplicar a selección'
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
        '<div id="tutorialTorreTabTitulo" class="tut-title tut-title--lg">🌿 Tu sistema en HidroCultivo</div>' +
        '<div class="tut-sub tut-sub--mt">Guía rápida de esta pantalla.</div>' +
      '</div>' +
      '<div class="tut-steps">' +
        '<div class="tut-callout tut-callout--green">' +
          '<strong class="tut-strong-green">Resumen arriba</strong> · Plantas, días medios y cuántas van para cosecha.</div>' +
        '<div class="tut-callout tut-callout--blue">' +
          '<strong class="tut-strong-blue">Modo de cultivo</strong> (Lechugas, Mixto…) adapta consejos generales; puedes cambiarlo cuando quieras.</div>' +
        '<div class="tut-callout tut-callout--amber">' +
          '<strong class="tut-strong-amber">Huecos del sistema</strong> · <em>Editar ficha</em> = detalle de cada planta. <em>Asignar cultivo</em> = rellenar muchos a la vez (tiene su propio tutorial).</div>' +
        '<div class="tut-callout tut-callout--muted">' +
          '<strong>Esquema</strong> · <strong>Torre vertical</strong>: maqueta con giro y cestas de cara. <strong>NFT</strong>: canales y huecos. <strong>DWC</strong>: tapa y macetas. En todos puedes usar <strong>Lista</strong>. Animaciones fluidas según tipo en la barra inferior.</div>' +
      '</div>' +
      '<div class="tut-foot">' +
        '<button type="button" id="tutorialTorreTabOk" class="btn btn-primary tut-btn-sheet-primary">' +
          'Entendido, continuar</button>' +
        '<button type="button" id="tutorialTorreTabLuego" class="tut-btn-sheet-ghost">' +
          'Ahora no</button>' +
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

function setTorreInteraccionModo(m) {
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
  }
  actualizarTorreAssignAyuda();
  actualizarTorreEditarAyuda();
  actualizarBarraMultiSel();
  renderTorre();
  if (m === 'asignar') {
    setTimeout(() => abrirTutorialAsignarCultivo({ force: false }), 320);
  }
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
  const pieFin = tFin === 'nft' ? 'huecos NFT' : tFin === 'dwc' ? 'macetas DWC' : 'cestas';
  showToast('✅ Asignación finalizada · modo edición (' + pieFin + ')');
}

/** Leyendas y botones del bloque esquema: torre vertical ≠ NFT (sin mezclar). */
function actualizarChromePanelEsquemaPorTipo() {
  const cfg = state.configTorre || {};
  const esNft = cfg.tipoInstalacion === 'nft';
  const esDwc = cfg.tipoInstalacion === 'dwc';
  const intro = document.getElementById('torreEsquemaSub');
  if (intro) {
    if (esNft) {
      const dN = nftDisposicionNormalizada(cfg.nftDisposicion);
      const dTxt =
        dN === 'pared'
          ? '<strong>pared</strong> (tubos horizontales en zigzag). '
          : dN === 'escalera'
            ? '<strong>escalera / inclinado</strong> (peldaños; una o dos caras). '
            : '<strong>mesa</strong> (paralelos o multinivel). ';
      intro.innerHTML =
        '<strong>NFT</strong> · disposición ' +
        dTxt +
        'Esquema <strong>2D</strong>: recorrido del agua en <strong>azul discontinuo</strong> (animado si «Animaciones suaves» está activo). <strong>Toca un hueco</strong> para la ficha. ' +
        'Indica <strong>altura al 1.º canal</strong> en asistente o Sistema para la bomba. ' +
        '<strong>Lista</strong> = acceso lineal (cada fila = un tubo).';
    } else if (esDwc) {
      intro.innerHTML =
        '<strong>DWC</strong> · Arriba la <strong>tapa en vista cenital</strong> (rejilla y macetas); abajo el <strong>frente del depósito</strong> con solución, y calentador/aireador si los tienes. ' +
        'Cada círculo es una maceta (filas × columnas). <strong>Lista</strong> recorre filas y macetas.';
    } else {
      intro.innerHTML =
        '<strong>Esquema simplificado</strong> de tu torre (maqueta, no escala real). ' +
        'Flechas junto al depósito o desliza para girar y ver todas las cestas.';
    }
  }
  const leg = document.getElementById('torreDiagramLegend');
  if (leg) {
    if (esNft) {
      leg.innerHTML =
        '<span class="k-dep">Depósito</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-niv">Canales</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-ces">Huecos</span>';
    } else if (esDwc) {
      leg.innerHTML =
        '<span class="k-dep">Depósito</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-niv">Filas</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-ces">Macetas</span>' +
        '<span class="k-hint"> · tocar</span>';
    } else {
      leg.innerHTML =
        '<span class="k-dep">Depósito</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-niv">Niveles</span>' +
        '<span class="k-sep">·</span>' +
        '<span class="k-ces">Cestas</span>' +
        '<span class="k-hint"> · tocar</span>';
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


