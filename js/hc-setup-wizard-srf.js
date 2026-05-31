/**
 * SRF / DFT — Sistema de raíz flotante (balsa flotante).
 * Independiente de DWC, NFT, RDWC y torre: solo claves srf*.
 */
const SRF_FORM_IDS_SETUP = [
  'setupSrfCanalLargoCm',
  'setupSrfCanalAnchoCm',
  'setupSrfProfundidadCm',
  'setupSrfBalsaGrosorMm',
  'setupSrfEspaciamientoCm',
  'setupSrfFilas',
  'setupSrfPlantasPorFila',
  'setupSrfNetPotMm',
  'setupSrfNetPotHeightMm',
  'setupSrfObjetivoCultivo',
  'setupSrfOxigenacionModo',
  'setupSrfKratkyGapCm',
];
const SRF_FORM_IDS_SISTEMA = [
  'sysSrfCanalLargoCm',
  'sysSrfCanalAnchoCm',
  'sysSrfProfundidadCm',
  'sysSrfNumPlantas',
  'sysSrfPlantasPorFila',
  'sysSrfFilas',
  'sysSrfOxigenacionModo',
  'sysSrfCirculante',
  'sysSrfRecircLh',
  'sysSrfAirLpm',
  'sysSrfBalsaGrosorMm',
  'sysSrfNetPotMm',
  'sysSrfNetPotHeightMm',
  'sysSrfEspaciamientoCm',
  'sysSrfVolumenManualL',
  'sysSrfVolTrabajoL',
  'sysSrfObjetivoCultivo',
  'sysSrfKratkyGapCm',
];

function srfNormalizeOxigenacionModo(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'kratky' || v === 'no_circulante' || v === 'aire_camara') return 'kratky';
  return 'aireador';
}

function srfEnsureConfigDefaults(cfg) {
  cfg = cfg || {};
  if (cfg.tipoInstalacion !== 'srf') return cfg;
  if (!Number.isFinite(Number(cfg.srfCanalLargoCm)) || Number(cfg.srfCanalLargoCm) <= 0) cfg.srfCanalLargoCm = 120;
  if (!Number.isFinite(Number(cfg.srfCanalAnchoCm)) || Number(cfg.srfCanalAnchoCm) <= 0) cfg.srfCanalAnchoCm = 60;
  if (!Number.isFinite(Number(cfg.srfProfundidadCm)) || Number(cfg.srfProfundidadCm) <= 0) cfg.srfProfundidadCm = 25;
  if (!Number.isFinite(Number(cfg.srfFilas)) || Number(cfg.srfFilas) < 1) cfg.srfFilas = 2;
  cfg.srfFilas = Math.max(1, Math.min(8, Math.round(Number(cfg.srfFilas))));
  if (!Number.isFinite(Number(cfg.srfPlantasPorFila)) || Number(cfg.srfPlantasPorFila) < 1) {
    const legacyCols = Number(cfg.numCestas);
    const legacyN = Number(cfg.srfNumPlantas);
    if (Number.isFinite(legacyCols) && legacyCols >= 1) cfg.srfPlantasPorFila = Math.round(legacyCols);
    else if (Number.isFinite(legacyN) && legacyN >= 1) {
      cfg.srfPlantasPorFila = Math.max(1, Math.ceil(legacyN / cfg.srfFilas));
    } else cfg.srfPlantasPorFila = 4;
  }
  cfg.srfPlantasPorFila = Math.max(1, Math.min(16, Math.round(Number(cfg.srfPlantasPorFila))));
  cfg.srfNumPlantas = cfg.srfFilas * cfg.srfPlantasPorFila;
  cfg.srfOxigenacionModo = srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo);
  if (cfg.srfCirculante == null) cfg.srfCirculante = cfg.srfOxigenacionModo !== 'kratky';
  if (!Number.isFinite(Number(cfg.srfBalsaGrosorMm)) || Number(cfg.srfBalsaGrosorMm) <= 0) cfg.srfBalsaGrosorMm = 40;
  if (!Number.isFinite(Number(cfg.srfNetPotMm)) || Number(cfg.srfNetPotMm) <= 0) cfg.srfNetPotMm = 50;
  if (!Number.isFinite(Number(cfg.srfNetPotHeightMm)) || Number(cfg.srfNetPotHeightMm) <= 0) cfg.srfNetPotHeightMm = 75;
  if (!Number.isFinite(Number(cfg.srfEspaciamientoCm)) || Number(cfg.srfEspaciamientoCm) <= 0) cfg.srfEspaciamientoCm = 20;
  if (!Number.isFinite(Number(cfg.srfRecircLh)) || Number(cfg.srfRecircLh) <= 0) cfg.srfRecircLh = 400;
  if (!Number.isFinite(Number(cfg.srfAirLpm)) || Number(cfg.srfAirLpm) <= 0) cfg.srfAirLpm = 8;
  if (!Number.isFinite(Number(cfg.srfKratkyGapCm)) || Number(cfg.srfKratkyGapCm) <= 0) cfg.srfKratkyGapCm = 8;
  if (!cfg.srfObjetivoCultivo) cfg.srfObjetivoCultivo = 'final';
  const grid = srfDistribuirPlantas(cfg);
  cfg.numNiveles = grid.rows;
  cfg.numCestas = grid.cols;
  return cfg;
}

function srfGetNumPlantas(cfg) {
  const g = srfDistribuirPlantas(cfg);
  return g.total;
}

function srfDistribuirPlantas(cfg) {
  cfg = cfg || {};
  let filas = parseInt(String(cfg.srfFilas != null ? cfg.srfFilas : cfg.numNiveles || 0), 10);
  let cols = parseInt(
    String(cfg.srfPlantasPorFila != null ? cfg.srfPlantasPorFila : cfg.numCestas || 0),
    10
  );
  const sinFilas = !Number.isFinite(filas) || filas < 1;
  const sinCols = !Number.isFinite(cols) || cols < 1;
  if (sinFilas && sinCols) {
    const n = parseInt(String(cfg.srfNumPlantas || 0), 10);
    if (Number.isFinite(n) && n > 0) {
      const g = typeof hcDistribuirFilasColumnas === 'function' ? hcDistribuirFilasColumnas(n, 8) : { rows: 2, cols: 4 };
      filas = g.rows;
      cols = g.cols;
    } else if (cfg._srfSinRejillaExplicita) {
      return { rows: 0, cols: 0, total: 0 };
    } else {
      filas = 2;
      cols = 4;
    }
  }
  if (!Number.isFinite(cols) || cols < 1) {
    const n = parseInt(String(cfg.srfNumPlantas || 0), 10);
    cols = Number.isFinite(n) && n > 0 && filas > 0 ? Math.max(1, Math.ceil(n / filas)) : 4;
  }
  filas = Math.max(1, Math.min(8, filas));
  cols = Math.max(1, Math.min(16, cols));
  return { rows: filas, cols, total: filas * cols };
}

function srfTieneMedidasCestaEnCfg(cfg) {
  cfg = cfg || {};
  const rim = Number(cfg.srfNetPotMm);
  const h = Number(cfg.srfNetPotHeightMm);
  return (Number.isFinite(h) && h >= 30) || (Number.isFinite(rim) && rim >= 25);
}

/** Cámara de aire nutriente → base del sustrato en cesta (cm). */
function srfGapAireCmDesdeConfig(cfg) {
  cfg = cfg || {};
  if (srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo) === 'kratky') {
    const k = Number(cfg.srfKratkyGapCm);
    if (Number.isFinite(k) && k > 0) return Math.max(2, Math.min(40, k));
    return 8;
  }
  return srfNormalizeObjetivoCultivo(cfg.srfObjetivoCultivo) === 'baby' ? 0.65 : 0.95;
}

