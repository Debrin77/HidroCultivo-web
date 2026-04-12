/**
 * Meteorología: caché Open-Meteo, Meteoclimatic, UI de previsión, alerta contextual, coords GPS meteo.
 * Depende del script principal previo: state, saveState, tipoInstalacionNormalizado,
 * refreshMeteoFuenteActivaUI, escHtmlUi (u otros helpers ya definidos).
 * Siguiente: js/riego-calculo.js (getCoordsActivas, calcularRiego). Luego meteo-alarm-app.js (Nominatim / avisos).
 */

// ══════════════════════════════════════════════════
// METEOROLOGÍA — LÓGICA
// ══════════════════════════════════════════════════

const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
let meteoData = null;
let diaSeleccionado = 0;
let _meteoNomiKey = null;
let _meteoNomiContext = '';
let _meteoNomiMunicipio = '';
/** Texto normalizado (provincia, comarca, display_name) para cruzar con zonas MeteoAlarm «… de Provincia». */
let _meteoNomiBlobProvincia = '';
let _meteoalarmListaCache = { ts: 0, key: '', relevantes: null };
let _geocodificarLocalidadMeteoPromise = null;

function invalidateMeteoNomiCache() {
  _meteoNomiKey = null;
  _meteoNomiContext = '';
  _meteoNomiMunicipio = '';
  _meteoNomiBlobProvincia = '';
  _meteoalarmListaCache.ts = 0;
  _meteoalarmListaCache.key = '';
  _meteoalarmListaCache.relevantes = null;
}

function condEmoji(precipProb, tempMax, uv) {
  if (precipProb > 70) return '🌧️';
  if (precipProb > 40) return '🌦️';
  if (uv > 7) return '☀️';
  if (uv > 3) return '⛅';
  if (tempMax < 10) return '🥶';
  return '🌤️';
}

function condTexto(precipProb, tempMax, uv, viento) {
  if (precipProb > 70) return 'Lluvia probable';
  if (precipProb > 40) return 'Chubascos posibles';
  if (viento > 40) return 'Viento fuerte';
  if (uv > 8) return 'Sol intenso';
  if (uv > 5) return 'Bastante soleado';
  if (uv > 2) return 'Parcialmente nublado';
  return 'Nublado';
}

function vpdColor(vpd) {
  if (vpd > 1.6) return 'var(--red)';
  if (vpd > 1.2) return 'var(--orange)';
  if (vpd > 0.8) return 'var(--gold)';
  if (vpd > 0.4) return 'var(--green)';
  return 'var(--blue)';
}

function vpdEstado(vpd) {
  if (vpd > 1.6) return { txt: 'Estrés severo', bg: 'rgba(248,113,113,0.15)', color: 'var(--red)' };
  if (vpd > 1.2) return { txt: 'Estrés moderado', bg: 'rgba(251,191,36,0.15)', color: 'var(--gold)' };
  if (vpd > 0.8) return { txt: 'Transpiración alta', bg: 'rgba(251,191,36,0.1)', color: 'var(--gold)' };
  if (vpd > 0.4) return { txt: 'Condiciones óptimas', bg: 'rgba(52,211,153,0.12)', color: 'var(--green)' };
  return { txt: 'Humedad muy alta', bg: 'rgba(96,165,250,0.12)', color: 'var(--blue)' };
}

// ── Open‑Meteo: fetch rápido con timeout + fallback + caché corta ───────────
const _meteoFastCache = new Map();
const _meteoFastInflight = new Map();
const METEO_LS_CACHE_PREFIX = 'hc_meteo_cache_v1:';

