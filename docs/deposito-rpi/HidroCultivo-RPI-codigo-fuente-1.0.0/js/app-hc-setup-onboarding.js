/**
 * setupData, onboarding setup (plantas, resumen, agua/sustrato).
 * Tras app-hc-medicion-toast.js. Siguiente: app-hc-torres-badges-notifs.js.
 */
// ══════════════════════════════════════════════════
// SETUP ONBOARDING — nuevos pasos
// ══════════════════════════════════════════════════

// Estado temporal del setup
const setupData = {
  agua: 'destilada',
  sustrato: 'lana',
  ubicacion: 'exterior',
  luz: 'led',
  horasLuz: 16,
  consejosModoUi: 'principiante',
  ciudad: null,
  lat: null,
  lon: null,
  sensoresHardware: { ec: false, ph: false, humedad: false },
};

// ══ Setup páginas 6 y 7 ══════════════════════════
let setupPlantasSeleccionadas = new Set();
let setupNumTorres = 'una';

const SETUP_CESTA_VAR_MAX_CELDAS = 200;
let _setupCestaVariedadCells = null;
let _setupCestaVarDraftFil = 0;
let _setupCestaVarDraftCols = 0;

function resetSetupCestaVariedadDraft() {
  _setupCestaVariedadCells = null;
  _setupCestaVarDraftFil = 0;
  _setupCestaVarDraftCols = 0;
}

/**
 * Estado transitorio del asistente a cero (nueva instalación o al cerrar).
 * No toca state.torres ni la instalación activa en memoria.
 */
function hcResetSetupWizardSession(opts) {
  opts = opts || {};
  setupPlantasSeleccionadas = new Set();
  resetSetupCestaVariedadDraft();
  setupNombreNuevaTorre = '';
  setupNumTorres = 'una';
  setupData.agua = 'destilada';
  setupData.sustrato = 'lana';
  setupData.ubicacion = 'exterior';
  setupData.luz = 'led';
  setupData.horasLuz = 16;
  setupData.ciudad = null;
  setupData.lat = null;
  setupData.lon = null;
  setupData.sensoresHardware = { ec: false, ph: false, humedad: false };
  setupData.consejosModoUi = 'principiante';
  setupCoordenadas = { lat: null, lon: null, ciudad: '' };
  setupNutriente = 'canna_aqua';
  setupUbicacion = 'exterior';
  if (typeof setupRdwcDraft !== 'undefined') setupRdwcDraft = null;
  try {
    delete window._hcPostSetupPrevListo;
    delete window._hcChecklistGuidedFlow;
  } catch (_) {}
  if (!opts.keepNuevaFlag) {
    setupEsNuevaTorre = false;
  }
  if (!opts.keepPagina) {
    setupPagina = 0;
  }
  const info = document.getElementById('setupPlantasSeleccionadas');
  const texto = document.getElementById('setupPlantasTexto');
  if (info) info.classList.add('setup-hidden');
  if (texto) texto.textContent = '—';
  const dosisDiv = document.getElementById('dosisSegunCultivo');
  if (dosisDiv) dosisDiv.classList.add('setup-hidden');
  const dosisText = document.getElementById('dosisSegunCultivoTexto');
  if (dosisText) dosisText.innerHTML = '';
}

function getSetupPlantasFilasCols() {
  const t = typeof setupTipoInstalacion !== 'undefined' ? setupTipoInstalacion : 'torre';
  if (t === 'nft') {
    const mont =
      typeof readNftMontajeFromSetupUi === 'function'
        ? readNftMontajeFromSetupUi()
        : { disposicion: 'mesa', escaleraCaras: 1, mesaMultinivel: false, mesaTubosStr: '' };
    let nftNvSlider = parseInt(document.getElementById('sliderNftCanales')?.value || 0, 10);
    const huecos = parseInt(document.getElementById('sliderNftHuecos')?.value || 0, 10);
    if (nftNvSlider < 1 || huecos < 1) {
      return { filas: 0, cols: 0, labelFila: 'Tubo', labelCol: 'Hueco' };
    }
    let niveles = Math.max(1, Math.min(24, nftNvSlider));
    let colsHuecos = Math.max(1, Math.min(30, huecos));
    if (mont.disposicion === 'mesa' && mont.mesaMultinivel && typeof parseNftMesaTubosPorNivelStr === 'function') {
      const tiers = parseNftMesaTubosPorNivelStr(mont.mesaTubosStr || '');
      if (tiers.length >= 2) {
        niveles = Math.min(24, tiers.reduce((a, b) => a + b, 0));
        const hxT = typeof parseNftMesaHuecosPorNivelStrLoose === 'function'
          ? parseNftMesaHuecosPorNivelStrLoose(mont.mesaHuecosStr || '')
          : [];
        const hxPos = hxT.filter(h => h > 0);
        if (hxPos.length) colsHuecos = Math.max(1, Math.min(30, Math.max.apply(null, hxPos)));
      }
    } else if (mont.disposicion === 'escalera') {
      const caras = mont.escaleraCaras === 2 ? 2 : 1;
      niveles = Math.min(24, Math.max(1, nftNvSlider * caras));
    }
    return {
      filas: niveles,
      cols: colsHuecos,
      labelFila: 'Tubo',
      labelCol: 'Hueco',
    };
  }
  if (t === 'rdwc') {
    const sitesRaw = parseInt(String(document.getElementById('setupRdwcSites')?.value || '').trim(), 10);
    const rowsRaw = parseInt(String(document.getElementById('setupRdwcRows')?.value || '').trim(), 10);
    if (!Number.isFinite(sitesRaw) || sitesRaw < 2 || !Number.isFinite(rowsRaw) || rowsRaw < 1) {
      return { filas: 0, cols: 0, labelFila: 'Fila', labelCol: 'Sitio' };
    }
    const sites = Math.max(2, Math.min(64, sitesRaw));
    const rows = Math.max(1, Math.min(4, rowsRaw));
    const cols = Math.max(1, Math.ceil(sites / rows));
    return { filas: rows, cols, labelFila: 'Fila', labelCol: 'Sitio' };
  }
  if (t === 'srf') {
    const filas = parseInt(String(document.getElementById('setupSrfFilas')?.value || '').trim(), 10);
    const cols = parseInt(String(document.getElementById('setupSrfPlantasPorFila')?.value || '').trim(), 10);
    if (!Number.isFinite(filas) || filas < 1 || !Number.isFinite(cols) || cols < 1) {
      return { filas: 0, cols: 0, labelFila: 'Fila', labelCol: 'Hueco' };
    }
    return {
      filas: Math.max(1, Math.min(8, filas)),
      cols: Math.max(1, Math.min(16, cols)),
      labelFila: 'Fila',
      labelCol: 'Hueco',
    };
  }
  if (t === 'dwc') {
    const filasD = parseInt(document.getElementById('sliderNiveles')?.value || '0', 10);
    const colsD = parseInt(document.getElementById('sliderCestas')?.value || '0', 10);
    const oxRaw = document.getElementById('setupDwcOxigenacionDiseno')?.value;
    if (typeof dwcNormalizeOxigenacionDiseno === 'function' && dwcNormalizeOxigenacionDiseno(oxRaw) === 'cubos_independientes') {
      const nc = parseInt(String(document.getElementById('setupDwcNumCubos')?.value || '').trim(), 10);
      if (!Number.isFinite(nc) || nc < 1) {
        return { filas: 0, cols: 0, labelFila: 'Cubo', labelCol: 'Maceta' };
      }
      const nCub = Math.min(24, Math.max(1, nc));
      return { filas: 1, cols: nCub, labelFila: 'Cubo', labelCol: 'Maceta' };
    }
    if (filasD < 1 || colsD < 1) {
      return { filas: 0, cols: 0, labelFila: 'Fila', labelCol: 'Maceta' };
    }
    return {
      filas: Math.max(1, filasD),
      cols: Math.max(1, colsD),
      labelFila: 'Fila',
      labelCol: 'Maceta',
    };
  }
  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 0, 10);
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 0, 10);
  if (niveles < 1 || cestas < 1) {
    return {
      filas: 0,
      cols: 0,
      labelFila: t === 'dwc' ? 'Fila' : 'Nivel',
      labelCol: 'Cesta',
    };
  }
  return {
    filas: niveles,
    cols: cestas,
    labelFila: t === 'dwc' ? 'Fila' : 'Nivel',
    labelCol: 'Cesta',
  };
}

