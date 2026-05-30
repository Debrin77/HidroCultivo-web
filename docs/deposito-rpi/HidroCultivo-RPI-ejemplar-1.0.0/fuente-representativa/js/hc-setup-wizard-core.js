/**
 * Asistente de configuración: tipo de instalación, estado del wizard, NFT montaje/canal (hasta aplicar sistema).
 * Tras nutrientes-catalog.js; antes de hc-setup-wizard-dwc.js.
 */

// ══════════════════════════════════════════════════
// SETUP WIZARD — LÓGICA
// ══════════════════════════════════════════════════

let setupPagina = 0;
let setupTipoTorre = 'custom';
/** 'torre' | 'nft' | 'dwc' | 'rdwc' | 'srf' | '' (nueva instalación: hay que elegir en paso 0) */
let setupTipoInstalacion = 'torre';
let setupRdwcDraft = null;

function hcSetupClonePlain(value, fallback = null) {
  if (value == null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

/** Normaliza tipo de instalación guardado en config. */
function tipoInstalacionNormalizado(cfg) {
  const t = cfg && cfg.tipoInstalacion;
  if (t === 'nft' || t === 'dwc' || t === 'rdwc' || t === 'srf' || t === 'torre') return t;
  return 'torre';
}

/** Siempre DIY/a medida (opción kit comercial retirada de la UI). */
function hcNftMontajeOrigenNormalizado(_cfg) {
  return 'diy';
}

function hcRdwcMontajeOrigenNormalizado(_cfg) {
  return 'diy';
}

function hcTorreMontajeOrigenNormalizado(_cfg) {
  return 'diy';
}

function readTorreMontajeOrigenDesdeSetupUi() {
  return 'diy';
}

function readTorreMontajeOrigenDesdeSistemaUi() {
  return 'diy';
}

function _hcExposeMontajeDiyBlocks() {
  [
    'setupNftMontajeDiyBlock',
    'sysNftMontajeDiyBlock',
    'setupRdwcMontajeDiyExtra',
    'setupRdwcBombasWrap',
    'sysRdwcMontajeDiyExtra',
    'setupTorreBombaUsuarioBlock',
    'sysTorreBombaUsuarioBlock',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('setup-hidden');
  });
}

/** Devuelve los sliders de niveles/cestas al asistente torre (tras DWC o pestaña Cultivo). */
function restaurarSetupTorreBuilderControls() {
  const controls = document.getElementById('setupTorreBuilderControlsSlot');
  const torreBuilder = document.querySelector('#setupTorreBuilderWrap .torre-builder');
  if (!controls || !torreBuilder) return;
  controls.classList.remove('setup-hidden');
  const previewSlot = document.getElementById('setupTorrePreviewSlot');
  if (controls.parentElement !== torreBuilder) {
    if (previewSlot && typeof previewSlot.after === 'function') previewSlot.after(controls);
    else torreBuilder.appendChild(controls);
  } else if (previewSlot && previewSlot.nextElementSibling !== controls) {
    previewSlot.after(controls);
  }
  if (previewSlot) {
    previewSlot.querySelectorAll('.setup-dwc-preview-kicker, .setup-field-hint').forEach((el) => el.remove());
  }
  const secBomba = document.getElementById('seccionTuboBomba');
  const wrap = document.getElementById('setupTorreBuilderWrap');
  if (secBomba && torreBuilder && secBomba.parentElement === torreBuilder && wrap?.parentElement) {
    wrap.parentElement.insertBefore(secBomba, wrap.nextSibling);
  }
  try {
    if (
      typeof setupTipoInstalacion !== 'undefined' &&
      setupTipoInstalacion === 'torre' &&
      typeof updateTorreBuilder === 'function'
    ) {
      updateTorreBuilder();
    }
  } catch (_) {}
}

function onTorreSlidersInput() {
  const controls = document.getElementById('setupTorreBuilderControlsSlot');
  const enDwcSetup =
    typeof setupTipoInstalacion !== 'undefined' &&
    setupTipoInstalacion === 'dwc' &&
    controls &&
    (controls.closest('#setupDwcDepUnidoControls') || controls.closest('#setupDwcPreviewSection'));
  if (enDwcSetup) {
    try {
      if (typeof refreshDwcSetupPreview === 'function') refreshDwcSetupPreview();
      else if (typeof updateTorreBuilder === 'function') updateTorreBuilder();
    } catch (_) {}
    return;
  }
  const enSistema = controls && controls.closest('#sistemaTorreMontajeCard');
  if (enSistema) {
    const n = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
    const c = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;
    const vn = document.getElementById('valNiveles');
    const vc = document.getElementById('valCestas');
    if (vn) vn.textContent = String(n);
    if (vc) vc.textContent = String(c);
    const sn = document.getElementById('sliderNiveles');
    const sc = document.getElementById('sliderCestas');
    if (sn) sn.setAttribute('aria-valuenow', String(n));
    if (sc) sc.setAttribute('aria-valuenow', String(c));
    try {
      calcularBombaRecomendadaSistema();
    } catch (_) {}
    try {
      refrescarUIMensajeBombaUsuarioTorreSistema();
    } catch (_) {}
    return;
  }
  const n = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const c = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;
  const vn = document.getElementById('valNiveles');
  const vc = document.getElementById('valCestas');
  if (vn) vn.textContent = String(n);
  if (vc) vc.textContent = String(c);
  const sn = document.getElementById('sliderNiveles');
  const sc = document.getElementById('sliderCestas');
  if (sn) sn.setAttribute('aria-valuenow', String(n));
  if (sc) sc.setAttribute('aria-valuenow', String(c));
  try {
    updateTorreBuilder();
  } catch (_) {}
}

/**
 * Estimación orientativa de bomba para torre vertical (caudal L/h, head m, potencia W)
 * según niveles, altura y carga por cestas por nivel.
 */
function hcComputeTorreBombaOrientativa(niveles, alturaM, cestasPorNivel) {
  const n = Math.max(1, Math.min(10, parseInt(String(niveles), 10) || 5));
  const c = Math.max(1, Math.min(8, parseInt(String(cestasPorNivel), 10) || 5));
  const h = Math.max(0.5, Math.min(3, Number(alturaM) || 1.2));
  const cargaCestas = 1 + 0.07 * Math.max(0, c - 4);
  const caudalMin = Math.round(1.5 * n * 60 * cargaCestas);
  const caudalRec = Math.round(2.0 * n * 60 * cargaCestas);
  const headMetros = Math.round(h * 1.2 * 10) / 10;
  const Q = caudalRec / 1000;
  const potenciaW = Math.ceil((Q * headMetros) / (0.367 * 0.35));
  const potenciaRec = Math.max(5, potenciaW * 2);
  let modeloRec = '';
  if (caudalRec <= 400 && headMetros <= 1.5) {
    modeloRec = 'Bomba 5-8W · 400-600 L/h · head 1.5m (ej: Jebao, Sunsun SS-200)';
  } else if (caudalRec <= 600 && headMetros <= 2.0) {
    modeloRec = 'Bomba 8-12W · 600-800 L/h · head 2.0m (ej: Jebao PP-388)';
  } else if (caudalRec <= 900 && headMetros <= 2.5) {
    modeloRec = 'Bomba 12-18W · 800-1000 L/h · head 2.5m (ej: Sunsun CHJ-503)';
  } else {
    modeloRec = 'Bomba 18-25W · 1200+ L/h · head 3m+ (consultar catálogo)';
  }
  return { caudalMin, caudalRec, headMetros, potenciaRec, modeloRec, niveles: n, cestas: c };
}

function validarBombaUsuarioTorreVsCalculo(b, lhStr, wStr) {
  if (!b) return { tipo: 'sin_datos', html: '', toast: null };
  const q = parseFloat(String(lhStr ?? '').replace(',', '.'));
  const potW = parseFloat(String(wStr ?? '').replace(',', '.'));
  const caudalMinLH = b.caudalMin;
  const caudalRecLH = b.caudalRec;
  if (!Number.isFinite(caudalMinLH) || !Number.isFinite(caudalRecLH)) {
    return { tipo: 'sin_datos', html: '', toast: null };
  }
  if (!Number.isFinite(q) || q <= 0) {
    return {
      tipo: 'vacío',
      html:
        '<p class="setup-validation-text">Opcional: indica el caudal de la placa (L/h) para comprobar si encaja con la altura y los niveles.</p>',
      toast: null,
    };
  }
  if (q < caudalMinLH) {
    return {
      tipo: 'error',
      html:
        '<div class="setup-torre-bomba-verdict setup-torre-bomba-verdict--bad">Bomba: puede quedarse corta</div>' +
        '<p class="setup-validation-text">El caudal declarado está <strong>por debajo del mínimo orientativo</strong> (' +
        caudalMinLH +
        ' L/h) para ' +
        b.niveles +
        ' niveles y la carga de cestas indicada. Revisa la curva Q–H del fabricante a unos <strong>' +
        b.headMetros +
        ' m</strong> de altura manométrica.</p>',
      toast:
        'Torre vertical: el caudal de tu bomba parece insuficiente para esta altura y número de niveles (revisa la curva Q–H).',
    };
  }
  let tipo = 'ok';
  let html =
    '<div class="setup-torre-bomba-verdict setup-torre-bomba-verdict--ok">Bomba: dentro del rango orientativo</div>' +
    '<p class="setup-validation-text">Superas el mínimo orientativo (' +
    caudalMinLH +
    ' L/h); el valor recomendado orientativo es ~' +
    caudalRecLH +
    ' L/h con altura manométrica ~' +
    b.headMetros +
    ' m.</p>';
  if (q < caudalRecLH) {
    tipo = 'marginal';
    html =
      '<div class="setup-torre-bomba-verdict setup-torre-bomba-verdict--warn">Bomba: justa</div>' +
      '<p class="setup-validation-text">Cumples el mínimo orientativo pero <strong>sin mucho margen</strong>. Si la subida real es mayor o el tubo es estrecho, vigila el reparto en copas altas.</p>';
  }
  if (Number.isFinite(potW) && potW > 0 && potW < Math.max(4, Math.round(b.potenciaRec * 0.52))) {
    tipo = tipo === 'ok' ? 'potencia_baja' : tipo;
    html +=
      '<p class="setup-validation-text"><strong>Potencia eléctrica baja</strong> frente al orden de magnitud orientativo (~' +
      b.potenciaRec +
      ' W): confirma en la ficha que el caudal se mantiene a la altura real de bombeo.</p>';
  }
  return { tipo, html, toast: null };
}

function seleccionarSetupTorreMontajeOrigen(_mode) {
  _hcExposeMontajeDiyBlocks();
  const sec = document.getElementById('seccionTuboBomba');
  const torreSoloGraficoSliders =
    typeof setupTipoInstalacion !== 'undefined' &&
    setupTipoInstalacion === 'torre' &&
    typeof setupPagina !== 'undefined' &&
    setupPagina === 1;
  if (sec) {
    if (torreSoloGraficoSliders) {
      sec.classList.add('setup-hidden');
      sec.style.display = 'none';
    } else {
      sec.classList.remove('setup-hidden');
      sec.style.display = 'block';
    }
  }
  try {
    calcularBombaRecomendada();
  } catch (_) {}
  try {
    refrescarUIMensajeBombaUsuarioTorre();
  } catch (_) {}
  try {
    actualizarResumenSetup();
  } catch (_) {}
}

function seleccionarSistemaTorreMontajeOrigen(_mode) {
  _hcExposeMontajeDiyBlocks();
  try {
    calcularBombaRecomendadaSistema();
  } catch (_) {}
  try {
    refrescarUIMensajeBombaUsuarioTorreSistema();
  } catch (_) {}
}

function refrescarUIMensajeBombaUsuarioTorreSistema() {
  const el = document.getElementById('sysTorreBombaUsuarioMsg');
  if (!el) return;
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'torre') {
    el.innerHTML = '';
    return;
  }
  const sliderH = document.getElementById('sysSliderAltura');
  const n = parseInt(document.getElementById('sliderNiveles')?.value || state.configTorre.numNiveles || 5, 10);
  const c = parseInt(document.getElementById('sliderCestas')?.value || state.configTorre.numCestas || 5, 10);
  const b = hcComputeTorreBombaOrientativa(n, sliderH ? parseFloat(sliderH.value) : 1.2, c);
  const lhRaw = document.getElementById('sysTorreBombaUsuarioLh')?.value ?? '';
  const wRaw = document.getElementById('sysTorreBombaUsuarioW')?.value ?? '';
  const v = validarBombaUsuarioTorreVsCalculo(b, lhRaw, wRaw);
  el.innerHTML = v.html || '';
}

function onSistemaTorreBombaUsuarioInput() {
  refrescarUIMensajeBombaUsuarioTorreSistema();
}

let _torreBombaSistemaBlurToastKey = '';
function onSistemaTorreBombaUsuarioBlur() {
  refrescarUIMensajeBombaUsuarioTorreSistema();
  const sliderH = document.getElementById('sysSliderAltura');
  const n = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10);
  const c = parseInt(document.getElementById('sliderCestas')?.value || 5, 10);
  const b = hcComputeTorreBombaOrientativa(n, sliderH ? parseFloat(sliderH.value) : 1.2, c);
  const lhRaw = document.getElementById('sysTorreBombaUsuarioLh')?.value ?? '';
  const wRaw = document.getElementById('sysTorreBombaUsuarioW')?.value ?? '';
  const v = validarBombaUsuarioTorreVsCalculo(b, lhRaw, wRaw);
  const key = v.tipo + '|' + lhRaw + '|' + wRaw;
  if (v.tipo === 'error' && v.toast && key !== _torreBombaSistemaBlurToastKey) {
    _torreBombaSistemaBlurToastKey = key;
    showToast(v.toast, true);
  }
}

/** Niveles, cestas y bomba orientativa solo en el asistente (paso Geometría), no en Cultivo e instalación. */
function ocultarTorreMontajeWizardEnPestanaSistema() {
  const card = document.getElementById('sistemaTorreMontajeCard');
  if (card) {
    card.style.display = 'none';
    card.classList.add('setup-hidden');
  }
  try {
    restaurarSetupTorreBuilderControls();
  } catch (_) {}
}

function mountTorreCantidadesSlidersToSistema() {
  ocultarTorreMontajeWizardEnPestanaSistema();
}

function sincronizarSistemaTorreMontajeUI(_cfg) {
  ocultarTorreMontajeWizardEnPestanaSistema();
}

function aplicarSistemaTorreMontajeDesdeFormulario() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'torre') return;
  const cfg = state.configTorre;
  const n = Math.max(1, Math.min(10, parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5));
  const c = Math.max(1, Math.min(8, parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5));
  cfg.numNiveles = n;
  cfg.numCestas = c;
  const altM = parseFloat(document.getElementById('sysSliderAltura')?.value || '');
  if (Number.isFinite(altM)) cfg.alturaTorre = Math.max(0.5, Math.min(3, altM));
  delete cfg.torreMontajeOrigen;
  {
    const lhTorre = document.getElementById('sysTorreBombaUsuarioLh');
    const wTorre = document.getElementById('sysTorreBombaUsuarioW');
    const uLhT = lhTorre ? parseFloat(String(lhTorre.value).replace(',', '.')) : NaN;
    const uWT = wTorre ? parseFloat(String(wTorre.value).replace(',', '.')) : NaN;
    if (Number.isFinite(uLhT) && uLhT > 0) cfg.torreBombaUsuarioCaudalLh = Math.round(uLhT);
    else delete cfg.torreBombaUsuarioCaudalLh;
    if (Number.isFinite(uWT) && uWT > 0) cfg.torreBombaUsuarioPotenciaW = Math.round(uWT);
    else delete cfg.torreBombaUsuarioPotenciaW;
    const bTorre = hcComputeTorreBombaOrientativa(n, cfg.alturaTorre || 1.2, c);
    const vTorre = validarBombaUsuarioTorreVsCalculo(bTorre, lhTorre ? lhTorre.value : '', wTorre ? wTorre.value : '');
    if (vTorre.tipo === 'error' && vTorre.toast) showToast(vTorre.toast, true);
  }
  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(n, cfg.alturaTorre || 1.2, c)
      : null;
  if (b) {
    cfg.bombaCalculada = {
      caudalMin: b.caudalMin,
      caudalRec: b.caudalRec,
      headMetros: b.headMetros,
      potenciaRec: b.potenciaRec,
      modeloRec: b.modeloRec,
    };
  }
  guardarEstadoTorreActual();
  saveState();
  try {
    renderTorre();
  } catch (_) {}
  try {
    renderTorreSistemaResumenTabla(cfg);
  } catch (_) {}
  showToast('Niveles, cestas y bomba de torre guardados para esta instalación.');
}

function refrescarUIMensajeBombaUsuarioTorre() {
  const el = document.getElementById('setupTorreBombaUsuarioMsg');
  if (!el) return;
  if (typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion !== 'torre') {
    el.innerHTML = '';
    return;
  }
  const sliderH = document.getElementById('sliderAltura');
  const n = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10);
  const c = parseInt(document.getElementById('sliderCestas')?.value || 5, 10);
  const b = hcComputeTorreBombaOrientativa(n, sliderH ? parseFloat(sliderH.value) : 1.2, c);
  const lhRaw = document.getElementById('setupTorreBombaUsuarioLh')?.value ?? '';
  const wRaw = document.getElementById('setupTorreBombaUsuarioW')?.value ?? '';
  const v = validarBombaUsuarioTorreVsCalculo(b, lhRaw, wRaw);
  el.innerHTML = v.html || '';
}

function onSetupTorreBombaUsuarioInput() {
  refrescarUIMensajeBombaUsuarioTorre();
}

let _torreBombaBlurToastKey = '';
function onSetupTorreBombaUsuarioBlur() {
  refrescarUIMensajeBombaUsuarioTorre();
  const sliderH = document.getElementById('sliderAltura');
  const n = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10);
  const c = parseInt(document.getElementById('sliderCestas')?.value || 5, 10);
  const b = hcComputeTorreBombaOrientativa(n, sliderH ? parseFloat(sliderH.value) : 1.2, c);
  const lhRaw = document.getElementById('setupTorreBombaUsuarioLh')?.value ?? '';
  const wRaw = document.getElementById('setupTorreBombaUsuarioW')?.value ?? '';
  const v = validarBombaUsuarioTorreVsCalculo(b, lhRaw, wRaw);
  const key = v.tipo + '|' + lhRaw + '|' + wRaw;
  if (v.tipo === 'error' && v.toast && key !== _torreBombaBlurToastKey) {
    _torreBombaBlurToastKey = key;
    showToast(v.toast, true);
  }
}

function readNftMontajeOrigenDesdeSetupUi() {
  return 'diy';
}

function readNftMontajeOrigenDesdeSistemaUi() {
  return 'diy';
}

function readRdwcMontajeOrigenDesdeForm(_scope) {
  return 'diy';
}

function seleccionarSetupNftMontajeOrigen(_mode) {
  _hcExposeMontajeDiyBlocks();
  try {
    updateNftSetupPreview();
  } catch (_) {}
  try {
    actualizarResumenSetup();
  } catch (_) {}
}

function seleccionarSistemaNftMontajeOrigen(_mode) {
  _hcExposeMontajeDiyBlocks();
}

function seleccionarSetupRdwcMontajeOrigen(_mode) {
  _hcExposeMontajeDiyBlocks();
  try {
    applySetupRdwcDesdeFormulario();
  } catch (_) {}
}

function seleccionarSistemaRdwcMontajeOrigen(_mode) {
  _hcExposeMontajeDiyBlocks();
  try {
    renderRdwcCompatStatus(state.configTorre || {}, 'sysRdwcCompatStatus');
    renderRdwcCalculoStatus(state.configTorre || {}, 'sysRdwcCalcStatus');
  } catch (_) {}
}

/** Etiqueta corta para avisos (recarga, calendario, notificaciones). */
function etiquetaSistemaHidroponicoBreve(cfg) {
  const t = tipoInstalacionNormalizado(cfg || {});
  if (t === 'nft') return 'NFT';
  if (t === 'rdwc') return 'RDWC';
  if (t === 'srf') return 'SRF';
  if (t === 'dwc') {
    if (typeof dwcGetModoCultivo === 'function' && dwcGetModoCultivo(cfg || {}) === 'kratky') return 'Kratky';
    return 'DWC';
  }
  return 'Torre vertical';
}

/**
 * RDWC v1 — defaults y saneado mínimo de esquema.
 * Se invoca desde el núcleo para estabilizar configuraciones antiguas o incompletas.
 */
function rdwcEnsureConfigDefaults(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return c;
  if (!Number.isFinite(Number(c.rdwcSites)) || Number(c.rdwcSites) < 2) c.rdwcSites = 4;
  if (!Number.isFinite(Number(c.rdwcRows)) || Number(c.rdwcRows) < 1) c.rdwcRows = 1;
  if (!Number.isFinite(Number(c.rdwcBucketVolL)) || Number(c.rdwcBucketVolL) < 5) c.rdwcBucketVolL = 20;
  if (!Number.isFinite(Number(c.rdwcControlVolL)) || Number(c.rdwcControlVolL) < 10) c.rdwcControlVolL = 40;
  if (!Number.isFinite(Number(c.rdwcNetPotMm)) || Number(c.rdwcNetPotMm) < 40) c.rdwcNetPotMm = 125;
  if (!Number.isFinite(Number(c.rdwcCenterSpacingCm)) || Number(c.rdwcCenterSpacingCm) < 20) c.rdwcCenterSpacingCm = 45;
  if (!Number.isFinite(Number(c.rdwcRecirculationLh)) || Number(c.rdwcRecirculationLh) < 200) c.rdwcRecirculationLh = 1200;
  if (!Number.isFinite(Number(c.rdwcAirLpm)) || Number(c.rdwcAirLpm) < 1) c.rdwcAirLpm = 20;
  if (!Number.isFinite(Number(c.rdwcTempObjetivoC))) c.rdwcTempObjetivoC = 19;
  if (!Number.isFinite(Number(c.rdwcHeadM))) c.rdwcHeadM = 1.2;
  if (!Number.isFinite(Number(c.rdwcFittings))) c.rdwcFittings = 12;
  const tubesEff = typeof getRdwcTuberiasEffectiveMm === 'function' ? getRdwcTuberiasEffectiveMm(c) : null;
  if (!Number.isFinite(Number(c.rdwcSupplyTubeMm)) && tubesEff) c.rdwcSupplyTubeMm = tubesEff.supplyMm;
  if (!Number.isFinite(Number(c.rdwcReturnTubeMm)) && tubesEff) c.rdwcReturnTubeMm = tubesEff.returnMm;
  if (c.rdwcHydroMode !== 'silencioso' && c.rdwcHydroMode !== 'alto_rendimiento') c.rdwcHydroMode = 'estandar';
  if (!Number.isFinite(Number(c.rdwcTempWarnHighC))) c.rdwcTempWarnHighC = 22;
  if (!Number.isFinite(Number(c.rdwcTempWarnLowC))) c.rdwcTempWarnLowC = 17;
  if (c.rdwcFlowMode !== 'continuous') c.rdwcFlowMode = 'continuous';
  if (c.rdwcTopFeedEnabled !== true) c.rdwcTopFeedEnabled = false;
  if (c.rdwcReturnMode !== 'gravity' && c.rdwcReturnMode !== 'forced') c.rdwcReturnMode = 'gravity';
  if (c.rdwcLayout !== 'line' && c.rdwcLayout !== 'double_row' && c.rdwcLayout !== 'u_shape') c.rdwcLayout = 'line';
  if (c.rdwcAirStonePerBucket !== false) c.rdwcAirStonePerBucket = true;
  c.ecPhEstrategia = 'auto';
  c.ecPhIntensidad = 'conservador';
  return c;
}

/** NFT: difusor de aire en el depósito de circulación (siempre). */
function nftEnsureDifusorEnDeposito(cfg) {
  if (!cfg) return cfg;
  const tipo =
    typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : cfg.tipoInstalacion;
  if (tipo !== 'nft') return cfg;
  if (!Array.isArray(cfg.equipamiento)) cfg.equipamiento = [];
  if (cfg.equipamiento.indexOf('difusor') < 0) cfg.equipamiento.push('difusor');
  return cfg;
}

function initSetupRdwcPresetSelect() {
  const sel = document.getElementById('setupRdwcPreset');
  if (!sel || typeof rdwcFillPresetSelect !== 'function') return;
  const cfg = setupRdwcDraft || (typeof getSetupRdwcDraftSeed === 'function' ? getSetupRdwcDraftSeed() : {});
  const guess = typeof rdwcGuessPresetId === 'function' ? rdwcGuessPresetId(cfg) : '';
  rdwcFillPresetSelect(sel, cfg.rdwcPresetId || guess);
}

function initSysRdwcPresetSelect() {
  const sel = document.getElementById('sysRdwcPreset');
  if (!sel || typeof rdwcFillPresetSelect !== 'function') return;
  const cfg = state.configTorre || {};
  const guess = typeof rdwcGuessPresetId === 'function' ? rdwcGuessPresetId(cfg) : '';
  rdwcFillPresetSelect(sel, cfg.rdwcPresetId || guess);
}

function refreshSysRdwcMontajeHint(cfg) {
  const el = document.getElementById('sysRdwcMontajeHint');
  if (!el || typeof rdwcMontajeHintsForConfig !== 'function') return;
  const h = rdwcMontajeHintsForConfig(cfg || state.configTorre || {});
  el.textContent = h && h.summary ? h.summary : '';
}

function syncSetupRdwcFormFromConfig(cfg) {
  cfg = cfg || {};
  const map = {
    setupRdwcSites: cfg.rdwcSites,
    setupRdwcRows: cfg.rdwcRows,
    setupRdwcBucketVolL: cfg.rdwcBucketVolL,
    setupRdwcControlVolL: cfg.rdwcControlVolL,
    setupRdwcControlTrabajoL: cfg.volMezclaLitros,
    setupRdwcRecircPumpW: cfg.rdwcRecircPumpW,
    setupRdwcAirPumpW: cfg.rdwcAirPumpW,
    setupRdwcAirLpm: cfg.rdwcAirLpm,
    setupRdwcNetPotMm: cfg.rdwcNetPotMm,
    setupRdwcNetPotHeightMm: cfg.rdwcNetPotHeightMm,
    setupRdwcCenterSpacingCm: cfg.rdwcCenterSpacingCm,
    setupRdwcSupplyTubeMm: cfg.rdwcSupplyTubeMm,
    setupRdwcReturnTubeMm: cfg.rdwcReturnTubeMm,
  };
  Object.keys(map).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = map[id] != null && map[id] !== '' ? String(map[id]) : '';
  });
}

function onSetupRdwcPresetChange() {
  const sel = document.getElementById('setupRdwcPreset');
  if (!sel) return;
  const id = String(sel.value || '').trim();
  if (!id) return;
  const c =
    typeof getSetupRdwcDraftSeed === 'function'
      ? hcSetupClonePlain(getSetupRdwcDraftSeed(), {}) || {}
      : setupRdwcDraft || {};
  if (typeof rdwcApplyPresetToConfig !== 'function' || !rdwcApplyPresetToConfig(c, id)) return;
  setupRdwcDraft = hcSetupClonePlain(c, {});
  syncSetupRdwcFormFromConfig(c);
  try {
    if (typeof onSetupRdwcInput === 'function') onSetupRdwcInput();
  } catch (_) {}
}

function syncSysRdwcFormFromConfig(cfg) {
  cfg = cfg || {};
  const map = {
    sysRdwcSites: cfg.rdwcSites,
    sysRdwcRows: cfg.rdwcRows,
    sysRdwcBucketVolL: cfg.rdwcBucketVolL,
    sysRdwcControlVolL: cfg.rdwcControlVolL,
    sysRdwcControlTrabajoL: cfg.volMezclaLitros,
    sysRdwcRecirculationLh: cfg.rdwcRecirculationLh,
    sysRdwcAirLpm: cfg.rdwcAirLpm,
    sysRdwcNetPotMm: cfg.rdwcNetPotMm,
    sysRdwcNetPotHeightMm: cfg.rdwcNetPotHeightMm,
    sysRdwcCenterSpacingCm: cfg.rdwcCenterSpacingCm,
    sysRdwcBucketTrabajoL: cfg.rdwcBucketTrabajoL,
    sysRdwcBucketTrabajoDiamCm: cfg.rdwcBucketTrabajoDiamCm,
    sysRdwcBucketTrabajoProfCm: cfg.rdwcBucketTrabajoProfCm,
    sysRdwcTempObjetivoC: cfg.rdwcTempObjetivoC,
    sysRdwcHeadM: cfg.rdwcHeadM,
    sysRdwcLineLenM: cfg.rdwcLineLenM,
    sysRdwcFittings: cfg.rdwcFittings,
  };
  Object.keys(map).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = map[id] != null && map[id] !== '' ? String(map[id]) : '';
  });
  const l = document.getElementById('sysRdwcLayout');
  if (l) l.value = cfg.rdwcLayout || 'line';
  const hm = document.getElementById('sysRdwcHydroMode');
  if (hm) hm.value = cfg.rdwcHydroMode || 'estandar';
}

function onSysRdwcPresetChange() {
  const sel = document.getElementById('sysRdwcPreset');
  if (!sel) return;
  const id = String(sel.value || '').trim();
  if (!id) return;
  const c = hcSetupClonePlain(state.configTorre || {}, {}) || {};
  c.tipoInstalacion = 'rdwc';
  if (typeof rdwcApplyPresetToConfig !== 'function' || !rdwcApplyPresetToConfig(c, id)) return;
  syncSysRdwcFormFromConfig(c);
  renderRdwcCompatStatus(c, 'sysRdwcCompatStatus');
  renderRdwcCalculoStatus(c, 'sysRdwcCalcStatus');
  try {
    refreshSysRdwcMontajeHint(c);
  } catch (_) {}
  try {
    syncRdwcLitrosUtilesSugeridos('sys');
  } catch (_) {}
  try {
    if (typeof renderTorre === 'function') renderTorre();
  } catch (_) {}
}

function rdwcParseLitrosTrabajo(raw) {
  const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.').trim());
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 10) / 10;
}

function rdwcParseCm(raw) {
  const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.').trim());
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 10) / 10;
}

/** Altura del cuerpo del net pot (mm), opcional; distinta de Ø del aro y de la prof. útil de agua bajo cesta. */
function rdwcParseNetPotHeightMm(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  const v = parseInt(s, 10);
  if (!Number.isFinite(v) || v < 30 || v > 200) return null;
  return v;
}

