/**
 * Bienvenida, guía primeros pasos y hints de pestaña.
 * Tras hc-bootstrap-pin.js; antes de init/nav.
 */
// ══════════════════════════════════════════════════
// ONBOARDING — hints de contexto (PRP) + bienvenida + coach barra de pestañas
// ══════════════════════════════════════════════════
const HC_GUIDE_DISMISS_KEY = 'hc_guia_primer_dia_dismiss';
const HC_ONBOARD_RIEGO_VISIT_KEY = 'hc_onboarding_visit_riego';
const HC_HINT_CTX = { mediciones: 'hc_hint_ctx_med', sistema: 'hc_hint_ctx_sis', riego: 'hc_hint_ctx_riego' };
const HC_BIENVENIDA_KEY = 'hc_bienvenida_v2026_4';
const HC_TAB_BAR_COACH_KEY = 'hc_tab_bar_coach_dismiss_v2';
const HC_WELCOME_THEME_PREVIEW_KEY = 'hc_welcome_theme_preview';

let _tabCoachRetryTimer = null;

function _clearTabCoachRetryTimer() {
  if (_tabCoachRetryTimer) {
    try { clearTimeout(_tabCoachRetryTimer); } catch (_) {}
    _tabCoachRetryTimer = null;
  }
}

/**
 * Muestra el coach de la barra de pestañas (fase 2) si no se descartó y no hay bienvenida ni asistente encima.
 */
function tryShowTabBarCoachDeferred(attempt) {
  _tabCoachRetryTimer = null;
  const max = 28;
  const n = typeof attempt === 'number' ? attempt : 0;
  let dismissed = false;
  try { dismissed = localStorage.getItem(HC_TAB_BAR_COACH_KEY) === '1'; } catch (_) {}
  if (dismissed) return;
  if (document.body.classList.contains('hc-welcome-open')) {
    if (n < max) _tabCoachRetryTimer = setTimeout(() => tryShowTabBarCoachDeferred(n + 1), 420);
    return;
  }
  const so = document.getElementById('setupOverlay');
  if (so && so.classList.contains('open')) {
    if (n < max) _tabCoachRetryTimer = setTimeout(() => tryShowTabBarCoachDeferred(n + 1), 420);
    return;
  }
  const el = document.getElementById('hcTabBarCoach');
  if (!el) return;
  el.classList.remove('setup-hidden');
  try { document.body.classList.add('hc-tab-coach-open'); } catch (_) {}
}

function scheduleTabBarCoach(delayMs) {
  let dismissed = false;
  try { dismissed = localStorage.getItem(HC_TAB_BAR_COACH_KEY) === '1'; } catch (_) {}
  if (dismissed) return;
  _clearTabCoachRetryTimer();
  const d = typeof delayMs === 'number' ? delayMs : 900;
  _tabCoachRetryTimer = setTimeout(() => tryShowTabBarCoachDeferred(0), d);
}

function dismissTabBarCoach() {
  try { localStorage.setItem(HC_TAB_BAR_COACH_KEY, '1'); } catch (_) {}
  _clearTabCoachRetryTimer();
  const el = document.getElementById('hcTabBarCoach');
  if (el) el.classList.add('setup-hidden');
  try { document.body.classList.remove('hc-tab-coach-open'); } catch (_) {}
}

function welcomeCarouselSkip() {
  cerrarBienvenidaPrimeraVez();
}

function welcomeEmpezar() {
  cerrarBienvenidaPrimeraVez();
  try {
    if (typeof goTab === 'function') goTab('inicio');
  } catch (_) {}
}

function welcomeAbrirSetup() {
  cerrarBienvenidaPrimeraVez({ skipLanzarSetup: true });
  try {
    setTimeout(() => {
      if (typeof abrirSetup === 'function') abrirSetup();
    }, 450);
  } catch (_) {}
}