function asegurarSetupCestaVarDraftDims(filas, cols) {
  if (_setupCestaVariedadCells && _setupCestaVarDraftFil === filas && _setupCestaVarDraftCols === cols) {
    return;
  }
  const prev = _setupCestaVariedadCells || [];
  const next = [];
  for (let i = 0; i < filas; i++) {
    next[i] = [];
    for (let j = 0; j < cols; j++) {
      next[i][j] = prev[i] && prev[i][j] ? prev[i][j] : '';
    }
  }
  _setupCestaVariedadCells = next;
  _setupCestaVarDraftFil = filas;
  _setupCestaVarDraftCols = cols;
}

function buildSetupCultivoSelectOptionsHtml(selectedId) {
  let html = '<option value="">— Vacío —</option>';
  Object.keys(GRUPOS_CULTIVO).forEach(gk => {
    const list = CULTIVOS_DB.filter(c => c.grupo === gk);
    if (!list.length) return;
    const lab = GRUPOS_CULTIVO[gk].nombre || gk;
    const labAttr = escHtmlUi(lab).replace(/"/g, '&quot;');
    html += '<optgroup label="' + labAttr + '">';
    list.forEach(c => {
      const sel = c.id === selectedId ? ' selected' : '';
      html += '<option value="' + c.id + '"' + sel + '>' + (c.emoji ? c.emoji + ' ' : '') + escHtmlUi(c.nombre) + '</option>';
    });
    html += '</optgroup>';
  });
  return html;
}

function setupOnCestaVariedadChange(n, c, selEl) {
  const dims = getSetupPlantasFilasCols();
  asegurarSetupCestaVarDraftDims(dims.filas, dims.cols);
  if (_setupCestaVariedadCells[n] && _setupCestaVariedadCells[n][c] !== undefined) {
    _setupCestaVariedadCells[n][c] = selEl.value || '';
  }
}

function renderSetupCestasVariedadGrid() {
  const wrap = document.getElementById('setupCestasVariedadesWrap');
  const titleEl = document.getElementById('setupCestasVariedadesTitle');
  const hintEl = document.getElementById('setupCestasVariedadesHint');
  const gridHost = document.getElementById('setupCestasVariedadesGrid');
  if (!wrap || !gridHost) return;
  const dims = getSetupPlantasFilasCols();
  const total = dims.filas * dims.cols;
  if (total < 1) {
    wrap.classList.remove('setup-hidden');
    if (titleEl) titleEl.textContent = 'Cultivos en el esquema (después del asistente)';
    const bloque =
      setupTipoInstalacion === 'srf'
        ? 'filas y plantas por fila en el bloque SRF'
        : setupTipoInstalacion === 'nft'
          ? 'tubos y huecos en el bloque NFT'
          : setupTipoInstalacion === 'rdwc'
            ? 'sitios y filas en el bloque RDWC'
            : setupTipoInstalacion === 'dwc'
              ? 'medidas del cubo, cesta y rejilla en el bloque DWC'
              : 'niveles y cestas en la torre';
    gridHost.innerHTML =
      '<p class="setup-cesta-var-too-many">Completa <strong>' +
      bloque +
      '</strong>. Tras guardar, asigna cada variedad en el <strong>esquema</strong> de Cultivo e instalación.</p>';
    if (hintEl) hintEl.textContent = '';
    return;
  }
  if (total > SETUP_CESTA_VAR_MAX_CELDAS) {
    wrap.classList.remove('setup-hidden');
    if (titleEl) titleEl.textContent = 'Asignación por cesta o hueco';
    gridHost.innerHTML =
      '<p class="setup-cesta-var-too-many">Con tu diseño actual hay más de ' +
      SETUP_CESTA_VAR_MAX_CELDAS +
      ' posiciones. Tras guardar, asigna variedad en cada cesta desde <strong>Cultivo e instalación</strong>.</p>';
    if (hintEl) hintEl.textContent = '';
    return;
  }
  asegurarSetupCestaVarDraftDims(dims.filas, dims.cols);
  wrap.classList.remove('setup-hidden');
  if (titleEl) {
    titleEl.textContent =
      'Variedad por ' +
      dims.labelFila.toLowerCase() +
      ' y ' +
      dims.labelCol.toLowerCase() +
      ' (opcional)';
  }
  if (hintEl) {
    const esMcGrid =
      setupTipoInstalacion === 'dwc' &&
      dims.filas === 1 &&
      dims.labelFila === 'Cubo';
    hintEl.textContent = esMcGrid
      ? 'Una maceta por cubo: lo que elijas aquí coincide con el esquema de Cultivo. «Vacío» = cubo sin planta aún. Con variedad, fecha de hoy como trasplante (editable en la ficha).'
      : 'Misma rejilla que verás en Cultivo: lo que elijas aquí queda en el esquema. Las cestas sin cultivo déjalas en «Vacío». Si pones variedad, al guardar usamos la fecha de hoy como trasplante al hidro (puedes cambiarla en la ficha). Los botones de arriba son solo grupos (orientan EC y resumen), no sustituyen a la variedad por cesta.';
  }
  let html = '<div class="setup-cesta-var-row setup-cesta-var-row--head">';
  html += '<span class="setup-cesta-var-rowh" aria-hidden="true"></span>';
  for (let c = 0; c < dims.cols; c++) {
    html += '<span class="setup-cesta-var-colh">' + (c + 1) + '</span>';
  }
  html += '</div>';
  for (let n = 0; n < dims.filas; n++) {
    html += '<div class="setup-cesta-var-row">';
    html += '<span class="setup-cesta-var-rowh">' + escHtmlUi(dims.labelFila) + ' ' + (n + 1) + '</span>';
    for (let c = 0; c < dims.cols; c++) {
      const cur = (_setupCestaVariedadCells[n] || [])[c] || '';
      const opts = buildSetupCultivoSelectOptionsHtml(cur);
      html +=
        '<select class="setup-cesta-var-select" ' +
        'aria-label="' +
        escAriaAttr(dims.labelFila + ' ' + (n + 1) + ', ' + dims.labelCol + ' ' + (c + 1)) +
        '" onchange="setupOnCestaVariedadChange(' +
        n +
        ',' +
        c +
        ',this)">' +
        opts +
        '</select>';
    }
    html += '</div>';
  }
  gridHost.innerHTML = html;
}

function aplicarSetupCestaVariedadDraftATorre(torreArr, filas, cols) {
  if (!torreArr || !_setupCestaVariedadCells) return;
  for (let n = 0; n < filas && n < torreArr.length; n++) {
    const row = torreArr[n];
    if (!row) continue;
    for (let c = 0; c < cols && c < row.length; c++) {
      const vid = (_setupCestaVariedadCells[n] || [])[c];
      if (!vid || typeof row[c] !== 'object') continue;
      row[c].variedad = vid;
    }
  }
}

function renderSetupPlantasGrid() {
  const grid = document.getElementById('setupPlantasGrid');
  if (!grid) return;

  // Grupos principales aptos para inicio
  const grupos = [
    { key:'lechugas',  label:'Lechugas',      desc:'Fácil · 40-60 días' },
    { key:'asiaticas', label:'Asiáticas',     desc:'Fácil · 35-40 días' },
    { key:'hojas',     label:'Hojas verdes',  desc:'Fácil · 30-55 días' },
    { key:'hierbas',   label:'Hierbas',       desc:'Media · 30-90 días' },
    { key:'fresas',    label:'Fresas',        desc:'Media · 90 días' },
    { key:'frutos',    label:'Frutos',        desc:'Avanzado · Torre dedicada' },
    { key:'raices',    label:'Raíces',        desc:'Media · sustrato profundo' },
    { key:'microgreens', label:'Microgreens', desc:'Rápido · 7-14 días' },
  ];

  grid.innerHTML = grupos.map(g => {
    const sel = setupPlantasSeleccionadas.has(g.key);
    return '<button type="button" class="spc' + (sel ? ' spc--selected' : '') + '" data-gkey="' + g.key + '" ' +
      'aria-pressed="' + (sel ? 'true' : 'false') + '" ' +
      'aria-label="' + escAriaAttr(g.label + '. ' + g.desc) + '">' +
      grupoEmojiHtml(g.key) +
      '<span class="spc-label">' + g.label + '</span>' +
      '<span class="spc-desc">' + g.desc + '</span>' +
      (sel ? '<span class="spc-check" aria-hidden="true">✅</span>' : '') +
      '</button>';
  }).join('');

  grid.querySelectorAll('.spc').forEach(el => {
    el.addEventListener('click', function() {
      toggleSetupPlanta(this.getAttribute('data-gkey'));
    });
  });

  // Actualizar resumen
  const info = document.getElementById('setupPlantasSeleccionadas');
  const texto = document.getElementById('setupPlantasTexto');
  if (setupPlantasSeleccionadas.size > 0) {
    info.classList.remove('setup-hidden');
    texto.textContent = [...setupPlantasSeleccionadas].map(k =>
      grupos.find(g => g.key === k)?.label || k
    ).join(', ');

    // Mostrar EC objetivo y dosis calculadas
    const ecObj = getSetupECObjetivo();
    const volMax = getSetupVolumenMaxLitros();
    const vol = volMax > 0 ? getSetupVolumenMezclaLitros() : 0;
    const volDosisGrp =
      typeof getSetupVolumenNutrientesLitros === 'function' ? getSetupVolumenNutrientesLitros() : vol;
    const d      = calcularDosisSetup(setupNutriente, volDosisGrp, ecObj);
    const nut   = d.nut;
    const dosisDiv  = document.getElementById('dosisSegunCultivo');
    const dosisText = document.getElementById('dosisSegunCultivoTexto');
    if (dosisDiv && dosisText && volMax > 0) {
      dosisDiv.classList.remove('setup-hidden');
      const orden = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A','Parte B','Parte C'];
      const dwcMcGrp =
        setupTipoInstalacion === 'dwc' &&
        typeof dwcNormalizeOxigenacionDiseno === 'function' &&
        dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value) ===
          'cubos_independientes';
      const volLbl = dwcMcGrp
        ? volMax + ' L ref. · ~' + Math.round(volDosisGrp * 10) / 10 + ' L/cubo (dosis)'
        : volMax + ' L máx' + (vol < volMax - 0.05 ? ' · mezcla ' + vol + ' L' : '');
      let txt = '📦 ' + volLbl + ' · ⚡ EC ' + ecObj.min + '–' + ecObj.max + ' µS/cm<br>';
      if (d.mlCalMag > 0) txt += '• CalMag: <strong>' + d.mlCalMag + ' ml</strong><br>';
      // Mostrar TODAS las partes del nutriente
      if (nut.partes === 1) {
        txt += '• ' + orden[0] + ': <strong>' + d.mlAB + ' ml</strong><br>';
      } else if (nut.partes === 2) {
        txt += '• ' + orden[0] + ': <strong>' + d.mlAB + ' ml</strong><br>';
        txt += '• ' + orden[1] + ': <strong>' + d.mlAB + ' ml</strong><br>';
      } else if (nut.partes === 3) {
        txt += '• ' + orden[0] + ': <strong>' + d.mlAB + ' ml</strong><br>';
        txt += '• ' + orden[1] + ': <strong>' + d.mlAB + ' ml</strong><br>';
        txt += '• ' + orden[2] + ': <strong>' + d.mlAB + ' ml</strong><br>';
      }
      const phR = typeof torreGetPhRangoObjetivo === 'function'
        ? torreGetPhRangoObjetivo(nut, state.configTorre || {})
        : [nut.pHRango?.[0] || 5.5, nut.pHRango?.[1] || 6.5];
      txt += '• pH objetivo: <strong>' + phR[0] + '–' + phR[1] + '</strong>';
      if (ecObj.advertencia) txt += '<br><span class="setup-ec-warn">⚠️ Cultivos con EC distinta — ajustar por torre</span>';
      dosisText.innerHTML = txt;
    }
  } else {
    info.classList.add('setup-hidden');
    const dosisDiv = document.getElementById('dosisSegunCultivo');
    if (dosisDiv) dosisDiv.classList.add('setup-hidden');
  }
  renderSetupCestasVariedadGrid();
}

