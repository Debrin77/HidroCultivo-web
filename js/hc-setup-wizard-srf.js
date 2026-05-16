/**
 * SRF / DFT — Sistema de raíz flotante (balsa flotante).
 * Independiente de DWC, NFT, RDWC y torre: solo claves srf*.
 */
const SRF_FORM_IDS_SETUP = [
  'setupSrfCanalLargoCm',
  'setupSrfCanalAnchoCm',
  'setupSrfProfundidadCm',
  'setupSrfNumPlantas',
  'setupSrfFilas',
  'setupSrfOxigenacionModo',
  'setupSrfCirculante',
  'setupSrfRecircLh',
  'setupSrfAirLpm',
  'setupSrfBalsaGrosorMm',
  'setupSrfNetPotMm',
  'setupSrfNetPotHeightMm',
  'setupSrfEspaciamientoCm',
  'setupSrfVolumenManualL',
  'setupSrfVolTrabajoL',
  'setupSrfObjetivoCultivo',
  'setupSrfKratkyGapCm',
];
const SRF_FORM_IDS_SISTEMA = [
  'sysSrfCanalLargoCm',
  'sysSrfCanalAnchoCm',
  'sysSrfProfundidadCm',
  'sysSrfNumPlantas',
  'sysSrfFilas',
  'sysSrfOxigenacionModo',
  'sysSrfCirculante',
  'sysSrfRecircLh',
  'sysSrfAirLpm',
  'sysSrfBalsaGrosorMm',
  'sysSrfNetPotMm',
  'sysSrfNetPotHeightMm',
  'sysSrfEspaciamientoCm',
  'sysSrfVolumenManualL',
  'sysSrfVolTrabajoL',
  'sysSrfObjetivoCultivo',
  'sysSrfKratkyGapCm',
];

function srfNormalizeOxigenacionModo(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'kratky' || v === 'no_circulante' || v === 'aire_camara') return 'kratky';
  return 'aireador';
}

function srfEnsureConfigDefaults(cfg) {
  cfg = cfg || {};
  if (cfg.tipoInstalacion !== 'srf') return cfg;
  if (!Number.isFinite(Number(cfg.srfCanalLargoCm)) || Number(cfg.srfCanalLargoCm) <= 0) cfg.srfCanalLargoCm = 120;
  if (!Number.isFinite(Number(cfg.srfCanalAnchoCm)) || Number(cfg.srfCanalAnchoCm) <= 0) cfg.srfCanalAnchoCm = 60;
  if (!Number.isFinite(Number(cfg.srfProfundidadCm)) || Number(cfg.srfProfundidadCm) <= 0) cfg.srfProfundidadCm = 25;
  if (!Number.isFinite(Number(cfg.srfNumPlantas)) || Number(cfg.srfNumPlantas) < 1) cfg.srfNumPlantas = 8;
  cfg.srfNumPlantas = Math.max(1, Math.min(64, Math.round(Number(cfg.srfNumPlantas))));
  if (!Number.isFinite(Number(cfg.srfFilas)) || Number(cfg.srfFilas) < 1) cfg.srfFilas = 1;
  cfg.srfFilas = Math.max(1, Math.min(8, Math.round(Number(cfg.srfFilas))));
  cfg.srfOxigenacionModo = srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo);
  if (cfg.srfCirculante == null) cfg.srfCirculante = cfg.srfOxigenacionModo !== 'kratky';
  if (!Number.isFinite(Number(cfg.srfBalsaGrosorMm)) || Number(cfg.srfBalsaGrosorMm) <= 0) cfg.srfBalsaGrosorMm = 40;
  if (!Number.isFinite(Number(cfg.srfNetPotMm)) || Number(cfg.srfNetPotMm) <= 0) cfg.srfNetPotMm = 50;
  if (!Number.isFinite(Number(cfg.srfNetPotHeightMm)) || Number(cfg.srfNetPotHeightMm) <= 0) cfg.srfNetPotHeightMm = 75;
  if (!Number.isFinite(Number(cfg.srfEspaciamientoCm)) || Number(cfg.srfEspaciamientoCm) <= 0) cfg.srfEspaciamientoCm = 20;
  if (!Number.isFinite(Number(cfg.srfRecircLh)) || Number(cfg.srfRecircLh) <= 0) cfg.srfRecircLh = 400;
  if (!Number.isFinite(Number(cfg.srfAirLpm)) || Number(cfg.srfAirLpm) <= 0) cfg.srfAirLpm = 8;
  if (!Number.isFinite(Number(cfg.srfKratkyGapCm)) || Number(cfg.srfKratkyGapCm) <= 0) cfg.srfKratkyGapCm = 8;
  const grid = srfDistribuirPlantas(cfg);
  cfg.numNiveles = grid.rows;
  cfg.numCestas = grid.cols;
  return cfg;
}

