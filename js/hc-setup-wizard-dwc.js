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

/** Litros útiles del depósito DWC si largo×ancho×prof. (cm) están completos en el asistente o Sistema. */
function getDwcCapacidadLitrosFromSetupInputs() {
  const L = _dwcParseOptCm('setupDwcLargoCm', 5, 300);
  const W = _dwcParseOptCm('setupDwcAnchoCm', 5, 300);
  const P = _dwcParseOptCm('setupDwcProfCm', 5, 200);
  if (L == null || W == null || P == null) return null;
  const litros = (L * W * P) / 1000;
  if (!Number.isFinite(litros) || litros <= 0) return null;
  return Math.round(litros * 10) / 10;
}

/** Litros útiles del depósito desde campos de la pestaña Sistema (misma fórmula que el asistente). */
function getDwcCapacidadLitrosFromSistemaInputs() {
  const L = _dwcParseOptCm('sysDwcLargoCm', 5, 300);
  const W = _dwcParseOptCm('sysDwcAnchoCm', 5, 300);
  const P = _dwcParseOptCm('sysDwcProfCm', 5, 200);
  if (L == null || W == null || P == null) return null;
  const litros = (L * W * P) / 1000;
  if (!Number.isFinite(litros) || litros <= 0) return null;
  return Math.round(litros * 10) / 10;
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
 * Recomendación de bomba/difusor DWC: volumen de solución real (L) + filas × cestas (más cestas → más demanda de O₂, orientativo ~2,5% extra por cesta respecto a la primera, tope ×1,35).
 * Salidas de difusor: ~1 punto cada ~18 L (máx. 6 en montajes caseros típicos).
 */
function dwcCalcDifusorRecomendacion(volLitros, nFilas, nPorFila) {
  const nf = Math.max(1, parseInt(String(nFilas != null ? nFilas : 1), 10) || 1);
  const nc = Math.max(1, parseInt(String(nPorFila != null ? nPorFila : 1), 10) || 1);
  const nTotal = nf * nc;
  const v = Number(volLitros);
  if (!Number.isFinite(v) || v <= 0) return null;
  const base = dwcCaudalAireOrientativoLmin(v);
  if (!base) return null;
  const factorDem = Math.min(1.35, 1 + Math.max(0, nTotal - 1) * 0.025);
  const sc = x => Math.round(x * factorDem * 10) / 10;
  const salidasSug = Math.min(6, Math.max(1, Math.ceil(v / 18)));
  return {
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
  const nf = Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1);
  const nc = Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  return dwcCalcDifusorRecomendacion(vol, nf, nc);
}

/** Igual que checklist pero el volumen puede salir de L×A×P del formulario Sistema si están completos. */
function dwcRecomendacionDifusorParaSistemaUI(cfg) {
  cfg = cfg || state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return null;
  const lit = getDwcLitrosOxigenacionParaSistemaUI(cfg);
  if (!lit) return null;
  const nf = Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1);
  const nc = Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  const rec = dwcCalcDifusorRecomendacion(lit.vol, nf, nc);
  if (!rec) return null;
  return { rec, lit };
}

function dwcFormatHtmlRecomendacionDifusorCore(rec) {
  if (!rec) return '';
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
  const L = _dwcParseOptCm('sysDwcLargoCm', 5, 300);
  const W = _dwcParseOptCm('sysDwcAnchoCm', 5, 300);
  const P = _dwcParseOptCm('sysDwcProfCm', 5, 200);
  let inicio;
  if (L != null && W != null && P != null) {
    inicio =
      'Para un depósito de ' +
      L +
      '×' +
      W +
      '×' +
      P +
      ' cm (~' +
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
      '<p class="dwc-dif-empty">Completa <strong>capacidad máxima y litros de mezcla</strong> en Sistema o en <strong>PC·1</strong> (primer llenado) para calcular bomba y difusores con tu volumen real.</p>';
    return;
  }
  el.innerHTML = dwcFormatHtmlRecomendacionDifusorCore(rec);
}

