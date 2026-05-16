/** DWC: medidas, rejilla, difusor, formulario sistema. Tras hc-setup-wizard-core.js. */
function _dwcParseOptCm(id, min, max) {
  const el = document.getElementById(id);
  const v = parseFloat(String(el && el.value != null ? el.value : '').replace(',', '.'));
  if (!Number.isFinite(v) || v < min || v > max) return null;
  return Math.round(v * 10) / 10;
}

function _dwcParseOptMm(id, min, max) {
  const el = document.getElementById(id);
  const v = parseInt(String(el && el.value != null ? el.value : '').trim(), 10);
  if (!Number.isFinite(v) || v < min || v > max) return null;
  return v;
}

/** Diámetro interior útil (cm) desde L/W guardados: iguales → D; si difieren → media (configs antiguas). */
function dwcDiametroInteriorCmDesdeLW(lRaw, wRaw) {
  const Ln = Number(lRaw);
  const Wn = Number(wRaw);
  if (Number.isFinite(Ln) && Ln >= 5 && Ln <= 300 && Number.isFinite(Wn) && Wn >= 5 && Wn <= 300) {
    return Math.abs(Ln - Wn) < 0.05 ? Ln : (Ln + Wn) / 2;
  }
  if (Number.isFinite(Ln) && Ln >= 5 && Ln <= 300) return Ln;
  if (Number.isFinite(Wn) && Wn >= 5 && Wn <= 300) return Wn;
  return null;
}

function dwcDiametroCmUiDesdeLW(lRaw, wRaw) {
  const d = dwcDiametroInteriorCmDesdeLW(lRaw, wRaw);
  return d == null ? '' : String(Math.round(d * 10) / 10);
}

/** L y W efectivos (cm) para rejilla / textos: cilindro usa solo Ø del formulario si existe. */
function dwcLargoAnchoCmEffectivosDesdeFormIds(ids) {
  const forma = dwcNormalizeDepositoForma(document.getElementById(ids.forma)?.value);
  if (forma === 'cilindrico' && ids.diametro) {
    const d = _dwcParseOptCm(ids.diametro, 5, 300);
    if (d != null) return { L: d, W: d };
  }
  return {
    L: _dwcParseOptCm(ids.largo, 5, 300),
    W: _dwcParseOptCm(ids.ancho, 5, 300),
  };
}

function dwcNormalizeObjetivoCultivo(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  if (v === 'baby' || v === 'babyleaf' || v === 'alta') return 'baby';
  return 'final';
}

function dwcObjetivoCultivoDesdeRimMm(rimMm) {
  const r = Number(rimMm);
  if (Number.isFinite(r) && r > 0 && r <= 32) return 'baby';
  return 'final';
}

function dwcNormalizeRejillaModo(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  return v === 'max' ? 'max' : 'objetivo';
}

function dwcNormalizeModo(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  return v === 'kratky' ? 'kratky' : 'aireado';
}

/**
 * Oxigenación DWC: un solo volumen de agua compartido (rejilla en depósito) frente a varios cubos/depósitos
 * con solución separada y bomba multivalvula (una línea por sitio).
 */
function dwcNormalizeOxigenacionDiseno(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  if (
    v === 'cubos_independientes' ||
    v === 'cubos' ||
    v === 'multideposito' ||
    v === 'multivalvula' ||
    v === 'buckets' ||
    v === 'multi'
  ) {
    return 'cubos_independientes';
  }
  return 'dep_unido';
}

function dwcGetOxigenacionDiseno(cfg) {
  const c = cfg || state.configTorre || {};
  return dwcNormalizeOxigenacionDiseno(c.dwcOxigenacionDiseno);
}

/**
 * Cubos multivalvula: una maceta por cubo. `dwcNumCubos` es la fuente de verdad;
 * en config se refleja como numNiveles=1, numCestas=dwcNumCubos para el esquema.
 */
function dwcGetNumCubosIndependientes(cfg) {
  const c = cfg || state.configTorre || {};
  if (dwcGetOxigenacionDiseno(c) !== 'cubos_independientes') return 0;
  const n = parseInt(String(c.dwcNumCubos), 10);
  if (Number.isFinite(n) && n >= 1) return Math.min(24, n);
  const f = Math.max(1, parseInt(String(c.numNiveles || 1), 10) || 1);
  const col = Math.max(1, parseInt(String(c.numCestas || 1), 10) || 1);
  return Math.min(24, Math.max(1, f * col));
}

/** Bloque HTML (checklist) con la guía rápida multivalvula / varios cubos. */
function dwcHtmlGuiaMulticuboChecklist(cfg) {
  if (!cfg || dwcGetOxigenacionDiseno(cfg) !== 'cubos_independientes') return '';
  const n = dwcGetNumCubosIndependientes(cfg);
  const vCubo =
    typeof dwcLitrosUtilesPorCuboMultivalvula === 'function' ? dwcLitrosUtilesPorCuboMultivalvula(cfg) : null;
  const explicit = Number(cfg.dwcLitrosUtilesPorSitioL);
  const vCuboDesdeMedidas =
    vCubo != null && Number.isFinite(vCubo) && vCubo > 0 && !(Number.isFinite(explicit) && explicit >= 0.5);
  const vCuboTxt =
    vCubo != null && Number.isFinite(vCubo) && vCubo > 0
      ? String(vCubo) + ' L' + (vCuboDesdeMedidas ? ' (calculados con tus medidas de cubo)' : '')
      : 'configura las medidas del cubo en Cultivo e instalación';
  return (
    '<' + 'div class="cl-note cl-note--dwc-mc-guide" role="status">' +
    '<p class="cl-dwc-mc-guide-title"><strong>' +
    n +
    ' cubos — mismo volumen en cada uno</strong></p>' +
    '<p class="cl-dwc-mc-guide-lead">Cada cubo lleva <strong>' +
    vCuboTxt +
    '</strong> de solución útil (cámara de aire bajo la cesta). Los <strong>ml del paso 4</strong> son para <strong>un cubo</strong>: repites el mismo proceso en los ' +
    n +
    ' cubos y después enciendes el aire y plantas.</p>' +
    '<ol class="cl-dwc-mc-guide-steps">' +
    '<li><strong>Cultivo e instalación:</strong> cuántos cubos, medidas de un cubo y 1 maceta por cubo.</li>' +
    '<li><strong>PC·1:</strong> confirma <strong>litros útiles por cubo</strong> (abajo).</li>' +
    '<li><strong>Paso 4:</strong> en <strong>cada cubo</strong> — agua → CalMag → nutrientes → pH (o mezcla en un cubo auxiliar del mismo volumen y reparte).</li>' +
    '<li><strong>Al terminar:</strong> aireador en marcha en todos los cubos; mide EC/pH por cubo si quieres anotarlo.</li>' +
    '</ol></div>'
  );
}

/** Lista visual de cubos antes del paso 4.1 (multicubo). */
function dwcHtmlChecklistCubosMarcadores(cfg) {
  if (!cfg || dwcGetOxigenacionDiseno(cfg) !== 'cubos_independientes') return '';
  const n = dwcGetNumCubosIndependientes(cfg);
  if (!n || n < 1) return '';
  let html = '<ul class="cl-dwc-mc-cubo-marks" role="list">';
  for (let i = 1; i <= n; i++) {
    html +=
      '<li><label class="cl-dwc-mc-cubo-mark"><input type="checkbox" disabled> Cubo ' +
      i +
      ' — agua y burbujeo OK</label></li>';
  }
  html += '</ul>';
  return html;
}

function dwcAplicarMatrizCultivoMulticuboEnCfg(cfg, ids) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return;
  if (dwcGetOxigenacionDiseno(cfg) !== 'cubos_independientes') {
    delete cfg.dwcNumCubos;
    return;
  }
  let n = NaN;
  if (ids && ids.numCubos) {
    const el = document.getElementById(ids.numCubos);
    if (el && String(el.value).trim() !== '') {
      const p = parseInt(String(el.value).trim(), 10);
      if (Number.isFinite(p) && p >= 1) n = p;
    }
  }
  if (!Number.isFinite(n) || n < 1) {
    const d = parseInt(String(cfg.dwcNumCubos), 10);
    if (Number.isFinite(d) && d >= 1) n = d;
  }
  if (!Number.isFinite(n) || n < 1) {
    n =
      Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1) *
      Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  }
  n = Math.min(24, Math.max(1, Math.round(n)));
  cfg.dwcNumCubos = n;
  cfg.numNiveles = 1;
  cfg.numCestas = n;
  cfg.dwcModo = 'aireado';
  cfg.dwcObjetivoCultivo = 'final';
  cfg.dwcRejillaModoPreferido = 'objetivo';
}

function dwcGetModoCultivo(cfg) {
  const c = cfg || state.configTorre || {};
  if (c.dwcModo) return dwcNormalizeModo(c.dwcModo);
  // Compatibilidad con instalaciones antiguas: si no había modo explícito,
  // usar la presencia de entrada de aire como pista.
  if (c.dwcEntradaAireManguera === false) return 'kratky';
  return 'aireado';
}

function esDwcKratky(cfg) {
  const c = cfg || state.configTorre || {};
  return tipoInstalacionNormalizado(c) === 'dwc' && dwcGetModoCultivo(c) === 'kratky';
}

function dwcGetRejillaModoPreferido(cfg) {
  const c = cfg || state.configTorre || {};
  return dwcNormalizeRejillaModo(c.dwcRejillaModoPreferido);
}

function dwcGetObjetivoCultivo(cfg) {
  const c = cfg || state.configTorre || {};
  if (c.dwcObjetivoCultivo) return dwcNormalizeObjetivoCultivo(c.dwcObjetivoCultivo);
  return dwcObjetivoCultivoDesdeRimMm(c.dwcNetPotRimMm);
}

function dwcGetObjetivoSpec(objetivo) {
  const k = dwcNormalizeObjetivoCultivo(objetivo);
  if (k === 'baby') {
    return {
      key: 'baby',
      label: 'Alta densidad / baby leaf (cosecha joven)',
      litrosTxt: '1–2 L/planta',
      ccTxt: '8–12 cm',
      ccMinMm: 80,
      ccMaxMm: 120,
    };
  }
  return {
    key: 'final',
    label: 'Planta adulta (tamaño completo)',
    litrosTxt: '3–5 L/planta',
    ccTxt: '15–25 cm',
    ccMinMm: 150,
    ccMaxMm: 250,
  };
}

function dwcNormalizeDepositoForma(raw) {
  const v = String(raw == null ? '' : raw).trim().toLowerCase();
  if (v === 'cilindrico') return 'cilindrico';
  if (v === 'troncopiramidal') return 'troncopiramidal';
  return 'prismatico';
}

function dwcFormaDepositoLabel(forma) {
  const f = dwcNormalizeDepositoForma(forma);
  if (f === 'cilindrico') return 'Cilíndrico';
  if (f === 'troncopiramidal') return 'Troncopiramidal';
  return 'Prismático';
}

function dwcRequiereVolumenManual(forma) {
  return dwcNormalizeDepositoForma(forma) === 'troncopiramidal';
}

/**
 * Troncopiramidal: boca interior (L×A) × altura útil del líquido P (cm) ≈ prisma recto;
 * útil para capacidad y llenado seguro frente a cesta cuando no hay litros medidos a mano.
 */
function dwcTroncoLitrosDesdeLAMenosP(L, W, P) {
  if (!Number.isFinite(L) || !Number.isFinite(W) || !Number.isFinite(P)) return null;
  if (L < 5 || L > 300 || W < 5 || W > 300 || P < 5 || P > 200) return null;
  const litros = (L * W * P) / 1000;
  if (!Number.isFinite(litros) || litros <= 0) return null;
  return Math.round(litros * 10) / 10;
}

function _dwcParseVolManualLitros(raw) {
  const v = parseFloat(String(raw == null ? '' : raw).replace(',', '.').trim());
  if (!Number.isFinite(v) || v < 1 || v > 800) return null;
  return Math.round(v * 10) / 10;
}

function getDwcVolumenManualLitrosDesdeConfig(cfg) {
  return _dwcParseVolManualLitros((cfg || {}).dwcDepositoVolManualL);
}

/**
 * Capacidad útil del depósito DWC (L) desde config guardada:
 * - prismático: L×A×P
 * - cilíndrico: π·(D/2)^2·P (D interior; L y W en config se guardan iguales a D)
 * - troncopiramidal: litros manuales si los indicas; si no, L×A×P (boca × altura útil del líquido, aprox. prisma)
 */
function getDwcCapacidadLitrosDesdeConfig(cfg) {
  cfg = cfg || {};
  const forma = dwcNormalizeDepositoForma(cfg.dwcDepositoForma);
  const volManual = getDwcVolumenManualLitrosDesdeConfig(cfg);
  if (volManual != null && !dwcRequiereVolumenManual(forma)) return volManual;
  if (dwcRequiereVolumenManual(forma)) {
    if (volManual != null && volManual > 0) return volManual;
    const L = Number(cfg.dwcDepositoLargoCm);
    const W = Number(cfg.dwcDepositoAnchoCm);
    const P = Number(cfg.dwcDepositoProfCm);
    const g = dwcTroncoLitrosDesdeLAMenosP(L, W, P);
    return g;
  }
  const L = Number(cfg.dwcDepositoLargoCm);
  const W = Number(cfg.dwcDepositoAnchoCm);
  const P = Number(cfg.dwcDepositoProfCm);
  let litros;
  if (forma === 'cilindrico') {
    if (!Number.isFinite(P) || P < 5 || P > 200) return null;
    const d = dwcDiametroInteriorCmDesdeLW(cfg.dwcDepositoLargoCm, cfg.dwcDepositoAnchoCm);
    if (d == null) return null;
    litros = Math.PI * Math.pow(d / 2, 2) * P / 1000;
  } else {
    if (!Number.isFinite(L) || !Number.isFinite(W) || !Number.isFinite(P)) return null;
    if (L < 5 || L > 300 || W < 5 || W > 300 || P < 5 || P > 200) return null;
    litros = (L * W * P) / 1000;
  }
  if (!Number.isFinite(litros) || litros <= 0) return null;
  return Math.round(litros * 10) / 10;
}

/** Altura estimada del sustrato dentro de la cesta net-pot (mm), según sustrato activo. */
function getDwcAlturaSustratoEstimadaMm(cfg) {
  const c = cfg || state.configTorre || {};
  const hPotRaw = Number(c.dwcNetPotHeightMm);
  const hPot = Number.isFinite(hPotRaw) && hPotRaw >= 30 && hPotRaw <= 200 ? hPotRaw : 70;
  const sKey =
    typeof normalizaSustratoKey === 'function'
      ? normalizaSustratoKey(c.sustrato || (typeof state !== 'undefined' && state.configSustrato) || 'esponja')
      : 'esponja';
  // Fracción típica de llenado de cesta por material (estimación práctica para reserva de seguridad).
  const ratioBySustrato = {
    esponja: 0.55,
    lana: 0.65,
    espuma: 0.60,
    coco: 0.72,
    perlita: 0.68,
    vermiculita: 0.70,
    arcilla: 0.62,
    turba_enraiz: 0.70,
    mixto: 0.68,
  };
  const ratio = Number.isFinite(ratioBySustrato[sKey]) ? ratioBySustrato[sKey] : 0.65;
  const mm = Math.round(hPot * ratio);
  return Math.max(10, Math.min(Math.round(hPot - 5), mm));
}

/**
 * Estima el colgado típico de la cesta (cuerpo de net pot) bajo la tapa hacia el líquido (cm).
 * Sirve para restar a la profundidad útil P: la lámina no debe llegar al sustrato (hueco ~0,5–1 cm).
 */
function _dwcColgadoCestaBajoTapaCm(cfg, Pcm) {
  const P = Number(Pcm);
  const hPotRaw = Number((cfg || {}).dwcNetPotHeightMm);
  const hPotMm = Number.isFinite(hPotRaw) && hPotRaw >= 30 && hPotRaw <= 200 ? hPotRaw : 70;
  const potCm = hPotMm / 10;
  const rim = Number((cfg || {}).dwcNetPotRimMm);
  let hang = potCm * 0.38 + 1.0;
  if (Number.isFinite(rim) && rim >= 25 && rim <= 120) {
    const dCm = rim / 10;
    hang = Math.min(hang, Math.max(2.0, dCm * 0.72));
  }
  const capByP = Number.isFinite(P) && P > 0 ? Math.max(2.2, P * 0.48) : 12;
  return Math.min(Math.max(2.0, hang), capByP);
}

/**
 * Altura de columna de líquido (cm) hasta la superficie segura: P − colgado − lámina de aire bajo sustrato.
 * Evita el error anterior (usar solo hPot−sustrato como si fuera toda la columna de agua).
 */
function _dwcAlturaColumnaLiquidoSeguraCm(cfg, Pcm) {
  const P = Number(Pcm);
  if (!Number.isFinite(P) || P < 5 || P > 200) return null;
  const gapLaminaCm = 0.85;
  const hang = _dwcColgadoCestaBajoTapaCm(cfg, P);
  const hIdeal = P - hang - gapLaminaCm;
  const hMinModelo = Math.min(P * 0.18, 5.0);
  return Math.min(P, Math.max(hMinModelo, hIdeal));
}

/**
 * Volumen máximo de llenado seguro (L) en DWC:
 * deja la superficie del nutriente 0.5–1.0 cm por debajo de la base del sustrato.
 */
function getDwcVolumenSeguroMaxLitrosDesdeConfig(cfg) {
  const c = cfg || state.configTorre || {};
  const cap = getDwcCapacidadLitrosDesdeConfig(c);
  if (!Number.isFinite(cap) || cap <= 0) return null;

  let Puse = Number(c.dwcDepositoProfCm);
  if (!Number.isFinite(Puse) || Puse < 5 || Puse > 200) {
    const L = Number(c.dwcDepositoLargoCm);
    const W = Number(c.dwcDepositoAnchoCm);
    if (Number.isFinite(L) && Number.isFinite(W) && L > 0 && W > 0 && cap > 0) {
      const pEst = (cap * 1000) / (L * W);
      if (Number.isFinite(pEst) && pEst >= 5 && pEst <= 200) Puse = pEst;
    }
  }
  if (!Number.isFinite(Puse) || Puse < 5 || Puse > 200) {
    const vm = getDwcVolumenManualLitrosDesdeConfig(c);
    if (!Number.isFinite(vm) || vm <= 0) return null;
    const out = Math.round(vm * 0.82 * 10) / 10;
    return out > 0 ? out : null;
  }

  const hCol = _dwcAlturaColumnaLiquidoSeguraCm(c, Puse);
  if (hCol == null || hCol <= 0) return null;
  const litros = cap * (hCol / Puse);
  const out = Math.round(litros * 10) / 10;
  if (!Number.isFinite(out) || out <= 0) return null;
  if (out >= cap - 0.02) return Math.round((cap - 0.1) * 10) / 10;
  return out;
}

