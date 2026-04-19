/**
 * resetApp, initApp, reloj, a11y de diálogos, goTab, irMedirMunicipioClima.
 * Tras onboarding; antes de torre-render-build.js / torre-render-main.js (initApp/goTab en runtime).
 */
// ══════════════════════════════════════════════════
// INIT APP
// ══════════════════════════════════════════════════
function resetApp() {
  if (!confirm('⚠️ ¿Estás seguro? Esta acción borrará TODOS los datos del sistema incluyendo plantas, mediciones y configuración.')) return;
  if (!confirm('⚠️ Segunda confirmación — esta acción NO se puede deshacer. ¿Continuar?')) return;

  // Borrar estado local (incl. sesión PIN para que vuelva a pedirse tras reset)
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('hc_auth');
    localStorage.removeItem(TUTORIAL_ASIGNAR_LS);
    localStorage.removeItem(TUTORIAL_EDITAR_LS);
    localStorage.removeItem(TUTORIAL_TORRE_TAB_LS);
    localStorage.removeItem(TORRE_SWIPE_HINT_LS);
    localStorage.removeItem(HC_GUIDE_DISMISS_KEY);
    localStorage.removeItem(HC_ONBOARD_RIEGO_VISIT_KEY);
    localStorage.removeItem(HC_BIENVENIDA_KEY);
    try {
      Object.values(HC_HINT_CTX).forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    } catch (_) {}
  } catch(e) {}

  // Reiniciar estado
  state = initState();
  modoActual = 'lechuga';
  clEsPrimeraVez = true;

  // Actualizar UI
  renderTorre();
  updateTorreStats();
  updateDashboard();
  initConfigUI();
  goTab('inicio');

  showToast('🔄 Sistema reseteado · el checklist se abre solo desde Inicio o Historial cuando lo necesites');
}

function initApp() {
  updateClock();
  setInterval(updateClock, 30000);
  // Set active modo button
  document.querySelectorAll('.modo-btn').forEach(b => b.classList.remove('active'));
  const modoBtn = document.getElementById('modo-' + modoActual);
  if (modoBtn) modoBtn.classList.add('active');
  const m = MODOS_CULTIVO[modoActual];
  if (m) document.getElementById('modoInfoText').textContent =
    `${m.desc} — Editar ficha o asignar cultivo (barra encima del esquema)`;
  // Multi-instalación antes del primer render (state.torres, nombre en UI, esquema)
  initTorres();
  reconciliarSlotTorreActivaAntesDeCargar();
  cargarEstadoTorre(state.torreActiva || 0);
  renderTorre();
  updateTorreStats();
  updateDashboard();
  initConfigUI();
  setInterval(updateDashboard, 300000);

  actualizarHeaderTorre();
  actualizarVistaRiegoPorTipoInstalacion();

  // Aplicar configuración de torre si existe
  aplicarConfigTorre();
  mostrarBtnNotificaciones();
  setTimeout(programarRecordatorios, 2000);
  setTimeout(() => { void refrescarAvisosMeteoalarmEnSegundoPlano(); }, 4500);
  // Badges DESPUÉS de cargar config y torre
  setTimeout(actualizarBadgesNutriente, 100);

  // Primera vez: bienvenida (una sola) y luego asistente o checklist si aplica
  setTimeout(() => mostrarBienvenidaOContinuarArranque(), 520);
  // Migrar fotos antiguas de localStorage a IndexedDB (solo la primera vez)
  abrirFotoDB().then(() => migrarFotosAIDB()).catch(e => console.warn('Migración IDB:', e));

  if (!window._a11yEscapeBound) {
    window._a11yEscapeBound = true;
    document.addEventListener('keydown', a11yEscapeTopDialog);
  }
  if (typeof initHidroCultivoTabBarA11y === 'function') initHidroCultivoTabBarA11y();
  if (typeof window._hcSyncMainTabTabIndex === 'function') window._hcSyncMainTabTabIndex();
  if (typeof initHistorialTabBarA11y === 'function') initHistorialTabBarA11y();
  if (typeof window._hcSyncHistorialTabTabIndex === 'function') window._hcSyncHistorialTabTabIndex();
}
function updateClock() {
  const now = new Date();
  document.getElementById('headerTime').textContent =
    now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ══════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════
/** Enter/Espacio en elementos role="button" con tabindex */
function a11yKeyActivate(ev, fn) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    if (typeof fn === 'function') fn();
  }
}

