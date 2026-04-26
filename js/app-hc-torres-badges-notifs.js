/**
 * Multi-torre (initTorres, …), badges nutriente, notificaciones locales.
 * Tras app-hc-setup-onboarding.js. Siguiente: app-hc-pwa-fotodb.js.
 */
// ══════════════════════════════════════════════════
// SISTEMA MULTI-TORRE
// ══════════════════════════════════════════════════

const MAX_TORRES = 10;

function emojiMigracionPorTipoInstalacion(cfg) {
  if (!cfg || !cfg.tipoInstalacion) return '🌿';
  if (cfg.tipoInstalacion === 'nft') return '🪴';
  if (cfg.tipoInstalacion === 'dwc') return '🌊';
  return '🌿';
}

// Inicializar sistema de torres si no existe
function initTorres() {
  if (!state.torres) {
    // Migrar configuración actual como primera instalación
    state.torres = [{
      id: 1,
      nombre: 'Mi instalación',
      emoji: emojiMigracionPorTipoInstalacion(state.configTorre),
      config: state.configTorre || null,
      torre: state.torre || [],
      modoActual: modoActual || 'lechuga',
      mediciones: state.mediciones || [],
      registro: state.registro || [],
      fotosSistemaCompleto: { fotoKeys: [], fotos: [] },
    }];
    state.torreActiva = 0; // índice en el array
    saveState();
  }
  let idSeq = Date.now();
  let idsReparados = false;
  (state.torres || []).forEach(t => {
    if (t.id == null || t.id === '') {
      idSeq += 1;
      t.id = idSeq;
      idsReparados = true;
    }
    if (!t.fotosSistemaCompleto || typeof t.fotosSistemaCompleto !== 'object') {
      t.fotosSistemaCompleto = { fotoKeys: [], fotos: [] };
    } else {
      if (!Array.isArray(t.fotosSistemaCompleto.fotoKeys)) t.fotosSistemaCompleto.fotoKeys = [];
      if (!Array.isArray(t.fotosSistemaCompleto.fotos)) t.fotosSistemaCompleto.fotos = [];
    }
  });
  if (idsReparados) saveState();
}

function getTorreActiva() {
  initTorres();
  const idx = state.torreActiva || 0;
  return state.torres[idx] || state.torres[0];
}

/**
 * Alinea `state.ultimaMedicion`, recarga y snooze con el **slot** de la instalación activa.
 * Evita mostrar en Inicio datos de otra instalación si el estado global quedó desincronizado.
 */
function sincronizarUltimaMedicionYRecargaDesdeTorreActiva() {
  initTorres();
  const idx = state.torreActiva || 0;
  const t = state.torres && state.torres[idx];
  if (!t) return;
  const umSlot = t.ultimaMedicion;
  if (umSlot && typeof umSlot === 'object') {
    state.ultimaMedicion = { ...umSlot };
  } else {
    const med0 = (t.mediciones || []).find(m => m && (m.tipo === 'medicion' || !m.tipo));
    state.ultimaMedicion = med0
      ? {
          fecha: med0.fecha,
          hora: med0.hora,
          ec: med0.ec,
          ph: med0.ph,
          temp: med0.temp,
          vol: med0.vol,
          humSustrato: med0.humSustrato,
        }
      : null;
  }
  state.ultimaRecarga = t.ultimaRecarga != null ? t.ultimaRecarga : null;
  state.recargaSnoozeHasta = t.recargaSnoozeHasta != null ? t.recargaSnoozeHasta : null;
}


// Actualizar todos los datos de la torre activa
function actualizarTorreActual() {
  if (state.configTorre) {
    state.configTorre.checklistInstalacionConfirmada = true;
    if (state.configTorre.tipoInstalacion === 'dwc') {
      try {
        dwcPersistSnapshotMaxCestasEnCfg(state.configTorre);
      } catch (eD) {}
    }
  }
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try {
    if (state.configTorre && state.configTorre.tipoInstalacion === 'dwc') refreshDwcSistemaMedidasUI();
  } catch (eDwUi) {}
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  // Recalcular plantas y edad automáticamente
  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    actualizarVistaRiegoPorTipoInstalacion();
    calcularRiego();
  }
  if (document.getElementById('tab-meteo')?.classList.contains('active')) {
    cargarMeteo();
  }
  if (document.getElementById('tab-calendario')?.classList.contains('active')) {
    renderCalendario();
  }
  showToast('🔄 Instalación actualizada · ' + ((getTorreActiva()?.nombre || '').trim() || 'Instalación'));
}

