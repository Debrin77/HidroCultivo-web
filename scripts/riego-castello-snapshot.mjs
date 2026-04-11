/**
 * Replay simplificado del cálculo torre (exterior, toldo off, sustrato lana, sin Meteoclimatic, sin sensor).
 * Coordenadas Castelló — misma idea que index.html calcularRiego (idx día 0 = hoy).
 */
const lat = 39.9864;
const lon = -0.0495;
const diasForecast = 3;
const idx = 0;
const offsetHoras = 0;
const toldoAct = false;
const esInterior = false;
const tipoRiego = 'torre';
const nPlantas = 21;
const edadSem = 21 / 7; // 21 días → semanas en #riegoEdad
const sustrato = {
  nombre: 'Lana de roca',
  retencion: 0.76,
  onRef: 11.5,
  minOFFRef: 33,
};

const RIEGO_NOC_TEMP_AGUA_REF_C = 19;
const RIEGO_NOC_VIENTO_BAJO_MAX_KMH = 10;
const RIEGO_NOC_VIENTO_MEDIO_MAX_KMH = 18;
const RIEGO_NOC_TEMP_AGUA_PCT_POR_GRADO = 0.007;
const RIEGO_NOC_TEMP_AGUA_F_MIN = 0.94;
const RIEGO_NOC_TEMP_AGUA_F_MAX = 1.06;

function riegoVPDkPa(tempC, rhPct) {
  const T = Math.max(-5, Math.min(50, Number(tempC) || 0));
  const rh = Math.max(5, Math.min(100, Number(rhPct) || 50));
  const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
  return Math.round(es * (1 - rh / 100) * 1000) / 1000;
}

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
  const et0 = params.et0DayMm;
  if (et0 != null && et0 > 0.05) {
    const r = et0 / 4.6;
    d *= Math.max(0.9, Math.min(1.14, 0.8 + 0.2 * Math.min(1.65, r)));
  }
  return Math.max(0.48, Math.min(1.58, d));
}

function riegoAjusteClimaPorSustrato(params) {
  const ret = Math.max(0.2, Math.min(0.85, Number(params.retencion) || 0.5));
  const rh = Math.max(20, Math.min(100, Number(params.humMediaPct) || 55));
  const prob = Math.max(0, Math.min(100, Number(params.probLluviaPct) || 0));
  const uv = Math.max(0, Math.min(12, Number(params.uvIdx) || 0));
  const vpd = Math.max(0.05, Math.min(2.3, Number(params.vpdKpa) || 0.6));
  const et0 = Number.isFinite(Number(params.et0DayMm)) ? Number(params.et0DayMm) : null;
  const humExceso = Math.max(0, rh - 72) / 28;
  const lluviaExceso = Math.max(0, prob - 50) / 50;
  const penalHumedad = (0.045 + ret * 0.095) * humExceso;
  const penalLluvia = (0.02 + ret * 0.07) * lluviaExceso;
  const seco = Math.max(0, vpd - 1.0) / 1.2;
  const radiativo = Math.max(0, uv - 5) / 5;
  const et0Seco = et0 != null ? Math.max(0, et0 - 4.2) / 3.0 : 0;
  const bajaRet = Math.max(0, 0.62 - ret) / 0.42;
  const extraSeco = (0.02 + bajaRet * 0.055) * Math.min(1.15, seco + radiativo * 0.45 + et0Seco * 0.55);
  const mult = 1 - penalHumedad - penalLluvia + extraSeco;
  return Math.max(0.88, Math.min(1.1, mult));
}

