/**
 * Segunda parte de la app: mediciones, historial, fotos IDB, utilidades que dependen de todo lo anterior.
 * Carga después de js/meteo-alarm-app.js.
 */

async function guardarMedicion() {
  const ec    = document.getElementById('inputEC').value.trim();
  const ph    = document.getElementById('inputPH').value.trim();
  const temp  = document.getElementById('inputTemp').value.trim();
  const vol   = document.getElementById('inputVol').value.trim();
  const humS  = '';
  const notas = document.getElementById('inputNotas').value.trim();

  if (!ec && !ph && !temp && !vol) {
    showToast('⚠️ Introduce al menos un valor', true);
    return;
  }

  const now   = new Date();
  const dia   = String(now.getDate()).padStart(2,'0');
  const mes   = String(now.getMonth()+1).padStart(2,'0');
  const anyo  = now.getFullYear();
  const fecha = dia + '/' + mes + '/' + anyo;
  const hora  = now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });

  // ── 1. GUARDAR SIEMPRE EN LOCAL PRIMERO ───────────────────────────────────
  state.ultimaMedicion = { fecha, hora, ec, ph, temp, vol, humSustrato: humS };
  if (!state.mediciones) state.mediciones = [];
  state.mediciones.unshift({ fecha, hora, tipo:'medicion', ec, ph, temp, vol, humSustrato: humS, notas });
  if (state.mediciones.length > 200)
    state.mediciones = state.mediciones.slice(0, 200);

  // Línea única en el registro unificado (Historial → Registro)
  addRegistro('medicion', { ec, ph, temp, vol, humSustrato: humS, notas, icono: '📊' });

  // Si es una recarga marcada
  if (esRecarga) {
    state.ultimaRecarga = now.toISOString().split('T')[0];
    state.recargaSnoozeHasta = null;
    esRecarga = false;
    const rsw = document.getElementById('recargaSwitch');
    rsw.className = 'toggle-switch';
    rsw.setAttribute('aria-checked', 'false');
    if (!state.recargasLocal) state.recargasLocal = [];
    const _nr = getNutrienteTorre();
    state.recargasLocal.unshift({
      fecha, hora, ecFinal: ec, phFinal: ph, tempFinal: temp, volFinal: vol,
      torreId: getTorreActiva().id != null ? getTorreActiva().id : (state.torreActiva || 0),
      torreNombre: (getTorreActiva().nombre || '').trim() || 'Instalación',
      torreEmoji: getTorreActiva().emoji || '🌿',
      calmagMl: '',
      vegaAMl: String(calcularMlParteNutriente(0)),
      vegaBMl: _nr.partes >= 2 ? String(calcularMlParteNutriente(1)) : '',
      vegaCMl: _nr.partes >= 3 ? String(calcularMlParteNutriente(2)) : '',
      phMasMl: '', phMenosMl: '', notas
    });
  }

  saveState(); // Guardar en localStorage SIEMPRE

  // Refrescar historial si está visible
  if (document.getElementById('tab-historial').classList.contains('active')) {
    cargarHistorial();
  }

  // ── 2. ACTUALIZAR UI ──────────────────────────────────────────────────────
  document.getElementById('depositoStats').textContent =
    'EC: ' + (ec||'—') + ' µS/cm · pH: ' + (ph||'—') + ' · Temp: ' + (temp||'—') + '°C · Vol: ' + (vol||'—') + 'L';

  // Limpiar campos
  ['inputEC','inputPH','inputTemp','inputVol','inputNotas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['statusEC','statusPH','statusTemp','statusVol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'param-status'; el.innerHTML = ''; }
  });
  ['cardEC','cardPH','cardTemp','cardVol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'param-card';
  });
  ['correccionEC','correccionPH','correccionTemp','correccionVol'].forEach(id => {
    showCorreccion(id, '');
  });

  updateDashboard();
  updateRecargaBar();
  showToast('✅ Medición guardada · EC:' + (ec||'—') + ' pH:' + (ph||'—'));

  // ── 3. INTENTAR ENVIAR A GOOGLE SHEETS (opcional) ────────────────────────
  const alertas = [];
  const ecNumSheets = ec ? parseFloat(String(ec).replace(',', '.')) : NaN;
  if (ec && Number.isFinite(ecNumSheets)) {
    const cfgS = state.configTorre || {};
    const mObj = cfgS.checklistEcObjetivoUs;
    if (Number.isFinite(mObj) && mObj >= 200 && mObj <= 6000) {
      const o = Math.round(mObj);
      const t = EC_MEDICION_TOLERANCIA_OBJETIVO_US;
      if (ecNumSheets < o - t || ecNumSheets > o + t) {
        alertas.push('EC ' + ec + ' µS/cm fuera del margen del objetivo (' + o + ' ±' + t + ')');
      }
    } else {
      const eo = getECOptimaTorre();
      if (ecNumSheets < eo.min || ecNumSheets > eo.max) {
        alertas.push('EC ' + ec + ' µS/cm fuera del rango cultivo (' + eo.min + '–' + eo.max + ')');
      }
    }
  }
  if (ph && (parseFloat(ph) < 5.7  || parseFloat(ph) > 6.4))  alertas.push('pH ' + ph + ' fuera de rango');
  if (temp && (parseFloat(temp) < 18 || parseFloat(temp) > 22)) alertas.push('Temp ' + temp + '°C fuera de rango');
  if (vol && parseFloat(vol) < 16) alertas.push('Vol ' + vol + 'L bajo');

  await hcPostSheets({
    action: 'medicion', fecha, hora, ec, ph, temp, volumen: vol,
    humSustrato: humS || null,
    notas, alertas: alertas.join(' | ')
  });
}


function showToast(msg, error=false) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.setAttribute('aria-atomic', 'true');
    t.style.cssText =
      'position:fixed;top:max(70px,env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%) translateY(-10px);' +
      'background:var(--green);color:var(--bg);font-family:var(--font-display);font-weight:700;font-size:13px;' +
      'line-height:1.35;padding:12px 16px;border-radius:16px;opacity:0;transition:all 0.3s;pointer-events:none;' +
      'z-index:9000;max-width:min(100vw - 24px, 420px);width:max-content;box-sizing:border-box;text-align:center;' +
      'white-space:normal;word-break:break-word;hyphens:auto;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.setAttribute('aria-live', error ? 'assertive' : 'polite');
  t.style.background = error ? 'var(--red)' : 'var(--green)';
  t.style.color = error ? 'white' : 'var(--bg)';
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(-10px)'; }, 3500);
}

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
  ciudad: null,
  lat: null,
  lon: null,
  sensoresHardware: { ec: false, ph: false, humedad: false },
};

// ══ Setup páginas 6 y 7 ══════════════════════════
let setupPlantasSeleccionadas = new Set();
let setupNumTorres = 'una';