function meteoReadLsCache(cacheKey) {
  try {
    const raw = localStorage.getItem(METEO_LS_CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    if (!Number.isFinite(obj.at) || !('data' in obj)) return null;
    return obj;
  } catch (_) {
    return null;
  }
}

function meteoWriteLsCache(cacheKey, payload) {
  try {
    localStorage.setItem(METEO_LS_CACHE_PREFIX + cacheKey, JSON.stringify(payload));
  } catch (_) {}
}

async function meteoFetchBackupUVFree(lat, lon, timeoutMs) {
  const url = 'https://currentuvindex.com/api/v1/uvi?latitude=' + lat + '&longitude=' + lon;
  const j = await meteoFetchJsonTimeout(url, Math.max(3000, timeoutMs || 6000));
  if (!j || j.ok === false) throw new Error(j?.message || 'UV backup no disponible');
  return j;
}

function meteoGroupDateMax(list) {
  const m = new Map();
  (list || []).forEach((x) => {
    const t = String(x?.time || '');
    const d = t.slice(0, 10);
    const v = Number(x?.uvi);
    if (!d || !Number.isFinite(v)) return;
    m.set(d, m.has(d) ? Math.max(m.get(d), v) : v);
  });
  return m;
}

async function meteoFetchBackupMetNo(baseUrl, timeoutMs) {
  const q = String(baseUrl.split('?')[1] || '');
  const sp = new URLSearchParams(q);
  const lat = parseFloat(sp.get('latitude'));
  const lon = parseFloat(sp.get('longitude'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Lat/lon inválidas backup meteo');
  const forecastDays = Math.max(1, Math.min(7, parseInt(sp.get('forecast_days') || '3', 10) || 3));
  const wantCurrent = /(?:^|&)current=/.test(q);
  const wantDaily = /(?:^|&)daily=/.test(q);
  const wantHourly = /(?:^|&)hourly=/.test(q);
  const dailyFields = String(sp.get('daily') || '');
  const onlyUvDaily = wantDaily && dailyFields.replace(/\s/g, '') === 'uv_index_max' && !wantHourly && !wantCurrent;

  if (onlyUvDaily) {
    const uv = await meteoFetchBackupUVFree(lat, lon, timeoutMs);
    const series = [uv.now].concat(Array.isArray(uv.forecast) ? uv.forecast : []);
    const byDate = meteoGroupDateMax(series);
    const dates = Array.from(byDate.keys()).sort().slice(0, forecastDays);
    return {
      latitude: lat, longitude: lon, timezone: 'UTC', timezone_abbreviation: 'UTC', utc_offset_seconds: 0,
      daily: { time: dates, uv_index_max: dates.map(d => byDate.get(d) ?? 0) },
    };
  }

  const url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + lat + '&lon=' + lon;
  const j = await meteoFetchJsonTimeout(url, Math.max(4500, timeoutMs || 8000));
  const ts = j?.properties?.timeseries;
  if (!Array.isArray(ts) || !ts.length) throw new Error('met.no sin timeseries');

  const hourlyRaw = ts.slice(0, Math.min(ts.length, forecastDays * 24 + 16));
  const dates = [];
  for (let i = 0; i < hourlyRaw.length; i++) {
    const d = String(hourlyRaw[i].time || '').slice(0, 10);
    if (d && !dates.includes(d)) dates.push(d);
    if (dates.length >= forecastDays) break;
  }
  const useDates = dates.slice(0, forecastDays);
  const daySet = new Set(useDates);
  const hourly = hourlyRaw.filter(x => daySet.has(String(x.time || '').slice(0, 10)));

  const out = {
    latitude: lat, longitude: lon, timezone: 'UTC', timezone_abbreviation: 'UTC', utc_offset_seconds: 0,
  };
  if (wantHourly) {
    out.hourly = {
      time: hourly.map(x => x.time),
      temperature_2m: hourly.map(x => Number(x?.data?.instant?.details?.air_temperature ?? NaN)),
      relative_humidity_2m: hourly.map(x => Number(x?.data?.instant?.details?.relative_humidity ?? NaN)),
      wind_speed_10m: hourly.map(x => Number(x?.data?.instant?.details?.wind_speed ?? 0) * 3.6),
      et0_fao_evapotranspiration: hourly.map(() => null),
    };
  }
  if (wantCurrent) {
    const c0 = ts[0];
    out.current = {
      time: String(c0.time || ''),
      temperature_2m: Number(c0?.data?.instant?.details?.air_temperature ?? NaN),
      relative_humidity_2m: Number(c0?.data?.instant?.details?.relative_humidity ?? NaN),
      wind_speed_10m: Number(c0?.data?.instant?.details?.wind_speed ?? 0) * 3.6,
      uv_index: 0,
    };
  }
  if (wantCurrent && !wantDaily) {
    try {
      const uvBk = await meteoFetchBackupUVFree(lat, lon, timeoutMs);
      const uNow = Number(uvBk?.now?.uvi);
      if (Number.isFinite(uNow) && out.current) out.current.uv_index = uNow;
    } catch (_) { /* sin respaldo UV */ }
  }
  if (wantDaily) {
    const dTempMax = [];
    const dTempMin = [];
    const dWindMax = [];
    const dProb = [];
    const dPrec = [];
    for (const d of useDates) {
      const dayRows = hourly.filter(x => String(x.time || '').slice(0, 10) === d);
      const tArr = dayRows.map(x => Number(x?.data?.instant?.details?.air_temperature)).filter(Number.isFinite);
      const wArr = dayRows.map(x => Number(x?.data?.instant?.details?.wind_speed) * 3.6).filter(Number.isFinite);
      const pArr = dayRows.map(x => Number(x?.data?.next_1_hours?.details?.precipitation_amount || 0)).filter(Number.isFinite);
      dTempMax.push(tArr.length ? Math.max(...tArr) : NaN);
      dTempMin.push(tArr.length ? Math.min(...tArr) : NaN);
      dWindMax.push(wArr.length ? Math.max(...wArr) : 0);
      dPrec.push(pArr.reduce((a, b) => a + b, 0));
      const rainy = pArr.filter(v => v > 0.03).length;
      dProb.push(pArr.length ? Math.round((rainy / pArr.length) * 100) : 0);
    }
    out.daily = {
      time: useDates,
      temperature_2m_max: dTempMax,
      temperature_2m_min: dTempMin,
      precipitation_probability_max: dProb,
      precipitation_sum: dPrec,
      wind_speed_10m_max: dWindMax,
      uv_index_max: new Array(useDates.length).fill(0),
    };
    try {
      const uv = await meteoFetchBackupUVFree(lat, lon, timeoutMs);
      const series = [uv.now].concat(Array.isArray(uv.forecast) ? uv.forecast : []);
      const byDate = meteoGroupDateMax(series);
      out.daily.uv_index_max = useDates.map(dd => byDate.get(dd) ?? 0);
      if (out.current) {
        const uNow = Number(uv?.now?.uvi);
        if (Number.isFinite(uNow)) out.current.uv_index = uNow;
      }
    } catch (_) {}
  }
  return out;
}

async function meteoFetchJsonTimeout(url, timeoutMs) {
  if (typeof AbortController === 'undefined') {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  } finally {
    clearTimeout(to);
  }
}

async function meteoFetchConFallback(baseUrl, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const ttlMs = opts.ttlMs ?? 120000;
  const staleMs = opts.staleMs ?? (24 * 60 * 60 * 1000);
  const cacheKey = opts.cacheKey || baseUrl;
  const forceRefresh = !!opts.forceRefresh;
  /** Si false, ante error de red no se devuelve copia antigua (p. ej. recalcular riego a mano). */
  const allowStaleFallback = opts.allowStaleFallback !== false;
  const now = Date.now();
  const cMem = _meteoFastCache.get(cacheKey);
  const cLs = meteoReadLsCache(cacheKey);
  const c = cMem || cLs;
  if (!forceRefresh && c && now - c.at < ttlMs) return c.data;
  if (!forceRefresh && _meteoFastInflight.has(cacheKey)) return _meteoFastInflight.get(cacheKey);

  const p = (async () => {
    let lastErr = null;
    // Primero intento rápido sin fijar modelo; si falla, pruebo modelo explícito.
    for (const url of [baseUrl, baseUrl + '&models=ecmwf_ifs']) {
      try {
        const j = await meteoFetchJsonTimeout(url, timeoutMs);
        if (j && !j.error) {
          const pack = { at: Date.now(), data: j };
          _meteoFastCache.set(cacheKey, pack);
          meteoWriteLsCache(cacheKey, pack);
          state._meteoFuenteActiva = 'open-meteo';
          refreshMeteoFuenteActivaUI();
          return j;
        }
        const r = j && j.reason;
        lastErr = new Error(typeof r === 'string' ? r : (r ? JSON.stringify(r) : 'Respuesta meteo inválida'));
      } catch (e) {
        lastErr = e;
      }
    }
    try {
      const b = await meteoFetchBackupMetNo(baseUrl, timeoutMs + 1200);
      if (b && !b.error) {
        const pack = { at: Date.now(), data: b };
        _meteoFastCache.set(cacheKey, pack);
        meteoWriteLsCache(cacheKey, pack);
        state._meteoFuenteActiva = 'metno';
        refreshMeteoFuenteActivaUI();
        return b;
      }
    } catch (e) {
      lastErr = e;
    }
    if (allowStaleFallback && c && now - c.at < staleMs) {
      state._meteoFuenteActiva = 'cache';
      refreshMeteoFuenteActivaUI();
      return c.data;
    }
    throw (lastErr || new Error('Sin datos meteorológicos'));
  })();
  _meteoFastInflight.set(cacheKey, p);
  try {
    return await p;
  } finally {
    _meteoFastInflight.delete(cacheKey);
  }
}

// ── Meteoclimatic: estación aficionada más cercana (RSS regional; CORS vía allorigins si hace falta) ──
const METEOCLIMATIC_ZONAS = [
  { code: 'ESPV', minLat: 37.55, maxLat: 40.98, minLon: -1.05, maxLon: 0.52, cLat: 39.25, cLon: -0.55 },
  { code: 'ESCAT', minLat: 40.35, maxLat: 42.95, minLon: 0.12, maxLon: 3.55, cLat: 41.65, cLon: 1.52 },
  { code: 'ESAND', minLat: 35.05, maxLat: 38.85, minLon: -7.55, maxLon: -1.05, cLat: 37.2, cLon: -4.25 },
  { code: 'ESCYL', minLat: 40.05, maxLat: 43.25, minLon: -6.85, maxLon: -1.42, cLat: 41.75, cLon: -4.25 },
  { code: 'ESMUR', minLat: 37.32, maxLat: 38.72, minLon: -2.55, maxLon: -0.62, cLat: 37.95, cLon: -1.55 },
  { code: 'ESMAD', minLat: 39.85, maxLat: 41.25, minLon: -4.15, maxLon: -2.85, cLat: 40.42, cLon: -3.7 },
  { code: 'ESGAL', minLat: 41.75, maxLat: 43.95, minLon: -9.35, maxLon: -6.42, cLat: 42.65, cLon: -7.85 },
  { code: 'ESEXT', minLat: 37.85, maxLat: 40.25, minLon: -7.55, maxLon: -4.55, cLat: 39.05, cLon: -6.35 },
  { code: 'ESIBA', minLat: 38.55, maxLat: 40.25, minLon: 1.05, maxLon: 4.45, cLat: 39.6, cLon: 2.9 },
  { code: 'ESARA', minLat: 39.75, maxLat: 43.05, minLon: -1.85, maxLon: 0.55, cLat: 41.35, cLon: -0.8 },
];

function meteoclimaticHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toR = x => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))) * 10) / 10;
}