/** Mantiene volDeposito alineado con L×A×P cuando el usuario guarda sistema DWC. */
function dwcSyncVolDepositoDesdeCapacidadEstimada(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return;
  const cap = getDwcCapacidadLitrosDesdeConfig(cfg);
  if (cap == null || cap < 1) return;
  cfg.volDeposito = Math.min(800, Math.max(1, Math.round(cap * 10) / 10));
}

/**
 * Tope orientativo de litros de mezcla en DWC: capacidad geométrica (volDeposito / dimensiones)
 * recortada por el llenado seguro bajo cesta + cámara de aire cuando aplica.
 */
function getDwcVolumenMaxMezclaLitrosDesdeConfig(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return null;
  const geo = Number(cfg.volDeposito);
  const capDims = getDwcCapacidadLitrosDesdeConfig(cfg);
  const geoOk = Number.isFinite(geo) && geo > 0 ? Math.min(800, Math.max(1, Math.round(geo * 10) / 10)) : null;
  const capOk =
    capDims != null && capDims > 0 ? Math.min(800, Math.max(1, Math.round(capDims * 10) / 10)) : null;
  const geometric = geoOk != null ? geoOk : capOk;
  const safeRaw = getDwcVolumenSeguroMaxLitrosDesdeConfig(cfg);
  let safeOk = null;
  if (safeRaw != null && safeRaw > 0) {
    const geoRef = geometric != null ? geometric : capOk;
    if (geoRef != null && safeRaw < geoRef * 0.06) {
      safeOk = null;
    } else {
      safeOk = Math.min(800, Math.max(1, Math.round(safeRaw * 10) / 10));
    }
  }
  if (geometric != null && safeOk != null) return Math.min(geometric, safeOk);
  if (safeOk != null) return safeOk;
  if (geometric != null) return geometric;
  return null;
}

/** Máximo de mezcla en el asistente DWC (inputs actuales del paso 1). */
function getSetupDwcVolumenMaxMezclaOrientativoLitros() {
  const draft = buildDwcDraftCfgFromSetupWizardInputs();
  if (!draft) return null;
  const cap = getDwcCapacidadLitrosFromSetupInputs();
  const geoL = cap != null && cap > 0 ? Math.min(800, Math.max(1, Math.round(cap * 10) / 10)) : null;
  const safeRaw = getDwcVolumenSeguroMaxLitrosDesdeConfig(draft);
  let sL = null;
  if (safeRaw != null && safeRaw > 0) {
    const geoRef = geoL;
    if (geoRef != null && safeRaw < geoRef * 0.06) {
      sL = null;
    } else {
      sL = Math.min(800, Math.max(1, Math.round(safeRaw * 10) / 10));
    }
  }
  if (geoL != null && sL != null) return Math.min(geoL, sL);
  if (sL != null) return sL;
  return geoL;
}

/** Si había litros de mezcla guardados con otro máximo, recortar al depósito actual (evita fallo en checklist). */
function dwcClampVolMezclaACapacidadDeposito(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return;
  const vmax =
    typeof getDwcVolumenMaxMezclaLitrosDesdeConfig === 'function'
      ? getDwcVolumenMaxMezclaLitrosDesdeConfig(cfg)
      : Number(cfg.volDeposito);
  if (!Number.isFinite(vmax) || vmax < 1) return;
  const vm = Number(cfg.volMezclaLitros);
  if (Number.isFinite(vm) && vm > 0 && vm > vmax + 0.01) {
    cfg.volMezclaLitros = Math.round(vmax * 10) / 10;
  }
}

/**
 * Volumen efectivo (L) para validar checklist: volDeposito o, en DWC, capacidad por dimensiones.
 */
function litrosDepositoParaChecklist(cfg) {
  cfg = cfg || {};
  const v = Number(cfg.volDeposito);
  if (Number.isFinite(v) && v >= 1 && v <= 800) return Math.round(v * 10) / 10;
  const tipoNorm =
    typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : cfg.tipoInstalacion;
  if (tipoNorm === 'rdwc') {
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(cfg);
    const vCtl = Number(cfg.rdwcControlVolL);
    if (Number.isFinite(vCtl) && vCtl >= 1 && vCtl <= 800) return Math.round(vCtl * 10) / 10;
  }
  if (cfg.tipoInstalacion === 'dwc') {
    const cap = getDwcCapacidadLitrosDesdeConfig(cfg);
    if (cap != null && cap >= 1 && cap <= 800) return cap;
  }
  if (tipoNorm === 'srf' && typeof srfCapacidadLitrosDesdeConfig === 'function') {
    const capS = srfCapacidadLitrosDesdeConfig(cfg);
    if (capS != null && capS >= 1 && capS <= 5000) return capS;
  }
  return null;
}

/**
 * Ajuste de rango EC por objetivo baby/final en DWC (misma lógica orientativa que torre).
 */
function dwcAplicarObjetivoEcRango(ecRange, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  if (tipoInstalacionNormalizado(c) !== 'dwc') return ecRange;
  const baseMin = Number(ecRange && ecRange.min);
  const baseMax = Number(ecRange && ecRange.max);
  if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) return ecRange;
  const objRaw =
    objetivo != null
      ? objetivo
      : (typeof dwcGetObjetivoCultivo === 'function' ? dwcGetObjetivoCultivo(c) : 'final');
  const obj = torreNormalizeObjetivoCultivo(objRaw);
  const adj = torreGetObjetivoAjustes(c, obj);
  const minAdj = Math.max(350, Math.round(baseMin * adj.ecMult));
  const maxAdj = Math.max(minAdj + 80, Math.round(baseMax * adj.ecMult));
  return { min: minAdj, max: maxAdj };
}

function dwcGrupoObjetivoDesdeConfig(cfg) {
  cfg = cfg || state.configTorre || {};
  const cnt = {};
  const addG = g => {
    const k = String(g || '').trim().toLowerCase();
    if (!k) return;
    cnt[k] = (cnt[k] || 0) + 1;
  };
  try {
    const tor = state.torre || [];
    for (let i = 0; i < tor.length; i++) {
      const row = tor[i] || [];
      for (let j = 0; j < row.length; j++) {
        const v = row[j] && row[j].variedad;
        if (!v) continue;
        const c = typeof getCultivoDB === 'function' ? getCultivoDB(v) : null;
        if (c && c.grupo) addG(c.grupo);
      }
    }
  } catch (_) {}
  if (Array.isArray(cfg.cultivosIniciales)) {
    for (let i = 0; i < cfg.cultivosIniciales.length; i++) {
      const v = cfg.cultivosIniciales[i];
      if (!v) continue;
      const c = typeof getCultivoDB === 'function' ? getCultivoDB(v) : null;
      if (c && c.grupo) addG(c.grupo);
    }
  }
  let best = '';
  let bestN = -1;
  for (const k in cnt) {
    if (cnt[k] > bestN) {
      bestN = cnt[k];
      best = k;
    }
  }
  if (best) return best;
  const mk = typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  if (mk === 'mini') return 'microgreens';
  if (mk === 'mixto') return 'asiaticas';
  if (mk === 'intensivo') return 'hojas';
  return 'lechugas';
}

function dwcRimMmDesdeConfig(cfg) {
  const c = cfg || state.configTorre || {};
  const rim = Number(c.dwcNetPotRimMm);
  if (Number.isFinite(rim) && rim >= 25 && rim <= 120) return Math.round(rim);
  if (c.tamanoCesta === 'custom') {
    const cm = Number(String(c.tamanoCestaCustom || '').replace(',', '.'));
    if (Number.isFinite(cm) && cm >= 2.5 && cm <= 12) return Math.round(cm * 10);
  }
  const map = { '38': 38, '40': 40, '50': 50, '75': 75, '100': 100 };
  if (map[c.tamanoCesta]) return map[c.tamanoCesta];
  return null;
}

function dwcRecoPerfilPorGrupo(grupo, objetivo) {
  const g = String(grupo || '').trim().toLowerCase();
  const obj = dwcNormalizeObjetivoCultivo(objetivo);
  const esBaby = obj === 'baby';
  if (g === 'microgreens') {
    return {
      grupo: 'microgreens',
      etiqueta: 'Microgreens',
      objetivo: esBaby ? 'alta densidad' : 'ciclo corto',
      cestaMinMm: 27,
      cestaMaxMm: 50,
      cestaTxt: '27–50 mm',
      permite: true,
    };
  }
  if (g === 'asiaticas') {
    if (esBaby) {
      return {
        grupo: 'asiaticas',
        etiqueta: 'Asiáticas (baby)',
        objetivo: 'alta densidad',
        cestaMinMm: 27,
        cestaMaxMm: 50,
        cestaTxt: '27–50 mm',
        permite: true,
      };
    }
    return {
      grupo: 'asiaticas',
      etiqueta: 'Asiáticas (planta final)',
      objetivo: 'producción final',
      cestaMinMm: 50,
      cestaMaxMm: 75,
      cestaTxt: '50–75 mm',
      permite: true,
    };
  }
  if (g === 'hojas' || g === 'hierbas') {
    return {
      grupo: g || 'hojas',
      etiqueta: g === 'hierbas' ? 'Hierbas' : 'Hojas voluminosas',
      objetivo: esBaby ? 'alta densidad' : 'producción final',
      cestaMinMm: esBaby ? 27 : 50,
      cestaMaxMm: esBaby ? 50 : 75,
      cestaTxt: esBaby ? '27–50 mm' : '50–75 mm',
      permite: true,
    };
  }
  if (g === 'frutos' || g === 'fresas' || g === 'raices') {
    return {
      grupo: g || 'frutos',
      etiqueta: g === 'fresas' ? 'Fresas' : g === 'raices' ? 'Raíces' : 'Frutos',
      objetivo: 'sistema dedicado',
      cestaMinMm: 75,
      cestaMaxMm: 100,
      cestaTxt: '75–100 mm',
      permite: true,
    };
  }
  if (esBaby) {
    return {
      grupo: 'lechugas',
      etiqueta: 'Lechugas / hojas ligeras (baby)',
      objetivo: 'alta densidad',
      cestaMinMm: 27,
      cestaMaxMm: 50,
      cestaTxt: '27–50 mm',
      permite: true,
    };
  }
  return {
    grupo: 'lechugas',
    etiqueta: 'Lechugas / hojas ligeras (final)',
    objetivo: 'producción final',
    cestaMinMm: 50,
    cestaMaxMm: 50,
    cestaTxt: '50 mm',
    permite: true,
  };
}

function dwcEsGrupoCestaGrande(grupo) {
  const g = String(grupo || '').trim().toLowerCase();
  return g === 'frutos' || g === 'fresas' || g === 'raices';
}

function dwcRecomendacionCultivoDesdeConfig(cfg) {
  cfg = cfg || state.configTorre || {};
  if (cfg.tipoInstalacion !== 'dwc') return null;
  const objetivo = dwcGetObjetivoCultivo(cfg);
  const grupo = dwcGrupoObjetivoDesdeConfig(cfg);
  const perfil = dwcRecoPerfilPorGrupo(grupo, objetivo);
  const rimActualMm = dwcRimMmDesdeConfig(cfg);
  const esGrande = dwcEsGrupoCestaGrande(grupo);
  const esMulticubo =
    typeof dwcGetOxigenacionDiseno === 'function' &&
    dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes';
  let estado = 'ok';
  let veredicto = 'Cesta dentro del rango recomendado';
  if (!Number.isFinite(rimActualMm) || rimActualMm <= 0) {
    estado = 'warn';
    veredicto = esGrande
      ? 'Indica Ø aro (orientativo ' + perfil.cestaTxt + ' para ' + perfil.etiqueta + ')'
      : 'Falta diámetro de cesta para validar';
  } else if (rimActualMm < perfil.cestaMinMm) {
    estado = 'warn';
    veredicto = esGrande
      ? 'Cesta pequeña para ' + perfil.etiqueta + '; orientativo ' + perfil.cestaTxt
      : 'Cesta pequeña para este cultivo/objetivo';
  } else if (rimActualMm > perfil.cestaMaxMm + 5) {
    estado = 'warn';
    veredicto = esGrande
      ? 'Cesta muy grande; revisa volumen por planta y soporte'
      : 'Cesta sobredimensionada para esta densidad';
  } else if (esGrande && !esMulticubo) {
    estado = 'warn';
    veredicto =
      'Cesta adecuada (' +
      rimActualMm +
      ' mm); en depósito compartido vigila mezcla, raíces y volumen por planta';
  } else if (esGrande && esMulticubo) {
    estado = 'ok';
    veredicto = 'Cesta adecuada para ' + perfil.etiqueta + ' (cubo dedicado por planta)';
  }
  return {
    grupo,
    objetivo,
    perfil,
    rimActualMm: Number.isFinite(rimActualMm) ? rimActualMm : null,
    estado,
    veredicto,
  };
}

/** Borrador DWC desde formulario sistema o asistente para recomendación Ø aro vs cultivo. */
function dwcBuildConfigDraftForReco(scope) {
  const p = scope === 'setup' ? 'setup' : 'sys';
  const cfg = { ...(state.configTorre || {}), tipoInstalacion: 'dwc' };
  const rim = _dwcParseOptMm(p + 'DwcPotRimMm', 25, 120);
  if (rim != null) cfg.dwcNetPotRimMm = rim;
  const objEl = document.getElementById(p + 'DwcObjetivoCultivo');
  if (objEl && objEl.value) cfg.dwcObjetivoCultivo = dwcNormalizeObjetivoCultivo(objEl.value);
  const oxEl = document.getElementById(p + 'DwcOxigenacionDiseno');
  if (oxEl && oxEl.value) cfg.dwcOxigenacionDiseno = dwcNormalizeOxigenacionDiseno(oxEl.value);
  return cfg;
}

function renderDwcCultivoRecoStatus(scope) {
  const elId = scope === 'setup' ? 'setupDwcCultivoRecoStatus' : 'sysDwcCultivoRecoStatus';
  const el = document.getElementById(elId);
  if (!el) return;
  const esSetup = scope === 'setup';
  if (esSetup) {
    if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') {
      el.innerHTML = '';
      el.classList.add('setup-hidden');
      return;
    }
  } else if (!state.configTorre || state.configTorre.tipoInstalacion !== 'dwc') {
    el.innerHTML = '';
    el.classList.add('setup-hidden');
    return;
  }
  const draft = dwcBuildConfigDraftForReco(scope);
  const r = typeof dwcRecomendacionCultivoDesdeConfig === 'function' ? dwcRecomendacionCultivoDesdeConfig(draft) : null;
  if (!r) {
    el.innerHTML = '';
    el.classList.add('setup-hidden');
    return;
  }
  const chip = typeof rdwcCompatChipHtml === 'function' ? rdwcCompatChipHtml(r.estado) : '';
  const esc = typeof meteoEscHtml === 'function' ? meteoEscHtml : function (x) {
    return String(x == null ? '' : x);
  };
  const rimTxt =
    r.rimActualMm != null
      ? 'Indicas <strong>' + r.rimActualMm + ' mm</strong> (Ø aro).'
      : 'Indica el <strong>Ø aro de cesta</strong> (mm) para validar.';
  el.classList.remove('setup-hidden');
  el.innerHTML =
    '<span class="rdwc-compat-text"><strong>Recomendación cesta</strong> ' +
    chip +
    ' · ' +
    esc(r.perfil.etiqueta) +
    ' · rango orientativo <strong>' +
    esc(r.perfil.cestaTxt) +
    '</strong> · ' +
    rimTxt +
    ' <em>' +
    esc(r.veredicto) +
    '</em> También en <strong>Consejos → DWC</strong> y en el checklist de recarga.</span>';
}

function dwcRecomendacionCultivoTextoCorto(cfg) {
  const r = dwcRecomendacionCultivoDesdeConfig(cfg);
  if (!r) return '';
  const dTxt = r.rimActualMm != null ? r.rimActualMm + ' mm' : '—';
  return (
    'Cultivo objetivo: ' +
    r.perfil.etiqueta +
    ' · cesta rec. ' +
    r.perfil.cestaTxt +
    ' · actual ' +
    dTxt +
    ' · ' +
    r.veredicto +
    '.'
  );
}

function dwcObjetivoDesdeInputId(id, cfg) {
  const el = document.getElementById(id);
  if (el && el.value) return dwcNormalizeObjetivoCultivo(el.value);
  return dwcGetObjetivoCultivo(cfg);
}

function dwcRangoCestasOrientativoPorObjetivo(maxTap, objetivoSpec) {
  if (!maxTap || maxTap.max < 1) return null;
  const L = Number(maxTap.Lmm);
  const W = Number(maxTap.Wmm);
  if (!Number.isFinite(L) || !Number.isFinite(W) || L <= 0 || W <= 0) return null;
  const nAt = cc => Math.max(1, Math.floor(L / cc) * Math.floor(W / cc));
  const nMin = Math.min(maxTap.max, nAt(objetivoSpec.ccMaxMm));
  const nMax = Math.min(maxTap.max, nAt(objetivoSpec.ccMinMm));
  return {
    min: Math.max(1, Math.min(nMin, nMax)),
    max: Math.max(1, Math.max(nMin, nMax)),
  };
}

function dwcTextoHintBotonPrincipal(modoPri, spec, maxTap, rangoObj) {
  if (dwcNormalizeRejillaModo(modoPri) === 'max') {
    return (
      'Principal = máxima geométrica: prioriza ocupación de tapa (hasta ~' +
      maxTap.max +
      ' cestas). Úsala si buscas exprimir espacio y luego ajustar manualmente.'
    );
  }
  let rangoTxt = '';
  if (rangoObj) {
    rangoTxt = ' (~' + rangoObj.min + '–' + rangoObj.max + ' cestas orientativas)';
  }
  return (
    'Principal = recomendada por objetivo: ' +
    spec.label +
    ' · ' +
    spec.ccTxt +
    ' c-c · ' +
    spec.litrosTxt +
    rangoTxt +
    '.'
  );
}

/** Marco tapa (mm por lado) y hueco entre cestas: vacío = usar defectos en el aviso (marco 0, hueco 4 mm). */
function _dwcParseMarcoHuecoMmIds(marcoId, huecoId) {
  const elM = document.getElementById(marcoId);
  const elH = document.getElementById(huecoId);
  const rawM = elM ? String(elM.value != null ? elM.value : '').trim() : '';
  const rawH = elH ? String(elH.value != null ? elH.value : '').trim() : '';
  let marco = null;
  let hueco = null;
  if (rawM !== '') {
    const m = parseInt(rawM, 10);
    if (Number.isFinite(m) && m >= 0 && m <= 80) marco = m;
  }
  if (rawH !== '') {
    const h = parseInt(rawH, 10);
    if (Number.isFinite(h) && h >= 0 && h <= 40) hueco = h;
  }
  return { marco, hueco };
}