function renderSetupPlantasGrid() {
  const grid = document.getElementById('setupPlantasGrid');
  if (!grid) return;

  // Grupos principales aptos para inicio
  const grupos = [
    { key:'lechugas',  label:'Lechugas',      desc:'Fácil · 40-60 días' },
    { key:'asiaticas', label:'Asiáticas',      desc:'Fácil · 35-40 días' },
    { key:'hojas',     label:'Hojas verdes',   desc:'Fácil · 30-55 días' },
    { key:'hierbas',   label:'Hierbas',        desc:'Media · 30-90 días' },
    { key:'fresas',    label:'Fresas',         desc:'Media · 90 días' },
    { key:'frutos',    label:'Frutos',         desc:'Avanzado · Torre dedicada' },
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
    const vol    = getSetupVolumenMezclaLitros();
    const d      = calcularDosisSetup(setupNutriente, vol, ecObj);
    const nut   = d.nut;
    const dosisDiv  = document.getElementById('dosisSegunCultivo');
    const dosisText = document.getElementById('dosisSegunCultivoTexto');
    if (dosisDiv && dosisText) {
      dosisDiv.classList.remove('setup-hidden');
      const orden = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A','Parte B','Parte C'];
      let txt = '📦 ' + volMax + ' L máx' + (vol < volMax - 0.05 ? ' · mezcla ' + vol + ' L' : '') +
        ' · ⚡ EC ' + ecObj.min + '–' + ecObj.max + ' µS/cm<br>';
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
      txt += '• pH objetivo: <strong>' + (nut.pHRango?.[0]||5.5) + '–' + (nut.pHRango?.[1]||6.5) + '</strong>';
      if (ecObj.advertencia) txt += '<br><span class="setup-ec-warn">⚠️ Cultivos con EC distinta — ajustar por torre</span>';
      dosisText.innerHTML = txt;
    }
  } else {
    info.classList.add('setup-hidden');
    const dosisDiv = document.getElementById('dosisSegunCultivo');
    if (dosisDiv) dosisDiv.classList.add('setup-hidden');
  }
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
  const niveles = isNft
    ? (document.getElementById('sliderNftCanales')?.value || 4)
    : (document.getElementById('sliderNiveles')?.value || 5);
  const cestas  = isNft
    ? (document.getElementById('sliderNftHuecos')?.value || 8)
    : (document.getElementById('sliderCestas')?.value  || 5);
  const pendTxt = isNft ? (document.getElementById('sliderNftPendiente')?.value || 2) + '% pendiente · ' : '';
  const volMax  = getSetupVolumenMaxLitros();
  const volMez  = getSetupVolumenMezclaLitros();
  const volTxtResume = volMez < volMax - 0.05 ? volMax + 'L máx · mezcla ' + volMez + 'L' : volMax + 'L';
  const nut     = NUTRIENTES_DB.find(n => n.id === (window.setupNutriente || 'canna_aqua'));
  const ubic    = setupData.ubicacion || window.setupUbicacion || 'exterior';
  const luzResumenTxt = {
    natural: 'Luz natural (ventana)', led: 'LED', mixto: 'Mixto ventana + artificial',
    fluorescente: 'Fluorescente T5', hps: 'HPS / HM', sin_luz: 'Sin luz adecuada'
  }[setupData.luz || 'led'] || 'LED';
  const hLuzRes = Math.max(12, Math.min(20, parseInt(String(setupData.horasLuz || 16), 10) || 16));
  const grupos  = ['lechugas','asiaticas','hojas','hierbas','fresas','frutos'];
  const plantasNombres = {
    lechugas:'Lechugas', asiaticas:'Asiáticas', hojas:'Hojas verdes',
    hierbas:'Hierbas', fresas:'Fresas', frutos:'Frutos'
  };
  const plantasSel = [...setupPlantasSeleccionadas].map(k => plantasNombres[k]||k).join(', ') || 'Sin seleccionar';

  const ecObj  = getSetupECObjetivo();
  const montR = isNft ? readNftMontajeFromSetupUi() : { disposicion: 'mesa', alturaBombeoCm: 0 };
  const draftNFT = isNft ? buildNftDraftConfigFromSetupUi() : null;
  const hydNFT = isNft ? getNftHidraulicaDesdeConfig(draftNFT) : null;
  const bResumenNft = isNft ? getNftBombaDesdeConfig(draftNFT) : null;
  const altResNFT = isNft ? getNftAlturaBombeoEfectivaCm(draftNFT) : 0;
  const d      = calcularDosisSetup(window.setupNutriente || 'canna_aqua', volMez, ecObj);
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
  if (isDwc) {
    const Ld = _dwcParseOptCm('setupDwcLargoCm', 5, 300);
    const Wd = _dwcParseOptCm('setupDwcAnchoCm', 5, 300);
    const Pd = _dwcParseOptCm('setupDwcProfCm', 5, 200);
    if (Ld != null && Wd != null && Pd != null) geoDwcRes += ' · dep. ' + Ld + '×' + Wd + '×' + Pd + ' cm';
    const rimD = _dwcParseOptMm('setupDwcPotRimMm', 25, 120);
    const hD = _dwcParseOptMm('setupDwcPotHmm', 30, 200);
    if (rimD != null || hD != null) {
      geoDwcRes += ' · cesta';
      if (rimD != null) geoDwcRes += ' Ø' + rimD + ' mm';
      if (hD != null) geoDwcRes += ' · ' + hD + ' mm alto';
    }
    if (document.getElementById('setupDwcCupulas')?.checked) geoDwcRes += ' · cúpulas';
    if (document.getElementById('setupDwcEntradaAire')?.checked) geoDwcRes += ' · entrada aire';
    const mhG = _dwcParseMarcoHuecoMmIds('setupDwcTapaMarcoMm', 'setupDwcTapaHuecoMm');
    if (mhG.marco != null && mhG.marco > 0) geoDwcRes += ' · marco tapa ' + mhG.marco + ' mm/lado';
    if (mhG.hueco != null) geoDwcRes += ' · entre cestas ' + mhG.hueco + ' mm';
  }

  el.innerHTML =
    (isNft
      ? '🪴 NFT: <strong>' + (hydNFT ? hydNFT.nCh : niveles) + ' tubos × ' + cestas + ' huecos/canal · ' + pendTxt + volTxtResume + '</strong> · tubo principal Ø <strong>' + setupNftTuboMm + ' mm</strong> · disposición <strong>' +
        (montR.disposicion === 'escalera' ? 'escalera' : montR.disposicion === 'pared' ? 'pared' : 'mesa') +
        (montR.disposicion === 'mesa' && montR.mesaMultinivel ? ' · multinivel' : '') +
        (montR.disposicion === 'escalera' && montR.escaleraCaras === 2 ? ' · A (2 caras)' : '') +
        '</strong>' +
        (altResNFT > 0 ? ' · bombeo (efectivo) al 1.º tubo <strong>' + altResNFT + ' cm</strong>' : '') +
        '<br>' +
        (bResumenNft
          ? '⚡ NFT: circulación <strong>24 h</strong> · criterio bomba/depósito en el paso de equipo y en checklist (veredicto visible; cifras en «detalle técnico»).<br>'
          : '')
      : isDwc
        ? '🌊 DWC: <strong>' + niveles + ' filas × ' + cestas + ' cestas · ' + volTxtResume + '</strong>' + geoDwcRes + '<br>⚡ Aireador <strong>24 h</strong> · nivel y nutrientes en <strong>Mediciones</strong>.<br>'
        : '🌿 Torre: <strong>' + niveles + ' niveles × ' + cestas + ' cestas · ' + volTxtResume + '</strong><br>') +
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
    '🌿 Torres: <strong>' + (setupNumTorres === 'varias' ? 'Varias (añadir desde pestaña Sistema)' : 'Una torre') + '</strong>';
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
  if (el) el.style.display = mostrar ? 'block' : 'none';
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

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5);

  // Cálculo técnico de bomba
  // Caudal necesario: 1.5 L/min por nivel activo = 1.5 × N × 60 = 90N L/h
  const caudalMin  = Math.round(1.5 * niveles * 60);         // L/h mínimo
  const caudalRec  = Math.round(2.0 * niveles * 60);         // L/h recomendado

  // Head (altura de elevación) = altura torre + 20% de pérdidas por fricción
  const headMetros = Math.round(setupAlturaTorre * 1.2 * 10) / 10;

  // Potencia estimada (W) = (Q × H) / (367 × η) donde η≈0.35 para bombas pequeñas
  // Q en m³/h, H en metros
  const Q = caudalRec / 1000;  // m³/h
  const potenciaW = Math.ceil((Q * headMetros) / (0.367 * 0.35));
  const potenciaRec = Math.max(5, potenciaW * 2); // factor seguridad ×2

  // Recomendación de bomba según caudal y head
  let modeloRec = '';
  if (caudalRec <= 400 && headMetros <= 1.5) {
    modeloRec = 'Bomba 5-8W · 400-600 L/h · head 1.5m (ej: Jebao, Sunsun SS-200)';
  } else if (caudalRec <= 600 && headMetros <= 2.0) {
    modeloRec = 'Bomba 8-12W · 600-800 L/h · head 2.0m (ej: Jebao PP-388)';
  } else if (caudalRec <= 900 && headMetros <= 2.5) {
    modeloRec = 'Bomba 12-18W · 800-1000 L/h · head 2.5m (ej: Sunsun CHJ-503)';
  } else {
    modeloRec = 'Bomba 18-25W · 1200+ L/h · head 3m+ (consultar catálogo)';
  }

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
  const cm = tam === 'custom'
    ? (parseFloat(document.getElementById('cestaCmCustom')?.value) || 0)
    : parseFloat(tam);
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
  const map = { natural:'Natural', mixto:'Mixto', led:'LED', fluorescente:'Fluorescent', hps:'HPS', sin_luz:'SinLuz' };
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
}