/** Parte de la cesta que cuelga bajo la balsa en el agua (cm). */
function srfColgadoCestaEnAguaCm(cfg) {
  cfg = cfg || {};
  const hMm = Number(cfg.srfNetPotHeightMm);
  const balsaMm = Number(cfg.srfBalsaGrosorMm) || 40;
  if (Number.isFinite(hMm) && hMm >= 30) {
    const potCm = hMm / 10;
    const balsaCm = balsaMm / 10;
    return Math.max(1.5, potCm - balsaCm * 0.35 - 0.8);
  }
  const rim = Number(cfg.srfNetPotMm);
  if (Number.isFinite(rim) && rim >= 25) return Math.max(1.5, (rim / 10) * 1.1);
  return null;
}

/** Litros de llenado seguro: reserva cámara de aire hasta la base de la cesta. */
function srfVolumenSeguroLitrosDesdeConfig(cfg) {
  cfg = cfg || {};
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const P = Number(cfg.srfProfundidadCm);
  if (cap == null || !Number.isFinite(P) || P <= 0) return null;
  if (!srfTieneMedidasCestaEnCfg(cfg)) return null;
  const hang = srfColgadoCestaEnAguaCm(cfg);
  if (hang == null) return null;
  const gap = srfGapAireCmDesdeConfig(cfg);
  const balsaCm = (Number(cfg.srfBalsaGrosorMm) || 40) / 10;
  const hMin = Math.min(P * 0.18, 5);
  const hCol = Math.min(P, Math.max(hMin, P - balsaCm * 0.85 - hang - gap));
  const litros = cap * (hCol / P);
  const out = Math.round(litros * 10) / 10;
  if (!Number.isFinite(out) || out <= 0) return null;
  if (out >= cap - 0.02) return Math.round((cap - 0.1) * 10) / 10;
  return out;
}

function srfDesgloseVolumenLlenado(cfg) {
  cfg = cfg || {};
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const P = Number(cfg.srfProfundidadCm);
  if (cap == null || !Number.isFinite(P)) return null;
  const hang = srfColgadoCestaEnAguaCm(cfg);
  const gap = srfGapAireCmDesdeConfig(cfg);
  const balsaCm = (Number(cfg.srfBalsaGrosorMm) || 40) / 10;
  const hMin = Math.min(P * 0.18, 5);
  const hCol =
    hang != null ? Math.min(P, Math.max(hMin, P - balsaCm * 0.85 - hang - gap)) : null;
  const litros = srfVolumenSeguroLitrosDesdeConfig(cfg);
  return {
    P: Math.round(P * 10) / 10,
    balsaCm: Math.round(balsaCm * 10) / 10,
    hang: hang != null ? Math.round(hang * 10) / 10 : null,
    gap: Math.round(gap * 10) / 10,
    hCol: hCol != null ? Math.round(hCol * 10) / 10 : null,
    cap,
    litros,
    hPotMm: Number.isFinite(Number(cfg.srfNetPotHeightMm)) ? Math.round(Number(cfg.srfNetPotHeightMm)) : null,
    rimMm: Number.isFinite(Number(cfg.srfNetPotMm)) ? Math.round(Number(cfg.srfNetPotMm)) : null,
  };
}

function srfCapacidadLitrosDesdeConfig(cfg) {
  cfg = cfg || state.configTorre || {};
  if (cfg.tipoInstalacion !== 'srf') return null;
  const manual = Number(cfg.srfVolumenManualL);
  if (Number.isFinite(manual) && manual > 0) return Math.round(manual * 10) / 10;
  const L = Number(cfg.srfCanalLargoCm);
  const W = Number(cfg.srfCanalAnchoCm);
  const P = Number(cfg.srfProfundidadCm);
  if (!Number.isFinite(L) || !Number.isFinite(W) || !Number.isFinite(P) || L <= 0 || W <= 0 || P <= 0) return null;
  return Math.round((L * W * P) / 1000 * 10) / 10;
}

function srfLitrosPorPlanta(cfg) {
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const n = srfGetNumPlantas(cfg);
  if (cap == null || !n) return null;
  return Math.round((cap / n) * 10) / 10;
}

function srfNormalizeObjetivoCultivo(raw) {
  const v = String(raw || '').trim().toLowerCase();
  return v === 'baby' || v === 'baby_leaf' || v === 'micro' ? 'baby' : 'final';
}

function srfGetObjetivoCultivo(cfg) {
  const c = cfg || state.configTorre || {};
  if (c.srfObjetivoCultivo) return srfNormalizeObjetivoCultivo(c.srfObjetivoCultivo);
  if (c.torreObjetivoCultivo && typeof torreNormalizeObjetivoCultivo === 'function') {
    return torreNormalizeObjetivoCultivo(c.torreObjetivoCultivo);
  }
  return 'final';
}

/** Ajuste de rango EC por objetivo baby/final en SRF (misma lógica orientativa que torre/DWC). */
function srfAplicarObjetivoEcRango(ecRange, cfg, objetivo) {
  const c = cfg || state.configTorre || {};
  if (typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(c) !== 'srf' : c.tipoInstalacion !== 'srf') {
    return ecRange;
  }
  const baseMin = Number(ecRange && ecRange.min);
  const baseMax = Number(ecRange && ecRange.max);
  if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) return ecRange;
  const objRaw =
    objetivo != null
      ? objetivo
      : (typeof srfGetObjetivoCultivo === 'function' ? srfGetObjetivoCultivo(c) : 'final');
  const obj =
    typeof torreNormalizeObjetivoCultivo === 'function'
      ? torreNormalizeObjetivoCultivo(objRaw)
      : srfNormalizeObjetivoCultivo(objRaw);
  const adj =
    typeof torreGetObjetivoAjustes === 'function' ? torreGetObjetivoAjustes(c, obj) : { ecMult: obj === 'baby' ? 0.88 : 1 };
  const minAdj = Math.max(350, Math.round(baseMin * adj.ecMult));
  const maxAdj = Math.max(minAdj + 80, Math.round(baseMax * adj.ecMult));
  return { min: minAdj, max: maxAdj };
}

/** Instalación nueva en asistente: sin heredar otra torre activa. */
function hcFreshSrfSetupDefaults() {
  return { tipoInstalacion: 'srf', srfOxigenacionModo: 'aireador', srfObjetivoCultivo: 'final' };
}

function srfFormInputTieneValor(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  if (el.type === 'checkbox') return true;
  return String(el.value || '').trim() !== '';
}

/** Estanque + rejilla + cesta mínimos antes de guardar instalación nueva. */
function srfSetupFormularioCompleto() {
  const estanque =
    srfFormInputTieneValor('setupSrfCanalLargoCm') &&
    srfFormInputTieneValor('setupSrfCanalAnchoCm') &&
    srfFormInputTieneValor('setupSrfProfundidadCm');
  const rejilla =
    srfFormInputTieneValor('setupSrfFilas') && srfFormInputTieneValor('setupSrfPlantasPorFila');
  const cesta =
    srfFormInputTieneValor('setupSrfNetPotMm') && srfFormInputTieneValor('setupSrfNetPotHeightMm');
  return estanque && rejilla && cesta;
}

function srfSetupTieneEstanqueEnFormulario() {
  return (
    srfFormInputTieneValor('setupSrfCanalLargoCm') &&
    srfFormInputTieneValor('setupSrfCanalAnchoCm') &&
    srfFormInputTieneValor('setupSrfProfundidadCm')
  );
}