function srfGetNumPlantas(cfg) {
  cfg = cfg || state.configTorre || {};
  const n = parseInt(String(cfg.srfNumPlantas != null ? cfg.srfNumPlantas : cfg.numNiveles * cfg.numCestas), 10);
  if (Number.isFinite(n) && n > 0) return Math.min(64, n);
  return Math.max(1, (cfg.numNiveles || 1) * (cfg.numCestas || 1));
}

function srfDistribuirPlantas(cfg) {
  const n = srfGetNumPlantas(cfg);
  let filas = parseInt(String(cfg && cfg.srfFilas != null ? cfg.srfFilas : 0), 10);
  if (!Number.isFinite(filas) || filas < 1) {
    const g = typeof hcDistribuirFilasColumnas === 'function' ? hcDistribuirFilasColumnas(n, 8) : { rows: 1, cols: n };
    return { rows: g.rows, cols: g.cols, total: n };
  }
  filas = Math.max(1, Math.min(8, filas));
  const cols = Math.max(1, Math.ceil(n / filas));
  return { rows: filas, cols, total: n };
}

function srfCapacidadLitrosDesdeConfig(cfg) {
  cfg = cfg || state.configTorre || {};
  if (cfg.tipoInstalacion !== 'srf') return null;
  const manual = Number(cfg.srfVolumenManualL);
  if (Number.isFinite(manual) && manual > 0) return Math.round(manual * 10) / 10;
  const L = Number(cfg.srfCanalLargoCm);
  const W = Number(cfg.srfCanalAnchoCm);
  const P = Number(cfg.srfProfundidadCm);
  if (!Number.isFinite(L) || !Number.isFinite(W) || !Number.isFinite(P) || L <= 0 || W <= 0 || P <= 0) return null;
  return Math.round((L * W * P) / 1000 * 10) / 10;
}

function srfLitrosPorPlanta(cfg) {
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const n = srfGetNumPlantas(cfg);
  if (cap == null || !n) return null;
  return Math.round((cap / n) * 10) / 10;
}

function srfAreaCanalM2(cfg) {
  const L = Number(cfg.srfCanalLargoCm);
  const W = Number(cfg.srfCanalAnchoCm);
  if (!Number.isFinite(L) || !Number.isFinite(W) || L <= 0 || W <= 0) return null;
  return (L * W) / 10000;
}

/** FAO orientativo: ~4 L aire/min cada 24 m² de canal. */
function srfRecomendarAireLpm(cfg) {
  const area = srfAreaCanalM2(cfg);
  if (area == null || area <= 0) return { min: 4, reco: 8, fuerte: 14 };
  const base = (area / 24) * 4;
  return {
    min: Math.max(2, Math.round(base * 0.7 * 10) / 10),
    reco: Math.max(4, Math.round(base * 10) / 10),
    fuerte: Math.max(6, Math.round(base * 1.5 * 10) / 10),
  };
}