function seleccionarLuz(tipo) {
  setupData.luz = tipo;
  const map = { natural:'Natural', mixto:'Mixto', led:'LED', fluorescente:'Fluorescent', hps:'HPS', sin_luz:'SinLuz' };
  ['Natural','Mixto','LED','Fluorescent','HPS','SinLuz'].forEach(suf => {
    const el = document.getElementById('luz' + suf);
    if (el) el.classList.remove('selected');
  });
  const suf = map[tipo] || 'LED';
  document.getElementById('luz' + suf)?.classList.add('selected');
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
}

// ══════════════════════════════════════════════════
// SISTEMA MULTI-TORRE
// ══════════════════════════════════════════════════

const MAX_TORRES = 10;

function emojiMigracionPorTipoInstalacion(cfg) {
  if (!cfg || !cfg.tipoInstalacion) return '🌿';
  if (cfg.tipoInstalacion === 'nft') return '🪴';
  if (cfg.tipoInstalacion === 'dwc') return '🌊';
  return '🌿';
}

// Inicializar sistema de torres si no existe
function initTorres() {
  if (!state.torres) {
    // Migrar configuración actual como primera instalación
    state.torres = [{
      id: 1,
      nombre: 'Mi instalación',
      emoji: emojiMigracionPorTipoInstalacion(state.configTorre),
      config: state.configTorre || null,
      torre: state.torre || [],
      modoActual: modoActual || 'lechuga',
      mediciones: state.mediciones || [],
      registro: state.registro || [],
      fotosSistemaCompleto: { fotoKeys: [], fotos: [] },
    }];
    state.torreActiva = 0; // índice en el array
    saveState();
  }
  let idSeq = Date.now();
  let idsReparados = false;
  (state.torres || []).forEach(t => {
    if (t.id == null || t.id === '') {
      idSeq += 1;
      t.id = idSeq;
      idsReparados = true;
    }
    if (!t.fotosSistemaCompleto || typeof t.fotosSistemaCompleto !== 'object') {
      t.fotosSistemaCompleto = { fotoKeys: [], fotos: [] };
    } else {
      if (!Array.isArray(t.fotosSistemaCompleto.fotoKeys)) t.fotosSistemaCompleto.fotoKeys = [];
      if (!Array.isArray(t.fotosSistemaCompleto.fotos)) t.fotosSistemaCompleto.fotos = [];
    }
  });
  if (idsReparados) saveState();
}

function getTorreActiva() {
  initTorres();
  const idx = state.torreActiva || 0;
  return state.torres[idx] || state.torres[0];
}


// Actualizar todos los datos de la torre activa
function actualizarTorreActual() {
  if (state.configTorre) {
    state.configTorre.checklistInstalacionConfirmada = true;
    if (state.configTorre.tipoInstalacion === 'dwc') {
      try {
        dwcPersistSnapshotMaxCestasEnCfg(state.configTorre);
      } catch (eD) {}
    }
  }
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
  try {
    if (state.configTorre && state.configTorre.tipoInstalacion === 'dwc') refreshDwcSistemaMedidasUI();
  } catch (eDwUi) {}
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  // Recalcular plantas y edad automáticamente
  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    actualizarVistaRiegoPorTipoInstalacion();
    calcularRiego();
  }
  if (document.getElementById('tab-meteo')?.classList.contains('active')) {
    cargarMeteo();
  }
  if (document.getElementById('tab-calendario')?.classList.contains('active')) {
    renderCalendario();
  }
  showToast('🔄 Instalación actualizada · ' + ((getTorreActiva()?.nombre || '').trim() || 'Instalación'));
}