function getDwcCapacidadLitrosFromFormIds(ids) {
  const forma = dwcNormalizeDepositoForma(document.getElementById(ids.forma)?.value);
  const volManual = ids.volManual ? _dwcParseVolManualLitros(document.getElementById(ids.volManual)?.value) : null;
  if (volManual != null && !dwcRequiereVolumenManual(forma)) return volManual;
  if (dwcRequiereVolumenManual(forma)) {
    if (volManual != null && volManual > 0) return volManual;
    const P = _dwcParseOptCm(ids.prof, 5, 200);
    const { L, W } = dwcLargoAnchoCmEffectivosDesdeFormIds(ids);
    return dwcTroncoLitrosDesdeLAMenosP(L, W, P);
  }
  const P = _dwcParseOptCm(ids.prof, 5, 200);
  const { L, W } = dwcLargoAnchoCmEffectivosDesdeFormIds(ids);
  if (L == null || W == null || P == null) return null;
  let litros =
    forma === 'cilindrico' ? Math.PI * Math.pow(L / 2, 2) * P / 1000 : (L * W * P) / 1000;
  if (!Number.isFinite(litros) || litros <= 0) return null;
  return Math.round(litros * 10) / 10;
}

/** Litros útiles del depósito DWC si medidas (cm) están completas en el asistente. */
function getDwcCapacidadLitrosFromSetupInputs() {
  return getDwcCapacidadLitrosFromFormIds(DWC_FORM_IDS_SETUP);
}

/** Borrador DWC desde el formulario del asistente (paso 1) para cálculos de volumen seguro. */
function buildDwcDraftCfgFromSetupWizardInputs() {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') return null;
  const c = { tipoInstalacion: 'dwc' };
  const su =
    (typeof state !== 'undefined' && state.configTorre && state.configTorre.sustrato) ||
    (typeof state !== 'undefined' && state.configSustrato);
  if (su) c.sustrato = su;
  try {
    dwcMergeCamposFormularioEnCfg(c, DWC_FORM_IDS_SETUP);
  } catch (e) {
    return null;
  }
  return c;
}

/**
 * Rellena setupVolMezclaL con litros de llenado seguro (orientativo) si el campo está vacío
 * o sigue coincidiendo con la última sugerencia automática.
 */
function syncSetupVolMezclaSugeridoDwc() {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') return;
  const inp = document.getElementById('setupVolMezclaL');
  if (!inp) return;
  const draft = buildDwcDraftCfgFromSetupWizardInputs();
  if (!draft) return;
  const vSeg = getDwcVolumenSeguroMaxLitrosDesdeConfig(draft);
  if (vSeg == null || !Number.isFinite(vSeg) || vSeg <= 0) return;
  const maxL = typeof getSetupVolumenMaxLitros === 'function' ? getSetupVolumenMaxLitros() : vSeg;
  const vClamped = Math.round(Math.min(vSeg, maxL != null && maxL > 0 ? maxL : vSeg) * 10) / 10;
  const prevAuto = inp.getAttribute('data-hc-dwc-mezcla-auto');
  const cur = String(inp.value || '').trim().replace(',', '.');
  const curN = cur ? parseFloat(cur) : NaN;
  const shouldApply =
    cur === '' ||
    (prevAuto != null &&
      prevAuto !== '' &&
      Number.isFinite(curN) &&
      Number.isFinite(Number(prevAuto)) &&
      Math.abs(curN - Number(prevAuto)) < 0.06);
  if (!shouldApply) return;
  inp.value = String(vClamped);
  inp.setAttribute('data-hc-dwc-mezcla-auto', String(vClamped));
  try {
    onSetupVolMezclaInput();
  } catch (_) {}
}

/** Litros de mezcla del asistente: abajo del bloque DWC o junto al slider de capacidad (torre/NFT). */
function repositionSetupVolMezclaBlock() {
  const block = document.getElementById('setupVolMezclaBlock');
  const slotDwc = document.getElementById('setupVolMezclaSlotDwc');
  const slotDefault = document.getElementById('setupVolMezclaSlotDefault');
  if (!block || !slotDwc || !slotDefault) return;
  const isDwc = typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion === 'dwc';
  (isDwc ? slotDwc : slotDefault).appendChild(block);
}

/** Litros útiles del depósito desde campos de la pestaña Cultivo e instalación (misma fórmula que el asistente). */
function getDwcCapacidadLitrosFromSistemaInputs() {
  return getDwcCapacidadLitrosFromFormIds(DWC_FORM_IDS_SISTEMA);
}

/**
 * Litros de solución para recomendar oxigenación en DWC (mezcla si está por debajo del máx.; si no, capacidad máx. de la config).
 */
function getDwcLitrosOxigenacionReferencia(cfg) {
  cfg = cfg || state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return null;
  const vMax = getVolumenDepositoMaxLitros(cfg);
  const vMez = getVolumenMezclaLitros(cfg);
  if (!Number.isFinite(vMax) || vMax <= 0) return null;
  if (!Number.isFinite(vMez) || vMez <= 0) return null;
  const vol = vMez < vMax - 0.05 ? vMez : vMax;
  return {
    vol: Math.round(vol * 10) / 10,
    vMax: Math.round(vMax * 10) / 10,
    usaMezcla: vMez < vMax - 0.05,
  };
}

/**
 * Caudal de aire orientativo (L/min) según volumen DWC: regla habitual ~1 L/min por 10 L de solución (banda 0,5–1,5 L/min por 10 L).
 * @returns {{min:number, reco:number, fuerte:number}|null}
 */
function dwcCaudalAireOrientativoLmin(volLitros) {
  const v = Number(volLitros);
  if (!Number.isFinite(v) || v <= 0) return null;
  return {
    min: Math.max(0.4, Math.round(v * 0.05 * 10) / 10),
    reco: Math.max(0.8, Math.round(v * 0.1 * 10) / 10),
    fuerte: Math.max(1.2, Math.round(v * 0.15 * 10) / 10),
  };
}

/**
 * Litros útiles por sitio (cubo) para dimensionar aire en multivalvula.
 * Manual opcional; si no, min(reparto mezcla_total/N, llenado seguro por cubo) con la misma geometría/cesta que depósito único.
 */
function dwcLitrosPorSitioOxigenacionMulticubo(cfg, volMezclaTotal, nTotal) {
  const n = Math.max(1, parseInt(String(nTotal), 10) || 1);
  const vt = Number(volMezclaTotal);
  if (!cfg || cfg.tipoInstalacion !== 'dwc' || !Number.isFinite(vt) || vt <= 0 || n < 1) {
    return { vPer: null, fuente: null };
  }
  const explicit = Number(cfg.dwcLitrosUtilesPorSitioL);
  if (Number.isFinite(explicit) && explicit >= 0.5) {
    return { vPer: Math.min(explicit, vt / n), fuente: 'medido' };
  }
  let safeOne = null;
  try {
    if (typeof getDwcVolumenSeguroMaxLitrosDesdeConfig === 'function') {
      safeOne = getDwcVolumenSeguroMaxLitrosDesdeConfig(cfg);
    }
  } catch (_) {}
  const avg = vt / n;
  if (safeOne != null && Number.isFinite(safeOne) && safeOne > 0) {
    const vPer = Math.min(safeOne, avg);
    let fuente = 'balance';
    if (safeOne < avg - 0.05) fuente = 'llenado_seguro';
    else if (avg < safeOne - 0.05) fuente = 'reparto';
    return { vPer, fuente };
  }
  return { vPer: avg, fuente: 'reparto' };
}

/**
 * Litros útiles de un cubo (cámara de aire + cesta) para SVG, checklist y resumen.
 * No reparte el total del sistema entre N cubos.
 */
function dwcLitrosUtilesPorCuboMultivalvula(cfg) {
  cfg = cfg || state.configTorre || {};
  if (typeof dwcGetOxigenacionDiseno !== 'function' || dwcGetOxigenacionDiseno(cfg) !== 'cubos_independientes') {
    return null;
  }
  const explicit = Number(cfg.dwcLitrosUtilesPorSitioL);
  if (Number.isFinite(explicit) && explicit >= 0.5) {
    return Math.round(explicit * 10) / 10;
  }
  if (typeof getDwcVolumenSeguroMaxLitrosDesdeConfig === 'function') {
    const safe = getDwcVolumenSeguroMaxLitrosDesdeConfig(cfg);
    if (safe != null && Number.isFinite(safe) && safe > 0) {
      return Math.round(safe * 10) / 10;
    }
  }
  return null;
}

/**
 * Recomendación de bomba/difusor DWC.
 * - dep_unido: un depósito con agua compartida; factor ~2,5% extra por cesta (raíz), tope ×1,35; salidas ~1/18 L.
 * - cubos_independientes: varios depósitos aislados (kits multivalvula / DIY): caudal por sitio según L/N sitios,
 *   total bomba ≈ N × caudal/sitio × margen reparto (orientativo).
 */
function dwcCalcDifusorRecomendacion(volLitros, nFilas, nPorFila, opts) {
  opts = opts || {};
  const diseno =
    opts.diseno === 'cubos_independientes' ? 'cubos_independientes' : 'dep_unido';
  const nf = Math.max(1, parseInt(String(nFilas != null ? nFilas : 1), 10) || 1);
  const nc = Math.max(1, parseInt(String(nPorFila != null ? nPorFila : 1), 10) || 1);
  const nTotal = nf * nc;
  const v = Number(volLitros);
  if (!Number.isFinite(v) || v <= 0) return null;

  if (diseno === 'cubos_independientes') {
    const pair = dwcLitrosPorSitioOxigenacionMulticubo(opts.cfg || {}, v, nTotal);
    const vPer = pair.vPer;
    if (!vPer || !Number.isFinite(vPer) || vPer <= 0) return null;
    const basePer = dwcCaudalAireOrientativoLmin(vPer);
    if (!basePer) return null;
    const multManifold = 1.15;
    const scTot = x => Math.round(x * nTotal * multManifold * 10) / 10;
    const min = Math.max(1.2, scTot(basePer.min));
    const reco = Math.max(2, scTot(basePer.reco));
    const fuerte = Math.max(3, scTot(basePer.fuerte));
    const salidasSug = Math.min(12, Math.max(1, nTotal));
    return {
      diseno: 'cubos_independientes',
      vol: Math.round(v * 10) / 10,
      volPorSitio: Math.round(vPer * 10) / 10,
      volPorSitioFuente: pair.fuente,
      nTotal,
      nFilas: nf,
      nPorFila: nc,
      factorDem: 1,
      min,
      reco,
      fuerte,
      salidasSug,
      multManifold,
      caudalPorSitioReco: Math.round(basePer.reco * 10) / 10,
    };
  }

  const base = dwcCaudalAireOrientativoLmin(v);
  if (!base) return null;
  const factorDem = Math.min(1.35, 1 + Math.max(0, nTotal - 1) * 0.025);
  const sc = x => Math.round(x * factorDem * 10) / 10;
  const salidasSug = Math.min(6, Math.max(1, Math.ceil(v / 18)));
  return {
    diseno: 'dep_unido',
    vol: Math.round(v * 10) / 10,
    nTotal,
    nFilas: nf,
    nPorFila: nc,
    factorDem: Math.round(factorDem * 100) / 100,
    min: Math.max(0.4, sc(base.min)),
    reco: Math.max(0.8, sc(base.reco)),
    fuerte: Math.max(1.2, sc(base.fuerte)),
    salidasSug,
  };
}

/** Litros = getVolumenMezclaLitros (solución real en la app). */
function dwcRecomendacionDifusorCompletaDesdeConfig(cfg) {
  cfg = cfg || state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return null;
  const vol = getVolumenMezclaLitros(cfg);
  if (!Number.isFinite(vol) || vol <= 0) return null;
  let nf = Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1);
  let nc = Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  const diseno = dwcGetOxigenacionDiseno(cfg);
  if (diseno === 'cubos_independientes') {
    const nCub = dwcGetNumCubosIndependientes(cfg);
    nf = 1;
    nc = Math.max(1, nCub);
  }
  return dwcCalcDifusorRecomendacion(vol, nf, nc, { diseno, cfg });
}

/** Igual que checklist pero el volumen puede salir de L×A×P del formulario Sistema si están completos. */
function dwcRecomendacionDifusorParaSistemaUI(cfg) {
  cfg = cfg || state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return null;
  const lit = getDwcLitrosOxigenacionParaSistemaUI(cfg);
  if (!lit) return null;
  const cfgEff = { ...cfg };
  try {
    dwcMergeCamposFormularioEnCfg(cfgEff, DWC_FORM_IDS_SISTEMA);
  } catch (_) {}
  let nf = Math.max(1, parseInt(String(cfgEff.numNiveles || 1), 10) || 1);
  let nc = Math.max(1, parseInt(String(cfgEff.numCestas || 1), 10) || 1);
  const diseno = dwcGetOxigenacionDiseno(cfgEff);
  if (diseno === 'cubos_independientes') {
    const nCub = dwcGetNumCubosIndependientes(cfgEff);
    nf = 1;
    nc = Math.max(1, nCub);
  }
  const rec = dwcCalcDifusorRecomendacion(lit.vol, nf, nc, { diseno, cfg: cfgEff });
  if (!rec) return null;
  return { rec, lit };
}

function dwcFormatHtmlRecomendacionDifusorCore(rec) {
  if (!rec) return '';
  if (rec.diseno === 'cubos_independientes') {
    const pct = Math.round((rec.multManifold - 1) * 100);
    const fuenteTxt =
      rec.volPorSitioFuente === 'medido'
        ? ' Origen por sitio: <strong>valor medido</strong> que indicaste (acotado al reparto medio de la mezcla total).'
        : rec.volPorSitioFuente === 'llenado_seguro'
          ? ' Origen por sitio: <strong>mínimo</strong> entre mezcla repartida y <strong>llenado seguro</strong> con cámara de aire y cesta (misma lógica que un depósito único).'
          : rec.volPorSitioFuente === 'reparto'
            ? ' Origen por sitio: <strong>reparto</strong> de la mezcla total (por debajo del tope seguro por cubo con tus medidas).'
            : ' Origen por sitio: equilibrio entre reparto y llenado seguro según medidas y cesta.';
    return (
      '<p class="dwc-dif-p dwc-dif-p-gap"><strong>Varios cubos / multivalvula</strong> (cada cubo con solución <strong>aislada</strong> y su línea de aire): <strong>' +
      rec.nTotal +
      '</strong> cubos · <strong>~' +
      rec.volPorSitio +
      ' L</strong> útiles por sitio para el cálculo (~<strong>' +
      rec.vol +
      ' L</strong> mezcla total en el esquema).' +
      fuenteTxt +
      ' Caudal orientativo en la <strong>salida de la bomba</strong> (todas las líneas en uso): <strong>' +
      rec.min +
      '–' +
      rec.fuerte +
      ' L/min</strong> (~<strong>' +
      rec.reco +
      ' L/min</strong> referencia; ≈<strong>' +
      rec.caudalPorSitioReco +
      ' L/min</strong> por sitio a ~' +
      rec.volPorSitio +
      ' L + <strong>+' +
      pct +
      '%</strong> folga reparto/válvulas).</p>' +
      '<p class="dwc-dif-p"><strong>Salidas:</strong> al menos <strong>' +
      rec.salidasSug +
      '</strong> línea(s) con difusor al fondo de <em>cada</em> cubo. Comprueba en la placa el caudal a tu <strong>profundidad</strong>; el dato del fabricante suele ser el caudal <strong>total</strong> de la bomba, no por salida.</p>'
    );
  }
  return (
    '<p class="dwc-dif-p dwc-dif-p-gap"><strong>~' +
    rec.vol +
    ' L</strong> de solución · rejilla <strong>' +
    rec.nTotal +
    ' cestas</strong> (' +
    rec.nFilas +
    '×' +
    rec.nPorFila +
    '): caudal de aire orientativo <strong>' +
    rec.min +
    '–' +
    rec.fuerte +
    ' L/min</strong> en total (~<strong>' +
    rec.reco +
    ' L/min</strong> referencia; base ~1 L/min por 10 L + factor de cestas).</p>' +
    '<p class="dwc-dif-p"><strong>Difusores:</strong> <strong>' +
    rec.salidasSug +
    '</strong> punto(s) al fondo (piedra plana, disco microporoso o bola por salida), repartidos. Comprueba en la bomba el caudal a la <strong>profundidad</strong> de tu agua.</p>'
  );
}

/**
 * Pestaña Sistema DWC: un solo texto de resultado (sin títulos ni referencias a otras pantallas).
 */
function dwcFormatSistemaDwcDifusorSoloResultado(rec, lit) {
  if (!rec || !lit) return '';
  if (rec.diseno === 'cubos_independientes') {
    const fuenteCorta =
      rec.volPorSitioFuente === 'medido'
        ? 'Litros por cubo medidos por ti.'
        : rec.volPorSitioFuente === 'llenado_seguro'
          ? 'Por sitio: llenado seguro con cámara de aire (como depósito único).'
          : rec.volPorSitioFuente === 'reparto'
            ? 'Por sitio: reparto de la mezcla total.'
            : 'Por sitio: entre reparto y llenado seguro.';
    return (
      'Modo <strong>varios cubos</strong> (aire multivalvula): <strong>' +
      rec.nTotal +
      '</strong> cubos, <strong>~' +
      rec.vol +
      ' L</strong> mezcla total, <strong>~' +
      rec.volPorSitio +
      ' L</strong> útiles/sitio para el cálculo (' +
      fuenteCorta +
      ') Bomba orientativa <strong>' +
      rec.min +
      '–' +
      rec.fuerte +
      ' L/min</strong> en conjunto (~<strong>' +
      rec.reco +
      ' L/min</strong>; ≈' +
      rec.caudalPorSitioReco +
      ' L/min por cubo + margen reparto). <strong>Una línea con difusor al fondo de cada cubo.</strong> Verifica el caudal del fabricante a la profundidad de tu nutriente.'
    );
  }
  const forma = dwcNormalizeDepositoForma(document.getElementById('sysDwcDepositoForma')?.value);
  const { L, W } = dwcLargoAnchoCmEffectivosDesdeFormIds(DWC_FORM_IDS_SISTEMA);
  const P = _dwcParseOptCm('sysDwcProfCm', 5, 200);
  let inicio;
  if (L != null && W != null && P != null) {
    const geoTxt =
      forma === 'cilindrico'
        ? 'cilíndrico Ø' + L + ' × ' + P + ' cm (prof. útil del líquido)'
        : L + '×' + W + '×' + P + ' cm';
    inicio =
      'Para un depósito ' +
      geoTxt +
      ' (~' +
      rec.vol +
      ' L de agua/solución) y ' +
      rec.nTotal +
      ' cestas en depósito (rejilla ' +
      rec.nFilas +
      '×' +
      rec.nPorFila +
      '), ';
  } else if (lit.fuente === 'mezcla') {
    inicio =
      'Para ~' +
      rec.vol +
      ' L de agua/solución en depósito (mezcla configurada; máx. ~' +
      lit.vMax +
      ' L) y ' +
      rec.nTotal +
      ' cestas (rejilla ' +
      rec.nFilas +
      '×' +
      rec.nPorFila +
      '), ';
  } else {
    inicio =
      'Para ~' +
      rec.vol +
      ' L de agua/solución en depósito y ' +
      rec.nTotal +
      ' cestas (rejilla ' +
      rec.nFilas +
      '×' +
      rec.nPorFila +
      '), ';
  }

  const fondoGrande = rec.vol >= 40 || rec.salidasSug >= 4;
  let reparto =
    'Reparte el oxígeno con al menos ' +
    rec.salidasSug +
    ' salida(s) de aire al fondo del depósito.';
  if (fondoGrande) {
    reparto +=
      ' Si el fondo es grande, es preferible varias líneas o varias piedras o discos más pequeños bien repartidos que un solo difusor grande centrado.';
  } else if (rec.salidasSug > 1) {
    reparto += ' Separa las salidas para cubrir el fondo.';
  }

  return (
    inicio +
    'se recomienda una instalación capaz de oxigenar con un caudal de aire orientativo de ' +
    rec.min +
    '–' +
    rec.fuerte +
    ' L/min (referencia ~' +
    rec.reco +
    ' L/min). ' +
    reparto
  );
}

