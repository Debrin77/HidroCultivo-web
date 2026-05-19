/** NFT: bomba, resúmenes, SVG de esquemas (hasta el cierre del último builder antes de buildNftActiveDiagramSvg). Tras hc-setup-wizard-dwc.js. */
/**
 * Caudal y potencia orientativos NFT (24 h). Combina: (1) sección de lámina en el canal y velocidad típica de película
 * en NFT doméstico (~0,08–0,15 m/s según pendiente y referencias de cultivo en película); (2) regla empírica por metro
 * de canal alineada con tablas habituales de diseño; (3) pérdidas en tubería de alimentación + elevación indicada;
 * (4) potencia vía potencia hidráulica aproximada y rendimiento conservador de mini-bombas. La decisión final debe
 * basarse en la curva Q–H del fabricante (placa de la bomba).
 * @param {object|null|undefined} canalGeom si null/undefined, usa valores por defecto (Ø90 redondo, 3 mm, longitud auto).
 * @param {number} [alturaBombeoCm] altura vertical desde nivel de agua / bomba hasta entrada al primer canal (0 = omitir).
 */
function calcularBombaNftParam(nCanales, huecosPorCanal, pendientePct, diamTuboMm, canalGeom, alturaBombeoCm) {
  const nChRaw = parseInt(String(nCanales), 10);
  const nHxRaw = parseInt(String(huecosPorCanal), 10);
  if (!Number.isFinite(nChRaw) || nChRaw < 1 || !Number.isFinite(nHxRaw) || nHxRaw < 2) return null;
  const nCh = Math.min(Math.max(nChRaw, 1), 24);
  const nHx = Math.min(Math.max(nHxRaw, 2), 30);
  const pendRaw = parseInt(String(pendientePct), 10);
  const pend = Number.isFinite(pendRaw) && pendRaw >= 1 ? Math.min(Math.max(pendRaw, 1), 4) : 2;
  let dMm = parseInt(String(diamTuboMm), 10) || 25;
  dMm = Math.max(16, Math.min(40, dMm));

  const g =
    canalGeom != null && typeof canalGeom === 'object'
      ? Object.assign(nftCanalGeomDesdeConfig({}), canalGeom)
      : nftCanalGeomDesdeConfig({});
  const laminaMm = Math.min(6, Math.max(2, g.laminaMm || 3));
  let longCanalM = g.longCanalM;
  const longAuto = Math.min(10, Math.max(0.75, 0.5 + nHx * 0.11));
  if (longCanalM == null || !Number.isFinite(longCanalM) || longCanalM <= 0) longCanalM = longAuto;
  else longCanalM = Math.min(15, Math.max(0.5, longCanalM));

  const A_mm2 = nftAreaFlujoLaminaMm2({ ...g, laminaMm });
  const A_m2 = A_mm2 / 1e6;
  const vFilmMin = 0.075 + Math.max(0, pend - 2) * 0.006;
  const vFilmRec = 0.105 + Math.max(0, pend - 2) * 0.01;
  const qGeomMinLhPerM = A_m2 * vFilmMin * 3600 * 1000;
  const qGeomRecLhPerM = A_m2 * vFilmRec * 3600 * 1000;
  const qCanalGeomMin = longCanalM * qGeomMinLhPerM;
  const qCanalGeomRec = longCanalM * qGeomRecLhPerM;

  const qFilmLhPorM = 2.35 * (1 + (pend - 2) * 0.14) * (dMm <= 20 ? 1.06 : 1);
  const qCanalEmpRec = longCanalM * qFilmLhPorM * 1.18;
  const qCanalEmpMin = longCanalM * qFilmLhPorM * 0.95;

  const qTotalGeomRec = nCh * qCanalGeomRec;
  const qTotalGeomMin = nCh * qCanalGeomMin;
  const qTotalEmpRec = nCh * qCanalEmpRec;
  const qTotalEmpMin = nCh * qCanalEmpMin;

  const qTotalParaRec = Math.max(qTotalGeomRec, qTotalEmpRec);
  const qTotalLh = Math.round(qTotalParaRec);
  const caudalMinLH = Math.max(120, Math.round(Math.max(qTotalGeomMin, qTotalEmpMin, qTotalParaRec * 0.88)));
  const caudalRecLH = Math.max(caudalMinLH + 40, Math.round(Math.max(qTotalParaRec * 1.12, qTotalGeomRec * 1.08)));

  const headBase = 0.42 + 0.055 * Math.min(nCh, 15);
  const friccTubo = dMm <= 16 ? 0.22 : dMm <= 20 ? 0.14 : dMm <= 25 ? 0.09 : 0.06;
  let altCmUsed = 0;
  let altM = 0;
  if (alturaBombeoCm != null && Number.isFinite(Number(alturaBombeoCm))) {
    const cmm = Math.round(Number(alturaBombeoCm));
    if (cmm > 0) {
      altCmUsed = Math.min(500, Math.max(0, cmm));
      altM = altCmUsed / 100;
    }
  }
  const headMetros = Math.round((headBase + friccTubo + altM) * 10) / 10;

  const Qm3h = caudalRecLH / 1000;
  const potEstW = Math.ceil((Qm3h * headMetros) / (0.367 * 0.32));
  const potenciaRecW = Math.max(5, Math.ceil(potEstW * 1.85));

  const lenTuberiaM = 1.4 + nCh * 0.38;
  const rM = dMm / 2000;
  const volTuberiaL = Math.PI * rM * rM * lenTuberiaM * 1000;
  const volPeliculaL = nCh * longCanalM * A_m2 * 1000;
  const volCircuitoL = Math.round((volTuberiaL + volPeliculaL) * 10) / 10;
  const volMinDepositoSugeridoL = Math.max(8, Math.ceil(volCircuitoL + 5));
  /* Margen de seguridad: evaporación/muestreos, oleaje y ~40–60 s de caudal nominal en el depósito. */
  const margenSeguridadL = Math.max(
    5,
    Math.round(volCircuitoL * 0.2),
    Math.round(caudalRecLH / 90)
  );
  let volDepositoRecomendadoL = Math.ceil(volMinDepositoSugeridoL + margenSeguridadL);
  volDepositoRecomendadoL = Math.min(100, Math.max(10, volDepositoRecomendadoL));
  if (volDepositoRecomendadoL < volMinDepositoSugeridoL) volDepositoRecomendadoL = volMinDepositoSugeridoL;

  let modeloRec = '';
  if (caudalRecLH <= 400 && headMetros <= 1.2) {
    modeloRec = 'Bomba sumergible ~5–10 W, ' + caudalMinLH + '–' + (caudalRecLH + 80) + ' L/h, altura ≥ ' + headMetros + ' m (24 h continuo).';
  } else if (caudalRecLH <= 900 && headMetros <= 1.8) {
    modeloRec = 'Bomba ~10–20 W, ' + caudalMinLH + '–' + (caudalRecLH + 120) + ' L/h, altura ≥ ' + headMetros + ' m.';
  } else {
    modeloRec = 'Bomba ≥ ' + potenciaRecW + ' W nominal, ' + caudalRecLH + '+ L/h @ ' + headMetros + ' m — revisar curva del fabricante (uso continuo).';
  }
  if (altM > 0) {
    modeloRec += ' El head orientativo incluye la elevación indicada al 1.º canal (~' + altCmUsed + ' cm).';
  }

  const canalFormaLabel =
    g.forma === 'rectangular'
      ? 'Rect. · fondo ' + (g.anchoMm || 100) + ' mm'
      : 'Tubo Ø' + (g.diamMm || 90) + ' mm';

  return {
    dMm,
    nCh,
    nHx,
    pend,
    longitudCanalM: Math.round(longCanalM * 100) / 100,
    longCanalAutoM: Math.round(longAuto * 100) / 100,
    canalFormaLabel,
    laminaMm: Math.round(laminaMm * 10) / 10,
    AflowMm2: Math.round(A_mm2),
    qTotalGeomMinLh: Math.round(qTotalGeomMin),
    qTotalGeomRecLh: Math.round(qTotalGeomRec),
    qTotalEmpiricoRecLh: Math.round(qTotalEmpRec),
    caudalMinLH,
    caudalRecLH,
    headMetros,
    potenciaEstW: potEstW,
    potenciaRecW,
    modeloRec,
    volCircuitoL,
    volPeliculaL: Math.round(volPeliculaL * 10) / 10,
    volTuberiaL: Math.round(volTuberiaL * 10) / 10,
    volMinDepositoSugeridoL,
    margenSeguridadL,
    volDepositoRecomendadoL,
    alturaBombeoCm: altCmUsed,
    alturaBombeoM: altM,
  };
}

/**
 * Documentación constructiva NFT (canal de cultivo vs alimentación vs retorno).
 * @param {{ forChecklist?: boolean }} opts
 */
function nftTuberiaReferenciaDocHtml(opts) {
  const cl = opts && opts.forChecklist === true;
  return (
    '<div class="nft-tuberia-ref-doc ' + (cl ? 'nft-tuberia-ref-doc--cl' : '') + '">' +
    '<p class="nft-ref-h3 nft-ref-h3--first ' + (cl ? 'nft-ref-h3--cl' : '') + '">1. Canal de cultivo (NFT)</p>' +
    '<p class="nft-ref-p">Tubería o perfil donde van las cestas y las raíces. Si no usas <strong>canaleta rectangular</strong>, lo habitual es <strong>tubo redondo en PVC</strong>: en muchos montajes caseros se emplea <strong>PVC de saneamiento o evacuación</strong> por precio y disponibilidad; es <strong>preferible PVC de uso alimentario</strong> (menor riesgo de lixiviación). El tubo <strong>blanco</strong> limita algo el calentamiento solar del agua.</p>' +
    '<ul class="nft-ref-ul">' +
    '<li class="nft-ref-li"><strong>Ø75 mm</strong>: cultivos pequeños o sistemas compactos.</li>' +
    '<li class="nft-ref-li"><strong>Ø90 mm</strong>: el más usado para lechuga y hojas.</li>' +
    '<li class="nft-ref-li"><strong>Ø110 mm</strong>: plantas más grandes o cuando interesa más caudal por canal.</li>' +
    '<li class="nft-ref-li"><strong>Perfil rectangular / canaleta</strong>: suele dar una <strong>película</strong> de agua muy uniforme bajo las raíces; equivale a elegir ancho útil del fondo en la app.</li>' +
    '</ul>' +
    '<p class="nft-ref-h3 ' + (cl ? 'nft-ref-h3--cl' : '') + '">2. Tubería de riego — alimentar cada canal</p>' +
    '<p class="nft-ref-p">Es la tubería de <strong>riego presión habitual</strong> (p. ej. <strong>polietileno</strong>), distinta del tubo ancho de cultivo.</p>' +
    '<ul class="nft-ref-ul">' +
    '<li class="nft-ref-li"><strong>Derivación a cada canal</strong>: <strong>Ø16 mm</strong> (PE) es la medida más común para entradas individuales; <strong>Ø20 mm</strong> aporta más holgura y reduce el riesgo de estrechamientos.</li>' +
    '<li class="nft-ref-li"><strong>Alimentación desde la bomba</strong> (rama principal hasta reparto o parte alta): <strong>Ø25 mm</strong> muy común; <strong>Ø32 mm</strong> recomendable en instalaciones medianas o con tramos largos.</li>' +
    '</ul>' +
    '<p class="nft-ref-h3 ' + (cl ? 'nft-ref-h3--cl' : '') + '">3. Retorno / desagüe al depósito</p>' +
    '<p class="nft-ref-p">Por gravedad conviene un tramo <strong>más ancho</strong> que la línea de alimentación para no crear cuellos de botella.</p>' +
    '<ul class="nft-ref-ul">' +
    '<li class="nft-ref-li"><strong>Ø40 mm</strong>: suele bastar para varios canales.</li>' +
    '<li class="nft-ref-li"><strong>Ø50 mm</strong>: recomendable con muchos canales o caudal alto.</li>' +
    '<li class="nft-ref-li"><strong>Pendiente ~2–4 %</strong> en el retorno para un buen drenaje.</li>' +
    '</ul>' +
    '<p class="nft-ref-note ' + (cl ? 'nft-ref-note--cl' : '') + '">' +
    '<strong>Nota técnica:</strong> en NFT la lámina de agua no debe ser muy profunda (orientativo <strong>3–5 mm</strong> de altura). ' +
    'Un difusor de aire en el depósito ayuda al oxígeno disuelto; la parte superior de las raíces debe seguir en contacto con el <strong>aire</strong> dentro del canal. ' +
    'Indica en el <strong>asistente</strong> las medidas <strong>reales de tu montaje</strong>: los botones recogen los Ø de canal y de tubería de riego más usados; elige los que correspondan a lo que tienes. ' +
    'El Ø que eliges para la bomba debe ser el del <strong>tramo más restrictivo</strong> de la línea de alimentación (no el del retorno ni el del tubo de cultivo).</p>' +
    '</div>'
  );
}

function refrescarDocTuberiaNftSetup() {
  const mount = document.getElementById('nftTuberiaDocSetupMount');
  if (mount) mount.innerHTML = nftTuberiaReferenciaDocHtml({ forChecklist: false });
}

function getNftBombaDesdeConfig(cfg) {
  if (!cfg || cfg.tipoInstalacion !== 'nft') return null;
  const hyd = getNftHidraulicaDesdeConfig(cfg);
  if (!hyd || hyd.nCh < 1 || hyd.nHx < 2) return null;
  const pendRaw = parseInt(String(cfg.nftPendientePct ?? ''), 10);
  const pend = Number.isFinite(pendRaw) && pendRaw >= 1 ? pendRaw : 2;
  const dMm = cfg.nftTuboInteriorMm || 25;
  const altCm = getNftAlturaBombeoEfectivaCm(cfg);
  return calcularBombaNftParam(hyd.nCh, hyd.nHx, pend, dMm, nftCanalGeomDesdeConfig(cfg), altCm);
}

/** Bloque &lt;details&gt; reutilizable: cifras y fórmulas solo bajo demanda. */
function nftWrapDetalleTecnicoSummary(innerHtml, summaryLabel) {
  const lab =
    summaryLabel != null && String(summaryLabel).trim() !== ''
      ? String(summaryLabel).trim()
      : 'Ver detalle técnico y cifras';
  if (typeof hcWrapDetailsTech === 'function') {
    return hcWrapDetailsTech(innerHtml, lab, false, '');
  }
  return (
    '<details class="hc-details-tech">' +
    '<summary class="hc-details-tech-sum">' +
    escHtmlUi(lab) +
    '</summary>' +
    '<div class="hc-details-tech-body">' +
    innerHtml +
    '</div></details>'
  );
}

/** Desglose numérico (solo para uso dentro de &lt;details&gt;). */
function nftBombaDetalleTecnicoHtml(b) {
  if (!b) return '';
  return (
    '<p class="nft-detalle-p">Se cruza geometría del canal (lámina y longitud) con reglas habituales de NFT y pérdidas en la línea de alimentación. <strong>No sustituye</strong> la curva <em>caudal–altura (Q–H)</em> del fabricante ni el manual de la bomba.</p>' +
    '<ul class="nft-detalle-ul">' +
    '<li>Caudal orientativo mín.: <strong>' + b.caudalMinLH + ' L/h</strong> · recomendado: <strong>' + b.caudalRecLH + ' L/h</strong> (24 h, conjunto de canales)</li>' +
    '<li>Altura manométrica estimada: <strong>' + b.headMetros + ' m</strong></li>' +
    '<li>Potencia eléctrica orientativa: <strong>~' + b.potenciaRecW + ' W</strong></li>' +
    '<li>Canal: ' + escHtmlUi(b.canalFormaLabel) + ' · lámina <strong>' + b.laminaMm + ' mm</strong> · sección flujo ≈ <strong>' + b.AflowMm2 + ' mm²</strong> · longitud <strong>' + b.longitudCanalM + ' m</strong></li>' +
    '<li>Vol. película ~<strong>' + b.volPeliculaL + ' L</strong> · tubería alim. Ø<strong>' + b.dMm + ' mm</strong> ~<strong>' + b.volTuberiaL + ' L</strong> · circuito ~<strong>' + b.volCircuitoL + ' L</strong></li>' +
    '<li>Comparación interna (L/h): geometría mín./rec. ' + b.qTotalGeomMinLh + ' / ' + b.qTotalGeomRecLh + ' · regla empírica rec. ~' + b.qTotalEmpiricoRecLh + '</li>' +
    '</ul>' +
    '<p class="nft-detalle-foot">' + escHtmlUi(b.modeloRec) + '</p>'
  );
}

/** Veredicto depósito vs volumen (cifras solo en detalle). */
function nftDepositoVeredictoBloqueHtml(b, volUsuarioL) {
  if (!b) return '';
  const minL = b.volMinDepositoSugeridoL;
  const recL = b.volDepositoRecomendadoL != null ? b.volDepositoRecomendadoL : minL;
  const vAct =
    volUsuarioL != null && Number.isFinite(Number(volUsuarioL)) && Number(volUsuarioL) > 0
      ? Math.round(Number(volUsuarioL))
      : null;
  let main = '';
  if (vAct == null) {
    main =
      '<strong>Depósito:</strong> indica el volumen en <strong>Cultivo e instalación</strong> para comprobar si cumple el margen orientativo.';
  } else if (vAct < minL) {
    main =
      '<strong>Depósito:</strong> <span class="nft-verdict-bad">No cumple</span> el volumen útil mínimo orientativo para este circuito.';
  } else if (vAct < recL) {
    main =
      '<strong>Depósito:</strong> <span class="nft-verdict-warn">Cumple el mínimo</span> · conviene más margen para uso real.';
  } else {
    main =
      '<strong>Depósito:</strong> <span class="nft-verdict-ok">Cumple</span> con margen orientativo.';
  }
  const detInner =
    '<p class="nft-detalle-p-sm">Volumen indicado: <strong>' +
    (vAct != null ? vAct + ' L' : '—') +
    '</strong> · Mín. útil orientativo: <strong>' +
    minL +
    ' L</strong> · Recomendado con margen: <strong>~' +
    recL +
    ' L</strong>.</p>' +
    '<p class="nft-detalle-foot-muted">Criterio: agua en tuberías + película + holgura para muestreos y pérdidas, en línea con recomendaciones de depósito en sistemas de recirculación continua.</p>';
  return (
    '<div class="nft-verdict-main">' +
    main +
    '</div>' +
    nftWrapDetalleTecnicoSummary(detInner, 'Cifras de depósito (litros)')
  );
}

