/**
 * Auditoría riego: 6 tomates torre, Castellón, trasplante 2026-05-03
 */
const LAT = 39.9863;
const LON = -0.0513;
const TRASPLANTE = '2026-05-03';
const HOY = '2026-05-19';

const HC_DIAS_VIVERO = { tomate_cherry: 28, tomate_colgar: 30 };
const CONFIG_SUSTRATO = {
  esponja: { retencion: 0.5, onRef: 10, minOFFRef: 24 },
  lana: { retencion: 0.76, onRef: 11.5, minOFFRef: 33 },
  coco: { retencion: 0.65, onRef: 10.9, minOFFRef: 29 },
};
const RIEGO_FASE = {
  propagacion: 0.84,
  vegetativo: 0.94,
  produccion: 1.0,
  cierre: 0.97,
};

function diasDesde(fecha, ref) {
  return Math.floor((new Date(ref).getTime() - new Date(fecha).getTime()) / 86400000);
}

function riegoVPDkPa(T, RH) {
  const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
  const ea = (RH / 100) * es;
  return Math.max(0.01, es - ea);
}

function riegoKcDesdePctYGrupo(pct, grupo) {
  let k;
  if (pct < 0.12) k = 0.32 + (pct / 0.12) * (0.62 - 0.32);
  else if (pct < 0.35) k = 0.62 + ((pct - 0.12) / 0.23) * (0.95 - 0.62);
  else if (pct < 0.85) k = 0.95 + ((pct - 0.35) / 0.5) * (1.06 - 0.95);
  else k = 1.06 - Math.min(0.22, ((pct - 0.85) / 0.2) * 0.22);
  k = Math.max(0.3, Math.min(1.1, k));
  const mult = { frutos: 1.16 };
  k *= mult[grupo] ?? 1;
  return Math.max(0.28, Math.min(1.32, k));
}

function riegoIndiceDemanda({ vpdKpa, vientoKmh, uvIdx, toldo, probLluvia, et0DayMm }) {
  const vpd = Math.max(0.08, Math.min(2.4, vpdKpa || 0.5));
  const viento = Math.max(0, vientoKmh || 0);
  const uv = Math.max(0, uvIdx || 0);
  let d = 0.52 + vpd * 0.48;
  if (viento >= 10) d *= 1 + Math.min(0.22, (viento - 10) * 0.0055);
  if (!toldo && uv >= 3) d *= 1 + Math.min(0.14, (uv - 3) * 0.016);
  if (probLluvia >= 45) d *= 1 - 0.05 * ((probLluvia - 45) / 55);
  const et0 = et0DayMm;
  if (et0 != null && et0 > 0.05) {
    const r = et0 / 4.6;
    d *= Math.max(0.9, Math.min(1.14, 0.8 + 0.2 * Math.min(1.65, r)));
  }
  return Math.max(0.48, Math.min(1.58, d));
}

function riegoMinutosDesdeDemanda(demanda, nPlantas, kc, sustrato) {
  const { onRef, minOFFRef, retencion } = sustrato;
  const k = Math.max(0.28, Math.min(1.35, kc));
  const carga = Math.max(0.35, Math.min(1.35, nPlantas / 15)) * k;
  const sPulso = 0.9 + retencion * 0.16;
  const raizDem = Math.sqrt(demanda);
  let minON = onRef * carga * sPulso * (0.78 + 0.38 * raizDem);
  let minOFF = minOFFRef * (1.48 - 0.48 * raizDem) * (0.88 + retencion * 0.2);
  return {
    minON: Math.max(3, Math.round(minON)),
    minOFF: Math.max(5, Math.round(minOFF)),
    carga: Math.round(carga * 1000) / 1000,
  };
}

function faseDesdePct(pct) {
  if (pct < 0.12) return 'propagacion';
  if (pct < 0.35) return 'vegetativo';
  if (pct < 0.85) return 'produccion';
  return 'cierre';
}

function cultivoFase(cultivo, diasEfectivos) {
  const orden = ['plantula', 'vegetativo', 'prefloracion', 'floracion', 'fructificacion'];
  let acc = 0;
  for (const k of orden) {
    const f = cultivo.fases[k];
    if (!f) continue;
    acc += f.dias;
    if (diasEfectivos <= acc) return k;
  }
  return 'fructificacion';
}