/** Vacía el paso SRF del asistente (como NFT con sliders a cero). */
function hcResetSrfSetupFormZero() {
  const ids = [
    'setupSrfCanalLargoCm',
    'setupSrfCanalAnchoCm',
    'setupSrfProfundidadCm',
    'setupSrfBalsaGrosorMm',
    'setupSrfEspaciamientoCm',
    'setupSrfFilas',
    'setupSrfPlantasPorFila',
    'setupSrfNetPotMm',
    'setupSrfNetPotHeightMm',
    'setupSrfKratkyGapCm',
    'setupSrfVolTrabajoL',
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const obj = document.getElementById('setupSrfObjetivoCultivo');
  if (obj) obj.value = 'final';
  const ox = document.getElementById('setupSrfOxigenacionModo');
  if (ox) ox.value = 'aireador';
  try {
    clearSetupVolMezclaSrfAutofill();
  } catch (_) {}
  const litVal = document.getElementById('setupSrfLitrosSolucionValor');
  const litHint = document.getElementById('setupSrfLitrosSolucionHint');
  const litBlock = document.getElementById('setupSrfLitrosSolucionBlock');
  const bombaVal = document.getElementById('setupSrfBombaRecoValor');
  const bombaHint = document.getElementById('setupSrfBombaRecoHint');
  const bombaBlock = document.getElementById('setupSrfBombaRecoBlock');
  if (litBlock) litBlock.classList.add('setup-dwc-litros-solucion-block--pending');
  if (litVal) litVal.textContent = 'Indica medidas del estanque y de la cesta';
  if (litHint) litHint.textContent = '';
  if (bombaBlock) bombaBlock.classList.remove('setup-hidden');
  if (bombaVal) bombaVal.textContent = '—';
  if (bombaHint) bombaHint.textContent = 'Se calcula al completar el estanque.';
  const calc = document.getElementById('setupSrfCalcStatus');
  if (calc) calc.innerHTML = '';
  const prev = document.getElementById('setupSrfPreview');
  if (prev) {
    prev.innerHTML = '';
    prev.classList.remove('torre-preview--srf');
  }
  try {
    srfRefreshOxigenacionUi('setup');
  } catch (_) {}
  try {
    renderSrfCultivoRecoStatus('setup');
  } catch (_) {}
}

function srfGrupoObjetivoDesdeConfig(cfg) {
  return typeof hcGrupoCultivoDominanteDesdeConfig === 'function'
    ? hcGrupoCultivoDominanteDesdeConfig(cfg)
    : typeof nftGrupoObjetivoDesdeConfig === 'function'
      ? nftGrupoObjetivoDesdeConfig(cfg)
      : 'lechugas';
}

function srfRecoValoresDesdeCelda(celda) {
  if (!celda) return null;
  return {
    profCm: celda.profRecoCm,
    balsaMm: celda.balsaRecoMm,
    rimMm: celda.rimReco,
    heightMm: celda.heightReco,
    sepCm: celda.sepRecoCm,
    advierte: !!celda.advierte,
    txt: celda.txt,
  };
}

function srfRecoPerfilDesdeConfig(cfg) {
  cfg = cfg || {};
  const grupo = srfGrupoObjetivoDesdeConfig(cfg);
  const objetivo = srfNormalizeObjetivoCultivo(cfg.srfObjetivoCultivo);
  const celda =
    typeof hcCultivoCestaRecoCelda === 'function'
      ? hcCultivoCestaRecoCelda(grupo, 'srf', objetivo)
      : null;
  const vals = srfRecoValoresDesdeCelda(celda);
  const gLabel =
    (HC_CESTA_MATRIX_GRUPOS || []).find(x => x.key === grupo)?.label ||
    (typeof nftRecoPerfilPorGrupo === 'function' ? nftRecoPerfilPorGrupo(grupo).etiqueta : grupo);
  return {
    grupo,
    etiqueta: gLabel,
    objetivo,
    objetivoLabel: objetivo === 'baby' ? 'Baby leaf' : 'Planta completa',
    celda,
    profMinCm: vals && vals.profCm != null ? Math.max(10, vals.profCm - 3) : 20,
    profMaxCm: vals && vals.profCm != null ? Math.min(50, vals.profCm + 4) : 30,
    profRecoCm: vals ? vals.profCm : 25,
    balsaMinMm: vals && vals.balsaMm != null ? Math.max(15, vals.balsaMm - 8) : 30,
    balsaMaxMm: vals && vals.balsaMm != null ? Math.min(80, vals.balsaMm + 10) : 50,
    balsaRecoMm: vals ? vals.balsaMm : 40,
    rimMinMm: vals && vals.rimMm != null ? Math.max(25, vals.rimMm - 12) : 40,
    rimMaxMm: vals && vals.rimMm != null ? Math.min(120, vals.rimMm + 15) : 75,
    rimRecoMm: vals ? vals.rimMm : 50,
    heightMinMm: vals && vals.heightMm != null ? Math.max(30, vals.heightMm - 15) : 55,
    heightMaxMm: vals && vals.heightMm != null ? Math.min(200, vals.heightMm + 20) : 90,
    heightRecoMm: vals ? vals.heightMm : 75,
    sepMinCm: vals && vals.sepCm != null ? Math.max(8, vals.sepCm - 4) : 15,
    sepMaxCm: vals && vals.sepCm != null ? Math.min(60, vals.sepCm + 8) : 25,
    sepRecoCm: vals ? vals.sepCm : 20,
    permite: !(vals && vals.advierte),
    resumenTxt: celda ? celda.txt : '',
  };
}

function srfRecomendacionCultivoDesdeConfig(cfg) {
  cfg = cfg || state.configTorre || {};
  if (cfg.tipoInstalacion !== 'srf') return null;
  const perfil = srfRecoPerfilDesdeConfig(cfg);
  const prof = Number(cfg.srfProfundidadCm);
  const balsa = Number(cfg.srfBalsaGrosorMm);
  const rim = Number(cfg.srfNetPotMm);
  const height = Number(cfg.srfNetPotHeightMm);
  const sep = Number(cfg.srfEspaciamientoCm);
  let estado = 'ok';
  let veredicto = 'Parámetros dentro del rango orientativo';
  const avisos = [];
  if (!perfil.permite) {
    estado = 'warn';
    avisos.push('Cultivo exigente en SRF estándar; vigila densidad y oxigenación');
  }
  if (Number.isFinite(prof) && prof > 0) {
    if (prof < perfil.profMinCm) avisos.push('Profundidad baja para este cultivo');
    else if (prof > perfil.profMaxCm) avisos.push('Profundidad alta (más volumen y aireador)');
  } else {
    avisos.push('Indica profundidad útil del estanque');
  }
  if (Number.isFinite(balsa) && balsa > 0) {
    if (balsa < perfil.balsaMinMm) avisos.push('Balsa fina: vigila rigidez');
    else if (balsa > perfil.balsaMaxMm) avisos.push('Balsa gruesa: menos cuelgue útil de cesta');
  }
  if (Number.isFinite(rim) && rim > 0) {
    if (rim < perfil.rimMinMm) avisos.push('Cesta pequeña para el cultivo');
    else if (rim > perfil.rimMaxMm) avisos.push('Cesta grande para la densidad habitual');
  }
  if (Number.isFinite(height) && height > 0) {
    if (height < perfil.heightMinMm) avisos.push('Cesta poco profunda');
    else if (height > perfil.heightMaxMm) avisos.push('Cesta muy alta sobre la balsa');
  }
  if (Number.isFinite(sep) && sep > 0) {
    if (sep < perfil.sepMinCm) avisos.push('Separación muy cerrada');
    else if (sep > perfil.sepMaxCm) avisos.push('Separación muy abierta');
  }
  if (avisos.length) {
    estado = estado === 'ok' ? 'warn' : estado;
    veredicto = avisos.join('; ');
  }
  return {
    perfil,
    profActualCm: Number.isFinite(prof) ? prof : null,
    balsaActualMm: Number.isFinite(balsa) ? balsa : null,
    rimActualMm: Number.isFinite(rim) ? rim : null,
    heightActualMm: Number.isFinite(height) ? height : null,
    sepActualCm: Number.isFinite(sep) ? sep : null,
    estado,
    veredicto,
  };
}

function srfRecomendacionCultivoTextoCorto(cfg) {
  const r = srfRecomendacionCultivoDesdeConfig(cfg);
  if (!r) return '';
  const p = r.perfil;
  return (
    'Cultivo: ' +
    p.etiqueta +
    ' · ' +
    p.objetivoLabel +
    ' · P ~' +
    (p.profRecoCm != null ? p.profRecoCm : '—') +
    ' cm · cesta Ø' +
    (p.rimRecoMm != null ? p.rimRecoMm : '—') +
    ' mm · ' +
    (r.estado === 'ok' ? 'OK' : 'Revisar') +
    '.'
  );
}

function srfDraftParaCompatibilidad(scope) {
  const esSetup = scope === 'setup';
  let draft;
  if (esSetup && typeof buildSrfConfigFromForm === 'function') {
    const esNueva = typeof setupEsNuevaTorre !== 'undefined' && setupEsNuevaTorre;
    const seed =
      esNueva && typeof hcFreshSrfSetupDefaults === 'function'
        ? hcFreshSrfSetupDefaults()
        : Object.assign({}, state.configTorre || {});
    draft = buildSrfConfigFromForm('setup', seed, { applyDefaults: false });
    if (typeof setupPlantasSeleccionadas !== 'undefined' && setupPlantasSeleccionadas.size > 0) {
      draft.cultivosIniciales = [...setupPlantasSeleccionadas];
    } else if (esNueva) {
      delete draft.cultivosIniciales;
    }
  } else if (!esSetup && typeof buildSrfConfigFromForm === 'function') {
    draft = buildSrfConfigFromForm('sys', Object.assign({}, state.configTorre || {}));
  } else {
    draft = Object.assign({}, state.configTorre || {}, { tipoInstalacion: 'srf' });
  }
  return draft;
}

function srfRefreshAplicarRecoBtns(scope, r, hayCultivo) {
  const p = scope === 'setup' ? 'setup' : 'sys';
  const btnCult = document.getElementById(p + 'SrfAplicarCultivoBtn');
  const btnCesta = document.getElementById(p + 'SrfAplicarCestaBtn');
  const ok = !!(r && hayCultivo && r.perfil);
  if (btnCult) btnCult.disabled = !ok;
  if (btnCesta) btnCesta.disabled = !ok;
}

function renderSrfCompatibilidadEnEl(el, html, visible) {
  if (!el) return;
  if (!visible) {
    el.innerHTML = '';
    el.classList.add('setup-hidden');
    return;
  }
  el.classList.remove('setup-hidden');
  el.innerHTML = html;
}

function renderSrfCultivoRecoStatus(scope) {
  const elCult = document.getElementById(scope === 'setup' ? 'setupSrfCultivoRecoStatus' : 'sysSrfCultivoRecoStatus');
  const elCesta = document.getElementById(scope === 'setup' ? 'setupSrfCestaRecoStatus' : 'sysSrfCestaRecoStatus');
  const esSetup = scope === 'setup';
  if (esSetup) {
    if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'srf') {
      renderSrfCompatibilidadEnEl(elCult, '', false);
      renderSrfCompatibilidadEnEl(elCesta, '', false);
      srfRefreshAplicarRecoBtns(scope, null, false);
      return;
    }
  } else if (!state.configTorre || state.configTorre.tipoInstalacion !== 'srf') {
    renderSrfCompatibilidadEnEl(elCult, '', false);
    renderSrfCompatibilidadEnEl(elCesta, '', false);
    srfRefreshAplicarRecoBtns(scope, null, false);
    return;
  }
  const draft = srfDraftParaCompatibilidad(scope);
  const r = srfRecomendacionCultivoDesdeConfig(draft);
  if (!r) {
    renderSrfCompatibilidadEnEl(elCult, '', false);
    renderSrfCompatibilidadEnEl(elCesta, '', false);
    srfRefreshAplicarRecoBtns(scope, null, false);
    return;
  }
  const chip = typeof rdwcCompatChipHtml === 'function' ? rdwcCompatChipHtml : () => '';
  const esc = typeof meteoEscHtml === 'function' ? meteoEscHtml : x => String(x == null ? '' : x);
  const hayCultivo =
    typeof hcSetupHayCultivosEnAsistente === 'function'
      ? hcSetupHayCultivosEnAsistente(draft)
      : (typeof setupPlantasSeleccionadas !== 'undefined' && setupPlantasSeleccionadas.size > 0) ||
        (Array.isArray(draft.cultivosIniciales) && draft.cultivosIniciales.length > 0);
  const p = r.perfil;
  const profAct =
    r.profActualCm != null ? '<strong>' + r.profActualCm + ' cm</strong>' : 'por indicar';
  const cultivoLine = hayCultivo
    ? esc(p.etiqueta) +
      ' · ' +
      esc(p.objetivoLabel) +
      ' · P recom. <strong>' +
      (p.profRecoCm != null ? p.profMinCm + '–' + p.profMaxCm : '—') +
      ' cm</strong> · balsa <strong>' +
      (p.balsaRecoMm != null ? p.balsaRecoMm : '—') +
      ' mm</strong>'
    : 'Elige cultivo en el asistente para validar estanque y balsa';
  renderSrfCompatibilidadEnEl(
    elCult,
    '<span class="rdwc-compat-text nft-compat-line">' +
      chip(r.estado) +
      ' <strong>SRF vs cultivo</strong> · ' +
      cultivoLine +
      ' · actual ' +
      profAct +
      (hayCultivo ? '. <em>' + esc(r.veredicto) + '</em>' : '.') +
      '</span>',
    true
  );
  const rimAct = r.rimActualMm != null ? r.rimActualMm + ' mm' : '—';
  renderSrfCompatibilidadEnEl(
    elCesta,
    '<span class="rdwc-compat-text">' +
      chip(r.estado) +
      ' <strong>Cesta y rejilla</strong> · Ø <strong>' +
      (p.rimRecoMm != null ? p.rimMinMm + '–' + p.rimMaxMm : '—') +
      ' mm</strong> (reco. ' +
      (p.rimRecoMm != null ? p.rimRecoMm : '—') +
      ' mm) · alt. ~' +
      (p.heightRecoMm != null ? p.heightRecoMm : '—') +
      ' mm · sep. ~' +
      (p.sepRecoCm != null ? p.sepRecoCm : '—') +
      ' cm · actual Ø ' +
      rimAct +
      '.</span>',
    hayCultivo
  );
  srfRefreshAplicarRecoBtns(scope, r, hayCultivo);
}

