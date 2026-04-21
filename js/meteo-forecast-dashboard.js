/**
 * Inicio, dashboard, tiles, recarga, GPS meteo.
 * Tras meteo-forecast-meteo.js; antes de riego-calculo-helpers.js / riego-calculo-calcular.js.
 */

// ══════════════════════════════════════════════════
// DASHBOARD — LÓGICA
// ══════════════════════════════════════════════════

function updateDashboard() {
  try {
    if (typeof sincronizarUltimaMedicionYRecargaDesdeTorreActiva === 'function') {
      sincronizarUltimaMedicionYRecargaDesdeTorreActiva();
    }
  } catch (eSync) {}

  // Fecha y saludo
  const now = new Date();
  const hora = now.getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('dashGreeting').textContent = `${saludo} 🌿`;
  document.getElementById('dashFecha').textContent =
    now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  // Última medición
  const elUltima = document.getElementById('dashUltimaMedicion');
  if (state.ultimaMedicion) {
    const m = state.ultimaMedicion;
    elUltima.textContent = `Última medición: ${m.fecha} ${m.hora}`;
    updateTiles(m);
  } else {
    elUltima.textContent = 'Sin mediciones aún';
    updateTiles(null);
  }

  // Torre stats
  updateDashTorre();

  // Recarga
  updateRecargaBar();

  actualizarAvisoCestasSinFecha();

  // Meteo (solo si instalación en exterior)
  try {
    applyInicioAmbienteExteriorVisibility();
  } catch (_) {}
  if (!(typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior())) {
    fetchMeteoAlert();
  }

  try { refreshUbicacionInstalacionUI(); } catch (_) {}

  try {
    actualizarGuiaPrimerosPasos();
    actualizarQuickActionsNoviceMode();
  } catch (_) {}

  try { void refreshMeteoAlarmFlashDashboard(); } catch (_) {}

  try {
    if (typeof refreshDashNotificacionesUI === 'function') refreshDashNotificacionesUI();
  } catch (_) {}
}

function getTileClass(param, val) {
  if (param === 'ec' && typeof getDashTileClassEc === 'function') return getDashTileClassEc(val);
  if (isNaN(val)) return 'empty';
  const r = RANGOS[param];
  if (!r) return 'empty';
  if (val >= r.min && val <= r.max) return 'ok';
  if (val >= r.warnLow && val <= r.warnHigh) return 'warn';
  return 'bad';
}

/** Valor numérico solo en la zona grande; nombre y unidad van junto al icono. */
function formatMedicionTileValor(key, val) {
  if (val == null || (typeof val === 'number' && !Number.isFinite(val))) return '—';
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(n)) return '—';
  switch (key) {
    case 'ec':
      return String(Math.round(n));
    case 'ph':
    case 'temp':
    case 'vol':
      return (Math.round(n * 10) / 10).toFixed(1);
    default:
      return String(n);
  }
}

function updateTiles(m) {
  if (!m) {
    ['EC', 'PH', 'Temp', 'Vol'].forEach(id => {
      const tile = document.getElementById('tile' + id);
      const valEl = document.getElementById('tile' + id + 'Val');
      const statusEl = document.getElementById('tile' + id + 'Status');
      if (!tile || !valEl || !statusEl) return;
      tile.className = 'param-tile empty';
      valEl.className = 'tile-value empty';
      valEl.textContent = '—';
      statusEl.className = 'tile-status empty';
      statusEl.textContent = 'Sin datos';
    });
    return;
  }
  const params = [
    { id: 'EC',   val: parseFloat(m.ec),   key: 'ec' },
    { id: 'PH',   val: parseFloat(m.ph),   key: 'ph' },
    { id: 'Temp', val: parseFloat(m.temp), key: 'temp' },
    { id: 'Vol',  val: parseFloat(m.vol),  key: 'vol' },
  ];

  const statusLabels = {
    ec:   { ok: 'Óptimo', warn: 'Vigilar', bad: '⚠️ Corregir' },
    ph:   { ok: 'Óptimo', warn: 'Vigilar', bad: '⚠️ Corregir' },
    temp: { ok: 'Óptimo', warn: 'Vigilar', bad: '⚠️ Verificar' },
    vol:  { ok: 'Correcto', warn: 'Bajo', bad: '⚠️ Reponer' },
  };

  params.forEach(p => {
    const tipo = getTileClass(p.key, p.val);
    const tile = document.getElementById('tile' + p.id);
    const valEl = document.getElementById('tile' + p.id + 'Val');
    const statusEl = document.getElementById('tile' + p.id + 'Status');

    tile.className = `param-tile ${tipo}`;
    valEl.className = `tile-value ${tipo}`;
    valEl.textContent = formatMedicionTileValor(p.key, p.val);
    statusEl.className = `tile-status ${tipo}`;
    statusEl.textContent = statusLabels[p.key]?.[tipo] || (tipo === 'empty' ? 'Sin datos' : '');
  });
}