function srfParseNum(id, min, max, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseFloat(String(el.value || '').replace(',', '.'));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function srfMergeCamposFormularioEnCfg(cfg, ids) {
  cfg = cfg || {};
  ids = ids || SRF_FORM_IDS_SISTEMA;
  const g = (id, key, parser) => {
    if (!ids.includes(id)) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      cfg[key] = !!el.checked;
      return;
    }
    const raw = String(el.value || '').trim();
    if (raw === '' && key !== 'srfObjetivoCultivo') return;
    if (parser) cfg[key] = parser(raw, el);
    else cfg[key] = raw;
  };
  g('setupSrfCanalLargoCm', 'srfCanalLargoCm', (v) => srfParseNum('setupSrfCanalLargoCm', 20, 600, cfg.srfCanalLargoCm));
  g('sysSrfCanalLargoCm', 'srfCanalLargoCm', (v) => srfParseNum('sysSrfCanalLargoCm', 20, 600, cfg.srfCanalLargoCm));
  g('setupSrfCanalAnchoCm', 'srfCanalAnchoCm', (v) => srfParseNum('setupSrfCanalAnchoCm', 20, 400, cfg.srfCanalAnchoCm));
  g('sysSrfCanalAnchoCm', 'srfCanalAnchoCm', (v) => srfParseNum('sysSrfCanalAnchoCm', 20, 400, cfg.srfCanalAnchoCm));
  g('setupSrfProfundidadCm', 'srfProfundidadCm', (v) => srfParseNum('setupSrfProfundidadCm', 10, 50, cfg.srfProfundidadCm));
  g('sysSrfProfundidadCm', 'srfProfundidadCm', (v) => srfParseNum('sysSrfProfundidadCm', 10, 50, cfg.srfProfundidadCm));
  g('setupSrfNumPlantas', 'srfNumPlantas', (v) => Math.round(srfParseNum('setupSrfNumPlantas', 1, 64, cfg.srfNumPlantas || 8)));
  g('sysSrfNumPlantas', 'srfNumPlantas', (v) => Math.round(srfParseNum('sysSrfNumPlantas', 1, 64, cfg.srfNumPlantas || 8)));
  g('setupSrfFilas', 'srfFilas', (v) => Math.round(srfParseNum('setupSrfFilas', 1, 8, cfg.srfFilas || 1)));
  g('sysSrfFilas', 'srfFilas', (v) => Math.round(srfParseNum('sysSrfFilas', 1, 8, cfg.srfFilas || 1)));
  g('setupSrfOxigenacionModo', 'srfOxigenacionModo', (v) => srfNormalizeOxigenacionModo(v));
  g('sysSrfOxigenacionModo', 'srfOxigenacionModo', (v) => srfNormalizeOxigenacionModo(v));
  g('setupSrfCirculante', 'srfCirculante');
  g('sysSrfCirculante', 'srfCirculante');
  g('setupSrfRecircLh', 'srfRecircLh', (v) => srfParseNum('setupSrfRecircLh', 0, 8000, cfg.srfRecircLh));
  g('sysSrfRecircLh', 'srfRecircLh', (v) => srfParseNum('sysSrfRecircLh', 0, 8000, cfg.srfRecircLh));
  g('setupSrfAirLpm', 'srfAirLpm', (v) => srfParseNum('setupSrfAirLpm', 0.5, 300, cfg.srfAirLpm));
  g('sysSrfAirLpm', 'srfAirLpm', (v) => srfParseNum('sysSrfAirLpm', 0.5, 300, cfg.srfAirLpm));
  g('setupSrfBalsaGrosorMm', 'srfBalsaGrosorMm', (v) => srfParseNum('setupSrfBalsaGrosorMm', 15, 80, cfg.srfBalsaGrosorMm));
  g('sysSrfBalsaGrosorMm', 'srfBalsaGrosorMm', (v) => srfParseNum('sysSrfBalsaGrosorMm', 15, 80, cfg.srfBalsaGrosorMm));
  g('setupSrfNetPotMm', 'srfNetPotMm', (v) => srfParseNum('setupSrfNetPotMm', 25, 120, cfg.srfNetPotMm));
  g('sysSrfNetPotMm', 'srfNetPotMm', (v) => srfParseNum('sysSrfNetPotMm', 25, 120, cfg.srfNetPotMm));
  g('setupSrfNetPotHeightMm', 'srfNetPotHeightMm', (v) => srfParseNum('setupSrfNetPotHeightMm', 30, 200, cfg.srfNetPotHeightMm));
  g('sysSrfNetPotHeightMm', 'srfNetPotHeightMm', (v) => srfParseNum('sysSrfNetPotHeightMm', 30, 200, cfg.srfNetPotHeightMm));
  g('setupSrfEspaciamientoCm', 'srfEspaciamientoCm', (v) => srfParseNum('setupSrfEspaciamientoCm', 8, 60, cfg.srfEspaciamientoCm));
  g('sysSrfEspaciamientoCm', 'srfEspaciamientoCm', (v) => srfParseNum('sysSrfEspaciamientoCm', 8, 60, cfg.srfEspaciamientoCm));
  g('setupSrfVolumenManualL', 'srfVolumenManualL', (v) => {
    const x = srfParseNum('setupSrfVolumenManualL', 1, 5000, null);
    return x != null ? x : null;
  });
  g('sysSrfVolumenManualL', 'srfVolumenManualL', (v) => {
    const x = srfParseNum('sysSrfVolumenManualL', 1, 5000, null);
    return x != null ? x : null;
  });
  g('setupSrfVolTrabajoL', 'volMezclaLitros', (v) => {
    const x = srfParseNum('setupSrfVolTrabajoL', 0.5, 5000, null);
    return x != null ? x : null;
  });
  g('sysSrfVolTrabajoL', 'volMezclaLitros', (v) => {
    const x = srfParseNum('sysSrfVolTrabajoL', 0.5, 5000, null);
    return x != null ? x : null;
  });
  g('setupSrfObjetivoCultivo', 'srfObjetivoCultivo', (v) => String(v || '').trim());
  g('sysSrfObjetivoCultivo', 'srfObjetivoCultivo', (v) => String(v || '').trim());
  g('setupSrfKratkyGapCm', 'srfKratkyGapCm', (v) => srfParseNum('setupSrfKratkyGapCm', 2, 40, cfg.srfKratkyGapCm));
  g('sysSrfKratkyGapCm', 'srfKratkyGapCm', (v) => srfParseNum('sysSrfKratkyGapCm', 2, 40, cfg.srfKratkyGapCm));
  if (cfg.srfOxigenacionModo === 'kratky') cfg.srfCirculante = false;
  srfEnsureConfigDefaults(cfg);
  return cfg;
}