function aplicarSrfRecoCultivo(scope) {
  const draft = srfDraftParaCompatibilidad(scope);
  const r = srfRecomendacionCultivoDesdeConfig(draft);
  if (!r || !r.perfil) return;
  const p = scope === 'setup' ? 'setup' : 'sys';
  const set = (suffix, val) => {
    const el = document.getElementById(p + 'Srf' + suffix);
    if (el && val != null) el.value = val;
  };
  set('ProfundidadCm', r.perfil.profRecoCm);
  set('BalsaGrosorMm', r.perfil.balsaRecoMm);
  set('EspaciamientoCm', r.perfil.sepRecoCm);
  if (scope === 'setup') onSetupSrfInput();
  else if (typeof srfRefreshSysFormLive === 'function') srfRefreshSysFormLive();
  if (typeof showToast === 'function') showToast('Profundidad, balsa y separación aplicadas', false);
}

function aplicarSrfRecoCesta(scope) {
  const draft = srfDraftParaCompatibilidad(scope);
  const r = srfRecomendacionCultivoDesdeConfig(draft);
  if (!r || !r.perfil) return;
  const p = scope === 'setup' ? 'setup' : 'sys';
  const set = (suffix, val) => {
    const el = document.getElementById(p + 'Srf' + suffix);
    if (el && val != null) el.value = val;
  };
  set('NetPotMm', r.perfil.rimRecoMm);
  set('NetPotHeightMm', r.perfil.heightRecoMm);
  if (scope === 'setup') onSetupSrfInput();
  else if (typeof srfRefreshSysFormLive === 'function') srfRefreshSysFormLive();
  if (typeof showToast === 'function') showToast('Cesta recomendada aplicada', false);
}

