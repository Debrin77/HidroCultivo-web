/**
 * Cálculo de riego (torre/NFT/DWC), toldo, sincronización con torre activa, integración Meteoclimatic en el modelo.
 * Carga después de meteo-forecast-meteo.js / meteo-forecast-dashboard.js (meteoFetchConFallback, …).
 * Depende del script principal: state, saveState, tipoInstalacionNormalizado, setupCoordenadas, helpers torre/cultivo.
 */

/** Riego torre exterior: discrepancia fuerte + lectura reciente → factor VPD acotado (no sustituye Open‑Meteo). */
const MC_RIEGO_EDAD_MAX_MS = 45 * 60 * 1000;
const MC_RIEGO_DIF_T_C = 3.5;
const MC_RIEGO_DIF_RH_PP = 18;
const MC_RIEGO_FAC_DIA_MIN = 0.94;
const MC_RIEGO_FAC_DIA_MAX = 1.06;
const MC_RIEGO_FAC_NOC_MIN = 0.92;
const MC_RIEGO_FAC_NOC_MAX = 1.08;

function meteoclimaticMcEdadMs(pubDateStr) {
  const t = Date.parse(pubDateStr || '');
  return Number.isFinite(t) ? t : NaN;
}

function meteoclimaticMcLecturaReciente(mc, maxMs) {
  if (!mc || !mc.pubDate) return false;
  const ms = meteoclimaticMcEdadMs(mc.pubDate);
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms <= (maxMs != null ? maxMs : MC_RIEGO_EDAD_MAX_MS);
}

function meteoclimaticRiegoModeloHoraEnDia(timesIso, dayHourIdx, tempHArr, rhArr, tempFallback, rhFallback) {
  if (!dayHourIdx || !dayHourIdx.length || !Array.isArray(tempHArr) || !Array.isArray(rhArr)) {
    return { t: tempFallback, rh: rhFallback };
  }
  const hNow = new Date().getHours();
  let bestIx = dayHourIdx[0];
  let bestDiff = 999;
  for (let i = 0; i < dayHourIdx.length; i++) {
    const ix = dayHourIdx[i];
    const iso = timesIso && timesIso[ix];
    if (!iso) continue;
    const h = parseInt(String(iso).slice(11, 13), 10);
    if (!Number.isFinite(h)) continue;
    const d = Math.abs(h - hNow);
    const dWrap = Math.min(d, 24 - d);
    if (dWrap < bestDiff) {
      bestDiff = dWrap;
      bestIx = ix;
    }
  }
  const t = tempHArr[bestIx];
  const rh = rhArr[bestIx];
  const tOk = typeof t === 'number' && Number.isFinite(t);
  const rhOk = typeof rh === 'number' && Number.isFinite(rh);
  return {
    t: tOk ? t : tempFallback,
    rh: rhOk ? Math.round(rh) : rhFallback,
  };
}

function meteoclimaticHoraLocalVentanaNocturnaRiego() {
  const h = new Date().getHours();
  return h >= 20 || h <= 7;
}

/**
 * factor = VPD(MC) / VPD(modelo) con recorte; solo si ΔT/ΔHR y lectura reciente.
 * dPlanta: delta toldo sobre temperatura aire (misma corrección en ambos VPD para comparar).
 */
function meteoclimaticFactorVpdDesdeMc(mc, tMod, rhMod, dPlanta, fMin, fMax) {
  if (!meteoclimaticMcLecturaReciente(mc, MC_RIEGO_EDAD_MAX_MS)) return null;
  if (mc.temp == null || mc.rh == null) return null;
  if (!Number.isFinite(tMod) || !Number.isFinite(rhMod)) return null;
  const dT = Math.abs(mc.temp - tMod);
  const dRh = Math.abs(mc.rh - rhMod);
  if (dT < MC_RIEGO_DIF_T_C && dRh < MC_RIEGO_DIF_RH_PP) return null;
  const vpdRef = riegoVPDkPa(tMod + (dPlanta || 0), rhMod);
  const vpdMc = riegoVPDkPa(mc.temp + (dPlanta || 0), mc.rh);
  let f = vpdMc / Math.max(0.08, vpdRef);
  f = Math.max(fMin, Math.min(fMax, f));
  if (Math.abs(f - 1) < 0.004) return null;
  return { factor: f, dT, dRh, vpdRef, vpdMc };
}

function meteoclimaticFactorNocDesdeMc(mc, tNocMod, rhNocMod, dTempPlanta, dNocFrac) {
  if (!meteoclimaticHoraLocalVentanaNocturnaRiego()) return null;
  if (!meteoclimaticMcLecturaReciente(mc, MC_RIEGO_EDAD_MAX_MS)) return null;
  if (mc.temp == null || mc.rh == null) return null;
  if (!Number.isFinite(tNocMod) || !Number.isFinite(rhNocMod)) return null;
  const dT = Math.abs(mc.temp - tNocMod);
  const dRh = Math.abs(mc.rh - rhNocMod);
  if (dT < MC_RIEGO_DIF_T_C && dRh < MC_RIEGO_DIF_RH_PP) return null;
  const dN = Number.isFinite(dNocFrac) ? dNocFrac : 0.38;
  const adj = Number.isFinite(dTempPlanta) ? dTempPlanta : 0;
  const vpdRef = riegoVPDkPa(tNocMod + adj * dN, rhNocMod);
  const vpdMc = riegoVPDkPa(mc.temp + adj * dN, mc.rh);
  let f = vpdMc / Math.max(0.05, vpdRef);
  f = Math.max(MC_RIEGO_FAC_NOC_MIN, Math.min(MC_RIEGO_FAC_NOC_MAX, f));
  if (Math.abs(f - 1) < 0.004) return null;
  return { factor: f, dT, dRh };
}


// ══════════════════════════════════════════════════
// RIEGO — LÓGICA (misma que el atajo iOS)
// ══════════════════════════════════════════════════

let toldoDesplegado = false;
let diaRiego = 'hoy'; // 'hoy' o 'manana'

function setDiaRiego(dia) {
  diaRiego = dia;

  const btnHoy    = document.getElementById('btnRiegoHoy');
  const btnManana = document.getElementById('btnRiegoManana');
  const infoEl    = document.getElementById('riegoDiaInfo');
  if (!btnHoy || !btnManana || !infoEl) return;

  btnHoy.classList.remove('riego-dia-btn--hoy-on', 'riego-dia-btn--manana-on', 'riego-dia-btn--off');
  btnManana.classList.remove('riego-dia-btn--hoy-on', 'riego-dia-btn--manana-on', 'riego-dia-btn--off');

  if (dia === 'hoy') {
    btnHoy.classList.add('riego-dia-btn--hoy-on');
    btnManana.classList.add('riego-dia-btn--off');
    infoEl.textContent = '';
    infoEl.classList.remove('riego-dia-info--manana');
    btnHoy.setAttribute('aria-pressed', 'true');
    btnManana.setAttribute('aria-pressed', 'false');
  } else {
    btnManana.classList.add('riego-dia-btn--manana-on');
    btnHoy.classList.add('riego-dia-btn--off');
    // Calcular fecha de mañana
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const nombreDia = manana.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    infoEl.textContent = `Previsión para ${nombreDia}`;
    infoEl.classList.add('riego-dia-info--manana');
    btnHoy.setAttribute('aria-pressed', 'false');
    btnManana.setAttribute('aria-pressed', 'true');
  }

  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    calcularRiego({ forceRefresh: true });
  }
}

/** Sincroniza botones Hoy/Mañana con `diaRiego` sin disparar el cálculo (goTab llama a calcularRiego después). */
function initDiaRiego() {
  const btnHoy = document.getElementById('btnRiegoHoy');
  const btnManana = document.getElementById('btnRiegoManana');
  const infoEl = document.getElementById('riegoDiaInfo');
  if (!btnHoy || !btnManana || !infoEl) return;
  btnHoy.classList.remove('riego-dia-btn--hoy-on', 'riego-dia-btn--manana-on', 'riego-dia-btn--off');
  btnManana.classList.remove('riego-dia-btn--hoy-on', 'riego-dia-btn--manana-on', 'riego-dia-btn--off');
  if (diaRiego === 'hoy') {
    btnHoy.classList.add('riego-dia-btn--hoy-on');
    btnManana.classList.add('riego-dia-btn--off');
    infoEl.textContent = '';
    infoEl.classList.remove('riego-dia-info--manana');
    btnHoy.setAttribute('aria-pressed', 'true');
    btnManana.setAttribute('aria-pressed', 'false');
  } else {
    btnManana.classList.add('riego-dia-btn--manana-on');
    btnHoy.classList.add('riego-dia-btn--off');
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const nombreDia = manana.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    infoEl.textContent = 'Previsión para ' + nombreDia;
    infoEl.classList.add('riego-dia-info--manana');
    btnHoy.setAttribute('aria-pressed', 'false');
    btnManana.setAttribute('aria-pressed', 'true');
  }
}

/** Controles de riego: torre (cálculo) vs NFT/DWC (solo clima de referencia). */
function actualizarVistaRiegoPorTipoInstalacion() {
  const tipo = tipoInstalacionNormalizado(state.configTorre || {});
  const esModoClima = tipo === 'nft' || tipo === 'dwc';
  const torreControls = document.getElementById('riegoTorreSoloWrap');
  const btnCalc = document.getElementById('btnCalcRiego');
  const titleEl = document.getElementById('riegoSectionTitle');
  const diaGrp = document.getElementById('riegoDiaSelectorGroup');
  const diaInfo = document.getElementById('riegoDiaInfo');
  const btnHoy = document.getElementById('btnRiegoHoy');
  const btnManana = document.getElementById('btnRiegoManana');

  if (torreControls) torreControls.classList.toggle('setup-hidden', esModoClima);
  if (diaGrp) diaGrp.classList.toggle('setup-hidden', esModoClima);
  if (diaInfo) diaInfo.classList.toggle('setup-hidden', esModoClima);
  if (btnCalc) {
    btnCalc.classList.toggle('setup-hidden', esModoClima);
    btnCalc.hidden = esModoClima;
  }

  if (titleEl) {
    if (tipo === 'nft') {
      titleEl.innerHTML =
        '🪴 Riego <span class="accent">NFT</span> <span class="riego-section-title-sub">· clima de referencia</span>';
    } else if (tipo === 'dwc') {
      titleEl.innerHTML =
        '🌊 Riego <span class="accent">DWC</span> <span class="riego-section-title-sub">· clima de referencia</span>';
    } else {
      titleEl.innerHTML = '💧 Cálculo de <span class="accent">Riego</span>';
    }
  }
  if (diaGrp) {
    diaGrp.setAttribute(
      'aria-label',
      esModoClima ? 'Día para mostrar datos meteorológicos de referencia' : 'Día para el cálculo de riego'
    );
  }
  if (btnHoy) {
    btnHoy.setAttribute(
      'aria-label',
      esModoClima ? 'Mostrar datos meteorológicos de hoy' : 'Calcular riego para hoy'
    );
  }
  if (btnManana) {
    btnManana.setAttribute(
      'aria-label',
      esModoClima ? 'Mostrar previsión meteorológica de mañana' : 'Calcular riego para mañana con previsión meteorológica'
    );
  }
}
let esRecarga = false;

function toggleRecarga() {
  esRecarga = !esRecarga;
  const sw = document.getElementById('recargaSwitch');
  sw.className = 'toggle-switch' + (esRecarga ? ' on' : '');
  sw.setAttribute('aria-checked', esRecarga ? 'true' : 'false');
}

function toggleToldo() {
  toldoDesplegado = !toldoDesplegado;
  const sw = document.getElementById('toldoSwitch');
  if (sw) {
    sw.className = 'toggle-switch' + (toldoDesplegado ? ' on' : '');
    sw.setAttribute('aria-checked', toldoDesplegado ? 'true' : 'false');
  }
  const tIdx = state.torreActiva || 0;
  if (!state.torres[tIdx]) state.torres[tIdx] = {};
  if (!state.torres[tIdx].riego) state.torres[tIdx].riego = {};
  state.torres[tIdx].riego.toldo = toldoDesplegado;
  saveState();
  calcularRiego();
}

function ocultarRiegoToldoRecoUI() {
  const el = document.getElementById('riegoToldoReco');
  if (!el) return;
  el.classList.add('setup-hidden');
  el.innerHTML = '';
}