/** Borrador RDWC vacío (asistente nueva instalación, sin defaults numéricos). */
function hcFreshRdwcSetupBare() {
  return { tipoInstalacion: 'rdwc' };
}

/** Valores por defecto del asistente RDWC (instalación nueva, sin heredar otra torre activa). */
function hcFreshRdwcSetupDefaults() {
  const f = hcFreshRdwcSetupBare();
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(f);
  delete f.rdwcCultivoPrevisto;
  return f;
}

function getSetupRdwcDraftSeed() {
  if (typeof setupEsNuevaTorre !== 'undefined' && setupEsNuevaTorre) {
    return hcFreshRdwcSetupBare();
  }
  if (setupRdwcDraft && typeof setupRdwcDraft === 'object' && tipoInstalacionNormalizado(setupRdwcDraft) === 'rdwc') {
    const base = hcSetupClonePlain(setupRdwcDraft, {}) || {};
    base.tipoInstalacion = 'rdwc';
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(base);
    return base;
  }
  return hcFreshRdwcSetupDefaults();
}

function buildRdwcConfigFromForm(scope, seedCfg) {
  const prefix = scope === 'sys' ? 'sysRdwc' : 'setupRdwc';
  const c = hcSetupClonePlain(seedCfg, {}) || {};
  const gNum = (id, fb) => {
    const el = document.getElementById(id);
    const n = parseFloat(String((el && el.value) || '').replace(',', '.'));
    return Number.isFinite(n) ? n : fb;
  };
  c.tipoInstalacion = 'rdwc';
  c.rdwcCultivoPrevisto = String(document.getElementById(prefix + 'CultivoPrevisto')?.value || c.rdwcCultivoPrevisto || '').trim();
  if (!c.rdwcCultivoPrevisto) delete c.rdwcCultivoPrevisto;
  c.rdwcSites = Math.round(Math.max(2, Math.min(64, gNum(prefix + 'Sites', c.rdwcSites || 4))));
  c.rdwcRows = Math.round(Math.max(1, Math.min(4, gNum(prefix + 'Rows', c.rdwcRows || 1))));
  c.rdwcBucketVolL = Math.max(5, Math.min(200, gNum(prefix + 'BucketVolL', c.rdwcBucketVolL || 20)));
  c.rdwcControlVolL = Math.max(10, Math.min(800, gNum(prefix + 'ControlVolL', c.rdwcControlVolL || 40)));
  const controlTrabajo = rdwcParseLitrosTrabajo(document.getElementById(prefix + 'ControlTrabajoL')?.value);
  if (controlTrabajo != null) c.volMezclaLitros = Math.min(c.rdwcControlVolL, controlTrabajo);
  else delete c.volMezclaLitros;
  c.rdwcNetPotMm = Math.round(Math.max(40, Math.min(200, gNum(prefix + 'NetPotMm', c.rdwcNetPotMm || 125))));
  delete c.rdwcMontajeOrigen;
  {
    const bucketTrabajo = rdwcParseLitrosTrabajo(document.getElementById(prefix + 'BucketTrabajoL')?.value);
    if (bucketTrabajo != null) c.rdwcBucketTrabajoL = Math.min(c.rdwcBucketVolL, bucketTrabajo);
    else delete c.rdwcBucketTrabajoL;
    const bucketDiam = rdwcParseCm(document.getElementById(prefix + 'BucketTrabajoDiamCm')?.value);
    if (bucketDiam != null) c.rdwcBucketTrabajoDiamCm = bucketDiam;
    else delete c.rdwcBucketTrabajoDiamCm;
    const bucketProf = rdwcParseCm(document.getElementById(prefix + 'BucketTrabajoProfCm')?.value);
    if (bucketProf != null) c.rdwcBucketTrabajoProfCm = bucketProf;
    else delete c.rdwcBucketTrabajoProfCm;
    const recPumpW = rdwcParsePotenciaW(document.getElementById(prefix + 'RecircPumpW')?.value);
    if (recPumpW != null) c.rdwcRecircPumpW = recPumpW;
    else delete c.rdwcRecircPumpW;
    const airPumpW = rdwcParsePotenciaW(document.getElementById(prefix + 'AirPumpW')?.value);
    if (airPumpW != null) c.rdwcAirPumpW = airPumpW;
    else delete c.rdwcAirPumpW;
    const airEl = document.getElementById(prefix + 'AirLpm');
    if (airEl && String(airEl.value || '').trim()) {
      c.rdwcAirLpm = Math.max(1, Math.min(300, gNum(prefix + 'AirLpm', c.rdwcAirLpm || 20)));
    } else if (scope === 'setup') {
      delete c.rdwcAirLpm;
    }
    const netPotH = rdwcParseNetPotHeightMm(document.getElementById(prefix + 'NetPotHeightMm')?.value);
    if (netPotH != null) c.rdwcNetPotHeightMm = netPotH;
    else delete c.rdwcNetPotHeightMm;
  c.rdwcCenterSpacingCm = Math.max(20, Math.min(150, gNum(prefix + 'CenterSpacingCm', c.rdwcCenterSpacingCm || 45)));
  const supplyEl = document.getElementById(prefix + 'SupplyTubeMm');
  if (supplyEl) {
    c.rdwcSupplyTubeMm = Math.round(Math.max(16, Math.min(80, gNum(prefix + 'SupplyTubeMm', c.rdwcSupplyTubeMm || 25))));
  }
  const returnEl = document.getElementById(prefix + 'ReturnTubeMm');
  if (returnEl) {
    c.rdwcReturnTubeMm = Math.round(Math.max(20, Math.min(100, gNum(prefix + 'ReturnTubeMm', c.rdwcReturnTubeMm || 32))));
  }
  const lineEl = document.getElementById(prefix + 'LineLenM');
  if (lineEl) {
    const lineS = String(lineEl.value || '').trim();
    if (lineS) c.rdwcLineLenM = Math.max(1, Math.min(60, parseFloat(lineS.replace(',', '.')) || c.rdwcLineLenM || 12));
    else delete c.rdwcLineLenM;
  }
  {
    const presetEl = document.getElementById(scope === 'sys' ? 'sysRdwcPreset' : 'setupRdwcPreset');
    const pid = presetEl && presetEl.value ? String(presetEl.value).trim() : '';
    if (pid) c.rdwcPresetId = pid;
    else delete c.rdwcPresetId;
  }
  if (scope === 'sys') {
      c.rdwcTempObjetivoC = Math.max(10, Math.min(30, gNum(prefix + 'TempObjetivoC', c.rdwcTempObjetivoC || 19)));
      c.rdwcHeadM = Math.max(0, Math.min(6, gNum(prefix + 'HeadM', c.rdwcHeadM || 1.2)));
      c.rdwcLineLenM = Math.max(1, Math.min(60, gNum(prefix + 'LineLenM', c.rdwcLineLenM || 12)));
      c.rdwcFittings = Math.round(Math.max(0, Math.min(80, gNum(prefix + 'Fittings', c.rdwcFittings || 12))));
      const hm = document.getElementById(prefix + 'HydroMode');
      c.rdwcHydroMode = hm && hm.value ? hm.value : c.rdwcHydroMode || 'estandar';
      const lay = document.getElementById(prefix + 'Layout');
      c.rdwcLayout = lay && lay.value ? lay.value : c.rdwcLayout || 'line';
    }
  }
  c.numNiveles = c.rdwcRows;
  c.numCestas = Math.max(1, Math.ceil(c.rdwcSites / c.rdwcRows));
  c.volDeposito = Math.round(c.rdwcControlVolL);
  if (typeof rdwcSyncRecircLhDesdeCalculo === 'function') rdwcSyncRecircLhDesdeCalculo(c);
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  return c;
}

function rdwcTieneMedidasCestaEnCfg(cfg) {
  const c = cfg || {};
  const h = Number(c.rdwcNetPotHeightMm);
  const rim = Number(c.rdwcNetPotMm);
  return (Number.isFinite(h) && h >= 30 && h <= 200) || (Number.isFinite(rim) && rim >= 40);
}

function rdwcSetupFormularioCompleto() {
  const parse = id => {
    const n = parseFloat(String(document.getElementById(id)?.value || '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };
  const sites = parse('setupRdwcSites');
  const rows = parse('setupRdwcRows');
  const bucketVol = parse('setupRdwcBucketVolL');
  const controlVol = parse('setupRdwcControlVolL');
  const controlTrabajo = parse('setupRdwcControlTrabajoL');
  const rim = parse('setupRdwcNetPotMm');
  const potH = parse('setupRdwcNetPotHeightMm');
  const cestaOk =
    (Number.isFinite(potH) && potH >= 30 && potH <= 200) || (Number.isFinite(rim) && rim >= 40);
  return (
    Number.isFinite(sites) &&
    sites >= 2 &&
    Number.isFinite(rows) &&
    rows >= 1 &&
    Number.isFinite(bucketVol) &&
    bucketVol >= 5 &&
    Number.isFinite(controlVol) &&
    controlVol >= 10 &&
    Number.isFinite(controlTrabajo) &&
    controlTrabajo >= 0.5 &&
    cestaOk
  );
}

/** Vacía el paso RDWC del asistente (sin defaults en inputs). */
function hcResetRdwcSetupFormZero() {
  setupRdwcDraft = hcFreshRdwcSetupBare();
  [
    'setupRdwcSites',
    'setupRdwcRows',
    'setupRdwcBucketVolL',
    'setupRdwcControlVolL',
    'setupRdwcControlTrabajoL',
    'setupRdwcRecircPumpW',
    'setupRdwcAirPumpW',
    'setupRdwcAirLpm',
    'setupRdwcNetPotMm',
    'setupRdwcNetPotHeightMm',
    'setupRdwcCenterSpacingCm',
    'setupRdwcSupplyTubeMm',
    'setupRdwcReturnTubeMm',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const bombasHint = document.getElementById('setupRdwcBombasHint');
  if (bombasHint) bombasHint.textContent = '';
  const compatEl = document.getElementById('setupRdwcCompatStatus');
  const calcEl = document.getElementById('setupRdwcCalcStatus');
  if (compatEl) compatEl.innerHTML = '';
  if (calcEl) calcEl.innerHTML = '';
  try {
    seleccionarSetupRdwcMontajeOrigen('diy');
  } catch (_) {}
  try {
    bindRdwcCompatLive('setup');
  } catch (_) {}
  try {
    if (typeof refreshRdwcSetupPreview === 'function') refreshRdwcSetupPreview();
  } catch (_) {}
  try {
    syncRdwcLitrosUtilesSugeridos('setup');
  } catch (_) {}
  try {
    syncRdwcBombasUi(setupRdwcDraft);
  } catch (_) {}
  try {
    if (typeof renderRdwcSetupCalculadoUi === 'function') renderRdwcSetupCalculadoUi(setupRdwcDraft);
  } catch (_) {}
}

/** Sliders compartidos del asistente: min 0 = sin dimensiones (nueva instalación). */
function hcSetSetupSlidersBlankMode(blank) {
  const specs = [
    ['sliderNiveles', 1, 10, 5],
    ['sliderCestas', 1, 8, 5],
    ['sliderVol', 5, 100, 20],
  ];
  specs.forEach(([id, minNorm, max, defVal]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (blank) {
      el.min = '0';
      el.value = '0';
      el.setAttribute('aria-valuemin', '0');
      el.setAttribute('aria-valuemax', String(max));
      el.setAttribute('aria-valuenow', '0');
    } else {
      el.min = String(minNorm);
      el.setAttribute('aria-valuemin', String(minNorm));
      el.setAttribute('aria-valuemax', String(max));
      const cur = parseInt(String(el.value || ''), 10);
      const next = Number.isFinite(cur) && cur >= minNorm ? cur : defVal;
      el.value = String(next);
      el.setAttribute('aria-valuenow', String(next));
    }
  });
  const vn = document.getElementById('valNiveles');
  const vc = document.getElementById('valCestas');
  const vv = document.getElementById('valVol');
  if (blank) {
    if (vn) vn.textContent = '0';
    if (vc) vc.textContent = '0';
    if (vv) vv.innerHTML = '—';
  }
}

function hcResetTorreSetupSlidersZero() {
  hcSetSetupSlidersBlankMode(true);
}

/**
 * Vacía formularios del asistente para una instalación nueva (sin heredar la ranura activa).
 * @param {string} [tipo] — tipo ya elegido; si se omite, resetea todos los bloques.
 */
function hcResetSetupFormForNewInstall(tipo) {
  hcResetTorreSetupSlidersZero();
  try {
    if (typeof hcResetNftSetupSlidersZero === 'function') hcResetNftSetupSlidersZero();
  } catch (_) {}
  try {
    if (typeof hcResetDwcSetupFormZero === 'function') hcResetDwcSetupFormZero();
  } catch (_) {}
  try {
    if (typeof hcResetRdwcSetupFormZero === 'function') hcResetRdwcSetupFormZero();
  } catch (_) {}
  try {
    if (typeof hcResetSrfSetupFormZero === 'function') hcResetSrfSetupFormZero();
  } catch (_) {}
  setupRdwcDraft =
    typeof hcFreshRdwcSetupBare === 'function' ? hcFreshRdwcSetupBare() : null;
  const svm = document.getElementById('setupVolMezclaL');
  if (svm) svm.value = '';
  try {
    if (typeof clearSetupVolMezclaDwcAutofill === 'function') clearSetupVolMezclaDwcAutofill();
  } catch (_) {}
  try {
    if (typeof clearSetupVolMezclaSrfAutofill === 'function') clearSetupVolMezclaSrfAutofill();
  } catch (_) {}
  ['setupDwcPreview', 'setupRdwcPreview', 'setupSrfPreview'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    el.classList.remove('torre-preview--dwc', 'torre-preview--srf', 'torre-preview--rdwc');
  });
  const slotPrev = document.querySelector('#setupTorrePreviewSlot .torre-preview');
  if (slotPrev) {
    slotPrev.innerHTML = '';
    slotPrev.classList.remove('torre-preview--dwc', 'torre-preview--srf', 'torre-preview--rdwc');
  }
  try {
    if (typeof hcRenderSetupPreviewPlaceholder === 'function') {
      const p =
        document.getElementById('setupDwcPreview') ||
        document.querySelector('#setupTorrePreviewSlot .torre-preview');
      if (p && (!tipo || tipo === 'dwc' || tipo === 'torre')) hcRenderSetupPreviewPlaceholder(p);
    }
  } catch (_) {}
}

/** Estima Ø y profundidad útil del cubo a partir de litros nominales (cilindro). */
function rdwcEstimateBucketGeometryFromNominalL(volL) {
  const v = Math.max(5, Number(volL) || 20);
  const diamCm = Math.max(25, Math.min(48, 28 + (v - 20) * 0.32));
  const profCm = (v * 1000) / (Math.PI * Math.pow(diamCm / 2, 2));
  return {
    diamCm: Math.round(diamCm * 10) / 10,
    profCm: Math.round(Math.min(55, Math.max(18, profCm)) * 10) / 10,
  };
}

/** Config auxiliar DWC para llenado seguro bajo cesta en cubos RDWC. */
function rdwcCfgParaLlenadoSeguroCubo(cfg) {
  const c = cfg || {};
  const cap = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  let diam = rdwcParseCm(c.rdwcBucketTrabajoDiamCm);
  let prof = rdwcParseCm(c.rdwcBucketTrabajoProfCm);
  if (diam == null || prof == null) {
    const est = rdwcEstimateBucketGeometryFromNominalL(cap);
    if (diam == null) diam = est.diamCm;
    if (prof == null) prof = est.profCm;
  }
  const pseudo = {
    tipoInstalacion: 'dwc',
    dwcDepositoForma: 'cilindrico',
    dwcDepositoLargoCm: diam,
    dwcDepositoAnchoCm: diam,
    dwcDepositoProfCm: prof,
    dwcNetPotRimMm: Math.max(40, Math.round(Number(c.rdwcNetPotMm) || 125)),
    volDeposito: Math.round(cap * 10) / 10,
  };
  const hPot = Number(c.rdwcNetPotHeightMm);
  if (Number.isFinite(hPot) && hPot >= 30 && hPot <= 200) pseudo.dwcNetPotHeightMm = hPot;
  if (c.sustrato) pseudo.sustrato = c.sustrato;
  else if (typeof state !== 'undefined' && state.configTorre && state.configTorre.sustrato) {
    pseudo.sustrato = state.configTorre.sustrato;
  }
  return pseudo;
}

/** Litros útiles por cubo según altura/Ø de cesta y cámara de aire (misma lógica que DWC). */
function getRdwcBucketVolumenTrabajoSeguroLitros(cfg) {
  if (
    typeof getDwcVolumenSeguroMaxLitrosDesdeConfig !== 'function' ||
    typeof dwcTieneMedidasCestaEnCfg !== 'function'
  ) {
    return null;
  }
  if (!rdwcTieneMedidasCestaEnCfg(cfg)) return null;
  const pseudo = rdwcCfgParaLlenadoSeguroCubo(cfg);
  if (!dwcTieneMedidasCestaEnCfg(pseudo)) return null;
  const safe = getDwcVolumenSeguroMaxLitrosDesdeConfig(pseudo);
  if (safe == null || !Number.isFinite(safe) || safe <= 0) return null;
  const bucketNom = Math.max(5, Number((cfg || {}).rdwcBucketVolL) || 20);
  return Math.min(bucketNom, Math.max(0.5, Math.round(safe * 10) / 10));
}

function getRdwcBucketVolumenTrabajoAutoLitros(cfg) {
  const c = cfg || {};
  const bucketNom = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  const seguro = getRdwcBucketVolumenTrabajoSeguroLitros(c);
  if (seguro != null) return seguro;
  // Auto conservador: deja una cámara de aire razonable bajo la cesta si el usuario no ha afinado el dato.
  const autoL = bucketNom * 0.7;
  const out = Math.min(bucketNom, Math.max(0.5, autoL));
  return Math.round(out * 10) / 10;
}

function getRdwcBucketVolumenTrabajoGeometriaLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const bucketNom = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  const diam = rdwcParseCm(c.rdwcBucketTrabajoDiamCm);
  const prof = rdwcParseCm(c.rdwcBucketTrabajoProfCm);
  if (diam == null || prof == null) return null;
  const litros = (Math.PI * Math.pow(diam / 2, 2) * prof) / 1000;
  if (!Number.isFinite(litros) || litros <= 0) return null;
  return Math.min(bucketNom, Math.max(0.5, Math.round(litros * 10) / 10));
}

function getRdwcBucketVolumenTrabajoLitros(cfg, opts) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const bucketNom = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  const soloCalculado = !!(opts && opts.soloCalculado);
  if (!soloCalculado) {
    const manual = rdwcParseLitrosTrabajo(c.rdwcBucketTrabajoL);
    if (manual != null) {
      return Math.min(bucketNom, Math.max(0.5, Math.round(manual * 10) / 10));
    }
  }
  const seguro = getRdwcBucketVolumenTrabajoSeguroLitros(c);
  if (seguro != null) return seguro;
  const geom = getRdwcBucketVolumenTrabajoGeometriaLitros(c);
  if (geom != null) return geom;
  return getRdwcBucketVolumenTrabajoAutoLitros(c);
}

function getRdwcVolumenControlTrabajoLitros(cfg, opts) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const controlMax = Math.max(10, Number(c.rdwcControlVolL || c.volDeposito || 40));
  const soloCalculado = !!(opts && opts.soloCalculado);
  if (!soloCalculado) {
    const mix = rdwcParseLitrosTrabajo(c.volMezclaLitros);
    if (mix != null) {
      return Math.min(controlMax, Math.max(0.5, Math.round(mix * 10) / 10));
    }
    return null;
  }
  const reco =
    typeof rdwcRecomendacionControlDesdeConfig === 'function' ? rdwcRecomendacionControlDesdeConfig(c) : null;
  if (reco && Number.isFinite(reco.trabajoL) && reco.trabajoL > 0) {
    return Math.min(controlMax, Math.max(0.5, Math.round(reco.trabajoL * 10) / 10));
  }
  return Math.round(controlMax * 0.88 * 10) / 10;
}

/** true si el usuario indicó litros útiles en el depósito de control (asistente / config). */
function rdwcTieneDepositoControlManual(cfg) {
  return rdwcParseLitrosTrabajo((cfg || {}).volMezclaLitros) != null;
}

function rdwcParsePotenciaW(raw) {
  const v = parseInt(String(raw == null ? '' : raw).trim(), 10);
  if (!Number.isFinite(v) || v < 1 || v > 500) return null;
  return v;
}

/** Potencia orientativa (W) bomba de impulsión según caudal/altura estimados. */
function rdwcEstimateRecircPumpW(cfg) {
  const calc = typeof rdwcCalcularHidraulica === 'function' ? rdwcCalcularHidraulica(cfg) : null;
  if (!calc || !Number.isFinite(calc.pumpRec)) return null;
  const headM = Math.max(0, Number((cfg || {}).rdwcHeadM) || 1.2);
  const Q = calc.pumpRec / 1000;
  const potenciaW = Math.ceil((Q * headM) / (0.367 * 0.35));
  return Math.max(5, potenciaW * 2);
}

/** Potencia orientativa (W) bomba de aire según L/min. */
function rdwcEstimateAirPumpW(airLpm) {
  const lpm = Math.max(1, Number(airLpm) || 20);
  return Math.max(3, Math.ceil(lpm * 1.75));
}

function rdwcSyncRecircLhDesdeCalculo(cfg) {
  const c = cfg || {};
  const calc = typeof rdwcCalcularHidraulica === 'function' ? rdwcCalcularHidraulica(c) : null;
  if (calc && Number.isFinite(calc.pumpRec) && calc.pumpRec >= 200) {
    c.rdwcRecirculationLh = Math.round(calc.pumpRec);
  } else if (!Number.isFinite(Number(c.rdwcRecirculationLh)) || Number(c.rdwcRecirculationLh) < 200) {
    c.rdwcRecirculationLh = 1200;
  }
  return c;
}

function syncRdwcBombasUi(cfg) {
  const hint = document.getElementById('setupRdwcBombasHint');
  if (!hint) return;
  const c = cfg || setupRdwcDraft || {};
  const calc = typeof rdwcCalcularHidraulica === 'function' ? rdwcCalcularHidraulica(c) : null;
  const recWEl = document.getElementById('setupRdwcRecircPumpW');
  const airWEl = document.getElementById('setupRdwcAirPumpW');
  const airLpmEl = document.getElementById('setupRdwcAirLpm');
  const recWOrient = typeof rdwcEstimateRecircPumpW === 'function' ? rdwcEstimateRecircPumpW(c) : null;
  const airLpmOrient = calc && Number.isFinite(calc.airObj) ? calc.airObj : Number(c.rdwcAirLpm) || 20;
  const airWOrient = rdwcEstimateAirPumpW(airLpmOrient);
  if (recWEl && !String(recWEl.value || '').trim() && recWOrient != null) {
    recWEl.placeholder = 'orient. ~' + recWOrient + ' W';
  }
  if (airWEl && !String(airWEl.value || '').trim() && airWOrient != null) {
    airWEl.placeholder = 'orient. ~' + airWOrient + ' W';
  }
  if (airLpmEl && !String(airLpmEl.value || '').trim() && calc && Number.isFinite(calc.airObj)) {
    airLpmEl.placeholder = 'orient. ~' + calc.airObj + ' L/min';
  }
  if (calc) {
    hint.textContent =
      'Referencia de diseño (no sustituye la placa): impulsión ~' +
      calc.pumpRec +
      ' L/h · aire ~' +
      calc.airObj +
      ' L/min. Anota la potencia (W) y el L/min de aire de tus bombas reales.';
  } else {
    hint.textContent =
      'Indica potencia (W) de la bomba de impulsión y de la de aire, y el caudal de aire (L/min) según la placa.';
  }
}

/** Longitud estimada de cada tramo principal (impulsión o retorno), en metros. */
function rdwcEstimateRecirculationPipeLengthM(cfg) {
  const c = cfg || {};
  const manual = Number(c.rdwcLineLenM);
  if (c.rdwcLineLenM != null && Number.isFinite(manual) && manual >= 1) {
    return Math.round(Math.min(60, manual) * 10) / 10;
  }
  const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
  const rows = Math.max(1, Math.min(4, Math.round(Number(c.rdwcRows) || 1)));
  const perRow = Math.max(1, Math.ceil(sites / rows));
  const spacingM = Math.max(0.2, Number(c.rdwcCenterSpacingCm) || 45) / 100;
  const intraRowM = Math.max(0, perRow - 1) * spacingM;
  const betweenRowsM = Math.max(0, rows - 1) * spacingM * 1.1;
  const trunkM = Math.max(1.2, spacingM * 3);
  return Math.round((rows * intraRowM + betweenRowsM + trunkM * 2) * 10) / 10;
}

function rdwcRecommendTubeMmFromLiquidBase(cfg, liquidBase) {
  const c = cfg || {};
  const base = Math.max(10, Number(liquidBase) || 40);
  const mode = c.rdwcHydroMode === 'silencioso' || c.rdwcHydroMode === 'alto_rendimiento' ? c.rdwcHydroMode : 'estandar';
  const modeMult = mode === 'silencioso' ? 2.5 : mode === 'alto_rendimiento' ? 6.5 : 5;
  const recObj = Math.max(400, Math.round(base * modeMult));
  const headM = Math.max(0, Number(c.rdwcHeadM) || 1.2);
  const lineLenM = Math.max(1, rdwcEstimateRecirculationPipeLengthM(c));
  const fittings = Math.max(0, Number(c.rdwcFittings) || 12);
  const pumpRec = Math.round(recObj * (1 + headM * 0.18 + lineLenM * 0.01 + fittings * 0.008));
  let tubeOutMm = 25;
  if (pumpRec > 2200) tubeOutMm = 32;
  if (pumpRec > 4200) tubeOutMm = 40;
  if (pumpRec > 7000) tubeOutMm = 50;
  let tubeRetMm = 32;
  if (pumpRec > 3200) tubeRetMm = 40;
  if (pumpRec > 6200) tubeRetMm = 50;
  if (pumpRec > 9000) tubeRetMm = 63;
  return { supplyMm: tubeOutMm, returnMm: tubeRetMm };
}

function getRdwcTuberiasEffectiveMm(cfg) {
  const c = cfg || {};
  const supply = Number(c.rdwcSupplyTubeMm);
  const ret = Number(c.rdwcReturnTubeMm);
  const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
  const controlL =
    typeof getRdwcVolumenControlTrabajoLitros === 'function' ? getRdwcVolumenControlTrabajoLitros(c) : null;
  const bucketL =
    typeof getRdwcBucketVolumenTrabajoLitros === 'function' ? getRdwcBucketVolumenTrabajoLitros(c) : 14;
  const liquidBase =
    controlL != null && Number.isFinite(controlL)
      ? Math.max(controlL + sites * (Number(bucketL) || 0), controlL)
      : Math.max(sites * (Number(bucketL) || 0), 1);
  const reco = rdwcRecommendTubeMmFromLiquidBase(c, liquidBase);
  return {
    supplyMm:
      Number.isFinite(supply) && supply >= 16 ? Math.round(Math.min(80, supply)) : reco.supplyMm,
    returnMm: Number.isFinite(ret) && ret >= 20 ? Math.round(Math.min(100, ret)) : reco.returnMm,
  };
}

/** Litros útiles en impulsión + retorno (cilindros, longitud estimada o manual). */
function getRdwcTuberiasVolumeLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return 0;
  const tubes = getRdwcTuberiasEffectiveMm(c);
  const lenM = rdwcEstimateRecirculationPipeLengthM(c);
  const cylL = dMm => Math.PI * Math.pow(dMm / 2000, 2) * lenM * 1000;
  return Math.round((cylL(tubes.supplyMm) + cylL(tubes.returnMm)) * 10) / 10;
}

/** Agua útil total del circuito (control + cubos + tuberías). Con manual si lo indicaste. */
function getRdwcVolumenSolucionTotalLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
  const controlL = getRdwcVolumenControlTrabajoLitros(c);
  const bucketL = getRdwcBucketVolumenTrabajoLitros(c);
  if (!Number.isFinite(controlL) || controlL <= 0 || !Number.isFinite(bucketL) || bucketL <= 0) return null;
  const pipeL = getRdwcTuberiasVolumeLitros(c);
  return Math.round((controlL + sites * bucketL + pipeL) * 10) / 10;
}

/** Total calculado (cesta/geométrico): no usa litros manuales del depósito ni por cubo. */
function getRdwcVolumenSolucionTotalCalculadoLitros(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
  const opts = { soloCalculado: true };
  const controlL = getRdwcVolumenControlTrabajoLitros(c, opts);
  const bucketL = getRdwcBucketVolumenTrabajoLitros(c, opts);
  if (!Number.isFinite(controlL) || controlL <= 0 || !Number.isFinite(bucketL) || bucketL <= 0) return null;
  const pipeL = getRdwcTuberiasVolumeLitros(c);
  return Math.round((controlL + sites * bucketL + pipeL) * 10) / 10;
}

function getRdwcBucketTrabajoResumen(cfg) {
  const c = cfg || {};
  const manual = rdwcParseLitrosTrabajo(c.rdwcBucketTrabajoL);
  if (manual != null) {
    return {
      litros: getRdwcBucketVolumenTrabajoLitros(c),
      fuente: 'manual',
      detalle: 'manual',
    };
  }
  const geom = getRdwcBucketVolumenTrabajoGeometriaLitros(c);
  if (geom != null) {
    const diam = rdwcParseCm(c.rdwcBucketTrabajoDiamCm);
    const prof = rdwcParseCm(c.rdwcBucketTrabajoProfCm);
    return {
      litros: geom,
      fuente: 'geometria',
      detalle: 'Ø ' + diam + ' cm × ' + prof + ' cm',
    };
  }
  const seguro = getRdwcBucketVolumenTrabajoSeguroLitros(c);
  if (seguro != null) {
    const h = Number(c.rdwcNetPotHeightMm);
    const detalle =
      Number.isFinite(h) && h >= 30
        ? 'llenado seguro · cesta ' + Math.round(h) + ' mm'
        : 'llenado seguro según Ø cesta';
    return { litros: seguro, fuente: 'cesta', detalle };
  }
  return {
    litros: getRdwcBucketVolumenTrabajoLitros(c),
    fuente: 'auto',
    detalle: 'auto ~70 % nominal (indica altura de cesta para afinar)',
  };
}