function meteoclimaticFeedCodesPriorizados(lat, lon) {
  const inside = [];
  for (let i = 0; i < METEOCLIMATIC_ZONAS.length; i++) {
    const z = METEOCLIMATIC_ZONAS[i];
    if (lat >= z.minLat && lat <= z.maxLat && lon >= z.minLon && lon <= z.maxLon) inside.push(z.code);
  }
  if (inside.length) return inside;
  const scored = METEOCLIMATIC_ZONAS.map(z => ({
    code: z.code,
    d: (lat - z.cLat) * (lat - z.cLat) + (lon - z.cLon) * (lon - z.cLon),
  })).sort((a, b) => a.d - b.d);
  const out = [];
  if (scored[0]) out.push(scored[0].code);
  if (scored[1] && scored[1].code !== scored[0].code) out.push(scored[1].code);
  return out;
}

function meteoclimaticMcParseFloat(s) {
  if (s == null || s === '') return null;
  const v = parseFloat(String(s).replace(',', '.'));
  if (!Number.isFinite(v)) return null;
  if (v === -99) return null;
  return v;
}

const METEOCLIMATIC_BLOCK_RE = /\[\[<(\w+);\((-?[0-9,]+);(-?[0-9,]+);(-?[0-9,]+);(\w*)\);\((-?[0-9,]*);(-?[0-9,]*);(-?[0-9,]*)\);\((-?[0-9,]*);(-?[0-9,]*);(-?[0-9,]*)\);\((-?[0-9,]*);(-?[0-9,]*);(-?[0-9,]*)\);\((-?[0-9,]*)\);/;

function meteoclimaticParseBlockFromDescription(desc) {
  const m = METEOCLIMATIC_BLOCK_RE.exec(desc || '');
  if (!m) return null;
  return {
    stationCode: m[1],
    temp: meteoclimaticMcParseFloat(m[2]),
    tempMax: meteoclimaticMcParseFloat(m[3]),
    tempMin: meteoclimaticMcParseFloat(m[4]),
    condition: m[5] || '',
    rh: meteoclimaticMcParseFloat(m[6]),
    pressure: meteoclimaticMcParseFloat(m[9]),
    wind: meteoclimaticMcParseFloat(m[12]),
    windMax: meteoclimaticMcParseFloat(m[13]),
    windBearing: meteoclimaticMcParseFloat(m[14]),
    rain24h: meteoclimaticMcParseFloat(m[15]),
  };
}

function meteoclimaticPointFromItemXml(xmlSlice) {
  let lat = NaN;
  let lon = NaN;
  const p1 = /<georss:point>\s*([\d.-]+)\s+([\d.-]+)\s*<\/georss:point>/i.exec(xmlSlice);
  if (p1) {
    lat = parseFloat(p1[1]);
    lon = parseFloat(p1[2]);
  } else {
    const plat = /<geo:lat>\s*([\d.-]+)\s*<\/geo:lat>/i.exec(xmlSlice);
    const plon = /<geo:long>\s*([\d.-]+)\s*<\/geo:long>/i.exec(xmlSlice);
    if (plat && plon) {
      lat = parseFloat(plat[1]);
      lon = parseFloat(plon[1]);
    }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function meteoclimaticFetchRssText(feedCode, timeoutMs) {
  const url = 'https://www.meteoclimatic.net/feed/rss/' + encodeURIComponent(feedCode);
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let txt = null;
    try {
      const r = await fetch(url, { signal: ctrl.signal, mode: 'cors' });
      if (r.ok) txt = await r.text();
    } catch (_) { /* CORS en navegador */ }
    if (txt == null) {
      const proxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
      const r2 = await fetch(proxy, { signal: ctrl.signal });
      if (!r2.ok) throw new Error('Meteoclimatic proxy');
      const j = await r2.json();
      if (typeof j.contents !== 'string') throw new Error('Meteoclimatic body');
      txt = j.contents;
    }
    return txt;
  } finally {
    clearTimeout(tid);
  }
}

function meteoclimaticNearestFromRssXml(rssText, lat0, lon0) {
  const reItem = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let best = null;
  let m;
  while ((m = reItem.exec(rssText)) !== null) {
    const chunk = m[1];
    const titleM = /<title>([\s\S]*?)<\/title>/i.exec(chunk);
    const linkM = /<link>([\s\S]*?)<\/link>/i.exec(chunk);
    const descM = /<description>([\s\S]*?)<\/description>/i.exec(chunk);
    const pubM = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(chunk);
    if (!descM) continue;
    const desc = descM[1].replace(/<!\[CDATA\[|\]\]>/g, '');
    const obs = meteoclimaticParseBlockFromDescription(desc);
    if (!obs) continue;
    const pt = meteoclimaticPointFromItemXml(chunk);
    if (!pt) continue;
    const dist = meteoclimaticHaversineKm(lat0, lon0, pt.lat, pt.lon);
    const title = titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : '';
    const link = linkM ? linkM[1].trim() : '';
    const pubDate = pubM ? pubM[1].trim() : '';
    const cand = { title, link, pubDate, distKm: dist, lat: pt.lat, lon: pt.lon, feedObs: obs };
    if (!best || dist < best.distKm) best = cand;
  }
  return best;
}

async function meteoclimaticObservacionCercana(lat, lon, opts) {
  const timeoutMs = opts && opts.timeoutMs != null ? opts.timeoutMs : 6000;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const perFetch = Math.max(1200, Math.min(5000, timeoutMs - 300));
  const codes = meteoclimaticFeedCodesPriorizados(lat, lon);
  if (!codes.length) return null;
  for (let i = 0; i < codes.length; i++) {
    try {
      const xml = await meteoclimaticFetchRssText(codes[i], perFetch);
      const best = meteoclimaticNearestFromRssXml(xml, lat, lon);
      if (best) {
        const o = best.feedObs;
        return {
          zonaRss: codes[i],
          title: best.title,
          link: best.link,
          pubDate: best.pubDate,
          distKm: best.distKm,
          stationLat: best.lat,
          stationLon: best.lon,
          stationCode: o.stationCode,
          temp: o.temp,
          tempMax: o.tempMax,
          tempMin: o.tempMin,
          condition: o.condition,
          rh: o.rh,
          pressure: o.pressure,
          wind: o.wind,
          windMax: o.windMax,
          windBearing: o.windBearing,
          rain24h: o.rain24h,
        };
      }
    } catch (_) { /* siguiente zona */ }
  }
  return null;
}

function meteoclimaticFormatLineaHtml(mc) {
  if (!mc || mc.temp == null) return '';
  const t = Math.round(mc.temp * 10) / 10;
  const rh = mc.rh != null ? Math.round(mc.rh) + '%' : '—';
  const w = mc.wind != null ? Math.round(mc.wind * 10) / 10 + ' km/h' : '—';
  const rain = mc.rain24h != null ? Math.round(mc.rain24h * 10) / 10 + ' mm' : '—';
  const dist = mc.distKm != null ? ' · ~' + Math.round(mc.distKm * 10) / 10 + ' km' : '';
  const nom = escHtmlUi(mc.title || 'Estación');
  return (
    '<br><span class="riego-clima-meteoclimatic">📡 <strong>Meteoclimatic</strong> (observación reciente, red de estaciones)' + dist +
    ': <strong>' + nom + '</strong> · T <strong>' + t + '</strong> °C · HR ' + rh + ' · viento ' + w + ' · precip. 24 h ' + rain +
    ' · <span class="riego-clima-mc-pub">' + escHtmlUi(mc.pubDate || '') + '</span>. Complemento observacional; el modelo sigue siendo la base del cálculo.</span>'
  );
}

function renderMeteoclimaticPanelMeteo(mc) {
  const box = document.getElementById('meteoMeteoclimaticBox');
  const inner = document.getElementById('meteoMeteoclimaticInner');
  if (!box || !inner) return;
  if (!mc || mc.temp == null) {
    box.classList.add('setup-hidden');
    inner.innerHTML = '';
    return;
  }
  box.classList.remove('setup-hidden');
  const href = mc.link ? escHtmlUi(mc.link) : '';
  const linkHtml = href
    ? '<a href="' + href + '" target="_blank" rel="noopener noreferrer">Ver ficha en meteoclimatic.net</a>'
    : '';
  inner.innerHTML =
    '<div class="meteo-mc-title">📡 Estación cercana (Meteoclimatic)</div>' +
    '<div class="meteo-mc-body"><strong>' + escHtmlUi(mc.title || '') + '</strong> · ~' + Math.round(mc.distKm * 10) / 10 + ' km' +
    '<br>T actual: <strong>' + (Math.round(mc.temp * 10) / 10) + '</strong> °C · HR: ' + (mc.rh != null ? Math.round(mc.rh) + '%' : '—') +
    ' · Viento: ' + (mc.wind != null ? Math.round(mc.wind * 10) / 10 + ' km/h' : '—') +
    ' · Lluvia 24 h: ' + (mc.rain24h != null ? Math.round(mc.rain24h * 10) / 10 + ' mm' : '—') +
    '<br><span class="meteo-mc-small">' + escHtmlUi(mc.pubDate || '') + '</span>' + (linkHtml ? ' · ' + linkHtml : '') +
    '<br><span class="meteo-mc-note">Red de estaciones aficionadas en la península y archipiélagos (gratis). Si no ves datos, la red puede estar saturada o el navegador bloquea el acceso: prueba más tarde.</span></div>';
}

async function cargarMeteo() {
  const meteoLoader = document.getElementById('meteoLoader');
  if (!meteoLoader) return; // pestaña no activa — no hacer nada
  const meteoUbicEl = document.getElementById('meteoUbicacionActual');
  const labelUbic = (() => {
    const cfg = state.configTorre || {};
    const m = (cfg.localidadMeteo || '').trim();
    if (m) return m;
    const c = (cfg.ciudad || '').trim();
    if (c) return c.split(',')[0].trim();
    return 'No definida';
  })();
  if (meteoUbicEl) meteoUbicEl.textContent = labelUbic;
  meteoLoader.style.display = 'flex';
  const meteoDias = document.getElementById('meteoDias');
  const meteoDetalle = document.getElementById('meteoDetalle');
  const meteoAlertas = document.getElementById('meteoAlertas');
  const meteoAvisosOficiales = document.getElementById('meteoAvisosOficiales');
  const mcBoxLoad = document.getElementById('meteoMeteoclimaticBox');
  if (meteoDias) meteoDias.classList.add('setup-hidden');
  if (meteoDetalle) meteoDetalle.classList.add('setup-hidden');
  if (meteoAlertas) meteoAlertas.classList.add('setup-hidden');
  if (meteoAvisosOficiales) meteoAvisosOficiales.classList.add('setup-hidden');
  if (mcBoxLoad) mcBoxLoad.classList.add('setup-hidden');

  try {
    // No bloquear la carga por geolocalización (puede tardar varios segundos en algunos móviles).
    void ensureMeteoCoordsAuto();

    // ECMWF para temp/humedad + modelo default para UV
    const urlMBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max' +
      '&hourly=temperature_2m,relative_humidity_2m' +
      '&forecast_days=7&timezone=auto';
    const urlMCoreBase = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&hourly=temperature_2m,relative_humidity_2m' +
      '&forecast_days=7&timezone=auto';
    const urlMUV = 'https://api.open-meteo.com/v1/forecast?' +
      'latitude=' + getCoordsActivas().lat + '&longitude=' + getCoordsActivas().lon +
      '&daily=uv_index_max&forecast_days=7&timezone=auto';

    const [meteoRaw, meteoUV] = await Promise.all([
      meteoFetchConFallback(urlMBase, { cacheKey: 'meteo:main:' + urlMBase, timeoutMs: 4200, ttlMs: 2 * 60 * 1000 })
        .catch(() => meteoFetchConFallback(urlMCoreBase, { cacheKey: 'meteo:core:' + urlMCoreBase, timeoutMs: 4200, ttlMs: 2 * 60 * 1000 })),
      meteoFetchConFallback(urlMUV, { cacheKey: 'meteo:uv:' + urlMUV, timeoutMs: 3800, ttlMs: 8 * 60 * 1000 }),
    ]);
    meteoData = meteoRaw;
    // Compatibilidad Open-Meteo: unificar nombres de viento legacy/nuevo
    if (!Array.isArray(meteoData.daily.windspeed_10m_max) && Array.isArray(meteoData.daily.wind_speed_10m_max)) {
      meteoData.daily.windspeed_10m_max = meteoData.daily.wind_speed_10m_max;
    }
    const nDays = Array.isArray(meteoData.daily?.time) ? meteoData.daily.time.length : 7;
    if (!Array.isArray(meteoData.daily.windspeed_10m_max)) {
      meteoData.daily.windspeed_10m_max = new Array(nDays).fill(0);
    }
    if (!Array.isArray(meteoData.daily.precipitation_probability_max)) {
      meteoData.daily.precipitation_probability_max = new Array(nDays).fill(0);
    }
    if (!Array.isArray(meteoData.daily.precipitation_sum)) {
      meteoData.daily.precipitation_sum = new Array(nDays).fill(0);
    }
    // Combinar UV en meteoData
    if (meteoUV.daily?.uv_index_max) {
      meteoData.daily.uv_index_max = meteoUV.daily.uv_index_max;
    } else {
      meteoData.daily.uv_index_max = new Array(7).fill(0);
    }
    state._meteoForecastCache = meteoData;
    saveState();

    renderMeteoDias();
    seleccionarDia(0);

    document.getElementById('meteoLoader').style.display = 'none';
    document.getElementById('meteoDias').classList.remove('setup-hidden');
    document.getElementById('meteoDetalle').classList.remove('setup-hidden');
    document.getElementById('meteoAlertas').classList.remove('setup-hidden');

    await renderMeteoAvisosPanelCompleto();

    const mcCached = state._ultimoMeteoclimaticCercano;
    if (mcCached && mcCached.temp != null) renderMeteoclimaticPanelMeteo(mcCached);
    void meteoclimaticObservacionCercana(getCoordsActivas().lat, getCoordsActivas().lon, { timeoutMs: 7200 })
      .then((mc) => {
        try {
          state._ultimoMeteoclimaticCercano = mc;
        } catch (_) {}
        renderMeteoclimaticPanelMeteo(mc);
      })
      .catch(() => renderMeteoclimaticPanelMeteo(null));

  } catch(e) {
    const cached = state._meteoForecastCache;
    if (cached && cached.daily && cached.hourly) {
      meteoData = cached;
      try {
        renderMeteoDias();
        seleccionarDia(0);
        document.getElementById('meteoLoader').style.display = 'none';
        document.getElementById('meteoDias').classList.remove('setup-hidden');
        document.getElementById('meteoDetalle').classList.remove('setup-hidden');
        document.getElementById('meteoAlertas').classList.remove('setup-hidden');
        void renderMeteoAvisosPanelCompleto();
        return;
      } catch (_) {}
    }
    document.getElementById('meteoLoader').innerHTML =
      '<span>❌</span><span>Error al cargar datos. Revisa conexión o espera unos segundos.</span>';
  }
}

function renderMeteoDias() {
  const dias = document.getElementById('meteoDias');
  dias.innerHTML = '';

  meteoData.daily.time.forEach((fecha, i) => {
    const d = new Date(fecha);
    const nombre = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DIAS_SEMANA[d.getDay()];
    const tMax = Math.round(meteoData.daily.temperature_2m_max[i]);
    const tMin = Math.round(meteoData.daily.temperature_2m_min[i]);
    const prob = meteoData.daily.precipitation_probability_max[i];
    const uv   = meteoData.daily.uv_index_max[i];
    const viento = meteoData.daily.windspeed_10m_max[i];
    const emoji = condEmoji(prob, tMax, uv);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'dia-card' + (i === 0 ? ' selected' : '');
    card.id = 'diaCard' + i;
    card.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    const lluviaTxt = prob > 20 ? ', lluvia ' + prob + ' por ciento' : '';
    card.setAttribute(
      'aria-label',
      nombre + ', temperatura máxima ' + tMax + ' grados, mínima ' + tMin + ' grados' + lluviaTxt
    );
    card.innerHTML = `
      <div class="dia-nombre">${nombre}</div>
      <div class="dia-emoji">${emoji}</div>
      <div class="dia-temp">${tMax}° <span>${tMin}°</span></div>
      ${prob > 20 ? `<div class="dia-lluvia">${prob}%</div>` : ''}
    `;
    card.onclick = () => seleccionarDia(i);
    dias.appendChild(card);
  });
}

function seleccionarDia(idx) {
  diaSeleccionado = idx;
  document.querySelectorAll('.dia-card').forEach((c, i) => {
    const on = i === idx;
    c.classList.toggle('selected', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  const d     = new Date(meteoData.daily.time[idx]);
  const nombre = idx === 0 ? 'Hoy' : idx === 1 ? 'Mañana' :
    `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;

  const tMax   = Math.round(meteoData.daily.temperature_2m_max[idx]);
  const tMin   = Math.round(meteoData.daily.temperature_2m_min[idx]);
  const tMedia = (tMax + tMin) / 2;
  const prob   = meteoData.daily.precipitation_probability_max[idx];
  const precip = Math.round(meteoData.daily.precipitation_sum[idx] * 10) / 10;
  const viento = Math.round(meteoData.daily.windspeed_10m_max[idx]);
  const uvRaw  = meteoData.daily.uv_index_max?.[idx];
  const uv     = Number.isFinite(Number(uvRaw)) ? Math.round(Number(uvRaw)) : null;
  const emoji  = condEmoji(prob, tMax, uv ?? -1);

  // Humedad media del día seleccionado
  const offset = idx * 24;
  const humHoras = meteoData.hourly.relative_humidity_2m.slice(offset, offset + 24);
  const humMedia = Math.round(humHoras.reduce((a,b) => a+b,0) / humHoras.length);

  // VPD medio
  const tempHoras = meteoData.hourly.temperature_2m.slice(offset, offset + 24);
  let sumVpd = 0;
  tempHoras.forEach((t, i) => {
    const h = humHoras[i] || humMedia;
    const pvs = 0.6108 * Math.pow(1 + t/100, 8.827);
    sumVpd += pvs * (1 - h/100);
  });
  const vpd = Math.round(sumVpd / 24 * 100) / 100;

  // Actualizar UI detalle
  document.getElementById('meteoDetalleEmoji').textContent = emoji;
  document.getElementById('meteoDetalleDia').textContent   = nombre;
  document.getElementById('meteoDetalleCond').textContent  = condTexto(prob, tMax, uv ?? -1, viento);
  document.getElementById('mdTemp').textContent   = `${tMin}-${tMax}`;
  document.getElementById('mdHum').textContent    = humMedia + '%';
  document.getElementById('mdViento').textContent = viento;
  document.getElementById('mdUV').textContent     = uv != null ? uv : '—';
  document.getElementById('mdLluvia').textContent = prob + '%';
  document.getElementById('mdLitros').textContent = precip;

  // Alertas cultivo (vpd sigue calculado para heurísticas)
  renderAlertas(tMax, tMin, humMedia, viento, uv ?? 0, prob, vpd);
}

function renderAlertas(tMax, tMin, hum, viento, uv, prob, vpd) {
  const alertas = [];
  const tMet = tipoInstalacionNormalizado(state.configTorre || {});
  const ventVpdTxt = tMet === 'nft'
    ? 'buena ventilación alrededor del cultivo y del circuito NFT'
    : tMet === 'dwc'
      ? 'buena ventilación alrededor del follaje y del depósito'
      : 'buena ventilación alrededor de la torre vertical y del follaje';
  const m = state.ultimaMedicion;
  const tempAgua = m?.temp ? parseFloat(m.temp) : null;
  const ecActual = m?.ec   ? parseFloat(m.ec)   : null;

  // ── 🦠 PYTHIUM — el enemigo número 1 de la hidropónica ───────────────────
  if (tempAgua !== null && tempAgua > 25) {
    alertas.push({ tipo:'bad', icon:'🦠', txt:`🚨 ALERTA PYTHIUM: Agua a ${tempAgua}°C — temperatura crítica. El hongo Pythium destruye raíces en horas. Enfriar el depósito urgente con agua fría o hielo.` });
  } else if (tempAgua !== null && tempAgua > 22) {
    alertas.push({ tipo:'warn', icon:'🦠', txt:`⚠️ Riesgo Pythium: Agua a ${tempAgua}°C — zona de peligro (>22°C). Vigilar raíces diariamente. Asegurar difusor 24h y depósito opaco.` });
  } else if (tMax > 30) {
    alertas.push({ tipo:'warn', icon:'🦠', txt:`⚠️ Temp ambiente ${tMax}°C — el agua del depósito puede calentarse. Verificar temperatura del agua y cubrir el depósito.` });
  }

  // ── 🌿 BOLTING (espigado) ──────────────────────────────────────────────────
  if (tMax > 28)
    alertas.push({ tipo:'bad', icon:'🌿', txt:`🌡️ ${tMax}°C — riesgo alto de bolting (espigado) en lechugas y rúcula. Toldo obligatorio en horas centrales.` });
  else if (tMax > 24)
    alertas.push({ tipo:'warn', icon:'🌿', txt:`🌡️ ${tMax}°C — vigilar espigado en variedades sensibles al calor. Considerar toldo 12-16h.` });

  // ── 🐛 PLAGAS — condiciones favorables ────────────────────────────────────
  if (hum > 85 && tMax > 20)
    alertas.push({ tipo:'warn', icon:'🐛', txt:`💧 Humedad ${hum}% + calor — condiciones ideales para mildiu y botritis. Revisar hojas inferiores. Mejorar ventilación.` });
  if (hum < 30 && tMax > 25)
    alertas.push({ tipo:'warn', icon:'🐛', txt:`🌵 Humedad ${hum}% y calor — posible aparición de araña roja. Revisar el envés de las hojas.` });

  // ── 💧 EC FUERA DE RANGO ──────────────────────────────────────────────────
  if (ecActual !== null) {
    if (ecActual > 1600)
      alertas.push({ tipo:'bad', icon:'⚡', txt:`EC ${ecActual} µS/cm — demasiado alta. Las plantas no absorben agua (estrés osmótico). Diluir con agua destilada.` });
    else if (ecActual < 900)
      alertas.push({ tipo:'warn', icon:'⚡', txt:`EC ${ecActual} µS/cm — baja. Las plantas pueden mostrar clorosis (hojas amarillas). Añadir nutrientes.` });
  }

  // ── 🌱 PLÁNTULAS NUEVAS — pH inestable ──────────────────────────────────────
  if (hayPlantulasNuevas()) {
    alertas.push({ tipo:'warn', icon:'🌱',
      txt:'Plántulas nuevas en sistema (<5 días) — pH puede subir 1-2 unidades por actividad radicular. Normal. Mide cada 6-8h y corrige con pH- si supera 7.0. Se estabilizará en 3-5 días.' });
  }

  // ── 🌊 VPD ────────────────────────────────────────────────────────────────
  if (vpd > 1.6)
    alertas.push({ tipo:'bad', icon:'🔴', txt:'Estrés hídrico severo — riego de mayor intensidad solar crítico. Revisar lechugas a las 13:00h.' });
  else if (vpd > 1.2)
    alertas.push({ tipo:'warn', icon:'🟡', txt:'Transpiración alta — programa de mayor intensidad solar activo. Vigilar signos de lacio.' });
  else if (vpd < 0.4)
    alertas.push({ tipo:'warn', icon:'💧', txt:'Humedad muy alta — riesgo de hongos foliares. Asegura ' + ventVpdTxt + '.' });
  else
    alertas.push({ tipo:'ok', icon:'✅', txt:'Condiciones de VPD óptimas para el cultivo.' });

  if (uv >= 8 && tMax > 28)
    alertas.push({ tipo:'bad', icon:'☀️', txt:`UV ${uv} + Temp ${tMax}°C — desplegar toldo. Activar opción en pestaña Riego.` });
  else if (uv >= 6)
    alertas.push({ tipo:'warn', icon:'☀️', txt:`UV ${uv} — considerar toldo si la temperatura sube de 28°C.` });

  if (tMin < 5)
    alertas.push({ tipo:'bad', icon:'🥶', txt:`Temperatura mínima ${tMin}°C — riesgo de estrés por frío en raíces. Verificar calentador.` });
  else if (tMin < 10)
    alertas.push({ tipo:'warn', icon:'🌡️', txt:`Noche fría (${tMin}°C) — el calentador del depósito es importante esta noche.` });

  if (viento > 40)
    alertas.push({ tipo:'warn', icon:'💨', txt:`Viento fuerte ${viento} km/h — aumenta la transpiración. El riego se ajusta automáticamente.` });

  if (tMax > 32)
    alertas.push({ tipo:'bad', icon:'🌡️', txt:`Temperatura máxima ${tMax}°C — riesgo de bolting (espigado) en lechugas. Toldo obligatorio.` });

  const el = document.getElementById('meteoAlertas');
  el.innerHTML = alertas.map(a => `
    <div class="meteo-alerta-item ${a.tipo}">
      <span class="meteo-alerta-icon">${a.icon}</span>
      <span>${a.txt}</span>
    </div>
  `).join('');
}


// ══════════════════════════════════════════════════
// DASHBOARD — LÓGICA
// ══════════════════════════════════════════════════

function updateDashboard() {
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

  // Meteo
  fetchMeteoAlert();

  try { refreshUbicacionInstalacionUI(); } catch (_) {}

  try {
    actualizarGuiaPrimerosPasos();
    actualizarQuickActionsNoviceMode();
  } catch (_) {}

  try { void refreshMeteoAlarmFlashDashboard(); } catch (_) {}
}

function getTileClass(param, val) {
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

  const diasRecarga = 15;
  let diasTranscurridos = 0;

  if (state.ultimaRecarga) {
    const diff = Date.now() - new Date(state.ultimaRecarga).getTime();
    diasTranscurridos = Math.floor(diff / 86400000);
  }

  const diasRestantes = Math.max(0, diasRecarga - diasTranscurridos);
  const pct = Math.min(100, (diasTranscurridos / diasRecarga) * 100);

  diasEl.textContent = diasRestantes > 0 ? diasRestantes + 'd' : '¡HOY!';

  let color, nota;
  if (pct < 60) {
    color = '#16a34a';
    nota = 'Última recarga completa hace ' + diasTranscurridos + ' días';
  } else if (pct < 85) {
    color = '#d97706';
    nota = '⚠️ Recarga completa próxima — quedan ~' + diasRestantes + ' días';
  } else {
    color = '#dc2626';
    nota = '🔴 Recarga completa necesaria' + (diasRestantes === 0 ? ' HOY' : ' en ~' + diasRestantes + ' días');
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
    notaEl.textContent = 'Registra cuándo hiciste la última recarga completa (checklist o interruptor al guardar medición).';
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
  if (!state.ultimaRecarga && nPlantas > 0) {
    banner.classList.add('bad');
    banner.textContent =
      '⚠️ No hay fecha de recarga completa. Si ya vaciaste y mezclaste de cero → checklist o interruptor «Recarga completa» al guardar. Si solo rellenaste volumen (plantas/evaporación) → reposición parcial; no reinicia este contador.';
  } else if (pct >= 85) {
    banner.classList.add('bad');
    banner.textContent =
      '🔴 Llevas ' + diasTranscurridos + ' días desde la última recarga completa. ¿Toca vaciar, limpiar y checklist? Si solo faltaba agua en el mismo cultivo, usa reposición parcial.';
  } else {
    banner.classList.remove('bad');
    banner.textContent =
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