function cambiarTorreActiva(idx) {
  // Guardar estado actual en la torre activa
  guardarEstadoTorreActual();
  torreCestasMultiSel.clear();
  torreInteraccionModo = 'editar';

  // Cambiar a la nueva torre
  state.torreActiva = idx;
  cargarEstadoTorre(idx);
  saveState();
  cerrarModalTorres();
  actualizarHeaderTorre();
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  const _bE = document.getElementById('torreModoEditar');
  const _bA = document.getElementById('torreModoAsignar');
  const _pA = document.getElementById('torreAssignPanel');
  if (_bE) { _bE.classList.add('active'); _bE.setAttribute('aria-pressed', 'true'); }
  if (_bA) { _bA.classList.remove('active'); _bA.setAttribute('aria-pressed', 'false'); }
  if (_pA) _pA.style.display = 'none';
  actualizarBarraMultiSel();
  // Recalcular plantas para la nueva torre en el input de riego
  const nCf = contarPlantasTorreConFechaValida();
  const nV = contarPlantasTorreConVariedad();
  const riegoNPl = document.getElementById('riegoNPlantas');
  if (riegoNPl) {
    if (nCf > 0) riegoNPl.value = String(nCf);
    else if (nV === 0) riegoNPl.value = '15';
    else riegoNPl.value = String(Math.max(1, nV));
  }

  actualizarVistaRiegoPorTipoInstalacion();

  // Toast con nombre de la torre
  const t = state.torres[idx];
  const nombre = (t && t.nombre) ? String(t.nombre).trim() : '';
  showToast('🌿 Ahora en: ' + (nombre || 'Instalación'));
  // Marcar datos como obsoletos — se recargarán al abrir cada pestaña
  window._meteoObsoleto = true;
  window._riegoObsoleto  = true;
  // Recargar si la pestaña ya está abierta (sincronizar primero)
  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    sincronizarInputsRiego();
    actualizarVistaRiegoPorTipoInstalacion();
    calcularRiego({ forceRefresh: true });
  }
  if (document.getElementById('tab-meteo')?.classList.contains('active')) cargarMeteo();
  if (document.getElementById('tab-calendario')?.classList.contains('active')) renderCalendario();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) initConfigUI();
}

/** Cestas con cultivo asignado (para detectar datos de torre más recientes en la raíz del state). */
function contarPlantasEnTorre(torreArr) {
  if (!torreArr || !Array.isArray(torreArr)) return 0;
  let n = 0;
  for (let ni = 0; ni < torreArr.length; ni++) {
    const row = torreArr[ni];
    if (!Array.isArray(row)) continue;
    for (let ci = 0; ci < row.length; ci++) {
      const c = row[ci];
      if (c && String(c.variedad || '').trim() !== '') n++;
    }
  }
  return n;
}

/**
 * Tras versiones antiguas o guardados sin sync, state.torre podía tener plantas y el slot
 * state.torres[idx].torre quedar vacío/obsoleto. Al cargar, se perdía la torre en pantalla.
 * Copia la raíz al slot si la raíz lleva más plantas registradas.
 */
function reconciliarSlotTorreActivaAntesDeCargar() {
  if (!state.torres || !state.torres.length) return;
  const idx = state.torreActiva || 0;
  const t = state.torres[idx];
  if (!t) return;
  const nSlot = contarPlantasEnTorre(t.torre);
  const nRoot = contarPlantasEnTorre(state.torre);
  if (nRoot > nSlot) {
    try {
      t.torre = JSON.parse(JSON.stringify(state.torre));
    } catch (e) {}
  }
  if (!t.config && state.configTorre && typeof state.configTorre === 'object' && Object.keys(state.configTorre).length) {
    try {
      t.config = JSON.parse(JSON.stringify(state.configTorre));
    } catch (e) {}
  }
}

function guardarEstadoTorreActual() {
  if (!state.torres) return;
  const idx = state.torreActiva || 0;
  if (!state.torres[idx]) return;
  state.torres[idx].torre      = JSON.parse(JSON.stringify(state.torre));
  state.torres[idx].modoActual = modoActual;
  state.torres[idx].mediciones = state.mediciones || [];
  state.torres[idx].registro   = state.registro   || [];
  state.torres[idx].ultimaMedicion = state.ultimaMedicion
    ? { ...state.ultimaMedicion }
    : null;
  state.torres[idx].ultimaRecarga = state.ultimaRecarga ?? null;
  state.torres[idx].recargaSnoozeHasta = state.recargaSnoozeHasta ?? null;
  state.torres[idx].config     = state.configTorre || null;
  ensureFotosSistemaCompletoState();
  try {
    state.torres[idx].fotosSistemaCompleto = JSON.parse(JSON.stringify(state.fotosSistemaCompleto));
  } catch (e) {
    state.torres[idx].fotosSistemaCompleto = { fotoKeys: [], fotos: [] };
  }
  // Guardar configuración de riego específica de esta torre
  state.torres[idx].riego = {
    nPlantas:   parseInt(document.getElementById('riegoNPlantas')?.value) || 15,
    edadSem:    parseFloat(document.getElementById('riegoEdad')?.value) || 4,
    toldo:      toldoDesplegado,
    diaRiego:   diaRiego,
  };
}

