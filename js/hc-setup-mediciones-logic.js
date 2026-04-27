/** Mediciones — lógica y rangos. Tras hc-setup-agua-sustrato.js. */
// ══════════════════════════════════════════════════
// MEDICIONES — LÓGICA
// ══════════════════════════════════════════════════

// Rangos y constantes
const RANGOS = {
  ec:   { min: 1300, max: 1400, warnLow: 1200, warnHigh: 1500, critico: 1000 },
  ph:   { min: 5.7,  max: 6.4,  warnLow: 5.5,  warnHigh: 6.6  },
  temp: { min: 18,   max: 22,   warnLow: 16,   warnHigh: 24   },
  vol:  { min: 16,   max: 20,   warnLow: 14,   warnHigh: 20   },
};

/** Con EC objetivo explícito en torre (checklist / PC·2), Mediciones corrige fuera de ± este margen (µS/cm). */
const EC_MEDICION_TOLERANCIA_OBJETIVO_US = 50;

/**
 * Tile Inicio (y tablas que lo reutilicen): estado EC alineado con `evalEC`.
 * Con `checklistEcObjetivoUs` válido → ok en [obj ± tol]; fuera, mismos umbrales warn/bad que Mediciones.
 * Sin objetivo manual → `RANGOS.ec` (comportamiento anterior del dashboard).
 */
function getDashTileClassEc(val) {
  if (val == null || !Number.isFinite(Number(val))) return 'empty';
  const ec = Number(val);
  const cfg = state.configTorre || {};
  const manualRaw = cfg.checklistEcObjetivoUs;
  const ecObjExplicito =
    Number.isFinite(manualRaw) && manualRaw >= 200 && manualRaw <= 6000 ? Math.round(manualRaw) : null;
  const tol = EC_MEDICION_TOLERANCIA_OBJETIVO_US;

  if (ecObjExplicito != null) {
    const bandaLo = ecObjExplicito - tol;
    const bandaHi = ecObjExplicito + tol;
    if (ec >= bandaLo && ec <= bandaHi) return 'ok';
    const ecOpt = typeof getECOptimaTorre === 'function' ? getECOptimaTorre() : { min: 900, max: 1400 };
    const ecCritica = Math.round(ecOpt.min * 0.7);
    if (ec < bandaLo) return ec < ecCritica ? 'bad' : 'warn';
    return 'warn';
  }

  const r = RANGOS.ec;
  if (ec >= r.min && ec <= r.max) return 'ok';
  if (ec >= r.warnLow && ec <= r.warnHigh) return 'warn';
  return 'bad';
}

/**
 * Subtítulo del selector de modo (Sistema): en modo lechuga, si hay EC objetivo en checklist,
 * sustituye el rango fijo 1300–1400 por ese objetivo (± `EC_MEDICION_TOLERANCIA_OBJETIVO_US`).
 */
function getModoInfoDescEfectivo(modoKey) {
  const m = typeof MODOS_CULTIVO !== 'undefined' && MODOS_CULTIVO ? MODOS_CULTIVO[modoKey] : null;
  if (!m) return '';
  if (modoKey === 'lechuga') {
    const cfg = state.configTorre || {};
    const manualRaw = cfg.checklistEcObjetivoUs;
    if (Number.isFinite(manualRaw) && manualRaw >= 200 && manualRaw <= 6000) {
      const o = Math.round(manualRaw);
      const t = EC_MEDICION_TOLERANCIA_OBJETIVO_US;
      return 'EC objetivo ' + o + ' ±' + t + ' µS/cm (checklist)';
    }
  }
  return m.desc;
}

/** Litros de agua ~EC 0 para acercar ecActual a ecObjetivo (modelo EC·V constante). */
function litrosAguaDiluirHastaEcUs(ecActual, volLitros, ecObjetivoUs) {
  if (!Number.isFinite(ecActual) || !Number.isFinite(volLitros) || volLitros <= 0) return 0.1;
  if (!Number.isFinite(ecObjetivoUs) || ecObjetivoUs < 50) return 0.1;
  if (ecActual <= ecObjetivoUs) return 0;
  const V = volLitros * (ecActual / ecObjetivoUs - 1);
  return Math.max(0.1, Math.ceil(V * 10) / 10);
}

