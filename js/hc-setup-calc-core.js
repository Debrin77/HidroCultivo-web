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