function cargarEstadoTorre(idx) {
  const t = state.torres[idx];
  if (!t) return;
  // Restaurar datos de esta torre
  state.torre       = t.torre || [];
  state.mediciones  = t.mediciones || [];
  state.registro    = t.registro   || [];
  state.configTorre = t.config     || null;
  const umSlot = t.ultimaMedicion;
  if (umSlot && typeof umSlot === 'object') {
    state.ultimaMedicion = { ...umSlot };
  } else {
    const med0 = (t.mediciones || []).find(m => m && (m.tipo === 'medicion' || !m.tipo));
    state.ultimaMedicion = med0
      ? {
          fecha: med0.fecha,
          hora: med0.hora,
          ec: med0.ec,
          ph: med0.ph,
          temp: med0.temp,
          vol: med0.vol,
          humSustrato: med0.humSustrato,
        }
      : null;
  }
  state.ultimaRecarga = t.ultimaRecarga != null ? t.ultimaRecarga : null;
  state.recargaSnoozeHasta = t.recargaSnoozeHasta != null ? t.recargaSnoozeHasta : null;
  const fsc = t.fotosSistemaCompleto;
  state.fotosSistemaCompleto =
    fsc && typeof fsc === 'object'
      ? {
          fotoKeys: Array.isArray(fsc.fotoKeys) ? fsc.fotoKeys.slice() : [],
          fotos: Array.isArray(fsc.fotos) ? fsc.fotos.slice() : [],
        }
      : { fotoKeys: [], fotos: [] };
  modoActual = typeof normalizeTorreModoActual === 'function'
    ? normalizeTorreModoActual(t.modoActual)
    : (MODOS_CULTIVO[t.modoActual] ? t.modoActual : 'lechuga');
  // Asegurar estructura COMPLETA siempre — rellenar niveles y cestas que falten
  const nivR = state.configTorre?.numNiveles || NUM_NIVELES;
  const cesR = state.configTorre?.numCestas  || NUM_CESTAS;
  if (!state.torre) state.torre = [];
  // Añadir niveles que falten
  while (state.torre.length < nivR) state.torre.push([]);
  // Añadir cestas que falten en cada nivel
  for (let n = 0; n < nivR; n++) {
    if (!state.torre[n]) state.torre[n] = [];
    while (state.torre[n].length < cesR) {
      state.torre[n].push({ variedad:'', fecha:'', notas:'', origenPlanta:'', fotos:[], fotoKeys:[] });
    }
  }
  for (let n = 0; n < nivR; n++) {
    (state.torre[n] || []).forEach(cell => {
      if (typeof asegurarCamposFilaTorre === 'function') asegurarCamposFilaTorre(cell);
    });
  }
  // Restaurar configuración de riego de esta torre
  const riegoData = t.riego || {};
  const riegoNPl = document.getElementById('riegoNPlantas');
  const riegoEd  = document.getElementById('riegoEdad');
  if (riegoNPl && riegoData.nPlantas) riegoNPl.value = riegoData.nPlantas;
  if (riegoEd  && riegoData.edadSem)  riegoEd.value  = riegoData.edadSem;
  const swToldo = document.getElementById('toldoSwitch');
  if (riegoData.toldo !== undefined) {
    toldoDesplegado = riegoData.toldo;
  } else {
    toldoDesplegado = false;
  }
  if (swToldo) {
    swToldo.className = 'toggle-switch' + (toldoDesplegado ? ' on' : '');
    swToldo.setAttribute('aria-checked', toldoDesplegado ? 'true' : 'false');
  }
  if (riegoData.diaRiego === 'hoy' || riegoData.diaRiego === 'manana') {
    setDiaRiego(riegoData.diaRiego);
  } else {
    setDiaRiego('hoy');
  }
  // Aplicar constantes de la config de esta torre
  if (state.configTorre?.sustrato) state.configSustrato = state.configTorre.sustrato;
  aplicarConfigTorre();
  cargarUbicacionMedicionesUI();
  cargarInteriorGrowUI();
  cargarSensorSustratoUI();
  cargarSensoresHardwareUI();
  cargarLocalidadMeteoUI();
  try { refreshUbicacionInstalacionUI(); } catch (_) {}
  syncRiegoAvanzadoUI();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) initConfigUI();
  try {
    if (typeof updateRecargaBar === 'function') updateRecargaBar();
  } catch (_) {}
  try {
    if (typeof refreshModoInfoText === 'function') refreshModoInfoText();
  } catch (_) {}
}

function actualizarHeaderTorre() {
  const t = getTorreActiva();
  const btn = document.getElementById('torreActivaNombre');
  if (btn) btn.textContent = (t.emoji || '🌿') + ' ' + ((t.nombre || '').trim() || 'Instalación');
  // Mostrar/ocultar botón añadir según límite
  const btnCrear = document.getElementById('btnCrearTorre');
  if (btnCrear) btnCrear.style.display = (state.torres.length >= MAX_TORRES) ? 'none' : 'block';
}

function sistemaEstaOperativa(cfg) {
  const c = cfg || state.configTorre || {};
  return c.operativa !== false;
}

function getMensajeStandbyContinuar() {
  return '⏸ Sistema en stand-by / descanso. Reactiva modo operativa para continuar.';
}

function setStandbyLockDisabled(el, on) {
  if (!el) return;
  const canDisable =
    (el instanceof HTMLButtonElement) ||
    (el instanceof HTMLInputElement) ||
    (el instanceof HTMLSelectElement) ||
    (el instanceof HTMLTextAreaElement);
  if (!canDisable) return;
  if (on) {
    if (!el.disabled) {
      el.disabled = true;
      el.dataset.standbyLocked = '1';
    }
    if (
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      !el.readOnly
    ) {
      el.readOnly = true;
      el.dataset.standbyReadonly = '1';
    }
    el.classList.add('is-standby-disabled');
    el.setAttribute('aria-disabled', 'true');
    return;
  }
  if (el.dataset.standbyLocked === '1') {
    el.disabled = false;
    delete el.dataset.standbyLocked;
  }
  if (el.dataset.standbyReadonly === '1') {
    el.readOnly = false;
    delete el.dataset.standbyReadonly;
  }
  el.classList.remove('is-standby-disabled');
  el.setAttribute('aria-disabled', el.disabled ? 'true' : 'false');
}