function nftRecoPerfilPorGrupo(grupo) {
  const g = String(grupo || '').trim().toLowerCase();
  if (g === 'lechugas') {
    return {
      grupo: 'lechugas',
      etiqueta: 'Lechugas',
      canalMinMm: 90,
      canalMaxMm: 110,
      cestaTxt: '50 mm',
      sepTxt: '15–20 cm c-c',
      uso: 'Producción estándar',
      permite: true,
    };
  }
  if (g === 'asiaticas') {
    return {
      grupo: 'asiaticas',
      etiqueta: 'Asiáticas / hojas rápidas',
      canalMinMm: 75,
      canalMaxMm: 100,
      cestaTxt: '50 mm',
      sepTxt: '12–20 cm c-c',
      uso: 'Baby leaf o ciclo corto',
      permite: true,
    };
  }
  if (g === 'hierbas') {
    return {
      grupo: 'hierbas',
      etiqueta: 'Hierbas',
      canalMinMm: 75,
      canalMaxMm: 100,
      cestaTxt: '50–75 mm',
      sepTxt: '15–25 cm c-c',
      uso: 'Aromáticas medianas',
      permite: true,
    };
  }
  if (g === 'hojas') {
    return {
      grupo: 'hojas',
      etiqueta: 'Hojas voluminosas',
      canalMinMm: 100,
      canalMaxMm: 125,
      cestaTxt: '50–75 mm',
      sepTxt: '20–30 cm c-c',
      uso: 'Acelga, kale, espinaca grande',
      permite: true,
    };
  }
  if (g === 'microgreens') {
    return {
      grupo: 'microgreens',
      etiqueta: 'Microgreens',
      canalMinMm: 63,
      canalMaxMm: 75,
      cestaTxt: '27–50 mm',
      sepTxt: '6–10 cm c-c',
      uso: 'Alta densidad y ciclo muy corto',
      permite: true,
    };
  }
  if (g === 'frutos' || g === 'fresas' || g === 'raices') {
    return {
      grupo: g || 'frutos',
      etiqueta: g === 'fresas' ? 'Fresas' : g === 'raices' ? 'Raíces' : 'Frutos',
      canalMinMm: 125,
      canalMaxMm: 160,
      cestaTxt: '75–100 mm',
      sepTxt: '25–40 cm c-c',
      uso: 'NFT avanzado y poca densidad',
      permite: false,
    };
  }
  return {
    grupo: 'lechugas',
    etiqueta: 'Lechugas',
    canalMinMm: 90,
    canalMaxMm: 110,
    cestaTxt: '50 mm',
    sepTxt: '15–20 cm c-c',
    uso: 'Referencia general',
    permite: true,
  };
}

/** Parsea «50 mm» o «27–50 mm» del perfil de cultivo. */
function nftParseCestaRangoMm(cestaTxt) {
  const s = String(cestaTxt || '').trim();
  if (!s) return null;
  const m = s.match(/(\d{2,3})\s*(?:–|-|a)\s*(\d{2,3})/i);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { min: Math.min(a, b), max: Math.max(a, b), reco: Math.round((a + b) / 2) };
    }
  }
  const one = s.match(/(\d{2,3})/);
  if (one) {
    const v = parseInt(one[1], 10);
    if (Number.isFinite(v)) return { min: v, max: v, reco: v };
  }
  return null;
}

/** Ø o ancho útil del canal de cultivo (mm). */
function nftCanalReferenciaInteriorMm(geom) {
  geom = geom || {};
  if (geom.forma === 'rectangular') {
    return Math.min(220, Math.max(40, parseInt(String(geom.anchoMm), 10) || 100));
  }
  return Math.min(160, Math.max(50, parseInt(String(geom.diamMm), 10) || 90));
}

/**
 * Altura y aro de cesta coherentes con canal + lámina (~1–3 mm de película).
 * Referencia: película fina + zona aérea en el canal (guías NFT tipo AquaLogi / Hydro4Grow);
 * macetas ~50–76 mm habituales en tubos Ø75–110 mm.
 */
function nftRecomendarCestaDesdeCanal(geom, perfil) {
  const canal = nftCanalReferenciaInteriorMm(geom);
  const lam = Math.min(6, Math.max(2, geom.laminaMm || 3));
  if (!Number.isFinite(canal) || canal < 50) return null;
  const libre = Math.max(12, canal - lam);
  let altMin = Math.max(28, Math.round(libre * 0.42));
  let altMax = Math.min(100, Math.round(libre * 0.68));
  let altReco = Math.round((altMin + altMax) / 2 / 5) * 5;
  let rimMin = Math.max(25, Math.round(canal * 0.38));
  let rimMax = Math.min(100, Math.round(canal * 0.58));
  let rimReco = Math.min(rimMax, Math.max(rimMin, Math.round(canal * 0.52 / 5) * 5));
  const cropRim = nftParseCestaRangoMm(perfil && perfil.cestaTxt);
  if (cropRim) {
    rimMin = Math.max(rimMin, cropRim.min);
    rimMax = Math.min(rimMax, cropRim.max);
    rimReco = Math.min(rimMax, Math.max(rimMin, cropRim.reco != null ? cropRim.reco : rimReco));
  }
  if (rimMin > rimMax) {
    rimMin = cropRim ? cropRim.min : rimMin;
    rimMax = cropRim ? cropRim.max : rimMax;
    rimReco = Math.min(rimMax, Math.max(rimMin, rimReco));
  }
  return {
    canalMm: canal,
    laminaMm: lam,
    altMin,
    altMax,
    altReco,
    rimMin,
    rimMax,
    rimReco,
  };
}

function nftGrupoObjetivoDesdeConfig(cfg) {
  if (typeof hcGrupoCultivoDominanteDesdeConfig === 'function') {
    return hcGrupoCultivoDominanteDesdeConfig(cfg);
  }
  return 'lechugas';
}

function nftCestaDesdeConfig(cfg) {
  cfg = cfg || {};
  const rim = parseInt(String(cfg.nftNetPotRimMm ?? cfg.dwcNetPotRimMm ?? ''), 10);
  const h = parseInt(String(cfg.nftNetPotHeightMm ?? cfg.dwcNetPotHeightMm ?? ''), 10);
  return {
    rimMm: Number.isFinite(rim) && rim >= 25 && rim <= 120 ? rim : null,
    heightMm: Number.isFinite(h) && h >= 30 && h <= 200 ? h : null,
  };
}

function nftEvaluarCestaConCanal(cfg, perfil) {
  const geom = nftCanalGeomDesdeConfig(cfg);
  const reco = nftRecomendarCestaDesdeCanal(geom, perfil);
  const pot = nftCestaDesdeConfig(cfg);
  if (!reco) {
    return {
      estado: 'warn',
      veredicto: 'Indica Ø del tubo o ancho del canal y lámina de agua',
      reco: null,
      pot,
    };
  }
  let estado = 'ok';
  let veredicto = 'Cesta coherente con canal y lámina';
  if (pot.rimMm != null) {
    if (pot.rimMm < reco.rimMin - 2) {
      estado = 'warn';
      veredicto = 'Aro de cesta pequeño para este canal';
    } else if (pot.rimMm > reco.rimMax + 2) {
      estado = 'warn';
      veredicto = 'Aro de cesta grande para el hueco en el tubo';
    }
  }
  if (pot.heightMm != null) {
    if (pot.heightMm < reco.altMin - 3) {
      estado = estado === 'ok' ? 'warn' : estado;
      veredicto =
        pot.rimMm != null && estado !== 'ok'
          ? veredicto + '; altura baja para la película'
          : 'Altura de cesta baja para la película en el canal';
    } else if (pot.heightMm > reco.altMax + 5) {
      estado = estado === 'ok' ? 'warn' : estado;
      veredicto =
        pot.rimMm != null && estado !== 'ok'
          ? veredicto + '; altura alta (poca zona aérea en canal)'
          : 'Altura de cesta alta: poca zona aérea sobre la lámina';
    }
  }
  return { estado, veredicto, reco, pot };
}

function nftRecomendacionCultivoDesdeConfig(cfg) {
  cfg = cfg || state.configTorre || {};
  if (cfg.tipoInstalacion !== 'nft') return null;
  const grupo = nftGrupoObjetivoDesdeConfig(cfg);
  const p = nftRecoPerfilPorGrupo(grupo);
  const geom = nftCanalGeomDesdeConfig(cfg);
  const d = nftCanalReferenciaInteriorMm(geom);
  let estado = 'ok';
  let veredicto = 'Dentro de rango recomendado';
  if (!p.permite) {
    estado = 'bad';
    veredicto = 'Grupo poco recomendable para NFT de tubo estándar';
  } else if (!Number.isFinite(d) || d <= 0) {
    estado = 'warn';
    veredicto = 'Falta diámetro de canal';
  } else if (d < p.canalMinMm) {
    estado = 'warn';
    veredicto = 'Canal estrecho para este cultivo — sube el Ø del tubo';
  } else if (d > p.canalMaxMm + 15) {
    estado = 'warn';
    veredicto = 'Canal muy ancho para este cultivo';
  }
  const cesta = nftEvaluarCestaConCanal(cfg, p);
  return {
    grupo,
    perfil: p,
    diamActualMm: Number.isFinite(d) ? d : null,
    geomForma: geom.forma,
    estado,
    veredicto,
    cesta,
  };
}

function nftRecomendacionCultivoTextoCorto(cfg) {
  const r = nftRecomendacionCultivoDesdeConfig(cfg);
  if (!r) return '';
  const p = r.perfil;
  const dTxt = r.diamActualMm != null ? 'Ø' + r.diamActualMm + ' mm' : 'Ø—';
  const estadoTxt = r.estado === 'ok' ? 'OK' : r.estado === 'warn' ? 'Ajustar' : 'No recomendado';
  return (
    'Cultivo: ' +
    p.etiqueta +
    ' · canal Ø' +
    p.canalMinMm +
    '–' +
    p.canalMaxMm +
    ' mm · actual ' +
    dTxt +
    ' · ' +
    estadoTxt +
    '.'
  );
}

function nftDraftParaCompatibilidad(scope) {
  const esSetup = scope === 'setup';
  let draft;
  if (esSetup && typeof buildNftDraftConfigFromSetupUi === 'function') {
    const uiDraft = buildNftDraftConfigFromSetupUi();
    const esNueva =
      typeof hcSetupAsistenteInstalacionNueva === 'function' && hcSetupAsistenteInstalacionNueva();
    draft = esNueva
      ? Object.assign({}, uiDraft, { tipoInstalacion: 'nft' })
      : Object.assign({}, state.configTorre || {}, uiDraft, { tipoInstalacion: 'nft' });
    const potUi = typeof readNftPotCestaFromSetupUi === 'function' ? readNftPotCestaFromSetupUi() : {};
    if (potUi.rimMm != null) draft.nftNetPotRimMm = potUi.rimMm;
    if (potUi.heightMm != null) draft.nftNetPotHeightMm = potUi.heightMm;
    if (typeof setupPlantasSeleccionadas !== 'undefined' && setupPlantasSeleccionadas.size > 0) {
      draft.cultivosIniciales = [...setupPlantasSeleccionadas];
    } else if (esNueva) {
      delete draft.cultivosIniciales;
    }
  } else if (!esSetup) {
    draft = Object.assign({}, state.configTorre || {}, { tipoInstalacion: 'nft' });
    const objEl = document.getElementById('sysNftObjetivoCultivo');
    if (objEl && objEl.value && typeof nftNormalizeObjetivoCultivo === 'function') {
      draft.nftObjetivoCultivo = nftNormalizeObjetivoCultivo(objEl.value);
    }
  } else {
    draft = Object.assign({}, state.configTorre || {}, { tipoInstalacion: 'nft' });
  }
  return draft;
}

function renderNftCompatibilidadEnEl(el, html, visible) {
  if (!el) return;
  if (!visible) {
    el.innerHTML = '';
    el.classList.add('setup-hidden');
    return;
  }
  el.classList.remove('setup-hidden');
  el.innerHTML = html;
}

function renderNftCultivoRecoStatus(scope) {
  const elCanal = document.getElementById(scope === 'setup' ? 'setupNftCultivoRecoStatus' : 'sysNftCultivoRecoStatus');
  const elCesta = document.getElementById(scope === 'setup' ? 'setupNftCestaRecoStatus' : 'sysNftCestaRecoStatus');
  const esSetup = scope === 'setup';
  if (esSetup) {
    if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'nft') {
      renderNftCompatibilidadEnEl(elCanal, '', false);
      renderNftCompatibilidadEnEl(elCesta, '', false);
      nftRefreshAplicarRecoBtns(scope, null, false);
      return;
    }
  } else if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') {
    renderNftCompatibilidadEnEl(elCanal, '', false);
    renderNftCompatibilidadEnEl(elCesta, '', false);
    nftRefreshAplicarRecoBtns(scope, null, false);
    return;
  }
  const draft = nftDraftParaCompatibilidad(scope);
  const r = typeof nftRecomendacionCultivoDesdeConfig === 'function' ? nftRecomendacionCultivoDesdeConfig(draft) : null;
  if (!r) {
    renderNftCompatibilidadEnEl(elCanal, '', false);
    renderNftCompatibilidadEnEl(elCesta, '', false);
    nftRefreshAplicarRecoBtns(scope, null, false);
    return;
  }
  const chip = typeof rdwcCompatChipHtml === 'function' ? rdwcCompatChipHtml : () => '';
  const esc = typeof meteoEscHtml === 'function' ? meteoEscHtml : function (x) {
    return String(x == null ? '' : x);
  };
  const canalLbl = r.geomForma === 'rectangular' ? 'ancho' : 'Ø';
  const dAct =
    r.diamActualMm != null && Number.isFinite(r.diamActualMm)
      ? canalLbl + ' <strong>' + r.diamActualMm + ' mm</strong>'
      : canalLbl + ' por indicar';
  const hayCultivo =
    typeof hcSetupHayCultivosEnAsistente === 'function'
      ? hcSetupHayCultivosEnAsistente(draft)
      : (typeof setupPlantasSeleccionadas !== 'undefined' && setupPlantasSeleccionadas.size > 0) ||
        (Array.isArray(draft.cultivosIniciales) && draft.cultivosIniciales.length > 0);
  const cultivoLine = hayCultivo
    ? esc(r.perfil.etiqueta) + ' · canal ' + canalLbl + ' <strong>' + r.perfil.canalMinMm + '–' + r.perfil.canalMaxMm + ' mm</strong>'
    : 'Elige cultivo en el asistente para validar el ' + canalLbl + ' del tubo';
  renderNftCompatibilidadEnEl(
    elCanal,
    '<span class="rdwc-compat-text nft-compat-line">' +
      chip(r.estado) +
      ' <strong>Canal vs cultivo</strong> · ' +
      cultivoLine +
      ' · actual ' +
      dAct +
      (hayCultivo ? '. <em>' + esc(r.veredicto) + '</em>' : '.') +
      '</span>',
    true
  );
  const c = r.cesta;
  const reco = c && c.reco;
  if (!reco) {
    renderNftCompatibilidadEnEl(elCesta, '', false);
    nftRefreshAplicarRecoBtns(scope, r, hayCultivo);
    return;
  }
  let cestaEstado = c.estado;
  let cestaVer = c.veredicto;
  const pot = c.pot || {};
  if (pot.rimMm == null && pot.heightMm == null) {
    cestaEstado = 'warn';
    cestaVer = 'Indica diám. y altura de cesta para comprobar';
  }
  const recoTxt =
    'aro <strong>' +
    reco.rimMin +
    '–' +
    reco.rimMax +
    ' mm</strong> (≈' +
    reco.rimReco +
    ') · altura <strong>' +
    reco.altMin +
    '–' +
    reco.altMax +
    ' mm</strong> (≈' +
    reco.altReco +
    ') · lámina ' +
    reco.laminaMm +
    ' mm';
  const actParts = [];
  if (pot.rimMm != null) actParts.push('aro ' + pot.rimMm + ' mm');
  if (pot.heightMm != null) actParts.push('altura ' + pot.heightMm + ' mm');
  const actTxt = actParts.length ? actParts.join(' · ') : 'sin datos';
  renderNftCompatibilidadEnEl(
    elCesta,
    '<span class="rdwc-compat-text nft-compat-line">' +
      chip(cestaEstado) +
      ' <strong>Cesta vs canal</strong> · recomendado ' +
      recoTxt +
      ' · actual: ' +
      esc(actTxt) +
      '. <em>' +
      esc(cestaVer) +
      '</em></span>',
    true
  );
  if (esSetup) {
    const rimIn = document.getElementById('setupNftPotRimMm');
    const hIn = document.getElementById('setupNftPotHmm');
    if (rimIn && !String(rimIn.value || '').trim()) rimIn.placeholder = '≈' + reco.rimReco;
    if (hIn && !String(hIn.value || '').trim()) hIn.placeholder = '≈' + reco.altReco;
  }
  nftRefreshAplicarRecoBtns(scope, r, hayCultivo);
}

/** Una sola línea de resumen NFT para #depositoTitulo, diagrama y Consejos (config activa). */
function nftTextoResumenInstalacion(cfg) {
  cfg = cfg || state.configTorre || {};
  if (cfg.tipoInstalacion !== 'nft') return '';
  const t = getTorreActiva();
  const nombre = ((t?.nombre || '').trim() || 'Instalación');
  const hyd = getNftHidraulicaDesdeConfig(cfg);
  const ch = hyd.nCh;
  const hx = hyd.nHx;
  const vol = getVolumenDepositoMaxLitros(cfg);
  const pend = cfg.nftPendientePct ?? 2;
  const tubo = cfg.nftTuboInteriorMm || 25;
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  const dispTxt = disp === 'escalera' ? 'escalera' : disp === 'pared' ? 'pared' : 'mesa';
  const altEff = getNftAlturaBombeoEfectivaCm(cfg);
  const b = getNftBombaDesdeConfig(cfg);
  const objNft =
    typeof nftGetObjetivoCultivo === 'function' ? nftGetObjetivoCultivo(cfg) : 'final';
  const objSpec =
    typeof nftGetObjetivoSpec === 'function'
      ? nftGetObjetivoSpec(objNft)
      : { label: objNft === 'baby' ? 'Alta densidad / baby leaf (cosecha joven)' : 'Planta adulta (tamaño completo)' };
  let extraDisp = '';
  if (disp === 'mesa' && cfg.nftMesaMultinivel && hyd.mesaTiers && hyd.mesaTiers.length >= 2) {
    extraDisp = ' multinivel ' + hyd.mesaTiers.join('+');
  }
  if (disp === 'escalera' && hyd.escaleraNiveles != null && hyd.escaleraCaras != null) {
    extraDisp += ' · ' + hyd.escaleraNiveles + '×' + hyd.escaleraCaras + ' cara(s)';
  }
  const vMez = getVolumenMezclaLitros(cfg);
  const volTxt =
    vol != null && Number.isFinite(vol) && vol > 0
      ? vMez != null && Number.isFinite(vMez) && vMez < vol - 0.05
        ? vol + ' L (mezcla ' + vMez + ' L)'
        : vol + ' L'
      : 'L por indicar';
  let s = nombre + ' — ' + ch + ' tubos × ' + hx + ' huecos — ' + volTxt + ' · ' + dispTxt + extraDisp + ' · pend. ~' + pend + '%';
  s += ' · objetivo ' + objSpec.label;
  if (altEff > 0) s += ' · ↑~' + altEff + ' cm';
  if (b) {
    s += ' · alim. Ø' + tubo + ' mm · bomba/depósito: ver checklist o asistente';
  }
  const reco = nftRecomendacionCultivoDesdeConfig(cfg);
  if (reco) {
    const estadoTxt = reco.estado === 'ok' ? 'OK' : reco.estado === 'warn' ? 'Ajustar' : 'No recomendado';
    s +=
      ' · cultivo ' +
      reco.perfil.etiqueta +
      ': canal Ø' +
      reco.perfil.canalMinMm +
      '–' +
      reco.perfil.canalMaxMm +
      ' mm (' + estadoTxt + ')';
  }
  return s;
}