function toggleSetupPlanta(key) {
  if (setupPlantasSeleccionadas.has(key)) {
    setupPlantasSeleccionadas.delete(key);
  } else {
    setupPlantasSeleccionadas.add(key);
  }
  renderSetupPlantasGrid();
  // Recalcular dosis con los cultivos actualizados
  renderDosisSetup();
  if (typeof setupTipoInstalacion !== 'undefined') {
    try {
      if (setupTipoInstalacion === 'nft' && typeof renderNftCultivoRecoStatus === 'function') {
        renderNftCultivoRecoStatus('setup');
      }
      if (setupTipoInstalacion === 'srf' && typeof renderSrfCultivoRecoStatus === 'function') {
        renderSrfCultivoRecoStatus('setup');
      }
    } catch (_) {}
  }
}

function seleccionarNumTorres(tipo) {
  setupNumTorres = tipo;
  ['torreSolo','torreVarias'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('selected');
  });
  const map = { una:'torreSolo', varias:'torreVarias' };
  document.getElementById(map[tipo])?.classList.add('selected');
  const info = document.getElementById('infoVarTorres');
  if (info) info.style.display = tipo === 'varias' ? 'block' : 'none';
  actualizarResumenSetup();
}

function actualizarResumenSetup() {
  const el = document.getElementById('setupResumenContent');
  if (!el) return;
  const isNft = setupTipoInstalacion === 'nft';
  const isDwc = setupTipoInstalacion === 'dwc';
  const dwcMcSetup =
    isDwc &&
    typeof dwcNormalizeOxigenacionDiseno === 'function' &&
    dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value) ===
      'cubos_independientes';
  const niveles = isNft
    ? (document.getElementById('sliderNftCanales')?.value || 4)
    : dwcMcSetup
      ? '1'
      : (document.getElementById('sliderNiveles')?.value || 5);
  const cestas = isNft
    ? (document.getElementById('sliderNftHuecos')?.value || 8)
    : dwcMcSetup
      ? String(
          Math.min(
            24,
            Math.max(
              1,
              parseInt(String(document.getElementById('setupDwcNumCubos')?.value || '').trim(), 10) || 4
            )
          )
        )
      : (document.getElementById('sliderCestas')?.value || 5);
  const pendTxt = isNft ? (document.getElementById('sliderNftPendiente')?.value || 2) + '% pendiente · ' : '';
  const volMax  = getSetupVolumenMaxLitros();
  const volMez  = getSetupVolumenMezclaLitros();
  const volTxtResume = volMez < volMax - 0.05 ? volMax + 'L máx · mezcla ' + volMez + 'L' : volMax + 'L';
  const nut     = NUTRIENTES_DB.find(n => n.id === (window.setupNutriente || 'canna_aqua'));
  const ubic    = setupData.ubicacion || window.setupUbicacion || 'exterior';
  const luzResumenTxt = {
    natural: 'Luz natural (ventana)', led: 'LED', mixto: 'Natural + LED (ventana + artificial)',
    fluorescente: 'Fluorescente T5', hps: 'HPS / HM', sin_luz: 'Sin luz adecuada'
  }[setupData.luz || 'led'] || 'LED';
  const hLuzRes = Math.max(12, Math.min(20, parseInt(String(setupData.horasLuz || 16), 10) || 16));
  const grupos  = ['lechugas','asiaticas','hojas','hierbas','fresas','frutos','raices','microgreens'];
  const plantasNombres = {
    lechugas:'Lechugas', asiaticas:'Asiáticas', hojas:'Hojas verdes',
    hierbas:'Hierbas', fresas:'Fresas', frutos:'Frutos', raices:'Raíces', microgreens:'Microgreens',
  };
  const plantasSel = [...setupPlantasSeleccionadas].map(k => plantasNombres[k]||k).join(', ') || 'Sin seleccionar';

  const ecObj  = getSetupECObjetivo();
  const montR = isNft ? readNftMontajeFromSetupUi() : { disposicion: 'mesa', alturaBombeoCm: 0 };
  const draftNFT = isNft ? buildNftDraftConfigFromSetupUi() : null;
  const hydNFT = isNft ? getNftHidraulicaDesdeConfig(draftNFT) : null;
  const bResumenNft = isNft ? getNftBombaDesdeConfig(draftNFT) : null;
  const altResNFT = isNft ? getNftAlturaBombeoEfectivaCm(draftNFT) : 0;
  const potNft =
    isNft && typeof readNftPotCestaFromSetupUi === 'function' ? readNftPotCestaFromSetupUi() : { rimMm: null, heightMm: null };
  const volDosis =
    typeof getSetupVolumenNutrientesLitros === 'function' ? getSetupVolumenNutrientesLitros() : volMez;
  const d      = calcularDosisSetup(window.setupNutriente || 'canna_aqua', volDosis, ecObj);
  const ordenR = (d.nut.orden && d.nut.orden.length >= d.nut.partes) ? d.nut.orden : ['Parte A','Parte B','Parte C'];

  let dosisHtml = '';
  if (d.mlCalMag > 0) dosisHtml += 'CalMag ' + d.mlCalMag + 'ml · ';
  // Todas las partes siempre explícitas
  if (d.nut.partes === 1) {
    dosisHtml += ordenR[0] + ' ' + d.mlAB + 'ml';
  } else if (d.nut.partes === 2) {
    dosisHtml += ordenR[0] + ' ' + d.mlAB + 'ml · ' + ordenR[1] + ' ' + d.mlAB + 'ml';
  } else if (d.nut.partes === 3) {
    dosisHtml += ordenR[0] + ' ' + d.mlAB + 'ml · ' + ordenR[1] + ' ' + d.mlAB + 'ml · ' + ordenR[2] + ' ' + d.mlAB + 'ml';
  } else {
    dosisHtml += ordenR.map(p => p + ' ' + d.mlAB + 'ml').join(' · ');
  }

  const sHw = ensureSetupSensoresHardware();
  const hwLM = [sHw.ec && 'EC', sHw.ph && 'pH', sHw.humedad && 'humedad'].filter(Boolean);
  const hwResumen = hwLM.length
    ? '📟 Sensores / medidores: <strong>' + hwLM.join(', ') + '</strong> (valores manualmente en Mediciones)<br>'
    : '📟 Sensores / medidores: <strong>sin marcar</strong> (configúralo en paso Equipamiento o en Mediciones)<br>';

  let geoDwcRes = '';
  let geoTorreRes = '';
  if (isDwc) {
    const formaOnb =
      typeof dwcNormalizeDepositoForma === 'function'
        ? dwcNormalizeDepositoForma(document.getElementById('setupDwcDepositoForma')?.value)
        : 'prismatico';
    const Pd = _dwcParseOptCm('setupDwcProfCm', 5, 200);
    if (formaOnb === 'cilindrico') {
      const Dd = _dwcParseOptCm('setupDwcDiametroCm', 5, 300);
      if (Dd != null && Pd != null) geoDwcRes += ' · dep. Ø' + Dd + '×' + Pd + ' cm';
    } else if (formaOnb !== 'troncopiramidal') {
      const Ld = _dwcParseOptCm('setupDwcLargoCm', 5, 300);
      const Wd = _dwcParseOptCm('setupDwcAnchoCm', 5, 300);
      if (Ld != null && Wd != null && Pd != null) geoDwcRes += ' · dep. ' + Ld + '×' + Wd + '×' + Pd + ' cm';
    } else {
      const capTr =
        typeof getDwcCapacidadLitrosFromSetupInputs === 'function'
          ? getDwcCapacidadLitrosFromSetupInputs()
          : null;
      if (capTr != null) geoDwcRes += ' · dep. ~' + capTr + ' L (tronco)';
    }
    const rimD = _dwcParseOptMm('setupDwcPotRimMm', 25, 120);
    const hD = _dwcParseOptMm('setupDwcPotHmm', 30, 200);
    if (rimD != null || hD != null) {
      geoDwcRes += ' · cesta';
      if (rimD != null) geoDwcRes += ' Ø' + rimD + ' mm';
      if (hD != null) geoDwcRes += ' · ' + hD + ' mm alto';
    }
    if (document.getElementById('setupDwcCupulas')?.checked) geoDwcRes += ' · cúpulas';
    if (document.getElementById('setupDwcEntradaAire')?.checked) geoDwcRes += ' · entrada aire';
    const objSel = document.getElementById('setupDwcObjetivoCultivo')?.value;
    const objLbl = dwcNormalizeObjetivoCultivo(objSel) === 'baby' ? 'baby leaf' : 'lechuga final';
    geoDwcRes += ' · objetivo ' + objLbl;
    if (!dwcMcSetup) {
      const rejSel = dwcNormalizeRejillaModo(document.getElementById('setupDwcRejillaPreferida')?.value);
      geoDwcRes += ' · botón principal ' + (rejSel === 'max' ? 'máxima' : 'recomendada');
      const mhG = _dwcParseMarcoHuecoMmIds('setupDwcTapaMarcoMm', 'setupDwcTapaHuecoMm');
      if (mhG.marco != null && mhG.marco > 0) geoDwcRes += ' · marco tapa ' + mhG.marco + ' mm/lado';
      if (mhG.hueco != null) geoDwcRes += ' · entre cestas ' + mhG.hueco + ' mm';
    }
  }
  if (!isNft && !isDwc) {
    const tObj = (state.configTorre && state.configTorre.torreObjetivoCultivo) || 'final';
    const tSpec =
      typeof torreGetObjetivoSpec === 'function'
        ? torreGetObjetivoSpec(tObj)
        : { label: tObj === 'baby' ? 'Alta densidad / baby leaf (cosecha joven)' : 'Planta adulta (tamaño completo)' };
    geoTorreRes = ' · objetivo ' + tSpec.label;
  }

  el.innerHTML =
    (isNft
      ? '🪴 NFT: <strong>' +
        (hydNFT && typeof nftResumenCantidadesBreve === 'function'
          ? nftResumenCantidadesBreve({ tipoInstalacion: 'nft', nftMesaMultinivel: montR.mesaMultinivel, nftMesaTubosPorNivelStr: montR.mesaTubosStr, nftMesaHuecosPorNivelStr: montR.mesaHuecosStr, nftNumCanales: hydNFT.nCh, nftHuecosPorCanal: cestas, nftDisposicion: montR.disposicion })
          : (hydNFT ? hydNFT.nCh : niveles) + ' tubos × ' + cestas + ' huecos') +
        ' · ' + pendTxt + volTxtResume + '</strong> · tubo principal Ø <strong>' + setupNftTuboMm + ' mm</strong> · disposición <strong>' +
        (montR.disposicion === 'escalera' ? 'escalera' : montR.disposicion === 'pared' ? 'pared' : 'mesa') +
        (montR.disposicion === 'mesa' && montR.mesaMultinivel ? ' · multinivel (tubos iguales/nivel)' : '') +
        (montR.disposicion === 'escalera' && montR.escaleraCaras === 2 ? ' · A (2 caras)' : '') +
        '</strong>' +
        (potNft.rimMm != null || potNft.heightMm != null
          ? ' · cesta net pot' +
            (potNft.rimMm != null ? ' Ø <strong>' + potNft.rimMm + ' mm</strong>' : '') +
            (potNft.heightMm != null ? ' · alto <strong>' + potNft.heightMm + ' mm</strong>' : '')
          : '') +
        (altResNFT > 0 ? ' · bombeo (efectivo) al 1.º tubo <strong>' + altResNFT + ' cm</strong>' : '') +
        '<br>' +
        (bResumenNft
          ? '⚡ NFT: circulación <strong>24 h</strong> · criterio bomba/depósito en el paso de equipo y en checklist (veredicto visible; cifras en «detalle técnico»).<br>'
          : '')
      : isDwc
        ? dwcMcSetup
          ? '🫧 DWC: <strong>' +
            cestas +
            ' cubo' +
            (parseInt(cestas, 10) === 1 ? '' : 's') +
            ' (1 maceta/cubo) · ' +
            volTxtResume +
            '</strong>' +
            geoDwcRes +
            '<br>⚡ Aireador <strong>24 h</strong> · dosis <strong>por cubo</strong> (~' +
            (typeof volDosis === 'number' && Number.isFinite(volDosis) ? Math.round(volDosis * 10) / 10 : '—') +
            ' L) · Mediciones en cada cubo.<br>'
          : '🫧 DWC: <strong>' +
            niveles +
            ' filas × ' +
            cestas +
            ' cestas · ' +
            volTxtResume +
            '</strong>' +
            geoDwcRes +
            '<br>⚡ Aireador <strong>24 h</strong> · nivel y nutrientes en <strong>Mediciones</strong>.<br>'
        : '🌿 Torre: <strong>' + niveles + ' niveles × ' + cestas + ' cestas · ' + volTxtResume + '</strong>' + geoTorreRes + '<br>') +
    '🧪 Nutriente: <strong>' + (nut?.nombre || 'Canna Aqua Vega') + '</strong><br>' +
    '⚡ EC objetivo: <strong>' + ecObj.min + '–' + ecObj.max + ' µS/cm</strong>' +
    (ecObj.fuente === 'cultivos' ? ' <span class="setup-ec-fuente">(según cultivos)</span>' : '') + '<br>' +
    '💊 Dosis primera recarga: <strong>' + dosisHtml + '</strong><br>' +
    (ubic === 'exterior' ? '☀️' : '🏠') + ' Ubicación: <strong>' + (ubic === 'exterior' ? 'Exterior' : 'Interior') + '</strong>' +
    (ubic === 'interior'
      ? '<br>💡 Luz: <strong>' + luzResumenTxt + '</strong> · ' + hLuzRes + ' h/día'
      : '') + '<br>' +
    hwResumen +
    '🌱 Cultivos: <strong>' + plantasSel + '</strong><br>' +
    '🌿 Torres: <strong>' + (setupNumTorres === 'varias' ? 'Varias (añadir desde pestaña Cultivo e instalación)' : 'Una torre') + '</strong>';
}