function aplicarBloqueosStandbyPorTab(on) {
  const tabMediciones = document.getElementById('tab-mediciones');
  if (tabMediciones) {
    tabMediciones.querySelectorAll('input, textarea, select').forEach(el => {
      setStandbyLockDisabled(el, !on);
    });
  }
  const tabSistema = document.getElementById('tab-sistema');
  if (tabSistema) {
    tabSistema.querySelectorAll('button, input, textarea, select').forEach(el => {
      if (el.id === 'sistemaOperativaSwitch') return;
      setStandbyLockDisabled(el, !on);
    });
  }
}

function aplicarEstadoStandbyUI() {
  const on = sistemaEstaOperativa();
  const appRoot = document.getElementById('app');
  if (appRoot) appRoot.classList.toggle('is-standby-active', !on);
  ['tab-inicio', 'tab-mediciones', 'tab-sistema', 'tab-riego'].forEach(id => {
    const tab = document.getElementById(id);
    if (tab) tab.classList.toggle('is-standby', !on);
  });
  const globalStandby = document.getElementById('globalStandbyBanner');
  if (globalStandby) {
    globalStandby.classList.toggle('setup-hidden', on);
  }
  const estadoRow = document.querySelector('.dash-operativa-row');
  if (estadoRow) estadoRow.classList.toggle('is-standby-active', !on);
  const btnGuardar = document.getElementById('btnGuardarMedicion');
  if (btnGuardar) {
    btnGuardar.disabled = !on;
    btnGuardar.setAttribute('aria-disabled', on ? 'false' : 'true');
  }
  const btnRiego = document.getElementById('btnCalcRiego');
  if (btnRiego) {
    btnRiego.disabled = !on;
    btnRiego.setAttribute('aria-disabled', on ? 'false' : 'true');
  }
  const dashSistemaInfo = document.getElementById('dashSistemaInfo');
  if (dashSistemaInfo) {
    dashSistemaInfo.classList.toggle('is-standby-blocked', !on);
    dashSistemaInfo.setAttribute('aria-disabled', on ? 'false' : 'true');
    dashSistemaInfo.setAttribute('tabindex', on ? '0' : '-1');
  }
  ['tileEC', 'tilePH', 'tileTemp', 'tileVol'].forEach(id => {
    const btn = document.getElementById(id);
    if (!(btn instanceof HTMLButtonElement)) return;
    setStandbyLockDisabled(btn, !on);
  });
  aplicarBloqueosStandbyPorTab(on);
  // Reaplicar tras renders diferidos de la pestaña para evitar que otros módulos reactiven campos.
  requestAnimationFrame(() => {
    if (!sistemaEstaOperativa()) aplicarBloqueosStandbyPorTab(false);
  });
  setTimeout(() => {
    if (!sistemaEstaOperativa()) aplicarBloqueosStandbyPorTab(false);
  }, 180);
  const accionesCriticas = [
    '[onclick*="abrirChecklist(false)"]',
    '[onclick*="confirmarReposicionDeposito"]',
    '#recargaSwitch',
  ];
  accionesCriticas.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (!(el instanceof HTMLButtonElement)) return;
      el.disabled = !on;
      el.classList.toggle('is-standby-disabled', !on);
      el.setAttribute('aria-disabled', on ? 'false' : 'true');
    });
  });
}