function riegoMargenSeguridadDinamico(params) {
  const ret = Math.max(0.2, Math.min(0.85, Number(params.retencion) || 0.5));
  const vpd = Math.max(0.05, Math.min(2.5, Number(params.vpdKpa) || 0.6));
  const viento = Math.max(0, Math.min(55, Number(params.vientoKmh) || 0));
  const uv = Math.max(0, Math.min(12, Number(params.uvIdx) || 0));
  const et0 = Number.isFinite(Number(params.et0DayMm)) ? Number(params.et0DayMm) : 0;
  const prob = Math.max(0, Math.min(100, Number(params.probLluviaPct) || 0));
  const faseMult = Math.max(0.8, Math.min(1.1, Number(params.faseMult) || 1));
  const tramo = params.tramo === 'noche' ? 'noche' : 'dia';
  const riesgoSeco =
    Math.max(0, (vpd - 1.0) / 1.2) * 0.45 +
    Math.max(0, (uv - 5) / 5) * 0.25 +
    Math.max(0, (viento - 14) / 22) * 0.2 +
    Math.max(0, (et0 - 4.4) / 3.4) * 0.1;
  const frenoLluvia = Math.max(0, (prob - 70) / 30) * 0.6;
  const riesgoNeto = Math.max(0, riesgoSeco * (1 - frenoLluvia));
  const factorRetBaja = Math.max(0, 0.64 - ret) / 0.44;
  const base = tramo === 'noche' ? 0.004 : 0.006;
  const amplitud = tramo === 'noche' ? 0.015 : 0.03;
  const extra = base + (0.35 + 0.65 * factorRetBaja) * Math.min(1.05, riesgoNeto) * amplitud;
  const faseFactor = tramo === 'noche' ? Math.min(1, Math.max(0.88, faseMult)) : Math.min(1.02, Math.max(0.9, faseMult));
  const mult = 1 + extra * faseFactor;
  return Math.max(tramo === 'noche' ? 1.0 : 1.002, Math.min(tramo === 'noche' ? 1.018 : 1.038, mult));
}

function riegoAjustesToldoActivos(uvMax, et0Day, toldoActivo) {
  if (!toldoActivo) return { uvEfectivo: uvMax, et0Efectivo: et0Day, deltaTempZonaPlanta: 0 };
  const uvEfectivo = Math.max(0, Math.round(uvMax * 0.38 * 100) / 100);
  let et0Efectivo = et0Day;
  if (et0Day != null && typeof et0Day === 'number' && et0Day > 0) {
    et0Efectivo = Math.round(et0Day * 0.52 * 100) / 100;
  }
  return { uvEfectivo, et0Efectivo, deltaTempZonaPlanta: -2 };
}

function riegoHourlyIndicesPorFecha(timesIso, ymd) {
  if (!ymd || !Array.isArray(timesIso) || timesIso.length === 0) return null;
  const out = [];
  for (let i = 0; i < timesIso.length; i++) {
    if (String(timesIso[i]).slice(0, 10) === ymd) out.push(i);
  }
  return out.length ? out : null;
}

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
  return parseV(daily.uv_index_max[idxFallback]);
}

function riegoMediaDeIndices(arr, indices) {
  if (!Array.isArray(arr) || !indices || indices.length === 0) return NaN;
  let s = 0, n = 0;
  for (const i of indices) {
    const v = arr[i];
    if (typeof v === 'number' && Number.isFinite(v)) {
      s += v;
      n++;
    }
  }
  return n > 0 ? s / n : NaN;
}

function riegoVentanaMediodiaDinamica(dayIndices, timesIso, tempArr, rhArr, uvIdx, et0DayMm) {
  const fallback = { indices: [], hIni: 11, hFin: 15 };
  if (!dayIndices || !timesIso || !Array.isArray(dayIndices) || dayIndices.length === 0) return fallback;
  if (!Array.isArray(tempArr) || !Array.isArray(rhArr)) return fallback;
  let mejor = null;
  const uvF = Math.max(0, Math.min(0.24, ((Number(uvIdx) || 0) - 3) * 0.028));
  const et0F =
    et0DayMm != null && Number.isFinite(Number(et0DayMm))
      ? Math.max(0, Math.min(0.18, (Number(et0DayMm) - 3.6) * 0.045))
      : 0;
  for (let hIni = 10; hIni <= 14; hIni++) {
    const hFin = hIni + 3;
    const idxW = dayIndices.filter((i) => {
      const h = parseInt(String(timesIso[i]).slice(11, 13), 10);
      return Number.isFinite(h) && h >= hIni && h <= hFin;
    });
    if (idxW.length < 3) continue;
    const tM = riegoMediaDeIndices(tempArr, idxW);
    const hM = riegoMediaDeIndices(rhArr, idxW);
    if (!Number.isFinite(tM) || !Number.isFinite(hM)) continue;
    const vpdM = riegoVPDkPa(tM, hM);
    const termT = Math.max(0, (tM - 24) * 0.025);
    const score = vpdM * 0.72 + termT + uvF + et0F;
    if (!mejor || score > mejor.score) mejor = { indices: idxW, hIni, hFin, score };
  }
  return mejor ? { indices: mejor.indices, hIni: mejor.hIni, hFin: mejor.hFin } : fallback;
}

function riegoIndicesNocturnosPorIso(dayIndices, timesIso) {
  if (!dayIndices || !timesIso) return [];
  return dayIndices.filter((i) => {
    const h = parseInt(String(timesIso[i]).slice(11, 13), 10);
    return Number.isFinite(h) && (h >= 21 || h <= 6);
  });
}