function buildSrfConfigFromForm(scope, seed) {
  const c = typeof hcSetupClonePlain === 'function' ? hcSetupClonePlain(seed || {}, {}) : { ...(seed || {}) };
  c.tipoInstalacion = 'srf';
  const ids = scope === 'sys' ? SRF_FORM_IDS_SISTEMA : SRF_FORM_IDS_SETUP;
  srfMergeCamposFormularioEnCfg(c, ids);
  const cap = srfCapacidadLitrosDesdeConfig(c);
  if (cap != null) c.volDeposito = cap;
  return c;
}

function syncSrfFormDesdeConfig(cfg, scope) {
  cfg = srfEnsureConfigDefaults(hcSetupClonePlain(cfg || {}, {}) || {});
  const p = scope === 'sys' ? 'sysSrf' : 'setupSrf';
  const set = (suffix, val) => {
    const el = document.getElementById(p + suffix);
    if (!el || val == null) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val;
  };
  set('CanalLargoCm', cfg.srfCanalLargoCm);
  set('CanalAnchoCm', cfg.srfCanalAnchoCm);
  set('ProfundidadCm', cfg.srfProfundidadCm);
  set('NumPlantas', cfg.srfNumPlantas);
  set('Filas', cfg.srfFilas);
  set('OxigenacionModo', cfg.srfOxigenacionModo);
  set('Circulante', cfg.srfCirculante);
  set('RecircLh', cfg.srfRecircLh);
  set('AirLpm', cfg.srfAirLpm);
  set('BalsaGrosorMm', cfg.srfBalsaGrosorMm);
  set('NetPotMm', cfg.srfNetPotMm);
  set('NetPotHeightMm', cfg.srfNetPotHeightMm);
  set('EspaciamientoCm', cfg.srfEspaciamientoCm);
  set('VolumenManualL', cfg.srfVolumenManualL != null ? cfg.srfVolumenManualL : '');
  set('VolTrabajoL', cfg.volMezclaLitros != null ? cfg.volMezclaLitros : '');
  set('ObjetivoCultivo', cfg.srfObjetivoCultivo || '');
  set('KratkyGapCm', cfg.srfKratkyGapCm);
  srfRefreshOxigenacionUi(scope);
  return cfg;
}