function refrescarDwcDifusorChecklist() {
  const el = document.getElementById('clDwcDifusorRecomendacion');
  if (!el) return;
  const rec = dwcRecomendacionDifusorCompletaDesdeConfig(state.configTorre);
  if (!rec) {
    el.innerHTML =
      '<p class="dwc-dif-empty">Completa <strong>capacidad máxima y litros de mezcla</strong> en Cultivo e instalación o en <strong>PC·1</strong> (primer llenado) para calcular bomba y difusores con tu volumen real.</p>';
    return;
  }
  el.innerHTML = dwcFormatHtmlRecomendacionDifusorCore(rec);
}

/**
 * Litros para el aviso de oxigenación en Cultivo e instalación (DWC): prioriza L×A×P del formulario; si no, config (mezcla / máx.).
 */
function getDwcLitrosOxigenacionParaSistemaUI(cfg) {
  cfg = cfg || state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return null;
  const desdeForm = getDwcCapacidadLitrosFromSistemaInputs();
  if (desdeForm != null && desdeForm > 0) {
    return { vol: desdeForm, fuente: 'medidas' };
  }
  const ref = getDwcLitrosOxigenacionReferencia(cfg);
  if (!ref) return null;
  return {
    vol: ref.vol,
    fuente: ref.usaMezcla ? 'mezcla' : 'max',
    vMax: ref.vMax,
  };
}

/** Hueco por defecto entre aros de cestas en la tapa (mm) si no indicas otro. */
const DWC_TAPA_HUECO_DEFAULT_MM = 4;
/** Tope de filas/columnas en esquema DWC (pestaña Torre / SVG). */
const DWC_REJILLA_MAX_FILAS = 12;
const DWC_REJILLA_MAX_COLS = 12;
/** Límites de los deslizadores del asistente (Cantidades en el diagrama). */
const DWC_SETUP_SLIDER_MAX_FILAS = 10;
const DWC_SETUP_SLIDER_MAX_COLS = 8;

function dwcGridSpanMm(count, rimDiameterMm, gutterMm) {
  const g = Number(gutterMm);
  const gutter = Number.isFinite(g) && g >= 0 ? g : DWC_TAPA_HUECO_DEFAULT_MM;
  const n = parseInt(String(count), 10);
  const d = Number(rimDiameterMm);
  if (!Number.isFinite(n) || n < 1 || !Number.isFinite(d) || d <= 0) return null;
  return n * d + Math.max(0, n - 1) * gutter;
}

/**
 * Rejilla rectangular de cestas (spanC × spanR mm entre bordes exteriores) centrada en tapa circular:
 * la esquina más lejana + radio del aro debe caber en el radio útil.
 */
function dwcCabeRejillaRectangularEnCirculoUtilMm(spanColsMm, spanRowsMm, rimDiameterMm, radioUtilMm) {
  if (
    !Number.isFinite(spanColsMm) ||
    !Number.isFinite(spanRowsMm) ||
    !Number.isFinite(rimDiameterMm) ||
    rimDiameterMm <= 0 ||
    !Number.isFinite(radioUtilMm) ||
    radioUtilMm <= 0
  ) {
    return false;
  }
  const hc = spanColsMm / 2;
  const hr = spanRowsMm / 2;
  const dist = Math.sqrt(hc * hc + hr * hr);
  const rPot = rimDiameterMm / 2;
  return dist + rPot <= radioUtilMm + 0.35;
}

/**
 * Comprueba si filas × cestas/fila y Ø cesta caben en largo × ancho de tapa (cualquier orientación).
 * En **cilíndrico**, la perforación útil es circular (Ø interior del depósito): la rejilla ha de caber en ese círculo.
 * @param {number} [marcoPorLadoMm=0] resta 2× este valor a cada dimensión interior útil (marco no perforado).
 * @param {number} [gutterMm] separación entre cestas; por defecto DWC_TAPA_HUECO_DEFAULT_MM.
 * @param {string} [formaDeposito] `prismatico` | `cilindrico` | … (opcional; sin valor → prismático).
 */
function dwcEvaluarCapestEnTapa(filas, cols, rimMm, largoCm, anchoCm, marcoPorLadoMm, gutterMm, formaDeposito) {
  if (rimMm == null || largoCm == null || anchoCm == null) return { estado: 'incompleto' };
  const marco = Number.isFinite(Number(marcoPorLadoMm)) && Number(marcoPorLadoMm) >= 0 ? Number(marcoPorLadoMm) : 0;
  const hueco =
    Number.isFinite(Number(gutterMm)) && Number(gutterMm) >= 0 ? Number(gutterMm) : DWC_TAPA_HUECO_DEFAULT_MM;
  const spanC = dwcGridSpanMm(cols, rimMm, hueco);
  const spanR = dwcGridSpanMm(filas, rimMm, hueco);
  if (spanC == null || spanR == null) return { estado: 'incompleto' };
  const Lmm = largoCm * 10 - 2 * marco;
  const Wmm = anchoCm * 10 - 2 * marco;
  if (Lmm <= 0 || Wmm <= 0) {
    return {
      estado: 'no',
      msg:
        'El marco de tapa (' +
        marco +
        ' mm por lado) deja un área útil nula o negativa respecto a ' +
        largoCm +
        '×' +
        anchoCm +
        ' cm. Reduce el marco o revisa medidas del depósito.',
    };
  }
  const forma = dwcNormalizeDepositoForma(formaDeposito);
  if (forma === 'cilindrico') {
    const dUtilMm = Math.min(Lmm, Wmm);
    const radioUtil = dUtilMm / 2;
    const cabeCirc = dwcCabeRejillaRectangularEnCirculoUtilMm(spanC, spanR, rimMm, radioUtil);
    if (cabeCirc) {
      return {
        estado: 'ok',
        spanC,
        spanR,
        Lmm,
        Wmm,
        marco,
        hueco,
        tapaCircular: true,
        diamUtilMm: dUtilMm,
      };
    }
    return {
      estado: 'no',
      tapaCircular: true,
      diamUtilMm: dUtilMm,
      msg:
        'En tapa circular (~Ø ' +
        Math.round(dUtilMm) +
        ' mm útil) no caben ' +
        cols +
        '×' +
        filas +
        ' cestas de Ø ' +
        rimMm +
        ' mm con ' +
        hueco +
        ' mm entre ellas (ocupan ~' +
        Math.round(spanC) +
        '×' +
        Math.round(spanR) +
        ' mm en planta). Reduce filas/cestas por fila, aumenta Ø del depósito o usa cestas más pequeñas; en cubos redondos suele ir bien una cesta grande o pocas pequeñas.',
    };
  }
  const fit1 = spanC <= Lmm && spanR <= Wmm;
  const fit2 = spanC <= Wmm && spanR <= Lmm;
  if (fit1 || fit2) return { estado: 'ok', spanC, spanR, Lmm, Wmm, marco, hueco, tapaCircular: false };
  return {
    estado: 'no',
    tapaCircular: false,
    msg:
      'Con ' +
      cols +
      ' cestas/fila × ' +
      filas +
      ' filas, Ø ' +
      rimMm +
      ' mm y ' +
      hueco +
      ' mm entre cestas, hace falta ~' +
      Math.round(spanC) +
      '×' +
      Math.round(spanR) +
      ' mm. Útil en tapa (tras marco ' +
      marco +
      ' mm/lado): ~' +
      Math.round(Lmm) +
      '×' +
      Math.round(Wmm) +
      ' mm. Revisa orientación, rejilla o ajustes.',
  };
}

/** Máximo teórico de cestas en tapa (rejilla) con el Ø aro y separación indicados. */
function dwcMaxCestasTeoricasEnTapa(rimMm, largoCm, anchoCm, marcoPorLadoMm, gutterMm, formaDeposito) {
  const marco = Number.isFinite(Number(marcoPorLadoMm)) && Number(marcoPorLadoMm) >= 0 ? Number(marcoPorLadoMm) : 0;
  const hueco =
    Number.isFinite(Number(gutterMm)) && Number(gutterMm) >= 0 ? Number(gutterMm) : DWC_TAPA_HUECO_DEFAULT_MM;
  const D = Number(rimMm);
  const Lcm = Number(largoCm);
  const Wcm = Number(anchoCm);
  if (!Number.isFinite(D) || D <= 0 || !Number.isFinite(Lcm) || !Number.isFinite(Wcm)) return null;
  const Lmm = Lcm * 10 - 2 * marco;
  const Wmm = Wcm * 10 - 2 * marco;
  if (Lmm <= 0 || Wmm <= 0) return null;
  const maxAlong = len => Math.floor((len + hueco) / (D + hueco));
  const forma = dwcNormalizeDepositoForma(formaDeposito);
  const meta = { rimMm: D, formaDeposito: forma, marco, hueco };
  if (forma === 'cilindrico') {
    const dUtilMm = Math.min(Lmm, Wmm);
    const radioUtil = dUtilMm / 2;
    const lim = Math.max(1, maxAlong(dUtilMm) + 2);
    let best = { max: 0, cols: 0, filas: 0, Lmm: dUtilMm, Wmm: dUtilMm, marco, hueco, ...meta };
    for (let c = 1; c <= lim; c++) {
      for (let r = 1; r <= lim; r++) {
        const sc = dwcGridSpanMm(c, D, hueco);
        const sr = dwcGridSpanMm(r, D, hueco);
        if (sc == null || sr == null) continue;
        if (!dwcCabeRejillaRectangularEnCirculoUtilMm(sc, sr, D, radioUtil)) continue;
        const prod = c * r;
        if (prod > best.max) {
          best = { max: prod, cols: c, filas: r, Lmm: dUtilMm, Wmm: dUtilMm, marco, hueco, ...meta };
        }
      }
    }
    if (best.max < 1) return { max: 0, cols: 0, filas: 0, Lmm: dUtilMm, Wmm: dUtilMm, marco, hueco, ...meta };
    return best;
  }
  const cols = maxAlong(Lmm);
  const filas = maxAlong(Wmm);
  if (cols < 1 || filas < 1) return { max: 0, cols, filas, Lmm, Wmm, marco, hueco, ...meta };
  return { max: cols * filas, cols, filas, Lmm, Wmm, marco, hueco, ...meta };
}

function dwcMaxCestasDesdeConfigTorre(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return null;
  const L = cfg.dwcDepositoLargoCm;
  const W = cfg.dwcDepositoAnchoCm;
  const rim = cfg.dwcNetPotRimMm;
  if (!Number.isFinite(Number(L)) || !Number.isFinite(Number(W)) || !Number.isFinite(Number(rim))) return null;
  const marco =
    cfg.dwcTapaMarcoPorLadoMm != null && Number.isFinite(Number(cfg.dwcTapaMarcoPorLadoMm)) && Number(cfg.dwcTapaMarcoPorLadoMm) >= 0
      ? Number(cfg.dwcTapaMarcoPorLadoMm)
      : 0;
  const hueco =
    cfg.dwcTapaHuecoMm != null && Number.isFinite(Number(cfg.dwcTapaHuecoMm)) && Number(cfg.dwcTapaHuecoMm) >= 0
      ? Number(cfg.dwcTapaHuecoMm)
      : DWC_TAPA_HUECO_DEFAULT_MM;
  return dwcMaxCestasTeoricasEnTapa(rim, L, W, marco, hueco, cfg.dwcDepositoForma);
}

/** Guarda en la config el máximo teórico y metadatos (checklist, guardar sistema, etc.). */
function dwcPersistSnapshotMaxCestasEnCfg(cfg) {
  const o = dwcMaxCestasDesdeConfigTorre(cfg);
  if (!o || o.max < 1) {
    delete cfg.dwcCestasMaxRecomendadas;
    delete cfg.dwcCestasMaxRecomendadasMeta;
    return;
  }
  const modoKey =
    typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  cfg.dwcCestasMaxRecomendadas = o.max;
  cfg.dwcCestasMaxRecomendadasMeta = {
    filas: o.filas,
    cols: o.cols,
    rimMm: cfg.dwcNetPotRimMm,
    huecoMm: o.hueco,
    marcoMm: o.marco,
    objetivoCultivo: dwcGetObjetivoCultivo(cfg),
    modoCultivo: modoKey,
    ts: new Date().toISOString().slice(0, 10),
  };
}

/** Redimensiona la matriz DWC (filas × columnas de macetas) conservando datos donde haya hueco. */
function redimensionarMatrizTorreDwcPreservando(cfg, nFilas, nCols) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return;
  const nf = Math.max(1, Math.min(DWC_REJILLA_MAX_FILAS, parseInt(String(nFilas), 10) || 1));
  const nc = Math.max(1, Math.min(DWC_REJILLA_MAX_COLS, parseInt(String(nCols), 10) || 1));
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
  for (let i = 0; i < nf; i++) {
    const row = [];
    const pi = prev[i];
    for (let j = 0; j < nc; j++) {
      row.push(pi && pi[j] ? copy(pi[j]) : empty());
    }
    nue.push(row);
  }
  state.torre = nue;
  cfg.numNiveles = nf;
  cfg.numCestas = nc;
}

/** Pestaña Sistema DWC: aplica filas×columnas teóricas máximas según L, A, Ø y separación (respetando tope 12×12 del esquema). */
function aplicarDwcRejillaMaximaDesdeFormularioSistema() {
  aplicarDwcRejillaDesdeFormularioSistema('max');
}

function aplicarDwcRejillaRecomendadaDesdeFormularioSistema() {
  aplicarDwcRejillaDesdeFormularioSistema('objetivo');
}

function aplicarDwcRejillaPreferidaDesdeFormularioSistema() {
  const cfg = state.configTorre || {};
  aplicarDwcRejillaDesdeFormularioSistema(dwcGetRejillaModoPreferido(cfg));
}

function dwcCalcRejillaObjetivoDesdeMax(o, objetivoSpec) {
  if (!o || o.max < 1 || !objetivoSpec) return null;
  const Lmm = Number(o.Lmm);
  const Wmm = Number(o.Wmm);
  if (!Number.isFinite(Lmm) || !Number.isFinite(Wmm) || Lmm <= 0 || Wmm <= 0) return null;
  const ccPref = Math.round((objetivoSpec.ccMinMm + objetivoSpec.ccMaxMm) / 2);
  let cols = Math.max(1, Math.floor(Lmm / ccPref));
  let filas = Math.max(1, Math.floor(Wmm / ccPref));
  cols = Math.min(cols, o.cols);
  filas = Math.min(filas, o.filas);
  if (cols < 1 || filas < 1) return null;
  return { filas, cols };
}

/**
 * Rejilla filas × columnas para un total deseado de macetas, priorizando proporción columnas/filas ≈ largo/ancho útil de la tapa.
 * Si no existe factorización exacta ≤ tope, elige la sub-rejilla válida con el mayor producto ≤ tope (luego afinación por proporción).
 */
function dwcCalcRejillaDesdeTotalCestas(o, nDeseado) {
  if (!o || o.max < 1) return null;
  let nRaw = parseInt(String(nDeseado), 10);
  if (!Number.isFinite(nRaw) || nRaw < 1) nRaw = o.max;
  const nCap = Math.min(nRaw, o.max);
  const ratio = o.Lmm / Math.max(o.Wmm, 1e-6);
  const aspectScore = (nf, nc) => {
    const r = nc / Math.max(nf, 1e-6);
    return Math.abs(Math.log(r + 1e-9) - Math.log(ratio + 1e-9));
  };
  const candidates = [];
  const formaO = dwcNormalizeDepositoForma(o.formaDeposito);
  if (formaO === 'cilindrico' && Number.isFinite(Number(o.rimMm)) && Number(o.rimMm) > 0) {
    const D = Number(o.rimMm);
    const marco = Number(o.marco) || 0;
    const hueco = Number.isFinite(Number(o.hueco)) && Number(o.hueco) >= 0 ? Number(o.hueco) : DWC_TAPA_HUECO_DEFAULT_MM;
    const largoCm = (Number(o.Lmm) + 2 * marco) / 10;
    const anchoCm = (Number(o.Wmm) + 2 * marco) / 10;
    const dUtilMm = Math.min(Number(o.Lmm), Number(o.Wmm));
    const maxAlong = len => Math.floor((len + hueco) / (D + hueco));
    const lim = Math.max(1, maxAlong(dUtilMm) + 2);
    for (let nf = 1; nf <= lim; nf++) {
      for (let nc = 1; nc <= lim; nc++) {
        const prod = nf * nc;
        if (prod > nCap) continue;
        const ev = dwcEvaluarCapestEnTapa(nf, nc, D, largoCm, anchoCm, marco, hueco, 'cilindrico');
        if (ev.estado !== 'ok') continue;
        candidates.push({ filas: nf, cols: nc, prod });
      }
    }
  } else {
    const F = o.filas;
    const C = o.cols;
    for (let nf = 1; nf <= F; nf++) {
      for (let nc = 1; nc <= C; nc++) {
        const prod = nf * nc;
        if (prod > o.max || prod > nCap) continue;
        candidates.push({ filas: nf, cols: nc, prod });
      }
    }
  }
  if (!candidates.length) {
    return { filas: 1, cols: 1, producto: 1, exacto: nCap === 1, solicitado: nRaw, cap: nCap, teoricoMax: o.max };
  }
  const exact = candidates.filter(c => c.prod === nCap);
  const pool = exact.length ? exact : candidates.filter(c => c.prod === Math.max(...candidates.map(x => x.prod)));
  pool.sort((a, b) => {
    const da = aspectScore(a.filas, a.cols);
    const db = aspectScore(b.filas, b.cols);
    if (da !== db) return da - db;
    return Math.abs(nCap - a.prod) - Math.abs(nCap - b.prod);
  });
  const pick = pool[0];
  return {
    filas: pick.filas,
    cols: pick.cols,
    producto: pick.prod,
    exacto: pick.prod === nCap,
    solicitado: nRaw,
    cap: nCap,
    teoricoMax: o.max,
  };
}