const cultivos = {
  tomate_cherry: {
    dias: 85,
    grupo: 'frutos',
    fases: {
      plantula: { dias: 12 },
      vegetativo: { dias: 24 },
      prefloracion: { dias: 12 },
      floracion: { dias: 14 },
      fructificacion: { dias: 32 },
    },
  },
  tomate_colgar: {
    dias: 95,
    grupo: 'frutos',
    fases: {
      plantula: { dias: 14 },
      vegetativo: { dias: 28 },
      prefloracion: { dias: 14 },
      floracion: { dias: 16 },
      fructificacion: { dias: 42 },
    },
  },
};

const diasTorre = diasDesde(TRASPLANTE, HOY);
console.log('\n=== EDAD Y FASE (trasplante', TRASPLANTE, '→', HOY, '=', diasTorre, 'd en torre) ===\n');

for (const [id, c] of Object.entries(cultivos)) {
  const vivero = HC_DIAS_VIVERO[id];
  const efectivos = diasTorre + vivero;
  const pctApp = efectivos / c.dias;
  const pctBio = efectivos / c.dias;
  const kcApp = riegoKcDesdePctYGrupo(pctApp, c.grupo);
  const kcBio = riegoKcDesdePctYGrupo(pctBio, c.grupo);
  console.log(id + ' (×3):');
  console.log('  Días torre:', diasTorre, '| + vivero', vivero, '→ biológicos', efectivos);
  console.log('  Fase solo días torre (sin vivero):', cultivoFase(c, diasTorre));
  console.log('  Fase con vivero (riego tras fix):', cultivoFase(c, efectivos));
  console.log('  % ciclo riego (vivero+torre):', (pctApp * 100).toFixed(1) + '% → Kc', kcApp.toFixed(3));
  console.log('  % ciclo biológico:', (pctBio * 100).toFixed(1) + '% → Kc esperable', kcBio.toFixed(3));
}

const pctMedioApp =
  (3 * (44 / 85) + 3 * (46 / 95)) / 6;
const kcMedio =
  (3 * riegoKcDesdePctYGrupo(44 / 85, 'frutos') +
    3 * riegoKcDesdePctYGrupo(46 / 95, 'frutos')) /
  6;
const faseRiego = faseDesdePct(pctMedioApp);
const multFase = RIEGO_FASE[faseRiego] ?? 1;
const nPlantas = 6;
const multObjetivo = 1.06;

console.log('\n=== Kc Y FASE RIEGO (como la app hoy) ===');
console.log('  nPlantas:', nPlantas, '(carga ref 15 →', Math.max(0.35, nPlantas / 15).toFixed(2) + ')');
console.log('  Kc medio:', kcMedio.toFixed(3));
console.log('  Fase riego auto:', faseRiego, '×', multFase);
console.log('  Objetivo torre "final": demanda ×', multObjetivo);

// Weather
const url =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  '&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max' +
  '&hourly=relative_humidity_2m,temperature_2m&forecast_days=3&timezone=auto';
const urlUV =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=uv_index_max&forecast_days=7&timezone=auto`;
const urlET0 =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=et0_fao_evapotranspiration&forecast_days=3&timezone=auto`;

const [data, dataUV, dEt0] = await Promise.all([
  fetch(url).then((r) => r.json()),
  fetch(urlUV).then((r) => r.json()),
  fetch(urlET0).then((r) => r.json()),
]);

const daily = data.daily;
const idx = daily.time.indexOf(HOY);
const i = idx >= 0 ? idx : 0;
const ymd = daily.time[i];
const tempMax = daily.temperature_2m_max[i];
const tempMin = daily.temperature_2m_min[i];
const viento = daily.wind_speed_10m_max[i];
const probLluvia = daily.precipitation_probability_max[i];

let uvMax = 7;
if (dataUV.daily) {
  const j = dataUV.daily.time.indexOf(ymd);
  if (j >= 0) uvMax = dataUV.daily.uv_index_max[j] ?? uvMax;
}

const h = data.hourly;
const dayIdx = [];
for (let k = 0; k < h.time.length; k++) {
  if (h.time[k].slice(0, 10) === ymd) dayIdx.push(k);
}
let sT = 0,
  sR = 0,
  sT15 = 0,
  sR15 = 0,
  n15 = 0;