/**
 * Recomendación explícita de toldo/sombra según T máx y UV del día calculado;
 * permite activar el toldo en el modelo sin buscar el interruptor.
 */
function actualizarRiegoToldoRecoUI(esInterior, tempMax, uvIdxRaw) {
  const el = document.getElementById('riegoToldoReco');
  if (!el) return;
  if (esInterior) {
    ocultarRiegoToldoRecoUI();
    return;
  }
  const tMax = Number(tempMax);
  const uv = Number(uvIdxRaw);
  let fuerte = false;
  let suave = false;
  if (Number.isFinite(uv)) {
    if (uv >= 8) fuerte = true;
    else if (uv >= 6) suave = true;
  }
  if (Number.isFinite(tMax)) {
    if (tMax >= 34) fuerte = true;
    else if (tMax >= 30) suave = true;
    else if (tMax >= 28 && Number.isFinite(uv) && uv >= 5) suave = true;
  }
  if (!fuerte && !suave) {
    ocultarRiegoToldoRecoUI();
    return;
  }
  const recomHtml = fuerte
    ? 'Hoy conviene <strong>toldo o malla de sombra</strong> (p. ej. 30–50&nbsp;%) para moderar calor y radiación en el follaje.'
    : 'Conviene <strong>sombra parcial o malla ligera</strong> en las horas centrales.';
  if (toldoDesplegado) {
    el.innerHTML =
      '<div class="riego-toldo-reco__inner"><p class="riego-toldo-reco__p">✓ Toldo/sombra <strong>activo</strong> en el cálculo; encaja con las condiciones previstas de hoy.</p></div>';
    el.classList.remove('setup-hidden');
    return;
  }
  el.innerHTML =
    '<div class="riego-toldo-reco__inner">' +
    '<p class="riego-toldo-reco__p">📌 <strong>Recomendación:</strong> ' +
    recomHtml +
    '</p>' +
    '<p class="riego-toldo-reco__sub">Basado en temperatura máxima e índice UV de la previsión del día elegido.</p>' +
    '<button type="button" class="btn btn-secondary riego-toldo-reco__btn" onclick="activarToldoRecomendado()">Activar toldo/sombra en el cálculo</button>' +
    '</div>';
  el.classList.remove('setup-hidden');
}

function activarToldoRecomendado() {
  if (!toldoDesplegado) {
    toldoDesplegado = true;
    const sw = document.getElementById('toldoSwitch');
    if (sw) {
      sw.className = 'toggle-switch on';
      sw.setAttribute('aria-checked', 'true');
    }
    const tIdx = state.torreActiva || 0;
    if (!state.torres[tIdx]) state.torres[tIdx] = {};
    if (!state.torres[tIdx].riego) state.torres[tIdx].riego = {};
    state.torres[tIdx].riego.toldo = true;
    saveState();
  }
  calcularRiego({ manual: true });
}

// Calcular edad automática desde las plantas más jóvenes de la Torre
function calcularEdadAutomatica() {
  const nivelesActivos = getNivelesActivos();
  let edadMinDias = Infinity;
  let totalDias = 0;
  let totalPlantas = 0;

  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach(c => {
      if (cestaCuentaParaRiegoYMetricas(c)) {
        const dias = getDias(c.fecha);
        totalDias += dias;
        totalPlantas++;
        if (dias < edadMinDias) edadMinDias = dias;
      }
    });
  });

  if (totalPlantas === 0) return null;

  // Usar la edad mínima (plantas más jóvenes) en semanas
  const edadMinSem = Math.max(0.1, edadMinDias / 7);
  return { semanas: Math.round(edadMinSem * 10) / 10, plantas: totalPlantas };
}


// Obtener coordenadas de la torre activa (o Castelló por defecto)
function getCoordsActivas() {
  const cfg = state.configTorre || {};
  const gl = parseFloat(cfg.meteoGeoLat);
  const glo = parseFloat(cfg.meteoGeoLon);
  if (isFinite(gl) && isFinite(glo)) {
    return { lat: gl, lon: glo };
  }
  return {
    lat: cfg.lat || setupCoordenadas.lat || 39.9864,
    lon: cfg.lon || setupCoordenadas.lon || -0.0495,
  };
}


// Sincronizar inputs de riego con la torre activa
function sincronizarInputsRiego() {
  const nConFecha = contarPlantasTorreConFechaValida();
  const nVariedad = contarPlantasTorreConVariedad();
  const riegoNPl = document.getElementById('riegoNPlantas');
  const tIdx = state.torreActiva || 0;
  const savedN = parseInt(state.torres?.[tIdx]?.riego?.nPlantas, 10);
  if (riegoNPl && document.activeElement !== riegoNPl) {
    if (nConFecha > 0) {
      riegoNPl.value = String(nConFecha);
    } else if (Number.isFinite(savedN) && savedN >= 1) {
      riegoNPl.value = String(savedN);
    } else if (nVariedad === 0) {
      riegoNPl.value = '15';
    } else {
      riegoNPl.value = String(Math.max(1, nVariedad));
    }
  }

  // Edad interna (campo oculto): sincronizada con torre o fallback guardado — no se muestra en UI
  const edadAuto = calcularEdadAutomatica();
  const riegoEd = document.getElementById('riegoEdad');
  const hintEl = document.getElementById('riegoTorreHint');
  if (edadAuto && riegoEd) {
    riegoEd.value = String(Math.round(edadAuto.semanas * 10) / 10);
  } else if (riegoEd) {
    const riegoGuardado = state.torres?.[state.torreActiva || 0]?.riego;
    if (riegoGuardado?.edadSem != null && riegoGuardado.edadSem !== '') {
      riegoEd.value = String(riegoGuardado.edadSem);
    } else {
      riegoEd.value = '4';
    }
  }

  const sinF = getCestasVariedadSinFecha().count;
  if (hintEl) {
    hintEl.style.color = '';
    if (nConFecha > 0 && sinF === 0) {
      hintEl.textContent =
        'El riego usa las plantas con fecha en Torre. Si cambias cultivos o trasplantes, actualízalos ahí.';
    } else if (nConFecha > 0 && sinF > 0) {
      hintEl.textContent =
        'Hay ' + sinF + ' cesta' + (sinF === 1 ? '' : 's') + ' con cultivo pero sin fecha: completar en Torre mejora el cálculo. El resto ya cuenta con fecha.';
      hintEl.style.color = 'var(--gold)';
    } else if (nVariedad > 0) {
      hintEl.textContent =
        'Añade la fecha de trasplante en cada cesta (Torre) para ajustar el riego a tu cultivo. Mientras tanto se usa un valor de referencia interno.';
      hintEl.style.color = 'var(--muted)';
    } else {
      hintEl.textContent =
        'Cuando registres plantas con fecha en Torre, el número de plantas y el riego se actualizarán solos.';
      hintEl.style.color = 'var(--muted)';
    }
  }

  // Nota: el toldo NO se sincroniza aquí — si no, cada calcularRiego() machacaba el interruptor
  // con el valor guardado antes del último toggle. Se carga solo en cargarEstadoTorre() y tras toggleToldo().
  syncRiegoAvanzadoUI();

  actualizarAvisoCestasSinFecha();
}


// Calcular factor de cultivo basado en las variedades en la torre activa
function calcularFactorCultivo() {
  const nivelesActivos = getNivelesActivos();
  const factoresPorGrupo = {
    lechugas: 1.0, hojas: 1.0, asiaticas: 0.95, hierbas: 0.75,
    frutos: 1.5, fresas: 1.3, raices: 0.8, microgreens: 0.6
  };
  let sumFactores = 0, nPlantas = 0;
  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      const cultivo = getCultivoDB(c.variedad);
      const grupo = cultivo?.grupo || 'lechugas';
      sumFactores += (factoresPorGrupo[grupo] || 1.0);
      nPlantas++;
    });
  });
  return nPlantas > 0 ? sumFactores / nPlantas : 1.0;
}

// Calcular factor de edad real basado en el ciclo de vida del cultivo
function calcularFactorEdad() {
  const nivelesActivos = getNivelesActivos();
  let sumaFactores = 0, nPlantas = 0;
  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      const dias = getDias(c.fecha);
      const cultivo = getCultivoDB(c.variedad);
      const diasTotal = cultivo?.dias || 45;
      const pct = dias / diasTotal; // 0 = recién trasplantada, 1 = lista para cosechar
      // Factor: plántula(0-20%) → 0.5, crecimiento(20-60%) → 1.0, madurez(60%+) → 1.4
      let factor;
      if (pct < 0.2) factor = 0.5 + pct * 2.5;       // 0.5 → 1.0
      else if (pct < 0.6) factor = 1.0 + (pct - 0.2) * 1.0; // 1.0 → 1.4
      else factor = 1.4 + Math.min(0.3, (pct - 0.6) * 0.75); // 1.4 → 1.7 max
      sumaFactores += factor;
      nPlantas++;
    });
  });
  return nPlantas > 0 ? sumaFactores / nPlantas : 1.0;
}

/** VPD en kPa (Magnus–Tetens, uso habitual en cultivo / apps de invernadero) */
function riegoVPDkPa(tempC, rhPct) {
  const T = Math.max(-5, Math.min(50, Number(tempC) || 0));
  const rh = Math.max(5, Math.min(100, Number(rhPct) || 50));
  const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
  return Math.round(es * (1 - rh / 100) * 1000) / 1000;
}

/**
 * Demanda hídrica relativa (≈0.5–1.55) coherente con transpiración:
 * VPD principal; viento y sol como refuerzos; lluvia/humedad ambiental suave.
 * Similar filosofía a ajustes por ET₀/VPD en riego por pulso (no hay app pública con fórmula única).
 */
function riegoIndiceDemanda(params) {
  const vpd = Math.max(0.08, Math.min(2.4, params.vpdKpa || 0.5));
  const viento = Math.max(0, params.vientoKmh || 0);
  const uv = Math.max(0, params.uvIdx || 0);
  const toldo = !!params.toldo;
  const probLluvia = Math.max(0, Math.min(100, params.probLluvia ?? 0));
  let d = 0.52 + vpd * 0.48;
  if (viento >= 10) d *= 1 + Math.min(0.22, (viento - 10) * 0.0055);
  if (!toldo && uv >= 3) d *= 1 + Math.min(0.14, (uv - 3) * 0.016);
  if (probLluvia >= 45) d *= 1 - 0.05 * ((probLluvia - 45) / 55);
  // ET₀ acumulado del día (mm/d, FAO-56 en Open-Meteo) — ref. ~4–5 mm/d clima templado
  const et0 = params.et0DayMm;
  if (et0 != null && et0 > 0.05) {
    const r = et0 / 4.6;
    d *= Math.max(0.9, Math.min(1.14, 0.8 + 0.2 * Math.min(1.65, r)));
  }
  return Math.max(0.48, Math.min(1.58, d));
}

/**
 * Ajuste climático dependiente de sustrato (solo exterior):
 * - Alta HR/lluvia + sustrato muy retenedor => reducir algo la demanda.
 * - Ambiente seco/cálido + sustrato poco retenedor => subir ligeramente.
 * Mantiene un efecto moderado para no romper la estabilidad del programa.
 */
function riegoAjusteClimaPorSustrato(params) {
  const ret = Math.max(0.2, Math.min(0.85, Number(params.retencion) || 0.5));
  const rh = Math.max(20, Math.min(100, Number(params.humMediaPct) || 55));
  const prob = Math.max(0, Math.min(100, Number(params.probLluviaPct) || 0));
  const uv = Math.max(0, Math.min(12, Number(params.uvIdx) || 0));
  const vpd = Math.max(0.05, Math.min(2.3, Number(params.vpdKpa) || 0.6));
  const et0 = Number.isFinite(Number(params.et0DayMm)) ? Number(params.et0DayMm) : null;

  // Exceso hídrico ambiental (más fuerte en sustratos con alta retención).
  const humExceso = Math.max(0, rh - 72) / 28; // 0..1
  const lluviaExceso = Math.max(0, prob - 50) / 50; // 0..1
  const penalHumedad = (0.045 + ret * 0.095) * humExceso; // ~0..0.125
  const penalLluvia = (0.02 + ret * 0.07) * lluviaExceso; // ~0..0.08

  // Estrés seco/radiativo (más fuerte en sustratos de baja retención).
  const seco = Math.max(0, vpd - 1.0) / 1.2; // 0..1
  const radiativo = Math.max(0, uv - 5) / 5; // 0..1.4
  const et0Seco = et0 != null ? Math.max(0, et0 - 4.2) / 3.0 : 0; // 0..1 aprox
  const bajaRet = Math.max(0, 0.62 - ret) / 0.42; // 0..1
  const extraSeco = (0.02 + bajaRet * 0.055) * Math.min(1.15, seco + radiativo * 0.45 + et0Seco * 0.55);

  const mult = 1 - penalHumedad - penalLluvia + extraSeco;
  return Math.max(0.88, Math.min(1.1, mult));
}

