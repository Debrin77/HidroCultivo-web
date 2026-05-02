/**
 * Cálculo dinámico setup: volumen, cultivo, nutriente, EC, plántulas.
 * Tras los módulos hc-setup-wizard-*.js y nutrientes-catalog.js.
 */
// ══════════════════════════════════════════════════
// CÁLCULO DINÁMICO SETUP — volumen + cultivo + nutriente
// ══════════════════════════════════════════════════

// ── Nutriente de la torre activa ─────────────────────────────────────────
function getNutrienteTorre() {
  const cfg = state.configTorre || {};
  const tIdx = state.torreActiva || 0;
  // Leer nutriente de la torre activa primero, luego configTorre
  const id = (state.torres && state.torres[tIdx] && state.torres[tIdx].config)
    ? (state.torres[tIdx].config.nutriente || cfg.nutriente || 'canna_aqua')
    : (cfg.nutriente || 'canna_aqua');
  return NUTRIENTES_DB.find(n => n.id === id) || NUTRIENTES_DB[0];
}

function aplicarAjusteEcObjetivoPorInstalacion(ecRange, cfg) {
  let r = ecRange;
  if (typeof torreAplicarObjetivoEcRango === 'function') r = torreAplicarObjetivoEcRango(r, cfg);
  if (typeof dwcAplicarObjetivoEcRango === 'function') r = dwcAplicarObjetivoEcRango(r, cfg);
  return r;
}

function getEcPhStrategy(cfg) {
  const c = cfg || state.configTorre || {};
  const s = String(c.ecPhEstrategia || '').toLowerCase();
  return s === 'manual' ? 'manual' : 'auto';
}

function getEcPhIntensity(cfg) {
  const c = cfg || state.configTorre || {};
  const raw = String(c.ecPhIntensidad || '').toLowerCase();
  if (raw === 'conservador' || raw === 'intensivo') return raw;
  return 'estandar';
}

function getEcObjetivoManualUs(cfg, opts) {
  const c = cfg || state.configTorre || {};
  const o = opts || {};
  const includeChecklistFallback = o.includeChecklistFallback === true;
  const a = Number(c.ecManualObjetivoUs);
  if (Number.isFinite(a) && a >= 200 && a <= 6000) return Math.round(a);
  if (includeChecklistFallback) {
    const b = Number(c.checklistEcObjetivoUs);
    if (Number.isFinite(b) && b >= 200 && b <= 6000) return Math.round(b);
  }
  return null;
}

function getPhObjetivoManualRango(cfg, nut) {
  const c = cfg || state.configTorre || {};
  const n = nut || getNutrienteTorre();
  const p0 = n && Array.isArray(n.pHRango) ? n.pHRango : [5.5, 6.5];
  const mn = Number(c.phManualObjetivoMin);
  const mx = Number(c.phManualObjetivoMax);
  if (Number.isFinite(mn) && Number.isFinite(mx) && mn >= 4.8 && mx <= 7.2 && mx >= mn + 0.1) {
    return [Math.round(mn * 10) / 10, Math.round(mx * 10) / 10];
  }
  return [p0[0], p0[1]];
}

/**
 * Fase de cultivo según días transcurridos.
 * @param {object} opts desdeTrasplante (default true): la fecha en la ficha de torre/NFT es el **trasplante al sistema**;
 *   no se recorre la fase `germinacion` del catálogo (esa fase es previa al hidro). Solo `origenPlanta === 'germinacion'`
 *   y `desdeTrasplante === false` incluiría germinación (p. ej. semillero sin trasplantar aún).
 */
function cultivoFaseDesdeDias(cultivo, diasDesdeSiembra, opts) {
  const o = opts || {};
  const desdeTrasplante = o.desdeTrasplante !== false;
  const fases = cultivo && cultivo.fases ? cultivo.fases : null;
  if (!fases || !Number.isFinite(Number(diasDesdeSiembra)) || Number(diasDesdeSiembra) < 0) return null;
  const ordenFull = ['germinacion', 'plantula', 'vegetativo', 'prefloracion', 'floracion', 'fructificacion'];
  const orden = desdeTrasplante ? ordenFull.filter(k => k !== 'germinacion') : ordenFull;
  let acc = 0;
  for (let i = 0; i < orden.length; i++) {
    const k = orden[i];
    const f = fases[k];
    if (!f) continue;
    const d = Number(f.dias);
    if (!Number.isFinite(d) || d <= 0) continue;
    acc += d;
    if (Number(diasDesdeSiembra) <= acc) return { key: k, fase: f };
  }
  for (let i = orden.length - 1; i >= 0; i--) {
    const fk = orden[i];
    if (fases[fk]) return { key: fk, fase: fases[fk] };
  }
  return null;
}

/**
 * EC/pH «crudos» por ficha de cesta (sin cruce entre plantas ni ajuste instalación/contexto).
 * Misma base que el bucle de getRecomendacionEcPhTorre.
 */
function torreSliceEcPhCestaRaw(c, cfg) {
  cfg = cfg || state.configTorre || {};
  if (!c || !c.variedad) return null;
  const cultivo = getCultivoDB(c.variedad);
  if (!cultivo) return null;
  let ecMin = Number(cultivo.ecMin);
  let ecMax = Number(cultivo.ecMax);
  let phMin = Number(cultivo.phMin);
  let phMax = Number(cultivo.phMax);
  let faseKey = null;
  let conFasePorFecha = false;
  if (c.fecha) {
    const ms = new Date(c.fecha).getTime();
    if (Number.isFinite(ms)) {
      const dias = Math.max(0, Math.floor((Date.now() - ms) / 86400000));
      const fd = cultivoFaseDesdeDias(cultivo, dias, { desdeTrasplante: true });
      if (fd && fd.fase) {
        conFasePorFecha = true;
        faseKey = fd.key;
        if (Array.isArray(fd.fase.ec) && fd.fase.ec.length >= 2) {
          ecMin = Number(fd.fase.ec[0]);
          ecMax = Number(fd.fase.ec[1]);
        }
        if (Array.isArray(fd.fase.ph) && fd.fase.ph.length >= 2) {
          phMin = Number(fd.fase.ph[0]);
          phMax = Number(fd.fase.ph[1]);
        }
      }
    }
  }
  if (!Number.isFinite(ecMin) || !Number.isFinite(ecMax)) return null;
  if (!Number.isFinite(phMin) || !Number.isFinite(phMax)) {
    phMin = 5.5;
    phMax = 6.5;
  }
  return { ec: { min: ecMin, max: ecMax }, ph: { min: phMin, max: phMax }, faseKey, conFasePorFecha };
}

/** EC/pH orientativos para mostrar en resumen de cesta (ajuste torre/DWC + clima), alineado con Medir. */
function torreRangoEcPhCestaParaMostrar(c, cfg) {
  const raw = torreSliceEcPhCestaRaw(c, cfg);
  if (!raw) return null;
  const ctx = getAjustesEcPhPorContexto(cfg);
  let ecRec = aplicarAjusteEcObjetivoPorInstalacion({ min: raw.ec.min, max: raw.ec.max }, cfg);
  ecRec = {
    min: Math.max(320, Math.round(ecRec.min * ctx.ecMult)),
    max: Math.max(420, Math.round(ecRec.max * ctx.ecMult)),
  };
  const phRec = {
    min: Math.round((Math.max(4.8, Math.min(6.9, raw.ph.min + ctx.phShift)) * 10)) / 10,
    max: Math.round((Math.max(5.0, Math.min(7.1, raw.ph.max + ctx.phShift)) * 10)) / 10,
  };
  return {
    ecMin: ecRec.min,
    ecMax: ecRec.max,
    phMin: phRec.min,
    phMax: phRec.max,
    faseKey: raw.faseKey,
    sinFecha: !c.fecha || !raw.conFasePorFecha,
  };
}

