/**
 * Riego: Meteoclimatic, VPD, helpers nocturnos, toldo, sincronización UI previa a calcularRiego.
 * Tras meteo-forecast-*.js. Siguiente: riego-calculo-calcular.js.
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
let riegoTipoSombra = 'media';
let riegoSombraAuto = true;
let diaRiego = 'hoy'; // 'hoy' o 'manana'

/** Perfiles de sombra: fracción de UV/ET₀ que llega al follaje; ΔT zona planta (°C). `media` ≈ toldo legacy. */
const RIEGO_SOMBRA_PERFILES = {
  ligera: {
    uvRest: 0.62,
    et0Rest: 0.82,
    dTemp: -1.0,
    label: 'Malla ligera',
    hint: '~30 % sombra — prioriza luz; plántulas y hierbas secas.',
    pct: 30,
  },
  media: {
    uvRest: 0.38,
    et0Rest: 0.52,
    dTemp: -2.0,
    label: 'Malla media',
    hint: '~50 % sombra — equilibrio habitual (tomate en flor, lechugas en verano).',
    pct: 50,
  },
  fuerte: {
    uvRest: 0.28,
    et0Rest: 0.45,
    dTemp: -2.6,
    label: 'Toldo o malla densa',
    hint: '~65 % sombra — olas de calor; no dejar plántulas a sombra total todo el día.',
    pct: 65,
  },
};

const RIEGO_SOMBRA_ORDEN = { ligera: 1, media: 2, fuerte: 3 };

function riegoNormalizarTipoSombra(v) {
  const k = String(v == null ? '' : v).trim().toLowerCase();
  return RIEGO_SOMBRA_PERFILES[k] ? k : 'media';
}

function riegoSombraMaxTipo(a, b) {
  const ta = riegoNormalizarTipoSombra(a);
  const tb = riegoNormalizarTipoSombra(b);
  return RIEGO_SOMBRA_ORDEN[ta] >= RIEGO_SOMBRA_ORDEN[tb] ? ta : tb;
}

/**
 * Tipo de sombra recomendado para una planta (malla ligera ≠ toldo denso en la práctica).
 */
function riegoSombraTipoParaCultivo(cult, pct, dias) {
  if (!cult) return 'ligera';
  const g = cult.grupo || 'lechugas';
  const id = cult.id || '';
  const p = Math.max(0, Number(pct) || 0);
  let fase = null;
  if (cult.fases && typeof cultivoFaseDesdeDias === 'function') {
    const fd = cultivoFaseDesdeDias(cult, dias, { desdeTrasplante: true });
    if (fd && fd.key) fase = fd.key;
  }
  if (g === 'frutos' || g === 'fresas') {
    if (fase === 'plantula' || fase === 'germinacion' || p < 0.12) return 'ligera';
    if (fase === 'floracion' || fase === 'fructificacion') return 'media';
    if (fase === 'prefloracion' || p >= 0.35) return 'media';
    return 'ligera';
  }
  if (g === 'lechugas') {
    if (p < 0.18) return 'ligera';
    if (id === 'mantecosa' || id === 'iceberg' || id === 'trocadero') return 'media';
    if (id === 'lolorrosso' || id === 'hojaroble') return p > 0.4 ? 'media' : 'ligera';
    return p > 0.35 ? 'media' : 'ligera';
  }
  if (g === 'hojas') {
    if (id === 'berros' || id === 'lechuga_agua') return 'media';
    if (id === 'espinaca') return p > 0.3 ? 'media' : 'ligera';
    return p > 0.4 ? 'media' : 'ligera';
  }
  if (g === 'hierbas') {
    if (id === 'romero' || id === 'tomillo' || id === 'lavanda' || id === 'oregano') return 'ligera';
    if (id === 'albahaca' || id === 'cilantro') return p > 0.25 ? 'media' : 'ligera';
    if (id === 'menta') return 'media';
    return 'ligera';
  }
  if (g === 'asiaticas') return p < 0.22 ? 'ligera' : 'media';
  if (g === 'microgreens') return 'ligera';
  if (g === 'raices') return p < 0.35 ? 'ligera' : 'media';
  return 'ligera';
}

/** Lista por planta + tipo máximo recomendado según cultivos en torre */
function riegoSombraResumenPorCultivos(edadSemManual) {
  const filas = [];
  let tipoMax = null;
  getNivelesActivos().forEach(nv => {
    (state.torre[nv] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      const cult = getCultivoDB(c.variedad);
      if (!cult) return;
      const pct = riegoPctCicloPlanta(c, edadSemManual);
      const dias =
        typeof getDiasEfectivosCicloRiego === 'function'
          ? getDiasEfectivosCicloRiego(c, cult, Date.now())
          : getDias(c.fecha);
      const tipo = riegoSombraTipoParaCultivo(cult, pct, dias);
      tipoMax = tipoMax ? riegoSombraMaxTipo(tipoMax, tipo) : tipo;
      const perf = RIEGO_SOMBRA_PERFILES[tipo];
      filas.push({
        nombre: cult.nombre || cult.id,
        emoji: cult.emoji || '',
        tipo,
        label: perf.label,
        pct: perf.pct,
      });
    });
  });
  return { filas, tipoMax: tipoMax || 'media' };
}