function cambiarTorreActiva(idx) {
  // Guardar estado actual en la torre activa
  guardarEstadoTorreActual();
  torreCestasMultiSel.clear();
  torreInteraccionModo = 'editar';

  // Cambiar a la nueva torre
  state.torreActiva = idx;
  cargarEstadoTorre(idx);
  saveState();
  cerrarModalTorres();
  actualizarHeaderTorre();
  renderTorre();
  updateTorreStats();
  updateDashboard();
  actualizarBadgesNutriente();
  const _bE = document.getElementById('torreModoEditar');
  const _bA = document.getElementById('torreModoAsignar');
  const _pA = document.getElementById('torreAssignPanel');
  if (_bE) { _bE.classList.add('active'); _bE.setAttribute('aria-pressed', 'true'); }
  if (_bA) { _bA.classList.remove('active'); _bA.setAttribute('aria-pressed', 'false'); }
  if (_pA) _pA.style.display = 'none';
  actualizarBarraMultiSel();
  // Recalcular plantas para la nueva torre en el input de riego
  const nCf = contarPlantasTorreConFechaValida();
  const nV = contarPlantasTorreConVariedad();
  const riegoNPl = document.getElementById('riegoNPlantas');
  if (riegoNPl) {
    if (nCf > 0) riegoNPl.value = String(nCf);
    else if (nV === 0) riegoNPl.value = '15';
    else riegoNPl.value = String(Math.max(1, nV));
  }

  actualizarVistaRiegoPorTipoInstalacion();

  // Toast con nombre de la torre
  const t = state.torres[idx];
  const nombre = (t && t.nombre) ? String(t.nombre).trim() : '';
  showToast('🌿 Ahora en: ' + (nombre || 'Instalación'));
  // Marcar datos como obsoletos — se recargarán al abrir cada pestaña
  window._meteoObsoleto = true;
  window._riegoObsoleto  = true;
  // Recargar si la pestaña ya está abierta (sincronizar primero)
  if (document.getElementById('tab-riego')?.classList.contains('active')) {
    sincronizarInputsRiego();
    actualizarVistaRiegoPorTipoInstalacion();
    calcularRiego({ forceRefresh: true });
  }
  if (document.getElementById('tab-meteo')?.classList.contains('active')) cargarMeteo();
  if (document.getElementById('tab-calendario')?.classList.contains('active')) renderCalendario();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) initConfigUI();
}

/** Cestas con cultivo asignado (para detectar datos de torre más recientes en la raíz del state). */
function contarPlantasEnTorre(torreArr) {
  if (!torreArr || !Array.isArray(torreArr)) return 0;
  let n = 0;
  for (let ni = 0; ni < torreArr.length; ni++) {
    const row = torreArr[ni];
    if (!Array.isArray(row)) continue;
    for (let ci = 0; ci < row.length; ci++) {
      const c = row[ci];
      if (c && String(c.variedad || '').trim() !== '') n++;
    }
  }
  return n;
}

/**
 * Tras versiones antiguas o guardados sin sync, state.torre podía tener plantas y el slot
 * state.torres[idx].torre quedar vacío/obsoleto. Al cargar, se perdía la torre en pantalla.
 * Copia la raíz al slot si la raíz lleva más plantas registradas.
 */
function reconciliarSlotTorreActivaAntesDeCargar() {
  if (!state.torres || !state.torres.length) return;
  const idx = state.torreActiva || 0;
  const t = state.torres[idx];
  if (!t) return;
  const nSlot = contarPlantasEnTorre(t.torre);
  const nRoot = contarPlantasEnTorre(state.torre);
  if (nRoot > nSlot) {
    try {
      t.torre = JSON.parse(JSON.stringify(state.torre));
    } catch (e) {}
  }
  if (!t.config && state.configTorre && typeof state.configTorre === 'object' && Object.keys(state.configTorre).length) {
    try {
      t.config = JSON.parse(JSON.stringify(state.configTorre));
    } catch (e) {}
  }
}

function guardarEstadoTorreActual() {
  if (!state.torres) return;
  const idx = state.torreActiva || 0;
  if (!state.torres[idx]) return;
  state.torres[idx].torre      = JSON.parse(JSON.stringify(state.torre));
  state.torres[idx].modoActual = modoActual;
  state.torres[idx].mediciones = state.mediciones || [];
  state.torres[idx].registro   = state.registro   || [];
  state.torres[idx].ultimaMedicion = state.ultimaMedicion
    ? { ...state.ultimaMedicion }
    : null;
  state.torres[idx].ultimaRecarga = state.ultimaRecarga ?? null;
  state.torres[idx].recargaSnoozeHasta = state.recargaSnoozeHasta ?? null;
  state.torres[idx].config     = state.configTorre || null;
  ensureFotosSistemaCompletoState();
  try {
    state.torres[idx].fotosSistemaCompleto = JSON.parse(JSON.stringify(state.fotosSistemaCompleto));
  } catch (e) {
    state.torres[idx].fotosSistemaCompleto = { fotoKeys: [], fotos: [] };
  }
  // Guardar configuración de riego específica de esta torre
  state.torres[idx].riego = {
    nPlantas:   parseInt(document.getElementById('riegoNPlantas')?.value) || 15,
    edadSem:    parseFloat(document.getElementById('riegoEdad')?.value) || 4,
    toldo:      toldoDesplegado,
    diaRiego:   diaRiego,
  };
}

function cargarEstadoTorre(idx) {
  const t = state.torres[idx];
  if (!t) return;
  // Restaurar datos de esta torre
  state.torre       = t.torre || [];
  state.mediciones  = t.mediciones || [];
  state.registro    = t.registro   || [];
  state.configTorre = t.config     || null;
  const umSlot = t.ultimaMedicion;
  if (umSlot && typeof umSlot === 'object') {
    state.ultimaMedicion = { ...umSlot };
  } else {
    const med0 = (t.mediciones || []).find(m => m && (m.tipo === 'medicion' || !m.tipo));
    state.ultimaMedicion = med0
      ? {
          fecha: med0.fecha,
          hora: med0.hora,
          ec: med0.ec,
          ph: med0.ph,
          temp: med0.temp,
          vol: med0.vol,
          humSustrato: med0.humSustrato,
        }
      : null;
  }
  state.ultimaRecarga = t.ultimaRecarga != null ? t.ultimaRecarga : null;
  state.recargaSnoozeHasta = t.recargaSnoozeHasta != null ? t.recargaSnoozeHasta : null;
  const fsc = t.fotosSistemaCompleto;
  state.fotosSistemaCompleto =
    fsc && typeof fsc === 'object'
      ? {
          fotoKeys: Array.isArray(fsc.fotoKeys) ? fsc.fotoKeys.slice() : [],
          fotos: Array.isArray(fsc.fotos) ? fsc.fotos.slice() : [],
        }
      : { fotoKeys: [], fotos: [] };
  modoActual = typeof normalizeTorreModoActual === 'function'
    ? normalizeTorreModoActual(t.modoActual)
    : (MODOS_CULTIVO[t.modoActual] ? t.modoActual : 'lechuga');
  // Asegurar estructura COMPLETA siempre — rellenar niveles y cestas que falten
  const nivR = state.configTorre?.numNiveles || NUM_NIVELES;
  const cesR = state.configTorre?.numCestas  || NUM_CESTAS;
  if (!state.torre) state.torre = [];
  // Añadir niveles que falten
  while (state.torre.length < nivR) state.torre.push([]);
  // Añadir cestas que falten en cada nivel
  for (let n = 0; n < nivR; n++) {
    if (!state.torre[n]) state.torre[n] = [];
    while (state.torre[n].length < cesR) {
      state.torre[n].push({ variedad:'', fecha:'', notas:'', fotos:[], fotoKeys:[] });
    }
  }
  // Restaurar configuración de riego de esta torre
  const riegoData = t.riego || {};
  const riegoNPl = document.getElementById('riegoNPlantas');
  const riegoEd  = document.getElementById('riegoEdad');
  if (riegoNPl && riegoData.nPlantas) riegoNPl.value = riegoData.nPlantas;
  if (riegoEd  && riegoData.edadSem)  riegoEd.value  = riegoData.edadSem;
  const swToldo = document.getElementById('toldoSwitch');
  if (riegoData.toldo !== undefined) {
    toldoDesplegado = riegoData.toldo;
  } else {
    toldoDesplegado = false;
  }
  if (swToldo) {
    swToldo.className = 'toggle-switch' + (toldoDesplegado ? ' on' : '');
    swToldo.setAttribute('aria-checked', toldoDesplegado ? 'true' : 'false');
  }
  if (riegoData.diaRiego === 'hoy' || riegoData.diaRiego === 'manana') {
    setDiaRiego(riegoData.diaRiego);
  } else {
    setDiaRiego('hoy');
  }
  // Aplicar constantes de la config de esta torre
  if (state.configTorre?.sustrato) state.configSustrato = state.configTorre.sustrato;
  aplicarConfigTorre();
  cargarUbicacionMedicionesUI();
  cargarInteriorGrowUI();
  cargarSensorSustratoUI();
  cargarSensoresHardwareUI();
  cargarLocalidadMeteoUI();
  try { refreshUbicacionInstalacionUI(); } catch (_) {}
  syncRiegoAvanzadoUI();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) initConfigUI();
}