// Tamaño de cestas
let setupTamanoCesta = '50'; // cm por defecto
let setupEsNuevaTorre = false; // true cuando se configura una torre adicional
let setupNombreNuevaTorre = ''; // nombre de la nueva torre

// ══ Tubo central y bomba ══════════════════════════
let setupDiametroTubo  = 50;
let setupAntiRaices    = 'tubo_interior';
let setupAlturaTorre   = 1.2;

function mostrarSeccionTuboBomba(mostrar) {
  const el = document.getElementById('seccionTuboBomba');
  if (!el) return;
  if (mostrar) {
    el.classList.remove('setup-hidden');
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
    el.classList.add('setup-hidden');
  }
}

function seleccionarTubo(mm) {
  setupDiametroTubo = mm;
  [50,75,110,125,160,200].forEach(d => {
    const el = document.getElementById('tubo' + d);
    if (el) el.classList.remove('selected');
  });
  const el = document.getElementById('tubo' + mm);
  if (el) el.classList.add('selected');

  // Aviso según diámetro
  const aviso  = document.getElementById('avisoAntiRaices');
  const secAR  = document.getElementById('seccionAntiRaices');

  if (mm <= 110) {
    aviso.style.display = 'none';
    secAR.style.display = 'none';
  } else if (mm === 125) {
    aviso.style.display = 'block';
    aviso.style.background = '#fff7ed';
    aviso.style.border = '1.5px solid #fed7aa';
    aviso.style.color = '#92400e';
    aviso.innerHTML = '⚠️ <strong>125mm — riesgo moderado de obstrucción por raíces.</strong><br>' +
      'Con lechugas y hierbas las raíces pueden crecer hacia los niveles inferiores en 3-4 semanas. ' +
      'Se recomienda un sistema anti-obstrucción.';
    secAR.style.display = 'block';
  } else if (mm === 160) {
    aviso.style.display = 'block';
    aviso.style.background = '#fff5f5';
    aviso.style.border = '1.5px solid #fca5a5';
    aviso.style.color = '#7f1d1d';
    aviso.innerHTML = '🔴 <strong>160mm — obstrucción casi segura sin protección.</strong><br>' +
      'Las raíces de los niveles superiores taponarán el flujo en 2-3 semanas. ' +
      '<strong>Obligatorio</strong> instalar tubo interior perforado (32-40mm) con tela filtrante, ' +
      'o separadores de nivel entre cada bandeja.';
    secAR.style.display = 'block';
  } else if (mm >= 200) {
    aviso.style.display = 'block';
    aviso.style.background = '#fff5f5';
    aviso.style.border = '1.5px solid #fca5a5';
    aviso.style.color = '#7f1d1d';
    aviso.innerHTML = '🔴 <strong>200mm — sistema profesional.</strong><br>' +
      'Requiere tubo interior perforado de 50mm con tela filtrante, ' +
      'o diseño de doble tubo (subida + bajada separadas). ' +
      'Sin protección el sistema fallará en la primera semana.';
    secAR.style.display = 'block';
  }

  calcularBombaRecomendada();
}