function riegoSombraTipoDesdeClima(fuerte, suave, ctx) {
  if (!fuerte && !suave) return null;
  if (ctx && ctx.hayPlántulaReciente && !ctx.hayFlorFruto) {
    return fuerte ? 'ligera' : 'ligera';
  }
  if (ctx && ctx.soloHierbaSeca) {
    return fuerte ? 'media' : 'ligera';
  }
  if (fuerte) {
    return ctx && ctx.hayFlorFruto ? 'media' : 'fuerte';
  }
  return 'ligera';
}

/** Señales de clima del día para combinar con cultivos (toldo / tipo sombra) */
function riegoClimaOptsParaToldo(edadSemManual, tempMax, uvIdxRaw) {
  const ctx = riegoToldoContextoCultivo(edadSemManual);
  const umb = riegoToldoUmbralesReco(ctx.sensibilidad, ctx);
  const tMax = Number(tempMax);
  const uv = Number(uvIdxRaw);
  let fuerte = false;
  let suave = false;
  if (Number.isFinite(uv)) {
    if (uv >= umb.uvFuerte) fuerte = true;
    else if (uv >= umb.uvSuave) suave = true;
  }
  if (Number.isFinite(tMax)) {
    if (tMax >= umb.tFuerte) fuerte = true;
    else if (tMax >= umb.tSuave) suave = true;
    else if (tMax >= umb.tUvCombo && Number.isFinite(uv) && uv >= umb.uvCombo) suave = true;
  }
  return { fuerte, suave, ctx };
}

/** Tipo efectivo: manual, o auto (máx. cultivo + clima del día) */
function riegoGetTipoSombraEfectivo(edadSemManual, climaOpts) {
  if (!toldoDesplegado) return null;
  const manual = riegoNormalizarTipoSombra(riegoTipoSombra);
  if (!riegoSombraAuto) return manual;
  const res = riegoSombraResumenPorCultivos(edadSemManual);
  let tipo = res.tipoMax;
  const co = climaOpts || {};
  const tClima = riegoSombraTipoDesdeClima(!!co.fuerte, !!co.suave, co.ctx);
  if (tClima) tipo = riegoSombraMaxTipo(tipo, tClima);
  return tipo;
}

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
  try {
    riegoPersistirPreferencias();
  } catch (_) {}
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

/** Persiste toldo y día de riego en configTorre y en el slot activo. */
function riegoPersistirPreferencias() {
  if (!state.configTorre) state.configTorre = {};
  if (!state.configTorre.riego) state.configTorre.riego = {};
  state.configTorre.riego.toldo = !!toldoDesplegado;
  state.configTorre.riego.tipoSombra = riegoNormalizarTipoSombra(riegoTipoSombra);
  state.configTorre.riego.sombraAuto = riegoSombraAuto !== false;
  state.configTorre.riego.diaRiego = diaRiego === 'manana' ? 'manana' : 'hoy';
  const tIdx = state.torreActiva || 0;
  if (!state.torres[tIdx]) state.torres[tIdx] = {};
  if (!state.torres[tIdx].riego) state.torres[tIdx].riego = {};
  state.torres[tIdx].riego.toldo = !!toldoDesplegado;
  state.torres[tIdx].riego.tipoSombra = state.configTorre.riego.tipoSombra;
  state.torres[tIdx].riego.sombraAuto = state.configTorre.riego.sombraAuto;
  state.torres[tIdx].riego.diaRiego = state.configTorre.riego.diaRiego;
  try {
    saveState();
  } catch (_) {}
}

/** Restaura toldo/día desde configTorre o slot (sin recalcular). */
function riegoCargarToldoDesdeConfig() {
  const cfgR = state.configTorre && state.configTorre.riego;
  const slotR = state.torres && state.torres[state.torreActiva || 0] && state.torres[state.torreActiva || 0].riego;
  if (cfgR && cfgR.toldo !== undefined) toldoDesplegado = !!cfgR.toldo;
  else if (slotR && slotR.toldo !== undefined) toldoDesplegado = !!slotR.toldo;
  const tipoRaw = (cfgR && cfgR.tipoSombra) || (slotR && slotR.tipoSombra);
  if (tipoRaw) riegoTipoSombra = riegoNormalizarTipoSombra(tipoRaw);
  const autoRaw = cfgR && cfgR.sombraAuto !== undefined ? cfgR.sombraAuto : slotR && slotR.sombraAuto;
  if (autoRaw !== undefined) riegoSombraAuto = !!autoRaw;
  const dia =
    (cfgR && (cfgR.diaRiego === 'hoy' || cfgR.diaRiego === 'manana') && cfgR.diaRiego) ||
    (slotR && (slotR.diaRiego === 'hoy' || slotR.diaRiego === 'manana') && slotR.diaRiego) ||
    'hoy';
  diaRiego = dia;
  riegoAplicarToldoUI();
}

function riegoAplicarToldoUI() {
  const sw = document.getElementById('toldoSwitch');
  if (sw) {
    sw.className = 'toggle-switch' + (toldoDesplegado ? ' on' : '');
    sw.setAttribute('aria-checked', toldoDesplegado ? 'true' : 'false');
  }
  const wrap = document.getElementById('riegoSombraWrap');
  if (wrap) wrap.classList.toggle('setup-hidden', !toldoDesplegado);
  const sel = document.getElementById('riegoTipoSombra');
  if (sel) sel.value = riegoNormalizarTipoSombra(riegoTipoSombra);
  const cb = document.getElementById('riegoSombraAuto');
  if (cb) cb.checked = riegoSombraAuto !== false;
  if (sel) sel.disabled = riegoSombraAuto !== false;
}