function aplicarDwcRejillaVoluntariaDesdeFormularioSistema() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'dwc') return;
  initTorres();
  const cfg = state.configTorre;
  try {
    dwcMergeCamposFormularioEnCfg(cfg, DWC_FORM_IDS_SISTEMA);
  } catch (e0) {}
  if (dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes') {
    showToast('Con varios cubos no aplica la rejilla de una sola tapa: indica cuántos cubos y guarda.', true);
    return;
  }
  const o = dwcMaxCestasDesdeConfigTorre(cfg);
  if (!o || o.max < 1) {
    const formaR = dwcNormalizeDepositoForma(cfg.dwcDepositoForma);
    showToast(
      formaR === 'cilindrico'
        ? 'Indica diámetro interior del depósito (cm) y diámetro de cesta (mm) válidos para calcular la rejilla.'
        : 'Indica largo, ancho y diámetro de cesta válidos para calcular la rejilla.',
      true
    );
    return;
  }
  const raw = parseInt(String(document.getElementById('sysDwcMacetasTotalesDeseadas')?.value || '').trim(), 10);
  if (!Number.isFinite(raw) || raw < 1) {
    showToast('Indica un número total de macetas (1 o más).', true);
    return;
  }
  const r = dwcCalcRejillaDesdeTotalCestas(o, raw);
  const nf = Math.max(1, Math.min(DWC_REJILLA_MAX_FILAS, r.filas));
  const nc = Math.max(1, Math.min(DWC_REJILLA_MAX_COLS, r.cols));
  redimensionarMatrizTorreDwcPreservando(cfg, nf, nc);
  cfg.dwcRejillaVoluntariaUltimaTotal = raw;
  try {
    dwcSincronizarTamanoCestaDesdeRim(cfg);
  } catch (e1) {}
  try {
    dwcPersistSnapshotMaxCestasEnCfg(cfg);
  } catch (e2) {}
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  renderTorre();
  updateTorreStats();
  try {
    refreshDwcSistemaMedidasUI();
  } catch (e3) {}
  const hintV = document.getElementById('sysDwcRejillaVoluntariaHint');
  if (hintV) {
    hintV.classList.remove('setup-hidden');
    hintV.classList.remove('torre-dwc-vol-hint--bad', 'torre-dwc-vol-hint--ok');
    if (raw > o.max) {
      hintV.textContent = '✗ No caben (máx. ' + o.max + ').';
      hintV.classList.add('torre-dwc-vol-hint--bad');
    } else {
      hintV.textContent = '✓ Caben.';
      hintV.classList.add('torre-dwc-vol-hint--ok');
    }
  }
  showToast('Rejilla personalizada: ' + nf + '×' + nc + ' (' + nf * nc + ' macetas).');
}

function aplicarDwcRejillaDesdeFormularioSistema(modoAplicacion) {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'dwc') return;
  initTorres();
  const cfg = state.configTorre;
  try {
    dwcMergeCamposFormularioEnCfg(cfg, DWC_FORM_IDS_SISTEMA);
  } catch (e) {}
  if (dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes') {
    showToast('Con varios cubos no aplica la rejilla de una sola tapa: indica cuántos cubos y guarda.', true);
    return;
  }
  const o = dwcMaxCestasDesdeConfigTorre(cfg);
  const btnMax = document.getElementById('btnDwcAplicarRejillaPrincipal');
  const btnObj = document.getElementById('btnDwcAplicarRejillaSecundaria');
  if (!o || o.max < 1) {
    const formaR = dwcNormalizeDepositoForma(cfg.dwcDepositoForma);
    showToast(
      formaR === 'cilindrico'
        ? 'Indica diámetro interior del depósito (cm) y diámetro de cesta (mm) válidos para calcular la rejilla.'
        : 'Indica largo, ancho y diámetro de cesta válidos para calcular la rejilla.',
      true
    );
    if (btnObj) btnObj.disabled = true;
    if (btnMax) btnMax.disabled = true;
    return;
  }
  const spec = dwcGetObjetivoSpec(dwcGetObjetivoCultivo(cfg));
  const rejObj = dwcCalcRejillaObjetivoDesdeMax(o, spec);
  const usaObj = modoAplicacion === 'objetivo' && rejObj;
  const rawF = usaObj ? rejObj.filas : o.filas;
  const rawC = usaObj ? rejObj.cols : o.cols;
  const nf = Math.max(1, Math.min(DWC_REJILLA_MAX_FILAS, rawF));
  const nc = Math.max(1, Math.min(DWC_REJILLA_MAX_COLS, rawC));
  redimensionarMatrizTorreDwcPreservando(cfg, nf, nc);
  try {
    dwcSincronizarTamanoCestaDesdeRim(cfg);
  } catch (e2) {}
  try {
    dwcPersistSnapshotMaxCestasEnCfg(cfg);
  } catch (e3) {}
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  renderTorre();
  updateTorreStats();
  try {
    refreshDwcSistemaMedidasUI();
  } catch (e4) {}
  let msg =
    (usaObj ? 'Rejilla recomendada aplicada: ' : 'Rejilla máxima aplicada: ') +
    nf +
    '×' +
    nc +
    ' macetas (' +
    nf * nc +
    ' huecos).';
  if (usaObj) {
    msg += ' Objetivo: ' + spec.label + ' (' + spec.ccTxt + ' c-c).';
  }
  if (rawF > DWC_REJILLA_MAX_FILAS || rawC > DWC_REJILLA_MAX_COLS) {
    msg +=
      ' Teórico hasta ' +
      rawF +
      '×' +
      rawC +
      '; el esquema admite como máximo ' +
      DWC_REJILLA_MAX_FILAS +
      '×' +
      DWC_REJILLA_MAX_COLS +
      '.';
  }
  showToast(msg);
}

/** Asistente: ajusta deslizadores al máximo que cabe (tope 10×8 en esta pantalla). */
function aplicarDwcRejillaMaximaDesdeSetup() {
  aplicarDwcRejillaDesdeSetup('max');
}

function aplicarDwcRejillaRecomendadaDesdeSetup() {
  aplicarDwcRejillaDesdeSetup('objetivo');
}

function aplicarDwcRejillaPreferidaDesdeSetup() {
  const modo = dwcNormalizeRejillaModo(document.getElementById('setupDwcRejillaPreferida')?.value);
  aplicarDwcRejillaDesdeSetup(modo);
}

function aplicarDwcRejillaDesdeSetup(modoAplicacion) {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') return;
  const ox = dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value);
  if (ox === 'cubos_independientes') {
    showToast('Con varios cubos no aplica la rejilla de una sola tapa: indica cuántos cubos abajo.', true);
    return;
  }
  const rim = _dwcParseOptMm('setupDwcPotRimMm', 25, 120);
  const { L, W } = dwcLargoAnchoCmEffectivosDesdeFormIds(DWC_FORM_IDS_SETUP);
  const mh = _dwcParseMarcoHuecoMmIds('setupDwcTapaMarcoMm', 'setupDwcTapaHuecoMm');
  const marcoE = mh.marco != null ? mh.marco : 0;
  const huecoE = mh.hueco != null ? mh.hueco : DWC_TAPA_HUECO_DEFAULT_MM;
  if (rim == null || L == null || W == null) {
    const forma = dwcNormalizeDepositoForma(document.getElementById('setupDwcDepositoForma')?.value);
    showToast(
      forma === 'cilindrico'
        ? 'Completa diámetro interior del depósito (cm) y diámetro de cesta (mm).'
        : 'Completa largo, ancho y diámetro de cesta.',
      true
    );
    return;
  }
  const formaTap = dwcNormalizeDepositoForma(document.getElementById('setupDwcDepositoForma')?.value);
  const o = dwcMaxCestasTeoricasEnTapa(rim, L, W, marcoE, huecoE, formaTap);
  if (!o || o.max < 1) {
    showToast('No se puede calcular la rejilla con esos datos.', true);
    return;
  }
  const spec = dwcGetObjetivoSpec(dwcObjetivoDesdeInputId('setupDwcObjetivoCultivo'));
  const rejObj = dwcCalcRejillaObjetivoDesdeMax(o, spec);
  const usaObj = modoAplicacion === 'objetivo' && rejObj;
  const rawF = usaObj ? rejObj.filas : o.filas;
  const rawC = usaObj ? rejObj.cols : o.cols;
  const nf = Math.max(1, Math.min(DWC_SETUP_SLIDER_MAX_FILAS, rawF));
  const nc = Math.max(1, Math.min(DWC_SETUP_SLIDER_MAX_COLS, rawC));
  const sn = document.getElementById('sliderNiveles');
  const sc = document.getElementById('sliderCestas');
  if (sn) sn.value = String(nf);
  if (sc) sc.value = String(nc);
  try {
    updateTorreBuilder();
  } catch (e) {}
  try {
    refreshDwcTapHintSetup();
  } catch (e2) {}
  try {
    actualizarResumenSetup();
  } catch (e3) {}
  let msg =
    (usaObj ? 'Rejilla recomendada: ' : 'Rejilla máxima: ') +
    nf +
    ' filas × ' +
    nc +
    ' columnas.';
  if (usaObj) {
    msg += ' Objetivo ' + spec.label + ' (' + spec.ccTxt + ' c-c).';
  }
  if (rawF > DWC_SETUP_SLIDER_MAX_FILAS || rawC > DWC_SETUP_SLIDER_MAX_COLS) {
    msg +=
      ' Teórico en tapa hasta ' +
      rawF +
      '×' +
      rawC +
      '; aquí el tope es ' +
      DWC_SETUP_SLIDER_MAX_FILAS +
      '×' +
      DWC_SETUP_SLIDER_MAX_COLS +
      ' (en Cultivo e instalación puedes llegar a ' +
      DWC_REJILLA_MAX_FILAS +
      '×' +
      DWC_REJILLA_MAX_COLS +
      ').';
  }
  showToast(msg);
}

/** Solo «✓ Caben» / «✗ No caben» según total manual vs máximo en tapa. */
function refreshDwcVoluntariaCabenHint() {
  const hintV = document.getElementById('sysDwcRejillaVoluntariaHint');
  const inp = document.getElementById('sysDwcMacetasTotalesDeseadas');
  const wrapVol = document.getElementById('sysDwcRejillaVoluntariaWrap');
  if (!hintV || !inp || !wrapVol || wrapVol.classList.contains('setup-hidden')) return;
  const cfg = state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return;
  const cfgCalc = Object.assign({}, cfg);
  try {
    dwcMergeCamposFormularioEnCfg(cfgCalc, DWC_FORM_IDS_SISTEMA);
  } catch (e) {}
  if (dwcGetOxigenacionDiseno(cfgCalc) === 'cubos_independientes') return;
  const o = dwcMaxCestasDesdeConfigTorre(cfgCalc);
  if (!o || o.max < 1) {
    hintV.classList.add('setup-hidden');
    hintV.textContent = '';
    hintV.classList.remove('torre-dwc-vol-hint--bad', 'torre-dwc-vol-hint--ok');
    return;
  }
  const raw = parseInt(String(inp.value || '').trim(), 10);
  if (!Number.isFinite(raw) || raw < 1) {
    hintV.classList.add('setup-hidden');
    hintV.textContent = '';
    hintV.classList.remove('torre-dwc-vol-hint--bad', 'torre-dwc-vol-hint--ok');
    return;
  }
  hintV.classList.remove('setup-hidden', 'torre-dwc-vol-hint--bad', 'torre-dwc-vol-hint--ok');
  if (raw > o.max) {
    hintV.textContent = '✗ No caben (máx. ' + o.max + ').';
    hintV.classList.add('torre-dwc-vol-hint--bad');
  } else {
    const formaV = dwcNormalizeDepositoForma(cfgCalc.dwcDepositoForma);
    let okVol = true;
    if (formaV === 'cilindrico') {
      const r = dwcCalcRejillaDesdeTotalCestas(o, raw);
      if (r) {
        const rim = Number(cfgCalc.dwcNetPotRimMm);
        const L = cfgCalc.dwcDepositoLargoCm;
        const W = cfgCalc.dwcDepositoAnchoCm;
        let marcoV = 0;
        let huecoV = DWC_TAPA_HUECO_DEFAULT_MM;
        if (
          cfgCalc.dwcTapaMarcoPorLadoMm != null &&
          Number.isFinite(Number(cfgCalc.dwcTapaMarcoPorLadoMm)) &&
          Number(cfgCalc.dwcTapaMarcoPorLadoMm) >= 0
        ) {
          marcoV = Number(cfgCalc.dwcTapaMarcoPorLadoMm);
        }
        if (cfgCalc.dwcTapaHuecoMm != null && Number.isFinite(Number(cfgCalc.dwcTapaHuecoMm)) && Number(cfgCalc.dwcTapaHuecoMm) >= 0) {
          huecoV = Number(cfgCalc.dwcTapaHuecoMm);
        }
        const evR =
          Number.isFinite(rim) && rim > 0 && L != null && W != null
            ? dwcEvaluarCapestEnTapa(r.filas, r.cols, rim, L, W, marcoV, huecoV, 'cilindrico')
            : { estado: 'incompleto' };
        if (evR.estado !== 'ok') okVol = false;
      }
    }
    if (!okVol) {
      hintV.textContent = '✗ Esa cantidad no admite rejilla válida en tapa redonda (reduce total o cambia Ø cesta/hueco).';
      hintV.classList.add('torre-dwc-vol-hint--bad');
    } else {
      hintV.textContent = '✓ Caben.';
      hintV.classList.add('torre-dwc-vol-hint--ok');
    }
  }
}

function applySistemaDwcLlenadoCollapseUI() {
  const body = document.getElementById('sistemaDwcLlenadoBody');
  const btn = document.getElementById('btnToggleSistemaDwcLlenado');
  if (!body || !btn) return;
  const cfg = state.configTorre;
  const col = cfg && cfg.tipoInstalacion === 'dwc' && cfg.uiSistemaDwcLlenadoColapsado === true;
  body.hidden = col;
  btn.setAttribute('aria-expanded', col ? 'false' : 'true');
}

function toggleSistemaDwcLlenadoPanel() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'dwc') return;
  const cur = state.configTorre.uiSistemaDwcLlenadoColapsado === true;
  state.configTorre.uiSistemaDwcLlenadoColapsado = !cur;
  try {
    guardarEstadoTorreActual();
    saveState();
  } catch (e) {}
  applySistemaDwcLlenadoCollapseUI();
}

function refreshDwcMaxCestasHintSistema() {
  const btnPri = document.getElementById('btnDwcAplicarRejillaPrincipal');
  const btnSec = document.getElementById('btnDwcAplicarRejillaSecundaria');
  const cfg = state.configTorre;
  const wrapVol = document.getElementById('sysDwcRejillaVoluntariaWrap');
  const btnVol = document.getElementById('btnDwcAplicarRejillaVoluntaria');
  const hintVol = document.getElementById('sysDwcRejillaVoluntariaHint');
  const hideVoluntaria = () => {
    if (wrapVol) wrapVol.classList.add('setup-hidden');
    if (btnVol) btnVol.disabled = true;
    if (hintVol) {
      hintVol.classList.add('setup-hidden');
      hintVol.textContent = '';
      hintVol.classList.remove('torre-dwc-vol-hint--bad', 'torre-dwc-vol-hint--ok');
    }
  };
  if (!cfg || cfg.tipoInstalacion !== 'dwc') {
    if (btnPri) {
      btnPri.classList.add('setup-hidden');
      btnPri.disabled = true;
    }
    if (btnSec) {
      btnSec.classList.add('setup-hidden');
      btnSec.disabled = true;
    }
    hideVoluntaria();
    return;
  }
  const cfgCalc = Object.assign({}, cfg);
  try {
    dwcMergeCamposFormularioEnCfg(cfgCalc, DWC_FORM_IDS_SISTEMA);
  } catch (eM) {}
  if (dwcGetOxigenacionDiseno(cfgCalc) === 'cubos_independientes') {
    if (btnPri) {
      btnPri.classList.add('setup-hidden');
      btnPri.disabled = true;
    }
    if (btnSec) {
      btnSec.classList.add('setup-hidden');
      btnSec.disabled = true;
    }
    hideVoluntaria();
    return;
  }
  const o = dwcMaxCestasDesdeConfigTorre(cfgCalc);
  if (!o || o.max < 1) {
    if (btnPri) {
      btnPri.classList.add('setup-hidden');
      btnPri.disabled = true;
    }
    if (btnSec) {
      btnSec.classList.add('setup-hidden');
      btnSec.disabled = true;
    }
    hideVoluntaria();
    return;
  }
  const modoPri = dwcNormalizeRejillaModo(document.getElementById('sysDwcRejillaPreferida')?.value || cfgCalc.dwcRejillaModoPreferido);
  if (btnPri) {
    btnPri.classList.remove('setup-hidden');
    btnPri.disabled = false;
    if (dwcNormalizeRejillaModo(modoPri) === 'max') {
      btnPri.onclick = aplicarDwcRejillaMaximaDesdeFormularioSistema;
      btnPri.textContent = 'Aplicar rejilla máxima (principal)';
    } else {
      btnPri.onclick = aplicarDwcRejillaRecomendadaDesdeFormularioSistema;
      btnPri.textContent = 'Aplicar rejilla recomendada (principal)';
    }
  }
  if (btnSec) {
    btnSec.classList.remove('setup-hidden');
    btnSec.disabled = false;
    if (dwcNormalizeRejillaModo(modoPri) === 'max') {
      btnSec.onclick = aplicarDwcRejillaRecomendadaDesdeFormularioSistema;
      btnSec.textContent = 'Aplicar rejilla recomendada (alternativa)';
    } else {
      btnSec.onclick = aplicarDwcRejillaMaximaDesdeFormularioSistema;
      btnSec.textContent = 'Aplicar rejilla máxima (alternativa)';
    }
  }
  const inpVol = document.getElementById('sysDwcMacetasTotalesDeseadas');
  if (wrapVol && inpVol && btnVol) {
    wrapVol.classList.remove('setup-hidden');
    btnVol.disabled = false;
    if (!String(inpVol.value || '').trim()) {
      const def =
        cfg.dwcRejillaVoluntariaUltimaTotal != null && Number(cfg.dwcRejillaVoluntariaUltimaTotal) > 0
          ? Math.round(Number(cfg.dwcRejillaVoluntariaUltimaTotal))
          : Math.max(1, (cfg.numNiveles || 1) * (cfg.numCestas || 1));
      inpVol.value = String(Math.min(o.max, Math.max(1, def)));
    }
    inpVol.max = String(o.max);
  }
  try {
    refreshDwcVoluntariaCabenHint();
  } catch (eV) {}
}