function updateDashTorre() {
  let plantas = 0, totalDias = 0, plantasConFecha = 0, cosechas = 0, proxDias = 999;
  const nivelesActivos = getNivelesActivos();

  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach(c => {
      if (c.variedad) {
        plantas++;
        if (cestaTieneFechaValida(c.fecha)) {
          const dias = getDias(c.fecha);
          totalDias += dias;
          plantasConFecha++;
          const estado = getEstado(c.variedad, dias);
          if (estado === 'cosecha') cosechas++;
          const totalDiasVariedad = DIAS_COSECHA[c.variedad] || 50;
          const diasRestantes = Math.max(0, totalDiasVariedad - dias);
          if (diasRestantes > 0 && diasRestantes < proxDias) proxDias = diasRestantes;
        }
      }
    });
  });

  document.getElementById('dashPlantas').textContent = plantas;
  document.getElementById('dashDias').textContent = plantasConFecha > 0 ? Math.round(totalDias / plantasConFecha) : '—';
  document.getElementById('dashCosecha').textContent = cosechas;
  document.getElementById('dashProxCosecha').textContent = proxDias < 999 ? proxDias + 'd' : '—';
}

function updateRecargaBar() {
  const diasEl = document.getElementById('recargaDias');
  const barEl  = document.getElementById('recargaBar');
  const notaEl = document.getElementById('recargaNota');
  if (!diasEl || !barEl || !notaEl) return;

  const sysLbl =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '—';
  const sisTag = document.getElementById('recargaSistemaTag');
  const sisNombre = document.getElementById('recargaSistemaNombre');
  if (sisTag) sisTag.textContent = 'Sistema: ' + sysLbl;
  if (sisNombre) sisNombre.textContent = sysLbl;

  const diasRecarga = 15;
  let diasTranscurridos = 0;

  if (state.ultimaRecarga) {
    const diff = Date.now() - new Date(state.ultimaRecarga).getTime();
    diasTranscurridos = Math.floor(diff / 86400000);
  }

  const diasRestantes = Math.max(0, diasRecarga - diasTranscurridos);
  const pct = Math.min(100, (diasTranscurridos / diasRecarga) * 100);

  diasEl.textContent = diasRestantes > 0 ? diasRestantes + 'd' : '¡HOY!';

  const sisHint = ' · ' + sysLbl;
  let color, nota;
  if (pct < 60) {
    color = '#16a34a';
    nota = 'Última recarga completa hace ' + diasTranscurridos + ' días' + sisHint;
  } else if (pct < 85) {
    color = '#d97706';
    nota = '⚠️ Recarga completa próxima (' + sysLbl + ') — quedan ~' + diasRestantes + ' días';
  } else {
    color = '#dc2626';
    nota =
      '🔴 Recarga completa necesaria en ' +
      sysLbl +
      (diasRestantes === 0 ? ' — HOY' : ' — en ~' + diasRestantes + ' días');
  }

  diasEl.style.color = color;
  barEl.style.width = pct + '%';
  barEl.style.background = color;
  notaEl.textContent = nota;
  notaEl.style.color = pct > 85 ? '#dc2626' : '#6b7280';

  // Actualizar depósito visual
  const vol = state.ultimaMedicion?.vol ? parseFloat(state.ultimaMedicion.vol) : 0;
  const volPct = vol > 0 ? Math.min(100, (vol / 20) * 100) : 50;
  const tankFill = document.getElementById('tankWaterFill');
  const tankLabel = document.getElementById('tankVolLabel');
  if (tankFill) {
    const fillHeight = Math.round((volPct / 100) * 44);
    const yPos = 58 - fillHeight;
    tankFill.setAttribute('y', yPos);
    tankFill.setAttribute('height', fillHeight);
    const waterColor = vol < 14 ? '#dc2626' : vol < 16 ? '#d97706' : '#3b82f6';
    tankFill.setAttribute('fill', waterColor);
  }
  if (tankLabel) {
    tankLabel.textContent = vol > 0 ? vol + 'L' : '—L';
    tankLabel.style.color = vol < 14 ? '#dc2626' : vol < 16 ? '#d97706' : '#1d4ed8';
  }

  if (!state.ultimaRecarga) {
    diasEl.textContent = '—';
    barEl.style.width = '0%';
    notaEl.textContent =
      'Registra cuándo hiciste la última recarga completa en ' +
      sysLbl +
      ' (checklist o interruptor al guardar medición).';
    notaEl.style.color = '#6b7280';
  }

  const nPlantasTorre = contarPlantasTorreConVariedad();
  updateRecargaConfirmUI(
    state.ultimaRecarga ? pct : 0,
    state.ultimaRecarga ? diasTranscurridos : 0,
    state.ultimaRecarga ? diasRestantes : 15,
    nPlantasTorre
  );
}