function getRdwcControlTrabajoResumen(cfg) {
  const c = cfg || {};
  const controlMax = Math.max(10, Number(c.rdwcControlVolL || c.volDeposito || 40));
  const controlTrabajo = getRdwcVolumenControlTrabajoLitros(c);
  const margen = Math.max(0, Math.round((controlMax - controlTrabajo) * 10) / 10);
  return {
    maxL: Math.round(controlMax * 10) / 10,
    trabajoL: controlTrabajo,
    margenL: margen,
    tieneMargen: margen > 0.05,
  };
}

function rdwcCultivoPrevistoDesdeConfig(cfg) {
  const c = cfg || {};
  const id = String(c.rdwcCultivoPrevisto || '').trim();
  if (!id || typeof getCultivoDB !== 'function') return null;
  return getCultivoDB(id);
}

function rdwcGrupoObjetivoDesdeConfig(cfg) {
  const c = cfg || {};
  const cultPrev = rdwcCultivoPrevistoDesdeConfig(c);
  if (cultPrev && cultPrev.grupo) return String(cultPrev.grupo).trim().toLowerCase();
  if (typeof hcGrupoCultivoDominanteDesdeConfig === 'function') {
    return hcGrupoCultivoDominanteDesdeConfig(c);
  }
  return 'lechugas';
}

function rdwcRecoPerfilPorGrupo(grupo) {
  const g = String(grupo || '').trim().toLowerCase();
  if (g === 'microgreens') {
    return {
      grupo: 'microgreens',
      etiqueta: 'Microgreens / plántula muy joven',
      cestaMinMm: 27,
      cestaMaxMm: 50,
      cestaTxt: '27–50 mm',
      bucketMinL: 5,
      bucketMaxL: 12,
      bucketTxt: '5–12 L',
      sepMinCm: 20,
      sepMaxCm: 28,
      sepTxt: '20–28 cm',
      controlShare: 0.18,
      controlMinL: 10,
      controlMaxL: 20,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Solo si buscas ciclos muy cortos o vivero.',
    };
  }
  if (g === 'asiaticas') {
    return {
      grupo: 'asiaticas',
      etiqueta: 'Asiáticas',
      cestaMinMm: 50,
      cestaMaxMm: 75,
      cestaTxt: '50–75 mm',
      bucketMinL: 15,
      bucketMaxL: 25,
      bucketTxt: '15–25 L',
      sepMinCm: 35,
      sepMaxCm: 45,
      sepTxt: '35–45 cm',
      controlShare: 0.22,
      controlMinL: 20,
      controlMaxL: 50,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Rosetas y hojas medianas: mejor soporte que en baby leaf.',
    };
  }
  if (g === 'hojas' || g === 'hierbas') {
    return {
      grupo: g,
      etiqueta: g === 'hierbas' ? 'Hierbas aromáticas' : 'Hojas voluminosas',
      cestaMinMm: 75,
      cestaMaxMm: 100,
      cestaTxt: '75–100 mm (≈3–4")',
      bucketMinL: g === 'hierbas' ? 12 : 20,
      bucketMaxL: g === 'hierbas' ? 20 : 35,
      bucketTxt: g === 'hierbas' ? '12–20 L' : '20–35 L',
      sepMinCm: g === 'hierbas' ? 30 : 35,
      sepMaxCm: g === 'hierbas' ? 40 : 50,
      sepTxt: g === 'hierbas' ? '30–40 cm' : '35–50 cm',
      controlShare: g === 'hierbas' ? 0.2 : 0.25,
      controlMinL: g === 'hierbas' ? 18 : 25,
      controlMaxL: g === 'hierbas' ? 40 : 70,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Buen compromiso entre soporte y cámara de aire.',
    };
  }
  if (g === 'fresas') {
    return {
      grupo: 'fresas',
      etiqueta: 'Fresas',
      cestaMinMm: 50,
      cestaMaxMm: 75,
      cestaTxt: '50–75 mm',
      bucketMinL: 12,
      bucketMaxL: 20,
      bucketTxt: '12–20 L',
      sepMinCm: 30,
      sepMaxCm: 40,
      sepTxt: '30–40 cm',
      controlShare: 0.2,
      controlMinL: 18,
      controlMaxL: 40,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Sistema dedicado y control fino de higiene y temperatura.',
    };
  }
  if (g === 'frutos' || g === 'raices') {
    return {
      grupo: g,
      etiqueta: g === 'raices' ? 'Raíces / tubérculos ligeros' : 'Frutos / planta grande',
      cestaMinMm: 100,
      cestaMaxMm: 150,
      cestaTxt: '100–150 mm (≈4–6")',
      bucketMinL: 25,
      bucketMaxL: 45,
      bucketTxt: '25–45 L',
      sepMinCm: 45,
      sepMaxCm: 65,
      sepTxt: '45–65 cm',
      controlShare: 0.3,
      controlMinL: 35,
      controlMaxL: 100,
      controlTrabajoPct: 0.85,
      permite: true,
      nota: 'Requiere sistema dedicado, más soporte y más volumen por planta.',
    };
  }
  return {
    grupo: 'lechugas',
    etiqueta: 'Lechugas / hojas ligeras',
    cestaMinMm: 50,
    cestaMaxMm: 75,
    cestaTxt: '50–75 mm (≈2–3")',
    bucketMinL: 15,
    bucketMaxL: 25,
    bucketTxt: '15–25 L',
    sepMinCm: 30,
    sepMaxCm: 40,
    sepTxt: '30–40 cm',
    controlShare: 0.2,
    controlMinL: 20,
    controlMaxL: 45,
    controlTrabajoPct: 0.85,
    permite: true,
    nota: 'Medida más habitual para cubos RDWC domésticos con hoja ligera.',
  };
}

function rdwcRecomendacionCultivoDesdeConfig(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const cultPrev = rdwcCultivoPrevistoDesdeConfig(c);
  const grupo = rdwcGrupoObjetivoDesdeConfig(c);
  const perfil = rdwcRecoPerfilPorGrupo(grupo);
  const netPotRaw = Number(c.rdwcNetPotMm);
  const netPot = Number.isFinite(netPotRaw) && netPotRaw >= 40 && netPotRaw <= 200 ? Math.round(netPotRaw) : null;
  let estado = 'warn';
  let veredicto = 'Indica el diámetro actual de la cesta para validarlo frente al cultivo previsto.';
  if (netPot == null) {
    estado = 'warn';
  } else if (netPot < perfil.cestaMinMm) {
    estado = 'warn';
    veredicto = 'Cesta pequeña para el cultivo previsto.';
  } else if (netPot > perfil.cestaMaxMm + 5) {
    estado = 'warn';
    veredicto = 'Cesta grande para la densidad habitual de este cultivo.';
  } else {
    estado = 'ok';
    veredicto = 'Cesta dentro del rango recomendado para este cultivo.';
  }
  return {
    cultivo: cultPrev,
    grupo,
    perfil,
    netPotMm: Number.isFinite(netPot) ? netPot : null,
    estado,
    veredicto,
    origen: cultPrev ? 'previsto' : 'auto',
  };
}

function rdwcRoundHalfLitros(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 2) / 2;
}

function rdwcRecomendacionBaseDesdeConfig(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const recoCult = rdwcRecomendacionCultivoDesdeConfig(c);
  const perfil = recoCult ? recoCult.perfil : rdwcRecoPerfilPorGrupo(rdwcGrupoObjetivoDesdeConfig(c));
  const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
  const bucketBase = Number.isFinite(perfil.bucketMinL) && Number.isFinite(perfil.bucketMaxL)
    ? rdwcRoundHalfLitros((perfil.bucketMinL + perfil.bucketMaxL) / 2)
    : 20;
  const cestaBase = Number.isFinite(perfil.cestaMinMm) && Number.isFinite(perfil.cestaMaxMm)
    ? Math.round((perfil.cestaMinMm + perfil.cestaMaxMm) / 2)
    : 125;
  const sepBase = Number.isFinite(perfil.sepMinCm) && Number.isFinite(perfil.sepMaxCm)
    ? Math.round((perfil.sepMinCm + perfil.sepMaxCm) / 2)
    : 45;
  const controlShare = Number.isFinite(perfil.controlShare) ? perfil.controlShare : 0.2;
  const controlMinL = Number.isFinite(perfil.controlMinL) ? perfil.controlMinL : 20;
  const controlMaxL = Number.isFinite(perfil.controlMaxL) ? perfil.controlMaxL : 60;
  const controlTrabajoPct = Number.isFinite(perfil.controlTrabajoPct) ? perfil.controlTrabajoPct : 0.85;
  const controlNominalCalc = sites * bucketBase * controlShare;
  const controlMaxBase = rdwcRoundHalfLitros(Math.max(controlMinL, Math.min(controlMaxL, controlNominalCalc)));
  const controlTrabajoBase = rdwcRoundHalfLitros(Math.max(0.5, controlMaxBase * controlTrabajoPct));
  return {
    recoCult,
    perfil,
    sites,
    bucketBase,
    cestaBase,
    sepBase,
    controlMaxBase,
    controlTrabajoBase,
    controlMargenBase: rdwcRoundHalfLitros(Math.max(0, controlMaxBase - controlTrabajoBase)),
  };
}

function rdwcRecomendacionControlDesdeConfig(cfg) {
  const base = rdwcRecomendacionBaseDesdeConfig(cfg);
  if (!base) return null;
  return {
    maxL: base.controlMaxBase,
    trabajoL: base.controlTrabajoBase,
    margenL: base.controlMargenBase,
    txt: base.controlMaxBase + ' L máx · ~' + base.controlTrabajoBase + ' L útiles',
    recoCult: base.recoCult,
  };
}

function renderRdwcCultivoPrevistoSelect(selectId, selectedValue) {
  const el = document.getElementById(selectId);
  if (!el || typeof CULTIVOS_DB === 'undefined' || !Array.isArray(CULTIVOS_DB)) return;
  const selected = String(selectedValue || '').trim();
  el.innerHTML = '';
  const autoOpt = document.createElement('option');
  autoOpt.value = '';
  autoOpt.textContent = 'Auto según cultivos asignados / configuración';
  el.appendChild(autoOpt);
  CULTIVOS_DB.slice().sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')).forEach(c => {
    if (!c || !c.id) return;
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = (c.emoji ? c.emoji + ' ' : '') + (typeof cultivoNombreLista === 'function' ? cultivoNombreLista(c, c.nombre) : (c.nombre || c.id));
    el.appendChild(opt);
  });
  el.value = selected;
}

function rdwcCompatChipHtml(estado) {
  const k = estado === 'ok' || estado === 'warn' || estado === 'bad' ? estado : 'warn';
  const txt = k === 'ok' ? 'OK' : k === 'warn' ? 'Ajustar' : 'No recomendado';
  return '<span class="cultivo-status-chip cultivo-status-chip--' + k + '">' + txt + '</span>';
}

function rdwcEvaluarCompatConfig(cfg) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const sites = Math.max(2, Number(c.rdwcSites) || 4);
  const rows = Math.max(1, Number(c.rdwcRows) || 1);
  const bucketVol = Math.max(5, Number(c.rdwcBucketVolL) || 20);
  const controlVol = Math.max(10, Number(c.rdwcControlVolL || c.volDeposito || 40));
  const netPot = Math.max(40, Number(c.rdwcNetPotMm) || 125);
  const spacing = Math.max(20, Number(c.rdwcCenterSpacingCm) || 45);
  const perRow = Math.max(1, Math.ceil(sites / rows));

  const recoCult = rdwcRecomendacionCultivoDesdeConfig(c);
  const controlReco = rdwcRecomendacionControlDesdeConfig(c);
  const bucketMinL = recoCult && Number.isFinite(recoCult.perfil.bucketMinL) ? recoCult.perfil.bucketMinL : 15;
  const bucketMaxL = recoCult && Number.isFinite(recoCult.perfil.bucketMaxL) ? recoCult.perfil.bucketMaxL : 35;
  const bucketWarnMin = Math.max(5, Math.floor(bucketMinL * 0.8));
  const bucketWarnMax = Math.ceil(bucketMaxL * 1.2);
  const sepMinCm = recoCult && Number.isFinite(recoCult.perfil.sepMinCm) ? recoCult.perfil.sepMinCm : 35;
  const sepMaxCm = recoCult && Number.isFinite(recoCult.perfil.sepMaxCm) ? recoCult.perfil.sepMaxCm : 60;
  let potEstado = recoCult ? recoCult.estado : 'warn';
  if (!recoCult) {
    if (netPot >= 100 && netPot <= 160) potEstado = 'ok';
    else if ((netPot >= 75 && netPot < 100) || (netPot > 160 && netPot <= 180)) potEstado = 'warn';
    else potEstado = 'bad';
  }

  let bucketEstado = 'warn';
  if (bucketVol >= bucketMinL && bucketVol <= bucketMaxL) bucketEstado = 'ok';
  else if ((bucketVol >= bucketWarnMin && bucketVol < bucketMinL) || (bucketVol > bucketMaxL && bucketVol <= bucketWarnMax)) bucketEstado = 'warn';
  else bucketEstado = 'bad';

  let controlEstado = 'warn';
  if (controlReco) {
    const okMin = Math.max(10, controlReco.maxL * 0.85);
    const okMax = Math.max(controlReco.maxL + 2, controlReco.maxL * 1.15);
    const warnMin = Math.max(10, controlReco.maxL * 0.7);
    const warnMax = Math.max(controlReco.maxL + 10, controlReco.maxL * 1.6);
    if (controlVol >= okMin && controlVol <= okMax) controlEstado = 'ok';
    else if ((controlVol >= warnMin && controlVol < okMin) || controlVol > warnMax) controlEstado = 'warn';
    else if ((controlVol > okMax && controlVol <= warnMax) || controlVol < warnMin) controlEstado = 'warn';
    else controlEstado = 'bad';
  }

  let spacingEstado = 'warn';
  if (spacing >= sepMinCm && spacing <= sepMaxCm) spacingEstado = 'ok';
  else if ((spacing >= Math.max(20, sepMinCm - 5) && spacing < sepMinCm) || (spacing > sepMaxCm && spacing <= sepMaxCm + 10)) spacingEstado = 'warn';
  else spacingEstado = 'bad';

  let layoutEstado = 'ok';
  if (rows >= 3 && perRow >= 6) layoutEstado = 'warn';
  if (rows >= 4 && perRow >= 8) layoutEstado = 'bad';

  const prioridad = { ok: 0, warn: 1, bad: 2 };
  const globalEstado = [potEstado, bucketEstado, controlEstado, spacingEstado, layoutEstado].reduce(
    (acc, s) => (prioridad[s] > prioridad[acc] ? s : acc),
    'ok'
  );

  return {
    globalEstado,
    potEstado,
    bucketEstado,
    controlEstado,
    spacingEstado,
    layoutEstado,
    spacingRecoCm: recoCult ? recoCult.perfil.sepTxt : '35-60 cm',
    netPotRecoMm: recoCult ? recoCult.perfil.cestaTxt : '100-160 mm',
    bucketRecoL: recoCult ? recoCult.perfil.bucketTxt : '15-35 L',
    controlRecoL: controlReco ? controlReco.txt : '20-60 L máx',
    recoCultivo: recoCult,
    controlReco,
  };
}

function rdwcCompatTextoResumen(comp) {
  if (!comp) return '';
  const accion =
    comp.globalEstado === 'ok'
      ? 'Configuración equilibrada para operación general.'
      : comp.globalEstado === 'warn'
        ? 'Ajusta uno o más parámetros para mejorar estabilidad de raíces y mantenimiento.'
        : 'Ajuste recomendado antes de cerrar configuración para evitar estrés radicular.';
  return (
    'Compatibilidad RDWC ' +
    rdwcCompatChipHtml(comp.globalEstado) +
    ' · Cesta ' +
    rdwcCompatChipHtml(comp.potEstado) +
    ' · Cubo ' +
    rdwcCompatChipHtml(comp.bucketEstado) +
    ' · Control ' +
    rdwcCompatChipHtml(comp.controlEstado) +
    ' · Separación ' +
    rdwcCompatChipHtml(comp.spacingEstado) +
    ' · Distribución ' +
    rdwcCompatChipHtml(comp.layoutEstado) +
    '. Referencia: cesta ' +
    comp.netPotRecoMm +
    ', cubo ' +
    comp.bucketRecoL +
    ', control ' +
    comp.controlRecoL +
    ', separación ' +
    comp.spacingRecoCm +
    (comp.recoCultivo
      ? '. Cultivo ' +
        (comp.recoCultivo.cultivo
          ? '<strong>' + comp.recoCultivo.cultivo.nombre + '</strong>'
          : '<strong>auto</strong>') +
        ' · ' +
        comp.recoCultivo.perfil.etiqueta +
        ' · ' +
        comp.recoCultivo.veredicto
      : '') +
    '. ' +
    accion
  );
}

function rdwcFlowChip(estado) {
  const k = estado === 'ok' || estado === 'warn' || estado === 'bad' ? estado : 'warn';
  const txt = k === 'ok' ? 'Válido' : k === 'warn' ? 'Ajustar' : 'Sobredimensionado';
  return '<span class="cultivo-status-chip cultivo-status-chip--' + k + '">' + txt + '</span>';
}

function rdwcCalcularHidraulica(cfg, opts) {
  const c = cfg || {};
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return null;
  const volOpts = opts && opts.soloCalculado ? { soloCalculado: true } : undefined;
  const sites = Math.max(2, Number(c.rdwcSites) || 4);
  const bucketVol = getRdwcBucketVolumenTrabajoLitros(c, volOpts);
  const controlVol = getRdwcVolumenControlTrabajoLitros(c, volOpts);
  const soloCalculado = !!(opts && opts.soloCalculado);
  if (
    !soloCalculado &&
    (controlVol == null || !Number.isFinite(controlVol) || controlVol <= 0)
  ) {
    return null;
  }
  const recUser = Math.max(100, Number(c.rdwcRecirculationLh) || 1200);
  const airUser = Math.max(1, Number(c.rdwcAirLpm) || 20);
  const headM = Math.max(0, Number(c.rdwcHeadM) || 1.2);
  const lineLenM = Math.max(1, rdwcEstimateRecirculationPipeLengthM(c));
  const fittings = Math.max(0, Number(c.rdwcFittings) || 12);
  const mode = c.rdwcHydroMode === 'silencioso' || c.rdwcHydroMode === 'alto_rendimiento' ? c.rdwcHydroMode : 'estandar';
  const liquidBase = Math.max((Number(controlVol) || 0) + sites * (Number(bucketVol) || 0), Number(controlVol) || 0);
  const pipeL = typeof getRdwcTuberiasVolumeLitros === 'function' ? getRdwcTuberiasVolumeLitros(c) : 0;
  const totalVol = Math.round((liquidBase + pipeL) * 10) / 10;
  const tubesEff = typeof getRdwcTuberiasEffectiveMm === 'function' ? getRdwcTuberiasEffectiveMm(c) : null;

  // Renovaciones/h del volumen útil total (referencia sector RDWC: ~3–7×/h; silencioso más bajo).
  const modeMult = mode === 'silencioso' ? 2.5 : mode === 'alto_rendimiento' ? 6.5 : 5;
  const modeMinMult = mode === 'silencioso' ? 2 : mode === 'alto_rendimiento' ? 4 : 3;
  const modeMaxMult = mode === 'silencioso' ? 3.5 : mode === 'alto_rendimiento' ? 9 : 7;

  const recMin = Math.max(400, Math.round(totalVol * modeMinMult));
  const recObj = Math.max(recMin, Math.round(totalVol * modeMult));
  const recMax = Math.max(recObj + 150, Math.round(totalVol * modeMaxMult));

  // Aire DWC: ~0,13–0,26 L/min por L (≈0,5–1 L/min por galón); objetivo en rango medio-alto.
  const airMin = Math.max(6, Math.round(totalVol / 10));
  const airObj = Math.max(airMin, Math.round(totalVol / 5));
  const airMax = Math.max(airObj + 4, Math.round(totalVol / 3));

  // Bomba sugerida con factor por altura + pérdidas lineales y accesorios.
  const lossFac = 1 + headM * 0.18 + lineLenM * 0.01 + fittings * 0.008;
  const pumpRec = Math.round(recObj * lossFac);
  const pumpMin = Math.round(recMin * lossFac);

  const tubeOutMm = tubesEff ? tubesEff.supplyMm : 25;
  const tubeRetMm = tubesEff ? tubesEff.returnMm : 32;

  const estadoRec =
    recUser < recMin * 0.9 ? 'warn' : recUser > recMax * 2.2 ? 'bad' : 'ok';
  const estadoAir = airUser < airMin ? 'warn' : airUser > airMax * 1.5 ? 'warn' : 'ok';
  const estadoGlobal = (estadoRec === 'bad' || estadoAir === 'bad') ? 'bad' : (estadoRec === 'warn' || estadoAir === 'warn') ? 'warn' : 'ok';
  const rows = Math.max(1, Math.min(4, parseInt(String(c.rdwcRows), 10) || 1));
  const airStones = sites;

  return {
    totalVol,
    liquidBase,
    pipeVol: pipeL,
    controlVol,
    bucketVol,
    sites,
    rows,
    recMin, recObj, recMax,
    airMin, airObj, airMax,
    airStones,
    airLpmPerStone: airStones > 0 ? Math.round((airObj / airStones) * 10) / 10 : airObj,
    pumpMin, pumpRec,
    tubeOutMm,
    tubeRetMm,
    lineLenM,
    mode,
    estadoRec, estadoAir, estadoGlobal,
  };
}

function syncRdwcLitrosUtilesSugeridos(scope) {
  const prefix = scope === 'sys' ? 'sys' : 'setup';
  const seed =
    scope === 'sys'
      ? state.configTorre || {}
      : typeof getSetupRdwcDraftSeed === 'function'
        ? getSetupRdwcDraftSeed()
        : setupRdwcDraft || {};
  let c;
  try {
    c = buildRdwcConfigFromForm(scope, seed);
  } catch (_) {
    return;
  }
  const bucketEl = document.getElementById(prefix + 'RdwcBucketTrabajoL');
  const controlEl = document.getElementById(prefix + 'RdwcControlTrabajoL');
  const calcOpts = { soloCalculado: true };
  const bucketCalc = getRdwcBucketVolumenTrabajoLitros(c, calcOpts);
  const controlCalc = getRdwcVolumenControlTrabajoLitros(c, calcOpts);
  if (bucketEl && bucketCalc != null && !String(bucketEl.value || '').trim()) {
    bucketEl.placeholder = 'auto ~' + bucketCalc + ' L';
  }
  if (controlEl && scope !== 'setup' && controlCalc != null && !String(controlEl.value || '').trim()) {
    controlEl.placeholder = 'auto ~' + controlCalc + ' L';
  } else if (controlEl && scope === 'setup' && !String(controlEl.value || '').trim()) {
    controlEl.placeholder = 'litros útiles medidos en el reservorio';
  }
  const hintId = scope === 'sys' ? 'sysRdwcLitrosUtilesHint' : 'setupRdwcLitrosUtilesHint';
  const hintEl = document.getElementById(hintId);
  if (hintEl) {
    const h = Number(c.rdwcNetPotHeightMm);
    const sites = Math.max(2, Math.round(Number(c.rdwcSites) || 4));
    const total =
      typeof getRdwcVolumenSolucionTotalLitros === 'function' ? getRdwcVolumenSolucionTotalLitros(c) : null;
    const controlEff =
      typeof getRdwcVolumenControlTrabajoLitros === 'function' ? getRdwcVolumenControlTrabajoLitros(c) : null;
    const manualCtl = rdwcParseLitrosTrabajo(c.volMezclaLitros);
    const tieneCesta = rdwcTieneMedidasCestaEnCfg(c);
    if (!tieneCesta) {
      hintEl.textContent =
        'Indica altura del net pot (mm) y Ø del aro para calcular el total de agua útil del circuito.';
    } else if (manualCtl == null) {
      hintEl.textContent =
        'Indica los litros útiles en depósito de control (medidos). Sin ese dato no calculamos el total del circuito.';
    } else if (total != null && controlEff != null) {
      const pipeL =
        typeof getRdwcTuberiasVolumeLitros === 'function' ? getRdwcTuberiasVolumeLitros(c) : 0;
      hintEl.textContent =
        'Total del circuito: ~' +
        total +
        ' L (' +
        controlEff +
        ' L reservorio (tu medida) + ' +
        sites +
        '×' +
        (bucketCalc != null ? bucketCalc : '—') +
        ' L/cubo' +
        (pipeL > 0 ? ' + ~' + pipeL + ' L tuberías' : '') +
        ').';
    } else {
      hintEl.textContent = '';
    }
  }
}

function onSetupRdwcInput() {
  let c = null;
  try {
    if (typeof applySetupRdwcDesdeFormulario === 'function') c = applySetupRdwcDesdeFormulario();
  } catch (_) {}
  try {
    syncRdwcLitrosUtilesSugeridos('setup');
  } catch (_) {}
  try {
    syncRdwcBombasUi(c);
  } catch (_) {}
  try {
    if (typeof renderRdwcSetupCalculadoUi === 'function') renderRdwcSetupCalculadoUi(c);
  } catch (_) {}
  try {
    if (typeof refreshRdwcSetupPreview === 'function') refreshRdwcSetupPreview();
  } catch (_) {}
}

function renderRdwcSetupCalculadoUi(cfg) {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'rdwc') return;
  cfg = cfg || setupRdwcDraft || (typeof hcFreshRdwcSetupDefaults === 'function' ? hcFreshRdwcSetupDefaults() : {});
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(cfg);
  const block = document.getElementById('setupRdwcRecoBlock');
  const val = document.getElementById('setupRdwcRecoValor');
  const hint = document.getElementById('setupRdwcRecoHint');
  const elCtl = document.getElementById('setupRdwcRecoControlL');
  const elCubo = document.getElementById('setupRdwcRecoCuboL');
  const elCuboDet = document.getElementById('setupRdwcRecoCuboDetalle');
  const elSites = document.getElementById('setupRdwcRecoSites');
  const elCubosSum = document.getElementById('setupRdwcRecoCubosSum');
  const elTub = document.getElementById('setupRdwcRecoTuberiasL');
  const elSuma = document.getElementById('setupRdwcRecoSuma');
  const elManualNote = document.getElementById('setupRdwcRecoManualNote');
  const elDesglose = document.getElementById('setupRdwcRecoDesglose');
  const manualCtl = rdwcParseLitrosTrabajo(cfg.volMezclaLitros);
  const calc =
    manualCtl != null && typeof rdwcCalcularHidraulica === 'function' ? rdwcCalcularHidraulica(cfg) : null;
  const bucketInfo =
    typeof getRdwcBucketTrabajoResumen === 'function'
      ? getRdwcBucketTrabajoResumen(cfg)
      : null;
  if (block && val) {
    block.classList.remove('setup-dwc-litros-solucion-block--pending', 'setup-dwc-litros-solucion-block--ok');
    if (calc) {
      block.classList.add('setup-dwc-litros-solucion-block--ok');
      const cubosSum = Math.round(calc.sites * calc.bucketVol * 10) / 10;
      const totalRedondeado = Math.round(calc.totalVol * 10) / 10;
      val.textContent = totalRedondeado + ' L útiles en todo el circuito';
      if (elCtl) {
        elCtl.textContent =
          manualCtl != null ? String(calc.controlVol) + ' (tu medida)' : String(calc.controlVol);
      }
      if (elCubo) elCubo.textContent = String(calc.bucketVol);
      if (elSites) elSites.textContent = String(calc.sites);
      if (elCubosSum) elCubosSum.textContent = String(cubosSum);
      if (elTub) {
        const pipeL = calc.pipeVol != null ? calc.pipeVol : getRdwcTuberiasVolumeLitros(cfg);
        const lenM = calc.lineLenM != null ? calc.lineLenM : rdwcEstimateRecirculationPipeLengthM(cfg);
        elTub.textContent =
          (pipeL != null ? String(pipeL) : '—') +
          ' (~' +
          lenM +
          ' m × Ø ' +
          calc.tubeOutMm +
          ' + ' +
          calc.tubeRetMm +
          ' mm)';
      }
      if (elSuma) elSuma.textContent = String(totalRedondeado);
      if (elCuboDet) {
        if (bucketInfo && bucketInfo.fuente === 'cesta') {
          elCuboDet.textContent = '(' + bucketInfo.detalle + ')';
        } else if (bucketInfo && bucketInfo.fuente === 'geometria') {
          elCuboDet.textContent = '(' + bucketInfo.detalle + ')';
        } else {
          const h = Number(cfg.rdwcNetPotHeightMm);
          elCuboDet.textContent =
            Number.isFinite(h) && h >= 30
              ? '(según altura cesta ' + Math.round(h) + ' mm)'
              : '(estimación; indica altura cesta para afinar)';
        }
      }
      if (elDesglose) elDesglose.style.display = '';
      if (hint) {
        hint.textContent =
          'Bomba recirculación ~' +
          calc.pumpRec +
          ' L/h · aire ~' +
          calc.airObj +
          ' L/min (≈' +
          calc.airLpmPerStone +
          ' L/min × ' +
          calc.airStones +
          ' piedras en cubos). Mín. recirc. ~' +
          calc.recMin +
          ' L/h. La suma incluye depósito, cubos y tuberías.';
      }
      if (elManualNote) {
        elManualNote.textContent = '';
        elManualNote.classList.add('setup-hidden');
      }
    } else {
      block.classList.add('setup-dwc-litros-solucion-block--pending');
      val.textContent = manualCtl == null
        ? 'Indica litros útiles en depósito de control'
        : 'Indica cubos, depósito y Ø/altura de cesta';
      if (hint) hint.textContent = '';
      if (elDesglose) elDesglose.style.display = 'none';
      if (elManualNote) {
        elManualNote.textContent = '';
        elManualNote.classList.add('setup-hidden');
      }
    }
  }
  const compatEl = document.getElementById('setupRdwcCompatStatus');
  const calcEl = document.getElementById('setupRdwcCalcStatus');
  if (compatEl) compatEl.innerHTML = '';
  if (calcEl) calcEl.innerHTML = '';
}