function seleccionarAntiRaices(tipo) {
  setupAntiRaices = tipo;
  ['TuboInt','Separadores','Canal','Ninguno'].forEach(t => {
    const el = document.getElementById('anti' + t);
    if (el) el.classList.remove('selected');
  });
  const map = { tubo_interior:'TuboInt', separadores:'Separadores', canal_lateral:'Canal', ninguno:'Ninguno' };
  const el = document.getElementById('anti' + (map[tipo]||tipo));
  if (el) el.classList.add('selected');
}

function calcularBombaRecomendada() {
  const sliderH = document.getElementById('sliderAltura');
  if (!sliderH) return;
  setupAlturaTorre = parseFloat(sliderH.value);

  const alturaEl = document.getElementById('valAltura');
  if (alturaEl) alturaEl.textContent = ' ' + setupAlturaTorre.toFixed(1) + 'm';

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;

  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(niveles, setupAlturaTorre, cestas)
      : null;
  if (!b) return;

  const caudalMin = b.caudalMin;
  const caudalRec = b.caudalRec;
  const headMetros = b.headMetros;
  const potenciaRec = b.potenciaRec;
  const modeloRec = b.modeloRec;

  // Aviso tubo interior si aplica
  let avisoTuboInt = '';
  if (setupDiametroTubo >= 125 && setupAntiRaices === 'tubo_interior') {
    const dTuboInt = setupDiametroTubo >= 200 ? '50mm' : setupDiametroTubo >= 160 ? '40mm' : '32mm';
    avisoTuboInt = '<br>🔩 <strong>Tubo interior recomendado: ' + dTuboInt + '</strong> perforado (agujeros 8mm cada 7cm) + tela filtrante tipo jersey.';
  }

  const el = document.getElementById('resultadoBomba');
  if (!el) return;
  el.innerHTML =
    '<div class="bomba-res-title">' +
      '⚡ Bomba recomendada para tu torre' +
    '</div>' +
    '<div class="bomba-res-grid">' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal mínimo</div>' +
        '<div class="bomba-res-cell-val">' + caudalMin + ' L/h</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal recomendado</div>' +
        '<div class="bomba-res-cell-val">' + caudalRec + ' L/h</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Head necesario</div>' +
        '<div class="bomba-res-cell-val">' + headMetros + 'm</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Potencia mínima</div>' +
        '<div class="bomba-res-cell-val">' + potenciaRec + 'W</div>' +
      '</div>' +
    '</div>' +
    '<div class="bomba-res-foot">' +
      '💡 ' + modeloRec + avisoTuboInt +
    '</div>';

  // Guardar en setupData
  window.setupBombaCalculada = { caudalMin, caudalRec, headMetros, potenciaRec, modeloRec };
  try {
    if (typeof refrescarUIMensajeBombaUsuarioTorre === 'function') refrescarUIMensajeBombaUsuarioTorre();
  } catch (_) {}
}