/**
 * Aviso si hace falta recarga completa o aclarar reposición parcial (checklist / botones / posponer).
 */
function updateRecargaConfirmUI(pct, diasTranscurridos, diasRestantes, nPlantas) {
  const banner = document.getElementById('recargaUrgenteBanner');
  const snoozeHint = document.getElementById('recargaSnoozeHint');
  if (!banner || !snoozeHint) return;

  const sysLbl =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '';

  const snoozeMs = state.recargaSnoozeHasta;
  const snooze = snoozeMs != null && Date.now() < snoozeMs;

  snoozeHint.style.display = snooze ? 'block' : 'none';
  if (snooze) {
    const horas = Math.max(1, Math.round((snoozeMs - Date.now()) / 3600000));
    snoozeHint.textContent =
      'Recordatorio pospuesto (unas ' + horas + ' h). Sigue disponible el checklist, reposición parcial y «Recordar mañana».';
  }

  const urgente = !snooze && (
    (!state.ultimaRecarga && nPlantas > 0) ||
    (state.ultimaRecarga && pct >= 72)
  );

  if (!urgente) {
    banner.style.display = 'none';
    banner.textContent = '';
    banner.classList.remove('bad');
    return;
  }

  banner.style.display = 'block';
  const pref = sysLbl ? sysLbl + ' — ' : '';
  if (!state.ultimaRecarga && nPlantas > 0) {
    banner.classList.add('bad');
    banner.textContent =
      pref +
      '⚠️ No hay fecha de recarga completa. Si ya vaciaste y mezclaste de cero → checklist o interruptor «Recarga completa» al guardar. Si solo rellenaste volumen (plantas/evaporación) → reposición parcial; no reinicia este contador.';
  } else if (pct >= 85) {
    banner.classList.add('bad');
    banner.textContent =
      pref +
      '🔴 Llevas ' +
      diasTranscurridos +
      ' días desde la última recarga completa. ¿Toca vaciar, limpiar y checklist? Si solo faltaba agua en el mismo cultivo, usa reposición parcial.';
  } else {
    banner.classList.remove('bad');
    banner.textContent =
      pref +
      '⚠️ Pronto toca valorar una recarga completa (' +
      (diasRestantes <= 0 ? 'hoy según calendario' : 'quedan ~' + diasRestantes + ' d') +
      '). Rellenar sin vaciar = reposición parcial.';
  }
}