/**
 * Tabla resumen bajo el gráfico (NFT o torre): datos de la instalación activa según config.
 */
function renderTorreSistemaResumenTabla(cfg) {
  const mount = document.getElementById('torreSistemaResumenWrap');
  if (!mount) return;
  cfg = cfg || state.configTorre || {};
  const rows = [];
  let t = null;
  try {
    t = typeof getTorreActiva === 'function' ? getTorreActiva() : null;
  } catch (e) {
    t = null;
  }
  const nombre = (t && t.nombre ? String(t.nombre).trim() : '') || '';

  if (cfg.tipoInstalacion === 'nft') {
    const hyd = getNftHidraulicaDesdeConfig(cfg);
    const geom = nftCanalGeomDesdeConfig(cfg);
    const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
    let montajeDet =
      disp === 'escalera' ? 'Escalera / A-frame' : disp === 'pared' ? 'Pared (zigzag)' : 'Mesa';
    if (disp === 'mesa' && cfg.nftMesaMultinivel && hyd.mesaTiers && hyd.mesaTiers.length >= 2) {
      montajeDet =
        'Mesa multinivel · ' +
        hyd.mesaTiers.length +
        ' niveles · tubos por nivel ' +
        hyd.mesaTiers.join(' · ');
    } else if (disp === 'escalera' && hyd.escaleraNiveles != null) {
      montajeDet +=
        ' · ' +
        hyd.escaleraNiveles +
        ' peldaños/cara · ' +
        (hyd.escaleraCaras || 1) +
        ' cara(s)';
    }
    const canalTxt =
      geom.forma === 'rectangular'
        ? 'Rectangular · fondo ' + geom.anchoMm + ' mm · lámina ~' + geom.laminaMm + ' mm'
        : 'Redondo · Ø' + geom.diamMm + ' mm · lámina ~' + geom.laminaMm + ' mm';
    const longM = geom.longCanalM != null ? String(geom.longCanalM) + ' m/canal' : 'Auto (por huecos)';
    const altCm =
      cfg.nftAlturaBombeoCm != null && Number(cfg.nftAlturaBombeoCm) > 0
        ? Math.round(Number(cfg.nftAlturaBombeoCm))
        : getNftAlturaBombeoEfectivaCm(cfg);
    const tuboRi = cfg.nftTuboInteriorMm || 25;
    const vol = getVolumenDepositoMaxLitros(cfg);
    const vMez = getVolumenMezclaLitros(cfg);
    const pend = cfg.nftPendientePct ?? 2;

    if (nombre) rows.push(['Nombre', escHtmlUi(nombre)]);
    rows.push(['Cultivo e instalación', 'NFT']);
    rows.push(['Montaje', escHtmlUi(montajeDet)]);
    rows.push(['Canales (tubos)', String(hyd.nCh)]);
    rows.push(['Huecos por canal', String(hyd.nHx)]);
    rows.push(['Huecos totales', String(hyd.nCh * hyd.nHx)]);
    const objNft =
      typeof nftGetObjetivoCultivo === 'function' ? nftGetObjetivoCultivo(cfg) : 'final';
    const objSpec =
      typeof nftGetObjetivoSpec === 'function'
        ? nftGetObjetivoSpec(objNft)
        : { label: objNft === 'baby' ? 'Alta densidad / baby leaf (cosecha joven)' : 'Planta adulta (tamaño completo)', densidadTxt: '—', cicloTxt: '—' };
    rows.push(['Objetivo cultivo', escHtmlUi(objSpec.label + ' · ' + objSpec.densidadTxt + ' · ' + objSpec.cicloTxt)]);
    const nftRim =
      cfg.nftNetPotRimMm != null && Number(cfg.nftNetPotRimMm) > 0
        ? Math.round(Number(cfg.nftNetPotRimMm))
        : cfg.dwcNetPotRimMm != null && Number(cfg.dwcNetPotRimMm) > 0
          ? Math.round(Number(cfg.dwcNetPotRimMm))
          : null;
    const nftH =
      cfg.nftNetPotHeightMm != null && Number(cfg.nftNetPotHeightMm) > 0
        ? Math.round(Number(cfg.nftNetPotHeightMm))
        : cfg.dwcNetPotHeightMm != null && Number(cfg.dwcNetPotHeightMm) > 0
          ? Math.round(Number(cfg.dwcNetPotHeightMm))
          : null;
    const cestaNftTxt =
      nftRim != null
        ? 'Ø ' +
          nftRim +
          ' mm' +
          (nftH != null ? ' · alto ' + nftH + ' mm' : '') +
          ' · ref. 27–50 mm u otro Ø (personalizado)'
        : 'Indica Ø en asistente (paso Canal / tubo / bomba) · ref. 27–50 mm u personalizado';
    rows.push(['Cestas (net pot)', escHtmlUi(cestaNftTxt)]);
    rows.push(['Pendiente', '~' + pend + ' %']);
    rows.push([
      'Depósito (cap. máx)',
      vol != null && Number.isFinite(vol) && vol > 0
        ? String(vol) + ' L' + (vMez != null && Number.isFinite(vMez) && vMez < vol - 0.05 ? ' · mezcla ' + vMez + ' L' : '')
        : 'Indica litros en Torre o asistente',
    ]);
    rows.push(['Canal de cultivo', escHtmlUi(canalTxt + ' · long. ' + longM)]);
    const reco = nftRecomendacionCultivoDesdeConfig(cfg);
    if (reco) {
      const p = reco.perfil;
      const sem = reco.estado === 'bad' ? '❌' : reco.estado === 'warn' ? '⚠️' : '✅';
      rows.push([
        'Diseño por cultivo',
        escHtmlUi(
          sem +
            ' ' +
            p.etiqueta +
            ' · canal Ø' +
            p.canalMinMm +
            '–' +
            p.canalMaxMm +
            ' mm · cesta ' +
            p.cestaTxt +
            ' · sep. ' +
            p.sepTxt +
            ' · ' +
            reco.veredicto
        ),
      ]);
    }
    rows.push(['Tubería riego (Ø)', 'Ø' + tuboRi + ' mm <span class="nft-resumen-hint">(tramo que limita)</span>']);
    if (altCm > 0) rows.push(['Altura bombeo', String(altCm) + ' cm']);
    const qU = cfg.nftBombaUsuarioCaudalLh;
    const wU = cfg.nftBombaUsuarioPotenciaW;
    if ((qU != null && Number(qU) > 0) || (wU != null && Number(wU) > 0)) {
      let btxt = '';
      if (qU != null && Number(qU) > 0) btxt += Math.round(Number(qU)) + ' L/h';
      if (wU != null && Number(wU) > 0) btxt += (btxt ? ' · ' : '') + Math.round(Number(wU)) + ' W';
      rows.push(['Bomba (placa)', escHtmlUi(btxt)]);
    }
    const eqArr = cfg.equipamiento;
    if (Array.isArray(eqArr) && eqArr.length) {
      const bits = [];
      if (eqArr.includes('calentador')) bits.push('Calentador');
      if (eqArr.includes('difusor')) bits.push('Difusor');
      if (bits.length) rows.push(['En el esquema', bits.join(' · ')]);
    }
  } else if (cfg.tipoInstalacion === 'srf') {
    const cSrf = typeof srfEnsureConfigDefaults === 'function' ? srfEnsureConfigDefaults(Object.assign({}, cfg)) : cfg;
    const nPl = typeof srfGetNumPlantas === 'function' ? srfGetNumPlantas(cSrf) : (cSrf.numNiveles || 1) * (cSrf.numCestas || 1);
    const grid = typeof srfDistribuirPlantas === 'function' ? srfDistribuirPlantas(cSrf) : { rows: cSrf.numNiveles || 1, cols: cSrf.numCestas || 1 };
    const cap = typeof srfCapacidadLitrosDesdeConfig === 'function' ? srfCapacidadLitrosDesdeConfig(cSrf) : null;
    const vol = getVolumenDepositoMaxLitros(cSrf);
    const vMez = getVolumenMezclaLitros(cSrf);
    const ox =
      typeof srfNormalizeOxigenacionModo === 'function'
        ? srfNormalizeOxigenacionModo(cSrf.srfOxigenacionModo)
        : 'aireador';
    if (nombre) rows.push(['Nombre', escHtmlUi(nombre)]);
    rows.push(['Cultivo e instalación', 'SRF (raíz flotante)']);
    rows.push(['Plantas en balsa', String(nPl)]);
    rows.push(['Disposición', grid.rows + ' fila(s) × ' + grid.cols + ' plantas/fila']);
    rows.push([
      'Estanque (L × A × P)',
      escHtmlUi(
        (cSrf.srfCanalLargoCm != null ? cSrf.srfCanalLargoCm : '—') +
          ' × ' +
          (cSrf.srfCanalAnchoCm != null ? cSrf.srfCanalAnchoCm : '—') +
          ' × ' +
          (cSrf.srfProfundidadCm != null ? cSrf.srfProfundidadCm : '—') +
          ' cm'
      ),
    ]);
    rows.push([
      'Volumen útil',
      (cap != null ? cap + ' L' : '—') +
        (vMez != null && vol != null && vMez < vol - 0.05 ? ' · mezcla ' + vMez + ' L' : ''),
    ]);
    rows.push([
      'Oxigenación',
      escHtmlUi(ox === 'kratky' ? 'Kratky · cámara ~' + (cSrf.srfKratkyGapCm || 8) + ' cm' : 'Aireador ~' + (cSrf.srfAirLpm || 8) + ' L/min'),
    ]);
    if (cSrf.srfCirculante && ox !== 'kratky') {
      rows.push(['Recirculación opcional', escHtmlUi('~' + (cSrf.srfRecircLh || 400) + ' L/h')]);
    }
    if (cSrf.srfNetPotMm != null) {
      rows.push(['Net pot', escHtmlUi('Ø ' + cSrf.srfNetPotMm + ' mm')]);
    }
  } else {
    const N = cfg.numNiveles || window.NUM_NIVELES_ACTIVO || (typeof NUM_NIVELES !== 'undefined' ? NUM_NIVELES : 4);
    const C = cfg.numCestas || window.NUM_CESTAS_ACTIVO || (typeof NUM_CESTAS !== 'undefined' ? NUM_CESTAS : 5);
    const vol = getVolumenDepositoMaxLitros(cfg);
    const vMez = getVolumenMezclaLitros(cfg);
    const esDwcTab = cfg.tipoInstalacion === 'dwc';
    if (nombre) rows.push(['Nombre', escHtmlUi(nombre)]);
    rows.push(['Cultivo e instalación', esDwcTab ? 'DWC' : 'Torre vertical']);
    rows.push([esDwcTab ? 'Filas' : 'Niveles', String(N)]);
    rows.push([esDwcTab ? 'Cestas por fila' : 'Cestas por nivel', String(C)]);
    rows.push([esDwcTab ? 'Cestas totales' : 'Cestas totales', String(N * C)]);
    if (!esDwcTab && typeof torreGetObjetivoSpec === 'function' && typeof torreGetObjetivoCultivo === 'function') {
      const spT = torreGetObjetivoSpec(torreGetObjetivoCultivo(cfg));
      rows.push(['Objetivo de cosecha', escHtmlUi(spT.label + ' · ' + spT.densidadTxt)]);
    }
    const mezExplicito =
      cfg.volMezclaLitros != null &&
      Number.isFinite(Number(cfg.volMezclaLitros)) &&
      Number(cfg.volMezclaLitros) > 0 &&
      vol != null &&
      Number(cfg.volMezclaLitros) < vol - 0.05;
    rows.push([
      'Depósito (cap. máx)',
      vol != null && Number.isFinite(vol) && vol > 0
        ? esDwcTab
          ? String(vol) + ' L' + (mezExplicito ? ' · mezcla ' + Number(cfg.volMezclaLitros) + ' L' : '')
          : String(vol) +
            ' L' +
            (mezExplicito ? ' · mezcla ' + Number(cfg.volMezclaLitros) + ' L' : ' · mezcla = máximo (manual)')
        : 'Indica litros en Torre o asistente',
    ]);
    if (esDwcTab) {
      rows.push([
        'Nivel de solución (DWC)',
        escHtmlUi(
          'En DWC el líquido suele quedar por debajo del tope geométrico: hace falta una cámara de aire entre la superficie del nutriente y la base del sustrato en las cestas; al crecer las raíces ese hueco suele aumentar. Indica «litros de mezcla» por debajo del máximo si no llenas al borde.'
        ),
      ]);
    }
    const eqArrDw = cfg.equipamiento;
    if (esDwcTab && Array.isArray(eqArrDw) && eqArrDw.length) {
      const bitsD = [];
      if (eqArrDw.includes('calentador')) bitsD.push('Calentador');
      if (eqArrDw.includes('difusor')) bitsD.push('Aireador / difusor');
      if (bitsD.length) rows.push(['Equipo habitual', bitsD.join(' · ')]);
    }
    if (esDwcTab) {
      const suK = normalizaSustratoKey(cfg.sustrato || state.configSustrato || 'esponja');
      const suN = CONFIG_SUSTRATO[suK]?.nombre || suK;
      rows.push(['Sustrato (referencia cestas)', escHtmlUi(suN)]);
      const formaDw =
        typeof dwcNormalizeDepositoForma === 'function'
          ? dwcNormalizeDepositoForma(cfg.dwcDepositoForma)
          : 'prismatico';
      const l = cfg.dwcDepositoLargoCm;
      const w = cfg.dwcDepositoAnchoCm;
      const p = cfg.dwcDepositoProfCm;
      if (formaDw === 'cilindrico') {
        const dCm =
          typeof dwcDiametroInteriorCmDesdeLW === 'function' ? dwcDiametroInteriorCmDesdeLW(l, w) : null;
        const dStr = dCm != null ? 'Ø ' + Math.round(dCm * 10) / 10 + ' cm' : '—';
        const dP = p != null ? p + ' cm' : '—';
        if (dCm != null || p != null) {
          rows.push(['Depósito físico (Ø interior × prof. útil)', escHtmlUi(dStr + ' × ' + dP)]);
        }
      } else if (formaDw === 'troncopiramidal') {
        const vm = cfg.dwcDepositoVolManualL;
        if (vm != null && Number(vm) > 0) {
          rows.push(['Depósito (volumen útil medido)', escHtmlUi(String(vm) + ' L')]);
        }
        if (l != null || w != null) {
          const dL = l != null ? l + ' cm' : '—';
          const dW = w != null ? w + ' cm' : '—';
          rows.push(['Tapa / referencia lateral (cm)', escHtmlUi(dL + ' × ' + dW)]);
        }
      } else if (l != null || w != null || p != null) {
        const dL = l != null ? l + ' cm' : '—';
        const dW = w != null ? w + ' cm' : '—';
        const dP = p != null ? p + ' cm' : '—';
        rows.push(['Depósito físico (largo × ancho × prof.)', escHtmlUi(dL + ' × ' + dW + ' × ' + dP)]);
      }
      const rim = cfg.dwcNetPotRimMm;
      const hp = cfg.dwcNetPotHeightMm;
      if (rim != null || hp != null) {
        rows.push([
          'Cesta (net pot)',
          escHtmlUi(
            (rim != null ? 'Ø ' + rim + ' mm' : '—') +
              (hp != null ? ' · alto ' + hp + ' mm' : '') +
              ' · ref. 27–50 mm o personalizado (asistente)'
          ),
        ]);
      } else {
        rows.push([
          'Cesta (net pot)',
          escHtmlUi('Indica Ø en mm en Cultivo e instalación o asistente · ref. 27–50 mm o personalizado'),
        ]);
      }
      const mTap = cfg.dwcTapaMarcoPorLadoMm;
      const hTap = cfg.dwcTapaHuecoMm;
      if ((mTap != null && Number.isFinite(Number(mTap))) || (hTap != null && Number.isFinite(Number(hTap)))) {
        const mTxt = mTap != null && Number.isFinite(Number(mTap)) ? Number(mTap) + ' mm/lado' : '—';
        const hTxt = hTap != null && Number.isFinite(Number(hTap)) ? Number(hTap) + ' mm' : 'def. 4 mm';
        rows.push(['Tapa (rejilla · referencia)', escHtmlUi('Marco ' + mTxt + ' · entre cestas ' + hTxt)]);
      }
      const acc = [];
      if (cfg.dwcCupulas === true) acc.push('Cúpulas / humedad');
      if (cfg.dwcEntradaAireManguera === true) acc.push('Entrada manguera de aire');
      if (acc.length) rows.push(['Accesorios', escHtmlUi(acc.join(' · '))]);
    }
  }

  let body = '';
  for (let i = 0; i < rows.length; i++) {
    const k = rows[i][0];
    const v = rows[i][1];
    body +=
      '<tr><th scope="row">' +
      escHtmlUi(k) +
      '</th><td>' +
      v +
      '</td></tr>';
  }
  const capTable =
    '<table class="torre-sistema-resumen-table">' +
    '<caption class="visually-hidden">' +
    escHtmlUi('Valores principales de la instalación según la configuración guardada') +
    '</caption>' +
    '<tbody>' +
    body +
    '</tbody></table>';
  const disclosureHead =
    '<button type="button" id="btnToggleTorreSistemaResumen" ' +
    'class="config-section-collapse-head medir-disclosure-main-head" ' +
    'aria-expanded="true" aria-controls="torreSistemaResumenInner" onclick="toggleTorreSistemaResumenPanel()">' +
    '<span class="config-section-collapse-title-wrap">' +
    '<span class="config-section-collapse-title">' +
    escHtmlUi('Resumen de la instalación configurada') +
    '</span></span>' +
    '<span class="config-section-collapse-chevron" aria-hidden="true">▼</span></button>';
  const disclosureBody =
    '<div id="torreSistemaResumenInner" class="config-section-collapse-body recarga-proxima-collapse-body torre-sistema-resumen-dwc-inner">' +
    capTable +
    '</div>';
  mount.innerHTML =
    '<div class="recarga-card config-section-collapsible torre-sistema-resumen-disclosure">' +
    disclosureHead +
    disclosureBody +
    '</div>';
  applyTorreSistemaResumenCollapseUI();
  mount.removeAttribute('hidden');
}