function calcularBombaRecomendadaSistema() {
  const sliderH = document.getElementById('sysSliderAltura');
  if (!sliderH) return;
  const alturaM = parseFloat(sliderH.value) || 1.2;
  const alturaEl = document.getElementById('sysValAltura');
  if (alturaEl) alturaEl.textContent = ' ' + alturaM.toFixed(1) + 'm';

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;

  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(niveles, alturaM, cestas)
      : null;
  if (!b) return;

  const caudalMin = b.caudalMin;
  const caudalRec = b.caudalRec;
  const headMetros = b.headMetros;
  const potenciaRec = b.potenciaRec;
  const modeloRec = b.modeloRec;

  const el = document.getElementById('sysResultadoBomba');
  if (!el) return;
  el.innerHTML =
    '<div class="bomba-res-title">' +
      '⚡ Bomba orientativa para tu torre' +
    '</div>' +
    '<div class="bomba-res-grid">' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal mínimo</div>' +
        '<div class="bomba-res-cell-val">' + caudalMin + ' L/h</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal recomendado</div>' +
        '<div class="bomba-res-cell-val">' + caudalRec + ' L/h</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Head necesario</div>' +
        '<div class="bomba-res-cell-val">' + headMetros + 'm</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Potencia mínima</div>' +
        '<div class="bomba-res-cell-val">' + potenciaRec + 'W</div>' +
      '</div>' +
    '</div>' +
    '<div class="bomba-res-foot">💡 ' + modeloRec + '</div>';

  try {
    if (typeof refrescarUIMensajeBombaUsuarioTorreSistema === 'function') refrescarUIMensajeBombaUsuarioTorreSistema();
  } catch (_) {}
}