function setWelcomeTheme(theme) {
  const ov = document.getElementById('welcomeOverlay');
  if (!ov) return;
  const t = theme === 'dark' ? 'dark' : 'light';
  ov.setAttribute('data-welcome-theme', t);
  const lightBtn = document.getElementById('welcomeThemeBtnLight');
  const darkBtn = document.getElementById('welcomeThemeBtnDark');
  if (lightBtn) {
    const on = t === 'light';
    lightBtn.classList.toggle('is-active', on);
    lightBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (darkBtn) {
    const on = t === 'dark';
    darkBtn.classList.toggle('is-active', on);
    darkBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  try { localStorage.setItem(HC_WELCOME_THEME_PREVIEW_KEY, t); } catch (_) {}
}

function applyWelcomeScrollLock(open) {
  try {
    const v = open ? 'auto' : '';
    const x = open ? 'hidden' : '';
    try {
      document.documentElement.classList.toggle('hc-welcome-open', !!open);
    } catch (_) {}
    document.documentElement.style.overflowY = v;
    document.documentElement.style.overflowX = x;
    document.documentElement.style.overscrollBehaviorY = open ? 'auto' : '';
    document.documentElement.style.overscrollBehaviorX = open ? 'none' : '';
    document.documentElement.style.touchAction = open ? 'pan-y' : '';
    document.body.style.overflowY = v;
    document.body.style.overflowX = x;
    document.body.style.overscrollBehaviorY = open ? 'auto' : '';
    document.body.style.overscrollBehaviorX = open ? 'none' : '';
    document.body.style.touchAction = open ? 'pan-y' : '';
  } catch (_) {}
}

function resetBienvenidaParaPruebas() {
  try { localStorage.removeItem(HC_BIENVENIDA_KEY); } catch (_) {}
  try {
    const ov = document.getElementById('welcomeOverlay');
    if (!ov) {
      if (typeof showToast === 'function') showToast('No se encontró la bienvenida', true);
      return;
    }
    if (!ov.classList.contains('setup-hidden')) {
      if (typeof showToast === 'function') showToast('La bienvenida ya está abierta');
      return;
    }
    // Apertura forzada para pruebas en móvil: evita bloqueos por reglas de "ya hay datos".
    ov.classList.remove('setup-hidden');
    ov.setAttribute('aria-hidden', 'false');
    try {
      const tSaved = localStorage.getItem(HC_WELCOME_THEME_PREVIEW_KEY);
      setWelcomeTheme(tSaved === 'dark' ? 'dark' : 'light');
    } catch (_) {
      setWelcomeTheme('light');
    }
    try { document.body.classList.add('hc-welcome-open'); } catch (_) {}
    applyWelcomeScrollLock(true);
    try { document.addEventListener('keydown', _welcomeGuideOnKeydown); } catch (_) {}
    try {
      const nb = document.getElementById('welcomeBtnEmpezar');
      if (nb && typeof nb.focus === 'function') setTimeout(() => nb.focus(), 50);
    } catch (_) {}
    const abierta = !ov.classList.contains('setup-hidden');
    if (typeof showToast === 'function') {
      showToast(abierta ? 'Guia de bienvenida reabierta' : 'No se pudo reabrir la bienvenida', !abierta);
    }
  } catch (_) {
    if (typeof showToast === 'function') showToast('No se pudo reabrir la bienvenida', true);
  }
}

/**
 * Si ya hay cultivo / mediciones / registro guardados, no forzar la bienvenida:
 * evita bloquear la app cuando falta la clave en localStorage (cambio de navegador, borrado parcial, etc.).
 * No usamos solo `configTorre` con claves: en arranque puede existir un borrador mínimo sin ser “usuario ya configurado”.
 */
function _medicionObjetoTieneDatosReales(u) {
  if (!u || typeof u !== 'object') return false;
  if (String(u.fecha || '').trim()) return true;
  const ec = u.ec;
  const ph = u.ph;
  const vol = u.vol;
  const temp = u.temp;
  const n = v => v != null && v !== '' && Number.isFinite(Number(v));
  if (n(ec) && Number(ec) > 50) return true;
  if (n(ph) && Number(ph) >= 3 && Number(ph) <= 10) return true;
  if (n(vol) && Number(vol) > 0) return true;
  if (n(temp)) return true;
  return false;
}

function hayDatosHidrocultivoRelevantes() {
  try {
    if (!state || typeof state !== 'object') return false;
    const plantilla = !!(state.configTorre && state.configTorre.hcPlantillaAutogenerada);
    if (!plantilla) {
      if (Array.isArray(state.mediciones) && state.mediciones.length > 0) return true;
      if (Array.isArray(state.registro) && state.registro.length > 0) return true;
    }
    if (state.ultimaMedicion && typeof state.ultimaMedicion === 'object') {
      if (_medicionObjetoTieneDatosReales(state.ultimaMedicion)) return true;
    }
    if (state.ultimaRecarga && typeof state.ultimaRecarga === 'object') {
      const r = state.ultimaRecarga;
      if (String(r.fecha || '').trim()) return true;
      if (r.volumen != null && r.volumen !== '' && Number.isFinite(Number(r.volumen)) && Number(r.volumen) > 0) return true;
    }
    if (typeof initTorres === 'function') {
      try { initTorres(); } catch (_) {}
    }
    if (Array.isArray(state.torres)) {
      for (let i = 0; i < state.torres.length; i++) {
        const tor = state.torres[i];
        if (!tor || typeof tor !== 'object') continue;
        if (Array.isArray(tor.mediciones) && tor.mediciones.length) return true;
        if (Array.isArray(tor.registro) && tor.registro.length) return true;
      }
    }
    if (typeof getNivelesActivos === 'function' && state.torre) {
      const nivs = getNivelesActivos();
      for (let ni = 0; ni < nivs.length; ni++) {
        const row = state.torre[nivs[ni]];
        if (row && row.some(c => c && String(c.variedad || '').trim())) return true;
      }
    }
  } catch (_) {}
  return false;
}

function _welcomeGuideOnKeydown(e) {
  if (!document.body.classList.contains('hc-welcome-open')) return;
  if (e.key === 'Escape') {
    welcomeCarouselSkip();
    e.preventDefault();
  }
}

function lanzarSetupOChecklistSiCorresponde() {
  const cfg = state.configTorre;
  const plantilla = !!(cfg && cfg.hcPlantillaAutogenerada);
  const hayConfig = !!(cfg && !plantilla);
  const hayPlantas = getNivelesActivos().some(n =>
    state.torre[n] && state.torre[n].some(c => c.variedad)
  );
  const esPrimeraVez = !hayConfig && !state.ultimaRecarga && !state.ultimaMedicion && !hayPlantas;
  if (esPrimeraVez) {
    setTimeout(() => abrirSetup(), 450);
  }
  // No abrir el checklist automáticamente en cada arranque (molestaba y el modal podía quedar bajo otros velos).
  // Sigue disponible en Inicio → Iniciar recarga e Historial → Checklist.
}

function mostrarBienvenidaOContinuarArranque(opts) {
  const forceShow = !!(opts && opts.forceShow);
  let visto = false;
  try { visto = localStorage.getItem(HC_BIENVENIDA_KEY) === '1'; } catch (_) {}
  if (visto && !forceShow) {
    lanzarSetupOChecklistSiCorresponde();
    scheduleTabBarCoach(1100);
    return;
  }
  if (!forceShow && hayDatosHidrocultivoRelevantes()) {
    try { localStorage.setItem(HC_BIENVENIDA_KEY, '1'); } catch (_) {}
    lanzarSetupOChecklistSiCorresponde();
    scheduleTabBarCoach(1100);
    return;
  }
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.remove('setup-hidden');
    ov.setAttribute('aria-hidden', 'false');
    try { document.body.classList.add('hc-welcome-open'); } catch (_) {}
    applyWelcomeScrollLock(true);
    try {
      const tSaved = localStorage.getItem(HC_WELCOME_THEME_PREVIEW_KEY);
      setWelcomeTheme(tSaved === 'dark' ? 'dark' : 'light');
    } catch (_) {
      setWelcomeTheme('light');
    }
    try { document.addEventListener('keydown', _welcomeGuideOnKeydown); } catch (_) {}
    try {
      const nb = document.getElementById('welcomeBtnEmpezar');
      if (nb && typeof nb.focus === 'function') setTimeout(() => nb.focus(), 50);
    } catch (_) {}
    return;
  }
  lanzarSetupOChecklistSiCorresponde();
}

/**
 * @param {{ skipLanzarSetup?: boolean }} [opts] — si el usuario elige abrir el asistente desde la guía, evitar doble `abrirSetup`.
 */
function cerrarBienvenidaPrimeraVez(opts) {
  const chk = document.getElementById('welcomeChkNoMas');
  const recordarCerrar = !chk || chk.checked;
  if (recordarCerrar) {
    try { localStorage.setItem(HC_BIENVENIDA_KEY, '1'); } catch (_) {}
  }
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.add('setup-hidden');
    ov.setAttribute('aria-hidden', 'true');
  }
  try { document.body.classList.remove('hc-welcome-open'); } catch (_) {}
  applyWelcomeScrollLock(false);
  try { document.removeEventListener('keydown', _welcomeGuideOnKeydown); } catch (_) {}
  if (!opts || !opts.skipLanzarSetup) {
    lanzarSetupOChecklistSiCorresponde();
  }
  scheduleTabBarCoach(1300);
}

