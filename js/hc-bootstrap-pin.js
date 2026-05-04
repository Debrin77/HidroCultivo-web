/**
 * PIN, sesión y desbloqueo (initApp se invoca en runtime tras cargar init-nav).
 * Tras hc-bootstrap-state.js; antes de onboarding.
 */
// ══════════════════════════════════════════════════
// PIN
// ══════════════════════════════════════════════════
let pinEntry = '';
let appBootstrapped = false;

function getAuthRememberMinutes() {
  try {
    const raw = localStorage.getItem(AUTH_REMEMBER_MIN_KEY);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  } catch (_) {
    return 0;
  }
}

function onAuthRememberChange(v) {
  const n = Math.max(0, Number(v) || 0);
  try {
    localStorage.setItem(AUTH_REMEMBER_MIN_KEY, String(n));
    if (n === 0) localStorage.removeItem(AUTH_TS_KEY);
  } catch (_) {}
  showToast(n === 0 ? 'Autenticación: siempre al abrir' : `Autenticación: recordar ${n} min`);
}

function forzarReautenticacion() {
  try {
    localStorage.removeItem(AUTH_TS_KEY);
  } catch (_) {}
  showToast('Sesión cerrada. Vuelve a autenticarte.');
  setTimeout(() => location.reload(), 250);
}

function toggleSeguridadAccesoInicio() {
  const p = document.getElementById('panelSeguridadAccesoInicio');
  const b = document.getElementById('btnSeguridadAccesoInicio');
  if (!p || !b) return;
  p.classList.toggle('setup-hidden');
  const isOpen = !p.classList.contains('setup-hidden');
  b.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  p.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (isOpen && typeof window.syncHcAppearanceUi === 'function') window.syncHcAppearanceUi();
}

function toggleAvisosTelefonoInicio() {
  const p = document.getElementById('panelNotifPrefsInicio');
  const b = document.getElementById('btnNotifPrefsInicio');
  if (!p || !b) return;
  const expanded = b.getAttribute('aria-expanded') !== 'false';
  p.hidden = expanded;
  b.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  try {
    if (typeof ensureNotifOpciones === 'function') ensureNotifOpciones();
    if (state && state.notifOpciones) {
      state.notifOpciones.panelInicioColapsado = !!expanded;
      if (typeof saveState === 'function') saveState();
    }
  } catch (_) {}
}

function hasValidAuthSession() {
  try {
    const rememberMin = getAuthRememberMinutes();
    if (rememberMin <= 0) return false;
    const authTs = Number(localStorage.getItem(AUTH_TS_KEY) || 0);
    if (!Number.isFinite(authTs) || authTs <= 0) return false;
    const maxAge = rememberMin * 60 * 1000;
    return (Date.now() - authTs) < maxAge;
  } catch (_) {
    return false;
  }
}

function unlockAndInitApp() {
  if (appBootstrapped) return;
  const pinEl = document.getElementById('pinScreen');
  const appEl = document.getElementById('app');
  try {
    a11yDetachFocusTrap(pinEl);
    if (appEl) appEl.inert = false;
    if (pinEl) pinEl.style.display = 'none';
    if (getAuthRememberMinutes() > 0) localStorage.setItem(AUTH_TS_KEY, String(Date.now()));
    else localStorage.removeItem(AUTH_TS_KEY);
    initApp();
    appBootstrapped = true;
  } catch (e) {
    console.error('Error inicializando app tras PIN:', e);
    appBootstrapped = false;
    if (appEl) appEl.inert = true;
    if (pinEl) {
      pinEl.style.display = '';
      a11yAttachFocusTrap(pinEl);
    }
    const pinErr = document.getElementById('pinErr');
    if (pinErr) pinErr.textContent = 'No se pudo abrir la app. Reintenta.';
    showToast('Error al iniciar tras PIN. Reintentando…', true);
  }
}

function lockAppWithPin() {
  const appEl = document.getElementById('app');
  const pinEl = document.getElementById('pinScreen');
  const statusEl = document.getElementById('pinAuthStatus');
  if (appEl) appEl.inert = true;
  if (statusEl) statusEl.textContent = '';
  if (pinEl) {
    pinEl.style.display = '';
    a11yAttachFocusTrap(pinEl);
    requestAnimationFrame(() => {
      try { pinEl.focus(); } catch (_) {}
    });
  }
}

async function tryBiometricUnlock() {
  try {
    const cap = window.Capacitor;
    const statusEl = document.getElementById('pinAuthStatus');
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return false;
    const biom = cap.Plugins && cap.Plugins.NativeBiometric;
    if (!biom) return false;

    const availability = await biom.isAvailable();
    if (!availability || !availability.isAvailable) return false;
    if (statusEl) statusEl.textContent = 'Intentando desbloqueo biométrico…';

    await biom.verifyIdentity({
      reason: 'Desbloquear HidroCultivo',
      title: 'Identificación biométrica',
      subtitle: 'Usa la biometría de tu dispositivo',
      description: 'Si cancelas, podrás entrar con PIN',
    });
    return true;
  } catch (_) {
    return false;
  }
}

function pinPress(d) {
  if (pinEntry.length >= 4) return;
  pinEntry += d;
  updatePinDots();
  if (pinEntry.length === 4) setTimeout(checkPin, 180);
}

function pinDel() {
  pinEntry = pinEntry.slice(0, -1);
  updatePinDots();
  document.getElementById('pinErr').textContent = '';
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('d' + i);
    d.className = 'pin-dot' + (i < pinEntry.length ? ' on' : '');
  }
}

function checkPin() {
  if (pinEntry === PIN) {
    pinEntry = '';
    updatePinDots();
    unlockAndInitApp();
  } else {
    for (let i = 0; i < 4; i++) document.getElementById('d' + i).className = 'pin-dot err';
    document.getElementById('pinErr').textContent = 'PIN incorrecto';
    setTimeout(() => { pinEntry = ''; updatePinDots(); document.getElementById('pinErr').textContent = ''; }, 1000);
  }
}