/** Comprueba si L×A del estanque alcanza para la rejilla de huecos (separación + Ø cesta). */
function srfValidarGeometriaBalsa(cfg) {
  cfg = srfEnsureConfigDefaults(cfg || {});
  const L = Number(cfg.srfCanalLargoCm);
  const W = Number(cfg.srfCanalAnchoCm);
  const sep = Number(cfg.srfEspaciamientoCm);
  const rimCm = Number(cfg.srfNetPotMm) / 10;
  if (!Number.isFinite(L) || !Number.isFinite(W) || L <= 0 || W <= 0) {
    return { ok: true, hint: '' };
  }
  const grid = srfDistribuirPlantas(cfg);
  const pot = Number.isFinite(rimCm) && rimCm > 0 ? rimCm : 5;
  const needL = grid.cols > 0 ? (grid.cols - 1) * sep + pot * grid.cols : pot;
  const needW = grid.rows > 0 ? (grid.rows - 1) * sep + pot * grid.rows : pot;
  const margen = 1.5;
  if (needL > L + margen || needW > W + margen) {
    return {
      ok: false,
      hint:
        'Huecos ' +
        grid.cols +
        '×' +
        grid.rows +
        ' con separación ' +
        sep +
        ' cm y Ø ~' +
        Math.round(pot * 10) +
        ' cm: la balsa necesita al menos ~' +
        Math.round(needL * 10) / 10 +
        '×' +
        Math.round(needW * 10) / 10 +
        ' cm; el estanque mide ' +
        L +
        '×' +
        W +
        ' cm.',
    };
  }
  return { ok: true, hint: '' };
}

function srfAreaCanalM2(cfg) {
  const L = Number(cfg.srfCanalLargoCm);
  const W = Number(cfg.srfCanalAnchoCm);
  if (!Number.isFinite(L) || !Number.isFinite(W) || L <= 0 || W <= 0) return null;
  return (L * W) / 10000;
}

/** FAO orientativo: ~4 L aire/min cada 24 m² de canal. */
function srfRecomendarAireLpm(cfg) {
  const area = srfAreaCanalM2(cfg);
  if (area == null || area <= 0) return { min: 4, reco: 8, fuerte: 14 };
  const base = (area / 24) * 4;
  return {
    min: Math.max(2, Math.round(base * 0.7 * 10) / 10),
    reco: Math.max(4, Math.round(base * 10) / 10),
    fuerte: Math.max(6, Math.round(base * 1.5 * 10) / 10),
  };
}

/** Caudal y potencia eléctrica orientativa de bomba de aire (acuario/hidro). */
function srfRecomendarBombaAire(cfg) {
  const lpm = srfRecomendarAireLpm(cfg);
  const wattsReco = Math.max(5, Math.ceil(lpm.reco * 1.75));
  const wattsMin = Math.max(3, Math.ceil(lpm.min * 1.5));
  const wattsFuerte = Math.ceil(lpm.fuerte * 2);
  return {
    lpmMin: lpm.min,
    lpmReco: lpm.reco,
    lpmFuerte: lpm.fuerte,
    wattsMin,
    wattsReco,
    wattsFuerte,
  };
}

function srfParseNum(id, min, max, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseFloat(String(el.value || '').replace(',', '.'));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function srfMergeCamposFormularioEnCfg(cfg, ids, opts) {
  cfg = cfg || {};
  ids = ids || SRF_FORM_IDS_SISTEMA;
  opts = opts || {};
  const applyDefaults = opts.applyDefaults !== false;
  const esSetupIds = ids === SRF_FORM_IDS_SETUP;
  const g = (id, key, parser) => {
    if (!ids.includes(id)) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      cfg[key] = !!el.checked;
      return;
    }
    const raw = String(el.value || '').trim();
    if (raw === '' && key !== 'srfObjetivoCultivo') return;
    if (parser) cfg[key] = parser(raw, el);
    else cfg[key] = raw;
  };
  g('setupSrfCanalLargoCm', 'srfCanalLargoCm', (v) =>
    srfParseNum('setupSrfCanalLargoCm', 20, 600, applyDefaults && esSetupIds ? cfg.srfCanalLargoCm : null)
  );
  g('sysSrfCanalLargoCm', 'srfCanalLargoCm', (v) => srfParseNum('sysSrfCanalLargoCm', 20, 600, cfg.srfCanalLargoCm));
  g('setupSrfCanalAnchoCm', 'srfCanalAnchoCm', (v) =>
    srfParseNum('setupSrfCanalAnchoCm', 20, 400, applyDefaults && esSetupIds ? cfg.srfCanalAnchoCm : null)
  );
  g('sysSrfCanalAnchoCm', 'srfCanalAnchoCm', (v) => srfParseNum('sysSrfCanalAnchoCm', 20, 400, cfg.srfCanalAnchoCm));
  g('setupSrfProfundidadCm', 'srfProfundidadCm', (v) =>
    srfParseNum('setupSrfProfundidadCm', 10, 50, applyDefaults && esSetupIds ? cfg.srfProfundidadCm : null)
  );
  g('sysSrfProfundidadCm', 'srfProfundidadCm', (v) => srfParseNum('sysSrfProfundidadCm', 10, 50, cfg.srfProfundidadCm));
  g('setupSrfFilas', 'srfFilas', (v) =>
    Math.round(srfParseNum('setupSrfFilas', 1, 8, applyDefaults && esSetupIds ? cfg.srfFilas || 2 : null))
  );
  g('sysSrfFilas', 'srfFilas', (v) => Math.round(srfParseNum('sysSrfFilas', 1, 8, cfg.srfFilas || 2)));
  g('setupSrfPlantasPorFila', 'srfPlantasPorFila', (v) =>
    Math.round(srfParseNum('setupSrfPlantasPorFila', 1, 16, applyDefaults && esSetupIds ? cfg.srfPlantasPorFila || 4 : null))
  );
  g('sysSrfPlantasPorFila', 'srfPlantasPorFila', (v) =>
    Math.round(srfParseNum('sysSrfPlantasPorFila', 1, 16, cfg.srfPlantasPorFila || 4))
  );
  g('sysSrfNumPlantas', 'srfNumPlantas', (v) => Math.round(srfParseNum('sysSrfNumPlantas', 1, 64, cfg.srfNumPlantas || 8)));
  g('setupSrfOxigenacionModo', 'srfOxigenacionModo', (v) => srfNormalizeOxigenacionModo(v));
  g('sysSrfOxigenacionModo', 'srfOxigenacionModo', (v) => srfNormalizeOxigenacionModo(v));
  g('setupSrfCirculante', 'srfCirculante');
  g('sysSrfCirculante', 'srfCirculante');
  g('setupSrfRecircLh', 'srfRecircLh', (v) => srfParseNum('setupSrfRecircLh', 0, 8000, cfg.srfRecircLh));
  g('sysSrfRecircLh', 'srfRecircLh', (v) => srfParseNum('sysSrfRecircLh', 0, 8000, cfg.srfRecircLh));
  g('setupSrfAirLpm', 'srfAirLpm', (v) => srfParseNum('setupSrfAirLpm', 0.5, 300, cfg.srfAirLpm));
  g('sysSrfAirLpm', 'srfAirLpm', (v) => srfParseNum('sysSrfAirLpm', 0.5, 300, cfg.srfAirLpm));
  g('setupSrfBalsaGrosorMm', 'srfBalsaGrosorMm', (v) =>
    srfParseNum('setupSrfBalsaGrosorMm', 15, 80, applyDefaults && esSetupIds ? cfg.srfBalsaGrosorMm : null)
  );
  g('sysSrfBalsaGrosorMm', 'srfBalsaGrosorMm', (v) => srfParseNum('sysSrfBalsaGrosorMm', 15, 80, cfg.srfBalsaGrosorMm));
  g('setupSrfNetPotMm', 'srfNetPotMm', (v) =>
    srfParseNum('setupSrfNetPotMm', 25, 120, applyDefaults && esSetupIds ? cfg.srfNetPotMm : null)
  );
  g('sysSrfNetPotMm', 'srfNetPotMm', (v) => srfParseNum('sysSrfNetPotMm', 25, 120, cfg.srfNetPotMm));
  g('setupSrfNetPotHeightMm', 'srfNetPotHeightMm', (v) =>
    srfParseNum('setupSrfNetPotHeightMm', 30, 200, applyDefaults && esSetupIds ? cfg.srfNetPotHeightMm : null)
  );
  g('sysSrfNetPotHeightMm', 'srfNetPotHeightMm', (v) => srfParseNum('sysSrfNetPotHeightMm', 30, 200, cfg.srfNetPotHeightMm));
  g('setupSrfEspaciamientoCm', 'srfEspaciamientoCm', (v) =>
    srfParseNum('setupSrfEspaciamientoCm', 8, 60, applyDefaults && esSetupIds ? cfg.srfEspaciamientoCm : null)
  );
  g('sysSrfEspaciamientoCm', 'srfEspaciamientoCm', (v) => srfParseNum('sysSrfEspaciamientoCm', 8, 60, cfg.srfEspaciamientoCm));
  g('setupSrfVolumenManualL', 'srfVolumenManualL', (v) => {
    const x = srfParseNum('setupSrfVolumenManualL', 1, 5000, null);
    return x != null ? x : null;
  });
  g('sysSrfVolumenManualL', 'srfVolumenManualL', (v) => {
    const x = srfParseNum('sysSrfVolumenManualL', 1, 5000, null);
    return x != null ? x : null;
  });
  g('setupSrfVolTrabajoL', 'volMezclaLitros', (v) => {
    const x = srfParseNum('setupSrfVolTrabajoL', 0.5, 5000, null);
    return x != null ? x : null;
  });
  g('sysSrfVolTrabajoL', 'volMezclaLitros', (v) => {
    const x = srfParseNum('sysSrfVolTrabajoL', 0.5, 5000, null);
    return x != null ? x : null;
  });
  g('setupSrfObjetivoCultivo', 'srfObjetivoCultivo', (v) => srfNormalizeObjetivoCultivo(v));
  g('sysSrfObjetivoCultivo', 'srfObjetivoCultivo', (v) => srfNormalizeObjetivoCultivo(v));
  g('setupSrfKratkyGapCm', 'srfKratkyGapCm', (v) => srfParseNum('setupSrfKratkyGapCm', 2, 40, cfg.srfKratkyGapCm));
  g('sysSrfKratkyGapCm', 'srfKratkyGapCm', (v) => srfParseNum('sysSrfKratkyGapCm', 2, 40, cfg.srfKratkyGapCm));
  if (cfg.srfOxigenacionModo === 'kratky') cfg.srfCirculante = false;
  if (!applyDefaults && esSetupIds) {
    cfg._srfSinRejillaExplicita = !srfFormInputTieneValor('setupSrfFilas') || !srfFormInputTieneValor('setupSrfPlantasPorFila');
  } else {
    delete cfg._srfSinRejillaExplicita;
  }
  if (applyDefaults) {
    srfEnsureConfigDefaults(cfg);
    const grid = srfDistribuirPlantas(cfg);
    cfg.srfFilas = grid.rows;
    cfg.srfPlantasPorFila = grid.cols;
    cfg.srfNumPlantas = grid.total;
    cfg.numNiveles = grid.rows;
    cfg.numCestas = grid.cols;
    if (srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo) === 'aireador') {
      const bomba = srfRecomendarBombaAire(cfg);
      if (ids === SRF_FORM_IDS_SETUP || !Number.isFinite(Number(cfg.srfAirLpm)) || Number(cfg.srfAirLpm) <= 0) {
        cfg.srfAirLpm = bomba.lpmReco;
      }
    }
  } else {
    const grid = srfDistribuirPlantas(cfg);
    if (grid.total > 0) {
      cfg.srfFilas = grid.rows;
      cfg.srfPlantasPorFila = grid.cols;
      cfg.srfNumPlantas = grid.total;
      cfg.numNiveles = grid.rows;
      cfg.numCestas = grid.cols;
    } else {
      delete cfg.srfFilas;
      delete cfg.srfPlantasPorFila;
      delete cfg.srfNumPlantas;
      delete cfg.numNiveles;
      delete cfg.numCestas;
    }
  }
  delete cfg._srfSinRejillaExplicita;
  return cfg;
}