function refreshDwcTapHintSetup() {
  const el = document.getElementById('setupDwcTapaCestasHint');
  const hintPri = document.getElementById('setupDwcRejillaHintPrincipal');
  if (!el) return;
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') {
    el.classList.add('setup-hidden');
    el.textContent = '';
    const bx = document.getElementById('btnDwcAplicarRejillaPrincipalSetup');
    const by = document.getElementById('btnDwcAplicarRejillaSecundariaSetup');
    if (bx) { bx.classList.add('setup-hidden'); bx.disabled = true; }
    if (by) { by.classList.add('setup-hidden'); by.disabled = true; }
    if (hintPri) {
      hintPri.classList.add('setup-hidden');
      hintPri.textContent = '';
    }
    try {
      renderDwcCultivoRecoStatus('setup');
    } catch (eR0) {}
    return;
  }
  const oxSetup = dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value);
  if (oxSetup === 'cubos_independientes') {
    const nRaw = parseInt(String(document.getElementById('setupDwcNumCubos')?.value || '').trim(), 10);
    const nn = Number.isFinite(nRaw) && nRaw >= 1 ? Math.min(24, nRaw) : 4;
    el.classList.remove('setup-hidden');
    el.style.borderRadius = '10px';
    el.style.padding = '8px 10px';
    el.style.fontSize = '10px';
    el.style.lineHeight = '1.45';
    el.style.fontWeight = '600';
    el.style.background = '#f0f9ff';
    el.style.border = '1.5px solid #bae6fd';
    el.style.color = '#0c4a6e';
    el.textContent = nn + ' cubo' + (nn === 1 ? '' : 's') + ' · 1 maceta/cubo · mezcla total = suma en depósito.';
    const b0 = document.getElementById('btnDwcAplicarRejillaPrincipalSetup');
    const b1 = document.getElementById('btnDwcAplicarRejillaSecundariaSetup');
    if (b0) {
      b0.classList.add('setup-hidden');
      b0.disabled = true;
    }
    if (b1) {
      b1.classList.add('setup-hidden');
      b1.disabled = true;
    }
    if (hintPri) {
      hintPri.classList.add('setup-hidden');
      hintPri.textContent = '';
    }
    try {
      renderDwcCultivoRecoStatus('setup');
    } catch (eRm) {}
    return;
  }
  const filas = parseInt(document.getElementById('sliderNiveles')?.value || '0', 10);
  const cols = parseInt(document.getElementById('sliderCestas')?.value || '0', 10);
  const rim = _dwcParseOptMm('setupDwcPotRimMm', 25, 120);
  const { L, W } = dwcLargoAnchoCmEffectivosDesdeFormIds(DWC_FORM_IDS_SETUP);
  const mh = _dwcParseMarcoHuecoMmIds('setupDwcTapaMarcoMm', 'setupDwcTapaHuecoMm');
  const marcoE = mh.marco != null ? mh.marco : 0;
  const huecoE = mh.hueco != null ? mh.hueco : DWC_TAPA_HUECO_DEFAULT_MM;
  const spec = dwcGetObjetivoSpec(dwcObjetivoDesdeInputId('setupDwcObjetivoCultivo'));
  const formaTap = dwcNormalizeDepositoForma(document.getElementById('setupDwcDepositoForma')?.value);
  const ev = dwcEvaluarCapestEnTapa(filas, cols, rim, L, W, marcoE, huecoE, formaTap);
  if (ev.estado === 'incompleto') {
    el.classList.add('setup-hidden');
    el.textContent = '';
    const b0 = document.getElementById('btnDwcAplicarRejillaPrincipalSetup');
    const b1 = document.getElementById('btnDwcAplicarRejillaSecundariaSetup');
    if (b0) { b0.classList.add('setup-hidden'); b0.disabled = true; }
    if (b1) { b1.classList.add('setup-hidden'); b1.disabled = true; }
    if (hintPri) {
      hintPri.classList.add('setup-hidden');
      hintPri.textContent = '';
    }
    try {
      renderDwcCultivoRecoStatus('setup');
    } catch (eR1) {}
    return;
  }
  el.classList.remove('setup-hidden');
  el.style.borderRadius = '10px';
  el.style.padding = '8px 10px';
  el.style.fontSize = '10px';
  el.style.lineHeight = '1.45';
  el.style.fontWeight = '600';
  if (ev.estado === 'ok') {
    el.style.background = '#ecfdf5';
    el.style.border = '1.5px solid #86efac';
    el.style.color = '#14532d';
    el.textContent = ev.tapaCircular
      ? '✓ Rejilla ' +
        cols +
        '×' +
        filas +
        ' cabe en tapa circular (~Ø ' +
        Math.round(ev.diamUtilMm != null ? ev.diamUtilMm : Math.min(ev.Lmm, ev.Wmm)) +
        ' mm útil; marco ' +
        ev.marco +
        ' mm/lado, ' +
        ev.hueco +
        ' mm entre cestas). Objetivo: ' +
        spec.label +
        ' (' +
        spec.ccTxt +
        ' c-c).'
      : '✓ La rejilla cabe en el área útil de la tapa (~' +
        Math.round(ev.Lmm) +
        '×' +
        Math.round(ev.Wmm) +
        ' mm; marco ' +
        ev.marco +
        ' mm/lado, ' +
        ev.hueco +
        ' mm entre cestas). Esta medida es de tapa (cestas), no de litros útiles. Objetivo: ' +
        spec.label +
        ' (' +
        spec.ccTxt +
        ' c-c).';
  } else {
    el.style.background = '#fffbeb';
    el.style.border = '1.5px solid #fde68a';
    el.style.color = '#92400e';
    el.textContent = '⚠️ ' + ev.msg;
  }

  const btnPriS = document.getElementById('btnDwcAplicarRejillaPrincipalSetup');
  const btnSecS = document.getElementById('btnDwcAplicarRejillaSecundariaSetup');
  if (rim != null && L != null && W != null) {
    const om = dwcMaxCestasTeoricasEnTapa(rim, L, W, marcoE, huecoE, formaTap);
    const modoPri = dwcNormalizeRejillaModo(document.getElementById('setupDwcRejillaPreferida')?.value);
    const rangoObj = dwcRangoCestasOrientativoPorObjetivo(om, spec);
    const ok = om && om.max >= 1;
    if (btnPriS) {
      if (ok) {
        btnPriS.classList.remove('setup-hidden');
        btnPriS.disabled = false;
        if (modoPri === 'max') {
          btnPriS.onclick = aplicarDwcRejillaMaximaDesdeSetup;
          btnPriS.textContent = 'Aplicar rejilla máxima (principal)';
        } else {
          btnPriS.onclick = aplicarDwcRejillaRecomendadaDesdeSetup;
          btnPriS.textContent = 'Aplicar rejilla recomendada (principal)';
        }
      } else {
        btnPriS.classList.add('setup-hidden');
        btnPriS.disabled = true;
      }
    }
    if (btnSecS) {
      if (ok) {
        btnSecS.classList.remove('setup-hidden');
        btnSecS.disabled = false;
        if (modoPri === 'max') {
          btnSecS.onclick = aplicarDwcRejillaRecomendadaDesdeSetup;
          btnSecS.textContent = 'Aplicar rejilla recomendada (alternativa)';
        } else {
          btnSecS.onclick = aplicarDwcRejillaMaximaDesdeSetup;
          btnSecS.textContent = 'Aplicar rejilla máxima (alternativa)';
        }
      } else {
        btnSecS.classList.add('setup-hidden');
        btnSecS.disabled = true;
      }
    }
    if (hintPri) {
      if (ok) {
        hintPri.classList.remove('setup-hidden');
        hintPri.textContent = dwcTextoHintBotonPrincipal(modoPri, spec, om, rangoObj);
      } else {
        hintPri.classList.add('setup-hidden');
        hintPri.textContent = '';
      }
    }
  } else {
    if (btnPriS) {
      btnPriS.classList.add('setup-hidden');
      btnPriS.disabled = true;
    }
    if (btnSecS) {
      btnSecS.classList.add('setup-hidden');
      btnSecS.disabled = true;
    }
    if (hintPri) {
      hintPri.classList.add('setup-hidden');
      hintPri.textContent = '';
    }
  }
  try {
    renderDwcCultivoRecoStatus('setup');
  } catch (eR2) {}
  try {
    syncSetupVolMezclaSugeridoDwc();
  } catch (_) {}
}

/** Grupos de cultivo para los que aplica el modelo de distancia (hojas, sin frutos en DWC estándar). */
function dwcGrupoEnTablaDistancia(grupo) {
  const g = String(grupo || '')
    .trim()
    .toLowerCase();
  return g === 'lechugas' || g === 'asiaticas' || g === 'hojas' || g === 'hierbas';
}

/** Perfil «coco fino» frente a esponja / lana / espuma (tabla interna; no se muestra al usuario). */
function dwcSustratoFamiliaCoco(sustratoKey) {
  return normalizaSustratoKey(String(sustratoKey || 'esponja')) === 'coco';
}

function dwcFmtCmComma(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  const s = (Math.round(x * 10) / 10).toFixed(1);
  return s.replace('.', ',');
}

function dwcFmtRangoCm(lo, hi) {
  const a = dwcFmtCmComma(lo);
  const b = dwcFmtCmComma(hi);
  return a === b ? a : a + ' – ' + b;
}