function renderRdwcCalculoStatus(cfg, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const cfgUse = cfg || state.configTorre || {};
  if (elId === 'sysRdwcCalcStatus') {
    const total =
      typeof getRdwcVolumenSolucionTotalLitros === 'function'
        ? getRdwcVolumenSolucionTotalLitros(cfgUse)
        : null;
    if (total != null && Number.isFinite(total) && total > 0) {
      el.innerHTML =
        'Para nutrientes y recarga usamos <strong>≈ ' +
        Math.round(total * 10) / 10 +
        ' L</strong> de agua útil en todo el circuito (reservorio + cubos). Las dosis por etapa las verás en <strong>Medir</strong>.';
    } else {
      el.innerHTML =
        'Indica cubos, depósito de control y altura del net pot para calcular los litros útiles del circuito.';
    }
    return;
  }
  const calc = rdwcCalcularHidraulica(cfgUse);
  if (!calc) {
    el.innerHTML = '';
    return;
  }
  const bucketInfo = getRdwcBucketTrabajoResumen(cfgUse);
  const controlInfo = getRdwcControlTrabajoResumen(cfgUse);
  const recoCult = rdwcRecomendacionCultivoDesdeConfig(cfgUse);
  const controlReco = rdwcRecomendacionControlDesdeConfig(cfgUse);
  const controlTxt = controlInfo.tieneMargen
    ? ('<strong>' + controlInfo.trabajoL + ' L</strong> útiles en reservorio (máx ' + controlInfo.maxL + ' L · margen ' + controlInfo.margenL + ' L)')
    : ('<strong>' + controlInfo.trabajoL + ' L</strong> en reservorio de control');
  const bucketTxt =
    bucketInfo.fuente === 'manual'
      ? ('<strong>' + bucketInfo.litros + ' L</strong> por cubo útil (manual)')
      : bucketInfo.fuente === 'geometria'
        ? ('<strong>' + bucketInfo.litros + ' L</strong> por cubo útil (' + bucketInfo.detalle + ')')
        : bucketInfo.fuente === 'cesta'
          ? ('<strong>' + bucketInfo.litros + ' L</strong> por cubo útil (' + bucketInfo.detalle + ')')
          : ('<strong>' + bucketInfo.litros + ' L</strong> por cubo útil (' + bucketInfo.detalle + ')');
  const cultivoTxt =
    recoCult
      ? ' · Cultivo ' +
        (recoCult.cultivo ? '<strong>' + recoCult.cultivo.nombre + '</strong>' : '<strong>auto</strong>') +
        ': cesta <strong>' + recoCult.perfil.cestaTxt + '</strong>, cubo <strong>' + recoCult.perfil.bucketTxt + '</strong> y separación <strong>' + recoCult.perfil.sepTxt + '</strong>'
      : '';
  const controlRecoTxt =
    controlReco
      ? ' · Depósito control orientativo <strong>' + controlReco.maxL + ' L</strong> (útiles ~' + controlReco.trabajoL + ' L)'
      : '';
  el.innerHTML =
    'RDWC Pro ' + rdwcFlowChip(calc.estadoGlobal) +
    ' · Perfil <strong>' + (calc.mode === 'silencioso' ? 'silencioso' : calc.mode === 'alto_rendimiento' ? 'alto rendimiento' : 'estándar') + '</strong>' +
    ' · Agua útil total recomendada ≈ <strong>' + calc.totalVol + ' L</strong>' +
    ' (' + controlTxt + ' + ' + calc.sites + '×' + bucketTxt + ')' +
    ' · Recirculación objetivo <strong>' + calc.recObj + ' L/h</strong> (mín ' + calc.recMin + ')' +
    ' · Bomba recomendada <strong>' + calc.pumpRec + ' L/h</strong>' +
    ' · Aireación objetivo <strong>' + calc.airObj + ' L/min</strong> (mín ' + calc.airMin + ')' +
    ' · Impulsión <strong>Ø' + calc.tubeOutMm + ' mm</strong> · Retorno <strong>Ø' + calc.tubeRetMm + ' mm</strong>.' +
    cultivoTxt +
    controlRecoTxt +
    (typeof rdwcMontajeHintsForConfig === 'function'
      ? (() => {
          const mh = rdwcMontajeHintsForConfig(cfgUse);
          return mh && mh.summary ? ' · <span class="rdwc-montaje-hint">' + mh.summary + '</span>' : '';
        })()
      : '') +
    ' Recirculación ' + rdwcFlowChip(calc.estadoRec) + ' · Aire ' + rdwcFlowChip(calc.estadoAir) + '.' +
    ' La aireación principal conviene repartirla en los <strong>cubos de cultivo</strong> (zona radicular); el depósito de control puede llevar apoyo opcional.' +
    ' Para nutrientes, añade los productos en el <strong>depósito de control</strong> con la recirculación en marcha; la dosis se calcula sobre ese total útil.';
}

function renderRdwcCompatStatus(cfg, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const comp = rdwcEvaluarCompatConfig(cfg || state.configTorre || {});
  if (!comp) {
    el.innerHTML = '';
    el.classList.add('setup-hidden');
    el.hidden = true;
    return;
  }
  const soloAvisoEnSistema = elId === 'sysRdwcCompatStatus' && comp.globalEstado === 'ok';
  if (soloAvisoEnSistema) {
    el.innerHTML = '';
    el.classList.add('setup-hidden');
    el.hidden = true;
    return;
  }
  el.classList.remove('setup-hidden');
  el.hidden = false;
  const btnHtml =
    elId === 'sysRdwcCompatStatus'
      ? '<button type="button" class="rdwc-compat-btn" onclick="aplicarRdwcRecomendacionBaseSistema()">Aplicar base según cultivo</button>'
      : '<button type="button" class="rdwc-compat-btn" onclick="aplicarRdwcRecomendacionBaseSetup()">Aplicar base según cultivo</button>';
  el.innerHTML =
    '<span class="rdwc-compat-text">' +
    rdwcCompatTextoResumen(comp) +
    '</span>' +
    btnHtml;
}

function bindRdwcCompatLive(scope) {
  if (scope === 'sys') return;
  const ids = [
    'setupRdwcPreset',
    'setupRdwcCultivoPrevisto',
    'setupRdwcSites',
    'setupRdwcRows',
    'setupRdwcBucketVolL',
    'setupRdwcControlVolL',
    'setupRdwcControlTrabajoL',
    'setupRdwcRecircPumpW',
    'setupRdwcAirPumpW',
    'setupRdwcAirLpm',
    'setupRdwcNetPotMm',
    'setupRdwcNetPotHeightMm',
    'setupRdwcCenterSpacingCm',
    'setupRdwcSupplyTubeMm',
    'setupRdwcReturnTubeMm',
  ];
  const render = () => {
    const c =
      typeof getSetupRdwcDraftSeed === 'function'
        ? getSetupRdwcDraftSeed()
        : setupRdwcDraft || {};
    const g = (id, fb) => {
      const el = document.getElementById(id);
      const n = parseFloat(String((el && el.value) || '').replace(',', '.'));
      return Number.isFinite(n) ? n : fb;
    };
    const c2 = { ...c, tipoInstalacion: 'rdwc' };
    c2.rdwcCultivoPrevisto = String(document.getElementById('setupRdwcCultivoPrevisto')?.value || '').trim();
    c2.rdwcSites = g('setupRdwcSites', c.rdwcSites || 4);
    c2.rdwcRows = g('setupRdwcRows', c.rdwcRows || 1);
    c2.rdwcBucketVolL = g('setupRdwcBucketVolL', c.rdwcBucketVolL || 20);
    c2.rdwcControlVolL = g('setupRdwcControlVolL', c.rdwcControlVolL || 40);
    c2.volMezclaLitros = rdwcParseLitrosTrabajo(document.getElementById('setupRdwcControlTrabajoL')?.value);
    const recPumpW = rdwcParsePotenciaW(document.getElementById('setupRdwcRecircPumpW')?.value);
    if (recPumpW != null) c2.rdwcRecircPumpW = recPumpW;
    else delete c2.rdwcRecircPumpW;
    const airPumpW = rdwcParsePotenciaW(document.getElementById('setupRdwcAirPumpW')?.value);
    if (airPumpW != null) c2.rdwcAirPumpW = airPumpW;
    else delete c2.rdwcAirPumpW;
    const airRaw = String(document.getElementById('setupRdwcAirLpm')?.value || '').trim();
    if (airRaw) c2.rdwcAirLpm = g('setupRdwcAirLpm', c.rdwcAirLpm || 20);
    else delete c2.rdwcAirLpm;
    if (typeof rdwcSyncRecircLhDesdeCalculo === 'function') rdwcSyncRecircLhDesdeCalculo(c2);
    c2.rdwcNetPotMm = g('setupRdwcNetPotMm', c.rdwcNetPotMm || 125);
    const hSetup = rdwcParseNetPotHeightMm(document.getElementById('setupRdwcNetPotHeightMm')?.value);
    if (hSetup != null) c2.rdwcNetPotHeightMm = hSetup;
    else delete c2.rdwcNetPotHeightMm;
    c2.rdwcCenterSpacingCm = g('setupRdwcCenterSpacingCm', c.rdwcCenterSpacingCm || 45);
    c2.rdwcSupplyTubeMm = g('setupRdwcSupplyTubeMm', c.rdwcSupplyTubeMm || 25);
    c2.rdwcReturnTubeMm = g('setupRdwcReturnTubeMm', c.rdwcReturnTubeMm || 32);
    delete c2.rdwcCultivoPrevisto;
    setupRdwcDraft = hcSetupClonePlain(c2, {});
    try {
      if (typeof renderRdwcSetupCalculadoUi === 'function') renderRdwcSetupCalculadoUi(c2);
    } catch (_) {}
    try {
      if (typeof refreshRdwcSetupPreview === 'function') refreshRdwcSetupPreview();
    } catch (_) {}
    try {
      syncRdwcBombasUi(c2);
    } catch (_) {}
  };
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.rdwcCompatBound === '1') return;
    el.dataset.rdwcCompatBound = '1';
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });
}

function aplicarRdwcRecomendacionBaseSistema() {
  const c = state.configTorre || (state.configTorre = {});
  if (tipoInstalacionNormalizado(c) !== 'rdwc') return;
  const sites = Math.max(2, Math.round(Number(c.rdwcSites || 4)));
  const recirc = Math.max(1200, Math.round(sites * 220));
  const air = Math.max(10, Math.round(sites * 2.5));
  const cTmp = { ...c, tipoInstalacion: 'rdwc', rdwcCultivoPrevisto: String(document.getElementById('sysRdwcCultivoPrevisto')?.value || c.rdwcCultivoPrevisto || '').trim() };
  const base = rdwcRecomendacionBaseDesdeConfig(cTmp);
  const cestaBase = base ? base.cestaBase : 125;
  const bucketBase = base ? base.bucketBase : 20;
  const sepBase = base ? base.sepBase : 45;
  const controlBase = base ? base.controlMaxBase : 40;
  const controlTrabajoBase = base ? base.controlTrabajoBase : 34;
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = String(v);
  };
  setVal('sysRdwcBucketVolL', bucketBase);
  setVal('sysRdwcNetPotMm', cestaBase);
  setVal('sysRdwcCenterSpacingCm', sepBase);
  setVal('sysRdwcControlVolL', controlBase);
  setVal('sysRdwcControlTrabajoL', controlTrabajoBase);
  setVal('sysRdwcRecirculationLh', recirc);
  setVal('sysRdwcAirLpm', air);
  setVal('sysRdwcTempObjetivoC', 19);
  setVal('sysRdwcHeadM', 1.2);
  setVal('sysRdwcLineLenM', 12);
  setVal('sysRdwcFittings', 12);
  aplicarSistemaRdwcDesdeFormulario();
  showToast('RDWC: recomendación base aplicada según cultivo');
}

function aplicarRdwcRecomendacionBaseSetup() {
  if (setupTipoInstalacion !== 'rdwc') return;
  const c = getSetupRdwcDraftSeed();
  const sites = Math.max(2, Math.round(Number(c.rdwcSites || 4)));
  const recirc = Math.max(1200, Math.round(sites * 220));
  const air = Math.max(10, Math.round(sites * 2.5));
  const cTmp = { ...c, tipoInstalacion: 'rdwc', rdwcCultivoPrevisto: String(document.getElementById('setupRdwcCultivoPrevisto')?.value || c.rdwcCultivoPrevisto || '').trim() };
  const base = rdwcRecomendacionBaseDesdeConfig(cTmp);
  const cestaBase = base ? base.cestaBase : 125;
  const bucketBase = base ? base.bucketBase : 20;
  const sepBase = base ? base.sepBase : 45;
  const controlBase = base ? base.controlMaxBase : 40;
  const controlTrabajoBase = base ? base.controlTrabajoBase : 34;
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = String(v);
  };
  setVal('setupRdwcBucketVolL', bucketBase);
  setVal('setupRdwcNetPotMm', cestaBase);
  setVal('setupRdwcCenterSpacingCm', sepBase);
  setVal('setupRdwcControlVolL', controlBase);
  setupRdwcDraft = applySetupRdwcDesdeFormulario();
  if (typeof rdwcSyncRecircLhDesdeCalculo === 'function') rdwcSyncRecircLhDesdeCalculo(setupRdwcDraft);
  const recW = typeof rdwcEstimateRecircPumpW === 'function' ? rdwcEstimateRecircPumpW(setupRdwcDraft) : null;
  const airW = rdwcEstimateAirPumpW(air);
  if (recW != null) setVal('setupRdwcRecircPumpW', recW);
  if (airW != null) setVal('setupRdwcAirPumpW', airW);
  setVal('setupRdwcAirLpm', air);
  setupRdwcDraft = applySetupRdwcDesdeFormulario();
  try { renderSetupPage(); } catch (_) {}
  showToast('RDWC (setup): recomendación base aplicada según cultivo');
}

function torreNormalizeObjetivoCultivo(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  return v === 'baby' || v === 'babyleaf' || v === 'alta' ? 'baby' : 'final';
}

function torreGetObjetivoCultivo(cfg) {
  const c = cfg || state.configTorre || {};
  if (c.torreObjetivoCultivo) return torreNormalizeObjetivoCultivo(c.torreObjetivoCultivo);
  const mk = typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  return mk === 'mini' ? 'baby' : 'final';
}

function torreGetObjetivoSpec(objetivo) {
  const k = torreNormalizeObjetivoCultivo(objetivo);
  if (k === 'baby') {
    return {
      key: 'baby',
      label: 'Alta densidad / baby leaf (cosecha joven)',
      densidadTxt: '8–12 cm c-c',
      cicloTxt: 'cosecha joven (aprox. 20–35 días)',
    };
  }
  return {
    key: 'final',
    label: 'Planta adulta (tamaño completo)',
    densidadTxt: '15–25 cm c-c',
    cicloTxt: 'cosecha completa (aprox. 35–60 días)',
  };
}

/**
 * Multiplicador de demanda de riego para torre vertical según objetivo.
 * Permite override técnico en config (sin exponer más UI por ahora):
 * - cfg.torreObjetivoMultBaby (por defecto 0.92)
 * - cfg.torreObjetivoMultFinal (por defecto 1.06)
 */
function torreObjetivoMultiplicadorDemanda(cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const obj = torreNormalizeObjetivoCultivo(objetivo || torreGetObjetivoCultivo(c));
  const bRaw = Number(c.torreObjetivoMultBaby);
  const fRaw = Number(c.torreObjetivoMultFinal);
  const multBaby = Number.isFinite(bRaw) ? Math.max(0.7, Math.min(1.2, bRaw)) : 0.92;
  const multFinal = Number.isFinite(fRaw) ? Math.max(0.7, Math.min(1.3, fRaw)) : 1.06;
  return obj === 'baby' ? multBaby : multFinal;
}

/**
 * Perfil agronómico orientativo para torre según objetivo de cosecha.
 * Basado en prácticas habituales (baby: algo menos de EC, ciclo más corto).
 */
function torreGetObjetivoAjustes(cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const obj = torreNormalizeObjetivoCultivo(objetivo || torreGetObjetivoCultivo(c));
  const ecBabyRaw = Number(c.torreObjetivoEcMultBaby);
  const ecFinalRaw = Number(c.torreObjetivoEcMultFinal);
  const phBabyRaw = Number(c.torreObjetivoPhShiftBaby);
  const diasBabyRaw = Number(c.torreObjetivoDiasMultBaby);
  const diasFinalRaw = Number(c.torreObjetivoDiasMultFinal);
  return {
    objetivo: obj,
    ecMult: obj === 'baby'
      ? (Number.isFinite(ecBabyRaw) ? Math.max(0.7, Math.min(1.15, ecBabyRaw)) : 0.88)
      : (Number.isFinite(ecFinalRaw) ? Math.max(0.8, Math.min(1.25, ecFinalRaw)) : 1),
    phShift: obj === 'baby'
      ? (Number.isFinite(phBabyRaw) ? Math.max(-0.3, Math.min(0.4, phBabyRaw)) : 0.1)
      : 0,
    diasMult: obj === 'baby'
      ? (Number.isFinite(diasBabyRaw) ? Math.max(0.5, Math.min(1.1, diasBabyRaw)) : 0.72)
      : (Number.isFinite(diasFinalRaw) ? Math.max(0.8, Math.min(1.4, diasFinalRaw)) : 1),
  };
}

function torreAplicarObjetivoEcRango(ecRange, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  if (tipoInstalacionNormalizado(c) !== 'torre') return ecRange;
  const baseMin = Number(ecRange && ecRange.min);
  const baseMax = Number(ecRange && ecRange.max);
  if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) return ecRange;
  const adj = torreGetObjetivoAjustes(c, objetivo);
  const minAdj = Math.max(350, Math.round(baseMin * adj.ecMult));
  const maxAdj = Math.max(minAdj + 80, Math.round(baseMax * adj.ecMult));
  return { min: minAdj, max: maxAdj };
}

function torreGetPhRangoObjetivo(nut, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const n = nut || getNutrienteTorre();
  const base = (n && Array.isArray(n.pHRango) && n.pHRango.length >= 2) ? n.pHRango : [5.5, 6.5];
  if (tipoInstalacionNormalizado(c) !== 'torre') return [base[0], base[1]];
  const adj = torreGetObjetivoAjustes(c, objetivo);
  const pMin = Math.round((Math.max(4.8, Math.min(6.9, Number(base[0]) + adj.phShift))) * 10) / 10;
  const pMax = Math.round((Math.max(pMin + 0.2, Math.min(7.2, Number(base[1]) + adj.phShift))) * 10) / 10;
  return [pMin, pMax];
}

function torreGetDiasCosechaObjetivo(diasBase, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  const d = Number(diasBase);
  if (!Number.isFinite(d) || d <= 0) return 45;
  if (tipoInstalacionNormalizado(c) !== 'torre') return Math.max(18, Math.round(d));
  const adj = torreGetObjetivoAjustes(c, objetivo);
  return Math.max(14, Math.round(d * adj.diasMult));
}

function nftNormalizeObjetivoCultivo(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  return v === 'baby' || v === 'babyleaf' || v === 'alta' ? 'baby' : 'final';
}

function nftGetObjetivoCultivo(cfg) {
  const c = cfg || state.configTorre || {};
  if (c.nftObjetivoCultivo) return nftNormalizeObjetivoCultivo(c.nftObjetivoCultivo);
  if (c.torreObjetivoCultivo) return torreNormalizeObjetivoCultivo(c.torreObjetivoCultivo);
  const mk = typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  return mk === 'mini' ? 'baby' : 'final';
}

/** Ajuste de rango EC por objetivo baby/final en NFT (misma lógica orientativa que torre/DWC). */
function nftAplicarObjetivoEcRango(ecRange, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  if (tipoInstalacionNormalizado(c) !== 'nft') return ecRange;
  const baseMin = Number(ecRange && ecRange.min);
  const baseMax = Number(ecRange && ecRange.max);
  if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) return ecRange;
  const objRaw =
    objetivo != null
      ? objetivo
      : (typeof nftGetObjetivoCultivo === 'function' ? nftGetObjetivoCultivo(c) : 'final');
  const obj = torreNormalizeObjetivoCultivo(objRaw);
  const adj = torreGetObjetivoAjustes(c, obj);
  const minAdj = Math.max(350, Math.round(baseMin * adj.ecMult));
  const maxAdj = Math.max(minAdj + 80, Math.round(baseMax * adj.ecMult));
  return { min: minAdj, max: maxAdj };
}

function nftGetObjetivoSpec(objetivo) {
  const k = nftNormalizeObjetivoCultivo(objetivo);
  if (k === 'baby') {
    return {
      key: 'baby',
      label: 'Alta densidad / baby leaf (cosecha joven)',
      densidadTxt: '8–12 cm c-c',
      cicloTxt: 'cosecha joven (aprox. 20–35 días)',
    };
  }
  return {
    key: 'final',
    label: 'Planta adulta (tamaño completo)',
    densidadTxt: '15–25 cm c-c',
    cicloTxt: 'cosecha completa (aprox. 35–60 días)',
  };
}

/** Etiquetas de nivel y plaza según tipo de instalación (índices 1-based en texto). */
function labelsUbicacionInstalacion(tipoInstal) {
  const t = (tipoInstal === 'nft' || tipoInstal === 'dwc' || tipoInstal === 'rdwc' || tipoInstal === 'srf' || tipoInstal === 'torre') ? tipoInstal : 'torre';
  return {
    lblPlaza: t === 'nft' ? 'hueco' : t === 'dwc' ? 'maceta' : t === 'rdwc' ? 'cubo' : t === 'srf' ? 'planta' : 'cesta',
    lblNivel: t === 'nft' ? 'Canal' : t === 'rdwc' || t === 'srf' ? 'Fila' : 'Nivel',
  };
}

/** Texto tipo «Canal 2, hueco 3» desde valores 1-based guardados en registro / diario. */
function formatoUbicacionEnRegistro(tipoInstal, nivel1Based, plaza1Based) {
  if (nivel1Based == null || plaza1Based == null || nivel1Based === '' || plaza1Based === '') return '';
  const n = parseInt(String(nivel1Based), 10);
  const p = parseInt(String(plaza1Based), 10);
  if (!Number.isFinite(n) || !Number.isFinite(p)) return '';
  const { lblPlaza, lblNivel } = labelsUbicacionInstalacion(tipoInstal);
  return lblNivel + ' ' + n + ', ' + lblPlaza + ' ' + p;
}

/** Tipo de instalación para mostrar una entrada antigua: snapshot; si no, config de la torre del registro; si no, activa. */
function tipoInstalParaEntradaRegistro(e) {
  const s = e && e.tipoInstalSnap;
  if (s === 'nft' || s === 'dwc' || s === 'rdwc' || s === 'srf' || s === 'torre') return s;
  const tid = e && e.torreId;
  if (tid != null && Array.isArray(state.torres)) {
    const tr = state.torres.find(t => t.id === tid);
    if (tr && tr.config) return tipoInstalacionNormalizado(tr.config);
  }
  return tipoInstalacionNormalizado(state.configTorre || {});
}

/** Nombre/emoji del sistema para entradas históricas (registro/mediciones/recargas). */
function infoSistemaEntrada(e) {
  const fallback = { nombre: 'Instalación', emoji: '🌿' };
  if (!e || typeof e !== 'object') return fallback;
  const nombreDirecto = String(e.torreNombre || '').trim();
  const emojiDirecto = e.torreEmoji || '🌿';
  if (nombreDirecto) return { nombre: nombreDirecto, emoji: emojiDirecto };
  const tid = e.torreId;
  if (tid != null && Array.isArray(state.torres)) {
    const tr = state.torres.find(t => t.id === tid);
    if (tr) return {
      nombre: (String(tr.nombre || '').trim() || 'Instalación'),
      emoji: tr.emoji || '🌿',
    };
  }
  const ta = getTorreActiva ? getTorreActiva() : null;
  if (ta) return {
    nombre: (String(ta.nombre || '').trim() || 'Instalación'),
    emoji: ta.emoji || '🌿',
  };
  return fallback;
}
let setupEquipamiento = new Set(['difusor', 'calentador', 'bomba']);
/** NFT: Ø interior línea de alimentación/distribución desde bomba (no el canal de cultivo 75–110 mm), mm — 16–40 */
let setupNftTuboMm = null;

/** true si el usuario eligió un Ø de tubería de riego en el asistente (chip marcado). */
function nftTuboRiegoElegidoEnSetup() {
  return [16, 20, 25, 32, 40].some(d => document.getElementById('nftTubo' + d)?.classList.contains('selected'));
}

function hcResetNftTuboRiegoSeleccion() {
  setupNftTuboMm = null;
  [16, 20, 25, 32, 40].forEach(d => {
    const el = document.getElementById('nftTubo' + d);
    if (el) el.classList.remove('selected');
  });
  const block = document.getElementById('setupNftRecoBlock');
  if (block) {
    block.classList.add('setup-hidden');
    block.setAttribute('aria-hidden', 'true');
  }
}
let setupNftCanalDiamMm = 90;

function readNftCanalGeomFromSetupUi() {
  const rect = document.getElementById('nftCanalFormaRect')?.classList.contains('selected');
  const lamRaw = parseFloat(String(document.getElementById('sliderNftLamina')?.value ?? '3'));
  const laminaMm = Number.isFinite(lamRaw) ? Math.min(6, Math.max(2, lamRaw)) : 3;
  const longRaw = parseFloat(String(document.getElementById('nftLongCanalM')?.value || '').replace(',', '.'));
  const anchoRaw = parseInt(String(document.getElementById('nftCanalAnchoMm')?.value || '100'), 10);
  return {
    forma: rect ? 'rectangular' : 'redondo',
    diamMm: Math.min(160, Math.max(50, setupNftCanalDiamMm || 90)),
    anchoMm: Number.isFinite(anchoRaw) ? Math.min(220, Math.max(40, anchoRaw)) : 100,
    laminaMm,
    longCanalM: Number.isFinite(longRaw) && longRaw > 0 ? Math.min(15, Math.max(0.5, longRaw)) : null,
  };
}

function onSliderNftLaminaInput() {
  const s = document.getElementById('sliderNftLamina');
  const v = document.getElementById('valNftLamina');
  if (v && s) v.innerHTML = s.value + '<span class="setup-inline-unit-mm"> mm</span>';
  updateNftSetupPreview();
}

function seleccionarNftCanalForma(which) {
  const rect = which !== 'redondo';
  const rd = document.getElementById('nftCanalFormaRedondo');
  const rt = document.getElementById('nftCanalFormaRect');
  const wrapR = document.getElementById('nftCanalRedondoWrap');
  const wrapRt = document.getElementById('nftCanalRectWrap');
  if (rd) {
    rd.classList.toggle('selected', !rect);
    rd.setAttribute('aria-pressed', !rect ? 'true' : 'false');
  }
  if (rt) {
    rt.classList.toggle('selected', rect);
    rt.setAttribute('aria-pressed', rect ? 'true' : 'false');
  }
  if (wrapR) wrapR.style.display = rect ? 'none' : 'block';
  if (wrapRt) wrapRt.style.display = rect ? 'block' : 'none';
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
}

function seleccionarNftCanalDiam(mm) {
  setupNftCanalDiamMm = Math.max(50, Math.min(160, parseInt(String(mm), 10) || 90));
  [75, 90, 110].forEach(d => {
    const el = document.getElementById('nftCanalDiam' + d);
    if (el) el.classList.toggle('selected', d === setupNftCanalDiamMm);
  });
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  try {
    renderNftCultivoRecoStatus('setup');
  } catch (_) {}
}
let setupUbicacion = 'exterior';
let setupNutriente = 'canna_aqua';
let setupCoordenadas = { lat: null, lon: null, ciudad: '' };

const SETUP_TOTAL_PAGES = 8; // 0=bienvenida, 1=torre, 2=equipo, 3=nutrientes