function actualizarEstadoOperativaUI() {
  const on = sistemaEstaOperativa();
  const tag = document.getElementById('medirEstadoOperativaTag');
  if (tag) {
    tag.textContent = on ? 'Operativa' : 'Stand-by / descanso';
    tag.classList.toggle('dash-operativa-sub--off', !on);
  }
  const sw = document.getElementById('sistemaOperativaSwitch');
  if (sw) {
    sw.classList.toggle('on', on);
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  aplicarEstadoStandbyUI();
}

function toggleSistemaOperativa() {
  initTorres();
  if (!state.configTorre) state.configTorre = {};
  const on = sistemaEstaOperativa();
  state.configTorre.operativa = !on;
  guardarEstadoTorreActual();
  saveState();
  actualizarEstadoOperativaUI();
  actualizarBadgesNutriente();
  if (document.getElementById('tab-riego')?.classList.contains('active') && typeof calcularRiego === 'function') {
    calcularRiego({ forceRefresh: true });
  }
  showToast(state.configTorre.operativa === false
    ? '⏸ Sistema en stand-by / descanso'
    : '✅ Sistema en modo operativa');
}

function textoTipoInstalacionTorre(cfg) {
  return typeof etiquetaSistemaHidroponicoBreve === 'function'
    ? etiquetaSistemaHidroponicoBreve(cfg)
    : (cfg && cfg.tipoInstalacion === 'nft'
      ? 'NFT'
      : cfg && cfg.tipoInstalacion === 'dwc'
        ? 'DWC'
        : 'Torre vertical');
}

/** Actualiza el botón de dos líneas (nombre + tipo) de la instalación activa en la pestaña Torre. */
function renderTorreInstalacionPicker() {
  initTorres();
  const btn = document.getElementById('torreInstalacionPickerBtn');
  const elEmoji = document.getElementById('torreInstalacionPickerEmoji');
  const elNom = document.getElementById('torreInstalacionPickerNombre');
  const elTipo = document.getElementById('torreInstalacionPickerTipo');
  if (!btn || !elNom || !elTipo) return;
  const torres = state.torres || [];
  const n = torres.length;
  const activa = n ? Math.min(Math.max(0, state.torreActiva || 0), n - 1) : 0;
  const t = n ? torres[activa] : null;
  const nom = t ? (((t.nombre || '').trim()) || ('Instalación ' + (activa + 1))) : '—';
  const emoji = t ? (t.emoji || '🌿') : '🌿';
  const tipoTxt = t ? textoTipoInstalacionTorre(t.config) : '—';
  if (elEmoji) elEmoji.textContent = emoji;
  elNom.textContent = nom;
  elTipo.textContent = tipoTxt;
  btn.setAttribute('aria-label',
    'Instalación actual: ' + nom + ', ' + tipoTxt + '. Abrir lista para elegir otra instalación');
}

function abrirSelectorTorres() {
  initTorres();
  renderListaTorres();
  const mt = document.getElementById('modalTorres');
  mt.classList.add('open');
  a11yDialogOpened(mt);
}

function cerrarModalTorres(e) {
  const mt = document.getElementById('modalTorres');
  if (!e || e.target === mt) {
    mt.classList.remove('open');
    a11yDialogClosed(mt);
  }
}

function renderListaTorres() {
  const lista = document.getElementById('listaTorres');
  const activa = state.torreActiva || 0;
  const EMOJIS = ['🌿','🌱','🥬','🌿','🍃','🌾','🪴','🌻','🫛','🎍'];

  lista.innerHTML = state.torres.map((t, i) => {
    const isActiva = i === activa;
    const plantasCount = (t.torre || []).reduce((sum, nivel) =>
      sum + (nivel || []).filter(c => c && c.variedad).length, 0);
    const cfgT = t.config || {};
    const geomTxt = cfgT.tipoInstalacion === 'nft'
      ? ((cfgT.nftNumCanales || cfgT.numNiveles || 4) + ' canales × ' + (cfgT.nftHuecosPorCanal || cfgT.numCestas || 8) + ' huecos')
      : cfgT.tipoInstalacion === 'dwc'
        ? ((cfgT.numNiveles || 5) + ' filas × ' + (cfgT.numCestas || 5) + ' cestas')
        : ((cfgT.numNiveles || 5) + 'N × ' + (cfgT.numCestas || 5) + 'C');

    return `<div class="torre-list-row${isActiva ? ' torre-list-row--active' : ''}">
      <button type="button" class="torre-list-main"
        onclick="cambiarTorreActiva(${i})"
        aria-pressed="${isActiva ? 'true' : 'false'}"
        aria-label="Activar ${String((t.nombre || '').trim() || 'instalación').replace(/"/g, '&quot;')}${isActiva ? ', instalación actual' : ''}">
      <span class="torre-list-emoji" aria-hidden="true">${t.emoji || '🌿'}</span>
      <span class="torre-list-body">
        <span class="torre-list-name">${(t.nombre || '').trim() || 'Instalación'}</span>
        <span class="torre-list-meta">
          ${cfgT.tipoInstalacion === 'nft' ? '🪴 NFT · ' : cfgT.tipoInstalacion === 'dwc' ? '🌊 DWC · ' : ''}${plantasCount} plantas · ${t.config ? geomTxt : '5N × 5C'}
          ${isActiva ? ' · <strong class="torre-list-active-tag">Activa</strong>' : ''}
        </span>
      </span>
      </button>
      <div class="torre-list-actions">
        <button type="button" onclick="editarNombreTorre(${i})"
          class="torre-list-btn-icon" aria-label="Editar nombre de la instalación">✏️</button>
        ${state.torres.length > 1 && !isActiva ? `
        <button type="button" onclick="borrarTorre(${i})"
          class="torre-list-btn-del" aria-label="Borrar esta instalación">🗑</button>` : ''}
      </div>
    </div>`;
  }).join('');

  actualizarHeaderTorre();
}

function abrirSetupNuevaTorre() {
  // Marcar que es una torre nueva (no reconfiguración)
  setupEsNuevaTorre = true;
  setupNombreNuevaTorre = '';

  // Preconfigurar sliders con valores razonables para torre nueva
  setupPagina = 0;
  setupTipoInstalacion = '';
  setupTipoTorre = 'custom';
  setupEquipamiento = new Set(['difusor','calentador','bomba','timer','medidorEC']);
  refreshSetupEquipamientoCardsDesdeSet();
  const ccNew = document.getElementById('setupCalentadorConsignaC');
  if (ccNew) ccNew.value = '20';
  refreshSetupCalentadorConsignaVis();
  setupNutriente = 'canna_aqua';
  setupUbicacion = 'exterior';
  setupPlantasSeleccionadas = new Set();
  setupNumTorres = 'una'; // no relevante para nueva torre
  setupData.sensoresHardware = { ec: false, ph: false, humedad: false };

  setupCoordenadas = { lat: null, lon: null, ciudad: '' };
  setupData.ciudad = null;
  setupData.lat = null;
  setupData.lon = null;
  const c2n = document.getElementById('setupCiudad2');
  if (c2n) c2n.value = '';
  document.getElementById('ciudadResultadosSetup')?.classList.add('setup-hidden');
  const csel = document.getElementById('ciudadSeleccionadaSetup');
  if (csel) {
    csel.classList.add('setup-hidden');
    csel.textContent = '';
  }

  const so = document.getElementById('setupOverlay');
  so.classList.add('open');
  document.getElementById('sliderNftCanales') && (document.getElementById('sliderNftCanales').value = '4');
  document.getElementById('sliderNftHuecos') && (document.getElementById('sliderNftHuecos').value = '8');
  document.getElementById('sliderNftPendiente') && (document.getElementById('sliderNftPendiente').value = '2');
  const svNew = document.getElementById('sliderVol');
  if (svNew) svNew.value = '20';
  const svmNew = document.getElementById('setupVolMezclaL');
  if (svmNew) svmNew.value = '';
  renderNutrientesGrid();
  updateTorreBuilder();
  renderSetupPage();
  a11yDialogOpened(so);

  // Actualizar el título para indicar que es una torre nueva
  setTimeout(() => {
    const titulo = document.querySelector('.setup-header-title');
    if (titulo) titulo.textContent = '🌿 Nueva instalación';
  }, 50);
}


function crearNuevaTorre() {
  if (state.torres.length >= MAX_TORRES) {
    showToast('Máximo ' + MAX_TORRES + ' instalaciones', true); return;
  }
  cerrarModalTorres();
  abrirSetupNuevaTorre();
}

function editarNombreTorre(idx) {
  const t = state.torres[idx];
  const nuevoNombre = prompt('Nombre de la instalación:', t.nombre || '');
  if (nuevoNombre && nuevoNombre.trim()) {
    state.torres[idx].nombre = nuevoNombre.trim().slice(0, 40);
    saveState();
    renderListaTorres();
    actualizarHeaderTorre();
    updateTorreStats();
    updateDashboard();
  }
}

/** Desde la pestaña Torre: abre el diálogo para editar el nombre de la instalación activa. */
function cambiarNombreInstalacionActivaDesdeTorre() {
  initTorres();
  const idx = state.torreActiva || 0;
  if (!state.torres[idx]) return;
  editarNombreTorre(idx);
}

function borrarTorre(idx) {
  if (state.torres.length <= 1) return;
  if (!confirm('¿Borrar ' + state.torres[idx].nombre + '? Se perderán todos sus datos.')) return;
  state.torres.splice(idx, 1);
  if (state.torreActiva >= state.torres.length) {
    state.torreActiva = state.torres.length - 1;
  }
  cargarEstadoTorre(state.torreActiva);
  saveState();
  renderListaTorres();
  renderTorre();
  actualizarHeaderTorre();
  showToast('🗑 Instalación eliminada');
}

// ══════════════════════════════════════════════════
// BADGE NUTRIENTE — visible en dashboard y medir
// ══════════════════════════════════════════════════

function actualizarBadgesNutriente() {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};

  // Actualizar rangos dinámicos en las cards de Medir
  const ecOptimaCultivos = getECOptimaTorre();
  const ecMin = ecOptimaCultivos.min;
  const ecMax = ecOptimaCultivos.max;
  const phMin = nut.pHRango   ? nut.pHRango[0]    : 5.5;
  const phMax = nut.pHRango   ? nut.pHRango[1]    : 6.5;

  const rangeEC = document.getElementById('paramRangeEC');
  const rangePH = document.getElementById('paramRangePH');
  if (rangeEC) {
    const mEc = cfg.checklistEcObjetivoUs;
    if (Number.isFinite(mEc) && mEc >= 200 && mEc <= 6000) {
      const o = Math.round(mEc);
      rangeEC.textContent =
        'Objetivo ' + o + ' ±' + EC_MEDICION_TOLERANCIA_OBJETIVO_US + ' µS/cm · cultivo ' + ecMin + '–' + ecMax;
    } else {
      rangeEC.textContent = ecMin + ' – ' + ecMax + ' µS/cm';
    }
  }
  if (rangePH) rangePH.textContent = phMin + ' – ' + phMax;

  // Dashboard
  const dashNombre  = document.getElementById('dashNutrienteNombre');
  const dashDetalle = document.getElementById('dashNutrienteDetalle');
  const dashUbicacion = document.getElementById('dashUbicacionBadge');
  if (dashNombre)  dashNombre.textContent  = nut.nombre;
  if (dashDetalle) dashDetalle.textContent = nut.detalle;
  if (dashUbicacion) {
    const ub = cfg.ubicacion || 'exterior';
    if (ub === 'interior') {
      const lz = { natural: 'natural', led: 'LED', mixto: 'natural + LED', fluorescente: 'T5', hps: 'HPS', sin_luz: 'sin luz' }[cfg.luz || 'led'] || 'LED';
      const h = cfg.horasLuz || 16;
      dashUbicacion.textContent = '🏠 Interior · ' + lz + ' · ' + h + 'h';
    } else {
      dashUbicacion.textContent = '☀️ Exterior';
    }
  }

  // Dashboard inicio — banner torre
  const dashTorreEmoji  = document.getElementById('dashTorreEmoji');
  const dashTorreNombre = document.getElementById('dashTorreNombre');
  const dashTorreInfo   = document.getElementById('dashTorreInfo');
  const torre = getTorreActiva();
  if (dashTorreEmoji)  dashTorreEmoji.textContent  = torre.emoji || '🌿';
  if (dashTorreNombre) dashTorreNombre.textContent  = (torre.nombre || '').trim() || 'Instalación';
  if (dashTorreInfo) {
    const niv = cfg.numNiveles || 5;
    const ces = cfg.numCestas  || 5;
    const vMax = getVolumenDepositoMaxLitros(cfg);
    const vMez = getVolumenMezclaLitros(cfg);
    const volTxt = vMez < vMax - 0.05 ? vMax + 'L máx · ' + vMez + 'L mezcla' : vMax + 'L';
    const estadoTxt = sistemaEstaOperativa(cfg) ? 'operativa' : 'stand-by';
    dashTorreInfo.textContent = niv + ' niveles · ' + ces + ' cestas · ' + volTxt + ' · ' + nut.nombre + ' · ' + estadoTxt;
  }

  // Pestaña Medir — banner torre
  const medirTorreEmoji  = document.getElementById('medirTorreEmoji');
  const medirTorreNombre = document.getElementById('medirTorreNombre');
  if (medirTorreEmoji)  medirTorreEmoji.textContent  = torre.emoji || '🌿';
  if (medirTorreNombre) medirTorreNombre.textContent  = (torre.nombre || '').trim() || 'Instalación';
  actualizarEstadoOperativaUI();

  // Pestaña Sistema — franja nutriente (una sola; antes había tarjeta duplicada debajo)
  const torreBandera = document.getElementById('torreBadgeBandera');
  const torreNomStrip = document.getElementById('torreBadgeStripNombre');
  const torreEC      = document.getElementById('torreBadgeEC');
  if (torreBandera) torreBandera.textContent = nut.bandera || '🧪';
  if (torreNomStrip) torreNomStrip.textContent = nut.nombre;
  if (torreEC) {
    const ecMinT = nut.ecObjetivo ? nut.ecObjetivo[0] : 900;
    const ecMaxT = nut.ecObjetivo ? nut.ecObjetivo[1] : 1400;
    torreEC.textContent = 'EC ' + ecMinT + '–' + ecMaxT + ' µS/cm · pH ' +
      (nut.pHRango ? nut.pHRango[0] + '–' + nut.pHRango[1] : '5.5–6.5');
  }

  try { refreshUbicacionInstalacionUI(); } catch (_) {}

  refreshConsejosSiVisible();
}