function torreSistemaResumenColapsoStorageKey() {
  const t = (state.configTorre || {}).tipoInstalacion;
  if (t === 'dwc') return 'uiTorreSistemaResumenDwcColapsado';
  if (t === 'srf') return 'uiTorreSistemaResumenSrfColapsado';
  return 'uiTorreSistemaResumenNftColapsado';
}

function applyTorreSistemaResumenCollapseUI() {
  const cfg = state.configTorre || {};
  const btn = document.getElementById('btnToggleTorreSistemaResumen');
  const inner = document.getElementById('torreSistemaResumenInner');
  if (!btn || !inner) return;
  const key = torreSistemaResumenColapsoStorageKey();
  const col = cfg[key] === true;
  inner.hidden = col;
  btn.setAttribute('aria-expanded', col ? 'false' : 'true');
}

function toggleTorreSistemaResumenPanel() {
  if (!state.configTorre) return;
  const key = torreSistemaResumenColapsoStorageKey();
  const cur = state.configTorre[key] === true;
  state.configTorre[key] = !cur;
  try {
    guardarEstadoTorreActual();
    saveState();
  } catch (e) {}
  applyTorreSistemaResumenCollapseUI();
}

/**
 * Compara caudal/potencia declarados por el usuario con el criterio orientativo NFT.
 * La respuesta visible es un veredicto; las cifras van en &lt;details&gt;.
 * @returns {{ tipo: 'omitido'|'ok'|'marginal'|'error'|'potencia_baja', html: string, toast?: string }}
 */
function validarBombaUsuarioNftVsCalculo(b, caudalRaw, potenciaRaw) {
  if (!b) {
    return { tipo: 'omitido', html: '', toast: null };
  }
  const caudal = parseFloat(String(caudalRaw != null ? caudalRaw : '').replace(',', '.'));
  const potW = parseFloat(String(potenciaRaw != null ? potenciaRaw : '').replace(',', '.'));
  const hint =
    '<span class="nft-bomba-hint">Escribe el <strong>caudal nominal de la placa</strong> (L/h) para saber si <strong>cumple</strong> los parámetros orientativos de tu instalación.</span>';
  if (!Number.isFinite(caudal) || caudal <= 0) {
    return { tipo: 'omitido', html: hint, toast: null };
  }
  const q = Math.round(caudal);
  const detalleCaudal =
    '<p class="nft-detalle-p-sm">Caudal declarado: <strong>' +
    q +
    ' L/h</strong> · Mín. orientativo: <strong>' +
    b.caudalMinLH +
    ' L/h</strong> · Recomendado: <strong>' +
    b.caudalRecLH +
    ' L/h</strong>.</p>' +
    '<p class="nft-detalle-foot-muted">Si el caudal es bajo, suele notarse primero al <strong>inicio</strong> de los canales (película cortada). Confirma siempre con la curva Q–H del fabricante a la altura de tu montaje.</p>';
  if (q < b.caudalMinLH) {
    return {
      tipo: 'error',
      html:
        '<div class="nft-bomba-title nft-bomba-title--bad">Bomba: no cumple</div>' +
        '<div class="nft-bomba-text">El caudal declarado es <strong>insuficiente</strong> para mantener la película en todos los canales con margen. Conviene otra bomba o menos líneas/huecos.</div>' +
        nftWrapDetalleTecnicoSummary(detalleCaudal + nftBombaDetalleTecnicoHtml(b)),
      toast: 'Bomba NFT: caudal insuficiente para esta configuración (revisa la placa y la curva Q–H).',
    };
  }
  let html = '';
  let tipo = 'ok';
  if (q < b.caudalRecLH) {
    tipo = 'marginal';
    html =
      '<div class="nft-bomba-title nft-bomba-title--warn">Bomba: cumple al límite</div>' +
      '<div class="nft-bomba-text">Supera el mínimo orientativo pero <strong>sin margen</strong>. Vigila inicios de canal y pendiente; si seca, sube caudal o cambia bomba.</div>' +
      nftWrapDetalleTecnicoSummary(detalleCaudal + nftBombaDetalleTecnicoHtml(b));
  } else {
    html =
      '<div class="nft-bomba-title nft-bomba-title--ok">Bomba: cumple</div>' +
      '<div class="nft-bomba-text">El caudal declarado encaja con el <strong>margen orientativo</strong> para circulación continua (24 h), según los datos de tu instalación.</div>' +
      nftWrapDetalleTecnicoSummary(detalleCaudal + nftBombaDetalleTecnicoHtml(b));
  }
  if (Number.isFinite(potW) && potW > 0 && potW < Math.max(4, Math.round(b.potenciaRecW * 0.52))) {
    tipo = tipo === 'ok' ? 'potencia_baja' : tipo;
    html +=
      '<div class="nft-bomba-potencia-warn">' +
      '<strong>Potencia:</strong> el valor declarado es <strong>bajo</strong> frente al orden de magnitud orientativo. Revisa en la <strong>ficha del fabricante</strong> (curva Q–H) el caudal real a la altura de tu instalación.</div>' +
      nftWrapDetalleTecnicoSummary(
        '<p>Potencia declarada: <strong>' +
          Math.round(potW) +
          ' W</strong> · Orientativo ~<strong>' +
          b.potenciaRecW +
          ' W</strong> · Altura manométrica estimada <strong>' +
          b.headMetros +
          ' m</strong>.</p>'
      ).replace('Ver detalle técnico y cifras', 'Ver cifras de potencia / altura');
  }
  return { tipo, html, toast: null };
}

function refrescarUIMensajeBombaUsuarioNft(mode) {
  const msgId = mode === 'checklist' ? 'clNftBombaUsuarioMsg' : 'nftBombaUsuarioValidacion';
  const el = document.getElementById(msgId);
  if (!el) return;
  let b;
  let lhRaw = '';
  let wRaw = '';
  if (mode === 'setup') {
    b = getNftBombaDesdeConfig(buildNftDraftConfigFromSetupUi());
    lhRaw = document.getElementById('nftBombaUsuarioLh')?.value ?? '';
    wRaw = document.getElementById('nftBombaUsuarioW')?.value ?? '';
  } else {
    b = getNftBombaDesdeConfig(state.configTorre);
    lhRaw = document.getElementById('clNftBombaUsuarioLh')?.value ?? '';
    wRaw = document.getElementById('clNftBombaUsuarioW')?.value ?? '';
  }
  const v = validarBombaUsuarioNftVsCalculo(b, lhRaw, wRaw);
  el.innerHTML = v.html || '';
  if (mode === 'checklist') {
    try { refrescarNftDepositoRecomendadoChecklistUI(); } catch (e) {}
    try { refrescarNftLayoutResumenChecklist(); } catch (e) {}
  }
}

/** Bloque checklist / recarga NFT: veredicto depósito (cifras en detalle). */
function refrescarNftDepositoRecomendadoChecklistUI() {
  const wrap = document.getElementById('clNftDepositoRecomendadoWrap');
  if (!wrap) return;
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') {
    wrap.innerHTML = '';
    wrap.style.display = 'none';
    return;
  }
  const b = getNftBombaDesdeConfig(state.configTorre);
  if (!b) {
    wrap.innerHTML = '';
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  const vCfg = parseFloat(String(state.configTorre.volDeposito ?? '').replace(',', '.'));
  const vAct = Number.isFinite(vCfg) && vCfg > 0 ? Math.round(vCfg) : null;
  wrap.innerHTML =
    '<div class="nft-deposito-title">💧 Depósito — ¿cumple el margen orientativo?</div>' +
    nftDepositoVeredictoBloqueHtml(b, vAct);
}

function onNftBombaUsuarioSetupInput() {
  refrescarUIMensajeBombaUsuarioNft('setup');
}

let _nftBombaBlurToastKey = '';
function onNftBombaUsuarioSetupBlur() {
  refrescarUIMensajeBombaUsuarioNft('setup');
  const b = getNftBombaDesdeConfig(buildNftDraftConfigFromSetupUi());
  if (!b) return;
  const lhRaw = document.getElementById('nftBombaUsuarioLh')?.value ?? '';
  const wRaw = document.getElementById('nftBombaUsuarioW')?.value ?? '';
  const v = validarBombaUsuarioNftVsCalculo(b, lhRaw, wRaw);
  const key = v.tipo + '|' + lhRaw + '|' + wRaw;
  if (v.tipo === 'error' && v.toast && key !== _nftBombaBlurToastKey) {
    _nftBombaBlurToastKey = key;
    showToast(v.toast, true);
  }
}

let _debouncePersistNftBombaCl = 0;
function onNftBombaUsuarioChecklistInput() {
  refrescarUIMensajeBombaUsuarioNft('checklist');
  clearTimeout(_debouncePersistNftBombaCl);
  _debouncePersistNftBombaCl = setTimeout(persistNftBombaUsuarioDesdeChecklist, 450);
}

function persistNftBombaUsuarioDesdeChecklist() {
  const cfg = state.configTorre;
  if (!cfg || cfg.tipoInstalacion !== 'nft') return;
  const lhEl = document.getElementById('clNftBombaUsuarioLh');
  const wEl = document.getElementById('clNftBombaUsuarioW');
  if (!lhEl || !wEl) return;
  const vLh = parseFloat(String(lhEl.value).replace(',', '.'));
  const vW = parseFloat(String(wEl.value).replace(',', '.'));
  if (Number.isFinite(vLh) && vLh > 0) cfg.nftBombaUsuarioCaudalLh = Math.round(vLh);
  else delete cfg.nftBombaUsuarioCaudalLh;
  if (Number.isFinite(vW) && vW > 0) cfg.nftBombaUsuarioPotenciaW = Math.round(vW);
  else delete cfg.nftBombaUsuarioPotenciaW;
  guardarEstadoTorreActual();
  saveState();
}

function refrescarNftLayoutResumenChecklist() {
  const el = document.getElementById('clNftLayoutResumen');
  if (!el || !state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  const cfg = state.configTorre;
  const disp = nftDisposicionNormalizada(cfg.nftDisposicion);
  const hyd = getNftHidraulicaDesdeConfig(cfg);
  const altEff = getNftAlturaBombeoEfectivaCm(cfg);
  const lines = [];
  let monte = 'Mesa';
  if (disp === 'pared') monte = 'Pared (tubos horizontales en zigzag)';
  else if (disp === 'escalera') monte = 'Escalera / inclinado';
  lines.push('<strong>Montaje</strong>: ' + monte);
  if (disp === 'mesa' && cfg.nftMesaMultinivel && hyd.mesaTiers && hyd.mesaTiers.length >= 2) {
    lines.push('Multinivel: <strong>' + hyd.mesaTiers.join('+') + '</strong> tubos por franja · ' + hyd.mesaTiers.length + ' niveles');
  }
  if (disp === 'escalera' && hyd.escaleraNiveles != null && hyd.escaleraCaras != null) {
    lines.push('Peldaños/cara: <strong>' + hyd.escaleraNiveles + '</strong> · Caras: <strong>' + hyd.escaleraCaras + '</strong>');
  }
  lines.push('Tubos de tu instalación: <strong>' + hyd.nCh + '</strong> × <strong>' + hyd.nHx + '</strong> huecos/tubo');
  if (altEff > 0) lines.push('Altura de bombeo al 1.º tubo: <strong>~' + altEff + ' cm</strong> (entra en el criterio de carga de la bomba).');
  else if (disp === 'pared' || disp === 'escalera') {
    lines.push(
      '<span class="nft-altura-alerta">Indica la altura de bombeo (cm) en Cultivo e instalación o asistente para un criterio más fiable.</span>'
    );
  }
  el.innerHTML = lines.join('<br>');
}

function actualizarMensajeNftCanalChecklist() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  const b = getNftBombaDesdeConfig(state.configTorre);
  const msg = document.getElementById('clNftGeomRecalcMsg');
  if (msg && b) {
    msg.innerHTML =
      '<span class="nft-canal-msg">Los datos del canal sirven para un <strong>criterio orientativo</strong> alineado con guías NFT habituales (película fina, 24 h). El resultado <strong>cumple / no cumple</strong> lo ves en depósito y bomba; aquí solo el desglose opcional.</span>' +
      nftWrapDetalleTecnicoSummary(nftBombaDetalleTecnicoHtml(b));
  }
  const n0h = document.getElementById('clNftN0GeomHint');
  if (n0h && b) {
    n0h.innerHTML =
      'Anota el caudal de la <strong>placa</strong> de tu bomba: verás si <strong>cumple</strong> el criterio orientativo. La decisión final es siempre la <strong>curva Q–H del fabricante</strong>.';
  }
  try { refrescarNftDepositoRecomendadoChecklistUI(); } catch (e) {}
  try { refrescarNftLayoutResumenChecklist(); } catch (e) {}
}

let _debounceNftCanalCl = 0;
function debouncePersistNftCanalChecklist() {
  clearTimeout(_debounceNftCanalCl);
  _debounceNftCanalCl = setTimeout(persistNftCanalDesdeChecklist, 450);
}

function persistNftCanalDesdeChecklist() {
  if (!state.configTorre || state.configTorre.tipoInstalacion !== 'nft') return;
  const rect = document.getElementById('clNftCanalEsRect')?.checked;
  const d = parseInt(String(document.getElementById('clNftCanalDiamMm')?.value || '90'), 10);
  const w = parseInt(String(document.getElementById('clNftCanalAnchoMm')?.value || '100'), 10);
  const lam = parseFloat(String(document.getElementById('clNftLaminaMm')?.value || '3'));
  const lmStr = document.getElementById('clNftLongCanalM')?.value ?? '';
  const lm = parseFloat(String(lmStr).replace(',', '.'));
  state.configTorre.nftCanalForma = rect ? 'rectangular' : 'redondo';
  state.configTorre.nftCanalDiamMm = Number.isFinite(d) ? Math.min(160, Math.max(50, d)) : 90;
  state.configTorre.nftCanalAnchoMm = Number.isFinite(w) ? Math.min(220, Math.max(40, w)) : 100;
  state.configTorre.nftLaminaAguaMm = Number.isFinite(lam) ? Math.min(6, Math.max(2, lam)) : 3;
  if (Number.isFinite(lm) && lm > 0) state.configTorre.nftLongCanalM = Math.min(15, Math.max(0.5, lm));
  else delete state.configTorre.nftLongCanalM;
  guardarEstadoTorreActual();
  saveState();
  actualizarMensajeNftCanalChecklist();
  refrescarUIMensajeBombaUsuarioNft('checklist');
}

let _nftBombaClBlurKey = '';
function onNftBombaUsuarioChecklistBlur() {
  refrescarUIMensajeBombaUsuarioNft('checklist');
  persistNftBombaUsuarioDesdeChecklist();
  const b = getNftBombaDesdeConfig(state.configTorre);
  const lhRaw = document.getElementById('clNftBombaUsuarioLh')?.value ?? '';
  const wRaw = document.getElementById('clNftBombaUsuarioW')?.value ?? '';
  const v = validarBombaUsuarioNftVsCalculo(b, lhRaw, wRaw);
  const key = v.tipo + '|' + lhRaw + '|' + wRaw;
  if (v.tipo === 'error' && v.toast && key !== _nftBombaClBlurKey) {
    _nftBombaClBlurKey = key;
    showToast(v.toast, true);
  }
}

function seleccionarTuboNft(mm) {
  setupNftTuboMm = Math.max(16, Math.min(40, parseInt(String(mm), 10) || 25));
  [16, 20, 25, 32, 40].forEach(d => {
    const el = document.getElementById('nftTubo' + d);
    if (el) el.classList.remove('selected');
  });
  const cur = document.getElementById('nftTubo' + setupNftTuboMm);
  if (cur) cur.classList.add('selected');
  if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
}

const NFT_POT_RIM_PRESETS_MM = [27, 38, 40, 50, 75];

function readNftPotCestaFromSetupUi() {
  const rimEl = document.getElementById('setupNftPotRimMm');
  const hEl = document.getElementById('setupNftPotHmm');
  const rim = parseInt(String(rimEl && rimEl.value != null ? rimEl.value : '').trim(), 10);
  const h = parseInt(String(hEl && hEl.value != null ? hEl.value : '').trim(), 10);
  return {
    rimMm: Number.isFinite(rim) && rim >= 25 && rim <= 120 ? rim : null,
    heightMm: Number.isFinite(h) && h >= 30 && h <= 200 ? h : null,
  };
}

function syncNftPotRimChipsFromInput() {
  const el = document.getElementById('setupNftPotRimMm');
  const raw = parseInt(String(el && el.value != null ? el.value : '').trim(), 10);
  NFT_POT_RIM_PRESETS_MM.forEach(d => {
    const b = document.getElementById('nftPotRim' + d);
    if (b) b.classList.toggle('selected', Number.isFinite(raw) && raw === d);
  });
}

function seleccionarNftPotRimPreset(mm) {
  const v = Math.max(25, Math.min(120, parseInt(String(mm), 10) || 50));
  const el = document.getElementById('setupNftPotRimMm');
  if (el) el.value = String(v);
  syncNftPotRimChipsFromInput();
  try {
    if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
  } catch (_) {}
  try {
    if (typeof actualizarResumenSetup === 'function') actualizarResumenSetup();
  } catch (_) {}
}

/** Ø de tubo de cultivo estándar más cercano al valor objetivo (mm). */
function nftCanalDiamPresetCercano(mm) {
  const target = Math.round(Number(mm));
  if (!Number.isFinite(target)) return 90;
  const presets = [75, 90, 110];
  let best = presets[1];
  let bestD = Infinity;
  for (let i = 0; i < presets.length; i++) {
    const d = Math.abs(presets[i] - target);
    if (d < bestD) {
      bestD = d;
      best = presets[i];
    }
  }
  return best;
}

function nftRefreshAplicarRecoBtns(scope, r, hayCultivo) {
  const btnCesta = document.getElementById(scope === 'setup' ? 'setupNftAplicarCestaBtn' : 'sysNftAplicarCestaBtn');
  const btnCanal = document.getElementById('setupNftAplicarCanalBtn');
  const hasCesta = !!(r && r.cesta && r.cesta.reco);
  if (btnCesta) btnCesta.disabled = !hasCesta;
  if (btnCanal) {
    const showCanal = !!(hayCultivo && r && r.perfil && r.perfil.permite && scope === 'setup');
    btnCanal.disabled = !showCanal;
    btnCanal.classList.toggle('setup-hidden', !showCanal);
  }
}