function actualizarHeaderTorre() {
  const t = getTorreActiva();
  const btn = document.getElementById('torreActivaNombre');
  if (btn) btn.textContent = (t.emoji || '🌿') + ' ' + ((t.nombre || '').trim() || 'Instalación');
  // Mostrar/ocultar botón añadir según límite
  const btnCrear = document.getElementById('btnCrearTorre');
  if (btnCrear) btnCrear.style.display = (state.torres.length >= MAX_TORRES) ? 'none' : 'block';
}

function renderSistemaInstalacionSelect() {
  const sel = document.getElementById('sistemaInstalacionSelect');
  if (!sel) return;
  const torres = state.torres || [];
  const n = torres.length;
  const activa = n ? Math.min(Math.max(0, state.torreActiva || 0), n - 1) : 0;
  sel.innerHTML = '';
  torres.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    const nom = ((t?.nombre || '').trim() || 'Instalación ' + (i + 1));
    const emoji = t?.emoji || '🌿';
    const ti = t?.config?.tipoInstalacion;
    const tipo = ti === 'nft' ? 'NFT' : ti === 'dwc' ? 'DWC' : 'Torre vertical';
    opt.textContent = emoji + ' ' + nom + ' · ' + tipo;
    sel.appendChild(opt);
  });
  if (n) sel.value = String(activa);
}

function onSistemaInstalacionSelectChange(el) {
  const idx = parseInt(el.value, 10);
  if (!Number.isFinite(idx) || idx < 0 || idx >= (state.torres || []).length) return;
  if (idx === (state.torreActiva || 0)) return;
  cambiarTorreActiva(idx);
}

function abrirSelectorTorres() {
  initTorres();
  renderListaTorres();
  const mt = document.getElementById('modalTorres');
  mt.classList.add('open');
  a11yDialogOpened(mt);
}

function cerrarModalTorres(e) {
  const mt = document.getElementById('modalTorres');
  if (!e || e.target === mt) {
    mt.classList.remove('open');
    a11yDialogClosed(mt);
  }
}

function renderListaTorres() {
  const lista = document.getElementById('listaTorres');
  const activa = state.torreActiva || 0;
  const EMOJIS = ['🌿','🌱','🥬','🌿','🍃','🌾','🪴','🌻','🫛','🎍'];

  lista.innerHTML = state.torres.map((t, i) => {
    const isActiva = i === activa;
    const plantasCount = (t.torre || []).reduce((sum, nivel) =>
      sum + (nivel || []).filter(c => c && c.variedad).length, 0);
    const cfgT = t.config || {};
    const geomTxt = cfgT.tipoInstalacion === 'nft'
      ? ((cfgT.nftNumCanales || cfgT.numNiveles || 4) + ' canales × ' + (cfgT.nftHuecosPorCanal || cfgT.numCestas || 8) + ' huecos')
      : cfgT.tipoInstalacion === 'dwc'
        ? ((cfgT.numNiveles || 5) + ' filas × ' + (cfgT.numCestas || 5) + ' cestas')
        : ((cfgT.numNiveles || 5) + 'N × ' + (cfgT.numCestas || 5) + 'C');

    return `<div class="torre-list-row${isActiva ? ' torre-list-row--active' : ''}">
      <button type="button" class="torre-list-main"
        onclick="cambiarTorreActiva(${i})"
        aria-pressed="${isActiva ? 'true' : 'false'}"
        aria-label="Activar ${String((t.nombre || '').trim() || 'instalación').replace(/"/g, '&quot;')}${isActiva ? ', instalación actual' : ''}">
      <span class="torre-list-emoji" aria-hidden="true">${t.emoji || '🌿'}</span>
      <span class="torre-list-body">
        <span class="torre-list-name">${(t.nombre || '').trim() || 'Instalación'}</span>
        <span class="torre-list-meta">
          ${cfgT.tipoInstalacion === 'nft' ? '🪴 NFT · ' : cfgT.tipoInstalacion === 'dwc' ? '🌊 DWC · ' : ''}${plantasCount} plantas · ${t.config ? geomTxt : '5N × 5C'}
          ${isActiva ? ' · <strong class="torre-list-active-tag">Activa</strong>' : ''}
        </span>
      </span>
      </button>
      <div class="torre-list-actions">
        <button type="button" onclick="editarNombreTorre(${i})"
          class="torre-list-btn-icon" aria-label="Editar nombre de la instalación">✏️</button>
        ${state.torres.length > 1 && !isActiva ? `
        <button type="button" onclick="borrarTorre(${i})"
          class="torre-list-btn-del" aria-label="Borrar esta instalación">🗑</button>` : ''}
      </div>
    </div>`;
  }).join('');

  actualizarHeaderTorre();
}