// Datos reales Canna Aqua Vega A+B:
// 36ml A + 36ml B en 18L = EC ~0.90 mS/cm = 900 µS/cm (con agua EC 0.0)
// Por tanto: 1ml A + 1ml B sube EC = 900/36 = 25 µS/cm en 18L
// CalMag: 6ml en 18L sube EC ~400 µS/cm → 1ml = ~67 µS/cm en 18L
// pH+/pH-: ~0.1 unidades por ml en 18L (estimación estándar hidropónica)
// Nota: el cálculo de corrección descuenta el CalMag ya disuelto (~400 µS/cm)
// ── CONSTANTES CALIBRADAS CON DATOS REALES (recarga 16/03/2026) ─────────────
// Agua destilada EC 0.0 · Canna Aqua Vega A+B · CalMag · 18L · Castelló de la Plana
const EC_POR_ML_AB      = 33;    // µS/cm por ml de A+B (1mlA+1mlB) en 18L
                                  // Dato real: 36ml A+B → +1200 µS sobre CalMag = 33.3 µS/ml
const CALMAG_POR_ML     = 30;    // µS/cm por ml CalMag en 18L
                                  // Dato real: 13ml → 400 µS/cm = 30.8 µS/ml
const EC_CALMAG_BASE    = 400;   // µS/cm objetivo tras CalMag (agua destilada/ósmosis, EC ~0)
const CALMAG_ML_OBJETIVO = 13;   // ml CalMag en 18 L ≈ 400 µS con CALMAG_POR_ML (referencia)
/** EC media de referencia (µS/cm) orientativa para las tablas ml/L de Consejos (dosis «tipo» fabricante). El checklist escala A+B y 1 parte por EC objetivo + CalMag (ver calcularMlParteNutriente). */
const EC_REFERENCIA_DOSIS_MICROS = 1300;
const PH_MINUS_POR_ML   = 0.40;  // unidades pH por ml de pH- (75-81%) en 18L
const PH_PLUS_POR_ML    = 0.34;  // unidades pH por ml de pH+ (25-30%) en 18L
                                  // Dato real: 8ml pH+ subieron de 3.5 a ~6.2 en 19.5L ≈ 0.34/ml
const VOL_OBJETIVO      = 18;    // litros referencia calibración (tablas 18 L)

/** Instalación en interior (Medir / Sistema): sin bloque de ambiente meteorológico en Inicio ni avisos de exterior en Meteorología. */
function instalacionEsUbicacionInterior(cfg) {
  const c = cfg || state.configTorre || {};
  return (c.ubicacion || 'exterior') === 'interior';
}

/**
 * Volumen de referencia (L) para escalados y límites en Medir / checklist:
 * - Torre y NFT: `volDeposito` (tope del depósito).
 * - DWC: si se puede calcular, **llenado seguro** bajo la base del sustrato (`getDwcVolumenSeguroMaxLitrosDesdeConfig`);
 *   si no, `volDeposito` o capacidad geométrica.
 */
function getVolumenDepositoMaxLitros(cfg) {
  cfg = cfg || state.configTorre || {};
  if (cfg.tipoInstalacion === 'dwc' && typeof getDwcVolumenSeguroMaxLitrosDesdeConfig === 'function') {
    const vSafe = getDwcVolumenSeguroMaxLitrosDesdeConfig(cfg);
    if (vSafe != null && vSafe > 0) return Math.min(800, Math.max(1, Math.round(vSafe * 10) / 10));
  }
  const v = Number(cfg.volDeposito);
  if (Number.isFinite(v) && v > 0) return Math.min(800, Math.max(1, Math.round(v * 10) / 10));
  if (cfg.tipoInstalacion === 'dwc' && typeof getDwcCapacidadLitrosDesdeConfig === 'function') {
    const cap = getDwcCapacidadLitrosDesdeConfig(cfg);
    if (cap != null && cap > 0) return Math.min(800, Math.max(1, Math.round(cap * 10) / 10));
  }
  return VOL_OBJETIVO;
}

/**
 * Litros con los que se calculan mezclas, checklist y Consejos (≤ máximo).
 * Si no indicas «litros de mezcla», coincide con el máximo (comportamiento anterior).
 */
function getVolumenMezclaLitros(cfg) {
  cfg = cfg || state.configTorre || {};
  const maxL = getVolumenDepositoMaxLitros(cfg);
  const mez = Number(cfg.volMezclaLitros);
  if (Number.isFinite(mez) && mez > 0) {
    const m = Math.round(mez * 10) / 10;
    return Math.min(maxL, Math.max(0.5, m));
  }
  return maxL;
}

// ── Calcular ml de A+B necesarios para llegar a EC objetivo ─────────────────
// Descuenta el CalMag ya disuelto (EC_CALMAG_BASE)
// EC objetivo Aqua Vega: 1400 - 400(CalMag) = 1000 µS/cm
// ml = 1000 / EC_POR_ML_AB = 1000 / 33 ≈ 30 ml
// calcularMlParteNutriente: checklist y mediciones — ml ajustados a EC objetivo de recarga y CalMag estimado (A+B simétricos y 1 parte). Consejos: tabla fija ml/L (getRefDosisFabricante).