/**
 * Litros para el aviso de oxigenación en Sistema DWC: prioriza L×A×P del formulario; si no, config (mezcla / máx.).
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
 * Comprueba si filas × cestas/fila y Ø cesta caben en largo × ancho de tapa (cualquier orientación).
 * @param {number} [marcoPorLadoMm=0] resta 2× este valor a cada dimensión interior útil (marco no perforado).
 * @param {number} [gutterMm] separación entre cestas; por defecto DWC_TAPA_HUECO_DEFAULT_MM.
 */
function dwcEvaluarCapestEnTapa(filas, cols, rimMm, largoCm, anchoCm, marcoPorLadoMm, gutterMm) {
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
  const fit1 = spanC <= Lmm && spanR <= Wmm;
  const fit2 = spanC <= Wmm && spanR <= Lmm;
  if (fit1 || fit2) return { estado: 'ok', spanC, spanR, Lmm, Wmm, marco, hueco };
  return {
    estado: 'no',
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
function dwcMaxCestasTeoricasEnTapa(rimMm, largoCm, anchoCm, marcoPorLadoMm, gutterMm) {
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
  const cols = maxAlong(Lmm);
  const filas = maxAlong(Wmm);
  if (cols < 1 || filas < 1) return { max: 0, cols, filas, Lmm, Wmm, marco, hueco };
  return { max: cols * filas, cols, filas, Lmm, Wmm, marco, hueco };
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
  return dwcMaxCestasTeoricasEnTapa(rim, L, W, marco, hueco);
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
    modoCultivo: modoKey,
    ts: new Date().toISOString().slice(0, 10),
  };
}

/** Redimensiona la matriz DWC (filas × columnas de macetas) conservando datos donde haya hueco. */
function redimensionarMatrizTorreDwcPreservando(cfg, nFilas, nCols) {
  if (!cfg || cfg.tipoInstalacion !== 'dwc') return;
  const nf = Math.max(1, Math.min(DWC_REJILLA_MAX_FILAS, parseInt(String(nFilas), 10) || 1));
  const nc = Math.max(1, Math.min(DWC_REJILLA_MAX_COLS, parseInt(String(nCols), 10) || 1));
  const empty = () => ({ variedad: '', fecha: '', notas: '', fotos: [], fotoKeys: [] });
  const copy = o => {
    if (!o || typeof o !== 'object') return empty();
    return {
      variedad: o.variedad || '',
      fecha: o.fecha || '',
      notas: o.notas || '',
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
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'dwc') return;
  initTorres();
  const cfg = state.configTorre;
  try {
    dwcMergeCamposFormularioEnCfg(cfg, DWC_FORM_IDS_SISTEMA);
  } catch (e) {}
  const o = dwcMaxCestasDesdeConfigTorre(cfg);
  const btn = document.getElementById('btnDwcAplicarRejillaMax');
  if (!o || o.max < 1) {
    showToast('Indica largo, ancho y diámetro de cesta válidos para calcular la rejilla.', true);
    if (btn) btn.disabled = true;
    return;
  }
  const rawF = o.filas;
  const rawC = o.cols;
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
  let msg = 'Rejilla aplicada: ' + nf + '×' + nc + ' macetas (' + nf * nc + ' huecos).';
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
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') return;
  const rim = _dwcParseOptMm('setupDwcPotRimMm', 25, 120);
  const L = _dwcParseOptCm('setupDwcLargoCm', 5, 300);
  const W = _dwcParseOptCm('setupDwcAnchoCm', 5, 300);
  const mh = _dwcParseMarcoHuecoMmIds('setupDwcTapaMarcoMm', 'setupDwcTapaHuecoMm');
  const marcoE = mh.marco != null ? mh.marco : 0;
  const huecoE = mh.hueco != null ? mh.hueco : DWC_TAPA_HUECO_DEFAULT_MM;
  if (rim == null || L == null || W == null) {
    showToast('Completa largo, ancho y diámetro de cesta.', true);
    return;
  }
  const o = dwcMaxCestasTeoricasEnTapa(rim, L, W, marcoE, huecoE);
  if (!o || o.max < 1) {
    showToast('No se puede calcular la rejilla con esos datos.', true);
    return;
  }
  const rawF = o.filas;
  const rawC = o.cols;
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
  let msg = 'Deslizadores: ' + nf + ' filas × ' + nc + ' columnas.';
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
      ' (en Sistema puedes llegar a ' +
      DWC_REJILLA_MAX_FILAS +
      '×' +
      DWC_REJILLA_MAX_COLS +
      ').';
  }
  showToast(msg);
}

function refreshDwcMaxCestasHintSistema() {
  const el = document.getElementById('sysDwcMaxCestasHint');
  const btn = document.getElementById('btnDwcAplicarRejillaMax');
  const cfg = state.configTorre;
  if (!el || !cfg || cfg.tipoInstalacion !== 'dwc') {
    if (el) {
      el.classList.add('setup-hidden');
      el.textContent = '';
    }
    if (btn) {
      btn.classList.add('setup-hidden');
      btn.disabled = true;
    }
    return;
  }
  const cfgCalc = Object.assign({}, cfg);
  try {
    dwcMergeCamposFormularioEnCfg(cfgCalc, DWC_FORM_IDS_SISTEMA);
  } catch (eM) {}
  const o = dwcMaxCestasDesdeConfigTorre(cfgCalc);
  if (!o || o.max < 1) {
    el.classList.add('setup-hidden');
    el.textContent = '';
    if (btn) {
      btn.classList.add('setup-hidden');
      btn.disabled = true;
    }
    return;
  }
  const modoKey =
    typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  const modoLbl = (MODOS_CULTIVO[modoKey] && MODOS_CULTIVO[modoKey].nombre) || 'tu cultivo';
  const rimShow =
    cfgCalc.dwcNetPotRimMm != null ? cfgCalc.dwcNetPotRimMm : cfg.dwcNetPotRimMm;
  const extra =
    modoKey === 'intensivo' || modoKey === 'mixto'
      ? ' En cultivos de porte amplio suele convenir menos cestas que el máximo teórico.'
      : ' Si el follaje ensancha mucho respecto al aro, deja margen y menos cestas.';
  const metaTs = cfg.dwcCestasMaxRecomendadasMeta && cfg.dwcCestasMaxRecomendadasMeta.ts;
  el.textContent =
    '📐 Máx. orientativo en tapa: ~' +
    o.max +
    ' cestas (rejilla ~' +
    o.cols +
    '×' +
    o.filas +
    '; Ø ' +
    rimShow +
    ' mm; ' +
    o.hueco +
    ' mm entre cestas). Modo «' +
    modoLbl +
    '»:' +
    extra +
    (metaTs ? ' Referencia guardada en la instalación (' + metaTs + ').' : '');
  el.classList.remove('setup-hidden');
  if (btn) {
    btn.classList.remove('setup-hidden');
    btn.disabled = false;
  }
}

function refreshDwcTapHintSetup() {
  const el = document.getElementById('setupDwcTapaCestasHint');
  if (!el) return;
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') {
    el.classList.add('setup-hidden');
    el.textContent = '';
    const bx = document.getElementById('btnDwcAplicarRejillaMaxSetup');
    if (bx) {
      bx.classList.add('setup-hidden');
      bx.disabled = true;
    }
    return;
  }
  const filas = parseInt(document.getElementById('sliderNiveles')?.value || '0', 10);
  const cols = parseInt(document.getElementById('sliderCestas')?.value || '0', 10);
  const rim = _dwcParseOptMm('setupDwcPotRimMm', 25, 120);
  const L = _dwcParseOptCm('setupDwcLargoCm', 5, 300);
  const W = _dwcParseOptCm('setupDwcAnchoCm', 5, 300);
  const mh = _dwcParseMarcoHuecoMmIds('setupDwcTapaMarcoMm', 'setupDwcTapaHuecoMm');
  const marcoE = mh.marco != null ? mh.marco : 0;
  const huecoE = mh.hueco != null ? mh.hueco : DWC_TAPA_HUECO_DEFAULT_MM;
  const ev = dwcEvaluarCapestEnTapa(filas, cols, rim, L, W, marcoE, huecoE);
  if (ev.estado === 'incompleto') {
    el.classList.add('setup-hidden');
    el.textContent = '';
    const b0 = document.getElementById('btnDwcAplicarRejillaMaxSetup');
    if (b0) {
      b0.classList.add('setup-hidden');
      b0.disabled = true;
    }
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
    el.textContent =
      '✓ La rejilla cabe en el área útil de la tapa (~' +
      Math.round(ev.Lmm) +
      '×' +
      Math.round(ev.Wmm) +
      ' mm; marco ' +
      ev.marco +
      ' mm/lado, ' +
      ev.hueco +
      ' mm entre cestas). Orientativo.';
  } else {
    el.style.background = '#fffbeb';
    el.style.border = '1.5px solid #fde68a';
    el.style.color = '#92400e';
    el.textContent = '⚠️ ' + ev.msg;
  }

  const btnS = document.getElementById('btnDwcAplicarRejillaMaxSetup');
  if (btnS) {
    if (rim != null && L != null && W != null) {
      const om = dwcMaxCestasTeoricasEnTapa(rim, L, W, marcoE, huecoE);
      if (om && om.max >= 1) {
        btnS.classList.remove('setup-hidden');
        btnS.disabled = false;
      } else {
        btnS.classList.add('setup-hidden');
        btnS.disabled = true;
      }
    } else {
      btnS.classList.add('setup-hidden');
      btnS.disabled = true;
    }
  }
}