function riegoKcDesdePctYGrupo(pct, grupo) {
  const g = grupo || 'lechugas';
  let k;
  if (pct < 0.12) k = 0.32 + (pct / 0.12) * (0.62 - 0.32);
  else if (pct < 0.35) k = 0.62 + ((pct - 0.12) / 0.23) * (0.95 - 0.62);
  else if (pct < 0.85) k = 0.95 + ((pct - 0.35) / 0.5) * (1.06 - 0.95);
  else k = 1.06 - Math.min(0.22, ((pct - 0.85) / 0.2) * 0.22);
  k = Math.max(0.3, Math.min(1.1, k));
  const mult = {
    lechugas: 1.0,
    hojas: 1.02,
    asiaticas: 0.98,
    hierbas: 0.84,
    frutos: 1.16,
    fresas: 1.06,
    raices: 0.76,
    microgreens: 0.64,
    otros: 0.94,
  };
  k *= mult[g] ?? 1;
  return Math.max(0.28, Math.min(1.32, k));
}

function riegoPctCicloMedioTorreFallback(edadSemManual) {
  const s = Math.max(0.05, Math.min(24, Number(edadSemManual) || 4));
  return Math.max(0, Math.min(1.15, (s * 7) / 45));
}

function riegoFaseDesdePctCiclo(pct) {
  const p = Math.max(0, Math.min(1.2, pct));
  if (p < 0.12) return 'propagacion';
  if (p < 0.35) return 'vegetativo';
  if (p < 0.85) return 'produccion';
  return 'cierre';
}

const RIEGO_FASE_CULTIVO = {
  propagacion: { mult: 0.84 },
  vegetativo: { mult: 0.94 },
  produccion: { mult: 1.0 },
  cierre: { mult: 0.97 },
};

function riegoMinutosDesdeDemanda(demanda, nPlantas, kc, sustratoIn, esInteriorIn) {
  const { onRef, minOFFRef, retencion } = sustratoIn;
  const k = Math.max(0.28, Math.min(1.35, kc));
  const carga = Math.max(0.35, Math.min(1.35, nPlantas / 15)) * k;
  const sPulso = 0.9 + retencion * 0.16;
  const raizDem = Math.sqrt(demanda);
  let minON = onRef * carga * sPulso * (0.78 + 0.38 * raizDem);
  let minOFF = minOFFRef * (1.48 - 0.48 * raizDem) * (0.88 + retencion * 0.2);
  if (esInteriorIn) {
    minOFF *= 1.06;
    minON *= 0.94;
  }
  return {
    minON: Math.max(3, Math.round(minON)),
    minOFF: Math.max(5, Math.round(minOFF)),
  };
}