/** µS/cm por cada «1 ml A + 1 ml B» a volumen v (calibración base 18 L en nut.ecPorMl). */
function ecSubePorMlParABEnVolumen(nut, volLitros) {
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  const base = nut && Number(nut.ecPorMl) > 0 ? nut.ecPorMl : EC_POR_ML_AB;
  return base * (VOL_OBJETIVO / v);
}

/** ml de CalMag para acercar agua destilada/ósmosis a ~EC_CALMAG_BASE µS/cm (misma lógica en toda la app). */
function mlCalMagParaAguaBlanda(volLitros) {
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  return Math.round((EC_CALMAG_BASE / CALMAG_POR_ML) * (v / VOL_OBJETIVO) * 10) / 10;
}

function calcularMlCalMag() {
  if (!usarCalMagEnRecarga()) return 0;
  const nut = getNutrienteTorre();
  if (!nut.calmagNecesario) return 0;
  const cfg = state.configTorre || {};
  const volObj = getVolumenMezclaLitros(cfg);
  let ml = mlCalMagParaAguaBlanda(volObj);
  if (typeof getFactorArranquePlantulaHidro === 'function') {
    const fa = getFactorArranquePlantulaHidro();
    if (fa < 1) ml = Math.round(ml * fa * 10) / 10;
  }
  return ml;
}

function calcularDescAB(parte) {
  const nut = getNutrienteTorre();
  const orden = nut.orden || ['Parte A', 'Parte B'];
  const suf = dosisSufijoNutriente(nut);
  if (nut.partes === 3) {
    if (parte === 'A') return 'Añadir ' + orden[0] + ' (' + calcularMlParteNutriente(0) + suf + ') → remover 2 min';
    if (parte === 'B') return 'Añadir ' + orden[1] + ' (' + calcularMlParteNutriente(1) + suf + ') → remover 2 min';
    if (parte === 'C') return 'Añadir ' + orden[2] + ' (' + calcularMlParteNutriente(2) + suf + ') → remover 3 min';
  }
  if (parte === 'A') return 'Agitar ' + (orden[0]||'Parte A') + '. Añadir ' + calcularMlParteNutriente(0) + suf + ' — remover 2 min';
  return 'Agitar ' + (orden[1]||'Parte B') + '. Añadir ' + calcularMlParteNutriente(1) + suf + ' — remover 3 min';
}

function evalParam() {
  const ec   = parseFloat(document.getElementById('inputEC').value);
  const ph   = parseFloat(document.getElementById('inputPH').value);
  const temp = parseFloat(document.getElementById('inputTemp').value);
  const vol  = parseFloat(document.getElementById('inputVol').value);

  evalEC(ec, vol);
  evalPH(ph, vol);
  evalTemp(temp);
  evalVol(vol, ec, ph);
}

function setStatus(id, tipo, icono, texto) {
  const el = document.getElementById(id);
  el.className = `param-status ${tipo}`;
  el.innerHTML = `<span>${icono}</span><span>${texto}</span>`;
}

function setCard(id, tipo) {
  const el = document.getElementById(id);
  el.className = `param-card ${tipo}`;
}

function showCorreccion(id, html) {
  const el = document.getElementById(id);
  if (html) {
    el.classList.add('show');
    el.innerHTML = html;
  } else {
    el.classList.remove('show');
    el.innerHTML = '';
  }
}