function dwcParseFechaTrasplante(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const parts = s.split('/');
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (Number.isFinite(d) && Number.isFinite(mo) && Number.isFinite(y)) {
      const dt = new Date(y, mo, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const t = new Date(s);
  if (!isNaN(t.getTime())) return t;
  return null;
}

/** Fase derivada de días desde trasplante y ciclo estimado de la variedad. */
function dwcFaseKeyDesdeDias(dias, diasCiclo) {
  const d = Math.max(0, Number(dias) || 0);
  const T = Math.max(21, Number(diasCiclo) || 50);
  if (d <= 4) return 'recien';
  if (d <= 12) return 'pequena';
  const p = d / T;
  if (p <= 0.42) return 'vegTemprana';
  if (p <= 0.68) return 'vegMedia';
  return 'finalHoja';
}

/**
 * Rango [min, max] en cm — superficie del nutriente a base del sustrato (sin tabla visible).
 * fibra: esponja, lana, espuma, mezclas no coco; coco: fibra de coco según CONFIG.
 */
function dwcRangoCmPorFaseYFamilia(faseKey, esCoco) {
  const fibra = {
    recien: [0, 0.5],
    pequena: [0.5, 1],
    vegTemprana: [1, 1.5],
    vegMedia: [1.5, 2],
    finalHoja: [2, 3],
  };
  const tabCoco = {
    recien: [0, 0],
    pequena: [0.5, 0.5],
    vegTemprana: [1, 1.2],
    vegMedia: [1.2, 1.8],
    finalHoja: [1.5, 2.5],
  };
  const tab = esCoco ? tabCoco : fibra;
  return tab[faseKey] || fibra.pequena;
}

function dwcNombreFase(faseKey) {
  const m = {
    recien: 'plántula recién trasplantada',
    pequena: 'plántula pequeña',
    vegTemprana: 'vegetativo temprano',
    vegMedia: 'vegetativo medio',
    finalHoja: 'final de hoja / pre-cosecha',
  };
  return m[faseKey] || faseKey;
}

/**
 * Análisis compartido: distancia de llenado (nutriente → base del sustrato, cm).
 */
function dwcAnalisisLlenadoDistancia(cfg) {
  cfg = cfg || state.configTorre || {};
  const sKey =
    typeof normalizaSustratoKey === 'function'
      ? normalizaSustratoKey(cfg.sustrato || (typeof state !== 'undefined' && state.configSustrato) || 'esponja')
      : 'esponja';
  let suNombre = 'Sustrato';
  try {
    if (typeof CONFIG_SUSTRATO !== 'undefined' && CONFIG_SUSTRATO[sKey]) suNombre = CONFIG_SUSTRATO[sKey].nombre || sKey;
  } catch (e) {
    suNombre = sKey;
  }
  const esCoco = dwcSustratoFamiliaCoco(sKey);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const rangos = [];
  const sinFecha = [];
  const fueraPerfil = [];

  const tor = (typeof state !== 'undefined' && state.torre) || [];
  for (let i = 0; i < tor.length; i++) {
    const row = tor[i] || [];
    for (let j = 0; j < row.length; j++) {
      const c = row[j];
      if (!c || !c.variedad) continue;
      const db = typeof getCultivoDB === 'function' ? getCultivoDB(c.variedad) : null;
      const grupo = db && db.grupo ? String(db.grupo) : '';
      if (!dwcGrupoEnTablaDistancia(grupo)) {
        if (fueraPerfil.indexOf(c.variedad) < 0) fueraPerfil.push(c.variedad);
        continue;
      }
      if (!c.fecha) {
        sinFecha.push({ fila: i + 1, col: j + 1 });
        continue;
      }
      const dt = dwcParseFechaTrasplante(c.fecha);
      if (!dt) {
        sinFecha.push({ fila: i + 1, col: j + 1 });
        continue;
      }
      dt.setHours(0, 0, 0, 0);
      const dias = Math.round((hoy - dt) / 86400000);
      const diasCiclo =
        typeof DIAS_COSECHA !== 'undefined' && DIAS_COSECHA[c.variedad] != null
          ? Number(DIAS_COSECHA[c.variedad])
          : 50;
      const fase = dwcFaseKeyDesdeDias(dias, diasCiclo);
      const r = dwcRangoCmPorFaseYFamilia(fase, esCoco);
      rangos.push({ r, fase, dias, variedad: c.variedad });
    }
  }

  if (rangos.length === 0 && fueraPerfil.length > 0 && sinFecha.length === 0) {
    return {
      variant: 'solo_fuera',
      suNombre,
      esCoco,
      rangos,
      sinFecha,
      fueraPerfil,
    };
  }

  if (rangos.length === 0) {
    const faseDefault = 'recien';
    const r0 = dwcRangoCmPorFaseYFamilia(faseDefault, esCoco);
    return {
      variant: 'fallback',
      lo: r0[0],
      hi: r0[1],
      faseDefault,
      suNombre,
      esCoco,
      rangos,
      sinFecha,
      fueraPerfil,
    };
  }

  const lo = Math.min.apply(
    null,
    rangos.map(x => x.r[0])
  );
  const hi = Math.max.apply(
    null,
    rangos.map(x => x.r[1])
  );
  return {
    variant: 'union',
    lo,
    hi,
    suNombre,
    esCoco,
    rangos,
    sinFecha,
    fueraPerfil,
  };
}

/** Fragmento para el subtítulo del panel «Depósito DWC» (incluye rango de llenado en cm). */
function dwcTextoResumenLlenadoCm(cfg) {
  const a = dwcAnalisisLlenadoDistancia(cfg);
  if (a.variant === 'solo_fuera') return '';
  if (a.lo == null || a.hi == null) return '';
  return ' · Llenado ' + dwcFmtRangoCm(a.lo, a.hi) + ' cm';
}

/**
 * HTML: recomendación en vivo de distancia de llenado (nutriente → base sustrato en cesta).
 * Usa sustrato de la instalación, fichas (variedad + fecha) y DIAS_COSECHA.
 */
function dwcHtmlDistanciaLlenadoTiempoReal(cfg) {
  const a = dwcAnalisisLlenadoDistancia(cfg);

  if (a.variant === 'solo_fuera') {
    const suNombre = a.suNombre;
    return (
      '<div class="torre-dwc-llenado-live" role="region" aria-label="Llenado DWC">' +
      '<p class="torre-dwc-llenado-kicker">Llenado · distancia nutriente → sustrato (cm)</p>' +
      '<p class="torre-nft-p-soft">La recomendación automática aplica a <strong>cultivos de hoja</strong> (lechuga, asiáticas, hojas, hierbas) con fecha en la ficha. Tus plantas en rejilla son de <strong>otros grupos</strong> (p. ej. frutos): aquí no se calcula ese llenado.</p>' +
      '<p class="torre-nft-p-soft">Sustrato de referencia en Cultivo e instalación: <strong>' +
      (typeof meteoEscHtml === 'function' ? meteoEscHtml(suNombre) : suNombre) +
      '</strong>.</p>' +
      '</div>'
    );
  }

  let detalleFases = '';
  if (a.variant === 'fallback') {
    detalleFases =
      '<p class="torre-nft-p-soft torre-dwc-llenado-meta">Sin <strong>fecha de trasplante</strong> en las fichas de cultivo de hoja, se usa fase «' +
      dwcNombreFase(a.faseDefault || 'recien') +
      '». Añade la fecha en cada cesta para afinar al día.</p>';
    if (a.sinFecha.length) {
      detalleFases +=
        '<p class="torre-nft-p-soft torre-dwc-llenado-warn">Hay cestas con cultivo elegido pero <strong>sin fecha</strong>: complétala en la ficha para incluirlas en el cálculo.</p>';
    }
  } else {
    const fasesU = {};
    for (let k = 0; k < a.rangos.length; k++) {
      fasesU[a.rangos[k].fase] = true;
    }
    const fLista = Object.keys(fasesU)
      .map(dwcNombreFase)
      .join(', ');
    detalleFases =
      '<p class="torre-nft-p-soft torre-dwc-llenado-meta">Según <strong>edad</strong> desde el trasplante en tus fichas (cultivos de hoja). Fases consideradas: ' +
      fLista +
      '.</p>';
    if (a.sinFecha.length) {
      detalleFases +=
        '<p class="torre-nft-p-soft torre-dwc-llenado-warn">Quedan cestas con cultivo pero sin fecha: no entran en el rango unido.</p>';
    }
  }

  let extraFuera = '';
  if (a.fueraPerfil.length) {
    extraFuera =
      '<p class="torre-nft-p-soft torre-dwc-llenado-warn">Cultivos fuera de este perfil (p. ej. frutos): ' +
      a.fueraPerfil
        .slice(0, 6)
        .map(v => (typeof meteoEscHtml === 'function' ? meteoEscHtml(v) : String(v)))
        .join(', ') +
      (a.fueraPerfil.length > 6 ? '…' : '') +
      '. Para ellos no se aplica esta recomendación de hoja.</p>';
  }

  const valStr = dwcFmtRangoCm(a.lo, a.hi);
  return (
    '<div class="torre-dwc-llenado-live" role="region" aria-label="Llenado DWC recomendado">' +
    '<p class="torre-dwc-llenado-kicker">Llenado · distancia nutriente → sustrato (cm, tiempo real)</p>' +
    '<p class="torre-dwc-llenado-value"><strong>' +
    valStr +
    ' cm</strong></p>' +
    '<p class="torre-nft-p-soft torre-dwc-llenado-def">Medida vertical entre la <strong>superficie del nutriente</strong> y la <strong>base del sustrato</strong> en la cesta de la tapa. Con <strong>difusor u oxigenador</strong> continuo.</p>' +
    '<p class="torre-nft-p-soft">Sustrato de referencia: <strong>' +
    (typeof meteoEscHtml === 'function' ? meteoEscHtml(a.suNombre) : a.suNombre) +
    '</strong> · perfil «' +
    (a.esCoco ? 'coco' : 'esponja / lana / espuma') +
    '».</p>' +
    detalleFases +
    extraFuera +
    '</div>'
  );
}

function mountDwcDistanciaLlenadoTiempoReal() {
  const el = document.getElementById('sysDwcDistanciaSustratoWrap');
  if (!el) return;
  try {
    el.innerHTML = dwcHtmlDistanciaLlenadoTiempoReal(state.configTorre);
  } catch (e) {
    el.innerHTML =
      '<p class="torre-nft-p-soft">No se pudo calcular la recomendación de llenado. Revisa sustrato y fichas de cultivo.</p>';
  }
}

/** Actualiza volumen (L), tapa/rejilla, máx. cestas, oxigenación/difusor y llenado (cm) en la pestaña Cultivo e instalación (DWC). */
function refreshDwcSistemaMedidasUI() {
  const volEl = document.getElementById('sysDwcVolumenLitrosHint');
  const oxEl = document.getElementById('sysDwcOxigenacionHint');
  const cfg = state.configTorre;
  try {
    toggleDwcVolumenManualUI(DWC_FORM_IDS_SISTEMA, cfg);
  } catch (_) {}
  if (!cfg || cfg.tipoInstalacion !== 'dwc') {
    if (volEl) {
      volEl.style.display = 'none';
      volEl.textContent = '';
    }
    if (oxEl) {
      oxEl.style.display = 'none';
      oxEl.textContent = '';
    }
    const wrapLpsClear = document.getElementById('sysDwcLitrosUtilesPorSitioWrap');
    if (wrapLpsClear) wrapLpsClear.classList.add('setup-hidden');
    const distWClear = document.getElementById('sysDwcDistanciaSustratoWrap');
    if (distWClear) distWClear.innerHTML = '';
    try {
      refreshDwcTapHintSistema();
    } catch (e) {}
    try {
      refreshDwcMaxCestasHintSistema();
    } catch (eM) {}
    try {
      renderDwcCultivoRecoStatus('sys');
    } catch (eR) {}
    return;
  }
  if (volEl) {
    const cap = getDwcCapacidadLitrosFromSistemaInputs();
    const forma = dwcNormalizeDepositoForma(document.getElementById('sysDwcDepositoForma')?.value || cfg.dwcDepositoForma);
    if (cap != null && cap > 0) {
      const cfgDraft = state.configTorre ? { ...state.configTorre } : {};
      const { L: Ld, W: Wd } = dwcLargoAnchoCmEffectivosDesdeFormIds(DWC_FORM_IDS_SISTEMA);
      const Pd = _dwcParseOptCm('sysDwcProfCm', 5, 200);
      const vm = _dwcParseVolManualLitros(document.getElementById('sysDwcVolumenManualL')?.value);
      const hPotD = _dwcParseOptMm('sysDwcPotHmm', 30, 200);
      cfgDraft.dwcDepositoForma = forma;
      if (Ld != null) cfgDraft.dwcDepositoLargoCm = Ld;
      if (Wd != null) cfgDraft.dwcDepositoAnchoCm = Wd;
      if (Pd != null) cfgDraft.dwcDepositoProfCm = Pd;
      else delete cfgDraft.dwcDepositoProfCm;
      if (vm != null) cfgDraft.dwcDepositoVolManualL = vm;
      else delete cfgDraft.dwcDepositoVolManualL;
      if (hPotD != null) cfgDraft.dwcNetPotHeightMm = hPotD;
      const volSeguro = getDwcVolumenSeguroMaxLitrosDesdeConfig(cfgDraft);
      const hSustratoMm = getDwcAlturaSustratoEstimadaMm(cfgDraft);
      volEl.style.display = 'block';
      volEl.textContent =
        (forma === 'troncopiramidal'
          ? 'Volumen util del deposito (tronco): ~' +
            cap +
            ' L (' +
            (vm != null ? 'medido o L×A×P' : 'L×A×P aprox.') +
            '). '
          : vm != null
            ? 'Volumen util configurado del deposito: ~' + cap + ' L (manual, sobrescribe geometria). '
          : forma === 'cilindrico'
            ? 'Volumen geometrico estimado del deposito cilindrico: ~' + cap + ' L (π × (Ø/2)² × prof. util). '
            : 'Volumen geometrico estimado del deposito: ~' + cap + ' L (largo × ancho × prof. en cm ÷ 1000). ') +
        (volSeguro != null
          ? 'Con el sustrato actual (altura estimada ~' + hSustratoMm + ' mm en cesta), el llenado seguro máximo es ~' + volSeguro + ' L (deja ~0,5–1 cm bajo la base del sustrato).'
          : 'En cultivo el nivel de solución debe quedar por debajo de la base del sustrato (reserva 0,5–1 cm).');
    } else {
      const forma = dwcNormalizeDepositoForma(document.getElementById('sysDwcDepositoForma')?.value || cfg.dwcDepositoForma);
      if (forma === 'troncopiramidal') {
        volEl.style.display = 'block';
        volEl.textContent =
          'Troncopiramidal: indica L×A y profundidad útil P del líquido (la app estima ~litros) o litros medidos a mano; con altura de cesta se calcula el llenado seguro.';
      } else {
        volEl.style.display = 'none';
        volEl.textContent = '';
      }
    }
  }
  try {
    refreshDwcTapHintSistema();
  } catch (e2) {}
  try {
    refreshDwcMaxCestasHintSistema();
  } catch (e3) {}

  const wrapLps = document.getElementById('sysDwcLitrosUtilesPorSitioWrap');
  if (wrapLps) {
    const showLps =
      typeof dwcGetOxigenacionDiseno === 'function' &&
      dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes';
    wrapLps.classList.toggle('setup-hidden', !showLps);
  }
  try {
    dwcRefreshMulticuboDependienteUi('sys');
  } catch (_) {}

  if (oxEl) {
    const modoDwc = dwcGetModoCultivo(cfg);
    if (modoDwc === 'kratky') {
      oxEl.style.display = 'block';
      oxEl.style.padding = '8px 10px';
      oxEl.style.fontSize = '10px';
      oxEl.style.lineHeight = '1.45';
      oxEl.style.fontWeight = '600';
      oxEl.style.color = '#92400e';
      oxEl.style.background = '#fffbeb';
      oxEl.style.border = '1px solid #fde68a';
      oxEl.style.borderRadius = '10px';
      oxEl.textContent =
        'Modo Kratky (sin aireador): controla mucho temperatura y volumen; mantener la cámara de aire (0,5–1 cm bajo la base del sustrato) y evitar >22°C en agua.';
      try {
        mountDwcDistanciaLlenadoTiempoReal();
      } catch (_) {}
      try {
        renderDwcCultivoRecoStatus('sys');
      } catch (eRk) {}
      return;
    }
    const par = dwcRecomendacionDifusorParaSistemaUI(cfg);
    if (par && par.rec) {
      oxEl.style.display = 'block';
      oxEl.style.padding = '8px 10px';
      oxEl.style.fontSize = '10px';
      oxEl.style.lineHeight = '1.5';
      oxEl.style.fontWeight = '600';
      oxEl.style.color = '#0c4a6e';
      oxEl.style.background = '#f0f9ff';
      oxEl.style.border = '1px solid #bae6fd';
      oxEl.style.borderRadius = '10px';
      oxEl.textContent = dwcFormatSistemaDwcDifusorSoloResultado(par.rec, par.lit);
    } else {
      oxEl.style.display = 'block';
      oxEl.style.padding = '0';
      oxEl.style.fontSize = '10px';
      oxEl.style.lineHeight = '1.45';
      oxEl.style.fontWeight = '600';
      oxEl.style.color = '#64748b';
      oxEl.style.background = 'transparent';
      oxEl.style.border = 'none';
      oxEl.style.borderRadius = '0';
      oxEl.textContent =
        'Indica L, A y P (prismático), Ø interior y profundidad útil del líquido (cilíndrico), o litros/volumen para la recomendación de L/min y difusores.';
    }
  }
  try {
    mountDwcDistanciaLlenadoTiempoReal();
  } catch (eMnt) {}
  try {
    if (typeof applySistemaTipoPanelesColapsablesUI === 'function') {
      applySistemaTipoPanelesColapsablesUI();
    }
  } catch (_) {}
  try {
    applySistemaDwcLlenadoCollapseUI();
  } catch (_) {}
  try {
    renderDwcCultivoRecoStatus('sys');
  } catch (eReco) {}
}

function refreshDwcTapHintSistema() {
  const el = document.getElementById('sysDwcTapaCestasHint');
  if (!el) return;
  const cfg = state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  if (dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes') {
    let n = dwcGetNumCubosIndependientes(cfg);
    const elNc = document.getElementById('sysDwcNumCubos');
    const selOx = document.getElementById('sysDwcOxigenacionDiseno');
    if (elNc && selOx && dwcNormalizeOxigenacionDiseno(selOx.value) === 'cubos_independientes') {
      const r = parseInt(String(elNc.value || '').trim(), 10);
      if (Number.isFinite(r) && r >= 1) n = Math.min(24, r);
    }
    el.style.display = 'block';
    el.style.borderRadius = '10px';
    el.style.padding = '8px 10px';
    el.style.fontSize = '10px';
    el.style.lineHeight = '1.45';
    el.style.fontWeight = '600';
    el.style.background = '#f0f9ff';
    el.style.border = '1.5px solid #bae6fd';
    el.style.color = '#0c4a6e';
    el.textContent =
      'Multivalvula: ' +
      n +
      ' cubo' +
      (n === 1 ? '' : 's') +
      ' (1 maceta/cubo). Mezcla total = suma; aire según litros y objetivo.';
    return;
  }
  const filas = Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1);
  const cols = Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  const rim = _dwcParseOptMm('sysDwcPotRimMm', 25, 120);
  const { L, W } = dwcLargoAnchoCmEffectivosDesdeFormIds(DWC_FORM_IDS_SISTEMA);
  let marcoE = 0;
  let huecoE = DWC_TAPA_HUECO_DEFAULT_MM;
  if (cfg.dwcTapaMarcoPorLadoMm != null && Number.isFinite(Number(cfg.dwcTapaMarcoPorLadoMm)) && Number(cfg.dwcTapaMarcoPorLadoMm) >= 0) {
    marcoE = Number(cfg.dwcTapaMarcoPorLadoMm);
  }
  if (cfg.dwcTapaHuecoMm != null && Number.isFinite(Number(cfg.dwcTapaHuecoMm)) && Number(cfg.dwcTapaHuecoMm) >= 0) {
    huecoE = Number(cfg.dwcTapaHuecoMm);
  }
  const formaTap = dwcNormalizeDepositoForma(cfg.dwcDepositoForma);
  const ev = dwcEvaluarCapestEnTapa(filas, cols, rim, L, W, marcoE, huecoE, formaTap);
  if (ev.estado === 'incompleto') {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  el.style.borderRadius = '10px';
  el.style.padding = '8px 10px';
  el.style.fontSize = '10px';
  el.style.lineHeight = '1.45';
  el.style.fontWeight = '600';
  if (ev.estado === 'ok') {
    el.style.background = '#ecfdf5';
    el.style.border = '1.5px solid #86efac';
    el.style.color = '#14532d';
    el.textContent = ev.tapaCircular
      ? '✓ Rejilla ' +
        cols +
        '×' +
        filas +
        ' cabe en tapa circular (~Ø ' +
        Math.round(ev.diamUtilMm != null ? ev.diamUtilMm : Math.min(ev.Lmm, ev.Wmm)) +
        ' mm útil; marco ' +
        ev.marco +
        ' mm/lado, ' +
        ev.hueco +
        ' mm entre cestas). Geometría de tapa; litros útiles se calculan aparte.'
      : '✓ Rejilla ' +
        cols +
        '×' +
        filas +
        ' cabe (~' +
        Math.round(ev.Lmm) +
        '×' +
        Math.round(ev.Wmm) +
        ' mm útil; marco ' +
        ev.marco +
        ' mm/lado, ' +
        ev.hueco +
        ' mm entre cestas). Geometría de tapa; litros útiles se calculan aparte.';
    return;
  }
  el.style.background = '#fffbeb';
  el.style.border = '1.5px solid #fde68a';
  el.style.color = '#92400e';
  el.textContent = '⚠️ ' + ev.msg;
}

function mountDwcCestasGuiaEnPanelConsejos() {
  const m = document.getElementById('mountDwcCestasGuiaConsejos');
  if (!m) return;
  m.innerHTML = '';
  const tpl = document.getElementById('tplDwcCestasGuia');
  if (!tpl || !tpl.content) return;
  const frag = tpl.content.cloneNode(true);
  const root = frag.querySelector('.dwc-cestas-guia');
  if (root) root.classList.add('dwc-cestas-guia--sistema');
  m.appendChild(frag);
}

function onSetupDwcMedidasInput() {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') return;
  try {
    toggleDwcVolumenManualUI(DWC_FORM_IDS_SETUP, state.configTorre);
  } catch (_) {}
  try {
    actualizarResumenSetup();
  } catch (e) {}
  const esMc =
    dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value) ===
    'cubos_independientes';
  if (esMc) {
    const hint = document.getElementById('setupDwcCapacidadEstimada');
    const block = document.getElementById('setupDwcLitrosCuboBlock');
    const hidden = document.getElementById('setupDwcLitrosUtilesPorSitioL');
    let litros = null;
    try {
      const draft = buildDwcDraftCfgFromSetupWizardInputs();
      litros =
        draft && typeof dwcLitrosUtilesPorCuboMultivalvula === 'function'
          ? dwcLitrosUtilesPorCuboMultivalvula(draft)
          : null;
    } catch (_) {}
    if (litros != null && litros > 0) {
      const L = Math.round(litros * 10) / 10;
      if (block) block.classList.remove('setup-hidden');
      if (hint) {
        hint.textContent =
          L + ' L de solución por cubo (calculado según medidas del cubo, profundidad de cesta y cámara de aire bajo la maceta).';
      }
      if (hidden) hidden.value = String(L);
    } else {
      if (block) block.classList.add('setup-hidden');
      if (hint) hint.textContent = '';
      if (hidden) hidden.value = '';
    }
    updateTorreBuilder();
    return;
  }
  const hint = document.getElementById('setupDwcCapacidadEstimada');
  const blockDep = document.getElementById('setupDwcLitrosCuboBlock');
  if (blockDep) blockDep.classList.add('setup-hidden');
  const cap = getDwcCapacidadLitrosFromSetupInputs();
  const forma = dwcNormalizeDepositoForma(document.getElementById('setupDwcDepositoForma')?.value);
  const vm = _dwcParseVolManualLitros(document.getElementById('setupDwcVolumenManualL')?.value);
  if (hint) {
    if (cap != null && cap > 0) {
      hint.classList.remove('setup-hidden');
      let extraSeg = '';
      try {
        const draft = buildDwcDraftCfgFromSetupWizardInputs();
        const vSeg = draft ? getDwcVolumenSeguroMaxLitrosDesdeConfig(draft) : null;
        if (vSeg != null && vSeg > 0 && Math.abs(vSeg - cap) > 0.2) {
          extraSeg = ' Llenado operativo orientativo (bajo cesta + aire): ~' + Math.round(vSeg * 10) / 10 + ' L.';
        }
      } catch (_) {}
      hint.textContent =
        (forma === 'troncopiramidal'
          ? (vm != null
              ? 'Capacidad ~' + cap + ' L (prioriza litros medidos). Con P y cesta se orienta llenado seguro y mezcla.'
              : 'Capacidad estimada ~' + cap + ' L (L×A×P como prisma en la boca; tronco real puede variar). Ajusta con litros medidos si los tienes.')
          : vm != null
            ? 'Volumen util manual: ~' + cap + ' L (sobrescribe calculo geometrico).'
          : forma === 'cilindrico'
            ? 'Capacidad geometrica estimada: ~' + cap + ' L (cilindro: π × (Ø interior/2)² × prof. útil del líquido).'
            : 'Capacidad geometrica estimada: ~' + cap + ' L (largo × ancho × prof. útil en cm ÷ 1000).') + extraSeg;
    } else {
      hint.classList.add('setup-hidden');
      hint.textContent = '';
    }
  }
  updateTorreBuilder();
  try {
    syncSetupVolMezclaSugeridoDwc();
  } catch (_) {}
  onSetupVolMezclaInput();
}

/** Rellena cfg con campos DWC desde inputs (pestaña Cultivo e instalación o asistente). */
function dwcMergeCamposFormularioEnCfg(cfg, ids) {
  if (!cfg || !ids) return;
  const formaEl = ids.forma ? document.getElementById(ids.forma) : null;
  const forma = dwcNormalizeDepositoForma(formaEl && formaEl.value);
  let L = _dwcParseOptCm(ids.largo, 5, 300);
  let W = _dwcParseOptCm(ids.ancho, 5, 300);
  if (forma === 'cilindrico' && ids.diametro) {
    const d = _dwcParseOptCm(ids.diametro, 5, 300);
    if (d != null) {
      L = d;
      W = d;
    }
  }
  const P = _dwcParseOptCm(ids.prof, 5, 200);
  const volManual = ids.volManual ? _dwcParseVolManualLitros(document.getElementById(ids.volManual)?.value) : null;
  const rim = _dwcParseOptMm(ids.rim, 25, 120);
  const hPot = _dwcParseOptMm(ids.alt, 30, 200);
  cfg.dwcDepositoForma = forma;
  if (volManual != null) cfg.dwcDepositoVolManualL = volManual;
  else delete cfg.dwcDepositoVolManualL;
  if (L != null) cfg.dwcDepositoLargoCm = L; else delete cfg.dwcDepositoLargoCm;
  if (W != null) cfg.dwcDepositoAnchoCm = W; else delete cfg.dwcDepositoAnchoCm;
  if (P != null) cfg.dwcDepositoProfCm = P;
  else delete cfg.dwcDepositoProfCm;
  if (rim != null) cfg.dwcNetPotRimMm = rim; else delete cfg.dwcNetPotRimMm;
  if (hPot != null) cfg.dwcNetPotHeightMm = hPot; else delete cfg.dwcNetPotHeightMm;
  if (ids.objetivo) {
    const elObj = document.getElementById(ids.objetivo);
    if (elObj && elObj.value) cfg.dwcObjetivoCultivo = dwcNormalizeObjetivoCultivo(elObj.value);
    else cfg.dwcObjetivoCultivo = dwcObjetivoCultivoDesdeRimMm(rim);
  }
  if (ids.modo) {
    const elModoCultivo = document.getElementById(ids.modo);
    cfg.dwcModo = dwcNormalizeModo(elModoCultivo && elModoCultivo.value);
  } else {
    cfg.dwcModo = dwcNormalizeModo(cfg.dwcModo);
  }
  if (ids.rejillaModo) {
    const elModo = document.getElementById(ids.rejillaModo);
    cfg.dwcRejillaModoPreferido = dwcNormalizeRejillaModo(elModo && elModo.value);
  }
  if (ids.oxigenacionDiseno) {
    const elOx = document.getElementById(ids.oxigenacionDiseno);
    cfg.dwcOxigenacionDiseno = dwcNormalizeOxigenacionDiseno(elOx && elOx.value);
  } else {
    cfg.dwcOxigenacionDiseno = dwcNormalizeOxigenacionDiseno(cfg.dwcOxigenacionDiseno);
  }
  if (dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes' && ids.litrosUtilesPorSitio) {
    const elS = document.getElementById(ids.litrosUtilesPorSitio);
    if (elS) {
      const raw = String(elS.value || '').trim().replace(',', '.');
      const x = parseFloat(raw);
      if (raw !== '' && Number.isFinite(x) && x >= 0.5 && x <= 200) {
        cfg.dwcLitrosUtilesPorSitioL = Math.round(Math.min(200, Math.max(0.5, x)) * 10) / 10;
      } else {
        delete cfg.dwcLitrosUtilesPorSitioL;
      }
    }
  } else if (dwcGetOxigenacionDiseno(cfg) !== 'cubos_independientes') {
    delete cfg.dwcLitrosUtilesPorSitioL;
  }
  cfg.dwcCupulas = document.getElementById(ids.cupulas)?.checked === true;
  if (!cfg.dwcCupulas) delete cfg.dwcCupulas;
  cfg.dwcEntradaAireManguera = document.getElementById(ids.aire)?.checked === true;
  if (cfg.dwcModo === 'kratky') cfg.dwcEntradaAireManguera = false;
  if (!cfg.dwcEntradaAireManguera) delete cfg.dwcEntradaAireManguera;
  if (ids.marco && ids.hueco) {
    const mh = _dwcParseMarcoHuecoMmIds(ids.marco, ids.hueco);
    if (mh.marco != null) cfg.dwcTapaMarcoPorLadoMm = mh.marco;
    else delete cfg.dwcTapaMarcoPorLadoMm;
    if (mh.hueco != null) cfg.dwcTapaHuecoMm = mh.hueco;
    else delete cfg.dwcTapaHuecoMm;
  }
  dwcAplicarMatrizCultivoMulticuboEnCfg(cfg, ids);
}

/** Mueve los sliders del asistente al bloque DWC (depósito unido) o los oculta en multivalvula. */
function dwcReparentSetupSlidersForPreview() {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') return;
  const controls = document.getElementById('setupTorreBuilderControlsSlot');
  const dwcSlot = document.getElementById('setupDwcDepUnidoControls');
  if (!controls || !dwcSlot) return;
  const mc =
    dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value) ===
    'cubos_independientes';
  controls.classList.toggle('setup-hidden', mc);
  dwcSlot.classList.toggle('setup-hidden', mc);
  if (!mc && controls.parentElement !== dwcSlot) dwcSlot.appendChild(controls);
  const dn = document.getElementById('setupTorreDimNivel');
  const dc = document.getElementById('setupTorreDimCesta');
  if (dn && dc && !mc) {
    dn.textContent = 'Filas en la tapa';
    dc.textContent = 'Cestas por fila';
  }
}