function abrirSetup() {
  // Reconfigurar instalación existente (no crear ranura nueva) salvo que se abra «Nuevo sistema»
  try {
    if (typeof hcResetSetupWizardSession === 'function') hcResetSetupWizardSession();
  } catch (_) {}
  try {
    hcSetSetupSlidersBlankMode(false);
  } catch (_) {}
  setupEsNuevaTorre = false;
  setupPagina = 0;
  const sh = (state.configTorre && state.configTorre.sensoresHardware) || {};
  setupData.sensoresHardware = {
    ec: !!sh.ec,
    ph: !!sh.ph,
    humedad: !!sh.humedad,
  };
  const c = state.configTorre || {};
  syncSetupEquipamientoDesdeConfig(c);
  setupTipoInstalacion = tipoInstalacionNormalizado(c);
  setupRdwcDraft = setupTipoInstalacion === 'rdwc' ? hcSetupClonePlain(c, {}) : null;
  if (setupTipoInstalacion === 'rdwc') {
    try { syncSetupRdwcFieldsDesdeConfig(c); } catch (_) {}
  }
  if (setupTipoInstalacion === 'srf') {
    try {
      syncSrfFormDesdeConfig(c, 'setup');
    } catch (_) {}
    try {
      if (typeof syncSetupVolMezclaSugeridoSrf === 'function') syncSetupVolMezclaSugeridoSrf();
    } catch (_) {}
  }
  const snc = document.getElementById('sliderNftCanales');
  const snh = document.getElementById('sliderNftHuecos');
  const snp = document.getElementById('sliderNftPendiente');
  const dispN = nftDisposicionNormalizada(c.nftDisposicion);
  let sliderCanales = Math.max(1, Math.min(24, c.nftNumCanales || c.numNiveles || 4));
  if (dispN === 'escalera' && c.nftEscaleraNivelesCara != null && Number(c.nftEscaleraNivelesCara) > 0) {
    sliderCanales = Math.max(1, Math.min(12, Math.round(Number(c.nftEscaleraNivelesCara))));
  }
  if (snc) snc.value = String(sliderCanales);
  if (snh) snh.value = String(Math.max(2, Math.min(30, c.nftHuecosPorCanal || c.numCestas || 8)));
  if (snp) snp.value = String(Math.max(1, Math.min(4, c.nftPendientePct != null ? Math.round(c.nftPendientePct) : 2)));
  const altB = document.getElementById('nftAlturaBombeoCm');
  if (altB) {
    altB.value =
      c.nftAlturaBombeoCm != null && Number(c.nftAlturaBombeoCm) > 0 ? String(Math.round(Number(c.nftAlturaBombeoCm))) : '';
  }
  seleccionarNftDisposicion(c.nftDisposicion || 'mesa');
  syncNftMesaRecorridoUiFromCfg(c);
  const mmChk = document.getElementById('nftMesaMultinivelChk');
  if (mmChk) mmChk.checked = c.nftMesaMultinivel === true;
  if (mmChk && mmChk.checked) {
    const tiersW = parseNftMesaTubosPorNivelStrLoose(c.nftMesaTubosPorNivelStr || '');
    const tiersUse = tiersW.length >= 2 ? tiersW : [0, 0];
    let huecosW = parseNftMesaHuecosPorNivelStrLoose(c.nftMesaHuecosPorNivelStr || '');
    if (huecosW.length < tiersUse.length) {
      const hxFb = Math.max(0, parseInt(String(c.nftHuecosPorCanal ?? c.numCestas ?? ''), 10) || 0);
      while (huecosW.length < tiersUse.length) huecosW.push(hxFb);
    }
    rebuildNftMesaMultinivelTierSliders('nft', tiersUse, huecosW);
  } else {
    const host = document.getElementById('nftMesaTierConfigHost');
    if (host) host.innerHTML = '';
  }
  const mmSep = document.getElementById('nftMesaSepNivelesCm');
  if (mmSep) {
    mmSep.value =
      c.nftMesaSeparacionNivelesCm != null && Number(c.nftMesaSeparacionNivelesCm) > 0
        ? String(Math.round(Number(c.nftMesaSeparacionNivelesCm)))
        : '';
  }
  seleccionarNftEscaleraCaras(nftEscaleraCarasNormalizada(c.nftEscaleraCaras));
  onNftMesaMultinivelToggle();
  refrescarNftMontajeSubpanels();
  const tuboCfg = parseInt(String(c.nftTuboInteriorMm), 10);
  if (Number.isFinite(tuboCfg) && tuboCfg >= 16 && tuboCfg <= 40) {
    seleccionarTuboNft(tuboCfg);
  } else {
    hcResetNftTuboRiegoSeleccion();
  }
  setupNftCanalDiamMm = Math.max(50, Math.min(160, parseInt(String(c.nftCanalDiamMm), 10) || 90));
  const anchEl = document.getElementById('nftCanalAnchoMm');
  if (anchEl) anchEl.value = String(c.nftCanalAnchoMm != null ? c.nftCanalAnchoMm : 100);
  const lcmEl = document.getElementById('nftLongCanalM');
  if (lcmEl) lcmEl.value = c.nftLongCanalM != null && c.nftLongCanalM !== '' ? String(c.nftLongCanalM) : '';
  seleccionarNftCanalForma(c.nftCanalForma === 'rectangular' ? 'rectangular' : 'redondo');
  seleccionarNftCanalDiam(setupNftCanalDiamMm);
  const rimNftIn = document.getElementById('setupNftPotRimMm');
  const hNftIn = document.getElementById('setupNftPotHmm');
  if (rimNftIn) {
    const rNv =
      c.nftNetPotRimMm != null && Number(c.nftNetPotRimMm) > 0
        ? Math.round(Number(c.nftNetPotRimMm))
        : c.dwcNetPotRimMm != null && Number(c.dwcNetPotRimMm) > 0
          ? Math.round(Number(c.dwcNetPotRimMm))
          : '';
    rimNftIn.value = rNv !== '' ? String(rNv) : '';
  }
  if (hNftIn) {
    const hNv =
      c.nftNetPotHeightMm != null && Number(c.nftNetPotHeightMm) > 0
        ? Math.round(Number(c.nftNetPotHeightMm))
        : c.dwcNetPotHeightMm != null && Number(c.dwcNetPotHeightMm) > 0
          ? Math.round(Number(c.dwcNetPotHeightMm))
          : '';
    hNftIn.value = hNv !== '' ? String(hNv) : '';
  }
  try {
    syncNftPotRimChipsFromInput();
  } catch (_) {}
  const lamEl = document.getElementById('sliderNftLamina');
  if (lamEl) {
    const lm = Number.isFinite(parseFloat(String(c.nftLaminaAguaMm)))
      ? Math.min(5, Math.max(2, parseFloat(String(c.nftLaminaAguaMm))))
      : 3;
    lamEl.value = String(lm);
    onSliderNftLaminaInput();
  }
  const sv = document.getElementById('sliderVol');
  const svm = document.getElementById('setupVolMezclaL');
  if (sv) {
    const vmax = Number(c.volDeposito);
    const snapped = Number.isFinite(vmax) && vmax > 0
      ? Math.max(5, Math.min(100, Math.round(vmax / 5) * 5))
      : 20;
    sv.value = String(snapped);
  }
  if (svm && setupTipoInstalacion !== 'rdwc') {
    let maxL = parseInt(sv?.value || '20', 10);
    if (setupTipoInstalacion === 'dwc' && typeof getSetupVolumenMaxLitros === 'function') {
      const mCap = getSetupVolumenMaxLitros();
      if (Number.isFinite(mCap) && mCap > 0) maxL = Math.round(mCap * 10) / 10;
    }
    const mez = Number(c.volMezclaLitros);
    if (Number.isFinite(mez) && mez > 0 && mez < maxL - 0.02) {
      svm.value = String(Math.round(mez * 10) / 10);
    } else {
      svm.value = '';
    }
  }
  try {
    syncDwcFormInputsDesdeConfig(c, DWC_FORM_IDS_SETUP);
  } catch (eDwc) {}
  if (setupTipoInstalacion === 'dwc') {
    try {
      if (typeof onSetupDwcMedidasInput === 'function') onSetupDwcMedidasInput({ forceMezcla: true });
    } catch (_) {}
  }

  if (tipoInstalacionNormalizado(c) === 'torre') {
    try {
      restaurarSetupTorreBuilderControls();
    } catch (_) {}
    const nTorre = Math.max(1, Math.min(10, parseInt(String(c.numNiveles || 5), 10) || 5));
    const cTorre = Math.max(1, Math.min(8, parseInt(String(c.numCestas || 5), 10) || 5));
    const snTorre = document.getElementById('sliderNiveles');
    const scTorre = document.getElementById('sliderCestas');
    if (snTorre) snTorre.value = String(nTorre);
    if (scTorre) scTorre.value = String(cTorre);
    const vnTorre = document.getElementById('valNiveles');
    const vcTorre = document.getElementById('valCestas');
    if (vnTorre) vnTorre.textContent = String(nTorre);
    if (vcTorre) vcTorre.textContent = String(cTorre);
    setupDiametroTubo =
      c.diametroTubo != null && Number(c.diametroTubo) > 0 ? Math.round(Number(c.diametroTubo)) : 75;
    setupAntiRaices = c.antiRaices || 'tubo_interior';
    setupAlturaTorre = Number.isFinite(parseFloat(String(c.alturaTorre))) ? parseFloat(String(c.alturaTorre)) : 1.2;
    const saTorre = document.getElementById('sliderAltura');
    if (saTorre) saTorre.value = String(Math.max(0.5, Math.min(3, setupAlturaTorre)));
    const vaTorre = document.getElementById('valAltura');
    if (vaTorre) vaTorre.textContent = ' ' + setupAlturaTorre.toFixed(1) + 'm';
  }
  if (tipoInstalacionNormalizado(c) === 'dwc') {
    try {
      if (typeof dwcAsegurarOxigenacionCoherenteConRejilla === 'function') dwcAsegurarOxigenacionCoherenteConRejilla(c);
    } catch (_) {}
    const mcDwc =
      typeof dwcGetOxigenacionDiseno === 'function' && dwcGetOxigenacionDiseno(c) === 'cubos_independientes';
    if (mcDwc) {
      const elNc = document.getElementById('setupDwcNumCubos');
      const nCub = Math.max(
        1,
        Math.min(8, parseInt(String(c.dwcNumCubos ?? c.numCestas ?? 4), 10) || 4)
      );
      if (elNc) elNc.value = String(nCub);
    } else {
      const snD = document.getElementById('sliderNiveles');
      const scD = document.getElementById('sliderCestas');
      const nD = Math.max(1, Math.min(10, parseInt(String(c.numNiveles || 2), 10) || 2));
      const cD = Math.max(1, Math.min(8, parseInt(String(c.numCestas || 3), 10) || 3));
      if (snD) snD.value = String(nD);
      if (scD) scD.value = String(cD);
      const vnD = document.getElementById('valNiveles');
      const vcD = document.getElementById('valCestas');
      if (vnD) vnD.textContent = String(nD);
      if (vcD) vcD.textContent = String(cD);
    }
  }

  const latC = parseFloat(c.lat);
  const lonC = parseFloat(c.lon);
  setupCoordenadas = {
    ciudad: (c.ciudad && String(c.ciudad).trim()) || '',
    lat: Number.isFinite(latC) ? latC : null,
    lon: Number.isFinite(lonC) ? lonC : null
  };
  setupData.ciudad = setupCoordenadas.ciudad || null;
  setupData.lat = setupCoordenadas.lat;
  setupData.lon = setupCoordenadas.lon;
  setupData.consejosModoUi = c.consejosModoUi === 'avanzado' ? 'avanzado' : 'principiante';

  const o = document.getElementById('setupOverlay');
  o.classList.add('open');
  renderNutrientesGrid();
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  else if (setupTipoInstalacion === 'dwc') {
    try {
      if (typeof dwcSyncSetupMontajePreview === 'function') dwcSyncSetupMontajePreview();
    } catch (_) {}
  } else updateTorreBuilder();
  try {
    if (setupTipoInstalacion === 'nft') {
      seleccionarSetupNftMontajeOrigen('diy');
    } else if (tipoInstalacionNormalizado(c) === 'torre') {
      seleccionarSetupTorreMontajeOrigen('diy');
    }
  } catch (_) {}
  renderSetupPage();
  setTimeout(function () {
    const lhIn = document.getElementById('nftBombaUsuarioLh');
    const wIn = document.getElementById('nftBombaUsuarioW');
    if (lhIn) {
      lhIn.value =
        c.nftBombaUsuarioCaudalLh != null && c.nftBombaUsuarioCaudalLh !== ''
          ? String(c.nftBombaUsuarioCaudalLh)
          : '';
    }
    if (wIn) {
      wIn.value =
        c.nftBombaUsuarioPotenciaW != null && c.nftBombaUsuarioPotenciaW !== ''
          ? String(c.nftBombaUsuarioPotenciaW)
          : '';
    }
    if (setupTipoInstalacion === 'nft') refrescarUIMensajeBombaUsuarioNft('setup');
    if (tipoInstalacionNormalizado(c) === 'torre') {
      const lhT = document.getElementById('setupTorreBombaUsuarioLh');
      const wT = document.getElementById('setupTorreBombaUsuarioW');
      if (lhT) {
        lhT.value =
          c.torreBombaUsuarioCaudalLh != null && c.torreBombaUsuarioCaudalLh !== ''
            ? String(c.torreBombaUsuarioCaudalLh)
            : '';
      }
      if (wT) {
        wT.value =
          c.torreBombaUsuarioPotenciaW != null && c.torreBombaUsuarioPotenciaW !== ''
            ? String(c.torreBombaUsuarioPotenciaW)
            : '';
      }
      refrescarUIMensajeBombaUsuarioTorre();
    }
  }, 0);
  a11yDialogOpened(o);
}

function cerrarSetup() {
  const o = document.getElementById('setupOverlay');
  o.classList.remove('open');
  a11yDialogClosed(o);
  try {
    hcSetSetupSlidersBlankMode(false);
  } catch (_) {}
  try {
    if (typeof hcResetSetupWizardSession === 'function') hcResetSetupWizardSession();
  } catch (_) {}
  try {
    if (
      typeof scheduleTabBarCoach === 'function' &&
      !(state && state.hcPostSetupChecklistPendiente) &&
      !(typeof hcDebeEvitarReabrirAsistenteTrasSetup === 'function' && hcDebeEvitarReabrirAsistenteTrasSetup())
    ) {
      scheduleTabBarCoach(500);
    }
  } catch (_) {}
}

function iniciarConfiguracionTorre() {
  if (setupEsNuevaTorre && setupTipoInstalacion !== 'torre' && setupTipoInstalacion !== 'nft' && setupTipoInstalacion !== 'dwc' && setupTipoInstalacion !== 'rdwc' && setupTipoInstalacion !== 'srf') {
    showToast('Elige Torre, NFT, DWC, RDWC o SRF antes de continuar', true);
    return;
  }
  setupTipoTorre = 'custom';
  setupPagina = 1;
  renderSetupPage();
}

/**
 * Oculta chips Kit/DIY y bomba orientativa salvo en paso 1 con torre vertical
 * (sin preguntar Ø de tubo central; niveles/cestas + altura + bomba).
 * Importante: debe ejecutarse aunque setupPagina !== 1 (antes el return temprano impedía ocultar al cambiar de tipo en otros pasos).
 */
function aplicarSetupWizardExclusividadTorreVertical() {
  const tipo = typeof setupTipoInstalacion !== 'undefined' ? setupTipoInstalacion : 'torre';
  const pag = typeof setupPagina !== 'undefined' ? setupPagina : 0;
  const sec = document.getElementById('seccionTuboBomba');
  const mostrarBloqueTorreMontajeYTubo = tipo === 'torre' && pag === 1;
  if (!mostrarBloqueTorreMontajeYTubo) {
    if (sec) {
      sec.style.display = 'none';
      sec.classList.add('setup-hidden');
    }
    try {
      if (typeof mostrarSeccionTuboBomba === 'function') mostrarSeccionTuboBomba(false);
    } catch (_) {}
    return;
  }
  try {
    restaurarSetupTorreBuilderControls();
  } catch (_) {}
  try {
    seleccionarSetupTorreMontajeOrigen('diy');
  } catch (_) {}
}

function seleccionarTipoInstalacionSetup(tipo) {
  try {
    _hcExposeMontajeDiyBlocks();
  } catch (_) {}
  if (tipo === 'nft') setupTipoInstalacion = 'nft';
  else if (tipo === 'dwc') setupTipoInstalacion = 'dwc';
  else if (tipo === 'rdwc') setupTipoInstalacion = 'rdwc';
  else if (tipo === 'srf') setupTipoInstalacion = 'srf';
  else setupTipoInstalacion = 'torre';
  if (setupEsNuevaTorre) {
    setupPlantasSeleccionadas = new Set();
    try {
      if (typeof resetSetupCestaVariedadDraft === 'function') resetSetupCestaVariedadDraft();
    } catch (_) {}
    if (typeof hcResetSetupFormForNewInstall === 'function') {
      try {
        hcResetSetupFormForNewInstall(setupTipoInstalacion);
      } catch (_) {}
    }
  }
  if (setupTipoInstalacion !== 'dwc') {
    try {
      if (typeof clearSetupVolMezclaDwcAutofill === 'function') clearSetupVolMezclaDwcAutofill();
    } catch (_) {}
  }
  if (setupTipoInstalacion !== 'srf') {
    try {
      if (typeof clearSetupVolMezclaSrfAutofill === 'function') clearSetupVolMezclaSrfAutofill();
    } catch (_) {}
  }
  if (setupTipoInstalacion === 'rdwc') {
    if (setupEsNuevaTorre) {
      setupRdwcDraft = hcFreshRdwcSetupBare();
    } else if (!setupRdwcDraft || tipoInstalacionNormalizado(setupRdwcDraft) !== 'rdwc') {
      setupRdwcDraft =
        tipoInstalacionNormalizado(state.configTorre || {}) === 'rdwc'
          ? hcSetupClonePlain(state.configTorre, {}) || hcFreshRdwcSetupDefaults()
          : hcFreshRdwcSetupDefaults();
      setupRdwcDraft.tipoInstalacion = 'rdwc';
      if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(setupRdwcDraft);
    }
  }
  refrescarSetupTipoInstalacionUI();
}

function refrescarSetupTipoInstalacionUI() {
  const torreCard = document.getElementById('setupCardTipoTorre');
  const nftCard = document.getElementById('setupCardTipoNft');
  const dwcCard = document.getElementById('setupCardTipoDwc');
  const rdwcCard = document.getElementById('setupCardTipoRdwc');
  const srfCard = document.getElementById('setupCardTipoSrf');
  [torreCard, nftCard, dwcCard, rdwcCard, srfCard].forEach(card => {
    if (!card) return;
    card.classList.remove('selected');
    card.setAttribute('aria-pressed', 'false');
  });
  if (setupTipoInstalacion === 'torre' && torreCard) {
    torreCard.classList.add('selected');
    torreCard.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'nft' && nftCard) {
    nftCard.classList.add('selected');
    nftCard.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'dwc' && dwcCard) {
    dwcCard.classList.add('selected');
    dwcCard.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'rdwc' && rdwcCard) {
    rdwcCard.classList.add('selected');
    rdwcCard.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'srf' && srfCard) {
    srfCard.classList.add('selected');
    srfCard.setAttribute('aria-pressed', 'true');
  }
  const inlTorre = document.getElementById('setupInlineTipoTorre');
  const inlNft = document.getElementById('setupInlineTipoNft');
  const inlDwc = document.getElementById('setupInlineTipoDwc');
  const inlRdwc = document.getElementById('setupInlineTipoRdwc');
  const inlSrf = document.getElementById('setupInlineTipoSrf');
  [inlTorre, inlNft, inlDwc, inlRdwc, inlSrf].forEach(btn => {
    if (!btn) return;
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
  if (setupTipoInstalacion === 'torre' && inlTorre) {
    inlTorre.classList.add('selected');
    inlTorre.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'nft' && inlNft) {
    inlNft.classList.add('selected');
    inlNft.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'dwc' && inlDwc) {
    inlDwc.classList.add('selected');
    inlDwc.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'rdwc' && inlRdwc) {
    inlRdwc.classList.add('selected');
    inlRdwc.setAttribute('aria-pressed', 'true');
  } else if (setupTipoInstalacion === 'srf' && inlSrf) {
    inlSrf.classList.add('selected');
    inlSrf.setAttribute('aria-pressed', 'true');
  }
  const cestaBlk = document.getElementById('setupBloqueTamanoCestas');
  if (cestaBlk) cestaBlk.style.display = (setupTipoInstalacion === 'dwc' || setupTipoInstalacion === 'rdwc') ? 'none' : '';
  try {
    aplicarSetupWizardExclusividadTorreVertical();
  } catch (_) {}
  if (setupPagina !== 1) {
    try {
      refreshDwcTapHintSetup();
    } catch (eTapEarly) {}
    return;
  }
  const isNft = setupTipoInstalacion === 'nft';
  const isRdwc = setupTipoInstalacion === 'rdwc';
  const isSrf = setupTipoInstalacion === 'srf';
  const tw = document.getElementById('setupTorreBuilderWrap');
  const nw = document.getElementById('setupNftBuilderWrap');
  if (tw) {
    const hideTorreBuilder = isNft || isRdwc || setupTipoInstalacion === 'dwc' || isSrf;
    tw.style.display = hideTorreBuilder ? 'none' : 'block';
  }
  if (nw) {
    nw.classList.toggle('setup-hidden', !isNft);
    nw.classList.toggle('setup-nft-asistente-simple', !!isNft);
  }
  const t1 = document.getElementById('spage1Title');
  const st = document.getElementById('spage1Subtitle');
  if (t1) {
    t1.textContent = isNft ? '🪴 Tu montaje NFT'
      : setupTipoInstalacion === 'dwc' ? '🫧 Tu DWC'
      : isRdwc ? '🧿 Tu RDWC'
      : isSrf ? 'Tu SRF'
      : '🌿 Tu torre vertical';
  }
  if (st) {
    st.textContent = isNft
      ? 'Disposición, tubos y huecos; la app calcula depósito, bomba y aireador. Detalle en Consejos.'
      : setupTipoInstalacion === 'dwc'
        ? 'Depósito: medidas interiores con cinta o litros en la caja; Ø de cesta en el envase. Rejilla y litros de mezcla los sugerimos; lo opcional puede quedar vacío.'
        : isRdwc
          ? 'Elige una plantilla (cubos × filas) o indica medidas a mano. Vista cenital: impulsión, retorno y aire con piedra en cada cubo de cultivo.'
        : isSrf
          ? 'Mide el estanque (largo × ancho × profundidad útil del agua) y cuenta huecos en la balsa. Aireación y recirculación pueden quedar por defecto.'
        : 'Niveles y cestas por nivel: manual del kit o a ojo. Depósito y tubo los afinas luego en Cultivo e instalación.';
  }
  if (setupTipoInstalacion === 'torre') {
    try {
      restaurarSetupTorreBuilderControls();
    } catch (_) {}
    try {
      const cTorreUi =
        state.configTorre && tipoInstalacionNormalizado(state.configTorre) === 'torre' ? state.configTorre : {};
      seleccionarSetupTorreMontajeOrigen('diy');
    } catch (_) {}
  }
  const dwcWizard = document.getElementById('setupDwcDetalleWrap');
  if (dwcWizard) dwcWizard.classList.toggle('setup-hidden', !(setupTipoInstalacion === 'dwc' || isRdwc));
  if (dwcWizard) dwcWizard.classList.toggle('setup-dwc-wrap--rdwc', isRdwc);
  const srfWizard = document.getElementById('setupSrfDetalleWrap');
  if (srfWizard) srfWizard.classList.toggle('setup-hidden', !isSrf);
  const dwcIntroSetup = document.getElementById('setupDwcIntroBloque');
  if (dwcIntroSetup) dwcIntroSetup.classList.toggle('setup-hidden', isRdwc);
  const rdwcWizard = document.getElementById('setupRdwcDetalleWrap');
  if (rdwcWizard) rdwcWizard.classList.toggle('setup-hidden', !isRdwc);
  const dwcSoloWizard = document.getElementById('setupDwcSoloBloque');
  if (dwcSoloWizard) dwcSoloWizard.classList.toggle('setup-hidden', isRdwc);
  if (isRdwc) {
    try {
      if (!(typeof setupEsNuevaTorre !== 'undefined' && setupEsNuevaTorre)) {
        syncSetupRdwcFieldsDesdeConfig(setupRdwcDraft || state.configTorre || {});
      }
    } catch (_) {}
    try {
      initSetupRdwcPresetSelect();
    } catch (_) {}
    try {
      if (typeof onSetupRdwcInput === 'function') onSetupRdwcInput();
    } catch (_) {}
    const rdwcW = document.getElementById('setupRdwcDetalleWrap');
    if (rdwcW) rdwcW.classList.add('setup-rdwc-asistente-simple');
  }
  const volDepWrap = document.getElementById('setupVolDepositoWrap');
  if (volDepWrap) volDepWrap.style.display = isRdwc ? 'none' : '';
  const capMaxWrap = document.getElementById('setupVolCapacidadMaxWrap');
  if (capMaxWrap) capMaxWrap.style.display = (setupTipoInstalacion === 'dwc' || isRdwc || isSrf) ? 'none' : '';
  const dwcCapHint = document.getElementById('setupDwcCapacidadEstimada');
  if (dwcCapHint && setupTipoInstalacion !== 'dwc') {
    dwcCapHint.classList.add('setup-hidden');
    dwcCapHint.textContent = '';
  }
  const mezLab = document.getElementById('setupVolMezclaLabel');
  const mezAyuda = document.getElementById('setupVolMezclaAyuda');
  if (mezLab && mezAyuda) {
    if (setupTipoInstalacion === 'dwc') {
      mezLab.textContent = 'Litros de solución en el depósito (relleno operativo)';
      mezAyuda.textContent =
        'La app puede sugerir litros al llenado seguro: capacidad geométrica menos la reserva bajo la base del sustrato (altura estimada según tipo de sustrato y altura de cesta) y una cámara de aire orientativa ~0,5–1 cm, coherente con Cultivo e instalación. Si el campo está vacío o sigue la última sugerencia, se recalcula al cambiar medidas o cesta; edítalo a mano si tu llenado real es otro.';
    } else if (isSrf) {
      mezLab.textContent = 'Litros de solución en el estanque (mezcla útil)';
      mezAyuda.textContent =
        'Vacío = capacidad del estanque (L×A×profundidad útil o volumen manual). Se recalcula al cambiar medidas; edítalo si llenas a menos del tope geométrico.';
    } else {
      mezLab.textContent = 'Litros de mezcla (opcional)';
      mezAyuda.textContent =
        'Vacío = llenar hasta el máximo. Si rellenas a menos (p. ej. 19 L en depósito de 20 L), las dosis se calculan sobre esos litros.';
    }
  }
  try {
    if (typeof repositionSetupVolMezclaBlock === 'function') repositionSetupVolMezclaBlock();
  } catch (_) {}
  if (isSrf) {
    try {
      srfRefreshOxigenacionUi('setup');
    } catch (_) {}
    try {
      if (!setupEsNuevaTorre && typeof syncSrfFormDesdeConfig === 'function') {
        syncSrfFormDesdeConfig(state.configTorre || {}, 'setup');
      }
      if (typeof updateTorreBuilder === 'function') updateTorreBuilder();
      if (!setupEsNuevaTorre && typeof syncSetupVolMezclaSugeridoSrf === 'function') {
        syncSetupVolMezclaSugeridoSrf();
      }
      if (typeof renderSrfCultivoRecoStatus === 'function') renderSrfCultivoRecoStatus('setup');
    } catch (_) {}
  }
  if (setupTipoInstalacion === 'dwc') {
    try {
      onSetupDwcMedidasInput();
    } catch (eDwcVol) {}
    try {
      if (typeof dwcSyncSetupMontajePreview === 'function') dwcSyncSetupMontajePreview();
      else {
        dwcRefreshMulticuboDependienteUi('setup');
        dwcReparentSetupSlidersForPreview();
        updateTorreBuilder();
      }
    } catch (_) {}
  }
  syncSetupPreviewDiagramPorTipoInstalacion();
  if (isNft) {
    refrescarDocTuberiaNftSetup();
    try {
      refrescarNftMontajeSubpanels();
      refrescarNftCanalesSliderEtiqueta();
      const cfgN = state.configTorre || {};
      seleccionarSetupNftMontajeOrigen('diy');
    } catch (e) {}
  }
}

/** Actualiza el gráfico del paso 1 según Torre vs NFT (asistente). */
function syncSetupPreviewDiagramPorTipoInstalacion() {
  if (typeof setupPagina === 'undefined' || setupPagina !== 1) return;
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  else updateTorreBuilder();
}

function onSetupVolSliderInput() {
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
  else updateTorreBuilder();
  const mezEl = document.getElementById('setupVolMezclaL');
  if (mezEl && mezEl.value.trim()) {
    const maxL = getSetupVolumenMaxLitros();
    const m = parseFloat(String(mezEl.value).replace(',', '.'));
    if (Number.isFinite(m) && m > maxL) mezEl.value = String(maxL);
  }
  if (typeof setupPagina !== 'undefined' && setupPagina >= 4) renderDosisSetup();
  if (typeof setupPagina !== 'undefined' && setupPagina === 7) actualizarResumenSetup();
}

function onSetupVolMezclaInput() {
  const maxL = getSetupVolumenMaxLitros();
  const el = document.getElementById('setupVolMezclaL');
  if (!el) return;
  const raw = el.value.trim();
  if (!raw) {
    try {
      el.removeAttribute('data-hc-dwc-mezcla-auto');
      el.removeAttribute('data-hc-dwc-mezcla-manual');
    } catch (_) {}
  }
  if (raw) {
    const m = parseFloat(String(raw).replace(',', '.'));
    if (Number.isFinite(m) && m > maxL) el.value = String(maxL);
    if (Number.isFinite(m) && m > 0 && m < 0.5) el.value = '0.5';
    if (
      typeof setupTipoInstalacion !== 'undefined' &&
      setupTipoInstalacion === 'dwc' &&
      el.hasAttribute('data-hc-dwc-mezcla-auto')
    ) {
      const autoN = parseFloat(String(el.getAttribute('data-hc-dwc-mezcla-auto') || '').replace(',', '.'));
      const curN = parseFloat(String(el.value || '').replace(',', '.'));
      if (Number.isFinite(autoN) && Number.isFinite(curN) && Math.abs(curN - autoN) > 0.06) {
        el.setAttribute('data-hc-dwc-mezcla-manual', '1');
        el.removeAttribute('data-hc-dwc-mezcla-auto');
      }
    }
  }
  if (typeof setupPagina !== 'undefined' && setupPagina >= 4) renderDosisSetup();
  if (typeof setupPagina !== 'undefined' && setupPagina === 7) actualizarResumenSetup();
}

/**
 * Geometría del canal de cultivo (no la línea de alimentación).
 * @param {object} cfg state.configTorre o fragmento
 */
function nftCanalGeomDesdeConfig(cfg) {
  const c = cfg || {};
  const forma = c.nftCanalForma === 'rectangular' ? 'rectangular' : 'redondo';
  const lamRaw = parseFloat(String(c.nftLaminaAguaMm));
  const laminaMm = Number.isFinite(lamRaw) ? Math.min(6, Math.max(2, lamRaw)) : 3;
  const longRaw = parseFloat(String(c.nftLongCanalM));
  const longCanalM =
    Number.isFinite(longRaw) && longRaw > 0 ? Math.min(15, Math.max(0.5, longRaw)) : null;
  const diamRaw = parseInt(String(c.nftCanalDiamMm), 10);
  const diamMm = Number.isFinite(diamRaw) ? Math.min(160, Math.max(50, diamRaw)) : 90;
  const anchoRaw = parseInt(String(c.nftCanalAnchoMm), 10);
  const anchoMm = Number.isFinite(anchoRaw) ? Math.min(220, Math.max(40, anchoRaw)) : 100;
  return { forma, laminaMm, longCanalM, diamMm, anchoMm };
}

/** Área efectiva (mm²) del flujo con lámina de agua en el fondo del canal. */
function nftAreaFlujoLaminaMm2(g) {
  const lam = Math.min(6, Math.max(2, g.laminaMm || 3));
  if (g.forma === 'rectangular') {
    const w = Math.min(220, Math.max(40, g.anchoMm || 100));
    return Math.max(1, w * lam);
  }
  const D = Math.min(160, Math.max(50, g.diamMm || 90));
  const R = D / 2;
  const h = Math.min(lam, Math.max(0.3, R - 0.25));
  const dy = R - h;
  const halfW = Math.sqrt(Math.max(0, R * R - dy * dy));
  const wMm = 2 * halfW;
  return Math.max(1, wMm * lam);
}

/** NFT: mesa (horizontal), escalera/inclinado (peldaños), pared (tubos horizontales en zigzag en muro). */
function nftDisposicionNormalizada(v) {
  const s = String(v == null ? '' : v).toLowerCase();
  if (s === 'escalera') return 'escalera';
  if (s === 'pared' || s === 'mural' || s === 'vertical') return 'pared';
  return 'mesa';
}

/** Mesa: serie (tubo a tubo) o paralelo (colector por tubo). */
function nftMesaRecorridoNormalizada(v) {
  const s = String(v == null ? '' : v).toLowerCase();
  if (s === 'paralelo' || s === 'parallel' || s === 'manifold' || s === 'colector') return 'paralelo';
  return 'serie';
}

/** Colectores izq./der. (paralelo) en mesa o pared. */
function nftColectoresParaleloDesdeConfig(cfg) {
  cfg = cfg || {};
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  if (disp === 'mesa') {
    if (cfg.nftMesaMultinivel) return false;
    return nftMesaRecorridoNormalizada(cfg.nftMesaRecorridoAgua) === 'paralelo';
  }
  if (disp === 'pared') {
    const rec = cfg.nftParedRecorridoAgua != null ? cfg.nftParedRecorridoAgua : cfg.nftMesaRecorridoAgua;
    return nftMesaRecorridoNormalizada(rec) === 'paralelo';
  }
  return false;
}

/** Vista cenital (mesa MM): solo multinivel con 2+ franjas; paralelo 1 nivel usa esquema lateral como serie. */
function nftMesaUsaDiagramaCenital(cfg) {
  if (!cfg || nftDisposicionNormalizada(cfg.nftDisposicion) !== 'mesa') return false;
  if (cfg.nftMesaMultinivel) {
    const tiers = parseNftMesaTubosPorNivelStr(cfg.nftMesaTubosPorNivelStr || '');
    if (tiers.length >= 2) return true;
  }
  return false;
}

/** Topología hidráulica para caudal de bomba: serie (un flujo) o paralelo (suma por tubo/rama). */
function nftFlowTopologyFromConfig(cfg) {
  cfg = cfg || {};
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  if (disp === 'mesa' || disp === 'pared') {
    return nftColectoresParaleloDesdeConfig(cfg) ? 'paralelo' : 'serie';
  }
  if (disp === 'escalera') {
    const caras =
      typeof nftEscaleraCarasNormalizada === 'function'
        ? nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras)
        : 1;
    return caras >= 2 ? 'paralelo' : 'serie';
  }
  return 'serie';
}

/** @returns {number[]} tubos por franja de arriba a abajo */
function parseNftMesaTubosPorNivelStr(str) {
  const s = String(str == null ? '' : str).trim();
  if (!s) return [];
  const parts = s.split(/[,;\s]+/).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 12) out.push(n);
  }
  const loose = nftMesaTubosPorNivelUniforme(out.slice(0, 8));
  return loose.filter(n => n >= 1);
}