function abrirSetupNuevaTorre() {
  // Marcar que es una torre nueva (no reconfiguración)
  setupEsNuevaTorre = true;
  setupNombreNuevaTorre = '';

  // Preconfigurar sliders con valores razonables para torre nueva
  setupPagina = 0;
  setupTipoInstalacion = '';
  setupTipoTorre = 'custom';
  setupEquipamiento = new Set(['difusor','calentador','bomba','timer','medidorEC']);
  refreshSetupEquipamientoCardsDesdeSet();
  const ccNew = document.getElementById('setupCalentadorConsignaC');
  if (ccNew) ccNew.value = '20';
  refreshSetupCalentadorConsignaVis();
  setupNutriente = 'canna_aqua';
  setupUbicacion = 'exterior';
  setupPlantasSeleccionadas = new Set();
  setupNumTorres = 'una'; // no relevante para nueva torre
  setupData.sensoresHardware = { ec: false, ph: false, humedad: false };

  setupCoordenadas = { lat: null, lon: null, ciudad: '' };
  setupData.ciudad = null;
  setupData.lat = null;
  setupData.lon = null;
  const c2n = document.getElementById('setupCiudad2');
  if (c2n) c2n.value = '';
  document.getElementById('ciudadResultadosSetup')?.classList.add('setup-hidden');
  const csel = document.getElementById('ciudadSeleccionadaSetup');
  if (csel) {
    csel.classList.add('setup-hidden');
    csel.textContent = '';
  }

  const so = document.getElementById('setupOverlay');
  so.classList.add('open');
  document.getElementById('sliderNftCanales') && (document.getElementById('sliderNftCanales').value = '4');
  document.getElementById('sliderNftHuecos') && (document.getElementById('sliderNftHuecos').value = '8');
  document.getElementById('sliderNftPendiente') && (document.getElementById('sliderNftPendiente').value = '2');
  const svNew = document.getElementById('sliderVol');
  if (svNew) svNew.value = '20';
  const svmNew = document.getElementById('setupVolMezclaL');
  if (svmNew) svmNew.value = '';
  renderNutrientesGrid();
  updateTorreBuilder();
  renderSetupPage();
  a11yDialogOpened(so);

  // Actualizar el título para indicar que es una torre nueva
  setTimeout(() => {
    const titulo = document.querySelector('.setup-header-title');
    if (titulo) titulo.textContent = '🌿 Nueva instalación';
  }, 50);
}


function crearNuevaTorre() {
  if (state.torres.length >= MAX_TORRES) {
    showToast('Máximo ' + MAX_TORRES + ' instalaciones', true); return;
  }
  cerrarModalTorres();
  abrirSetupNuevaTorre();
}

function editarNombreTorre(idx) {
  const t = state.torres[idx];
  const nuevoNombre = prompt('Nombre de la instalación:', t.nombre || '');
  if (nuevoNombre && nuevoNombre.trim()) {
    state.torres[idx].nombre = nuevoNombre.trim().slice(0, 40);
    saveState();
    renderListaTorres();
    actualizarHeaderTorre();
    updateTorreStats();
    updateDashboard();
  }
}

function guardarNombreInstalacionDesdeTorre() {
  initTorres();
  const inp = document.getElementById('torreNombreInstalacionInput');
  if (!inp) return;
  const idx = state.torreActiva || 0;
  const raw = (inp.value || '').trim().slice(0, 40);
  if (!raw) {
    showToast('Escribe un nombre o deja el que había', true);
    inp.value = state.torres[idx]?.nombre || '';
    return;
  }
  if (!state.torres[idx]) return;
  state.torres[idx].nombre = raw;
  saveState();
  updateTorreStats();
  updateDashboard();
  actualizarHeaderTorre();
  showToast('✅ Nombre guardado: ' + raw);
}

function borrarTorre(idx) {
  if (state.torres.length <= 1) return;
  if (!confirm('¿Borrar ' + state.torres[idx].nombre + '? Se perderán todos sus datos.')) return;
  state.torres.splice(idx, 1);
  if (state.torreActiva >= state.torres.length) {
    state.torreActiva = state.torres.length - 1;
  }
  cargarEstadoTorre(state.torreActiva);
  saveState();
  renderListaTorres();
  renderTorre();
  actualizarHeaderTorre();
  showToast('🗑 Instalación eliminada');
}

// ══════════════════════════════════════════════════
// BADGE NUTRIENTE — visible en dashboard y medir
// ══════════════════════════════════════════════════

function actualizarBadgesNutriente() {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};

  // Actualizar rangos dinámicos en las cards de Medir
  const ecOptimaCultivos = getECOptimaTorre();
  const ecMin = ecOptimaCultivos.min;
  const ecMax = ecOptimaCultivos.max;
  const phMin = nut.pHRango   ? nut.pHRango[0]    : 5.5;
  const phMax = nut.pHRango   ? nut.pHRango[1]    : 6.5;

  const rangeEC = document.getElementById('paramRangeEC');
  const rangePH = document.getElementById('paramRangePH');
  if (rangeEC) {
    const mEc = cfg.checklistEcObjetivoUs;
    if (Number.isFinite(mEc) && mEc >= 200 && mEc <= 6000) {
      const o = Math.round(mEc);
      rangeEC.textContent =
        'Objetivo ' + o + ' ±' + EC_MEDICION_TOLERANCIA_OBJETIVO_US + ' µS/cm · cultivo ' + ecMin + '–' + ecMax;
    } else {
      rangeEC.textContent = ecMin + ' – ' + ecMax + ' µS/cm';
    }
  }
  if (rangePH) rangePH.textContent = phMin + ' – ' + phMax;

  // Dashboard
  const dashNombre  = document.getElementById('dashNutrienteNombre');
  const dashDetalle = document.getElementById('dashNutrienteDetalle');
  const dashUbicacion = document.getElementById('dashUbicacionBadge');
  if (dashNombre)  dashNombre.textContent  = nut.nombre;
  if (dashDetalle) dashDetalle.textContent = nut.detalle;
  if (dashUbicacion) {
    const ub = cfg.ubicacion || 'exterior';
    if (ub === 'interior') {
      const lz = { natural: 'natural', led: 'LED', mixto: 'mixto', fluorescente: 'T5', hps: 'HPS', sin_luz: 'sin luz' }[cfg.luz || 'led'] || 'LED';
      const h = cfg.horasLuz || 16;
      dashUbicacion.textContent = '🏠 Interior · ' + lz + ' · ' + h + 'h';
    } else {
      dashUbicacion.textContent = '☀️ Exterior';
    }
  }

  // Dashboard inicio — banner torre
  const dashTorreEmoji  = document.getElementById('dashTorreEmoji');
  const dashTorreNombre = document.getElementById('dashTorreNombre');
  const dashTorreInfo   = document.getElementById('dashTorreInfo');
  const torre = getTorreActiva();
  if (dashTorreEmoji)  dashTorreEmoji.textContent  = torre.emoji || '🌿';
  if (dashTorreNombre) dashTorreNombre.textContent  = (torre.nombre || '').trim() || 'Instalación';
  if (dashTorreInfo) {
    const niv = cfg.numNiveles || 5;
    const ces = cfg.numCestas  || 5;
    const vMax = getVolumenDepositoMaxLitros(cfg);
    const vMez = getVolumenMezclaLitros(cfg);
    const volTxt = vMez < vMax - 0.05 ? vMax + 'L máx · ' + vMez + 'L mezcla' : vMax + 'L';
    dashTorreInfo.textContent = niv + ' niveles · ' + ces + ' cestas · ' + volTxt + ' · ' + nut.nombre;
  }

  // Pestaña Medir — banner torre
  const medirTorreEmoji  = document.getElementById('medirTorreEmoji');
  const medirTorreNombre = document.getElementById('medirTorreNombre');
  if (medirTorreEmoji)  medirTorreEmoji.textContent  = torre.emoji || '🌿';
  if (medirTorreNombre) medirTorreNombre.textContent  = (torre.nombre || '').trim() || 'Instalación';

  // Pestaña Sistema — franja nutriente (una sola; antes había tarjeta duplicada debajo)
  const torreBandera = document.getElementById('torreBadgeBandera');
  const torreNomStrip = document.getElementById('torreBadgeStripNombre');
  const torreEC      = document.getElementById('torreBadgeEC');
  if (torreBandera) torreBandera.textContent = nut.bandera || '🧪';
  if (torreNomStrip) torreNomStrip.textContent = nut.nombre;
  if (torreEC) {
    const ecMinT = nut.ecObjetivo ? nut.ecObjetivo[0] : 900;
    const ecMaxT = nut.ecObjetivo ? nut.ecObjetivo[1] : 1400;
    torreEC.textContent = 'EC ' + ecMinT + '–' + ecMaxT + ' µS/cm · pH ' +
      (nut.pHRango ? nut.pHRango[0] + '–' + nut.pHRango[1] : '5.5–6.5');
  }

  try { refreshUbicacionInstalacionUI(); } catch (_) {}

  refreshConsejosSiVisible();
}

