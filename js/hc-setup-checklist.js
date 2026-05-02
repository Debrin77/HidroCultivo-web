/** Checklist integrado. Tras hc-setup-mediciones-logic.js. */
// ══════════════════════════════════════════════════
// CHECKLIST INTEGRADO — LÓGICA
// ══════════════════════════════════════════════════

let clChecked = new Set();
let clEsPrimeraVez = false;
/** 'recarga' = flujo completo (apagar, vaciar, cubrir…); 'primer_llenado' = depósito sin cultivo previo */
let clRutaChecklist = 'recarga';

function clEstadoChipHtml(estado) {
  const k = estado === 'bad' ? 'bad' : estado === 'warn' ? 'warn' : 'ok';
  const txt = k === 'ok' ? 'OK' : k === 'warn' ? 'Ajustar' : 'No recomendado';
  return '<span class="cultivo-status-chip cultivo-status-chip--' + k + '">' + txt + '</span>';
}

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

/** Solo hasta registrar la primera recarga completa; no depende de «primera vez en app» (evita modal fantasma al arrancar). */
function debePreguntarRutaChecklist() {
  return !state.ultimaRecarga;
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
      '<p class="checklist-dark-text checklist-dark-text--note">El checklist aplica a la <strong>instalación activa</strong> (revisa el nombre en Inicio, Mediciones o pestaña Sistema si tienes varias). Lo habitual es haber rellenado antes en <strong>Sistema</strong> las <strong>variedades y fechas</strong> en cada cesta: así las dosis al depósito y el EC orientativo encajan con lo implantado.</p>' +
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
  });
}

/** El nodo debe ser el último hijo de body para ganar el apilamiento frente a #app / velos. */
function ensureChecklistOverlayLastInBody() {
  const co = document.getElementById('checklistOverlay');
  if (co && co.parentNode) document.body.appendChild(co);
}