/** @returns {number[]} tubos por franja (0–12 permitido; conserva posiciones) */
function parseNftMesaTubosPorNivelStrLoose(str) {
  const s = String(str == null ? '' : str).trim();
  if (!s) return [];
  const parts = s.split(/[,;\s]+/).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 12) out.push(n);
  }
  return nftMesaTubosPorNivelUniforme(out.slice(0, 8));
}

/** Mesa multinivel: mismo número de tubos en cada nivel (columnas alineadas). */
function nftMesaTubosPorNivelUniforme(tiers) {
  const raw = Array.isArray(tiers) ? tiers.slice() : [];
  if (raw.length < 2) return raw;
  const ref = raw.find(t => t > 0);
  const n =
    ref != null
      ? Math.min(12, Math.max(0, ref))
      : Math.min(12, Math.max(0, parseInt(String(raw[0]), 10) || 0));
  return raw.map(() => n);
}

/** Etiqueta resumen tubos multinivel: «3×4» si todos iguales, si no «2+3+4». */
function nftMesaTubosUniformLabel(tiers) {
  const u = nftMesaTubosPorNivelUniforme(tiers);
  if (!u.length) return '';
  if (u.length < 2) return String(u[0]);
  const t = u[0];
  if (u.every(x => x === t)) return u.length + '×' + t;
  return u.join('+');
}

/** Resumen corto de tubos/huecos para Cultivo, Consejos y checklist. */
function nftResumenCantidadesBreve(cfg) {
  cfg = cfg || state.configTorre || {};
  const hyd = getNftHidraulicaDesdeConfig(cfg);
  if (!hyd || !hyd.nCh) return '';
  if (cfg.nftMesaMultinivel && hyd.mesaTiers && hyd.mesaTiers.length >= 2) {
    const tubLbl = nftMesaTubosUniformLabel(hyd.mesaTiers);
    let hxPart = hyd.nHx + ' huecos/tubo (ref.)';
    if (hyd.mesaHuecosTiers && hyd.mesaHuecosTiers.length >= 2) {
      const vals = hyd.mesaHuecosTiers.filter(h => h > 0);
      if (vals.length) {
        const allEq = vals.every(h => h === vals[0]);
        hxPart = allEq ? vals[0] + ' huecos/franja' : hyd.mesaHuecosTiers.join('+') + ' huecos/franja';
      }
    }
    return tubLbl + ' tubos/nivel · ' + hyd.mesaTiers.length + ' niveles · ' + hxPart;
  }
  return hyd.nCh + ' tubos × ' + hyd.nHx + ' huecos';
}

/** @returns {number[]} huecos/cestas por franja (0–30 permitido; conserva posiciones) */
function parseNftMesaHuecosPorNivelStrLoose(str) {
  const s = String(str == null ? '' : str).trim();
  if (!s) return [];
  const parts = s.split(/[,;\s]+/).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 30) out.push(n);
  }
  return out.slice(0, 8);
}

/** Serializa huecos/cestas por franja desde el asistente (nft) o cuadrícula Cultivo (sys). */
function getNftMesaHuecosPorNivelStrFromGrid(prefix) {
  const isSys = prefix === 'sys';
  const nEl = document.getElementById(isSys ? 'sysNftMesaNumNiveles' : 'nftMesaNumNiveles');
  let n = parseInt(String(nEl && nEl.value != null ? nEl.value : ''), 10);
  if (!Number.isFinite(n) || n < 2) n = 2;
  n = Math.min(8, n);
  const parts = [];
  if (!isSys) {
    const host = document.getElementById('nftMesaTierConfigHost');
    if (host && host.children.length) {
      for (let i = 0; i < n; i++) {
        const sl = document.getElementById('sliderNftMesaTierHuecos_' + i);
        const v = parseInt(String(sl && sl.value != null ? sl.value : ''), 10);
        parts.push(Math.min(30, Math.max(0, Number.isFinite(v) ? v : 0)));
      }
      return parts.join(',');
    }
  }
  for (let i = 0; i < n; i++) {
    const id = (isSys ? 'sysNftMesaHuecosNivel_' : 'nftMesaHuecosNivel_') + i;
    const el = document.getElementById(id);
    if (!el) break;
    const v = parseInt(String(el.value || ''), 10);
    parts.push(Math.min(30, Math.max(0, Number.isFinite(v) ? v : 0)));
  }
  return parts.join(',');
}

/** Serializa tubos por nivel desde sliders del asistente (nft) o cuadrícula Cultivo (sys). */
function getNftMesaTubosPorNivelStrFromGrid(prefix) {
  const isSys = prefix === 'sys';
  const nEl = document.getElementById(isSys ? 'sysNftMesaNumNiveles' : 'nftMesaNumNiveles');
  let n = parseInt(String(nEl && nEl.value != null ? nEl.value : ''), 10);
  if (!Number.isFinite(n) || n < 2) n = 2;
  n = Math.min(8, n);
  let tubos = 0;
  if (isSys) {
    const el = document.getElementById('sysNftMesaTubosTodos');
    tubos = Math.min(12, Math.max(0, parseInt(String(el && el.value != null ? el.value : ''), 10) || 0));
  } else {
    const sl = document.getElementById('sliderNftMesaTubosTodos');
    if (sl) {
      tubos = Math.min(12, Math.max(0, parseInt(String(sl.value), 10) || 0));
    }
  }
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(tubos);
  return parts.join(',');
}

function rebuildNftMesaMultinivelTierSliders(prefix, tiersInit, huecosInit) {
  if (prefix !== 'nft') {
    rebuildNftMesaMultinivelGrid(prefix, tiersInit);
    return;
  }
  const host = document.getElementById('nftMesaTierConfigHost');
  const numInp = document.getElementById('nftMesaNumNiveles');
  if (!host || !numInp) return;
  let tiers = [];
  if (Array.isArray(tiersInit)) {
    tiers = tiersInit.map(t => Math.min(12, Math.max(0, parseInt(String(t), 10) || 0)));
  } else {
    const parsed = String(tiersInit || '')
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map(p => Math.min(12, Math.max(0, parseInt(String(p), 10) || 0)));
    tiers = parsed.length >= 2 ? parsed : [0, 0];
  }
  let huecos = [];
  if (Array.isArray(huecosInit)) {
    huecos = huecosInit.map(h => Math.min(30, Math.max(0, parseInt(String(h), 10) || 0)));
  } else {
    huecos = parseNftMesaHuecosPorNivelStrLoose(String(huecosInit || ''));
  }
  if (tiers.length < 2) tiers = [0, 0];
  tiers = tiers.slice(0, 8);
  numInp.value = String(Math.min(8, Math.max(2, tiers.length)));
  const n = parseInt(String(numInp.value), 10) || 2;
  while (tiers.length < n) tiers.push(0);
  while (huecos.length < n) huecos.push(0);
  tiers = tiers.slice(0, n);
  huecos = huecos.slice(0, n);
  tiers = nftMesaTubosPorNivelUniforme(tiers);
  const tubosTodos = tiers.find(t => t > 0) != null ? tiers.find(t => t > 0) : tiers[0] != null ? tiers[0] : 0;
  let html =
    '<div class="setup-nft-tier-tubos-global">' +
    '<div class="torre-control-row setup-nft-tier-slider-row">' +
    '<div class="torre-control-label"><span>Tubos por nivel</span> <span class="torre-control-val" id="valNftMesaTubosTodos">' +
    tubosTodos +
    '</span> <span class="setup-nft-tier-tubos-hint">(igual en todos)</span></div>' +
    '<input type="range" class="torre-slider" id="sliderNftMesaTubosTodos" min="0" max="12" value="' +
    tubosTodos +
    '" oninput="onNftMesaTubosTodosChange()">' +
    '</div></div>';
  for (let i = 0; i < n; i++) {
    const hVal = huecos[i] != null ? huecos[i] : 0;
    let franja = 'Franja ' + (i + 1);
    if (i === 0) franja += ' (arriba)';
    else if (i === n - 1 && n > 1) franja += ' (abajo)';
    html +=
      '<div class="setup-nft-tier-franja" data-nft-mesa-tier-idx="' +
      i +
      '">' +
      '<div class="setup-nft-tier-franja-title">' +
      escHtmlUi(franja) +
      '</div>' +
      '<div class="torre-control-row setup-nft-tier-slider-row">' +
      '<div class="torre-control-label"><span>Huecos / cestas por tubo</span> <span class="torre-control-val" id="valNftMesaTierHuecos_' +
      i +
      '">' +
      hVal +
      '</span></div>' +
      '<input type="range" class="torre-slider" id="sliderNftMesaTierHuecos_' +
      i +
      '" min="0" max="30" value="' +
      hVal +
      '" oninput="updateNftSetupPreview()">' +
      '</div>' +
      '</div>';
  }
  host.innerHTML = html;
  if (typeof refrescarNftMesaMultinivelCantidadesUi === 'function') refrescarNftMesaMultinivelCantidadesUi();
}

function rebuildNftMesaMultinivelGrid(prefix, tiersInit) {
  const isSys = prefix === 'sys';
  if (!isSys) {
    rebuildNftMesaMultinivelTierSliders('nft', tiersInit, null);
    return;
  }
  const numId = 'sysNftMesaNumNiveles';
  const numInp = document.getElementById(numId);
  const tubosInp = document.getElementById('sysNftMesaTubosTodos');
  if (!numInp || !tubosInp) return;
  let tiers = [];
  if (Array.isArray(tiersInit)) {
    tiers = tiersInit.map(t => Math.min(12, Math.max(0, parseInt(String(t), 10) || 0)));
  } else {
    tiers = parseNftMesaTubosPorNivelStrLoose(String(tiersInit || ''));
  }
  if (tiers.length < 2) tiers = [0, 0];
  tiers = nftMesaTubosPorNivelUniforme(tiers.slice(0, 8));
  numInp.value = String(Math.min(8, Math.max(2, tiers.length)));
  const n = parseInt(String(numInp.value), 10) || 2;
  const tubosTodos = tiers.find(t => t > 0) != null ? tiers.find(t => t > 0) : tiers[0] != null ? tiers[0] : 0;
  tubosInp.value = String(tubosTodos);
}

function onNftMesaTubosTodosChange() {
  const sl = document.getElementById('sliderNftMesaTubosTodos');
  const val = document.getElementById('valNftMesaTubosTodos');
  if (val && sl) val.textContent = String(parseInt(String(sl.value), 10) || 0);
  if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
}

function onNftWizardMesaNumNivelesChange() {
  const want = Math.min(8, Math.max(2, parseInt(String(document.getElementById('nftMesaNumNiveles')?.value || ''), 10) || 2));
  const prevT =
    parseInt(String(document.getElementById('sliderNftMesaTubosTodos')?.value || ''), 10) || 0;
  const prevH = [];
  for (let i = 0; i < 8; i++) {
    const elH = document.getElementById('sliderNftMesaTierHuecos_' + i);
    if (elH) prevH.push(Math.min(30, Math.max(0, parseInt(String(elH.value), 10) || 0)));
  }
  const tiersArr = [];
  for (let i = 0; i < want; i++) tiersArr.push(prevT);
  while (prevH.length < want) prevH.push(0);
  rebuildNftMesaMultinivelTierSliders('nft', tiersArr, prevH.slice(0, want));
  document.getElementById('nftMesaNumNiveles').value = String(want);
  if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
}

function onSistemaNftMesaNumNivelesChange() {
  const want = Math.min(8, Math.max(2, parseInt(String(document.getElementById('sysNftMesaNumNiveles')?.value || ''), 10) || 2));
  const prevT =
    parseInt(String(document.getElementById('sysNftMesaTubosTodos')?.value || ''), 10) || 0;
  const tiersArr = [];
  for (let i = 0; i < want; i++) tiersArr.push(prevT);
  rebuildNftMesaMultinivelGrid('sys', tiersArr);
  document.getElementById('sysNftMesaNumNiveles').value = String(want);
}

function nftEscaleraCarasNormalizada(v) {
  const n = parseInt(String(v), 10);
  return n === 2 ? 2 : 1;
}

/**
 * Caras para dibujar escalera: parámetro explícito + UI + config (en ese orden en navegador).
 * @param {number|string} carasParam valor pasado a buildNftEscaleraDiagramSvg (p. ej. 2)
 */
function nftEscaleraCarasParaDiagrama(carasParam, EO) {
  EO = EO || {};
  let car = nftEscaleraCarasNormalizada(carasParam);
  if (typeof readNftMontajeFromSetupUi === 'function' && typeof document !== 'undefined') {
    try {
      const m = readNftMontajeFromSetupUi();
      if (m.disposicion === 'escalera') car = nftEscaleraCarasNormalizada(m.escaleraCaras);
    } catch (_) {}
  } else if (EO.escaleraCaras != null) {
    car = nftEscaleraCarasNormalizada(EO.escaleraCaras);
  } else if (EO.cfgSnapshot && EO.cfgSnapshot.nftEscaleraCaras != null) {
    car = nftEscaleraCarasNormalizada(EO.cfgSnapshot.nftEscaleraCaras);
  }
  return car;
}

/** Caras escalera: prioriza botones del asistente (nftEscCara*) si disposición = escalera. */
function nftEscaleraCarasDesdeCfgYUi(cfg, EO) {
  cfg = cfg || {};
  EO = EO || {};
  if (typeof readNftMontajeFromSetupUi === 'function' && typeof document !== 'undefined') {
    try {
      const m = readNftMontajeFromSetupUi();
      if (m.disposicion === 'escalera') return nftEscaleraCarasNormalizada(m.escaleraCaras);
    } catch (_) {}
  }
  if (EO.escaleraCaras != null) return nftEscaleraCarasNormalizada(EO.escaleraCaras);
  return nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras);
}

/** Peldaños por cara: slider del asistente o config (no confundir con nCh total en 2 caras). */
function nftEscaleraNvDesdeCfgYUi(cfg, EO, canalesArg) {
  cfg = cfg || {};
  EO = EO || {};
  const caras = nftEscaleraCarasDesdeCfgYUi(cfg, EO);
  if (typeof readNftMontajeFromSetupUi === 'function' && typeof document !== 'undefined') {
    try {
      const m = readNftMontajeFromSetupUi();
      if (m.disposicion === 'escalera') {
        const sliderNv = parseInt(document.getElementById('sliderNftCanales')?.value ?? '', 10);
        if (Number.isFinite(sliderNv) && sliderNv >= 1) return Math.min(12, sliderNv);
      }
    } catch (_) {}
  }
  let nv = EO.escaleraNiveles;
  if (nv == null || !Number.isFinite(nv)) nv = parseInt(String(cfg.nftEscaleraNivelesCara), 10);
  if (Number.isFinite(nv) && nv >= 1) return Math.min(12, Math.max(1, Math.round(nv)));
  const raw = parseInt(String(canalesArg), 10);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  if (raw <= 12) return raw;
  if (caras === 2 && raw % 2 === 0 && raw / 2 <= 12) return raw / 2;
  if (raw % caras === 0 && raw / caras <= 12) return raw / caras;
  return Math.min(12, Math.max(1, Math.ceil(raw / caras)));
}

/**
 * Canales hidráulicos efectivos y metadatos de montaje para cálculo y SVG.
 * @returns {{ nCh: number, nHx: number, mesaTiers?: number[], escaleraNiveles?: number, escaleraCaras?: number }}
 */
/** NFT ya definido en asistente (tubos/huecos): no repetir montaje ni EC/pH en Cultivo e instalación. */
function nftInstalacionYaConfigurada(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'nft') return false;
  const nCh = parseInt(String(cfg.nftNumCanales ?? cfg.numNiveles ?? ''), 10);
  const hx = parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? ''), 10);
  return Number.isFinite(nCh) && nCh >= 1 && Number.isFinite(hx) && hx >= 2;
}

function nftHuecosDesdeCfg(cfg) {
  const raw = parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? ''), 10);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 30) {
    return raw === 0 ? 0 : Math.min(30, Math.max(2, raw));
  }
  return 8;
}

function nftCanalesRawDesdeCfg(cfg) {
  const raw = parseInt(String(cfg.nftNumCanales ?? cfg.numNiveles ?? ''), 10);
  if (Number.isFinite(raw) && raw >= 0) return Math.min(24, raw);
  return 4;
}

function getNftHidraulicaDesdeConfig(cfg) {
  cfg = cfg || {};
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  const hx = nftHuecosDesdeCfg(cfg);
  if (disp === 'mesa' && cfg.nftMesaMultinivel) {
    const tiers = parseNftMesaTubosPorNivelStrLoose(cfg.nftMesaTubosPorNivelStr);
    if (tiers.length >= 2) {
      const sumT = tiers.reduce((a, b) => a + b, 0);
      let huecosTiers = parseNftMesaHuecosPorNivelStrLoose(cfg.nftMesaHuecosPorNivelStr);
      while (huecosTiers.length < tiers.length) huecosTiers.push(0);
      huecosTiers = huecosTiers.slice(0, tiers.length);
      const hxTier = huecosTiers.filter(h => h > 0);
      const nHxEff = hxTier.length ? Math.min(30, Math.max(2, Math.max.apply(null, hxTier))) : hx;
      return { nCh: Math.min(24, Math.max(0, sumT)), nHx: nHxEff, mesaTiers: tiers, mesaHuecosTiers: huecosTiers };
    }
  }
  if (disp === 'escalera') {
    const caras = nftEscaleraCarasDesdeCfgYUi(cfg, null);
    const nv = nftEscaleraNvDesdeCfgYUi(cfg, null, cfg.nftNumCanales);
    if (nv < 1) return { nCh: 0, nHx: hx, escaleraNiveles: 0, escaleraCaras: caras };
    const nCh = Math.min(24, Math.max(0, nv * caras));
    return { nCh, nHx: hx, escaleraNiveles: nv, escaleraCaras: caras };
  }
  const nCh = nftCanalesRawDesdeCfg(cfg);
  return { nCh: Math.max(0, nCh), nHx: hx };
}

/** Sliders NFT a 0 (asistente nueva instalación). */
function hcResetNftSetupSlidersZero() {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = String(v);
  };
  set('sliderNftCanales', 0);
  set('sliderNftHuecos', 0);
  set('sliderNftPendiente', 0);
  set('sliderNftMesaTubosTodos', 0);
  const vTodos = document.getElementById('valNftMesaTubosTodos');
  if (vTodos) vTodos.textContent = '0';
  for (let i = 0; i < 8; i++) {
    set('sliderNftMesaTierHuecos_' + i, 0);
    const vH = document.getElementById('valNftMesaTierHuecos_' + i);
    if (vH) vH.textContent = '0';
  }
  const vC = document.getElementById('valNftCanales');
  const vH = document.getElementById('valNftHuecos');
  const vP = document.getElementById('valNftPendiente');
  if (vC) vC.textContent = '0';
  if (vH) vH.textContent = '0';
  if (vP) vP.innerHTML = '0<span class="setup-inline-unit-percent">%</span>';
  try {
    if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
  } catch (_) {}
}

/** Altura estática efectiva (cm) para el cálculo de bomba: manual o estimada en mesa multinivel. */
function getNftAlturaBombeoEfectivaCm(cfg) {
  cfg = cfg || {};
  const raw = cfg.nftAlturaBombeoCm;
  if (raw != null && Number.isFinite(Number(raw)) && Number(raw) > 0) {
    return Math.min(500, Math.max(0, Math.round(Number(raw))));
  }
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  if (disp === 'mesa' && cfg.nftMesaMultinivel) {
    const tiers = parseNftMesaTubosPorNivelStrLoose(cfg.nftMesaTubosPorNivelStr);
    if (tiers.length >= 2) {
      let sep = parseFloat(String(cfg.nftMesaSeparacionNivelesCm ?? '').replace(',', '.'));
      if (!Number.isFinite(sep) || sep <= 0) sep = 28;
      sep = Math.min(150, Math.max(10, sep));
      return Math.round((tiers.length - 1) * sep);
    }
  }
  return 0;
}

function readNftMontajeFromSetupUi() {
  let dispo = 'mesa';
  if (document.getElementById('nftDispEscalera')?.classList.contains('selected')) dispo = 'escalera';
  else if (document.getElementById('nftDispPared')?.classList.contains('selected')) dispo = 'pared';
  const raw = parseFloat(String(document.getElementById('nftAlturaBombeoCm')?.value || '').replace(',', '.'));
  const altCm =
    Number.isFinite(raw) && raw > 0 ? Math.min(500, Math.round(raw)) : 0;
  const mesaMultinivel = document.getElementById('nftMesaMultinivelChk')?.checked === true;
  const mesaTubosStr = mesaMultinivel ? getNftMesaTubosPorNivelStrFromGrid('nft') : '';
  const mesaHuecosStr = mesaMultinivel ? getNftMesaHuecosPorNivelStrFromGrid('nft') : '';
  const sepRaw = parseFloat(String(document.getElementById('nftMesaSepNivelesCm')?.value || '').replace(',', '.'));
  const mesaSepCm =
    Number.isFinite(sepRaw) && sepRaw > 0 ? Math.min(150, Math.round(sepRaw)) : 0;
  let escaleraCaras = 1;
  if (document.getElementById('nftEscCara2')?.classList.contains('selected')) escaleraCaras = 2;
  const mesaRecorrido = mesaMultinivel
    ? 'serie'
    : document.getElementById('nftMesaRecorridoParalelo')?.checked === true
      ? 'paralelo'
      : 'serie';
  return {
    disposicion: dispo,
    alturaBombeoCm: altCm,
    mesaMultinivel,
    mesaTubosStr,
    mesaHuecosStr,
    mesaSepCm,
    mesaRecorrido,
    escaleraCaras,
  };
}

function readNftMesaRecorridoFromUi(prefix) {
  const p = prefix === 'sys' ? 'sys' : 'nft';
  const par = document.getElementById(p + 'NftMesaRecorridoParalelo');
  if (par) return par.checked ? 'paralelo' : 'serie';
  return 'serie';
}

function syncNftMesaRecorridoUiFromCfg(cfg) {
  cfg = cfg || {};
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  const rawRec =
    disp === 'pared' && cfg.nftParedRecorridoAgua != null ? cfg.nftParedRecorridoAgua : cfg.nftMesaRecorridoAgua;
  const rec = nftMesaRecorridoNormalizada(rawRec);
  const elS = document.getElementById('nftMesaRecorridoSerie');
  const elP = document.getElementById('nftMesaRecorridoParalelo');
  const elSs = document.getElementById('sysNftMesaRecorridoSerie');
  const elPs = document.getElementById('sysNftMesaRecorridoParalelo');
  if (elS) elS.checked = rec === 'serie';
  if (elP) elP.checked = rec === 'paralelo';
  if (elSs) elSs.checked = rec === 'serie';
  if (elPs) elPs.checked = rec === 'paralelo';
  const lS = document.getElementById('nftMesaRecorridoSerieLbl');
  const lP = document.getElementById('nftMesaRecorridoParaleloLbl');
  const lSs = document.getElementById('sysNftMesaRecorridoSerieLbl');
  const lPs = document.getElementById('sysNftMesaRecorridoParaleloLbl');
  if (lS) lS.classList.toggle('selected', rec === 'serie');
  if (lP) lP.classList.toggle('selected', rec === 'paralelo');
  if (lSs) lSs.classList.toggle('selected', rec === 'serie');
  if (lPs) lPs.classList.toggle('selected', rec === 'paralelo');
}

function onNftMesaRecorridoChange(prefix) {
  const rec = readNftMesaRecorridoFromUi(prefix);
  const map =
    prefix === 'sys'
      ? [
          { id: 'sysNftMesaRecorridoSerieLbl', on: rec === 'serie' },
          { id: 'sysNftMesaRecorridoParaleloLbl', on: rec === 'paralelo' },
        ]
      : [
          { id: 'nftMesaRecorridoSerieLbl', on: rec === 'serie' },
          { id: 'nftMesaRecorridoParaleloLbl', on: rec === 'paralelo' },
        ];
  map.forEach((m) => {
    const el = document.getElementById(m.id);
    if (el) el.classList.toggle('selected', m.on);
  });
  if (prefix === 'sys') {
    try {
      if (typeof renderTorre === 'function') renderTorre();
    } catch (_) {}
    return;
  }
  try {
    if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
  } catch (_) {}
}

function refrescarNftMontajeSubpanels() {
  const d = readNftMontajeFromSetupUi().disposicion;
  const mesaW = document.getElementById('nftMesaExtraWrap');
  const escW = document.getElementById('nftEscaleraExtraWrap');
  const hint = document.getElementById('nftAlturaBombeoHint');
  if (mesaW) mesaW.classList.toggle('setup-hidden', d !== 'mesa' && d !== 'pared');
  if (escW) escW.classList.toggle('setup-hidden', d !== 'escalera');
  const mesaMmLbl = document.getElementById('nftMesaMultinivelChk')?.closest('label');
  if (mesaMmLbl) mesaMmLbl.classList.toggle('setup-hidden', d !== 'mesa');
  const mesaMmFields = document.getElementById('nftMesaMultinivelFields');
  if (mesaMmFields && d !== 'mesa') mesaMmFields.classList.add('setup-hidden');
  const mesaRecKicker = mesaW && mesaW.querySelector('.setup-nft-subkicker');
  if (mesaRecKicker) {
    mesaRecKicker.textContent =
      d === 'pared' ? 'Recorrido del agua (pared)' : 'Recorrido del agua (mesa)';
  }
  if (hint) {
    hint.innerHTML =
      d === 'mesa'
        ? 'Opcional en mesa plana; <strong>imprescindible</strong> en pared y escalera. En mesa multinivel puedes usar la separación entre niveles si no pones altura total.'
        : d === 'pared' || d === 'escalera'
          ? '<strong>Imprescindible</strong> en este montaje: sin altura (cm) el cálculo de bomba solo usa pérdidas orientativas.'
          : '';
  }
  const mf = document.getElementById('nftMesaMultinivelFields');
  const chk = document.getElementById('nftMesaMultinivelChk');
  if (mf && chk) mf.classList.toggle('setup-hidden', !(d === 'mesa' && chk.checked));
  if (typeof refrescarNftMesaMultinivelCantidadesUi === 'function') refrescarNftMesaMultinivelCantidadesUi();
  if (typeof refrescarNftMesaRecorridoMultinivelUi === 'function') refrescarNftMesaRecorridoMultinivelUi();
}

/** Mesa multinivel: solo serie; oculta y desactiva recorrido en paralelo. */
function refrescarNftMesaRecorridoMultinivelUi() {
  const disp = readNftMontajeFromSetupUi().disposicion;
  const mm = document.getElementById('nftMesaMultinivelChk')?.checked === true;
  const bloqueaParalelo = disp === 'mesa' && mm;
  const elS = document.getElementById('nftMesaRecorridoSerie');
  const elP = document.getElementById('nftMesaRecorridoParalelo');
  const lS = document.getElementById('nftMesaRecorridoSerieLbl');
  const lP = document.getElementById('nftMesaRecorridoParaleloLbl');
  const hint = document.getElementById('nftMesaRecorridoHint');
  if (bloqueaParalelo) {
    if (elS) {
      elS.checked = true;
      elS.disabled = false;
    }
    if (elP) {
      elP.checked = false;
      elP.disabled = true;
    }
    if (lS) lS.classList.add('selected');
    if (lP) lP.classList.remove('selected');
    if (lP) lP.classList.add('setup-hidden');
    if (hint) {
      hint.innerHTML =
        'Mesa <strong>multinivel</strong>: el <strong>mismo número de tubos en cada nivel</strong> (columnas alineadas). El agua recorre las franjas en <strong>serie</strong> (serpentín); <strong>paralelo</strong> no aplica.';
    }
  } else {
    if (elP) elP.disabled = false;
    if (lP) lP.classList.remove('setup-hidden');
    if (hint) {
      hint.innerHTML =
        'Paralelo: cada tubo recibe mezcla desde el colector izquierdo y devuelve por el derecho (como bancada comercial). Serie: el agua pasa por todos los tubos en orden.';
    }
    if (typeof onNftMesaRecorridoChange === 'function') onNftMesaRecorridoChange('nft');
  }
}