for (const k of dayIdx) {
  sT += h.temperature_2m[k];
  sR += h.relative_humidity_2m[k];
  const hr = parseInt(h.time[k].slice(11, 13), 10);
  if (hr >= 13 && hr <= 15) {
    n15++;
    sT15 += h.temperature_2m[k];
    sR15 += h.relative_humidity_2m[k];
  }
}
const tempMedia = sT / dayIdx.length;
const humMedia = Math.round(sR / dayIdx.length);
const temp1315 = sT15 / n15;
const hum1315 = Math.round(sR15 / n15);

let et0Day = 5;
if (dEt0.hourly) {
  const etTimes = dEt0.hourly.time;
  const etArr = dEt0.hourly.et0_fao_evapotranspiration;
  et0Day = 0;
  for (let k = 0; k < etTimes.length; k++) {
    if (etTimes[k].slice(0, 10) === ymd) et0Day += etArr[k] || 0;
  }
  et0Day = Math.round(et0Day * 100) / 100;
}

const vpd = riegoVPDkPa(tempMedia, humMedia);
const vpdMed = riegoVPDkPa(temp1315, hum1315);

console.log('\n=== CLIMA CASTELLÓN (' + ymd + ') Open-Meteo ===');
console.log('  T máx/mín:', tempMax + ' / ' + tempMin + ' °C');
console.log('  T media día:', tempMedia.toFixed(1) + ' °C | HR media', humMedia + '%');
console.log('  Mediodía 13-15h:', temp1315.toFixed(1) + ' °C, HR', hum1315 + '%');
console.log('  Viento máx:', viento, 'km/h | UV máx:', uvMax, '| ET₀ día:', et0Day, 'mm');
console.log('  VPD día:', vpd.toFixed(2), 'kPa | VPD mediodía:', vpdMed.toFixed(2), 'kPa');

let demandaDia = riegoIndiceDemanda({
  vpdKpa: vpd,
  vientoKmh: viento,
  uvIdx: uvMax,
  toldo: false,
  probLluvia,
  et0DayMm: et0Day,
});
demandaDia *= multFase * multObjetivo;
demandaDia = Math.max(0.48, Math.min(1.58, demandaDia));

let demandaMed = riegoIndiceDemanda({
  vpdKpa: vpdMed,
  vientoKmh: viento,
  uvIdx: uvMax,
  toldo: false,
  probLluvia,
  et0DayMm: et0Day,
});
demandaMed *= multFase * multObjetivo;
demandaMed = Math.max(0.48, Math.min(1.58, demandaMed));

const sustratos = ['esponja', 'lana', 'coco'];
console.log('\n=== PROGRAMA PULSOS (14h día 07-21, torre exterior) ===');
console.log('  Demanda día:', demandaDia.toFixed(2), '| mediodía:', demandaMed.toFixed(2));

for (const sk of sustratos) {
  const s = CONFIG_SUSTRATO[sk];
  const ciclo = riegoMinutosDesdeDemanda(demandaDia, nPlantas, kcMedio, s);
  const cicloMed = riegoMinutosDesdeDemanda(demandaMed, nPlantas, kcMedio, s);
  const minCiclo = ciclo.minON + ciclo.minOFF;
  const ciclos = Math.floor(840 / minCiclo);
  const duty = Math.round((100 * ciclo.minON) / minCiclo);
  console.log('\n  Sustrato:', sk);
  console.log(
    '    Día 07-21: ON',
    ciclo.minON,
    'min / OFF',
    ciclo.minOFF,
    'min →',
    ciclos,
    'pulsos, duty',
    duty + '%'
  );
  console.log(
    '    Mediodía: ON',
    cicloMed.minON,
    'min / OFF',
    cicloMed.minOFF,
    'min'
  );
  console.log(
    '    Noche típica exterior (refresco 30s ×1 si no ola calor): ver app'
  );
}

console.log('\n=== REFERENCIA AGRONÓMICA (mayo, Castellón, tomate joven) ===');
console.log(
  '  Plántula/vegetativo temprano en torre: raíz aún limitada; VPD moderado-alto en mayo.'
);
console.log(
  '  Con 6 plantas y Kc bajo (~0.83): pulsos más cortos y OFF más largos que 15 lechugas adultas.'
);
console.log(
  '  Tras ~16 d en torre + ~28-30 d vivero: biológicamente ~6-7 sem → inicio vegetativo avanzado/prefloración; la app aún trata Kc como "plántula recién trasplantada" si solo cuenta fecha torre.'
);
console.log('');