function abrirChecklistDespuesDeElegirRuta(esPrimeraVez) {
  try {
    ensureChecklistOverlayLastInBody();
    aplicarConfigTorre();

    const clTit = document.getElementById('checklistTitle');
    if (clTit) {
      const tCh = tipoInstalacionNormalizado(state.configTorre || {});
      const esKratkyTit =
        tCh === 'dwc' && typeof dwcGetModoCultivo === 'function' && dwcGetModoCultivo(state.configTorre || {}) === 'kratky';
      const titPrimer =
        tCh === 'nft' ? '🪴 Primer llenado NFT — checklist'
        : tCh === 'dwc' ? (esKratkyTit ? '🫧 Primer llenado Kratky — checklist' : '🫧 Primer llenado DWC — checklist')
        : '🌿 Primer llenado — torre vertical — checklist';
      const titRecarga =
        tCh === 'nft' ? '🪴 Recarga NFT — checklist'
        : tCh === 'dwc' ? (esKratkyTit ? '🫧 Recarga Kratky — checklist' : '🫧 Recarga DWC — checklist')
        : '🌿 Recarga — torre vertical — checklist';
      if (clRutaChecklist === 'primer_llenado') {
        clTit.textContent = titPrimer;
      } else {
        clTit.textContent = titRecarga;
      }
    }

    const closeBtn = document.getElementById('checklistCloseBtn');
    if (closeBtn) closeBtn.style.display = esPrimeraVez ? 'none' : 'flex';

    restaurarClCheckedDesdeEstado();
    renderChecklist();
    const co = document.getElementById('checklistOverlay');
    if (!co) {
      showToast('No se pudo abrir el checklist (interfaz). Recarga la página si persiste.', true);
      return;
    }
    co.classList.add('open');
    updateClProgress();
    a11yDialogOpened(co);
  } catch (e) {
    console.error('abrirChecklistDespuesDeElegirRuta', e);
    showToast('Error al abrir el checklist: ' + (e && e.message ? e.message : 'desconocido'), true);
  }
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
  const pHRango =
    typeof torreGetPhRangoObjetivo === 'function' ? torreGetPhRangoObjetivo(nut, cfg) : (nut.pHRango || [5.5, 6.5]);
  const orden  = (nut.orden && nut.orden.length >= nut.partes) ? nut.orden : ['Parte A', 'Parte B', 'Parte C'];
  const suf    = dosisSufijoNutriente(nut);
  const phDownRef =
    nut && (nut.id === 'campeador' || nut.id === 'campeador_hidro' || nut.id === 'campeador_fruto')
      ? 'pH− Campeador Down'
      : 'pH−';
  const pasos  = [];
  const esDwcNut = cfg.tipoInstalacion === 'dwc';
  const esDwcKratky =
    esDwcNut && typeof dwcGetModoCultivo === 'function' && dwcGetModoCultivo(cfg) === 'kratky';
  const faPl = typeof getFactorArranquePlantulaHidro === 'function' ? getFactorArranquePlantulaHidro() : 1;
  const notaArranquePl =
    faPl < 1
      ? ' Plántulas en hidro (primeras ~12 d): dosis iniciales atenuadas (~' +
        Math.round((1 - faPl) * 100) +
        '%) respecto a planta establecida; sube según observación.'
      : '';

  // PASO 4.2 — CalMag (solo si el usuario / agua lo activan)
  if (usarCalMagEnRecarga() && mlCM > 0) {
    pasos.push({
      id:'4.2', seccion:null, paso:'4.2',
      desc: 'Añadir CalMag: ' + mlCM + ' ml — remover 2 min',
      nota:
        (faPl < 1
          ? 'Arranque suave: menos CalMag que en mezcla «adulta»; tras estos ml: ~' + ecCM + ' µS estimados. '
          : 'Con agua destilada u ósmosis el objetivo habitual es ~' + EC_CALMAG_BASE + ' µS/cm (~' + (EC_CALMAG_BASE / 1000).toFixed(2) + ' mS/cm). Tras estos ml: ~' + ecCM + ' µS estimados. ') +
        (cfg.agua === 'grifo' ? 'Con agua del grifo, verificar si es necesario.' : '') +
        notaArranquePl,
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
        '. EC objetivo: ' + ecFinal + ' µS/cm.' + notaArranquePl,
      campos:[{ id:'clEcAB', label:'EC tras mezcla:', unit:'µS/cm', type:'number', step:'10', placeholder: String(ecFinal) }]
    });
  } else if (nut.partes === 2) {
    pasos.push({
      id:'4.3', seccion:null, paso:'4.3', alert:true,
      desc: 'Agitar ' + orden[0] + '. Añadir ' + mlP0 + suf + ' — remover 2 min',
      nota: '⚠️ NUNCA mezclar ' + orden[0] + ' y ' + orden[1] + ' puros — añade la primera parte, remueve, luego la segunda. La EC útil es tras las dos partes (paso 4.4).' +
        (refNut.mlPorLitro.length >= 2 && Math.abs(refNut.mlPorLitro[0] - refNut.mlPorLitro[1]) < 1e-6
          ? ' Cantidades calculadas para ~' + ecFinal + ' µS/cm tras CalMag (modelo orientativo).'
          : '') +
        notaArranquePl,
    });
    pasos.push({
      id:'4.4', seccion:null, paso:'4.4',
      desc: 'Agitar ' + orden[1] + '. Añadir ' + mlP1 + suf + ' — remover 3 min',
      nota: 'EC objetivo de la mezcla: ~' + ecFinal + ' µS/cm.' + notaArranquePl,
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
      nota: 'EC objetivo de la mezcla: ~' + ecFinal + ' µS/cm.' + notaArranquePl,
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
      ? nut.nombre + ' lleva <strong>buffer de pH</strong>: sube solo hasta <strong>pH 5</strong>; en las horas siguientes tenderá al rango normal. Si te pasas, corrige con <strong>' + phDownRef + '</strong>.'
      : nut.nombre + ' sin buffer: ajusta al rango ' + pHRango[0] + '–' + pHRango[1] + ' con pH+ poco a poco (y usa <strong>' + phDownRef + '</strong> si te excedes). Anota los ml.',
    campos:[{ id:'clPhMasPaso46', label:'ml pH+ añadidos:', type:'number', step:'0.5', placeholder: tieneBuffer ? '3' : '5' }]
  });

  pasos.push({
    id:'4.7', seccion:null, paso:'4.7',
    desc: esDwcNut
      ? (esDwcKratky
        ? ('Confirmar cámara de aire y pH ' + (tieneBuffer ? '~5,0' : pHRango[0]) + ' — raíces con oxígeno por espacio de aire (Kratky)')
        : ('Encender el <strong>aireador</strong> con pH ' + (tieneBuffer ? '~5,0' : pHRango[0]) + ' — raíces oxigenadas en el depósito'))
      : 'Encender bomba con pH ' + (tieneBuffer ? '~5,0' : pHRango[0]) + ' — seguro para las raíces',
    nota: tieneBuffer
      ? 'No corrijas más el pH hasta medir con calma (recordatorio en 4.8 y registro en paso 6).'
      : (esDwcNut
        ? (esDwcKratky
          ? 'Kratky: controlar temperatura y volumen para mantener oxigenación por cámara de aire; seguimiento en <strong>Mediciones</strong>.'
          : 'DWC: el difusor homogeneiza y oxigena; control de nivel y nutrientes en <strong>Mediciones</strong>.')
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
  const esDwcK =
    esDwc && typeof dwcGetModoCultivo === 'function' && dwcGetModoCultivo(cfg) === 'kratky';
  const esTorre = !esNft && !esDwc;
  const desc = 'Preparar solución provisional en cubo (~5L) con agua destilada/ósmosis: ' +
    p1Partes.join(' + ') + '. Remover bien.' +
    (esNft ? ' En NFT, con esa mezcla humedece copas o el arranque de cada canal antes del paro prolongado.' : '') +
    (esDwc ? ' En DWC, humedece coronas/net cups o el arranque de cada maceta antes del vaciado prolongado.' : '');
  const stockExtra = orden.slice(0, partes).join(', ');
  const phStockTxt =
    nut && (nut.id === 'campeador' || nut.id === 'campeador_hidro' || nut.id === 'campeador_fruto')
      ? 'pH+ y pH− Campeador Down'
      : 'pH+ y pH−';
  let p2 = 'Verificar stock: agua destilada u ósmosis' +
    (usarCalMagEnRecarga() ? ', CalMag' : '') +
    ', ' + stockExtra + ', ' + phStockTxt + ', agua oxigenada 3%, esponja';
  if (esNft) p2 += ', cepillo suave o tubo flexible para canales, comprobación de pendiente';
  if (esDwc && !esDwcK) p2 += ', repuestos de difusor o piedra porosa, manguera de aire';
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
  const vol =
    typeof litrosDepositoParaChecklist === 'function'
      ? litrosDepositoParaChecklist(cfg)
      : Number(cfg.volDeposito);
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
  if (hayUso) return true;

  // DWC: depósito y nutriente ya guardados en Sistema (sin medición previa ni plantas) — permitir checklist
  if (cfg.tipoInstalacion === 'dwc') {
    const cap =
      typeof getDwcCapacidadLitrosDesdeConfig === 'function'
        ? getDwcCapacidadLitrosDesdeConfig(cfg)
        : null;
    const volManual = Number(cfg.volDeposito);
    const dwcVolOk =
      (cap != null && cap >= 1) ||
      (Number.isFinite(volManual) && volManual >= 1 && volManual <= 800);
    if (dwcVolOk) return true;
  }

  return false;
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
function aplicarConfigDesdeOverlayChecklistRecarga(tipo, vol, agua, nutId, volMezclaOpt, dwcModoOpt) {
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
    torreObjetivoCultivo: 'final',
  };

  const dwcModo = (typeof dwcNormalizeModo === 'function' ? dwcNormalizeModo(dwcModoOpt) : 'aireado');

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
      dwcModo: dwcModo,
      numNiveles: NUM_NIVELES,
      numCestas: NUM_CESTAS,
    });
    if (dwcModo === 'kratky') delete state.configTorre.dwcEntradaAireManguera;
    try {
      dwcPersistSnapshotMaxCestasEnCfg(state.configTorre);
    } catch (eDw) {}
    state.torre = [];
    for (let n = 0; n < NUM_NIVELES; n++) {
      state.torre.push([]);
      for (let c = 0; c < NUM_CESTAS; c++) {
        state.torre[n].push({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
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
        state.torre[n].push({ variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] });
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
  const volDesdeCfg =
    typeof litrosDepositoParaChecklist === 'function'
      ? litrosDepositoParaChecklist(cfg)
      : (Number.isFinite(Number(cfg.volDeposito)) && Number(cfg.volDeposito) > 0 ? Number(cfg.volDeposito) : null);
  const volIni =
    volDesdeCfg != null && Number.isFinite(volDesdeCfg) && volDesdeCfg > 0
      ? Math.round(volDesdeCfg)
      : 20;
  const capRef =
    volDesdeCfg != null && Number.isFinite(volDesdeCfg) && volDesdeCfg > 0 ? volDesdeCfg : volIni;
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

  const dwcModoIni =
    cfg && cfg.tipoInstalacion === 'dwc' && typeof dwcGetModoCultivo === 'function'
      ? dwcGetModoCultivo(cfg)
      : 'aireado';

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
      '<div id="cldDwcModoWrap" style="' + (tipoIni === 'dwc' ? '' : 'display:none;') + '">' +
        '<label class="checklist-dark-field-label">Modo DWC</label>' +
        '<select id="cldDwcModo" class="checklist-dark-field-input checklist-dark-select checklist-dark-select--mb12">' +
          '<option value="aireado"' + (dwcModoIni === 'aireado' ? ' selected' : '') + '>DWC aireado (bomba de aire)</option>' +
          '<option value="kratky"' + (dwcModoIni === 'kratky' ? ' selected' : '') + '>Kratky (sin aireador)</option>' +
        '</select>' +
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
    const dwcModo = document.getElementById('cldDwcModo')?.value || 'aireado';
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
    aplicarConfigDesdeOverlayChecklistRecarga(tipo, vol, agua, nutId, mezOpt, dwcModo);
    abrirChecklist(esPrimeraVezChecklist);
  };

  document.getElementById('cldBtnContinuar').addEventListener('click', continuar);
  overlay.querySelectorAll('input[name="cldTipoInst"]').forEach(r => {
    r.addEventListener('change', () => {
      const tipoSel = (overlay.querySelector('input[name="cldTipoInst"]:checked') || {}).value || 'torre';
      const wrap = document.getElementById('cldDwcModoWrap');
      if (wrap) wrap.style.display = tipoSel === 'dwc' ? '' : 'none';
    });
  });
  document.getElementById('cldBtnAsistente').addEventListener('click', () => {
    cerrarOverlayChecklistDatosInstalacion();
    try { abrirSetup(); } catch (e) {}
  });
  document.getElementById('cldBtnDespues').addEventListener('click', () => {
    cerrarOverlayChecklistDatosInstalacion();
    showToast('Cuando quieras: Historial → checklist o Inicio → recarga');
  });
}

function getCLPasos() {
  const cfg = state.configTorre || {};
  const vol = getVolumenMezclaLitros(cfg);
  const ecOpt = getECOptimaTorre();
  const ecMin = ecOpt.min;
  const ecMax = ecOpt.max;
  const nut = getNutrienteTorre();
  const pHR =
    typeof torreGetPhRangoObjetivo === 'function' ? torreGetPhRangoObjetivo(nut, cfg) : (nut.pHRango || [5.5, 6.5]);
  const phObj = ((pHR[0] + pHR[1]) / 2).toFixed(1);
  const ecMed = Math.round((ecMin + ecMax) / 2);
  const ecRecTarget = getRecargaEcMetaMicroS();
  const pre = construirTextoChecklistPreliminar();
  const nNiv = cfg.numNiveles || NUM_NIVELES;
  const esNft = cfg.tipoInstalacion === 'nft';
  const esDwc = cfg.tipoInstalacion === 'dwc';
  const esDwcK =
    esDwc && typeof dwcGetModoCultivo === 'function' && dwcGetModoCultivo(cfg) === 'kratky';
  const esTorre = !esNft && !esDwc;
  const checklistTieneCalentador = Array.isArray(cfg.equipamiento) && cfg.equipamiento.includes('calentador');
  const nftHyd = esNft ? getNftHidraulicaDesdeConfig(cfg) : null;
  const nftReco = esNft && typeof nftRecomendacionCultivoDesdeConfig === 'function'
    ? nftRecomendacionCultivoDesdeConfig(cfg)
    : null;
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
      nota: 'El <strong>rango de EC</strong> por cultivos lo marcas en <strong>Sistema</strong> (grupos de planta); en <strong>PC·2</strong> pones el <strong>EC numérico</strong> (µS/cm) objetivo de esta mezcla.' +
        (esDwc
          ? ' En DWC, estos litros son de <strong>solución útil</strong> (nutrientes), no la geometría de la tapa para cestas. Si el depósito es <strong>cilíndrico</strong>, el volumen sale de <strong>Ø interior</strong> y <strong>profundidad/altura útil del líquido</strong> (Sistema / asistente); el llenado seguro sigue usando la cesta y el sustrato. Si es <strong>troncopiramidal</strong>, indica el volumen útil medido.'
          : ''),
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
        ...(esDwc ? [{
          id: 'clPrimerDwcModo', label: 'Modo DWC', type: 'select', clase: 'wide',
          opcionesVal: [
            { value: 'aireado', label: 'DWC aireado (bomba de aire)', selected: !esDwcK },
            { value: 'kratky', label: 'Kratky (sin aireador)', selected: esDwcK },
          ],
          _clOnchange: 'onPrimerLlenadoDwcModoDesdeChecklist()'
        }] : []),
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
        ? (esDwcK
          ? ('Sensores o medidores en tu Kratky (' + hwLista.join(', ') + '): mide en el depósito con mezcla homogénea y superficie estable; sin remover en exceso.')
          : ('Sensores o medidores en tu DWC (' + hwLista.join(', ') + '): mide en el depósito con mezcla homogénea; con el aireador unos minutos en marcha y sin burbujas pegadas a la sonda.'))
        : ('Sensores o medidores en tu torre vertical (' + hwLista.join(', ') + '): comprueba calibración y que la lectura sea representativa (agua homogénea, tiempo de espera con difusor cumplido).'),
    nota:'Sin telemática en esta app: si contrastas sonda y pen, usa el criterio único que vas a registrar. El <strong>registro</strong> de esta recarga lo cierras en el paso <strong>6.4</strong> y lo verás en <strong>Mediciones</strong>.',
  }] : [];

  const nftBomb = esNft ? getNftBombaDesdeConfig(cfg) : null;

  const pasosDwcOxigenacion = esDwc && !esDwcK
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
        {
          id: 'D0b',
          seccion: null,
          paso: 'D·0b',
          desc:
            'Rejilla DWC activa: valida si aplicar <strong>máxima geométrica</strong> o <strong>recomendada por objetivo</strong> antes de cerrar la recarga.',
          nota:
            (function () {
              const objKey =
                typeof dwcGetObjetivoCultivo === 'function' ? dwcGetObjetivoCultivo(cfg) : 'final';
              const spec =
                typeof dwcGetObjetivoSpec === 'function'
                  ? dwcGetObjetivoSpec(objKey)
                  : { label: 'Planta adulta (tamaño completo)', litrosTxt: '3–5 L/planta', ccTxt: '15–25 cm' };
              const modoPri =
                typeof dwcGetRejillaModoPreferido === 'function'
                  ? dwcGetRejillaModoPreferido(cfg)
                  : (cfg.dwcRejillaModoPreferido === 'max' ? 'max' : 'objetivo');
              const modoTxt = modoPri === 'max' ? 'máxima geométrica' : 'recomendada por objetivo';
              const reco =
                typeof dwcRecomendacionCultivoDesdeConfig === 'function'
                  ? dwcRecomendacionCultivoDesdeConfig(cfg)
                  : null;
              let cestaTxt = '';
              if (reco) {
                cestaTxt =
                  ' Cesta: <strong>' +
                  reco.perfil.cestaTxt +
                  '</strong> · actual <strong>' +
                  (reco.rimActualMm != null ? reco.rimActualMm + ' mm' : '—') +
                  '</strong> · ' + clEstadoChipHtml(reco.estado) + '.';
              }
              return (
                'Objetivo activo: <strong>' +
                spec.label +
                '</strong> (' +
                spec.ccTxt +
                ' c-c). Botón principal: <strong>' +
                modoTxt +
                '</strong>. Rejilla/tapa y litros útiles se validan por separado.' +
                cestaTxt
              );
            })(),
        },
      ]
    : (esDwcK
      ? [{
          id: 'D0K',
          seccion: '🫧 Kratky — control de seguridad',
          paso: 'D·0',
          desc: 'Sin aireador: prioriza estabilidad térmica y nivel de solución. Mantén siempre cámara de aire entre nutriente y base del sustrato.',
          nota: 'Objetivo práctico: agua fresca (ideal 17–21°C, evitar >22°C sostenidos) y reposición sin sobrellenar (0,5–1 cm por debajo de base del sustrato).',
        }]
      : []);

  const pasosTorreObjetivo = esTorre
    ? [{
      id: 'Tobj',
      seccion: '🧭 Torre vertical — objetivo de cultivo',
      paso: 'T·obj',
      desc: 'Confirmar si esta torre está orientada a <strong>baby leaf</strong> o <strong>planta completa</strong>.',
      nota: (function () {
        const sp = typeof torreGetObjetivoSpec === 'function' && typeof torreGetObjetivoCultivo === 'function'
          ? torreGetObjetivoSpec(torreGetObjetivoCultivo(cfg))
          : { label: 'Planta adulta (tamaño completo)', densidadTxt: '15–25 cm c-c', cicloTxt: 'cosecha completa' };
        return (
          'Objetivo activo: <strong>' +
          sp.label +
          '</strong> · densidad orientativa <strong>' +
          sp.densidadTxt +
          '</strong> · ' +
          sp.cicloTxt +
          '. Cambia el objetivo en <strong>Sistema</strong> si buscas otro ritmo de cosecha.' +
          ' Para alinear EC/pH de <strong>Medir</strong> con cada cesta, en Sistema indica <strong>variedad</strong>, ' +
          '<strong>fecha de trasplante al hidro</strong> (día 0 en el sistema) y <strong>procedencia</strong> (vivero vs germinación propia).'
        );
      })(),
    }]
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
    }, {
      id: 'Ncult',
      seccion: null,
      paso: 'N·cult',
      desc:
        'Verificar que canal, cestas y separación están alineados con el cultivo principal antes de cerrar la recarga.',
      nota:
        nftReco
          ? ('Cultivo: <strong>' +
            nftReco.perfil.etiqueta +
            '</strong> · canal <strong>Ø' +
            nftReco.perfil.canalMinMm +
            '–' +
            nftReco.perfil.canalMaxMm +
            ' mm</strong> · cesta <strong>' +
            nftReco.perfil.cestaTxt +
            '</strong> · separación <strong>' +
            nftReco.perfil.sepTxt +
            '</strong> · actual <strong>' +
            (nftReco.diamActualMm != null ? 'Ø' + nftReco.diamActualMm + ' mm' : '—') +
            '</strong> · ' +
            clEstadoChipHtml(nftReco.estado) +
            '.')
          : 'Sin datos suficientes para validar por cultivo. Completa canal y cultivos en Sistema o Asistente.',
    }]
    : [];
  const primerLlenado = clRutaChecklist === 'primer_llenado';
  const checklistInterior =
    typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior(cfg);
  /** Recarga completa sin haber registrado antes una recarga en la app: sin parar bomba ni vaciar solución usada. */
  const recargaCompletaPrimeraEnApp = !primerLlenado && !state.ultimaRecarga;

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

  const pasoP3Toldo = {
    id:'P3', seccion:null, paso:'P3',
    desc:'Poner toldo si hay sol directo o temperatura > 20°C',
    nota: esNft ? 'En NFT el sol directo seca rápido la película y las plántulas al inicio del canal'
      : esDwc ? 'En DWC el sol calienta depósito y follaje; toldo y depósito opaco reducen estrés y algas'
      : 'Reduce transpiración durante los 45 min sin bomba',
  };
  const pasosPaso1ApagarRecarga = [
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
  ];
  const pasosPaso2LimpiezaRecargaConUso = [
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
  const pasosPaso2SoloLimpiezaDepositoVacio = [
  { id:'2.3', seccion:'🧹 Paso 2 — Limpiar depósito', paso:'2.3',
    desc:'Limpiar paredes con agua oxigenada 3%: 15ml en 5L agua. Frotar con esponja suave',
    nota:'Especial atención a manchas rojizas · Si es la primera recarga en la app y el depósito no tenía cultivo previo, basta con limpiar el interior vacío (sin vaciar solución usada).' },
  { id:'2.4', seccion:null, paso:'2.4',
    desc:'Aclarar con agua limpia — mínimo 2 veces',
    nota:'Eliminar todo residuo de agua oxigenada' },
  ];

  const notaP1Prep =
    'Para mantener raíces húmedas durante los 45 min sin bomba · Dosis escaladas desde tu depósito de ' + vol + 'L y ' + nut.nombre +
    (esNft ? ' · NFT: prioriza humedad en raíces expuestas y entradas de canal.' : '') +
    (esDwc ? ' · DWC: prioriza raíces sumergidas y oxigenación al reanudar.' : '') +
    (recargaCompletaPrimeraEnApp
      ? ' Si es la primera recarga en la app sin paro de bomba previo, el bloque «apagar» no aplica: esta mezcla en cubo sigue sirviendo como referencia de dosis o para humedecer al montar cestas.'
      : '');
  const notaP2Prep =
    'Comprar lo faltante antes de empezar' +
    (recargaCompletaPrimeraEnApp ? ' (incluye limpieza aunque no vacíes solución usada).' : '');

  const pasosPrepRecarga = [
  { id:'P1', seccion:'🌙 Preparación', paso:'P1',
    desc: pre.descP1,
    nota: notaP1Prep,
    campos:[{ id:'clEcProvisional', label:'EC provisional:', unit:'mS/cm', type:'number', step:'0.01', placeholder: pre.placeholderProv }] },
  { id:'P2', seccion:null, paso:'P2',
    desc: pre.descP2,
    nota: notaP2Prep },
  ];
  if (!checklistInterior) pasosPrepRecarga.push(pasoP3Toldo);

  const pasosCabeceraRecargaCompleta = [
  ...pasosPrepRecarga,
  ...(recargaCompletaPrimeraEnApp ? [] : pasosPaso1ApagarRecarga),
  ...(recargaCompletaPrimeraEnApp ? pasosPaso2SoloLimpiezaDepositoVacio : pasosPaso2LimpiezaRecargaConUso),
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
        ? (esDwcK
          ? 'Quita polvo y residuos. En Kratky la limpieza y estabilidad térmica son clave desde el primer día.'
          : 'Quita polvo y residuos; enjuaga difusores y líneas de aire nuevas. DWC depende de agua limpia y burbujeo uniforme desde el primer día.')
        : 'Quita polvo, grasa o restos industriales. Con tubo/bomba nuevos, un enjuague previo evita residuos en la primera mezcla.' },
  { id:'PL2', seccion:null, paso:'PL·2',
    desc:'Aclarar con agua limpia — mínimo 2 veces',
    nota:'Sin olor a oxigenada antes de llenar con agua para el paso 4 (mezcla nutritiva).' },
  ];
  const usaCampeadorPhDown =
    nut && (nut.id === 'campeador' || nut.id === 'campeador_hidro' || nut.id === 'campeador_fruto');
  const etiquetaPhDown = usaCampeadorPhDown ? 'pH− Campeador Down' : 'pH−';

  return [
    ...(primerLlenado ? [...pasosConfigPrimerLlenado, ...pasosLimpiezaPrimerLlenado] : pasosCabeceraRecargaCompleta),
    ...pasosTorreObjetivo,
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
        ? (esDwcK
          ? 'Kratky: comprobar nivel estable, cámara de aire y ausencia de olores/espuma anómalos en el depósito'
          : 'Con el aireador en marcha (24 h): burbujeo uniforme en todo el depósito; sin zonas muertas ni ruido de succión en seco')
        : 'Confirmar que la bomba lleva funcionando correctamente durante la espera',
    campos:[
      { id:'clHoraEncendido', label:'Hora:', type:'time', clase:'wide' },
      { id:'clMinSinBomba', label: esDwc ? (esDwcK ? 'Min sin revisión de nivel:' : 'Min sin aireador:') : 'Min sin bomba:', type:'number', placeholder:'40' }
    ] },
  { id:'5.2', seccion:null, paso:'5.2',
    desc: esDwc
      ? (esDwcK
        ? 'Revisar cámara de aire y nivel (0,5–1 cm bajo base del sustrato); no sobrellenar'
        : 'Revisar difusores y caudal de aire (piedras porosas, obstrucciones, fugas en manguera)')
      : esNft
        ? 'Revisar circuito y racores: película continua y sin fugas en alimentación o retornos'
        : 'Si el depósito lleva piedra o difusor de aire, encenderlo; si solo riegas por bomba, confirma circulación estable por la torre' },
  ...(checklistTieneCalentador ? [{
    id:'5.3', seccion:null, paso:'5.3',
    desc:'Encender calentador — objetivo 20°C',
    campos:[{ id:'clTempAguaInicial', label:'Temp inicial:', unit:'°C', type:'number', step:'0.1', placeholder:'17' }],
  }] : []),
  { id:'5.4', seccion:null, paso:'5.4',
    desc: esDwc
      ? (esDwcK ? 'Esperar 20 minutos con nivel estable antes de medir' : 'Esperar 20 minutos con el aireador en marcha antes de medir')
      : esNft
        ? 'Esperar unos minutos con la bomba en marcha hasta homogeneizar la mezcla en depósito y canales antes de medir'
        : 'Esperar ~20 min con bomba (y difusor de aire en depósito si lo usas) en marcha antes de medir',
    nota: nut.pHBuffer
      ? '20 min homogeneizan la mezcla. Con buffer de pH, las correcciones finas mejor tras unas horas y en <strong>Mediciones</strong> (paso 6 y días siguientes). Si te pasas al subir, corrige con <strong>' + etiquetaPhDown + '</strong>.'
      : 'Con difusor 20 min bastan para una lectura orientativa; afinar EC/pH después en Mediciones si hace falta (usa <strong>' + etiquetaPhDown + '</strong> si el pH queda alto por exceso de pH+).' },

  ...pasosPrev6,

  { id:'6.4', seccion: paso6SeccionTitulo || '📊 Paso 6 — Registro', paso:'6.4',
    desc:'Registro en la app — valores de esta recarga / mezcla',
    nota:'Las lecturas intermedias las haces cuando te encaje; aquí cierras lo que quieres guardar ahora. Puedes seguir corrigiendo EC y pH desde <strong>Mediciones</strong>. Corrector recomendado: <strong>' + etiquetaPhDown + '</strong>.',
    campos:[
      { id:'clEcFinalReg', label:'EC final:', unit:'µS/cm', type:'number', placeholder: String(ecRecTarget) },
      { id:'clPhFinalReg', label:'pH final:', type:'number', step:'0.1', placeholder: phObj },
      { id:'clPhPlusRegFinal', label:'ml pH+ añadidos en total (opcional):', type:'number', step:'0.1', placeholder:'0' },
      { id:'clPhMinusRegFinal', label:'ml ' + etiquetaPhDown + ' añadidos (opcional):', type:'number', step:'0.1', placeholder:'0' },
      { id:'clTempAgua', label:'Temp agua:', unit:'°C', type:'number', step:'0.1', placeholder:'20' },
      { id:'clVolFinal', label:'Volumen:', unit:'L', type:'number', step:'0.5', placeholder: String(vol) }
    ] },

  { id:'7.1', seccion:'✅ Paso 7 — Verificación final', paso:'7.1',
    desc: esNft
      ? ('Película de agua visible en todos los canales; retorno limpio al depósito; sin ruidos de cavitación en la bomba')
      : esDwc
        ? 'Burbujeo estable; temperatura de agua razonable; depósito opaco y tapa bien cerrada'
        : ('Verificar que la bomba funciona y el agua circula por los ' + nNiv + ' niveles de la torre vertical') },
  ...(primerLlenado ? [] : [{
    id:'7.2', seccion:null, paso:'7.2',
    desc: esNft
      ? 'Tras 30 min: plantas turgentes y entradas de canal sin marchitez; sin “chorros” que dañen plántulas'
      : esDwc
        ? 'Tras 30 min: follaje turgente; sin olor rancio ni espuma excesiva en el depósito'
        : 'Observar las plantas 30 minutos después — sin signos de estrés',
    campos:[{
      id:'clEstadoPlantas', label:'Estado:', type:'select',
      opciones: esDwc
        ? (esDwcK
          ? ['Turgentes — correcto', 'Ligeramente lacias', 'Muy lacias — revisar nivel / temperatura']
          : ['Turgentes — correcto', 'Ligeramente lacias', 'Muy lacias — revisar aireador / oxígeno'])
        : ['Turgentes — correcto', 'Ligeramente lacias', 'Muy lacias — revisar bomba / circulación']
    }],
  }]),
  { id:'7.3', seccion:null, paso:'7.3',
    desc: esNft
      ? 'Anotar en Historial / Mediciones; los próximos días ajusta caudal o pendiente si algún canal se queda corto de película'
      : esDwc
        ? (esDwcK
          ? 'Registrar en Historial / Mediciones; vigilar sobre todo temperatura del agua, EC y volumen seguro en días siguientes'
          : 'Registrar en Historial / Mediciones; vigilar temperatura del agua, EC y estado del aireador en los días siguientes')
        : 'Ejecutar cálculo de riego en la app — verificar que los valores son correctos' },
]; }