function buildSrfConfigFromForm(scope, seed, opts) {
  const c = typeof hcSetupClonePlain === 'function' ? hcSetupClonePlain(seed || {}, {}) : { ...(seed || {}) };
  c.tipoInstalacion = 'srf';
  const ids = scope === 'sys' ? SRF_FORM_IDS_SISTEMA : SRF_FORM_IDS_SETUP;
  srfMergeCamposFormularioEnCfg(c, ids, opts);
  const cap = srfCapacidadLitrosDesdeConfig(c);
  if (cap != null) c.volDeposito = cap;
  return c;
}

function syncSrfFormDesdeConfig(cfg, scope) {
  cfg = srfEnsureConfigDefaults(hcSetupClonePlain(cfg || {}, {}) || {});
  const p = scope === 'sys' ? 'sysSrf' : 'setupSrf';
  const set = (suffix, val) => {
    const el = document.getElementById(p + suffix);
    if (!el || val == null) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val;
  };
  set('CanalLargoCm', cfg.srfCanalLargoCm);
  set('CanalAnchoCm', cfg.srfCanalAnchoCm);
  set('ProfundidadCm', cfg.srfProfundidadCm);
  set('Filas', cfg.srfFilas);
  set('PlantasPorFila', cfg.srfPlantasPorFila);
  const elPpf = document.getElementById(p + 'PlantasPorFila');
  if (!elPpf) set('NumPlantas', cfg.srfNumPlantas);
  set('OxigenacionModo', cfg.srfOxigenacionModo);
  set('Circulante', cfg.srfCirculante);
  set('RecircLh', cfg.srfRecircLh);
  set('AirLpm', cfg.srfAirLpm);
  set('BalsaGrosorMm', cfg.srfBalsaGrosorMm);
  set('NetPotMm', cfg.srfNetPotMm);
  set('NetPotHeightMm', cfg.srfNetPotHeightMm);
  set('EspaciamientoCm', cfg.srfEspaciamientoCm);
  set('VolumenManualL', cfg.srfVolumenManualL != null ? cfg.srfVolumenManualL : '');
  set('VolTrabajoL', cfg.volMezclaLitros != null ? cfg.volMezclaLitros : '');
  set('ObjetivoCultivo', cfg.srfObjetivoCultivo || '');
  set('KratkyGapCm', cfg.srfKratkyGapCm);
  srfRefreshOxigenacionUi(scope);
  return cfg;
}

/** Actualiza resumen y estado de cálculo del panel Cultivo (sin guardar). */
function srfRefreshSysFormLive() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'srf') return;
  let draft = state.configTorre;
  try {
    draft =
      typeof buildSrfConfigFromForm === 'function'
        ? buildSrfConfigFromForm('sys', hcSetupClonePlain(state.configTorre, {}) || {})
        : draft;
    if (typeof srfEnsureConfigDefaults === 'function') srfEnsureConfigDefaults(draft);
  } catch (_) {}
  try {
    if (typeof renderSrfCalculoStatus === 'function') renderSrfCalculoStatus(draft, 'sysSrfCalcStatus');
    if (typeof srfUpdateVolCapLabels === 'function') srfUpdateVolCapLabels(draft, 'sys');
    if (typeof renderSrfCultivoRecoStatus === 'function') renderSrfCultivoRecoStatus('sys');
  } catch (_) {}
  const res = document.getElementById('sistemaSrfResumen');
  if (res && typeof textoResumenSistemaSrfPanel === 'function') {
    res.textContent = textoResumenSistemaSrfPanel(draft);
  }
  try {
    if (typeof renderTorre === 'function') renderTorre();
  } catch (_) {}
}

function srfRefreshOxigenacionUi(scope) {
  const p = scope === 'sys' ? 'sys' : 'setup';
  const modo = srfNormalizeOxigenacionModo(document.getElementById(p + 'SrfOxigenacionModo')?.value);
  const circ = document.getElementById(p + 'SrfCirculanteWrap');
  const air = document.getElementById(p + 'SrfAirWrap');
  const kGap = document.getElementById(p + 'SrfKratkyGapWrap');
  const rec = document.getElementById(p + 'SrfRecircWrap');
  if (circ) circ.classList.toggle('setup-hidden', modo === 'kratky');
  if (rec) rec.classList.toggle('setup-hidden', modo === 'kratky' || !(document.getElementById(p + 'SrfCirculante')?.checked));
  if (air) air.classList.toggle('setup-hidden', modo === 'kratky');
  if (kGap) kGap.classList.toggle('setup-hidden', modo !== 'kratky');
}

