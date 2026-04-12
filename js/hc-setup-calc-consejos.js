/**
 * Setup: cálculos dinámicos (EC, volumen, nutrientes), rotación, compatibilidad, fotos, historial, mediciones, consejos.
 * Carga tras hc-setup-wizard.js y nutrientes-catalog.js.
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

// EC óptima según cultivos plantados en la torre ACTIVA (no setup)
function getECOptimaTorre() {
  const cfg = state.configTorre || {};
  const numNiveles = cfg.numNiveles || NUM_NIVELES;
  const rangos = [];

  for (let n = 0; n < numNiveles; n++) {
    (state.torre[n] || []).forEach(c => {
      if (!c || !c.variedad) return;
      const cultivo = getCultivoDB(c.variedad);
      if (cultivo) rangos.push({ min: cultivo.ecMin, max: cultivo.ecMax });
    });
  }

  // Sin plantas → usar rango del nutriente
  if (rangos.length === 0) {
    const nut = getNutrienteTorre();
    return { min: nut.ecObjetivo?.[0] || 900, max: nut.ecObjetivo?.[1] || 1400 };
  }

  // Con plantas → intersección de rangos
  const ecMin = Math.max(...rangos.map(r => r.min));
  const ecMax = Math.min(...rangos.map(r => r.max));
  if (ecMax >= ecMin + 100) return { min: ecMin, max: ecMax };

  // Sin intersección → promedio
  return {
    min: Math.round(rangos.reduce((s,r) => s+r.min, 0) / rangos.length),
    max: Math.round(rangos.reduce((s,r) => s+r.max, 0) / rangos.length)
  };
}

/** EC meta (µS/cm) para recarga / checklist: manual en torre o intermedio óptimo automático */
function getRecargaEcMetaMicroS() {
  const cfg = state.configTorre || {};
  const manual = cfg.checklistEcObjetivoUs;
  if (Number.isFinite(manual) && manual >= 200 && manual <= 6000) {
    return Math.round(manual);
  }
  const o = getECOptimaTorre();
  return Math.round((o.min + o.max) / 2);
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
    return { min: nut.ecObjetivo?.[0] || 900, max: nut.ecObjetivo?.[1] || 1400, fuente: 'nutriente' };
  }
  // Con cultivos → calcular intersección de rangos
  const rangos = [];
  setupPlantasSeleccionadas.forEach(gKey => {
    const g = GRUPOS_CULTIVO[gKey];
    if (!g) return;
    const partes = g.ec.split('-').map(Number);
    if (partes.length === 2) rangos.push({ min: partes[0], max: partes[1] });
  });
  if (rangos.length === 0) return { min: 900, max: 1400, fuente: 'default' };
  const ecMin = Math.max(...rangos.map(r => r.min));
  const ecMax = Math.min(...rangos.map(r => r.max));
  if (ecMax >= ecMin + 100) return { min: ecMin, max: ecMax, fuente: 'cultivos' };
  // Sin intersección → promedio
  const avgMin = Math.round(rangos.reduce((s,r) => s+r.min,0) / rangos.length);
  const avgMax = Math.round(rangos.reduce((s,r) => s+r.max,0) / rangos.length);
  return { min: avgMin, max: avgMax, fuente: 'promedio', advertencia: true };
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
  const pHRango = nut.pHRango || [5.5, 6.5];
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
  }
  if (isDwc) {
    dwcMergeCamposFormularioEnCfg(state.configTorre, DWC_FORM_IDS_SETUP);
    dwcSincronizarTamanoCestaDesdeRim(state.configTorre);
  }
  const mezParsed = parseFloat(String(document.getElementById('setupVolMezclaL')?.value || '').replace(',', '.'));
  if (Number.isFinite(mezParsed) && mezParsed > 0 && mezParsed < vol - 0.02) {
    state.configTorre.volMezclaLitros = Math.min(vol, Math.max(0.5, Math.round(mezParsed * 10) / 10));
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
      state.torre[n].push({ variedad: '', fecha: '', notas: '' });
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
      emoji: isNft ? '🪴' : isDwc ? '🌊' : EMOJIS[nTorres % EMOJIS.length],
      config: { ...state.configTorre },
      torre: JSON.parse(JSON.stringify(state.torre)),
      modoActual: 'lechuga',
      mediciones: [],
      registro: [],
      fotosSistemaCompleto: { fotoKeys: [], fotos: [] },
    };
    if (!state.torres) state.torres = [];
    state.torres.push(nuevaTorre);
    const newIdx = state.torres.length - 1;
    state.torreActiva = newIdx;
    state.torre       = nuevaTorre.torre;
    state.mediciones  = [];
    state.registro    = [];
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

  const mlCalMag   = calcularMlCalMag();
  const ecCalMag   = estimarEcCalMagMicroS(mlCalMag, vol);
  const orden      = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A','Parte B','Parte C'];
  const mlCadaParte = [];
  for (let i = 0; i < (nut.partes || 2); i++) mlCadaParte.push(mlNutrientePorParte(nut.id, i, vol));

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
  const pHMin = nut.pHRango?.[0] || 5.5;
  const pHMax = nut.pHRango?.[1] || 6.5;
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
            'EC objetivo ' + ecObj.min + '–' + ecObj.max + ' µS/cm' +
          '</div>' +
        '</div>' +
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
    abrirChecklist(true);
  });
  document.getElementById('btnChecklistDespues').addEventListener('click', () => {
    a11yDialogClosed(overlay);
    overlay.remove();
    showToast('✅ ' + nombreTorre + ' lista · Checklist en pestaña Historial cuando quieras');
    goTab('inicio');
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
      lat: 39.9864,
      lon: -0.0495,
      ciudad: 'Castelló de la Plana',
    };
  }
  if (!state.configTorre.tipoInstalacion) state.configTorre.tipoInstalacion = 'torre';
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

// ══════════════════════════════════════════════════
// ROTACIÓN ESCALONADA
// ══════════════════════════════════════════════════

/** Texto del paso de limpieza tras rotar, según tipo de instalación. */
function etiquetaLimpiezaTrasRotacion() {
  const t = tipoInstalacionNormalizado(state.configTorre);
  if (t === 'nft') return '🧹 Limpiar huecos y restos con agua oxigenada diluida';
  if (t === 'dwc') return '🧹 Limpiar macetas y zona de cultivo vacías con agua oxigenada diluida';
  return '🧹 Limpiar cestas vacías con agua oxigenada diluida';
}

function calcularRotacion() {
  const card = document.getElementById('rotacionCard');
  if (!card) return;

  const nivelesActivos = getNivelesActivos();

  // Solo mostrar en modo lechuga o mixto (3 niveles escalonados)
  if (nivelesActivos.length < 2) { card.style.display = 'none'; return; }

  // Detectar si es cultivo escalonado o único
  // Escalonado = diferencia de días media entre niveles > 10 días
  const edadesPorNivel = nivelesActivos.map(n => {
    const plantas = state.torre[n].filter(c => c.variedad && c.fecha);
    if (plantas.length === 0) return null;
    const diasMedia = plantas.reduce((sum, c) => sum + getDias(c.fecha), 0) / plantas.length;
    return { nivel: n, diasMedia, plantas };
  }).filter(Boolean);

  if (edadesPorNivel.length < 2) { card.style.display = 'none'; return; }

  // Ordenar por edad (más joven primero = nivel superior)
  edadesPorNivel.sort((a, b) => a.diasMedia - b.diasMedia);

  const diferenciaMax = edadesPorNivel[edadesPorNivel.length-1].diasMedia - edadesPorNivel[0].diasMedia;
  const esCultivoEscalonado = diferenciaMax > 8; // más de 8 días de diferencia entre niveles

  if (!esCultivoEscalonado) { card.style.display = 'none'; return; }

  // Calcular estado y alertas de cada nivel
  const alertas = [];
  let htmlNiveles = '';

  edadesPorNivel.forEach((info, idx) => {
    const esUltimo = idx === edadesPorNivel.length - 1;
    const esPrimero = idx === 0;

    // Calcular días a cosecha media del nivel
    const diasTotalMedia = info.plantas.reduce((sum, c) => {
      return sum + (DIAS_COSECHA[c.variedad] || 50);
    }, 0) / info.plantas.length;

    const diasRestantes = Math.round(diasTotalMedia - info.diasMedia);
    const pct = Math.min(100, Math.round((info.diasMedia / diasTotalMedia) * 100));

    // Determinar estado (marcador tipográfico · sin emoji decorativo)
    let estado, colorBg, colorText, colorBorder, faseMark;
    if (diasRestantes <= 0) {
      estado = 'Listo para cosechar'; colorBg = '#fee2e2'; colorText = '#7f1d1d'; colorBorder = '#b91c1c'; faseMark = 'C';
    } else if (diasRestantes <= 5) {
      estado = `Cosecha en ${diasRestantes} d`; colorBg = '#fef3c7'; colorText = '#78350f'; colorBorder = '#d97706'; faseMark = '!';
    } else if (pct >= 66) {
      estado = `Madurez · ${diasRestantes} d restantes`; colorBg = '#fffbeb'; colorText = '#92400e'; colorBorder = '#d97706'; faseMark = 'M';
    } else if (pct >= 33) {
      estado = `Crecimiento · ${diasRestantes} d restantes`; colorBg = '#f0fdf4'; colorText = '#14532d'; colorBorder = '#16a34a'; faseMark = 'V';
    } else {
      estado = `Plántula · ${diasRestantes} d restantes`; colorBg = '#eff6ff'; colorText = '#1e40af'; colorBorder = '#2563eb'; faseMark = 'P';
    }

    // Nombre legible del nivel
    const nombreNivel = esPrimero ? 'Nivel superior' : esUltimo ? 'Nivel inferior' : 'Nivel central';
    const numNivel = info.nivel + 1;

    htmlNiveles += `
      <div class="rotacion-nivel-row" style="--rot-num-bg:${colorBg};--rot-num-fg:${colorText};--rot-num-bd:${colorBorder}">
        <div class="rotacion-nivel-num">
          ${numNivel}
        </div>
        <div class="rotacion-nivel-info">
          <div class="rotacion-nivel-titulo">${nombreNivel} — ${Math.round(info.diasMedia)} días</div>
          <div class="rotacion-nivel-dias">${info.plantas.length} plantas · ${estado}</div>
        </div>
        <div class="rotacion-fase-mark">${faseMark}</div>
      </div>`;

    // Generar alerta si hay acción pendiente
    if (diasRestantes <= 0 && esUltimo) {
      alertas.push({ tipo: 'urgente', texto: `<strong>Cosecha · nivel ${numNivel}.</strong> Cosechar, rotar niveles y trasplantar plántulas nuevas en nivel superior.` });
    } else if (diasRestantes <= 5 && esUltimo) {
      alertas.push({ tipo: 'pronto', texto: `<strong>Cosecha en ${diasRestantes} d.</strong> Prepara plántulas nuevas para el nivel ${edadesPorNivel[0].nivel + 1}.` });
    }
  });

  // Calcular próxima rotación
  const nivelMasMaduro = edadesPorNivel[edadesPorNivel.length - 1];
  const diasTotalMaduro = nivelMasMaduro.plantas.reduce((sum, c) =>
    sum + (DIAS_COSECHA[c.variedad] || 50), 0) / nivelMasMaduro.plantas.length;
  const diasParaRotacion = Math.max(0, Math.round(diasTotalMaduro - nivelMasMaduro.diasMedia));

  if (alertas.length === 0) {
    if (diasParaRotacion <= 10) {
      alertas.push({ tipo: 'pronto', texto: `Rotación aprox. en <strong>${diasParaRotacion} d</strong>. Prepara plántulas nuevas.` });
    } else {
      alertas.push({ tipo: 'ok', texto: `Ritmo correcto. Próxima rotación aprox. en <strong>${diasParaRotacion} d</strong>.` });
    }
  }

  // Flecha entre niveles
  // Las flechas se añaden directamente en el template
  const htmlConFlechas = htmlNiveles;

  card.style.display = 'block';
  card.innerHTML = `
    <div class="rotacion-card">
      <div class="rotacion-title">
        Rotación escalonada · torre por niveles
      </div>
      ${htmlConFlechas}
      ${alertas.map(a => `
        <div class="rotacion-alerta ${a.tipo}">
          <span class="rotacion-alerta-text">${a.texto}</span>
        </div>`).join('')}
      ${diasParaRotacion <= 0 ? `
      <button type="button" class="btn btn-primary rotacion-iniciar-btn" onclick="iniciarRotacion()">
        Iniciar rotación de niveles
      </button>` : ''}
    </div>`;
}

function iniciarRotacion() {
  // Modal de confirmación con pasos de rotación
  const nivelesActivos = getNivelesActivos();
  const pasos = [
    `✂️ Cosechar todas las plantas del nivel ${nivelesActivos[nivelesActivos.length-1] + 1}`,
    `🔽 Mover plantas del nivel ${nivelesActivos[1] + 1} → nivel ${nivelesActivos[nivelesActivos.length-1] + 1}`,
    `🔽 Mover plantas del nivel ${nivelesActivos[0] + 1} → nivel ${nivelesActivos[1] + 1}`,
    `🌱 Trasplantar plántulas nuevas en nivel ${nivelesActivos[0] + 1}`,
    etiquetaLimpiezaTrasRotacion(),
  ];

  const lista = pasos.map((p, i) => (i+1) + '. ' + p).join('\n');

  if (confirm('ROTACIÓN DE NIVELES\n\n' + lista + '\n\n¿Confirmar rotación?\n\nEsto actualizará las fechas de plantas en la instalación activa (vista Sistema).')) {
    ejecutarRotacion();
  }
}

function ejecutarRotacion() {
  const nivelesActivos = [...getNivelesActivos()];
  // Ordenar por edad (mayor a menor — el más maduro primero)
  const edadesPorNivel = nivelesActivos.map(n => {
    const plantas = state.torre[n].filter(c => c.variedad && c.fecha);
    if (plantas.length === 0) return { nivel: n, diasMedia: 0 };
    return { nivel: n, diasMedia: plantas.reduce((s, c) => s + getDias(c.fecha), 0) / plantas.length };
  }).sort((a, b) => b.diasMedia - a.diasMedia); // más maduro primero

  // El más maduro se cosecha (vaciar)
  const nivelCosecha = edadesPorNivel[0].nivel;
  state.torre[nivelCosecha] = Array(NUM_CESTAS).fill(null).map(() => ({ variedad: '', fecha: '', notas: '' }));

  // Los demás se mueven al nivel siguiente (más maduro)
  for (let i = 1; i < edadesPorNivel.length; i++) {
    const nivelOrigen = edadesPorNivel[i].nivel;
    const nivelDestino = edadesPorNivel[i-1].nivel;
    state.torre[nivelDestino] = JSON.parse(JSON.stringify(state.torre[nivelOrigen]));
    state.torre[nivelOrigen] = Array(NUM_CESTAS).fill(null).map(() => ({ variedad: '', fecha: '', notas: '' }));
  }

  saveState();
  renderTorre();
  updateTorreStats();
  calcularRotacion();
  showToast('✅ Rotación completada en esta instalación — añade plántulas al nivel superior');
}

// ══════════════════════════════════════════════════
// COMPATIBILIDAD INFO EN MODAL
// ══════════════════════════════════════════════════
function showCompatInfo() {
  const variedad = document.getElementById('editVariedad').value;
  const infoEl   = document.getElementById('editCompatInfo');
  if (!variedad) { infoEl.style.display = 'none'; return; }

  const cultivo = getCultivoDB(variedad);
  const grupo   = getGrupoCultivo(variedad);

  if (!cultivo && !grupo) { infoEl.style.display = 'none'; return; }

  infoEl.style.display = 'block';

  let html = '';

  // Info del cultivo específico
  if (cultivo) {
    const dif   = { fácil:'🟢 Fácil', media:'🟡 Media', difícil:'🔴 Avanzado' };
    html += '<div class="edit-compat-head">';
    html += '<span class="edit-compat-emoji" aria-hidden="true">' + cultivoEmoji(cultivo) + '</span>';
    html += '<div class="edit-compat-main">';
    html += '<div class="edit-compat-title">' +
      escHtmlUi(cultivoNombreLista(cultivo, variedad)) + '</div>';
    html += '<div class="edit-compat-chips">' +
      '<span class="edit-compat-chip edit-compat-chip--ec">⚡ EC ' + cultivo.ecMin + '–' + cultivo.ecMax + ' µS/cm</span>' +
      '<span class="edit-compat-chip edit-compat-chip--ph">🧪 pH ' + cultivo.phMin + '–' + cultivo.phMax + '</span>' +
      '<span class="edit-compat-chip edit-compat-chip--days">⏱ ~' + cultivo.dias + ' días</span>' +
      '<span class="edit-compat-chip edit-compat-chip--diff">' + (dif[cultivo.dificultad]||'') + '</span>' +
    '</div>';

    if (cultivo.nota) {
      html += '<div class="edit-compat-nota">💡 ' + cultivo.nota + '</div>';
    }

    // Fases si tiene fructificación
    if (cultivo.fructificacion && cultivo.fases) {
      html += '<div class="edit-compat-fases-kicker">🌸 Fases de cultivo:</div>';
      Object.entries(cultivo.fases).forEach(([fase, datos]) => {
        const nombres = {plantula:'Plántula',vegetativo:'Vegetativo',floracion:'Floración',fructificacion:'Fructificación'};
        html += '<div class="edit-compat-fase-line">' +
          '<strong>' + (nombres[fase]||fase) + '</strong>: EC ' + datos.ec[0] + '–' + datos.ec[1] +
          ' · pH ' + datos.ph[0] + '–' + datos.ph[1] + ' · ~' + datos.dias + 'd</div>';
      });
    }
    html += '</div></div>';
  }

  // Compatibilidad con otros cultivos en la misma torre
  if (editingCesta) {
    const { nivel } = editingCesta;
    const otrosGrupos = new Set();
    state.torre[nivel]?.forEach((c, i) => {
      if (c.variedad && c.variedad !== variedad) {
        const g = getGrupoCultivo(c.variedad);
        if (g) otrosGrupos.add(g.key);
      }
    });

    if (otrosGrupos.size > 0 && grupo) {
      const compatibles = COMPAT_MATRIZ[grupo.key] || [];
      const incomp = [...otrosGrupos].filter(g => !compatibles.includes(g));
      if (incomp.length > 0) {
        const nombresIncomp = incomp.map(g => GRUPOS_CULTIVO[g]?.nombre || g).join(', ');
        html += '<div class="edit-compat-banner edit-compat-banner--bad">' +
          '⚠️ Incompatible con ' + nombresIncomp + ' en esta torre — EC diferente</div>';
      } else {
        html += '<div class="edit-compat-banner edit-compat-banner--ok">' +
          '✅ Compatible con los cultivos actuales de esta torre</div>';
      }
    }
  }

  infoEl.className = 'edit-compat-box ' + (cultivo?.fructificacion ? 'edit-compat-box--fruit' : 'edit-compat-box--leaf');
  infoEl.innerHTML = html;
}


function agregarFotoCesta(event) {
  const file = event.target && event.target.files && event.target.files[0];
  if (!file) return Promise.resolve();
  const inputEl = event.target;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      try { if (inputEl) inputEl.value = ''; } catch (_) {}
      reject(reader.error);
    };
    reader.onload = function(e) {
      const base64 = e.target.result;
      const img = new Image();
      img.onerror = () => {
        try { if (inputEl) inputEl.value = ''; } catch (_) {}
        reject(new Error('No se pudo leer la imagen'));
      };
      img.onload = async function() {
        try {
          const canvas = document.createElement('canvas');
          const maxW = 400;
          const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.5);

          if (!editingCesta) { resolve(); return; }
          const { nivel, cesta } = editingCesta;
          if (!state.torre[nivel]) state.torre[nivel] = [];
          if (!state.torre[nivel][cesta]) state.torre[nivel][cesta] = { variedad:'', fecha:'', notas:'', fotos:[], fotoKeys:[] };
          const cestaData = state.torre[nivel][cesta];
          if (!cestaData.fotos) cestaData.fotos = [];

          const now = new Date();
          const diasDesdeTrasplante = cestaData.fecha
            ? Math.floor((now - new Date(cestaData.fecha)) / 86400000)
            : null;

          const foto = {
            data:     compressed,
            fecha:    now.toLocaleDateString('es-ES'),
            hora:     now.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}),
            isoDate:  now.toISOString(),
            variedad: cestaData.variedad || '',
            nivel:    nivel + 1,
            cesta:    cesta + 1,
            diasCultivo: diasDesdeTrasplante,
            notas:    '',
          };

          const torreIdx = state.torreActiva || 0;
          const fotoKey  = 'foto_t' + torreIdx + '_n' + nivel + '_c' + cesta + '_' +
                           now.toISOString().replace(/[:.]/g,'_');
          await guardarFotoIDB(fotoKey, { ...foto, key: fotoKey });
          if (!cestaData.fotoKeys) cestaData.fotoKeys = [];
          cestaData.fotoKeys.push(fotoKey);
          if (!cestaData.fotos) cestaData.fotos = [];
          cestaData.fotos.push({ ...foto, key: fotoKey });
          while (cestaData.fotos.length > 2) {
            const old = cestaData.fotos.shift();
            if (old) old.data = null;
          }

          addRegistro('foto', {
            variedad:    cestaData.variedad || 'Planta',
            nivel:       nivel + 1,
            cesta:       cesta + 1,
            diasCultivo: diasDesdeTrasplante,
            fotoKey:     fotoKey,
            fotoFecha:   foto.fecha,
            icono:       '📸'
          });

          saveState();
          void renderFotosCesta();
          showToast('📸 Foto guardada en el diario · Día ' + (diasDesdeTrasplante || 0));
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    try { if (inputEl) inputEl.value = ''; } catch (_) {}
  });
}

async function renderFotosCesta() {
  const preview = document.getElementById('fotosPreview');
  if (!preview || !editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const cestaData = state.torre[nivel] && state.torre[nivel][cesta];
  if (!cestaData) return;
  const lista = await getFotosCompletasParaCesta(nivel, cesta);
  if (lista.length === 0) { preview.innerHTML = ''; return; }
  preview.innerHTML = '';
  const renderOne = (f, i, src) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;flex-shrink:0';

    const img = document.createElement('img');
    img.src = src || '';
    img.alt = 'Foto ' + (f.fecha || '');
    img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:10px;border:2px solid #86efac;cursor:pointer;display:block';
    img.addEventListener('click', () => void verFotoCompleta(i));

    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.setAttribute('aria-label', 'Borrar foto ' + (i+1));
    btn.style.cssText = 'position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#dc2626;color:white;border:none;font-size:11px;cursor:pointer;font-weight:900';
    btn.addEventListener('click', () => void borrarFotoCesta(i));

    const fecha = document.createElement('div');
    fecha.style.cssText = 'font-size:9px;color:#6b7280;text-align:center;margin-top:2px';
    fecha.textContent = f.fecha || '';

    wrap.appendChild(img);
    wrap.appendChild(btn);
    wrap.appendChild(fecha);
    preview.appendChild(wrap);
  };
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    let src = f.data || '';
    if (!src && f.key) {
      try {
        const o = await leerFotoIDB(f.key);
        if (o && o.data) src = o.data;
      } catch (_) {}
    }
    if (src) renderOne(f, i, src);
  }
}

// ══════════════════════════════════════════════════
// DIARIO FOTOGRÁFICO — seguimiento visual por planta
// ══════════════════════════════════════════════════

/** Fotos completas de una cesta (IndexedDB + caché). Orden cronológico. */
async function getFotosCompletasParaCesta(nivel, cesta) {
  const cestaData = state.torre[nivel] && state.torre[nivel][cesta];
  if (!cestaData) return [];
  const keys = [...(cestaData.fotoKeys || [])];
  const out = [];
  const seen = new Set();
  for (const key of keys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let obj = (cestaData.fotos || []).find(f => f && f.key === key);
    if (obj && obj.data) {
      out.push({ ...obj, key });
      continue;
    }
    try {
      const fromDb = await leerFotoIDB(key);
      if (fromDb && fromDb.data) out.push({ ...fromDb, key });
    } catch (_) {}
  }
  (cestaData.fotos || []).forEach(f => {
    if (f && f.data && !f.key) out.push(f);
  });
  out.sort((a, b) => new Date(a.isoDate || a.fecha) - new Date(b.isoDate || b.fecha));
  return out;
}

function contarFotosCesta(cesta) {
  if (!cesta) return 0;
  const k = cesta.fotoKeys || [];
  if (k.length > 0) return k.length;
  return (cesta.fotos || []).filter(f => f && f.data).length;
}

const MAX_FOTOS_SISTEMA_COMPLETO = 50;

function ensureFotosSistemaCompletoState() {
  if (!state.fotosSistemaCompleto || typeof state.fotosSistemaCompleto !== 'object') {
    state.fotosSistemaCompleto = { fotoKeys: [], fotos: [] };
  }
  if (!Array.isArray(state.fotosSistemaCompleto.fotoKeys)) state.fotosSistemaCompleto.fotoKeys = [];
  if (!Array.isArray(state.fotosSistemaCompleto.fotos)) state.fotosSistemaCompleto.fotos = [];
}

function agregarFotoSistemaCompletoCatch(ev) {
  void agregarFotoSistemaCompleto(ev).catch(() => showToast('No se pudo guardar la foto', true));
}

function agregarFotoSistemaCompleto(event) {
  const file = event.target && event.target.files && event.target.files[0];
  if (!file) return Promise.resolve();
  const inputEl = event.target;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      try { if (inputEl) inputEl.value = ''; } catch (_) {}
      reject(reader.error);
    };
    reader.onload = function(e) {
      const base64 = e.target.result;
      const img = new Image();
      img.onerror = () => {
        try { if (inputEl) inputEl.value = ''; } catch (_) {}
        reject(new Error('No se pudo leer la imagen'));
      };
      img.onload = async function() {
        try {
          initTorres();
          const canvas = document.createElement('canvas');
          const maxW = 1000;
          const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.52);

          ensureFotosSistemaCompletoState();
          const slot = state.fotosSistemaCompleto;
          while (slot.fotoKeys.length >= MAX_FOTOS_SISTEMA_COMPLETO) {
            const oldKey = slot.fotoKeys.shift();
            if (oldKey) {
              try { await borrarFotoIDB(oldKey); } catch (_) {}
              slot.fotos = (slot.fotos || []).filter(f => f && f.key !== oldKey);
              if (state.registro) {
                state.registro = state.registro.filter(
                  r => !(r.tipo === 'foto_sistema' && r.fotoKey === oldKey)
                );
              }
            }
          }

          const now = new Date();
          const torreIdx = state.torreActiva || 0;
          const fotoKey =
            'foto_sistema_t' + torreIdx + '_' + now.toISOString().replace(/[:.]/g, '_');
          const foto = {
            data: compressed,
            fecha: now.toLocaleDateString('es-ES'),
            hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            isoDate: now.toISOString(),
            tipo: 'sistema_completo',
            notas: '',
          };
          await guardarFotoIDB(fotoKey, { ...foto, key: fotoKey });
          slot.fotoKeys.push(fotoKey);
          if (!slot.fotos) slot.fotos = [];
          slot.fotos.push({ ...foto, key: fotoKey });
          while (slot.fotos.length > 2) {
            const old = slot.fotos.shift();
            if (old) old.data = null;
          }

          addRegistro('foto_sistema', {
            fotoKey,
            fotoFecha: foto.fecha,
            icono: '🏗',
          });
          guardarEstadoTorreActual();
          saveState();
          renderDiarioBloqueSistema();
          showToast('🏗 Foto del sistema guardada');
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    try { if (inputEl) inputEl.value = ''; } catch (_) {}
  });
}

async function hydrateDiarioSistemaThumbs(wrap) {
  if (!wrap) return;
  for (const slot of wrap.querySelectorAll('.diario-sistema-thumb')) {
    const key = slot.getAttribute('data-foto-key');
    if (!key) continue;
    try {
      const o = await leerFotoIDB(key);
      if (!o || !o.data) continue;
      const img = document.createElement('img');
      img.src = o.data;
      img.alt = 'Instalación ' + (o.fecha || '');
      img.className = 'diario-sistema-thumb-img';
      img.addEventListener('click', () =>
        verFotoCompletaDiario(o.data, 'Vista del sistema', o.fecha || '')
      );
      slot.innerHTML = '';
      slot.appendChild(img);
    } catch (_) {}
  }
}

function renderDiarioBloqueSistema() {
  const wrap = document.getElementById('diarioSistemaCompletoWrap');
  if (!wrap) return;
  ensureFotosSistemaCompletoState();
  const sisAct = infoSistemaEntrada(getTorreActiva() || {});
  const keys = [...state.fotosSistemaCompleto.fotoKeys].reverse();
  const n = keys.length;
  const tDiario = tipoInstalacionNormalizado(state.configTorre || {});
  const msgDiarioVacío =
    tDiario === 'nft'
      ? 'Aún no hay fotos de conjunto. <strong>Aléjate un poco</strong> para que salgan canales, depósito y entorno; conviene repetir desde la <strong>misma esquina</strong> para comparar.'
      : tDiario === 'dwc'
        ? 'Aún no hay fotos de conjunto. <strong>Aléjate un poco</strong> para que salgan macetas, tapa, depósito y entorno; repetir desde la <strong>misma esquina</strong> ayuda a comparar.'
        : 'Aún no hay fotos de conjunto. <strong>Aléjate un poco</strong> para que salgan la torre vertical, el depósito y el entorno; conviene repetir desde la <strong>misma esquina</strong> para comparar.';
  const filasTimel =
    n === 0
      ? '<div class="diario-sistema-empty-msg">' + msgDiarioVacío + '</div>'
      : '<div class="diario-sistema-timeline">' +
        keys
          .map(function(key, i) {
            const safe = String(key)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/</g, '&lt;');
            return (
              '<div class="diario-sistema-slot-wrap">' +
              '<div class="diario-sistema-thumb" data-foto-key="' +
              safe +
              '">🏗</div>' +
              '<button type="button" class="diario-sistema-remove-btn" onclick="borrarFotoSistemaCompletoDes(' +
              i +
              ')">Quitar</button></div>'
            );
          })
          .join('') +
        '</div>';

  wrap.innerHTML =
    '<div class="diario-sistema-panel">' +
    '<div class="diario-sistema-title">🏗 Vista del sistema completo</div>' +
    '<div class="hist-recarga-nutriente">' + (sisAct.emoji || '🌿') + ' ' + sisAct.nombre + '</div>' +
    '<div class="diario-sistema-intro">Registra la <strong>evolución de toda la instalación</strong> (no una sola maceta). Las fotos por cultivo siguen en cada <strong>ficha de planta</strong>. Estas entradas también salen en <strong>Historial → Registro</strong>.</div>' +
    '<div class="hc-foto-grid hc-foto-grid--mb">' +
    '<label class="hc-label-foto hc-label-foto--green" aria-label="Foto del sistema con la cámara">' +
    '<span class="hc-foto-emoji" aria-hidden="true">📷</span><span>Cámara</span>' +
    '<input type="file" accept="image/*" capture="environment" class="hc-sr-file-input" onchange="agregarFotoSistemaCompletoCatch(event)">' +
    '</label>' +
    '<label class="hc-label-foto hc-label-foto--blue" aria-label="Foto del sistema desde galería">' +
    '<span class="hc-foto-emoji" aria-hidden="true">🖼</span><span>Galería</span>' +
    '<input type="file" accept="image/*" class="hc-sr-file-input" onchange="agregarFotoSistemaCompletoCatch(event)">' +
    '</label></div>' +
    (n > 0
      ? '<div class="diario-sistema-kicker">Línea de tiempo (' +
        n +
        ')</div>'
      : '') +
    filasTimel +
    '</div>';
  void hydrateDiarioSistemaThumbs(wrap);
}

async function borrarFotoSistemaCompletoDes(idxDesdeReciente) {
  ensureFotosSistemaCompletoState();
  const keys = [...state.fotosSistemaCompleto.fotoKeys];
  const ordered = keys.slice().reverse();
  const key = ordered[idxDesdeReciente];
  if (!key) return;
  if (!confirm('¿Quitar esta foto del sistema?')) return;
  try {
    await borrarFotoIDB(key);
  } catch (_) {}
  state.fotosSistemaCompleto.fotoKeys = keys.filter(k => k !== key);
  state.fotosSistemaCompleto.fotos = (state.fotosSistemaCompleto.fotos || []).filter(f => f && f.key !== key);
  if (state.registro) {
    state.registro = state.registro.filter(r => !(r.tipo === 'foto_sistema' && r.fotoKey === key));
  }
  guardarEstadoTorreActual();
  saveState();
  renderDiarioBloqueSistema();
  const rp = document.getElementById('histRegistroPanel');
  if (rp && !rp.classList.contains('setup-hidden') && typeof renderRegistro === 'function') renderRegistro();
  showToast('🗑 Foto del sistema eliminada');
}

async function renderDiarioSelector() {
  renderDiarioBloqueSistema();
  const sel = document.getElementById('diarioPlantaSelector');
  const contenido = document.getElementById('diarioContenido');
  if (!sel) return;
  if (filtroTorreActivo != null && Array.isArray(state.torres) && state.torres.length > 1) {
    const idxObjetivo = state.torres.findIndex(t => String(t.id) === String(filtroTorreActivo));
    if (idxObjetivo >= 0 && idxObjetivo !== (state.torreActiva || 0)) {
      const tObj = state.torres[idxObjetivo];
      sel.innerHTML =
        '<div class="diario-selector-empty">' +
        '📌 El filtro de Historial está en <strong>' + escHtmlUi((tObj.emoji || '🌿') + ' ' + ((tObj.nombre || '').trim() || 'Instalación')) + '</strong>.<br>' +
        '<button type="button" class="btn btn-primary setup-mt-8" onclick="cambiarAlSistemaFiltradoDiario(' + idxObjetivo + ')">Cambiar al sistema filtrado</button>' +
        '</div>';
      if (contenido) contenido.innerHTML = '';
      return;
    }
  }

  const cfg = state.configTorre || {};
  const sisAct = infoSistemaEntrada(getTorreActiva() || {});
  const numNiveles = cfg.numNiveles || NUM_NIVELES;
  const numCestas  = cfg.numCestas  || NUM_CESTAS;
  const plantas = [];

  for (let n = 0; n < numNiveles; n++) {
    for (let c = 0; c < (state.torre[n] || []).length; c++) {
      const cesta = state.torre[n][c];
      if (!cesta || !cesta.variedad) continue;
      const fotos = cesta.fotos || [];
      const numFotos = contarFotosCesta(cesta);
      const ultimaFechaMeta = (() => {
        const rev = [...fotos].reverse().find(f => f && f.data && f.fecha);
        if (rev) return rev.fecha;
        return '';
      })();
      const diasDesde = cesta.fecha
        ? Math.floor((new Date() - new Date(cesta.fecha)) / 86400000)
        : null;
      plantas.push({ n, c, variedad: cesta.variedad, fotos, diasDesde, notas: cesta.notas,
        numFotos, ultimaFechaMeta, keys: cesta.fotoKeys || [] });
    }
  }

  if (plantas.length === 0) {
    sel.innerHTML = '<div class="diario-selector-empty">' +
      '🌱 No hay plantas registradas aún.<br>Añade plantas a las cestas desde la pestaña <strong>Torre</strong>.</div>';
    if (contenido) contenido.innerHTML = '';
    return;
  }

  sel.innerHTML = plantas.map(p => {
    const tieneFotos = p.numFotos > 0;
    const ultimaTxt = p.ultimaFechaMeta || '—';
    const nomDiarioSel = escHtmlUi(cultivoNombreLista(getCultivoDB(p.variedad), p.variedad));
    return '<div class="diario-planta-item" data-n="' + p.n + '" data-c="' + p.c + '">' +

      // Miniatura: placeholder siempre, imagen se inserta con JS (evita truncamiento base64)
      '<div class="diario-thumb-slot' + (tieneFotos ? ' diario-thumb-slot--photos' : ' diario-thumb-slot--empty') + '" data-n="' + p.n + '" data-c="' + p.c + '">' +
        (tieneFotos ? '📸' : '🌱') + '</div>' +
      '<div class="diario-item-body">' +
        '<div class="diario-item-title">' + nomDiarioSel + '</div>' +
        '<div class="diario-item-meta">' + (sisAct.emoji || '🌿') + ' ' + sisAct.nombre + '</div>' +
        '<div class="diario-item-meta">' +
          'Nivel ' + (p.n+1) + ' · Cesta ' + (p.c+1) +
          (p.diasDesde !== null ? ' · <strong class="diario-item-dia">Día ' + p.diasDesde + '</strong>' : '') +
        '</div>' +
        '<div class="diario-item-meta">' +
          (tieneFotos
            ? '📸 ' + p.numFotos + ' foto' + (p.numFotos>1?'s':'') + ' · última: ' + ultimaTxt
            : '📷 Sin fotos aún — toca para añadir') +
        '</div>' +
      '</div>' +
      '<div class="diario-item-chevron">›</div>' +
    '</div>';
  }).join('');

  // Event delegation para abrir el diario de cada planta
  sel.querySelectorAll('.diario-planta-item').forEach(el => {
    el.addEventListener('click', function() {
      const n = parseInt(this.getAttribute('data-n'));
      const c = parseInt(this.getAttribute('data-c'));
      renderDiarioPlanta(n, c);
    });
  });

    // Miniaturas: caché local o última clave en IndexedDB
  sel.querySelectorAll('.diario-thumb-slot').forEach(slot => {
    const n = parseInt(slot.getAttribute('data-n'));
    const c = parseInt(slot.getAttribute('data-c'));
    const cestaData = (state.torre[n] || [])[c];
    if (!cestaData) return;
    const keys = cestaData.fotoKeys || [];
    const ultimaKey = keys.length > 0 ? keys[keys.length - 1] : null;
    const uf = [...(cestaData.fotos || [])].reverse().find(f => f && f.data);
    const ponerImg = (src) => {
      if (!src) return;
      const img = document.createElement('img');
      img.src = src;
      img.className = 'diario-thumb-img';
      img.alt = cestaData.variedad || '';
      slot.replaceWith(img);
    };
    if (uf && uf.data) {
      ponerImg(uf.data);
      return;
    }
    if (ultimaKey) {
      leerFotoIDB(ultimaKey).then(o => { if (o && o.data) ponerImg(o.data); }).catch(() => {});
    }
  });
}

function cambiarAlSistemaFiltradoDiario(idxObjetivo) {
  cambiarTorreActiva(idxObjetivo);
  setTimeout(() => {
    if (histTabActiva === 'diario') renderDiarioSelector();
  }, 120);
}

async function renderDiarioPlanta(nivel, cesta) {
  try {
  const contenido = document.getElementById('diarioContenido');
  const sel = document.getElementById('diarioPlantaSelector');
  if (!contenido) return;

  const cestaData = state.torre[nivel] && state.torre[nivel][cesta];
  if (!cestaData) return;

  const fotos = await getFotosCompletasParaCesta(nivel, cesta);
  const variedad = cestaData.variedad || 'Planta';
  const diasDesde = cestaData.fecha
    ? Math.floor((new Date() - new Date(cestaData.fecha)) / 86400000)
    : null;
  const cultivo = getCultivoDB(variedad);
  const tituloDiario = escHtmlUi(cultivoNombreLista(cultivo, variedad));

  // Ocultar selector, mostrar diario
  if (sel) sel.style.display = 'none';

  let html = '';

  // ── Cabecera ────────────────────────────────────────────────────────────
  html += '<div class="diario-det-head">' +
    '<button type="button" class="diario-det-back" onclick="volverDiarioSelector()" aria-label="Volver al selector">‹</button>' +
    '<div class="diario-det-title-wrap">' +
      '<div class="diario-det-title">' +
        tituloDiario + '</div>' +
      '<div class="diario-det-sub">' +
        'Nivel ' + (nivel+1) + ' · Cesta ' + (cesta+1) +
        (diasDesde !== null ? ' · <strong class="diario-item-dia">Día ' + diasDesde + ' de cultivo</strong>' : '') +
      '</div>' +
    '</div>' +
    // Botón añadir foto rápido
    '<label class="diario-det-add-foto" aria-label="Añadir foto">' +
      '📷 <span>Foto</span>' +
      '<input type="file" accept="image/*" capture="environment" class="hc-sr-file-input" ' +
        'onchange="agregarFotoDesdeDiario(event,' + nivel + ',' + cesta + ')">' +
    '</label>' +
  '</div>';

  // ── Barra de progreso del cultivo ────────────────────────────────────────
  if (cultivo && diasDesde !== null) {
    const progreso = Math.min(100, Math.round((diasDesde / cultivo.dias) * 100));
    const color = progreso >= 100 ? '#16a34a' : progreso >= 70 ? '#f59e0b' : '#3b82f6';
    html += '<div class="diario-prog-box" style="--diario-prog-c:' + color + ';--diario-prog-pct:' + progreso + '%">' +
      '<div class="diario-prog-row">' +
        '<span>🌱 Progreso de cultivo</span>' +
        '<span class="diario-prog-pct">' + progreso + '% — día ' + diasDesde + '/' + cultivo.dias + '</span>' +
      '</div>' +
      '<div class="diario-prog-track">' +
        '<div class="diario-prog-fill"></div>' +
      '</div>' +
      (progreso >= 100
        ? '<div class="diario-prog-done">✅ ¡Lista para cosechar!</div>'
        : '<div class="diario-prog-pending">~' + (cultivo.dias - diasDesde) + ' días hasta cosecha estimada</div>'
      ) +
    '</div>';
  }

  // ── Stats rápidos ────────────────────────────────────────────────────────
  if (cultivo) {
    html += '<div class="diario-stats-grid">' +
      '<div class="diario-stat-cell diario-stat-cell--green">' +
        '<div class="diario-stat-lab">EC óptima</div>' +
        '<div class="diario-stat-val diario-stat-val--green">' +
          cultivo.ecMin + '–' + cultivo.ecMax + '</div>' +
      '</div>' +
      '<div class="diario-stat-cell diario-stat-cell--blue">' +
        '<div class="diario-stat-lab">pH óptimo</div>' +
        '<div class="diario-stat-val diario-stat-val--blue">' +
          cultivo.phMin + '–' + cultivo.phMax + '</div>' +
      '</div>' +
      '<div class="diario-stat-cell diario-stat-cell--amber">' +
        '<div class="diario-stat-lab">Fotos</div>' +
        '<div class="diario-stat-val diario-stat-val--amber">' +
          fotos.length + '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Línea de tiempo fotográfica ──────────────────────────────────────────
  if (fotos.length === 0) {
    html += '<div class="diario-fotos-empty">' +
      '<div class="diario-fotos-empty-icon">📷</div>' +
      '<div class="diario-fotos-empty-title">' +
        'Sin fotos aún</div>' +
      '<div class="diario-fotos-empty-text">' +
        'Añade la primera foto para empezar el seguimiento visual.<br>' +
        'Ideal hacerlo en el día de trasplante y cada 3-5 días.' +
      '</div>' +
    '</div>';
  } else {
    html += '<div class="diario-tl-heading">' +
      '📅 Línea de tiempo</div>';

    // Ordenar fotos por fecha
    const fotasOrdenadas = [...fotos].sort((a,b) => new Date(a.isoDate||a.fecha) - new Date(b.isoDate||b.fecha));

    fotasOrdenadas.forEach((f, i) => {
      html += '<div class="diario-tl-row">' +
        // Columna izquierda: línea + punto
        '<div class="diario-tl-rail">' +
          '<div class="diario-tl-dot"></div>' +
          (i < fotasOrdenadas.length-1
            ? '<div class="diario-tl-line"></div>'
            : '') +
        '</div>' +
        // Contenido
        '<div class="diario-tl-body">' +
          // Fecha y día
          '<div class="diario-tl-date">' +
            f.fecha + (f.hora ? ' · ' + f.hora : '') +
            (f.diasCultivo !== null && f.diasCultivo !== undefined
              ? ' <span class="diario-tl-dia-badge">Día ' + f.diasCultivo + '</span>'
              : '') +
          '</div>' +
          // Foto — placeholder, la imagen real se inserta con JS después (clave IDB si existe)
          '<div class="diario-foto-slot" data-foto-idx="' + i + '" ' +
            'data-foto-key="' + (f.key || '') + '" ' +
            'data-variedad="' + variedad.replace(/"/g,"'") + '" data-fecha="' + f.fecha + '">📸</div>' +
          // Notas de la foto si las tiene
          (f.notas
            ? '<div class="diario-tl-notas">💬 ' + f.notas + '</div>'
            : '') +
        '</div>' +
      '</div>';
    });

    // Comparador antes/después si hay ≥2 fotos
    if (fotos.length >= 2) {
      const primera = fotasOrdenadas[0];
      const ultima  = fotasOrdenadas[fotasOrdenadas.length-1];
      html += '<div class="diario-compare-wrap">' +
        '<div class="diario-compare-title">' +
          '🔍 Comparativa inicio/ahora</div>' +
        '<div class="diario-compare-grid">' +
          '<div>' +
            '<div class="compat-foto-slot" data-alt="Inicio">📸</div>' +
            '<div class="diario-compare-caption">' +
              '📅 ' + primera.fecha + (primera.diasCultivo !== null && primera.diasCultivo !== undefined ? ' · Día ' + primera.diasCultivo : '') +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="compat-foto-slot" data-alt="Ahora">📸</div>' +
            '<div class="diario-compare-caption">' +
              '📅 ' + ultima.fecha + (ultima.diasCultivo !== null && ultima.diasCultivo !== undefined ? ' · Día ' + ultima.diasCultivo : '') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  }

  contenido.innerHTML = html;

  // Insertar imágenes reales en los placeholders (evita truncamiento de base64 en innerHTML)
  const fotasParaInsertar = [...fotos].sort((a,b) => new Date(a.isoDate||a.fecha) - new Date(b.isoDate||b.fecha));
  const resolverDataFoto = async (foto) => {
    if (foto && foto.data) return foto.data;
    if (foto && foto.key) {
      try {
        const o = await leerFotoIDB(foto.key);
        return o && o.data ? o.data : '';
      } catch (_) { return ''; }
    }
    return '';
  };

  for (const slot of contenido.querySelectorAll('.diario-foto-slot')) {
    const idx = parseInt(slot.getAttribute('data-foto-idx'), 10);
    const foto = fotasParaInsertar[idx];
    const src = await resolverDataFoto(foto);
    if (!src) continue;
    const img = document.createElement('img');
    img.src = src;
    img.alt = variedad + ' día ' + (foto && foto.diasCultivo != null ? foto.diasCultivo : idx);
    img.className = 'diario-foto-img';
    img.setAttribute('data-variedad', (foto && foto.variedad) || variedad);
    img.setAttribute('data-fecha', (foto && foto.fecha) || '');
    img.addEventListener('click', function() {
      verFotoCompletaDiario(this.src, this.getAttribute('data-variedad'), this.getAttribute('data-fecha'));
    });
    slot.replaceWith(img);
  }

  const compatSlots = contenido.querySelectorAll('.compat-foto-slot');
  if (compatSlots.length === 2 && fotosParaInsertar.length >= 2) {
    const prim = fotosParaInsertar[0];
    const ult  = fotosParaInsertar[fotosParaInsertar.length - 1];
    const src0 = await resolverDataFoto(prim);
    const src1 = await resolverDataFoto(ult);
    const pairs = [[compatSlots[0], src0], [compatSlots[1], src1]];
    for (const [slot, src] of pairs) {
      if (!src) continue;
      const img = document.createElement('img');
      img.src = src;
      img.alt = slot.getAttribute('data-alt') || '';
      img.className = 'diario-compat-img';
      slot.replaceWith(img);
    }
  }

  // Scroll al principio
  contenido.scrollIntoView({ behavior:'smooth', block:'start' });
  } catch(e) { console.error('renderDiarioPlanta error:', e); if(contenido) contenido.innerHTML = '<div class="diario-error-msg">Error cargando diario: ' + e.message + '</div>'; }
}

function volverDiarioSelector() {
  const sel = document.getElementById('diarioPlantaSelector');
  const contenido = document.getElementById('diarioContenido');
  if (sel) sel.style.display = 'flex';
  if (contenido) contenido.innerHTML = '';
  if (sel) sel.style.flexDirection = 'column';
}

async function agregarFotoDesdeDiario(event, nivel, cesta) {
  const prevEditing = editingCesta;
  editingCesta = { nivel, cesta };
  try {
    await agregarFotoCesta(event);
    await renderDiarioPlanta(nivel, cesta);
  } catch (e) {
    console.error(e);
    showToast('No se pudo guardar la foto', true);
  } finally {
    editingCesta = prevEditing;
  }
}

function verFotoCompletaDiario(dataUrl, variedad, fecha) {
  const labFoto = escHtmlUi(cultivoNombreLista(getCultivoDB(variedad), variedad));
  const altFoto = escHtmlUi(String(variedad || ''));
  const feFoto = escHtmlUi(String(fecha || ''));
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Foto del diario');
  overlay.className = 'diario-lightbox diario-lightbox--solid';
  overlay.innerHTML =
    '<div class="diario-lightbox-title">' + labFoto + ' · ' + feFoto + '</div>' +
    '<img src="' + dataUrl + '" alt="' + altFoto + '" class="diario-lightbox-img diario-lightbox-img--75">' +
    '<button type="button" class="diario-lightbox-btn">' +
      'Cerrar</button>';
  const cerrarOv = () => {
    a11yDialogClosed(overlay);
    overlay.remove();
  };
  overlay.querySelector('button')?.addEventListener('click', cerrarOv);
  overlay.onclick = e => { if (e.target === overlay) cerrarOv(); };
  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
}


async function verFotoCompleta(idx) {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const lista = await getFotosCompletasParaCesta(nivel, cesta);
  const f = lista[idx];
  if (!f) return;
  let dataUrl = f.data || '';
  if (!dataUrl && f.key) {
    try {
      const o = await leerFotoIDB(f.key);
      if (o && o.data) dataUrl = o.data;
    } catch (_) {}
  }
  if (!dataUrl) return;
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Foto de la planta');
  overlay.className = 'diario-lightbox diario-lightbox--plant';
  overlay.innerHTML =
    '<img src="" alt="Foto planta" class="diario-lightbox-img diario-lightbox-img--80">' +
    '<div class="diario-lightbox-cap"></div>' +
    '<button type="button" class="diario-lightbox-btn diario-lightbox-btn--round">Cerrar</button>';
  const img = overlay.querySelector('img');
  const cap = overlay.querySelector('div');
  const cerrar = overlay.querySelector('button');
  if (img) img.src = dataUrl;
  if (cap) cap.textContent = (f.fecha || '') + (f.hora ? ' · ' + f.hora : '');
  const cerrarOv = () => {
    a11yDialogClosed(overlay);
    overlay.remove();
  };
  if (cerrar) cerrar.addEventListener('click', cerrarOv);
  overlay.onclick = (e) => { if (e.target === overlay) cerrarOv(); };
  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
}

async function borrarFotoCesta(idx) {
  if (!editingCesta || !confirm('¿Borrar esta foto?')) return;
  const { nivel, cesta } = editingCesta;
  const cestaData = state.torre[nivel][cesta];
  if (!cestaData) return;
  const lista = await getFotosCompletasParaCesta(nivel, cesta);
  const target = lista[idx];
  if (!target) return;
  if (target.key) {
    try { await borrarFotoIDB(target.key); } catch (_) {}
    const k = cestaData.fotoKeys;
    if (Array.isArray(k)) {
      const i = k.indexOf(target.key);
      if (i >= 0) k.splice(i, 1);
    }
  }
  const fotosArr = cestaData.fotos;
  if (fotosArr && fotosArr.length) {
    const j = fotosArr.findIndex(
      f => f && (target.key ? f.key === target.key : !f.key && f.isoDate === target.isoDate && f.fecha === target.fecha));
    if (j >= 0) fotosArr.splice(j, 1);
  }
  saveState();
  void renderFotosCesta();
}

function poblarSelectVariedades() {
  const sel = document.getElementById('editVariedad');
  if (!sel) return;
  // Guardar valor actual
  const valActual = sel.value;
  sel.innerHTML = '<option value="">— Vacía —</option>';

  // Agrupar por grupo
  const grupos = {};
  CULTIVOS_DB.forEach(c => {
    if (!grupos[c.grupo]) grupos[c.grupo] = [];
    grupos[c.grupo].push(c);
  });

  const nombreGrupos = {
    lechugas:'Lechugas', hojas:'Hojas verdes', asiaticas:'Asiáticas / Mostaza',
    hierbas:'Hierbas', frutos:'Frutos', fresas:'Fresas',
    raices:'Raíces', microgreens:'Microgreens'
  };

  Object.entries(grupos).forEach(([gKey, cultivos]) => {
    const og = document.createElement('optgroup');
    og.label = nombreGrupos[gKey] || gKey;
    cultivos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nombre;
      opt.innerHTML = cultivoEmojiHtml(c, 1.05) + ' ' + escOptionHtml(cultivoNombreLista(c, c.nombre));
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });

  // Restaurar valor
  if (valActual) sel.value = valActual;
}

function openModal(nivel, cesta) {
  editingCesta = { nivel, cesta };
  const data = state.torre[nivel][cesta];
  document.getElementById('modalTitle').textContent = `Nivel ${nivel + 1} — Cesta ${cesta + 1}`;
  document.getElementById('editVariedad').value = data.variedad || '';
  document.getElementById('editFecha').value = data.fecha || '';
  document.getElementById('editNotas').value = data.notas || '';
  poblarSelectVariedades();
  const mo = document.getElementById('modalOverlay');
  mo.classList.add('open');
  a11yDialogOpened(mo);
  // Renderizar fotos si las hay
  setTimeout(renderFotosCesta, 50);
}

function closeModal(e) {
  const mo = document.getElementById('modalOverlay');
  if (!e || e.target === mo) {
    mo.classList.remove('open');
    editingCesta = null;
    a11yDialogClosed(mo);
  }
}

// ══════════════════════════════════════════════════
// BORRAR ENTRADAS DEL HISTORIAL
// ══════════════════════════════════════════════════

function borrarMedicion(fecha, hora, torreId) {
  if (!confirm('¿Borrar esta entrada del historial?')) return;
  initTorres();
  let slot = state.torres.findIndex(t => t && String(t.id) === String(torreId));
  if (slot < 0) slot = state.torreActiva || 0;
  const t = state.torres[slot];
  if (!t || !Array.isArray(t.mediciones)) {
    showToast('No se encontró la instalación', true);
    return;
  }
  const i = t.mediciones.findIndex(m => m && m.fecha === fecha && m.hora === hora);
  if (i < 0) {
    showToast('No se encontró el dato', true);
    return;
  }
  const row = t.mediciones[i];
  const tipoReg = (function inferTipoRegBorradoMedicion(r) {
    if (!r) return 'medicion';
    if (r.tipo === 'cosecha') return 'cosecha';
    if (r.tipo === 'reposicion') return 'reposicion';
    if (r.tipo === 'recarga') return 'recarga';
    if (String(r.notas || '').indexOf('Recarga completa') >= 0) return 'recarga';
    return 'medicion';
  })(row);

  borrarEntradaRegistroDesdeHistorial(slot, fecha, hora, tipoReg, true, true, true);

  t.mediciones.splice(i, 1);
  const um0 = t.mediciones.find(m => m && (m.tipo === 'medicion' || !m.tipo || m.tipo === ''));
  let ult = null;
  if (um0) {
    ult = {
      fecha: um0.fecha,
      hora: um0.hora,
      ec: um0.ec,
      ph: um0.ph,
      temp: um0.temp,
      vol: um0.vol,
      humSustrato: um0.humSustrato,
    };
  }
  t.ultimaMedicion = ult;
  if ((state.torreActiva || 0) === slot) {
    state.mediciones = t.mediciones;
    state.ultimaMedicion = ult ? { ...ult } : null;
  }
  saveState();
  renderHistMediciones();
  if (document.getElementById('tab-inicio')?.classList.contains('active')) updateDashboard();
  showToast('🗑 Entrada borrada');
}

/** Borrado desde lista agregada del historial (multi-torre). */
function borrarEntradaRegistroDesdeHistorial(slotIdx, fecha, hora, tipo, skipConfirm, suppressToast, silentOnMissing) {
  if (!skipConfirm && !confirm('¿Borrar esta entrada del registro?')) return false;
  initTorres();
  guardarEstadoTorreActual();
  const t = state.torres[slotIdx];
  if (!t || !Array.isArray(t.registro)) return false;
  const i = t.registro.findIndex(r => r && r.tipo === tipo && r.fecha === fecha && r.hora === hora);
  if (i < 0) {
    if (!silentOnMissing) showToast('No se encontró la entrada', true);
    return false;
  }
  const entry = t.registro[i];
  if (entry && entry.tipo === 'foto_sistema' && entry.fotoKey) {
    void borrarFotoIDB(entry.fotoKey);
    ensureFotosSistemaCompletoState();
    const k = entry.fotoKey;
    state.fotosSistemaCompleto.fotoKeys = (state.fotosSistemaCompleto.fotoKeys || []).filter(x => x !== k);
    state.fotosSistemaCompleto.fotos = (state.fotosSistemaCompleto.fotos || []).filter(f => !f || f.key !== k);
    guardarEstadoTorreActual();
  }
  t.registro.splice(i, 1);
  if ((state.torreActiva || 0) === slotIdx) state.registro = t.registro;
  saveState();
  renderRegistro();
  const diarioPanel = document.getElementById('histDiarioPanel');
  if (diarioPanel && !diarioPanel.classList.contains('setup-hidden')) renderDiarioBloqueSistema();
  if (document.getElementById('tab-mediciones')?.classList.contains('active') && typeof actualizarResumenReposicionParcialUI === 'function') {
    actualizarResumenReposicionParcialUI();
  }
  if (!suppressToast) showToast('🗑 Entrada borrada');
  return true;
}

function borrarEntradaRegistro(idx) {
  if (!confirm('¿Borrar esta entrada del registro?')) return;
  if (!state.registro) return;
  const entry = state.registro[idx];
  if (!entry) return;
  borrarEntradaRegistroDesdeHistorial(
    state.torreActiva || 0,
    entry.fecha,
    entry.hora,
    entry.tipo,
    true,
    false,
    false
  );
}

function borrarRecargaLocal(idx) {
  if (!confirm('¿Borrar esta recarga?')) return;
  if (!Array.isArray(state.recargasLocal) || idx < 0 || idx >= state.recargasLocal.length) return;

  const borrada = state.recargasLocal[idx];
  state.recargasLocal.splice(idx, 1);

  // Si se borra la última recarga de la instalación activa, recalcular marcador.
  try {
    const tAct = getTorreActiva();
    const tIdAct = tAct && tAct.id != null ? tAct.id : (state.torreActiva || 0);
    const bId = borrada && (borrada.torreId != null ? borrada.torreId : null);
    const mismaTorre = bId == null || String(bId) === String(tIdAct);
    if (mismaTorre) {
      const fechaIsoBorrada = (borrada && typeof borrada.fecha === 'string' && borrada.fecha.includes('/'))
        ? borrada.fecha.split('/').reverse().join('-')
        : null;
      if (fechaIsoBorrada && state.ultimaRecarga === fechaIsoBorrada) {
        const restantes = (state.recargasLocal || []).filter(r => {
          const rid = r && (r.torreId != null ? r.torreId : null);
          return rid == null || String(rid) === String(tIdAct);
        });
        if (!restantes.length) {
          state.ultimaRecarga = null;
        } else {
          const toTs = (r) => {
            if (!r || typeof r.fecha !== 'string') return 0;
            const p = r.fecha.split('/');
            if (p.length !== 3) return 0;
            const d = parseInt(p[0], 10);
            const m = parseInt(p[1], 10) - 1;
            const y = parseInt(p[2], 10);
            if (!y || m < 0 || m > 11 || d < 1 || d > 31) return 0;
            const hm = String(r.hora || '').split(':');
            const hh = Math.max(0, Math.min(23, parseInt(hm[0], 10) || 0));
            const mm = Math.max(0, Math.min(59, parseInt(hm[1], 10) || 0));
            return new Date(y, m, d, hh, mm, 0, 0).getTime();
          };
          const recReciente = restantes.slice().sort((a, b) => toTs(b) - toTs(a))[0];
          const p = String(recReciente.fecha || '').split('/');
          state.ultimaRecarga = p.length === 3 ? [p[2], p[1], p[0]].join('-') : state.ultimaRecarga;
        }
      }
    }
  } catch (_) {}

  saveState();
  renderHistRecargas();
  if (typeof renderRegistro === 'function' && histTabActiva === 'registro') renderRegistro();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) {
    try { updateRecargaBar(); } catch (_) {}
  }
  showToast('🗑 Recarga borrada');
}

// ══════════════════════════════════════════════════
// REGISTRO COMPLETO — mediciones, cosechas, recargas
// ══════════════════════════════════════════════════

function initRegistro() {
  if (!state.registro) state.registro = [];
}

function addRegistro(tipo, datos) {
  initRegistro();
  const now  = new Date();
  const dia  = String(now.getDate()).padStart(2,'0');
  const mes  = String(now.getMonth()+1).padStart(2,'0');
  const fecha = dia + '/' + mes + '/' + now.getFullYear();
  const hora  = now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
  const tActiva = getTorreActiva();
  const d = datos && typeof datos === 'object' ? { ...datos } : {};
  let snap = d.tipoInstalSnap;
  delete d.tipoInstalSnap;
  let tidReg = d.torreId;
  delete d.torreId;
  const tipoSnap =
    snap === 'nft' || snap === 'dwc' || snap === 'torre'
      ? snap
      : tipoInstalacionNormalizado(state.configTorre || {});
  const torreIdReg =
    tidReg != null && tidReg !== ''
      ? tidReg
      : tActiva.id != null
        ? tActiva.id
        : state.torreActiva || 0;
  state.registro.unshift({
    tipo, fecha, hora,
    torreNombre: (tActiva.nombre || '').trim() || 'Instalación',
    torreEmoji:  tActiva.emoji  || '🌿',
    ...d,
    torreId: torreIdReg,
    tipoInstalSnap: tipoSnap,
  });
  if (state.registro.length > 200) state.registro = state.registro.slice(0, 200);
  saveState();
}

// Cosechar una cesta y guardar trazabilidad completa
function cosecharCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const data = state.torre[nivel][cesta];
  if (!data.variedad) { closeModal(); return; }

  const diasCultivo = data.fecha
    ? Math.floor((Date.now() - new Date(data.fecha)) / 86400000)
    : null;

  // Guardar en registro con trazabilidad completa
  addRegistro('cosecha', {
    variedad:    data.variedad,
    nivel:       nivel + 1,
    cesta:       cesta + 1,
    fechaSiembra: data.fecha || '',
    diasCultivo: diasCultivo,
    notas:       data.notas || '',
    icono:       '✂️'
  });

  // También guardar en state.mediciones para el historial
  if (!state.mediciones) state.mediciones = [];
  const nomCosechaUi = cultivoNombreLista(getCultivoDB(data.variedad), data.variedad);
  const tCose = tipoInstalacionNormalizado(state.configTorre || {});
  const ubiCose = formatoUbicacionEnRegistro(tCose, nivel + 1, cesta + 1);
  state.mediciones.unshift({
    fecha: state.registro[0].fecha,
    hora:  state.registro[0].hora,
    tipo:  'cosecha',
    ec: '', ph: '', temp: '', vol: '',
    notas: '✂️ Cosecha: ' + nomCosechaUi +
           (ubiCose ? ' · ' + ubiCose : '') +
           (diasCultivo ? ' · ' + diasCultivo + ' días' : '') +
           (data.notas ? ' · ' + data.notas : '')
  });

  // Vaciar la cesta
  state.torre[nivel][cesta] = { variedad: '', fecha: '', notas: '' };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
  showToast('✂️ ' + nomCosechaUi + ' cosechada y registrada · ' + (diasCultivo || '?') + ' días');
}

function saveCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const prev = state.torre[nivel][cesta] || {};
  state.torre[nivel][cesta] = {
    variedad: document.getElementById('editVariedad').value,
    fecha: document.getElementById('editFecha').value,
    notas: document.getElementById('editNotas').value,
    fotos: Array.isArray(prev.fotos) ? prev.fotos : [],
    fotoKeys: Array.isArray(prev.fotoKeys) ? prev.fotoKeys : [],
  };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
}

function clearCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  state.torre[nivel][cesta] = { variedad: '', fecha: '', notas: '', fotos: [], fotoKeys: [] };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
}

// ══════════════════════════════════════════════════
// CONFIGURACIÓN AGUA Y SUSTRATO
// ══════════════════════════════════════════════════

// ── Base de datos EC agua del grifo por municipio ───────────────────────────
// Fuente: SINAC Ministerio de Sanidad + análisis medios conocidos
// EC en µS/cm (media anual aproximada)
const AGUA_MUNICIPIOS = {
  // Comunidad Valenciana
  "Castelló de la Plana":  { ec: 850, dureza: "Muy dura",  nota: "Agua del río Mijares — muy dura" },
  "Valencia":              { ec: 620, dureza: "Dura",       nota: "Mezcla ríos Turia y Júcar" },
  "Alicante":              { ec: 740, dureza: "Dura",       nota: "Agua desalada + acuíferos" },
  "Elche":                 { ec: 780, dureza: "Muy dura",   nota: "Acuíferos locales" },
  "Torrevieja":            { ec: 690, dureza: "Dura",       nota: "Desaladora del Júcar" },
  "Benidorm":              { ec: 680, dureza: "Dura",       nota: "Marina Baixa" },
  "Gandia":                { ec: 590, dureza: "Dura",       nota: "Río Serpis" },
  "Sagunto":               { ec: 710, dureza: "Dura",       nota: "Canal del Camp de Morvedre" },
  "Torrent":               { ec: 600, dureza: "Dura",       nota: "EMIVASA Valencia" },
  "Vila-real":             { ec: 830, dureza: "Muy dura",   nota: "Mismo sistema que Castelló" },
  // CV — Plana / Maestrat / interior Castelló (aguas duras, referencia Mijares–red provincial)
  "Almassora":             { ec: 840, dureza: "Muy dura",   nota: "Plana — red próxima a Castelló" },
  "Burriana":              { ec: 820, dureza: "Muy dura",   nota: "Litoral norte Castelló" },
  "Benicarló":             { ec: 800, dureza: "Dura",       nota: "Baix Maestrat — agua dura típica" },
  "Vinaròs":               { ec: 790, dureza: "Dura",       nota: "Litoral nord — similar Benicarló" },
  "Onda":                  { ec: 860, dureza: "Muy dura",   nota: "Interior Plana Alta" },
  "Nules":                 { ec: 850, dureza: "Muy dura",   nota: "Plana Baixa — similar Vila-real" },
  "Peníscola":             { ec: 795, dureza: "Dura",       nota: "Litoral norte — acuífero y red local" },
  "Morella":               { ec: 720, dureza: "Dura",       nota: "Els Ports — manantiales y mezcla red" },
  "Segorbe":               { ec: 740, dureza: "Dura",       nota: "Alto Palancia — interior Castelló" },
  "Vilafranca del Cid":    { ec: 715, dureza: "Dura",       nota: "Alt Maestrat — manantiales y red" },
  "Monòver":               { ec: 728, dureza: "Dura",       nota: "Vinalopó Medio — similar Elda" },
  // CV — Horta / Safor / Ribera / interior València
  "Alzira":                { ec: 640, dureza: "Dura",       nota: "Ribera Alta — Júcar / red valenciana" },
  "Sueca":                 { ec: 610, dureza: "Dura",       nota: "Litoral sud — acuíferos costeros" },
  "Cullera":               { ec: 600, dureza: "Dura",       nota: "Túria / red metropolitana sur" },
  "Xàtiva":                { ec: 680, dureza: "Dura",       nota: "Costera — acuíferos y red interior" },
  "Ontinyent":             { ec: 700, dureza: "Dura",       nota: "Vall d'Albaida — dura" },
  "Manises":               { ec: 610, dureza: "Dura",       nota: "Àrea metropolitana — mixta EMIVASA" },
  "Burjassot":             { ec: 615, dureza: "Dura",       nota: "Metropolitana Valencia" },
  "Paterna":               { ec: 605, dureza: "Dura",       nota: "Metropolitana — similar Torrent" },
  "Mislata":               { ec: 615, dureza: "Dura",       nota: "Metropolitana Valencia" },
  "Xirivella":             { ec: 618, dureza: "Dura",       nota: "Metropolitana Valencia" },
  "Oliva":                 { ec: 580, dureza: "Dura",       nota: "Safor — similar Gandia" },
  "Carcaixent":            { ec: 650, dureza: "Dura",       nota: "Ribera Alta — Júcar" },
  // CV — Marina / Alacantí / Vinalopó / Vega Baja
  "Dénia":                 { ec: 650, dureza: "Dura",       nota: "Marina Alta — acuíferos y red" },
  "Calp":                  { ec: 670, dureza: "Dura",       nota: "Marina Alta — similar Benidorm" },
  "Altea":                 { ec: 660, dureza: "Dura",       nota: "Marina Baixa" },
  "Xàbia":                 { ec: 640, dureza: "Dura",       nota: "Marina Alta" },
  "Orihuela":              { ec: 760, dureza: "Dura",       nota: "Vega Baja — trasvase y acuíferos" },
  "Elda":                  { ec: 720, dureza: "Dura",       nota: "Vinalopó Medio — muy mineralizada" },
  "Alcoi":                 { ec: 690, dureza: "Dura",       nota: "Hoya de Alcoy — manantiales y red" },
  "Villena":               { ec: 710, dureza: "Dura",       nota: "Alto Vinalopó" },
  "Novelda":               { ec: 750, dureza: "Muy dura",   nota: "Medio Vinalopó — muy dura" },
  "Crevillent":            { ec: 770, dureza: "Muy dura",   nota: "Bajo Vinalopó — similar Elche" },
  "Santa Pola":            { ec: 700, dureza: "Dura",       nota: "Litoral — acuífero y salinas" },
  "Guardamar del Segura":  { ec: 720, dureza: "Dura",       nota: "Litoral sur — trasvase" },
  "La Vila Joiosa":        { ec: 675, dureza: "Dura",       nota: "Marina Baixa — similar Benidorm" },
  "Finestrat":             { ec: 670, dureza: "Dura",       nota: "Marina Baixa" },
  "Callosa d'en Sarrià":   { ec: 655, dureza: "Dura",       nota: "Marina Baixa interior" },
  "Ibi":                   { ec: 695, dureza: "Dura",       nota: "Alcoià — similar Alcoi" },
  "Mutxamel":              { ec: 735, dureza: "Dura",       nota: "Camp d'Alacant — similar Alicante" },
  "San Vicente del Raspeig": { ec: 745, dureza: "Dura",     nota: "Camp d'Alacant — campus y red urbana" },
  "El Campello":           { ec: 710, dureza: "Dura",       nota: "Litoral — mezcla acuífero" },
  // Cataluña
  "Barcelona":             { ec: 180, dureza: "Blanda",     nota: "Río Ter — blanda en España" },
  "L'Hospitalet":          { ec: 190, dureza: "Blanda",     nota: "Red metropolitana Barcelona" },
  "Badalona":              { ec: 195, dureza: "Blanda",     nota: "Red metropolitana Barcelona" },
  "Terrassa":              { ec: 210, dureza: "Blanda",     nota: "Consorci Aigues Ter-Llobregat" },
  "Sabadell":              { ec: 205, dureza: "Blanda",     nota: "Consorci Aigues Ter-Llobregat" },
  "Tarragona":             { ec: 420, dureza: "Moderada",   nota: "Río Ebre" },
  "Lleida":                { ec: 480, dureza: "Moderada",   nota: "Canal d'Urgell" },
  "Girona":                { ec: 210, dureza: "Blanda",     nota: "Río Ter" },
  // Madrid
  "Madrid":                { ec: 250, dureza: "Blanda",     nota: "Embalses sierra — muy buena" },
  "Alcalá de Henares":     { ec: 380, dureza: "Moderada",   nota: "Canal de Isabel II" },
  "Leganés":               { ec: 260, dureza: "Blanda",     nota: "Canal de Isabel II" },
  "Getafe":                { ec: 270, dureza: "Blanda",     nota: "Canal de Isabel II" },
  "Alcorcón":              { ec: 255, dureza: "Blanda",     nota: "Canal de Isabel II" },
  "Torrejón de Ardoz":     { ec: 390, dureza: "Moderada",   nota: "Canal de Isabel II" },
  // Andalucía
  "Sevilla":               { ec: 420, dureza: "Moderada",   nota: "Río Guadalquivir" },
  "Málaga":                { ec: 390, dureza: "Moderada",   nota: "Embalse del Guadalhorce" },
  "Córdoba":               { ec: 450, dureza: "Moderada",   nota: "Río Guadalquivir" },
  "Granada":               { ec: 280, dureza: "Blanda",     nota: "Sierra Nevada — buena calidad" },
  "Almería":               { ec: 710, dureza: "Dura",       nota: "Acuíferos + desaladora" },
  "Cádiz":                 { ec: 350, dureza: "Moderada",   nota: "Embalses locales" },
  "Jerez de la Frontera":  { ec: 460, dureza: "Moderada",   nota: "Embalse de Guadalcacín" },
  "Huelva":                { ec: 380, dureza: "Moderada",   nota: "Embalse del Chanza" },
  "Jaén":                  { ec: 320, dureza: "Moderada",   nota: "Embalse del Quiebrajano" },
  // País Vasco
  "Bilbao":                { ec: 170, dureza: "Muy blanda", nota: "Embalse de Ordunte — excelente" },
  "San Sebastián":         { ec: 165, dureza: "Muy blanda", nota: "Urumea — agua de montaña" },
  "Vitoria-Gasteiz":       { ec: 175, dureza: "Muy blanda", nota: "Embalse de Ullibarri" },
  // Aragón / Navarra / La Rioja
  "Zaragoza":              { ec: 540, dureza: "Dura",        nota: "Río Ebro" },
  "Pamplona":              { ec: 290, dureza: "Blanda",      nota: "Embalse de Eugui" },
  "Logroño":               { ec: 380, dureza: "Moderada",    nota: "Río Ebro — embalse Pajares" },
  // Castilla y León / Castilla-La Mancha
  "Valladolid":            { ec: 320, dureza: "Moderada",    nota: "Río Duero" },
  "Burgos":                { ec: 280, dureza: "Blanda",      nota: "Río Arlanzón" },
  "Salamanca":             { ec: 290, dureza: "Blanda",      nota: "Río Tormes" },
  "Toledo":                { ec: 490, dureza: "Moderada",    nota: "Río Tajo" },
  "Albacete":              { ec: 560, dureza: "Dura",        nota: "Acuíferos manchegos" },
  // Galicia
  "Vigo":                  { ec: 120, dureza: "Muy blanda",  nota: "Embalse de Eiras — la más blanda" },
  "A Coruña":              { ec: 130, dureza: "Muy blanda",  nota: "Embalse de Cecebre" },
  "Santiago de Compostela":{ ec: 125, dureza: "Muy blanda",  nota: "Embalse de Pontevea" },
  // Murcia / Extremadura
  "Murcia":                { ec: 680, dureza: "Dura",        nota: "Trasvase Tajo-Segura" },
  "Cartagena":             { ec: 720, dureza: "Dura",        nota: "Desaladora + trasvase" },
  "Badajoz":               { ec: 290, dureza: "Blanda",      nota: "Río Guadiana" },
  "Cáceres":               { ec: 210, dureza: "Blanda",      nota: "Embalse de Valdesalor" },
  // Islas
  "Palma de Mallorca":     { ec: 620, dureza: "Dura",        nota: "Acuíferos + desaladora" },
  "Las Palmas de GC":      { ec: 660, dureza: "Dura",        nota: "Desaladora oceánica" },
  "Santa Cruz de Tenerife":{ ec: 580, dureza: "Dura",        nota: "Desaladora + galerías" },
  // Asturias / Cantabria
  "Oviedo":                { ec: 155, dureza: "Muy blanda",  nota: "Embalse de Trasona" },
  "Gijón":                 { ec: 160, dureza: "Muy blanda",  nota: "Embalse de Trasona" },
  "Santander":             { ec: 145, dureza: "Muy blanda",  nota: "Embalse del Ebro" },
};

/** Normaliza texto para comparar municipios (minúsculas, sin tildes). */
function normalizaMunicipioStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Sinónimos toponímicos (valenciano/castellano u otras grafías) → clave canónica en AGUA_MUNICIPIOS.
 * Así "Castellón", "Castelló" o "Castellón de la Plana" encuentran el mismo registro que Castelló de la Plana.
 */
const MUNICIPIO_ALIAS_A_CANON = (() => {
  const m = Object.create(null);
  const reg = (aliasList, canon) => {
    aliasList.forEach(a => {
      const k = normalizaMunicipioStr(a);
      if (k) m[k] = canon;
    });
  };
  // ── Comunitat Valenciana: bilingüe (valencià / castellà) y grafías habituales ──
  reg(['Castellón de la Plana', 'Castellón', 'Castello de la Plana', 'Castello', 'Castelló', 'Castelló de la Plana', 'La Plana'], 'Castelló de la Plana');
  reg(['València', 'Valencia ciutat', 'Valéncia', 'Ciutat de Valencia', 'Ciudad de Valencia'], 'Valencia');
  reg(['Alacant', 'Alicante ciudad', 'Alacant ciutat'], 'Alicante');
  reg(['Elx', 'Elche ciudad'], 'Elche');
  reg(['Gandía', 'Gandia ciudad', 'La Safor'], 'Gandia');
  reg(['Sagunt', 'Murviedro', 'Sagunto ciudad'], 'Sagunto');
  reg(['Villarreal', 'Vila Real', 'Vila-real', 'Vila Real de'], 'Vila-real');
  reg(['Almazora', 'Almassora', 'Almazara'], 'Almassora');
  reg(['Borriana', 'Borrianes'], 'Burriana');
  reg(['Benicarlo'], 'Benicarló');
  reg(['Vinaroz', 'Vinaros', 'Vinaròs'], 'Vinaròs');
  reg(['Peniscola', 'Peníscola', 'Peñíscola'], 'Peníscola');
  reg(['Moixent', 'Mogente'], 'Xàtiva');
  reg(['Montesa'], 'Ontinyent');
  reg(['Alcira', 'Algezira', 'Alzira ciutat'], 'Alzira');
  reg(['Játiva', 'Xativa'], 'Xàtiva');
  reg(['Onteniente'], 'Ontinyent');
  reg(['Denia', 'Diana'], 'Dénia');
  reg(['Calpe'], 'Calp');
  reg(['Jávea', 'Javea', 'Xabia'], 'Xàbia');
  reg(['Oriola', 'Orihuela ciudad'], 'Orihuela');
  reg(['Petrer', 'Petrer de los Valles', 'Petrer dels Alagons'], 'Elda');
  reg(['Alcoy', 'Alcoy de', 'Alcoi ciutat'], 'Alcoi');
  reg(['Crevillente'], 'Crevillent');
  reg(['Villajoyosa', 'La Vila Joiosa', 'Vila Joiosa', 'Vila-Joiosa', 'La Vila'], 'La Vila Joiosa');
  reg(['Callosa', "Callosa d'En Sarrià", 'Callosa den Sarria'], "Callosa d'en Sarrià");
  reg(['San Vicente del Raspeig', 'Sant Vicent del Raspeig', 'San Vicente', 'Sant Vicent'], 'San Vicente del Raspeig');
  reg(['Muchamiel', 'Mutxamel'], 'Mutxamel');
  reg(['El Campello', "L'Altet", "l'Altet"], 'El Campello');
  reg(['Guardamar'], 'Guardamar del Segura');
  reg(['Monover', 'Monòver'], 'Monòver');
  reg(['Elda ciudad'], 'Elda');
  reg(['Novelda ciudad'], 'Novelda');
  reg(['Villena ciudad'], 'Villena');
  reg(['Ibi ciudad'], 'Ibi');
  reg(['Finestrat ciudad'], 'Finestrat');
  reg(['Santa Pola ciudad'], 'Santa Pola');
  reg(['Torrevieja ciudad', 'Torrevella', 'Torrevella de la Mata'], 'Torrevieja');
  reg(['Benidorm ciudad'], 'Benidorm');
  reg(['Torrent ciudad', 'Torrent de'], 'Torrent');
  reg(['Manises ciudad'], 'Manises');
  reg(['Burjassot ciudad'], 'Burjassot');
  reg(['Paterna ciudad'], 'Paterna');
  reg(['Mislata ciudad'], 'Mislata');
  reg(['Xirivella ciudad', 'Chirivella'], 'Xirivella');
  reg(['Carcaixent ciudad', 'Carcagente'], 'Carcaixent');
  reg(['Cullera ciudad'], 'Cullera');
  reg(['Sueca ciudad'], 'Sueca');
  reg(['Oliva ciudad', "l'Oliva"], 'Oliva');
  reg(['Morella ciudad'], 'Morella');
  reg(['Onda ciudad'], 'Onda');
  reg(['Nules ciudad'], 'Nules');
  reg(['Benicarló ciudad', 'Benicarlo ciudad'], 'Benicarló');
  reg(['Burriana ciudad', 'Borriana ciudad'], 'Burriana');
  reg(['Almassora ciudad', 'Almazora ciudad'], 'Almassora');
  // CV — pueblos frecuentes → municipio de referencia (misma comarca / red)
  reg(['Almenara', 'Tales', 'La Llosa', 'Moncofa', 'Chilches', 'Xilxes', 'La Vilavella', 'Les Alqueries', 'Alqueries'], 'Nules');
  reg(['Vall d Uixó', 'Vall d Uxo', 'La Vall d Uixó', 'Vall duixo'], 'Nules');
  reg(['Betxí', 'Betxi', 'Betchi'], 'Vila-real');
  reg(['Alqueries', 'Alquerias del Niño Perdido', 'Alqueríes del Niño Perdido', 'Alquerias'], 'Almassora');
  reg(['Cabanes', 'Cabanes de Mar', 'Orpesa', 'Oropesa del Mar', 'Orpesa del Mar'], 'Benicarló');
  reg(['Benicasim', 'Benicàssim', 'Benicasim playa'], 'Castelló de la Plana');
  reg(['Alcalà de Xivert', 'Alcala de Chivert', 'Torreblanca', 'Torreblanca playa'], 'Benicarló');
  reg(['Alcora', "l'Alcora", 'Alcora ciudad'], 'Onda');
  reg(['Lucena del Cid', 'Lucena Cid', 'Useras', 'Les Useres'], 'Onda');
  reg(['Segorbe', 'Segorb', 'Altura', 'Soneja', 'Soneixa'], 'Segorbe');
  reg(['Vilafranca', 'Vilafranca del Cid', 'Villafranca del Cid', 'Villafranca'], 'Vilafranca del Cid');
  reg(['Silla', 'Silla Valencia', 'Albalat de la Ribera', 'Albalat Ribera', 'Guadassuar', 'L Alcudia', "L'Alcúdia", 'Alcudia Valencia', 'Carlet', 'Alginet', 'Benimodo', 'Catadau', 'Llombai', 'Llocnou'], 'Carcaixent');
  reg(['Tavernes de la Valldigna', 'Tavernes Valldigna', 'Xeraco', 'Jaraco', 'Xeresa', 'Platja Xeraco'], 'Cullera');
  reg(['Cullera playa', 'Favara', 'Favara Ribera', 'Antella', 'Alberic', 'Benimuslem'], 'Alzira');
  reg(['L Eliana', "L'Eliana", 'La Eliana', 'La Pobla de Vallbona', 'Pobla Vallbona', 'Ribarroja', 'Riba-roja de Túria', 'Ribarroja del Turia', 'Benaguasil', 'Benisanó', 'Llíria', 'Liria', 'Marines', 'Gátova', 'Gatova', 'Olocau', 'Pedralba', 'Vilamarxant', 'Villamarchante'], 'Paterna');
  reg(['Quart de Poblet', 'Quart Poblet', 'Quart de les Valls', 'Aldaia', 'Adaya', 'Alaquàs', 'Alaquas', 'Albal', 'Albal Valencia', 'Alcàsser', 'Alcasser', 'Alfafar', 'Alfafar Valencia', 'Albalat dels Sorells', 'Albalat Sorells', 'Albalat dels Tarongers', 'Alboraya', 'Alboraia', 'Almàssera', 'Almàssera Valencia', 'Almassera', 'Benetússer', 'Benetusser', 'Beniparell', 'Benisano', 'Bétera', 'Betera', 'Bonrepòs i Mirambell', 'Bonrepos Mirambell', 'Burjassot playa', 'Catarroja', 'Chiva', 'Xiva', 'Xirivella playa', 'Foios', 'Godella', 'Massanassa', 'Meliana', 'Moncada', 'Museros', 'Paiporta', 'Picanya', 'Picassent', 'Puzol', 'Puçol', 'Quartell', 'Rafelbunyol', 'Rafelbuñol', 'Rocafort', 'Sedaví', 'Silla horta', 'Tavernes Blanques', 'Tavernes Blanques Valencia', 'Vinalesa', 'Vinalesa Valencia'], 'Burjassot');
  reg(['Albalat de la Ribera', 'Corbera', 'Fortaleny', 'Polinyà de Xúquer', 'Polinya Xuquer', 'Riola', 'Llanera de Ranes', 'Manuel', 'Real de Gandia', 'Real Gandia', 'Rafelcofer', 'Beniflá', 'Benifaio', 'Benifayo', 'Alfarp', 'Alfarb', 'Catadau horta', 'Montserrat Valencia', 'Montserrat Ribera', 'Montroy', 'Montroi', 'Llocnou de Sant Jeroni', 'Llocnou Sant Jeroni'], 'Carcaixent');
  reg(['Ador', 'Alfauir', 'Almoines', 'Barx', 'Barxeta', 'Beniarjó', 'Benirredrà', 'Castellonet', 'Castellonet de la Conquesta', 'Llocnou de Sant Jeroni', 'Palma de Gandia', 'Palma Gandia', 'Potries', 'Rafelcofer', 'Real de Gandia', 'Villalonga'], 'Gandia');
  reg(['Daimús', 'Daimus', 'Grau de Gandia', 'Platja Gandia', 'Miramar Valencia', 'Platja Miramar', 'Bellreguard', 'Bellreguart', 'Piles', 'Piles Valencia', 'Piles de la Baronia'], 'Gandia');
  reg(['Beniarbeig', 'Benidoleig', 'Benimeli', 'El Verger', 'Els Poblets', 'Poblets', 'Ondara', 'Pedreguer', 'Ràfol d Almúnia', 'Rafol Almunia', 'Sanet y Negrals', 'Sanet Negrals', 'Benissa', 'Benisa', 'Calp playa', 'Calpe playa', 'Teulada', 'Moraira', 'Benitachell', 'Poble Nou Benitatxell'], 'Dénia');
  reg(['Alfas del Pi', "l'Alfàs del Pi", 'Alfas Pi', 'Finestrat playa', 'Polop', 'Polop de la Marina', 'Relleu', 'Sella', 'Tàrbena', 'Tarbenya', 'Confrides', 'Benasau', 'Beniardá', 'Benimantell', 'Famorca', 'Facheca', 'Quatretondeta', 'Tollos'], 'Altea');
  reg(['Agres', 'Alcoleja', 'Alcolecha', 'Alfafara', 'Alfafara Alicante', 'Alfàs del Pi interior', "Alqueria d'Asnar", 'Beniarrés', 'Benilloba', 'Benillup', 'Benimarfull', 'Benimassot', 'Benimeli', 'Castalla', 'Cocentaina', 'Facheca', 'Gaianes', 'Gorga', 'Millena', 'Muro de Alcoy', 'Planes', 'Quatretondeta', 'Tibi'], 'Alcoi');
  reg(['Aspe', 'Hondon de las Nieves', 'Fondó', 'Fondo Nieves', 'Hondon Frailes', 'Monforte del Cid', 'Monforte Cid', 'Montealegre del Castillo', 'Pinoso', 'El Pinós', 'La Romana', 'La Romana Alicante', 'Algueña', 'Algueña Alicante', 'Herrada', 'Rafal', 'Redován', 'Redovan', 'San Isidro Alicante', 'Sant Isidre', 'Torrellano', 'Urbanización Torrellano'], 'Elda');
  reg(['Ulea', 'Blanca', 'Abarán', 'Abaran', 'Ceutí', 'Ceuti', 'Fortuna', 'Lorquí', 'Lorqui'], 'Orihuela');
  reg(['Algorfa', 'Almoradí', 'Almoradi', 'Benejúzar', 'Benejuzar', 'Benferri', 'Bigastro', 'Catral', 'Cox', 'Daya Nueva', 'Day Vieja', 'Dolores Alicante', 'Formentera del Segura', 'Granja Rocamora', 'Jacarilla', 'Los Montesinos', 'Montesinos', 'Pilar de la Horadada', 'Pilar Horadada', 'Rafal Torrevieja', 'San Fulgencio', 'San Miguel de Salinas', 'San Miguel Salinas', 'Torre de la Horadada', 'Torrevieja campo'], 'Orihuela');
  reg(['Agost campo', 'Busot', 'Campello playa', 'Campello Altet', 'Jijona', 'Xixona', 'Mutxamel playa', 'San Juan Alicante', 'Sant Joan Alacant', 'San Juan playa', 'Muchavista', 'El Rebolledo'], 'Mutxamel');
  reg(['Aigües', 'Aigues', 'Relleu', 'Tibi Alicante', 'Torremanzanas', 'Torremanzana', 'Villajoyosa playa'], 'La Vila Joiosa');
  // Resto España (alias ya existentes)
  reg(["L'Hospitalet de Llobregat", 'Hospitalet de Llobregat', 'Hospitalet'], "L'Hospitalet");
  reg(['Donostia', 'San Sebastián'], 'San Sebastián');
  reg(['Vitoria', 'Gasteiz'], 'Vitoria-Gasteiz');
  reg(['A Coruña', 'La Coruña'], 'A Coruña');
  reg(['Palma', 'Palma de Mallorca', 'Ciutat de Mallorca'], 'Palma de Mallorca');
  reg(['Las Palmas', 'Las Palmas de Gran Canaria'], 'Las Palmas de GC');
  return m;
})();

// Función para buscar municipio
function buscarMunicipio(query) {
  if (!query || query.length < 2) return [];
  const q = normalizaMunicipioStr(query);
  const seen = new Set();
  const out = [];

  function pushCanon(canonName) {
    const data = AGUA_MUNICIPIOS[canonName];
    if (!data || seen.has(canonName)) return;
    seen.add(canonName);
    out.push([canonName, data]);
  }

  const directCanon = MUNICIPIO_ALIAS_A_CANON[q];
  if (directCanon) pushCanon(directCanon);

  for (const aliasNorm of Object.keys(MUNICIPIO_ALIAS_A_CANON)) {
    if (aliasNorm.includes(q) || q.includes(aliasNorm)) {
      pushCanon(MUNICIPIO_ALIAS_A_CANON[aliasNorm]);
    }
  }

  Object.entries(AGUA_MUNICIPIOS).forEach(([nombre, data]) => {
    const n = normalizaMunicipioStr(nombre);
    if (n.includes(q) || q.includes(n)) pushCanon(nombre);
  });

  return out.slice(0, 8);
}

// Constantes por tipo de agua
const CONFIG_AGUA = {
  destilada: {
    nombre: 'Destilada',
    ecBase: 0,
    calmagMl: 6.7,       // ml para llegar a EC 0.4
    calmagNecesario: true,
    nota: 'Sin buffer — CalMag imprescindible'
  },
  osmosis: {
    nombre: 'Ósmosis',
    ecBase: 30,           // µS/cm base media
    calmagMl: 6.0,
    calmagNecesario: true,
    nota: 'EC base baja — CalMag muy recomendado'
  },
  grifo: {
    nombre: 'Grifo',
    ecBase: 850,          // Castelló — se puede sobrescribir
    calmagMl: 0,          // no necesario, el agua ya tiene Ca y Mg
    calmagNecesario: false,
    nota: 'Agua muy dura en Castelló — no recomendada'
  }
};

/**
 * Perfil de riego por sustrato — calibrado de forma coherente con tablas y manuales habituales
 * (extensión universitaria, fichas de sustratos hortícolas, comparativas WHC / aeración en hidroponía).
 * - retencion: índice interno 0.22–0.82 (no es un % volumétrico medido en campo). Ordena de menor a mayor
 *   “inercia” hídrica relativa: macroporos dominantes (perlita, LECA) abajo; fibras y láminas capilares
 *   (coco, lana, vermiculita) arriba. Entra en riegoMinutosDesdeDemanda vía sPulso y (0.88 + retencion×0.2).
 * - onRef / minOFFRef: min ON y min OFF de referencia (demanda≈1, ~15 plantas lechuga).
 */
const CONFIG_SUSTRATO = {
  esponja: {
    nombre: 'Esponja hidropónica',
    retencion: 0.50,
    onRef: 10.0,
    minOFFRef: 24,
    objetivoHumedadDefault: 58,
    whcPct: 'Media — fenólica/PU: poros finos + aire, entre LECA y cubo denso',
    poroAire: '≈35–48% (orden típico publicitario cubo esponja)',
    dryBack: 'Ligero secado entre pulsos sin llegar a estrés severo si el pulso está bien ajustado',
    nota: 'Valores medios de biblioteca “cubo rígido” frente a macroporos (LECA/perlita)'
  },
  lana: {
    nombre: 'Lana de roca',
    retencion: 0.76,
    onRef: 11.5,
    minOFFRef: 33,
    objetivoHumedadDefault: 63,
    whcPct: 'Muy alta agua fácilmente disponible en cubo comercial (fichas 65–90%+ por volumen de poros)',
    poroAire: '≈6–18% con matriz saturada según densidad',
    dryBack: 'Inercia hídrica alta; suele tolerar intervalos algo más largos entre pulsos',
    nota: 'Alto buffer hídrico — OFF más largo que LECA/perlita a igual demanda climática'
  },
  arcilla: {
    nombre: 'Arcilla expandida',
    retencion: 0.30,
    onRef: 8.2,
    minOFFRef: 17,
    objetivoHumedadDefault: 46,
    whcPct: 'Baja vs fibra — LECA: agua en poros grandes, poca matriz capilar fina',
    poroAire: '≈45–55% aire tras drenaje (típico bol LECA limpio)',
    dryBack: 'Evapotranspiración vacía poros rápido; en cubeta flood puede saturar distinto que en “solo bolas”',
    nota: 'En red/torre con poco contacto capilar suele comportarse más “seco” que coco o lana'
  },
  mixto: {
    nombre: 'Mixto (esponja + arcilla)',
    retencion: 0.57,
    onRef: 10.4,
    minOFFRef: 27,
    objetivoHumedadDefault: 54,
    whcPct: 'Intermedia — mezcla esponja/bol LECA en cesta',
    poroAire: 'Compromiso entre macroporos y poros de cubo',
    dryBack: 'Entre esponja sola (más estable) y solo LECA (más irregular)',
    nota: 'Montaje típico torre: retención un poco por encima de arcilla pura'
  },
  perlita: {
    nombre: 'Perlita',
    retencion: 0.22,
    onRef: 7.6,
    minOFFRef: 14,
    objetivoHumedadDefault: 40,
    whcPct: 'Muy baja (casi solo drenaje + película) — en mezcla suele “llevar” coco',
    poroAire: '≈40–55% AFP típica en grano hortícola suelto',
    dryBack: 'Secado muy rápido en cavidad; en torre pura exige pulsos frecuentes',
    nota: 'Referencia baja retención; mezclas 50/50 coco–perlita se acercan más al perfil coco'
  },
  coco: {
    nombre: 'Fibra de coco',
    retencion: 0.65,
    onRef: 10.9,
    minOFFRef: 29,
    objetivoHumedadDefault: 57,
    whcPct: 'Alta disponibilidad hídrica + aeración si fibra lavada y gruesa',
    poroAire: '≈10–28% según marca, lavado y troceo',
    dryBack: 'Buffer capacitivo fuerte frente a perlita/LECA; menos “tanque” que cubo lana denso',
    nota: 'EC y Na+/K+ del lavado cambian sensación real; este perfil es fibra hortícola estándar'
  },
  vermiculita: {
    nombre: 'Vermiculita',
    retencion: 0.82,
    onRef: 11.8,
    minOFFRef: 35,
    objetivoHumedadDefault: 65,
    whcPct: 'Muy alta — láminas silicatadas retienen agua interlaminar (hasta ~3–4× peso en fichas)',
    poroAire: 'Más baja que perlita cuando compacta o húmeda — riesgo anaerobio si encharca',
    dryBack: 'Secado lento; suele cortarse con perlita 30–70% en mezclas',
    nota: 'Mayor índice de retención del catálogo; pura en torre puede ser demasiado húmeda'
  },
  turba_enraiz: {
    nombre: 'Taco / esponja de turba biodegradable (enraizamiento)',
    retencion: 0.53,
    onRef: 10.2,
    minOFFRef: 25,
    objetivoHumedadDefault: 52,
    whcPct: 'Alta en el volumen del taco — turba mantiene malla capilar fina',
    poroAire: 'Variable según prensado / pastilla (Jiffy, etc.)',
    dryBack: 'Almáculo: mantener húmedo; en torre adulta mejor migrar a coco o lana',
    nota: 'Perfil “plántula”; no equivale a lana de producción en planta adulta'
  }
};

/** Clave de sustrato válida o 'esponja' por defecto */
function normalizaSustratoKey(tipo) {
  const k = String(tipo || '').trim();
  return CONFIG_SUSTRATO[k] ? k : 'esponja';
}

/** Multiplicador suave del índice de demanda según fase (transpiración típica / VPD recomendado) */
const RIEGO_FASE_CULTIVO = {
  propagacion: { mult: 0.84, label: 'Propagación / plántula' },
  vegetativo:  { mult: 0.94, label: 'Desarrollo vegetativo' },
  produccion:  { mult: 1.0,  label: 'Producción / engorde' },
  cierre:      { mult: 0.97, label: 'Pre-cosecha (cierre suave)' },
};

/** Avance 0–1 del ciclo (ponderado por planta con fecha; si no hay, lechuga ref. y edad del formulario) */
function riegoPctCicloMedioTorre(edadSemManual) {
  let sum = 0, n = 0;
  getNivelesActivos().forEach(nv => {
    (state.torre[nv] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      sum += riegoPctCicloPlanta(c, edadSemManual);
      n++;
    });
  });
  if (n === 0) {
    const s = Math.max(0.05, Math.min(24, Number(edadSemManual) || 4));
    return Math.max(0, Math.min(1.15, (s * 7) / 45));
  }
  return sum / n;
}

/** Mismos hitos que riegoKcDesdePctYGrupo (inicio / desarrollo / mediados / final) */
function riegoFaseDesdePctCiclo(pct) {
  const p = Math.max(0, Math.min(1.2, pct));
  if (p < 0.12) return 'propagacion';
  if (p < 0.35) return 'vegetativo';
  if (p < 0.85) return 'produccion';
  return 'cierre';
}

function riegoFaseCultivoKeyEfectiva(edadSem) {
  if (!state.configTorre) return 'produccion';
  const auto = state.configTorre.faseCultivoRiegoAuto !== false;
  if (auto) {
    return riegoFaseDesdePctCiclo(riegoPctCicloMedioTorre(edadSem));
  }
  const f = state.configTorre.faseCultivoRiego || 'produccion';
  return RIEGO_FASE_CULTIVO[f] ? f : 'produccion';
}

function riegoFaseCultivoMult(edadSem) {
  const k = riegoFaseCultivoKeyEfectiva(edadSem);
  return RIEGO_FASE_CULTIVO[k]?.mult ?? 1;
}

function riegoFaseCultivoLabel(edadSem) {
  const k = riegoFaseCultivoKeyEfectiva(edadSem);
  return RIEGO_FASE_CULTIVO[k]?.label || 'Producción';
}

function ensureSustratoMezclaDefaults() {
  if (!state.configTorre) state.configTorre = {};
  let m = state.configTorre.sustratoMezcla;
  if (!m || typeof m !== 'object') {
    m = {
      activa: false,
      a: normalizaSustratoKey(state.configTorre.sustrato),
      b: 'perlita',
      pctA: 70
    };
    state.configTorre.sustratoMezcla = m;
  }
  m.a = normalizaSustratoKey(m.a || state.configTorre.sustrato);
  m.b = normalizaSustratoKey(m.b || 'perlita');
  m.pctA = Math.max(10, Math.min(90, parseInt(m.pctA, 10) || 70));
}

/** Perfil numérico para cálculos: mezcla interpolada o sustrato único */
function interpSustratoMezcla(aKey, bKey, pctA) {
  const t = Math.max(0.1, Math.min(0.9, (parseFloat(pctA) || 50) / 100));
  const A = CONFIG_SUSTRATO[aKey];
  const B = CONFIG_SUSTRATO[bKey];
  if (!A || !B) return CONFIG_SUSTRATO[normalizaSustratoKey(aKey)];
  const pA = Math.round(t * 100);
  const pB = Math.round((1 - t) * 100);
  return {
    nombre: `Mezcla ${pA}% ${A.nombre} + ${pB}% ${B.nombre}`,
    retencion: A.retencion * t + B.retencion * (1 - t),
    onRef: A.onRef * t + B.onRef * (1 - t),
    minOFFRef: A.minOFFRef * t + B.minOFFRef * (1 - t),
    objetivoHumedadDefault: Math.round(A.objetivoHumedadDefault * t + B.objetivoHumedadDefault * (1 - t)),
    whcPct: `Interpolado ${pA}/${pB} · ver textos de cada componente en Mediciones`,
    poroAire: 'Mezcla',
    dryBack: 'Intermedio proporcional a la mezcla',
    nota: 'Si predomina un solo medio, desactiva mezcla y elige un perfil'
  };
}

function riegoSustratoPerfil() {
  ensureSustratoMezclaDefaults();
  const m = state.configTorre.sustratoMezcla;
  if (m.activa && m.a && m.b && m.a !== m.b) {
    return interpSustratoMezcla(m.a, m.b, m.pctA);
  }
  return CONFIG_SUSTRATO[riegoSustratoKey()];
}

function riegoSustratoKey() {
  const k = state.configTorre?.sustrato || state.configSustrato || 'esponja';
  return CONFIG_SUSTRATO[k] ? k : 'esponja';
}

/** Migra sensorHumedadEsponja → sensorHumedadSustrato y devuelve el objeto activo */
function ensureSensorHumedadSustrato() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  if (!cfg.sensorHumedadSustrato || typeof cfg.sensorHumedadSustrato !== 'object') {
    const leg = cfg.sensorHumedadEsponja;
    cfg.sensorHumedadSustrato = leg && typeof leg === 'object'
      ? { activo: !!leg.activo, lecturaPct: leg.lecturaPct, objetivoPct: leg.objetivoPct }
      : { activo: false, lecturaPct: null, objetivoPct: null };
  }
  return cfg.sensorHumedadSustrato;
}

/**
 * Ajuste muy suave si el usuario activa lectura manual: el riego principal sigue siendo clima + tipo de sustrato
 * (minON/minOFF de referencia). Aquí como mucho ±3 % de demanda — sin sondas caras ni pretender precisión de invernadero.
 */
function riegoMultSensorSustrato() {
  const sh = ensureSensorHumedadSustrato();
  if (!sh?.activo || sh.lecturaPct == null || String(sh.lecturaPct) === '') {
    return { mult: 1, etiqueta: '' };
  }
  const defObj = riegoSustratoPerfil()?.objetivoHumedadDefault ?? 58;
  const lec = Math.max(0, Math.min(100, parseFloat(sh.lecturaPct)));
  const objRaw = sh.objetivoPct;
  const obj = Math.max(28, Math.min(82, parseFloat(objRaw) || defObj));
  const ratio = lec / obj;
  let m = 1;
  if (ratio < 0.8) m = 1 + (0.8 - ratio) * 0.08;
  else if (ratio > 1.22) m = 1 - Math.min(0.035, (ratio - 1.22) * 0.1);
  m = Math.max(0.97, Math.min(1.03, m));
  return {
    mult: m,
    etiqueta: ' · Afinado manual: ' + (m > 1.008 ? 'un poco más' : m < 0.992 ? 'un poco menos' : 'neutro') +
      ' (' + Math.round(lec) + '% / ref. ' + Math.round(obj) + '%)'
  };
}

// ── Geolocalización — detectar municipio más cercano ────────────────────────
async function detectarMunicipio() {
  const btn    = document.getElementById('btnGeolocalizacion');
  const estado = document.getElementById('geoEstado');

  if (!navigator.geolocation) {
    mostrarGeoEstado('warn', '⚠️ Tu navegador no soporta geolocalización. Usa la búsqueda manual.');
    return;
  }

  // Estado cargando
  btn.style.background = '#fef3c7';
  btn.style.borderColor = '#d97706';
  btn.style.color = '#92400e';
  btn.innerHTML = '<span>⏳</span><span>Obteniendo ubicación...</span>';
  btn.disabled = true;
  estado.style.display = 'none';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      btn.innerHTML = '<span>🌐</span><span>Buscando municipio...</span>';

      try {
        // Usar Nominatim (OpenStreetMap) para geocodificación inversa — sin API key
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`;
        const res  = await fetch(url, { headers: { 'User-Agent': 'HidroCultivo/1.0' } });
        const data = await res.json();

        const ciudad = data.address?.city
          || data.address?.town
          || data.address?.village
          || data.address?.municipality
          || '';

        if (!ciudad) {
          mostrarGeoEstado('warn', '⚠️ No se pudo identificar el municipio. Usa la búsqueda manual.');
          resetGeoBtn();
          return;
        }

        // Buscar en base de datos local
        const resultados = buscarMunicipio(ciudad);

        if (resultados.length > 0) {
          // Encontrado — seleccionar automáticamente el primero
          const [nombre, data2] = resultados[0];
          seleccionarMunicipio(nombre, data2.ec, data2.dureza, data2.nota);
          document.getElementById('inputBuscarMunicipio').value = nombre;
          mostrarGeoEstado('ok', `✅ Municipio detectado: <strong>${nombre}</strong> (${data2.ec} µS/cm)`);
          btn.style.display = 'none'; // ocultar botón tras éxito
        } else {
          // No en la base de datos — mostrar nombre y sugerir búsqueda manual o SINAC
          mostrarGeoEstado('info',
            `📍 Ubicación: <strong>${ciudad}</strong><br>` +
            `No está en nuestra base de datos. Introduce la EC manualmente o consulta el ` +
            `<a href="https://sinac.sanidad.gob.es/CiudadanoWeb/ciudadano/informacionAbastecimientoActionMunicipiosCenso.do" target="_blank" rel="noopener noreferrer" class="medir-link-sinac">SINAC (por municipio)</a>.`
          );
          document.getElementById('inputBuscarMunicipio').value = ciudad;
          resetGeoBtn();
        }

      } catch(e) {
        mostrarGeoEstado('warn', '⚠️ Error al obtener datos de ubicación. Usa la búsqueda manual.');
        resetGeoBtn();
      }
    },
    (err) => {
      let msg = '';
      switch(err.code) {
        case 1: msg = '❌ Permiso de ubicación denegado. Actívalo en Ajustes > Safari > Ubicación.'; break;
        case 2: msg = '⚠️ No se pudo obtener la ubicación. Comprueba el GPS.'; break;
        case 3: msg = '⚠️ Tiempo de espera agotado. Inténtalo de nuevo.'; break;
        default: msg = '⚠️ Error desconocido. Usa la búsqueda manual.';
      }
      mostrarGeoEstado('warn', msg);
      resetGeoBtn();
    },
    { timeout: 10000, maximumAge: 300000 } // 10s timeout, caché 5min
  );
}

function mostrarGeoEstado(tipo, html) {
  const el = document.getElementById('geoEstado');
  el.style.display = 'block';
  const colores = {
    ok:   { bg: '#f0fdf4', border: '#16a34a', color: '#14532d' },
    warn: { bg: '#fef3c7', border: '#d97706', color: '#78350f' },
    info: { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af' },
  };
  const c = colores[tipo] || colores.info;
  el.style.background   = c.bg;
  el.style.border       = `1px solid ${c.border}`;
  el.style.borderRadius = '8px';
  el.style.color        = c.color;
  el.innerHTML          = html;
}

function resetGeoBtn() {
  const btn = document.getElementById('btnGeolocalizacion');
  if (!btn) return;
  btn.disabled = false;
  btn.style.background   = '#eff6ff';
  btn.style.borderColor  = '#93c5fd';
  btn.style.color        = '#1d4ed8';
  btn.innerHTML = '<span>📍</span><span>Detectar mi municipio automáticamente</span>';
}

// Búsqueda de municipio
function onBuscarMunicipio(query) {
  const resEl = document.getElementById('municipioResultados');
  const selEl = document.getElementById('municipioSeleccionado');

  if (!query || query.length < 2) {
    resEl.style.display = 'none';
    return;
  }

  const resultados = buscarMunicipio(query);
  if (resultados.length === 0) {
    resEl.style.display = 'block';
    resEl.innerHTML = '<div class="medir-muni-empty">No encontrado — prueba otro nombre o introduce EC manualmente</div>';
    return;
  }

  resEl.style.display = 'block';
  // Guardar en variable global para acceso por índice (evita problemas con apóstrofes en nombres)
  window._municipioResultados = resultados;
  resEl.innerHTML = resultados.map(([nombre, data], idx) => {
    const color = data.ec < 300 ? '#15803d' : data.ec < 500 ? '#b45309' : data.ec < 700 ? '#d97706' : '#dc2626';
    return `<button type="button" class="medir-muni-result-btn" onclick="seleccionarMunicipioPorIdx(${idx})">
      <span>
        <span class="medir-muni-name">${nombre}</span>
        <span class="medir-muni-nota">${data.nota}</span>
      </span>
      <span class="medir-muni-ec" style="--medir-ec:${color}">${data.ec} µS</span>
    </button>`;
  }).join('');
}

function seleccionarMunicipioPorIdx(idx) {
  if (!window._municipioResultados || !window._municipioResultados[idx]) return;
  const [nombre, data] = window._municipioResultados[idx];
  seleccionarMunicipio(nombre, data.ec, data.dureza, data.nota);
}

function seleccionarMunicipio(nombre, ec, dureza, nota) {
  document.getElementById('municipioResultados').style.display = 'none';
  document.getElementById('inputBuscarMunicipio').value = nombre;

  const selEl = document.getElementById('municipioSeleccionado');
  selEl.style.display = 'block';

  const ecColor = ec < 300 ? '#15803d' : ec < 500 ? '#b45309' : '#dc2626';
  const viable = ec < 600;
  document.getElementById('municipioNombre').innerHTML =
    `${nombre} — <span class="medir-ec-inline" style="--medir-ec:${ecColor}">${ec} µS/cm</span> · ${dureza}`;
  document.getElementById('municipioInfo').innerHTML =
    `${nota}<br>${viable
      ? '✅ Usable para hidropónica con CalMag reducido'
      : '⚠️ EC alta — muy poco margen para nutrientes. Recomendable ósmosis.'}`;

  // Actualizar el input manual
  document.getElementById('inputECBaseGrifo').value = ec;
  CONFIG_AGUA.grifo.ecBase = ec;
  state.configAguaEC = ec;
  state.configAguaMunicipio = nombre;
  saveState();
  actualizarRangoEC();

  // Si EC > 600 mostrar advertencia adicional
  const warnEl = document.getElementById('warningGrifo');
  if (ec > 600) {
    warnEl.classList.add('show');
    warnEl.innerHTML = `⚠️ <strong>${nombre}:</strong> EC ${ec} µS/cm — agua ${dureza.toLowerCase()}. Solo quedan ~${1400 - ec} µS/cm de margen para nutrientes. Se recomienda usar agua destilada u ósmosis.`;
  } else {
    warnEl.innerHTML = `ℹ️ <strong>${nombre}:</strong> EC ${ec} µS/cm — ${dureza}. ${nota}. Ajusta la dosis de CalMag en consecuencia.`;
    warnEl.classList.add('show');
    warnEl.style.background = '#eff6ff';
    warnEl.style.borderColor = '#93c5fd';
    warnEl.style.color = '#1e40af';
  }
  cargarLocalidadMeteoUI();
}

function mostrarAlternativasSINAC() {
  const el = document.getElementById('modalAgua');
  el.classList.add('open');
  a11yDialogOpened(el);
}

function resetMunicipio() {
  state.configAguaMunicipio = null;
  state.configAguaEC = null;
  saveState();
  document.getElementById('inputBuscarMunicipio').value = '';
  document.getElementById('municipioSeleccionado').style.display = 'none';
  document.getElementById('municipioResultados').style.display = 'none';
  document.getElementById('geoEstado').style.display = 'none';
  const btn = document.getElementById('btnGeolocalizacion');
  if (btn) { btn.style.display = 'flex'; resetGeoBtn(); }
  cargarLocalidadMeteoUI();
}

function setAgua(tipo) {
  state.configAgua = tipo;
  saveState();

  // Actualizar UI radio buttons
  ['destilada','osmosis','grifo'].forEach(t => {
    const el = document.getElementById('opt-' + t);
    if (!el) return;
    const sel = t === tipo;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });

  // Mostrar/ocultar advertencia grifo
  const warnEl = document.getElementById('warningGrifo');
  const ecBaseEl = document.getElementById('ecBaseGrifo');
  if (tipo === 'grifo') {
    warnEl?.classList.add('show');
    ecBaseEl?.classList.add('show');
  } else {
    warnEl?.classList.remove('show');
    ecBaseEl?.classList.remove('show');
  }

  actualizarRangoEC();
  cargarLocalidadMeteoUI();
  refreshConsejosSiVisible();
  syncMedirAguaResumen();
}

function toggleMedirOpcionesAgua() {
  const cb = document.getElementById('chkMedirCambiarAgua');
  const wrap = document.getElementById('wrapMedirOpcionesAgua');
  if (wrap) wrap.style.display = cb && cb.checked ? 'block' : 'none';
}

function syncMedirAguaResumen() {
  const el = document.getElementById('medirAguaResumen');
  if (!el) return;
  const k = state.configAgua || 'destilada';
  const labels = { destilada: 'Agua destilada', osmosis: 'Agua de ósmosis', grifo: 'Agua del grifo' };
  el.innerHTML = 'Tipo de agua en el sistema: <strong class="u-text-gold">' + (labels[k] || '—') + '</strong>.';
}

function toggleMedirOpcionesSustrato() {
  const cb = document.getElementById('chkMedirCambiarSustrato');
  const wrap = document.getElementById('wrapMedirOpcionesSustrato');
  if (wrap) wrap.style.display = cb && cb.checked ? 'block' : 'none';
}

function syncMedirSustratoResumen() {
  const el = document.getElementById('medirSustratoResumen');
  if (!el) return;
  const k = normalizaSustratoKey(state.configTorre?.sustrato || state.configSustrato || 'esponja');
  const nombre = CONFIG_SUSTRATO[k]?.nombre || '—';
  el.innerHTML = 'Sustrato configurado: <strong class="u-text-gold">' + nombre + '</strong>.';
}

function setSustrato(tipo) {
  const t = normalizaSustratoKey(tipo);
  state.configSustrato = t;
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.sustrato = t;
  ensureSustratoMezclaDefaults();
  state.configTorre.sustratoMezcla.activa = false;
  state.configTorre.sustratoMezcla.a = t;
  initTorres();
  const tIdx = state.torreActiva || 0;
  if (state.torres?.[tIdx]) {
    if (!state.torres[tIdx].config) state.torres[tIdx].config = {};
    state.torres[tIdx].config.sustrato = t;
    if (state.torres[tIdx].config.sustratoMezcla) state.torres[tIdx].config.sustratoMezcla.activa = false;
  }
  guardarEstadoTorreActual();
  saveState();

  Object.keys(CONFIG_SUSTRATO).forEach(id => {
    const el = document.getElementById('opt-' + id);
    if (!el) return;
    const sel = id === t;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  cargarSensorSustratoUI();
  syncRiegoAvanzadoUI();
  syncMedirSustratoResumen();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

/** Abre el bloque colapsable de riego si hay ajustes no por defecto (fase manual o mezcla activa). */
function actualizarRiegoAvanzadoDetailsOpen() {
  const det = document.getElementById('riegoAvanzadoDetails');
  if (!det) return;
  // UX final: este bloque avanzado empieza siempre cerrado.
  det.open = false;
}

function syncRiegoAvanzadoUI() {
  const fSel = document.getElementById('riegoFaseCultivo');
  const cbFaseAuto = document.getElementById('riegoFaseCultivoAuto');
  const cb = document.getElementById('riegoMezclaActiva');
  const sa = document.getElementById('riegoMezclaA');
  const sb = document.getElementById('riegoMezclaB');
  const rng = document.getElementById('riegoMezclaPctA');
  const wrap = document.getElementById('riegoMezclaCampos');
  const lab = document.getElementById('riegoMezclaPctALabel');
  if (!fSel && !cb && !cbFaseAuto) return;
  if (!state.configTorre) state.configTorre = {};
  ensureSustratoMezclaDefaults();
  const autoFase = state.configTorre.faseCultivoRiegoAuto !== false;
  if (cbFaseAuto) cbFaseAuto.checked = autoFase;
  const edadSem = parseFloat(document.getElementById('riegoEdad')?.value) || 4;
  if (fSel) {
    fSel.removeAttribute('aria-disabled');
    fSel.title = '';
    if (autoFase) {
      const k = riegoFaseCultivoKeyEfectiva(edadSem);
      fSel.value = RIEGO_FASE_CULTIVO[k] ? k : 'produccion';
    } else {
      const fv = state.configTorre.faseCultivoRiego || 'produccion';
      fSel.value = RIEGO_FASE_CULTIVO[fv] ? fv : 'produccion';
    }
  }
  const m = state.configTorre.sustratoMezcla;
  if (cb) cb.checked = !!m.activa;
  if (sa) {
    fillRiegoMezclaSelectIfEmpty(sa);
    sa.value = m.a || riegoSustratoKey();
  }
  if (sb) {
    fillRiegoMezclaSelectIfEmpty(sb);
    sb.value = m.b || 'perlita';
  }
  if (rng) rng.value = m.pctA != null ? m.pctA : 70;
  if (wrap) wrap.classList.toggle('setup-hidden', !m.activa);
  if (lab && rng) {
    const v = parseInt(rng.value, 10) || 70;
    lab.textContent = 'Medio 1: ' + v + '% · medio 2: ' + (100 - v) + '%';
  }
  actualizarRiegoAvanzadoDetailsOpen();
}

function fillRiegoMezclaSelectIfEmpty(sel) {
  if (!sel || sel.options.length > 0) return;
  sel.innerHTML = Object.keys(CONFIG_SUSTRATO).map(k => {
    const n = CONFIG_SUSTRATO[k].nombre.replace(/</g, '');
    return '<option value="' + k + '">' + n + '</option>';
  }).join('');
}

function persistRiegoAvanzado() {
  if (!state.configTorre) state.configTorre = {};
  ensureSustratoMezclaDefaults();
  const cbFaseAuto = document.getElementById('riegoFaseCultivoAuto');
  const fSel = document.getElementById('riegoFaseCultivo');
  const wasAuto = state.configTorre.faseCultivoRiegoAuto !== false;
  const nowAuto = cbFaseAuto ? cbFaseAuto.checked : wasAuto;
  state.configTorre.faseCultivoRiegoAuto = nowAuto;
  if (!nowAuto) {
    if (wasAuto && fSel) {
      const ed = parseFloat(document.getElementById('riegoEdad')?.value) || 4;
      const inf = riegoFaseDesdePctCiclo(riegoPctCicloMedioTorre(ed));
      fSel.value = inf;
      state.configTorre.faseCultivoRiego = inf;
    } else if (fSel && RIEGO_FASE_CULTIVO[fSel.value]) {
      state.configTorre.faseCultivoRiego = fSel.value;
    }
  }
  const m = state.configTorre.sustratoMezcla;
  const cb = document.getElementById('riegoMezclaActiva');
  m.activa = !!(cb && cb.checked);
  const sa = document.getElementById('riegoMezclaA');
  const sb = document.getElementById('riegoMezclaB');
  const rng = document.getElementById('riegoMezclaPctA');
  if (sa) m.a = normalizaSustratoKey(sa.value);
  if (sb) m.b = normalizaSustratoKey(sb.value);
  if (rng) m.pctA = Math.max(10, Math.min(90, parseInt(rng.value, 10) || 70));
  if (m.a === m.b) m.activa = false;
  const wrap = document.getElementById('riegoMezclaCampos');
  const lab = document.getElementById('riegoMezclaPctALabel');
  if (wrap) wrap.classList.toggle('setup-hidden', !m.activa);
  if (lab && rng) {
    const v = parseInt(rng.value, 10) || 70;
    lab.textContent = 'Medio 1: ' + v + '% · medio 2: ' + (100 - v) + '%';
  }
  guardarEstadoTorreActual();
  saveState();
  syncRiegoAvanzadoUI();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

function cargarUbicacionMedicionesUI() {
  if (!state.configTorre) state.configTorre = {};
  const u = (state.configTorre.ubicacion || 'exterior') === 'interior' ? 'interior' : 'exterior';
  ['exterior', 'interior'].forEach(id => {
    const el = document.getElementById('opt-medir-ubic-' + id);
    if (!el) return;
    const sel = id === u;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  const wrap = document.getElementById('wrapLuzOrigenMediciones');
  if (wrap) wrap.style.display = u === 'interior' ? 'block' : 'none';
}

function setUbicacionTorreMediciones(tipo) {
  const v = tipo === 'interior' ? 'interior' : 'exterior';
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.ubicacion = v;
  invalidateMeteoNomiCache();
  guardarEstadoTorreActual();
  saveState();
  cargarUbicacionMedicionesUI();
  actualizarVisibilidadPanelInteriorGrow();
  cargarInteriorGrowUI();
  applyMedirCollapseUI();
  if (typeof updateDashboard === 'function') updateDashboard();
  try {
    actualizarVistaRiegoPorTipoInstalacion();
  } catch (ePol) {}
  if (document.getElementById('tab-riego')?.classList.contains('active') && typeof calcularRiego === 'function') calcularRiego();
}

function actualizarVisibilidadPanelInteriorGrow() {
  const p = document.getElementById('panelConfigInteriorGrow');
  if (!p) return;
  const int = (state.configTorre || {}).ubicacion === 'interior';
  p.style.display = int ? 'block' : 'none';
  cargarUbicacionMedicionesUI();
  applyMedirCollapseUI();
}

function cargarCalentadorConsignaMedicionesUI() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const el = document.getElementById('medirCalentadorConsignaC');
  if (!el) return;
  const v = Number(cfg.calentadorConsignaC);
  el.value =
    Number.isFinite(v) && v >= 10 && v <= 35 ? String(Math.round(v * 10) / 10) : '';
}

function persistMedirCalentadorConsigna() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const el = document.getElementById('medirCalentadorConsignaC');
  if (!el) return;
  if (!Array.isArray(cfg.equipamiento) || !cfg.equipamiento.includes('calentador')) {
    delete cfg.calentadorConsignaC;
    guardarEstadoTorreActual();
    saveState();
    return;
  }
  const raw = el.value;
  const v = parseFloat(String(raw || '').replace(',', '.'));
  if (Number.isFinite(v) && v >= 10 && v <= 35) {
    cfg.calentadorConsignaC = Math.round(v * 10) / 10;
  } else {
    delete cfg.calentadorConsignaC;
  }
  guardarEstadoTorreActual();
  saveState();
  if (document.getElementById('tab-riego')?.classList.contains('active') && typeof calcularRiego === 'function') calcularRiego();
}

function actualizarVisibilidadPanelCalentadorConsigna() {
  const p = document.getElementById('panelMedirCalentadorConsigna');
  if (!p) return;
  const cfg = state.configTorre || {};
  const show = Array.isArray(cfg.equipamiento) && cfg.equipamiento.includes('calentador');
  p.style.display = show ? 'block' : 'none';
  cargarCalentadorConsignaMedicionesUI();
  applyMedirCollapseUI();
}

function ensureUIMedirCollapse() {
  if (!state.configTorre) state.configTorre = {};
  let u = state.configTorre.uiMedirCollapse;
  if (!u || typeof u !== 'object' || Array.isArray(u)) {
    u = {};
    state.configTorre.uiMedirCollapse = u;
  }
  return u;
}

function resolveMedirExpanded(key, humActivo, hwAny) {
  const ui = ensureUIMedirCollapse();
  if (key === 'sensoresAjusteFino') {
    if (ui.sensoresAjusteFino !== undefined) return !!ui.sensoresAjusteFino;
    const legH = ui.humedadFino;
    const legW = ui.sensoresHw;
    if (legH !== undefined || legW !== undefined) {
      const hOpen = legH !== undefined ? !!legH : !!humActivo;
      const wOpen = legW !== undefined ? !!legW : !!hwAny;
      return hOpen || wOpen;
    }
    return !!humActivo || !!hwAny;
  }
  if (key === 'recargaTotal') {
    return ui.recargaTotal !== undefined ? !!ui.recargaTotal : false;
  }
  if (key === 'recargaParcial') {
    return ui.recargaParcial !== undefined ? !!ui.recargaParcial : false;
  }
  if (key === 'interiorGrow') {
    return ui.interiorGrow !== undefined ? !!ui.interiorGrow : true;
  }
  if (key === 'calentadorRiego') {
    return ui.calentadorRiego !== undefined ? !!ui.calentadorRiego : true;
  }
  return true;
}

function applyMedirCollapseUI() {
  const humAct = !!ensureSensorHumedadSustrato().activo;
  const sh = ensureSensoresHardware();
  const hwAny = !!(sh.ec || sh.ph || sh.humedad);

  const rows = [
    { body: 'collapseBodySensoresAjusteFino', btn: 'btnCollapseSensoresAjusteFino', key: 'sensoresAjusteFino' },
    { body: 'collapseBodyRecargaTotal', btn: 'btnCollapseRecargaTotal', key: 'recargaTotal' },
    { body: 'collapseBodyRecargaParcial', btn: 'btnCollapseRecargaParcial', key: 'recargaParcial' }
  ];
  for (let i = 0; i < rows.length; i++) {
    const body = document.getElementById(rows[i].body);
    const btn = document.getElementById(rows[i].btn);
    if (!body || !btn) continue;
    const exp = resolveMedirExpanded(rows[i].key, humAct, hwAny);
    body.hidden = !exp;
    btn.setAttribute('aria-expanded', exp ? 'true' : 'false');
    btn.classList.toggle('is-collapsed', !exp);
  }

  const intPanel = document.getElementById('panelConfigInteriorGrow');
  if (intPanel && intPanel.style.display !== 'none') {
    const body = document.getElementById('collapseBodyInteriorGrow');
    const btn = document.getElementById('btnCollapseInteriorGrow');
    if (body && btn) {
      const exp = resolveMedirExpanded('interiorGrow', humAct, hwAny);
      body.hidden = !exp;
      btn.setAttribute('aria-expanded', exp ? 'true' : 'false');
      btn.classList.toggle('is-collapsed', !exp);
    }
  }

  const calPanel = document.getElementById('panelMedirCalentadorConsigna');
  if (calPanel && calPanel.style.display !== 'none') {
    const body = document.getElementById('collapseBodyCalentadorRiego');
    const btn = document.getElementById('btnCollapseCalentadorRiego');
    if (body && btn) {
      const exp = resolveMedirExpanded('calentadorRiego', humAct, hwAny);
      body.hidden = !exp;
      btn.setAttribute('aria-expanded', exp ? 'true' : 'false');
      btn.classList.toggle('is-collapsed', !exp);
    }
  }
}

function toggleMedirCollapse(key) {
  const humAct = !!ensureSensorHumedadSustrato().activo;
  const sh = ensureSensoresHardware();
  const hwAny = !!(sh.ec || sh.ph || sh.humedad);
  const cur = resolveMedirExpanded(key, humAct, hwAny);
  ensureUIMedirCollapse()[key] = !cur;
  guardarEstadoTorreActual();
  saveState();
  applyMedirCollapseUI();
}

function cargarSensorSustratoUI() {
  const sh = ensureSensorHumedadSustrato();
  const def = riegoSustratoPerfil()?.objetivoHumedadDefault ?? 58;
  const cb = document.getElementById('sensorSustratoActivo');
  const inL = document.getElementById('sensorSustratoLectura');
  const inO = document.getElementById('sensorSustratoObj');
  if (cb) cb.checked = !!sh.activo;
  if (inL) inL.value = sh.lecturaPct != null && sh.lecturaPct !== '' ? sh.lecturaPct : '';
  if (inO) {
    inO.value = sh.objetivoPct != null && sh.objetivoPct !== '' && !isNaN(parseFloat(sh.objetivoPct))
      ? sh.objetivoPct
      : def;
  }
  applyMedirCollapseUI();
}

function persistSensorSustrato() {
  if (!state.configTorre) state.configTorre = {};
  const sh = ensureSensorHumedadSustrato();
  const prevActivo = !!sh.activo;
  sh.activo = !!document.getElementById('sensorSustratoActivo')?.checked;
  const raw = document.getElementById('sensorSustratoLectura')?.value;
  sh.lecturaPct = raw === '' || raw == null ? null : parseFloat(raw);
  const oRaw = document.getElementById('sensorSustratoObj')?.value;
  const def = riegoSustratoPerfil()?.objetivoHumedadDefault ?? 58;
  sh.objetivoPct = oRaw === '' || oRaw == null ? null : parseFloat(oRaw);
  if (sh.objetivoPct == null || isNaN(sh.objetivoPct)) sh.objetivoPct = def;
  delete state.configTorre.sensorHumedadEsponja;
  const ui = ensureUIMedirCollapse();
  const shw = ensureSensoresHardware();
  const hwAny = !!(shw.ec || shw.ph || shw.humedad);
  if (!prevActivo && sh.activo) ui.sensoresAjusteFino = true;
  if (prevActivo && !sh.activo && !hwAny) ui.sensoresAjusteFino = false;
  guardarEstadoTorreActual();
  saveState();
  applyMedirCollapseUI();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

function ensureSensoresHardware() {
  if (!state.configTorre) state.configTorre = {};
  let s = state.configTorre.sensoresHardware;
  if (!s || typeof s !== 'object') {
    s = { ec: false, ph: false, humedad: false };
    state.configTorre.sensoresHardware = s;
  }
  if (typeof s.ec !== 'boolean') s.ec = !!s.ec;
  if (typeof s.ph !== 'boolean') s.ph = !!s.ph;
  if (typeof s.humedad !== 'boolean') s.humedad = !!s.humedad;
  return s;
}

function actualizarVisibilidadAyudaSensores() {
  const s = ensureSensoresHardware();
  const any = !!(s.ec || s.ph || s.humedad);
  const box = document.getElementById('panelSensoresIntegracionAyuda');
  if (box) box.style.display = any ? 'block' : 'none';
}

function cargarSensoresHardwareUI() {
  const s = ensureSensoresHardware();
  const e = document.getElementById('sensorHwEC');
  const p = document.getElementById('sensorHwPH');
  const h = document.getElementById('sensorHwHum');
  if (e) e.checked = !!s.ec;
  if (p) p.checked = !!s.ph;
  if (h) h.checked = !!s.humedad;
  actualizarVisibilidadAyudaSensores();
  applyMedirCollapseUI();
}

function persistSensoresHardware() {
  const s = ensureSensoresHardware();
  const prevAny = !!(s.ec || s.ph || s.humedad);
  s.ec = !!document.getElementById('sensorHwEC')?.checked;
  s.ph = !!document.getElementById('sensorHwPH')?.checked;
  s.humedad = !!document.getElementById('sensorHwHum')?.checked;
  const nowAny = !!(s.ec || s.ph || s.humedad);
  const ui = ensureUIMedirCollapse();
  const humAct = !!ensureSensorHumedadSustrato().activo;
  if (!prevAny && nowAny) ui.sensoresAjusteFino = true;
  if (prevAny && !nowAny && !humAct) ui.sensoresAjusteFino = false;
  guardarEstadoTorreActual();
  saveState();
  actualizarVisibilidadAyudaSensores();
  applyMedirCollapseUI();
}

function persistLocalidadMeteo() {
  if (!state.configTorre) state.configTorre = {};
  const v = (document.getElementById('inputLocalidadMeteo')?.value || '').trim();
  state.configTorre.localidadMeteo = v;
  invalidateMeteoNomiCache();
  guardarEstadoTorreActual();
  saveState();
  try { refreshUbicacionInstalacionUI(); } catch (_) {}
  try { updateTorreStats(); } catch (_) {}
  void geocodificarLocalidadMeteoParaAvisos();
}

/** Municipio para clima y avisos (cfg de instalación o activa). */
function textoLocalidadMeteoCfg(cfg) {
  const c = cfg || state.configTorre || {};
  const m = (c.localidadMeteo || '').trim();
  if (m) return m;
  const ci = (c.ciudad || '').trim();
  if (ci) return ci.split(',')[0].trim();
  return '';
}

/** Sincroniza líneas de ubicación en Inicio, Riego y estados derivados. */
function refreshUbicacionInstalacionUI() {
  const txt = textoLocalidadMeteoCfg();
  const dash = document.getElementById('dashLocalidadClimaText');
  const wrap = document.getElementById('dashLocalidadClimaWrap');
  if (dash) {
    dash.textContent = txt || 'Sin municipio — indícalo en Medir';
    dash.classList.toggle('dash-localidad-clima-text--vacío', !txt);
  }
  if (wrap) wrap.classList.toggle('dash-localidad-clima-wrap--vacío', !txt);

  const riego = document.getElementById('riegoLocalidadLine');
  if (riego) {
    riego.textContent = '';
    const icon = document.createElement('span');
    icon.className = 'riego-localidad-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📍 ';
    const body = document.createElement('span');
    body.textContent = txt ? txt : 'Sin municipio — indícalo en Medir';
    if (!txt) body.classList.add('riego-localidad-line--vacío');
    riego.appendChild(icon);
    riego.appendChild(body);
  }
}

function etiquetaFuenteMeteo(src) {
  const s = String(src || 'open-meteo').toLowerCase();
  if (s === 'metno') return 'met.no + UV free';
  if (s === 'cache') return 'Caché local';
  return 'Open-Meteo';
}

function refreshMeteoFuenteActivaUI() {
  const txt = etiquetaFuenteMeteo(state && state._meteoFuenteActiva);
  const a = document.getElementById('meteoFuenteActiva');
  if (a) a.textContent = txt;
  const b = document.getElementById('configMeteoFuenteActiva');
  if (b) b.textContent = txt;
}

function usarMunicipioGrifoParaMeteo() {
  const n = state.configAguaMunicipio;
  if (!n) {
    showToast('No hay municipio del grifo guardado. Elige «Agua del grifo» y tu pueblo arriba, o escribe el municipio a mano.', true);
    return;
  }
  const el = document.getElementById('inputLocalidadMeteo');
  if (el) el.value = String(n).split(',')[0].trim();
  persistLocalidadMeteo();
  showToast('Municipio para avisos rellenado desde el grifo', false);
}

function cargarLocalidadMeteoUI() {
  const el = document.getElementById('inputLocalidadMeteo');
  if (!el) return;
  const v = (state.configTorre && state.configTorre.localidadMeteo) ? String(state.configTorre.localidadMeteo) : '';
  el.value = v;
  const btn = document.getElementById('btnMunicipioGrifoAMeteo');
  if (btn) {
    btn.classList.toggle('setup-hidden', !(state.configAgua === 'grifo' && state.configAguaMunicipio));
  }
  refreshMeteoFuenteActivaUI();
  if (v) void geocodificarLocalidadMeteoParaAvisos();
}

function cargarInteriorGrowUI() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const tEl = document.getElementById('interiorTempC');
  const hEl = document.getElementById('interiorHumedadAmb');
  const cEl = document.getElementById('interiorCircAire');
  if (tEl) tEl.value = cfg.interiorTempC != null && cfg.interiorTempC !== '' ? cfg.interiorTempC : '';
  if (hEl) hEl.value = cfg.interiorHumedadAmbPct != null && cfg.interiorHumedadAmbPct !== '' ? cfg.interiorHumedadAmbPct : '';
  if (cEl) cEl.checked = !!cfg.interiorCirculacionAire;
  const luz = cfg.luz || 'led';
  const idLuz = {
    natural: 'opt-interior-luz-natural', led: 'opt-interior-luz-led', mixto: 'opt-interior-luz-mixto',
    fluorescente: 'opt-interior-luz-fluorescente', hps: 'opt-interior-luz-hps', sin_luz: 'opt-interior-luz-sin'
  };
  Object.keys(idLuz).forEach(k => {
    const el = document.getElementById(idLuz[k]);
    if (!el) return;
    const sel = k === luz;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  const hHr = Math.max(12, Math.min(20, parseInt(String(cfg.horasLuz != null ? cfg.horasLuz : 16), 10) || 16));
  const hr = document.getElementById('interiorHorasLuz');
  const hv = document.getElementById('interiorHorasLuzVal');
  if (hr) hr.value = hHr;
  if (hv) hv.textContent = hHr + ' h';
  const v = cfg.interiorIntensidadLuz || 'media';
  ['baja', 'media', 'alta'].forEach(k => {
    const el = document.getElementById('opt-int-luz-' + k);
    if (!el) return;
    const sel = k === v;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
}

function setInteriorLuzTipo(tipo) {
  if (!state.configTorre) state.configTorre = {};
  const ok = ['natural', 'led', 'mixto', 'fluorescente', 'hps', 'sin_luz'];
  state.configTorre.luz = ok.includes(tipo) ? tipo : 'led';
  cargarInteriorGrowUI();
  persistInteriorGrow();
}

function onInteriorHorasLuzRangeInput() {
  const el = document.getElementById('interiorHorasLuz');
  const v = document.getElementById('interiorHorasLuzVal');
  if (el && v) v.textContent = el.value + ' h';
  persistInteriorGrow();
}

function setInteriorIntensidadLuz(v) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.interiorIntensidadLuz = v;
  cargarInteriorGrowUI();
  persistInteriorGrow();
}

function persistInteriorGrow() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const tRaw = document.getElementById('interiorTempC')?.value;
  const hRaw = document.getElementById('interiorHumedadAmb')?.value;
  cfg.interiorTempC = tRaw === '' || tRaw == null ? null : parseFloat(String(tRaw).replace(',', '.'));
  cfg.interiorHumedadAmbPct = hRaw === '' || hRaw == null ? null : parseFloat(String(hRaw).replace(',', '.'));
  cfg.interiorCirculacionAire = !!document.getElementById('interiorCircAire')?.checked;
  const hzRaw = document.getElementById('interiorHorasLuz')?.value;
  let hz = hzRaw == null || hzRaw === '' ? null : parseInt(String(hzRaw), 10);
  if (!Number.isFinite(hz)) hz = cfg.horasLuz;
  cfg.horasLuz = hz == null ? 16 : Math.max(12, Math.min(20, hz));
  const idLuz = {
    natural: 'opt-interior-luz-natural', led: 'opt-interior-luz-led', mixto: 'opt-interior-luz-mixto',
    fluorescente: 'opt-interior-luz-fluorescente', hps: 'opt-interior-luz-hps', sin_luz: 'opt-interior-luz-sin'
  };
  let luzPick = cfg.luz || 'led';
  const orden = ['natural', 'led', 'mixto', 'fluorescente', 'hps', 'sin_luz'];
  for (let i = 0; i < orden.length; i++) {
    const el = document.getElementById(idLuz[orden[i]]);
    if (el && el.classList.contains('selected')) {
      luzPick = orden[i];
      break;
    }
  }
  cfg.luz = luzPick;
  if (!cfg.interiorIntensidadLuz) cfg.interiorIntensidadLuz = 'media';
  guardarEstadoTorreActual();
  saveState();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

function actualizarECBase() {
  const val = parseInt(document.getElementById('inputECBaseGrifo').value) || 850;
  if (state.configAgua === 'grifo') {
    CONFIG_AGUA.grifo.ecBase = val;
    state.configAguaEC = val;
    actualizarRangoEC();
    refreshConsejosSiVisible();
  }
}

function actualizarRangoEC() {
  const agua = CONFIG_AGUA[state.configAgua || 'destilada'];
  const ecBase = agua.ecBase;
  const margen = 1400 - ecBase;

  // Actualizar rango mostrado en mediciones si el agua es grifo
  const rangeEl = document.querySelector('#cardEC .param-range');
  if (rangeEl) {
    if (state.configAgua === 'grifo') {
      rangeEl.textContent = `Margen: ${ecBase + 300}-${ecBase + 400} µS/cm (base: ${ecBase})`;
    } else {
      rangeEl.textContent = '1300 – 1400 µS/cm';
    }
  }
}

function initConfigUI() {
  const agua = state.configAgua || 'destilada';
  const sustrato = state.configTorre?.sustrato || state.configSustrato || 'esponja';
  const authRememberSel = document.getElementById('authRememberSelect');
  if (authRememberSel) authRememberSel.value = String(getAuthRememberMinutes());

  ['destilada','osmosis','grifo'].forEach(t => {
    const el = document.getElementById('opt-' + t);
    if (!el) return;
    const sel = t === agua;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  Object.keys(CONFIG_SUSTRATO).forEach(t => {
    const el = document.getElementById('opt-' + t);
    if (!el) return;
    const sel = t === normalizaSustratoKey(sustrato);
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  cargarSensorSustratoUI();
  cargarSensoresHardwareUI();
  cargarLocalidadMeteoUI();
  cargarUbicacionMedicionesUI();
  actualizarVisibilidadPanelInteriorGrow();
  actualizarVisibilidadPanelCalentadorConsigna();
  cargarInteriorGrowUI();
  applyMedirCollapseUI();

  syncMedirAguaResumen();
  syncMedirSustratoResumen();
  const chkA = document.getElementById('chkMedirCambiarAgua');
  const chkS = document.getElementById('chkMedirCambiarSustrato');
  const aguaIncompletaGrifo = agua === 'grifo' && !state.configAguaMunicipio && !(parseFloat(state.configAguaEC) > 0);
  if (chkA) {
    chkA.checked = !!aguaIncompletaGrifo;
    toggleMedirOpcionesAgua();
  }
  if (chkS) { chkS.checked = false; toggleMedirOpcionesSustrato(); }

  if (agua === 'grifo') {
    document.getElementById('warningGrifo')?.classList.add('show');
    document.getElementById('ecBaseGrifo')?.classList.add('show');
    // Restaurar municipio seleccionado
    if (state.configAguaMunicipio) {
      document.getElementById('inputBuscarMunicipio').value = state.configAguaMunicipio;
      const data = AGUA_MUNICIPIOS[state.configAguaMunicipio];
      if (data) {
        seleccionarMunicipio(state.configAguaMunicipio, data.ec, data.dureza, data.nota);
        // Ocultar botón geo si ya hay municipio guardado
        const btn = document.getElementById('btnGeolocalizacion');
        if (btn) btn.style.display = 'none';
      }
    }
    if (state.configAguaEC) {
      document.getElementById('inputECBaseGrifo').value = state.configAguaEC;
      CONFIG_AGUA.grifo.ecBase = state.configAguaEC;
    }
  }
  if (document.getElementById('tab-mediciones')?.classList.contains('active') && typeof updateRecargaBar === 'function') {
    updateRecargaBar();
  }
  if (document.getElementById('tab-mediciones')?.classList.contains('active') && typeof actualizarResumenReposicionParcialUI === 'function') {
    actualizarResumenReposicionParcialUI();
  }
}

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

/** Capacidad máxima del depósito (L) — tope físico del recipiente. `volDeposito` en config. */
function getVolumenDepositoMaxLitros(cfg) {
  cfg = cfg || state.configTorre || {};
  const v = Number(cfg.volDeposito);
  if (Number.isFinite(v) && v > 0) return Math.min(800, Math.max(1, Math.round(v * 10) / 10));
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
  return mlCalMagParaAguaBlanda(volObj);
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

  if (vol >= 16) {
    setStatus('statusVol','ok','✅',`Volumen correcto`);
    setCard('cardVol','ok');
    showCorreccion('correccionVol','');
  } else {
    const nut = getNutrienteTorre();
    const cfg = state.configTorre || {};
    const volObj = getVolumenDepositoMaxLitros(cfg);
    const litrosAnadir = Math.ceil((volObj - vol) * 10) / 10;
    const ref = getRefDosisFabricante(nut.id);
    const calmagMl = usarCalMagEnRecarga() && nut.calmagNecesario
      ? mlCalMagParaAguaBlanda(litrosAnadir)
      : 0;
    const orden = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A','Parte B'];
    const sufRep = dosisSufijoNutriente(nut);

    const ecActual = isNaN(ec) ? 1350 : ec;
    const anadirNutrientes = ecActual < (nut.ecObjetivo?.[0] || 900);

    const nivel = vol < 12 ? 'bad' : 'warn';
    setStatus('statusVol', nivel, vol < 12 ? '🔴' : '🟡',
      vol < 12 ? 'Volumen crítico — reponer urgente' : 'Volumen bajo — reponer depósito');
    setCard('cardVol', vol < 12 ? 'alert' : 'warn');

    let correccionHtml =
      '<div class="correccion-title">💧 Reposición +' + litrosAnadir + 'L para ' + nut.nombre + '</div>' +
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

// ══════════════════════════════════════════════════
// CHECKLIST INTEGRADO — LÓGICA
// ══════════════════════════════════════════════════

let clChecked = new Set();
let clEsPrimeraVez = false;
/** 'recarga' = flujo completo (apagar, vaciar, cubrir…); 'primer_llenado' = depósito sin cultivo previo */
let clRutaChecklist = 'recarga';

/** Si no se elige ruta en modal: reanudar la que tenga progreso guardado (por torre). */
function elegirClRutaChecklistAlAbrir() {
  const por = state.configTorre && state.configTorre.checklistAvancePorRuta;
  if (!por) {
    clRutaChecklist = 'recarga';
    return;
  }
  const rec = por.recarga;
  const prim = por.primer_llenado;
  const nR = rec && Array.isArray(rec.checked) ? rec.checked.length : 0;
  const nP = prim && Array.isArray(prim.checked) ? prim.checked.length : 0;
  if (nP > 0 && nR === 0) {
    clRutaChecklist = 'primer_llenado';
    return;
  }
  if (nR > 0 && nP === 0) {
    clRutaChecklist = 'recarga';
    return;
  }
  if (nR > 0 && nP > 0) {
    const tR = rec.ts || 0;
    const tP = prim.ts || 0;
    clRutaChecklist = tP >= tR ? 'primer_llenado' : 'recarga';
    return;
  }
  clRutaChecklist = 'recarga';
}

function persistirClChecklistAvance() {
  try {
    initTorres();
    if (!state.configTorre) state.configTorre = {};
    if (!state.configTorre.checklistAvancePorRuta) state.configTorre.checklistAvancePorRuta = {};
    state.configTorre.checklistAvancePorRuta[clRutaChecklist] = {
      checked: [...clChecked],
      ts: Date.now()
    };
    guardarEstadoTorreActual();
    saveState();
  } catch (e) {
    console.error('persistirClChecklistAvance', e);
  }
}

function restaurarClCheckedDesdeEstado() {
  const por = state.configTorre && state.configTorre.checklistAvancePorRuta
    && state.configTorre.checklistAvancePorRuta[clRutaChecklist];
  const arr = por && Array.isArray(por.checked) ? por.checked : [];
  clChecked = new Set(arr);
}

function limpiarClChecklistAvanceActual() {
  if (!state.configTorre || !state.configTorre.checklistAvancePorRuta) return;
  delete state.configTorre.checklistAvancePorRuta[clRutaChecklist];
  const o = state.configTorre.checklistAvancePorRuta;
  if (o && Object.keys(o).length === 0) delete state.configTorre.checklistAvancePorRuta;
}

function debePreguntarRutaChecklist(esPrimeraVezApp) {
  return !!esPrimeraVezApp || !state.ultimaRecarga;
}

function cerrarOverlayRutaChecklistRecarga() {
  const o = document.getElementById('checklistRutaRecargaOverlay');
  if (o) {
    try { a11yDialogClosed(o); } catch (e) {}
    o.remove();
  }
}

/**
 * Primera vez en la app / reset / nunca finalizaste una recarga en el checklist: elige recorrido.
 */
function mostrarOverlayRutaChecklistRecarga(esPrimeraVez) {
  cerrarOverlayRutaChecklistRecarga();
  const overlay = document.createElement('div');
  overlay.id = 'checklistRutaRecargaOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'clRutaTitulo');
  overlay.className = 'checklist-dark-overlay checklist-dark-overlay--ruta';

  overlay.innerHTML =
    '<div class="checklist-dark-sheet">' +
      '<div id="clRutaTitulo" class="checklist-dark-title checklist-dark-title--ruta">¿Qué tipo de checklist necesitas?</div>' +
      '<p class="checklist-dark-text checklist-dark-text--main">' +
        '<strong>Primer llenado</strong>: depósito nuevo o sin haber cultivado aún — te saltamos apagar bomba, vaciado de solución usada y pasos de cosecha. ' +
        'Sí te guiamos en <strong>limpiar el depósito</strong> antes de la primera mezcla.<br><br>' +
        '<strong>Recarga completa</strong>: ya hubo cultivo y solución en el sistema; el recorrido habitual (parar bomba, vaciar, limpiar, cubrir depósito…).</p>' +
      '<p class="checklist-dark-text checklist-dark-text--note">El checklist aplica a la <strong>instalación activa</strong> (revisa el nombre en Inicio, Mediciones o pestaña Sistema si tienes varias).</p>' +
      '<p class="checklist-dark-text checklist-dark-text--note">Tras <strong>finalizar</strong> una recarga en el checklist, la app ya no muestra esta pregunta y abrirá directamente la recarga completa.</p>' +
      '<button type="button" id="clRutaPrimer" class="checklist-dark-btn checklist-dark-btn--teal">' +
        '🌱 Primer llenado del depósito</button>' +
      '<button type="button" id="clRutaCompleta" class="checklist-dark-btn checklist-dark-btn--ghost">' +
        '🔄 Recarga completa (habitual)</button>' +
      '<button type="button" id="clRutaCancelar" class="checklist-dark-btn checklist-dark-btn--link">' +
        'Cancelar</button>' +
    '</div>';

  document.body.appendChild(overlay);
  try { a11yDialogOpened(overlay); } catch (e) {}

  const continuar = (ruta) => {
    cerrarOverlayRutaChecklistRecarga();
    clRutaChecklist = ruta;
    abrirChecklistDespuesDeElegirRuta(esPrimeraVez);
  };

  document.getElementById('clRutaPrimer').addEventListener('click', () => continuar('primer_llenado'));
  document.getElementById('clRutaCompleta').addEventListener('click', () => continuar('recarga'));
  document.getElementById('clRutaCancelar').addEventListener('click', () => {
    cerrarOverlayRutaChecklistRecarga();
    if (esPrimeraVez) try { goTab('inicio'); } catch (e2) {}
  });
}

function abrirChecklistDespuesDeElegirRuta(esPrimeraVez) {
  aplicarConfigTorre();

  const clTit = document.getElementById('checklistTitle');
  if (clTit) {
    const tCh = tipoInstalacionNormalizado(state.configTorre || {});
    const titPrimer =
      tCh === 'nft' ? '🪴 Primer llenado NFT — checklist'
      : tCh === 'dwc' ? '🌊 Primer llenado DWC — checklist'
      : '🌿 Primer llenado — torre vertical — checklist';
    const titRecarga =
      tCh === 'nft' ? '🪴 Recarga NFT — checklist'
      : tCh === 'dwc' ? '🌊 Recarga DWC — checklist'
      : '🌿 Recarga — torre vertical — checklist';
    if (clRutaChecklist === 'primer_llenado') {
      clTit.textContent = titPrimer;
    } else {
      clTit.textContent = titRecarga;
    }
  }

  document.getElementById('checklistCloseBtn').style.display = esPrimeraVez ? 'none' : 'flex';

  restaurarClCheckedDesdeEstado();
  renderChecklist();
  const co = document.getElementById('checklistOverlay');
  co.classList.add('open');
  updateClProgress();
  a11yDialogOpened(co);
}

// Definición de pasos del checklist
function generarPasosNutriente() {
  const nut    = getNutrienteTorre();
  const cfg    = state.configTorre || {};
  const refNut = getRefDosisFabricante(nut.id);
  const vol    = getVolumenMezclaLitros(cfg);
  const mlCM   = calcularMlCalMag();
  const mlP0   = calcularMlParteNutriente(0);
  const mlP1   = nut.partes >= 2 ? calcularMlParteNutriente(1) : mlP0;
  const mlP2   = nut.partes >= 3 ? calcularMlParteNutriente(2) : mlP0;
  const ecCM   = usarCalMagEnRecarga() && mlCM > 0 ? estimarEcCalMagMicroS(mlCM, vol) : 0;
  const ecFinal = getRecargaEcMetaMicroS();
  const tieneBuffer = nut.pHBuffer;
  const pHRango = nut.pHRango || [5.5, 6.5];
  const orden  = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A', 'Parte B', 'Parte C'];
  const suf    = dosisSufijoNutriente(nut);
  const pasos  = [];
  const esDwcNut = cfg.tipoInstalacion === 'dwc';

  // PASO 4.2 — CalMag (solo si el usuario / agua lo activan)
  if (usarCalMagEnRecarga() && mlCM > 0) {
    pasos.push({
      id:'4.2', seccion:null, paso:'4.2',
      desc: 'Añadir CalMag: ' + mlCM + ' ml — remover 2 min',
      nota: 'Con agua destilada u ósmosis el objetivo es ~' + EC_CALMAG_BASE + ' µS/cm (~' + (EC_CALMAG_BASE / 1000).toFixed(2) + ' mS/cm). Tras estos ml: ~' + ecCM + ' µS estimados. Con grifo, valorar si hace falta.' +
        (cfg.agua === 'grifo' ? ' Con agua del grifo, verificar si es necesario.' : ''),
      campos: [
        { id:'clCalmagMl', label:'ml CalMag:', type:'number', step:'0.1', placeholder: String(mlCM) },
        { id:'clEcCalMag', label:'EC tras CalMag:', unit:'µS/cm', type:'number', step:'1', placeholder: String(ecCM) }
      ]
    });
  }

  // PASOS 4.3... según número de partes del nutriente
  if (nut.partes === 1) {
    pasos.push({
      id:'4.3', seccion:null, paso:'4.3', alert:true,
      desc: 'Añadir ' + orden[0] + ': ' + mlP0 + suf + ' — remover 3 min',
      nota: 'Dosis recomendada: ' + nut.dosis.recomendado + ' ' + nut.dosis.unidad +
        '. EC objetivo: ' + ecFinal + ' µS/cm.',
      campos:[{ id:'clEcAB', label:'EC tras mezcla:', unit:'µS/cm', type:'number', step:'10', placeholder: String(ecFinal) }]
    });
  } else if (nut.partes === 2) {
    pasos.push({
      id:'4.3', seccion:null, paso:'4.3', alert:true,
      desc: 'Agitar ' + orden[0] + '. Añadir ' + mlP0 + suf + ' — remover 2 min',
      nota: '⚠️ NUNCA mezclar ' + orden[0] + ' y ' + orden[1] + ' puros — añade la primera parte, remueve, luego la segunda. La EC útil es tras las dos partes (paso 4.4).' +
        (refNut.mlPorLitro.length >= 2 && Math.abs(refNut.mlPorLitro[0] - refNut.mlPorLitro[1]) < 1e-6
          ? ' Cantidades calculadas para ~' + ecFinal + ' µS/cm tras CalMag (modelo orientativo).'
          : ''),
    });
    pasos.push({
      id:'4.4', seccion:null, paso:'4.4',
      desc: 'Agitar ' + orden[1] + '. Añadir ' + mlP1 + suf + ' — remover 3 min',
      nota: 'EC objetivo de la mezcla: ~' + ecFinal + ' µS/cm.',
      campos:[{ id:'clEcAB', label:'EC tras mezcla completa (A+B):', unit:'µS/cm', type:'number', step:'10', placeholder: String(ecFinal) }]
    });
  } else if (nut.partes === 3) {
    pasos.push({
      id:'4.3', seccion:null, paso:'4.3', alert:true,
      desc: 'Añadir ' + orden[0] + ' PRIMERO: ' + mlP0 + suf + ' — remover 2 min',
      nota: '⚠️ IMPORTANTE: ' + orden[0] + ' siempre primero. Nunca mezclar ' + orden[0] + ' con ' + (orden[2]||orden[1]) + ' directamente.',
    });
    pasos.push({
      id:'4.4', seccion:null, paso:'4.4',
      desc: 'Añadir ' + orden[1] + ': ' + mlP1 + suf + ' — remover 2 min',
    });
    pasos.push({
      id:'4.4b', seccion:null, paso:'4.4b',
      desc: 'Añadir ' + orden[2] + ': ' + mlP2 + suf + ' — remover 3 min',
      nota: 'EC objetivo de la mezcla: ~' + ecFinal + ' µS/cm.',
      campos:[{ id:'clEcAB', label:'EC tras mezcla completa:', unit:'µS/cm', type:'number', step:'10', placeholder: String(ecFinal) }]
    });
  }

  const aguaBlanda = cfg.agua === 'destilada' || cfg.agua === 'osmosis' || (!cfg.agua && (state.configAgua === 'destilada' || state.configAgua === 'osmosis'));
  pasos.push({
    id:'4.5', seccion:null, paso:'4.5', alert:true,
    desc: 'Medir pH al instante',
    nota: aguaBlanda
      ? 'Con agua destilada u ósmosis el pH sale <strong>muy bajo</strong> al principio: es normal.'
      : 'Tras nutrientes el pH puede quedar ácido; contrasta con el rango que buscas (~' + pHRango[0] + '–' + pHRango[1] + ').',
    campos:[{ id:'clPhTrasMezcla', label:'pH recién mezclado:', type:'number', step:'0.1', placeholder:'3.5' }]
  });

  pasos.push({
    id:'4.6', seccion:null, paso:'4.6', alert:true,
    desc: tieneBuffer
      ? 'Corregir pH+ solo hasta ~5,0'
      : 'Añadir pH+ hasta pH ' + pHRango[0] + ' — ajuste completo necesario',
    nota: tieneBuffer
      ? nut.nombre + ' lleva <strong>buffer de pH</strong>: sube solo hasta <strong>pH 5</strong>; en las horas siguientes tenderá al rango normal. Anota los <strong>ml de pH+</strong> usados.'
      : nut.nombre + ' sin buffer: ajusta al rango ' + pHRango[0] + '–' + pHRango[1] + ' con pH+ poco a poco. Anota los ml.',
    campos:[{ id:'clPhMasPaso46', label:'ml pH+ añadidos:', type:'number', step:'0.5', placeholder: tieneBuffer ? '3' : '5' }]
  });

  pasos.push({
    id:'4.7', seccion:null, paso:'4.7',
    desc: esDwcNut
      ? ('Encender el <strong>aireador</strong> con pH ' + (tieneBuffer ? '~5,0' : pHRango[0]) + ' — raíces oxigenadas en el depósito')
      : 'Encender bomba con pH ' + (tieneBuffer ? '~5,0' : pHRango[0]) + ' — seguro para las raíces',
    nota: tieneBuffer
      ? 'No corrijas más el pH hasta medir con calma (recordatorio en 4.8 y registro en paso 6).'
      : (esDwcNut
        ? 'DWC: el difusor homogeneiza y oxigena; control de nivel y nutrientes en <strong>Mediciones</strong>.'
        : 'Sistema listo para operar. Afinar EC/pH en Mediciones los próximos días si hace falta.')
  });

  pasos.push({
    id:'4.8', seccion:null, paso:'4.8',
    desc: 'Seguimiento EC y pH',
    nota: 'En las <strong>próximas ~2 horas</strong> y <strong>mañana</strong> (o al día siguiente), mide EC y pH, <strong>regístralos en Mediciones</strong> y corrige si hace falta. El checklist sigue; no hace falta rellenar aquí esas lecturas.'
  });

  return pasos;
}

function construirTextoChecklistPreliminar() {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};
  const vol = getVolumenMezclaLitros(cfg);
  const partes = nut.partes || 2;
  const orden = (nut.orden && nut.orden.length >= partes)
    ? nut.orden
    : ['Parte A', 'Parte B', 'Parte C'];
  const ref = getRefDosisFabricante(nut.id);
  const mlCM5 = usarCalMagEnRecarga() && nut.calmagNecesario ? mlCalMagParaAguaBlanda(5) : 0;
  const sufP = dosisSufijoNutriente(nut);
  const p1Partes = [];
  if (mlCM5 > 0) p1Partes.push(mlCM5 + ' ml CalMag (~400 µS/cm en ~5 L)');
  if (partes === 1) {
    p1Partes.push(Math.max(0.5, Math.round(ref.mlPorLitro[0] * 5 * 10) / 10) + sufP + ' de ' + orden[0]);
  } else if (partes === 2) {
    p1Partes.push(Math.max(0.5, Math.round(ref.mlPorLitro[0] * 5 * 10) / 10) + sufP + ' ' + orden[0]);
    p1Partes.push(Math.max(0.5, Math.round(ref.mlPorLitro[1] * 5 * 10) / 10) + sufP + ' ' + orden[1]);
  } else {
    for (let i = 0; i < Math.min(3, partes); i++) {
      p1Partes.push(Math.max(0.5, Math.round((ref.mlPorLitro[i] || 0) * 5 * 10) / 10) + sufP + ' ' + (orden[i] || ('Parte ' + (i + 1))));
    }
  }
  const esNft = cfg.tipoInstalacion === 'nft';
  const esDwc = cfg.tipoInstalacion === 'dwc';
  const desc = 'Preparar solución provisional en cubo (~5L) con agua destilada/ósmosis: ' +
    p1Partes.join(' + ') + '. Remover bien.' +
    (esNft ? ' En NFT, con esa mezcla humedece copas o el arranque de cada canal antes del paro prolongado.' : '') +
    (esDwc ? ' En DWC, humedece coronas/net cups o el arranque de cada maceta antes del vaciado prolongado.' : '');
  const stockExtra = orden.slice(0, partes).join(', ');
  let p2 = 'Verificar stock: agua destilada u ósmosis' +
    (usarCalMagEnRecarga() ? ', CalMag' : '') +
    ', ' + stockExtra + ', pH+, agua oxigenada 3%, esponja';
  if (esNft) p2 += ', cepillo suave o tubo flexible para canales, comprobación de pendiente';
  if (esDwc) p2 += ', repuestos de difusor o piedra porosa, manguera de aire';
  const ecO = getECOptimaTorre();
  const provMs = Math.min(1.2, Math.max(0.35, ((ecO.min + ecO.max) / 2000) * 0.06));
  return { descP1: desc, descP2: p2, placeholderProv: provMs.toFixed(2) };
}

/**
 * ¿Podemos mostrar el checklist de recarga con cifras fiables (volumen, nutriente, tipo sistema, agua)?
 * Si el usuario completó el asistente o ya usa la instalación, no molestamos. Tras reset o config genérica sin confirmar, pedimos datos antes.
 */
function checklistInstalacionCompletaParaRecarga() {
  const cfg = state.configTorre;
  if (!cfg || typeof cfg !== 'object') return false;
  const vol = Number(cfg.volDeposito);
  if (!Number.isFinite(vol) || vol < 1 || vol > 800) return false;
  const vm = Number(cfg.volMezclaLitros);
  if (Number.isFinite(vm) && vm > 0 && (vm > vol + 0.01 || vm < 0.5)) return false;
  if (!cfg.nutriente || !NUTRIENTES_DB.some(n => n.id === cfg.nutriente)) return false;
  const tipo = cfg.tipoInstalacion;
  if (tipo !== 'torre' && tipo !== 'nft' && tipo !== 'dwc') return false;

  if (cfg.checklistInstalacionConfirmada === true) return true;

  const hayUso =
    !!(state.ultimaRecarga || state.ultimaMedicion) ||
    getNivelesActivos().some(n => (state.torre[n] || []).some(c => c && c.variedad));
  return hayUso;
}

function cerrarOverlayChecklistDatosInstalacion() {
  const o = document.getElementById('checklistDatosInstalacionOverlay');
  if (o) {
    try { a11yDialogClosed(o); } catch (e) {}
    o.remove();
  }
}

/**
 * Aplica torre, NFT o DWC mínimos tras el cuestionario previo al checklist (reset / primera recarga sin asistente).
 */
function aplicarConfigDesdeOverlayChecklistRecarga(tipo, vol, agua, nutId, volMezclaOpt) {
  initTorres();
  const aguaOk = agua === 'osmosis' || agua === 'grifo' ? agua : 'destilada';
  const aguaMap = { destilada: 'destilada', osmosis: 'osmosis', grifo: 'grifo' };
  if (aguaMap[aguaOk]) setAgua(aguaMap[aguaOk]);

  const baseComun = {
    nutriente: nutId,
    volDeposito: vol,
    agua: aguaOk,
    checklistInstalacionConfirmada: true,
    tipoTorre: 'custom',
    ubicacion: 'exterior',
    luz: 'led',
    horasLuz: 16,
    equipamiento: ['difusor', 'calentador', 'bomba'],
    lat: 39.9864,
    lon: -0.0495,
    ciudad: 'Castelló de la Plana',
    sustrato: normalizaSustratoKey(state.configSustrato || 'esponja'),
    tamanoCesta: 'standard',
    diametroTubo: 50,
    antiRaices: 'tubo_interior',
    alturaTorre: 1.2,
    sensoresHardware: { ec: false, ph: false, humedad: false },
  };

  if (tipo === 'nft') {
    state.configTorre = Object.assign({}, baseComun, {
      tipoInstalacion: 'nft',
      numNiveles: 4,
      numCestas: 8,
      nftNumCanales: 4,
      nftHuecosPorCanal: 8,
      nftPendientePct: 2,
      nftDisposicion: 'mesa',
      nftTuboInteriorMm: 25,
      nftCanalForma: 'redondo',
      nftCanalDiamMm: 90,
      nftLaminaAguaMm: 3,
    });
    redimensionarMatrizTorreNftPreservando(state.configTorre);
  } else if (tipo === 'dwc') {
    state.configTorre = Object.assign({}, baseComun, {
      tipoInstalacion: 'dwc',
      numNiveles: NUM_NIVELES,
      numCestas: NUM_CESTAS,
    });
    try {
      dwcPersistSnapshotMaxCestasEnCfg(state.configTorre);
    } catch (eDw) {}
    state.torre = [];
    for (let n = 0; n < NUM_NIVELES; n++) {
      state.torre.push([]);
      for (let c = 0; c < NUM_CESTAS; c++) {
        state.torre[n].push({ variedad: '', fecha: '', notas: '', fotos: [], fotoKeys: [] });
      }
    }
  } else {
    state.configTorre = Object.assign({}, baseComun, {
      tipoInstalacion: 'torre',
      numNiveles: NUM_NIVELES,
      numCestas: NUM_CESTAS,
    });
    state.torre = [];
    for (let n = 0; n < NUM_NIVELES; n++) {
      state.torre.push([]);
      for (let c = 0; c < NUM_CESTAS; c++) {
        state.torre[n].push({ variedad: '', fecha: '', notas: '', fotos: [], fotoKeys: [] });
      }
    }
  }

  const vmOpt = Number(volMezclaOpt);
  if (Number.isFinite(vmOpt) && vmOpt > 0 && vmOpt < vol - 0.02) {
    state.configTorre.volMezclaLitros = Math.min(vol, Math.max(0.5, Math.round(vmOpt * 10) / 10));
  } else {
    delete state.configTorre.volMezclaLitros;
  }

  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try { actualizarHeaderTorre(); } catch (eH) {}
  renderTorre();
  updateTorreStats();
  updateDashboard();
  try { initConfigUI(); } catch (e) {}
  try { actualizarBadgesNutriente(); } catch (e2) {}
  try { actualizarVistaRiegoPorTipoInstalacion(); } catch (e3) {}
}

function mostrarOverlayChecklistDatosInstalacion(esPrimeraVezChecklist) {
  cerrarOverlayChecklistDatosInstalacion();
  const cfg = state.configTorre || {};
  const volIni = Number.isFinite(Number(cfg.volDeposito)) && Number(cfg.volDeposito) > 0 ? Math.round(Number(cfg.volDeposito)) : 20;
  const capRef = Number.isFinite(Number(cfg.volDeposito)) && Number(cfg.volDeposito) > 0 ? Number(cfg.volDeposito) : volIni;
  const vmIniRaw = Number(cfg.volMezclaLitros);
  const mezIni =
    Number.isFinite(vmIniRaw) && vmIniRaw > 0 && vmIniRaw < capRef - 0.02
      ? String(Math.round(vmIniRaw * 10) / 10)
      : '';
  const tipoIni =
    cfg.tipoInstalacion === 'nft' ? 'nft'
    : cfg.tipoInstalacion === 'dwc' ? 'dwc'
    : 'torre';
  const aguaIni = cfg.agua || state.configAgua || 'destilada';
  const nutIni = (cfg.nutriente && NUTRIENTES_DB.some(n => n.id === cfg.nutriente) ? cfg.nutriente : (getNutrienteTorre().id || 'canna_aqua'));
  const optsNut = NUTRIENTES_DB.map(n =>
    '<option value="' + String(n.id).replace(/"/g, '') + '"' + (n.id === nutIni ? ' selected' : '') + '>' +
    escHtmlUi(n.nombre) + '</option>'
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'checklistDatosInstalacionOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'cldTitulo');
  overlay.className = 'checklist-dark-overlay checklist-dark-overlay--datos';

  overlay.innerHTML =
    '<div class="checklist-dark-sheet">' +
      '<div id="cldTitulo" class="checklist-dark-title checklist-dark-title--datos">Antes del checklist</div>' +
      '<p class="checklist-dark-text checklist-dark-text--datos-intro">' +
        'Estos datos son para la <strong>instalación activa</strong> (la que ves arriba en Inicio o Sistema). Si no es la que quieres, usa <strong>Más tarde</strong>, cambia de instalación y vuelve a abrir el checklist. ' +
        'Indica tipo, volumen, agua y nutriente para que los pasos del checklist coincidan con tu montaje real. ' +
        'Puedes afinar todo después en <strong>Sistema</strong> o con el asistente completo.</p>' +

      '<div class="checklist-dark-kicker">Tipo de sistema</div>' +
      '<div class="checklist-dark-type-grid">' +
        '<label class="checklist-dark-type-opt">' +
          '<input type="radio" name="cldTipoInst" value="torre"' + (tipoIni === 'torre' ? ' checked' : '') + '>' +
          '<span class="checklist-dark-type-opt-text">Torre vertical</span></label>' +
        '<label class="checklist-dark-type-opt">' +
          '<input type="radio" name="cldTipoInst" value="nft"' + (tipoIni === 'nft' ? ' checked' : '') + '>' +
          '<span class="checklist-dark-type-opt-text">NFT</span></label>' +
        '<label class="checklist-dark-type-opt">' +
          '<input type="radio" name="cldTipoInst" value="dwc"' + (tipoIni === 'dwc' ? ' checked' : '') + '>' +
          '<span class="checklist-dark-type-opt-text">DWC</span></label>' +
      '</div>' +

      '<label class="checklist-dark-field-label">Capacidad máxima del depósito (L)</label>' +
      '<input id="cldVolDeposito" type="number" inputmode="numeric" min="1" max="600" step="1" value="' + volIni + '"' +
        ' class="checklist-dark-field-input checklist-dark-field-input--mb8">' +
      '<label class="checklist-dark-field-label">Litros de mezcla (opcional)</label>' +
      '<input id="cldVolMezcla" type="number" inputmode="decimal" min="0.5" max="600" step="0.1" placeholder="Vacío = hasta el máximo" value="' + mezIni.replace(/"/g, '') + '"' +
        ' class="checklist-dark-field-input checklist-dark-field-input--mb12">' +
      '<p class="checklist-dark-text checklist-dark-text--mix-hint">Si no llenas hasta el tope (p. ej. 19 L en un depósito de 20 L), indícalo aquí: las dosis del checklist usarán esos litros.</p>' +

      '<label class="checklist-dark-field-label">Agua para la mezcla</label>' +
      '<select id="cldAgua" class="checklist-dark-field-input checklist-dark-select checklist-dark-select--mb12">' +
        '<option value="destilada"' + (aguaIni === 'destilada' ? ' selected' : '') + '>Destilada</option>' +
        '<option value="osmosis"' + (aguaIni === 'osmosis' ? ' selected' : '') + '>Ósmosis</option>' +
        '<option value="grifo"' + (aguaIni === 'grifo' ? ' selected' : '') + '>Grifo</option>' +
      '</select>' +

      '<label class="checklist-dark-field-label">Nutriente / marca</label>' +
      '<select id="cldNutriente" class="checklist-dark-field-input checklist-dark-select checklist-dark-select--mb16">' +
        optsNut +
      '</select>' +

      '<button type="button" id="cldBtnContinuar" class="checklist-dark-btn checklist-dark-btn--green">' +
        'Continuar al checklist</button>' +
      '<button type="button" id="cldBtnAsistente" class="checklist-dark-btn checklist-dark-btn--ghost checklist-dark-btn--compact">' +
        'Asistente completo (recomendado)</button>' +
      '<button type="button" id="cldBtnDespues" class="checklist-dark-btn checklist-dark-btn--link">' +
        'Más tarde</button>' +
    '</div>';

  document.body.appendChild(overlay);
  try { a11yDialogOpened(overlay); } catch (e) {}

  const continuar = () => {
    const tipo = (overlay.querySelector('input[name="cldTipoInst"]:checked') || {}).value || 'torre';
    const vol = parseInt(String(document.getElementById('cldVolDeposito').value || '0'), 10);
    const agua = document.getElementById('cldAgua').value || 'destilada';
    const nutId = document.getElementById('cldNutriente').value;
    const mezStr = String(document.getElementById('cldVolMezcla')?.value || '').trim();
    const volMez = parseFloat(String(mezStr).replace(',', '.'));
    if (!Number.isFinite(vol) || vol < 1 || vol > 600) {
      showToast('Indica un volumen de depósito entre 1 y 600 L', true);
      return;
    }
    let mezOpt = null;
    if (mezStr !== '') {
      if (!Number.isFinite(volMez) || volMez < 0.5) {
        showToast('Litros de mezcla: mínimo 0,5 L o deja el campo vacío', true);
        return;
      }
      if (volMez > vol + 0.01) {
        showToast('Los litros de mezcla no pueden superar la capacidad máxima del depósito', true);
        return;
      }
      if (volMez < vol - 0.02) mezOpt = volMez;
    }
    if (!nutId || !NUTRIENTES_DB.some(n => n.id === nutId)) {
      showToast('Elige un nutriente de la lista', true);
      return;
    }
    cerrarOverlayChecklistDatosInstalacion();
    aplicarConfigDesdeOverlayChecklistRecarga(tipo, vol, agua, nutId, mezOpt);
    abrirChecklist(esPrimeraVezChecklist);
  };

  document.getElementById('cldBtnContinuar').addEventListener('click', continuar);
  document.getElementById('cldBtnAsistente').addEventListener('click', () => {
    cerrarOverlayChecklistDatosInstalacion();
    try { abrirSetup(); } catch (e) {}
  });
  document.getElementById('cldBtnDespues').addEventListener('click', () => {
    cerrarOverlayChecklistDatosInstalacion();
    showToast('Cuando quieras: Historial → checklist o Inicio → recarga');
    if (esPrimeraVezChecklist) try { goTab('inicio'); } catch (e) {}
  });
}

function getCLPasos() {
  const cfg = state.configTorre || {};
  const vol = getVolumenMezclaLitros(cfg);
  const ecOpt = getECOptimaTorre();
  const ecMin = ecOpt.min;
  const ecMax = ecOpt.max;
  const nut = getNutrienteTorre();
  const pHR = nut.pHRango || [5.5, 6.5];
  const phObj = ((pHR[0] + pHR[1]) / 2).toFixed(1);
  const ecMed = Math.round((ecMin + ecMax) / 2);
  const ecRecTarget = getRecargaEcMetaMicroS();
  const pre = construirTextoChecklistPreliminar();
  const nNiv = cfg.numNiveles || NUM_NIVELES;
  const esNft = cfg.tipoInstalacion === 'nft';
  const esDwc = cfg.tipoInstalacion === 'dwc';
  const nftHyd = esNft ? getNftHidraulicaDesdeConfig(cfg) : null;
  const nftCh = nftHyd ? nftHyd.nCh : 0;
  const nftHx = nftHyd ? nftHyd.nHx : 0;
  const shCl = ensureSensoresHardware();
  const hwLista = [shCl.ec && 'EC', shCl.ph && 'pH', shCl.humedad && 'humedad'].filter(Boolean);
  const paso6SeccionTitulo = hwLista.length ? null : '📊 Paso 6 — Registro';
  const paso40campos = [
    { id:'clEcObjetivoRecarga', label:'EC objetivo de esta recarga', type:'number', step:'10',
      unit:'µS/cm', placeholder:String(ecMed), value:getRecargaEcMetaMicroS(),
      clase:'wide',
      _clOnblur:'onChecklistRecargaPrefsChanged()',
      _clOnkeydown:'if(event.key===\'Enter\'){event.preventDefault();this.blur();}' },
  ];
  if (nut.calmagNecesario) {
    paso40campos.push({
      id:'clUsarCalMag', type:'checkbox', checked: usarCalMagEnRecarga(),
      labelClass: 'cl-calmag-option',
      label:
        '<strong class="cl-calmag-headline">CalMag antes del abono</strong>' +
        'Recomendado con agua blanda; con grifo suele omitirse. Al activarlo se recalculan CalMag y los ml de abono según el EC objetivo.',
      _clOnchange:'onChecklistRecargaPrefsChanged()',
    });
  }

  const aguaPrimer = cfg.agua || state.configAgua || 'destilada';
  const vMaxRawPrimer = Number(cfg.volDeposito);
  const volMaxPrimerIni = Number.isFinite(vMaxRawPrimer) && vMaxRawPrimer > 0 ? Math.round(vMaxRawPrimer) : 20;
  const vmPrimer = Number(cfg.volMezclaLitros);
  const mezPrimerVal =
    Number.isFinite(vmPrimer) && vmPrimer > 0 && vmPrimer < volMaxPrimerIni - 0.02
      ? String(Math.round(vmPrimer * 10) / 10)
      : '';
  const nutIdPrimer = cfg.nutriente && NUTRIENTES_DB.some(n => n.id === cfg.nutriente) ? cfg.nutriente : nut.id;
  const optsNutPrimer = NUTRIENTES_DB.map(n => ({
    value: n.id,
    label: n.nombre,
    selected: n.id === nutIdPrimer,
  }));

  const pasosConfigPrimerLlenado = [
    { id: 'PC1', seccion: '⚙️ Depósito, agua y nutriente', paso: 'PC·1',
      desc: 'Capacidad máxima del depósito, litros de mezcla si no llenas hasta el tope, tipo de agua y marca de nutriente. El volumen y la marca alimentan los cálculos de ml del paso 4.',
      nota: 'El <strong>rango de EC</strong> por cultivos lo marcas en <strong>Sistema</strong> (grupos de planta); en <strong>PC·2</strong> pones el <strong>EC numérico</strong> (µS/cm) objetivo de esta mezcla.',
      extraHtml:
        '<button type="button" class="btn cl-tabla-cultivos-btn" onclick="abrirOverlayTablaCultivosChecklist()">📊 Ver tabla EC / pH por cultivo</button>' +
        '<p class="cl-tabla-cultivos-hint">Ventana de consulta: ciérrala y sigue con el checklist.</p>',
      campos: [
        { id: 'clPrimerVolMax', label: 'Capacidad máx. depósito (L)', type: 'number', step: '1', placeholder: '20',
          value: String(volMaxPrimerIni),
          _clOnblur: 'onPrimerLlenadoVolDesdeChecklist()' },
        { id: 'clPrimerVolMezcla', label: 'Litros de mezcla (opcional)', type: 'number', step: '0.1', placeholder: 'vacío = hasta el máximo',
          value: mezPrimerVal,
          _clOnblur: 'onPrimerLlenadoVolDesdeChecklist()' },
        { id: 'clPrimerAgua', label: 'Agua para la mezcla', type: 'select', clase: 'wide',
          opcionesVal: [
            { value: 'destilada', label: 'Destilada', selected: aguaPrimer === 'destilada' },
            { value: 'osmosis', label: 'Ósmosis', selected: aguaPrimer === 'osmosis' },
            { value: 'grifo', label: 'Grifo', selected: aguaPrimer === 'grifo' },
          ],
          _clOnchange: 'onPrimerLlenadoAguaDesdeChecklist()' },
        { id: 'clPrimerNutriente', label: 'Nutriente / marca', type: 'select', clase: 'wide',
          opcionesVal: optsNutPrimer,
          _clOnchange: 'onPrimerLlenadoNutrienteDesdeChecklist()' },
      ],
    },
    { id: 'PC2', seccion: null, paso: 'PC·2',
      desc: 'EC objetivo de esta recarga (µS/cm) y, si aplica, CalMag antes del abono.',
      nota: 'Tras escribir el EC, <strong>sal del campo</strong> (toca fuera, Tab o Intro) para recalcular los ml de nutriente y CalMag en los pasos siguientes.',
      campos: paso40campos,
    },
  ];

  const pasosPrev6 = hwLista.length ? [{
    id:'6.0hw',
    seccion:'📊 Paso 6 — Equipo de medida',
    paso:'6.0',
    desc: esNft
      ? ('Sensores o medidores en tu NFT (' + hwLista.join(', ') + '): mide en el depósito con mezcla homogénea tras el retorno; si el circuito es largo, espera unos minutos a que se estabilice.')
      : esDwc
        ? ('Sensores o medidores en tu DWC (' + hwLista.join(', ') + '): mide en el depósito con mezcla homogénea; con el aireador unos minutos en marcha y sin burbujas pegadas a la sonda.')
        : ('Sensores o medidores en tu torre vertical (' + hwLista.join(', ') + '): comprueba calibración y que la lectura sea representativa (agua homogénea, tiempo de espera con difusor cumplido).'),
    nota:'Sin telemática en esta app: si contrastas sonda y pen, usa el criterio único que vas a registrar. El <strong>registro</strong> de esta recarga lo cierras en el paso <strong>6.4</strong> y lo verás en <strong>Mediciones</strong>.',
  }] : [];

  const nftBomb = esNft ? getNftBombaDesdeConfig(cfg) : null;

  const pasosDwcOxigenacion = esDwc
    ? [
        {
          id: 'D0',
          seccion: '💨 DWC — Bomba de aire y difusores',
          paso: 'D·0',
          desc:
            'Dimensiona el <strong>aireador</strong> y los <strong>difusores</strong> según los <strong>litros reales</strong> de solución (mezcla o depósito) y el <strong>número de cestas</strong> de tu rejilla. El recuadro inferior usa la misma lógica que la pestaña Sistema.',
          nota:
            'Referencia habitual en DWC casero: del orden de <strong>1 L/min por cada 10 L</strong> de líquido; la app ajusta un plus por cesta (más raíz) y sugiere <strong>puntos de difusión</strong> al fondo (piedra horizontal, disco o bolas microporosas). Comprueba en la <strong>bomba</strong> el caudal a tu <strong>profundidad</strong>.',
          postCamposHtml:
            '<div id="clDwcDifusorRecomendacion" class="cl-dwc-difusor-rec" role="status" aria-live="polite"></div>',
        },
      ]
    : [];

  const pasoNftTuberiaRef = esNft
    ? [{
      id: 'Nref',
      seccion: '📐 NFT — Canal de cultivo y tuberías',
      paso: 'N·ref',
      desc:
        'Configura el <strong>canal donde van las cestas</strong> (tubo redondo o ancho útil de perfil rectangular), la <strong>lámina de agua</strong> (~3 mm habitual) y opcionalmente la <strong>longitud</strong> de cada canal. ' +
        'Con eso la app estima volumen de película y caudal orientativo, y contrasta con tu bomba en el paso N0.',
      nota: 'El Ø de <strong>línea de riego</strong> (16–32 mm según tramo; retorno 40–50 mm aparte) se configuró en Sistema; aquí solo el canal de cultivo (redondo o rectangular), lámina y longitud.',
      extraHtml: nftTuberiaReferenciaDocHtml({ forChecklist: true }),
      campos: [
        {
          id: 'clNftCanalEsRect',
          type: 'checkbox',
          checked: cfg.nftCanalForma === 'rectangular',
          label: 'Canal rectangular: usar ancho útil del fondo (mm) en lugar de Ø redondo',
          _clOnchange: 'persistNftCanalDesdeChecklist()',
        },
        {
          id: 'clNftCanalDiamMm',
          label: 'Ø interior tubo de cultivo (mm)',
          type: 'number',
          step: '1',
          value: String(cfg.nftCanalDiamMm != null ? cfg.nftCanalDiamMm : 90),
          _clOninput: 'debouncePersistNftCanalChecklist()',
          _clOnblur: 'persistNftCanalDesdeChecklist()',
        },
        {
          id: 'clNftCanalAnchoMm',
          label: 'Ancho útil fondo — rectangular (mm)',
          type: 'number',
          step: '1',
          value: String(cfg.nftCanalAnchoMm != null ? cfg.nftCanalAnchoMm : 100),
          _clOninput: 'debouncePersistNftCanalChecklist()',
          _clOnblur: 'persistNftCanalDesdeChecklist()',
        },
        {
          id: 'clNftLaminaMm',
          label: 'Lámina de agua (mm)',
          type: 'number',
          step: '0.5',
          value: String(cfg.nftLaminaAguaMm != null ? cfg.nftLaminaAguaMm : 3),
          _clOninput: 'debouncePersistNftCanalChecklist()',
          _clOnblur: 'persistNftCanalDesdeChecklist()',
        },
        {
          id: 'clNftLongCanalM',
          label: 'Longitud cada canal (m, vacío = auto por huecos)',
          type: 'number',
          step: '0.1',
          placeholder: 'auto',
          value: cfg.nftLongCanalM != null && cfg.nftLongCanalM !== '' ? String(cfg.nftLongCanalM) : '',
          _clOninput: 'debouncePersistNftCanalChecklist()',
          _clOnblur: 'persistNftCanalDesdeChecklist()',
        },
      ],
      postCamposHtml:
        '<div id="clNftLayoutResumen" class="cl-nft-layout-resumen" role="status"></div>' +
        '<div id="clNftGeomRecalcMsg" class="cl-nft-geom-recalc-msg" role="status"></div>',
    }]
    : [];
  const primerLlenado = clRutaChecklist === 'primer_llenado';

  const pasosNftExtra = esNft && nftBomb ? [
    { id:'N0', seccion:null, paso:'N0',
      desc:'Bomba de circulación <strong>24 h</strong> continua. La app aplica criterios orientativos alineados con práctica NFT habitual (película fina, pérdidas típicas de línea y altura de bombeo si la indicaste). <strong>No</strong> sustituye la <strong>curva Q–H</strong> del fabricante. Anota el caudal (y opcionalmente la potencia) de la <strong>placa</strong> de tu bomba: verás si <strong>cumple</strong> o no el criterio orientativo.',
      nota:
        'Orientación de equipo (no es veredicto): ' +
        nftBomb.modeloRec +
        ' Ajusta la capacidad del depósito en <strong>Sistema</strong>. Si la película se corta, sube caudal o revisa pendiente y tapones. Cifras y desglose: bloque «Depósito» y «Ver detalle técnico» debajo.',
      campos: [
        { id:'clNftBombaUsuarioLh', label:'Tu bomba — caudal nominal (L/h)', type:'number', step:'10', placeholder:'ej. 600',
          value: cfg.nftBombaUsuarioCaudalLh != null ? String(cfg.nftBombaUsuarioCaudalLh) : '',
          _clOninput:'onNftBombaUsuarioChecklistInput()', _clOnblur:'onNftBombaUsuarioChecklistBlur()' },
        { id:'clNftBombaUsuarioW', label:'Tu bomba — potencia (W, opcional)', type:'number', step:'1', placeholder:'ej. 15',
          value: cfg.nftBombaUsuarioPotenciaW != null ? String(cfg.nftBombaUsuarioPotenciaW) : '',
          _clOninput:'onNftBombaUsuarioChecklistInput()', _clOnblur:'onNftBombaUsuarioChecklistBlur()' },
      ],
      postCamposHtml:
        '<div id="clNftN0GeomHint" class="cl-nft-n0-geom-hint" role="status"></div>' +
        '<div id="clNftDepositoRecomendadoWrap" class="cl-nft-deposito-rec-wrap" role="region" aria-label="Volumen de depósito recomendado NFT"></div>' +
        '<div id="clNftBombaUsuarioMsg" class="cl-nft-bomba-usuario-msg" role="status"></div>' },
    ...(!primerLlenado ? [{
      id:'N1', seccion:null, paso:'N1',
      desc:'Inspeccionar los ' + nftCh + ' canales: sin barro orgánico, raíces compactando el fondo ni tapones en codos',
      nota:'NFT: la película de agua debe poder recorrer todo el canal; ~' + nftHx + ' huecos/canal en tu configuración'
    }] : []),
    { id:'N2', seccion:null, paso:'N2',
      desc:'Revisar retornos y bajantes al depósito: flujo continuo, sin burbujas atrapadas en subidas largas',
      nota:'Aire en el circuito suele dejar los primeros huecos sin película' },
  ] : [];

  const pasosCabeceraRecargaCompleta = [
  { id:'P1', seccion:'🌙 Preparación', paso:'P1',
    desc: pre.descP1,
    nota:'Para mantener raíces húmedas durante los 45 min sin bomba · Dosis escaladas desde tu depósito de ' + vol + 'L y ' + nut.nombre +
      (esNft ? ' · NFT: prioriza humedad en raíces expuestas y entradas de canal.' : '') +
      (esDwc ? ' · DWC: prioriza raíces sumergidas y oxigenación al reanudar.' : ''),
    campos:[{ id:'clEcProvisional', label:'EC provisional:', unit:'mS/cm', type:'number', step:'0.01', placeholder: pre.placeholderProv }] },
  { id:'P2', seccion:null, paso:'P2',
    desc: pre.descP2,
    nota:'Comprar lo faltante antes de empezar' },
  { id:'P3', seccion:null, paso:'P3',
    desc:'Poner toldo si hay sol directo o temperatura > 20°C',
    nota: esNft ? 'En NFT el sol directo seca rápido la película y las plántulas al inicio del canal'
      : esDwc ? 'En DWC el sol calienta depósito y follaje; toldo y depósito opaco reducen estrés y algas'
      : 'Reduce transpiración durante los 45 min sin bomba' },

  { id:'1.1', seccion:'⏹️ Paso 1 — Apagar y riego provisional', paso:'1.1',
    desc: esDwc
      ? 'Apagar el aireador (y la bomba de agua si hubiera recirculación auxiliar) antes de vaciar'
      : 'Apagar la bomba de riego',
    campos:[{ id:'clHoraApagado', label:'Hora apagado:', type:'time', clase:'wide' }] },
  { id:'1.2', seccion:null, paso:'1.2',
    desc: esNft
      ? ('Riego provisional por canal: humedecer copas, cubetas o el inicio de cada línea con solución (≈50–150 ml según longitud). Ningún tramo debe quedar seco.')
      : esDwc
        ? 'Con solución provisional, humedecer coronas/net cups y comprobar que las raíces no queden al aire en ninguna maceta'
        : 'Regar manualmente cada cesta con solución provisional: 50-100 ml por cesta',
    nota: esNft ? ('Reparte en los ' + nftCh + ' canales si comparten bomba — prioridad al arranque de cada uno.')
      : esDwc ? 'Mantén cubierta húmeda y raíces en contacto con líquido hasta rellenar de nuevo'
      : 'Mantener esponjas húmedas' },
  { id:'1.3', seccion:null, paso:'1.3', alert:true,
    desc:'⚠️ Máximo 45 minutos sin bomba — anotar hora límite',
    nota:'Estrés hídrico irreversible si se supera' },

  { id:'1.4', seccion:null, paso:'1.4', alert:true,
    desc: esNft
      ? '✂️ COSECHAR o retirar plantas maduras antes de vaciar — en NFT la materia orgánica y raíces en canales estrechos generan biofilm y cortan la película'
      : esDwc
        ? '✂️ COSECHAR o retirar plantas maduras antes de vaciar — restos de raíz en el depósito degradan la mezcla y favorecen algas'
        : '✂️ COSECHAR PRIMERO todas las plantas maduras antes de limpiar',
    nota: esNft
      ? 'Orden: 1º Vaciar carga madura del canal · 2º Limpiar canales/retornos · 3º Nueva solución'
      : esDwc
        ? 'Orden: 1º Retirar carga madura · 2º Limpiar depósito y difusores · 3º Nueva solución'
        : '⚠️ CRÍTICO: Las raíces maduras miden 30-40cm y al sacar las cestas se rompen inevitablemente. Los fragmentos de raíz en el depósito fermentan, generan espuma y suben el pH. Orden correcto: 1º Cosechar → 2º Limpiar → 3º Trasplantar' },
  { id:'1.5', seccion:null, paso:'1.5',
    desc: esNft
      ? 'Plantas jóvenes que siguen: no sacar raíces al aire; si mueves una copa, mantén sumersión en solución del depósito actual'
      : esDwc
        ? 'Plantas que siguen: no dejar raíces al aire; si mueves una maceta, mantén sumersión en solución del depósito actual'
        : 'Si hay plantas en crecimiento que NO se cosechan: dejarlas en su sitio durante toda la limpieza',
    nota: esNft
      ? 'En NFT las raíces suelen colgar en el canal — evita que queden al descubierto más de unos segundos'
      : esDwc
        ? 'En DWC las raíces cuelgan en el depósito — minimiza el tiempo fuera del líquido'
        : 'Prepara un cubo con solución del depósito actual por si necesitas mover alguna planta de forma imprescindible — mantén las raíces sumergidas en todo momento' },

  { id:'2.1', seccion:'🧹 Paso 2 — Vaciar y limpiar', paso:'2.1',
    desc:'Vaciar completamente el depósito y anotar color del agua',
    campos:[{
      id:'clColorAgua', label:'Color agua:', type:'select',
      opciones:['Transparente','Ligeramente amarilla','Naranja claro','Naranja oscuro','Rojiza','Marrón']
    }] },
  { id:'2.2', seccion:null, paso:'2.2',
    desc:'Fotografiar sedimento del fondo antes de limpiar',
    nota:'Registro visual para comparar evolución' },
  { id:'2.3', seccion:null, paso:'2.3',
    desc:'Limpiar paredes con agua oxigenada 3%: 15ml en 5L agua. Frotar con esponja suave',
    nota:'Especial atención a manchas rojizas' },
  { id:'2.4', seccion:null, paso:'2.4',
    desc:'Aclarar con agua limpia — mínimo 2 veces',
    nota:'Eliminar todo residuo de agua oxigenada' },
  { id:'2.5', seccion:null, paso:'2.5',
    desc: esNft
      ? 'Limpiar canales NFT, espigas, retornos al depósito y bomba; retirar restos de raíz en codos y bajantes'
      : esDwc
        ? 'Limpiar difusores, mangueras de aire, tapa y paredes del depósito; retirar raíces flotantes y biofilm'
        : 'Limpiar tubos, bomba exterior y conexiones' },
  ];

  const pasosCubiertaDeposito = [
  { id:'3.1', seccion:'🖤 Paso 3 — Cubrir depósito', paso:'3.1',
    desc:'Envolver exterior con bolsa negra opaca o film negro completamente',
    nota:'Previene algas y oxidación del hierro' },
  ];

  const pasosLimpiezaPrimerLlenado = [
  { id:'PL0', seccion:'🚀 Primer llenado del depósito', paso:'PL·0',
    desc:'Tras confirmar depósito, agua, nutriente y EC arriba: limpieza del depósito vacío antes de la primera mezcla.',
    nota:'Si en realidad ya cultivabas y vas a recargar de verdad, cancela y abre de nuevo el checklist eligiendo <strong>Recarga completa</strong>.' },
  { id:'PL1', seccion:'🧹 Depósito antes del primer uso', paso:'PL·1',
    desc:'Limpiar el interior del depósito: agua oxigenada 3% — 15 ml en ~5 L de agua. Frotar paredes con esponja suave.',
    nota: esNft
      ? 'Quita polvo, restos de fabricación o films sueltos. Canales nuevos: enjuagar; una limpieza tipo «recarga» (biofilm, raíces) la harás cuando el sistema ya haya estado en uso.'
      : esDwc
        ? 'Quita polvo y residuos; enjuaga difusores y líneas de aire nuevas. DWC depende de agua limpia y burbujeo uniforme desde el primer día.'
        : 'Quita polvo, grasa o restos industriales. Con tubo/bomba nuevos, un enjuague previo evita residuos en la primera mezcla.' },
  { id:'PL2', seccion:null, paso:'PL·2',
    desc:'Aclarar con agua limpia — mínimo 2 veces',
    nota:'Sin olor a oxigenada antes de llenar con agua para el paso 4 (mezcla nutritiva).' },
  ];

  return [
    ...(primerLlenado ? [...pasosConfigPrimerLlenado, ...pasosLimpiezaPrimerLlenado] : pasosCabeceraRecargaCompleta),
    ...pasosDwcOxigenacion,
    ...pasoNftTuberiaRef,
    ...pasosNftExtra,
    ...(primerLlenado ? [] : pasosCubiertaDeposito),

  { id:'4.1', seccion:'🧪 Paso 4 — Nueva solución nutritiva', paso:'4.1',
    desc:'Llenar con ' + vol + ' litros de agua (destilada/ósmosis recomendado) — volumen de tu ' +
      (esNft ? 'depósito NFT' : esDwc ? 'depósito DWC' : 'torre') +
      (primerLlenado ? '' : ' · Ajusta aquí el EC objetivo (µS/cm) y CalMag si aplica; sal del campo EC para recalcular los ml del orden del fabricante.'),
    nota: primerLlenado
      ? 'Volumen, agua, nutriente y EC objetivo están en <strong>PC·1 / PC·2</strong>. Para cambiarlos, vuelve arriba en el checklist.'
      : 'CalMag: marcar o desmarcar recalcula los pasos siguientes.',
    campos: primerLlenado
      ? [{ id:'clEcInicial', label:'EC inicial:', unit:'µS/cm', type:'number', step:'1', placeholder:'0' }]
      : [...paso40campos, { id:'clEcInicial', label:'EC inicial del agua:', unit:'µS/cm', type:'number', step:'1', placeholder:'0' }] },
  ...generarPasosNutriente(),

  { id:'5.1', seccion:'🔌 Paso 5 — Verificar sistema', paso:'5.1',
    desc: esNft
      ? ('Con la bomba en marcha (24 h): película continua en los ' + nftCh + ' canales; sin tramos secos al inicio ni charcos al final (pendiente ~1–2 % típico). Si anotaste la placa en el checklist, ya tienes el <strong>cumple / no cumple</strong> orientativo.')
      : esDwc
        ? 'Con el aireador en marcha (24 h): burbujeo uniforme en todo el depósito; sin zonas muertas ni ruido de succión en seco'
        : 'Confirmar que la bomba lleva funcionando correctamente durante la espera',
    campos:[
      { id:'clHoraEncendido', label:'Hora:', type:'time', clase:'wide' },
      { id:'clMinSinBomba', label: esDwc ? 'Min sin aireador:' : 'Min sin bomba:', type:'number', placeholder:'40' }
    ] },
  { id:'5.2', seccion:null, paso:'5.2',
    desc: esDwc
      ? 'Revisar difusores y caudal de aire (piedras porosas, obstrucciones, fugas en manguera)'
      : esNft
        ? 'Revisar circuito y racores: película continua y sin fugas en alimentación o retornos'
        : 'Si el depósito lleva piedra o difusor de aire, encenderlo; si solo riegas por bomba, confirma circulación estable por la torre' },
  { id:'5.3', seccion:null, paso:'5.3',
    desc:'Encender calentador — objetivo 20°C',
    campos:[{ id:'clTempAguaInicial', label:'Temp inicial:', unit:'°C', type:'number', step:'0.1', placeholder:'17' }] },
  { id:'5.4', seccion:null, paso:'5.4',
    desc: esDwc
      ? 'Esperar 20 minutos con el aireador en marcha antes de medir'
      : esNft
        ? 'Esperar unos minutos con la bomba en marcha hasta homogeneizar la mezcla en depósito y canales antes de medir'
        : 'Esperar ~20 min con bomba (y difusor de aire en depósito si lo usas) en marcha antes de medir',
    nota: nut.pHBuffer
      ? '20 min homogeneizan la mezcla. Con buffer de pH, las correcciones finas mejor tras unas horas y en <strong>Mediciones</strong> (paso 6 y días siguientes).'
      : 'Con difusor 20 min bastan para una lectura orientativa; afinar EC/pH después en Mediciones si hace falta.' },

  ...pasosPrev6,

  { id:'6.4', seccion: paso6SeccionTitulo || '📊 Paso 6 — Registro', paso:'6.4',
    desc:'Registro en la app — valores de esta recarga / mezcla',
    nota:'Las lecturas intermedias las haces cuando te encaje; aquí cierras lo que quieres guardar ahora. Puedes seguir corrigiendo EC y pH desde <strong>Mediciones</strong>.',
    campos:[
      { id:'clEcFinalReg', label:'EC final:', unit:'µS/cm', type:'number', placeholder: String(ecRecTarget) },
      { id:'clPhFinalReg', label:'pH final:', type:'number', step:'0.1', placeholder: phObj },
      { id:'clPhPlusRegFinal', label:'ml pH+ añadidos en total (opcional):', type:'number', step:'0.1', placeholder:'0' },
      { id:'clPhMinusRegFinal', label:'ml pH− añadidos en total (opcional):', type:'number', step:'0.1', placeholder:'0' },
      { id:'clTempAgua', label:'Temp agua:', unit:'°C', type:'number', step:'0.1', placeholder:'20' },
      { id:'clVolFinal', label:'Volumen:', unit:'L', type:'number', step:'0.5', placeholder: String(vol) }
    ] },

  { id:'7.1', seccion:'✅ Paso 7 — Verificación final', paso:'7.1',
    desc: esNft
      ? ('Película de agua visible en todos los canales; retorno limpio al depósito; sin ruidos de cavitación en la bomba')
      : esDwc
        ? 'Burbujeo estable; temperatura de agua razonable; depósito opaco y tapa bien cerrada'
        : ('Verificar que la bomba funciona y el agua circula por los ' + nNiv + ' niveles de la torre vertical') },
  { id:'7.2', seccion:null, paso:'7.2',
    desc: esNft
      ? 'Tras 30 min: plantas turgentes y entradas de canal sin marchitez; sin “chorros” que dañen plántulas'
      : esDwc
        ? 'Tras 30 min: follaje turgente; sin olor rancio ni espuma excesiva en el depósito'
        : 'Observar las plantas 30 minutos después — sin signos de estrés',
    campos:[{
      id:'clEstadoPlantas', label:'Estado:', type:'select',
      opciones: esDwc
        ? ['Turgentes — correcto', 'Ligeramente lacias', 'Muy lacias — revisar aireador / oxígeno']
        : ['Turgentes — correcto', 'Ligeramente lacias', 'Muy lacias — revisar bomba / circulación']
    }] },
  { id:'7.3', seccion:null, paso:'7.3',
    desc: esNft
      ? 'Anotar en Historial / Mediciones; los próximos días ajusta caudal o pendiente si algún canal se queda corto de película'
      : esDwc
        ? 'Registrar en Historial / Mediciones; vigilar temperatura del agua, EC y estado del aireador en los días siguientes'
        : 'Ejecutar cálculo de riego en la app — verificar que los valores son correctos' },
]; }

function getCLTotal() { return getCLPasos().length; }

function abrirChecklist(esPrimeraVez = false) {
  clEsPrimeraVez = esPrimeraVez;

  if (!checklistInstalacionCompletaParaRecarga()) {
    mostrarOverlayChecklistDatosInstalacion(esPrimeraVez);
    return;
  }

  if (debePreguntarRutaChecklist(esPrimeraVez)) {
    mostrarOverlayRutaChecklistRecarga(esPrimeraVez);
    return;
  }

  elegirClRutaChecklistAlAbrir();
  abrirChecklistDespuesDeElegirRuta(esPrimeraVez);
}

function cerrarChecklist() {
  if (clEsPrimeraVez) {
    if (!confirm('⚠️ Si cierras sin completar el checklist, la instalación activa puede quedar sin registrar bien el primer llenado o la recarga. ¿Salir de todas formas?')) return;
  }
  const co = document.getElementById('checklistOverlay');
  co.classList.remove('open');
  a11yDialogClosed(co);
}

function onChecklistRecargaPrefsChanged() {
  if (!state.configTorre) state.configTorre = {};
  const ecInp = document.getElementById('clEcObjetivoRecarga');
  if (ecInp) {
    const raw = String(ecInp.value || '').trim().replace(',', '.');
    const ec = parseFloat(raw);
    if (raw === '' || !Number.isFinite(ec)) {
      delete state.configTorre.checklistEcObjetivoUs;
    } else if (ec >= 200 && ec <= 6000) {
      state.configTorre.checklistEcObjetivoUs = Math.round(ec);
    } else {
      delete state.configTorre.checklistEcObjetivoUs;
    }
  }
  const cm = document.getElementById('clUsarCalMag');
  if (cm) state.configTorre.checklistUsarCalMag = cm.checked;
  guardarEstadoTorreActual();
  saveState();
  renderChecklist();
  refreshConsejosSiVisible();
}

function onPrimerLlenadoVolDesdeChecklist() {
  initTorres();
  if (!state.configTorre) state.configTorre = {};
  const elM = document.getElementById('clPrimerVolMax');
  const elZ = document.getElementById('clPrimerVolMezcla');
  let vMax = parseFloat(String(elM && elM.value).replace(',', '.'));
  if (!Number.isFinite(vMax)) vMax = VOL_OBJETIVO;
  vMax = Math.round(Math.max(5, Math.min(100, vMax)));
  if (elM) elM.value = String(vMax);
  state.configTorre.volDeposito = vMax;
  const rawMez = elZ ? String(elZ.value || '').trim() : '';
  const m = parseFloat(rawMez.replace(',', '.'));
  if (rawMez !== '' && Number.isFinite(m) && m > 0 && m < vMax - 0.02) {
    state.configTorre.volMezclaLitros = Math.min(vMax, Math.max(0.5, Math.round(m * 10) / 10));
    if (elZ) elZ.value = String(state.configTorre.volMezclaLitros);
  } else {
    delete state.configTorre.volMezclaLitros;
    if (elZ) elZ.value = '';
  }
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try { actualizarBadgesNutriente(); } catch (e) {}
  renderChecklist();
  refreshConsejosSiVisible();
}

function onPrimerLlenadoAguaDesdeChecklist() {
  const sel = document.getElementById('clPrimerAgua');
  const v = sel && sel.value;
  if (v === 'destilada' || v === 'osmosis' || v === 'grifo') setAgua(v);
  initTorres();
  guardarEstadoTorreActual();
  saveState();
  renderChecklist();
  refreshConsejosSiVisible();
}

function onPrimerLlenadoNutrienteDesdeChecklist() {
  const sel = document.getElementById('clPrimerNutriente');
  const id = sel && sel.value;
  if (!id || !NUTRIENTES_DB.some(n => n.id === id)) return;
  initTorres();
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.nutriente = id;
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try { actualizarBadgesNutriente(); } catch (e) {}
  renderChecklist();
  refreshConsejosSiVisible();
}

function irConsejosTablaResumenEc() {
  try { cerrarChecklist(); } catch (_) {}
  const pq = document.getElementById('checklistPreguntaOverlay');
  if (pq) pq.remove();
  consejoCatActiva = 'ecph';
  goTab('consejos');
  renderConsejos();
  setTimeout(() => {
    document.getElementById('consejos-resumen-ec-ph')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function cerrarOverlayTablaCultivosChecklist() {
  const o = document.getElementById('checklistTablaCultivosOverlay');
  if (o) {
    try { a11yDialogClosed(o); } catch (e) {}
    o.remove();
  }
}

/** Tabla EC/pH por cultivo — overlay para PC·1 sin salir del checklist. */
function abrirOverlayTablaCultivosChecklist() {
  cerrarOverlayTablaCultivosChecklist();
  const overlay = document.createElement('div');
  overlay.id = 'checklistTablaCultivosOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'clTablaCultivosTit');
  overlay.className = 'checklist-dark-overlay checklist-dark-overlay--tabla';
  overlay.innerHTML =
    '<div class="checklist-dark-sheet checklist-dark-sheet--tabla">' +
      '<div class="checklist-tabla-head">' +
        '<div id="clTablaCultivosTit" class="checklist-tabla-title">EC y pH por cultivo</div>' +
        '<button type="button" id="clTablaCultivosCerrar" class="checklist-tabla-close" aria-label="Cerrar">✕</button>' +
      '</div>' +
      '<div id="clTablaCultivosBody" class="checklist-tabla-body"></div>' +
      '<div class="checklist-tabla-footer">' +
        '<button type="button" id="clTablaCultivosVolver" class="checklist-tabla-back">Volver al checklist</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  const body = document.getElementById('clTablaCultivosBody');
  if (body) body.innerHTML = buildHtmlTablaEcPh({ omitAnchorId: true });
  document.getElementById('clTablaCultivosCerrar')?.addEventListener('click', cerrarOverlayTablaCultivosChecklist);
  document.getElementById('clTablaCultivosVolver')?.addEventListener('click', cerrarOverlayTablaCultivosChecklist);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) cerrarOverlayTablaCultivosChecklist(); });
  try { a11yDialogOpened(overlay); } catch (e) {}
}

function renderChecklist() {
  const el = document.getElementById('checklistContent');
  let html = '';
  let seccionActual = '';

  getCLPasos().forEach(p => {
    if (p.seccion && p.seccion !== seccionActual) {
      seccionActual = p.seccion;
      html += `<div class="cl-section-title">${p.seccion}</div>`;
    }

    const campos = p.campos ? p.campos.map(c => {
      if (c.type === 'select') {
        let optsHtml;
        if (c.opcionesVal && c.opcionesVal.length) {
          optsHtml = c.opcionesVal.map(o => {
            const val = String(o.value).replace(/"/g, '&quot;');
            const lab = escHtmlUi(String(o.label != null ? o.label : o.value));
            const sel = o.selected ? ' selected' : '';
            return '<option value="' + val + '"' + sel + '>' + lab + '</option>';
          }).join('');
        } else {
          optsHtml = (c.opciones || []).map(o => `<option>${escHtmlUi(String(o))}</option>`).join('');
        }
        const chg = c._clOnchange ? ' onchange="' + c._clOnchange + '"' : '';
        return `<div class="cl-field">
          <label>${c.label}</label>
          <select id="${c.id}" class="${c.clase||''}"${chg}>
            ${optsHtml}
          </select>
        </div>`;
      }
      if (c.type === 'checkbox') {
        const lblExtra = c.labelClass ? ' ' + c.labelClass : '';
        const chkClass = c.labelClass ? '' : ' class="cl-checkbox-inline-input"';
        const lblClass = c.labelClass ? '' : ' cl-field--inline-check';
        const spanClass = c.labelClass ? '' : ' class="cl-inline-check-text"';
        return `<label class="cl-field${lblExtra}${lblClass}">
          <input type="checkbox" id="${c.id}"${chkClass}
            ${c.checked ? 'checked' : ''}
            ${c._clOnchange ? ' onchange="' + c._clOnchange + '"' : ''}>
          <span${spanClass}>${c.label || ''}</span>
        </label>`;
      }
      const valAttr = (c.value != null && c.value !== '')
        ? ' value="' + String(c.value).replace(/"/g, '&quot;') + '"'
        : '';
      const inpExtra = c._clOninput ? ' oninput="' + c._clOninput + '"' : '';
      const blurExtra = c._clOnblur ? ' onblur="' + c._clOnblur + '"' : '';
      const keyExtra = c._clOnkeydown ? ' onkeydown="' + c._clOnkeydown + '"' : '';
      return `<div class="cl-field">
        <label>${c.label}</label>
        <input type="${c.type}" id="${c.id}" step="${c.step||'1'}"
          placeholder="${c.placeholder||''}"
          class="${c.clase||''}"
          ${valAttr}
          ${inpExtra}
          ${blurExtra}
          ${keyExtra}
          ${c.type === 'number' ? 'inputmode="decimal"' : ''}>
        ${c.unit ? `<span class="unit">${c.unit}</span>` : ''}
      </div>`;
    }).join('') : '';

    html += `
      <div class="cl-item${p.alert ? ' alert-item' : ''}" id="clItem-${p.id}">
        <button type="button" class="cl-checkbox" id="clCb-${p.id}" onclick="clToggle('${p.id}')"
          aria-pressed="false" aria-label="Marcar paso: ${escAriaAttr(p.paso)}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 7l4 4 6-7" stroke="#0d2b1a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="cl-body">
          ${p.alert ? '<div class="cl-alert-tag">⚠️ Crítico</div>' : ''}
          <div class="cl-step${p.alert ? ' alert' : ''}">${p.paso}</div>
          <div class="cl-desc">${p.desc}</div>
          ${p.nota ? `<div class="cl-note">${p.nota}</div>` : ''}
          ${p.extraHtml || ''}
          ${campos}
          ${p.postCamposHtml || ''}
        </div>
      </div>`;
  });

  el.innerHTML = html;
  const validIds = new Set(getCLPasos().map(p => p.id));
  const prevN = clChecked.size;
  clChecked = new Set([...clChecked].filter(id => validIds.has(id)));
  if (prevN !== clChecked.size) persistirClChecklistAvance();
  clChecked.forEach(id => {
    const cb = document.getElementById('clCb-' + id);
    const item = document.getElementById('clItem-' + id);
    if (cb && item) {
      cb.classList.add('checked');
      item.classList.add('checked');
      cb.setAttribute('aria-pressed', 'true');
    }
  });
  updateClProgress();
  if ((state.configTorre || {}).tipoInstalacion === 'nft') {
    try { refrescarUIMensajeBombaUsuarioNft('checklist'); } catch (e) {}
    try { actualizarMensajeNftCanalChecklist(); } catch (e) {}
    try { refrescarNftLayoutResumenChecklist(); } catch (e) {}
  }
  if ((state.configTorre || {}).tipoInstalacion === 'dwc') {
    try {
      refrescarDwcDifusorChecklist();
    } catch (eDwcDif) {}
  }
}

function clToggle(id) {
  const cb = document.getElementById('clCb-' + id);
  const item = document.getElementById('clItem-' + id);
  if (clChecked.has(id)) {
    clChecked.delete(id);
    cb.classList.remove('checked');
    item.classList.remove('checked');
    cb.setAttribute('aria-pressed', 'false');
  } else {
    clChecked.add(id);
    cb.classList.add('checked');
    item.classList.add('checked');
    cb.setAttribute('aria-pressed', 'true');
  }
  updateClProgress();
  persistirClChecklistAvance();
}

function updateClProgress() {
  const pct = Math.round((clChecked.size / getCLTotal()) * 100);
  document.getElementById('clProgressFill').style.width = pct + '%';
  document.getElementById('clProgressText').textContent = `${clChecked.size} / ${getCLTotal()} pasos completados`;
  const btn = document.getElementById('clBtnFinalizar');
  if (!btn) return;
  const completo = clChecked.size >= getCLTotal();
  btn.disabled = !completo;
  const esPrimer = typeof clRutaChecklist !== 'undefined' && clRutaChecklist === 'primer_llenado';
  const lblFin = esPrimer ? '✅ Finalizar primer llenado' : '✅ Finalizar recarga completa';
  btn.textContent = lblFin;
  btn.setAttribute('aria-label', esPrimer
    ? 'Confirmar primer llenado: todos los pasos completados'
    : 'Confirmar recarga completa: todos los pasos completados');
}

function gCL(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

async function finalizarChecklist() {
  const now = new Date();
  const dia2 = String(now.getDate()).padStart(2,'0');
  const mes2 = String(now.getMonth()+1).padStart(2,'0');
  const anyo2 = now.getFullYear();
  const fecha = `${dia2}/${mes2}/${anyo2}`;
  const hora  = now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });

  const ecRaw  = gCL('clEcFinalReg');
  const phFinal  = gCL('clPhFinalReg');
  const tempAgua = gCL('clTempAgua');
  const volFinal = gCL('clVolFinal');
  const ecVal = parseFloat(ecRaw);
  const ecFinalNum = ecRaw && !isNaN(ecVal)
    ? String(ecVal < 25 ? Math.round(ecVal * 1000) : Math.round(ecVal))
    : '';

  // Actualizar estado del sistema
  state.ultimaRecarga = now.toISOString().split('T')[0];
  state.recargaSnoozeHasta = null;
  const prevHum = state.ultimaMedicion?.humSustrato;
  state.ultimaMedicion = {
    fecha, hora,
    ec: ecFinalNum,
    ph: phFinal,
    temp: tempAgua,
    vol: volFinal,
    humSustrato: prevHum != null && String(prevHum).trim() !== '' ? prevHum : ''
  };

  // Guardar recarga completa en historial local
  if (!state.recargasLocal) state.recargasLocal = [];
  const nutR = getNutrienteTorre();
  const mlP0 = calcularMlParteNutriente(0);
  const pMas46 = parseFloat(gCL('clPhMasPaso46')) || 0;
  const pPlusFin = parseFloat(gCL('clPhPlusRegFinal'));
  const pMinusFin = parseFloat(gCL('clPhMinusRegFinal'));
  const phPlusExtra = Number.isFinite(pPlusFin) ? pPlusFin : 0;
  const phMasTot = pMas46 + phPlusExtra;
  const recargaData = {
    fecha, hora,
    torreId: getTorreActiva().id != null ? getTorreActiva().id : (state.torreActiva || 0),
    torreNombre: (getTorreActiva().nombre || '').trim() || 'Instalación',
    torreEmoji: getTorreActiva().emoji || '🌿',
    nutrienteId: nutR.id,
    nutrienteNombre: nutR.nombre,
    // Parámetros agua
    ecInicial:    gCL('clEcInicial')   || '0',
    ecCalMag:     gCL('clEcCalMag')    || '',
    calmagMl:     gCL('clCalmagMl')    || String(CALMAG_ML_OBJETIVO),
    ecTrasA:      gCL('clEcA')         || '',
    ecTrasAB:     gCL('clEcAB')        || '',
    phMedido:     gCL('clPhTrasMezcla') || gCL('clPhFinalReg') || '',
    phMasMl:      phMasTot ? String(phMasTot) : '',
    phMenosMl:    Number.isFinite(pMinusFin) && pMinusFin > 0 ? String(pMinusFin) : '',
    vegaAMl:      String(mlP0),
    vegaBMl:      nutR.partes >= 2 ? String(calcularMlParteNutriente(1)) : '',
    vegaCMl:      nutR.partes >= 3 ? String(calcularMlParteNutriente(2)) : '',
    ecFinal:      String(ecFinalNum),
    phFinal:      phFinal || '',
    tempFinal:    tempAgua || '',
    volFinal:     volFinal || '',
    // Observaciones
    colorAgua:    gCL('clColorAgua')    || '',
    estadoPlantas:gCL('clEstadoPlantas')|| '',
    minSinBomba:  gCL('clMinSinBomba')  || '',
    notas:        'Recarga completa del depósito',
  };
  state.recargasLocal.unshift(recargaData);
  if (state.recargasLocal.length > 20) state.recargasLocal = state.recargasLocal.slice(0,20);

  // Guardar en registro general
  addRegistro('recarga', {
    ecFinal: String(ecFinalNum), phFinal, tempAgua, volFinal,
    calmagMl: recargaData.calmagMl,
    vegaAMl: recargaData.vegaAMl, vegaBMl: recargaData.vegaBMl, vegaCMl: recargaData.vegaCMl,
    phMasMl: recargaData.phMasMl,
    phMenosMl: recargaData.phMenosMl || '',
    colorAgua: recargaData.colorAgua,
    estadoPlantas: recargaData.estadoPlantas,
    icono: '🔄'
  });

  // También guardar como medición local
  if (!state.mediciones) state.mediciones = [];
  state.mediciones.unshift({
    fecha, hora, ec: String(ecFinalNum), ph: phFinal,
    temp: tempAgua, vol: volFinal,
    humSustrato: prevHum != null && String(prevHum).trim() !== '' ? prevHum : '',
    notas: 'Recarga completa'
  });

  limpiarClChecklistAvanceActual();
  clChecked.clear();
  guardarEstadoTorreActual();

  saveState();

  // Guardar recarga en Google Sheets (opcional; fallos → toast, datos ya en local)
  await hcPostSheets({
    action: 'recarga',
    fecha,
    ecFinal: ecRaw && !isNaN(ecVal) ? (ecVal < 25 ? ecVal * 1000 : ecVal) : '',
    phFinal,
    tempAgua,
    calmagMl: gCL('clCalmagMl'),
    vegaAMl: String(calcularMlParteNutriente(0)),
    vegaBMl: getNutrienteTorre().partes >= 2 ? String(calcularMlParteNutriente(1)) : '',
    phMasMl: phMasTot ? String(phMasTot) : '',
    nutriente: nutR.nombre,
    observaciones: `Color agua: ${gCL('clColorAgua')} · Estado plantas: ${gCL('clEstadoPlantas')} · Min sin bomba: ${gCL('clMinSinBomba')}` +
      (recargaData.phMenosMl ? ` · pH−: ${recargaData.phMenosMl} ml` : '')
  });
  await hcPostSheets({
    action: 'medicion',
    fecha, hora,
    ec: ecRaw && !isNaN(ecVal) ? (ecVal < 25 ? ecVal * 1000 : ecVal) : '',
    ph: phFinal,
    temp: tempAgua,
    volumen: volFinal,
    notas: 'Recarga completa del depósito',
    alertas: ''
  });

  const co = document.getElementById('checklistOverlay');
  co.classList.remove('open');
  a11yDialogClosed(co);
  updateDashboard();
  showToast('✅ Recarga registrada correctamente');

  if (!clEsPrimeraVez) {
    try {
      abrirModalConsejosTablaPersonal(volFinal);
    } catch (e) { console.error(e); }
  }

  // Si era primera vez, ir al dashboard
  if (clEsPrimeraVez) goTab('inicio');
}

// ══════════════════════════════════════════════════
// HISTORIAL — LÓGICA
// ══════════════════════════════════════════════════

let histTabActiva = 'mediciones';
let histDatos = [];
let histRecargasDatos = [];

function histTab(tab) {
  histTabActiva = tab;
  document.querySelectorAll('.hist-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
    t.tabIndex = -1;
  });
  const btn = document.getElementById('htab-' + tab);
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.tabIndex = 0;
  }

  const panelMap = {
    mediciones: 'histMediciones',
    recargas: 'histRecargas',
    registro: 'histRegistroPanel',
    diario: 'histDiarioPanel',
  };
  // Ocultar todos los paneles
  Object.entries(panelMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('setup-hidden');
    el.setAttribute('aria-hidden', 'true');
  });

  if (tab === 'mediciones') {
    const el = document.getElementById('histMediciones');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
  } else if (tab === 'recargas') {
    const el = document.getElementById('histRecargas');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
  } else if (tab === 'registro') {
    const el = document.getElementById('histRegistroPanel');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
    renderRegistro();
  } else if (tab === 'diario') {
    guardarEstadoTorreActual(); // asegurar que state.torre tiene las fotos recientes
    const el = document.getElementById('histDiarioPanel');
    if (el) { el.classList.remove('setup-hidden'); el.setAttribute('aria-hidden', 'false'); }
    renderDiarioSelector();
  }
  if (typeof window._hcSyncHistorialTabTabIndex === 'function') window._hcSyncHistorialTabTabIndex();
}

let filtroTorreActivo = null; // null = todas las instalaciones

function coincideFiltroTorre(entry) {
  if (filtroTorreActivo == null) return true;
  const tid = entry && entry.torreId;
  if (tid != null) return String(tid) === String(filtroTorreActivo);
  const t = state.torres && state.torres.find(x => x && String(x.id) === String(filtroTorreActivo));
  if (!t) return false;
  const nomEnt = String(entry.torreNombre || '').trim();
  const nomTor = String(t.nombre || '').trim();
  if (nomEnt && nomTor && nomEnt === nomTor) return true;
  return false;
}

/** Registro unificado (todas las torres) para Historial → Registro con filtro por instalación. */
function recolectarRegistroTodasInstalaciones() {
  initTorres();
  if (!state.torres || state.torres.length <= 1) {
    const ta = getTorreActiva();
    const tid = ta && ta.id != null ? ta.id : (state.torreActiva || 0);
    const slotIdx = state.torreActiva || 0;
    return (state.registro || []).map(e => ({
      ...e,
      torreId: e.torreId != null ? e.torreId : tid,
      _slotIdx: slotIdx,
    }));
  }
  const todas = [];
  state.torres.forEach((tor, slotIdx) => {
    (tor.registro || []).forEach(e => {
      todas.push({
        ...e,
        torreId: e.torreId != null ? e.torreId : tor.id,
        torreNombre: e.torreNombre || tor.nombre,
        torreEmoji: e.torreEmoji || tor.emoji,
        _slotIdx: slotIdx,
      });
    });
  });
  todas.sort((a, b) => {
    const da = parseRegistroFechaHoraMs(a.fecha, a.hora);
    const db = parseRegistroFechaHoraMs(b.fecha, b.hora);
    return db - da;
  });
  return todas;
}

function parseRegistroFechaHoraMs(fecha, hora) {
  const p = String(fecha || '').split('/');
  if (p.length !== 3) return 0;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10) - 1;
  const y = parseInt(p[2], 10);
  const t = String(hora || '00:00').split(':');
  const h = parseInt(t[0], 10) || 0;
  const mi = parseInt(t[1], 10) || 0;
  if (!y || m < 0 || m > 11) return 0;
  return new Date(y, m, d, h, mi).getTime();
}

/** Mediciones unificadas: una sola instalación o todas, con torreId/torreNombre para filtro e importación. */
function recolectarMedicionesTodasInstalaciones() {
  initTorres();
  if (!state.torres || state.torres.length <= 1) {
    const ta = getTorreActiva();
    const tid = ta && ta.id != null ? ta.id : null;
    return (state.mediciones || []).map(m => ({
      ...m,
      torreId: m.torreId != null ? m.torreId : tid,
      torreNombre: m.torreNombre || (ta && ta.nombre) || '',
      torreEmoji: m.torreEmoji || (ta && ta.emoji) || '🌿',
    }));
  }
  const todas = [];
  state.torres.forEach(t => {
    (t.mediciones || []).forEach(m => {
      todas.push({
        ...m,
        torreId: m.torreId != null ? m.torreId : t.id,
        torreNombre: m.torreNombre || t.nombre,
        torreEmoji: m.torreEmoji || t.emoji || '🌿',
      });
    });
  });
  todas.sort((a, b) => {
    const da = String(a.fecha || '').split('/').reverse().join('') + String(a.hora || '');
    const db = String(b.fecha || '').split('/').reverse().join('') + String(b.hora || '');
    return db.localeCompare(da);
  });
  return todas;
}

function cargarHistorial() {
  document.getElementById('histLoader').style.display = 'none';
  document.getElementById('histSinDatos').classList.add('setup-hidden');
  ['histMediciones', 'histRecargas', 'histRegistroPanel', 'histDiarioPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('setup-hidden'); el.setAttribute('aria-hidden', 'true'); }
  });

  guardarEstadoTorreActual();
  const todasMediciones = recolectarMedicionesTodasInstalaciones();
  if (state.torres && state.torres.length > 1) {
    renderFiltroTorres();
  } else {
    const fw = document.getElementById('filtroTorreWrapGlobal');
    if (fw) fw.style.display = 'none';
  }

  if (todasMediciones.length === 0) {
    document.getElementById('histSinDatos').classList.remove('setup-hidden');
    return;
  }

  histDatos = todasMediciones;
  renderHistMediciones();
  renderHistRecargas();
  const hm = document.getElementById('histMediciones');
  if (hm) { hm.classList.remove('setup-hidden'); hm.setAttribute('aria-hidden', 'false'); }
}

function renderFiltroTorres() {
  const wrap = document.getElementById('filtroTorreWrapGlobal');
  const btns = document.getElementById('filtroTorreBtnsGlobal');
  if (!wrap || !btns || !state.torres || state.torres.length <= 1) {
    if (wrap) wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  const todas = [{ id: null, nombre: 'Todas las instalaciones', emoji: '📊' }, ...state.torres];
  btns.innerHTML = todas.map(t =>
    '<button onclick="setFiltroTorre(' + JSON.stringify(t.id) + ')" ' +
    'class="hist-torre-filter-btn' + (filtroTorreActivo === t.id ? ' active' : '') + '">' +
    (t.emoji||'🌿') + ' ' + t.nombre + '</button>'
  ).join('');
}

function setFiltroTorre(id) {
  filtroTorreActivo = id;
  renderFiltroTorres();
  renderHistMediciones();
  renderHistRecargas();
  renderRegistro();
  if (histTabActiva === 'diario') renderDiarioSelector();
}


function renderMiniChart(containerId, datos, min, max, color, colorBad) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  const ultimos = datos.slice(-14);
  if (ultimos.length === 0) {
    el.innerHTML = '<div class="chart-empty-msg">Sin datos</div>';
    return;
  }

  const vals = ultimos.map(d => parseFloat(d.val) || 0).filter(v => !isNaN(v));
  if (vals.length === 0) return;

  const maxVal = Math.max(...vals, max);
  const minVal = Math.min(...vals, min * 0.9);
  const rango = maxVal - minVal || 1;

  ultimos.forEach((d, i) => {
    const v = parseFloat(d.val);
    if (isNaN(v)) return;
    const pct = Math.max(4, ((v - minVal) / rango) * 100);
    const enRango = v >= min && v <= max;
    const c = enRango ? color : colorBad;
    const showDate = i === 0 || i === ultimos.length - 1 || i % 4 === 0;
    // fecha ya limpia (DD/MM)
    const fechaLabel = d.fecha ? String(d.fecha).slice(0, 5) : '';

    const col = document.createElement('div');
    col.className = 'chart-bar-col';
    col.innerHTML = `
      <div class="chart-bar-inner" style="--ch-h:${pct}%;--ch-bg:${c}"></div>
      <div class="chart-date">${showDate ? fechaLabel : ''}</div>
    `;
    el.appendChild(col);
  });
}

function getClaseVal(param, val) {
  const v = parseFloat(val);
  if (isNaN(v)) return '';
  const r = RANGOS[param];
  if (!r) return '';
  if (v >= r.min && v <= r.max) return 'ok';
  if (v >= r.warnLow && v <= r.warnHigh) return 'warn';
  return 'bad';
}

// Limpia un valor de Google Sheets — elimina fechas ISO, convierte a número
function limpiarVal(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  // Si parece fecha ISO (contiene T y Z o tiene formato YYYY-MM-DD largo) → descartar
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s.length === 10) return null;
  // Si es número válido → devolver número
  const n = parseFloat(s);
  if (!isNaN(n)) return n;
  // Si es texto corto (fecha legible como "15/03/2026") → devolver string
  if (s.length < 20) return s;
  return null;
}

// Formatea fecha de Google Sheets a formato legible DD/MM
function formatFecha(v) {
  if (!v) return '—';
  const s = String(v).trim();
  // Fecha ISO → convertir
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
  }
  // Fecha ISO simple
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2]}/${parts[1]}`;
  }
  // Ya es legible — devolver tal cual (max 10 chars)
  return s.slice(0, 10);
}

// Formatea hora
function formatHora(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }
  return s.slice(0, 5);
}

/** Rellena el registro unificado desde mediciones ya guardadas (solo si registro vacío). Incluye todas las instalaciones si hay varias. */
function importarMedicionesAlRegistro() {
  initRegistro();
  guardarEstadoTorreActual();
  const meds = recolectarMedicionesTodasInstalaciones();
  if (meds.length === 0) {
    showToast('No hay mediciones guardadas para importar', true);
    return;
  }
  if ((state.registro || []).length > 0) {
    showToast('El registro ya tiene datos. Esta acción solo aplica con registro vacío.', true);
    return;
  }
  const nInst = state.torres && state.torres.length > 1 ? state.torres.length : 1;
  const msgExtra = nInst > 1 ? ' (' + nInst + ' instalaciones)' : '';
  if (!confirm('¿Añadir ' + meds.length + ' entradas desde «Mediciones» al registro unificado' + msgExtra + '? No borra el historial de mediciones.')) return;

  const tActiva = getTorreActiva();

  for (const m of [...meds].reverse()) {
    const torreOrigen =
      m.torreId != null && Array.isArray(state.torres)
        ? state.torres.find(t => t.id === m.torreId)
        : null;
    const tO = torreOrigen || tActiva;
    const tipoInstalSnap = tipoInstalacionNormalizado(tO.config || state.configTorre || {});
    const base = {
      torreId: m.torreId != null ? m.torreId : tO.id,
      torreNombre: (m.torreNombre || tO.nombre || '').trim() || 'Instalación',
      torreEmoji: m.torreEmoji || tO.emoji || '🌿',
      tipoInstalSnap,
    };
    const notas = String(m.notas || '');
    const esRecarga = /recarga completa/i.test(notas);
    let entry;
    if (m.tipo === 'cosecha') {
      entry = {
        tipo: 'cosecha', fecha: m.fecha, hora: m.hora, ...base,
        variedad: '', notas, icono: '✂️',
      };
    } else if (esRecarga) {
      entry = {
        tipo: 'recarga', fecha: m.fecha, hora: m.hora, ...base,
        ecFinal: m.ec || '', phFinal: m.ph || '', tempAgua: m.temp || '', volFinal: m.vol || '',
        calmagMl: '', vegaAMl: '', phMasMl: '', phMenosMl: '',
        notas, icono: '🔄',
      };
    } else {
      entry = {
        tipo: 'medicion', fecha: m.fecha, hora: m.hora, ...base,
        ec: m.ec, ph: m.ph, temp: m.temp, vol: m.vol,
        humSustrato: m.humSustrato || '', notas, icono: '📊',
      };
    }
    state.registro.unshift(entry);
  }
  if (state.registro.length > 200) state.registro = state.registro.slice(0, 200);
  saveState();
  guardarEstadoTorreActual();
  renderRegistro();
  showToast('✅ ' + meds.length + ' entradas importadas al registro');
}

function escRegistroAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Miniaturas de entradas tipo «foto» cargadas desde IndexedDB */
async function hydrateRegistroFotoThumbs(container) {
  if (!container) return;
  for (const slot of container.querySelectorAll('.registro-foto-thumb')) {
    const key = slot.getAttribute('data-foto-key');
    if (!key) continue;
    try {
      const o = await leerFotoIDB(key);
      if (!o || !o.data) continue;
      const variedad = slot.getAttribute('data-variedad') || 'Planta';
      const fecha = slot.getAttribute('data-fecha') || '';
      const img = document.createElement('img');
      img.src = o.data;
      img.alt = 'Foto: ' + variedad;
      img.className = 'registro-foto-img';
      img.addEventListener('click', () => verFotoCompletaDiario(o.data, variedad, fecha));
      slot.replaceWith(img);
    } catch (_) { /* clave ausente en IDB */ }
  }
}

function renderRegistro() {
  const lista   = document.getElementById('registroLista');
  const entries = recolectarRegistroTodasInstalaciones().filter(coincideFiltroTorre).slice(0, 100);
  const nMeds   = recolectarMedicionesTodasInstalaciones().length;

  if (entries.length === 0) {
    let extra = '';
    if (nMeds > 0) {
      const nInst = state.torres && state.torres.length > 1 ? state.torres.length : 0;
      const sufInst = nInst > 1 ? ' (' + nInst + ' instalaciones)' : '';
      extra =
        '<div class="registro-empty-actions">' +
        '<button type="button" onclick="importarMedicionesAlRegistro()" ' +
        'class="btn btn-primary registro-import-btn">' +
        '↓ Importar ' + nMeds + ' mediciones al registro' + sufInst + '</button>' +
        '<div class="registro-empty-help">' +
        'Útil si empezaste a medir antes de usar esta lista. Las nuevas acciones se añaden solas.' +
        (nInst > 1 ? ' Con varias instalaciones se incluyen todas las mediciones guardadas en cada una.' : '') +
        '</div></div>';
    }
    lista.innerHTML =
      '<div class="registro-empty-box">' +
      '📋 El registro agrupa mediciones, <strong>recargas completas</strong>, <strong>reposiciones parciales</strong> (litros añadidos, agua o agua+nutrientes sin vaciar), cosechas y fotos de plantas en una línea de tiempo.' +
      extra + '</div>';
    return;
  }

  const colores = {
    medicion: { bg:'#f0fdf4', border:'#16a34a', color:'#15803d',  icon:'📊' },
    recarga:  { bg:'#eff6ff', border:'#2563eb', color:'#1d4ed8',  icon:'🔄' },
    cosecha:  { bg:'#fef3c7', border:'#d97706', color:'#b45309',  icon:'✂️' },
    foto:       { bg:'#faf5ff', border:'#9333ea', color:'#7e22ce',  icon:'📸' },
    foto_sistema: { bg:'#ecfdf5', border:'#059669', color:'#047857', icon:'🏗' },
    reposicion: { bg:'#ecfeff', border:'#06b6d4', color:'#0e7490',  icon:'💧' },
  };

  // Agrupar por fecha
  const porFecha = {};
  entries.forEach(e => {
    const key = e.fecha || '—';
    if (!porFecha[key]) porFecha[key] = [];
    porFecha[key].push(e);
  });

  lista.innerHTML = Object.entries(porFecha).map(([fecha, evs]) => {
    const cols = evs.map(e => {
      const c = colores[e.tipo] || { bg:'#f8fafc', border:'#94a3b8', color:'#475569', icon:'📌' };
      const badgeIcon = (e.tipo === 'reposicion' && e.icono) ? e.icono : c.icon;
      const sis = infoSistemaEntrada(e);
      let detalle = '';
      if (e.tipo === 'medicion') {
        detalle = [
          e.ec   ? '⚡ ' + e.ec + ' µS' : '',
          e.ph   ? '🧪 ' + e.ph         : '',
          e.temp ? '🌡️ ' + e.temp + '°C'  : '',
          e.vol  ? '🪣 ' + e.vol + 'L'   : '',
        ].filter(Boolean).join(' · ');
        if (e.notas) detalle += '<br><span class="registro-note-sub">📝 ' + e.notas + '</span>';
      } else if (e.tipo === 'recarga') {
        detalle = [
          e.ecFinal  ? '⚡ EC final: ' + e.ecFinal + ' µS' : '',
          e.phFinal  ? '🧪 pH: ' + e.phFinal              : '',
          e.calmagMl ? '💊 CalMag: ' + e.calmagMl + 'ml'   : '',
          e.vegaAMl  ? '🌿 ' + [e.vegaAMl, e.vegaBMl, e.vegaCMl].filter(x => x != null && String(x).trim() !== '').join(' + ') + ' ml' : '',
          (e.phMasMl != null && String(e.phMasMl).trim() !== '') ? '⬆️ pH+: ' + e.phMasMl + ' ml' : '',
          (e.phMenosMl != null && String(e.phMenosMl).trim() !== '') ? '⬇️ pH−: ' + e.phMenosMl + ' ml' : '',
        ].filter(Boolean).join(' · ');
        if (e.notas) detalle += '<br><span class="registro-note-sub">📝 ' + e.notas + '</span>';
      } else if (e.tipo === 'cosecha') {
        detalle = e.variedad || '';
        const ubiC = formatoUbicacionEnRegistro(tipoInstalParaEntradaRegistro(e), e.nivel, e.cesta);
        if (ubiC) detalle += ' · ' + ubiC;
        if (e.fechaSiembra) detalle += ' · 🌱 ' + e.fechaSiembra;
        if (e.diasCultivo) detalle += ' · ' + e.diasCultivo + ' días';
        if (e.notas) detalle += '<br><span class="registro-note-sub">📝 ' + e.notas + '</span>';
      } else if (e.tipo === 'foto_sistema') {
        detalle = 'Vista completa de la instalación';
        if (e.fotoFecha) detalle += ' · 📅 ' + e.fotoFecha;
        if (e.fotoKey) {
          detalle +=
            '<div class="registro-foto-thumb" data-foto-key="' + escRegistroAttr(e.fotoKey) + '" ' +
            'data-variedad="' + escRegistroAttr('Vista del sistema') + '" ' +
            'data-fecha="' + escRegistroAttr(e.fotoFecha || e.fecha || '') + '" ' +
            'class="registro-foto-thumb registro-foto-thumb--placeholder">🏗</div>';
        }
      } else if (e.tipo === 'foto') {
        detalle = (e.variedad || 'Planta');
        if (e.nivel != null && e.cesta != null) {
          const ubiF = formatoUbicacionEnRegistro(tipoInstalParaEntradaRegistro(e), e.nivel, e.cesta);
          if (ubiF) detalle += ' · ' + ubiF;
        }
        if (e.diasCultivo != null && e.diasCultivo !== '') detalle += ' · día ' + e.diasCultivo;
        if (e.fotoFecha) detalle += ' · 📅 ' + e.fotoFecha;
        if (e.fotoKey) {
          detalle +=
            '<div class="registro-foto-thumb" data-foto-key="' + escRegistroAttr(e.fotoKey) + '" ' +
            'data-variedad="' + escRegistroAttr(e.variedad || 'Planta') + '" ' +
            'data-fecha="' + escRegistroAttr(e.fotoFecha || e.fecha || '') + '" ' +
            'class="registro-foto-thumb registro-foto-thumb--placeholder">📸</div>';
        }
      } else if (e.tipo === 'reposicion') {
        const Lnum = typeof e.litros === 'number' ? e.litros : parseFloat(e.litros);
        const Ltxt = isFinite(Lnum) && Lnum > 0 ? '<strong>🪣 +' + Lnum + ' L</strong> añadidos. ' : '';
        if (e.modo === 'solo_agua') {
          detalle = Ltxt + 'Reposición parcial: solo agua (sin vaciar). Mantiene nivel para plantas, bomba y calefactor sumergidos. No es recarga completa — conviene medir volumen total y EC/pH al medir.';
        } else if (e.modo === 'parcial_nutrientes') {
          detalle = Ltxt + 'Reposición parcial: agua + nutrientes sin vaciar. Mismo objetivo de nivel mínimo; no reinicia el ciclo de recarga completa — mide EC/pH cuando puedas.';
        } else {
          detalle = (Ltxt || '') + (e.notas || 'Reposición registrada');
        }
      }
      const slotIdx = typeof e._slotIdx === 'number' ? e._slotIdx : (state.torreActiva || 0);
      return '<div class="registro-entry-card" style="--reg-bg:' + c.bg + ';--reg-bd:' + c.border + ';--reg-badge:' + c.color + '">' +
        '<div class="registro-entry-head">' +
          '<div class="registro-entry-left">' +
            '<span class="registro-entry-badge">' +
              badgeIcon + ' ' +
              (e.tipo === 'foto_sistema'
                ? 'Foto sistema'
                : e.tipo === 'foto'
                  ? 'Foto'
                  : e.tipo === 'reposicion'
                    ? 'Reposición parcial'
                    : e.tipo === 'recarga'
                      ? 'Recarga completa'
                      : (e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1))) +
            '</span>' +
            (sis && sis.nombre ?
              '<span class="registro-entry-torre-chip">' +
              (sis.emoji||'🌿') + ' ' + sis.nombre + '</span>' : '') +
          '</div>' +
          '<div class="registro-entry-right">' +
            '<span class="registro-entry-time">' + (e.hora||'') + '</span>' +
            '<button onclick="borrarEntradaRegistroDesdeHistorial(' + slotIdx + ',\'' + escRegistroAttr(e.fecha) + '\',\'' + escRegistroAttr(e.hora) + '\',\'' + escRegistroAttr(e.tipo) + '\')\" ' +
              'class="registro-entry-delete"' +
              ' title="Borrar entrada">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div class="registro-entry-detail">' + detalle + '</div>' +
        '</div>';
    }).join('');

    return '<div class="registro-dia-wrap">' +
      '<div class="registro-dia-title">' + fecha + '</div>' +
      cols + '</div>';
  }).join('');
  void hydrateRegistroFotoThumbs(lista);
}


function renderHistMediciones() {
  // Aplicar filtro por torre si está activo
  let mediciones = histDatos || state.mediciones || [];
  if (filtroTorreActivo !== null) {
    mediciones = mediciones.filter(coincideFiltroTorre);
  }
  mediciones = mediciones.slice(0, 20);
  if (mediciones.length === 0) {
    document.getElementById('histSinDatos').classList.remove('setup-hidden');
    return;
  }

  // Actualizar valores actuales (primera = más reciente)
  const ult = mediciones[0];
  document.getElementById('histECActual').textContent   = ult.ec   || '—';
  document.getElementById('histPHActual').textContent   = ult.ph   || '—';
  document.getElementById('histTempActual').textContent = ult.temp || '—';
  document.getElementById('histVolActual').textContent  = ult.vol  || '—';

  // Tabla
  const tabla = document.getElementById('histTabla');
    tabla.innerHTML = mediciones.map((m, i) => `
    <div class="hist-row${i===0 ? ' hist-row--latest' : ''}">
      <span class="hist-fecha"><span class="hist-fecha-dia">${m.fecha}</span><br>
        <span class="hist-fecha-hora">${m.hora}</span>
        ${(() => { const sis = infoSistemaEntrada(m); return `<span class="hist-torre-chip">${sis.emoji||'🌿'} ${sis.nombre}</span>`; })()}
      </span>
      <span class="hist-val ${getClaseVal('ec',   m.ec)}">${m.ec   || '—'}</span>
      <span class="hist-val ${getClaseVal('ph',   m.ph)}">${m.ph   || '—'}</span>
      <span class="hist-val ${getClaseVal('temp', m.temp)}">${m.temp || '—'}</span>
      <span class="hist-val ${getClaseVal('vol',  m.vol)}">${m.vol  || '—'}</span>
      <span class="hist-action-cell">
        <button onclick="borrarMedicion(${JSON.stringify(m.fecha)}, ${JSON.stringify(m.hora)}, ${m.torreId == null ? 'null' : JSON.stringify(m.torreId)})"
          class="hist-btn-delete" aria-label="Borrar esta medición">🗑</button>
      </span>
      ${m.notas ? `<span class="hist-val hist-note-line">📝 ${m.notas}</span>` : ''}
    </div>
  `).join('');
}


function renderHistRecargas() {
  // Mostrar recargas locales (siempre disponibles)
  const localSection = document.getElementById('recargasLocalSection');
  const recargasConIdx = (state.recargasLocal || [])
    .map((r, idx) => ({ r, idx }))
    .filter(x => coincideFiltroTorre(x.r));
  const recargas = recargasConIdx.map(x => x.r);

  if (recargas.length === 0 && (!histRecargasDatos || histRecargasDatos.length === 0)) {
    if (localSection) localSection.innerHTML =
      '<div class="hist-recargas-empty">' +
      '🔄 Sin recargas registradas aún.<br>Completa el checklist de recarga para ver el historial.</div>';
    return;
  }

  // Recargas locales — tarjetas detalladas
  if (localSection && recargas.length > 0) {
    localSection.innerHTML = recargasConIdx.slice(0, 10).map((it, i) => {
      const r = it.r;
      const globalIdx = it.idx;
      const sis = infoSistemaEntrada(r);
      return `
      <div class="hist-recarga-card">
        <!-- Cabecera -->
        <div class="hist-recarga-head">
          <div>
            <div class="hist-recarga-title">
              🔄 Recarga #${recargas.length - i}
            </div>
            <div class="hist-recarga-date">${r.fecha} · ${r.hora}</div>
            <div class="hist-recarga-nutriente">${sis.emoji || '🌿'} ${sis.nombre}</div>
            ${r.nutrienteNombre ? '<div class="hist-recarga-nutriente">🧪 ' + r.nutrienteNombre + '</div>' : ''}
          </div>
          <div class="hist-action-cell">
            ${r.ecFinal ? '<div class="hist-recarga-ec">' + r.ecFinal + '<span class="hist-recarga-ec-unit"> µS</span></div>' : ''}
            <button onclick="borrarRecargaLocal(${globalIdx})"
              class="hist-btn-delete" aria-label="Borrar esta recarga">🗑</button>
          </div>
        </div>

        <!-- Grid parámetros -->
        <div class="hist-recarga-grid">
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">CalMag</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--green">${r.calmagMl || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">Abono</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--blue hist-recarga-cell-val--abono">${[r.vegaAMl, r.vegaBMl, r.vegaCMl].filter(x => x != null && String(x).trim() !== '').join(' + ') || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">pH+</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--gold">${r.phMasMl || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">pH−</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--sky">${r.phMenosMl || '—'}<span class="hist-recarga-cell-unit">ml</span></div>
          </div>
          <div class="hist-recarga-cell">
            <div class="hist-recarga-cell-lab">pH final</div>
            <div class="hist-recarga-cell-val hist-recarga-cell-val--blue">${r.phFinal || '—'}</div>
          </div>
        </div>

        <!-- Observaciones si las hay -->
        ${r.colorAgua || r.estadoPlantas ? `
        <div class="hist-recarga-obs">
          ${r.colorAgua ? '🎨 Agua: ' + r.colorAgua + ' · ' : ''}
          ${r.estadoPlantas ? '🌿 Plantas: ' + r.estadoPlantas : ''}
        </div>` : ''}
      </div>
    `;
    }).join('');
  }

  // Recargas de Sheets si disponibles (solo vista global; no trae torreId fiable para filtrar)
  if (histRecargasDatos && histRecargasDatos.length > 0 && filtroTorreActivo == null) {
    const sheetsSection = document.getElementById('sheetsRecargasSection');
    if (sheetsSection) {
      sheetsSection.classList.remove('setup-hidden');
      const tabla = document.getElementById('histRecargasTabla');
      tabla.innerHTML = histRecargasDatos.slice(-10).reverse().map(r => {
        const fecha  = formatFecha(r[0]);
        const ec     = limpiarVal(r[1]);
        const ph     = limpiarVal(r[2]);
        const calmag = limpiarVal(r[4]);
        const phmas  = limpiarVal(r[7]);
        return '<div class="hist-row hist-row--recargas-sheets">' +
          '<span class="hist-fecha">' + fecha + '</span>' +
          '<span class="hist-val ' + getClaseVal('ec', ec) + '">' + (ec !== null ? ec : '—') + '</span>' +
          '<span class="hist-val ' + getClaseVal('ph', ph) + '">' + (ph !== null ? ph : '—') + '</span>' +
          '<span class="hist-val hist-val--green">' + (calmag !== null ? calmag+'ml' : '—') + '</span>' +
          '<span class="hist-val hist-val--muted">' + (phmas !== null ? phmas+'ml' : '0ml') + '</span>' +
          '</div>';
      }).join('');
    }
  } else {
    const sheetsSection = document.getElementById('sheetsRecargasSection');
    if (sheetsSection) sheetsSection.classList.add('setup-hidden');
  }
}


// ══════════════════════════════════════════════════
// CONSEJOS — LÓGICA
// ══════════════════════════════════════════════════

const CONSEJOS_DATA = {
  cultivo: {
    nombre: '🌿 Cultivo', color: '#15803d', bg: 'rgba(22,163,74,0.1)',
    consejos: [
      { icono:'🌱', titulo:'Plántulas — primeros días',
        texto:'Las primeras 48h son críticas. Mantén la esponja siempre húmeda pero no encharcada. El sistema de cascada debe estar activo desde el primer momento. <strong>No expongas las raíces al aire.</strong>',
        alerta:{ tipo:'info', txt:'ℹ️ Las plántulas nuevas pueden necesitar 2-3 días para adaptarse al sistema hidropónico si vienen de semillero en tierra.' } },
      { icono:'⚗️', titulo:'pH inestable tras trasplantar plántulas',
        texto:'Es completamente normal que el pH suba 1-2 unidades en las primeras 24-72h tras añadir plántulas nuevas al sistema. Las raíces jóvenes absorben más aniones (nitratos) que cationes y liberan OH⁻ al agua, subiendo el pH. Con agua destilada este efecto es más pronunciado porque no hay carbonatos que amortigüen. <strong>No es un problema — es fisiología normal.</strong>',
        alerta:{ tipo:'warn', txt:'⚠️ Primera semana con plántulas nuevas: mide el pH cada 6-8h y ajusta con pH- si supera 7.0. A partir del día 4-5 el pH se estabiliza solo. Si el pH sube DE NOCHE también, puede indicar actividad bacteriana — revisar raíces.' } },
      { icono:'🥬', titulo:'Señales de lechuga sana',
        texto:'Hojas turgentes y brillantes, color verde intenso o rojizo según variedad, crecimiento visible día a día. Las raíces deben ser blancas o ligeramente crema, nunca marrones o con mal olor.',
        alerta:{ tipo:'ok', txt:'✅ Una lechuga sana puede crecer 2-3 cm al día en condiciones óptimas.' } },
      { icono:'✂️', titulo:'Cuándo y cómo cosechar',
        texto:'Cosecha cuando la lechuga tenga 15-20cm de diámetro o empiece a compactar el centro. <strong>Corta a 2cm de la base</strong> — muchas variedades rebrotan. Cosechar por la mañana temprano cuando están más hidratadas.',
        alerta:{ tipo:'warn', txt:'⚠️ Si aparece un tallo central alargado (espigado) la lechuga está a punto de florecer y se volverá amarga. Cosechar inmediatamente.' } },
      { icono:'🔃', titulo:'Rotación escalonada (torre por niveles)',
        texto:'Sobre todo en <strong>torre vertical</strong> con varios niveles: rota cada 12-15 días (cosecha abajo → subes plantas → plántulas arriba). Así mantienes producción continua con un solo depósito. En NFT/DWC el ritmo es distinto; usa fechas en fichas y calendario.',
        alerta:{ tipo:'info', txt:'ℹ️ Al rotar, ajusta la EC del depósito al estado del cultivo predominante.' } },
      { icono:'⏱️', titulo:'NFT vs torre: ¿mismos días de cultivo?',
        texto:'En estudios y guías técnicas (p. ej. comparativas NFT / DWC / torre con lechuga) lo que más se documenta son <strong>rendimiento, biomasa y uso de agua</strong>, no un calendario fijo distinto “por sistema”. Los <strong>días hasta cosecha</strong> los marcan sobre todo la <strong>variedad</strong>, la <strong>luz</strong>, <strong>temperatura</strong>, <strong>EC/pH</strong> y la calidad de la plántula. Un NFT con película inestable o una torre con sombra desigual puede alargar el ciclo; no es que NFT o torre tengan por sí solos otro “cronómetro” en webs serias.',
        alerta:{ tipo:'info', txt:'ℹ️ Usa las fechas en la app y la ficha de la variedad; el tipo de montaje cambia la ingeniería del agua, no el genotipo.' } },
      { icono:'📅', titulo:'Fecha de trasplante en la ficha',
        texto:'Cada hueco, maceta o cesta debe llevar <strong>variedad + fecha</strong> desde que plantas o trasplantas. Sin fecha, el riego automático, las medias de edad y el calendario no reflejan lo que hay en la instalación activa: puedes regar como si fueran plántulas cuando ya van por la mitad del ciclo (o al revés).',
        alerta:{ tipo:'ok', txt:'✅ Un momento al trasplantar: abre la ficha, elige cultivo y fecha. Así fotos, registro y cálculo de riego quedan alineados con tus plantas reales.' } },
      { icono:'🧩', titulo:'Cultivos compatibles o no (y por qué)',
        texto:'En un sistema con <strong>un solo depósito</strong> (torre, NFT o DWC) todas las plantas comparten la <strong>misma agua</strong>: misma EC y mismo pH. Por eso solo conviene mezclar grupos con necesidades parecidas. <strong>Lechugas entre sí</strong> y con muchas <strong>asiáticas</strong> de hoja (p. ej. mizuna, komatsuna) suele funcionar si ajustas la EC con cuidado. Las <strong>hojas verdes</strong> más exigentes (espinaca, acelga) suelen pedir <strong>más nutrientes</strong> que un circuito solo lechuga. Los <strong>frutos</strong> (tomate, pepino, pimiento…) y varias <strong>hierbas de EC alta</strong> (menta, orégano, cebollino) descompensan a las lechugas: mejor <strong>otra instalación u otro depósito</strong>. Además del agua, piensa en la <strong>luz</strong>: una planta muy grande puede dejar a las demás a la sombra.',
        alerta:{ tipo:'info', txt:'ℹ️ En <strong>Sistema → Compatibilidad de cultivos</strong> la app te avisa si mezclas grupos poco recomendables en el mismo depósito.' } },
    ]
  },
  agua: {
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)',
    consejos: [
      { icono:'⚡', titulo:'Entender la EC',
        texto:'La EC mide la concentración de nutrientes. El rango objetivo depende del <strong>cultivo</strong> y de la <strong>marca</strong> que tengas en la <strong>instalación activa</strong> (véase checklist y medición). Si baja mucho hay hambre de nutrientes; si sube demasiado, estrés osmótico.',
        alerta:{ tipo:'info', txt:'ℹ️ La EC sube cuando las plantas transpiran más agua que nutrientes. En verano controla más a menudo.' } },
      { icono:'🟤', titulo:'Agua coloreada en el depósito',
        texto:'Tonos ámbar o rojizos suelen venir de la oxidación del <strong>hierro quelado</strong> u otros compuestos de la solución — es habitual en muchas líneas <strong>A+B</strong>. Suele ser normal tras varios días e indica que conviene plantear <strong>recarga</strong>. Cubrir el depósito opaco a la luz reduce algas.',
        alerta:{ tipo:'warn', txt:'⚠️ El depósito debe estar opaco a la luz; filtraciones de luz aceleran algas y degradación.' } },
    ]
  },
  ecph: {
    nombre: '📊 EC / pH', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
    soloTabla: true,
    consejos: []
  },
  nft: {
    nombre: '🪴 NFT', color: '#0d9488', bg: 'rgba(13,148,136,0.1)',
    consejos: [],
    soloNftDoc: true,
  },
  dwc: {
    nombre: '🌊 DWC', color: '#0891b2', bg: 'rgba(8,145,178,0.12)',
    consejos: [],
    soloDwcDoc: true,
  },
  clima: {
    nombre: '🌡️ Clima', color: '#b45309', bg: 'rgba(217,119,6,0.1)',
    consejos: [
      { icono:'☀️', titulo:'Ola de calor (> 30°C)',
        texto:'Despliega el toldo antes de las 10h. Aumenta la frecuencia de riego — el atajo lo calcula automáticamente con VPD alto. <strong>Riesgo de espigado</strong> en lechugas con temperaturas sostenidas > 28°C.',
        alerta:{ tipo:'warn', txt:'⚠️ Si las lechugas se ponen lacias a mediodía y no se recuperan al atardecer, hay estrés hídrico real. Añadir ciclo extra de riego.' } },
      { icono:'🥶', titulo:'Noches frías (< 5°C)',
        texto:'El calentador del depósito es esencial. Por debajo de 14°C en el agua el crecimiento casi se detiene. <strong>Objetivo siempre 20°C</strong> en el agua del depósito.',
        alerta:{ tipo:'info', txt:'ℹ️ En Castelló las heladas son raras pero en enero-febrero pueden darse temperaturas de 2-4°C por las noches.' } },
      { icono:'💨', titulo:'Viento fuerte (> 30 km/h)',
        texto:'El viento aumenta la transpiración y el estrés hídrico. El sistema calcula esto automáticamente aumentando el riego. <strong>Protege las plántulas</strong> del nivel superior si el viento es muy fuerte.',
        alerta:{ tipo:'ok', txt:'✅ El viento moderado (10-25 km/h) es beneficioso — aumenta la transpiración y reduce el riesgo de tipburn por mejor circulación de calcio.' } },
      { icono:'🌧️', titulo:'Días de lluvia',
        texto:'La lluvia suele mojar el follaje pero <strong>no sustituye</strong> la solución del depósito ni el riego del circuito. Sigue haciendo falta tu programa. Con alta humedad ambiental la app puede <strong>reducir ciclos</strong> automáticamente.',
        alerta:{ tipo:'info', txt:'ℹ️ Con probabilidad de lluvia > 50% el VPD baja y el atajo reduce el riego automáticamente. No es necesario ajuste manual.' } },
    ]
  },
  problemas: {
    nombre: '🔍 Problemas', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',
    consejos: [
      { icono:'🟡', titulo:'Hojas amarillas',
        texto:'Amarillo uniforme en hojas viejas: deficiencia de nitrógeno — subir EC ligeramente. Amarillo entre nervios en hojas jóvenes: deficiencia de hierro o manganeso — bajar pH a 5.8-6.0. Amarillo con manchas: puede ser enfermedad fúngica.',
        alerta:{ tipo:'warn', txt:'⚠️ El pH fuera de 5.5-6.5 bloquea la absorción de micronutrientes aunque estén presentes en la solución.' } },
      { icono:'🟤', titulo:'Puntas marrones (tipburn)',
        texto:'Deficiencia de calcio en las hojas jóvenes por baja transpiración. <strong>Causas:</strong> humedad muy alta, poco viento, EC muy alta o temperatura agua baja. Aplicar spray foliar de calcio 2 veces por semana.',
        alerta:{ tipo:'ok', txt:'✅ El tipburn es estético — no afecta al sabor ni a la salud de la planta. Pero indica que hay que mejorar la circulación de aire.' } },
      { icono:'🐛', titulo:'Plagas comunes',
        texto:'<strong>Pulgones:</strong> chorro de agua a presión + jabón potásico diluido. <strong>Mosca blanca:</strong> trampas amarillas adhesivas + neem. <strong>Orugas:</strong> retirar manualmente. La <strong>albahaca</strong> como compañera repele pulgones de forma natural.',
        alerta:{ tipo:'warn', txt:'⚠️ Inspecciona el envés de las hojas semanalmente. Los pulgones se multiplican muy rápido en primavera.' } },
      { icono:'🦠', titulo:'Raíces marrones o con mal olor',
        texto:'Señal de Pythium u otra infección fúngica. <strong>Causas principales:</strong> agua > 24°C, falta de oxígeno, EC muy alta. Solución: vaciar y limpiar depósito con agua oxigenada, bajar temperatura agua, aumentar aireación.',
        alerta:{ tipo:'warn', txt:'⚠️ El difusor de aire encendido 24h es la mejor prevención contra Pythium. El oxígeno disuelto es esencial.' } },
    ]
  },
  variedades: {
    nombre: '🌱 Variedades', color: '#047857', bg: 'rgba(5,150,105,0.08)',
    consejos: [
      { icono:'🥬', titulo:'Mejores lechugas para Castelló',
        texto:'<strong>Primavera/Otoño:</strong> Romana, Trocadero, Batavia — crecimiento rápido y sabor excelente. <strong>Verano:</strong> Lolo Rosso, Hoja Roble Rojo — más resistentes al calor. <strong>Invierno:</strong> Maravilla, Mantecosa — toleran temperaturas bajas.',
        alerta:{ tipo:'ok', txt:'✅ La Romana es la más productiva y versátil para hidropónica — buena elección para empezar.' } },
      { icono:'🌿', titulo:'Mizuna — la más fácil',
        texto:'La Mizuna es la variedad asiática más recomendada para principiantes en hidropónica. Crece en 35-40 días, tolera tanto el calor como el frío moderado, y produce hojas delicadas de sabor suave-picante. <strong>Muy productiva.</strong>',
        alerta:{ tipo:'info', txt:'ℹ️ La Komatsuna es similar pero con hojas más grandes y sabor más suave. Ambas son perfectas mezcladas con lechugas.' } },
      { icono:'🌿', titulo:'Albahaca — compañera perfecta',
        texto:'Aunque necesita más calor (mínimo 18°C), la albahaca bien situada tiene una función extra: <strong>repele pulgones y mosca blanca</strong>. Ponla donde reciba más sol (arriba en torre, borde soleado en NFT/DWC). EC compatible con lechugas.',
        alerta:{ tipo:'warn', txt:'⚠️ La albahaca no tolera temperaturas < 10°C. Solo usarla de mayo a octubre en Castelló.' } },
      { icono:'❌', titulo:'Qué NO mezclar en el mismo depósito',
        texto:'<strong>Tomates, pepinos, pimientos:</strong> necesitan EC 1800-2500 y soporte físico — mal compañeros de lechuga en un solo tanque. <strong>Fresas:</strong> pueden funcionar pero compiten por EC. <strong>Plantas muy altas:</strong> sombrean al resto (en torre, sobre todo niveles bajos).',
        alerta:{ tipo:'warn', txt:'⚠️ Mezclar frutales con lechugas en el mismo depósito provoca deficiencias en unas u otras inevitablemente.' } },
    ]
  },
};

// ── Diagnóstico por síntomas — árbol de decisión ─────────────────────────────
const DIAGNOSTICO = [
  {
    sintoma: '🟡 Hojas amarillas uniformes en hojas viejas',
    causa: 'Deficiencia de Nitrógeno',
    solucion: 'EC demasiado baja. Añadir nutrientes A+B hasta llegar a 1300-1400 µS/cm.',
    urgencia: 'warn'
  },
  {
    sintoma: '🟡 Amarillo entre nervios en hojas jóvenes',
    causa: 'Deficiencia de Hierro o Manganeso',
    solucion: 'pH fuera de rango. Bajar pH a 5.8-6.0 para mejorar absorción de micronutrientes.',
    urgencia: 'warn'
  },
  {
    sintoma: '🟤 Puntas y bordes marrones (tipburn)',
    causa: 'Deficiencia de Calcio en tejidos jóvenes',
    solucion: 'Aumentar ventilación y circulación de aire. Reducir EC ligeramente. El CalMag ayuda.',
    urgencia: 'warn'
  },
  {
    sintoma: '🔴 Raíces marrones y blandas con mal olor',
    causa: 'Pythium — infección fúngica',
    solucion: 'Vaciar depósito urgente. Limpiar con H₂O₂ 3% (15ml/5L). Bajar temperatura agua a <22°C. Añadir difusor 24h.',
    urgencia: 'bad'
  },
  {
    sintoma: '🌿 Tallo central alargado y hojas más pequeñas',
    causa: 'Bolting — espigado por calor',
    solucion: 'Temperatura > 24°C. Cosechar inmediatamente — la lechuga estará amarga. Instalar toldo.',
    urgencia: 'bad'
  },
  {
    sintoma: '💧 Plantas lacias al mediodía pero se recuperan por la tarde',
    causa: 'Estrés hídrico puntual — VPD alto',
    solucion: 'Normal en días muy calurosos. Añadir ciclo extra de riego a las 13h. Verificar que la bomba funciona.',
    urgencia: 'warn'
  },
  {
    sintoma: '💧 Plantas lacias sin recuperarse por la tarde',
    causa: 'Estrés hídrico severo o EC demasiado alta',
    solucion: 'Verificar bomba y caudal. Si EC > 1600 diluir con agua destilada. Temperatura agua < 22°C.',
    urgencia: 'bad'
  },
  {
    sintoma: '🟤 Manchas marrones con halo amarillo en hojas',
    causa: 'Botritis o mildiu — hongos foliares',
    solucion: 'Humedad > 85%. Mejorar ventilación urgente. Retirar hojas afectadas. Reducir ciclos nocturnos.',
    urgencia: 'bad'
  },
  {
    sintoma: '🐛 Puntitos blancos en el envés de las hojas',
    causa: 'Araña roja — ácaro',
    solucion: 'Humedad muy baja + calor. Lavar con jabón potásico diluido. Aumentar humedad ambiental.',
    urgencia: 'warn'
  },
  {
    sintoma: '🐛 Colonias verdes o negras en tallos y hojas',
    causa: 'Pulgones',
    solucion: 'Chorro de agua a presión + jabón potásico. Revisar plantas semanalmente. La albahaca los repele.',
    urgencia: 'warn'
  },
  {
    sintoma: '🫧 Espuma en el depósito',
    causa: 'Materia orgánica en descomposición o primera vez con CalMag',
    solucion: 'Añadir 5-8ml H₂O₂ 3%. Revisar raíces — si están blancas no es Pythium. Cosechar plantas maduras.',
    urgencia: 'warn'
  },
  {
    sintoma: '📈 pH sube constantemente',
    causa: 'Plántulas nuevas absorbiendo nitratos (normal) o actividad bacteriana',
    solucion: 'Primeros 5 días: normal. No intervenir si pH < 7.0. Si hay espuma también → revisar raíces.',
    urgencia: 'info'
  },
];

let diagnosticoFiltro = '';

function renderDiagnostico() {
  const el = document.getElementById('diagnosticoLista');
  if (!el) return;
  const filtro = diagnosticoFiltro.toLowerCase();
  const filtrados = filtro
    ? DIAGNOSTICO.filter(d => d.sintoma.toLowerCase().includes(filtro) || d.causa.toLowerCase().includes(filtro))
    : DIAGNOSTICO;

  const colores = {
    bad:  { bg:'#fff5f5', border:'#fca5a5', color:'#b91c1c' },
    warn: { bg:'#fffbeb', border:'#fcd34d', color:'#92400e' },
    info: { bg:'#eff6ff', border:'#93c5fd', color:'#1d4ed8' },
  };

  el.innerHTML = filtrados.map(d => {
    const c = colores[d.urgencia] || colores.info;
    return `<div class="diag-card" style="--diag-bg:${c.bg};--diag-bd:${c.border};--diag-fg:${c.color}">
      <div class="diag-card-title">${d.sintoma}</div>
      <div class="diag-card-cause">
        📌 ${d.causa}
      </div>
      <div class="diag-card-sol">
        💊 ${d.solucion}
      </div>
    </div>`;
  }).join('');
}

let consejoCatActiva = 'cultivo';

/** µS/cm y pH orientativos (bibliografía / manuales de hidroponía) — ajustar por nutriente, agua y fase */
const REF_CULTIVOS_EC_PH = [
  { cultivo: 'Lechuga / lechuguinas', ec: '900–1600', ph: '5,5–6,5', nota: 'Rango app lechuga ~1300–1400' },
  { cultivo: 'Espinaca / acelga / kale', ec: '1200–2000', ph: '5,5–6,5', nota: 'Mayor necesidad nitro' },
  { cultivo: 'Rúcula / canónigos / mostaza', ec: '1000–1600', ph: '5,5–6,4', nota: 'Similar lechuga' },
  { cultivo: 'Albahaca / menta / perejil', ec: '1000–1800', ph: '5,5–6,5', nota: 'Albahaca algo más EC en pleno sol' },
  { cultivo: 'Cilantro / eneldo', ec: '1200–1800', ph: '5,5–6,2', nota: '' },
  { cultivo: 'Tomate — vegetativo', ec: '1400–2400', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Tomate — floración / fruto', ec: '2200–3200', ph: '5,5–6,2', nota: 'Subir EC de forma gradual' },
  { cultivo: 'Pimiento / berenjena', ec: '1600–2600', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Pepino', ec: '1400–2200', ph: '5,5–6,2', nota: '' },
  { cultivo: 'Judía verde / guisante (brotes)', ec: '1400–2400', ph: '6,0–6,5', nota: '' },
  { cultivo: 'Fresa / fresón', ec: '1200–2000', ph: '5,5–6,2', nota: 'Plántulas más bajo EC' },
  { cultivo: 'Brócoli / coliflor', ec: '1700–2600', ph: '6,0–6,8', nota: '' },
  { cultivo: 'Zanahoria (hojas) / microverduras', ec: '1200–2000', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Melón / sandía', ec: '1600–3000', ph: '5,5–6,2', nota: 'Fructificación arriba del rango' },
  { cultivo: 'Flores de corte (p. ej. rosa)', ec: '1200–2200', ph: '5,5–6,2', nota: '' },
];

function buildHtmlTablaEcPh(opts) {
  const omitId = opts && opts.omitAnchorId;
  const wrapAttr = omitId ? 'class="consejo-ecph-wrap"' : 'class="consejo-ecph-wrap" id="consejos-resumen-ec-ph"';
  const rows = REF_CULTIVOS_EC_PH.map(r => `
    <tr>
      <td class="consejo-ecph-icon-cell" aria-hidden="true">${refEcPhRowEmojiHtml(r)}</td>
      <td>${meteoEscHtml(r.cultivo)}</td>
      <td>${meteoEscHtml(r.ec)}</td>
      <td>${meteoEscHtml(r.ph)}</td>
      <td class="consejo-ecph-nota-cell">${meteoEscHtml(r.nota || '—')}</td>
    </tr>
  `).join('');
  return `
    <div ${wrapAttr}>
      <div class="consejo-titulo consejo-titulo--mb8">Referencia rápida hidroponía</div>
      <div class="consejo-ecph-note">
        Valores medios habituales en bibliografía y tablas de cultivos (EC en <strong>µS/cm</strong> como en esta app; pH de la solución).
        Varía según <strong>marca de abono</strong>, agua base, temperatura y fase (plántula → vegetativo → flor/fruto). Úsalo como guía, no como dogma.
      </div>
      <table class="consejo-ecph-table">
        <thead><tr>
          <th class="consejo-ecph-icon-cell" scope="col"><span class="visually-hidden">Icono tipo</span></th>
          <th>Cultivo</th>
          <th>EC µS/cm</th>
          <th>pH</th>
          <th>Nota</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/** Consejos EC/pH: referencia por fabricante (ml/L → totales al volumen). CalMag en blanda escala desde dosis 18 L de la app. */
const REF_DOSIS_LITROS_TABLA = VOL_OBJETIVO;

/**
 * REF dosis: cada valor es ml/L (o g/L en polvo) de **esa botella/parte**.
 * Líneas A+B habituales en Europa: la ficha da la **misma ml/L para A y para B** (no son “ml/L totales” a repartir 50/50 salvo que el envase lo indique así).
 */
const REF_DOSIS_FABRICANTE = {
  canna_aqua: {
    fuente: 'Canna Aqua Vega: **2 ml/L de botella A y 2 ml/L de botella B** en referencia vegetativo (misma dosis en cada parte; no sumar como una sola cifra para partir). Rango fabricante hasta ~4 ml/L c/u en otros contextos.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'CalMag: de 0 ml hasta la dosis blanda según dureza; medir conductividad del grifo antes de mezclar.',
  },
  canna_substra_soft: {
    fuente: 'Canna Substra Vega Soft Water: tabla suele ir de ~2,5 a 4 ml/L **de A** y la **misma ml/L de B** (ej. 25–40 ml de cada una en 10 L). La app usa **2,5 ml/L** por parte como dosis media veg; subir hasta 4 ml/L c/u en plena vegetación si la EC lo pide.',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'Línea SOFT para agua blanda/ósmosis. Grifo muy duro: valorar la gama Hard del fabricante.',
  },
  advanced_ph_perfect: {
    fuente: 'Advanced Nutrients pH Perfect GMB: vegetativo típico ~4 ml/L Micro, Grow y Bloom cada uno.',
    mlPorLitro: [4, 4, 4],
    calmagGrifoNota: 'Sin CalMag extra (Ca/Mg en Micro). Ajustar solo si el fabricante lo indica para tu agua.',
  },
  ghe_flora: {
    fuente: 'GHE Flora Series: proporción lechuga vegetativo de esta app — Micro 2,6 + Gro 1,3 + Bloom 1,3 ml/L.',
    mlPorLitro: [2.6, 1.3, 1.3],
    calmagGrifoNota: 'CalMag: reducir u omitir si el grifo aporta minerales; medir tras mezclar.',
  },
  plagron_hydro: {
    fuente: 'Plagron Hydro A+B: **2,5 ml/L de Hydro A y 2,5 ml/L de Hydro B** (partes iguales; dilución 1:400). No es “2,5 ml/L total” repartidos: son **2,5 + 2,5** por litro de agua de riego.',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'CalMag: menos o ninguno si el agua es dura; contrastar con EC base.',
  },
  hesi_tnt: {
    fuente: 'Hesi TNT Complex: plena vegetación orientativa ~5 ml/L (plántulas menos).',
    mlPorLitro: [5],
    calmagGrifoNota: 'CalMag: suele reducirse con grifo duro; parte siempre de la EC del agua base.',
  },
  biobizz: {
    fuente: 'BioBizz Fish·Mix + Alg·A·Mic: **dos botellas distintas** — no es A=B. Referencia veg suave **2 ml/L Fish·Mix + 1 ml/L Alg·A·Mic** (subir Fish hasta ~4 ml/L y Alg hasta ~2 ml/L según fase y envase).',
    mlPorLitro: [2, 1],
    calmagGrifoNota: 'Orgánico: EC baja; CalMag solo si hay carencias y según etiqueta.',
  },
  campeador: {
    fuente: 'Campeador Solución Hoja (ficha tienda): ~1 ml/L de cada parte A y B (madres diluidas).',
    mlPorLitro: [1, 1],
    calmagGrifoNota: 'CalMag: como con cualquier base — menos si el grifo aporta dureza.',
  },
  canna_hydro_vega: {
    fuente: 'Canna Hydro Vega (run-to-waste): orientación 4–5 ml/L por parte; tabla app 4 ml/L A y B.',
    mlPorLitro: [4, 4],
    calmagGrifoNota: 'Grifo: a menos CalMag; subir A+B según EC base.',
  },
  atami_bcuzz_hydro: {
    fuente: "Atami B'cuzz Hydro A+B: 1–3 ml/L por parte; referencia media 2 ml/L.",
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'CalMag según conductividad del grifo.',
  },
  hypro_hydro_ab: {
    fuente: 'Hy-Pro Hydro A+B: referencia vegetativo ~2,5 ml/L por parte (ajustar por EC).',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'Reducir suplemento Ca/Mg con agua dura.',
  },
  vitalink_hydro_max: {
    fuente: 'VitaLink Hydro Max Grow: vegetativo ~3 ml/L A y B (tablas tienda).',
    mlPorLitro: [3, 3],
    calmagGrifoNota: 'CalMag opcional según dureza.',
  },
  mills_basis_ab: {
    fuente: 'Mills Basis A/B: **misma cantidad en A y en B**. Carta Mills — las 2 primeras semanas **1 ml/L de A y 1 ml/L de B**; después en veg típico **2 ml/L de cada parte**. La app usa **2 ml/L** como referencia de vegetativo ya iniciado; en plantas muy jóvenes bajar a 1 ml/L c/u.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Seguir carta fabricante en floración (más ml/L).',
  },
  green_planet_hydro_fuel: {
    fuente: 'Green Planet Hydro Fuel Grow A+B: fabricante indica **1–3 ml/L por parte** (añadir A, remover, luego B; misma banda en cada botella). Referencia veg media **2 ml/L A y 2 ml/L B**.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Medir tras mezcla; grifo duro = menos CalMag.',
  },
  ionic_grow_hydro: {
    fuente: 'Ionic Grow (una botella): orientación ~4 ml/L en blanda.',
    mlPorLitro: [4],
    calmagGrifoNota: 'Una parte; ajustar por EC del grifo.',
  },
  biobizz_bio_grow: {
    fuente: 'BioBizz Bio-Grow orgánico: ~3 ml/L referencia media.',
    mlPorLitro: [3],
    calmagGrifoNota: 'Orgánico — EC más baja; CalMag prudente.',
  },
  hesi_hidro: {
    fuente: 'Hesi Hidro Crecimiento: orientación ~4,5 ml/L (línea hidro, no TNT).',
    mlPorLitro: [4.5],
    calmagGrifoNota: 'CalMag proporcional a dureza.',
  },
  hortalan: {
    fuente: 'Hortalan: orientativa ~4 ml/L; confirmar envase.',
    mlPorLitro: [4],
    calmagGrifoNota: 'Medir EC base del grifo.',
  },
  fox_farm_grow_big: {
    fuente: 'Fox Farm Grow Big: orientación ~3 ml/L (trío / solo Grow Big).',
    mlPorLitro: [3],
    calmagGrifoNota: 'Muy concentrado; subir con cuidado.',
  },
  campeador_hidro: {
    fuente: 'Campeador Hidro A+B (web fabricante): 1–3 ml/L por parte; ejemplo 18 L con EC 1100–1200 µS ≈ 18 ml A + 18 ml B (~1 ml/L). La app usa 1 ml/L como base checklist (subir hasta 3 ml/L si EC queda baja).',
    mlPorLitro: [1, 1],
    calmagGrifoNota: 'Distinto de línea Hoja; grifo: misma ml/L tras medir EC base.',
  },
  masterblend_41838: {
    fuente: 'Masterblend 4-18-38 + receta típica Ca(NO₃)₂ + MgSO₄: gramos/L orient. 1,9 g/L total sales disueltas (no ml).',
    mlPorLitro: [1.9],
    calmagGrifoNota: 'Polvo: no usar tabla ml; grifo = ajustar sales y medir.',
  },
  otro: {
    fuente: 'Referencia genérica A+B 2 ml/L por parte hasta consultar el envase.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Seguir siempre la etiqueta y la EC del agua base.',
  },
};

function getRefDosisFabricante(nutId) {
  return REF_DOSIS_FABRICANTE[nutId] || REF_DOSIS_FABRICANTE.otro;
}

function dosisSufijoNutriente(nut) {
  return nut && nut.tipoDosis === 'polvo' ? ' g' : ' ml';
}

/** ml (o g si tipoDosis polvo) de la parte `partIndex` según tabla fabricante y volumen. */
function mlNutrientePorParte(nutId, partIndex, volLitros) {
  const ref = getRefDosisFabricante(nutId);
  const arr = ref.mlPorLitro;
  const idx = Math.min(Math.max(0, partIndex), arr.length - 1);
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  return Math.max(0.1, Math.round(arr[idx] * v * 10) / 10);
}

/**
 * EC (µS/cm) que ya lleva el agua o la solución **antes** del abono principal (CalMag en blanda, o EC del grifo).
 */
function getEcBaseAguaPreAbonoMicroS(volLitros, nut, modoSoft, usarCalMag) {
  if (modoSoft && nut.calmagNecesario && usarCalMag) {
    const mlCM = mlCalMagParaAguaBlanda(volLitros);
    return mlCM > 0 ? estimarEcCalMagMicroS(mlCM, volLitros) : 0;
  }
  if (!modoSoft) {
    const g = Number(state.configAguaEC);
    if (Number.isFinite(g) && g >= 0) return Math.round(g);
    return Math.round(CONFIG_AGUA.grifo?.ecBase || 0);
  }
  return 0;
}

/**
 * ml (o g) por parte: **misma regla** en checklist y Consejos (A+B simétricos y 1 parte = dinámico por EC meta;
 * resto = tabla fabricante × volumen). `ctx`: { modoSoft, usarCalMag }.
 */
function mlAbonoParteDinamica(nut, partIndex, volLitros, ecMetaMicroS, ctx) {
  if (!nut) return 0.1;
  const modoSoft = ctx.modoSoft !== false;
  const usarCalMag = !!ctx.usarCalMag;
  const mlTab = mlNutrientePorParte(nut.id, partIndex, volLitros);
  const ref = getRefDosisFabricante(nut.id);
  const arr = ref.mlPorLitro || [];

  if (nut.tipoDosis === 'polvo' || nut.partes === 3) return mlTab;

  const ecBase = getEcBaseAguaPreAbonoMicroS(volLitros, nut, modoSoft, usarCalMag);
  let pendiente = ecMetaMicroS - ecBase;
  if (!Number.isFinite(pendiente)) pendiente = ecMetaMicroS;
  pendiente = Math.max(50, pendiente);

  if (nut.partes === 2 && arr.length >= 2 && Math.abs(arr[0] - arr[1]) < 1e-6) {
    const slope = ecSubePorMlParABEnVolumen(nut, volLitros);
    if (slope > 0) {
      let mlEc = pendiente / slope;
      mlEc = Math.round(mlEc * 10) / 10;
      const tope = Math.max(mlTab * 1.55, mlTab + 5);
      return Math.min(tope, Math.max(0.5, mlEc));
    }
  }

  if (nut.partes === 1 && arr.length >= 1) {
    const slope = ecSubePorMlParABEnVolumen(nut, volLitros);
    if (slope > 0) {
      let mlEc = pendiente / slope;
      mlEc = Math.round(mlEc * 10) / 10;
      const tope = Math.max(mlTab * 1.55, mlTab + 5);
      return Math.min(tope, Math.max(0.5, mlEc));
    }
  }

  return mlTab;
}

function calcularMlParteNutriente(partIndex) {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};
  const volObj = getVolumenMezclaLitros(cfg);
  const aguaGrifo = (cfg.agua || state.configAgua || 'destilada') === 'grifo';
  return mlAbonoParteDinamica(nut, partIndex, volObj, getRecargaEcMetaMicroS(), {
    modoSoft: !aguaGrifo,
    usarCalMag: !!(nut.calmagNecesario && usarCalMagEnRecarga()),
  });
}

/** Compatibilidad: primera parte; el checklist usa calcularMlParteNutriente por índice. */
function calcularMlAB() {
  return calcularMlParteNutriente(0);
}

/** EC (µS/cm) aportada por CalMag a volumen V, calibrado como CALMAG_POR_ML en 18 L. */
function estimarEcCalMagMicroS(mlCM, volLitros) {
  if (!mlCM || mlCM <= 0) return 0;
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  return Math.round(CALMAG_POR_ML * mlCM * (VOL_OBJETIVO / v));
}

/**
 * Pendiente EC del abono tras CalMag y pendiente «meta de recarga», para pendientes de corrección.
 * Para 2 partes / 1 parte: µS/cm por ml de esa parte (asumiendo proporción fabricante).
 * Para 3 partes: µS/cm por «1 ml en cada botella» a la vez (aprox.).
 */
function ecSubePorMlCorreccion(nut, volLitros) {
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  const ref = getRefDosisFabricante(nut.id);
  const ecMeta = getRecargaEcMetaMicroS();
  const mlCM = nut.calmagNecesario && usarCalMagEnRecarga() ? calcularMlCalMag() : 0;
  const ecCal = estimarEcCalMagMicroS(mlCM, v);
  const ecN = Math.max(60, ecMeta - ecCal);
  const p = nut.partes || 2;
  const sumMl = ref.mlPorLitro.reduce((s, x) => s + x * v, 0);
  if (sumMl <= 0 || ecN <= 0) return nut.ecPorMl || 25;
  if (p === 1) return ecN / (ref.mlPorLitro[0] * v);
  if (p === 2) return ecN / (ref.mlPorLitro[0] * v);
  return (ecN * 3) / sumMl;
}

function mlCorreccionEcBaja(nut, volLitros, deficitMicroS) {
  const slope = ecSubePorMlCorreccion(nut, volLitros);
  if (!slope || slope <= 0) return 1;
  return Math.max(1, Math.ceil(deficitMicroS / slope));
}

function fmtMlConsejo(v) {
  if (v == null || isNaN(v)) return '0';
  const r = Math.round(v * 10) / 10;
  return Math.abs(r - Math.round(r)) < 1e-6 ? String(Math.round(r)) : r.toFixed(1);
}

/**
 * @param {'soft'|'grifo'} modo — soft = destilada u ósmosis (EC ~0). Mismas reglas dinámicas que el checklist (volumen, EC meta, CalMag / base grifo).
 */
function buildLineasCeldaDosis(ref, nut, volL, modo) {
  const lines = [];
  const orden = nut.orden || [];
  const nPartes = ref.mlPorLitro.length;
  const ecMeta = getRecargaEcMetaMicroS();
  const usarCMFila = modo === 'soft' && usarCalMagConsejosFilaBlanda(nut);

  if (modo === 'soft') {
    if (nut.calmagNecesario) {
      if (usarCMFila) {
        const cmSoft = mlCalMagParaAguaBlanda(volL);
        lines.push(`<span class="consejo-dosis18-k">CalMag</span> ${fmtMlConsejo(cmSoft)} ml → ~${EC_CALMAG_BASE} µS/cm`);
      } else {
        lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-muted82">omitido (pref. checklist / agua blanda sin CalMag)</span>`);
      }
    } else {
      lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-muted72">no necesario</span>`);
    }
  } else {
    lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-nota-grifo">${meteoEscHtml(ref.calmagGrifoNota)}</span>`);
  }

  const suf = dosisSufijoNutriente(nut);
  const usarCM = modo === 'soft' && usarCMFila;
  for (let i = 0; i < nPartes; i++) {
    const label = orden[i] || ('Parte ' + String.fromCharCode(65 + i));
    const mlVal = mlAbonoParteDinamica(nut, i, volL, ecMeta, {
      modoSoft: modo === 'soft',
      usarCalMag: usarCM,
    });
    lines.push(`<span class="consejo-dosis18-k">${meteoEscHtml(label)}</span> ${fmtMlConsejo(mlVal)}${suf}`);
  }

  return lines.join('<br>');
}

function buildHtmlTablaPreparacionFabricante18L() {
  const cfg = state.configTorre || {};
  const Vraw = getVolumenMezclaLitros(cfg);
  const V = Math.round(Vraw * 10) / 10;
  const vCap = getVolumenDepositoMaxLitros(cfg);
  const capNota = V < vCap - 0.05
    ? ' Capacidad máx. del depósito: <strong>' + vCap + ' L</strong> (esta tabla usa <strong>' + V + ' L</strong> de mezcla).'
    : '';
  const ecUsada = getRecargaEcMetaMicroS();
  const aguaK = cfg.agua || state.configAgua || 'destilada';
  const aguaNom = aguaK === 'grifo' ? 'Grifo' : aguaK === 'osmosis' ? 'Ósmosis' : 'Destilada';
  const ecManual = cfg.checklistEcObjetivoUs;
  const ecOrigen = (Number.isFinite(ecManual) && ecManual >= 200 && ecManual <= 6000)
    ? 'objetivo manual (checklist paso 6)'
    : 'óptimo automático (cultivos / nutriente activo)';
  const prefCM = usarPreferenciaCalMagRecargaGlobal();
  const leyendaBlanda = aguaK === 'grifo'
    ? `Columnas destilada/ósmosis = guía si mezclas con <strong>agua blanca</strong> (con CalMag en filas que lo requieren). Tu tipo de agua en Mediciones: <strong>${aguaNom}</strong>.`
    : `Tipo de agua (torre/Mediciones): <strong>${aguaNom}</strong>. CalMag en esas columnas: <strong>${prefCM ? 'sí' : 'no'}</strong> (pref. checklist).`;

  const nutActivo = getNutrienteTorre();
  const ref = getRefDosisFabricante(nutActivo.id);
  const cSoft = buildLineasCeldaDosis(ref, nutActivo, V, 'soft');
  const cGrifo = buildLineasCeldaDosis(ref, nutActivo, V, 'grifo');
  const rows = `
      <tr>
        <td>${meteoEscHtml(nutActivo.bandera || '')} ${meteoEscHtml(nutActivo.nombre)}
          <div class="consejo-dosis18-fuente">${meteoEscHtml(ref.fuente)}</div>
        </td>
        <td class="consejo-dosis18-cell">${cSoft}</td>
        <td class="consejo-dosis18-cell">${cSoft}</td>
        <td class="consejo-dosis18-cell">${cGrifo}</td>
      </tr>`;

  return `
    <div class="consejo-dosis18-wrap" id="consejos-tabla-dosis-18l">
      <div class="consejo-titulo consejo-titulo--mb8">Mezcla dinámica · <strong>${meteoEscHtml(nutActivo.nombre)}</strong> · <strong>${V} L</strong> · EC <strong>${ecUsada} µS/cm</strong> <span class="consejo-ec-meta">(${ecOrigen})</span></div>
      <div class="consejo-ecph-note consejo-ecph-note--mb">
        Solo el <strong>nutriente activo</strong> de la instalación (cámbialo en la pestaña Sistema o en la configuración). Misma regla que el checklist: litros de mezcla (o capacidad máx. si no indicas margen), EC objetivo y <code>ecPorMl</code>.${capNota} ${leyendaBlanda}
        Columna <strong>grifo</strong>: pendiente hacia la misma EC restando la <strong>EC base</strong> del agua (Mediciones). La ficha bajo el nombre resume la orientación del fabricante.
        <strong>A+B simétricos</strong> y <strong>1 parte</strong>: cálculo EC. <strong>3 botellas</strong> y <strong>A+B distintas</strong>: tabla × volumen. Comprueba con el <strong>medidor</strong>.
      </div>
      <table class="consejo-dosis18-table">
        <thead>
          <tr>
            <th>Nutriente</th>
            <th>Destilada<br>${V} L</th>
            <th>Ósmosis<br>${V} L</th>
            <th>Grifo<br>${V} L</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="consejo-ecph-note consejo-ecph-note--mt0">
        Líneas <strong>3 partes</strong>: totales = tabla × volumen (orden <strong>${meteoEscHtml('Micro → Grow → Bloom')}</strong> o equivalente). <strong>1 parte</strong> líquido: dinámico como en checklist si aplica modelo EC; polvo = gramos tabla.
      </div>
    </div>
  `;
}

function buildHtmlTablaConsejosPersonal() {
  const t = state.consejosTablaPersonal;
  if (!t || t.volL == null || !t.nutrienteId) {
    return `
      <div class="consejo-dosis18-wrap consejo-dosis18-miTorre consejo-dosis18-wrap--mt">
        <div class="consejo-titulo consejo-titulo--mb6">Tu tabla (volumen a medida)</div>
        <div class="consejo-ecph-note">
          Al <strong>completar el checklist de recarga</strong> (no es la primera configuración), puedes guardar aquí el nutriente y los litros del depósito.
          Verás la <strong>misma tabla</strong> que arriba (solo tu marca) pero <strong>escalada</strong> a ese volumen.
        </div>
      </div>`;
  }
  const nut = NUTRIENTES_DB.find(n => n.id === t.nutrienteId);
  if (!nut) return '';
  const ref = getRefDosisFabricante(t.nutrienteId);
  const vol = Number(t.volL);
  const cSoft = buildLineasCeldaDosis(ref, nut, vol, 'soft');
  const cGrifo = buildLineasCeldaDosis(ref, nut, vol, 'grifo');
  let fecha = '';
  try {
    fecha = t.updated ? new Date(t.updated).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '';
  } catch (e) { fecha = ''; }

  return `
    <div class="consejo-dosis18-wrap consejo-dosis18-miTorre consejo-dosis18-wrap--mt" id="consejos-tabla-personal">
      <div class="consejo-titulo consejo-titulo--mb8">Mi torre · ${meteoEscHtml(nut.nombre)} · ${fmtMlConsejo(vol)} L</div>
      <div class="consejo-ecph-note consejo-ecph-note--mb">
        Misma lógica dinámica que la tabla general (EC objetivo recarga, CalMag/blanca, grifo con EC base). Actualizado: ${meteoEscHtml(fecha || '—')}
      </div>
      <table class="consejo-dosis18-table">
        <thead><tr><th>Agua base</th><th>Preparación (ml)</th></tr></thead>
        <tbody>
          <tr><td>Destilada (EC ≈ 0)</td><td class="consejo-dosis18-cell">${cSoft}</td></tr>
          <tr><td>Ósmosis (EC ≈ 0)</td><td class="consejo-dosis18-cell">${cSoft}</td></tr>
          <tr><td>Grifo</td><td class="consejo-dosis18-cell">${cGrifo}</td></tr>
        </tbody>
      </table>
      <button type="button" class="btn btn-ghost consejo-quitar-tabla-btn" onclick="borrarConsejosTablaPersonal()">Quitar tabla guardada</button>
    </div>`;
}

function ensureCtpNutrienteOptions() {
  const sel = document.getElementById('ctpNutrienteId');
  if (!sel || sel.dataset.filled === '1') return;
  sel.dataset.filled = '1';
  sel.innerHTML = NUTRIENTES_DB.map(n =>
    `<option value="${n.id}">${meteoEscHtml(n.nombre)}</option>`
  ).join('');
}

function abrirModalConsejosTablaPersonal(volSugerido) {
  const m = document.getElementById('modalConsejosTablaPersonal');
  if (!m) return;
  ensureCtpNutrienteOptions();
  const cfg = state.configTorre || {};
  const vIn = document.getElementById('ctpVolLitros');
  const sel = document.getElementById('ctpNutrienteId');
  const vs = parseFloat(volSugerido);
  if (vIn) {
    const defL = getVolumenMezclaLitros(cfg);
    vIn.value = (!isNaN(vs) && vs > 0) ? String(vs) : String(defL);
  }
  if (sel) {
    try {
      const nut = getNutrienteTorre();
      sel.value = nut.id;
    } catch (e) {
      sel.selectedIndex = 0;
    }
  }
  m.classList.add('open');
  a11yDialogOpened(m);
}

function cerrarModalConsejosTablaPersonal(ev) {
  const m = document.getElementById('modalConsejosTablaPersonal');
  if (!m || !m.classList.contains('open')) return;
  if (ev && ev.currentTarget === m && ev.target !== m) return;
  m.classList.remove('open');
  a11yDialogClosed(m);
}

function guardarConsejosTablaPersonal() {
  const vIn = document.getElementById('ctpVolLitros');
  const sel = document.getElementById('ctpNutrienteId');
  const vol = parseFloat(vIn && vIn.value);
  if (!vol || isNaN(vol) || vol < 1 || vol > 500) {
    showToast('Indica un volumen válido (1–500 L)', true);
    return;
  }
  const nid = sel && sel.value;
  if (!nid) {
    showToast('Elige un nutriente', true);
    return;
  }
  state.consejosTablaPersonal = {
    volL: Math.round(vol * 10) / 10,
    nutrienteId: nid,
    updated: new Date().toISOString(),
  };
  saveState();
  cerrarModalConsejosTablaPersonal();
  showToast('📋 Tabla guardada en Consejos (EC / pH)');
  if (typeof consejoCatActiva !== 'undefined' && consejoCatActiva === 'ecph') renderConsejosLista();
}

function borrarConsejosTablaPersonal() {
  delete state.consejosTablaPersonal;
  saveState();
  showToast('Tabla personal eliminada');
  if (typeof consejoCatActiva !== 'undefined' && consejoCatActiva === 'ecph') renderConsejosLista();
}

function mostrarTabConsejos(tab) {
  const panelC = document.getElementById('panelConsejos');
  const panelD = document.getElementById('panelDiagnostico');
  const btnC   = document.getElementById('btnTabConsejos');
  const btnD   = document.getElementById('btnTabDiag');
  if (tab === 'consejos') {
    panelC.style.display = 'block';
    panelD.style.display = 'none';
    btnC.style.background = '#f0fdf4'; btnC.style.borderColor = '#16a34a'; btnC.style.color = '#15803d';
    btnD.style.background = '#fff';    btnD.style.borderColor = '#e5e7eb'; btnD.style.color = '#374151';
  } else {
    panelC.style.display = 'none';
    panelD.style.display = 'block';
    btnD.style.background = '#f0fdf4'; btnD.style.borderColor = '#16a34a'; btnD.style.color = '#15803d';
    btnC.style.background = '#fff';    btnC.style.borderColor = '#e5e7eb'; btnC.style.color = '#374151';
    renderDiagnostico();
  }
}

function a11yConsejosTablistKeydown(ev) {
  const tabs = [...document.querySelectorAll('#consejosCats [role="tab"]')];
  if (!tabs.length) return;
  const i = tabs.indexOf(document.activeElement);
  if (i < 0 && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'Home' || ev.key === 'End')) {
    tabs[0].focus();
    ev.preventDefault();
    return;
  }
  if (i < 0) return;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
    ev.preventDefault();
    tabs[(i + 1) % tabs.length].focus();
  } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    tabs[(i - 1 + tabs.length) % tabs.length].focus();
  } else if (ev.key === 'Home') {
    ev.preventDefault();
    tabs[0].focus();
  } else if (ev.key === 'End') {
    ev.preventDefault();
    tabs[tabs.length - 1].focus();
  }
}

/** Refresca la pestaña Consejos si está visible (EC, volumen, agua, checklist). */
function refreshConsejosSiVisible() {
  const p = document.getElementById('tab-consejos');
  if (p && p.classList.contains('active')) renderConsejos();
}

function renderConsejos() {
  const cats = document.getElementById('consejosCats');
  const lista = document.getElementById('consejosLista');
  cats.setAttribute('role', 'tablist');
  cats.setAttribute('aria-label', 'Categorías de consejos');

  if (!cats.dataset.a11yKeyNavBound) {
    cats.dataset.a11yKeyNavBound = '1';
    cats.addEventListener('keydown', a11yConsejosTablistKeydown);
  }

  cats.innerHTML = Object.entries(CONSEJOS_DATA).map(([key, cat]) => `
    <button type="button" class="consejo-cat-btn ${key === consejoCatActiva ? 'active' : ''}"
      role="tab"
      aria-selected="${key === consejoCatActiva ? 'true' : 'false'}"
      id="catBtn-${key}"
      onclick="selConsejoCat('${key}')"
      aria-label="Consejos: ${cat.nombre}"
      ${key === consejoCatActiva ? `style="--consejo-tab-accent:${cat.color}"` : ''}>
      ${cat.nombre}
    </button>
  `).join('');

  lista.setAttribute('role', 'tabpanel');
  lista.setAttribute('aria-labelledby', 'catBtn-' + consejoCatActiva);

  renderConsejosLista();
}

function selConsejoCat(key) {
  consejoCatActiva = key;
  renderConsejos();
  document.getElementById('consejosLista').scrollTop = 0;
}

function htmlConsejoCard(cat, c) {
  return `
    <div class="consejo-card">
      <div class="consejo-header">
        <div class="consejo-icon" style="--consejo-icon-bg:${cat.bg}">
          ${c.icono}
        </div>
        <div>
          <div class="consejo-titulo">${c.titulo}</div>
        </div>
      </div>
      <div class="consejo-texto">${c.texto}</div>
      ${c.alerta ? `
        <div class="consejo-alerta ${c.alerta.tipo}">
          <span>${c.alerta.txt}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/** Protocolo y reposición en Consejos → Agua y EC: según nutriente de la instalación activa. */
function buildConsejosAguaNutrienteDinamico() {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};
  const volMax = getVolumenDepositoMaxLitros(cfg);
  const volObj = getVolumenMezclaLitros(cfg);
  const ecMin = nut.ecObjetivo ? nut.ecObjetivo[0] : 900;
  const pasos = (nut.protocolo || []).map(p =>
    '<li class="consejo-proto-li">' + meteoEscHtml(p) + '</li>'
  ).join('');
  const listaProto = pasos
    ? '<ol class="consejo-proto-ol">' + pasos + '</ol>'
    : '<p class="consejo-proto-fallback">Consulta el envase y el checklist de recarga de la app.</p>';

  let ordenWarn = '';
  if (nut.partes === 2 && nut.orden && nut.orden.length >= 2) {
    ordenWarn = '<strong>No mezclar concentrados</strong>: añade <strong>' + meteoEscHtml(nut.orden[0]) +
      '</strong> y <strong>' + meteoEscHtml(nut.orden[1]) + '</strong> en el orden del fabricante, bien diluidos.';
  } else if (nut.partes === 3 && nut.orden && nut.orden.length >= 3) {
    ordenWarn = 'Respeta el orden del fabricante: ' + nut.orden.map(o => '<strong>' + meteoEscHtml(o) + '</strong>').join(' → ') +
      '. No mezcles los concentrados entre sí.';
  } else if (nut.partes === 1 && nut.orden && nut.orden[0]) {
    ordenWarn = 'Una sola base: <strong>' + meteoEscHtml(nut.orden[0]) + '</strong>.';
  }

  const calmagOk = nut.calmagNecesario
    ? 'Con agua blanda / destilada suele necesitarse <strong>CalMag</strong> (o el suplemento Ca/Mg que indique la marca).'
    : 'Esta línea suele llevar Ca/Mg integrado: <strong>no añadas CalMag</strong> salvo que el fabricante lo indique.';

  const phOk = nut.pHBuffer
    ? 'Esta marca tiene <strong>buffers de pH</strong>: al mezclar, sigue las mismas precauciones que en el checklist (no exceder corrector al inicio).'
    : 'Ajusta el pH al rango <strong>' + nut.pHRango[0] + '–' + nut.pHRango[1] + '</strong> indicado para ' + meteoEscHtml(nut.nombre) + '.';

  const mlCM = calcularMlCalMag();
  const ref = getRefDosisFabricante(nut.id);
  const cmPL = volObj > 0 ? mlCM / volObj : 0;
  const rnd = x => Math.round(x * 100) / 100;

  const partesRepos = [];
  if (usarCalMagEnRecarga() && cmPL > 0) {
    partesRepos.push(rnd(cmPL) + ' ml CalMag');
  }
  if (nut.partes === 1 && nut.orden && nut.orden[0]) {
    partesRepos.push(rnd(ref.mlPorLitro[0]) + ' ml ' + nut.orden[0]);
  } else if (nut.partes === 2 && nut.orden && nut.orden.length >= 2) {
    partesRepos.push(rnd(ref.mlPorLitro[0]) + ' ml ' + nut.orden[0]);
    partesRepos.push(rnd(ref.mlPorLitro[1]) + ' ml ' + nut.orden[1]);
  } else if (nut.partes >= 3 && nut.orden) {
    nut.orden.slice(0, nut.partes).forEach((o, i) => {
      partesRepos.push(rnd(ref.mlPorLitro[i] || 0) + ' ml ' + o);
    });
  }

  const bloqueDosis = partesRepos.length
    ? 'Si la <strong>EC ha bajado</strong> respecto al objetivo del cultivo, como guía <strong>por cada litro</strong> repuesto: ' +
      partesRepos.map(p => meteoEscHtml(p)).join(' + ') + '. Remueve, espera unos minutos con difusor o bomba y mide de nuevo EC y pH.'
    : 'Si la EC ha bajado, usa la misma proporción que en tu última recarga completa o el checklist de la app.';

  const volRefHtml = volObj < volMax - 0.05
    ? 'mezcla de <strong>' + volObj + ' L</strong> (depósito hasta <strong>' + volMax + ' L</strong>)'
    : '<strong>' + volObj + ' L</strong>';
  const textoRepos =
    'Volumen de referencia en la app: ' + volRefHtml + '. Repone con la <strong>misma calidad de agua</strong> que usas en recargas (según tu configuración). ' +
    '<strong>Si la EC sigue en rango</strong> para tus plantas, añade solo agua. ' + bloqueDosis;

  return htmlConsejoCard({
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)'
  }, {
    icono:'🧪',
    titulo:'Protocolo de nutrientes — ' + meteoEscHtml(nut.nombre),
    texto: 'Pasos orientativos del fabricante para <strong>' + meteoEscHtml(nut.nombre) + '</strong> (instalación activa). Coinciden con el orden del checklist de recarga.' +
      listaProto + (ordenWarn ? '<p class="consejo-orden-warn">' + ordenWarn + '</p>' : ''),
    alerta:{ tipo:'ok', txt:'✅ ' + calmagOk + ' ' + phOk }
  }) + htmlConsejoCard({
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)'
  }, {
    icono:'💧',
    titulo:'Reposición de agua — ' + meteoEscHtml(nut.nombre),
    texto: textoRepos,
    alerta:{ tipo:'info', txt:'ℹ️ EC orientativa para añadir nutrientes: por debajo de ~' + ecMin +
      ' µS/cm. En verano el nivel puede bajar más rápido; revisa cada 2–3 días.' }
  });
}

function buildConsejosNftHidraulica() {
  const cat = CONSEJOS_DATA.nft;
  const cfg = state.configTorre || {};
  const resumenTxt = cfg.tipoInstalacion === 'nft' ? nftTextoResumenInstalacion(cfg) : '';
  const b = cfg.tipoInstalacion === 'nft' ? getNftBombaDesdeConfig(cfg) : null;
  let dyn;
  if (b) {
    const vDepCfg = parseFloat(String(cfg.volDeposito ?? '').replace(',', '.'));
    const vDepAct = Number.isFinite(vDepCfg) && vDepCfg > 0 ? Math.round(vDepCfg) : null;
    dyn = htmlInnerConsejoCard(cat, {
      icono: '⚡',
      titulo: 'Tu instalación NFT — cumplimiento orientativo',
      html:
        (resumenTxt
          ? '<p class="consejo-p consejo-p--lead">' + escHtmlUi(resumenTxt) + '</p>'
          : '') +
        '<p class="consejo-p consejo-p--mb10">Lo importante aquí es si el <strong>depósito</strong> y la <strong>bomba</strong> encajan con un criterio práctico (24 h, película fina, pérdidas típicas). Los números detallados van en el desplegable. Contrasta siempre con la <strong>curva Q–H</strong> del fabricante.</p>' +
        nftDepositoVeredictoBloqueHtml(b, vDepAct) +
        nftWrapDetalleTecnicoSummary(nftBombaDetalleTecnicoHtml(b), 'Bomba, caudal y geometría (detalle)'),
    });
  } else {
    dyn = htmlInnerConsejoCard(cat, {
      icono: 'ℹ️',
      titulo: 'Configuración NFT',
      html:
        '<p class="consejo-p consejo-p--flush">Elige en <strong>Sistema</strong> instalación <strong>NFT</strong> y completa canal, lámina y longitud en el checklist (N·ref) o en el asistente para ver aquí el criterio orientativo de tu caso.</p>',
    });
  }
  const formula = htmlConsejoCard(cat, {
    icono: '📐',
    titulo: 'Cómo se estima el caudal (orientativo)',
    texto:
      'Se aproxima el <strong>área</strong> de la lámina en el fondo del canal: en tubo redondo, una <em>cuerda</em> del arco inundado; en perfil rectangular, <strong>ancho útil × altura de lámina</strong>. Con velocidad de película ~0,08–0,12 m/s (según pendiente) se obtiene L/h por canal. La app <strong>combina</strong> este resultado con un modelo empírico y adopta el caudal más exigente. No sustituye medición in situ ni el catálogo de la bomba.',
    alerta: { tipo: 'info', txt: 'ℹ️ Lámina habitual ~2–4 mm (~3 mm); si sube mucho, suele haber exceso de caudal o pendiente insuficiente.' },
  });
  const docWrap =
    '<div class="consejo-card"><div class="consejo-texto consejo-texto--flush">' +
    nftTuberiaReferenciaDocHtml({ forChecklist: true }) +
    '</div></div>';
  return dyn + formula + docWrap;
}

function buildConsejosDwcDifusorBloque() {
  const cat = CONSEJOS_DATA.dwc;
  const rec =
    (state.configTorre || {}).tipoInstalacion === 'dwc'
      ? dwcRecomendacionDifusorCompletaDesdeConfig(state.configTorre)
      : null;
  let dyn = '';
  if (rec) {
    dyn =
      '<div class="consejo-dwc-rec-box">' +
      '<div class="consejo-dwc-rec-kicker">Según litros de mezcla y cestas (mismo criterio que checklist y Sistema)</div>' +
      dwcFormatHtmlRecomendacionDifusorCore(rec) +
      '</div>';
  } else {
    dyn =
      '<p class="consejo-p consejo-p--tight">Activa una instalación <strong>DWC</strong> y revisa volumen y rejilla en <strong>Sistema</strong> para ver aquí la recomendación de bomba y difusores.</p>';
  }
  return htmlInnerConsejoCard(cat, {
    icono: '💨',
    titulo: 'Bomba de aire y difusor según litros',
    html:
      '<p class="consejo-p">La solución nutritiva se oxigena con <strong>bomba de aire</strong> + <strong>difusor</strong> en el fondo. En webs y tiendas de hidroponía lo habitual son <strong>piedras porosas planas</strong> o barras (burbujeo repartido en horizontal), <strong>discos</strong>, <strong>bolas</strong> y cilindros microporosos: elige según el fondo de tu cubo y que el aire <strong>no quede solo en un rincón</strong>.</p>' +
      '<p class="consejo-p consejo-p--tight">Burbujas <strong>más finas</strong> suelen intercambiar mejor oxígeno con el agua, pero tapan antes el poro; la bomba debe ser capaz de <strong>vencer la profundidad</strong> del líquido (altura de agua / manguera).</p>' +
      dyn +
      '<p class="consejo-footnote">Orientativo; temperatura, número de plantas y forma del depósito cambian lo que necesitas. Si huele mal o las raíces se ablandan, sube aeración o limpia/sustituye el difusor.</p>',
    alerta: {
      tipo: 'warn',
      txt: '⚠️ No sustituye el dato del fabricante de la bomba ni un medidor de oxígeno disuelto.',
    },
  });
}

function buildConsejosDwc() {
  const cat = CONSEJOS_DATA.dwc;
  const intro = htmlConsejoCard(cat, {
    icono: '🌊',
    titulo: 'DWC en esta app',
    texto:
      'En <strong>Deep Water Culture</strong> las raíces cuelgan en un depósito con la <strong>misma solución</strong> para todas las plantas. Aquí se modela como cubo con tapa: la rejilla de orificios sigue <strong>filas × cestas</strong> (Torre / Sistema). El diagrama y el riego usan esa cuadrícula; las medidas del depósito sirven sobre todo para <strong>capacidad en litros</strong> y el contexto visual.',
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Misma EC y mismo pH en todo el depósito: mezcla solo cultivos compatibles (véase compatibilidad de cultivos en torre).',
    },
  });
  const vol = htmlConsejoCard(cat, {
    icono: '💧',
    titulo: 'Litros y dosis',
    texto:
      'Con <strong>L, A y P</strong> (profundidad útil) se estima la capacidad bruta. Si indicas <strong>litros de mezcla</strong> por debajo del máximo, checklist y <strong>Consejos → Agua y EC</strong> escalan nutrientes con ese volumen. Si lo dejas vacío, la app usa la capacidad calculada o un valor orientativo interno.',
    alerta: { tipo: 'ok', txt: '✅ En Sistema y en el asistente verás los litros útiles al completar largo, ancho y profundidad.' },
  });
  const nivelDep = htmlConsejoCard(cat, {
    icono: '📍',
    titulo: 'Nivel de solución y planta',
    texto:
      'Orientativo: la plántula suele ir casi al ras del <strong>fondo de la maceta</strong>; con raíces largas cuelgan en líquido <strong>oxigenado</strong>. La app no fija un porcentaje de llenado: lo crítico es el <strong>aireador 24 h</strong>. EC, pH y volumen los controlas en <strong>Mediciones</strong> y en las recargas.',
    alerta: { tipo: 'info', txt: 'ℹ️ En DWC no hay riego por goteo: el difusor mantiene oxígeno disuelto en el depósito.' },
  });
  const difusor = buildConsejosDwcDifusorBloque();
  const med = htmlConsejoCard(cat, {
    icono: '📐',
    titulo: 'Qué es cada medida en Sistema',
    texto:
      '<strong>L, A, P</strong> = largo, ancho y profundidad <em>útil</em> del depósito (cm); el <strong>volumen en litros</strong> se muestra en Sistema como L×A×P÷1000. <strong>Diám. cesta</strong> = aro en la tapa (mm); <strong>alt. cesta</strong> hasta las raíces (mm). <strong>Marco</strong> y <strong>hueco</strong> entre cestas se ajustan en el <strong>asistente DWC</strong>; si no los guardaste, el aviso de rejilla en Sistema usa marco 0 y 4 mm. Con eso comprueba si <strong>caben</strong> filas × cestas en la tapa.',
    alerta: { tipo: 'warn', txt: '⚠️ Comprobación orientativa: contrasta con tu tapa real y el diámetro nominal del fabricante.' },
  });
  const extras = htmlConsejoCard(cat, {
    icono: '🫧',
    titulo: 'Cúpulas y entrada de aire',
    texto:
      'Las casillas <strong>cúpulas / humedad</strong> y <strong>entrada de aire</strong> documentan tu montaje para el registro; no sustituyen el cálculo hidráulico detallado (como en NFT).',
    alerta: null,
  });
  const tabla =
    '<div class="consejo-card">' +
    '<div class="consejo-header">' +
    '<div class="consejo-icon" style="--consejo-icon-bg:' +
    cat.bg +
    '">📋</div>' +
    '<div><div class="consejo-titulo">Tamaños de cesta (referencia)</div></div>' +
    '</div>' +
    '<div class="consejo-texto consejo-texto--pt4">' +
    '<div id="mountDwcCestasGuiaConsejos"></div>' +
    '</div>' +
    '</div>';
  return intro + vol + nivelDep + difusor + med + extras + tabla;
}

/** Tarjeta de consejo con cuerpo HTML controlado (no escapar dos veces). */
function htmlInnerConsejoCard(cat, c) {
  return `
    <div class="consejo-card">
      <div class="consejo-header">
        <div class="consejo-icon" style="--consejo-icon-bg:${cat.bg}">
          ${c.icono}
        </div>
        <div>
          <div class="consejo-titulo">${c.titulo}</div>
        </div>
      </div>
      <div class="consejo-texto">${c.html}</div>
      ${c.alerta ? `
        <div class="consejo-alerta ${c.alerta.tipo}">
          <span>${c.alerta.txt}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function renderConsejosLista() {
  const cat = CONSEJOS_DATA[consejoCatActiva];
  const lista = document.getElementById('consejosLista');

  if (cat.soloTabla) {
    lista.innerHTML = buildHtmlTablaEcPh() + buildHtmlTablaPreparacionFabricante18L() + buildHtmlTablaConsejosPersonal();
    return;
  }

  if (consejoCatActiva === 'nft') {
    lista.innerHTML = buildConsejosNftHidraulica();
    return;
  }

  if (consejoCatActiva === 'dwc') {
    lista.innerHTML = buildConsejosDwc();
    mountDwcCestasGuiaEnPanelConsejos();
    return;
  }

  if (consejoCatActiva === 'agua') {
    const [cEc, cColor] = cat.consejos;
    lista.innerHTML = htmlConsejoCard(cat, cEc) + buildConsejosAguaNutrienteDinamico() + htmlConsejoCard(cat, cColor);
    return;
  }

  lista.innerHTML = cat.consejos.map(c => htmlConsejoCard(cat, c)).join('');
}