function evalEC(ec, vol) {
  if (isNaN(ec)) { setStatus('statusEC','empty','',''); setCard('cardEC',''); showCorreccion('correccionEC',''); return; }

  const nut = getNutrienteTorre();
  const volActual  = isNaN(vol) ? getVolumenMezclaLitros(state.configTorre) : vol;
  // EC óptima según cultivos presentes (si no hay plantas, usa el nutriente)
  const ecOptima   = getECOptimaTorre();
  const ecMin      = ecOptima.min;
  const ecMax      = ecOptima.max;
  const ecIdeal    = Math.round((ecMin + ecMax) / 2);
  const ecCritica  = Math.round(ecMin * 0.7);

  const cfgTorre = state.configTorre || {};
  const ecManualRaw = cfgTorre.checklistEcObjetivoUs;
  const ecObjExplicito = Number.isFinite(ecManualRaw) && ecManualRaw >= 200 && ecManualRaw <= 6000
    ? Math.round(ecManualRaw)
    : null;
  const tol = EC_MEDICION_TOLERANCIA_OBJETIVO_US;

  if (ecObjExplicito != null) {
    const bandaLo = ecObjExplicito - tol;
    const bandaHi = ecObjExplicito + tol;
    if (ec >= bandaLo && ec <= bandaHi) {
      setStatus('statusEC', 'ok', '✅', 'EC dentro del margen respecto al objetivo (' + ecObjExplicito + ' ±' + tol + ' µS/cm)');
      setCard('cardEC', 'ok');
      showCorreccion('correccionEC', '');
      return;
    }
    if (ec < bandaLo) {
      const deficit = Math.max(0, ecObjExplicito - ec);
      const mlAB = mlCorreccionEcBaja(nut, volActual, deficit);
      const slopeEc = ecSubePorMlCorreccion(nut, volActual);
      const nivel = ec < ecCritica ? 'bad' : 'warn';
      const orden = nut.orden || ['Parte A', 'Parte B'];
      setStatus('statusEC', nivel, ec < ecCritica ? '🔴' : '🟡',
        ec < ecCritica ? 'EC crítica — deficiencias inminentes' : 'EC baja respecto al objetivo ' + ecObjExplicito + ' µS/cm');
      setCard('cardEC', ec < ecCritica ? 'alert' : 'warn');
      const sufEc = dosisSufijoNutriente(nut);
      let correccionHtml = '<div class="correccion-title">💊 Corrección EC — ' + nut.nombre + ' (objetivo ' + ecObjExplicito + ' µS/cm)</div>';
      if (nut.partes === 1) {
        correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
      } else if (nut.partes === 2) {
        correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
        correccionHtml += '<div class="correccion-item"><span>' + orden[1] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
      } else if (nut.partes === 3) {
        correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
        correccionHtml += '<div class="correccion-item"><span>' + orden[1] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
        correccionHtml += '<div class="correccion-item"><span>' + orden[2] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
      }
      correccionHtml += '<div class="correccion-item correccion-item--dim"><span>EC estimada tras corrección</span><span class="correccion-valor">~' + Math.round(ec + mlAB * slopeEc) + ' µS/cm</span></div>';
      showCorreccion('correccionEC', correccionHtml);
      return;
    }
    const litrosAgua = litrosAguaDiluirHastaEcUs(ec, volActual, ecObjExplicito);
    const ecEst = Math.round(ec * volActual / (volActual + litrosAgua));
    setStatus('statusEC', 'warn', '🟡', 'EC alta respecto al objetivo ' + ecObjExplicito + ' µS/cm — diluir');
    setCard('cardEC', 'warn');
    showCorreccion('correccionEC',
      '<div class="correccion-title">💊 Dilución hacia objetivo ' + ecObjExplicito + ' µS/cm</div>' +
      '<div class="correccion-item"><span>Añadir agua destilada / ósmosis</span><span class="correccion-valor">+' + litrosAgua + ' L</span></div>' +
      '<div class="correccion-item correccion-item--dim"><span>EC estimada tras dilución</span><span class="correccion-valor">~' + ecEst + ' µS/cm</span></div>'
    );
    return;
  }

  if (ec >= ecMin && ec <= ecMax) {
    const ecOptima2 = getECOptimaTorre();
    const msgOk = ecOptima2.advertencia
      ? 'EC en rango promedio — cultivos con EC diferente, considera torres separadas'
      : 'EC correcta para ' + nut.nombre;
    setStatus('statusEC','ok','✅', msgOk);
    setCard('cardEC','ok');
    showCorreccion('correccionEC','');

  } else if (ec < ecMin) {
    const deficit  = Math.max(0, ecIdeal - ec);
    const mlAB     = mlCorreccionEcBaja(nut, volActual, deficit);
    const slopeEc  = ecSubePorMlCorreccion(nut, volActual);
    const nivel    = ec < ecCritica ? 'bad' : 'warn';
    const orden    = nut.orden || ['Parte A', 'Parte B'];

    setStatus('statusEC', nivel, ec < ecCritica ? '🔴' : '🟡',
      ec < ecCritica ? 'EC crítica — deficiencias inminentes' : 'EC baja — añadir ' + nut.nombre);
    setCard('cardEC', ec < ecCritica ? 'alert' : 'warn');

    const sufEc = dosisSufijoNutriente(nut);
    let correccionHtml = '<div class="correccion-title">💊 Corrección EC — ' + nut.nombre + '</div>';
    if (nut.partes === 1) {
      correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
    } else if (nut.partes === 2) {
      correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
      correccionHtml += '<div class="correccion-item"><span>' + orden[1] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
    } else if (nut.partes === 3) {
      correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
      correccionHtml += '<div class="correccion-item"><span>' + orden[1] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
      correccionHtml += '<div class="correccion-item"><span>' + orden[2] + '</span><span class="correccion-valor">+' + mlAB + sufEc + '</span></div>';
    }
    correccionHtml += '<div class="correccion-item correccion-item--dim"><span>EC estimada tras corrección</span><span class="correccion-valor">~' + Math.round(ec + mlAB * slopeEc) + ' µS/cm</span></div>';
    showCorreccion('correccionEC', correccionHtml);

  } else {
    // EC alta
    const exceso   = ec - ecMax;
    const litrosAgua = Math.ceil((exceso / (ec / volActual)) * 10) / 10;
    setStatus('statusEC','warn','🟡','EC alta — diluir con agua destilada');
    setCard('cardEC','warn');
    showCorreccion('correccionEC',
      '<div class="correccion-title">💊 Dilución necesaria</div>' +
      '<div class="correccion-item"><span>Añadir agua destilada</span><span class="correccion-valor">+' + litrosAgua + ' L</span></div>' +
      '<div class="correccion-item correccion-item--dim"><span>EC estimada tras dilución</span><span class="correccion-valor">~' + Math.round(ec * volActual / (volActual + litrosAgua)) + ' µS/cm</span></div>'
    );
  }
}


