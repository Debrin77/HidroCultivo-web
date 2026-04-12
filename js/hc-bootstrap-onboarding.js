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
  } else if (hayConfig && !state.ultimaRecarga && !state.ultimaMedicion && !hayPlantas) {
    setTimeout(() => abrirChecklist(true), 450);
  }
}

function mostrarBienvenidaOContinuarArranque() {
  let visto = false;
  try { visto = localStorage.getItem(HC_BIENVENIDA_KEY) === '1'; } catch (_) {}
  if (visto) {
    lanzarSetupOChecklistSiCorresponde();
    return;
  }
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.remove('setup-hidden');
    ov.setAttribute('aria-hidden', 'false');
    try { document.body.classList.add('hc-welcome-open'); } catch (_) {}
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
  lanzarSetupOChecklistSiCorresponde();
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