function riegoOnSombraAutoChange() {
  const cb = document.getElementById('riegoSombraAuto');
  riegoSombraAuto = !!(cb && cb.checked);
  riegoAplicarToldoUI();
  riegoPersistirPreferencias();
  riegoActualizarPanelSombraCultivos();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

function riegoOnTipoSombraChange() {
  const sel = document.getElementById('riegoTipoSombra');
  if (sel) riegoTipoSombra = riegoNormalizarTipoSombra(sel.value);
  riegoPersistirPreferencias();
  riegoActualizarPanelSombraCultivos();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

/** Lista por cultivo y hint del selector de tipo de sombra */
function riegoActualizarPanelSombraCultivos(edadSemManual, tipoEfectivo, climaOpts) {
  const ul = document.getElementById('riegoSombraPorCultivo');
  const hint = document.getElementById('riegoSombraTipoHint');
  const edadSem =
    Number.isFinite(Number(edadSemManual))
      ? Number(edadSemManual)
      : parseFloat(document.getElementById('riegoEdad')?.value, 10) || 4;
  const res = riegoSombraResumenPorCultivos(edadSem);
  const tipoEff =
    tipoEfectivo ||
    (toldoDesplegado
      ? riegoGetTipoSombraEfectivo(edadSem, climaOpts)
      : null);
  if (ul) {
    if (res.filas.length === 0) {
      ul.classList.add('setup-hidden');
      ul.innerHTML = '';
    } else {
      ul.classList.remove('setup-hidden');
      ul.innerHTML = res.filas
        .map(
          f =>
            '<li>' +
            (f.emoji ? f.emoji + ' ' : '') +
            '<strong>' +
            (typeof escHtmlUi === 'function' ? escHtmlUi(f.nombre) : f.nombre) +
            '</strong>: ' +
            f.label +
            ' (~' +
            f.pct +
            ' %)</li>'
        )
        .join('');
    }
  }
  if (hint) {
    const perf = tipoEff ? RIEGO_SOMBRA_PERFILES[tipoEff] : null;
    if (!toldoDesplegado) {
      hint.textContent =
        res.filas.length > 0
          ? 'Activa la sombra en el cálculo para aplicar el perfil recomendado por cultivo.'
          : '';
    } else if (riegoSombraAuto && perf) {
      hint.textContent =
        'En uso (automático): ' + perf.label + ' — ' + perf.hint;
    } else if (perf) {
      hint.textContent = 'En uso (manual): ' + perf.label + ' — ' + perf.hint;
    } else {
      hint.textContent = '';
    }
  }
  const sel = document.getElementById('riegoTipoSombra');
  if (sel && riegoSombraAuto && tipoEff) sel.value = tipoEff;
}

function actualizarRiegoToldoCopy(esModoClima) {
  const label = document.getElementById('labelToldoRiegoText');
  const hint = document.getElementById('riegoToldoHint');
  const ubic = (state.configTorre && state.configTorre.ubicacion) || 'exterior';
  const esInterior = ubic === 'interior';
  if (label) {
    label.textContent = esModoClima
      ? 'Sombra en el cálculo (malla o toldo; tipo por cultivo)'
      : 'Sombra activa en el cálculo (malla o toldo)';
  }
  if (hint) {
    if (esModoClima) {
      hint.textContent = esInterior
        ? 'En interior el toldo suele no aplicarse; actívalo solo si usas malla frente a ventanas o lámparas muy intensas.'
        : 'El tipo de sombra (ligera / media / densa) cambia UV y calor en el modelo; la lista inferior indica qué conviene por cada cultivo.';
      hint.classList.remove('setup-hidden');
    } else {
      hint.classList.add('setup-hidden');
      hint.textContent = '';
    }
  }
}

/** Controles de riego: torre (cálculo) vs NFT/DWC (solo clima de referencia). */
function actualizarVistaRiegoPorTipoInstalacion() {
  const tipo = tipoInstalacionNormalizado(state.configTorre || {});
  const esModoClima = tipo === 'nft' || tipo === 'dwc' || tipo === 'rdwc' || tipo === 'srf';
  const torreControls = document.getElementById('riegoTorreSoloWrap');
  const btnCalc = document.getElementById('btnCalcRiego');
  const titleEl = document.getElementById('riegoSectionTitle');
  const diaGrp = document.getElementById('riegoDiaSelectorGroup');
  const diaInfo = document.getElementById('riegoDiaInfo');
  const btnHoy = document.getElementById('btnRiegoHoy');
  const btnManana = document.getElementById('btnRiegoManana');
  const toldoWrap = document.getElementById('toldoToggle');

  if (torreControls) torreControls.classList.toggle('setup-hidden', esModoClima);
  if (toldoWrap) toldoWrap.classList.remove('setup-hidden');
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
        '🫧 Riego <span class="accent">DWC</span> <span class="riego-section-title-sub">· clima de referencia</span>';
    } else if (tipo === 'rdwc') {
      titleEl.innerHTML =
        '🔁 Riego <span class="accent">RDWC</span> <span class="riego-section-title-sub">· clima de referencia</span>';
    } else if (tipo === 'srf') {
      titleEl.innerHTML =
        '🛶 Riego <span class="accent">SRF</span> <span class="riego-section-title-sub">· clima de referencia</span>';
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
  try {
    actualizarRiegoToldoCopy(esModoClima);
  } catch (_) {}
}
let esRecarga = false;

function toggleRecarga() {
  if (typeof sistemaEstaOperativa === 'function' && !sistemaEstaOperativa()) {
    showToast(typeof getMensajeStandbyContinuar === 'function'
      ? getMensajeStandbyContinuar()
      : '⏸ Instalación en stand-by / descanso. Reactiva modo operativa para continuar.', true);
    return;
  }
  esRecarga = !esRecarga;
  const sw = document.getElementById('recargaSwitch');
  if (!sw) return;
  sw.className = 'toggle-switch' + (esRecarga ? ' on' : '');
  sw.setAttribute('aria-checked', esRecarga ? 'true' : 'false');
  sw.setAttribute(
    'aria-label',
    esRecarga
      ? 'Recarga completa activada: se reiniciará el contador al guardar la medición'
      : 'Recarga completa desactivada: no se reiniciará el contador al guardar la medición'
  );
}

function toggleToldo() {
  toldoDesplegado = !toldoDesplegado;
  riegoAplicarToldoUI();
  riegoPersistirPreferencias();
  riegoActualizarPanelSombraCultivos();
  calcularRiego();
}

function ocultarRiegoToldoRecoUI() {
  const el = document.getElementById('riegoToldoReco');
  if (!el) return;
  el.classList.add('setup-hidden');
  el.innerHTML = '';
}

/**
 * Sensibilidad al sol/calor (0.3–1) según cultivos y edad en torre.
 * Floración/fruto y lechugas de engorde → más pronto toldo; plántula joven → más luz; romero/tomillo → más tolerancia.
 */
function riegoToldoContextoCultivo(edadSemManual) {
  let n = 0;
  let sensMax = 0;
  let hayFlorFruto = false;
  let hayPlántulaReciente = false;
  let hayHierbaSeca = false;
  let soloHierbaSeca = true;
  getNivelesActivos().forEach(nv => {
    (state.torre[nv] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      const cult = getCultivoDB(c.variedad);
      if (!cult) return;
      n++;
      const g = cult.grupo || 'lechugas';
      const pct = riegoPctCicloPlanta(c, edadSemManual);
      const dias =
        typeof getDiasEfectivosCicloRiego === 'function'
          ? getDiasEfectivosCicloRiego(c, cult, Date.now())
          : getDias(c.fecha);
      let sens = 0.55;
      const id = cult.id || '';
      if (g === 'frutos' || g === 'fresas') {
        sens = 0.88;
        soloHierbaSeca = false;
        if (cult.fases && typeof cultivoFaseDesdeDias === 'function') {
          const fd = cultivoFaseDesdeDias(cult, dias, { desdeTrasplante: true });
          if (fd && (fd.key === 'floracion' || fd.key === 'fructificacion')) {
            sens = 1.0;
            hayFlorFruto = true;
          } else if (fd && (fd.key === 'plantula' || fd.key === 'germinacion') || pct < 0.14) {
            sens = 0.5;
            if (pct < 0.2) hayPlántulaReciente = true;
          } else if (fd && fd.key === 'prefloracion') {
            sens = 0.92;
          }
        }
      } else if (g === 'lechugas') {
        sens = pct < 0.2 ? 0.52 : 0.72;
        soloHierbaSeca = false;
        if (id === 'mantecosa' || id === 'iceberg' || id === 'trocadero') sens = Math.max(sens, 0.8);
        if (id === 'lolorrosso' || id === 'hojaroble') sens = Math.min(sens, 0.68);
      } else if (g === 'hojas') {
        sens = 0.72;
        soloHierbaSeca = false;
        if (id === 'espinaca' || id === 'berros') sens = 0.88;
      } else if (g === 'hierbas') {
        if (id === 'romero' || id === 'tomillo' || id === 'lavanda' || id === 'oregano') {
          sens = 0.38;
          hayHierbaSeca = true;
        } else {
          sens = 0.78;
          soloHierbaSeca = false;
          if (id === 'albahaca' || id === 'cilantro') sens = 0.9;
        }
      } else if (g === 'asiaticas') {
        sens = pct < 0.25 ? 0.5 : 0.68;
        soloHierbaSeca = false;
      } else if (g === 'microgreens') {
        sens = 0.42;
      } else if (g === 'raices') {
        sens = 0.48;
        soloHierbaSeca = false;
      }
      sensMax = Math.max(sensMax, sens);
    });
  });
  if (n === 0) {
    return { n: 0, sensibilidad: 0.65, hayFlorFruto: false, hayPlántulaReciente: false, hayHierbaSeca: false, soloHierbaSeca: false };
  }
  if (!hayHierbaSeca) soloHierbaSeca = false;
  return {
    n,
    sensibilidad: Math.round(sensMax * 100) / 100,
    hayFlorFruto,
    hayPlántulaReciente,
    hayHierbaSeca,
    soloHierbaSeca: soloHierbaSeca && hayHierbaSeca,
  };
}

/** Umbrales UV/T (más bajos = recomendar toldo antes) según sensibilidad del cultivo */
function riegoToldoUmbralesReco(sensibilidad, ctx) {
  const s = Math.max(0.3, Math.min(1, Number(sensibilidad) || 0.65));
  const u = {
    uvFuerte: Math.round((8 - s * 1.6) * 10) / 10,
    uvSuave: Math.round((6 - s * 1.4) * 10) / 10,
    tFuerte: Math.round(34 - s * 4),
    tSuave: Math.round(30 - s * 3.5),
    tUvCombo: Math.round(28 - s * 2.5),
    uvCombo: Math.round(5 - s * 1.2),
  };
  if (ctx && ctx.hayPlántulaReciente && !ctx.hayFlorFruto) {
    u.uvFuerte = Math.min(u.uvFuerte + 1.5, 9.5);
    u.uvSuave = Math.min(u.uvSuave + 1, 8);
    u.tFuerte = Math.min(u.tFuerte + 3, 36);
    u.tSuave = Math.min(u.tSuave + 2, 34);
  }
  if (ctx && ctx.soloHierbaSeca) {
    u.uvFuerte = Math.min(u.uvFuerte + 1, 10);
    u.uvSuave = Math.min(u.uvSuave + 0.8, 9);
    u.tFuerte = Math.min(u.tFuerte + 2, 36);
  }
  return u;
}

/**
 * Recomendación explícita de toldo/sombra: previsión (T máx, UV) + sensibilidad por cultivo y edad en torre.
 */
function actualizarRiegoToldoRecoUI(esInterior, tempMax, uvIdxRaw, edadSemManual) {
  const el = document.getElementById('riegoToldoReco');
  if (!el) return;
  if (esInterior) {
    ocultarRiegoToldoRecoUI();
    return;
  }
  const edadSem =
    Number.isFinite(Number(edadSemManual))
      ? Number(edadSemManual)
      : parseFloat(document.getElementById('riegoEdad')?.value, 10) || 4;
  const ctx = riegoToldoContextoCultivo(edadSem);
  const umb = riegoToldoUmbralesReco(ctx.sensibilidad, ctx);
  const tMax = Number(tempMax);
  const uv = Number(uvIdxRaw);
  let fuerte = false;
  let suave = false;
  if (Number.isFinite(uv)) {
    if (uv >= umb.uvFuerte) fuerte = true;
    else if (uv >= umb.uvSuave) suave = true;
  }
  if (Number.isFinite(tMax)) {
    if (tMax >= umb.tFuerte) fuerte = true;
    else if (tMax >= umb.tSuave) suave = true;
    else if (tMax >= umb.tUvCombo && Number.isFinite(uv) && uv >= umb.uvCombo) suave = true;
  }
  if (!fuerte && !suave) {
    ocultarRiegoToldoRecoUI();
    riegoActualizarPanelSombraCultivos(edadSem, null, { fuerte, suave, ctx });
    return;
  }
  const tipoClima = riegoSombraTipoDesdeClima(fuerte, suave, ctx);
  const resCult = riegoSombraResumenPorCultivos(edadSem);
  const tipoReco = riegoSombraMaxTipo(resCult.tipoMax, tipoClima || resCult.tipoMax);
  const perfReco = RIEGO_SOMBRA_PERFILES[tipoReco];
  let recomHtml =
    'Hoy conviene <strong>' +
    perfReco.label.toLowerCase() +
    '</strong> (~' +
    perfReco.pct +
    ' % sombra)';
  if (tipoReco === 'ligera') {
    recomHtml += ', sobre todo en horas centrales';
  } else if (tipoReco === 'fuerte') {
    recomHtml += ' durante la franja más calurosa';
  } else {
    recomHtml += ' en las horas de mayor radiación';
  }
  recomHtml += '.';
  if (ctx.hayFlorFruto) {
    recomHtml +=
      ' Con <strong>floración o fruto</strong> suele bastar malla media; evita toldo cerrado todo el día (hojas enrolladas, lacias).';
  } else if (ctx.hayPlántulaReciente) {
    recomHtml +=
      ' Plántulas recién trasplantadas: prioriza <strong>malla ligera</strong> solo al mediodía; necesitan luz el resto del día.';
  } else if (ctx.soloHierbaSeca) {
    recomHtml +=
      ' Hierbas secas: con calor extremo valora malla ligera; no hace falta toldo denso salvo olas de calor.';
  }
  let listaCult = '';
  if (resCult.filas.length > 0 && resCult.filas.length <= 8) {
    listaCult =
      '<ul class="riego-sombra-cultivos">' +
      resCult.filas
        .map(
          f =>
            '<li>' +
            (f.emoji ? f.emoji + ' ' : '') +
            (typeof escHtmlUi === 'function' ? escHtmlUi(f.nombre) : f.nombre) +
            ' → ' +
            f.label +
            '</li>'
        )
        .join('') +
      '</ul>';
  } else if (resCult.filas.length > 8) {
    listaCult =
      '<p class="riego-toldo-reco__sub">Recomendación global: <strong>' +
      perfReco.label +
      '</strong> (la planta más sensible al sol marca el mínimo).</p>';
  }
  let subTxt =
    'Clima del día (T máx ' +
    (Number.isFinite(tMax) ? Math.round(tMax) : '—') +
    ' °C, UV ' +
    (Number.isFinite(uv) ? Math.round(uv * 10) / 10 : '—') +
    ').';
  if (ctx.n > 0) {
    subTxt +=
      ' Umbrales ajustados a tus ' +
      ctx.n +
      ' planta' +
      (ctx.n === 1 ? '' : 's') +
      ' (sensibilidad ' +
      Math.round(ctx.sensibilidad * 100) +
      ' %).';
    if (ctx.hayFlorFruto) subTxt += ' Frutos/fresas en flor o fruto → más prudente con el sol.';
    else if (ctx.hayPlántulaReciente) subTxt += ' Plántulas jóvenes → no sombrear todo el día sin necesidad.';
  } else {
    subTxt += ' Sin fechas en torre: umbrales de referencia (lechuga media).';
  }
  riegoActualizarPanelSombraCultivos(edadSem, null, { fuerte, suave, ctx });
  if (toldoDesplegado) {
    const tipoAct = riegoGetTipoSombraEfectivo(edadSem, { fuerte, suave, ctx });
    const perfAct = RIEGO_SOMBRA_PERFILES[tipoAct || 'media'];
    el.innerHTML =
      '<div class="riego-toldo-reco__inner"><p class="riego-toldo-reco__p">✓ Sombra <strong>activa</strong>: ' +
      perfAct.label +
      ' (~' +
      perfAct.pct +
      ' %). ' +
      (riegoSombraAuto ? 'Modo automático según cultivos y clima.' : 'Tipo elegido manualmente.') +
      '</p>' +
      (ctx.n > 0 ? '<p class="riego-toldo-reco__sub">' + subTxt + '</p>' : '') +
      listaCult +
      '</div>';
    el.classList.remove('setup-hidden');
    return;
  }
  el.innerHTML =
    '<div class="riego-toldo-reco__inner">' +
    '<p class="riego-toldo-reco__p">📌 <strong>Recomendación:</strong> ' +
    recomHtml +
    '</p>' +
    listaCult +
    '<p class="riego-toldo-reco__sub">' +
    subTxt +
    '</p>' +
    '<button type="button" class="btn btn-secondary riego-toldo-reco__btn" onclick="activarToldoRecomendado(\'' +
    tipoReco +
    '\')">Activar ' +
    perfReco.label.toLowerCase() +
    ' en el cálculo</button>' +
    '</div>';
  el.classList.remove('setup-hidden');
}

function activarToldoRecomendado(tipoSugerido) {
  if (!toldoDesplegado) {
    toldoDesplegado = true;
    riegoAplicarToldoUI();
  }
  if (tipoSugerido) {
    riegoTipoSombra = riegoNormalizarTipoSombra(tipoSugerido);
    riegoSombraAuto = true;
    const cb = document.getElementById('riegoSombraAuto');
    if (cb) cb.checked = true;
  }
  riegoPersistirPreferencias();
  riegoActualizarPanelSombraCultivos();
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
        const cult = getCultivoDB(c.variedad);
        const dias =
          typeof getDiasEfectivosCicloBiologico === 'function'
            ? getDiasEfectivosCicloBiologico(c, cult, Date.now())
            : getDias(c.fecha);
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


// Obtener coordenadas de la instalación activa (sin valor por defecto geográfico)
function getCoordsActivas() {
  const cfg = state.configTorre || {};
  const gl = parseFloat(cfg.meteoGeoLat);
  const glo = parseFloat(cfg.meteoGeoLon);
  if (isFinite(gl) && isFinite(glo)) {
    return { lat: gl, lon: glo };
  }
  const lat = parseFloat(cfg.lat);
  const lon = parseFloat(cfg.lon);
  if (isFinite(lat) && isFinite(lon)) {
    return { lat, lon };
  }
  const sl = parseFloat(setupCoordenadas && setupCoordenadas.lat);
  const so = parseFloat(setupCoordenadas && setupCoordenadas.lon);
  if (isFinite(sl) && isFinite(so)) {
    return { lat: sl, lon: so };
  }
  return { lat: null, lon: null };
}

function tieneCoordsActivas() {
  const g = getCoordsActivas();
  return !!(g && Number.isFinite(g.lat) && Number.isFinite(g.lon));
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
  try {
    riegoActualizarPanelSombraCultivos();
  } catch (_) {}
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
      const cultivo = getCultivoDB(c.variedad);
      const dias =
        typeof getDiasEfectivosCicloRiego === 'function'
          ? getDiasEfectivosCicloRiego(c, cultivo, Date.now())
          : typeof getDiasEfectivosCicloBiologico === 'function'
            ? getDiasEfectivosCicloBiologico(c, cultivo, Date.now())
            : getDias(c.fecha);
      const diasBase = cultivo?.dias || 45;
      const diasTotal =
        typeof torreGetDiasCosechaObjetivo === 'function'
          ? torreGetDiasCosechaObjetivo(diasBase, state.configTorre || {})
          : diasBase;
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
function riegoAjustesToldoActivos(uvMax, et0Day, toldoActivo, tipoSombra, edadSemManual, climaOpts) {
  if (!toldoActivo) {
    return {
      uvEfectivo: uvMax,
      et0Efectivo: et0Day,
      deltaTempZonaPlanta: 0,
      tipoSombra: null,
      sombraPct: 0,
    };
  }
  const tipo = riegoGetTipoSombraEfectivo(edadSemManual, climaOpts) || riegoNormalizarTipoSombra(tipoSombra);
  const perf = RIEGO_SOMBRA_PERFILES[tipo] || RIEGO_SOMBRA_PERFILES.media;
  const uvEfectivo = Math.max(0, Math.round(uvMax * perf.uvRest * 100) / 100);
  let et0Efectivo = et0Day;
  if (et0Day != null && typeof et0Day === 'number' && et0Day > 0) {
    et0Efectivo = Math.round(et0Day * perf.et0Rest * 100) / 100;
  }
  return {
    uvEfectivo,
    et0Efectivo,
    deltaTempZonaPlanta: perf.dTemp,
    tipoSombra: tipo,
    sombraPct: perf.pct,
    sombraLabel: perf.label,
  };
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

/**
 * Máx. días en torre (sin marcar origen) para inferir plug de vivero en Kc/riego.
 * No aplica a lechugas/asiáticas (muchas se siembran en el sistema).
 */
const RIEGO_LIMITE_INFERIR_VIVERO_POR_GRUPO = {
  frutos: 42,
  fresas: 42,
  hojas: 34,
  hierbas: 38,
  raices: 30,
};

/**
 * Días de ciclo para Kc de riego: vivero en ficha, o estimación si el origen no se rellenó
 * (misma idea que EC/pH; ver cultivos-db HC_DIAS_VIVERO_*).
 */
function getDiasEfectivosCicloRiego(cesta, cultivo, refFinMs) {
  if (!cesta || !cesta.fecha) return 0;
  const fin = Number.isFinite(refFinMs) ? refFinMs : Date.now();
  let dias = 0;
  if (typeof getDiasEfectivosCicloBiologico === 'function') {
    dias = getDiasEfectivosCicloBiologico(cesta, cultivo, fin);
  } else if (typeof getDias === 'function') {
    dias = getDias(cesta.fecha);
  }
  const origen =
    typeof normalizarOrigenPlanta === 'function'
      ? normalizarOrigenPlanta(cesta.origenPlanta)
      : '';
  if (origen === 'vivero') return dias;
  if (origen === 'germinacion') return dias;
  const ms = new Date(cesta.fecha).getTime();
  const soloTorre = Number.isFinite(ms)
    ? Math.max(0, Math.floor((fin - ms) / 86400000))
    : dias;
  if (dias > soloTorre) return dias;
  const offset =
    typeof getDiasPlantonViveroEstimado === 'function'
      ? getDiasPlantonViveroEstimado(cultivo)
      : 0;
  const g = cultivo && cultivo.grupo;
  const lim = g && RIEGO_LIMITE_INFERIR_VIVERO_POR_GRUPO[g];
  if (offset > 0 && lim && soloTorre <= lim) {
    return soloTorre + offset;
  }
  return dias;
}

/** Avance del ciclo 0–1+ (trasplante → cosecha) por planta */
function riegoPctCicloPlanta(cesta, edadSemManual) {
  const cult = getCultivoDB(cesta.variedad) || { dias: 45, grupo: 'lechugas' };
  const diasBase = cult.dias || 45;
  const diasTot = typeof torreGetDiasCosechaObjetivo === 'function'
    ? torreGetDiasCosechaObjetivo(diasBase, state.configTorre || {})
    : Math.max(18, diasBase);
  const s = Math.max(0.05, Math.min(24, Number(edadSemManual) || 4));
  let pct;
  if (cestaTieneFechaValida(cesta.fecha)) {
    const dias =
      typeof getDiasEfectivosCicloRiego === 'function'
        ? getDiasEfectivosCicloRiego(cesta, cult, Date.now())
        : getDias(cesta.fecha);
    pct = dias / diasTot;
  } else {
    pct = (s * 7) / diasTot;
  }
  return Math.max(0, Math.min(1.2, pct));
}

/** Texto breve de edad/Kc usados en riego (diagnóstico en pestaña Riego). */
function riegoResumenEdadKcTorre(edadSemManual) {
  let n = 0;
  let minD = Infinity;
  let maxD = 0;
  let sinOrigenVivero = 0;
  let conInferencia = 0;
  getNivelesActivos().forEach(nv => {
    (state.torre[nv] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      const cult = getCultivoDB(c.variedad);
      const solo =
        typeof getDias === 'function' ? getDias(c.fecha) : 0;
      const eff = getDiasEfectivosCicloRiego(c, cult, Date.now());
      n++;
      if (eff < minD) minD = eff;
      if (eff > maxD) maxD = eff;
      const origen =
        typeof normalizarOrigenPlanta === 'function'
          ? normalizarOrigenPlanta(c.origenPlanta)
          : '';
      const g = cult && cult.grupo;
      const lim = g && RIEGO_LIMITE_INFERIR_VIVERO_POR_GRUPO[g];
      if (lim && origen !== 'vivero' && origen !== 'germinacion' && eff > solo) {
        conInferencia++;
        if (!origen) sinOrigenVivero++;
      }
    });
  });
  if (n === 0) return null;
  const { kc } = calcularKcMedioRiego(edadSemManual);
  const fase = typeof riegoFaseCultivoLabel === 'function'
    ? riegoFaseCultivoLabel(edadSemManual)
    : '';
  return {
    n,
    minD: Number.isFinite(minD) ? minD : 0,
    maxD,
    kc,
    fase,
    conInferencia,
    sinOrigenVivero,
  };
}

/**
 * Ajuste fino por variedad (1.0 = solo grupo + fase).
 * Referencias orientativas: FAO-56 Kc por etapa; Ohio State / UGA hidroponía
 * (tomate y pepino Kc mediados-altos y sensibles a déficit en floración);
 * lechuga Kc menor; hierbas mediterráneas más secas; berros y acuáticas más hídricas.
 */
const RIEGO_KC_MULT_VARIEDAD = {
  berros: 1.12,
  lechuga_agua: 1.1,
  rucula: 1.04,
  iceberg: 1.03,
  espinaca: 0.94,
  acelga: 1.02,
  col_rizada: 1.02,
  tomate: 1.05,
  tomate_cherry: 1.04,
  tomate_colgar: 1.04,
  pimiento: 1.04,
  pimiento_picante: 1.05,
  pepino: 1.1,
  pepino_largo: 1.1,
  pepino_corto: 1.08,
  pepino_mini: 1.06,
  calabacin: 1.06,
  fresa: 1.1,
  freson: 1.08,
  albahaca: 1.08,
  menta: 1.1,
  cilantro: 1.06,
  cebollino: 1.02,
  eneldo: 1.0,
  perejil: 0.96,
  romero: 0.8,
  tomillo: 0.82,
  oregano: 0.84,
  lavanda: 0.78,
  zanahoria: 0.88,
  rabano: 0.92,
  microgreens_mezcla: 0.58,
  girasol_micro: 0.56,
};

/** Multiplicador Kc por fase fenológica (catálogo con `fases`) */
const RIEGO_KC_MULT_FASE = {
  germinacion: 0.9,
  plantula: 0.93,
  vegetativo: 1.0,
  prefloracion: 1.04,
  floracion: 1.08,
  fructificacion: 1.1,
};

/**
 * Kc operativo (FAO-56 simplificado): tramos inicio / desarrollo / mediados / final
 * sobre hortaliza de hoja de referencia; grupo, variedad y fase fenológica.
 */
function riegoKcOperativo(pct, cultivo, cesta) {
  const cult = cultivo || { grupo: 'lechugas' };
  const g = cult.grupo || 'lechugas';
  const p = Math.max(0, Math.min(1.2, Number(pct) || 0));
  let k;
  if (p < 0.12) k = 0.32 + (p / 0.12) * (0.62 - 0.32);
  else if (p < 0.35) k = 0.62 + ((p - 0.12) / 0.23) * (0.95 - 0.62);
  else if (p < 0.85) k = 0.95 + ((p - 0.35) / 0.5) * (1.06 - 0.95);
  else k = 1.06 - Math.min(0.22, ((p - 0.85) / 0.2) * 0.22);
  k = Math.max(0.3, Math.min(1.1, k));
  const multGrupo = {
    lechugas: 1.0,
    hojas: 1.03,
    asiaticas: 0.98,
    hierbas: 0.86,
    frutos: 1.18,
    fresas: 1.1,
    raices: 0.78,
    microgreens: 0.62,
    otros: 0.94,
  };
  k *= multGrupo[g] ?? 1;
  const id = cult.id;
  if (id && RIEGO_KC_MULT_VARIEDAD[id] != null) {
    k *= RIEGO_KC_MULT_VARIEDAD[id];
  }
  let faseKey = null;
  if (
    cesta &&
    cult.fases &&
    typeof cultivoFaseDesdeDias === 'function' &&
    typeof getDiasEfectivosCicloRiego === 'function'
  ) {
    const diasEff = getDiasEfectivosCicloRiego(cesta, cult, Date.now());
    const fd = cultivoFaseDesdeDias(cult, diasEff, { desdeTrasplante: true });
    if (fd && fd.key) {
      faseKey = fd.key;
      const mf = RIEGO_KC_MULT_FASE[faseKey];
      if (mf != null) k *= mf;
    }
  }
  const maxK =
    faseKey && (faseKey === 'floracion' || faseKey === 'fructificacion') &&
    (g === 'frutos' || g === 'fresas')
      ? 1.42
      : 1.35;
  return Math.max(0.28, Math.min(maxK, k));
}

/**
 * Refuerzo suave del índice de demanda si hay frutos/fresas en prefloración o más
 * (floración = mayor transpiración y sensibilidad al déficit en hidroponía).
 */
function riegoMultDemandaFaseFenologicaTorre() {
  let mult = 1;
  getNivelesActivos().forEach(nv => {
    (state.torre[nv] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      const cult = getCultivoDB(c.variedad);
      if (!cult || !cult.fases || typeof cultivoFaseDesdeDias !== 'function') return;
      const g = cult.grupo;
      if (g !== 'frutos' && g !== 'fresas') return;
      const dias = getDiasEfectivosCicloRiego(c, cult, Date.now());
      const fd = cultivoFaseDesdeDias(cult, dias, { desdeTrasplante: true });
      if (!fd || !fd.key) return;
      if (fd.key === 'prefloracion') mult = Math.max(mult, 1.02);
      if (fd.key === 'floracion') mult = Math.max(mult, 1.05);
      if (fd.key === 'fructificacion') mult = Math.max(mult, 1.06);
    });
  });
  return mult;
}

/** Compatibilidad: solo grupo, sin ficha */
function riegoKcDesdePctYGrupo(pct, grupo) {
  return riegoKcOperativo(pct, { grupo: grupo || 'lechugas' }, null);
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
      sum += riegoKcOperativo(pct, cult, c);
      n++;
    });
  });
  const s = Math.max(0.05, Math.min(24, Number(edadSemManual) || 4));
  if (n === 0) {
    const pct = Math.max(0, Math.min(1.15, (s * 7) / 45));
    const kc = riegoKcOperativo(pct, { grupo: 'lechugas' }, null);
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