function evalPH(ph, vol) {
  if (isNaN(ph)) {
    setStatus('statusPH','empty','','');
    setCard('cardPH','');
    showCorreccion('correccionPH','');
    return;
  }

  const nut       = getNutrienteTorre();
  const volActual = isNaN(vol) ? getVolumenMezclaLitros(state.configTorre) : vol;
  const factor    = volActual / VOL_OBJETIVO;

  // Rangos del nutriente activo
  const phMin     = nut.pHRango    ? nut.pHRango[0]     : 5.5;
  const phMax     = nut.pHRango    ? nut.pHRango[1]     : 6.5;
  const phActMin  = nut.pHIntervenir ? nut.pHIntervenir[0] : 5.2;
  const phActMax  = nut.pHIntervenir ? nut.pHIntervenir[1] : 6.8;
  const tieneBuffer = nut.pHBuffer || false;

  // Actualizar rango en la card header
  const rangeEl = document.getElementById('paramRangePH');
  if (rangeEl) rangeEl.textContent = phMin + ' – ' + phMax;

  // Constantes de corrección (reales calibradas)
  const PH_PLUS_ML  = PH_PLUS_POR_ML  || 0.34; // unidades/ml
  const PH_MINUS_ML = PH_MINUS_POR_ML || 0.40;

  // ── pH EN RANGO ÓPTIMO ──────────────────────────────────────────────────
  if (ph >= phMin && ph <= phMax) {
    setStatus('statusPH','ok','✅','pH óptimo para ' + nut.nombre);
    setCard('cardPH','ok');
    showCorreccion('correccionPH','');
    return;
  }

  // ── pH EN RANGO DE NO INTERVENCIÓN (buffer actuando) ─────────────────────
  if (tieneBuffer && ph >= phActMin && ph <= phActMax && !(ph >= phMin && ph <= phMax)) {
    setStatus('statusPH','warn','⏳','pH fuera de óptimo — buffers de ' + nut.nombre + ' actuando');
    setCard('cardPH','warn');
    showCorreccion('correccionPH',
      '<div class="correccion-title">⏳ No intervenir todavía</div>' +
      '<div class="correccion-muted--body">' +
        nut.nombre + ' tiene buffers de pH que necesitan tiempo.<br>' +
        '<strong class="correccion-strong-light">Esperar 2-4h con difusor</strong> y volver a medir.<br>' +
        'Solo actuar si sale del rango ' + phActMin + '–' + phActMax + '.' +
      '</div>'
    );
    return;
  }

  // ── pH BAJO — necesita pH+ ────────────────────────────────────────────────
  if (ph < phActMin) {
    const subida  = parseFloat((phMin - ph).toFixed(1));
    const mlPlus  = Math.max(0.5, Math.round((subida / PH_PLUS_ML) * factor * 10) / 10);
    const nivel   = ph < 5.0 ? 'bad' : 'warn';
    setStatus('statusPH', nivel, ph < 5.0 ? '🔴' : '🟡',
      ph < 5.0 ? 'pH crítico bajo — raíces en riesgo' : 'pH bajo — añadir pH+');
    setCard('cardPH', nivel === 'bad' ? 'alert' : 'warn');
    showCorreccion('correccionPH',
      '<div class="correccion-title">💊 Corrección pH bajo</div>' +
      '<div class="correccion-item"><span>pH+ (25-30%)</span>' +
        '<span class="correccion-valor">+' + mlPlus + ' ml</span></div>' +
      '<div class="correccion-item"><span>pH actual → objetivo</span>' +
        '<span class="correccion-valor">' + ph + ' → ' + phMin + '</span></div>' +
      '<div class="correccion-muted">' +
        '⚠️ Añadir de <strong>2ml en 2ml</strong>, esperar 2 min entre dosis y volver a medir.' +
      '</div>'
    );
    return;
  }

  // ── pH ALTO — necesita pH- ────────────────────────────────────────────────
  if (ph > phActMax) {
    const bajada  = parseFloat((ph - phMax).toFixed(1));
    const mlMinus = Math.max(0.5, Math.round((bajada / PH_MINUS_ML) * factor * 10) / 10);
    const nivel   = ph > 7.5 ? 'bad' : 'warn';
    setStatus('statusPH', nivel, ph > 7.5 ? '🔴' : '🟡',
      ph > 7.5 ? 'pH crítico alto — bloqueo de nutrientes' : 'pH alto — añadir pH-');
    setCard('cardPH', nivel === 'bad' ? 'alert' : 'warn');

    const notaBuffer = tieneBuffer
      ? '<div class="correccion-buffer-warn">' +
          '⚠️ Cada corrección con pH- <strong>debilita los buffers</strong> de ' + nut.nombre +
          '. Usa la mínima cantidad posible.' +
        '</div>'
      : '';

    showCorreccion('correccionPH',
      '<div class="correccion-title">💊 Corrección pH alto</div>' +
      '<div class="correccion-item"><span>pH- (75-81%)</span>' +
        '<span class="correccion-valor">-' + mlMinus + ' ml</span></div>' +
      '<div class="correccion-item"><span>pH actual → objetivo</span>' +
        '<span class="correccion-valor">' + ph + ' → ' + phMax + '</span></div>' +
      '<div class="correccion-muted">' +
        '⚠️ Añadir de <strong>1ml en 1ml</strong>, esperar 2 min y volver a medir.' +
      '</div>' + notaBuffer
    );
    return;
  }

  // pH ligeramente fuera pero dentro de intervención
  setStatus('statusPH','warn','🟡','pH ligeramente fuera — vigilar');
  setCard('cardPH','warn');
  showCorreccion('correccionPH','');
}