function seleccionarCesta(tam) {
  setupTamanoCesta = tam;
  ['38','40','50','75','100','Personalizada'].forEach(t => {
    const key = t === 'Personalizada' ? 'cestaPersonalizada' : 'cesta' + t;
    const el  = document.getElementById(key);
    if (el) el.classList.remove('selected');
  });
  const mapId = { '38':'cesta38','40':'cesta40','50':'cesta50','75':'cesta75','100':'cesta100','custom':'cestaPersonalizada' };
  const el = document.getElementById(mapId[tam] || 'cesta50');
  if (el) el.classList.add('selected');

  // Info según tamaño
  const infoEl = document.getElementById('cestaInfo');
  if (!infoEl) return;
  const cm =
    tam === 'custom'
      ? parseFloat(document.getElementById('cestaCmCustom')?.value) || 0
      : parseFloat(tam) / 10;
  const infos = {
    3.8: '⚪ 3.8cm — Para microgreens y germinación. Esponja 2.5cm.',
    4.0: '🌿 4.0cm — Muy habitual en torres verticales comerciales. Ideal para lechugas, mizuna y hierbas. La raíz sale hacia el agua y el tamaño de cesta no suele limitar el crecimiento.',
    5.0: '🟢 5.0cm — Estándar hidropónico. Más estabilidad para lechugas grandes (romana, iceberg) y mejor para exterior con viento.',
    7.5: '🔵 7.5cm — Para hierbas grandes, rúcula, espinaca. Más volumen de sustrato.',
    10:  '⭕ 10cm — Para frutos pequeños, pimientos, fresas. Necesita soporte estructural.',
  };
  const closest = [3.8, 5.0, 7.5, 10].reduce((a,b) => Math.abs(b-cm) < Math.abs(a-cm) ? b : a);
  infoEl.style.display = 'block';
  infoEl.textContent = cm ? (infos[closest] || '✅ Tamaño personalizado: ' + cm + ' cm') : '';
}

function seleccionarAgua(tipo) {
  setupData.agua = tipo;
  ['Destilada','Osmosis','Grifo'].forEach(t => {
    const el = document.getElementById('agua' + t);
    if (el) el.classList.remove('selected');
  });
  const map = { destilada:'Destilada', osmosis:'Osmosis', grifo:'Grifo' };
  const el = document.getElementById('agua' + map[tipo]);
  if (el) el.classList.add('selected');
}

function seleccionarSustrato(tipo) {
  const t = normalizaSustratoKey(tipo);
  setupData.sustrato = t;
  document.querySelectorAll('.equip-card[data-setup-sustrato]').forEach(el => {
    const on = el.getAttribute('data-setup-sustrato') === t;
    el.classList.toggle('selected', on);
  });
}

function seleccionarUbicacion(tipo) {
  setupData.ubicacion = tipo;
  setupUbicacion = tipo;
  ['Exterior','Interior'].forEach(t => {
    const el = document.getElementById('loc' + t);
    if (el) el.classList.remove('selected');
  });
  const el = document.getElementById('loc' + tipo.charAt(0).toUpperCase() + tipo.slice(1));
  if (el) el.classList.add('selected');
  // Mostrar/ocultar sección iluminación
  const secLuz = document.getElementById('seccionIluminacion');
  if (secLuz) secLuz.style.display = tipo === 'interior' ? 'block' : 'none';
}