function srfLitrosUtilesDesdeConfig(cfg) {
  cfg = cfg || state.configTorre || {};
  const seg = srfVolumenSeguroLitrosDesdeConfig(cfg);
  if (seg != null && seg > 0) return seg;
  const vMez =
    typeof getVolumenMezclaLitros === 'function'
      ? getVolumenMezclaLitros(cfg)
      : Number(cfg.volMezclaLitros);
  if (Number.isFinite(vMez) && vMez > 0) return Math.round(vMez * 10) / 10;
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  if (cap != null && cap > 0) return cap;
  return null;
}

function srfUpdateVolCapLabels(cfg, scope) {
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const util = srfLitrosUtilesDesdeConfig(cfg);
  const p = scope === 'sys' ? 'sysSrf' : 'setupSrf';
  const totalEl = document.getElementById(p + 'VolTotal');
  const utilEl = document.getElementById(p + 'VolOptimo');
  if (totalEl) totalEl.textContent = cap != null ? cap + ' L' : '—';
  if (utilEl) utilEl.textContent = util != null ? util + ' L' : '—';
}

function clearSetupVolMezclaSrfAutofill() {
  const inp = document.getElementById('setupVolMezclaL');
  if (!inp) return;
  const prevAuto = inp.getAttribute('data-hc-srf-mezcla-auto');
  if (prevAuto == null || prevAuto === '') return;
  const cur = parseFloat(String(inp.value || '').trim().replace(',', '.'));
  const autoN = parseFloat(String(prevAuto).replace(',', '.'));
  if (Number.isFinite(cur) && Number.isFinite(autoN) && Math.abs(cur - autoN) < 0.06) {
    inp.value = '';
  }
  inp.removeAttribute('data-hc-srf-mezcla-auto');
  const trab = document.getElementById('setupSrfVolTrabajoL');
  if (trab) {
    const prevT = trab.getAttribute('data-hc-srf-mezcla-auto');
    if (prevT != null && prevT !== '') {
      const curT = parseFloat(String(trab.value || '').trim().replace(',', '.'));
      const autoT = parseFloat(String(prevT).replace(',', '.'));
      if (Number.isFinite(curT) && Number.isFinite(autoT) && Math.abs(curT - autoT) < 0.06) {
        trab.value = '';
      }
      trab.removeAttribute('data-hc-srf-mezcla-auto');
    }
  }
}

/** Rellena litros útiles del estanque (setup) desde capacidad L×A×P si vacío o autocompletado. */
function srfRefreshSetupCalculadoUi() {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'srf') return;
  let draft = null;
  try {
    const seed =
      typeof hcFreshSrfSetupDefaults === 'function' ? hcFreshSrfSetupDefaults() : { tipoInstalacion: 'srf' };
    draft = buildSrfConfigFromForm('setup', seed, { applyDefaults: false });
  } catch (_) {}
  const litBlock = document.getElementById('setupSrfLitrosSolucionBlock');
  const litVal = document.getElementById('setupSrfLitrosSolucionValor');
  const litHint = document.getElementById('setupSrfLitrosSolucionHint');
  const bombaBlock = document.getElementById('setupSrfBombaRecoBlock');
  const bombaVal = document.getElementById('setupSrfBombaRecoValor');
  const bombaHint = document.getElementById('setupSrfBombaRecoHint');
  const cap = draft ? srfCapacidadLitrosDesdeConfig(draft) : null;
  const util = draft ? srfVolumenSeguroLitrosDesdeConfig(draft) : null;
  const desg = draft ? srfDesgloseVolumenLlenado(draft) : null;
  if (litBlock && litVal) {
    litBlock.classList.remove('setup-dwc-litros-solucion-block--pending', 'setup-dwc-litros-solucion-block--ok');
    if (util != null && util > 0) {
      litBlock.classList.add('setup-dwc-litros-solucion-block--ok');
      litVal.textContent = util + ' L';
      if (litHint && desg) {
        litHint.textContent =
          'Total geométrico ' +
          desg.cap +
          ' L · P ' +
          desg.P +
          ' cm − balsa ~' +
          desg.balsaCm +
          ' cm − cesta en agua ~' +
          desg.hang +
          ' cm − cámara aire ~' +
          desg.gap +
          ' cm → ~' +
          desg.hCol +
          ' cm útiles' +
          (desg.hPotMm != null ? ' (cesta ' + desg.hPotMm + ' mm' + (desg.rimMm != null ? ', Ø ' + desg.rimMm + ' mm' : '') + ')' : '') +
          '.';
      }
    } else if (cap != null) {
      litBlock.classList.add('setup-dwc-litros-solucion-block--pending');
      litVal.textContent = cap + ' L (completa cesta para llenado seguro)';
      if (litHint) litHint.textContent = 'Indica diámetro y profundidad de la cesta.';
    } else {
      litBlock.classList.add('setup-dwc-litros-solucion-block--pending');
      litVal.textContent = 'Completa medidas del estanque y de la cesta.';
      if (litHint) litHint.textContent = '';
    }
  }
  const modo = draft ? srfNormalizeOxigenacionModo(draft.srfOxigenacionModo) : 'aireador';
  if (bombaBlock) {
    if (modo === 'kratky') {
      bombaBlock.classList.add('setup-hidden');
    } else {
      bombaBlock.classList.remove('setup-hidden');
      const b = srfRecomendarBombaAire(draft || {});
      if (bombaVal) {
        bombaVal.textContent = b.lpmReco + ' L/min · ~' + b.wattsReco + ' W';
      }
      if (bombaHint) {
        bombaHint.textContent =
          'Rango orientativo ' +
          b.lpmMin +
          '–' +
          b.lpmFuerte +
          ' L/min (~' +
          b.wattsMin +
          '–' +
          b.wattsFuerte +
          ' W). DO &gt;4–5 mg/L en estanque común (~4 L/min por cada 24 m² de superficie).';
      }
    }
  }
  try {
    if (typeof renderSrfCalculoStatus === 'function') renderSrfCalculoStatus(draft, 'setupSrfCalcStatus');
  } catch (_) {}
}

function onSetupSrfInput() {
  try {
    if (typeof updateTorreBuilder === 'function') updateTorreBuilder();
  } catch (_) {}
  try {
    srfRefreshSetupCalculadoUi();
  } catch (_) {}
  try {
    renderSrfCultivoRecoStatus('setup');
  } catch (_) {}
}

function syncSetupVolMezclaSugeridoSrf(opts) {
  opts = opts || {};
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'srf') return;
  if (!srfSetupTieneEstanqueEnFormulario() && !opts.forceMezcla) return;
  try {
    srfRefreshSetupCalculadoUi();
  } catch (_) {}
  const draft =
    typeof buildSrfConfigFromForm === 'function'
      ? buildSrfConfigFromForm('setup', hcFreshSrfSetupDefaults ? hcFreshSrfSetupDefaults() : {}, { applyDefaults: false }) || {}
      : {};
  if (typeof srfEnsureConfigDefaults === 'function' && srfSetupFormularioCompleto()) {
    srfEnsureConfigDefaults(draft);
  }
  const util = srfVolumenSeguroLitrosDesdeConfig(draft);
  const cap = srfCapacidadLitrosDesdeConfig(draft);
  const vSeg = util != null && util > 0 ? util : cap;
  if (vSeg == null || !Number.isFinite(vSeg) || vSeg <= 0) return;
  const vClamped = Math.round(Math.min(vSeg, 5000) * 10) / 10;
  const applyAuto = (el, attr) => {
    if (!el) return;
    const prevAuto = el.getAttribute(attr);
    const cur = String(el.value || '').trim().replace(',', '.');
    const curN = cur ? parseFloat(cur) : NaN;
    const shouldApply =
      cur === '' ||
      (prevAuto != null &&
        prevAuto !== '' &&
        Number.isFinite(curN) &&
        Number.isFinite(Number(prevAuto)) &&
        Math.abs(curN - Number(prevAuto)) < 0.06);
    if (!shouldApply) return;
    el.value = String(vClamped);
    el.setAttribute(attr, String(vClamped));
  };
  applyAuto(document.getElementById('setupSrfVolTrabajoL'), 'data-hc-srf-mezcla-auto');
  const inp = document.getElementById('setupVolMezclaL');
  if (inp) {
    const prevAuto = inp.getAttribute('data-hc-srf-mezcla-auto');
    const cur = String(inp.value || '').trim().replace(',', '.');
    const curN = cur ? parseFloat(cur) : NaN;
    const shouldApply =
      cur === '' ||
      (prevAuto != null &&
        prevAuto !== '' &&
        Number.isFinite(curN) &&
        Number.isFinite(Number(prevAuto)) &&
        Math.abs(curN - Number(prevAuto)) < 0.06);
    if (shouldApply) {
      inp.value = String(vClamped);
      inp.setAttribute('data-hc-srf-mezcla-auto', String(vClamped));
      try {
        if (typeof onSetupVolMezclaInput === 'function') onSetupVolMezclaInput();
      } catch (_) {}
    }
  }
  srfUpdateVolCapLabels(draft, 'setup');
}