function evalTemp(temp) {
  if (isNaN(temp)) { setStatus('statusTemp','empty','',''); setCard('cardTemp',''); showCorreccion('correccionTemp',''); return; }
  const esKratky = typeof esDwcKratky === 'function' && esDwcKratky(state.configTorre || {});

  if (esKratky) {
    if (temp >= 17 && temp <= 21) {
      setStatus('statusTemp','ok','✅','Temperatura correcta para Kratky (más estable)');
      setCard('cardTemp','ok');
      showCorreccion('correccionTemp','');
      return;
    }
    if (temp < 17) {
      const nivelK = temp < 14 ? 'bad' : 'warn';
      setStatus('statusTemp', nivelK, temp < 14 ? '🔴' : '🟡',
        temp < 14 ? 'Kratky: temperatura crítica — crecimiento casi parado' : 'Kratky: agua fría — vigilar raíces y ritmo');
      setCard('cardTemp', temp < 14 ? 'alert' : 'warn');
      showCorreccion('correccionTemp',
        '<div class="correccion-title">🔥 Kratky: corrección de temperatura</div>' +
        '<div class="correccion-muted--body-temp">Sin aireador el margen térmico es menor. Intenta estabilizar entre <strong>17–21°C</strong> y acercar a 20°C.</div>'
      );
      return;
    }
    const nivelK = temp > 24 ? 'bad' : 'warn';
    setStatus('statusTemp', nivelK, temp > 24 ? '🔴' : '🟡',
      temp > 24 ? 'Kratky: riesgo alto (bajo O₂ y patógenos)' : 'Kratky: temperatura alta — vigilar muy de cerca');
    setCard('cardTemp', temp > 24 ? 'alert' : 'warn');
    showCorreccion('correccionTemp',
      '<div class="correccion-title">❄️ Kratky: enfriar solución</div>' +
      '<div class="correccion-muted--body-temp">En Kratky evita superar 22°C de forma sostenida. Sombrea depósito y revisa volumen para mantener cámara de aire.</div>'
    );
    return;
  }

  if (temp >= 18 && temp <= 22) {
    setStatus('statusTemp','ok','✅',`Temperatura correcta — oxígeno disuelto óptimo`);
    setCard('cardTemp','ok');
    showCorreccion('correccionTemp','');
  } else if (temp < 18) {
    const nivel = temp < 14 ? 'bad' : 'warn';
    setStatus('statusTemp', nivel, temp < 14 ? '🔴' : '🟡',
      temp < 14 ? `Temperatura crítica — crecimiento muy lento` : `Temperatura baja — verificar calentador`);
    setCard('cardTemp', temp < 14 ? 'alert' : 'warn');
    showCorreccion('correccionTemp', `
      <div class="correccion-title">🔥 Acción requerida</div>
      <div class="correccion-muted--body-temp">
        Verificar que el calentador está encendido y funcionando correctamente.<br>
        Temperatura objetivo: <strong>20°C</strong><br>
        Por debajo de 14°C el crecimiento se detiene casi por completo.
      </div>
    `);
  } else {
    const nivel = temp > 28 ? 'bad' : 'warn';
    setStatus('statusTemp', nivel, temp > 28 ? '🔴' : '🟡',
      temp > 28 ? `Temperatura crítica — riesgo patógenos y bajo oxígeno` : `Temperatura alta — riesgo de estrés radicular`);
    setCard('cardTemp', temp > 28 ? 'alert' : 'warn');
    showCorreccion('correccionTemp', `
      <div class="correccion-title">❄️ Acción requerida</div>
      <div class="correccion-muted--body-temp">
        Bajar termostato del calentador.<br>
        En verano: cubrir el depósito con material aislante o añadir hielo.<br>
        Por encima de 28°C: riesgo de Pythium y reducción de oxígeno disuelto.
      </div>
    `);
  }
}