/**
 * Margen de seguridad dinámico (micro-buffer):
 * - Compensa cambios rápidos de meteo entre día/noche con un pequeño extra de demanda.
 * - Más protector en sustratos de baja retención; casi neutro en alta retención.
 * - Se limita para evitar sobre-riego por ruido en previsión.
 */
function riegoMargenSeguridadDinamico(params) {
  const ret = Math.max(0.2, Math.min(0.85, Number(params.retencion) || 0.5));
  const vpd = Math.max(0.05, Math.min(2.5, Number(params.vpdKpa) || 0.6));
  const viento = Math.max(0, Math.min(55, Number(params.vientoKmh) || 0));
  const uv = Math.max(0, Math.min(12, Number(params.uvIdx) || 0));
  const et0 = Number.isFinite(Number(params.et0DayMm)) ? Number(params.et0DayMm) : 0;
  const prob = Math.max(0, Math.min(100, Number(params.probLluviaPct) || 0));
  const faseMult = Math.max(0.8, Math.min(1.1, Number(params.faseMult) || 1));
  const tramo = params.tramo === 'noche' ? 'noche' : 'dia';

  // Riesgo de deshidratación por combinación VPD + radiación + viento + ET0.
  const riesgoSeco =
    Math.max(0, (vpd - 1.0) / 1.2) * 0.45 +
    Math.max(0, (uv - 5) / 5) * 0.25 +
    Math.max(0, (viento - 14) / 22) * 0.2 +
    Math.max(0, (et0 - 4.4) / 3.4) * 0.1;

  // Si hay señal fuerte de lluvia, se reduce parcialmente ese extra.
  const frenoLluvia = Math.max(0, (prob - 70) / 30) * 0.6;
  const riesgoNeto = Math.max(0, riesgoSeco * (1 - frenoLluvia));

  // Baja retención => más colchón; alta retención => colchón mínimo.
  const factorRetBaja = Math.max(0, 0.64 - ret) / 0.44; // 0..1 aprox
  const base = tramo === 'noche' ? 0.004 : 0.006;
  const amplitud = tramo === 'noche' ? 0.015 : 0.03;
  const extra = base + (0.35 + 0.65 * factorRetBaja) * Math.min(1.05, riesgoNeto) * amplitud;

  // En fases muy iniciales no conviene meter demasiado colchón.
  const faseFactor = tramo === 'noche' ? Math.min(1, Math.max(0.88, faseMult)) : Math.min(1.02, Math.max(0.9, faseMult));
  const mult = 1 + extra * faseFactor;

  return Math.max(tramo === 'noche' ? 1.0 : 1.002, Math.min(tramo === 'noche' ? 1.018 : 1.038, mult));
}

/**
 * Toldo / malla de sombra: menos radiación en el dosel → UV y ET₀ efectivos menores y algo menos de calor
 * en la zona de planta (VPD). Factores orientativos (mallas típicas ~50–70 % atenuación).
 */
function riegoAjustesToldoActivos(uvMax, et0Day, toldoActivo) {
  if (!toldoActivo) {
    return { uvEfectivo: uvMax, et0Efectivo: et0Day, deltaTempZonaPlanta: 0 };
  }
  const uvEfectivo = Math.max(0, Math.round(uvMax * 0.38 * 100) / 100);
  let et0Efectivo = et0Day;
  if (et0Day != null && typeof et0Day === 'number' && et0Day > 0) {
    et0Efectivo = Math.round(et0Day * 0.52 * 100) / 100;
  }
  return { uvEfectivo, et0Efectivo, deltaTempZonaPlanta: -2 };
}

/** Edad: prioriza medias por fechas en torre; si faltan, usa semanas del formulario */
function calcularFactorEdadRiego(edadSemManual) {
  const facTorre = calcularFactorEdad();
  let nFecha = 0;
  getNivelesActivos().forEach(n => {
    (state.torre[n] || []).forEach(c => {
      if (cestaCuentaParaRiegoYMetricas(c)) nFecha++;
    });
  });
  const s = Math.max(0.1, Math.min(24, Number(edadSemManual) || 4));
  let facIn;
  if (s < 1) facIn = 0.56 + s * 0.22;
  else if (s < 3) facIn = 0.74 + (s - 1) * 0.1;
  else if (s < 8) facIn = 0.94 + (s - 3) * 0.038;
  else facIn = Math.min(1.45, 1.13 + (s - 8) * 0.022);
  if (nFecha === 0) return facIn;
  if (nFecha >= 4) return facTorre;
  return Math.round((facTorre * 0.55 + facIn * 0.45) * 100) / 100;
}

/** Avance del ciclo 0–1+ (trasplante → cosecha) por planta */
function riegoPctCicloPlanta(cesta, edadSemManual) {
  const cult = getCultivoDB(cesta.variedad) || { dias: 45, grupo: 'lechugas' };
  const diasTot = Math.max(18, cult.dias || 45);
  const s = Math.max(0.05, Math.min(24, Number(edadSemManual) || 4));
  let pct;
  if (cestaTieneFechaValida(cesta.fecha)) {
    pct = getDias(cesta.fecha) / diasTot;
  } else {
    pct = (s * 7) / diasTot;
  }
  return Math.max(0, Math.min(1.2, pct));
}

/**
 * Kc operativo (FAO-56 simplificado): tramos inicio / desarrollo / mediados / final
 * sobre cultivo de referencia tipo hortaliza de hoja; ajuste por grupo.
 */
function riegoKcDesdePctYGrupo(pct, grupo) {
  const g = grupo || 'lechugas';
  let k;
  if (pct < 0.12) k = 0.32 + (pct / 0.12) * (0.62 - 0.32);
  else if (pct < 0.35) k = 0.62 + ((pct - 0.12) / 0.23) * (0.95 - 0.62);
  else if (pct < 0.85) k = 0.95 + ((pct - 0.35) / 0.5) * (1.06 - 0.95);
  else k = 1.06 - Math.min(0.22, ((pct - 0.85) / 0.2) * 0.22);
  k = Math.max(0.3, Math.min(1.1, k));
  const mult = {
    lechugas: 1.0, hojas: 1.02, asiaticas: 0.98, hierbas: 0.84,
    frutos: 1.16, fresas: 1.06, raices: 0.76, microgreens: 0.64, otros: 0.94
  };
  k *= mult[g] ?? 1;
  return Math.max(0.28, Math.min(1.32, k));
}

/** Kc medio en torre (ponderado por planta); sin plantas → lechuga y edad del formulario */
function calcularKcMedioRiego(edadSemManual) {
  let sum = 0;
  let n = 0;
  getNivelesActivos().forEach(nv => {
    (state.torre[nv] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      const cult = getCultivoDB(c.variedad) || { dias: 45, grupo: 'lechugas' };
      const pct = riegoPctCicloPlanta(c, edadSemManual);
      sum += riegoKcDesdePctYGrupo(pct, cult.grupo || 'lechugas');
      n++;
    });
  });
  const s = Math.max(0.05, Math.min(24, Number(edadSemManual) || 4));
  if (n === 0) {
    const pct = Math.max(0, Math.min(1.15, (s * 7) / 45));
    const kc = riegoKcDesdePctYGrupo(pct, 'lechugas');
    return { kc: Math.round(kc * 1000) / 1000, nPlantasKc: 0 };
  }
  return { kc: Math.round((sum / n) * 1000) / 1000, nPlantasKc: n };
}

/**
 * Pausa de referencia (minutos) si la demanda relativa fuera 1,0: misma fórmula que minOFF
 * con √(demanda)=1 y sin redondeo ni suelo. Sirve para interpretar el ratio en la UI.
 */
function riegoOffBaseNeutral(sustrato, esInterior) {
  const retF = 0.88 + sustrato.retencion * 0.2;
  let base = sustrato.minOFFRef * 1 * retF;
  if (esInterior) base *= 1.06;
  return base;
}

/**
 * min ON = minutos de bomba en cada pulso.
 * min OFF = pausa entre pulsos (drenaje / aireación); baja cuando sube la demanda (√demanda).
 * Carga: plantas (referencia 15) × Kc; sustrato ajusta pulso (retención).
 * Interior: +6 % OFF, −6 % ON; en calcularRiego el OFF mostrado lleva además mínimo 10 min.
 */
function riegoMinutosDesdeDemanda(demanda, nPlantas, kc, sustrato, esInterior) {
  const { onRef, minOFFRef, retencion } = sustrato;
  const k = Math.max(0.28, Math.min(1.35, kc));
  const carga = Math.max(0.35, Math.min(1.35, nPlantas / 15)) * k;
  const sPulso = 0.9 + retencion * 0.16;
  const raizDem = Math.sqrt(demanda);
  let minON = onRef * carga * sPulso * (0.78 + 0.38 * raizDem);
  let minOFF = minOFFRef * (1.48 - 0.48 * raizDem) * (0.88 + retencion * 0.2);
  if (esInterior) {
    minOFF *= 1.06;
    minON *= 0.94;
  }
  return {
    minON: Math.max(3, Math.round(minON)),
    minOFF: Math.max(5, Math.round(minOFF))
  };
}

/** Coincidencia por fecha YYYY-MM-DD (misma convención que Open-Meteo en timezone=auto). */
function riegoHourlyIndicesPorFecha(timesIso, ymd) {
  if (!ymd || !Array.isArray(timesIso) || timesIso.length === 0) return null;
  const out = [];
  for (let i = 0; i < timesIso.length; i++) {
    if (String(timesIso[i]).slice(0, 10) === ymd) out.push(i);
  }
  return out.length ? out : null;
}

/**
 * UV máx. diario alineado al día civil del ECMWF (IFS), no por índice de array.
 * El modelo por defecto de Open-Meteo para `uv_index_max` puede tener `daily.time`
 * desfasado respecto a `daily.time` de ECMWF IFS → `uv_index_max[idx]` no era el mismo día.
 */
function riegoUvMaxAlineado(dataUV, ymd, idxFallback) {
  const daily = dataUV && !dataUV.error && dataUV.daily;
  if (!daily || !Array.isArray(daily.time) || !Array.isArray(daily.uv_index_max)) return null;
  const parseV = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (v != null && v !== '' && Number.isFinite(Number(v))) return Number(v);
    return null;
  };
  if (ymd) {
    for (let j = 0; j < daily.time.length; j++) {
      if (String(daily.time[j]).slice(0, 10) === ymd) return parseV(daily.uv_index_max[j]);
    }
  }
  const vf = daily.uv_index_max[idxFallback];
  return parseV(vf);
}

function riegoMediaDeIndices(arr, indices) {
  if (!Array.isArray(arr) || !indices || indices.length === 0) return NaN;
  let s = 0;
  let n = 0;
  for (let j = 0; j < indices.length; j++) {
    const v = arr[indices[j]];
    if (typeof v === 'number' && Number.isFinite(v)) {
      s += v;
      n++;
    }
  }
  return n > 0 ? s / n : NaN;
}

/**
 * Ventana de mediodía dinámica (4 h) basada en el tramo horario de mayor estrés esperado.
 * Candidatas: 10–14 como hora de inicio (tramos 10–14 ... 14–18).
 */