function getCLTotal() { return getCLPasos().length; }

/**
 * @param {boolean} esPrimeraVez - Flujo onboarding / primera recarga en app (cierra checklist con confirmación).
 * @param {{ saltarPreguntaRuta?: boolean }} [opts] - Tras elegir ruta en el panel post-asistente: no repetir el modal de ruta.
 */
function abrirChecklist(esPrimeraVez = false, opts) {
  if (typeof sistemaEstaOperativa === 'function' && !sistemaEstaOperativa()) {
    showToast(typeof getMensajeStandbyContinuar === 'function'
      ? getMensajeStandbyContinuar()
      : '⏸ Sistema en stand-by / descanso. Reactiva modo operativa para continuar.', true);
    return;
  }
  clEsPrimeraVez = esPrimeraVez;
  ensureChecklistOverlayLastInBody();
  const saltarPreguntaRuta = !!(opts && opts.saltarPreguntaRuta);

  if (!checklistInstalacionCompletaParaRecarga()) {
    mostrarOverlayChecklistDatosInstalacion(esPrimeraVez);
    return;
  }

  if (!saltarPreguntaRuta && debePreguntarRutaChecklist()) {
    mostrarOverlayRutaChecklistRecarga(esPrimeraVez);
    return;
  }

  if (!saltarPreguntaRuta) elegirClRutaChecklistAlAbrir();
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
  try {
    if (typeof refreshModoInfoText === 'function') refreshModoInfoText();
  } catch (_) {}
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

function onPrimerLlenadoDwcModoDesdeChecklist() {
  const sel = document.getElementById('clPrimerDwcModo');
  const raw = sel && sel.value;
  if (raw !== 'aireado' && raw !== 'kratky') return;
  initTorres();
  if (!state.configTorre) state.configTorre = {};
  if (state.configTorre.tipoInstalacion !== 'dwc') return;
  state.configTorre.dwcModo =
    typeof dwcNormalizeModo === 'function' ? dwcNormalizeModo(raw) : (raw === 'kratky' ? 'kratky' : 'aireado');
  if (state.configTorre.dwcModo === 'kratky') delete state.configTorre.dwcEntradaAireManguera;
  guardarEstadoTorreActual();
  saveState();
  aplicarConfigTorre();
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
    dwcObjetivoCultivo:
      (state.configTorre && state.configTorre.tipoInstalacion === 'dwc')
        ? (state.configTorre.dwcObjetivoCultivo || (typeof dwcGetObjetivoCultivo === 'function' ? dwcGetObjetivoCultivo(state.configTorre) : 'final'))
        : '',
    dwcModo:
      (state.configTorre && state.configTorre.tipoInstalacion === 'dwc')
        ? (typeof dwcGetModoCultivo === 'function' ? dwcGetModoCultivo(state.configTorre) : (state.configTorre.dwcModo || 'aireado'))
        : '',
    dwcRejillaModoPreferido:
      (state.configTorre && state.configTorre.tipoInstalacion === 'dwc')
        ? (state.configTorre.dwcRejillaModoPreferido || (typeof dwcGetRejillaModoPreferido === 'function' ? dwcGetRejillaModoPreferido(state.configTorre) : 'objetivo'))
        : '',
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
    dwcObjetivoCultivo: recargaData.dwcObjetivoCultivo || '',
    dwcModo: recargaData.dwcModo || '',
    dwcRejillaModoPreferido: recargaData.dwcRejillaModoPreferido || '',
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
      ((state.configTorre && state.configTorre.tipoInstalacion === 'dwc')
        ? ` · DWC modo: ${recargaData.dwcModo || '-'} · Objetivo: ${recargaData.dwcObjetivoCultivo || '-'} · Rejilla: ${recargaData.dwcRejillaModoPreferido || '-'}`
        : '') +
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
}