/** Rellena diám. y altura de cesta con la recomendación (canal + lámina + cultivo). */
function aplicarNftCestaRecomendada(scope) {
  scope = scope === 'sys' ? 'sys' : 'setup';
  const draft = nftDraftParaCompatibilidad(scope);
  const r = typeof nftRecomendacionCultivoDesdeConfig === 'function' ? nftRecomendacionCultivoDesdeConfig(draft) : null;
  if (!r || !r.cesta || !r.cesta.reco) return;
  const reco = r.cesta.reco;
  if (scope === 'setup') {
    const rimEl = document.getElementById('setupNftPotRimMm');
    const hEl = document.getElementById('setupNftPotHmm');
    if (rimEl) rimEl.value = String(reco.rimReco);
    if (hEl) hEl.value = String(reco.altReco);
    syncNftPotRimChipsFromInput();
    try {
      if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
    } catch (_) {}
    try {
      if (typeof actualizarResumenSetup === 'function') actualizarResumenSetup();
    } catch (_) {}
  } else {
    const rimEl = document.getElementById('sysNftPotRimMm');
    const hEl = document.getElementById('sysNftPotHmm');
    if (rimEl) rimEl.value = String(reco.rimReco);
    if (hEl) hEl.value = String(reco.altReco);
    if (typeof syncSistemaNftPotRimChipsFromInput === 'function') syncSistemaNftPotRimChipsFromInput();
    if (state.configTorre && state.configTorre.tipoInstalacion === 'nft') {
      state.configTorre.nftNetPotRimMm = reco.rimReco;
      state.configTorre.nftNetPotHeightMm = reco.altReco;
    }
    try {
      renderNftCultivoRecoStatus('sys');
    } catch (_) {}
    try {
      if (typeof renderTorre === 'function') renderTorre();
    } catch (_) {}
  }
}

/** Ajusta Ø/ancho del canal al rango del cultivo elegido (asistente). */
function aplicarNftCanalRecomendado(scope) {
  if (scope !== 'setup') return;
  const draft = nftDraftParaCompatibilidad('setup');
  const r = typeof nftRecomendacionCultivoDesdeConfig === 'function' ? nftRecomendacionCultivoDesdeConfig(draft) : null;
  if (!r || !r.perfil || !r.perfil.permite) return;
  const mid = Math.round((r.perfil.canalMinMm + r.perfil.canalMaxMm) / 2);
  const geom = nftCanalGeomDesdeConfig(draft);
  if (geom.forma === 'rectangular') {
    const el = document.getElementById('nftCanalAnchoMm');
    if (el) el.value = String(Math.min(220, Math.max(40, mid)));
    try {
      if (typeof updateNftSetupPreview === 'function') updateNftSetupPreview();
    } catch (_) {}
    return;
  }
  const diam = nftCanalDiamPresetCercano(mid);
  if (typeof seleccionarNftCanalDiam === 'function') seleccionarNftCanalDiam(diam);
}

/** Bloque compacto de resultados en el asistente NFT (depósito, bomba, aireador). */
function nftRefreshSetupCalculadoUi(draft, bNft, hyd) {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'nft') return;
  const block = document.getElementById('setupNftRecoBlock');
  const elDep = document.getElementById('setupNftRecoDeposito');
  const elBom = document.getElementById('setupNftRecoBomba');
  const elAir = document.getElementById('setupNftRecoAire');
  const valLegacy = document.getElementById('setupNftRecoValor');
  if (!elDep && !valLegacy) return;
  draft =
    draft ||
    (typeof buildNftDraftConfigFromSetupUi === 'function' ? buildNftDraftConfigFromSetupUi() : {});
  hyd = hyd || (typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(draft) : null);
  bNft = bNft || (typeof getNftBombaDesdeConfig === 'function' ? getNftBombaDesdeConfig(draft) : null);
  if (block) {
    block.classList.remove('setup-dwc-litros-solucion-block--pending', 'setup-dwc-litros-solucion-block--ok');
  }
  const pendiente = !hyd || hyd.nCh < 1 || hyd.nHx < 2;
  if (pendiente) {
    if (block) block.classList.add('setup-dwc-litros-solucion-block--pending');
    const dash = 'Indica tubos y huecos';
    if (elDep) elDep.textContent = dash;
    if (elBom) elBom.textContent = '—';
    if (elAir) elAir.textContent = '—';
    if (valLegacy) valLegacy.textContent = dash;
    return;
  }
  if (!bNft || !Number.isFinite(bNft.caudalRecLH)) {
    if (block) block.classList.add('setup-dwc-litros-solucion-block--pending');
    if (elDep) elDep.textContent = '—';
    if (elBom) elBom.textContent = '—';
    if (elAir) elAir.textContent = '—';
    return;
  }
  if (block) block.classList.add('setup-dwc-litros-solucion-block--ok');
  const geom = typeof nftCanalGeomDesdeConfig === 'function' ? nftCanalGeomDesdeConfig(draft) : {};
  const lam = bNft.laminaMm != null ? bNft.laminaMm : geom.laminaMm;
  const depTxt =
    '~' +
    bNft.volDepositoRecomendadoL +
    ' L' +
    (lam != null ? ' · lámina ' + lam + ' mm' : '') +
    (bNft.volPeliculaL != null ? ' · película ~' + bNft.volPeliculaL + ' L' : '');
  const bomTxt =
    bNft.caudalRecLH +
    ' L/h (mín. ' +
    bNft.caudalMinLH +
    ') · ~' +
    (bNft.potenciaRecW != null ? bNft.potenciaRecW : '—') +
    ' W · altura ≥ ' +
    (bNft.headMetros != null ? bNft.headMetros : '—') +
    ' m';
  let airTxt = '—';
  const volAir = bNft.volDepositoRecomendadoL;
  if (volAir != null && typeof dwcCaudalAireOrientativoLmin === 'function') {
    const a = dwcCaudalAireOrientativoLmin(volAir);
    if (a) {
      const w = Math.max(3, Math.ceil(a.reco * 1.75));
      airTxt = '~' + a.reco + ' L/min · ~' + w + ' W';
    }
  }
  if (elDep) elDep.textContent = depTxt;
  if (elBom) elBom.textContent = bomTxt;
  if (elAir) elAir.textContent = airTxt;
  if (valLegacy) valLegacy.textContent = depTxt + ' · ' + bomTxt;
}

function pintarResultadoBombaNftUI(b, volUsuarioL) {
  const el = document.getElementById('resultadoBombaNft');
  if (!el) return;
  if (!b) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  const vol =
    volUsuarioL != null && Number.isFinite(Number(volUsuarioL))
      ? Math.round(Number(volUsuarioL))
      : parseInt(document.getElementById('sliderVol')?.value || 20, 10);
  el.style.display = 'block';
  const altTxt =
    b.alturaBombeoCm > 0
      ? 'La altura indicada al 1.º canal entra en el criterio de carga de la bomba (junto a pérdidas típicas de la línea de alimentación).'
      : 'Si el agua sube mucho hasta el primer canal, indica esa altura para afinar el criterio; si no, el fabricante sigue mandando con la curva Q–H.';
  el.innerHTML =
    '<div class="nft-bomba-panel-title">⚡ Bomba y depósito (NFT · 24 h)</div>' +
    '<div class="nft-bomba-panel-okbox">' +
    '<div class="nft-bomba-panel-oktitle">Configuración coherente</div>' +
    '<div class="nft-bomba-panel-oktext">Con los datos del asistente, los requisitos encajan con <strong>instalaciones NFT domésticas habituales</strong> (película fina, recirculación continua). ' +
    'Al elegir bomba, prioriza la <strong>curva Q–H del fabricante</strong> a la altura real de tu montaje.</div>' +
    '<div class="nft-bomba-panel-alt">' +
    altTxt +
    '</div></div>' +
    nftDepositoVeredictoBloqueHtml(b, vol) +
    nftWrapDetalleTecnicoSummary(nftBombaDetalleTecnicoHtml(b)) +
    '<p class="nft-bomba-panel-foot">Abajo puedes anotar el caudal de la <strong>placa</strong> de tu bomba: la app te dirá si <strong>cumple</strong> o no ese criterio orientativo.</p>';
}

/** Texto unificado al pie de los SVG NFT (sin forma de canal ni lámina). */
var NFT_SVG_FOOT_ORIENT_HINT = '';

/**
 * Radio del área táctil para huecos NFT (coord. viewBox). Evita solapes agresivos entre vecinos.
 * @param {number} hrVisual radio del círculo visible
 * @param {boolean} interactive
 * @param {number} centerSpacing distancia entre centros de dos huecos consecutivos en el mismo tubo (Infinity si un solo hueco)
 */
function nftHuecoPointerRadius(hrVisual, interactive, centerSpacing) {
  const baseNoTouch = Math.max(hrVisual * 2.5, 12);
  if (!interactive) return baseNoTouch;
  const target = Math.max(hrVisual * 4.1, 22);
  if (!Number.isFinite(centerSpacing) || centerSpacing <= 0) return target;
  const cap = Math.max(14, centerSpacing * 0.5);
  return Math.min(target, cap);
}

/** Nivel de legibilidad (0–2) para insignia de altura y volumen del depósito en diagramas NFT. */
function nftDiagramLegibilityHint(h) {
  if (!h || typeof h !== 'object') return 0;
  const nc = Number(h.nCanales) || 0;
  const nt = Number(h.nTubosTotal) || 0;
  const v = Number(h.volL) || 0;
  if (nc >= 12 || nt >= 15 || v >= 100) return 2;
  if (nc >= 7 || nt >= 9 || v >= 55) return 1;
  return 0;
}

/** Tamaño de fuente del volumen (L) en el depósito según volumen y nivel de legibilidad. */
function nftTankVolumeFontSize(volL, legTier) {
  const v = Number(volL);
  const vv = Number.isFinite(v) ? v : 20;
  let fs = 18;
  if (legTier >= 2) fs = 23;
  else if (legTier >= 1) fs = 21;
  if (vv >= 120) fs = Math.max(fs, 24);
  return Math.min(28, fs);
}

/** Reservado (altura de bombeo): sin texto en el SVG; los datos siguen en panel/asistente. */
function nftAlturaBadgeBesideTank(altCm, tx, tankY, tankW, tankH, canvasW0, hint) {
  const canvasW = Math.max(Number(canvasW0) || 660, tx + tankW + 10);
  return { html: '', canvasW };
}

/** Ancho lógico del canvas NFT (tubos más largos → huecos más separados y legibles). */
function nftDiagramCanvasW0() {
  return 660;
}

/**
 * Título y subtítulo del diagrama NFT: escala con el ancho del viewBox para que no queden ilegibles al encoger el SVG.
 * @param {number} Wref ancho de referencia (p. ej. W0 o canvasW)
 * @param {{ compact?: boolean, withLegend?: boolean }} [opts] withLegend false = serpentín (sin franja leyenda bajo el subtítulo)
 */
function nftDiagramHeaderTypography(Wref, opts) {
  const compact = !!(opts && opts.compact);
  const withLegend = !(opts && opts.withLegend === false);
  const topPadMin = compact ? 26 : withLegend ? 28 : 24;
  return { mainFs: 0, subFs: 0, yMain: 14, ySub: 22, legendY: 28, footFs: 9, topPadMin };
}

/**
 * Leyenda fija solo en NFT mesa multinivel y escalera (esquema tipo manual).
 * @param {number} cx centro horizontal del título (viewBox)
 * @param {number} yLine línea base visual (centro de iconos)
 * @param {string} gidCh id del gradiente del canal (mismo que los rect de tubo)
 * @param {boolean} compact modo >20 tubos
 * @param {boolean} [largeLegend] leyenda más grande (NFT mesa)
 */
function nftMesaEscaleraLegendSvg(cx, yLine, gidCh, compact, largeLegend) {
  return '';
}

const NFT_SVG_PE_NONE = ' pointer-events="none"';

/** Emoji centrado en la cesta (más grande al no compartir espacio con el número). */
function nftSvgHuecoEmojiOnly(dat, cult, gx, gy, hrGi, compact) {
  const hasV = dat && String(dat.variedad || '').trim() !== '';
  if (!hasV || hrGi < 4) return '';
  const em = cultivoEmoji(cult);
  const emFs = Math.max(13, Math.min(hrGi * 1.88, compact ? 26 : 32));
  return (
    '<text x="' +
    gx.toFixed(2) +
    '" y="' +
    gy.toFixed(2) +
    '" text-anchor="middle" dominant-baseline="central" font-size="' +
    emFs.toFixed(1) +
    '" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,system-ui,sans-serif"' +
    NFT_SVG_PE_NONE +
    '>' +
    em +
    '</text>'
  );
}

/** Número de hueco a un lado del tubo vertical (anchor end = izquierda del tubo, start = derecha). */
function nftSvgHuecoNumBesideVertBar(numX, gy, numShow, fs, anchor) {
  const anc = anchor === 'start' ? 'start' : 'end';
  return (
    '<text x="' +
    numX.toFixed(2) +
    '" y="' +
    gy.toFixed(2) +
    '" text-anchor="' +
    anc +
    '" dominant-baseline="central" font-size="' +
    fs +
    '" font-weight="800" fill="#475569"' +
    NFT_SVG_PE_NONE +
    '>' +
    numShow +
    '</text>'
  );
}

/**
 * Número de hueco bajo el círculo (tubo horizontal: escalera, serpentín, mesa 1 nivel).
 * @param {number} [extraDy] separación extra bajo el círculo (p. ej. si la etiqueta T queda cerca).
 */
function nftSvgHuecoNumBelowHole(gx, gy, hrGi, numShow, fs, compact, extraDy) {
  const ex = extraDy != null && Number.isFinite(Number(extraDy)) ? Number(extraDy) : 0;
  const dy = Math.max(7, Math.min(15, hrGi * 0.42 + (compact ? 4 : 6))) + ex;
  const ny = gy + hrGi + dy;
  return (
    '<text x="' +
    gx.toFixed(2) +
    '" y="' +
    ny.toFixed(2) +
    '" text-anchor="middle" font-size="' +
    fs +
    '" font-weight="800" fill="#475569"' +
    NFT_SVG_PE_NONE +
    '>' +
    numShow +
    '</text>'
  );
}

/**
 * NFT mesa multinivel: franjas con distinto número de tubos; flujo en serpentín entre franjas.
 */