function cambiarNutriente() {
  // Abrir modal rápido de selección de nutriente
  const overlay = document.createElement('div');
  overlay.className = 'nut-quick-overlay';
  overlay.id = 'nutrienteQuickModal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Nutriente de esta torre');

  const nutActual = getNutrienteTorre().id;

  overlay.innerHTML = '<div class="nut-quick-sheet">' +
    '<div class="nut-quick-handle"></div>' +
    '<div class="nut-quick-title">🧪 Nutriente de esta torre</div>' +
    NUTRIENTES_DB.filter(n => n.id !== 'otro').map(n => {
      const activo = n.id === nutActual;
      const check = activo ? '<span class="nut-quick-check">&#10003;</span>' : '';
      return [
        '<div data-nut-id="' + n.id + '" class="nut-quick-row' + (activo ? ' nut-quick-row--active' : '') + '">',
        '<span class="nut-quick-flag">' + n.bandera + '</span>',
        '<div class="nut-quick-body"><div class="nut-quick-name">' + n.nombre + '</div>',
        '<div class="nut-quick-detail">' + n.detalle + '</div></div>',
        check + '</div>'
      ].join('');
    }).join('')
    +
    '<div id="nutOtroBtn" class="nut-quick-otro">' +
      '<span class="nut-quick-flag">🔬</span>' +
      '<div class="nut-quick-body"><div class="nut-quick-name">Otra marca</div>' +
      '<div class="nut-quick-detail">Configurar manualmente</div></div></div>' +
    '<button id="nutCancelarBtn" type="button" class="nut-quick-cancel">' +
      'Cancelar</button>' +
    '</div>';

  const cerrarNutModal = () => {
    a11yDialogClosed(overlay);
    overlay.remove();
  };
  overlay.onclick = (e) => { if (e.target === overlay) cerrarNutModal(); };
  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
  // Event delegation for nutriente cards
  overlay.querySelectorAll('[data-nut-id]').forEach(el => {
    el.addEventListener('click', function() {
      seleccionarNutrienteRapido(this.getAttribute('data-nut-id'));
    });
  });
  const otroBtn    = document.getElementById('nutOtroBtn');
  const cancelarBtn = document.getElementById('nutCancelarBtn');
  if (otroBtn) otroBtn.addEventListener('click', () => seleccionarNutrienteRapido('otro'));
  if (cancelarBtn) cancelarBtn.addEventListener('click', cerrarNutModal);
}