function cambiarNutriente() {
  // Abrir modal rápido de selección de nutriente
  const overlay = document.createElement('div');
  overlay.className = 'nut-quick-overlay';
  overlay.id = 'nutrienteQuickModal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Nutriente de esta torre');

  const nutActual = getNutrienteTorre().id;

  overlay.innerHTML = '<div class="nut-quick-sheet">' +
    '<div class="nut-quick-handle"></div>' +
    '<div class="nut-quick-title">🧪 Nutriente de esta torre</div>' +
    NUTRIENTES_DB.filter(n => n.id !== 'otro').map(n => {
      const activo = n.id === nutActual;
      const check = activo ? '<span class="nut-quick-check">&#10003;</span>' : '';
      return [
        '<div data-nut-id="' + n.id + '" class="nut-quick-row' + (activo ? ' nut-quick-row--active' : '') + '">',
        '<span class="nut-quick-flag">' + n.bandera + '</span>',
        '<div class="nut-quick-body"><div class="nut-quick-name">' + n.nombre + '</div>',
        '<div class="nut-quick-detail">' + n.detalle + '</div></div>',
        check + '</div>'
      ].join('');
    }).join('')
    +
    '<div id="nutOtroBtn" class="nut-quick-otro">' +
      '<span class="nut-quick-flag">🔬</span>' +
      '<div class="nut-quick-body"><div class="nut-quick-name">Otra marca</div>' +
      '<div class="nut-quick-detail">Configurar manualmente</div></div></div>' +
    '<button id="nutCancelarBtn" type="button" class="nut-quick-cancel">' +
      'Cancelar</button>' +
    '</div>';

  const cerrarNutModal = () => {
    a11yDialogClosed(overlay);
    overlay.remove();
  };
  overlay.onclick = (e) => { if (e.target === overlay) cerrarNutModal(); };
  document.body.appendChild(overlay);
  a11yDialogOpened(overlay);
  // Event delegation for nutriente cards
  overlay.querySelectorAll('[data-nut-id]').forEach(el => {
    el.addEventListener('click', function() {
      seleccionarNutrienteRapido(this.getAttribute('data-nut-id'));
    });
  });
  const otroBtn    = document.getElementById('nutOtroBtn');
  const cancelarBtn = document.getElementById('nutCancelarBtn');
  if (otroBtn) otroBtn.addEventListener('click', () => seleccionarNutrienteRapido('otro'));
  if (cancelarBtn) cancelarBtn.addEventListener('click', cerrarNutModal);
}

function seleccionarNutrienteRapido(id) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.nutriente = id;
  const tIdx = state.torreActiva || 0;
  if (state.torres && state.torres[tIdx]) {
    if (!state.torres[tIdx].config) state.torres[tIdx].config = { ...state.configTorre };
    state.torres[tIdx].config.nutriente = id;
  }
  saveState();
  const nutM = document.getElementById('nutrienteQuickModal');
  if (nutM) {
    a11yDialogClosed(nutM);
    nutM.remove();
  }
  aplicarConfigTorre();
  actualizarBadgesNutriente();
  updateDashboard();
  updateTorreStats();
  const nut = getNutrienteTorre();
  showToast('Nutriente activo: ' + nut.nombre + ' · dosis y checklist actualizados');
}

// ══════════════════════════════════════════════════
// NOTIFICACIONES LOCALES
// ══════════════════════════════════════════════════

async function pedirPermisoNotificaciones() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

async function enviarNotificacion(titulo, cuerpo, icono) {
  const ok = await pedirPermisoNotificaciones();
  if (!ok) return;
  new Notification(titulo, {
    body:  cuerpo,
    icon:  icono || '/icon-192.png',
    badge: '/icon-72.png',
    tag:   'hidrocultivo-' + Date.now(),
  });
}

function programarRecordatorios() {
  // Verificar si hay recordatorios pendientes cada vez que se abre la app
  const ahora = new Date();

  // Recordatorio recarga — cada 15 días
  if (state.ultimaRecarga) {
    const ultima = new Date(state.ultimaRecarga);
    const diasDesde = Math.floor((ahora - ultima) / 86400000);
    if (diasDesde >= 14) {
      enviarNotificacion(
        '💧 HidroCultivo — Recarga completa pendiente',
        'Han pasado ' + diasDesde + ' días desde la última recarga completa (vaciado + mezcla). Revisa el checklist en la app.',
        ''
      );
    }
  }

  // Recordatorio medición — si no has medido hoy
  if (state.mediciones && state.mediciones.length > 0) {
    const ultimaMed = state.mediciones[0];
    const hoy = ahora.toLocaleDateString('es-ES');
    if (ultimaMed.fecha !== hoy) {
      const diasSinMedir = state.mediciones[0].fecha ?
        Math.floor((ahora - new Date(state.mediciones[0].fecha.split('/').reverse().join('-'))) / 86400000) : 0;
      if (diasSinMedir >= 2) {
        enviarNotificacion(
          '📊 HidroCultivo — Mide hoy',
          'Llevas ' + diasSinMedir + ' días sin registrar mediciones. Mide EC, pH y temperatura.',
          ''
        );
      }
    }
  }

  // Alertas cosecha — plantas listas
  const nivelesActivos = getNivelesActivos();
  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach((c, ci) => {
      if (!c.variedad || !c.fecha) return;
      const dias = Math.floor((ahora - new Date(c.fecha)) / 86400000);
      const diasTotal = DIAS_COSECHA[c.variedad] || 50;
      if (dias >= diasTotal) {
        const labN = cultivoNombreLista(getCultivoDB(c.variedad), c.variedad);
        enviarNotificacion(
          '✂️ HidroCultivo — Cosecha lista',
          labN + ' en Nivel ' + (n+1) + ' Cesta ' + (ci+1) + ' lleva ' + dias + ' días. Lista para cosechar.',
          ''
        );
      }
    });
  });
}