function riegoVentanaMediodiaDinamica(dayIndices, timesIso, tempArr, rhArr, uvIdx, et0DayMm) {
  const fallback = { indices: [], hIni: 11, hFin: 15, horasPrograma: 4 };
  if (!dayIndices || !timesIso || !Array.isArray(dayIndices) || dayIndices.length === 0) return fallback;
  if (!Array.isArray(tempArr) || !Array.isArray(rhArr)) return fallback;

  let mejor = null;
  const uvF = Math.max(0, Math.min(0.24, ((Number(uvIdx) || 0) - 3) * 0.028));
  const et0F = et0DayMm != null && Number.isFinite(Number(et0DayMm))
    ? Math.max(0, Math.min(0.18, (Number(et0DayMm) - 3.6) * 0.045))
    : 0;

  for (let hIni = 10; hIni <= 14; hIni++) {
    const hFin = hIni + 3; // ventana de 4 horas exactas
    const idx = dayIndices.filter(i => {
      const h = parseInt(String(timesIso[i]).slice(11, 13), 10);
      return Number.isFinite(h) && h >= hIni && h <= hFin;
    });
    if (idx.length < 3) continue;
    const tM = riegoMediaDeIndices(tempArr, idx);
    const hM = riegoMediaDeIndices(rhArr, idx);
    if (!Number.isFinite(tM) || !Number.isFinite(hM)) continue;
    const vpdM = riegoVPDkPa(tM, hM);
    const termT = Math.max(0, (tM - 24) * 0.025);
    const score = vpdM * 0.72 + termT + uvF + et0F;
    if (!mejor || score > mejor.score) mejor = { indices: idx, hIni, hFin, score };
  }

  if (!mejor) return fallback;
  return { indices: mejor.indices, hIni: mejor.hIni, hFin: mejor.hFin, horasPrograma: 4 };
}

/** Ventana nocturna alineada al programa diurno 07:00–21:00: 21:00–07:00 (misma fecha civil del modelo). */
function riegoIndicesNocturnosPorIso(dayIndices, timesIso) {
  if (!dayIndices || !timesIso) return [];
  return dayIndices.filter(i => {
    const h = parseInt(String(timesIso[i]).slice(11, 13), 10);
    if (!Number.isFinite(h)) return false;
    return h >= 21 || h <= 6;
  });
}

/**
 * Demanda relativa nocturna (recarga de sustrato; sin fotosíntesis, sin refuerzo UV).
 * Tmin nocturna / VPD nocturno / viento / ET₀ nocturno / lluvia. ~0.40–1.22.
 */
function riegoIndiceDemandaNocturna(params) {
  const vpd = Math.max(0.05, Math.min(2.2, params.vpdKpa || 0.35));
  const viento = Math.max(0, params.vientoKmh || 0);
  const probLluvia = Math.max(0, Math.min(100, params.probLluvia ?? 0));
  const tempMin = Number(params.tempMin);
  let d = 0.38 + vpd * 0.42;
  if (Number.isFinite(tempMin)) {
    if (tempMin >= 18) {
      d *= 1.02 + Math.min(0.14, (tempMin - 18) * 0.009);
    }
    if (tempMin >= 23) d *= 1.04;
  }
  if (viento >= 7) d *= 1 + Math.min(0.2, (viento - 7) * 0.007);
  if (viento >= 18) d *= 1.04;
  if (probLluvia >= 38) d *= 1 - 0.07 * ((probLluvia - 38) / 62);
  const et0n = params.et0NightMm;
  if (et0n != null && typeof et0n === 'number' && et0n > 0.02) {
    const r = et0n / 0.32;
    d *= Math.max(0.9, Math.min(1.14, 0.85 + 0.22 * Math.min(1.6, r)));
  }
  if (params.toldo) d *= 0.96;
  return Math.max(0.4, Math.min(1.22, d));
}

/** Riego nocturno: corrección acotada por Tª del agua (~18 °C de referencia, ~0,7 %/°C). */
const RIEGO_NOC_TEMP_AGUA_REF_C = 18;
const RIEGO_NOC_TEMP_AGUA_PCT_POR_GRADO = 0.007;
const RIEGO_NOC_TEMP_AGUA_F_MIN = 0.94;
const RIEGO_NOC_TEMP_AGUA_F_MAX = 1.06;
const RIEGO_NOC_DIFUSOR_DEMANDA_FACTOR = 0.965;
/** Viento nocturno (km/h): por debajo de «bajo» = aire casi quieto; por debajo de «medio» = brisa; a partir de «medio» = ventoso (misma rejilla que «medio» en la tabla, OFF algo más corto). */
const RIEGO_NOC_VIENTO_BAJO_MAX_KMH = 10;
const RIEGO_NOC_VIENTO_MEDIO_MAX_KMH = 18;

function riegoEquipListIncluye(equipamiento, id) {
  return Array.isArray(equipamiento) && equipamiento.includes(id);
}

/**
 * Tª agua efectiva para el factor nocturno: consigna calentador (si hay), última medición, o proxy aire/noche.
 */
function riegoTempAguaNocheEfectiva(cfg, ultimaMedicion, tempAireNocProxyC) {
  const c = cfg || {};
  if (riegoEquipListIncluye(c.equipamiento, 'calentador')) {
    const cons = Number(c.calentadorConsignaC);
    if (Number.isFinite(cons) && cons >= 10 && cons <= 35) return cons;
  }
  const tM = Number(ultimaMedicion && ultimaMedicion.temp);
  if (Number.isFinite(tM) && tM >= 4 && tM <= 40) return tM;
  const p = Number(tempAireNocProxyC);
  if (Number.isFinite(p)) return p;
  return RIEGO_NOC_TEMP_AGUA_REF_C;
}

function riegoFactorDemandaNocPorTempAgua(tempAguaC) {
  const t = Number(tempAguaC);
  if (!Number.isFinite(t)) return 1;
  const delta = (t - RIEGO_NOC_TEMP_AGUA_REF_C) * RIEGO_NOC_TEMP_AGUA_PCT_POR_GRADO;
  return Math.max(RIEGO_NOC_TEMP_AGUA_F_MIN, Math.min(RIEGO_NOC_TEMP_AGUA_F_MAX, 1 + delta));
}

function riegoFactorDemandaNocPorDifusor(equipamiento) {
  return riegoEquipListIncluye(equipamiento, 'difusor') ? RIEGO_NOC_DIFUSOR_DEMANDA_FACTOR : 1;
}

/**
 * Corredor nocturno (ON/OFF min) alineado con tabla torre + lechuga; viento en km/h del tramo 21:00–07:00.
 * No se muestra en UI. Viento ≥ MEDIO_MAX usa el mismo corredor que «medio» con OFF ligeramente acotado.
 */
function riegoNocCorredorTablaTorre(tNocC, rhPct, vientoKmh) {
  const t = Number(tNocC);
  const rh = Number(rhPct);
  const v = Math.max(0, Number(vientoKmh) || 0);
  const bajo = v < RIEGO_NOC_VIENTO_BAJO_MAX_KMH;
  const medio = v < RIEGO_NOC_VIENTO_MEDIO_MAX_KMH;
  const facOffVentoso = !medio ? 0.92 : 1;

  const pick = (onMin, onMax, offMin, offMax) => ({
    onMin,
    onMax,
    offMin: Math.round(offMin * facOffVentoso),
    offMax: Math.round(offMax * facOffVentoso),
  });

  if (!Number.isFinite(t) || !Number.isFinite(rh)) {
    return { onMin: 3, onMax: 5, offMin: 90, offMax: 240 };
  }

  if (t <= 16) {
    if (bajo) {
      if (rh >= 80) return pick(3, 3, 300, 360);
      if (rh >= 70) return pick(3, 3, 240, 300);
      if (rh >= 60) return pick(3, 5, 180, 240);
      if (rh >= 50) return pick(3, 5, 150, 180);
      return pick(3, 5, 120, 150);
    }
    if (medio) {
      if (rh >= 60) return pick(3, 5, 150, 180);
      return pick(3, 5, 120, 120);
    }
    if (rh >= 60) return pick(3, 5, 150, 180);
    return pick(3, 5, 120, 120);
  }

  if (t <= 20) {
    if (bajo) {
      if (rh >= 80) return pick(3, 3, 240, 300);
      if (rh >= 70) return pick(3, 5, 180, 240);
      if (rh >= 60) return pick(3, 5, 150, 180);
      if (rh >= 50) return pick(3, 5, 120, 150);
      return pick(3, 5, 90, 120);
    }
    if (medio) {
      if (rh >= 60) return pick(3, 5, 120, 150);
      return pick(3, 5, 90, 120);
    }
    if (rh >= 60) return pick(3, 5, 120, 150);
    return pick(3, 5, 90, 120);
  }

  if (t <= 24) {
    if (bajo) {
      if (rh >= 80) return pick(3, 5, 180, 240);
      if (rh >= 70) return pick(3, 5, 150, 180);
      if (rh >= 60) return pick(3, 5, 120, 150);
      if (rh >= 50) return pick(3, 5, 90, 120);
      return pick(3, 5, 60, 90);
    }
    if (medio) {
      if (rh >= 60) return pick(3, 5, 90, 120);
      return pick(3, 5, 60, 90);
    }
    if (rh >= 60) return pick(3, 5, 90, 120);
    return pick(3, 5, 60, 90);
  }

  if (bajo) {
    if (rh >= 80) return pick(3, 5, 150, 180);
    if (rh >= 70) return pick(3, 5, 120, 150);
    if (rh >= 60) return pick(3, 5, 90, 120);
    if (rh >= 50) return pick(3, 5, 60, 90);
    return pick(3, 5, 45, 60);
  }
  if (medio) {
    if (rh >= 60) return pick(3, 5, 60, 90);
    return pick(3, 5, 45, 60);
  }
  if (rh >= 60) return pick(3, 5, 60, 90);
  return pick(3, 5, 45, 60);
}

function riegoNocAjusteCorredorEsponja(env, sustratoKey) {
  const k = sustratoKey || 'esponja';
  if (k !== 'esponja' && k !== 'turba_enraiz') return env;
  const f = 1.12;
  return {
    onMin: Math.min(4, env.onMin),
    onMax: Math.min(4, env.onMax),
    offMin: Math.round(env.offMin * f),
    offMax: Math.round(env.offMax * f),
  };
}

function riegoNocClampModeloACorredor(minON, minOFF, env) {
  const on = Math.min(env.onMax, Math.max(env.onMin, minON));
  const off = Math.min(env.offMax, Math.max(env.offMin, minOFF));
  return {
    minON: Math.max(3, Math.min(5, Math.round(on))),
    minOFF: Math.max(45, Math.round(off)),
  };
}

function riegoStatsNocturnosFromHourly(dayIndices, timesIso, tempArr, rhArr, windArr) {
  const nightIdx = riegoIndicesNocturnosPorIso(dayIndices, timesIso);
  if (!nightIdx.length || !Array.isArray(tempArr) || !Array.isArray(rhArr)) return null;
  const t = riegoMediaDeIndices(tempArr, nightIdx);
  const rh = riegoMediaDeIndices(rhArr, nightIdx);
  let vientoMax = NaN;
  if (Array.isArray(windArr) && windArr.length) {
    let mx = 0;
    let any = false;
    for (let j = 0; j < nightIdx.length; j++) {
      const v = windArr[nightIdx[j]];
      if (typeof v === 'number' && Number.isFinite(v)) {
        mx = Math.max(mx, v);
        any = true;
      }
    }
    if (any) vientoMax = mx;
  }
  if (!Number.isFinite(t) || !Number.isFinite(rh)) return null;
  return { temp: t, rh, vientoMax, nHoras: nightIdx.length };
}

/**
 * Omitir pulsos nocturnos si demanda < demMax ∧ VPD < vpdMax ∧ viento nocturno < windMax (km/h).
 * Tª mín. baja → más fácil omitir (sustrato pierde poco); Tª mín. alta / ΣET₀ nocturno → más estricto.
 * Prob. lluvia alta → algo más permisivo. ET₀ nocturno fuerte hace casi imposible omitir por los cortes inferiores.
 */