const NFT_COUNTS_HELP_DEFAULT =
  'Misma sección de tubo y huecos alineados en todo el esquema. La <strong>línea azul</strong> es el agua: subida desde la bomba al <strong>primer tubo</strong> (en A, reparto en T en el vértice), recorrido en <strong>zigzag</strong> entre extremos de cada peldaño y <strong>retorno al depósito</strong> desde el último tubo de cada cara.';

function refrescarNftMesaMultinivelCantidadesUi() {
  const mont =
    typeof readNftMontajeFromSetupUi === 'function' ? readNftMontajeFromSetupUi() : { disposicion: 'mesa', mesaMultinivel: false };
  const showMm = mont.disposicion === 'mesa' && mont.mesaMultinivel === true;
  const canRow = document.getElementById('nftCanalesSliderRow');
  const huecosRow = document.getElementById('nftHuecosSliderRow');
  const help = document.getElementById('setupNftCountsHelp');
  const countsTitle = document.getElementById('setupNftCountsTitle');
  if (canRow) canRow.classList.toggle('setup-hidden', showMm);
  if (huecosRow) huecosRow.classList.toggle('setup-hidden', showMm);
  if (countsTitle) countsTitle.textContent = showMm ? 'Pendiente del circuito' : 'Cantidades en el diagrama';
  if (help) {
    help.innerHTML = showMm
      ? 'Mesa <strong>multinivel</strong>: un solo valor de <strong>tubos por nivel</strong> (igual en todos) y <strong>huecos por franja</strong> (arriba → abajo). El diagrama alinea columnas entre niveles. Aquí solo la <strong>pendiente</strong> aproximada.'
      : NFT_COUNTS_HELP_DEFAULT;
  }
}

function onNftMesaMultinivelToggle() {
  const mf = document.getElementById('nftMesaMultinivelFields');
  const chk = document.getElementById('nftMesaMultinivelChk');
  if (mf && chk) mf.classList.toggle('setup-hidden', !chk.checked);
  if (chk && chk.checked && !document.getElementById('nftMesaTierConfigHost')?.children.length) {
    rebuildNftMesaMultinivelTierSliders('nft', [0, 0], [0, 0]);
  } else if (chk && !chk.checked) {
    const host = document.getElementById('nftMesaTierConfigHost');
    if (host) host.innerHTML = '';
  }
  if (typeof refrescarNftMesaMultinivelCantidadesUi === 'function') refrescarNftMesaMultinivelCantidadesUi();
  if (typeof refrescarNftMesaRecorridoMultinivelUi === 'function') refrescarNftMesaRecorridoMultinivelUi();
  updateNftSetupPreview();
}

function seleccionarNftEscaleraCaras(n) {
  const caras = nftEscaleraCarasNormalizada(n);
  if (caras === 2 && readNftMontajeFromSetupUi().disposicion !== 'escalera') {
    seleccionarNftDisposicion('escalera');
  }
  const b1 = document.getElementById('nftEscCara1');
  const b2 = document.getElementById('nftEscCara2');
  if (b1) {
    b1.classList.toggle('selected', caras === 1);
    b1.setAttribute('aria-pressed', caras === 1 ? 'true' : 'false');
  }
  if (b2) {
    b2.classList.toggle('selected', caras === 2);
    b2.setAttribute('aria-pressed', caras === 2 ? 'true' : 'false');
  }
  if (setupTipoInstalacion === 'nft') {
    if (typeof refrescarNftCanalesSliderEtiqueta === 'function') refrescarNftCanalesSliderEtiqueta();
    updateNftSetupPreview();
  }
}

function seleccionarNftDisposicion(which) {
  const w = nftDisposicionNormalizada(which);
  const ids = { mesa: 'nftDispMesa', escalera: 'nftDispEscalera', pared: 'nftDispPared' };
  Object.keys(ids).forEach(k => {
    const el = document.getElementById(ids[k]);
    if (!el) return;
    const on = k === w;
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  refrescarNftMontajeSubpanels();
  if (typeof refrescarNftMesaRecorridoMultinivelUi === 'function') refrescarNftMesaRecorridoMultinivelUi();
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
}

function onSistemaNftMesaMultinivelToggle() {
  const mf = document.getElementById('sysNftMesaMultinivelFields');
  const chk = document.getElementById('sysNftMesaMultinivelChk');
  if (mf && chk) mf.style.display = chk.checked ? 'block' : 'none';
  if (chk && chk.checked) {
    const tubosInp = document.getElementById('sysNftMesaTubosTodos');
    const n = parseInt(String(document.getElementById('sysNftMesaNumNiveles')?.value || ''), 10) || 2;
    const t = parseInt(String(tubosInp?.value || ''), 10) || 0;
    if (!tubosInp || t <= 0) rebuildNftMesaMultinivelGrid('sys', Array(Math.min(8, Math.max(2, n))).fill(1));
  }
  refrescarSistemaNftMontajeSubpanels();
  if (typeof refrescarSistemaNftMesaRecorridoMultinivelUi === 'function') refrescarSistemaNftMesaRecorridoMultinivelUi();
}

function seleccionarSistemaNftEscaleraCaras(n) {
  const caras = nftEscaleraCarasNormalizada(n);
  const b1 = document.getElementById('sysNftEscCara1');
  const b2 = document.getElementById('sysNftEscCara2');
  if (b1) {
    b1.classList.toggle('selected', caras === 1);
    b1.setAttribute('aria-pressed', caras === 1 ? 'true' : 'false');
  }
  if (b2) {
    b2.classList.toggle('selected', caras === 2);
    b2.setAttribute('aria-pressed', caras === 2 ? 'true' : 'false');
  }
  try {
    if (typeof renderTorre === 'function') renderTorre();
  } catch (_) {}
}

function seleccionarSistemaNftDisposicion(which) {
  const w = nftDisposicionNormalizada(which);
  const ids = { mesa: 'sysNftDispMesa', escalera: 'sysNftDispEscalera', pared: 'sysNftDispPared' };
  Object.keys(ids).forEach(k => {
    const el = document.getElementById(ids[k]);
    if (!el) return;
    const on = k === w;
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  refrescarSistemaNftMontajeSubpanels();
}

function refrescarSistemaNftMontajeSubpanels() {
  const mesaW = document.getElementById('sysNftMesaExtraWrap');
  const escW = document.getElementById('sysNftEscaleraExtraWrap');
  const rowC = document.getElementById('sysNftRowNumCanales');
  let d = 'mesa';
  if (document.getElementById('sysNftDispEscalera')?.classList.contains('selected')) d = 'escalera';
  else if (document.getElementById('sysNftDispPared')?.classList.contains('selected')) d = 'pared';
  if (mesaW) mesaW.style.display = d === 'mesa' || d === 'pared' ? 'block' : 'none';
  if (escW) escW.style.display = d === 'escalera' ? 'block' : 'none';
  const sysMmChk = document.getElementById('sysNftMesaMultinivelChk');
  const sysMmRow = sysMmChk?.closest('label');
  if (sysMmRow) sysMmRow.style.display = d === 'mesa' ? '' : 'none';
  const sysRecKicker = mesaW && mesaW.querySelector('.torre-nft-cara-kicker');
  if (sysRecKicker) {
    sysRecKicker.textContent = d === 'pared' ? 'Recorrido del agua (pared)' : 'Recorrido del agua (mesa)';
  }
  if (rowC) {
    const mm = document.getElementById('sysNftMesaMultinivelChk')?.checked === true;
    rowC.style.display = d === 'escalera' ? 'none' : 'block';
    if (d === 'mesa' && mm) rowC.style.display = 'none';
  }
  const mf = document.getElementById('sysNftMesaMultinivelFields');
  const chk = document.getElementById('sysNftMesaMultinivelChk');
  if (mf && chk) mf.style.display = d === 'mesa' && chk.checked ? 'block' : 'none';
  if (typeof refrescarSistemaNftMesaRecorridoMultinivelUi === 'function') refrescarSistemaNftMesaRecorridoMultinivelUi();
}

/** Cultivo: mesa multinivel fuerza serie y oculta paralelo (igual que el asistente). */
function refrescarSistemaNftMesaRecorridoMultinivelUi() {
  if (document.getElementById('sysNftDispEscalera')?.classList.contains('selected')) return;
  if (document.getElementById('sysNftDispPared')?.classList.contains('selected')) return;
  const mm = document.getElementById('sysNftMesaMultinivelChk')?.checked === true;
  const elS = document.getElementById('sysNftMesaRecorridoSerie');
  const elP = document.getElementById('sysNftMesaRecorridoParalelo');
  const lS = document.getElementById('sysNftMesaRecorridoSerieLbl');
  const lP = document.getElementById('sysNftMesaRecorridoParaleloLbl');
  const note = document.querySelector('#sysNftMesaExtraWrap .torre-nft-p-note');
  if (!mm) {
    if (elP) elP.disabled = false;
    if (lP) lP.style.display = '';
    if (note) {
      note.textContent =
        'Paralelo = colectores (cada tubo con entrada propia). Serie = agua pasa por todos en orden.';
    }
    return;
  }
  if (elS) elS.checked = true;
  if (elP) {
    elP.checked = false;
    elP.disabled = true;
  }
  if (lS) lS.classList.add('selected');
  if (lP) {
    lP.classList.remove('selected');
    lP.style.display = 'none';
  }
  if (note) {
    note.innerHTML =
      'Mesa <strong>multinivel</strong>: mismos tubos en cada nivel, recorrido en <strong>serie</strong> entre franjas. Los huecos pueden variar por franja (asistente); aquí <strong>Huecos / canal</strong> es referencia común.';
  }
  const huecosNote = document.getElementById('sysNftMesaMultinivelHuecosNote');
  if (huecosNote) huecosNote.classList.toggle('setup-hidden', !mm);
}

/** Redimensiona state.torre a la hidráulica NFT conservando huecos existentes cuando sea posible. */
function redimensionarMatrizTorreNftPreservando(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'nft') return;
  const hyd = getNftHidraulicaDesdeConfig(cfg);
  const nCh = hyd.nCh;
  const nHx = Math.min(30, Math.max(2, parseInt(String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? 8), 10) || 8));
  const empty = () => ({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
  const copy = o => {
    if (!o || typeof o !== 'object') return empty();
    return {
      variedad: o.variedad || '',
      fecha: o.fecha || '',
      notas: o.notas || '',
      origenPlanta:
        typeof normalizarOrigenPlanta === 'function'
          ? normalizarOrigenPlanta(o.origenPlanta)
          : (o.origenPlanta || ''),
      fotos: Array.isArray(o.fotos) ? o.fotos.slice() : [],
      fotoKeys: Array.isArray(o.fotoKeys) ? o.fotoKeys.slice() : [],
    };
  };
  const prev = state.torre || [];
  const nue = [];
  for (let i = 0; i < nCh; i++) {
    const row = [];
    const pi = prev[i];
    for (let j = 0; j < nHx; j++) {
      row.push(pi && pi[j] ? copy(pi[j]) : empty());
    }
    nue.push(row);
  }
  state.torre = nue;
  cfg.numNiveles = nCh;
  cfg.numCestas = nHx;
}

function textoResumenMontajeNftSistema(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'nft') return '';
  const d = nftDisposicionNormalizada(cfg.nftDisposicion || 'mesa');
  const dTxt = d === 'mesa' ? 'Mesa' : d === 'escalera' ? 'Escalera' : 'Pared';
  const mm = d === 'mesa' && cfg.nftMesaMultinivel === true;
  const recTxt =
    mm
      ? ' · multinivel · serie'
      : (d === 'mesa' || d === 'pared') && typeof nftColectoresParaleloDesdeConfig === 'function' && nftColectoresParaleloDesdeConfig(cfg)
        ? ' · paralelo'
        : d === 'mesa' || d === 'pared'
          ? ' · serie'
          : '';
  const qty = typeof nftResumenCantidadesBreve === 'function' ? nftResumenCantidadesBreve(cfg) : '';
  const pend = cfg.nftPendientePct ?? 2;
  let rim =
    cfg.nftNetPotRimMm != null && Number(cfg.nftNetPotRimMm) > 0
      ? Math.round(Number(cfg.nftNetPotRimMm))
      : cfg.dwcNetPotRimMm != null && Number(cfg.dwcNetPotRimMm) > 0
        ? Math.round(Number(cfg.dwcNetPotRimMm))
        : null;
  const cestaShort = rim != null ? ' · cesta Ø' + rim + ' mm' : '';
  const objLbl = nftGetObjetivoSpec(nftGetObjetivoCultivo(cfg)).key === 'baby' ? 'baby' : 'final';
  return dTxt + recTxt + ' · ' + (qty || '—') + ' · ' + pend + '% pend. · obj ' + objLbl + cestaShort;
}

const SISTEMA_NFT_POT_RIM_PRESETS_MM = [27, 38, 40, 50, 75];

function syncSistemaNftPotRimChipsFromInput() {
  const el = document.getElementById('sysNftPotRimMm');
  const raw = parseInt(String(el && el.value != null ? el.value : '').trim(), 10);
  SISTEMA_NFT_POT_RIM_PRESETS_MM.forEach(d => {
    const b = document.getElementById('sysNftPotRim' + d);
    if (b) b.classList.toggle('selected', Number.isFinite(raw) && raw === d);
  });
}

function seleccionarSistemaNftPotRimPreset(mm) {
  const v = Math.max(25, Math.min(120, parseInt(String(mm), 10) || 50));
  const inp = document.getElementById('sysNftPotRimMm');
  if (inp) inp.value = String(v);
  syncSistemaNftPotRimChipsFromInput();
}

function textoResumenSistemaDwcPanel(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return '';
  const L = cfg.dwcDepositoLargoCm;
  const W = cfg.dwcDepositoAnchoCm;
  const P = cfg.dwcDepositoProfCm;
  const forma =
    typeof dwcNormalizeDepositoForma === 'function'
      ? dwcNormalizeDepositoForma(cfg.dwcDepositoForma)
      : (cfg.dwcDepositoForma || 'prismatico');
  const n = Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1);
  const c = Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  const esMc =
    typeof dwcGetOxigenacionDiseno === 'function' && dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes';
  const nCubos = typeof dwcGetNumCubosIndependientes === 'function' ? dwcGetNumCubosIndependientes(cfg) : n * c;
  const parts = [];
  const formaTxt =
    forma === 'cilindrico'
      ? 'cilíndrico'
      : forma === 'troncopiramidal'
        ? 'troncopiramidal'
        : 'prismático';
  parts.push(formaTxt);
  if (forma === 'troncopiramidal') {
    const Li = cfg.dwcTroncoLargoInfCm;
    const Wi = cfg.dwcTroncoAnchoInfCm;
    if (Li && Wi) parts.push('inf ' + Math.round(Number(Li)) + '×' + Math.round(Number(Wi)));
    if (L && W) parts.push('sup ' + Math.round(Number(L)) + '×' + Math.round(Number(W)));
    if (P) parts.push('H ' + Math.round(Number(P)) + ' cm');
    const vT = typeof dwcTroncoLitrosDesdeConfig === 'function' ? dwcTroncoLitrosDesdeConfig(cfg) : null;
    const vO = typeof getDwcVolumenSeguroMaxLitrosDesdeConfig === 'function' ? getDwcVolumenSeguroMaxLitrosDesdeConfig(cfg) : null;
    if (vT != null) parts.push('~' + vT + ' L');
    if (vO != null) parts.push('ópt. ~' + vO + ' L');
  } else if (L && W && P) {
    if (forma === 'cilindrico') {
      const dNum =
        typeof dwcDiametroInteriorCmDesdeLW === 'function'
          ? dwcDiametroInteriorCmDesdeLW(L, W)
          : (Math.abs(Number(L) - Number(W)) < 0.05 ? Number(L) : (Number(L) + Number(W)) / 2);
      const d = dNum != null && Number.isFinite(dNum) ? Math.round(dNum) : Math.round((Number(L) + Number(W)) / 2);
      parts.push('Ø' + d + ' × ' + Math.round(Number(P)) + ' cm');
    } else {
      parts.push(
        Math.round(Number(L)) + '×' + Math.round(Number(W)) + '×' + Math.round(Number(P)) + ' cm'
      );
    }
  }
  if (cfg.dwcNetPotRimMm != null && Number(cfg.dwcNetPotRimMm) > 0) {
    parts.push('Ø' + Math.round(Number(cfg.dwcNetPotRimMm)) + ' mm');
  }
  if (esMc) {
    parts.push(nCubos + ' cubo' + (nCubos === 1 ? '' : 's') + ' (1 maceta/cubo)');
  } else {
    parts.push(n + '×' + c + ' macetas');
  }
  if (typeof dwcGetOxigenacionDiseno === 'function' && dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes') {
    parts.push('aire multidepósito');
    const lu = Number(cfg.dwcLitrosUtilesPorSitioL);
    if (Number.isFinite(lu) && lu > 0) {
      parts.push('~' + Math.round(lu * 10) / 10 + ' L útil/cubo (medido)');
    }
  }
  let line = parts.join(' · ');
  if (typeof dwcTextoResumenLlenadoCm === 'function') {
    const ll = dwcTextoResumenLlenadoCm(cfg);
    if (ll) line += ll;
  }
  return line;
}

function textoResumenSistemaRdwcPanel(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'rdwc') return '';
  const s = Math.max(2, parseInt(String(cfg.rdwcSites || 4), 10) || 4);
  const r = Math.max(1, parseInt(String(cfg.rdwcRows || 1), 10) || 1);
  const b = Math.max(5, Math.round(Number(cfg.rdwcBucketVolL || 20)));
  const v = Math.max(10, Math.round(Number(cfg.rdwcControlVolL || 40)));
  const vu = rdwcParseLitrosTrabajo(cfg.volMezclaLitros);
  const recW = cfg.rdwcRecircPumpW != null ? Math.round(Number(cfg.rdwcRecircPumpW)) : null;
  const airW = cfg.rdwcAirPumpW != null ? Math.round(Number(cfg.rdwcAirPumpW)) : null;
  const air = Math.max(1, Math.round(Number(cfg.rdwcAirLpm || 20)));
  const depTxt = vu != null ? ('depósito ' + vu + '/' + v + ' L') : ('depósito ' + v + ' L');
  const total =
    typeof getRdwcVolumenSolucionTotalLitros === 'function' ? getRdwcVolumenSolucionTotalLitros(cfg) : null;
  const totalTxt =
    total != null && Number.isFinite(total) && total > 0 ? ' · circuito ~' + total + ' L útiles' : '';
  const sep = Math.round(Number(cfg.rdwcCenterSpacingCm || 45));
  const tubes = typeof getRdwcTuberiasEffectiveMm === 'function' ? getRdwcTuberiasEffectiveMm(cfg) : null;
  const tubTxt = tubes ? ' · tubos ' + tubes.supplyMm + '/' + tubes.returnMm + ' mm' : '';
  const bombTxt =
    ' · impulsión ' +
    (recW != null && recW > 0 ? recW + ' W' : '—') +
    ' · aire ' +
    air +
    ' L/min' +
    (airW != null && airW > 0 ? ' / ' + airW + ' W' : '');
  return (
    s +
    ' sitios · ' +
    r +
    ' fila(s) · sep. ' +
    sep +
    ' cm · cubo ' +
    b +
    ' L · ' +
    depTxt +
    totalTxt +
    tubTxt +
    bombTxt
  );
}

/**
 * DWC y RDWC no se mezclan: comparten contenedor histórico en DOM, pero el tipo activo
 * gobierna título, cabecera y clases; cada rama de sincronización solo muestra su bloque.
 */
function syncSistemaDwcRdwcPanelIndependienteUI(cfg) {
  const c = cfg || state.configTorre;
  if (!c || (c.tipoInstalacion !== 'dwc' && c.tipoInstalacion !== 'rdwc')) return;
  const esDwc = c.tipoInstalacion === 'dwc';
  const esRdwc = c.tipoInstalacion === 'rdwc';
  const card = document.getElementById('sistemaDwcAyudaCard');
  const headBtn = document.getElementById('btnToggleSistemaDwc');
  const kicker = document.getElementById('sistemaDwcAyudaPanelKicker');
  if (card) {
    card.classList.toggle('torre-sistema-panel--dwc', esDwc);
    card.classList.toggle('torre-sistema-panel--rdwc', esRdwc);
  }
  if (headBtn) {
    headBtn.classList.toggle('torre-sistema-panel-head--dwc', esDwc);
    headBtn.classList.toggle('torre-sistema-panel-head--rdwc', esRdwc);
    headBtn.setAttribute(
      'aria-label',
      esRdwc ? 'Desplegar u ocultar el formulario del sistema RDWC' : 'Desplegar u ocultar el formulario del depósito DWC'
    );
  }
  if (kicker) kicker.textContent = esRdwc ? 'Sistema RDWC' : 'Depósito DWC';
}

/**
 * Muestra solo el bloque RDWC o solo los controles DWC dentro de #sistemaDwcAyudaBody.
 * No reescribe inputs: solo corrige clases .setup-hidden para evitar mezcla si el DOM quedó desincronizado
 * (p. ej. tras cambiar instalación o tipo sin renderTorre()).
 */
function applySistemaDwcRdwcBodyVisibilitySegunTipo(cfg) {
  const c = cfg || state.configTorre;
  if (!c || (c.tipoInstalacion !== 'dwc' && c.tipoInstalacion !== 'rdwc')) return;
  const rdwcBloque = document.getElementById('sistemaRdwcBloque');
  const dwcBodyHost = document.getElementById('sistemaDwcAyudaBody');
  if (!rdwcBloque || !dwcBodyHost) return;
  if (c.tipoInstalacion === 'rdwc') {
    rdwcBloque.classList.remove('setup-hidden');
    Array.from(dwcBodyHost.children).forEach(ch => {
      if (ch === rdwcBloque) return;
      ch.classList.add('setup-hidden');
    });
  } else {
    Array.from(dwcBodyHost.children).forEach(ch => {
      if (ch === rdwcBloque) return;
      ch.classList.remove('setup-hidden');
    });
    rdwcBloque.classList.add('setup-hidden');
  }
}

function applySistemaTipoPanelesColapsablesUI() {
  const cfg = state.configTorre;
  const nftCard = document.getElementById('sistemaNftMontajeCard');
  const nftBtn = document.getElementById('btnToggleSistemaNftMontaje');
  const nftBody = document.getElementById('sistemaNftMontajeBody');
  const nftRes = document.getElementById('sistemaNftMontajeResumen');
  if (nftCard && nftBtn && nftBody && cfg && cfg.tipoInstalacion === 'nft' && nftCard.style.display === 'block') {
    if (nftRes) nftRes.textContent = textoResumenMontajeNftSistema(cfg);
    const col = cfg.uiSistemaNftMontajeColapsado === true;
    nftBody.hidden = col;
    nftBtn.setAttribute('aria-expanded', col ? 'false' : 'true');
  }
  const dwcCard = document.getElementById('sistemaDwcAyudaCard');
  const dwcBtn = document.getElementById('btnToggleSistemaDwc');
  const dwcBody = document.getElementById('sistemaDwcAyudaBody');
  const dwcRes = document.getElementById('sistemaDwcResumen');
  if (dwcCard && dwcBtn && dwcBody && cfg && (cfg.tipoInstalacion === 'dwc' || cfg.tipoInstalacion === 'rdwc') && dwcCard.style.display === 'block') {
    syncSistemaDwcRdwcPanelIndependienteUI(cfg);
    applySistemaDwcRdwcBodyVisibilitySegunTipo(cfg);
    if (dwcRes) dwcRes.textContent = cfg.tipoInstalacion === 'rdwc' ? textoResumenSistemaRdwcPanel(cfg) : textoResumenSistemaDwcPanel(cfg);
    const colD = cfg.uiSistemaDwcColapsado === true;
    dwcBody.hidden = colD;
    dwcBtn.setAttribute('aria-expanded', colD ? 'false' : 'true');
  }
  const srfCard = document.getElementById('sistemaSrfAyudaCard');
  const srfBtn = document.getElementById('btnToggleSistemaSrf');
  const srfBody = document.getElementById('sistemaSrfAyudaBody');
  const srfRes = document.getElementById('sistemaSrfResumen');
  if (srfCard && srfBtn && srfBody && cfg && cfg.tipoInstalacion === 'srf' && srfCard.style.display !== 'none') {
    if (srfRes && typeof textoResumenSistemaSrfPanel === 'function') {
      srfRes.textContent = textoResumenSistemaSrfPanel(cfg);
    }
    const colS = cfg.uiSistemaSrfColapsado === true;
    srfBody.hidden = colS;
    srfBtn.setAttribute('aria-expanded', colS ? 'false' : 'true');
  }
}

function toggleSistemaNftMontajePanel() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  state.configTorre.uiSistemaNftMontajeColapsado = !state.configTorre.uiSistemaNftMontajeColapsado;
  guardarEstadoTorreActual();
  saveState();
  applySistemaTipoPanelesColapsablesUI();
}

function toggleSistemaSrfPanel() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'srf') return;
  state.configTorre.uiSistemaSrfColapsado = !state.configTorre.uiSistemaSrfColapsado;
  guardarEstadoTorreActual();
  saveState();
  const body = document.getElementById('sistemaSrfAyudaBody');
  const btn = document.getElementById('btnToggleSistemaSrf');
  if (body && btn) {
    const col = state.configTorre.uiSistemaSrfColapsado === true;
    body.hidden = col;
    btn.setAttribute('aria-expanded', col ? 'false' : 'true');
  }
}

function toggleSistemaDwcPanel() {
  if (
    !state.configTorre ||
    (state.configTorre.tipoInstalacion !== 'dwc' && state.configTorre.tipoInstalacion !== 'rdwc')
  ) return;
  state.configTorre.uiSistemaDwcColapsado = !state.configTorre.uiSistemaDwcColapsado;
  guardarEstadoTorreActual();
  saveState();
  applySistemaTipoPanelesColapsablesUI();
  try {
    applySistemaDwcRdwcBodyVisibilitySegunTipo(state.configTorre);
  } catch (_) {}
}

function syncSistemaEcPhStrategyUI() {
  const cfg = state.configTorre || {};
  const selE = document.getElementById('sysEcPhEstrategia');
  const selI = document.getElementById('sysEcPhIntensidad');
  const ecM = document.getElementById('sysEcManualObjetivoUs');
  const phMin = document.getElementById('sysPhManualObjetivoMin');
  const phMax = document.getElementById('sysPhManualObjetivoMax');
  const hint = document.getElementById('sysEcPhStrategyHint');
  const hintMedia = document.getElementById('sysEcManualMediaFasesHint');
  const wrap = document.getElementById('sysEcPhManualWrap');
  const strategy = typeof getEcPhStrategy === 'function' ? getEcPhStrategy(cfg) : 'auto';
  const intensity = typeof getEcPhIntensity === 'function' ? getEcPhIntensity(cfg) : 'estandar';
  if (selE) selE.value = strategy;
  if (selI) selI.value = intensity;
  if (ecM) ecM.value = cfg.ecManualObjetivoUs != null ? String(cfg.ecManualObjetivoUs) : '';
  if (phMin) phMin.value = cfg.phManualObjetivoMin != null ? String(cfg.phManualObjetivoMin) : '';
  if (phMax) phMax.value = cfg.phManualObjetivoMax != null ? String(cfg.phManualObjetivoMax) : '';
  if (wrap) wrap.classList.toggle('setup-hidden', strategy !== 'manual');
  const rec =
    typeof getRecomendacionEcPhTorre === 'function' ? getRecomendacionEcPhTorre() : null;
  if (hint) {
    hint.classList.remove('setup-hidden');
    if (strategy === 'manual') {
      const ecTxt = cfg.ecManualObjetivoUs != null ? String(Math.round(Number(cfg.ecManualObjetivoUs))) : '—';
      const p0 = cfg.phManualObjetivoMin != null ? String(cfg.phManualObjetivoMin) : '—';
      const p1 = cfg.phManualObjetivoMax != null ? String(cfg.phManualObjetivoMax) : '—';
      hint.textContent = 'Modo manual activo: EC ' + ecTxt + ' µS/cm · pH ' + p0 + '–' + p1 + '.';
    } else {
      let t = rec
        ? 'Modo automático por etapa: EC ' + rec.ec.min + '–' + rec.ec.max + ' µS/cm · pH ' + rec.ph.min + '–' + rec.ph.max + '.'
        : 'Modo automático por etapa activo.';
      if (rec && rec.estrategia === 'auto') {
        if (rec.mezclaFasesDistintas) {
          t +=
            ' Varias etapas a la vez: no hay una media «por fase nominal» única; se unen los rangos vigentes de cada planta (intersección o promedio si no encajan).';
        } else if (rec.ecAgregacion === 'promedio_plantas') {
          t += ' Rangos poco compatibles entre plantas: se promedia el rango actual de cada una.';
        }
        if (rec.ecMediaFasesCatalogo && rec.ecMediaFasesCatalogo.midAvg != null) {
          t +=
            ' Referencia (una sola variedad en la instalación): media aproximada entre fases del catálogo ~' +
            rec.ecMediaFasesCatalogo.midAvg +
            ' µS/cm.';
        }
      }
      hint.textContent = t;
    }
  }
  if (hintMedia) {
    if (strategy === 'manual') {
      hintMedia.classList.remove('setup-hidden');
      const nVar =
        typeof torreVariedadesIdsAsignadas === 'function' ? torreVariedadesIdsAsignadas().length : 0;
      if (nVar > 1) {
        hintMedia.textContent =
          'Varias variedades en la instalación: no hay una media entre fases del catálogo aplicable a todo el depósito; revisa el objetivo manual con cada cultivo o usa modo automático por etapa.';
      } else if (rec && rec.ecMediaFasesCatalogo && rec.ecMediaFasesCatalogo.midAvg != null) {
        const m = rec.ecMediaFasesCatalogo;
        hintMedia.textContent =
          'Una sola variedad: media aproximada entre fases del catálogo (orientativa) ≈ ' +
          m.midAvg +
          ' µS/cm (medias de mínimos ~' +
          m.minAvg +
          ', de máximos ~' +
          m.maxAvg +
          '). Útil como referencia si quieres un EC manual fijo; el cultivo real sigue variando por etapa.';
      } else if (nVar === 0) {
        hintMedia.textContent =
          'Sin variedades asignadas en Cultivo e instalación: define plantas y fecha para alinear el manual con el catálogo, o usa solo tu criterio.';
      } else {
        hintMedia.textContent =
          'Esta variedad no define fases EC en el catálogo; usa el rango de la ficha o la tabla de variedades como referencia.';
      }
    } else {
      hintMedia.classList.add('setup-hidden');
      hintMedia.textContent = '';
    }
  }
}

