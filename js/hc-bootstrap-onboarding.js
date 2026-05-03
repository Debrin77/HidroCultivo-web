/**
 * Bienvenida, guía primeros pasos y hints de pestaña.
 * Tras hc-bootstrap-pin.js; antes de init/nav.
 */
// ══════════════════════════════════════════════════
// ONBOARDING — guía primer día + hints de contexto (PRP / revelación progresiva)
// ══════════════════════════════════════════════════
const HC_GUIDE_DISMISS_KEY = 'hc_guia_primer_dia_dismiss';
const HC_ONBOARD_RIEGO_VISIT_KEY = 'hc_onboarding_visit_riego';
const HC_HINT_CTX = { mediciones: 'hc_hint_ctx_med', sistema: 'hc_hint_ctx_sis', riego: 'hc_hint_ctx_riego' };
const HC_BIENVENIDA_KEY = 'hc_bienvenida_v2026_1';
const HC_TAB_BAR_COACH_KEY = 'hc_tab_bar_coach_dismiss_v2';
const WELCOME_SLIDE_LAST = 3;

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

function welcomeCarouselGo(i) {
  const ov = document.getElementById('welcomeOverlay');
  if (!ov) return;
  const n = typeof i === 'number' ? i : parseInt(String(i), 10);
  const idx = Math.max(0, Math.min(WELCOME_SLIDE_LAST, Number.isFinite(n) ? n : 0));
  ov.dataset.welcomeSlide = String(idx);
  ov.querySelectorAll('[data-welcome-slide]').forEach((el) => {
    const si = parseInt(el.getAttribute('data-welcome-slide'), 10);
    const on = si === idx;
    el.classList.toggle('is-active', on);
    if (on) {
      el.removeAttribute('hidden');
      el.setAttribute('aria-hidden', 'false');
    } else {
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
    }
  });
  ov.querySelectorAll('[data-welcome-dot]').forEach((d) => {
    const di = parseInt(d.getAttribute('data-welcome-dot'), 10);
    const on = di === idx;
    d.classList.toggle('is-active', on);
    d.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  ov.setAttribute('aria-labelledby', 'welcomeSlideHeading' + idx);
  const nextBtn = document.getElementById('welcomeBtnNext');
  if (nextBtn) {
    if (idx >= WELCOME_SLIDE_LAST) {
      nextBtn.textContent = 'Entendido, empezar';
      nextBtn.setAttribute('aria-label', 'Entendido, empezar y cerrar bienvenida');
    } else {
      nextBtn.textContent = 'Siguiente';
      nextBtn.setAttribute('aria-label', 'Siguiente diapositiva');
    }
  }
}

function welcomeCarouselNext() {
  const ov = document.getElementById('welcomeOverlay');
  const cur = ov ? parseInt(ov.dataset.welcomeSlide || '0', 10) : 0;
  if (cur >= WELCOME_SLIDE_LAST) cerrarBienvenidaPrimeraVez();
  else welcomeCarouselGo(cur + 1);
}

function welcomeCarouselPrev() {
  const ov = document.getElementById('welcomeOverlay');
  const cur = ov ? parseInt(ov.dataset.welcomeSlide || '0', 10) : 0;
  if (cur > 0) welcomeCarouselGo(cur - 1);
}

function welcomeCarouselSkip() {
  cerrarBienvenidaPrimeraVez();
}

function _welcomeCarouselOnKeydown(e) {
  if (!document.body.classList.contains('hc-welcome-open')) return;
  if (e.key === 'ArrowRight') {
    welcomeCarouselNext();
    e.preventDefault();
  } else if (e.key === 'ArrowLeft') {
    welcomeCarouselPrev();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    welcomeCarouselSkip();
    e.preventDefault();
  }
}

function syncGuiaPrimerosPasosPorPestana() {
  const root = document.getElementById('guiaPrimerosPasos');
  if (!root) return;
  const onInicio = currentTab === 'inicio';
  if (!onInicio) {
    root.setAttribute('hidden', '');
    root.setAttribute('aria-hidden', 'true');
  } else {
    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', root.classList.contains('setup-hidden') ? 'true' : 'false');
  }
}

function lanzarSetupOChecklistSiCorresponde() {
  const hayConfig = !!state.configTorre;
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

function mostrarBienvenidaOContinuarArranque() {
  let visto = false;
  try { visto = localStorage.getItem(HC_BIENVENIDA_KEY) === '1'; } catch (_) {}
  if (visto) {
    lanzarSetupOChecklistSiCorresponde();
    scheduleTabBarCoach(1100);
    return;
  }
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.remove('setup-hidden');
    ov.setAttribute('aria-hidden', 'false');
    try { document.body.classList.add('hc-welcome-open'); } catch (_) {}
    try { welcomeCarouselGo(0); } catch (_) {}
    try { document.addEventListener('keydown', _welcomeCarouselOnKeydown); } catch (_) {}
    try {
      const nb = document.getElementById('welcomeBtnNext');
      if (nb && typeof nb.focus === 'function') setTimeout(() => nb.focus(), 50);
    } catch (_) {}
    return;
  }
  lanzarSetupOChecklistSiCorresponde();
}

function cerrarBienvenidaPrimeraVez() {
  try { localStorage.setItem(HC_BIENVENIDA_KEY, '1'); } catch (_) {}
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.add('setup-hidden');
    ov.setAttribute('aria-hidden', 'true');
  }
  try { document.body.classList.remove('hc-welcome-open'); } catch (_) {}
  try { document.removeEventListener('keydown', _welcomeCarouselOnKeydown); } catch (_) {}
  lanzarSetupOChecklistSiCorresponde();
  scheduleTabBarCoach(1300);
}

function dismissGuiaPrimerosPasos() {
  try { localStorage.setItem(HC_GUIDE_DISMISS_KEY, '1'); } catch (_) {}
  const el = document.getElementById('guiaPrimerosPasos');
  if (el) el.classList.add('setup-hidden');
  try { syncGuiaPrimerosPasosPorPestana(); } catch (_) {}
}

function marcarVisitaRiegoOnboarding() {
  try { localStorage.setItem(HC_ONBOARD_RIEGO_VISIT_KEY, '1'); } catch (_) {}
  actualizarGuiaPrimerosPasos();
}

function actualizarGuiaPrimerosPasos() {
  const root = document.getElementById('guiaPrimerosPasos');
  if (!root) return;
  try {
    let dismissed = false;
    try { dismissed = localStorage.getItem(HC_GUIDE_DISMISS_KEY) === '1'; } catch (_) {}
    if (dismissed) {
      root.classList.add('setup-hidden');
      return;
    }
    const hayCfg = !!(state && state.configTorre);
    const hayMed = !!(state && state.ultimaMedicion);
    let visitRiego = false;
    try { visitRiego = localStorage.getItem(HC_ONBOARD_RIEGO_VISIT_KEY) === '1'; } catch (_) {}
    if (hayCfg && hayMed && visitRiego) {
      root.classList.add('setup-hidden');
      return;
    }
    root.classList.remove('setup-hidden');

    const p1 = document.getElementById('guiaPaso1');
    const p2 = document.getElementById('guiaPaso2');
    const p3 = document.getElementById('guiaPaso3');
    if (p1) p1.classList.toggle('hc-guia-step--done', hayCfg);
    if (p2) p2.classList.toggle('hc-guia-step--done', hayMed);
    if (p3) p3.classList.toggle('hc-guia-step--done', visitRiego);

    const b1 = document.getElementById('guiaBtnPaso1');
    if (b1) {
      b1.disabled = hayCfg;
      b1.textContent = hayCfg ? 'Listo' : 'Abrir asistente';
      b1.classList.toggle('btn-primary', !hayCfg);
      b1.classList.toggle('btn-secondary', hayCfg);
    }
    const b2 = document.getElementById('guiaBtnPaso2');
    if (b2) {
      b2.disabled = hayMed;
      b2.textContent = hayMed ? 'Listo' : 'Ir a Medir';
    }
    const b3 = document.getElementById('guiaBtnPaso3');
    if (b3) {
      b3.disabled = visitRiego;
      b3.textContent = visitRiego ? 'Listo' : 'Ir a Riego';
    }
  } finally {
    try { syncGuiaPrimerosPasosPorPestana(); } catch (_) {}
  }
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