function riegoNocUmbralesOmitir(tempMinDiaria, probLluviaPct, et0NightMm) {
  const t = Number(tempMinDiaria);
  let demMax = 0.405;
  let vpdMax = 0.292;
  let windMax = 6.6;

  if (Number.isFinite(t)) {
    if (t <= 5) {
      demMax = 0.468; vpdMax = 0.355; windMax = 9.6;
    } else if (t <= 9) {
      demMax = 0.448; vpdMax = 0.332; windMax = 8.7;
    } else if (t <= 13) {
      demMax = 0.428; vpdMax = 0.312; windMax = 7.85;
    } else if (t <= 17) {
      demMax = 0.404; vpdMax = 0.288; windMax = 6.95;
    } else if (t <= 21) {
      demMax = 0.384; vpdMax = 0.268; windMax = 6.1;
    } else if (t <= 25) {
      demMax = 0.364; vpdMax = 0.248; windMax = 5.35;
    } else {
      demMax = 0.348; vpdMax = 0.232; windMax = 4.85;
    }
  }

  const p = Math.max(0, Math.min(100, Number(probLluviaPct) || 0));
  if (p >= 42) {
    const x = Math.min(40, p - 42);
    demMax += 0.01 + x * 0.00052;
    vpdMax += 0.007 + x * 0.00042;
    windMax += 0.34 + x * 0.017;
  }

  const et0 = et0NightMm;
  if (et0 != null && typeof et0 === 'number' && Number.isFinite(et0) && et0 > 0.055) {
    const ex = Math.min(0.32, et0 - 0.055);
    demMax -= 0.026 + ex * 0.44;
    vpdMax -= 0.016 + ex * 0.36;
    windMax -= 0.5 + ex * 5.8;
  }

  demMax = Math.max(0.332, Math.min(0.488, demMax));
  vpdMax = Math.max(0.192, Math.min(0.368, vpdMax));
  windMax = Math.max(4.45, Math.min(10.6, windMax));

  return { demMax, vpdMax, windMax };
}

/** Demanda mínima para forzar al menos 1 ciclo nocturno si cabe en 10 h (más baja en noches frías). */
function riegoNocDemandaMin1Ciclo(tempMinDiaria) {
  const t = Number(tempMinDiaria);
  if (!Number.isFinite(t)) return 0.468;
  if (t <= 8) return 0.428;
  if (t <= 14) return 0.448;
  if (t <= 20) return 0.472;
  if (t <= 26) return 0.498;
  return 0.512;
}

/**
 * Torre de goteo al aire libre: por defecto hay refresco nocturno (30 s ~04:00).
 * Solo se omite el bloque nocturno ante causas climatológicas claras.
 */
function riegoTorreExteriorOmiteNocturnoPorClima(p) {
  const tN = Number(p.tempNoc);
  const tMin = Number(p.tempMin);
  const rhN = Number(p.rhNoc);
  const vpdN = Number(p.vpdNoc);

  if (Number.isFinite(rhN) && rhN >= 88 && Number.isFinite(vpdN) && vpdN < 0.16) {
    return { omit: true, clave: 'humeda' };
  }

  if ((Number.isFinite(tMin) && tMin < 5) || (Number.isFinite(tN) && tN < 4)) {
    return { omit: true, clave: 'fria' };
  }

  return { omit: false, clave: '' };
}

/** Refresco nocturno por defecto en torre exterior (30 s ~04:00; si la noche es muy exigente, el programa pasa a ciclos calculados). */
const RIEGO_NOC_REFRESCO_TORRE_EXT_SEG = 30;

/**
 * Riego al aire libre — cadena de cálculo (orden):
 * 1) Open-Meteo: ECMWF IFS diario (tª mín/máx, viento máx, prob. y suma lluvia) + horario (tª, HR) alineado al **mismo día civil** que daily[0|1];
 *    UV (modelo best_match) y ET₀ FAO horaria sumada a mm/día de ese mismo día (no bloques fijos 24 h desde el inicio de la serie).
 * 2) Toldo: si activo, UV y ET₀ efectivos ↓, ΔT zona planta (VPD día) −2 °C.
 * 3) VPD (Magnus–Tetens) con tª media + ajuste toldo; VPD en franja 11–15 h (ISO local) + pico según UV para mediodía.
 * 4) Demanda relativa riegoIndiceDemanda (VPD, viento, UV, prob. lluvia, ET₀) → ~0.48–1.58; × fase cultivo; × sensor sustrato opcional.
 * 5) Kc medio: media de riegoKcDesdePctYGrupo solo en cestas con cultivo + fecha válida; si ninguna → lechuga ref. y edad de fallback (#riegoEdad oculto).
 * 6) N plantas en pulsos: si hay ≥1 cesta con fecha válida → ese recuento; si no → valor del campo (manual / guardado).
 * 7) riegoMinutosDesdeDemanda: carga ∝ (N/15)×Kc, ON/OFF con √demanda y perfil de sustrato; interior: OFF mín. 10 min y factores sala.
 * 8) Nocturno (solo torre goteo): ventana 21:00–07:00. Demanda nocturna (torre exterior con Meteoclimatic cercano: factor conservador en ventana local). Minutos ON/OFF: modelo → corredor riegoNocCorredorTablaTorre(T noc, HR, viento tramo) + ajuste esponja/turba → clamp. Exterior: por defecto refresco fijo ~30 s (~04:00); noches muy exigentes usan programa calculado; se omite solo si riegoTorreExteriorOmiteNocturnoPorClima. Interior: demanda ≈ 0,52×demanda día; omitir con riegoNocUmbralesOmitir.
 * Verificación manual (ej. Castelló 39.9864, −0.0495 · “Mañana” · 21 lechugas 7 días): comprobar datos en riegoClimaUsado y reproducir con la API el día elegido.
 * Hoy vs mañana: `idx` 0/1 en daily + hourly filtrados por `dailyDateStr` (mismo día civil). Si la previsión casi no varía, demanda y minutos ON/OFF redondeados pueden coincidir.
 * General vs mediodía: demanda día usa VPD con T media diaria + HR media; mediodía usa VPD en 11–15 h + refuerzo UV. Mismo viento/UV diario/ET₀ en ambos; si tras redondeo los minutos coinciden, la UI lo indica.
 */