function buildNftMesaMultinivelDiagramSvg(tiers, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  const EO = equipOpts || {};
  const interactive = EO.interactive === true;
  const showCalentador = EO.calentador === true;
  const showDifusor = EO.difusor === true;
  const bomb = EO.bombaInfo || null;
  const userQ = EO.userCaudalLh != null && EO.userCaudalLh > 0 ? Math.round(EO.userCaudalLh) : null;
  const userW = EO.userPotenciaW != null && EO.userPotenciaW > 0 ? Math.round(EO.userPotenciaW) : null;
  const altCmLbl =
    EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0 ? Math.round(Number(EO.nftAlturaBombeoCm)) : null;

  const suf = (svgIdSuffix != null && String(svgIdSuffix).trim() !== '')
    ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  const gidCh = 'nftMMCh' + suf;
  const gidTank = 'nftMMTk' + suf;
  const gidAqua = 'nftMMAq' + suf;
  const tid = 'nftMMTitle' + suf;

  const huecosN = Math.min(Math.max(parseInt(String(huecos), 10) || 2, 2), 30);
  const pend = Math.min(Math.max(parseInt(String(pendPct), 10) || 2, 1), 4);
  const vol = Math.min(200, Math.max(5, parseInt(String(volL), 10) || 20));

  const tiersNums = tiers.map(t => Math.max(0, parseInt(String(t), 10) || 0));
  const nTubosMesa = tiersNums.reduce((a, b) => a + b, 0);
  const maxTubosPorNivelMesa = tiersNums.length ? Math.max.apply(null, tiersNums) : 0;
  const nTiers = tiers.length;
  const compactMesa = nTubosMesa > 20;

  /**
   * Ancho mínimo por canal: 1 nivel = tubo horizontal largo; varios niveles = columnas estrechas
   * (cestas apiladas en Y).
   */
  const gapT = compactMesa ? 5 : 6;
  const minUnitsPerTube = (compactMesa ? 44 : 52) + huecosN * (compactMesa ? 14 : 17);
  const minColUnitsMesaMM = compactMesa ? 50 : 58;
  const minRowForHuecos =
    maxTubosPorNivelMesa <= 0
      ? 420
      : nTiers > 1
        ? maxTubosPorNivelMesa * minColUnitsMesaMM + Math.max(0, maxTubosPorNivelMesa - 1) * gapT
        : maxTubosPorNivelMesa * minUnitsPerTube + Math.max(0, maxTubosPorNivelMesa - 1) * gapT;
  const W0 = Math.max(
    nftDiagramCanvasW0(),
    Math.min(compactMesa ? 1100 : 1240, minRowForHuecos + 96 + 2 * 12 + Math.max(0, nTiers - 2) * 8)
  );
  const hdrMesa = nftDiagramHeaderTypography(W0, { compact: compactMesa, withLegend: true });
  const xLmmPre = 40;
  const xRmmPre = W0 - 40;
  const padFlowMMPre = 12;
  const rowInnerPreMM = Math.max(160, xRmmPre - xLmmPre - 2 * padFlowMMPre);
  const maxNtPreMM = Math.max(1, maxTubosPorNivelMesa);
  const colWPreMM = (rowInnerPreMM - Math.max(0, maxNtPreMM - 1) * gapT) / maxNtPreMM;
  const topPad = Math.max(70 + (compactMesa ? 8 : 0), hdrMesa.topPadMin);
  const botTank = 162;
  let tierRowH = Math.max(
    88,
    Math.min(138, Math.floor(520 / Math.max(nTiers, 1)) + huecosN * 5 + (maxTubosPorNivelMesa <= 2 ? 18 : 0))
  );
  if (nTiers >= 3) tierRowH = Math.max(tierRowH, 92);
  if (maxTubosPorNivelMesa <= 2) tierRowH = Math.max(tierRowH, 96);
  else if (maxTubosPorNivelMesa <= 3) tierRowH = Math.max(tierRowH, 90);
  if (compactMesa) {
    tierRowH = Math.max(74, Math.round(tierRowH * 0.9));
  }
  if (nTiers > 1) {
    const hrPreMM = Math.min(compactMesa ? 22 : 26, Math.max(compactMesa ? 12.5 : 14, colWPreMM * 0.44));
    const slotPadMM = compactMesa ? 6 : 8;
    const gapVNeedMM = 2 * hrPreMM + slotPadMM;
    const bandPadMM = compactMesa ? 46 : 56;
    const stackMinMM = (huecosN - 1) * gapVNeedMM + 2 * hrPreMM + bandPadMM;
    tierRowH = Math.max(tierRowH, stackMinMM, compactMesa ? 118 : 136);
  }
  const tierGapMM = nTiers > 1 ? (compactMesa ? 14 : 20) : 0;
  const tierPitch = tierRowH + tierGapMM;
  const H = topPad + nTiers * tierRowH + Math.max(0, nTiers - 1) * tierGapMM + botTank;
  const cx = W0 / 2;
  const xL = 40;
  const xR = W0 - 40;
  const padFlow = 12;
  const tankY = H - botTank + 4;
  const tankH = 102;
  const tankW = Math.min(400, Math.round(152 + vol * 0.72));
  const tx = (W0 - tankW) / 2;
  const waterTop = tankY + 6;
  const waterH = tankH - 16;
  const xRiser = Math.max(26, Math.min(tx + 28, xL - 10));
  const legHintMM = { volL: vol, nCanales: maxTubosPorNivelMesa, nTubosTotal: nTubosMesa, alturaBadgeNTubos: nTubosMesa };
  const legTierMM = nftDiagramLegibilityHint(legHintMM);
  const volFsMM = nftTankVolumeFontSize(vol, legTierMM);
  const altBadgeMM = nftAlturaBadgeBesideTank(altCmLbl, tx, tankY, tankW, tankH, W0, legHintMM);
  const Wsvg = altBadgeMM.canvasW;
  const cxTitle = Wsvg / 2;
  const xTankFeedMM = tx + 12;
  const xTankReturnMM = tx + tankW - 12;
  const yInletMM = tankY + 16;
  const yPump = waterTop + Math.min(18, waterH * 0.45);
  const rowInner = xR - xL - 2 * padFlow;
  const geoms = [];
  let gIdx = 0;
  if (nTiers <= 1) {
    for (let t = 0; t < nTiers; t++) {
      const nt = tiersNums[t];
      const rowY = topPad + t * tierPitch + tierRowH / 2;
      const tubeW = nt <= 0 ? rowInner : (rowInner - (nt - 1) * gapT) / nt;
      const order = t % 2 === 0 ? [...Array(nt).keys()] : [...Array(nt).keys()].reverse();
      for (const layoutK of order) {
        const xTubeL = xL + padFlow + layoutK * (tubeW + gapT);
        geoms.push({
          g: gIdx++,
          t,
          rowY,
          xL: xTubeL,
          xR: xTubeL + tubeW,
          l2r: t % 2 === 0,
        });
      }
    }
  } else {
    const maxNt = Math.max(1, maxTubosPorNivelMesa);
    const tubeW = (rowInner - (maxNt - 1) * gapT) / maxNt;
    for (let t = 0; t < nTiers; t++) {
      const nt = tiersNums[t];
      const rowY = topPad + t * tierPitch + tierRowH / 2;
      for (let k = 0; k < nt; k++) {
        const xTubeL = xL + padFlow + k * (tubeW + gapT);
        geoms.push({
          g: gIdx++,
          t,
          rowY,
          xL: xTubeL,
          xR: xTubeL + tubeW,
          l2r: t % 2 === 0,
        });
      }
    }
  }

  const geomByG = {};
  for (let gi = 0; gi < geoms.length; gi++) geomByG[geoms[gi].g] = geoms[gi];
  const hydSeq = (function () {
    if (geoms.length === 0) return [];
    if (nTiers <= 1) return geoms.map(G => G.g);
    const seq = [];
    let base = 0;
    for (let t = 0; t < nTiers; t++) {
      const nt = tiersNums[t];
      const seg = [];
      for (let k = 0; k < nt; k++) seg.push(base + k);
      if (t % 2 === 1) seg.reverse();
      for (let hi = 0; hi < seg.length; hi++) seq.push(seg[hi]);
      base += nt;
    }
    return seq;
  })();

  /**
   * 1 nivel: canal horizontal. Varios niveles: cada T es una columna (canal vertical esquemático)
   * con cestas apiladas; columnas alineadas; flujo serpentín sigue en el eje X al centro de cada columna.
   */
  const padAlongX = 10;
  function mesaMultinivelHoleLayout(G) {
    const xC = (G.xL + G.xR) / 2;
    const colW = Math.max(10, G.xR - G.xL);
    const hr = interactive
      ? Math.max(compactMesa ? 12.5 : 14, Math.min(compactMesa ? 22 : 26, colW * 0.44))
      : Math.max(compactMesa ? 11 : 12, Math.min(compactMesa ? 20 : 24, colW * 0.4));
    const gapVMin = 2 * hr + (compactMesa ? 5 : 7);
    const vBand = compactMesa ? 22 : 28;
    const maxHalf = Math.max(0, tierRowH / 2 - vBand);
    let gapV = Math.max(gapVMin, hr * 1.12);
    let halfSpan = huecosN <= 1 ? 0 : ((huecosN - 1) * gapV) / 2;
    if (huecosN > 1 && halfSpan + hr > maxHalf) {
      const gapVF = (2 * (maxHalf - hr)) / (huecosN - 1);
      gapV = gapVF < gapVMin ? gapVMin : gapVF;
      halfSpan = ((huecosN - 1) * gapV) / 2;
    }
    const down = G.t % 2 === 0;
    function gyForJ(j) {
      const ji = down ? j : huecosN - 1 - j;
      return G.rowY - halfSpan + ji * gapV;
    }
    let yMin = G.rowY;
    let yMax = G.rowY;
    if (huecosN > 1) {
      yMin = gyForJ(0);
      yMax = gyForJ(huecosN - 1);
      if (yMin > yMax) {
        const tmp = yMin;
        yMin = yMax;
        yMax = tmp;
      }
    }
    const tubeExt = Math.max(hr * 0.7, compactMesa ? 12 : 17);
    const yTop = yMin - hr - tubeExt;
    const yBot = yMax + hr + tubeExt;
    const barW = Math.max(14, Math.min(28, colW * 0.52));
    return { xC, colW, hr, gapV, gyForJ, yTop, yBot, barW, slotAlongG: gapV };
  }
  function mmShelf(G) {
    if (nTiers > 1) {
      const L = mesaMultinivelHoleLayout(G);
      const halfW = Math.max(10, (G.xR - G.xL) / 2 - padFlow * 0.35);
      return {
        x0: L.xC - halfW,
        x1: L.xC + halfW,
        yC: G.rowY,
        yT: L.yTop,
        yB: L.yBot,
        thick: Math.max(14, L.yBot - L.yTop),
        wid: halfW * 2,
      };
    }
    const x0 = G.xL + padFlow + padAlongX;
    const x1 = G.xR - padFlow - padAlongX;
    const yC = G.rowY;
    let thick = Math.min(22, Math.max(11, 10.5 + huecosN * 0.75 + tierRowH * 0.065));
    if (compactMesa) thick = Math.max(10, Math.round(thick * 0.9));
    return {
      x0,
      x1,
      yC,
      yT: yC - thick / 2,
      yB: yC + thick / 2,
      thick,
      wid: Math.max(8, x1 - x0),
    };
  }

  const padHuecoAlong = 8;

  const flowDash = 'stroke-dasharray="11 9" stroke-linecap="round" stroke-linejoin="round"';
  const flowSt = 'stroke="' + HC_DIAG.nft.flow + '" fill="none" ' + flowDash;
  const fqPath = function (v) {
    const n = Math.round(Number(v) * 100) / 100;
    return Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(2);
  };
  const xPumpMM = tx + 14;
  const yOutletMM = tankY + tankH - 16;
  let flowD = 'M ' + fqPath(xPumpMM) + ' ' + fqPath(yPump);
  flowD += ' L ' + fqPath(xTankFeedMM) + ' ' + fqPath(yPump);
  flowD += ' L ' + fqPath(xTankFeedMM) + ' ' + fqPath(yOutletMM);
  flowD += ' L ' + fqPath(xRiser) + ' ' + fqPath(yOutletMM);
  let flowLastX = xRiser;
  let flowLastY = yOutletMM;
  if (nTiers > 1 && hydSeq.length) {
    const er = compactMesa ? 12 : 16;
    let lx = xRiser;
    let ly = yOutletMM;
    const Lto = function (x, y) {
      flowD += ' L ' + fqPath(x) + ' ' + fqPath(y);
      lx = x;
      ly = y;
    };
    const Arc = function (ex, ey, sw) {
      flowD += ' A ' + fqPath(er) + ' ' + fqPath(er) + ' 0 0 ' + sw + ' ' + fqPath(ex) + ' ' + fqPath(ey);
      lx = ex;
      ly = ey;
    };
    const orthoKnee = function (tx, ty) {
      if (Math.abs(lx - tx) < 0.8 && Math.abs(ly - ty) < 0.8) return;
      if (Math.abs(lx - tx) < 0.8) {
        Lto(tx, ty);
        return;
      }
      if (Math.abs(ly - ty) < 0.8) {
        Lto(tx, ty);
        return;
      }
      const sx = tx > lx ? 1 : -1;
      const sy = ty > ly ? 1 : -1;
      if (Math.abs(ty - ly) > er && Math.abs(tx - lx) > er) {
        Lto(lx, ty - sy * er);
        const swK = sx > 0 ? (sy > 0 ? 1 : 0) : sy > 0 ? 0 : 1;
        Arc(lx + sx * er, ty, swK);
        Lto(tx, ty);
      } else {
        Lto(lx, ty);
        Lto(tx, ty);
      }
    };
    for (let i = 0; i < hydSeq.length; i++) {
      const Gc = geomByG[hydSeq[i]];
      const Lc = mesaMultinivelHoleLayout(Gc);
      const xC = Lc.xC;
      const yT = Lc.yTop;
      const yB = Lc.yBot;
      const Gn = i + 1 < hydSeq.length ? geomByG[hydSeq[i + 1]] : null;
      const xNext = Gn ? mesaMultinivelHoleLayout(Gn).xC : null;
      let dir;
      if (Gn) {
        dir = xNext >= xC - 0.5 ? 1 : -1;
      } else if (i > 0) {
        const xPrev = mesaMultinivelHoleLayout(geomByG[hydSeq[i - 1]]).xC;
        dir = xC >= xPrev - 0.5 ? 1 : -1;
      } else {
        dir = 1;
      }
      const up = i % 2 === 0;
      const xIn = xC - dir * er;
      const xOut = xC + dir * er;
      const yIn = up ? yB : yT;
      if (i === 0) {
        Lto(xRiser, yB);
        Lto(xIn, yB);
      } else {
        const Gp = geomByG[hydSeq[i - 1]];
        const tierJump = Gp.t !== Gc.t;
        if (tierJump) {
          if (Math.abs(lx - xC) > 0.8) {
            Lto(xC, ly);
          }
          if (Math.abs(ly - yIn) > 0.8) {
            Lto(xC, yIn);
          }
          if (Math.abs(lx - xIn) > 0.8) {
            Lto(xIn, yIn);
          }
        } else {
          orthoKnee(xIn, yIn);
        }
      }
      if (up) {
        if (dir > 0) {
          Arc(xC, yB - er, 0);
          Lto(xC, yT + er);
          Arc(xOut, yT, 1);
        } else {
          Arc(xC, yB - er, 1);
          Lto(xC, yT + er);
          Arc(xOut, yT, 0);
        }
      } else {
        if (dir > 0) {
          Arc(xC, yT + er, 1);
          Lto(xC, yB - er);
          Arc(xOut, yB, 0);
        } else {
          Arc(xC, yT + er, 0);
          Lto(xC, yB - er);
          Arc(xOut, yB, 1);
        }
      }
    }
    flowLastX = lx;
    flowLastY = ly;
  } else {
    const flowMarginMm1 = 10;
    for (let i = 0; i < hydSeq.length; i++) {
      const Gcur = geomByG[hydSeq[i]];
      const H = mmShelf(Gcur);
      const l2r = i % 2 === 0;
      const xIn = l2r ? H.x0 : H.x1;
      const xOut = l2r ? H.x1 : H.x0;
      if (i === 0) {
        flowD += ' L ' + fqPath(xRiser) + ' ' + fqPath(H.yC);
        flowD += ' L ' + fqPath(xIn) + ' ' + fqPath(H.yC);
        flowD += ' L ' + fqPath(xOut) + ' ' + fqPath(H.yC);
      } else {
        const Gprev = geomByG[hydSeq[i - 1]];
        const P = mmShelf(Gprev);
        const prevL2r = (i - 1) % 2 === 0;
        const prevOut = prevL2r ? P.x1 : P.x0;
        const xDrop = prevL2r ? P.x1 + flowMarginMm1 : P.x0 - flowMarginMm1;
        if (Math.abs(H.yC - P.yC) > 0.5) {
          flowD += ' L ' + fqPath(xDrop) + ' ' + fqPath(P.yC);
          flowD += ' L ' + fqPath(xDrop) + ' ' + fqPath(H.yC);
        } else if (Math.abs(prevOut - xIn) > 0.5) {
          flowD += ' L ' + fqPath(xDrop) + ' ' + fqPath(H.yC);
        }
        if (Math.abs(prevOut - xIn) > 0.5 || Math.abs(H.yC - P.yC) <= 0.5) {
          flowD += ' L ' + fqPath(xIn) + ' ' + fqPath(H.yC);
        }
        flowD += ' L ' + fqPath(xOut) + ' ' + fqPath(H.yC);
      }
    }
    if (hydSeq.length) {
      const Gl = geomByG[hydSeq[hydSeq.length - 1]];
      const Hl = mmShelf(Gl);
      const ll2r = (hydSeq.length - 1) % 2 === 0;
      flowLastX = ll2r ? Hl.x1 : Hl.x0;
      flowLastY = Hl.yC;
    }
  }
  const Glast = hydSeq.length ? geomByG[hydSeq[hydSeq.length - 1]] : null;
  const lm = Glast ? mmShelf(Glast) : { yC: topPad + tierRowH / 2, x0: xL, x1: xR };
  const retYJoin = nTiers > 1 && hydSeq.length ? flowLastY : lm.yC;
  const xReturnRiserMM = Math.min(Wsvg - 14, xR + 12);
  let yDuctMm = retYJoin + (compactMesa ? 12 : 16);
  if (yDuctMm > tankY - 6) yDuctMm = tankY - 8;
  flowD += ' L ' + fqPath(flowLastX) + ' ' + fqPath(retYJoin);
  flowD += ' L ' + fqPath(xReturnRiserMM) + ' ' + fqPath(retYJoin);
  flowD += ' L ' + fqPath(xReturnRiserMM) + ' ' + fqPath(yDuctMm);
  flowD += ' L ' + fqPath(xTankReturnMM) + ' ' + fqPath(yDuctMm);
  flowD += ' L ' + fqPath(xTankReturnMM) + ' ' + fqPath(yInletMM);

  let back =
    '<path d="' + flowD + '" stroke="#cbd5e1" stroke-width="4" fill="none" opacity="0.45" stroke-linecap="round" stroke-linejoin="round"/>';

  let channels = '';
  const peNoneCh = interactive ? ' pointer-events="none"' : '';
  const nGeomMM = geoms.length;
  let tLabelFsMM = nGeomMM >= 14 ? 10.5 : nGeomMM >= 8 ? 11.5 : 12.5;
  if (compactMesa) tLabelFsMM = Math.max(9, tLabelFsMM - 1.2);
  for (let gi = 0; gi < geoms.length; gi++) {
    const G = geoms[gi];
    if (nTiers > 1) {
      const L = mesaMultinivelHoleLayout(G);
      const hBar = L.yBot - L.yTop;
      const rxV = Math.min(11, Math.max(4, L.barW / 2 - 0.5));
      channels +=
        '<rect x="' +
        (L.xC - L.barW / 2) +
        '" y="' +
        L.yTop +
        '" width="' +
        L.barW +
        '" height="' +
        hBar +
        '" rx="' +
        rxV +
        '" fill="url(#' +
        gidCh +
        ')" stroke="#0369a1" stroke-width="1.05"' +
        peNoneCh +
        '/>';
      channels +=
        '<text x="' +
        L.xC +
        '" y="' +
        (L.yTop - 7) +
        '" text-anchor="middle" dominant-baseline="auto" font-size="' +
        tLabelFsMM +
        '" class="svg-paint-order-stroke" font-weight="900" fill="#0c4a6e" stroke="#f8fafc" stroke-width="0.4" stroke-opacity="0.9"' +
        peNoneCh +
        '>T' +
        (G.g + 1) +
        '</text>';
    } else {
      const S = mmShelf(G);
      const rxR = Math.min(10, S.thick * 0.85);
      channels +=
        '<rect x="' +
        S.x0 +
        '" y="' +
        S.yT +
        '" width="' +
        S.wid +
        '" height="' +
        S.thick +
        '" rx="' +
        rxR +
        '" fill="url(#' +
        gidCh +
        ')" stroke="#0369a1" stroke-width="1.05"' +
        peNoneCh +
        '/>';
      channels +=
        '<text x="' +
        (S.x0 + S.wid / 2) +
        '" y="' +
        (S.yT - 6) +
        '" text-anchor="middle" dominant-baseline="auto" font-size="' +
        tLabelFsMM +
        '" class="svg-paint-order-stroke" font-weight="900" fill="#0c4a6e" stroke="#f8fafc" stroke-width="0.4" stroke-opacity="0.9"' +
        peNoneCh +
        '>T' +
        (G.g + 1) +
        '</text>';
    }
  }

  const nftFlowAnim = torreSvgAnimacionesActivas();
  let flowLayer =
    '<path d="' + flowD + '" ' + flowSt + ' stroke-width="2.2" opacity="0.95"' +
    (nftFlowAnim
      ? '><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.35s" repeatCount="indefinite" calcMode="linear"/></path>'
      : '/>');
  const slotDenom = Math.max(1, huecosN - 1);
  const holeNumFsMM = nGeomMM >= 14 ? 9.5 : nGeomMM >= 8 ? 10 : 10.75;
  let plants = '';
  for (let gi = 0; gi < geoms.length; gi++) {
    const G = geoms[gi];
    if (nTiers > 1) {
      const L = mesaMultinivelHoleLayout(G);
      const hrGi = L.hr;
      const slotAlongG = L.slotAlongG;
      for (let j = 0; j < huecosN; j++) {
        const gx = L.xC;
        const gy = L.gyForJ(j);
        const numShow = j + 1;
        let dat = { variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] };
        if (interactive && state.torre[G.g] && state.torre[G.g][j]) dat = state.torre[G.g][j];
        const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
        const col = interactive ? torreListaColorCesta(G.g, j) : { bg: '#f8fafc', border: '#94a3b8' };
        const multiKey = G.g + ',' + j;
        const isMulti = interactive && torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
        const isEd =
          interactive &&
          typeof editingCesta !== 'undefined' &&
          editingCesta &&
          editingCesta.nivel === G.g &&
          editingCesta.cesta === j;
        const dias = dat.fecha ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000)) : null;
        let ariaTxt = 'Canal T' + (G.g + 1) + ', hueco ' + (j + 1) + ', ' + (dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'vacío');
        if (dias !== null) ariaTxt += ', día ' + dias;
        ariaTxt += '. Pulsa para ficha o asignar cultivo.';
        if (interactive) {
          plants +=
            '<g class="hc-cesta hc-nft-hueco" data-n="' + G.g + '" data-c="' + j + '" role="button" tabindex="0" aria-label="' +
            escAriaAttr(ariaTxt) +
            '">';
        }
        plants += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + hrGi.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="' + (interactive ? '1.35' : '1.1') + '"/>';
        if (isMulti) {
          plants +=
            '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + (hrGi + 3.5).toFixed(2) + '" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3 2"/>';
        }
        if (isEd) {
          plants +=
            '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + (hrGi + 3).toFixed(2) + '" fill="none" stroke="#22c55e" stroke-width="1.25"/>';
        }
        plants += nftSvgHuecoEmojiOnly(dat, cult, gx, gy, hrGi, compactMesa);
        const numLeftSide = G.t % 2 === 0;
        const numXHole = numLeftSide ? L.xC - L.barW / 2 - 5 : L.xC + L.barW / 2 + 5;
        plants += nftSvgHuecoNumBesideVertBar(
          numXHole,
          gy,
          numShow,
          Math.max(7.5, holeNumFsMM - 0.75),
          numLeftSide ? 'end' : 'start'
        );
        if (interactive) {
          const ptrR = nftHuecoPointerRadius(hrGi, true, slotAlongG);
          plants +=
            '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + ptrR.toFixed(2) + '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>';
          plants += '</g>';
        }
      }
      continue;
    }
    const S = mmShelf(G);
    const down = G.t % 2 === 0;
    const spanX = S.wid - 2 * padHuecoAlong;
    slotAlongG = huecosN <= 1 ? spanX : spanX / Math.max(1, huecosN - 1);
    const hrFromSpanGi = (spanX / slotDenom) * (compactMesa ? 0.62 : 0.68);
    const hrCapGi = Math.min(compactMesa ? 26 : 30, Math.max(compactMesa ? 12 : 14, tierRowH * (compactMesa ? 0.34 : 0.38)));
    const hrGi = interactive
      ? Math.max(
          compactMesa ? 12.5 : 14.5,
          Math.min(hrCapGi, hrFromSpanGi, S.thick * (compactMesa ? 2.15 : 2.45))
        )
      : Math.max(compactMesa ? 10.5 : 12, Math.min(compactMesa ? 20 : 24, hrFromSpanGi, S.thick * (compactMesa ? 1.85 : 2.05)));
    const plantLift = Math.min(S.thick * (compactMesa ? 0.48 : 0.55), compactMesa ? 12 : 14);
    for (let j = 0; j < huecosN; j++) {
      const t = huecosN <= 1 ? 0.5 : j / (huecosN - 1);
      const gx = down ? S.x0 + padHuecoAlong + t * spanX : S.x1 - padHuecoAlong - t * spanX;
      const gy = S.yC - plantLift;
      const numShow = j + 1;
      let dat = { variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] };
      if (interactive && state.torre[G.g] && state.torre[G.g][j]) dat = state.torre[G.g][j];
      const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
      const col = interactive ? torreListaColorCesta(G.g, j) : { bg: '#f8fafc', border: '#94a3b8' };
      const multiKey = G.g + ',' + j;
      const isMulti = interactive && torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
      const isEd =
        interactive &&
        typeof editingCesta !== 'undefined' &&
        editingCesta &&
        editingCesta.nivel === G.g &&
        editingCesta.cesta === j;
      const dias = dat.fecha ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000)) : null;
      let ariaTxt = 'Canal T' + (G.g + 1) + ', hueco ' + (j + 1) + ', ' + (dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'vacío');
      if (dias !== null) ariaTxt += ', día ' + dias;
      ariaTxt += '. Pulsa para ficha o asignar cultivo.';
      if (interactive) {
        plants +=
          '<g class="hc-cesta hc-nft-hueco" data-n="' + G.g + '" data-c="' + j + '" role="button" tabindex="0" aria-label="' +
          escAriaAttr(ariaTxt) +
          '">';
      }
      plants += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + hrGi.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="' + (interactive ? '1.35' : '1.1') + '"/>';
      if (isMulti) {
        plants +=
          '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + (hrGi + 3.5).toFixed(2) + '" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3 2"/>';
      }
      if (isEd) {
        plants +=
          '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + (hrGi + 3).toFixed(2) + '" fill="none" stroke="#22c55e" stroke-width="1.25"/>';
      }
      plants += nftSvgHuecoEmojiOnly(dat, cult, gx, gy, hrGi, compactMesa);
      plants += nftSvgHuecoNumBelowHole(
        gx,
        gy,
        hrGi,
        numShow,
        Math.max(7.5, holeNumFsMM - 0.75),
        compactMesa,
        nTiers > 1 ? 0 : 5
      );
      if (interactive) {
        const ptrR = nftHuecoPointerRadius(hrGi, true, slotAlongG);
        plants +=
          '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + ptrR.toFixed(2) + '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>';
        plants += '</g>';
      }
    }
  }

  let tankLayer = '';
  tankLayer += '<rect x="' + tx + '" y="' + tankY + '" width="' + tankW + '" height="' + tankH + '" rx="12" fill="url(#' + gidTank + ')" stroke="#14532d" stroke-width="1.3"/>';
  tankLayer += '<rect x="' + (tx + 4) + '" y="' + waterTop + '" width="' + (tankW - 8) + '" height="' + waterH + '" rx="8" fill="url(#' + gidAqua + ')" opacity="0.9"/>';
  tankLayer += altBadgeMM.html;
  const volTextY = tankY + Math.floor(tankH / 2) + 5;
  const volCx = tx + tankW / 2;
  tankLayer +=
    '<text x="' + volCx + '" y="' + volTextY + '" text-anchor="middle" fill="#fff" font-size="' + volFsMM + '" font-weight="900" font-family="system-ui,sans-serif">' +
    vol +
    ' L</text>';
  if (showCalentador) {
    const hx = tx + 18;
    tankLayer +=
      '<rect x="' + (hx - 5) + '" y="' + (tankY + tankH - 36) + '" width="10" height="30" rx="5" fill="#f97316" stroke="#ea580c" stroke-width="1.2"/>';
    tankLayer += '<circle cx="' + hx + '" cy="' + (tankY + tankH - 42) + '" r="3.5" fill="#fbbf24"/>';
  }
  if (showDifusor) {
    const ax = tx + tankW - 18;
    const ay = tankY + tankH - 16;
    tankLayer +=
      '<line x1="' + ax + '" y1="' + (tankY - 2) + '" x2="' + ax + '" y2="' + (ay - 12) + '" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.95"/>';
    tankLayer +=
      '<ellipse cx="' + ax + '" cy="' + ay + '" rx="13" ry="7" fill="#94a3b8" stroke="#64748b" stroke-width="1.2"/>';
    for (let bi = 0; bi < 5; bi++) {
      const bx = ax + (bi % 3 - 1) * 4;
      tankLayer += '<circle cx="' + bx + '" cy="' + (ay - 7 - bi * 3) + '" r="1.7" fill="#bfdbfe" opacity="0.9"/>';
    }
  }

  let pumpLines = '';

  let tierBandsMm = '';
  if (nTiers > 1) {
    const bandRx = 8;
    const bandX = 5;
    const bandW = Wsvg - 2 * bandX;
    const labFs = compactMesa ? 8.5 : 9.5;
    const flowRLabel = compactMesa ? 16 : 22;
    const xRacewayOuter = Wsvg - xL - 4 - flowRLabel;
    const pillWBase = 58;
    for (let tb = 0; tb < nTiers; tb++) {
      const y0b = topPad + tb * tierPitch;
      const fillB = tb % 2 === 0 ? '#e2edf7' : '#eef2f8';
      tierBandsMm +=
        '<rect x="' +
        bandX +
        '" y="' +
        y0b +
        '" width="' +
        bandW +
        '" height="' +
        tierRowH +
        '" rx="' +
        bandRx +
        '" fill="' +
        fillB +
        '" opacity="0.9" stroke="#94a3b8" stroke-width="0.9"/>';
      let labYR = y0b + tierRowH * 0.5 + labFs * 0.32;
      labYR = Math.max(y0b + 16 + labFs, Math.min(labYR, y0b + tierRowH - 12));
      const pillW = pillWBase + (tb + 1 >= 10 ? 12 : 0);
      const pillH = labFs + 8;
      let labXR = Math.min(xR - 10, xRacewayOuter - 24);
      labXR = Math.max(bandX + pillW + 8, labXR);
      const pillX = labXR - pillW;
      const pillY = labYR - pillH + 4;
      tierBandsMm +=
        '<rect x="' +
        pillX +
        '" y="' +
        pillY +
        '" width="' +
        pillW +
        '" height="' +
        pillH +
        '" rx="6" fill="rgba(255,255,255,0.96)" stroke="#94a3b8" stroke-width="0.7"/>';
    }
    tierBandsMm = '<g class="nft-mesa-tier-bands" pointer-events="none">' + tierBandsMm + '</g>';
  }

  if (interactive) {
    back = '<g pointer-events="none">' + back + '</g>';
    channels = '<g pointer-events="none">' + channels + '</g>';
    flowLayer = '<g pointer-events="none">' + flowLayer + '</g>';
    tankLayer = '<g pointer-events="none">' + tankLayer + pumpLines + '</g>';
  }

  const nTot = geoms.length;
  const tiersFmt = tiersNums.join(' · ');
  const mesaNivelesTxt =
    nTiers > 1
      ? nTiers + ' niveles · tubos por nivel ' + tiersFmt + ' · ' + nTot + ' tubos en total'
      : '1 nivel · ' + (tiersNums[0] != null ? tiersNums[0] : 0) + ' tubos';
  const mesaTitleLong = 'NFT mesa · ' + vol + ' L · vista cenital';

  let mesaViewLabel = '';
  if (typeof hcDiagramViewLabelSvg === 'function') {
    mesaViewLabel = hcDiagramViewLabelSvg(cxTitle, 16, 'cenital', { pointerEvents: false });
  }

  return (
    '<svg class="torre-svg-diagram nft-mesa-mm-svg nft-svg-diagram--scada nft-diagram--scroll' +
    (compactMesa ? ' nft-diagram--compact' : '') +
    '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    Wsvg +
    ' ' +
    H +
    '" width="100%" class="svg-fit-block" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' +
    tid +
    '">' +
    '<title id="' +
    tid +
    '">' +
    mesaTitleLong.replace(/&/g, '&amp;').replace(/</g, '&lt;') +
    '</title>' +
    '<defs>' +
    '<linearGradient id="' +
    gidCh +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    HC_DIAG.nft.canalGrad0 +
    '"/><stop offset="100%" stop-color="' +
    HC_DIAG.nft.canalGrad1 +
    '"/></linearGradient>' +
    '<linearGradient id="' +
    gidTank +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    HC_DIAG.nft.tankGrad0 +
    '"/><stop offset="100%" stop-color="' +
    HC_DIAG.nft.tankGrad1 +
    '"/></linearGradient>' +
    '<linearGradient id="' +
    gidAqua +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    HC_DIAG.nft.waterGrad0 +
    '" stop-opacity="' +
    HC_DIAG.nft.waterOp0 +
    '"/><stop offset="100%" stop-color="' +
    HC_DIAG.nft.waterGrad1 +
    '" stop-opacity="' +
    HC_DIAG.nft.waterOp1 +
    '"/></linearGradient>' +
    '</defs>' +
    mesaViewLabel +
    tierBandsMm +
    back +
    channels +
    flowLayer +
    plants +
    tankLayer +
    (!interactive ? pumpLines : '') +
    '</svg>'
  );
}