function syncSistemaRdwcDesdeConfig(cfg) {
  const c = cfg || state.configTorre || {};
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  try {
    seleccionarSistemaRdwcMontajeOrigen('diy');
  } catch (_) {}
}

function applySetupRdwcDesdeFormulario() {
  const c = buildRdwcConfigFromForm('setup', getSetupRdwcDraftSeed());
  delete c.rdwcCultivoPrevisto;
  setupRdwcDraft = hcSetupClonePlain(c, {});
  try {
    if (typeof renderRdwcSetupCalculadoUi === 'function') renderRdwcSetupCalculadoUi(c);
  } catch (_) {}
  return c;
}

function syncSetupRdwcFieldsDesdeConfig(cfg) {
  const esNueva = typeof setupEsNuevaTorre !== 'undefined' && setupEsNuevaTorre;
  let c;
  if (esNueva) {
    c = hcSetupClonePlain(setupRdwcDraft || hcFreshRdwcSetupBare(), {}) || hcFreshRdwcSetupBare();
    delete c.volMezclaLitros;
  } else {
    c = hcSetupClonePlain(cfg || setupRdwcDraft || state.configTorre || {}, {}) || {};
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  }
  c.tipoInstalacion = 'rdwc';
  delete c.rdwcCultivoPrevisto;
  setupRdwcDraft = hcSetupClonePlain(c, {});
  const map = {
    setupRdwcSites: c.rdwcSites,
    setupRdwcRows: c.rdwcRows,
    setupRdwcBucketVolL: c.rdwcBucketVolL,
    setupRdwcControlVolL: c.rdwcControlVolL,
    setupRdwcControlTrabajoL: c.volMezclaLitros,
    setupRdwcRecircPumpW: c.rdwcRecircPumpW,
    setupRdwcAirPumpW: c.rdwcAirPumpW,
    setupRdwcAirLpm: c.rdwcAirLpm,
    setupRdwcNetPotMm: c.rdwcNetPotMm,
    setupRdwcNetPotHeightMm: c.rdwcNetPotHeightMm,
    setupRdwcCenterSpacingCm: c.rdwcCenterSpacingCm,
    setupRdwcSupplyTubeMm: c.rdwcSupplyTubeMm,
    setupRdwcReturnTubeMm: c.rdwcReturnTubeMm,
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = map[id] != null ? String(map[id]) : '';
  });
  try {
    initSetupRdwcPresetSelect();
  } catch (_) {}
  try {
    seleccionarSetupRdwcMontajeOrigen('diy');
  } catch (_) {}
  bindRdwcCompatLive('setup');
  const cFresh = setupRdwcDraft || c;
  const compatEl = document.getElementById('setupRdwcCompatStatus');
  const calcEl = document.getElementById('setupRdwcCalcStatus');
  if (compatEl) compatEl.innerHTML = '';
  if (calcEl) calcEl.innerHTML = '';
  try {
    if (typeof renderRdwcSetupCalculadoUi === 'function') renderRdwcSetupCalculadoUi(cFresh);
  } catch (_) {}
  try {
    if (typeof refreshRdwcSetupPreview === 'function') refreshRdwcSetupPreview();
  } catch (_) {}
  try {
    syncRdwcLitrosUtilesSugeridos('setup');
  } catch (_) {}
  try {
    syncRdwcBombasUi(cFresh);
  } catch (_) {}
}

function aplicarSistemaRdwcDesdeFormulario() {
  initTorres();
  const idxAct = state.torreActiva || 0;
  const slotAct = state.torres && state.torres[idxAct] ? state.torres[idxAct] : null;
  const tipoPrevio = tipoInstalacionNormalizado((slotAct && slotAct.config) || state.configTorre || {});
  if (slotAct && slotAct.config && slotAct.config.tipoInstalacion && tipoPrevio !== 'rdwc') {
    showToast('Esta instalación no es RDWC. Para crear un RDWC nuevo usa "Nueva instalación" o el asistente.', true);
    try { syncSistemaRdwcDesdeConfig(slotAct.config); } catch (_) {}
    return;
  }
  if (typeof hcCapturarSnapshotSeguridadTorre === 'function') {
    hcCapturarSnapshotSeguridadTorre(idxAct, 'rdwc-system-save');
  }
  const c = state.configTorre || (state.configTorre = {});
  c.tipoInstalacion = 'rdwc';
  const built = buildRdwcConfigFromForm('sys', c);
  Object.assign(c, built);
  if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(c);
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try { actualizarHeaderTorre(); } catch (_) {}
  try { actualizarBadgesNutriente(); } catch (_) {}
  try { updateDashboard(); } catch (_) {}
  renderRdwcCompatStatus(c, 'sysRdwcCompatStatus');
  renderRdwcCalculoStatus(c, 'sysRdwcCalcStatus');
  showToast('✅ Datos RDWC guardados');
}

/** Texto corto en Cultivo e instalación: qué datos son fáciles de conseguir según el tipo activo. */
function refrescarSistemaDatosFacilesBanner(cfg) {
  const el = document.getElementById('sistemaDatosFacilesBanner');
  if (!el) return;
  if (!cfg) {
    el.classList.add('setup-hidden');
    return;
  }
  const tipo = typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : cfg.tipoInstalacion;
  if (!tipo || tipo === 'torre') {
    el.classList.add('setup-hidden');
    el.textContent = '';
    return;
  }
  el.classList.remove('setup-hidden');
  if (tipo === 'nft') {
    el.textContent =
      'NFT: disposición, tubos/huecos y Ø de cesta (suele venir en la caja del net pot). Altura de bombeo solo si el agua sube; datos de bomba son opcionales (placa del equipo).';
  } else if (tipo === 'dwc') {
    el.textContent =
      'DWC: cinta por dentro del depósito o litros en etiqueta; Ø de cesta en el envase. Rejilla y litros de mezcla los orienta la app si dejas vacío lo opcional.';
  } else if (tipo === 'rdwc') {
    el.classList.add('setup-hidden');
    el.textContent = '';
    return;
  } else if (tipo === 'srf') {
    el.textContent =
      'SRF: mide el estanque (L×A×profundidad útil) y huecos en la balsa. Aireación y litros de mezcla pueden quedar orientativos hasta que los completes.';
  } else {
    el.classList.add('setup-hidden');
    el.textContent = '';
  }
}

function sincronizarSistemaNftMontajeUI() {
  const card = document.getElementById('sistemaNftMontajeCard');
  const dwcInfo = document.getElementById('sistemaDwcAyudaCard');
  const srfInfo = document.getElementById('sistemaSrfAyudaCard');
  const torreObj = document.getElementById('sistemaTorreObjetivoCard');
  const ecphCard = document.getElementById('sistemaEcPhStrategyCard');
  const cfg = state.configTorre;
  try {
    refrescarSistemaDatosFacilesBanner(cfg);
  } catch (eBan) {}
  const tipoInst =
    cfg && typeof tipoInstalacionNormalizado === 'function'
      ? tipoInstalacionNormalizado(cfg)
      : cfg && cfg.tipoInstalacion;
  const ocultarEcPhObjetivoTorreEnSistema = tipoInst === 'torre';
  const ocultarEcPhRdwc = tipoInst === 'rdwc';
  const nftYaListo = cfg && nftInstalacionYaConfigurada(cfg);
  if (ecphCard) {
    const mostrarEcPh = cfg && !ocultarEcPhObjetivoTorreEnSistema && !ocultarEcPhRdwc && !nftYaListo;
    ecphCard.style.display = mostrarEcPh ? 'block' : 'none';
    ecphCard.classList.toggle('setup-hidden', !mostrarEcPh);
    ecphCard.hidden = !mostrarEcPh;
  }
  if (cfg && !ocultarEcPhObjetivoTorreEnSistema && !ocultarEcPhRdwc && !nftYaListo) {
    try {
      syncSistemaEcPhStrategyUI();
    } catch (_) {}
  }
  if (cfg && ocultarEcPhRdwc) {
    cfg.ecPhEstrategia = 'auto';
    cfg.ecPhIntensidad = 'conservador';
  }
  if (cfg && tipoInst === 'nft') {
    try {
      nftEnsureDifusorEnDeposito(cfg);
    } catch (_) {}
  }
  const torreMontajeCard = document.getElementById('sistemaTorreMontajeCard');
  if (torreObj) {
    torreObj.style.display = 'none';
    torreObj.classList.add('setup-hidden');
    torreObj.hidden = true;
  }
  if (torreMontajeCard) {
    if (cfg && cfg.tipoInstalacion === 'torre') {
      try {
        ocultarTorreMontajeWizardEnPestanaSistema();
      } catch (_) {}
    } else {
      torreMontajeCard.style.display = 'none';
      torreMontajeCard.classList.add('setup-hidden');
      try {
        restaurarSetupTorreBuilderControls();
      } catch (_) {}
    }
  }
  if (dwcInfo) {
    if (cfg && (cfg.tipoInstalacion === 'dwc' || cfg.tipoInstalacion === 'rdwc')) {
      dwcInfo.style.display = 'block';
      syncSistemaDwcRdwcPanelIndependienteUI(cfg);
      applySistemaDwcRdwcBodyVisibilitySegunTipo(cfg);
      if (cfg.tipoInstalacion === 'rdwc') {
        syncSistemaRdwcDesdeConfig(cfg);
      } else {
        syncDwcFormInputsDesdeConfig(cfg, DWC_FORM_IDS_SISTEMA);
        try {
          refreshDwcSistemaMedidasUI();
        } catch (eDwcHint) {}
      }
    } else {
      dwcInfo.style.display = 'none';
    }
  }
  if (srfInfo) {
    if (cfg && cfg.tipoInstalacion === 'srf') {
      srfInfo.style.display = 'block';
      try {
        if (typeof syncSrfFormDesdeConfig === 'function') syncSrfFormDesdeConfig(cfg, 'sys');
        if (typeof renderSrfCalculoStatus === 'function') renderSrfCalculoStatus(cfg, 'sysSrfCalcStatus');
        const res = document.getElementById('sistemaSrfResumen');
        if (res && typeof textoResumenSistemaSrfPanel === 'function') {
          res.textContent = textoResumenSistemaSrfPanel(cfg);
        }
      } catch (_) {}
    } else {
      srfInfo.style.display = 'none';
    }
  }
  if (!card) {
    try {
      renderNftCultivoRecoStatus('sys');
    } catch (_) {}
    applySistemaTipoPanelesColapsablesUI();
    return;
  }
  if (!cfg || cfg.tipoInstalacion !== 'nft') {
    card.style.display = 'none';
    card.classList.add('setup-hidden');
    card.hidden = true;
    try {
      renderNftCultivoRecoStatus('sys');
    } catch (_) {}
    applySistemaTipoPanelesColapsablesUI();
    return;
  }
  if (nftInstalacionYaConfigurada(cfg)) {
    card.style.display = 'none';
    card.classList.add('setup-hidden');
    card.hidden = true;
    try {
      renderNftCultivoRecoStatus('sys');
    } catch (_) {}
    applySistemaTipoPanelesColapsablesUI();
    return;
  }
  card.style.display = 'block';
  card.classList.remove('setup-hidden');
  card.hidden = false;
  const dispN = nftDisposicionNormalizada(cfg.nftDisposicion);
  seleccionarSistemaNftDisposicion(dispN);
  const altInp = document.getElementById('sysNftAlturaBombeoCm');
  if (altInp) {
    altInp.value =
      cfg.nftAlturaBombeoCm != null && Number(cfg.nftAlturaBombeoCm) > 0 ? String(Math.round(Number(cfg.nftAlturaBombeoCm))) : '';
  }
  const hxEl = document.getElementById('sysNftHuecos');
  if (hxEl) hxEl.value = String(Math.max(2, Math.min(30, cfg.nftHuecosPorCanal || cfg.numCestas || 8)));
  const pendEl = document.getElementById('sysNftPendiente');
  if (pendEl) pendEl.value = String(Math.max(1, Math.min(4, Math.round(Number(cfg.nftPendientePct)) || 2)));
  const objSel = document.getElementById('sysNftObjetivoCultivo');
  if (objSel) objSel.value = nftGetObjetivoCultivo(cfg);
  const objHint = document.getElementById('sysNftObjetivoHint');
  if (objHint) {
    const spN = nftGetObjetivoSpec(nftGetObjetivoCultivo(cfg));
    objHint.classList.remove('setup-hidden');
    objHint.textContent = 'Referencia: ' + spN.densidadTxt + ' · ' + spN.cicloTxt + '.';
  }
  const rimSysIn = document.getElementById('sysNftPotRimMm');
  const hSysIn = document.getElementById('sysNftPotHmm');
  if (rimSysIn) {
    const rNv =
      cfg.nftNetPotRimMm != null && Number(cfg.nftNetPotRimMm) > 0
        ? Math.round(Number(cfg.nftNetPotRimMm))
        : cfg.dwcNetPotRimMm != null && Number(cfg.dwcNetPotRimMm) > 0
          ? Math.round(Number(cfg.dwcNetPotRimMm))
          : '';
    rimSysIn.value = rNv !== '' ? String(rNv) : '';
  }
  if (hSysIn) {
    const hNv =
      cfg.nftNetPotHeightMm != null && Number(cfg.nftNetPotHeightMm) > 0
        ? Math.round(Number(cfg.nftNetPotHeightMm))
        : cfg.dwcNetPotHeightMm != null && Number(cfg.dwcNetPotHeightMm) > 0
          ? Math.round(Number(cfg.dwcNetPotHeightMm))
          : '';
    hSysIn.value = hNv !== '' ? String(hNv) : '';
  }
  try {
    syncSistemaNftPotRimChipsFromInput();
  } catch (_) {}
  syncNftMesaRecorridoUiFromCfg(cfg);
  const mmChk = document.getElementById('sysNftMesaMultinivelChk');
  if (mmChk) mmChk.checked = cfg.nftMesaMultinivel === true;
  if (mmChk && mmChk.checked) {
    const tiersS = parseNftMesaTubosPorNivelStrLoose(cfg.nftMesaTubosPorNivelStr || '');
    rebuildNftMesaMultinivelGrid('sys', tiersS.length >= 2 ? tiersS : [1, 1]);
  }
  const bhSys = document.getElementById('sysNftBombaLh');
  const bwSys = document.getElementById('sysNftBombaW');
  if (bhSys) {
    bhSys.value =
      cfg.nftBombaUsuarioCaudalLh != null && cfg.nftBombaUsuarioCaudalLh !== ''
        ? String(cfg.nftBombaUsuarioCaudalLh)
        : '';
  }
  if (bwSys) {
    bwSys.value =
      cfg.nftBombaUsuarioPotenciaW != null && cfg.nftBombaUsuarioPotenciaW !== ''
        ? String(cfg.nftBombaUsuarioPotenciaW)
        : '';
  }
  const mmSep = document.getElementById('sysNftMesaSepCm');
  if (mmSep) {
    mmSep.value =
      cfg.nftMesaSeparacionNivelesCm != null && Number(cfg.nftMesaSeparacionNivelesCm) > 0
        ? String(Math.round(Number(cfg.nftMesaSeparacionNivelesCm)))
        : '';
  }
  seleccionarSistemaNftEscaleraCaras(nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras));
  let nvEsc = 4;
  if (dispN === 'escalera' && cfg.nftEscaleraNivelesCara != null && Number(cfg.nftEscaleraNivelesCara) > 0) {
    nvEsc = Math.max(1, Math.min(12, Math.round(Number(cfg.nftEscaleraNivelesCara))));
  }
  const peld = document.getElementById('sysNftPeldaños');
  if (peld) peld.value = String(nvEsc);
  const ncEl = document.getElementById('sysNftNumCanales');
  if (ncEl) {
    let nc = Math.max(1, Math.min(24, parseInt(String(cfg.nftNumCanales ?? cfg.numNiveles ?? 4), 10) || 4));
    if (dispN === 'escalera') nc = Math.max(1, Math.min(24, nvEsc * nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras)));
    ncEl.value = String(nc);
  }
  onSistemaNftMesaMultinivelToggle();
  refrescarSistemaNftMontajeSubpanels();
  try {
    seleccionarSistemaNftMontajeOrigen('diy');
  } catch (_) {}
  applySistemaTipoPanelesColapsablesUI();
  try {
    renderNftCultivoRecoStatus('sys');
  } catch (_) {}
}

function aplicarSistemaTorreObjetivoDesdeFormulario() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'torre') return;
  const sel = document.getElementById('sysTorreObjetivoCultivo');
  const objetivo = torreNormalizeObjetivoCultivo(sel && sel.value);
  state.configTorre.torreObjetivoCultivo = objetivo;
  guardarEstadoTorreActual();
  saveState();
  try { renderTorreSistemaResumenTabla(state.configTorre); } catch (_) {}
  try { refreshConsejosSiVisible(); } catch (_) {}
  showToast('Objetivo de torre guardado: ' + (objetivo === 'baby' ? 'Alta densidad / baby leaf' : 'Planta adulta (tamaño completo)'));
}

/** Checklist recarga (paso T·obj): mismo criterio que Cultivo e instalación, sincroniza el select del sistema si existe. */
function persistTorreObjetivoDesdeChecklist() {
  if (!state.configTorre || tipoInstalacionNormalizado(state.configTorre) !== 'torre') return;
  const sel = document.getElementById('clTorreObjetivoCultivo');
  if (!sel) return;
  const objetivo = torreNormalizeObjetivoCultivo(sel.value);
  state.configTorre.torreObjetivoCultivo = objetivo;
  try {
    const sysSel = document.getElementById('sysTorreObjetivoCultivo');
    if (sysSel) sysSel.value = objetivo;
  } catch (_) {}
  try {
    guardarEstadoTorreActual();
  } catch (_) {}
  try {
    saveState();
  } catch (_) {}
  try {
    renderTorreSistemaResumenTabla(state.configTorre);
  } catch (_) {}
  try {
    refreshConsejosSiVisible();
  } catch (_) {}
  try {
    evalParam();
  } catch (_) {}
  showToast(
    'Objetivo de torre: ' + (objetivo === 'baby' ? 'Alta densidad / baby leaf' : 'Planta adulta (tamaño completo)')
  );
  try {
    if (typeof renderChecklist === 'function') renderChecklist();
  } catch (_) {}
}

function aplicarSistemaEcPhStrategyDesdeFormulario() {
  if (!state.configTorre) return;
  const cfg = state.configTorre;
  const tipoInst =
    typeof tipoInstalacionNormalizado === 'function'
      ? tipoInstalacionNormalizado(cfg)
      : cfg.tipoInstalacion;
  if (tipoInst === 'rdwc') {
    cfg.ecPhEstrategia = 'auto';
    cfg.ecPhIntensidad = 'conservador';
    saveState();
    return;
  }
  const selE = document.getElementById('sysEcPhEstrategia');
  const selI = document.getElementById('sysEcPhIntensidad');
  const ecM = document.getElementById('sysEcManualObjetivoUs');
  const phMin = document.getElementById('sysPhManualObjetivoMin');
  const phMax = document.getElementById('sysPhManualObjetivoMax');
  const strategy = String(selE?.value || 'auto') === 'manual' ? 'manual' : 'auto';
  const intensityRaw = String(selI?.value || 'estandar');
  const intensity = intensityRaw === 'conservador' || intensityRaw === 'intensivo' ? intensityRaw : 'estandar';
  cfg.ecPhEstrategia = strategy;
  cfg.ecPhIntensidad = intensity;
  if (strategy === 'manual') {
    const ecN = parseInt(String(ecM?.value || '').trim(), 10);
    const p0 = parseFloat(String(phMin?.value || '').replace(',', '.'));
    const p1 = parseFloat(String(phMax?.value || '').replace(',', '.'));
    if (Number.isFinite(ecN) && ecN >= 200 && ecN <= 6000) {
      cfg.ecManualObjetivoUs = Math.round(ecN);
    } else {
      delete cfg.ecManualObjetivoUs;
    }
    if (Number.isFinite(p0) && Number.isFinite(p1) && p0 >= 4.8 && p1 <= 7.2 && p1 >= p0 + 0.1) {
      cfg.phManualObjetivoMin = Math.round(p0 * 10) / 10;
      cfg.phManualObjetivoMax = Math.round(p1 * 10) / 10;
    } else {
      delete cfg.phManualObjetivoMin;
      delete cfg.phManualObjetivoMax;
    }
  } else {
    delete cfg.ecManualObjetivoUs;
    delete cfg.phManualObjetivoMin;
    delete cfg.phManualObjetivoMax;
  }
  guardarEstadoTorreActual();
  saveState();
  try { syncSistemaEcPhStrategyUI(); } catch (_) {}
  try { actualizarBadgesNutriente(); } catch (_) {}
  try { updateDashboard(); } catch (_) {}
  try { evalParam(); } catch (_) {}
  showToast(
    strategy === 'manual'
      ? 'Estrategia guardada: EC/pH manuales bajo tu criterio.'
      : 'Estrategia guardada: EC/pH automáticos por etapa y contexto.'
  );
}

/** Desde Cultivo e instalación: mismo overlay que «configurar», saltando al paso 1 (NFT: canal, tubo Ø, lámina, bomba). */
function abrirAsistenteNftCanalYTuboDesdeSistema() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  guardarEstadoTorreActual();
  saveState();
  abrirSetup();
  setupTipoInstalacion = 'nft';
  setupPagina = 1;
  renderSetupPage();
  try {
    updateNftSetupPreview();
  } catch (e) {}
}

function aplicarSistemaNftMontajeDesdeFormulario() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  const cfg = state.configTorre;
  let dispo = 'mesa';
  if (document.getElementById('sysNftDispEscalera')?.classList.contains('selected')) dispo = 'escalera';
  else if (document.getElementById('sysNftDispPared')?.classList.contains('selected')) dispo = 'pared';
  cfg.nftDisposicion = dispo;
  delete cfg.nftMontajeOrigen;
  const altRaw = parseFloat(String(document.getElementById('sysNftAlturaBombeoCm')?.value || '').replace(',', '.'));
  if (Number.isFinite(altRaw) && altRaw > 0) cfg.nftAlturaBombeoCm = Math.min(500, Math.round(altRaw));
  else delete cfg.nftAlturaBombeoCm;
  const pendSel = parseInt(String(document.getElementById('sysNftPendiente')?.value || '2'), 10);
  cfg.nftPendientePct = Math.max(1, Math.min(4, Number.isFinite(pendSel) ? pendSel : 2));
  cfg.nftObjetivoCultivo = nftNormalizeObjetivoCultivo(document.getElementById('sysNftObjetivoCultivo')?.value || cfg.nftObjetivoCultivo);
  const hxInp = parseInt(String(document.getElementById('sysNftHuecos')?.value || ''), 10);
  cfg.nftHuecosPorCanal = Math.max(2, Math.min(30, Number.isFinite(hxInp) ? hxInp : cfg.nftHuecosPorCanal || 8));
  const rimSys = parseInt(String(document.getElementById('sysNftPotRimMm')?.value ?? '').trim(), 10);
  const hSys = parseInt(String(document.getElementById('sysNftPotHmm')?.value ?? '').trim(), 10);
  if (Number.isFinite(rimSys) && rimSys >= 25 && rimSys <= 120) cfg.nftNetPotRimMm = rimSys;
  else delete cfg.nftNetPotRimMm;
  if (Number.isFinite(hSys) && hSys >= 30 && hSys <= 200) cfg.nftNetPotHeightMm = hSys;
  else delete cfg.nftNetPotHeightMm;
  const lhSys = parseFloat(String(document.getElementById('sysNftBombaLh')?.value || '').replace(',', '.'));
  const wSys = parseFloat(String(document.getElementById('sysNftBombaW')?.value || '').replace(',', '.'));
  if (Number.isFinite(lhSys) && lhSys > 0) cfg.nftBombaUsuarioCaudalLh = Math.round(lhSys);
  else delete cfg.nftBombaUsuarioCaudalLh;
  if (Number.isFinite(wSys) && wSys > 0) cfg.nftBombaUsuarioPotenciaW = Math.round(wSys);
  else delete cfg.nftBombaUsuarioPotenciaW;
  delete cfg.nftMesaMultinivel;
  delete cfg.nftMesaTubosPorNivelStr;
  delete cfg.nftMesaHuecosPorNivelStr;
  delete cfg.nftMesaSeparacionNivelesCm;
  delete cfg.nftMesaRecorridoAgua;
  delete cfg.nftParedRecorridoAgua;
  delete cfg.nftEscaleraCaras;
  delete cfg.nftEscaleraNivelesCara;
  if (dispo === 'mesa') {
    cfg.nftMesaRecorridoAgua = readNftMesaRecorridoFromUi('sys');
    const mm = document.getElementById('sysNftMesaMultinivelChk')?.checked === true;
    const tiersStr = getNftMesaTubosPorNivelStrFromGrid('sys');
    const sepRaw = parseFloat(String(document.getElementById('sysNftMesaSepCm')?.value || '').replace(',', '.'));
    if (mm) {
      const tiers = parseNftMesaTubosPorNivelStr(tiersStr);
      if (tiers.length < 2) {
        showToast('Multinivel: indica al menos dos niveles y al menos un tubo por nivel (igual en todos).', true);
        return;
      }
      cfg.nftMesaMultinivel = true;
      cfg.nftMesaTubosPorNivelStr = tiers.join(',');
      if (Number.isFinite(sepRaw) && sepRaw > 0) cfg.nftMesaSeparacionNivelesCm = Math.min(150, Math.round(sepRaw));
      else delete cfg.nftMesaSeparacionNivelesCm;
      cfg.nftNumCanales = getNftHidraulicaDesdeConfig(cfg).nCh;
    } else {
      const nc = parseInt(String(document.getElementById('sysNftNumCanales')?.value || ''), 10);
      cfg.nftNumCanales = Math.max(1, Math.min(24, Number.isFinite(nc) ? nc : 4));
    }
  } else if (dispo === 'escalera') {
    const caras = document.getElementById('sysNftEscCara2')?.classList.contains('selected') ? 2 : 1;
    cfg.nftEscaleraCaras = caras;
    const nv = parseInt(String(document.getElementById('sysNftPeldaños')?.value || ''), 10);
    cfg.nftEscaleraNivelesCara = Math.max(1, Math.min(12, Number.isFinite(nv) ? nv : 4));
    cfg.nftNumCanales = cfg.nftEscaleraNivelesCara * caras;
  } else {
    cfg.nftParedRecorridoAgua = readNftMesaRecorridoFromUi('sys');
    const nc = parseInt(String(document.getElementById('sysNftNumCanales')?.value || ''), 10);
    cfg.nftNumCanales = Math.max(1, Math.min(24, Number.isFinite(nc) ? nc : 4));
  }
  cfg.nftBombaEstimada = getNftBombaDesdeConfig(cfg);
  redimensionarMatrizTorreNftPreservando(cfg);
  cfg.uiSistemaNftMontajeColapsado = true;
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  try {
    refrescarUIMensajeBombaUsuarioNft('checklist');
  } catch (e) {}
  if (document.getElementById('tab-consejos')?.classList.contains('active')) {
    try {
      renderConsejos();
    } catch (e2) {}
  }
  showToast('Montaje NFT aplicado');
  try {
    renderTorreSistemaResumenTabla(cfg);
  } catch (_) {}
  try {
    applySistemaTipoPanelesColapsablesUI();
  } catch (_) {}
}

const DWC_FORM_IDS_SISTEMA = {
  largo: 'sysDwcLargoCm',
  ancho: 'sysDwcAnchoCm',
  largoInf: 'sysDwcLargoInfCm',
  anchoInf: 'sysDwcAnchoInfCm',
  largoSup: 'sysDwcLargoSupCm',
  anchoSup: 'sysDwcAnchoSupCm',
  diametro: 'sysDwcDiametroCm',
  prof: 'sysDwcProfCm',
  profTronco: 'sysDwcTroncoAlturaCm',
  forma: 'sysDwcDepositoForma',
  volManual: 'sysDwcVolumenManualL',
  rim: 'sysDwcPotRimMm',
  alt: 'sysDwcPotHmm',
  modo: 'sysDwcModoCultivo',
  objetivo: 'sysDwcObjetivoCultivo',
  rejillaModo: 'sysDwcRejillaPreferida',
  oxigenacionDiseno: 'sysDwcOxigenacionDiseno',
  numCubos: 'sysDwcNumCubos',
  litrosUtilesPorSitio: 'sysDwcLitrosUtilesPorSitioL',
  cupulas: 'sysDwcCupulas',
  aire: 'sysDwcEntradaAire',
};
const DWC_FORM_IDS_SETUP = {
  largo: 'setupDwcLargoCm',
  ancho: 'setupDwcAnchoCm',
  largoInf: 'setupDwcLargoInfCm',
  anchoInf: 'setupDwcAnchoInfCm',
  largoSup: 'setupDwcLargoSupCm',
  anchoSup: 'setupDwcAnchoSupCm',
  diametro: 'setupDwcDiametroCm',
  prof: 'setupDwcProfCm',
  profTronco: 'setupDwcTroncoAlturaCm',
  forma: 'setupDwcDepositoForma',
  volManual: 'setupDwcVolumenManualL',
  rim: 'setupDwcPotRimMm',
  alt: 'setupDwcPotHmm',
  modo: 'setupDwcModoCultivo',
  objetivo: 'setupDwcObjetivoCultivo',
  rejillaModo: 'setupDwcRejillaPreferida',
  oxigenacionDiseno: 'setupDwcOxigenacionDiseno',
  numCubos: 'setupDwcNumCubos',
  litrosUtilesPorSitio: 'setupDwcLitrosUtilesPorSitioL',
  marco: 'setupDwcTapaMarcoMm',
  hueco: 'setupDwcTapaHuecoMm',
  cupulas: 'setupDwcCupulas',
  aire: 'setupDwcEntradaAire',
};