async function calcularRiego(opts = {}) {
  /** Recalcular a mano o forzar refresco: siempre nueva petición a la API y sin devolver meteo obsoleto si falla la red. */
  const refetchMeteo = !!opts.forceRefresh || !!opts.manual;
  const riegoNPl = document.getElementById('riegoNPlantas');
  if (!riegoNPl) return; // pestaña no activa

  // Sincronizar siempre con la torre activa antes de calcular
  sincronizarInputsRiego();

  const nConFecha = contarPlantasTorreConFechaValida();
  const nPlantasInp = parseInt(riegoNPl.value, 10) || 15;
  const nPlantas = nConFecha > 0 ? nConFecha : nPlantasInp;
  const edadSem = parseFloat(document.getElementById('riegoEdad').value) || 4;

  const riegoLoaderEl = document.getElementById('riegoLoader');
  const riegoResultEl = document.getElementById('riegoResultado');
  const riegoClimaNftEl = document.getElementById('riegoClimaUsadoNft');
  const riegoClimaDwcEl = document.getElementById('riegoClimaUsadoDwc');
  const btnCalc = document.getElementById('btnCalcRiego');
  const elHorarioHint = document.getElementById('riegoHorarioRecomendado');
  let btnCalcPrevTxt = '';
  if (btnCalc) {
    btnCalcPrevTxt = btnCalc.textContent || '🔄 Calcular riego ahora';
    btnCalc.disabled = true;
    btnCalc.textContent = '⏳ Calculando riego...';
  }
  ocultarRiegoToldoRecoUI();
  if (elHorarioHint) {
    elHorarioHint.textContent = '⏳ Calculando franja de mayor intensidad solar según el clima del día elegido…';
  }
  if (riegoLoaderEl) riegoLoaderEl.classList.remove('setup-hidden');
  if (riegoResultEl) riegoResultEl.classList.add('setup-hidden');
  if (riegoClimaNftEl) {
    riegoClimaNftEl.innerHTML = '';
    riegoClimaNftEl.classList.add('setup-hidden');
  }
  if (riegoClimaDwcEl) {
    riegoClimaDwcEl.innerHTML = '';
    riegoClimaDwcEl.classList.add('setup-hidden');
  }

  try {
    // ── Obtener datos Open-Meteo ──────────────────────────────────────────
    const tipoRiego = tipoInstalacionNormalizado(state.configTorre || {});
    const idx = (tipoRiego === 'nft' || tipoRiego === 'dwc') ? 0 : (diaRiego === 'manana' ? 1 : 0);
    const offsetHoras = idx * 24;

    /* ≥3 días: cubre mañana completa a cualquier hora; evita que "hoy"/"mañana" compartan el mismo trozo horario cuando la serie no empieza a medianoche. */
    const diasForecast = 3;

    const urlECMWFBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max,precipitation_sum' +
      '&hourly=relative_humidity_2m,temperature_2m,wind_speed_10m' +
      `&forecast_days=${diasForecast}&timezone=auto`;
    const urlECMWFCoreBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&hourly=relative_humidity_2m,temperature_2m' +
      `&forecast_days=${diasForecast}&timezone=auto`;

    // Modelo default para UV (ECMWF IFS no expone uv_index_max en daily). Mismos días que en Meteo (7)
    // para poder cruzar por fecha con el `daily.time` de ECMWF sin depender del índice posicional.
    const urlUV = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&daily=uv_index_max' +
      '&forecast_days=7&timezone=auto';

    const urlET0 = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&hourly=et0_fao_evapotranspiration' +
      `&forecast_days=${diasForecast}&timezone=auto`;

    const roMeteo = (extra) => Object.assign({}, extra, {
      forceRefresh: refetchMeteo,
      allowStaleFallback: !refetchMeteo,
    });
    const coordsMc = getCoordsActivas();
    const mcPromise = meteoclimaticObservacionCercana(coordsMc.lat, coordsMc.lon, {
      timeoutMs: refetchMeteo ? 7000 : 5600,
    }).catch(() => null);
    const [data, dataUV, dEt0] = await Promise.all([
      meteoFetchConFallback(urlECMWFBase, roMeteo({ cacheKey: 'riego:ecmwf:' + urlECMWFBase, timeoutMs: 4300, ttlMs: 70 * 1000 }))
        .catch(() => meteoFetchConFallback(urlECMWFCoreBase, roMeteo({ cacheKey: 'riego:core:' + urlECMWFCoreBase, timeoutMs: 4300, ttlMs: 70 * 1000 }))),
      meteoFetchConFallback(urlUV, roMeteo({ cacheKey: 'riego:uv:' + urlUV, timeoutMs: 3600, ttlMs: 8 * 60 * 1000 })).catch(() => ({})),
      meteoFetchConFallback(urlET0, roMeteo({ cacheKey: 'riego:et0:' + urlET0, timeoutMs: 4200, ttlMs: 70 * 1000 })).catch(() => ({})),
    ]);
    const mcNear = await mcPromise;
    let mcRiegoLineaAjuste = '';
    let factorMcDiaRiego = 1;
    let factorMcNocRiego = 1;
    try {
      state._ultimoMeteoclimaticCercano = mcNear;
    } catch (_) {}
    const daily = data.daily;
    if (
      !daily ||
      !Array.isArray(daily.time) ||
      !Array.isArray(daily.temperature_2m_max) ||
      !Array.isArray(daily.temperature_2m_min)
    ) {
      throw new Error('Respuesta meteorológica incompleta (sin datos diarios).');
    }
    if (idx < 0 || idx >= daily.time.length) {
      throw new Error('Día de previsión fuera de rango.');
    }

    const tempMax  = daily.temperature_2m_max[idx];
    const tempMin  = daily.temperature_2m_min[idx];
    const tempMedia = (tempMax + tempMin) / 2;
    const vientoArr = Array.isArray(daily.wind_speed_10m_max)
      ? daily.wind_speed_10m_max
      : daily.windspeed_10m_max;
    const viento = Array.isArray(vientoArr) ? vientoArr[idx] : 0;
    const probArr = Array.isArray(daily.precipitation_probability_max) ? daily.precipitation_probability_max : [];
    const probLluvia = Number.isFinite(Number(probArr[idx])) ? Number(probArr[idx]) : 0;

    const dailyDateStr = (daily.time[idx] != null) ? String(daily.time[idx]).slice(0, 10) : null;

    const uvAlineado = riegoUvMaxAlineado(dataUV, dailyDateStr, idx);
    const uvMax = uvAlineado != null ? uvAlineado : 0;

    const times = data.hourly?.time;
    const rhArr = data.hourly?.relative_humidity_2m;
    const tempHArr = data.hourly?.temperature_2m;
    const windHArr = data.hourly?.wind_speed_10m || data.hourly?.windspeed_10m;

    let etArrHourly = dEt0?.hourly?.et0_fao_evapotranspiration || null;
    let etTimesHourly = dEt0?.hourly?.time || null;

    let et0Day = null;
    let et0NightSum = null;

    let dayHourIdx = riegoHourlyIndicesPorFecha(times, dailyDateStr);
    if (!dayHourIdx && Array.isArray(rhArr) && rhArr.length >= offsetHoras + 24) {
      dayHourIdx = [];
      for (let k = 0; k < 24; k++) dayHourIdx.push(offsetHoras + k);
    }

    let humMedia;
    let temp1315;
    let hum1315;
    let medHIni = 11;
    let medHFin = 15;

    if (dayHourIdx && dayHourIdx.length && Array.isArray(rhArr) && Array.isArray(tempHArr)) {
      const hm = riegoMediaDeIndices(rhArr, dayHourIdx);
      humMedia = Number.isFinite(hm) ? Math.round(hm) : 55;
      const winMed = riegoVentanaMediodiaDinamica(dayHourIdx, times, tempHArr, rhArr, uvMax, null);
      const midI = winMed.indices;
      medHIni = winMed.hIni;
      medHFin = winMed.hFin;
      if (midI.length) {
        const tM = riegoMediaDeIndices(tempHArr, midI);
        const hM = riegoMediaDeIndices(rhArr, midI);
        temp1315 = Number.isFinite(tM) ? Math.round(tM) : Math.round(tempMedia);
        hum1315 = Number.isFinite(hM) ? Math.round(hM) : humMedia;
      } else {
        const tD = riegoMediaDeIndices(tempHArr, dayHourIdx);
        temp1315 = Number.isFinite(tD) ? Math.round(tD) : Math.round(tempMedia);
        hum1315 = humMedia;
      }
    } else if (Array.isArray(rhArr) && Array.isArray(tempHArr) && rhArr.length >= offsetHoras + 24) {
      const humHoras = rhArr.slice(offsetHoras, offsetHoras + 24);
      humMedia = Math.round(humHoras.reduce((a, b) => a + b, 0) / humHoras.length);
      const tempHoras = tempHArr.slice(offsetHoras, offsetHoras + 24);
      temp1315 = Math.round((tempHoras[13] + tempHoras[14] + tempHoras[15]) / 3);
      hum1315 = Math.round((humHoras[13] + humHoras[14] + humHoras[15]) / 3);
    } else {
      humMedia = 55;
      temp1315 = Math.round(tempMedia);
      hum1315 = humMedia;
    }

    if (Array.isArray(etArrHourly) && etArrHourly.length && etTimesHourly) {
      let etIdx = riegoHourlyIndicesPorFecha(etTimesHourly, dailyDateStr);
      if (!etIdx && etArrHourly.length >= offsetHoras + 24) {
        etIdx = [];
        for (let k = 0; k < 24; k++) etIdx.push(offsetHoras + k);
      }
      if (etIdx && etIdx.length) {
        et0Day = etIdx.reduce((a, i) => a + (typeof etArrHourly[i] === 'number' ? etArrHourly[i] : 0), 0);
        const nightEtI = riegoIndicesNocturnosPorIso(etIdx, etTimesHourly);
        if (nightEtI.length) {
          const s = nightEtI.reduce((a, i) => a + (typeof etArrHourly[i] === 'number' ? etArrHourly[i] : 0), 0);
          et0NightSum = Math.round(s * 1000) / 1000;
        }
      }
    }

    const toldoAct = toldoDesplegado;
    const adjToldo = riegoAjustesToldoActivos(uvMax, et0Day, toldoAct);
    const uvEfectivo = adjToldo.uvEfectivo;
    const et0Riego = adjToldo.et0Efectivo;
    const dTempPlanta = adjToldo.deltaTempZonaPlanta;

    // ── VPD (kPa) Magnus–Tetens; con toldo: temp. zona planta y pico radiativo reducidos ──
    const vpd = riegoVPDkPa(tempMedia + dTempPlanta, humMedia);
    const deltaTMedio = uvEfectivo >= 6 ? 1.2 : uvEfectivo >= 4 ? 0.7 : uvEfectivo >= 3 ? 0.35 : 0;
    const vpdMediodia = riegoVPDkPa(temp1315 + dTempPlanta + deltaTMedio, hum1315);

    const esInterior = (state.configTorre?.ubicacion === 'interior');
    const { kc: kcMedio } = calcularKcMedioRiego(edadSem);

    const sustrato = riegoSustratoPerfil();

    const multFase = riegoFaseCultivoMult(edadSem);
    let demandaDia;
    let vpdInterior = null;
    if (esInterior) {
      const horasLuz = state.configTorre?.horasLuz || 16;
      const cfgIn = state.configTorre || {};
      const tIn = parseFloat(cfgIn.interiorTempC);
      const hIn = parseFloat(cfgIn.interiorHumedadAmbPct);
      const T = Number.isFinite(tIn) ? tIn : 22;
      const H = Number.isFinite(hIn) ? hIn : 55;
      vpdInterior = riegoVPDkPa(T, H);
      demandaDia = 0.48 + vpdInterior * 0.38 + (horasLuz - 14) * 0.028;
      const luzTipo = cfgIn.luz || 'led';
      const multLuz = {
        natural: 0.94, led: 1, mixto: 1.03, fluorescente: 0.92, hps: 1.12, sin_luz: 0.62
      }[luzTipo] ?? 1;
      const inten = cfgIn.interiorIntensidadLuz || 'media';
      const multInt = { baja: 0.9, media: 1, alta: 1.1 }[inten] ?? 1;
      demandaDia *= multLuz * multInt;
      if (cfgIn.interiorCirculacionAire) demandaDia *= 1.065;
      demandaDia = Math.max(0.52, Math.min(1.22, demandaDia));
    } else {
      demandaDia = riegoIndiceDemanda({
        vpdKpa: vpd,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        toldo: toldoAct,
        probLluvia,
        et0DayMm: et0Riego
      });
      demandaDia *= riegoAjusteClimaPorSustrato({
        retencion: sustrato.retencion,
        humMediaPct: humMedia,
        probLluviaPct: probLluvia,
        uvIdx: uvEfectivo,
        vpdKpa: vpd,
        et0DayMm: et0Riego
      });
      demandaDia *= riegoMargenSeguridadDinamico({
        tramo: 'dia',
        retencion: sustrato.retencion,
        vpdKpa: vpd,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        et0DayMm: et0Riego,
        probLluviaPct: probLluvia,
        faseMult: multFase
      });
    }
    if (esInterior) {
      demandaDia = Math.max(0.52, Math.min(1.22, demandaDia * multFase));
    } else {
      demandaDia = Math.max(0.48, Math.min(1.58, demandaDia * multFase));
    }
    const sensRiego = riegoMultSensorSustrato();
    if (sensRiego.mult !== 1) {
      demandaDia = Math.max(0.48, Math.min(1.58, demandaDia * sensRiego.mult));
    }

    if (!esInterior && tipoRiego === 'torre' && mcNear) {
      const refH = meteoclimaticRiegoModeloHoraEnDia(times, dayHourIdx, tempHArr, rhArr, temp1315, hum1315);
      const anaD = meteoclimaticFactorVpdDesdeMc(
        mcNear,
        refH.t,
        refH.rh,
        dTempPlanta,
        MC_RIEGO_FAC_DIA_MIN,
        MC_RIEGO_FAC_DIA_MAX
      );
      if (anaD) {
        factorMcDiaRiego = anaD.factor;
        demandaDia *= factorMcDiaRiego;
        demandaDia = Math.max(0.48, Math.min(1.58, demandaDia));
        mcRiegoLineaAjuste +=
          '<br><span class="riego-clima-mc-ajuste">⚖️ <strong>Ajuste conservador Meteoclimatic (día):</strong> discrepancia fuerte (≥' +
          MC_RIEGO_DIF_T_C + ' °C y/o ≥' + MC_RIEGO_DIF_RH_PP + ' pp HR) vs hora del modelo en el día elegido · lectura &lt;45 min · demanda ×' +
          (Math.round(factorMcDiaRiego * 1000) / 1000) + ' <span class="riego-clima-mc-ajuste-sub">(tope ' + MC_RIEGO_FAC_DIA_MIN + '–' + MC_RIEGO_FAC_DIA_MAX + ' sobre VPD)</span>.</span>';
      }
    }

    const esNftRiego = tipoRiego === 'nft';
    const esDwcRiego = tipoRiego === 'dwc';
    if (esNftRiego || esDwcRiego) {
      const panelNft = document.getElementById('riegoNftPanel');
      const panelDwc = document.getElementById('riegoDwcPanel');
      const climaNft = document.getElementById('riegoClimaUsadoNft');
      const climaDwc = document.getElementById('riegoClimaUsadoDwc');
      const blockTorre = document.getElementById('riegoTorreResultBlock');
      if (panelNft) panelNft.classList.toggle('setup-hidden', !esNftRiego);
      if (panelDwc) panelDwc.classList.toggle('setup-hidden', !esDwcRiego);
      if (blockTorre) blockTorre.classList.add('setup-hidden');

      const precipMmN = Math.round((Number(daily.precipitation_sum?.[idx]) || 0) * 10) / 10;
      const uvClimaStrN = esInterior
        ? '—'
        : (uvAlineado == null ? '—' : String(Math.round(Number(uvEfectivo) * 10) / 10));
      const lineaClimaN =
        '🌡️ Temperatura: ' + Math.round(tempMin) + '–' + Math.round(tempMax) + ' °C' +
        ' · 💧 Humedad media: ' + humMedia + '%' +
        ' · ☀️ Índice UV: ' + uvClimaStrN +
        ' · 🌧️ Prob. lluvia: ' + probLluvia + '% · ' + precipMmN + ' mm';
      const uvTipNft =
        !esInterior && Number.isFinite(Number(uvEfectivo)) && Number(uvEfectivo) >= 7
          ? '<br><br><span class="riego-clima-tip-uv">💡 <strong>UV elevado:</strong> conviene <strong>toldo</strong>, <strong>malla sombra</strong> (p. ej. 30–50 %) o sombra parcial para moderar estrés y calor en el follaje.</span>'
          : '';
      const lineaMcNft = meteoclimaticFormatLineaHtml(mcNear);
      const bloqueClima =
        '<span class="riego-clima-bloque">' + lineaClimaN + '</span>' +
        (esInterior
          ? '<br><br><span class="riego-clima-nota-int">🏠 Interior — datos de la ubicación guardada (referencia).</span>'
          : '') +
        uvTipNft +
        (lineaMcNft || '');
      if (esNftRiego && climaNft) {
        climaNft.innerHTML = bloqueClima;
        climaNft.classList.remove('setup-hidden');
      }
      if (esDwcRiego && climaDwc) {
        climaDwc.innerHTML = bloqueClima;
        climaDwc.classList.remove('setup-hidden');
      }

      ['resMinON', 'resMinOFF', 'resCiclos', 'resTotalON', 'resEspaciado', 'resDutyCiclo', 'resMedioON', 'resMedioOFF', 'resMedioCiclos', 'resMedioTotal', 'resMedioDutyCiclo', 'resNocON', 'resNocOFF', 'resNocCiclos', 'resNocTotal', 'resNocEspaciado', 'resNocDuty'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      const nocNotaNft = document.getElementById('resNocNota');
      if (nocNotaNft) {
        nocNotaNft.classList.add('setup-hidden');
        nocNotaNft.textContent = '';
      }

      state.ultimoRiego = {
        nftContinuo24h: esNftRiego,
        dwcOxigenacion24h: esDwcRiego,
        fecha: new Date().toLocaleDateString('es-ES'),
        vpd,
        vpdMediodia: Math.round(vpdMediodia * 100) / 100,
        sustratoPerfilNombre: sustrato.nombre,
      };
      saveState();
      if (elHorarioHint) {
        const pieMeteo = refetchMeteo
          ? '\n\n🌐 Previsión meteorológica pedida a la API en esta consulta (' + new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) + ').'
          : '\n\n🌐 Meteo: puede usarse caché reciente (~1 min). Pulsa «Calcular riego ahora» para traer datos nuevos del modelo.';
        elHorarioHint.textContent = (esNftRiego
          ? '🪴 NFT: riego continuo — no hay bloque de intensidad solar por pulsos; el clima sirve de referencia para vigilar estrés.'
          : '💧 DWC: oxigenación continua — no hay bloque de intensidad solar por pulsos como en torre; el clima resume tu ubicación.') + pieMeteo;
      }
      try {
        actualizarRiegoToldoRecoUI(esInterior, tempMax, uvMax);
      } catch (_) {}
      document.getElementById('riegoLoader').classList.add('setup-hidden');
      document.getElementById('riegoResultado').classList.remove('setup-hidden');
      return;
    }

    const panelNftT = document.getElementById('riegoNftPanel');
    const panelDwcT = document.getElementById('riegoDwcPanel');
    const blockTorreT = document.getElementById('riegoTorreResultBlock');
    if (panelNftT) panelNftT.classList.add('setup-hidden');
    if (panelDwcT) panelDwcT.classList.add('setup-hidden');
    if (blockTorreT) blockTorreT.classList.remove('setup-hidden');

    const ciclo = riegoMinutosDesdeDemanda(
      demandaDia, nPlantas, kcMedio, sustrato, esInterior
    );
    let minON = ciclo.minON;
    let minOFF = esInterior ? Math.max(10, ciclo.minOFF) : ciclo.minOFF;

    const factorON = Math.round(demandaDia * 100) / 100;
    const offBaseNeutral = riegoOffBaseNeutral(sustrato, esInterior);
    const factorOFF = Math.round((minOFF / offBaseNeutral) * 100) / 100;
    const dutyCicloPct = Math.round((100 * minON) / (minON + minOFF));

    // ── Sección C: ciclos ─────────────────────────────────────────────────
    const minCiclo    = minON + minOFF;
    const ciclos      = Math.floor(840 / minCiclo);
    const espaciado   = Math.round(840 / ciclos);
    const totalON     = minON * ciclos;

    // ── Programa mediodía (11–15 h)
    let demandaMed;
    if (esInterior) {
      demandaMed = demandaDia;
    } else {
      demandaMed = riegoIndiceDemanda({
        vpdKpa: vpdMediodia,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        toldo: toldoAct,
        probLluvia,
        et0DayMm: et0Riego
      });
      demandaMed *= riegoAjusteClimaPorSustrato({
        retencion: sustrato.retencion,
        humMediaPct: humMedia,
        probLluviaPct: probLluvia,
        uvIdx: uvEfectivo,
        vpdKpa: vpdMediodia,
        et0DayMm: et0Riego
      });
      demandaMed *= riegoMargenSeguridadDinamico({
        tramo: 'dia',
        retencion: sustrato.retencion,
        vpdKpa: vpdMediodia,
        vientoKmh: viento,
        uvIdx: uvEfectivo,
        et0DayMm: et0Riego,
        probLluviaPct: probLluvia,
        faseMult: multFase
      });
      demandaMed = Math.max(0.48, Math.min(1.58, demandaMed * multFase));
    }
    if (sensRiego.mult !== 1) {
      demandaMed = Math.max(0.48, Math.min(1.58, demandaMed * sensRiego.mult));
    }

    if (!esInterior && tipoRiego === 'torre' && factorMcDiaRiego !== 1) {
      demandaMed *= factorMcDiaRiego;
      demandaMed = Math.max(0.48, Math.min(1.58, demandaMed));
    }

    const cicloMed = riegoMinutosDesdeDemanda(
      demandaMed, nPlantas, kcMedio, sustrato, esInterior
    );
    const minONMedio = cicloMed.minON;
    const minOFFMedio = esInterior ? Math.max(10, cicloMed.minOFF) : cicloMed.minOFF;
    const durMedMin = ((typeof medHIni === 'number' && typeof medHFin === 'number') ? (medHFin - medHIni + 1) : 4) * 60;
    const ciclosMedio  = Math.floor(durMedMin / (minONMedio + minOFFMedio));
    const totalONMedio = minONMedio * ciclosMedio;
    const dutyMedioPct = Math.round((100 * minONMedio) / (minONMedio + minOFFMedio));

    // ── Programa nocturno 21:00–07:00 (recarga sustrato; ON 3–5 min) ─────────
    const statsNoct = riegoStatsNocturnosFromHourly(dayHourIdx, times, tempHArr, rhArr, windHArr);
    const dTNocPlanta = dTempPlanta * 0.38;
    let tempNocUse;
    let rhNocUse;
    let vientoNocKmh;
    if (statsNoct) {
      tempNocUse = statsNoct.temp + dTNocPlanta + (toldoAct ? -0.35 : 0);
      rhNocUse = statsNoct.rh;
      vientoNocKmh = Number.isFinite(statsNoct.vientoMax) && statsNoct.vientoMax > 0
        ? statsNoct.vientoMax
        : viento * 0.62;
    } else {
      tempNocUse = tempMin + dTNocPlanta + 0.6 + (toldoAct ? -0.35 : 0);
      rhNocUse = Math.min(94, humMedia + 9);
      vientoNocKmh = viento * 0.55;
    }
    let demandaNocRaw;
    let vpdNocVal;
    let demandaNoc;
    if (esInterior) {
      vpdNocVal = vpdInterior;
      demandaNocRaw = Math.max(0.42, Math.min(0.95, demandaDia * 0.52));
      demandaNoc = Math.max(0.38, Math.min(1.02, demandaNocRaw));
    } else {
      vpdNocVal = riegoVPDkPa(tempNocUse, rhNocUse);
      demandaNocRaw = riegoIndiceDemandaNocturna({
        vpdKpa: vpdNocVal,
        vientoKmh: vientoNocKmh,
        tempMin,
        probLluvia,
        et0NightMm: et0NightSum,
        toldo: toldoAct
      });
      demandaNoc = demandaNocRaw * multFase;
      demandaNoc *= riegoMargenSeguridadDinamico({
        tramo: 'noche',
        retencion: sustrato.retencion,
        vpdKpa: vpdNocVal,
        vientoKmh: vientoNocKmh,
        uvIdx: 0,
        et0DayMm: et0NightSum != null ? et0NightSum * 11 : 0,
        probLluviaPct: probLluvia,
        faseMult: multFase
      });
      demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc));
      if (sensRiego.mult !== 1) {
        demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc * sensRiego.mult));
      }
    }
    const cfgRiegoNoc = state.configTorre || {};
    const interiorTNoc = parseFloat(cfgRiegoNoc.interiorTempC);
    const tempAireNocProxy =
      esInterior && Number.isFinite(interiorTNoc) ? interiorTNoc : tempNocUse;
    const tempAguaNocUse = riegoTempAguaNocheEfectiva(cfgRiegoNoc, state.ultimaMedicion, tempAireNocProxy);
    const fNocTempAgua = riegoFactorDemandaNocPorTempAgua(tempAguaNocUse);
    const fNocDifusor = riegoFactorDemandaNocPorDifusor(cfgRiegoNoc.equipamiento);
    demandaNoc *= fNocTempAgua * fNocDifusor;
    demandaNoc = esInterior
      ? Math.max(0.38, Math.min(1.02, demandaNoc))
      : Math.max(0.38, Math.min(1.12, demandaNoc));

    if (!esInterior && tipoRiego === 'torre' && mcNear) {
      const anaN = meteoclimaticFactorNocDesdeMc(mcNear, tempNocUse, rhNocUse, dTempPlanta, 0.38);
      if (anaN) {
        factorMcNocRiego = anaN.factor;
        demandaNoc *= factorMcNocRiego;
        demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc));
        mcRiegoLineaAjuste +=
          '<br><span class="riego-clima-mc-ajuste">⚖️ <strong>Ajuste conservador Meteoclimatic (noche):</strong> solo en horario local 20:00–07:59 · misma regla ΔT/ΔHR y lectura reciente vs noche modelo · demanda nocturna ×' +
          (Math.round(factorMcNocRiego * 1000) / 1000) + ' <span class="riego-clima-mc-ajuste-sub">(tope ' + MC_RIEGO_FAC_NOC_MIN + '–' + MC_RIEGO_FAC_NOC_MAX + ')</span>.</span>';
      }
    }

    const windSkipProxy = statsNoct && Number.isFinite(statsNoct.vientoMax) && statsNoct.vientoMax > 0
      ? statsNoct.vientoMax
      : viento * 0.52;
    const umbNocSkip = riegoNocUmbralesOmitir(tempMin, probLluvia, et0NightSum);
    const secaNocEt =
      et0NightSum != null && typeof et0NightSum === 'number' && et0NightSum >= 0.19;
    let nocSkip = false;
    let nocSkipClave = '';
    if (!esInterior) {
      const omitNoc = riegoTorreExteriorOmiteNocturnoPorClima({
        tempMin,
        tempNoc: tempNocUse,
        rhNoc: rhNocUse,
        vpdNoc: vpdNocVal,
      });
      if (omitNoc.omit) {
        nocSkip = true;
        nocSkipClave = omitNoc.clave;
      }
    } else {
      if (
        !secaNocEt &&
        demandaNoc < umbNocSkip.demMax &&
        vpdNocVal < umbNocSkip.vpdMax &&
        windSkipProxy < umbNocSkip.windMax
      ) {
        nocSkip = true;
      }
    }
    const kcNoc = Math.max(0.25, Math.min(0.48, kcMedio * 0.36));
    const cicloNoc0 = riegoMinutosDesdeDemanda(demandaNoc, nPlantas, kcNoc, sustrato, esInterior);
    let minONNoc = Math.min(4, Math.max(3, cicloNoc0.minON));
    let minOFFNoc = Math.max(
      esInterior ? 28 : 42,
      Math.round(cicloNoc0.minOFF * (1.1 + sustrato.retencion * 0.07))
    );
    try {
      let envN = riegoNocCorredorTablaTorre(tempNocUse, rhNocUse, vientoNocKmh);
      envN = riegoNocAjusteCorredorEsponja(envN, riegoSustratoKey());
      const clN = riegoNocClampModeloACorredor(minONNoc, minOFFNoc, envN);
      minONNoc = clN.minON;
      minOFFNoc = clN.minOFF;
    } catch (eCorN) {}
    let minCicloNoc = minONNoc + minOFFNoc;
    let ciclosNoc = nocSkip ? 0 : Math.floor(600 / minCicloNoc);
    ciclosNoc = Math.min(8, Math.max(0, ciclosNoc));
    let usarNocCalculadoExt = false;
    if (!esInterior && !nocSkip) {
      const nocheCalidaExt =
        (Number.isFinite(tempMin) && tempMin >= 23.5) ||
        (Number.isFinite(tempNocUse) && tempNocUse >= 24);
      const olaCalorExt =
        Number.isFinite(tempMax) &&
        tempMax >= 28 &&
        ((Number.isFinite(tempMin) && tempMin >= 23) ||
          (Number.isFinite(tempNocUse) && tempNocUse >= 23.5));
      usarNocCalculadoExt =
        secaNocEt || demandaNoc >= 0.72 || nocheCalidaExt || olaCalorExt;
      if (!usarNocCalculadoExt) {
        minONNoc = RIEGO_NOC_REFRESCO_TORRE_EXT_SEG / 60;
        minCicloNoc = minONNoc + minOFFNoc;
        ciclosNoc = 1;
      } else {
        if (ciclosNoc === 0 && minCicloNoc <= 600) ciclosNoc = 1;
      }
    } else if (!esInterior && nocSkip) {
      ciclosNoc = 0;
    } else if (
      esInterior &&
      !nocSkip &&
      ciclosNoc === 0 &&
      minCicloNoc <= 600 &&
      demandaNoc >= riegoNocDemandaMin1Ciclo(tempMin)
    ) {
      ciclosNoc = 1;
    }
    const esNocRefrescoTorreExt = !esInterior && !nocSkip && ciclosNoc > 0 && !usarNocCalculadoExt;
    const totalONNoc = esNocRefrescoTorreExt
      ? (RIEGO_NOC_REFRESCO_TORRE_EXT_SEG / 60) * ciclosNoc
      : minONNoc * ciclosNoc;
    const espNoc = ciclosNoc > 0 ? Math.round(600 / ciclosNoc) : 0;
    let dutyNocPct = null;
    if (ciclosNoc > 0 && !esNocRefrescoTorreExt) {
      dutyNocPct = Math.round((100 * minONNoc) / minCicloNoc);
    }

    // ── Mostrar resultados ────────────────────────────────────────────────
    document.getElementById('resMinON').textContent    = minON;
    document.getElementById('resMinOFF').textContent   = minOFF;
    document.getElementById('resCiclos').textContent   = ciclos;
    document.getElementById('resTotalON').textContent  = totalON;
    document.getElementById('resEspaciado').textContent = espaciado;
    const elDuty = document.getElementById('resDutyCiclo');
    if (elDuty) elDuty.textContent = dutyCicloPct + '%';

    document.getElementById('resMedioON').textContent    = minONMedio;
    document.getElementById('resMedioOFF').textContent   = minOFFMedio;
    document.getElementById('resMedioCiclos').textContent = ciclosMedio;
    document.getElementById('resMedioTotal').textContent  = totalONMedio;
    const medHead = document.getElementById('mediodiaHeader');
    const hhMed = function (n) { return String(n).padStart(2, '0') + ':00'; };
    if (typeof medHIni === 'number' && typeof medHFin === 'number') {
      if (medHead) {
        medHead.textContent = '☀️ Riego de mayor intensidad solar — ' + hhMed(medHIni) + ' a ' + hhMed(medHFin) + 'h';
      }
      if (elHorarioHint) {
        const diaTxt = diaRiego === 'manana' ? 'mañana (previsión)' : 'hoy';
        let hint =
          '🕐 Horario recomendado para programar el bloque de mayor intensidad solar: de ' + hhMed(medHIni) + ' a ' + hhMed(medHFin) +
          ' (4 h), según pico de estrés del día en el modelo (' + diaTxt + ').';
        if (esInterior) {
          hint += ' En instalación interior es referencia del clima de tu ubicación; cuádralo con tu fotoperiodo real.';
        }
        const pieMeteo = refetchMeteo
          ? '\n\n🌐 Previsión meteorológica pedida a la API en esta consulta (' + new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) + ').'
          : '\n\n🌐 Meteo: puede usarse caché reciente (~1 min). Pulsa «Calcular riego ahora» para traer datos nuevos del modelo.';
        elHorarioHint.textContent = hint + pieMeteo;
      }
    }
    const elMedDuty = document.getElementById('resMedioDutyCiclo');
    if (elMedDuty) elMedDuty.textContent = dutyMedioPct + '%';

    const elNocON = document.getElementById('resNocON');
    const elNocOFF = document.getElementById('resNocOFF');
    const elNocC = document.getElementById('resNocCiclos');
    const elNocT = document.getElementById('resNocTotal');
    const elNocE = document.getElementById('resNocEspaciado');
    const elNocD = document.getElementById('resNocDuty');
    const elNocNota = document.getElementById('resNocNota');
    const elNocLabelA = document.getElementById('resNocLabelA');
    const elNocLabelB = document.getElementById('resNocLabelB');
    const nocSinResultado = esInterior ? (nocSkip || ciclosNoc === 0) : (ciclosNoc === 0);
    if (elNocLabelA) elNocLabelA.textContent = esNocRefrescoTorreExt ? 'Refresco' : 'min ON';
    if (elNocLabelB) elNocLabelB.textContent = esNocRefrescoTorreExt ? 'Hora' : 'min OFF';
    if (elNocON) {
      elNocON.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? RIEGO_NOC_REFRESCO_TORRE_EXT_SEG + ' s' : String(minONNoc);
    }
    if (elNocOFF) {
      elNocOFF.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? '04:00' : String(minOFFNoc);
    }
    if (elNocC) elNocC.textContent = nocSinResultado ? '—' : String(ciclosNoc);
    if (elNocT) {
      elNocT.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? RIEGO_NOC_REFRESCO_TORRE_EXT_SEG + ' s' : String(totalONNoc);
    }
    if (elNocE) {
      elNocE.textContent =
        nocSinResultado ? '—' : esNocRefrescoTorreExt ? '04' : String(espNoc);
      elNocE.style.fontSize = esNocRefrescoTorreExt ? '28px' : '';
      elNocE.style.whiteSpace = esNocRefrescoTorreExt ? 'normal' : '';
      elNocE.style.lineHeight = esNocRefrescoTorreExt ? '1.05' : '';
    }
    const elNocEspLabel = document.querySelector('#resNocEspaciado')?.nextElementSibling;
    if (elNocEspLabel) {
      elNocEspLabel.textContent = esNocRefrescoTorreExt ? 'AM' : 'Espaciado';
      elNocEspLabel.style.fontWeight = esNocRefrescoTorreExt ? '900' : '';
    }
    if (elNocD) {
      elNocD.textContent =
        nocSinResultado || dutyNocPct == null ? '—' : dutyNocPct + '%';
    }
    if (elNocNota) {
      // Mantener lógica interna, pero ocultar razones técnicas al usuario final.
      elNocNota.classList.add('setup-hidden');
      elNocNota.textContent = '';
    }

    const etiquetaDia = diaRiego === 'manana' ? '📅 Mañana' : '📅 Hoy';
    const precipMm = Math.round((Number(daily.precipitation_sum?.[idx]) || 0) * 10) / 10;
    const uvClimaStr = esInterior ? '—' : (uvAlineado == null ? '—' : String(Math.round(Number(uvEfectivo) * 10) / 10));
    const lineaClima =
      '🌡️ Temperatura: ' + Math.round(tempMin) + '–' + Math.round(tempMax) + ' °C' +
      ' · 💧 Humedad media: ' + humMedia + '%' +
      ' · ☀️ Índice UV: ' + uvClimaStr +
      ' · 🌧️ Prob. lluvia: ' + probLluvia + '% · ' + precipMm + ' mm';
    const lineaTramo1315 = !esInterior
      ? '<br>🕐 Mediodía modelo (' + String(medHIni).padStart(2, '0') + '–' + String(medHFin).padStart(2, '0') + ' h): ' + temp1315 + ' °C · ' + hum1315 + '% HR'
      : '';
    const vpdDiaTxt = Math.round(vpd * 1000) / 1000;
    const vpdMedTxt = Math.round(vpdMediodia * 1000) / 1000;
    const demDiaTxt = Math.round(demandaDia * 100) / 100;
    const demMedTxt = Math.round(demandaMed * 100) / 100;
    const demNocTxt = Math.round(demandaNoc * 100) / 100;
    const facNocAguaDifTxt =
      'T agua modelo ~' + Math.round(tempAguaNocUse * 10) / 10 + ' °C · ajuste noct. ×' +
      Math.round(fNocTempAgua * fNocDifusor * 1000) / 1000;
    const vpdNocTxt = Math.round(vpdNocVal * 1000) / 1000;
    const et0NocTxt = et0NightSum != null && Number.isFinite(et0NightSum) ? String(et0NightSum) : '—';
    const windNocTxt = Math.round(vientoNocKmh * 10) / 10;
    const tempNocTxt = Math.round(tempNocUse * 10) / 10;
    const rhNocTxt = Math.round(rhNocUse);
    const fechaModTxt = escHtmlUi(dailyDateStr || '—');
    let notaRedondeo = '';
    if (!esInterior && (demDiaTxt !== demMedTxt || vpdDiaTxt !== vpdMedTxt) && minON === minONMedio && minOFF === minOFFMedio) {
      notaRedondeo =
        '<br><span class="riego-clima-nota-peq">ℹ️ La demanda o el VPD cambian entre «día» y «franja de mayor intensidad solar», pero al <strong>redondear a minutos enteros</strong> el pulso ON/OFF puede salir igual.</span>';
    }
    const lineaNocClima = esInterior
      ? '<br>🌙 Nocturno (interior): VPD sala ~' + vpdNocTxt + ' kPa · demanda rel. ~' + demNocTxt + ' (sin ET₀/viento exterior en el índice). · ' + facNocAguaDifTxt
      : '<br>🌙 Nocturno (21–07 h): ~' + tempNocTxt + ' °C · ' + rhNocTxt + '% HR · VPD ~' + vpdNocTxt + ' kPa · viento máx. horario ~' + windNocTxt + ' km/h · Σ ET₀ noche ~' + et0NocTxt + ' mm · demanda rel. ~' + demNocTxt + '. · ' + facNocAguaDifTxt;
    const lineaMcRiego = meteoclimaticFormatLineaHtml(mcNear) + (mcRiegoLineaAjuste || '');
    document.getElementById('riegoClimaUsado').innerHTML =
      '<strong class="u-text-white">' + etiquetaDia + '</strong><br>' + lineaClima + lineaTramo1315 +
      lineaNocClima +
      lineaMcRiego +
      '<br><span class="riego-clima-meta-line">📆 Día en el modelo: <strong>' + fechaModTxt +
      '</strong> · VPD ~' + vpdDiaTxt + ' / ~' + vpdMedTxt + ' kPa (24 h vs ventana dinámica de mayor intensidad solar + pico radiación) · Demanda rel. ' +
      demDiaTxt + ' / ' + demMedTxt + ' (general / intensidad solar).</span>' +
      '<br><span class="riego-clima-nota-peq">Si <strong>hoy</strong> y <strong>mañana</strong> dan el mismo programa, suele ser previsión muy parecida en la API + mismos redondeos; comprueba que cambian temperatura/UV arriba y la fecha del modelo.</span>' +
      notaRedondeo +
      (esInterior
        ? '<br><span class="riego-clima-int-torre">🏠 Torre en interior — estos valores son de la ubicación en previsión; el cálculo usa también luz y ambiente de sala (bloque de intensidad solar = mismo índice que el día).</span>'
        : '');

    // Guardar en state para uso en otros módulos
    state.ultimoRiego = { minON, minOFF, ciclos, totalON, espaciado,
      minONMedio, minOFFMedio, ciclosMedio, totalONMedio,
      dutyCicloPct, dutyMedioPct,
      minONNoc: nocSkip || ciclosNoc === 0 ? null : minONNoc,
      minOFFNoc: nocSkip || ciclosNoc === 0 || esNocRefrescoTorreExt ? null : minOFFNoc,
      ciclosNoc: nocSkip || ciclosNoc === 0 ? 0 : ciclosNoc,
      totalONNoc: nocSkip || ciclosNoc === 0 ? 0 : totalONNoc,
      espaciadoNoc: nocSkip || ciclosNoc === 0 || esNocRefrescoTorreExt ? null : espNoc,
      espaciadoNocRefrescoHora: esNocRefrescoTorreExt ? '04:00' : null,
      nocRefrescoSeg: esNocRefrescoTorreExt ? RIEGO_NOC_REFRESCO_TORRE_EXT_SEG : null,
      dutyNocPct: nocSkip || ciclosNoc === 0 || dutyNocPct == null ? null : dutyNocPct,
      demandaNoc: Math.round(demandaNoc * 1000) / 1000,
      vpdNoc: Math.round(vpdNocVal * 1000) / 1000,
      nocSkip,
      factorON: Math.round(factorON*100)/100,
      factorOFF: Math.round(factorOFF*100)/100,
      kcMedio,
      kcNoc: Math.round(kcNoc * 1000) / 1000,
      faseCultivoRiego: riegoFaseCultivoKeyEfectiva(edadSem),
      faseCultivoRiegoAuto: state.configTorre?.faseCultivoRiegoAuto !== false,
      multFaseCultivo: Math.round(multFase * 100) / 100,
      sustratoPerfilNombre: sustrato.nombre,
      vpd, vpdMediodia: Math.round(vpdMediodia*100)/100,
      fecha: new Date().toLocaleDateString('es-ES'),
      mcRiegoFactorDia: factorMcDiaRiego !== 1 ? Math.round(factorMcDiaRiego * 1000) / 1000 : null,
      mcRiegoFactorNoc: factorMcNocRiego !== 1 ? Math.round(factorMcNocRiego * 1000) / 1000 : null,
    };
    saveState();

    try {
      actualizarRiegoToldoRecoUI(esInterior, tempMax, uvMax);
    } catch (_) {}

    document.getElementById('riegoLoader').classList.add('setup-hidden');
    document.getElementById('riegoResultado').classList.remove('setup-hidden');

  } catch(e) {
    ocultarRiegoToldoRecoUI();
    document.getElementById('riegoLoader').classList.add('setup-hidden');
    const elH = document.getElementById('riegoHorarioRecomendado');
    if (elH) {
      elH.textContent = 'No se pudo calcular el horario de mayor intensidad solar. Revisa conexión y ubicación, y pulsa de nuevo «Calcular riego ahora».';
    }
    showToast('❌ Error al obtener datos meteorológicos', true);
  } finally {
    if (btnCalc) {
      btnCalc.disabled = false;
      btnCalc.textContent = btnCalcPrevTxt;
    }
  }
}