/** Muestra u oculta rejilla de tapa (solo depósito unido) y campo «cubos» en multivalvula. */
function dwcRefreshMulticuboDependienteUi(which) {
  const esMc = selVal => dwcNormalizeOxigenacionDiseno(selVal) === 'cubos_independientes';
  if (which === 'sys') {
    const sel = document.getElementById('sysDwcOxigenacionDiseno');
    const mc = esMc(sel && sel.value);
    const wNc = document.getElementById('sysDwcNumCubosWrap');
    if (wNc) wNc.classList.toggle('setup-hidden', !mc);
    const wRej = document.getElementById('sysDwcRejillaPreferidaWrap');
    if (wRej) wRej.classList.toggle('setup-hidden', mc);
    const wAcc = document.getElementById('sysDwcDepUnidoRejillaAccionesWrap');
    if (wAcc) wAcc.classList.toggle('setup-hidden', mc);
  } else if (which === 'setup') {
    const sel = document.getElementById('setupDwcOxigenacionDiseno');
    const mc = esMc(sel && sel.value);
    const wNc = document.getElementById('setupDwcNumCubosWrap');
    if (wNc) wNc.classList.toggle('setup-hidden', !mc);
    const wBl = document.getElementById('setupDwcDepUnidoRejillaWrap');
    if (wBl) wBl.classList.toggle('setup-hidden', mc);
    const wExtras = document.getElementById('setupDwcDepUnidoExtrasWrap');
    if (wExtras) wExtras.classList.toggle('setup-hidden', mc);
    const wLit = document.getElementById('setupDwcLitrosUtilesPorSitioWrap');
    if (wLit) wLit.classList.add('setup-hidden');
    document.querySelectorAll('#setupDwcSoloBloque .setup-dwc-dep-unido-only').forEach(el => {
      el.classList.toggle('setup-hidden', mc);
    });
    if (mc) {
      const modo = document.getElementById('setupDwcModoCultivo');
      const obj = document.getElementById('setupDwcObjetivoCultivo');
      if (modo) modo.value = 'aireado';
      if (obj) obj.value = 'final';
      const reco = document.getElementById('setupDwcCultivoRecoStatus');
      if (reco) {
        reco.classList.add('setup-hidden');
        reco.textContent = '';
      }
    }
    try {
      dwcReparentSetupSlidersForPreview();
    } catch (_) {}
    try {
      onSetupDwcMedidasInput();
    } catch (_) {}
  }
}

/** DWC: rellena tamanoCesta / tamanoCestaCustom desde Ø cesta en mm (asistente) para no duplicar el bloque de tamaños. */
/**
 * Instalaciones antiguas: cesta 5 cm (tamanoCesta '50') con Ø 44 mm guardado;
 * la referencia nominal unificada con el asistente es 50 mm.
 * @returns {boolean} si se alteró cfg
 */
function dwcMigrarRimLegacy44SiCestaCm50(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return false;
  const rim = Number(cfg.dwcNetPotRimMm);
  if (!Number.isFinite(rim) || rim !== 44) return false;
  if (String(cfg.tamanoCesta || '') !== '50') return false;
  cfg.dwcNetPotRimMm = 50;
  dwcSincronizarTamanoCestaDesdeRim(cfg);
  return true;
}

function dwcSincronizarTamanoCestaDesdeRim(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return;
  const rim = cfg.dwcNetPotRimMm;
  if (!Number.isFinite(rim) || rim < 25) return;
  const cm = rim / 10;
  const snaps = [['38', 3.8], ['40', 4], ['50', 5], ['75', 7.5], ['100', 10]];
  let bestKey = '50';
  let bestDist = Infinity;
  for (let i = 0; i < snaps.length; i++) {
    const d = Math.abs(cm - snaps[i][1]);
    if (d < bestDist) {
      bestDist = d;
      bestKey = snaps[i][0];
    }
  }
  if (bestDist <= 0.35) {
    cfg.tamanoCesta = bestKey;
    cfg.tamanoCestaCustom = '';
  } else {
    cfg.tamanoCesta = 'custom';
    cfg.tamanoCestaCustom = String(Math.round(cm * 10) / 10);
  }
}

function syncDwcFormInputsDesdeConfig(c, ids) {
  if (!ids) return;
  c = c || {};
  if (c === state.configTorre && dwcMigrarRimLegacy44SiCestaCm50(c)) {
    try {
      guardarEstadoTorreActual();
      saveState();
    } catch (_) {}
  }
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val != null && val !== '' ? String(val) : '';
  };
  const formaSync = dwcNormalizeDepositoForma(c.dwcDepositoForma);
  if (ids.forma) setVal(ids.forma, formaSync);
  const dUi = dwcDiametroCmUiDesdeLW(c.dwcDepositoLargoCm, c.dwcDepositoAnchoCm);
  if (ids.diametro) setVal(ids.diametro, formaSync === 'cilindrico' ? dUi : '');
  if (formaSync === 'cilindrico' && dUi !== '') {
    setVal(ids.largo, dUi);
    setVal(ids.ancho, dUi);
  } else {
    setVal(ids.largo, c.dwcDepositoLargoCm);
    setVal(ids.ancho, c.dwcDepositoAnchoCm);
  }
  if (ids.prof) setVal(ids.prof, c.dwcDepositoProfCm != null ? c.dwcDepositoProfCm : '');
  if (ids.volManual) setVal(ids.volManual, c.dwcDepositoVolManualL);
  setVal(ids.rim, c.dwcNetPotRimMm);
  setVal(ids.alt, c.dwcNetPotHeightMm);
  if (ids.modo) setVal(ids.modo, dwcGetModoCultivo(c));
  if (ids.objetivo) setVal(ids.objetivo, dwcGetObjetivoCultivo(c));
  if (ids.rejillaModo) setVal(ids.rejillaModo, dwcGetRejillaModoPreferido(c));
  if (ids.oxigenacionDiseno) setVal(ids.oxigenacionDiseno, dwcGetOxigenacionDiseno(c));
  if (ids.litrosUtilesPorSitio) {
    const vps = c.dwcLitrosUtilesPorSitioL;
    setVal(ids.litrosUtilesPorSitio, vps != null && Number.isFinite(Number(vps)) ? String(vps) : '');
  }
  if (ids.numCubos) {
    const elNc = document.getElementById(ids.numCubos);
    if (elNc) {
      if (dwcGetOxigenacionDiseno(c) === 'cubos_independientes') {
        const n0 =
          c.dwcNumCubos != null && Number.isFinite(Number(c.dwcNumCubos))
            ? Math.min(24, Math.max(1, Math.round(Number(c.dwcNumCubos))))
            : Math.min(
                24,
                Math.max(
                  1,
                  (parseInt(String(c.numNiveles || 1), 10) || 1) * (parseInt(String(c.numCestas || 1), 10) || 1)
                )
              );
        elNc.value = String(n0);
      } else {
        elNc.value = '';
      }
    }
  }
  if (ids.marco) setVal(ids.marco, c.dwcTapaMarcoPorLadoMm);
  if (ids.hueco) setVal(ids.hueco, c.dwcTapaHuecoMm);
  const cu = document.getElementById(ids.cupulas);
  if (cu) cu.checked = c.dwcCupulas === true;
  const air = document.getElementById(ids.aire);
  if (air) {
    const mk = dwcGetModoCultivo(c);
    air.checked = mk !== 'kratky' && c.dwcEntradaAireManguera === true;
    air.disabled = mk === 'kratky';
  }
  try {
    toggleDwcVolumenManualUI(ids, c);
  } catch (_) {}
  try {
    if (ids === DWC_FORM_IDS_SETUP) {
      const w = document.getElementById('setupDwcLitrosUtilesPorSitioWrap');
      const sel = document.getElementById('setupDwcOxigenacionDiseno');
      if (w && sel) w.classList.toggle('setup-hidden', sel.value !== 'cubos_independientes');
      dwcRefreshMulticuboDependienteUi('setup');
    }
    if (ids === DWC_FORM_IDS_SISTEMA) {
      dwcRefreshMulticuboDependienteUi('sys');
    }
  } catch (_) {}
}

function toggleDwcVolumenManualUI(formIds, cfg) {
  const ids = formIds || DWC_FORM_IDS_SISTEMA;
  const forma = dwcNormalizeDepositoForma(
    document.getElementById(ids.forma)?.value || (cfg || state.configTorre || {}).dwcDepositoForma
  );
  const on = dwcRequiereVolumenManual(forma);
  const isSetup = ids === DWC_FORM_IDS_SETUP;
  const wrap = document.getElementById(isSetup ? 'setupDwcVolumenManualWrap' : 'sysDwcVolumenManualWrap');
  const profWrap = document.getElementById(isSetup ? 'setupDwcProfWrap' : 'sysDwcProfWrap');
  const inp = document.getElementById(ids.volManual);
  const help = document.getElementById(isSetup ? 'setupDwcVolumenManualHint' : 'sysDwcVolumenManualHint');
  if (wrap) wrap.classList.remove('setup-hidden');
  if (profWrap) profWrap.classList.remove('setup-hidden');
  if (inp) {
    inp.required = false;
    inp.setAttribute('aria-required', 'false');
  }
  if (help) {
    help.classList.remove('setup-hidden');
    help.textContent = on
      ? 'Troncopiramidal: indica L×A (boca) y profundidad/altura útil P del líquido para calcular ~litros y el llenado seguro según cesta; o solo litros medidos si prefieres (sobrescribe L×A×P).'
      : 'Opcional: si conoces litros utiles reales, este valor sobrescribe el calculo geometrico.';
  }
  try {
    refreshDwcDepositoMedidasLayout(ids);
  } catch (_) {}
}

function refreshDwcDepositoMedidasLayout(ids) {
  ids = ids || DWC_FORM_IDS_SISTEMA;
  const forma = dwcNormalizeDepositoForma(
    document.getElementById(ids.forma)?.value || (state.configTorre || {}).dwcDepositoForma
  );
  const isSetup = ids === DWC_FORM_IDS_SETUP;
  const la = document.getElementById(isSetup ? 'setupDwcMedidasLAWrap' : 'sysDwcMedidasLAWrap');
  const cyl = document.getElementById(isSetup ? 'setupDwcMedidasCilWrap' : 'sysDwcMedidasCilWrap');
  if (la) la.classList.toggle('setup-hidden', forma === 'cilindrico');
  if (cyl) cyl.classList.toggle('setup-hidden', forma !== 'cilindrico');
}

function onDwcFormaChanged(formIds) {
  const ids = formIds || DWC_FORM_IDS_SISTEMA;
  const forma = dwcNormalizeDepositoForma(
    document.getElementById(ids.forma)?.value || (state.configTorre || {}).dwcDepositoForma
  );
  if (forma === 'cilindrico' && ids.diametro) {
    const dIn = document.getElementById(ids.diametro);
    const rawD = dIn && String(dIn.value != null ? dIn.value : '').trim();
    if (!rawD && dIn) {
      const L0 = _dwcParseOptCm(ids.largo, 5, 300);
      const W0 = _dwcParseOptCm(ids.ancho, 5, 300);
      let seed = null;
      if (L0 != null && W0 != null) seed = (L0 + W0) / 2;
      else if (L0 != null) seed = L0;
      else if (W0 != null) seed = W0;
      if (seed != null) dIn.value = String(Math.round(seed * 10) / 10);
    }
  }
  try {
    toggleDwcVolumenManualUI(ids, state.configTorre);
  } catch (_) {}
  try {
    if (ids === DWC_FORM_IDS_SISTEMA) refreshDwcSistemaMedidasUI();
    else onSetupDwcMedidasInput();
  } catch (_) {}
  try {
    if (ids === DWC_FORM_IDS_SETUP) {
      refreshDwcTapHintSetup();
      updateTorreBuilder();
    } else refreshDwcTapHintSistema();
  } catch (_) {}
}

function dwcValidarVolumenManualSegunForma(cfg, contexto) {
  const c = cfg || state.configTorre || {};
  const forma = dwcNormalizeDepositoForma(c.dwcDepositoForma);
  if (!dwcRequiereVolumenManual(forma)) return true;
  const vm = getDwcVolumenManualLitrosDesdeConfig(c);
  if (vm != null && vm > 0) return true;
  const L = Number(c.dwcDepositoLargoCm);
  const W = Number(c.dwcDepositoAnchoCm);
  const P = Number(c.dwcDepositoProfCm);
  if (dwcTroncoLitrosDesdeLAMenosP(L, W, P) != null) return true;
  const msg =
    contexto === 'setup'
      ? 'Troncopiramidal: indica volumen útil medido (L) o largo × ancho × profundidad útil del líquido (cm).'
      : 'Troncopiramidal: indica volumen útil (L) o L×A×P (cm) en el formulario DWC.';
  showToast(msg, true);
  return false;
}

function onDwcModoChanged(formIds) {
  const ids = formIds || DWC_FORM_IDS_SISTEMA;
  const sel = document.getElementById(ids.modo);
  const air = document.getElementById(ids.aire);
  const mk = dwcNormalizeModo(sel && sel.value);
  if (air) {
    if (mk === 'kratky') {
      air.checked = false;
      air.disabled = true;
    } else {
      air.disabled = false;
    }
  }
  try {
    if (typeof refreshDwcSistemaMedidasUI === 'function' && ids === DWC_FORM_IDS_SISTEMA) {
      refreshDwcSistemaMedidasUI();
    }
  } catch (_) {}
  try {
    if (ids === DWC_FORM_IDS_SETUP) syncSetupVolMezclaSugeridoDwc();
  } catch (_) {}
}

function aplicarSistemaDwcDesdeFormulario() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'dwc') return;
  initTorres();
  const cfg = state.configTorre;
  dwcMergeCamposFormularioEnCfg(cfg, DWC_FORM_IDS_SISTEMA);
  try {
    redimensionarMatrizTorreDwcPreservando(cfg, cfg.numNiveles, cfg.numCestas);
  } catch (_) {}
  if (!dwcValidarVolumenManualSegunForma(cfg, 'sistema')) return;
  dwcSincronizarTamanoCestaDesdeRim(cfg);
  try {
    dwcPersistSnapshotMaxCestasEnCfg(cfg);
  } catch (e0) {}
  try {
    dwcSyncVolDepositoDesdeCapacidadEstimada(cfg);
  } catch (eV) {}
  try {
    dwcClampVolMezclaACapacidadDeposito(cfg);
  } catch (eM) {}
  if (
    cfg.nutriente &&
    typeof litrosDepositoParaChecklist === 'function' &&
    litrosDepositoParaChecklist(cfg) != null
  ) {
    cfg.checklistInstalacionConfirmada = true;
  }
  cfg.uiSistemaDwcColapsado = true;
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try {
    renderTorreSistemaResumenTabla(cfg);
  } catch (e) {}
  try {
    refreshDwcSistemaMedidasUI();
  } catch (eH) {}
  showToast('Datos DWC guardados');
  try {
    applySistemaTipoPanelesColapsablesUI();
  } catch (_) {}
}

(function initDwcDistanciaLlenadoMount() {
  if (typeof document === 'undefined') return;
  const run = function () {
    try {
      mountDwcDistanciaLlenadoTiempoReal();
    } catch (e) {}
    try {
      applySistemaDwcLlenadoCollapseUI();
    } catch (e2) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