function dismissTabContextHint(which) {
  const k = HC_HINT_CTX[which];
  if (k) {
    try { localStorage.setItem(k, '1'); } catch (_) {}
  }
  const id = which === 'mediciones' ? 'tabContextHintMediciones' : which === 'sistema' ? 'tabContextHintSistema' : which === 'riego' ? 'tabContextHintRiego' : null;
  const el = id ? document.getElementById(id) : null;
  if (el) el.classList.add('setup-hidden');
}

function actualizarTabContextHints(tab) {
  const map = {
    mediciones: 'tabContextHintMediciones',
    sistema: 'tabContextHintSistema',
    riego: 'tabContextHintRiego',
  };
  const id = map[tab];
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const key = HC_HINT_CTX[tab];
  let seen = false;
  try { seen = key && localStorage.getItem(key) === '1'; } catch (_) {}
  if (seen) el.classList.add('setup-hidden');
  else el.classList.remove('setup-hidden');
}

function actualizarQuickActionsNoviceMode() {
  const wrap = document.getElementById('quickActionsWrap');
  const more = document.getElementById('quickActionsMore');
  if (!wrap || !more) return;
  const exp = !!(state && state.configTorre && state.ultimaMedicion);
  wrap.classList.toggle('quick-actions-wrap--experienced', exp);
  more.open = exp;
}