/** Hay al menos una cesta con variedad (para saber si los rangos EC/pH de cultivo aplican a esta instalación). */
function torreTieneAlgunaVariedadAsignada() {
  try {
    const cfg = state.configTorre || {};
    const nivelesActivos =
      typeof getNivelesActivos === 'function'
        ? getNivelesActivos()
        : Array.from({ length: cfg.numNiveles || NUM_NIVELES || 0 }, (_, i) => i);
    for (let i = 0; i < nivelesActivos.length; i++) {
      const n = nivelesActivos[i];
      const row = state.torre[n] || [];
      for (let j = 0; j < row.length; j++) {
        const c = row[j];
        if (c && String(c.variedad || '').trim()) return true;
      }
    }
  } catch (_) {}
  return false;
}

function getAjustesEcPhPorContexto(cfg) {
  const c = cfg || state.configTorre || {};
  let ecMult = 1;
  let phShift = 0;
  const meteo = state.meteoActual || {};
  const tempAmb = Number(meteo.temp);
  const uv = Number.isFinite(Number(meteo.uvMaxHoy)) ? Number(meteo.uvMaxHoy) : Number(meteo.uv);
  if (Number.isFinite(tempAmb)) {
    if (tempAmb >= 30) {
      ecMult *= 1.08;
      phShift += 0.1;
    } else if (tempAmb >= 26) {
      ecMult *= 1.04;
      phShift += 0.05;
    } else if (tempAmb <= 12) {
      ecMult *= 0.92;
      phShift -= 0.1;
    } else if (tempAmb <= 16) {
      ecMult *= 0.96;
      phShift -= 0.05;
    }
  }
  if ((c.ubicacion || 'exterior') === 'exterior' && Number.isFinite(uv)) {
    if (uv >= 8) {
      ecMult *= 1.04;
      phShift += 0.05;
    } else if (uv <= 2) {
      ecMult *= 0.97;
    }
  }
  if ((c.ubicacion || 'exterior') === 'interior') {
    const horasLuz = Number(c.horasLuz);
    if (Number.isFinite(horasLuz)) {
      if (horasLuz >= 17) ecMult *= 1.03;
      else if (horasLuz <= 12) ecMult *= 0.96;
    }
  }
  const out = {
    ecMult: Math.max(0.82, Math.min(1.2, ecMult)),
    phShift: Math.max(-0.2, Math.min(0.2, phShift)),
  };
  const intensity = getEcPhIntensity(c);
  if (intensity === 'conservador') {
    out.ecMult = Math.max(0.82, Math.min(1.2, out.ecMult * 0.96));
    out.phShift = out.phShift * 0.7;
  } else if (intensity === 'intensivo') {
    out.ecMult = Math.max(0.82, Math.min(1.2, out.ecMult * 1.04));
    out.phShift = out.phShift * 1.2;
  }
  return out;
}

function getRecomendacionEcPhTorre() {
  const cfg = state.configTorre || {};
  const strategy = getEcPhStrategy(cfg);
  const nut = getNutrienteTorre();
  if (strategy === 'manual') {
    const ecM = getEcObjetivoManualUs(cfg);
    const phM = getPhObjetivoManualRango(cfg, nut);
    const ecLo = ecM != null ? Math.max(250, ecM - 60) : (nut.ecObjetivo?.[0] || 900);
    const ecHi = ecM != null ? Math.min(6200, ecM + 60) : (nut.ecObjetivo?.[1] || 1400);
    return {
      ec: { min: ecLo, max: ecHi },
      ph: { min: phM[0], max: phM[1] },
      faseDominante: 'manual',
      conFaseReal: false,
      contexto: { ecMult: 1, phShift: 0 },
      estrategia: 'manual',
    };
  }
  const nivelesActivos = typeof getNivelesActivos === 'function'
    ? getNivelesActivos()
    : Array.from({ length: (cfg.numNiveles || NUM_NIVELES) }, (_, i) => i);
  const rangosEc = [];
  const rangosPh = [];
  const fases = {};
  let totalConFecha = 0;
  for (let i = 0; i < nivelesActivos.length; i++) {
    const n = nivelesActivos[i];
    (state.torre[n] || []).forEach(c => {
      if (!c || !c.variedad) return;
      const slice = torreSliceEcPhCestaRaw(c, cfg);
      if (!slice) return;
      if (slice.conFasePorFecha && slice.faseKey) {
        fases[slice.faseKey] = (fases[slice.faseKey] || 0) + 1;
        totalConFecha++;
      }
      if (Number.isFinite(slice.ec.min) && Number.isFinite(slice.ec.max)) rangosEc.push({ min: slice.ec.min, max: slice.ec.max });
      if (Number.isFinite(slice.ph.min) && Number.isFinite(slice.ph.max)) rangosPh.push({ min: slice.ph.min, max: slice.ph.max });
    });
  }

  let ecRec;
  if (rangosEc.length === 0) {
    const nut = getNutrienteTorre();
    ecRec = { min: nut.ecObjetivo?.[0] || 900, max: nut.ecObjetivo?.[1] || 1400 };
  } else {
    const ecMin = Math.max(...rangosEc.map(r => r.min));
    const ecMax = Math.min(...rangosEc.map(r => r.max));
    ecRec = ecMax >= ecMin + 80
      ? { min: ecMin, max: ecMax }
      : {
          min: Math.round(rangosEc.reduce((s, r) => s + r.min, 0) / rangosEc.length),
          max: Math.round(rangosEc.reduce((s, r) => s + r.max, 0) / rangosEc.length),
          advertencia: true,
        };
  }
  ecRec = aplicarAjusteEcObjetivoPorInstalacion(ecRec, cfg);
  const ctx = getAjustesEcPhPorContexto(cfg);
  ecRec = {
    ...ecRec,
    min: Math.max(320, Math.round(ecRec.min * ctx.ecMult)),
    max: Math.max(420, Math.round(ecRec.max * ctx.ecMult)),
  };

  let phRec;
  if (rangosPh.length === 0) {
    const nut = getNutrienteTorre();
    const b = nut && Array.isArray(nut.pHRango) ? nut.pHRango : [5.5, 6.5];
    phRec = { min: b[0], max: b[1] };
  } else {
    const pMin = Math.max(...rangosPh.map(r => r.min));
    const pMax = Math.min(...rangosPh.map(r => r.max));
    phRec = pMax >= pMin + 0.15
      ? { min: pMin, max: pMax }
      : {
          min: Math.round((rangosPh.reduce((s, r) => s + r.min, 0) / rangosPh.length) * 10) / 10,
          max: Math.round((rangosPh.reduce((s, r) => s + r.max, 0) / rangosPh.length) * 10) / 10,
          advertencia: true,
        };
  }
  phRec = {
    ...phRec,
    min: Math.round((Math.max(4.8, Math.min(6.9, Number(phRec.min) + ctx.phShift)) * 10)) / 10,
    max: Math.round((Math.max(5.0, Math.min(7.1, Number(phRec.max) + ctx.phShift)) * 10)) / 10,
  };

  const dom = Object.entries(fases).sort((a, b) => b[1] - a[1])[0];
  return {
    ec: ecRec,
    ph: phRec,
    faseDominante: dom ? dom[0] : null,
    conFaseReal: totalConFecha > 0,
    contexto: ctx,
    estrategia: 'auto',
  };
}