function evalVol(vol, ec, ph) {
  if (isNaN(vol)) { setStatus('statusVol','empty','',''); setCard('cardVol',''); showCorreccion('correccionVol',''); return; }
  const cfgK = state.configTorre || {};
  const esKratky = typeof esDwcKratky === 'function' && esDwcKratky(cfgK);
  const volObjSafe = getVolumenDepositoMaxLitros(cfgK);
  if (esKratky && Number.isFinite(volObjSafe) && volObjSafe > 0) {
    const umbralOk = volObjSafe * 0.85;
    const umbralWarn = volObjSafe * 0.7;
    if (vol >= umbralOk) {
      setStatus('statusVol','ok','✅','Volumen estable para Kratky (cámara de aire segura)');
      setCard('cardVol','ok');
      showCorreccion('correccionVol','');
      return;
    }
    const litrosAnadir = Math.max(0, Math.ceil((volObjSafe - vol) * 10) / 10);
    const nivel = vol < umbralWarn ? 'bad' : 'warn';
    setStatus('statusVol', nivel, vol < umbralWarn ? '🔴' : '🟡',
      vol < umbralWarn ? 'Kratky: volumen crítico — reponer agua ya' : 'Kratky: volumen bajando — reponer agua');
    setCard('cardVol', vol < umbralWarn ? 'alert' : 'warn');
    showCorreccion('correccionVol',
      '<div class="correccion-title">💧 Reposición Kratky</div>' +
      '<div class="correccion-item"><span>Añadir agua</span><span class="correccion-valor">+' + litrosAnadir + ' L</span></div>' +
      '<div class="correccion-muted correccion-muted--tight">Objetivo seguro actual: ~' + volObjSafe + ' L (mantener 0,5–1 cm bajo base del sustrato).</div>' +
      '<div class="correccion-muted correccion-muted--loose">Mide EC y pH tras reponer. En Kratky evita sobrellenar el depósito.</div>'
    );
    return;
  }

  const volRef =
    Number.isFinite(volObjSafe) && volObjSafe > 0 ? volObjSafe : Math.max(RANGOS.vol.min, VOL_OBJETIVO);
  const umbralOk = Math.max(4, volRef * 0.93);
  const umbralCrit = Math.max(2.5, volRef * 0.68);
  const umbralWarnBajo = Math.max(3, volRef * 0.78);
  const esDwc = cfgK.tipoInstalacion === 'dwc';

  if (vol > volRef + 0.35) {
    const exceso = Math.round((vol - volRef) * 10) / 10;
    setStatus(
      'statusVol',
      'warn',
      '🟡',
      esDwc
        ? 'Volumen por encima del llenado seguro orientativo — riesgo de mojar el sustrato'
        : 'Volumen por encima de la referencia configurada'
    );
    setCard('cardVol', 'warn');
    const extraDwc =
      esDwc
        ? '<div class="correccion-muted correccion-muted--tight">En DWC la referencia (~' +
          volRef +
          ' L) deja ~0,5–1 cm de aire bajo la base del sustrato; el tope geométrico del depósito puede ser mayor.</div>'
        : '';
    showCorreccion(
      'correccionVol',
      '<div class="correccion-title">💧 Nivel alto</div>' +
        '<div class="correccion-item"><span>Sobre referencia útil</span>' +
        '<span class="correccion-valor">+' +
        exceso +
        ' L</span></div>' +
        extraDwc +
        '<div class="correccion-muted correccion-muted--loose">Si fue medición real, revisa llenado frente a cestas; si anotas volumen «a ojo», alinea con Sistema.</div>'
    );
    return;
  }

  if (vol >= umbralOk) {
    const suf =
      esDwc
        ? ' (~' + Math.round(volRef * 10) / 10 + ' L ref. bajo sustrato)'
        : ' (~' + Math.round(volRef * 10) / 10 + ' L depósito)';
    setStatus('statusVol', 'ok', '✅', 'Volumen correcto' + suf);
    setCard('cardVol', 'ok');
    showCorreccion('correccionVol', '');
  } else {
    const nut = getNutrienteTorre();
    const cfg = state.configTorre || {};
    const volObj = getVolumenDepositoMaxLitros(cfg);
    const litrosAnadir = Math.max(0.1, Math.round((volObj - vol) * 10) / 10);
    const ref = getRefDosisFabricante(nut.id);
    const calmagMl = usarCalMagEnRecarga() && nut.calmagNecesario
      ? mlCalMagParaAguaBlanda(litrosAnadir)
      : 0;
    const orden = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A','Parte B'];
    const sufRep = dosisSufijoNutriente(nut);

    const ecActual = isNaN(ec) ? 1350 : ec;
    const anadirNutrientes = ecActual < (nut.ecObjetivo?.[0] || 900);

    const nivel = vol < umbralCrit ? 'bad' : 'warn';
    setStatus('statusVol', nivel, vol < umbralCrit ? '🔴' : '🟡',
      vol < umbralCrit
        ? 'Volumen crítico — reponer urgente'
        : vol < umbralWarnBajo
          ? 'Volumen bajo — reponer depósito'
          : 'Volumen algo bajo — valorar reposición');
    setCard('cardVol', vol < umbralCrit ? 'alert' : 'warn');

    let correccionHtml =
      '<div class="correccion-title">💧 Reposición +' + litrosAnadir + ' L (hasta ~' + volObj + ' L ref.) — ' + nut.nombre + '</div>' +
      '<div class="correccion-item"><span>Agua destilada</span>' +
        '<span class="correccion-valor">+' + litrosAnadir + ' L</span></div>';

    if (anadirNutrientes) {
      if (calmagMl > 0) {
        correccionHtml += '<div class="correccion-item"><span>CalMag</span>' +
          '<span class="correccion-valor">+' + calmagMl + ' ml</span></div>';
      }
      if (nut.partes === 1) {
        const mlR = Math.max(0.5, Math.round(ref.mlPorLitro[0] * litrosAnadir * 10) / 10);
        correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span>' +
          '<span class="correccion-valor">+' + mlR + sufRep + '</span></div>';
      } else if (nut.partes === 2) {
        const mlA = Math.max(0.5, Math.round(ref.mlPorLitro[0] * litrosAnadir * 10) / 10);
        const mlB = Math.max(0.5, Math.round(ref.mlPorLitro[1] * litrosAnadir * 10) / 10);
        correccionHtml += '<div class="correccion-item"><span>' + orden[0] + '</span>' +
          '<span class="correccion-valor">+' + mlA + sufRep + '</span></div>';
        correccionHtml += '<div class="correccion-item"><span>' + orden[1] + '</span>' +
          '<span class="correccion-valor">+' + mlB + sufRep + '</span></div>';
      } else {
        for (let i = 0; i < nut.partes; i++) {
          const mlP = Math.max(0.5, Math.round((ref.mlPorLitro[i] || 0) * litrosAnadir * 10) / 10);
          correccionHtml += '<div class="correccion-item"><span>' + nut.orden[i] + '</span>' +
            '<span class="correccion-valor">+' + mlP + sufRep + '</span></div>';
        }
      }
    } else {
      correccionHtml += '<div class="correccion-muted correccion-muted--tight">' +
        'EC correcta — añadir solo agua destilada sin nutrientes.</div>';
    }

    correccionHtml += '<div class="correccion-muted correccion-muted--loose">' +
      '⚠️ Medir EC y pH tras añadir y ajustar si es necesario.</div>';

    showCorreccion('correccionVol', correccionHtml);
  }
}

// Mostrar última medición al entrar en la pestaña
function cargarUltimaMedicion() {
  const card = document.getElementById('ultimaMedicionCard');
  const info = document.getElementById('ultimaMedicionInfo');
  if (!info) return;
  if (!state.ultimaMedicion) {
    if (card) card.classList.remove('ultima-medicion-card--visible');
    return;
  }
  const m = state.ultimaMedicion;
  if (card) card.classList.add('ultima-medicion-card--visible');
  info.innerHTML = `
    <span class="ultima-medicion-meta">📅 ${m.fecha} a las ${m.hora}</span><br>
    ⚡ EC: <strong>${m.ec} µS/cm</strong> &nbsp;
    🧪 pH: <strong>${m.ph}</strong> &nbsp;
    🌡️ <strong>${m.temp}°C</strong> &nbsp;
    🪣 <strong>${m.vol}L</strong>
  `;
}