// Botón para activar notificaciones en pestaña inicio
function mostrarBtnNotificaciones() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  const btn = document.getElementById('btnActivarNotif');
  if (btn) btn.style.display = 'flex';
}

// ══════════════════════════════════════════════════
// SERVICE WORKER + ARRANQUE
// ══════════════════════════════════════════════════

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js?v=2026-04-09-wordmark-fix1')
      .then(reg => console.log('[HidroCultivo] SW registrado:', reg.scope))
      .catch(err => console.warn('[HidroCultivo] SW error:', err));
  });
}

/** Safari iOS / iPadOS no dispara beforeinstallprompt: la instalación es manual. */
function esPlataformaIOSWeb() {
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS;
}

// Instalar PWA manualmente (Chrome/Edge/Android) o indicar pasos en iOS
function instalarPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') {
        showToast('✅ Instalando HidroCultivo…');
      }
      deferredPrompt = null;
    });
    return;
  }
  if (esPlataformaIOSWeb()) {
    showToast(
      'En iPhone/iPad: Safari → icono compartir ↑ → «Añadir a la pantalla de inicio». Así tendrás icono propio como una app.',
      false
    );
    return;
  }
  showToast(
    'Si no aparece el instalador, usa el menú del navegador («Instalar app» o «Crear acceso directo»). En escritorio suele salir tras usar la página un rato.',
    false
  );
}

// Detectar instalación PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  // Mostrar botón de instalación si está disponible
  const installBtn = document.getElementById('installPWABtn');
  if (installBtn) installBtn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const installBtn = document.getElementById('installPWABtn');
  if (installBtn) installBtn.style.display = 'none';
  showToast('✅ HidroCultivo instalada correctamente');
});

const SPLASH_MIN_VISIBLE_MS = 2600;
const splashShownAtMs = Date.now();

const hideSplash = () => {
  const splash = document.getElementById('splashScreen');
  if (splash) splash.style.display = 'none';
};

async function waitSplashMinimumVisible() {
  const elapsed = Date.now() - splashShownAtMs;
  if (elapsed >= SPLASH_MIN_VISIBLE_MS) return;
  await new Promise(resolve => setTimeout(resolve, SPLASH_MIN_VISIBLE_MS - elapsed));
}

// Failsafe para WebView: evita splash infinito si window.onload no llega.
setTimeout(hideSplash, 6000);

window.onload = () => {
  gestionarCambioVersionEnArranque();

  // ── Registrar listeners del PIN (evitar onclick inline) ──────────────────
  document.querySelectorAll('.pin-key[data-digit]').forEach(key => {
    key.addEventListener('click', () => pinPress(key.dataset.digit));
  });
  document.getElementById('pinDelBtn')?.addEventListener('click', pinDel);

  // ── Soporte teclado físico para el PIN ────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (document.getElementById('pinScreen').style.display === 'none') return;
    if (e.key >= '0' && e.key <= '9') pinPress(e.key);
    if (e.key === 'Backspace') pinDel();
  });

  // Secuencia recomendada: splash de marca breve -> desbloqueo (biometría/PIN).
  (async () => {
    await waitSplashMinimumVisible();
    hideSplash();

    // Si el usuario autenticó antes de terminar el splash (p. ej. versión anterior con PIN visible encima),
    // no volver a lockAppWithPin: con «recordar 0 min» hasValidAuthSession es false y congelaría la app ya iniciada.
    if (appBootstrapped) return;

    // Arranque protegido: sesión configurable (si expira, biometría -> PIN).
    if (hasValidAuthSession()) {
      unlockAndInitApp();
      return;
    }
    lockAppWithPin();
    setTimeout(async () => {
      if (appBootstrapped) return;
      const statusEl = document.getElementById('pinAuthStatus');
      const ok = await tryBiometricUnlock();
      if (appBootstrapped) return;
      if (ok) {
        unlockAndInitApp();
      } else {
        const pinErr = document.getElementById('pinErr');
        if (pinErr) pinErr.textContent = '';
        if (statusEl) statusEl.textContent = 'Biometría no disponible. Introduce tu PIN.';
      }
    }, 150);
  })();
};

// ══════════════════════════════════════════════════
// FOTODB — IndexedDB para fotos (sin límite de tamaño)
// ══════════════════════════════════════════════════
const FOTO_DB_NAME    = 'cultivaFotos';
const FOTO_DB_VERSION = 1;
const FOTO_STORE      = 'fotos';
let fotoDB = null;

function abrirFotoDB() {
  return new Promise((resolve, reject) => {
    if (fotoDB) { resolve(fotoDB); return; }
    const req = indexedDB.open(FOTO_DB_NAME, FOTO_DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(FOTO_STORE)) {
        db.createObjectStore(FOTO_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess  = e => { fotoDB = e.target.result; resolve(fotoDB); };
    req.onerror    = e => reject(e.target.error);
  });
}

async function guardarFotoIDB(key, fotoObj) {
  const db = await abrirFotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTO_STORE, 'readwrite');
    tx.objectStore(FOTO_STORE).put({ key, ...fotoObj });
    tx.oncomplete = () => resolve(key);
    tx.onerror    = e => reject(e.target.error);
  });
}

async function leerFotoIDB(key) {
  const db = await abrirFotoDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(FOTO_STORE, 'readonly');
    const req = tx.objectStore(FOTO_STORE).get(key);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function leerFotosPorPrefijo(prefix) {
  const db = await abrirFotoDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(FOTO_STORE, 'readonly');
    const store = tx.objectStore(FOTO_STORE);
    const rango = IDBKeyRange.bound(prefix, prefix + '\uFFFF');
    const req   = store.getAll(rango);
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

async function borrarFotoIDB(key) {
  const db = await abrirFotoDB();
  return new Promise((resolve) => {
    const tx = db.transaction(FOTO_STORE, 'readwrite');
    tx.objectStore(FOTO_STORE).delete(key);
    tx.oncomplete = resolve;
  });
}

// Migrar fotos antiguas que estaban en state.torre a IndexedDB
async function migrarFotosAIDB() {
  let migradas = 0;
  for (let n = 0; n < (state.torre || []).length; n++) {
    for (let c = 0; c < (state.torre[n] || []).length; c++) {
      const cesta = state.torre[n][c];
      if (!cesta || !cesta.fotos || cesta.fotos.length === 0) continue;
      for (let i = 0; i < cesta.fotos.length; i++) {
        const foto = cesta.fotos[i];
        if (!foto.data) continue; // ya migrada o sin data
        const key = 'foto_t0_n' + n + '_c' + c + '_' + (foto.isoDate || Date.now() + i).replace(/[:.]/g,'_');
        await guardarFotoIDB(key, foto);
        if (!cesta.fotoKeys) cesta.fotoKeys = [];
        cesta.fotoKeys.push(key);
        migradas++;
      }
      // Eliminar datos base64 del state (solo guardar keys)
      delete cesta.fotos;
    }
  }
  if (migradas > 0) {
    saveState();
    console.log('[HidroCultivo] Migradas', migradas, 'fotos a IndexedDB');
  }
  return migradas;
}