/** Actualiza volumen estimado (L), oxigenación/difusor (L/min) y aviso de rejilla en la pestaña Sistema DWC. */
function refreshDwcSistemaMedidasUI() {
  const volEl = document.getElementById('sysDwcVolumenLitrosHint');
  const oxEl = document.getElementById('sysDwcOxigenacionHint');
  const cfg = state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'dwc') {
    if (volEl) {
      volEl.style.display = 'none';
      volEl.textContent = '';
    }
    if (oxEl) {
      oxEl.style.display = 'none';
      oxEl.textContent = '';
    }
    try {
      refreshDwcTapHintSistema();
    } catch (e) {}
    try {
      refreshDwcMaxCestasHintSistema();
    } catch (eM) {}
    return;
  }
  if (volEl) {
    const cap = getDwcCapacidadLitrosFromSistemaInputs();
    if (cap != null && cap > 0) {
      volEl.style.display = 'block';
      volEl.textContent =
        'Volumen útil estimado del depósito: ~' + cap + ' L (largo × ancho × prof. en cm ÷ 1000).';
    } else {
      volEl.style.display = 'none';
      volEl.textContent = '';
    }
  }
  try {
    refreshDwcTapHintSistema();
  } catch (e2) {}
  try {
    refreshDwcMaxCestasHintSistema();
  } catch (e3) {}

  if (oxEl) {
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
        'Indica L, A y P del depósito o configura el volumen para obtener la recomendación de L/min y difusores.';
    }
  }
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
  const filas = Math.max(1, parseInt(String(cfg.numNiveles || 1), 10) || 1);
  const cols = Math.max(1, parseInt(String(cfg.numCestas || 1), 10) || 1);
  const rim = _dwcParseOptMm('sysDwcPotRimMm', 25, 120);
  const L = _dwcParseOptCm('sysDwcLargoCm', 5, 300);
  const W = _dwcParseOptCm('sysDwcAnchoCm', 5, 300);
  let marcoE = 0;
  let huecoE = DWC_TAPA_HUECO_DEFAULT_MM;
  if (cfg.dwcTapaMarcoPorLadoMm != null && Number.isFinite(Number(cfg.dwcTapaMarcoPorLadoMm)) && Number(cfg.dwcTapaMarcoPorLadoMm) >= 0) {
    marcoE = Number(cfg.dwcTapaMarcoPorLadoMm);
  }
  if (cfg.dwcTapaHuecoMm != null && Number.isFinite(Number(cfg.dwcTapaHuecoMm)) && Number(cfg.dwcTapaHuecoMm) >= 0) {
    huecoE = Number(cfg.dwcTapaHuecoMm);
  }
  const ev = dwcEvaluarCapestEnTapa(filas, cols, rim, L, W, marcoE, huecoE);
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
    el.textContent =
      '✓ Rejilla ' +
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
      ' mm entre cestas). Orientativo.';
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
    actualizarResumenSetup();
  } catch (e) {}
  const hint = document.getElementById('setupDwcCapacidadEstimada');
  const cap = getDwcCapacidadLitrosFromSetupInputs();
  if (hint) {
    if (cap != null && cap > 0) {
      hint.classList.remove('setup-hidden');
      hint.textContent =
        'Capacidad bruta estimada: ~' +
        cap +
        ' L (largo × ancho × prof. útil en cm ÷ 1000).';
    } else {
      hint.classList.add('setup-hidden');
      hint.textContent = '';
    }
  }
  updateTorreBuilder();
  onSetupVolMezclaInput();
}

