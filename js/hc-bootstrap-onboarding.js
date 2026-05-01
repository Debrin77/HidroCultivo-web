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
const HC_TUTORIAL_BASICO_KEY = 'hc_tutorial_basico_v1';
const HC_TUTORIAL_BASICO_AUTO_KEY = 'hc_tutorial_basico_auto_v1';
const HC_TUTORIAL_BASICO_PASO_KEY = 'hc_tutorial_basico_paso_v1';
let hcTutorialBasicoPaso = 0;
let hcTutorialBasicoAutoLaunch = false;
const HC_TUTORIAL_BASICO_PASOS = [
  {
    icono: '🏠',
    titulo: 'Inicio y estado general',
    texto: 'Empieza siempre en Inicio: instalación activa, estado operativo y última medición registrada.',
    tab: 'inicio',
    cta: 'Ir a Inicio',
    selector: '#dashTorreBanner',
  },
  {
    icono: '📊',
    titulo: 'Mediciones (tu dato real)',
    texto: 'Aquí registras EC, pH, temperatura y volumen. Es la referencia principal para decidir ajustes.',
    tab: 'mediciones',
    cta: 'Ir a Medir',
    selector: '#inputEC',
  },
  {
    icono: '🌿',
    titulo: 'Sistema (configuración)',
    texto: 'Tipo de instalación, geometría y estrategia de cultivo. Ajusta aquí cuando cambies montaje.',
    tab: 'sistema',
    cta: 'Ir a Sistema',
    selector: '#torreInstalacionPickerBtn',
  },
  {
    icono: '💧',
    titulo: 'Riego y clima (orientativo)',
    texto: 'Usa riego y meteo como guía práctica. Si algo no cuadra, prioriza tus mediciones reales.',
    tab: 'riego',
    cta: 'Ir a Riego',
    selector: '#riegoDiaSelectorGroup',
  },
  {
    icono: '💡',
    titulo: 'Consejos e historial',
    texto: 'Consejos para aprender y aplicar; Historial para ver evolución y decisiones anteriores.',
    tab: 'consejos',
    cta: 'Ir a Consejos',
    selector: '#consejosCats',
  },
];
let hcTutorialHighlightEl = null;

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
  let tutorialVisto = false;
  try { tutorialVisto = localStorage.getItem(HC_TUTORIAL_BASICO_KEY) === '1'; } catch (_) {}
  let autoOn = true;
  try { autoOn = localStorage.getItem(HC_TUTORIAL_BASICO_AUTO_KEY) !== '0'; } catch (_) {}
  if (!tutorialVisto && autoOn) {
    abrirTutorialBasico({ autoLaunch: true });
    return;
  }
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

function renderTutorialBasicoPaso() {
  const pasoNum = document.getElementById('tutorialBasicoPasoNum');
  const icon = document.getElementById('tutorialBasicoIcon');
  const ttl = document.getElementById('tutorialBasicoStepTitle');
  const txt = document.getElementById('tutorialBasicoStepText');
  const prev = document.getElementById('tutorialPrevBtn');
  const next = document.getElementById('tutorialNextBtn');
  const skip = document.getElementById('tutorialSkipBtn');
  const go = document.getElementById('tutorialBasicoGoBtn');
  const done = document.getElementById('tutorialBasicoDoneBtn');
  if (!pasoNum || !icon || !ttl || !txt || !prev || !next || !skip || !go || !done) return;
  const p = HC_TUTORIAL_BASICO_PASOS[hcTutorialBasicoPaso] || HC_TUTORIAL_BASICO_PASOS[0];
  pasoNum.textContent = 'Paso ' + (hcTutorialBasicoPaso + 1) + ' de ' + HC_TUTORIAL_BASICO_PASOS.length;
  icon.textContent = p.icono;
  ttl.textContent = p.titulo;
  txt.textContent = p.texto;
  go.textContent = p.cta || 'Ir';
  prev.disabled = hcTutorialBasicoPaso === 0;
  next.disabled = hcTutorialBasicoPaso >= HC_TUTORIAL_BASICO_PASOS.length - 1;
  skip.disabled = hcTutorialBasicoPaso >= HC_TUTORIAL_BASICO_PASOS.length - 1;
  tutorialBasicoAplicarResaltePasoActual();
}