// EC óptima según cultivos plantados en la torre ACTIVA (no setup)
function getECOptimaTorre() {
  return getRecomendacionEcPhTorre().ec;
}

function getPhOptimaTorre(nut, cfg) {
  const rec = getRecomendacionEcPhTorre();
  if (rec && rec.ph) return [rec.ph.min, rec.ph.max];
  const n = nut || getNutrienteTorre();
  const b = n && Array.isArray(n.pHRango) ? n.pHRango : [5.5, 6.5];
  return [b[0], b[1]];
}

/** Días desde el trasplante/germinación en registro: menor valor entre todas las plantas con fecha. */
function getMenorDiasDesdeTrasplanteEnTorreActiva() {
  let best = Infinity;
  try {
    const tor = state.torre || [];
    for (let n = 0; n < tor.length; n++) {
      const row = tor[n] || [];
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (!c || !c.variedad || !c.fecha) continue;
        const ms = new Date(c.fecha).getTime();
        if (!Number.isFinite(ms)) continue;
        const d = Math.floor((Date.now() - ms) / 86400000);
        if (d >= 0) best = Math.min(best, d);
      }
    }
  } catch (_) {}
  return best === Infinity ? null : best;
}

/** ~12 días tras plantar: reduce EC meta y CalMag (arranque suave en hidro). Sin plantas con fecha → 1. */
const DIAS_ARRANQUE_PLANTULA_HIDRO = 12;

function getFactorArranquePlantulaHidro() {
  const d = getMenorDiasDesdeTrasplanteEnTorreActiva();
  if (d == null || d > DIAS_ARRANQUE_PLANTULA_HIDRO) return 1;
  const t = d / DIAS_ARRANQUE_PLANTULA_HIDRO;
  return Math.max(0.52, Math.min(1, 0.52 + t * 0.48));
}

/** EC meta (µS/cm) para recarga / checklist: manual en torre o intermedio óptimo automático */
function getRecargaEcMetaMicroS() {
  const cfg = state.configTorre || {};
  const strategy = getEcPhStrategy(cfg);
  if (strategy === 'manual') {
    const m = getEcObjetivoManualUs(cfg);
    if (m != null) return m;
  }
  const checklistManual = Number(cfg.checklistEcObjetivoUs);
  if (Number.isFinite(checklistManual) && checklistManual >= 200 && checklistManual <= 6000) {
    return Math.round(checklistManual);
  }
  const o = getECOptimaTorre();
  let meta = Math.round((o.min + o.max) / 2);
  const fa = getFactorArranquePlantulaHidro();
  if (fa < 1) {
    meta = Math.round(meta * fa);
    meta = Math.max(320, meta);
  }
  return meta;
}

/**
 * Preferencia global CalMag (checklist / tipo de agua), sin mirar una marca concreta.
 * Usar en tablas que listan todas las marcas (p. ej. Consejos).
 */
function usarPreferenciaCalMagRecargaGlobal() {
  const cfg = state.configTorre || {};
  const v = cfg.checklistUsarCalMag;
  if (v === true) return true;
  if (v === false) return false;
  const agua = cfg.agua || state.configAgua || 'destilada';
  if (agua === 'grifo') return false;
  return true;
}

/**
 * ¿Incluir CalMag en esta fila de Consejos (columna destilada/ósmosis)? Respeta marca + config torre.
 * Si tu agua en Mediciones es **grifo**, las columnas blandas siguen mostrando la guía «agua blanda + CalMag».
 */
function usarCalMagConsejosFilaBlanda(nut) {
  if (!nut || !nut.calmagNecesario) return false;
  const cfg = state.configTorre || {};
  const agua = cfg.agua || state.configAgua || 'destilada';
  if (agua === 'grifo') return true;
  return usarPreferenciaCalMagRecargaGlobal();
}

/**
 * CalMag opcional: el usuario puede marcarlo en el checklist; si no ha tocado el ajuste,
 * por defecto ON con agua blanda (destilada/ósmosis) y OFF con grifo — si la línea no lleva CalMag, siempre false.
 */
function usarCalMagEnRecarga() {
  const nut = getNutrienteTorre();
  if (!nut.calmagNecesario) return false;
  return usarPreferenciaCalMagRecargaGlobal();
}

function getSetupVolumenMaxLitros() {
  if (typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion === 'dwc') {
    const dwcCap = getDwcCapacidadLitrosFromSetupInputs();
    if (dwcCap != null && dwcCap > 0) {
      return Math.min(800, Math.max(1, Math.round(dwcCap * 10) / 10));
    }
  }
  return parseInt(document.getElementById('sliderVol')?.value || 20, 10);
}

function getSetupVolumenMezclaLitros() {
  const maxL = getSetupVolumenMaxLitros();
  const raw = document.getElementById('setupVolMezclaL')?.value;
  const m = parseFloat(String(raw || '').replace(',', '.'));
  if (!Number.isFinite(m) || m <= 0) return maxL;
  if (m >= maxL - 0.02) return maxL;
  return Math.min(maxL, Math.max(0.5, Math.round(m * 10) / 10));
}

function getSetupECObjetivo() {
  // EC óptima según cultivos seleccionados en spage6
  if (setupPlantasSeleccionadas.size === 0) {
    // Sin cultivos → usar EC del nutriente
    const nut = NUTRIENTES_DB.find(n => n.id === setupNutriente) || NUTRIENTES_DB[0];
    let out = { min: nut.ecObjetivo?.[0] || 900, max: nut.ecObjetivo?.[1] || 1400, fuente: 'nutriente' };
    if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
      const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
      out = { ...out, min: adj.min, max: adj.max };
    }
    return out;
  }
  // Con cultivos → calcular intersección de rangos
  const rangos = [];
  setupPlantasSeleccionadas.forEach(gKey => {
    const g = GRUPOS_CULTIVO[gKey];
    if (!g) return;
    const partes = g.ec.split('-').map(Number);
    if (partes.length === 2) rangos.push({ min: partes[0], max: partes[1] });
  });
  if (rangos.length === 0) {
    let out = { min: 900, max: 1400, fuente: 'default' };
    if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
      const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
      out = { ...out, min: adj.min, max: adj.max };
    }
    return out;
  }
  const ecMin = Math.max(...rangos.map(r => r.min));
  const ecMax = Math.min(...rangos.map(r => r.max));
  if (ecMax >= ecMin + 100) {
    let out = { min: ecMin, max: ecMax, fuente: 'cultivos' };
    if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
      const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
      out = { ...out, min: adj.min, max: adj.max };
    }
    return out;
  }
  // Sin intersección → promedio
  const avgMin = Math.round(rangos.reduce((s,r) => s+r.min,0) / rangos.length);
  const avgMax = Math.round(rangos.reduce((s,r) => s+r.max,0) / rangos.length);
  let out = { min: avgMin, max: avgMax, fuente: 'promedio', advertencia: true };
  if (setupTipoInstalacion === 'torre' || setupTipoInstalacion === 'dwc') {
    const adj = aplicarAjusteEcObjetivoPorInstalacion(out, state.configTorre || {});
    out = { ...out, min: adj.min, max: adj.max };
  }
  return out;
}