/** Actualiza resumen y estado de cálculo del panel Cultivo (sin guardar). */
function srfRefreshSysFormLive() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'srf') return;
  let draft = state.configTorre;
  try {
    draft =
      typeof buildSrfConfigFromForm === 'function'
        ? buildSrfConfigFromForm('sys', hcSetupClonePlain(state.configTorre, {}) || {})
        : draft;
    if (typeof srfEnsureConfigDefaults === 'function') srfEnsureConfigDefaults(draft);
  } catch (_) {}
  try {
    if (typeof renderSrfCalculoStatus === 'function') renderSrfCalculoStatus(draft, 'sysSrfCalcStatus');
  } catch (_) {}
  const res = document.getElementById('sistemaSrfResumen');
  if (res && typeof textoResumenSistemaSrfPanel === 'function') {
    res.textContent = textoResumenSistemaSrfPanel(draft);
  }
  try {
    if (typeof renderTorre === 'function') renderTorre();
  } catch (_) {}
}

function srfRefreshOxigenacionUi(scope) {
  const p = scope === 'sys' ? 'sys' : 'setup';
  const modo = srfNormalizeOxigenacionModo(document.getElementById(p + 'SrfOxigenacionModo')?.value);
  const circ = document.getElementById(p + 'SrfCirculanteWrap');
  const air = document.getElementById(p + 'SrfAirWrap');
  const kGap = document.getElementById(p + 'SrfKratkyGapWrap');
  const rec = document.getElementById(p + 'SrfRecircWrap');
  if (circ) circ.classList.toggle('setup-hidden', modo === 'kratky');
  if (rec) rec.classList.toggle('setup-hidden', modo === 'kratky' || !(document.getElementById(p + 'SrfCirculante')?.checked));
  if (air) air.classList.toggle('setup-hidden', modo === 'kratky');
  if (kGap) kGap.classList.toggle('setup-hidden', modo !== 'kratky');
}

function renderSrfCalculoStatus(cfg, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  cfg = srfEnsureConfigDefaults(cfg || state.configTorre || {});
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const n = srfGetNumPlantas(cfg);
  const per = srfLitrosPorPlanta(cfg);
  const air = srfRecomendarAireLpm(cfg);
  const grid = srfDistribuirPlantas(cfg);
  const modo = srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo);
  el.innerHTML =
    'SRF · <strong>' +
    n +
    ' plantas</strong> en ' +
    grid.rows +
    '×' +
    grid.cols +
    ' · estanque ~<strong>' +
    (cap != null ? cap + ' L' : '—') +
    '</strong>' +
    (per != null ? ' (~' + per + ' L/planta)' : '') +
    ' · prof. ' +
    cfg.srfProfundidadCm +
    ' cm' +
    (modo === 'kratky'
      ? ' · <strong>Kratky</strong>: cámara de aire bajo balsa (~' + cfg.srfKratkyGapCm + ' cm), sin aireador'
      : ' · aire recomendado <strong>' + air.reco + '–' + air.fuerte + ' L/min</strong> (DO &gt;4–5 mg/L)') +
    (cfg.srfCirculante ? ' · recirculación ~' + cfg.srfRecircLh + ' L/h' : '');
}