/** Bloque fijo para checklist SRF: llenado seguro vs capacidad geométrica. */
function srfEstanqueChecklistResumenHtml(cfg) {
  cfg = srfEnsureConfigDefaults(cfg || state.configTorre || {});
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const util = srfVolumenSeguroLitrosDesdeConfig(cfg);
  const vUser = Number(cfg.volDeposito);
  const vAct =
    Number.isFinite(vUser) && vUser > 0 ? Math.round(vUser * 10) / 10 : null;
  if (cap == null && util == null && vAct == null) {
    return '<p class="cl-srf-estanque-rec">Completa medidas del estanque y de la cesta en Cultivo e instalación o en el asistente.</p>';
  }
  let main = '<strong>Estanque:</strong> ';
  if (util != null && util > 0) {
    main +=
      'llenado seguro orientativo <strong>' +
      util +
      ' L</strong> (cámara de aire + cesta)';
    if (cap != null && cap > util + 0.5) {
      main += ' · capacidad geométrica ~<strong>' + cap + ' L</strong>';
    }
  } else if (cap != null) {
    main += 'capacidad geométrica ~<strong>' + cap + ' L</strong> (completa cesta para llenado seguro)';
  } else {
    main += 'indica medidas del estanque y de la cesta';
  }
  if (vAct != null) {
    main += ' · configurado: <strong>' + vAct + ' L</strong>';
    if (util != null && vAct < util - 0.5) {
      main += ' <span class="nft-verdict-warn">(por debajo del llenado seguro)</span>';
    } else if (util != null && vAct >= util - 0.5) {
      main += ' <span class="nft-verdict-ok">(coherente con llenado seguro)</span>';
    }
  }
  return (
    '<div class="cl-srf-estanque-rec" role="status">' +
    '<p class="cl-srf-estanque-rec-main">' +
    main +
    '.</p>' +
    '<p class="cl-srf-estanque-rec-foot">Las dosis del checklist usan el llenado seguro (o los litros que indiques en PC·1 si rellenas menos).</p>' +
    '</div>'
  );
}

function renderSrfCalculoStatus(cfg, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  cfg = srfEnsureConfigDefaults(cfg || state.configTorre || {});
  const grid = srfDistribuirPlantas(cfg);
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  const util = srfLitrosUtilesDesdeConfig(cfg);
  const modo = srfNormalizeOxigenacionModo(cfg.srfOxigenacionModo);
  const bomba = srfRecomendarBombaAire(cfg);
  let html =
    'Rejilla <strong>' +
    grid.rows +
    ' filas × ' +
    grid.cols +
    ' plantas/fila</strong> (' +
    grid.total +
    ' huecos) · estanque ~<strong>' +
    (cap != null ? cap + ' L' : '—') +
    '</strong>' +
    (util != null ? ' · llenado seguro <strong>' + util + ' L</strong>' : '');
  if (modo === 'kratky') {
    html += ' · <strong>Kratky</strong> (sin bomba de aire)';
  } else {
    html +=
      ' · bomba ~<strong>' +
      bomba.lpmReco +
      ' L/min</strong>, ~<strong>' +
      bomba.wattsReco +
      ' W</strong>';
  }
  el.innerHTML = html;
}

function renderSrfSetupPreview(previewEl, cfg) {
  if (!previewEl) return;
  cfg = srfEnsureConfigDefaults(cfg || {});
  const grid = srfDistribuirPlantas(cfg);
  previewEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'srf-setup-preview-wrap';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Balsa ' + grid.rows + ' filas por ' + grid.cols + ' plantas');
  const canal = document.createElement('div');
  canal.className = 'srf-setup-canal';
  const raft = document.createElement('div');
  raft.className = 'srf-setup-raft';
  raft.style.gridTemplateColumns = 'repeat(' + grid.cols + ', minmax(0, 1fr))';
  raft.style.gridTemplateRows = 'repeat(' + grid.rows + ', minmax(0, 1fr))';
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const h = document.createElement('div');
      h.className = 'srf-setup-hole';
      raft.appendChild(h);
    }
  }
  canal.appendChild(raft);
  wrap.appendChild(canal);
  const cap = document.createElement('div');
  cap.className = 'dwc-setup-lid-caption';
  cap.textContent = grid.rows + '×' + grid.cols + ' (' + grid.total + ' huecos)';
  wrap.appendChild(cap);
  previewEl.appendChild(wrap);
}

function textoResumenSistemaSrfPanel(cfg) {
  cfg = srfEnsureConfigDefaults(cfg || state.configTorre || {});
  const n = srfGetNumPlantas(cfg);
  const cap = srfCapacidadLitrosDesdeConfig(cfg);
  return n + ' plantas · estanque ~' + (cap != null ? cap + ' L' : '—');
}

function aplicarSistemaSrfDesdeFormulario() {
  initTorres();
  const idxAct = state.torreActiva || 0;
  const slotAct = state.torres && state.torres[idxAct] ? state.torres[idxAct] : null;
  const tipoPrevio = tipoInstalacionNormalizado((slotAct && slotAct.config) || state.configTorre || {});
  if (slotAct && slotAct.config && slotAct.config.tipoInstalacion && tipoPrevio !== 'srf') {
    showToast('Esta instalación no es SRF. Para crear un SRF nuevo usa "Nueva instalación" o el asistente.', true);
    try {
      syncSrfFormDesdeConfig(slotAct.config, 'sys');
    } catch (_) {}
    return;
  }
  if (typeof hcCapturarSnapshotSeguridadTorre === 'function') {
    hcCapturarSnapshotSeguridadTorre(idxAct, 'srf-system-save');
  }
  const c = state.configTorre || (state.configTorre = {});
  c.tipoInstalacion = 'srf';
  Object.assign(c, buildSrfConfigFromForm('sys', c));
  srfEnsureConfigDefaults(c);
  const grid = srfDistribuirPlantas(c);
  c.numNiveles = grid.rows;
  c.numCestas = grid.cols;
  const cap = srfCapacidadLitrosDesdeConfig(c);
  if (cap != null) c.volDeposito = cap;
  try {
    if (typeof redimensionarMatrizTorreDwcPreservando === 'function') {
      redimensionarMatrizTorreDwcPreservando(c, c.numNiveles, c.numCestas);
    }
  } catch (_) {}
  if (c.nutriente) c.checklistInstalacionConfirmada = true;
  c.uiSistemaSrfColapsado = true;
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try {
    applySistemaTipoPanelesColapsablesUI();
  } catch (_) {}
  try {
    renderTorreSistemaResumenTabla(c);
  } catch (_) {}
  try {
    actualizarHeaderTorre();
  } catch (_) {}
  try {
    actualizarBadgesNutriente();
  } catch (_) {}
  try {
    updateDashboard();
  } catch (_) {}
  renderSrfCalculoStatus(c, 'sysSrfCalcStatus');
  const res = document.getElementById('sistemaSrfResumen');
  if (res) res.textContent = textoResumenSistemaSrfPanel(c);
  showToast('Datos SRF guardados', false);
}