function syncWizardLuzUI() {
  const map = { natural:'Natural', mixto:'Natural+LED', led:'LED', fluorescente:'Fluorescent', hps:'HPS', sin_luz:'SinLuz' };
  const tipo = setupData.luz || 'led';
  ['Natural','Mixto','LED','Fluorescent','HPS','SinLuz'].forEach(suf => {
    const el = document.getElementById('luz' + suf);
    if (el) el.classList.remove('selected');
  });
  const suf = map[tipo] || 'LED';
  document.getElementById('luz' + suf)?.classList.add('selected');
  const h = Math.max(12, Math.min(20, parseInt(String(setupData.horasLuz || 16), 10) || 16));
  setupData.horasLuz = h;
  const sl = document.getElementById('sliderHorasLuz');
  const hv = document.getElementById('horasLuzVal');
  if (sl) sl.value = h;
  if (hv) hv.textContent = h + 'h';
  const ci2 = document.getElementById('setupCiudad2');
  if (ci2) {
    const ref = String(setupCoordenadas.ciudad || setupData.ciudad || '').trim();
    ci2.value = ref ? ref.split(',')[0].trim() : '';
  }
  seleccionarConsejosModoSetup(setupData.consejosModoUi || 'principiante');
}

function seleccionarLuz(tipo) {
  setupData.luz = tipo;
  const map = { natural:'Natural', mixto:'Natural+LED', led:'LED', fluorescente:'Fluorescent', hps:'HPS', sin_luz:'SinLuz' };
  ['Natural','Mixto','LED','Fluorescent','HPS','SinLuz'].forEach(suf => {
    const el = document.getElementById('luz' + suf);
    if (el) el.classList.remove('selected');
  });
  const suf = map[tipo] || 'LED';
  document.getElementById('luz' + suf)?.classList.add('selected');
}

function seleccionarConsejosModoSetup(modo) {
  const m = modo === 'avanzado' ? 'avanzado' : 'principiante';
  setupData.consejosModoUi = m;
  const bp = document.getElementById('setupConsejosModoPrincipiante');
  const ba = document.getElementById('setupConsejosModoAvanzado');
  if (bp) bp.classList.toggle('selected', m === 'principiante');
  if (ba) ba.classList.toggle('selected', m === 'avanzado');
}

function onBuscarCiudadSetup(val) {
  // Reusar la función de búsqueda de ciudad del setup original
  const res = document.getElementById('ciudadResultadosSetup');
  if (!res || val.length < 2) { if(res) res.classList.add('setup-hidden'); return; }
  // Usar la misma API de geocodificación
  fetch('https://geocoding-api.open-meteo.com/v1/search?name=' +
    encodeURIComponent(val) + '&count=5&language=es&format=json')
    .then(r => r.json())
    .then(data => {
      if (!data.results || data.results.length === 0) { res.classList.add('setup-hidden'); return; }
      res.classList.remove('setup-hidden');
      res.innerHTML = data.results.map(c =>
        '<div class="crs-item" ' +
        'data-lat="' + c.latitude + '" data-lon="' + c.longitude + '" ' +
        'data-nombre="' + (c.name + (c.admin1?', '+c.admin1:'') + ', '+c.country).replace(/"/g,"'") + '" ' +
        '>' +
        c.name + (c.admin1 ? ', ' + c.admin1 : '') + ', ' + c.country +
        '</div>'
      ).join('');
      res.querySelectorAll('.crs-item').forEach(el => {
        el.addEventListener('click', function() {
          selCiudadSetup(
            this.getAttribute('data-nombre'),
            parseFloat(this.getAttribute('data-lat')),
            parseFloat(this.getAttribute('data-lon'))
          );
        });
        el.addEventListener('touchstart', function(){ this.classList.add('crs-item--active'); }, {passive:true});
        el.addEventListener('touchend',   function(){ this.classList.remove('crs-item--active'); }, {passive:true});
      });
    }).catch(() => {});
}

function selCiudadSetup2(nombre, lat, lon) { selCiudadSetup(nombre, lat, lon); }
function selCiudadSetup(nombre, lat, lon) {
  setupData.ciudad = nombre;
  setupData.lat = lat;
  setupData.lon = lon;
  setupCoordenadas.ciudad = nombre;
  setupCoordenadas.lat = lat;
  setupCoordenadas.lon = lon;
  const res = document.getElementById('ciudadResultadosSetup');
  const sel = document.getElementById('ciudadSeleccionadaSetup');
  if (res) res.classList.add('setup-hidden');
  if (sel) { sel.classList.remove('setup-hidden'); sel.textContent = '📍 ' + nombre; }
  // Sincronizar con input original si existe
  const input2 = document.getElementById('setupCiudad2');
  if (input2) input2.value = nombre;
}

// Guardar setupData en la configuración de la torre al finalizar
function aplicarSetupDataATorre() {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.agua      = setupData.agua;
  state.configTorre.sustrato  = normalizaSustratoKey(setupData.sustrato);
  state.configTorre.faseCultivoRiego = 'produccion';
  state.configTorre.faseCultivoRiegoAuto = true;
  state.configTorre.sustratoMezcla = {
    activa: false,
    a: state.configTorre.sustrato,
    b: 'perlita',
    pctA: 70
  };
  state.configTorre.ubicacion = setupData.ubicacion;
  state.configTorre.luz       = setupData.luz || 'led';
  state.configTorre.horasLuz  = Math.max(12, Math.min(20,
    parseInt(String(document.getElementById('sliderHorasLuz')?.value || setupData.horasLuz || 16), 10) || 16));
  state.configTorre.consejosModoUi = setupData.consejosModoUi === 'avanzado' ? 'avanzado' : 'principiante';
  if (setupData.ciudad) {
    state.configTorre.ciudad  = setupData.ciudad;
    state.configTorre.lat     = setupData.lat;
    state.configTorre.lon     = setupData.lon;
    const firstM = String(setupData.ciudad).split(',')[0].trim();
    if (firstM && !(state.configTorre.localidadMeteo && String(state.configTorre.localidadMeteo).trim())) {
      state.configTorre.localidadMeteo = firstM;
    }
    invalidateMeteoNomiCache();
  }
  // Actualizar también el tipo de agua en la config principal
  const aguaMap = { destilada:'destilada', osmosis:'osmosis', grifo:'grifo' };
  if (aguaMap[setupData.agua]) setAgua(aguaMap[setupData.agua]);
  try {
    delete state.configTorre.hcPlantillaAutogenerada;
  } catch (_) {}
}