function renderSrfSetupPreview(previewEl, cfg) {
  if (!previewEl) return;
  cfg = srfEnsureConfigDefaults(cfg || {});
  const n = srfGetNumPlantas(cfg);
  const grid = srfDistribuirPlantas(cfg);
  previewEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'srf-setup-preview-wrap';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Balsa flotante con ' + n + ' plantas');
  const canal = document.createElement('div');
  canal.className = 'srf-setup-canal';
  const raft = document.createElement('div');
  raft.className = 'srf-setup-raft';
  raft.style.gridTemplateColumns = 'repeat(' + grid.cols + ', minmax(0, 1fr))';
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'srf-setup-hole';
    raft.appendChild(h);
  }
  canal.appendChild(raft);
  wrap.appendChild(canal);
  const cap = document.createElement('div');
  cap.className = 'dwc-setup-lid-caption';
  cap.textContent = n + ' plantas · balsa ' + (cfg.srfBalsaGrosorMm || 40) + ' mm';
  wrap.appendChild(cap);
  previewEl.appendChild(wrap);
}

function textoResumenSistemaSrfPanel(cfg) {
  cfg = srfEnsureConfigDefaults(cfg || state.configTorre || {});
  const n = srfGetNumPlantas(cfg);
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  return n + ' plantas · estanque ~' + (cap != null ? cap + ' L' : '—');
}

function aplicarSistemaSrfDesdeFormulario() {
  initTorres();
  const idxAct = state.torreActiva || 0;
  const slotAct = state.torres && state.torres[idxAct] ? state.torres[idxAct] : null;
  const tipoPrevio = tipoInstalacionNormalizado((slotAct && slotAct.config) || state.configTorre || {});
  if (slotAct && slotAct.config && slotAct.config.tipoInstalacion && tipoPrevio !== 'srf') {
    showToast('Esta instalación no es SRF. Para crear un SRF nuevo usa "Nueva instalación" o el asistente.', true);
    try {
      syncSrfFormDesdeConfig(slotAct.config, 'sys');
    } catch (_) {}
    return;
  }
  if (typeof hcCapturarSnapshotSeguridadTorre === 'function') {
    hcCapturarSnapshotSeguridadTorre(idxAct, 'srf-system-save');
  }
  const c = state.configTorre || (state.configTorre = {});
  c.tipoInstalacion = 'srf';
  Object.assign(c, buildSrfConfigFromForm('sys', c));
  srfEnsureConfigDefaults(c);
  const grid = srfDistribuirPlantas(c);
  c.numNiveles = grid.rows;
  c.numCestas = grid.cols;
  const cap = srfCapacidadLitrosDesdeConfig(c);
  if (cap != null) c.volDeposito = cap;
  try {
    if (typeof redimensionarMatrizTorreDwcPreservando === 'function') {
      redimensionarMatrizTorreDwcPreservando(c, c.numNiveles, c.numCestas);
    }
  } catch (_) {}
  if (c.nutriente) c.checklistInstalacionConfirmada = true;
  c.uiSistemaSrfColapsado = true;
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try {
    actualizarHeaderTorre();
  } catch (_) {}
  try {
    actualizarBadgesNutriente();
  } catch (_) {}
  try {
    updateDashboard();
  } catch (_) {}
  renderSrfCalculoStatus(c, 'sysSrfCalcStatus');
  const res = document.getElementById('sistemaSrfResumen');
  if (res) res.textContent = textoResumenSistemaSrfPanel(c);
  showToast('Datos SRF guardados', false);
}