/** Rellena cfg con campos DWC desde inputs (pestaña Sistema o asistente). */
function dwcMergeCamposFormularioEnCfg(cfg, ids) {
  if (!cfg || !ids) return;
  const L = _dwcParseOptCm(ids.largo, 5, 300);
  const W = _dwcParseOptCm(ids.ancho, 5, 300);
  const P = _dwcParseOptCm(ids.prof, 5, 200);
  const rim = _dwcParseOptMm(ids.rim, 25, 120);
  const hPot = _dwcParseOptMm(ids.alt, 30, 200);
  if (L != null) cfg.dwcDepositoLargoCm = L; else delete cfg.dwcDepositoLargoCm;
  if (W != null) cfg.dwcDepositoAnchoCm = W; else delete cfg.dwcDepositoAnchoCm;
  if (P != null) cfg.dwcDepositoProfCm = P; else delete cfg.dwcDepositoProfCm;
  if (rim != null) cfg.dwcNetPotRimMm = rim; else delete cfg.dwcNetPotRimMm;
  if (hPot != null) cfg.dwcNetPotHeightMm = hPot; else delete cfg.dwcNetPotHeightMm;
  cfg.dwcCupulas = document.getElementById(ids.cupulas)?.checked === true;
  if (!cfg.dwcCupulas) delete cfg.dwcCupulas;
  cfg.dwcEntradaAireManguera = document.getElementById(ids.aire)?.checked === true;
  if (!cfg.dwcEntradaAireManguera) delete cfg.dwcEntradaAireManguera;
  if (ids.marco && ids.hueco) {
    const mh = _dwcParseMarcoHuecoMmIds(ids.marco, ids.hueco);
    if (mh.marco != null) cfg.dwcTapaMarcoPorLadoMm = mh.marco;
    else delete cfg.dwcTapaMarcoPorLadoMm;
    if (mh.hueco != null) cfg.dwcTapaHuecoMm = mh.hueco;
    else delete cfg.dwcTapaHuecoMm;
  }
}