function seleccionarNutrienteRapido(id) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.nutriente = id;
  const tIdx = state.torreActiva || 0;
  if (state.torres && state.torres[tIdx]) {
    if (!state.torres[tIdx].config) state.torres[tIdx].config = { ...state.configTorre };
    state.torres[tIdx].config.nutriente = id;
  }
  saveState();
  const nutM = document.getElementById('nutrienteQuickModal');
  if (nutM) {
    a11yDialogClosed(nutM);
    nutM.remove();
  }
  aplicarConfigTorre();
  actualizarBadgesNutriente();
  updateDashboard();
  updateTorreStats();
  const nut = getNutrienteTorre();
  showToast('Nutriente activo: ' + nut.nombre + ' · dosis y checklist actualizados');
}

// ══════════════════════════════════════════════════
// NOTIFICACIONES LOCALES
// ══════════════════════════════════════════════════

async function pedirPermisoNotificaciones() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

async function enviarNotificacion(titulo, cuerpo, icono) {
  const ok = await pedirPermisoNotificaciones();
  if (!ok) return;
  new Notification(titulo, {
    body:  cuerpo,
    icon:  icono || '/icon-192.png',
    badge: '/icon-72.png',
    tag:   'hidrocultivo-' + Date.now(),
  });
}

function ensureNotifOpciones() {
  if (typeof normalizarNotifOpcionesEnState === 'function') {
    normalizarNotifOpcionesEnState(state);
  } else if (!state.notifOpciones || typeof state.notifOpciones !== 'object') {
    state.notifOpciones = { recarga: false, medicion: false, cosecha: false, panelInicioColapsado: false };
  }
}