const _a11yDialogFocusReturn = [];

/** Misma lista que el foco inicial del diálogo; filtra nodos realmente visibles. */
const A11Y_FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function a11yCollectFocusables(rootEl) {
  if (!rootEl) return [];
  return Array.from(rootEl.querySelectorAll(A11Y_FOCUSABLE_SELECTOR)).filter(node => {
    if (!(node instanceof HTMLElement)) return false;
    if (node.getAttribute('aria-hidden') === 'true') return false;
    const st = getComputedStyle(node);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    const r = node.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  });
}

function a11yAttachFocusTrap(rootEl) {
  if (!rootEl || rootEl._a11yFocusTrapHandler) return;
  const handler = e => {
    if (e.key !== 'Tab') return;
    const list = a11yCollectFocusables(rootEl);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (!rootEl.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
  rootEl._a11yFocusTrapHandler = handler;
  rootEl.addEventListener('keydown', handler, true);
}

function a11yDetachFocusTrap(rootEl) {
  if (!rootEl || !rootEl._a11yFocusTrapHandler) return;
  rootEl.removeEventListener('keydown', rootEl._a11yFocusTrapHandler, true);
  delete rootEl._a11yFocusTrapHandler;
}

function a11yDialogOpened(rootEl) {
  if (!rootEl || rootEl.dataset.a11yFocusPushed) return;
  rootEl.dataset.a11yFocusPushed = '1';
  _a11yDialogFocusReturn.push(document.activeElement);
  a11yAttachFocusTrap(rootEl);
  requestAnimationFrame(() => {
    const list = a11yCollectFocusables(rootEl);
    const node = list[0];
    if (node) node.focus();
  });
}

function a11yDialogClosed(rootEl) {
  if (!rootEl || !rootEl.dataset.a11yFocusPushed) return;
  a11yDetachFocusTrap(rootEl);
  delete rootEl.dataset.a11yFocusPushed;
  const prev = _a11yDialogFocusReturn.pop();
  if (prev && typeof prev.focus === 'function') {
    try { prev.focus(); } catch (e) {}
  }
}

function cerrarModalAgua(ev) {
  const el = document.getElementById('modalAgua');
  if (!el || !el.classList.contains('open')) return;
  if (ev && ev.currentTarget === el && ev.target !== el) return;
  el.classList.remove('open');
  a11yDialogClosed(el);
}

function a11yEscapeTopDialog(ev) {
  if (ev.key !== 'Escape' || ev.defaultPrevented) return;
  const clr = document.getElementById('checklistRutaRecargaOverlay');
  if (clr) {
    ev.preventDefault();
    cerrarOverlayRutaChecklistRecarga();
    return;
  }
  const cld = document.getElementById('checklistDatosInstalacionOverlay');
  if (cld) {
    ev.preventDefault();
    cerrarOverlayChecklistDatosInstalacion();
    return;
  }
  const clTab = document.getElementById('checklistTablaCultivosOverlay');
  if (clTab) {
    ev.preventDefault();
    cerrarOverlayTablaCultivosChecklist();
    return;
  }
  const order = ['modalConsejosTablaPersonal', 'modalOverlay', 'checklistOverlay', 'setupOverlay', 'modalTorres', 'modalAgua'];
  for (const id of order) {
    const el = document.getElementById(id);
    if (el && el.classList.contains('open')) {
      if (id === 'checklistOverlay' && typeof clEsPrimeraVez !== 'undefined' && clEsPrimeraVez) return;
      ev.preventDefault();
      if (id === 'modalConsejosTablaPersonal') {
        cerrarModalConsejosTablaPersonal();
      } else if (id === 'modalOverlay') {
        document.getElementById('modalOverlay').classList.remove('open');
        editingCesta = null;
        a11yDialogClosed(el);
      } else if (id === 'checklistOverlay') {
        cerrarChecklist();
      } else if (id === 'setupOverlay') {
        cerrarSetup();
      } else if (id === 'modalTorres') {
        el.classList.remove('open');
        a11yDialogClosed(el);
      } else if (id === 'modalAgua') {
        cerrarModalAgua();
      }
      return;
    }
  }
}

function activarNotificacionesDesdeInicio(ev) {
  const el = ev.currentTarget;
  pedirPermisoNotificaciones().then(ok => {
    if (ok) {
      showToast('🔔 Notificaciones activadas (recarga, medición, cosecha, MeteoAlarm si afecta a tu zona)');
      el.style.display = 'none';
    } else {
      showToast('Actívalas en Ajustes del navegador', true);
    }
  });
}

/** Centra la pestaña activa en la barra inferior cuando hay scroll horizontal (móviles estrechos). */
function scrollTabBarToActive(btn) {
  if (!btn) return;
  const bar = btn.closest('.tab-bar');
  if (!bar || bar.scrollWidth <= bar.clientWidth + 2) return;
  requestAnimationFrame(() => {
    const instant = typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    btn.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  });
}

function goTab(tab) {
  // Guardar estado torre antes de navegar
  guardarEstadoTorreActual();
  saveState();
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + tab);
  if (panel) {
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
  }
  const activeBtn = document.getElementById('btn-' + tab);
  if (activeBtn) activeBtn.classList.add('active');
  scrollTabBarToActive(activeBtn);
  ['inicio','mediciones','sistema','calendario','riego','meteo','historial','consejos'].forEach(t => {
    const b = document.getElementById('btn-' + t);
    if (b) b.setAttribute('aria-selected', t === tab ? 'true' : 'false');
  });
  currentTab = tab;
  try {
    actualizarTabContextHints(tab);
    if (tab === 'riego') marcarVisitaRiegoOnboarding();
  } catch (_) {}
  if (tab === 'mediciones') { cargarUltimaMedicion(); initConfigUI(); }
  if (tab === 'inicio') updateDashboard();
  if (tab === 'meteo') { cargarMeteo(); window._meteoObsoleto = false; }
  if (tab === 'calendario') { calFecha = new Date(); calDiaSeleccionado = null; renderCalendario(); }
  if (tab === 'sistema') {
    renderTorre();
    renderCompatGrid();
    calcularRotacion();
    setTimeout(() => abrirTutorialTorrePestanaSiPrimeraVez(), 520);
  }
  if (tab === 'historial') { histDatos = null; cargarHistorial(); }
  if (tab === 'consejos') renderConsejos();
  if (tab === 'riego') {
    // Sincronizar inputs con la torre activa y calcular
    sincronizarInputsRiego();
    initDiaRiego();
    actualizarVistaRiegoPorTipoInstalacion();
    try { refreshUbicacionInstalacionUI(); } catch (_) {}
    /* Siempre pedir datos nuevos al abrir la pestaña: el nocturno depende de la serie horaria; sin forceRefresh se reutilizaba caché ~1 min y podía parecer “valor fijo”. */
    calcularRiego({ forceRefresh: true });
    window._riegoObsoleto = false;
  }
  if (typeof window._hcSyncMainTabTabIndex === 'function') window._hcSyncMainTabTabIndex();
  try { syncGuiaPrimerosPasosPorPestana(); } catch (_) {}
}

function irMedirMunicipioClima() {
  goTab('mediciones');
  setTimeout(() => {
    const panel = document.getElementById('panelLocalidadMeteo');
    const inp = document.getElementById('inputLocalidadMeteo');
    try {
      panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      panel?.scrollIntoView();
    }
    try {
      inp?.focus();
    } catch (_) {}
  }, 120);
}