function calcularDosisSetup(nutId, vol, ecObj) {
  const nut = NUTRIENTES_DB.find(n => n.id === nutId) || NUTRIENTES_DB[0];
  const ecObjetivo = ecObj || getSetupECObjetivo();
  const ecMeta = Math.round((ecObjetivo.min + ecObjetivo.max) / 2); // EC central del rango

  const mlCalMag = usarCalMagEnRecarga()
    ? Math.round(nut.calmagMl * (vol / 18) * 10) / 10
    : 0;
  const ecCalMag = estimarEcCalMagMicroS(mlCalMag, vol);

  const partes = nut.partes || 2;
  const mlPorParte = [];
  for (let i = 0; i < partes; i++) {
    mlPorParte.push(mlNutrientePorParte(nut.id, i, vol));
  }
  const mlAB = mlPorParte[0];

  return { nut, vol, mlCalMag, ecCalMag, mlAB, mlPorParte, ecMeta, ecObjetivo };
}

function renderDosisSetup() {
  const preview = document.getElementById('nutProtocoloPreview');
  if (!preview) return;

  const volMax = getSetupVolumenMaxLitros();
  const vol    = getSetupVolumenMezclaLitros();
  const ecObj  = getSetupECObjetivo();
  const d      = calcularDosisSetup(setupNutriente, vol, ecObj);
  const nut    = d.nut;
  const orden  = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A', 'Parte B', 'Parte C'];

  let html = '<div class="nut-dosis-titulo">📋 Dosis calculadas para esta instalación</div>';

  // Contexto del cálculo
  html += '<div class="nut-dosis-ctx">' +
    '📦 Depósito máx.: <strong>' + volMax + ' L</strong>' +
    (vol < volMax - 0.05 ? ' · mezcla <strong>' + vol + ' L</strong>' : '') + ' · ' +
    '⚡ EC objetivo: <strong>' + ecObj.min + '–' + ecObj.max + ' µS/cm</strong>' +
    (ecObj.fuente === 'cultivos' ? ' <span class="nut-dosis-ctx-tag--ok">(según cultivos)</span>' :
     ecObj.fuente === 'promedio' ? ' <span class="nut-dosis-ctx-tag--warn">⚠️ cultivos con EC diferente</span>' :
     ' <span class="nut-dosis-ctx-tag--muted">(según nutriente)</span>') +
    '</div>';

  // Pasos de adición en orden
  let paso = 1;
  if (usarCalMagEnRecarga() && d.mlCalMag > 0) {
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> CalMag</span>' +
      '<span class="nut-dosis-val-green">' + d.mlCalMag + ' ml</span></div>';
  }

  const mPart = d.mlPorParte || [d.mlAB];
  if (nut.partes === 1) {
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + orden[0] + '</span>' +
      '<span class="nut-dosis-val-green">' + mPart[0] + ' ml</span></div>';
  } else if (nut.partes === 2) {
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + orden[0] + '</span>' +
      '<span class="nut-dosis-val-green">' + mPart[0] + ' ml</span></div>';
    html += '<div class="nut-dosis-row">' +
      '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + orden[1] + '</span>' +
      '<span class="nut-dosis-val-green">' + mPart[1] + ' ml</span></div>';
  } else if (nut.partes === 3) {
    [orden[0], orden[1], orden[2]].forEach((parte, idx) => {
      html += '<div class="nut-dosis-row">' +
        '<span class="nut-dosis-lab"><strong>' + paso++ + '.</strong> ' + parte + '</span>' +
        '<span class="nut-dosis-val-green">' + (mPart[idx] || d.mlAB) + ' ml</span></div>';
    });
  }

  // pH
  const pHRango =
    typeof torreGetPhRangoObjetivo === 'function' ? torreGetPhRangoObjetivo(nut, state.configTorre || {}) : (nut.pHRango || [5.5, 6.5]);
  html += '<div class="nut-dosis-row nut-dosis-row--ph">' +
    '<span class="nut-dosis-lab"><strong>' + paso + '.</strong> pH objetivo</span>' +
    '<span class="nut-dosis-val-blue">' + pHRango[0] + '–' + pHRango[1] + '</span></div>';

  if (nut.pHBuffer) {
    html += '<div class="nut-dosis-buffer">⚠️ Buffer integrado: sube pH solo hasta ' +
      pHRango[0] + ' y deja actuar los buffers</div>';
  }

  // Advertencia especial para GHE Flora (Micro siempre primero)
  if (nut.id === 'ghe_flora') {
    html += '<div class="nut-dosis-ghe">⚠️ GHE: añadir FloraMicro SIEMPRE PRIMERO. ' +
      'Nunca mezclar Micro directamente con Bloom.</div>';
  }
  html += '<div class="nut-dosis-foot">' +
    '* Dosis finales se confirman en el checklist tras medir EC real</div>';

  preview.classList.remove('setup-hidden');
  preview.innerHTML = html;
}

function selNutriente(id) {
  setupNutriente = id;
  document.querySelectorAll('.nutriente-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', c.id === 'nut-' + id ? 'true' : 'false');
  });
  document.getElementById('nut-' + id)?.classList.add('selected');
  // Recalcular dosis con volumen actual y cultivos seleccionados
  renderDosisSetup();
}

function buscarCiudadSetup(query) {
  const res = buscarMunicipio(query);
  const el = document.getElementById('setupCiudadResults');
  window._setupMunicipioResultados = res;
  if (!query || query.length < 2 || res.length === 0) {
    el.classList.add('setup-hidden'); return;
  }
  el.classList.remove('setup-hidden');
  el.innerHTML = res.map(([nombre, data], idx) => `
    <button type="button" onclick="selMunicipioSetupIdx(${idx})"
      class="setup-city-option">
      <span>
        <span class="setup-city-option-name">${nombre}</span>
        <span class="setup-city-option-note">${data.nota}</span>
      </span>
      <span class="setup-city-option-ec">${data.ec} µS</span>
    </button>`).join('');
}

function selMunicipioSetupIdx(idx) {
  if (!window._setupMunicipioResultados) return;
  const [nombre, data] = window._setupMunicipioResultados[idx];
  setupCoordenadas = { lat: null, lon: null, ciudad: nombre, ec: data.ec };
  const cIn = document.getElementById('setupCiudad');
  if (cIn) cIn.value = nombre;
  document.getElementById('setupCiudadResults')?.classList.add('setup-hidden');
  document.getElementById('setupCiudadSeleccionada')?.classList.remove('setup-hidden');
  const selTxt = document.getElementById('setupCiudadSeleccionada');
  if (selTxt) {
    selTxt.textContent =
      '✅ ' + nombre + ' · EC agua: ' + data.ec + ' µS/cm · ' + data.dureza;
  }
}

async function detectarCiudadSetup() {
  if (!navigator.geolocation) return;
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
    const { latitude, longitude } = pos.coords;
    const url = 'https://nominatim.openstreetmap.org/reverse?lat=' + latitude +
      '&lon=' + longitude + '&format=json&accept-language=es';
    const data = await (await fetch(url, { headers: { 'User-Agent': 'HidroCultivo/1.0' } })).json();
    const ad = data.address || {};
    const ciudad = ad.city || ad.town || ad.village || ad.municipality || '';
    const prov = ad.state || ad.region || '';
    const country = ad.country || '';
    if (ciudad) {
      const nombre = [ciudad, prov, country].filter(Boolean).join(', ');
      selCiudadSetup(nombre, latitude, longitude);
      const sel = document.getElementById('ciudadSeleccionadaSetup');
      if (sel) {
        sel.classList.remove('setup-hidden');
        sel.textContent = '📍 ' + nombre + ' (GPS)';
      }
    } else {
      showToast('No se pudo obtener el municipio desde el GPS', true);
    }
  } catch (e) {
    showToast('No se pudo detectar la ubicación', true);
  }
}