function persistNotifOpciones() {
  ensureNotifOpciones();
  const nr = document.getElementById('notifOptRecarga');
  const nm = document.getElementById('notifOptMedicion');
  const nc = document.getElementById('notifOptCosecha');
  state.notifOpciones.recarga = !!(nr && nr.checked);
  state.notifOpciones.medicion = !!(nm && nm.checked);
  state.notifOpciones.cosecha = !!(nc && nc.checked);
  saveState();
}

function refreshDashNotificacionesUI() {
  ensureNotifOpciones();
  const fs = document.getElementById('dashNotifPrefsFieldset');
  const hint = document.getElementById('dashNotifPrefsHint');
  const panel = document.getElementById('panelNotifPrefsInicio');
  const btn = document.getElementById('btnNotifPrefsInicio');
  const nr = document.getElementById('notifOptRecarga');
  const nm = document.getElementById('notifOptMedicion');
  const nc = document.getElementById('notifOptCosecha');
  const o = state.notifOpciones;
  if (panel) panel.hidden = !!o.panelInicioColapsado;
  if (btn) btn.setAttribute('aria-expanded', o.panelInicioColapsado ? 'false' : 'true');
  if (nr) nr.checked = !!o.recarga;
  if (nm) nm.checked = !!o.medicion;
  if (nc) nc.checked = !!o.cosecha;
  const granted = 'Notification' in window && Notification.permission === 'granted';
  if (fs) fs.disabled = !granted;
  if (hint) hint.classList.toggle('setup-hidden', granted);
}

function programarRecordatorios() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  ensureNotifOpciones();
  const prefs = state.notifOpciones;
  const ahora = new Date();

  if (prefs.recarga && state.ultimaRecarga) {
    const ultima = new Date(state.ultimaRecarga);
    const diasDesde = Math.floor((ahora - ultima) / 86400000);
    if (diasDesde >= 14) {
      const sis =
        typeof etiquetaSistemaHidroponicoBreve === 'function'
          ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
          : '';
      const sisTxt = sis ? 'Sistema ' + sis + ': ' : '';
      enviarNotificacion(
        '💧 HidroCultivo — Recarga completa pendiente' + (sis ? ' · ' + sis : ''),
        sisTxt +
          'Han pasado ' +
          diasDesde +
          ' días desde la última recarga completa (vaciado + mezcla). Revisa el checklist en la app.',
        ''
      );
    }
  }

  if (prefs.medicion && state.mediciones && state.mediciones.length > 0) {
    const ultimaMed = state.mediciones[0];
    const hoy = ahora.toLocaleDateString('es-ES');
    if (ultimaMed.fecha !== hoy) {
      const diasSinMedir = state.mediciones[0].fecha ?
        Math.floor((ahora - new Date(state.mediciones[0].fecha.split('/').reverse().join('-'))) / 86400000) : 0;
      if (diasSinMedir >= 2) {
        enviarNotificacion(
          '📊 HidroCultivo — Mide hoy',
          'Llevas ' + diasSinMedir + ' días sin registrar mediciones. Mide EC, pH y temperatura.',
          ''
        );
      }
    }
  }

  if (prefs.cosecha) {
    let cultivosListos = 0;
    const muestras = [];
    const nivelesActivos = getNivelesActivos();
    nivelesActivos.forEach(n => {
      (state.torre[n] || []).forEach((c, ci) => {
        if (!c.variedad || !c.fecha) return;
        const dias = Math.floor((ahora - new Date(c.fecha)) / 86400000);
        const diasBase = DIAS_COSECHA[c.variedad] || 50;
        const diasTotal = typeof torreGetDiasCosechaObjetivo === 'function'
          ? torreGetDiasCosechaObjetivo(diasBase, state.configTorre || {})
          : diasBase;
        if (dias >= diasTotal) {
          cultivosListos++;
          if (muestras.length < 2) {
            const labN = cultivoNombreLista(getCultivoDB(c.variedad), c.variedad);
            muestras.push(labN + ' (N' + (n + 1) + '·C' + (ci + 1) + ')');
          }
        }
      });
    });
    if (cultivosListos > 0) {
      const detalle =
        muestras.length > 0
          ? ' Ejemplos: ' + muestras.join(', ') + (cultivosListos > muestras.length ? '…' : '') + '.'
          : '';
      enviarNotificacion(
        '✂️ HidroCultivo — Cosecha lista',
        'Tienes ' + cultivosListos + ' cultivo' + (cultivosListos === 1 ? '' : 's') + ' listos para cosechar.' + detalle,
        ''
      );
    }
  }
}

// Botón para activar notificaciones en pestaña inicio
function mostrarBtnNotificaciones() {
  if (!('Notification' in window)) return;
  const btn = document.getElementById('btnActivarNotif');
  if (Notification.permission === 'granted') {
    if (btn) btn.style.display = 'none';
  } else if (btn) {
    btn.style.display = 'flex';
  }
  if (typeof refreshDashNotificacionesUI === 'function') refreshDashNotificacionesUI();
}

try {
  refreshDashNotificacionesUI();
} catch (_) {}