/** DWC: rellena tamanoCesta / tamanoCestaCustom desde Ø cesta en mm (asistente) para no duplicar el bloque de tamaños. */
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
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val != null && val !== '' ? String(val) : '';
  };
  setVal(ids.largo, c.dwcDepositoLargoCm);
  setVal(ids.ancho, c.dwcDepositoAnchoCm);
  setVal(ids.prof, c.dwcDepositoProfCm);
  setVal(ids.rim, c.dwcNetPotRimMm);
  setVal(ids.alt, c.dwcNetPotHeightMm);
  if (ids.marco) setVal(ids.marco, c.dwcTapaMarcoPorLadoMm);
  if (ids.hueco) setVal(ids.hueco, c.dwcTapaHuecoMm);
  const cu = document.getElementById(ids.cupulas);
  if (cu) cu.checked = c.dwcCupulas === true;
  const air = document.getElementById(ids.aire);
  if (air) air.checked = c.dwcEntradaAireManguera === true;
}

function aplicarSistemaDwcDesdeFormulario() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'dwc') return;
  initTorres();
  const cfg = state.configTorre;
  dwcMergeCamposFormularioEnCfg(cfg, DWC_FORM_IDS_SISTEMA);
  dwcSincronizarTamanoCestaDesdeRim(cfg);
  try {
    dwcPersistSnapshotMaxCestasEnCfg(cfg);
  } catch (e0) {}
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
}