/** Fecha registro DD/MM/AAAA → timestamp local (mediodía). */
function parseFechaRegistroReposicionMs(fecha) {
  if (!fecha || typeof fecha !== 'string') return NaN;
  const p = fecha.split('/');
  if (p.length < 3) return NaN;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10) - 1;
  const y = parseInt(p[2], 10);
  if (!y || m < 0 || m > 11 || d < 1 || d > 31) return NaN;
  const dt = new Date(y, m, d, 12, 0, 0, 0);
  return dt.getTime();
}

/** Suma litros y cuenta reposiciones parciales en los últimos `dias` (registro unificado). */
function sumatorioReposicionesParciales(dias) {
  const reg = state.registro || [];
  const ahora = Date.now();
  const limite = ahora - dias * 86400000;
  const tAct = getTorreActiva();
  const nombreTorre = (tAct && tAct.nombre) ? String(tAct.nombre).trim() : '';
  const multiTorre = state.torres && state.torres.length > 1;
  let totalLitros = 0;
  let count = 0;
  for (let i = 0; i < reg.length; i++) {
    const e = reg[i];
    if (e.tipo !== 'reposicion') continue;
    if (multiTorre && nombreTorre && e.torreNombre && String(e.torreNombre).trim() !== nombreTorre) continue;
    const ts = parseFechaRegistroReposicionMs(e.fecha);
    if (!isFinite(ts) || ts < limite) continue;
    const L = typeof e.litros === 'number' ? e.litros : parseFloat(e.litros);
    if (!isFinite(L) || L <= 0) continue;
    totalLitros += L;
    count++;
  }
  return { totalLitros: Math.round(totalLitros * 10) / 10, count };
}

/** Actualiza el texto de seguimiento bajo los botones de reposición parcial (Mediciones). */
function actualizarResumenReposicionParcialUI() {
  const el = document.getElementById('resumenReposicionParcialStats');
  if (!el) return;
  const s7 = sumatorioReposicionesParciales(7);
  const s30 = sumatorioReposicionesParciales(30);
  const multi = state.torres && state.torres.length > 1;
  const suf = multi ? ' · solo <strong>esta torre</strong>' : '';
  if (s7.count === 0 && s30.count === 0) {
    el.innerHTML =
      '📊 <span class="repos-resumen-muted">Cuando registres reposiciones con litros, aquí verás totales de <strong>7 y 30 días</strong>' +
      suf + ' para comparar ritmos (crecimiento de plantas, calor, etc.).</span>';
    return;
  }
  const fmt = function (n) {
    const r = Math.round(n * 10) / 10;
    return (Math.abs(r % 1) < 0.05) ? String(Math.round(r)) : String(r);
  };
  el.innerHTML =
    '📊 <strong class="repos-resumen-head">Tu rutina de reposición</strong>' + suf + ': ' +
    'últimos <strong>7 días</strong> → ' + fmt(s7.totalLitros) + ' L en <strong>' + s7.count + '</strong> vez(es) · ' +
    'últimos <strong>30 días</strong> → ' + fmt(s30.totalLitros) + ' L en <strong>' + s30.count + '</strong> · ' +
    '<span class="repos-resumen-muted">Orientativo: si sube el consumo con el tamaño del follaje o el verano, lo verás aquí.</span>';
}