function guardarSetupYContinuar() {
  if (setupEsNuevaTorre) {
    const inpNom = document.getElementById('setupNombreInstalacionInput');
    if (inpNom) setupNombreNuevaTorre = (inpNom.value || '').trim().slice(0, 40);
    if (!setupNombreNuevaTorre) {
      showToast('Escribe un nombre para esta instalación (paso de dimensiones)', true);
      setupPagina = 1;
      renderSetupPage();
      document.getElementById('setupNombreInstalacionInput')?.focus();
      return;
    }
    if (setupTipoInstalacion !== 'torre' && setupTipoInstalacion !== 'nft' && setupTipoInstalacion !== 'dwc') {
      showToast('Elige Torre, NFT o DWC en el primer paso del asistente', true);
      setupPagina = 0;
      renderSetupPage();
      return;
    }
  }

  const isNft = setupTipoInstalacion === 'nft';
  const isDwc = setupTipoInstalacion === 'dwc';
  let niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10);
  let cestas  = parseInt(document.getElementById('sliderCestas')?.value  || 5, 10);
  let nftNvSlider = 4;
  if (isNft) {
    const nftMont = readNftMontajeFromSetupUi();
    if ((nftMont.disposicion === 'pared' || nftMont.disposicion === 'escalera') && nftMont.alturaBombeoCm <= 0) {
      showToast('Indica la altura de bombeo (cm) hasta el 1.º tubo: en pared y escalera es imprescindible para calcular la bomba.', true);
      setupPagina = 1;
      renderSetupPage();
      document.getElementById('nftAlturaBombeoCm')?.focus();
      return;
    }
    nftNvSlider = parseInt(document.getElementById('sliderNftCanales')?.value || 4, 10);
    cestas = parseInt(document.getElementById('sliderNftHuecos')?.value || 8, 10);
    niveles = Math.max(1, Math.min(24, nftNvSlider));
    if (nftMont.disposicion === 'mesa' && nftMont.mesaMultinivel) {
      const tiers = parseNftMesaTubosPorNivelStr(nftMont.mesaTubosStr);
      if (tiers.length >= 2) niveles = Math.min(24, tiers.reduce((a, b) => a + b, 0));
    } else if (nftMont.disposicion === 'escalera') {
      niveles = Math.min(24, Math.max(1, nftNvSlider * nftMont.escaleraCaras));
    }
  }
  let vol       = parseInt(document.getElementById('sliderVol')?.value     || 20, 10);
  const nftPend = isNft ? parseInt(document.getElementById('sliderNftPendiente')?.value || 2, 10) : null;
  if (isDwc) {
    const dwcCapG = getDwcCapacidadLitrosFromSetupInputs();
    if (dwcCapG != null && dwcCapG > 0) {
      vol = Math.min(800, Math.max(1, Math.round(dwcCapG)));
    }
  }

  const tipoNuevoPrevio = isNft ? 'nft' : isDwc ? 'dwc' : 'torre';

  initTorres();
  const idxSlotGuardar = state.torreActiva || 0;
  /** Guardar la instalación activa tal como está en memoria antes de que el asistente la sobrescriba. */
  guardarEstadoTorreActual();

  const tipoEnSlotAntes = tipoInstalacionNormalizado(state.torres[idxSlotGuardar]?.config);

  let crearNuevaPorCambioTipo = false;
  if (!setupEsNuevaTorre && state.torres[idxSlotGuardar] && tipoEnSlotAntes !== tipoNuevoPrevio) {
    if (state.torres.length >= MAX_TORRES) {
      showToast(
        'Cambiar el tipo de instalación crearía una instalación nueva, pero ya tienes el máximo (' +
          MAX_TORRES +
          '). Elimina una con la papelera en la lista de instalaciones o ajusta el tipo en otra ranura libre.',
        true
      );
      return;
    }
    const etiquetas = { torre: 'torre vertical', nft: 'NFT', dwc: 'DWC' };
    const nomAnt = etiquetas[tipoEnSlotAntes] || tipoEnSlotAntes;
    const nomNuevo = etiquetas[tipoNuevoPrevio] || tipoNuevoPrevio;
    if (
      !confirm(
        'La instalación activa es ' +
          nomAnt +
          ' y en el asistente has elegido ' +
          nomNuevo +
          '.\n\n' +
          'Para no borrar la instalación anterior, se creará una instalación nueva con estos datos; la de ' +
          nomAnt +
          ' seguirá en la lista (selector de instalación arriba).\n\n¿Continuar?'
      )
    ) {
      return;
    }
    crearNuevaPorCambioTipo = true;
    const pref = tipoNuevoPrevio === 'dwc' ? 'DWC' : tipoNuevoPrevio === 'nft' ? 'NFT' : 'Torre';
    setupNombreNuevaTorre = pref + ' ' + (state.torres.length + 1);
  }

  const usarNuevaEntrada = setupEsNuevaTorre || crearNuevaPorCambioTipo;

  const sensHwGuardar = {
    ec: !!(setupData.sensoresHardware && setupData.sensoresHardware.ec),
    ph: !!(setupData.sensoresHardware && setupData.sensoresHardware.ph),
    humedad: !!(setupData.sensoresHardware && setupData.sensoresHardware.humedad),
  };

  const prevLocMet = (!setupEsNuevaTorre && state.configTorre && state.configTorre.localidadMeteo)
    ? String(state.configTorre.localidadMeteo).trim() : '';
  const ciudadWizard = String(setupCoordenadas.ciudad || setupData.ciudad || '').trim();
  const parseCoord = (a, b) => {
    const tryN = (v) => {
      if (v == null || v === '') return NaN;
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : NaN;
    };
    const na = tryN(a);
    if (Number.isFinite(na)) return na;
    return tryN(b);
  };
  const latWizard = parseCoord(setupCoordenadas.lat, setupData.lat);
  const lonWizard = parseCoord(setupCoordenadas.lon, setupData.lon);
  const locWizard = ciudadWizard.split(',')[0].trim();
  const ubicEffGuardar = setupData.ubicacion || setupUbicacion || 'exterior';
  if (usarNuevaEntrada && ubicEffGuardar === 'exterior') {
    if (!ciudadWizard || !Number.isFinite(latWizard) || !Number.isFinite(lonWizard)) {
      showToast(
        'En exterior indica la ciudad del mapa en el paso de luz y ubicación: cada instalación usa el clima de su municipio.',
        true
      );
      setupPagina = 5;
      renderSetupPage();
      return;
    }
  }

  // Guardar configuración en state
  const horasLuzGuardar = Math.max(12, Math.min(20,
    parseInt(String(document.getElementById('sliderHorasLuz')?.value || setupData.horasLuz || 16), 10) || 16));
  setupData.horasLuz = horasLuzGuardar;

  state.configTorre = {
    tipoInstalacion: isNft ? 'nft' : isDwc ? 'dwc' : 'torre',
    tipoTorre:    'custom',
    numNiveles:   niveles,
    numCestas:    cestas,
    volDeposito:  vol,
    agua:         setupData.agua || 'destilada',
    checklistInstalacionConfirmada: true,
    ubicacion:    setupData.ubicacion || setupUbicacion || 'exterior',
    luz:          setupData.luz || 'led',
    horasLuz:     horasLuzGuardar,
    equipamiento: [...setupEquipamiento],
    nutriente:    setupNutriente,
    tamanoCesta:  setupTamanoCesta,
    tamanoCestaCustom: document.getElementById('cestaCmCustom')?.value || '',
    diametroTubo:  setupDiametroTubo,
    antiRaices:    setupAntiRaices,
    alturaTorre:   setupAlturaTorre,
    bombaCalculada: window.setupBombaCalculada || null,
    ciudad:       ciudadWizard || 'Castelló de la Plana',
    lat:          Number.isFinite(latWizard) ? latWizard : 39.9864,
    lon:          Number.isFinite(lonWizard) ? lonWizard : -0.0495,
    localidadMeteo: usarNuevaEntrada ? (locWizard || '') : (locWizard || prevLocMet || ''),
    sensoresHardware: sensHwGuardar,
    consejosModoUi: setupData.consejosModoUi === 'avanzado' ? 'avanzado' : 'principiante',
    torreObjetivoCultivo:
      ((state.configTorre && state.configTorre.torreObjetivoCultivo) || 'final'),
  };
  const ccSetup = parseFloat(String(document.getElementById('setupCalentadorConsignaC')?.value || '').replace(',', '.'));
  if (setupEquipamiento.has('calentador') && Number.isFinite(ccSetup) && ccSetup >= 10 && ccSetup <= 35) {
    state.configTorre.calentadorConsignaC = Math.round(ccSetup * 10) / 10;
  } else {
    delete state.configTorre.calentadorConsignaC;
  }
  if (isNft) {
    state.configTorre.nftNumCanales = niveles;
    state.configTorre.nftHuecosPorCanal = cestas;
    state.configTorre.nftPendientePct = Math.max(1, Math.min(4, nftPend != null ? nftPend : 2));
    state.configTorre.nftTuboInteriorMm = setupNftTuboMm;
    const geomSv = readNftCanalGeomFromSetupUi();
    state.configTorre.nftCanalForma = geomSv.forma;
    state.configTorre.nftCanalDiamMm = geomSv.diamMm;
    state.configTorre.nftCanalAnchoMm = geomSv.anchoMm;
    state.configTorre.nftLaminaAguaMm = geomSv.laminaMm;
    if (geomSv.longCanalM != null) state.configTorre.nftLongCanalM = geomSv.longCanalM;
    else delete state.configTorre.nftLongCanalM;
    delete state.configTorre.nftMesaMultinivel;
    delete state.configTorre.nftMesaTubosPorNivelStr;
    delete state.configTorre.nftMesaSeparacionNivelesCm;
    delete state.configTorre.nftEscaleraCaras;
    delete state.configTorre.nftEscaleraNivelesCara;
    const montSv = readNftMontajeFromSetupUi();
    state.configTorre.nftDisposicion = montSv.disposicion;
    if (montSv.alturaBombeoCm > 0) state.configTorre.nftAlturaBombeoCm = montSv.alturaBombeoCm;
    else delete state.configTorre.nftAlturaBombeoCm;
    if (montSv.disposicion === 'mesa' && montSv.mesaMultinivel) {
      const tiersSv = parseNftMesaTubosPorNivelStr(montSv.mesaTubosStr);
      if (tiersSv.length >= 2) {
        state.configTorre.nftMesaMultinivel = true;
        state.configTorre.nftMesaTubosPorNivelStr = tiersSv.join(',');
        if (montSv.mesaSepCm > 0) state.configTorre.nftMesaSeparacionNivelesCm = montSv.mesaSepCm;
      }
    }
    if (montSv.disposicion === 'escalera') {
      state.configTorre.nftEscaleraCaras = montSv.escaleraCaras;
      state.configTorre.nftEscaleraNivelesCara = Math.max(1, Math.min(12, nftNvSlider));
    }
    state.configTorre.nftBombaEstimada = getNftBombaDesdeConfig(state.configTorre);
    const lhInp = document.getElementById('nftBombaUsuarioLh');
    const wInp = document.getElementById('nftBombaUsuarioW');
    const uLh = lhInp ? parseFloat(String(lhInp.value).replace(',', '.')) : NaN;
    const uW = wInp ? parseFloat(String(wInp.value).replace(',', '.')) : NaN;
    if (Number.isFinite(uLh) && uLh > 0) state.configTorre.nftBombaUsuarioCaudalLh = Math.round(uLh);
    else delete state.configTorre.nftBombaUsuarioCaudalLh;
    if (Number.isFinite(uW) && uW > 0) state.configTorre.nftBombaUsuarioPotenciaW = Math.round(uW);
    else delete state.configTorre.nftBombaUsuarioPotenciaW;
    const vPump = validarBombaUsuarioNftVsCalculo(
      state.configTorre.nftBombaEstimada,
      lhInp ? lhInp.value : '',
      wInp ? wInp.value : ''
    );
    if (vPump.tipo === 'error' && vPump.toast) showToast(vPump.toast, true);
    state.configTorre.nftObjetivoCultivo =
      typeof nftGetObjetivoCultivo === 'function'
        ? nftGetObjetivoCultivo(state.configTorre)
        : 'final';
    const potRimEl = document.getElementById('setupNftPotRimMm');
    const potHEl = document.getElementById('setupNftPotHmm');
    const rimParsed = parseInt(String(potRimEl?.value ?? '').trim(), 10);
    const hParsed = parseInt(String(potHEl?.value ?? '').trim(), 10);
    if (Number.isFinite(rimParsed) && rimParsed >= 25 && rimParsed <= 120) {
      state.configTorre.nftNetPotRimMm = rimParsed;
    } else {
      delete state.configTorre.nftNetPotRimMm;
    }
    if (Number.isFinite(hParsed) && hParsed >= 30 && hParsed <= 200) {
      state.configTorre.nftNetPotHeightMm = hParsed;
    } else {
      delete state.configTorre.nftNetPotHeightMm;
    }
  } else {
    delete state.configTorre.nftNumCanales;
    delete state.configTorre.nftHuecosPorCanal;
    delete state.configTorre.nftPendientePct;
    delete state.configTorre.nftTuboInteriorMm;
    delete state.configTorre.nftBombaEstimada;
    delete state.configTorre.nftBombaUsuarioCaudalLh;
    delete state.configTorre.nftBombaUsuarioPotenciaW;
    delete state.configTorre.nftCanalForma;
    delete state.configTorre.nftCanalDiamMm;
    delete state.configTorre.nftCanalAnchoMm;
    delete state.configTorre.nftLaminaAguaMm;
    delete state.configTorre.nftLongCanalM;
    delete state.configTorre.nftDisposicion;
    delete state.configTorre.nftAlturaBombeoCm;
    delete state.configTorre.nftMesaMultinivel;
    delete state.configTorre.nftMesaTubosPorNivelStr;
    delete state.configTorre.nftMesaSeparacionNivelesCm;
    delete state.configTorre.nftEscaleraCaras;
    delete state.configTorre.nftEscaleraNivelesCara;
    delete state.configTorre.nftNetPotRimMm;
    delete state.configTorre.nftNetPotHeightMm;
    delete state.configTorre.nftObjetivoCultivo;
  }
  if (isDwc) {
    dwcMergeCamposFormularioEnCfg(state.configTorre, DWC_FORM_IDS_SETUP);
    if (
      typeof dwcValidarVolumenManualSegunForma === 'function' &&
      !dwcValidarVolumenManualSegunForma(state.configTorre, 'setup')
    ) {
      return;
    }
    dwcSincronizarTamanoCestaDesdeRim(state.configTorre);
    try {
      dwcSyncVolDepositoDesdeCapacidadEstimada(state.configTorre);
    } catch (eSync) {}
  }
  const volEfectivo =
    isDwc && Number(state.configTorre.volDeposito) > 0
      ? Number(state.configTorre.volDeposito)
      : vol;
  const mezParsed = parseFloat(String(document.getElementById('setupVolMezclaL')?.value || '').replace(',', '.'));
  if (Number.isFinite(mezParsed) && mezParsed > 0 && mezParsed < volEfectivo - 0.02) {
    state.configTorre.volMezclaLitros = Math.min(volEfectivo, Math.max(0.5, Math.round(mezParsed * 10) / 10));
  } else {
    delete state.configTorre.volMezclaLitros;
  }
  invalidateMeteoNomiCache();
  const su = normalizaSustratoKey(setupData.sustrato);
  state.configTorre.sustrato = su;
  state.configSustrato = su;

  // Aplicar constantes del nutriente seleccionado
  const nut = NUTRIENTES_DB.find(n => n.id === setupNutriente) || NUTRIENTES_DB[0];
  // Las constantes se usarán dinámicamente en evalEC y checklist

  // Reinicializar torre con nueva configuración
  state.torre = [];
  for (let n = 0; n < niveles; n++) {
    state.torre.push([]);
    for (let c = 0; c < cestas; c++) {
      state.torre[n].push({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
    }
  }

  // Guardar cultivos seleccionados en el setup
  state.configTorre.cultivosIniciales = [...setupPlantasSeleccionadas];
  state.configTorre.multiplesT = setupNumTorres;

  if (usarNuevaEntrada) {
    // ── NUEVA ENTRADA EN state.torres (nueva instalación o cambio de tipología) ──
    setupEsNuevaTorre = false;
    const EMOJIS = ['🌿','🌱','🥬','🍃','🌾','🪴','🌻','🫛','🎍'];
    const nTorres = (state.torres || []).length;
    const nuevaTorre = {
      id: Date.now(),
      nombre: setupNombreNuevaTorre,
      emoji: isNft ? '🪴' : isDwc ? '🫧' : EMOJIS[nTorres % EMOJIS.length],
      config: { ...state.configTorre },
      torre: JSON.parse(JSON.stringify(state.torre)),
      modoActual: 'lechuga',
      mediciones: [],
      registro: [],
      ultimaMedicion: null,
      ultimaRecarga: null,
      recargaSnoozeHasta: null,
      fotosSistemaCompleto: { fotoKeys: [], fotos: [] },
    };
    if (!state.torres) state.torres = [];
    state.torres.push(nuevaTorre);
    const newIdx = state.torres.length - 1;
    state.torreActiva = newIdx;
    try {
      cargarEstadoTorre(newIdx);
    } catch (eCarga) {
      state.torre = nuevaTorre.torre;
      state.mediciones = [];
      state.registro = [];
      state.ultimaMedicion = null;
      state.ultimaRecarga = null;
      state.recargaSnoozeHasta = null;
    }
  } else {
    // ── RECONFIGURAR TORRE EXISTENTE ──────────────────────────────────────
    const tIdx = state.torreActiva || 0;
    if (state.torres && state.torres[tIdx]) {
      state.torres[tIdx].config = { ...state.configTorre };
      state.torres[tIdx].torre  = JSON.parse(JSON.stringify(state.torre));
    }
  }

  saveState();
  aplicarConfigTorre();
  actualizarHeaderTorre();
  actualizarBadgesNutriente();
  renderTorre();
  updateTorreStats();
  updateDashboard();

  // Mostrar panel checklist PRIMERO, luego cerrar setup
  preguntarIniciarChecklist();
  setTimeout(() => cerrarSetup(), 50);
}

function preguntarIniciarChecklist() {
  try {
  const nut        = getNutrienteTorre();
  const cfg        = state.configTorre || {};
  const torre      = state.torres?.[state.torreActiva || 0];
  const nombreTorre = (torre?.nombre || '').trim() || 'Instalación';
  const volMax     = getVolumenDepositoMaxLitros(cfg);
  const vol        = getVolumenMezclaLitros(cfg);
  const ecObj      = getECOptimaTorre();
  const faArr      = typeof getFactorArranquePlantulaHidro === 'function' ? getFactorArranquePlantulaHidro() : 1;
  const ecMetaRec  = typeof getRecargaEcMetaMicroS === 'function' ? getRecargaEcMetaMicroS() : Math.round((ecObj.min + ecObj.max) / 2);

  const mlCalMag   = calcularMlCalMag();
  const ecCalMag   = estimarEcCalMagMicroS(mlCalMag, vol);
  const orden      = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A','Parte B','Parte C'];
  const mlCadaParte = [];
  for (let i = 0; i < (nut.partes || 2); i++) {
    mlCadaParte.push(typeof calcularMlParteNutriente === 'function' ? calcularMlParteNutriente(i) : mlNutrientePorParte(nut.id, i, vol));
  }

  let dosisLineas = '';
  if (mlCalMag > 0) {
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>1. CalMag</span><span class="check-dosis-val-green">' + mlCalMag + ' ml</span></div>';
  }
  let paso = mlCalMag > 0 ? 2 : 1;
  if (nut.partes === 1) {
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>' + paso++ + '. ' + orden[0] + '</span><span class="check-dosis-val-green">' + mlCadaParte[0] + ' ml</span></div>';
  } else if (nut.partes === 2) {
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>' + paso++ + '. ' + orden[0] + '</span><span class="check-dosis-val-green">' + mlCadaParte[0] + ' ml</span></div>';
    dosisLineas += '<div class="check-dosis-row">' +
      '<span>' + paso++ + '. ' + orden[1] + '</span><span class="check-dosis-val-green">' + mlCadaParte[1] + ' ml</span></div>';
  } else if (nut.partes >= 3) {
    for (let i = 0; i < nut.partes; i++) {
      dosisLineas += '<div class="check-dosis-row">' +
        '<span>' + paso++ + '. ' + (orden[i]||'Parte '+(i+1)) + '</span>' +
        '<span class="check-dosis-val-green">' + (mlCadaParte[i]||0) + ' ml</span></div>';
    }
  }
  const pHR = typeof torreGetPhRangoObjetivo === 'function'
    ? torreGetPhRangoObjetivo(nut, cfg)
    : (nut.pHRango || [5.5, 6.5]);
  const pHMin = pHR[0] || 5.5;
  const pHMax = pHR[1] || 6.5;
  dosisLineas += '<div class="check-dosis-row check-dosis-row--last">' +
    '<span>' + paso + '. pH objetivo</span>' +
    '<span class="check-dosis-val-blue">' + (nut.pHBuffer ? pHMin + ' (buffers hacen el resto)' : pHMin + '–' + pHMax) + '</span></div>';

  const overlay = document.createElement('div');
  overlay.id = 'checklistPreguntaOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute(
    'aria-label',
    cfg.tipoInstalacion === 'nft' ? 'Iniciar checklist NFT'
      : cfg.tipoInstalacion === 'dwc' ? 'Iniciar checklist DWC'
      : 'Iniciar checklist — torre vertical'
  );
  overlay.className = 'checklist-pregunta-overlay';

  overlay.innerHTML =
    '<div class="checklist-pregunta-sheet">' +

      // Handle
      '<div class="checklist-pregunta-handle"></div>' +

      // Cabecera
      '<div class="checklist-pregunta-head">' +
        '<div class="checklist-pregunta-emoji">🌿</div>' +
        '<div>' +
          '<div class="checklist-pregunta-title">' +
            '¡' + nombreTorre + ' lista!' +
          '</div>' +
          '<div class="checklist-pregunta-subtitle">' +
            (vol < volMax - 0.05 ? vol + ' L mezcla · máx ' + volMax + ' L · ' : vol + ' L · ') +
            (faArr < 1
              ? 'EC orientativa recarga ~' + ecMetaRec + ' µS/cm (arranque plántula; rango cultivo ' + ecObj.min + '–' + ecObj.max + ')'
              : 'EC objetivo ' + ecObj.min + '–' + ecObj.max + ' µS/cm') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="checklist-pregunta-nota-pasos">' +
        'Siguiente paso habitual: en <strong>Sistema</strong> detalla cada cesta (variedad, trasplante, procedencia); ' +
        'luego el checklist dosifica el depósito. Puedes iniciar el checklist aunque aún falten cestas por rellenar.' +
      '</div>' +

      // Badge nutriente destacado
      '<div class="checklist-pregunta-nutri">' +
        '<span class="checklist-pregunta-nutri-icon">' + (nut.bandera||'🧪') + '</span>' +
        '<div>' +
          '<div class="checklist-pregunta-nutri-kicker">Nutriente configurado</div>' +
          '<div class="checklist-pregunta-nutri-name">' +
            nut.nombre + '</div>' +
          '<div class="checklist-pregunta-nutri-detalle">' +
            nut.detalle + '</div>' +
        '</div>' +
      '</div>' +

      // Dosis calculadas
      '<div class="checklist-pregunta-dosis-box">' +
        '<div class="checklist-pregunta-dosis-title">💊 Dosis calculadas para esta recarga</div>' +
        '<div class="checklist-pregunta-dosis-body">' + dosisLineas + '</div>' +
        (nut.pHBuffer
          ? '<div class="checklist-pregunta-dosis-warn">⚠️ Subir pH solo hasta ' + pHMin +
            ' — los buffers de ' + nut.nombre + ' completarán el ajuste solos en 2-3h</div>'
          : '') +
      '</div>' +

      // Pregunta tipo de checklist
      '<div class="checklist-pregunta-q">¿Para qué ocasión?</div>' +

      '<div class="checklist-pregunta-opciones">' +
        // Primer uso
        '<div id="optPrimerUso" data-tipo="primer_uso" class="tipo-checklist-opt tipo-checklist-opt--active">' +
          '<div class="tipo-checklist-opt-icon">🆕</div>' +
          '<div class="tipo-checklist-opt-title">' +
            'Primer uso</div>' +
          '<div class="tipo-checklist-opt-text">' +
            'Sistema nuevo o primer llenado del depósito (sin cultivo previo en esta mezcla)' +
          '</div>' +
        '</div>' +
        // Tras limpieza
        '<div id="optTrasLimpieza" data-tipo="tras_limpieza" class="tipo-checklist-opt">' +
          '<div class="tipo-checklist-opt-icon">🧹</div>' +
          '<div class="tipo-checklist-opt-title">' +
            'Tras limpieza</div>' +
          '<div class="tipo-checklist-opt-text">' +
            'Depósito vaciado, limpiado y enjuagado completamente' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Botones acción
      '<button id="btnIniciarChecklist" ' +
        'class="checklist-pregunta-btn-main">' +
        '📋 Iniciar checklist' +
      '</button>' +
      '<button id="btnChecklistDespues" ' +
        'class="checklist-pregunta-btn-later">' +
        'Más tarde — ir a la app' +
      '</button>' +
    '</div>';

  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);

  // Event delegation para opciones tipo checklist
  overlay.querySelectorAll('.tipo-checklist-opt').forEach(el => {
    el.addEventListener('click', function() {
      seleccionarTipoChecklist(this, this.getAttribute('data-tipo'));
    });
  });

  // Tipo de checklist seleccionado (primer_uso por defecto)
  window._tipoChecklist = 'primer_uso';

  document.getElementById('btnIniciarChecklist').addEventListener('click', () => {
    a11yDialogClosed(overlay);
    overlay.remove();
    const t = window._tipoChecklist;
    clRutaChecklist = t === 'tras_limpieza' ? 'recarga' : 'primer_llenado';
    abrirChecklist(false, { saltarPreguntaRuta: true });
  });
  document.getElementById('btnChecklistDespues').addEventListener('click', () => {
    a11yDialogClosed(overlay);
    overlay.remove();
    showToast('✅ ' + nombreTorre + ' lista · Checklist en pestaña Historial cuando quieras');
  });
  } catch(e) {
    console.error('preguntarIniciarChecklist error:', e);
    showToast('⚠️ Error al mostrar panel checklist: ' + e.message, true);
  }
}