function riegoIndiceDemandaNocturna(params) {
  const vpd = Math.max(0.05, Math.min(2.2, params.vpdKpa || 0.35));
  const viento = Math.max(0, params.vientoKmh || 0);
  const probLluvia = Math.max(0, Math.min(100, params.probLluvia ?? 0));
  const tempMin = Number(params.tempMin);
  let d = 0.38 + vpd * 0.42;
  if (Number.isFinite(tempMin)) {
    if (tempMin >= 18) d *= 1.02 + Math.min(0.14, (tempMin - 18) * 0.009);
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
  d *= 0.93;
  return Math.max(0.36, Math.min(1.08, d));
}

function riegoNocFactorOxigenacionRadicular(retencion) {
  const r = Math.max(0.2, Math.min(0.85, Number(retencion) || 0.5));
  return Math.max(0.82, Math.min(0.95, 0.92 - (r - 0.28) * 0.065));
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
    for (const j of nightIdx) {
      const v = windArr[j];
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

function riegoNocClampModeloACorredor(minON, minOFF, env) {
  const on = Math.min(env.onMax, Math.max(env.onMin, minON));
  const off = Math.min(env.offMax, Math.max(env.offMin, minOFF));
  return {
    minON: Math.max(3, Math.min(5, Math.round(on))),
    minOFF: Math.max(45, Math.round(off)),
  };
}

function riegoFactorDemandaNocPorTempAgua(tempAguaC) {
  const t = Number(tempAguaC);
  if (!Number.isFinite(t)) return 1;
  const delta = (t - RIEGO_NOC_TEMP_AGUA_REF_C) * RIEGO_NOC_TEMP_AGUA_PCT_POR_GRADO;
  return Math.max(RIEGO_NOC_TEMP_AGUA_F_MIN, Math.min(RIEGO_NOC_TEMP_AGUA_F_MAX, 1 + delta));
}

function riegoNocDemandaMin1Ciclo(tempMinDiaria) {
  const t = Number(tempMinDiaria);
  if (!Number.isFinite(t)) return 0.468;
  if (t <= 8) return 0.428;
  if (t <= 14) return 0.448;
  if (t <= 20) return 0.472;
  if (t <= 26) return 0.498;
  return 0.512;
}

const urlECMWF =
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  '&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max,precipitation_sum' +
  '&hourly=relative_humidity_2m,temperature_2m,wind_speed_10m' +
  `&forecast_days=${diasForecast}&timezone=auto`;
const urlUV =
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  '&daily=uv_index_max&forecast_days=7&timezone=auto';
const urlET0 =
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  '&hourly=et0_fao_evapotranspiration' +
  `&forecast_days=${diasForecast}&timezone=auto`;

const [data, dataUV, dEt0] = await Promise.all([
  fetch(urlECMWF).then((r) => r.json()),
  fetch(urlUV).then((r) => r.json()),
  fetch(urlET0).then((r) => r.json()),
]);

const daily = data.daily;
const tempMax = daily.temperature_2m_max[idx];
const tempMin = daily.temperature_2m_min[idx];
const tempMedia = (tempMax + tempMin) / 2;
const viento = daily.wind_speed_10m_max[idx];
const probLluvia = Number(daily.precipitation_probability_max[idx]) || 0;
const dailyDateStr = String(daily.time[idx]).slice(0, 10);
const uvMax = riegoUvMaxAlineado(dataUV, dailyDateStr, idx) ?? 0;

const times = data.hourly.time;
const rhArr = data.hourly.relative_humidity_2m;
const tempHArr = data.hourly.temperature_2m;
const windHArr = data.hourly.wind_speed_10m;

let etArrHourly = dEt0.hourly?.et0_fao_evapotranspiration || null;
let etTimesHourly = dEt0.hourly?.time || null;

let dayHourIdx = riegoHourlyIndicesPorFecha(times, dailyDateStr);
if (!dayHourIdx && rhArr.length >= 24) {
  dayHourIdx = [];
  for (let k = 0; k < 24; k++) dayHourIdx.push(offsetHoras + k);
}

const hm = riegoMediaDeIndices(rhArr, dayHourIdx);
const humMedia = Number.isFinite(hm) ? Math.round(hm) : 55;
const winMed = riegoVentanaMediodiaDinamica(dayHourIdx, times, tempHArr, rhArr, uvMax, null);
const midI = winMed.indices;
const medHIni = winMed.hIni;
const medHFin = winMed.hFin;
let temp1315;
let hum1315;
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

let etIdx = riegoHourlyIndicesPorFecha(etTimesHourly, dailyDateStr);
if (!etIdx && etArrHourly.length >= 24) {
  etIdx = [];
  for (let k = 0; k < 24; k++) etIdx.push(k);
}
let et0Day = null;
let et0NightSum = null;
if (etIdx && etIdx.length) {
  et0Day = etIdx.reduce((a, i) => a + (typeof etArrHourly[i] === 'number' ? etArrHourly[i] : 0), 0);
  const nightEtI = riegoIndicesNocturnosPorIso(etIdx, etTimesHourly);
  if (nightEtI.length) {
    et0NightSum =
      Math.round(nightEtI.reduce((a, i) => a + (typeof etArrHourly[i] === 'number' ? etArrHourly[i] : 0), 0) * 1000) /
      1000;
  }
}

const adjToldo = riegoAjustesToldoActivos(uvMax, et0Day, toldoAct);
const uvEfectivo = adjToldo.uvEfectivo;
const et0Riego = adjToldo.et0Efectivo;
const dTempPlanta = adjToldo.deltaTempZonaPlanta;

const vpd = riegoVPDkPa(tempMedia + dTempPlanta, humMedia);
const deltaTMedio = uvEfectivo >= 6 ? 1.2 : uvEfectivo >= 4 ? 0.7 : uvEfectivo >= 3 ? 0.35 : 0;
const vpdMediodia = riegoVPDkPa(temp1315 + dTempPlanta + deltaTMedio, hum1315);

const pctMedio = riegoPctCicloMedioTorreFallback(edadSem);
const kcMedio = Math.round(riegoKcDesdePctYGrupo(pctMedio, 'lechugas') * 1000) / 1000;
const faseKey = riegoFaseDesdePctCiclo(pctMedio);
const multFase = RIEGO_FASE_CULTIVO[faseKey].mult;

let demandaDia = riegoIndiceDemanda({
  vpdKpa: vpd,
  vientoKmh: viento,
  uvIdx: uvEfectivo,
  toldo: toldoAct,
  probLluvia,
  et0DayMm: et0Riego,
});
demandaDia *= riegoAjusteClimaPorSustrato({
  retencion: sustrato.retencion,
  humMediaPct: humMedia,
  probLluviaPct: probLluvia,
  uvIdx: uvEfectivo,
  vpdKpa: vpd,
  et0DayMm: et0Riego,
});
demandaDia *= riegoMargenSeguridadDinamico({
  tramo: 'dia',
  retencion: sustrato.retencion,
  vpdKpa: vpd,
  vientoKmh: viento,
  uvIdx: uvEfectivo,
  et0DayMm: et0Riego,
  probLluviaPct: probLluvia,
  faseMult: multFase,
});
demandaDia = Math.max(0.48, Math.min(1.58, demandaDia * multFase));

const ciclo = riegoMinutosDesdeDemanda(demandaDia, nPlantas, kcMedio, sustrato, esInterior);
const minON = ciclo.minON;
const minOFF = ciclo.minOFF;
const minCiclo = minON + minOFF;
const ciclos = Math.floor(840 / minCiclo);
const espaciado = Math.round(840 / ciclos);
const totalON = minON * ciclos;
const dutyCicloPct = Math.round((100 * minON) / (minON + minOFF));

let demandaMed = riegoIndiceDemanda({
  vpdKpa: vpdMediodia,
  vientoKmh: viento,
  uvIdx: uvEfectivo,
  toldo: toldoAct,
  probLluvia,
  et0DayMm: et0Riego,
});
demandaMed *= riegoAjusteClimaPorSustrato({
  retencion: sustrato.retencion,
  humMediaPct: humMedia,
  probLluviaPct: probLluvia,
  uvIdx: uvEfectivo,
  vpdKpa: vpdMediodia,
  et0DayMm: et0Riego,
});
demandaMed *= riegoMargenSeguridadDinamico({
  tramo: 'dia',
  retencion: sustrato.retencion,
  vpdKpa: vpdMediodia,
  vientoKmh: viento,
  uvIdx: uvEfectivo,
  et0DayMm: et0Riego,
  probLluviaPct: probLluvia,
  faseMult: multFase,
});
demandaMed = Math.max(0.48, Math.min(1.58, demandaMed * multFase));

const cicloMed = riegoMinutosDesdeDemanda(demandaMed, nPlantas, kcMedio, sustrato, esInterior);
const minONMedio = cicloMed.minON;
const minOFFMedio = cicloMed.minOFF;
const durMedMin = (medHFin - medHIni + 1) * 60;
const ciclosMedio = Math.floor(durMedMin / (minONMedio + minOFFMedio));
const totalONMedio = minONMedio * ciclosMedio;
const dutyMedioPct = Math.round((100 * minONMedio) / (minONMedio + minOFFMedio));

const statsNoct = riegoStatsNocturnosFromHourly(dayHourIdx, times, tempHArr, rhArr, windHArr);
const dTNocPlanta = dTempPlanta * 0.38;
let tempNocUse;
let rhNocUse;
let vientoNocKmh;
if (statsNoct) {
  tempNocUse = statsNoct.temp + dTNocPlanta + (toldoAct ? -0.35 : 0);
  rhNocUse = statsNoct.rh;
  vientoNocKmh =
    Number.isFinite(statsNoct.vientoMax) && statsNoct.vientoMax > 0 ? statsNoct.vientoMax : viento * 0.62;
} else {
  tempNocUse = tempMin + dTNocPlanta + 0.6 + (toldoAct ? -0.35 : 0);
  rhNocUse = Math.min(94, humMedia + 9);
  vientoNocKmh = viento * 0.55;
}
const vpdNocVal = riegoVPDkPa(tempNocUse, rhNocUse);
let demandaNoc =
  riegoIndiceDemandaNocturna({
    vpdKpa: vpdNocVal,
    vientoKmh: vientoNocKmh,
    tempMin,
    probLluvia,
    et0NightMm: et0NightSum,
    toldo: toldoAct,
  }) * multFase;
demandaNoc *= riegoAjusteClimaPorSustrato({
  retencion: sustrato.retencion,
  humMediaPct: rhNocUse,
  probLluviaPct: probLluvia,
  uvIdx: 0,
  vpdKpa: vpdNocVal,
  et0DayMm: et0NightSum,
});
demandaNoc *= riegoMargenSeguridadDinamico({
  tramo: 'noche',
  retencion: sustrato.retencion,
  vpdKpa: vpdNocVal,
  vientoKmh: vientoNocKmh,
  uvIdx: 0,
  et0DayMm: et0NightSum != null ? et0NightSum * 11 : 0,
  probLluviaPct: probLluvia,
  faseMult: multFase,
});
demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc));
const tempAguaNocUse = RIEGO_NOC_TEMP_AGUA_REF_C;
demandaNoc *= riegoFactorDemandaNocPorTempAgua(tempAguaNocUse);
demandaNoc = Math.max(0.38, Math.min(1.12, demandaNoc));

const omitNoc = riegoTorreExteriorOmiteNocturnoPorClima({
  tempMin,
  tempNoc: tempNocUse,
  rhNoc: rhNocUse,
  vpdNoc: vpdNocVal,
});
const nocSkip = omitNoc.omit;

const kcNoc = Math.max(0.25, Math.min(0.48, kcMedio * 0.36));
const demandaNocPulsos = demandaNoc * riegoNocFactorOxigenacionRadicular(sustrato.retencion);
const cicloNoc0 = riegoMinutosDesdeDemanda(demandaNocPulsos, nPlantas, kcNoc, sustrato, esInterior);
let minONNoc = Math.min(4, Math.max(3, cicloNoc0.minON));
let minOFFNoc = Math.max(42, Math.round(cicloNoc0.minOFF * (1.1 + sustrato.retencion * 0.07)));
const envN = riegoNocCorredorTablaTorre(tempNocUse, rhNocUse, vientoNocKmh);
const clN = riegoNocClampModeloACorredor(minONNoc, minOFFNoc, envN);
minONNoc = clN.minON;
minOFFNoc = clN.minOFF;
let minCicloNoc = minONNoc + minOFFNoc;
let ciclosNoc = nocSkip ? 0 : Math.floor(600 / minCicloNoc);
ciclosNoc = Math.min(8, Math.max(0, ciclosNoc));
if (!nocSkip && ciclosNoc === 0 && minCicloNoc <= 600 && demandaNoc >= riegoNocDemandaMin1Ciclo(tempMin)) {
  ciclosNoc = 1;
}
const totalONNoc = minONNoc * ciclosNoc;
const espNoc = ciclosNoc > 0 ? Math.round(600 / ciclosNoc) : 0;
const dutyNocPct = ciclosNoc > 0 ? Math.round((100 * minONNoc) / minCicloNoc) : null;

console.log(JSON.stringify({
  fechaModelo: dailyDateStr,
  lugar: 'Castelló de la Plana (Open-Meteo)',
  tempMinC: tempMin,
  tempMaxC: tempMax,
  humMediaPct: humMedia,
  vientoMaxKmh: viento,
  probLluviaPct: probLluvia,
  uvIndexMax: uvMax,
  et0DayMm: et0Riego != null ? Math.round(et0Riego * 100) / 100 : null,
  vpdDiaKpa: vpd,
  vpdMediodiaKpa: Math.round(vpdMediodia * 100) / 100,
  ventanaSolarH: `${medHIni}-${medHFin}`,
  demandaDia: Math.round(demandaDia * 1000) / 1000,
  demandaMediodia: Math.round(demandaMed * 1000) / 1000,
  kcMedio,
  faseRiego: faseKey,
  multFase,
  sustrato: sustrato.nombre,
  nPlantas,
  edadSem,
  programaGeneral14h: { minON, minOFF, ciclosEn14h: ciclos, minutosBomba14h: totalON, espaciadoMin: espaciado, dutyPct: dutyCicloPct },
  programaMediodia4h: { minON: minONMedio, minOFF: minOFFMedio, ciclos: ciclosMedio, minutosBomba: totalONMedio, dutyPct: dutyMedioPct },
  noche21a07: nocSkip
    ? { omitido: true, motivo: omitNoc.clave }
    : { minON: minONNoc, minOFF: minOFFNoc, ciclos: ciclosNoc, minutosBomba: totalONNoc, espaciadoMin: espNoc, dutyPct: dutyNocPct, tempNocC: Math.round(tempNocUse * 10) / 10, rhNocPct: Math.round(rhNocUse), vientoNocKmh: Math.round(vientoNocKmh * 10) / 10 },
}, null, 2));