/** Litros añadidos en reposición parcial (obligatorio para registrar). */
function leerLitrosReposicionParcial() {
  const el = document.getElementById('inputReposicionParcialLitros');
  const raw = el ? String(el.value || '').trim().replace(',', '.') : '';
  const v = parseFloat(raw);
  if (!isFinite(v) || v <= 0) {
    showToast('Indica los litros añadidos (una estimación vale) para guardar la reposición en el registro.', true);
    if (el) el.focus();
    return null;
  }
  if (v > 2000) {
    showToast('Cantidad fuera de rango (máx. 2000 L por registro). Si vaciaste el depósito, usa recarga completa (checklist).', true);
    if (el) el.focus();
    return null;
  }
  return Math.round(v * 100) / 100;
}

function confirmarReposicionDeposito(modo) {
  if (modo === 'con_nutrientes') {
    abrirChecklist(false);
    showToast('📋 Checklist de la instalación activa: vaciado, limpieza y mezcla completa (reinicia el contador al finalizar)');
    return;
  }
  const litros = leerLitrosReposicionParcial();
  if (litros == null) return;

  if (modo === 'solo_agua') {
    state.recargaSnoozeHasta = null;
    addRegistro('reposicion', { modo: 'solo_agua', icono: '💧', litros });
    guardarEstadoTorreActual();
    saveState();
    updateRecargaBar();
    const inp = document.getElementById('inputReposicionParcialLitros');
    if (inp) inp.value = '';
    if (document.getElementById('tab-historial')?.classList.contains('active')) {
      cargarHistorial();
      if (typeof histTabActiva !== 'undefined' && histTabActiva === 'registro') renderRegistro();
    }
    showToast('✅ +' + litros + ' L · reposición parcial (solo agua). Contador de recarga completa sin cambios.');
    actualizarResumenReposicionParcialUI();
    return;
  }
  if (modo === 'parcial_nutrientes') {
    state.recargaSnoozeHasta = null;
    addRegistro('reposicion', { modo: 'parcial_nutrientes', icono: '🧪', litros });
    guardarEstadoTorreActual();
    saveState();
    updateRecargaBar();
    const inp = document.getElementById('inputReposicionParcialLitros');
    if (inp) inp.value = '';
    if (document.getElementById('tab-historial')?.classList.contains('active')) {
      cargarHistorial();
      if (typeof histTabActiva !== 'undefined' && histTabActiva === 'registro') renderRegistro();
    }
    showToast('✅ +' + litros + ' L · reposición parcial con nutrientes. Mide EC/pH cuando puedas.');
    actualizarResumenReposicionParcialUI();
    return;
  }
}

function posponerRecordatorioRecarga() {
  state.recargaSnoozeHasta = Date.now() + 86400000;
  guardarEstadoTorreActual();
  saveState();
  updateRecargaBar();
  showToast('⏰ Te volvemos a avisar en 24 h');
}

let _meteoAlertInFlight = null;
let _meteoAlertRetryTimer = null;
let _meteoAlertRetryStep = 0;
const METEO_ALERT_RETRY_MS = [15000, 30000, 60000, 120000, 300000];

function clearMeteoAlertRetry() {
  if (_meteoAlertRetryTimer) {
    clearTimeout(_meteoAlertRetryTimer);
    _meteoAlertRetryTimer = null;
  }
}

/** Inicio: oculta condiciones meteorológicas y localidad si la instalación está en interior (Medir). */
function applyInicioAmbienteExteriorVisibility() {
  const wrap = document.getElementById('dashBloqueAmbienteExterior');
  if (!wrap) return;
  const int = typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior();
  wrap.classList.toggle('setup-hidden', !!int);
}

function programarReintentoMeteoAlert() {
  if (_meteoAlertRetryTimer) return;
  const idx = Math.min(_meteoAlertRetryStep, METEO_ALERT_RETRY_MS.length - 1);
  const espera = METEO_ALERT_RETRY_MS[idx];
  _meteoAlertRetryTimer = setTimeout(() => {
    _meteoAlertRetryTimer = null;
    void fetchMeteoAlert();
  }, espera);
  _meteoAlertRetryStep = Math.min(_meteoAlertRetryStep + 1, METEO_ALERT_RETRY_MS.length - 1);
}