function abrirTutorialBasico(opts) {
  const ov = document.getElementById('tutorialBasicoOverlay');
  if (!ov) return;
  const o = opts || {};
  hcTutorialBasicoAutoLaunch = o.autoLaunch === true;
  let pasoGuardado = 0;
  try { pasoGuardado = parseInt(localStorage.getItem(HC_TUTORIAL_BASICO_PASO_KEY) || '0', 10); } catch (_) {}
  if (!Number.isFinite(pasoGuardado)) pasoGuardado = 0;
  hcTutorialBasicoPaso = Math.max(0, Math.min(HC_TUTORIAL_BASICO_PASOS.length - 1, pasoGuardado));
  const chk = document.getElementById('tutorialAutoLaunchChk');
  if (chk) {
    let autoOn = true;
    try { autoOn = localStorage.getItem(HC_TUTORIAL_BASICO_AUTO_KEY) !== '0'; } catch (_) {}
    chk.checked = !autoOn;
  }
  renderTutorialBasicoPaso();
  ov.classList.remove('setup-hidden');
  ov.setAttribute('aria-hidden', 'false');
  try { document.body.classList.add('hc-tutorial-open'); } catch (_) {}
}

function cerrarTutorialBasico(completar) {
  const ov = document.getElementById('tutorialBasicoOverlay');
  if (ov) {
    ov.classList.add('setup-hidden');
    ov.setAttribute('aria-hidden', 'true');
  }
  tutorialBasicoQuitarResalte();
  try { document.body.classList.remove('hc-tutorial-open'); } catch (_) {}
  const auto = hcTutorialBasicoAutoLaunch;
  try { localStorage.setItem(HC_TUTORIAL_BASICO_PASO_KEY, String(hcTutorialBasicoPaso)); } catch (_) {}
  if (completar === true || auto) {
    try { localStorage.setItem(HC_TUTORIAL_BASICO_KEY, '1'); } catch (_) {}
  }
  hcTutorialBasicoAutoLaunch = false;
  if (auto) lanzarSetupOChecklistSiCorresponde();
}

function tutorialBasicoNext() {
  if (hcTutorialBasicoPaso >= HC_TUTORIAL_BASICO_PASOS.length - 1) return;
  hcTutorialBasicoPaso += 1;
  try { localStorage.setItem(HC_TUTORIAL_BASICO_PASO_KEY, String(hcTutorialBasicoPaso)); } catch (_) {}
  renderTutorialBasicoPaso();
}

function tutorialBasicoSkip() {
  if (hcTutorialBasicoPaso >= HC_TUTORIAL_BASICO_PASOS.length - 1) return;
  hcTutorialBasicoPaso += 1;
  try { localStorage.setItem(HC_TUTORIAL_BASICO_PASO_KEY, String(hcTutorialBasicoPaso)); } catch (_) {}
  renderTutorialBasicoPaso();
}

function tutorialBasicoPrev() {
  if (hcTutorialBasicoPaso <= 0) return;
  hcTutorialBasicoPaso -= 1;
  try { localStorage.setItem(HC_TUTORIAL_BASICO_PASO_KEY, String(hcTutorialBasicoPaso)); } catch (_) {}
  renderTutorialBasicoPaso();
}

function tutorialBasicoGoTab() {
  const p = HC_TUTORIAL_BASICO_PASOS[hcTutorialBasicoPaso];
  if (!p || !p.tab) return;
  try { goTab(p.tab); } catch (_) {}
  setTimeout(tutorialBasicoAplicarResaltePasoActual, 220);
}

function tutorialBasicoToggleAutoLaunch(disableAuto) {
  try {
    localStorage.setItem(HC_TUTORIAL_BASICO_AUTO_KEY, disableAuto ? '0' : '1');
  } catch (_) {}
}

function reiniciarTutorialBasico() {
  hcTutorialBasicoPaso = 0;
  try { localStorage.setItem(HC_TUTORIAL_BASICO_PASO_KEY, '0'); } catch (_) {}
  try { localStorage.removeItem(HC_TUTORIAL_BASICO_KEY); } catch (_) {}
  try { localStorage.setItem(HC_TUTORIAL_BASICO_AUTO_KEY, '1'); } catch (_) {}
  const chk = document.getElementById('tutorialAutoLaunchChk');
  if (chk) chk.checked = false;
  renderTutorialBasicoPaso();
  showToast('Tutorial reiniciado (paso 1 y auto al iniciar activado).');
}

function tutorialBasicoQuitarResalte() {
  if (hcTutorialHighlightEl) {
    hcTutorialHighlightEl.classList.remove('hc-tutorial-highlight');
    hcTutorialHighlightEl = null;
  }
}

function tutorialBasicoAplicarResaltePasoActual() {
  tutorialBasicoQuitarResalte();
  const p = HC_TUTORIAL_BASICO_PASOS[hcTutorialBasicoPaso];
  if (!p || !p.selector) return;
  const el = document.querySelector(p.selector);
  if (!el) return;
  // Evitar resaltar elementos ocultos (tab no activa o bloque colapsado).
  if (!(el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)) return;
  el.classList.add('hc-tutorial-highlight');
  hcTutorialHighlightEl = el;
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch (_) {}
}