function seleccionarTipoChecklist(el, tipo) {
  window._tipoChecklist = tipo;
  ['optPrimerUso','optTrasLimpieza'].forEach(id => {
    const e = document.getElementById(id);
    if (!e) return;
    e.classList.remove('tipo-checklist-opt--active');
  });
  el.classList.add('tipo-checklist-opt--active');
}



// Niveles activos basados en la torre real (no en modos fijos)
function getNivelesActivos() {
  const cfg = state.configTorre || {};
  const numNiveles = cfg.numNiveles || window.NUM_NIVELES_ACTIVO || NUM_NIVELES;
  // Generar array [0, 1, 2, ..., numNiveles-1]
  return Array.from({length: numNiveles}, (_, i) => i);
}

function aplicarConfigTorre() {
  // Si no hay config, usar defaults para que la torre funcione
  if (!state.configTorre) {
    state.configTorre = {
      tipoInstalacion: 'torre',
      numNiveles: NUM_NIVELES,
      numCestas:  NUM_CESTAS,
      volDeposito: 18,
      nutriente: 'canna_aqua',
      agua: state.configAgua || 'destilada',
      checklistInstalacionConfirmada: false,
      torreObjetivoCultivo: 'final',
      lat: 39.9864,
      lon: -0.0495,
      ciudad: 'Castelló de la Plana',
    };
  }
  if (!state.configTorre.tipoInstalacion) state.configTorre.tipoInstalacion = 'torre';
  if (!state.configTorre.torreObjetivoCultivo) state.configTorre.torreObjetivoCultivo = 'final';
  const cfg = state.configTorre;

  // Sincronizar nutriente global con la torre activa (cada torre puede tener el mar suyo)
  const tIdx = state.torreActiva || 0;
  if (state.torres && state.torres[tIdx] && state.torres[tIdx].config) {
    const idT = state.torres[tIdx].config.nutriente;
    if (idT) cfg.nutriente = idT;
  }

  // Actualizar constantes dinámicas — NUM_NIVELES y NUM_CESTAS ahora son variables
  window.NUM_NIVELES_ACTIVO = cfg.numNiveles;
  window.NUM_CESTAS_ACTIVO  = cfg.numCestas;
  window.VOL_OBJETIVO_ACTIVO = getVolumenMezclaLitros(cfg);

  // Constantes de cálculo según nutriente activo (no solo cfg.nutriente por si quedó desincronizado)
  const nut = getNutrienteTorre();
  if (nut) {
    const vAct = getVolumenMezclaLitros(cfg);
    window.EC_POR_ML_AB_ACTIVO = ecSubePorMlCorreccion(nut, vAct);
  }
  actualizarVisibilidadPanelInteriorGrow();
  try { actualizarVisibilidadPanelCalentadorConsigna(); } catch (_) {}
  try { sincronizarTextosPanelInteraccionSistema(); } catch (_) {}
}

// ── Detectar si hay plántulas nuevas (< 5 días) en la torre ─────────────────
function hayPlantulasNuevas() {
  const nivelesActivos = getNivelesActivos();
  return nivelesActivos.some(n =>
    (state.torre[n] || []).some(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return false;
      const dias = Math.floor((Date.now() - new Date(c.fecha)) / 86400000);
      return dias <= 5;
    })
  );
}