async function fetchMeteoAlert() {
  if (_meteoAlertInFlight) return _meteoAlertInFlight;
  _meteoAlertInFlight = (async () => {
  const alertEl   = document.getElementById('meteoAlert');
  const iconEl    = document.getElementById('meteoAlertIcon');
  const titleEl   = document.getElementById('meteoAlertTitle');
  const textEl    = document.getElementById('meteoAlertText');

  if (typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior()) {
    clearMeteoAlertRetry();
    _meteoAlertRetryStep = 0;
    try {
      applyInicioAmbienteExteriorVisibility();
    } catch (_) {}
    return;
  }

  try {
    // No bloquear la alerta por geolocalización (usar coords actuales y refrescar luego).
    void ensureMeteoCoordsAuto();

    const baseUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index' +
      '&hourly=temperature_2m,relative_humidity_2m' +
      '&daily=uv_index_max&forecast_days=1&timezone=auto';

    const data = await meteoFetchConFallback(baseUrl, {
      cacheKey: 'alert:current:' + baseUrl,
      timeoutMs: 3200,
      ttlMs: 45 * 1000,
    });
    if (!data || !data.current) throw new Error('Sin datos meteorológicos actuales');

    const temp = data.current.temperature_2m;
    const hum  = data.current.relative_humidity_2m;
    const viento = data.current.wind_speed_10m ?? data.current.windspeed_10m;
    const uvAhora = data.current.uv_index;
    const uvMaxHoyRaw = Array.isArray(data.daily?.uv_index_max) ? data.daily.uv_index_max[0] : null;
    const uvAhoraN = uvAhora != null && Number.isFinite(Number(uvAhora)) ? Number(uvAhora) : null;
    const uvMaxN = uvMaxHoyRaw != null && Number.isFinite(Number(uvMaxHoyRaw)) ? Number(uvMaxHoyRaw) : null;
    const fmtUv = (x) => (Math.round(x * 10) / 10).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    /** Misma fuente que Meteo: Open‑Meteo (índice UV máx. diario); respaldo met.no + currentuvindex.com vía meteoFetchConFallback. */
    let uvTxt;
    if (uvMaxN != null && Number.isFinite(uvMaxN)) {
      if (uvMaxN > 0) {
        uvTxt = 'máx. hoy ' + fmtUv(uvMaxN);
        if (uvAhoraN != null && uvAhoraN > 0.05 && Math.abs(uvAhoraN - uvMaxN) > 0.2) {
          uvTxt += ' · ahora ' + fmtUv(uvAhoraN);
        }
      } else {
        uvTxt = 'máx. hoy 0 (muy nublado o ya cerró el día solar)';
      }
    } else if (uvAhoraN != null && Number.isFinite(uvAhoraN) && uvAhoraN > 0.05) {
      uvTxt = fmtUv(uvAhoraN);
    } else {
      uvTxt = '—';
    }
    const uv = uvAhoraN != null ? uvAhoraN : uvMaxN;

    // Calcular VPD actual (solo para lógica interna y guardado; no se muestra en título)
    const pvs = 0.6108 * Math.pow(1 + temp / 100, 8.827);
    const vpd = Math.round(pvs * (1 - hum / 100) * 100) / 100;

    let tipo, icono, titulo, texto;

    if (vpd > 1.6) {
      tipo = 'bad'; icono = '🔴';
      titulo = 'Ambiente muy seco para las hojas';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Riego de mayor intensidad solar activo. Revisar que las plantas no están lacias.`;
    } else if (vpd > 1.2) {
      tipo = 'warn'; icono = '🟡';
      titulo = 'Transpiración alta — vigilar riego';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Condiciones de estrés moderado. Verificar riego de mayor intensidad solar.`;
    } else if (vpd < 0.4) {
      tipo = 'warn'; icono = '💧';
      titulo = 'Humedad ambiental muy alta';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Riesgo de hongos y enfermedades fúngicas. Buena ventilación recomendada.`;
    } else {
      tipo = 'ok'; icono = '✅';
      titulo = 'Condiciones favorables';
      texto = `Temp ${temp}°C · Humedad ${hum}% · UV ${uvTxt} · Viento ${viento} km/h
Las plantas están en condiciones ideales de crecimiento.`;
    }

    alertEl.className = `meteo-alert ${tipo}`;
    iconEl.textContent = icono;
    titleEl.textContent = titulo;
    textEl.textContent = texto;

    // Guardar en estado para uso en riego
    state.meteoActual = { temp, hum, viento, uv, uvMaxHoy: uvMaxN, vpd };
    saveState();
    clearMeteoAlertRetry();
    _meteoAlertRetryStep = 0;

  } catch(e) {
    alertEl.className = 'meteo-alert warn';
    iconEl.textContent = '📡';
    const offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
    titleEl.textContent = offline ? 'Sin conexión meteorológica' : 'Datos meteorológicos no disponibles ahora';
    textEl.textContent = offline
      ? 'No hay conexión a internet. Revisa la red y vuelve a intentarlo.'
      : 'Open-Meteo no ha respondido correctamente por ahora. Reintentaremos automáticamente.';
    console.warn('[MeteoAlert] fetchMeteoAlert:', e && e.message ? e.message : e);
    programarReintentoMeteoAlert();
  }
  })().finally(() => {
    _meteoAlertInFlight = null;
  });
  return _meteoAlertInFlight;
}

// ── Meteo: ubicación automática (GPS) ────────────────────────────────────────
let _meteoGeoInFlight = null;
async function ensureMeteoCoordsAuto() {
  // Evitar pedir GPS si ya se intentó hace poco (para no molestar y no repetir prompts)
  const now = Date.now();
  const last = state._meteoGeoLastTry || 0;
  if (now - last < 10 * 60 * 1000) return; // 10 min
  state._meteoGeoLastTry = now;
  saveState();

  if (!navigator.geolocation) return;
  if (_meteoGeoInFlight) return _meteoGeoInFlight;

  _meteoGeoInFlight = new Promise((resolve) => {
    const done = () => {
      try {
        resolve();
      } catch (_) {}
    };
    const hardMaxMs = 12000;
    const tHard = setTimeout(done, hardMaxMs);
    const clearHard = () => {
      clearTimeout(tHard);
    };

    navigator.geolocation.getCurrentPosition(
      pos => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (!state.configTorre) state.configTorre = {};

          const prevLat = parseFloat(state.configTorre.lat);
          const prevLon = parseFloat(state.configTorre.lon);
          const changed = !isFinite(prevLat) || !isFinite(prevLon) ||
            Math.abs(prevLat - lat) > 0.005 || Math.abs(prevLon - lon) > 0.005;

          state.configTorre.lat = lat;
          state.configTorre.lon = lon;

          if (changed) {
            invalidateMeteoNomiCache();
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`;
            const nomOpts = { headers: { 'User-Agent': 'HidroCultivo/1.0' } };
            if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
              nomOpts.signal = AbortSignal.timeout(6500);
            }
            fetch(url, nomOpts)
              .then(r => r.json())
              .then(data => {
                const ciudad = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
                const prov = data.address?.state || data.address?.region || '';
                if (ciudad || prov) {
                  state.configTorre.ciudad = (ciudad ? ciudad : 'Ubicación actual') + (prov ? `, ${prov}` : '');
                  if (ciudad && !(state.configTorre.localidadMeteo && String(state.configTorre.localidadMeteo).trim())) {
                    state.configTorre.localidadMeteo = String(ciudad).trim();
                  }
                  saveState();
                }
              })
              .catch(() => {});
          }

          saveState();
        } finally {
          clearHard();
          done();
        }
      },
      () => {
        clearHard();
        done();
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false }
    );
  }).finally(() => { _meteoGeoInFlight = null; });

  return _meteoGeoInFlight;
}