/**
 * NFT escalera / A-frame esquemático: peldaños por cara (1 o 2 caras).
 *
 * Modelo hidráulico (línea azul): sin cruces entre alimentación y retorno.
 * Una cara: pasillo izq. (alimentación desde salida izq. del depósito), zigzag
 * en tubos, retorno por pasillo dcho. al depósito.
 * Dos caras: subida central por el eje de la escalera (T en el vértice), zigzag
 * en cada cara; retorno izq. y dcho. del depósito (cada cara al su lado).
 *
 * Referencias generales NFT (pendiente, recirculación, retorno al depósito):
 * p. ej. Atlas Scientific — How to Build a Nutrient Film Technique (NFT) System;
 * literatura de extensión y catálogos de sistemas A-frame/NFT en invernadero.
 */
function buildNftEscaleraDiagramSvg(nivelesCara, caras, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  const EO = equipOpts || {};
  const interactive = EO.interactive === true;
  const showCalentador = EO.calentador === true;
  const showDifusor = EO.difusor === true;
  const bomb = EO.bombaInfo || null;
  const userQ = EO.userCaudalLh != null && EO.userCaudalLh > 0 ? Math.round(EO.userCaudalLh) : null;
  const userW = EO.userPotenciaW != null && EO.userPotenciaW > 0 ? Math.round(EO.userPotenciaW) : null;
  const altCmLbl =
    EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0 ? Math.round(Number(EO.nftAlturaBombeoCm)) : null;

  const suf = (svgIdSuffix != null && String(svgIdSuffix).trim() !== '')
    ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  const gidCh = 'nftEscCh' + suf;
  const gidTank = 'nftEscTk' + suf;
  const gidAqua = 'nftEscAq' + suf;
  const tid = 'nftEscTitle' + suf;

  const nv = Math.min(12, Math.max(1, parseInt(String(nivelesCara), 10) || 1));
  const car = caras === 2 ? 2 : 1;
  const huecosN = Math.min(Math.max(parseInt(String(huecos), 10) || 2, 2), 30);
  const pend = Math.min(Math.max(parseInt(String(pendPct), 10) || 2, 1), 4);
  const vol = Math.min(200, Math.max(5, parseInt(String(volL), 10) || 20));
  const nTubosEscTotal = car === 2 ? nv * 2 : nv;
  const compactEsc = nTubosEscTotal > 20;
  const escFew = nv <= 5 && !compactEsc;

  const W0base = nftDiagramCanvasW0();
  const minRungSpanUnits = 40 + huecosN * 18;
  let rungOut = Math.min(240, 108 + Math.max(0, huecosN - 5) * 22);
  rungOut = Math.max(rungOut, minRungSpanUnits - 20);
  if (car === 1) {
    const mult1 = escFew ? 1.78 : 1.62;
    const cap1 = compactEsc ? 340 : escFew ? 430 : 400;
    rungOut = Math.min(cap1, Math.round(rungOut * mult1));
  } else {
    const mult2 = escFew ? 1.38 : 1.28;
    const cap2 = compactEsc ? 295 : escFew ? 350 : 330;
    rungOut = Math.min(cap2, Math.round(rungOut * mult2));
  }
  rungOut = Math.max(rungOut, minRungSpanUnits - (car === 2 ? 22 : 18));
  const rungIn = car === 2 ? 18 : 22;
  const baseHalf = car === 1 ? 128 : 138;
  const minCxEsc = 32 + 14 + baseHalf + rungOut;
  const cxMid = W0base / 2;
  const cx = Math.max(cxMid, minCxEsc);
  const W0 = Math.max(W0base + Math.max(0, cx - cxMid), minRungSpanUnits + baseHalf + 200);
  const hdrEsc = nftDiagramHeaderTypography(W0, { compact: compactEsc, withLegend: true });
  const topPad = Math.max(92 + (compactEsc ? 10 : 0), hdrEsc.topPadMin);
  const botTank = 162;
  const yApex = topPad + 4;
  let dy =
    car === 1
      ? Math.min(
          escFew ? 84 : 76,
          Math.max(
            escFew ? 60 : 52,
            Math.floor((escFew ? 700 : 620) / Math.max(nv, 1)) + Math.min(14, huecosN * 2)
          )
        )
      : Math.min(
          escFew ? 74 : 66,
          Math.max(
            escFew ? 48 : 44,
            Math.floor((escFew ? 580 : 500) / Math.max(nv, 1)) + Math.min(12, huecosN * 2)
          )
        );
  if (compactEsc) {
    dy = Math.max(car === 1 ? 50 : 42, Math.round(dy * 0.9));
  }
  const ladderTop = yApex + 34;
  /** Dos caras: mismo y por peldaño (izq./dcha.) para alinear tubos superiores y suministro en T central. */
  const ladderBot = ladderTop + (nv - 1) * dy + 10;
  /** Vértice / reparto en T (solo 2 caras): entre ápice y primer peldaño. */
  const yEscManifold2 = car === 2 ? ladderTop - 10 : 0;
  const H = ladderBot + 56 + botTank;
  const tankY = H - botTank + 4;
  const tankH = 100;
  const tankW = Math.min(400, Math.round(152 + vol * 0.72));
  const tx = (W0 - tankW) / 2;
  const waterTop = tankY + 6;
  const waterH = tankH - 16;
  const xTankFeed = tx + 12;
  const xTankReturn = tx + tankW - 12;
  const xSupplyRiser = cx;
  const yPump = waterTop + Math.min(18, waterH * 0.45);
  const xPump = tx + 14;
  const yOutlet = tankY + tankH - 16;
  const yInlet = tankY + 16;
  let tubeH = car === 2 ? Math.min(22, 17 + Math.min(6, huecosN * 0.45)) : Math.min(32, 24 + Math.min(8, huecosN * 0.55));
  if (escFew) {
    tubeH = Math.round(tubeH * (car === 2 ? 1.06 : 1.08));
    tubeH = Math.min(car === 2 ? 24 : 34, tubeH);
  }
  if (compactEsc) {
    tubeH = Math.max(car === 2 ? 15 : 20, Math.round(tubeH * 0.92));
  }
  const padFlow = car === 2 ? 7 : 9;
  const nRunsHint = car === 2 ? nv * 2 : nv;
  const legHintEsc = { volL: vol, nCanales: nRunsHint, nTubosTotal: nRunsHint, alturaBadgeNTubos: nRunsHint };
  const legTierEsc = nftDiagramLegibilityHint(legHintEsc);
  const volFsEsc = nftTankVolumeFontSize(vol, legTierEsc);
  const altBadgeEsc = nftAlturaBadgeBesideTank(altCmLbl, tx, tankY, tankW, tankH, W0, {
    ...legHintEsc,
    alturaBadgeMinTier: 2,
  });
  const Wsvg = altBadgeEsc.canvasW;
  const flowMarginEsc = 8;
  const xLegDrainL = cx - baseHalf - 10;
  const xLegDrainR = cx + baseHalf + 10;
  const cxTitle = Wsvg / 2;
  const hdrEscDraw = nftDiagramHeaderTypography(Math.max(W0, Wsvg), { compact: compactEsc, withLegend: true });

  /** Dos caras, primer peldaño: ancho libre bajo la T (suministro entre canales). */
  const topCenterGap2 = car === 2 ? (compactEsc ? 24 : 34) : 0;

  const runs = [];
  let g = 0;
  if (car === 1) {
    const backX = cx + 44;
    for (let i = 0; i < nv; i++) {
      const p = nv <= 1 ? 0 : i / (nv - 1);
      const y = ladderTop + i * dy;
      const xFoot = cx - 14 - baseHalf * p;
      runs.push({ g: g++, y, xL: xFoot - rungOut, xR: xFoot + rungIn, rtl: i % 2 === 1 });
    }
  } else {
    const xInL0 = cx - topCenterGap2 / 2;
    const xInR0 = cx + topCenterGap2 / 2;
    for (let i = 0; i < nv; i++) {
      const p = nv <= 1 ? 0 : i / (nv - 1);
      const y = ladderTop + i * dy;
      const xLeftFoot = cx - baseHalf * p;
      let xL = xLeftFoot - rungOut;
      let xR = xLeftFoot + rungIn;
      if (i === 0) {
        xR = Math.min(xR, xInL0);
      }
      runs.push({ g: g++, y, xL, xR, rtl: i % 2 === 1 });
    }
    for (let i = 0; i < nv; i++) {
      const p = nv <= 1 ? 0 : i / (nv - 1);
      const y = ladderTop + i * dy;
      const xRightFoot = cx + baseHalf * p;
      let xL = xRightFoot - rungIn;
      let xR = xRightFoot + rungOut;
      if (i === 0) {
        xL = Math.max(xL, xInR0);
      }
      runs.push({ g: g++, y, xL, xR, rtl: i % 2 === 0 });
    }
  }

  const flowDash = 'stroke-dasharray="11 9" stroke-linecap="round" stroke-linejoin="round"';
  const flowSt = 'stroke="' + HC_DIAG.nft.flow + '" fill="none" ' + flowDash;
  const fqPathEsc = function (v) {
    const n = Math.round(Number(v) * 100) / 100;
    return Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(2);
  };
  const erEsc = compactEsc ? 10 : 14;
  let flowD = 'M ' + fqPathEsc(xPump) + ' ' + fqPathEsc(yPump);
  let lx = xPump;
  let ly = yPump;
  const LtoEsc = function (x, y) {
    flowD += ' L ' + fqPathEsc(x) + ' ' + fqPathEsc(y);
    lx = x;
    ly = y;
  };
  const ArcEsc = function (ex, ey, sw) {
    flowD +=
      ' A ' + fqPathEsc(erEsc) + ' ' + fqPathEsc(erEsc) + ' 0 0 ' + sw + ' ' + fqPathEsc(ex) + ' ' + fqPathEsc(ey);
    lx = ex;
    ly = ey;
  };
  const orthoKneeEsc = function (tx, ty) {
    if (Math.abs(lx - tx) < 0.8 && Math.abs(ly - ty) < 0.8) return;
    if (Math.abs(lx - tx) < 0.8) {
      LtoEsc(tx, ty);
      return;
    }
    if (Math.abs(ly - ty) < 0.8) {
      LtoEsc(tx, ty);
      return;
    }
    const sx = tx > lx ? 1 : -1;
    const sy = ty > ly ? 1 : -1;
    if (Math.abs(ty - ly) > erEsc && Math.abs(tx - lx) > erEsc) {
      LtoEsc(lx, ty - sy * erEsc);
      const swK = sx > 0 ? (sy > 0 ? 1 : 0) : sy > 0 ? 0 : 1;
      ArcEsc(lx + sx * erEsc, ty, swK);
      LtoEsc(tx, ty);
    } else {
      LtoEsc(lx, ty);
      LtoEsc(tx, ty);
    }
  };
  const nftEscAppendRunsZigzag = function (runList, outerSide) {
    const xDropAt = function (R) {
      return outerSide === 'R' ? R.xR - padFlow + flowMarginEsc : R.xL + padFlow - flowMarginEsc;
    };
    for (let i = 0; i < runList.length; i++) {
      const R = runList[i];
      const Rn = i < runList.length - 1 ? runList[i + 1] : null;
      const xS = R.rtl ? R.xR - padFlow : R.xL + padFlow;
      const xE = R.rtl ? R.xL + padFlow : R.xR - padFlow;
      orthoKneeEsc(xS, R.y);
      orthoKneeEsc(xE, R.y);
      if (Rn) {
        const xDrop = xDropAt(R);
        const xNextS = Rn.rtl ? Rn.xR - padFlow : Rn.xL + padFlow;
        orthoKneeEsc(xDrop, R.y);
        orthoKneeEsc(xDrop, Rn.y);
        orthoKneeEsc(xNextS, Rn.y);
      }
    }
  };
  const nftEscDrainAlongLeg = function (xLeg, xTankX) {
    orthoKneeEsc(xLeg, ly);
    const yBase = ladderBot + 6;
    orthoKneeEsc(xLeg, yBase);
    orthoKneeEsc(xTankX, yBase);
    orthoKneeEsc(xTankX, yInlet);
  };

  if (runs.length) {
    if (car === 2) {
      const yManifold = yEscManifold2;
      orthoKneeEsc(xTankFeed, yPump);
      orthoKneeEsc(xTankFeed, yOutlet);
      orthoKneeEsc(xSupplyRiser, yOutlet);
      orthoKneeEsc(xSupplyRiser, yManifold);
      const R0L = runs[0];
      const xInL0 = R0L.xR - padFlow;
      orthoKneeEsc(xInL0, yManifold);
      orthoKneeEsc(xInL0, R0L.y);
      nftEscAppendRunsZigzag(runs.slice(0, nv), 'L');
      nftEscDrainAlongLeg(xLegDrainL, xTankFeed);

      flowD += ' M ' + fqPathEsc(xSupplyRiser) + ' ' + fqPathEsc(yManifold);
      lx = xSupplyRiser;
      ly = yManifold;
      const R0R = runs[nv];
      const xInR0 = R0R.xL + padFlow;
      orthoKneeEsc(xInR0, yManifold);
      orthoKneeEsc(xInR0, R0R.y);
      nftEscAppendRunsZigzag(runs.slice(nv), 'R');
      nftEscDrainAlongLeg(xLegDrainR, xTankReturn);
    } else {
      const backX = cx + 44;
      orthoKneeEsc(xTankFeed, yPump);
      orthoKneeEsc(xTankFeed, yOutlet);
      orthoKneeEsc(xLegDrainL, yOutlet);
      orthoKneeEsc(xLegDrainL, runs[0].y);
      const xIn0 = runs[0].rtl ? runs[0].xR - padFlow : runs[0].xL + padFlow;
      orthoKneeEsc(xIn0, runs[0].y);
      nftEscAppendRunsZigzag(runs, 'L');
      nftEscDrainAlongLeg(backX + 8, xTankReturn);
    }
  }

  let frame = '';
  if (car === 2) {
    frame +=
      '<line x1="' + cx + '" y1="' + yApex + '" x2="' + (cx - baseHalf) + '" y2="' + ladderBot + '" stroke="#64748b" stroke-width="2.8" stroke-linecap="round"/>';
    frame +=
      '<line x1="' + cx + '" y1="' + yApex + '" x2="' + (cx + baseHalf) + '" y2="' + ladderBot + '" stroke="#64748b" stroke-width="2.8" stroke-linecap="round"/>';
    frame +=
      '<line x1="' + (cx - baseHalf) + '" y1="' + ladderBot + '" x2="' + (cx + baseHalf) + '" y2="' + ladderBot + '" stroke="#475569" stroke-width="2.2" stroke-linecap="round" opacity="0.88"/>';
    if (nv >= 2) {
      const yBrace = ladderTop + Math.min(nv - 1, 3) * dy * 0.42;
      frame +=
        '<line x1="' + (cx - baseHalf * 0.48) + '" y1="' + yBrace + '" x2="' + (cx + baseHalf * 0.48) + '" y2="' + yBrace + '" stroke="#94a3b8" stroke-width="1.35" stroke-linecap="round" opacity="0.8"/>';
    }
    const ym = yEscManifold2;
    const teeBarHalf = Math.max(22, topCenterGap2 / 2 + 16);
    frame +=
      '<g class="nft-esc-tee-mark" pointer-events="none" aria-hidden="true">' +
      '<line x1="' +
      cx +
      '" y1="' +
      (ym - 6) +
      '" x2="' +
      cx +
      '" y2="' +
      (ym + 6) +
      '" stroke="#475569" stroke-width="2" stroke-linecap="round" opacity="0.95"/>' +
      '<line x1="' +
      (cx - teeBarHalf) +
      '" y1="' +
      ym +
      '" x2="' +
      (cx + teeBarHalf) +
      '" y2="' +
      ym +
      '" stroke="#475569" stroke-width="2" stroke-linecap="round" opacity="0.95"/>' +
      '</g>';
  } else {
    const backX = cx + 44;
    frame +=
      '<line x1="' + (cx - 12) + '" y1="' + yApex + '" x2="' + (cx - baseHalf - 10) + '" y2="' + ladderBot + '" stroke="#64748b" stroke-width="2.6" stroke-linecap="round"/>';
    frame +=
      '<line x1="' + backX + '" y1="' + (yApex + 8) + '" x2="' + backX + '" y2="' + ladderBot + '" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"/>';
    frame +=
      '<line x1="' + (cx - baseHalf - 10) + '" y1="' + ladderBot + '" x2="' + backX + '" y2="' + ladderBot + '" stroke="#475569" stroke-width="2" stroke-linecap="round" opacity="0.9"/>';
  }

  let back =
    '<path d="' + flowD + '" stroke="#cbd5e1" stroke-width="4" fill="none" opacity="0.45" stroke-linecap="round" stroke-linejoin="round"/>';

  const nRunsEsc = runs.length;
  const tLabelFsEsc = compactEsc ? 14.25 : 16.5;
  const rungSpan = rungOut + rungIn;
  const slotDEsc = Math.max(1, huecosN - 1);
  const hrRawEsc = (rungSpan / slotDEsc) * (compactEsc ? 0.54 : 0.58);
  const hr =
    car === 1
      ? Math.max(compactEsc ? 10 : 11, Math.min(compactEsc ? 17 : 19, hrRawEsc, tubeH * (compactEsc ? 0.58 : 0.62)))
      : Math.max(compactEsc ? 8.5 : 9.5, Math.min(compactEsc ? 15 : 17, hrRawEsc, tubeH * (compactEsc ? 0.54 : 0.58)));
  const holeNumFsEsc = nRunsEsc >= 14 ? 8.5 : nRunsEsc >= 8 ? 9.25 : 10;
  const plantLiftEsc = Math.min(tubeH * (compactEsc ? 0.36 : 0.4), compactEsc ? 10 : 12);

  let channels = '';
  const peNone = interactive ? ' pointer-events="none"' : '';
  const chStrokeEsc = car === 2 ? 1.05 : 1.25;
  for (let i = 0; i < runs.length; i++) {
    const R = runs[i];
    const yc = R.y - tubeH / 2;
    channels +=
      '<rect x="' +
      R.xL +
      '" y="' +
      yc +
      '" width="' +
      (R.xR - R.xL) +
      '" height="' +
      tubeH +
      '" rx="8" fill="url(#' +
      gidCh +
      ')" stroke="#0369a1" stroke-width="' +
      chStrokeEsc +
      '"' +
      peNone +
      '/>';
  }

  const nftFlowAnim = torreSvgAnimacionesActivas();
  let flowLayer =
    '<path d="' + flowD + '" ' + flowSt + ' stroke-width="2.2" opacity="0.95"' +
    (nftFlowAnim
      ? '><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.35s" repeatCount="indefinite" calcMode="linear"/></path>'
      : '/>');

  let channelLabels = '';
  const plantTopPadEsc = compactEsc ? 10 : 13;
  let plants = '';
  for (let ri = 0; ri < runs.length; ri++) {
    const R = runs[ri];
    const y = R.y;
    const rtl = R.rtl;
    const spanR = R.xR - R.xL - 2 * padFlow;
    const slotAlongR = huecosN <= 1 ? spanR : spanR / Math.max(1, huecosN - 1);
    for (let j = 0; j < huecosN; j++) {
      const t = huecosN <= 1 ? 0.5 : j / (huecosN - 1);
      const gx = rtl ? R.xR - padFlow - t * spanR : R.xL + padFlow + t * spanR;
      const gy = y - plantLiftEsc;
      let dat = { variedad: '', fecha: '', notas: '', origenPlanta: '', fotos: [], fotoKeys: [] };
      if (interactive && state.torre[R.g] && state.torre[R.g][j]) dat = state.torre[R.g][j];
      const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
      const col = interactive ? torreListaColorCesta(R.g, j) : { bg: '#f8fafc', border: '#94a3b8' };
      const multiKey = R.g + ',' + j;
      const isMulti = interactive && torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
      const isEd =
        interactive &&
        typeof editingCesta !== 'undefined' &&
        editingCesta &&
        editingCesta.nivel === R.g &&
        editingCesta.cesta === j;
      const dias = dat.fecha ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000)) : null;
      let ariaTxt = 'Canal T' + (R.g + 1) + ', hueco ' + (j + 1) + ', ' + (dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'vacío');
      if (dias !== null) ariaTxt += ', día ' + dias;
      ariaTxt += '. Pulsa para ficha o asignar cultivo.';
      if (typeof hcIlloNftHuecoLayer === 'function') {
        plants += hcIlloNftHuecoLayer(gx, gy, hr, R.g, j, dat, cult, interactive, null, {
          compact: compactEsc,
          numBelow: true,
          numShow: j + 1,
          slotAlong: slotAlongR,
        });
      } else if (interactive) {
        plants +=
          '<g class="hc-cesta hc-nft-hueco" data-n="' + R.g + '" data-c="' + j + '" role="button" tabindex="0" aria-label="' +
          escAriaAttr(ariaTxt) +
          '">';
        plants += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + hr.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="1.35"/>';
        if (isMulti) {
          plants +=
            '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + (hr + 3.5).toFixed(2) + '" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3 2"/>';
        }
        if (isEd) {
          plants +=
            '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + (hr + 3).toFixed(2) + '" fill="none" stroke="#22c55e" stroke-width="1.25"/>';
        }
        plants += nftSvgHuecoEmojiOnly(dat, cult, gx, gy, hr, compactEsc);
        plants += nftSvgHuecoNumBelowHole(gx, gy, hr, j + 1, Math.max(7, holeNumFsEsc - 0.75), compactEsc);
        const ptrR = nftHuecoPointerRadius(hr, true, slotAlongR);
        plants +=
          '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + ptrR.toFixed(2) + '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>';
        plants += '</g>';
      } else {
        plants += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + hr.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="1.1"/>';
        plants += nftSvgHuecoEmojiOnly(dat, cult, gx, gy, hr, compactEsc);
        plants += nftSvgHuecoNumBelowHole(gx, gy, hr, j + 1, Math.max(7, holeNumFsEsc - 0.75), compactEsc);
      }
    }
  }

  let tankLayer = '';
  tankLayer += '<rect x="' + tx + '" y="' + tankY + '" width="' + tankW + '" height="' + tankH + '" rx="12" fill="url(#' + gidTank + ')" stroke="#14532d" stroke-width="1.3"/>';
  tankLayer += '<rect x="' + (tx + 4) + '" y="' + waterTop + '" width="' + (tankW - 8) + '" height="' + waterH + '" rx="8" fill="url(#' + gidAqua + ')" opacity="0.9"/>';
  tankLayer += altBadgeEsc.html;
  const volTextY = tankY + Math.floor(tankH / 2) + 5;
  const volCxEsc = tx + tankW / 2;
  tankLayer +=
    '<text x="' + volCxEsc + '" y="' + volTextY + '" text-anchor="middle" fill="#fff" font-size="' + volFsEsc + '" font-weight="900" font-family="system-ui,sans-serif">' +
    vol +
    ' L</text>';
  if (showCalentador) {
    const hx = tx + 18;
    tankLayer +=
      '<rect x="' + (hx - 5) + '" y="' + (tankY + tankH - 36) + '" width="10" height="30" rx="5" fill="#f97316" stroke="#ea580c" stroke-width="1.2"/>';
    tankLayer += '<circle cx="' + hx + '" cy="' + (tankY + tankH - 42) + '" r="3.5" fill="#fbbf24"/>';
  }
  if (showDifusor) {
    const ax = tx + tankW - 18;
    const ay = tankY + tankH - 16;
    tankLayer +=
      '<line x1="' + ax + '" y1="' + (tankY - 2) + '" x2="' + ax + '" y2="' + (ay - 12) + '" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.95"/>';
    tankLayer +=
      '<ellipse cx="' + ax + '" cy="' + ay + '" rx="13" ry="7" fill="#94a3b8" stroke="#64748b" stroke-width="1.2"/>';
    for (let bi = 0; bi < 5; bi++) {
      const bx = ax + (bi % 3 - 1) * 4;
      tankLayer += '<circle cx="' + bx + '" cy="' + (ay - 7 - bi * 3) + '" r="1.7" fill="#bfdbfe" opacity="0.9"/>';
    }
  }

  let pumpLines = '';

  if (interactive) {
    back = '<g pointer-events="none">' + back + '</g>';
    frame = '<g pointer-events="none">' + frame + '</g>';
    channels = '<g pointer-events="none">' + channels + '</g>';
    flowLayer = '<g pointer-events="none">' + flowLayer + '</g>';
    channelLabels = '<g pointer-events="none">' + channelLabels + '</g>';
    tankLayer = '<g pointer-events="none">' + tankLayer + pumpLines + '</g>';
  }

  const nTot = runs.length;
  const escTitleFoot = vol + ' L · vista cenital';
  let escViewLabel = '';
  if (typeof hcDiagramViewLabelSvg === 'function') {
    escViewLabel = hcDiagramViewLabelSvg(cxTitle, 16, 'cenital', { pointerEvents: false });
  }

  return (
    '<svg class="torre-svg-diagram nft-escalera-svg nft-svg-diagram--scada nft-diagram--scroll' +
    (car === 1 ? ' nft-escalera--una-cara' : '') +
    (compactEsc ? ' nft-diagram--compact' : '') +
    '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    Wsvg +
    ' ' +
    H +
    '" width="100%" class="svg-fit-block" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' +
    tid +
    '">' +
    '<title id="' +
    tid +
    '">' +
    ('NFT escalera · ' + escTitleFoot).replace(/&/g, '&amp;').replace(/</g, '&lt;') +
    '</title>' +
    '<defs>' +
    '<linearGradient id="' +
    gidCh +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    HC_DIAG.nft.canalGrad0 +
    '"/><stop offset="100%" stop-color="' +
    HC_DIAG.nft.canalGrad1 +
    '"/></linearGradient>' +
    '<linearGradient id="' +
    gidTank +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    HC_DIAG.nft.tankGrad0 +
    '"/><stop offset="100%" stop-color="' +
    HC_DIAG.nft.tankGrad1 +
    '"/></linearGradient>' +
    '<linearGradient id="' +
    gidAqua +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    HC_DIAG.nft.waterGrad0 +
    '" stop-opacity="' +
    HC_DIAG.nft.waterOp0 +
    '"/><stop offset="100%" stop-color="' +
    HC_DIAG.nft.waterGrad1 +
    '" stop-opacity="' +
    HC_DIAG.nft.waterOp1 +
    '"/></linearGradient>' +
    '</defs>' +
    escViewLabel +
    frame +
    back +
    channels +
    flowLayer +
    plants +
    channelLabels +
    tankLayer +
    (!interactive ? pumpLines : '') +
    '</svg>'
  );
}

