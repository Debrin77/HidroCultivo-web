/** buildNftActiveDiagramSvg, preview, páginas del asistente, grid nutrientes. Tras hc-setup-wizard-nft-diagrams.js. */
/** Placeholder del asistente NFT sin tubos/huecos definidos. */
function buildNftSetupEmptyDiagramSvg() {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" role="img" aria-label="Sin diagrama">' +
    '<rect width="360" height="120" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>' +
    '<text x="180" y="58" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#64748b">Indica tubos y huecos</text>' +
    '<text x="180" y="78" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#94a3b8">para ver el esquema</text>' +
    '</svg>'
  );
}

/** Elige SVG NFT según config (mesa multinivel, escalera, serpentín mesa/pared). */
function buildNftActiveDiagramSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  const nCh0 = parseInt(String(canales), 10);
  const nHx0 = parseInt(String(huecos), 10);
  if (!Number.isFinite(nCh0) || nCh0 < 1 || !Number.isFinite(nHx0) || nHx0 < 2) {
    return buildNftSetupEmptyDiagramSvg();
  }
  if (typeof HC_DIAG === 'undefined' || !HC_DIAG.nft) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" role="img" aria-label="Error de carga del diagrama"><text x="12" y="40" font-family="system-ui,sans-serif" font-size="13" fill="#b91c1c">Recarga forzada (Ctrl+F5) o borra caché del sitio.</text></svg>';
  }
  const EO = equipOpts || {};
  const cfg = EO.cfgSnapshot || {};
  const disp = nftDisposicionNormalizada(EO.nftDisposicion != null ? EO.nftDisposicion : cfg.nftDisposicion);
  const recorridoParalelo =
    (disp === 'mesa' || disp === 'pared') &&
    typeof nftColectoresParaleloDesdeConfig === 'function' &&
    nftColectoresParaleloDesdeConfig(cfg);
  /** Paralelo = misma vista lateral que serie (tubos apilados), no cenital en fila. */
  if (recorridoParalelo) {
    return buildNftSerpentineDiagramSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts);
  }
  let tiers = EO.mesaTiers && EO.mesaTiers.length >= 2 ? EO.mesaTiers : null;
  if (!tiers && disp === 'mesa' && cfg.nftMesaMultinivel) {
    tiers = parseNftMesaTubosPorNivelStr(cfg.nftMesaTubosPorNivelStr);
    if (tiers.length < 2) tiers = null;
  }
  if (disp === 'mesa' && tiers) {
    return buildNftMesaMultinivelDiagramSvg(tiers, huecos, pendPct, volL, svgIdSuffix, equipOpts);
  }
  if (disp === 'escalera') {
    const caras = EO.escaleraCaras != null ? EO.escaleraCaras : nftEscaleraCarasNormalizada(cfg.nftEscaleraCaras);
    let nv = EO.escaleraNiveles;
    if (nv == null || !Number.isFinite(nv)) nv = parseInt(String(cfg.nftEscaleraNivelesCara), 10);
    if (!Number.isFinite(nv) || nv < 1) nv = Math.max(1, Math.ceil(canales / Math.max(1, caras)));
    nv = Math.min(12, Math.max(1, nv));
    return buildNftEscaleraDiagramSvg(nv, caras, huecos, pendPct, volL, svgIdSuffix, equipOpts);
  }
  return buildNftSerpentineDiagramSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts);
}

function nftCfgEsInterior(EO) {
  const cfg = (EO && EO.cfgSnapshot) || {};
  const u = EO && EO.ubicacion != null ? EO.ubicacion : cfg.ubicacion;
  return String(u || 'exterior').toLowerCase() === 'interior';
}

/** Burbujas en depósito (animadas si torreSvgAnimacionesActivas). */
function nftSvgBurbujaAnimada(cx, ySuperficie, yPiedra, bi, fill) {
  const animOn = typeof torreSvgAnimacionesActivas === 'function' && torreSvgAnimacionesActivas();
  const y0 = yPiedra - 5 - (bi % 2) * 2;
  const y1 = Math.max(ySuperficie + 3, y0 - 14 - bi * 2);
  if (!animOn) {
    return (
      '<circle cx="' +
      cx +
      '" cy="' +
      y0 +
      '" r="1.8" fill="' +
      fill +
      '" opacity="0.88"/>'
    );
  }
  const delay = (bi * 0.17).toFixed(2);
  const dur = '1.4';
  return (
    '<circle cx="' +
    cx +
    '" cy="' +
    y0 +
    '" r="1.8" fill="' +
    fill +
    '" opacity="0">' +
    '<animate attributeName="cy" from="' +
    y0 +
    '" to="' +
    y1 +
    '" dur="' +
    dur +
    's" begin="' +
    delay +
    's" repeatCount="indefinite" calcMode="linear"/>' +
    '<animate attributeName="opacity" values="0;0.92;0" dur="' +
    dur +
    's" begin="' +
    delay +
    's" repeatCount="indefinite"/>' +
    '</circle>'
  );
}

/** Litros y capacidad desde config (diagrama coherente con Cultivo e instalación). */
function nftSvgTankMetaFromEquip(EO, volFallback) {
  const cfg = (EO && EO.cfgSnapshot) || {};
  const capL =
    EO && EO.volCapL != null && Number(EO.volCapL) > 0
      ? Number(EO.volCapL)
      : typeof getVolumenDepositoMaxLitros === 'function'
        ? getVolumenDepositoMaxLitros(cfg)
        : null;
  const mezL =
    EO && EO.volMezL != null && Number(EO.volMezL) > 0
      ? Number(EO.volMezL)
      : typeof getVolumenMezclaLitros === 'function'
        ? getVolumenMezclaLitros(cfg)
        : null;
  const vol = Math.max(
    5,
    Math.round(
      Number.isFinite(mezL) && mezL > 0
        ? mezL
        : Number.isFinite(volFallback)
          ? volFallback
          : typeof VOL_OBJETIVO !== 'undefined'
            ? VOL_OBJETIVO
            : 20
    )
  );
  return { capL: capL, mezL: mezL, volL: vol };
}

/** Nivel visual del agua: mezcla en uso respecto a capacidad (no vol/80). */
function nftSvgTankFillPct(volL, opts) {
  const o = opts || {};
  const cap = Number(o.capL);
  const mez = Number(o.mezL);
  const v = Math.max(5, Number(volL) || 20);
  if (Number.isFinite(cap) && cap > 0 && Number.isFinite(mez) && mez > 0) {
    return Math.min(0.94, Math.max(0.5, mez / cap));
  }
  return 0.87;
}

var NFT_FLOW_SUPPLY = '#2563eb';
var NFT_FLOW_RETURN = '#16a34a';

function nftSvgFlowMarkerDefs(suf) {
  const idSup = 'nftArrSup' + suf;
  const idRet = 'nftArrRet' + suf;
  return {
    supplyId: idSup,
    returnId: idRet,
    defs:
      '<marker id="' +
      idSup +
      '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' +
      NFT_FLOW_SUPPLY +
      '"/></marker>' +
      '<marker id="' +
      idRet +
      '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' +
      NFT_FLOW_RETURN +
      '"/></marker>',
  };
}

/** Leyenda: azul = alimentación, verde = retorno al depósito. */
function nftSvgFlowLegend(x, y, mode) {
  const m = mode || 'serie';
  const supTxt =
    m === 'mesa_paralelo'
      ? 'Alimentación: depósito → colector izq. → entrada a cada tubo'
      : 'Alimentación: sale abajo · sube · tubo superior → serpentín';
  const retTxt =
    m === 'mesa_paralelo'
      ? 'Retorno: salida de cada tubo → colector der. → depósito'
      : 'Retorno: último tubo → entra arriba al depósito';
  return (
    '<g class="nft-flow-legend" transform="translate(' +
    x +
    ',' +
    y +
    ')" pointer-events="none" aria-hidden="true">' +
    '<line x1="0" y1="6" x2="22" y2="6" stroke="' +
    NFT_FLOW_SUPPLY +
    '" stroke-width="3" stroke-linecap="round"/>' +
    '<text x="26" y="9" font-size="10" fill="#1e40af" font-family="system-ui,sans-serif" font-weight="600">' +
    supTxt +
    '</text>' +
    '<line x1="0" y1="22" x2="22" y2="22" stroke="' +
    NFT_FLOW_RETURN +
    '" stroke-width="3" stroke-dasharray="5 4" stroke-linecap="round"/>' +
    '<text x="26" y="25" font-size="10" fill="#166534" font-family="system-ui,sans-serif" font-weight="600">' +
    retTxt +
    '</text>' +
    '</g>'
  );
}

/**
 * Serpentín en serie (pared/mesa): salida depósito (izq. abajo) → riser → tubo 1 (arriba) → zigzag bajando
 * con U por el lado exterior → retorno al puerto superior del depósito (izq. si par, der. si impar).
 */
function nftBuildSerpentineFlowPaths(p) {
  if (typeof nftHydraulicSerpentine === 'function') {
    return nftHydraulicSerpentine(p);
  }
  const ports = nftSvgTankPorts(p.tx, p.tankW, p.tankY, p.tankH, p.nCh);
  return { supplyD: '', returnD: '', ports: ports, xFeedRiser: 0, xReturnRiser: 0, xExitSerp: 0 };
}

/**
 * Retorno al depósito desde el extremo de salida del serpentín (tubos impares: riser derecho;
 * pares: riser izquierdo junto a alimentación).
 */
function nftBuildReturnPathFromExit(p) {
  if (typeof nftHydraulicReturnWaypointsFromExit === 'function' && typeof nftHydraulicWaypointsToSvg === 'function') {
    const wp = nftHydraulicReturnWaypointsFromExit(p);
    return nftHydraulicWaypointsToSvg(wp, { cornerRadius: p.cornerRadius || 0 });
  }
  return '';
}

/** Divide un `d` SVG con varios subtrazos (M…M…) para dibujar ramas en paralelo por separado. */
function nftSvgFlowDToSubpaths(d) {
  const s = String(d || '').trim();
  if (!s) return [];
  const parts = s.split(/(?=\s*M[\s.-])/i).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [s];
}

function nftSvgFlowMultiPathLayer(d, className, stroke, dash, flowW, markerId, animOpen, pathGhost) {
  const parts = nftSvgFlowDToSubpaths(d);
  if (!parts.length) return { ghost: '', layer: '' };
  let ghost = '';
  let layer = '';
  for (let i = 0; i < parts.length; i++) {
    const mark =
      parts.length === 1 || i === parts.length - 1 ? ' marker-end="url(#' + markerId + ')"' : '';
    if (pathGhost) {
      ghost += '<path d="' + parts[i] + '" stroke="' + stroke + '"' + pathGhost + '/>';
    }
    layer +=
      '<path class="' +
      className +
      (parts.length > 1 ? ' nft-flow-branch' : '') +
      '" d="' +
      parts[i] +
      '" stroke="' +
      stroke +
      '" fill="none" ' +
      dash +
      ' stroke-width="' +
      flowW +
      '" opacity="0.98"' +
      mark +
      animOpen;
  }
  return { ghost: ghost, layer: layer };
}

/**
 * Capas SVG de flujo NFT unificadas (ghost + trazos + leyenda + puertos) para todos los montajes.
 * @param {{ supplyD: string, returnD: string, ports?: object }} flowPaths
 */
function nftHydraulicFlowSvgBundle(flowPaths, suf, opts) {
  const o = opts || {};
  const supplyD = flowPaths.supplyD || '';
  const returnD = flowPaths.returnD || '';
  const ports = flowPaths.ports;
  const cartoon = o.cartoonMedir === true;
  const flowW = o.strokeWidth != null ? o.strokeWidth : cartoon ? 5.5 : 3.4;
  const legendX = o.legendX != null ? o.legendX : 12;
  const legendY = o.legendY != null ? o.legendY : 8;
  const showLegend = o.showLegend !== false;
  const showPorts = o.showPorts !== false && ports;
  const mark = nftSvgFlowMarkerDefs(suf);
  const pathGhost = cartoon
    ? ''
    : ' stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.45" stroke-width="5"';
  const flowDashSupply = 'stroke-dasharray="11 9" stroke-linecap="round" stroke-linejoin="round"';
  const flowDashRet = 'stroke-dasharray="8 7" stroke-linecap="round" stroke-linejoin="round"';
  const anim =
    o.animate !== false &&
    typeof torreSvgAnimacionesActivas === 'function' &&
    torreSvgAnimacionesActivas();
  const animTag = anim
    ? '><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.35s" repeatCount="indefinite" calcMode="linear"/></path>'
    : '/>';

  const useMultiPath = o.legendMode === 'mesa_paralelo';
  let back = '';
  let flowLayer = '';
  if (useMultiPath) {
    const supMp = nftSvgFlowMultiPathLayer(
      supplyD,
      'nft-flow-supply',
      NFT_FLOW_SUPPLY,
      flowDashSupply,
      flowW,
      mark.supplyId,
      animTag,
      cartoon ? '' : pathGhost
    );
    const retMp = nftSvgFlowMultiPathLayer(
      returnD,
      'nft-flow-return',
      NFT_FLOW_RETURN,
      flowDashRet,
      flowW,
      mark.returnId,
      animTag,
      cartoon ? '' : pathGhost
    );
    back = supMp.ghost + retMp.ghost;
    flowLayer = supMp.layer + retMp.layer;
  } else {
    back = cartoon
      ? ''
      : '<path d="' + supplyD + '" stroke="' + NFT_FLOW_SUPPLY + '"' + pathGhost + '/>' +
        '<path d="' + returnD + '" stroke="' + NFT_FLOW_RETURN + '"' + pathGhost + '/>';
    flowLayer =
      '<path class="nft-flow-supply" d="' +
      supplyD +
      '" stroke="' +
      NFT_FLOW_SUPPLY +
      '" fill="none" ' +
      flowDashSupply +
      ' stroke-width="' +
      flowW +
      '" opacity="0.98" marker-end="url(#' +
      mark.supplyId +
      ')"' +
      animTag +
      '<path class="nft-flow-return" d="' +
      returnD +
      '" stroke="' +
      NFT_FLOW_RETURN +
      '" fill="none" ' +
      flowDashRet +
      ' stroke-width="' +
      flowW +
      '" opacity="0.98" marker-end="url(#' +
      mark.returnId +
      ')"' +
      animTag;
  }
  let flowLegend = showLegend ? nftSvgFlowLegend(legendX, legendY, o.legendMode) : '';
  let flowTankPorts = '';
  if (showPorts) {
    flowTankPorts =
      '<g class="nft-flow-ports" pointer-events="none">' +
      '<circle cx="' +
      ports.xFeed +
      '" cy="' +
      ports.yOutlet +
      '" r="5.5" fill="' +
      NFT_FLOW_SUPPLY +
      '" stroke="#fef3c7" stroke-width="1.4"/>' +
      '<circle cx="' +
      ports.xReturn +
      '" cy="' +
      ports.yInlet +
      '" r="5.5" fill="' +
      NFT_FLOW_RETURN +
      '" stroke="#fef3c7" stroke-width="1.4"/>' +
      (o.portTicks !== false
        ? '<path d="M ' +
          (ports.xFeed - 7) +
          ' ' +
          ports.yOutlet +
          ' L ' +
          ports.xFeed +
          ' ' +
          ports.yOutlet +
          ' L ' +
          (ports.xFeed + 7) +
          ' ' +
          ports.yOutlet +
          '" stroke="' +
          NFT_FLOW_SUPPLY +
          '" stroke-width="2" fill="none" opacity="0.9"/>' +
          '<path d="M ' +
          (ports.xReturn - 7) +
          ' ' +
          ports.yInlet +
          ' L ' +
          ports.xReturn +
          ' ' +
          ports.yInlet +
          ' L ' +
          (ports.xReturn + 7) +
          ' ' +
          ports.yInlet +
          '" stroke="' +
          NFT_FLOW_RETURN +
          '" stroke-width="2" fill="none" opacity="0.9"/>'
        : '') +
      '</g>';
  }
  return { back: back, flowLayer: flowLayer, flowLegend: flowLegend, flowTankPorts: flowTankPorts, flowMark: mark };
}

/** Puertos depósito NFT (pared / mesa / escalera 1 cara): impar = izq. abajo + der. arriba; par = ambos a la izquierda. */
function nftSvgTankPorts(tx, tankW, tankY, tankH, nTubos) {
  const odd = (parseInt(String(nTubos), 10) || 0) % 2 === 1;
  const xL = tx + 14;
  const xR = tx + tankW - 14;
  return {
    odd: odd,
    xFeed: xL,
    xReturn: odd ? xR : xL,
    yOutlet: tankY + tankH - 16,
    yInlet: tankY + 16,
  };
}

/** Depósito estilo torre: cuerpo claro, agua con clip y superficie elíptica. */
function nftSvgTankTorreStyle(tx, tankY, tankW, tankH, suf, volL, opts) {
  const o = opts || {};
  const Tg =
    typeof HC_DIAG !== 'undefined' && HC_DIAG.torre
      ? HC_DIAG.torre
      : { depBody0: '#f8fafc', depBody1: '#e2e8f0', depAgua0: '#7dd3fc', depAgua1: '#0284c7', depAguaOp0: '0.82', depAguaOp1: '0.92' };
  const gidBody = 'nftTkBody' + suf;
  const gidAqua = 'nftTkAq' + suf;
  const gidClip = 'nftTkClip' + suf;
  const cx = tx + tankW / 2;
  const vol = Math.max(5, parseInt(String(volL), 10) || 20);
  const volPct = nftSvgTankFillPct(vol, o);
  const aguaH = Math.round((tankH - 20) * volPct);
  const aguaY = tankY + tankH - 10 - aguaH;
  const aguaCol = '#0284c7';
  const ta = o.animate !== false && typeof torreSvgAnimacionesActivas === 'function' && torreSvgAnimacionesActivas();
  let defs = '';
  defs +=
    '<linearGradient id="' +
    gidBody +
    '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
    Tg.depBody0 +
    '"/><stop offset="100%" stop-color="' +
    Tg.depBody1 +
    '"/></linearGradient>';
  defs +=
    '<linearGradient id="' +
    gidAqua +
    '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' +
    Tg.depAgua0 +
    '" stop-opacity="' +
    (Tg.depAguaOp0 || '0.82') +
    '"/><stop offset="100%" stop-color="' +
    Tg.depAgua1 +
    '" stop-opacity="' +
    (Tg.depAguaOp1 || '0.92') +
    '"/></linearGradient>';
  defs +=
    '<clipPath id="' +
    gidClip +
    '"><rect x="' +
    (tx + 3) +
    '" y="' +
    (tankY + 3) +
    '" width="' +
    (tankW - 6) +
    '" height="' +
    (tankH - 6) +
    '" rx="10"/></clipPath>';
  let html = '';
  html +=
    '<rect x="' +
    tx +
    '" y="' +
    tankY +
    '" width="' +
    tankW +
    '" height="' +
    tankH +
    '" rx="12" fill="url(#' +
    gidBody +
    ')" stroke="#94a3b8" stroke-width="1.2"/>';
  html +=
    '<rect x="' +
    (tx + 3) +
    '" y="' +
    aguaY +
    '" width="' +
    (tankW - 6) +
    '" height="' +
    (aguaH + 7) +
    '" fill="url(#' +
    gidAqua +
    ')" clip-path="url(#' +
    gidClip +
    ')" opacity="0.8">';
  if (ta) {
    html +=
      '<animate attributeName="y" from="' +
      (aguaY + 2) +
      '" to="' +
      (aguaY - 2) +
      '" dur="2s" repeatCount="indefinite" direction="alternate"/>';
  }
  html += '</rect>';
  html +=
    '<ellipse cx="' +
    cx +
    '" cy="' +
    aguaY +
    '" rx="' +
    (tankW - 16) / 2 +
    '" ry="5" fill="' +
    aguaCol +
    '" opacity="0.3">';
  if (ta) {
    html +=
      '<animate attributeName="ry" from="4" to="6" dur="1.5s" repeatCount="indefinite" direction="alternate"/>';
  }
  html += '</ellipse>';
  return { defs: defs, html: html, volTextFill: aguaCol };
}

/** Bomba de aire en suelo, separada del depósito; piedra difusora dentro del agua, alejada del borde del depósito. */
function nftSvgAireadorEnSuelo(tx, tankY, tankW, tankH, P) {
  const gapFromTank = 16;
  const sueloY = tankY + tankH;
  const pumpW = 28;
  const pumpH = 22;
  const pumpX = tx + tankW + gapFromTank;
  const pumpY = sueloY - pumpH;
  const piedraX = tx + Math.round(tankW * 0.58);
  const piedraY = tankY + tankH - 12;
  let s = '';
  s +=
    '<rect x="' +
    pumpX +
    '" y="' +
    pumpY +
    '" width="' +
    pumpW +
    '" height="' +
    pumpH +
    '" rx="4" fill="#334155" stroke="#1e293b" stroke-width="1.3"/>';
  s +=
    '<rect x="' +
    (pumpX + 5) +
    '" y="' +
    (pumpY + 4) +
    '" width="' +
    (pumpW - 10) +
    '" height="' +
    (pumpH - 8) +
    '" rx="2" fill="#475569" opacity="0.9"/>';
  const hoseY = sueloY - 4;
  const hoseKneeX = piedraX + 8;
  s +=
    '<path d="M ' +
    pumpX +
    ' ' +
    (pumpY + 7) +
    ' L ' +
    hoseKneeX +
    ' ' +
    (pumpY + 7) +
    ' L ' +
    hoseKneeX +
    ' ' +
    hoseY +
    ' L ' +
    piedraX +
    ' ' +
    hoseY +
    ' L ' +
    piedraX +
    ' ' +
    piedraY +
    '" fill="none" stroke="' +
    P.airLine +
    '" stroke-width="2.2" stroke-linejoin="round" opacity="0.95"/>';
  s +=
    '<ellipse cx="' +
    piedraX +
    '" cy="' +
    piedraY +
    '" rx="13" ry="7" fill="' +
    P.airStoneFill +
    '" stroke="' +
    P.airStoneStroke +
    '" stroke-width="1.2"/>';
  const ySurf = tankY + 8;
  for (let bi = 0; bi < 6; bi++) {
    const bx = piedraX + (bi % 3 - 1) * 4;
    s += nftSvgBurbujaAnimada(bx, ySurf, piedraY, bi, P.bubble);
  }
  return s;
}

/**
 * NFT en serpentín (como esquema clásico): tubos apilados, flujo en zigzag,
 * línea discontinua azul = sentido del agua, depósito con volumen y datos de bomba.
 */
function buildNftSerpentineDiagramSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  const EO = equipOpts || {};
  const cfg = EO.cfgSnapshot || {};
  const interactive = EO.interactive === true;
  const showCalentador = EO.calentador === true;
  const showDifusor = EO.difusor === true;
  const bomb = EO.bombaInfo || null;
  const dispLayout = nftDisposicionNormalizada(EO.nftDisposicion != null ? EO.nftDisposicion : cfg.nftDisposicion);

  const suf = (svgIdSuffix != null && String(svgIdSuffix).trim() !== '')
    ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  const gidCh = 'nftSerpCh' + suf;
  const tid = 'nftSerpTitle' + suf;

  const nCh = Math.min(Math.max(parseInt(String(canales), 10) || 1, 1), 24);
  const huecosN = Math.min(Math.max(parseInt(String(huecos), 10) || 2, 2), 30);
  const pend = Math.min(Math.max(parseInt(String(pendPct), 10) || 2, 1), 4);
  const tankMeta = nftSvgTankMetaFromEquip(EO, parseInt(String(volL), 10) || 20);
  const vol = Math.min(200, Math.max(5, tankMeta.volL));

  const isParedSerp = dispLayout === 'pared';
  const oddTubes = nCh % 2 === 1;
  const W0 = nftDiagramCanvasW0();
  const compactSerpHeader = nCh * huecosN > 20;
  const hdrSerpPad = nftDiagramHeaderTypography(W0, { compact: compactSerpHeader, withLegend: false });
  const rowStep = Math.max(
    isParedSerp ? 58 : 54,
    Math.min(74, Math.floor((isParedSerp ? 840 : 820) / Math.max(nCh, 1)))
  );
  const topPad = Math.max(isParedSerp ? 44 : 32, hdrSerpPad.topPadMin);
  const botTank = 162;
  const stairExtra = dispLayout === 'escalera' ? Math.max(0, nCh - 1) * 28 : 0;
  const H = topPad + nCh * rowStep + botTank + stairExtra;
  const cx = W0 / 2;
  const marginX = 34;
  const xL = marginX;
  const xR = W0 - marginX;
  const tubeH = dispLayout === 'pared' ? 17 : 25;
  const padFlow = 14;
  const serpChStroke = dispLayout === 'pared' ? 1.05 : 1.3;
  const tankY = H - botTank + 4;
  const tankH = 102;
  const tankW = Math.min(400, Math.round(152 + vol * 0.72));
  const tx = (W0 - tankW) / 2;
  const waterTop = tankY + 6;
  const waterH = tankH - 16;
  const altCmSerp =
    EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0 ? Math.round(Number(EO.nftAlturaBombeoCm)) : null;
  const legHintSerp = { volL: vol, nCanales: nCh, nTubosTotal: nCh, alturaBadgeNTubos: nCh };
  const legTierSerp = nftDiagramLegibilityHint(legHintSerp);
  const volFsSerp = nftTankVolumeFontSize(vol, legTierSerp);
  const altBadgeSerp = nftAlturaBadgeBesideTank(altCmSerp, tx, tankY, tankW, tankH, W0, legHintSerp);
  let Wsvg = altBadgeSerp.canvasW;
  if (showDifusor) {
    const minWAir = tx + tankW + 16 + 28 + 12;
    if (minWAir > Wsvg) Wsvg = minWAir;
  }

  const yRow = i =>
    topPad + i * rowStep + Math.floor(rowStep / 2) + (dispLayout === 'escalera' ? i * 14 : 0);

  const P = HC_DIAG.nft;
  const flowDash = 'stroke-dasharray="11 9" stroke-linecap="round" stroke-linejoin="round"';
  const flowCol = P.flow;
  const flowGhostCol = P.flowGhost || '#d97706';
  const flowW = 3.4;
  const chStroke = P.canalStroke || '#92400e';
  const chGrad0 = P.canalGrad0;
  const chGrad1 = P.canalGrad1;
  const flowSt = 'stroke="' + flowCol + '" fill="none" ' + flowDash;

  /**
   * Serpentín (mesa / pared): circuito en serie.
   * Tubos impares: salida depósito izq. (abajo) → subida al tubo superior; retorno der. (arriba).
   * Tubos pares: entrada y salida solo en lateral izquierdo (abajo / arriba), sin cruces.
   */
  const yPump = waterTop + Math.min(18, waterH * 0.45);
  const xPump = tx + 14;
  const flowMargin = 10;
  const colectoresParalelo =
    (dispLayout === 'mesa' || dispLayout === 'pared') &&
    typeof nftColectoresParaleloDesdeConfig === 'function' &&
    nftColectoresParaleloDesdeConfig(cfg);
  let flowPaths;
  if (colectoresParalelo && typeof nftHydraulicMesaMultinivel === 'function') {
    const geomsPar = [];
    for (let i = 0; i < nCh; i++) {
      geomsPar.push({ g: i, rowY: yRow(i), xL: xL, xR: xR, t: 0 });
    }
    const shelfPar = function (G) {
      const yC = G.rowY;
      const x0 = G.xL + padFlow;
      const x1 = G.xR - padFlow;
      return {
        x0: x0,
        x1: x1,
        yC: yC,
        yT: yC - tubeH / 2,
        yB: yC + tubeH / 2,
        thick: tubeH,
        wid: Math.max(8, x1 - x0),
      };
    };
    const portsPar = nftSvgTankPorts(tx, tankW, tankY, tankH, nCh);
    // En paralelo: alimentación siempre por la izquierda, retorno siempre por la derecha
    portsPar.xReturn = tx + tankW - 14;
    const xFeedRiserPar = Math.max(12, xL - flowMargin);
    const xReturnRiserPar = Math.min(Wsvg - 14, xR + flowMargin);
    const hydPar = nftHydraulicMesaMultinivel({
      kind: 'mesa_multinivel',
      mesaParallel: true,
      mesaParallelGeoms: geomsPar,
      mesaParallelShelfFn: shelfPar,
      ports: portsPar,
      xPump: xPump,
      yPump: yPump,
      xFeedRiser: xFeedRiserPar,
      xReturnRiser: xReturnRiserPar,
      xL: xL,
      xR: xR,
      flowMargin: flowMargin,
      oddTubes: oddTubes,
      Wsvg: Wsvg,
      tankY: tankY,
      tubeH: tubeH,
      ductDrop: 28,
      cornerRadius: 0,
    });
    flowPaths = {
      supplyD: hydPar.supplyD || '',
      returnD: hydPar.returnD || '',
      ports: portsPar,
      xFeedRiser: xFeedRiserPar,
      xReturnRiser: xReturnRiserPar,
    };
  } else {
    flowPaths = nftBuildSerpentineFlowPaths({
      nCh: nCh,
      yRow: yRow,
      xL: xL,
      xR: xR,
      padFlow: padFlow,
      flowMargin: flowMargin,
      oddTubes: oddTubes,
      xPump: xPump,
      yPump: yPump,
      tx: tx,
      tankW: tankW,
      tankY: tankY,
      tankH: tankH,
      Wsvg: Wsvg,
      tubeH: tubeH,
    });
  }
  const flowSupplyD = flowPaths.supplyD;
  const flowReturnD = flowPaths.returnD;
  const tankPorts = flowPaths.ports;
  const xTankFeed = tankPorts.xFeed;
  const xTankReturn = tankPorts.xReturn;
  const yOutlet = tankPorts.yOutlet;
  const yInlet = tankPorts.yInlet;

  const flowSvg =
    typeof nftHydraulicFlowSvgBundle === 'function'
      ? nftHydraulicFlowSvgBundle(flowPaths, suf, {
          legendX: 12,
          legendY: Math.max(8, topPad - 6),
          strokeWidth: flowW,
          cartoonMedir: EO.cartoonMedir === true,
          legendMode: colectoresParalelo ? 'mesa_paralelo' : 'serie',
        })
      : null;
  const flowMark = flowSvg ? flowSvg.flowMark : nftSvgFlowMarkerDefs(suf);
  let back = flowSvg ? flowSvg.back : '';
  let flowLegend = flowSvg ? flowSvg.flowLegend : nftSvgFlowLegend(12, Math.max(8, topPad - 6));

  let channels = '';
  const cxTubeSerp = (xL + xR) / 2;
  for (let i = 0; i < nCh; i++) {
    const yRi = yRow(i);
    const yc = yRi - tubeH / 2;
    const peNone = interactive ? ' pointer-events="none"' : '';
    channels +=
      '<rect x="' +
      xL +
      '" y="' +
      yc +
      '" width="' +
      (xR - xL) +
      '" height="' +
      tubeH +
      '" rx="11" fill="url(#' +
      gidCh +
      ')" stroke="' +
      chStroke +
      '" stroke-width="' +
      serpChStroke +
      '"' +
      peNone +
      '/>';
    channels +=
      '<line x1="' +
      xL +
      '" y1="' +
      (yc + 2) +
      '" x2="' +
      xR +
      '" y2="' +
      (yc + 2) +
      '" stroke="' +
      chGrad1 +
      '" stroke-width="1.3" opacity="0.85" pointer-events="none"/>';
    channels +=
      '<line x1="' +
      xL +
      '" y1="' +
      (yc + tubeH - 3) +
      '" x2="' +
      xR +
      '" y2="' +
      (yc + tubeH - 3) +
      '" stroke="' +
      chGrad0 +
      '" stroke-width="1.1" opacity="0.55" pointer-events="none"/>';
  }

  let flowLayer = flowSvg ? flowSvg.flowLayer : '';
  let flowTankPorts = flowSvg ? flowSvg.flowTankPorts : '';
  const spanTube = xR - xL - 2 * padFlow;
  const hr = Math.max(
    dispLayout === 'pared' ? 6.2 : 5.6,
    Math.min(dispLayout === 'pared' ? 13.2 : 12.5, (spanTube / Math.max(huecosN - 1, 1)) * (dispLayout === 'pared' ? 0.51 : 0.48))
  );
  const holeNumFsSerp = (nCh >= 10 ? 8.5 : nCh >= 6 ? 9.25 : 10) + (isParedSerp ? 0.85 : 0);
  const compactSerp = nCh * huecosN > 20;
  let plants = '';
  for (let i = 0; i < nCh; i++) {
    const y = yRow(i);
    const rtl = colectoresParalelo ? false : i % 2 === 1;
    const spanH = spanTube;
    const slotAlongRow = huecosN <= 1 ? spanH : spanH / Math.max(1, huecosN - 1);

    for (let j = 0; j < huecosN; j++) {
      const t = huecosN <= 1 ? 0.5 : j / (huecosN - 1);
      const gx = rtl ? xR - padFlow - t * spanH : xL + padFlow + t * spanH;
      const gy = y;
      const numShow = j + 1;
      let dat = { variedad: '', fecha: '' };
      if (interactive && state.torre[i] && state.torre[i][j]) dat = state.torre[i][j];
      const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
      const col = interactive ? torreListaColorCesta(i, j) : { bg: P.plantEmptyBg, border: P.plantEmptyBorder };
      const multiKey = i + ',' + j;
      const isMulti = interactive && torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
      const isEd =
        interactive &&
        typeof editingCesta !== 'undefined' &&
        editingCesta &&
        editingCesta.nivel === i &&
        editingCesta.cesta === j;
      const dias =
        dat.fecha && typeof torreDiasCicloVisual === 'function'
          ? torreDiasCicloVisual(dat)
          : dat.fecha
            ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000))
            : null;
      let ariaTxt = 'Canal T' + (i + 1) + ', hueco ' + (j + 1) + ', ' + (dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'vacío');
      if (dias !== null) ariaTxt += ', día ' + dias;
      ariaTxt += '. Pulsa para ficha o asignar cultivo.';

      if (typeof hcIlloNftHuecoLayer === 'function') {
        plants += hcIlloNftHuecoLayer(gx, gy, hr, i, j, dat, cult, interactive, P, {
          compact: compactSerp,
          numBelow: false,
          sinTexto: true,
          numShow: numShow,
          extraDy: isParedSerp ? 5 : 3,
          slotAlong: slotAlongRow,
        });
      } else if (interactive) {
        plants +=
          '<g class="hc-cesta hc-nft-hueco" data-n="' + i + '" data-c="' + j + '" role="button" tabindex="0" aria-label="' +
          escAriaAttr(ariaTxt) +
          '">';
        plants += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + hr.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="1.35"/>';
        if (isMulti) {
          plants +=
            '<circle cx="' +
            gx.toFixed(2) +
            '" cy="' +
            gy +
            '" r="' +
            (hr + 3.5).toFixed(2) +
            '" fill="none" stroke="' +
            P.ringMulti +
            '" stroke-width="1.2" stroke-dasharray="3 2"/>';
        }
        if (isEd) {
          plants +=
            '<circle cx="' +
            gx.toFixed(2) +
            '" cy="' +
            gy +
            '" r="' +
            (hr + 3).toFixed(2) +
            '" fill="none" stroke="' +
            P.ringEdit +
            '" stroke-width="1.25"/>';
        }
        const ptrR = nftHuecoPointerRadius(hr, true, slotAlongRow);
        plants +=
          '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + ptrR.toFixed(2) + '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>';
        plants += '</g>';
      } else {
        plants += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy + '" r="' + hr.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="1.1"/>';
      }
    }
  }

  const tankTorre = nftSvgTankTorreStyle(tx, tankY, tankW, tankH, suf, vol, {
    animate: true,
    capL: tankMeta.capL,
    mezL: tankMeta.mezL,
  });
  let tankLayer = tankTorre.html;
  tankLayer += altBadgeSerp.html;
  const volTextY = tankY + Math.floor(tankH / 2) + 5;
  const volCxSerp = tx + tankW / 2;
  const capNote =
    tankMeta.capL != null && tankMeta.capL > vol + 1
      ? '<tspan x="' +
        volCxSerp +
        '" dy="13" font-size="' +
        Math.max(9, volFsSerp - 3) +
        '" fill="#64748b" font-weight="600">cap. ' +
        Math.round(tankMeta.capL) +
        ' L</tspan>'
      : '';
  tankLayer +=
    '<text x="' +
    volCxSerp +
    '" y="' +
    volTextY +
    '" text-anchor="middle" fill="' +
    tankTorre.volTextFill +
    '" font-size="' +
    volFsSerp +
    '" font-weight="900" font-family="system-ui,sans-serif">' +
    '<tspan>' +
    vol +
    ' L mezcla</tspan>' +
    capNote +
    '</text>';
  if (showCalentador) {
    const hx = tx + 18;
    tankLayer +=
      '<rect x="' +
      (hx - 5) +
      '" y="' +
      (tankY + tankH - 36) +
      '" width="10" height="30" rx="5" fill="' +
      P.calFill +
      '" stroke="' +
      P.calStroke +
      '" stroke-width="1.2"/>';
    tankLayer += '<circle cx="' + hx + '" cy="' + (tankY + tankH - 42) + '" r="3.5" fill="' + P.calGlow + '"/>';
  }
  if (showDifusor) {
    tankLayer += nftSvgAireadorEnSuelo(tx, tankY, tankW, tankH, P);
  }

  const pumpLines = '';
  let scadaCallouts = '';

  if (interactive) {
    back = '<g pointer-events="none">' + back + '</g>';
    channels = '<g pointer-events="none">' + channels + '</g>';
    flowLayer = '<g pointer-events="none">' + flowLayer + '</g>';
    tankLayer = '<g pointer-events="none">' + tankLayer + '</g>';
    if (flowTankPorts) flowTankPorts = '<g pointer-events="none">' + flowTankPorts + '</g>';
    flowLegend = '<g pointer-events="none">' + flowLegend + '</g>';
  }

  const foot = vol + ' L';

  return (
    '<svg class="torre-svg-diagram nft-serpentine-svg nft-diagram--scroll' +
    (isParedSerp ? ' nft-serpentine--pared' : '') +
    (colectoresParalelo ? ' nft-serpentine--paralelo' : '') +
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
    escSvgText((colectoresParalelo ? 'NFT paralelo' : 'NFT serpentín') + ' · ' + foot) +
    '</title>' +
    '<defs>' +
    '<linearGradient id="' +
    gidCh +
    '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' +
    chGrad0 +
    '"/><stop offset="100%" stop-color="' +
    chGrad1 +
    '"/></linearGradient>' +
    tankTorre.defs +
    flowMark.defs +
    '</defs>' +
    flowLegend +
    back +
    channels +
    flowLayer +
    plants +
    tankLayer +
    flowTankPorts +
    scadaCallouts +
    (!interactive ? pumpLines : '') +
    '</svg>'
  );
}

function escSvgText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Esquema NFT: tubos con todos los huecos, recorrido de agua (subida → manifold → canales → retorno) y CAL/AIR en depósito si aplica. */
function buildNftSchematicSvg(canales, huecos, pendPct, volL, svgIdSuffix, equipOpts) {
  const EO = equipOpts || {};
  const showCalentador = EO.calentador === true;
  const showDifusor = EO.difusor === true;
  const interactive = EO.interactive === true;
  const bomb = EO.bombaInfo || null;

  const suf = (svgIdSuffix != null && String(svgIdSuffix).trim() !== '')
    ? String(svgIdSuffix).replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  const gidFilm = 'nftFilmG' + suf;
  const gidTank = 'nftTankG' + suf;
  const gidAqua = 'nftAquaG' + suf;
  const tid = 'nftSvgTitle' + suf;
  const W0 = 500;
  const H = 278;
  const nCh = Math.min(Math.max(parseInt(String(canales), 10) || 1, 1), 10);
  const huecosN = Math.min(Math.max(parseInt(String(huecos), 10) || 2, 2), 30);
  const pend = Math.min(Math.max(parseInt(String(pendPct), 10) || 2, 1), 4);
  const vol = Math.min(100, Math.max(5, parseInt(String(volL), 10) || 20));
  const altCmSch =
    EO.nftAlturaBombeoCm != null && Number(EO.nftAlturaBombeoCm) > 0 ? Math.round(Number(EO.nftAlturaBombeoCm)) : null;

  const cx = W0 / 2;
  const x0 = 32;
  const x1 = W0 - 32;
  const span = (x1 - x0) / nCh;
  const yMan = 40;
  const yTop = 52;
  const yBot = 106;
  const sk = 1.75 + pend * 0.55;

  const tankTop = 172;
  const tankH = 52;
  const tankW = Math.min(172, Math.round(92 + vol * 0.42));
  const tx = (W0 - tankW) / 2;
  const tankMid = tankTop + tankH / 2;
  const altBadgeSch = nftAlturaBadgeBesideTank(altCmSch, tx, tankTop, tankW, tankH, W0);
  const Wsvg = altBadgeSch.canvasW;
  const cxTitle = Wsvg / 2;
  const volCxSch = tx + tankW / 2;
  const waterFill = 0.82;
  const waterTop = tankTop + 6 + (1 - waterFill) * (tankH - 14);
  const retEndX = tx + tankW - 10;
  const retEndY = waterTop + 8;

  const schFlowAnim = torreSvgAnimacionesActivas();
  const P = HC_DIAG.nft;
  const flowDash = 'stroke-dasharray="11 9" stroke-linecap="round" stroke-linejoin="round"';
  const flowSt = 'stroke="' + P.flow + '" fill="none" ' + flowDash;
  const pipeGrey = 'stroke="' + P.pipeGrey + '" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"';

  let back = '';
  const retPath =
    'M ' + (x1 - 2) + ' ' + (yBot - 6) +
    ' C ' + (W0 - 8) + ' ' + (yBot + 28) + ', ' + (W0 - 12) + ' ' + (tankTop - 18) + ', ' + retEndX + ' ' + retEndY;
  back += '<path d="' + retPath + '" ' + pipeGrey + ' opacity="0.55"/>';
  back +=
    '<path d="' + retPath + '" ' + flowSt + ' stroke-width="1.85" opacity="0.92"' +
    (schFlowAnim
      ? '><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.35s" repeatCount="indefinite" calcMode="linear"/></path>'
      : '/>');
  let tankLayer = '';
  tankLayer +=
    '<rect x="' +
    tx +
    '" y="' +
    tankTop +
    '" width="' +
    tankW +
    '" height="' +
    tankH +
    '" rx="10" fill="url(#' +
    gidTank +
    ')" stroke="' +
    P.tankStroke +
    '" stroke-width="1.2"/>';
  tankLayer += '<rect x="' + (tx + 4) + '" y="' + waterTop + '" width="' + (tankW - 8) + '" height="' + (tankTop + tankH - 8 - waterTop) + '" rx="6" fill="url(#' + gidAqua + ')" opacity="0.88"/>';
  tankLayer += altBadgeSch.html;
  tankLayer +=
    '<text x="' +
    volCxSch +
    '" y="' +
    (tankMid + 5) +
    '" text-anchor="middle" fill="' +
    P.volWhite +
    '" font-size="12" font-weight="900" font-family="system-ui,sans-serif">' +
    vol +
    ' L</text>';

  if (showCalentador) {
    const hx = tx + 16;
    tankLayer +=
      '<rect x="' +
      (hx - 5) +
      '" y="' +
      (tankTop + tankH - 34) +
      '" width="10" height="28" rx="5" fill="' +
      P.calFill +
      '" stroke="' +
      P.calStroke +
      '" stroke-width="1.2"/>';
    tankLayer += '<circle cx="' + hx + '" cy="' + (tankTop + tankH - 40) + '" r="3.5" fill="' + P.calGlow + '"/>';
  }
  if (showDifusor) {
    const ax = tx + tankW - 20;
    const ay = tankTop + tankH - 14;
    tankLayer +=
      '<line x1="' +
      ax +
      '" y1="' +
      (tankTop - 4) +
      '" x2="' +
      ax +
      '" y2="' +
      (ay - 10) +
      '" stroke="' +
      P.line575 +
      '" stroke-width="1.4" stroke-dasharray="3 2"/>';
    tankLayer +=
      '<ellipse cx="' +
      ax +
      '" cy="' +
      ay +
      '" rx="12" ry="6" fill="' +
      P.airStoneSchFill +
      '" stroke="' +
      P.line575 +
      '" stroke-width="1.2"/>';
    for (let bi = 0; bi < 5; bi++) {
      const bx = ax + (bi % 3 - 1) * 4;
      tankLayer += '<circle cx="' + bx + '" cy="' + (ay - 6 - bi * 3) + '" r="1.6" fill="' + P.bubbleSch + '" opacity="0.85"/>';
    }
  }

  let plumbing = '';
  plumbing +=
    '<circle cx="' +
    cx +
    '" cy="' +
    (tankTop - 10) +
    '" r="11" fill="' +
    P.pumpCircleFill +
    '" stroke="' +
    P.pumpCircleStroke +
    '" stroke-width="1"/>';
  const riserY1 = tankTop;
  const riserY2 = yMan + 3;
  plumbing += '<line x1="' + cx + '" y1="' + riserY1 + '" x2="' + cx + '" y2="' + riserY2 + '" ' + pipeGrey + ' opacity="0.65"/>';
  plumbing += '<line x1="' + cx + '" y1="' + riserY1 + '" x2="' + cx + '" y2="' + riserY2 + '" ' + flowSt + ' stroke-width="2" opacity="0.92"/>';

  plumbing +=
    '<line x1="' +
    x0 +
    '" y1="' +
    yMan +
    '" x2="' +
    x1 +
    '" y2="' +
    yMan +
    '" stroke="' +
    P.manifoldPipe +
    '" stroke-width="5.5" stroke-linecap="round"/>';
  plumbing += '<line x1="' + x0 + '" y1="' + yMan + '" x2="' + x1 + '" y2="' + yMan + '" ' + flowSt + ' stroke-width="1.55" opacity="0.78"/>';
  plumbing +=
    '<text x="' +
    cx +
    '" y="' +
    (yMan - 8) +
    '" text-anchor="middle" fill="' +
    P.manifoldText +
    '" font-size="8" font-weight="800">Manifold · distribución</text>';

  const chParts = [];
  for (let i = 0; i < nCh; i++) {
    const xa = x0 + i * span + 1.5;
    const w = Math.max(span - 3, 12);
    const xtl = xa;
    const ytl = yTop;
    const xtr = xa + w;
    const ytr = yTop + sk;
    const xbr = xa + w + 5;
    const ybr = yBot;
    const xbl = xa + 5;
    const ybl = yBot - sk * 0.55;
    const dCh = 'M' + xtl + ' ' + ytl + ' L' + xtr + ' ' + ytr + ' L' + xbr + ' ' + ybr + ' L' + xbl + ' ' + ybl + 'Z';

    const ix = xtl + Math.min(w * 0.2, 12);
    const peNone = interactive ? ' pointer-events="none"' : '';
    chParts.push(
      '<line x1="' +
        ix +
        '" y1="' +
        yMan +
        '" x2="' +
        (xtl + 2) +
        '" y2="' +
        (ytl + 5) +
        '" stroke="' +
        P.line475 +
        '" stroke-width="1.8" stroke-linecap="round"' +
        peNone +
        '/>'
    );
    chParts.push('<line x1="' + ix + '" y1="' + yMan + '" x2="' + (xtl + 2) + '" y2="' + (ytl + 5) + '" ' + flowSt + ' stroke-width="1.15" opacity="0.9"' + peNone + '/>');

    chParts.push(
      '<path fill="url(#' + gidFilm + ')" stroke="' + P.filmStroke + '" stroke-width="1.15" opacity="0.97" d="' + dCh + '"' + peNone + '/>'
    );

    chParts.push(
      '<path d="M' + (xbl + 3) + ' ' + (ybl + 2) + ' L' + (xbr - 4) + ' ' + (ybr - 4) + '" fill="none" ' + flowSt + ' stroke-width="1.35" opacity="0.88"' + peNone + '/>'
    );

    const innerTopLen = Math.max(xtr - xtl - 5, 2);
    const hr = Math.max(1.85, Math.min(5.6, (innerTopLen / Math.max(huecosN - 1, 1)) * 0.52));
    const alongDx = (xtr - xtl - 5) / Math.max(1, huecosN - 1);
    const alongDy = (ytr - ytl - 3) / Math.max(1, huecosN - 1);
    const slotAlong = huecosN <= 1 ? Infinity : Math.hypot(alongDx, alongDy);
    for (let j = 0; j < huecosN; j++) {
      const t = huecosN <= 1 ? 0.5 : j / (huecosN - 1);
      const px = xtl + 2.5 + t * (xtr - xtl - 5);
      const py = ytl + 4 + t * (ytr - ytl - 3);
      if (interactive) {
        const dat = (state.torre[i] && state.torre[i][j]) ? state.torre[i][j] : { variedad: '', fecha: '' };
        const cult = dat.variedad ? getCultivoDB(dat.variedad) : null;
        const nomLista = dat.variedad ? cultivoNombreLista(cult, dat.variedad) : 'vacío';
        const col = torreListaColorCesta(i, j);
        const multiKey = i + ',' + j;
        const isMulti = torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
        const isEd = !!(typeof editingCesta !== 'undefined' && editingCesta && editingCesta.nivel === i && editingCesta.cesta === j);
        const dias =
          dat.fecha && typeof torreDiasCicloVisual === 'function'
            ? torreDiasCicloVisual(dat)
            : dat.fecha
              ? Math.max(0, Math.floor((Date.now() - new Date(dat.fecha)) / 86400000))
              : null;
        let ariaTxt = 'Canal ' + (i + 1) + ', hueco ' + (j + 1) + ', ' + nomLista;
        if (dias !== null) ariaTxt += ', día ' + dias;
        ariaTxt += '. Pulsa para abrir ficha o asignar cultivo.';
        const ptrR = nftHuecoPointerRadius(hr, true, slotAlong);
        chParts.push(
          '<g class="hc-cesta hc-nft-hueco hc-cesta-clickable" data-n="' + i + '" data-c="' + j + '" role="button" tabindex="0" aria-label="' + escAriaAttr(ariaTxt) + '">'
        );
        chParts.push(
          '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="' + hr.toFixed(2) + '" fill="' + col.bg + '" stroke="' + col.border + '" stroke-width="0.85"/>'
        );
        if (isMulti) {
          chParts.push(
            '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            (hr + 4).toFixed(2) +
            '" fill="none" stroke="' +
            P.ringMulti +
            '" stroke-width="1.25" stroke-dasharray="3 2"/>'
          );
        }
        if (isEd) {
          chParts.push(
            '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            (hr + 3.5).toFixed(2) +
            '" fill="none" stroke="' +
            P.ringEdit +
            '" stroke-width="1.35"/>'
          );
        }
        chParts.push(
          '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="' + ptrR.toFixed(2) + '" fill="rgba(0,0,0,0.001)" pointer-events="all"/>'
        );
        chParts.push('</g>');
      } else {
        chParts.push(
          '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            hr.toFixed(2) +
            '" fill="' +
            P.cultivoFill +
            '" stroke="' +
            P.cultivoStroke +
            '" stroke-width="0.5"/>' +
            '<circle cx="' +
            px.toFixed(2) +
            '" cy="' +
            py.toFixed(2) +
            '" r="' +
            Math.max(0.55, hr * 0.42).toFixed(2) +
            '" fill="' +
            P.cultivoInner +
            '" opacity="0.55"/>'
        );
      }
    }
    chParts.push(
      '<text x="' +
        (xtl - 1) +
        '" y="' +
        (ytl + 12) +
        '" text-anchor="end" font-size="7" font-weight="900" fill="' +
        P.nivelText +
        '"' +
        peNone +
        '>' +
        (i + 1) +
        '</text>'
    );
  }

  if (interactive) {
    back = '<g pointer-events="none">' + back + '</g>';
    tankLayer = '<g pointer-events="none">' + tankLayer + '</g>';
    plumbing = '<g pointer-events="none">' + plumbing + '</g>';
  }

  let schLabels = '';
  if (typeof hcDiagramViewLabelSvg === 'function') {
    schLabels = hcDiagramViewLabelSvg(cxTitle, 18, 'frontal', { pointerEvents: false });
  }

  return (
    '<svg class="torre-svg-diagram nft-diagram--scroll svg-fit-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + Wsvg + ' ' + H + '" width="100%" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' +
      tid +
      '">' +
      '<title id="' + tid + '">NFT esquema · ' + vol + ' L · vista frontal</title>' +
      '<defs>' +
      '<linearGradient id="' +
      gidFilm +
      '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' +
      P.filmGrad0 +
      '"/><stop offset="100%" stop-color="' +
      P.filmGrad1 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      gidTank +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      P.tankGrad0 +
      '"/><stop offset="100%" stop-color="' +
      P.tankGrad1 +
      '"/></linearGradient>' +
      '<linearGradient id="' +
      gidAqua +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      P.filmWater0 +
      '" stop-opacity="' +
      P.filmWaterOp0 +
      '"/><stop offset="100%" stop-color="' +
      P.filmWater1 +
      '" stop-opacity="' +
      P.filmWaterOp1 +
      '"/></linearGradient>' +
      '</defs>' +
      schLabels +
      back +
      tankLayer +
      chParts.join('') +
      plumbing +
      '</svg>'
  );
}

/** Borrador de config NFT desde el asistente (paso 1) para cálculo y SVG. */
function buildNftDraftConfigFromSetupUi() {
  const mont = readNftMontajeFromSetupUi();
  const canalesSlider = parseInt(document.getElementById('sliderNftCanales')?.value ?? '0', 10);
  const huecos = parseInt(document.getElementById('sliderNftHuecos')?.value ?? '0', 10);
  const pend = parseInt(document.getElementById('sliderNftPendiente')?.value ?? '0', 10);
  const geom = readNftCanalGeomFromSetupUi();
  const draft = {
    tipoInstalacion: 'nft',
    nftNumCanales: Number.isFinite(canalesSlider) ? Math.max(0, Math.min(24, canalesSlider)) : 0,
    nftHuecosPorCanal: Number.isFinite(huecos) ? Math.max(0, Math.min(30, huecos)) : 0,
    nftPendientePct: Number.isFinite(pend) && pend >= 1 ? Math.min(4, pend) : 0,
    nftTuboInteriorMm: setupNftTuboMm,
    nftDisposicion: mont.disposicion,
    nftCanalForma: geom.forma,
    nftCanalDiamMm: geom.diamMm,
    nftCanalAnchoMm: geom.anchoMm,
    nftLaminaAguaMm: geom.laminaMm,
  };
  if (geom.longCanalM != null) draft.nftLongCanalM = geom.longCanalM;
  if (mont.alturaBombeoCm > 0) draft.nftAlturaBombeoCm = mont.alturaBombeoCm;
  if (mont.disposicion === 'mesa') {
    draft.nftMesaRecorridoAgua = mont.mesaRecorrido || 'serie';
    if (mont.mesaMultinivel) {
      const tiers = parseNftMesaTubosPorNivelStr(mont.mesaTubosStr);
      if (tiers.length >= 2) {
        draft.nftMesaMultinivel = true;
        draft.nftMesaTubosPorNivelStr = tiers.join(',');
        draft.nftNumCanales = tiers.reduce((a, b) => a + b, 0);
        if (mont.mesaSepCm > 0) draft.nftMesaSeparacionNivelesCm = mont.mesaSepCm;
      }
    }
  }
  if (mont.disposicion === 'pared') {
    draft.nftParedRecorridoAgua = mont.mesaRecorrido || 'serie';
  }
  if (mont.disposicion === 'escalera') {
    draft.nftEscaleraCaras = mont.escaleraCaras;
    if (Number.isFinite(canalesSlider) && canalesSlider > 0) {
      draft.nftEscaleraNivelesCara = Math.min(12, canalesSlider);
      draft.nftNumCanales = draft.nftEscaleraNivelesCara * mont.escaleraCaras;
    } else {
      draft.nftEscaleraNivelesCara = 0;
      draft.nftNumCanales = 0;
    }
  }
  const pot = typeof readNftPotCestaFromSetupUi === 'function' ? readNftPotCestaFromSetupUi() : { rimMm: null, heightMm: null };
  if (pot.rimMm != null) draft.nftNetPotRimMm = pot.rimMm;
  if (pot.heightMm != null) draft.nftNetPotHeightMm = pot.heightMm;
  delete draft.nftMontajeOrigen;
  return draft;
}

function refrescarNftCanalesSliderEtiqueta() {
  const el = document.getElementById('nftCanalesLabelMain');
  if (!el) return;
  const mont = readNftMontajeFromSetupUi();
  if (mont.disposicion === 'escalera') {
    el.textContent = 'Peldaños por cara';
    return;
  }
  if (mont.disposicion === 'pared') {
    el.textContent = 'Tubos apilados (pared)';
    return;
  }
  if (mont.mesaMultinivel) {
    el.textContent = 'Tubos (si multinivel válido, el total lo fija la lista)';
    return;
  }
  el.textContent = 'Tubos en el circuito (mesa)';
}

function updateNftSetupPreview() {
  const canales = parseInt(document.getElementById('sliderNftCanales')?.value ?? '0', 10);
  const huecos  = parseInt(document.getElementById('sliderNftHuecos')?.value ?? '0', 10);
  const pend    = parseInt(document.getElementById('sliderNftPendiente')?.value ?? '0', 10);
  const vol     = parseInt(document.getElementById('sliderVol')?.value || 20, 10);
  const elC = document.getElementById('valNftCanales');
  const elH = document.getElementById('valNftHuecos');
  const elP = document.getElementById('valNftPendiente');
  const elV = document.getElementById('valVol');
  refrescarNftCanalesSliderEtiqueta();
  const draft = buildNftDraftConfigFromSetupUi();
  const hyd = getNftHidraulicaDesdeConfig(draft);
  if (elC) elC.textContent = String(Number.isFinite(canales) ? canales : 0);
  if (elH) elH.textContent = String(Number.isFinite(huecos) ? huecos : 0);
  if (elP) {
    elP.innerHTML =
      (Number.isFinite(pend) ? pend : 0) + '<span class="setup-inline-unit-percent">%</span>';
  }
  if (elV) elV.innerHTML = vol + '<span class="setup-inline-unit-l">L</span>';
  const mmHueMirror = document.getElementById('nftMesaHuecosMirror');
  if (mmHueMirror) mmHueMirror.textContent = String(huecos);

  try {
    renderNftCultivoRecoStatus('setup');
  } catch (_) {}

  const preview = document.getElementById('nftPreview');
  if (!preview) return;
  const bNft = getNftBombaDesdeConfig(draft);
  try {
    if (typeof nftRefreshSetupCalculadoUi === 'function') nftRefreshSetupCalculadoUi(draft, bNft, hyd);
  } catch (_) {}
  pintarResultadoBombaNftUI(bNft, vol);
  const pendDraw = Number.isFinite(pend) && pend >= 1 ? pend : 2;
  const altShow = draft.nftAlturaBombeoCm != null && Number(draft.nftAlturaBombeoCm) > 0
    ? Math.round(Number(draft.nftAlturaBombeoCm))
    : getNftAlturaBombeoEfectivaCm(draft);
  if (typeof wrapBuildNftActiveDiagramSvg === 'function') wrapBuildNftActiveDiagramSvg();
  let nftPrevSvg = buildNftActiveDiagramSvg(canales, huecos, pendDraw, vol, '', {
    calentador: setupEquipamiento.has('calentador'),
    difusor: setupEquipamiento.has('difusor'),
    bombaInfo: bNft,
    nftDisposicion: draft.nftDisposicion,
    nftAlturaBombeoCm: altShow > 0 ? altShow : null,
    cfgSnapshot: draft,
    mesaTiers: hyd.mesaTiers,
    escaleraNiveles: hyd.escaleraNiveles,
    escaleraCaras: hyd.escaleraCaras,
  });
  if (typeof enhanceNftDiagramScada === 'function') {
    nftPrevSvg = enhanceNftDiagramScada(nftPrevSvg, { interactive: false });
  }
  preview.innerHTML = nftPrevSvg;
  try {
    if (typeof disposeDwcScadaViewport === 'function') disposeDwcScadaViewport(preview);
    if (typeof bindDwcScadaCestaHover === 'function') bindDwcScadaCestaHover(preview);
  } catch (_) {}
  refrescarDocTuberiaNftSetup();
}

function renderSetupPage() {
  // Instalación nueva: el último paso es cultivos (6); nunca mostrar spage7 (resumen/«varias torres»).
  if (setupEsNuevaTorre && setupPagina > SETUP_TOTAL_PAGES - 2) {
    setupPagina = SETUP_TOTAL_PAGES - 2;
  }

  // Ocultar todas las páginas
  document.querySelectorAll('.setup-page').forEach(p => p.classList.remove('active'));

  // Mostrar página actual
  const curr = document.getElementById('spage' + setupPagina);
  if (curr) curr.classList.add('active');

  const nomWrap = document.getElementById('setupNombreInstalacionWrap');
  const nomInp = document.getElementById('setupNombreInstalacionInput');
  if (nomWrap && nomInp) {
    const showNom = setupEsNuevaTorre && setupPagina === 1;
    nomWrap.classList.toggle('setup-hidden', !showNom);
    if (showNom && document.activeElement !== nomInp) {
      nomInp.value = setupNombreNuevaTorre || '';
    }
  }

  // Acciones específicas por página (refrescar en p.1 incluye sync del gráfico Torre/NFT)
  if (setupPagina === 0 || setupPagina === 1) refrescarSetupTipoInstalacionUI();
  if (setupPagina === 2) {
    cargarSetupSensoresHwUI();
    refreshSetupCalentadorConsignaVis();
  }
  if (setupPagina === 3) setTimeout(() => seleccionarSustrato(setupData.sustrato), 0);
  if (setupPagina === 4) { renderNutrientesGrid(); setTimeout(renderDosisSetup, 100); }
  if (setupPagina === 5) setTimeout(syncWizardLuzUI, 0);
  if (setupPagina === 6) setTimeout(renderSetupPlantasGrid, 50);
  if (setupPagina === 7) setTimeout(actualizarResumenSetup, 50);

  // Dots de progreso
  for (let i = 0; i < SETUP_TOTAL_PAGES; i++) {
    const dot = document.getElementById('sdot' + i);
    if (!dot) continue;
    dot.className = 'setup-step-dot';
    if (i < setupPagina)      dot.classList.add('done');
    else if (i === setupPagina) dot.classList.add('active');
  }

  // Labels de cada paso
  const labels = [
    'Bienvenida',        // 0
    'Geometría',         // 1 (torre, NFT o DWC)
    'Equipamiento',      // 2
    'Agua y sustrato',   // 3
    'Nutrientes',        // 4
    'Ubicación',         // 5
    'Cultivos',          // 6
    'Resumen',           // 7
  ];
  const labelEl = document.getElementById('setupStepLabel');
  if (labelEl) {
    if (setupEsNuevaTorre) {
      const nomLbl = (setupNombreNuevaTorre || '').trim() || 'Nueva instalación';
      labelEl.textContent = setupPagina === 0
        ? '🌿 ' + nomLbl + ' — configuración'
        : nomLbl + ' · Paso ' + setupPagina + ' de ' + (SETUP_TOTAL_PAGES-2) + ' — ' + (labels[setupPagina] || '');
    } else {
      labelEl.textContent = setupPagina === 0
        ? 'Bienvenido'
        : 'Paso ' + setupPagina + ' de ' + (SETUP_TOTAL_PAGES-1) + ' — ' + (labels[setupPagina] || '');
    }
  }

  // Botones navegación
  const back = document.getElementById('setupBtnBack');
  const next = document.getElementById('setupBtnNext');
  if (back) back.style.display = setupPagina > 0 ? 'block' : 'none';
  const ultimoPaso = setupEsNuevaTorre ? SETUP_TOTAL_PAGES - 2 : SETUP_TOTAL_PAGES - 1;
  if (next) {
    if (setupPagina === 0) {
      next.style.display = 'none';
      next.setAttribute('aria-hidden', 'true');
      next.tabIndex = -1;
    } else {
      next.style.display = '';
      next.removeAttribute('aria-hidden');
      next.tabIndex = 0;
      if (setupPagina === ultimoPaso) {
        next.textContent = '✅ Guardar y empezar';
        next.setAttribute('aria-label', 'Guardar configuración y empezar');
      } else {
        next.textContent = 'Siguiente →';
        next.setAttribute('aria-label', 'Continuar al siguiente paso');
      }
    }
  }
  try {
    if (typeof aplicarSetupWizardExclusividadTorreVertical === 'function') {
      aplicarSetupWizardExclusividadTorreVertical();
    }
  } catch (_) {}
}

function setupNext() {
  if (setupPagina === 0) {
    iniciarConfiguracionTorre();
    return;
  }
  if (setupEsNuevaTorre && setupPagina === 1) {
    const inpNom = document.getElementById('setupNombreInstalacionInput');
    if (inpNom) setupNombreNuevaTorre = (inpNom.value || '').trim().slice(0, 40);
    if (!setupNombreNuevaTorre) {
      showToast('Escribe un nombre para esta instalación', true);
      inpNom?.focus();
      return;
    }
  }
  const ultimoPaso = setupEsNuevaTorre ? SETUP_TOTAL_PAGES - 2 : SETUP_TOTAL_PAGES - 1;
  if (setupPagina < ultimoPaso) {
    setupPagina++;
    renderSetupPage();
  } else {
    guardarSetupYContinuar();
  }
}

function setupBack() {
  if (setupPagina > 1) {
    setupPagina--;
    renderSetupPage();
  } else if (setupPagina === 1) {
    setupPagina = 0;
    renderSetupPage();
  }
}

/** Contenedor de vista previa DWC en el asistente (o torre/NFT genérico). */
function getSetupPreviewElement() {
  if (typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion === 'srf') {
    return document.getElementById('setupSrfPreview') || document.getElementById('torrePreview');
  }
  if (typeof setupTipoInstalacion !== 'undefined' && setupTipoInstalacion === 'dwc') {
    return document.getElementById('setupDwcPreview') || document.getElementById('torrePreview');
  }
  return document.getElementById('torrePreview');
}

/** Preview multivalvula: N cubos, 1 maceta/cubo (no rejilla filas×cestas en un solo depósito). */
function renderDwcMulticuboSetupPreview(previewEl, numCubos, volLitros, formaDep) {
  previewEl.innerHTML = '';
  previewEl.style.position = 'relative';
  previewEl.style.height = 'auto';
  const n = Math.min(24, Math.max(1, parseInt(String(numCubos), 10) || 1));
  const forma = typeof dwcNormalizeDepositoForma === 'function'
    ? dwcNormalizeDepositoForma(formaDep)
    : String(formaDep || 'prismatico');
  const wrap = document.createElement('div');
  wrap.className = 'dwc-setup-mc-wrap dwc-setup-mc-wrap--' + forma;
  if (forma === 'cilindrico' && n === 1) wrap.classList.add('dwc-setup-mc-wrap--single');
  wrap.setAttribute('role', 'img');
  wrap.setAttribute(
    'aria-label',
    forma === 'cilindrico' && n === 1
      ? 'Cubo cilíndrico DWC con multiválvula: una maceta.'
      : n + ' cubos independientes con multiválvula, una maceta por cubo.'
  );
  const grid =
    typeof hcDistribuirCubosMultivalvula === 'function'
      ? hcDistribuirCubosMultivalvula(n)
      : typeof hcDistribuirFilasColumnas === 'function'
        ? (() => {
            const g = hcDistribuirFilasColumnas(n, 6);
            return { rows: g.rows, cols: g.cols, colsPerRow: [g.cols] };
          })()
        : { cols: n <= 6 ? n : Math.ceil(n / 2), rows: n <= 6 ? 1 : 2, colsPerRow: [Math.ceil(n / 2), Math.floor(n / 2)] };
  if (grid.rows > 1) wrap.classList.add('dwc-setup-mc-wrap--stacked');
  function appendMcCube(parent, idx) {
    const cube = document.createElement('div');
    cube.className = 'dwc-setup-mc-cube dwc-setup-mc-cube--' + forma;
    const lid = document.createElement('div');
    lid.className = 'dwc-setup-mc-lid';
    const hole = document.createElement('div');
    hole.className = 'dwc-setup-mc-hole';
    lid.appendChild(hole);
    cube.appendChild(lid);
    const tank = document.createElement('div');
    tank.className = 'dwc-setup-mc-tank';
    tank.title = 'Cubo ' + (idx + 1) + ' · ' + volLitros + ' L útiles';
    cube.appendChild(tank);
    parent.appendChild(cube);
  }
  function makeMcRow() {
    const row = document.createElement('div');
    row.className = 'dwc-setup-mc-grid';
    row.style.gridTemplateColumns = 'repeat(' + grid.cols + ', minmax(0, 1fr))';
    return row;
  }
  if (grid.rows > 1) {
    const topN = grid.colsPerRow ? grid.colsPerRow[0] : Math.ceil(n / 2);
    const rowTop = makeMcRow();
    const rowBot = makeMcRow();
    rowTop.style.gridTemplateColumns = 'repeat(' + topN + ', minmax(0, 1fr))';
    rowBot.style.gridTemplateColumns = 'repeat(' + (grid.colsPerRow[1] || Math.floor(n / 2)) + ', minmax(0, 1fr))';
    for (let i = 0; i < n; i++) {
      if (i < topN) appendMcCube(rowTop, i);
      else appendMcCube(rowBot, i);
    }
    const airRow = document.createElement('div');
    airRow.className = 'dwc-setup-mc-air-row';
    airRow.setAttribute('aria-hidden', 'true');
    const pump = document.createElement('div');
    pump.className = 'dwc-setup-mc-air-pump';
    pump.title = 'Bomba de aire · reparto equitativo';
    airRow.appendChild(pump);
    wrap.appendChild(rowTop);
    wrap.appendChild(airRow);
    wrap.appendChild(rowBot);
  } else {
    const row = makeMcRow();
    row.style.gridTemplateRows = 'repeat(' + grid.rows + ', auto)';
    for (let i = 0; i < n; i++) appendMcCube(row, i);
    wrap.appendChild(row);
  }
  const cap = document.createElement('div');
  cap.className = 'dwc-setup-lid-caption';
  cap.textContent =
    forma === 'cilindrico'
      ? (n === 1 ? 'Cubo redondo · 1 maceta' : n + ' cubos redondos · 1 maceta/cubo') + ' · multiválvula'
      : n + ' cubo' + (n === 1 ? '' : 's') + ' · 1 maceta/cubo · multiválvula';
  wrap.appendChild(cap);
  previewEl.appendChild(wrap);
}

/** Preview asistente paso 1 — DWC: tapa vista superior con orificios en rejilla. */
function hcRenderSetupPreviewPlaceholder(previewEl, msg) {
  if (!previewEl) return;
  previewEl.classList.add('torre-preview--dwc');
  previewEl.innerHTML =
    '<p class="setup-dwc-preview-fallback setup-dwc-preview-empty" role="status">' +
    (msg ||
      'Indica filas × cestas y las medidas del depósito para ver la vista previa. Cada instalación nueva parte en blanco.') +
    '</p>';
}

function hcSetupPreviewSinDimensiones() {
  if (typeof hcSetupAsistenteInstalacionNueva !== 'function' || !hcSetupAsistenteInstalacionNueva()) {
    return false;
  }
  const mc =
    typeof dwcEsSetupMultivalvula === 'function'
      ? dwcEsSetupMultivalvula()
      : typeof dwcNormalizeOxigenacionDiseno === 'function' &&
        dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value) ===
          'cubos_independientes';
  if (mc) {
    const nRaw = parseInt(String(document.getElementById('setupDwcNumCubos')?.value || '').trim(), 10);
    return !Number.isFinite(nRaw) || nRaw < 1;
  }
  const f = parseInt(String(document.getElementById('sliderNiveles')?.value || '0'), 10);
  const c = parseInt(String(document.getElementById('sliderCestas')?.value || '0'), 10);
  return !Number.isFinite(f) || f < 1 || !Number.isFinite(c) || c < 1;
}

/** Vista previa DWC en asistente: diagrama ilustrado (cenital + alzado), coherente con pestaña Sistema. */
function renderDwcIlloSetupPreview(previewEl, filas, cols, volLitros, draftExtra) {
  if (typeof generarSVGDwc !== 'function' && typeof hcIlloGenerarSVGDwc !== 'function') {
    renderDwcLidSetupPreview(previewEl, filas, cols, volLitros);
    return;
  }
  previewEl.innerHTML = '';
  previewEl.style.position = 'relative';
  previewEl.style.height = 'auto';
  const prevCfg = state.configTorre;
  const prevTorre = state.torre;
  let draft = draftExtra || {};
  if (!draftExtra && typeof buildDwcDraftCfgFromSetupWizardInputs === 'function') {
    try {
      draft = buildDwcDraftCfgFromSetupWizardInputs() || {};
    } catch (_) {}
  }
  draft = Object.assign({ tipoInstalacion: 'dwc' }, draft);
  draft.numNiveles = Math.max(1, filas);
  draft.numCestas = Math.max(1, cols);
  if (typeof setupEquipamiento !== 'undefined' && setupEquipamiento) {
    draft.equipamiento = [...setupEquipamiento];
  }
  if (volLitros != null && Number(volLitros) > 0) {
    draft.volDeposito = volLitros;
  }
  const emptyCell = () => ({
    variedad: '',
    fecha: '',
    notas: '',
    origenPlanta: '',
    fotos: [],
    fotoKeys: [],
  });
  const torrePreview = [];
  for (let n = 0; n < draft.numNiveles; n++) {
    const row = [];
    for (let c = 0; c < draft.numCestas; c++) row.push(emptyCell());
    torrePreview.push(row);
  }
  state.configTorre = draft;
  state.torre = torrePreview;
  try {
    const renderFn =
      typeof hcIlloGenerarSVGDwc === 'function'
        ? function () {
            return hcIlloGenerarSVGDwc(draft);
          }
        : function () {
            return generarSVGDwc();
          };
    previewEl.innerHTML = renderFn();
    previewEl.classList.add('torre-preview--dwc', 'hc-illo-diagram');
    try {
      if (typeof bindDwcScadaCestaHover === 'function') bindDwcScadaCestaHover(previewEl);
    } catch (_) {}
  } catch (err) {
    renderDwcLidSetupPreview(previewEl, filas, cols, volLitros);
    try {
      console.error('renderDwcIlloSetupPreview', err);
    } catch (_) {}
  } finally {
    state.configTorre = prevCfg;
    state.torre = prevTorre;
  }
}

function renderDwcLidSetupPreview(previewEl, filas, cols, volLitros) {
  previewEl.innerHTML = '';
  previewEl.style.position = 'relative';
  previewEl.style.height = 'auto';
  const wrap = document.createElement('div');
  wrap.className = 'dwc-setup-lid-wrap';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute(
    'aria-label',
    'Vista superior de la tapa del cubo DWC: ' +
      filas +
      ' filas de orificios y ' +
      cols +
      ' cestas por fila.'
  );
  const side = Math.min(132, Math.max(84, Math.round(10.5 * Math.max(filas, cols, 4))));
  const plate = document.createElement('div');
  plate.className = 'dwc-setup-lid-plate';
  plate.style.width = side + 'px';
  plate.style.height = side + 'px';
  plate.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  plate.style.gridTemplateRows = 'repeat(' + filas + ', 1fr)';
  for (let i = 0; i < filas * cols; i++) {
    const hole = document.createElement('div');
    hole.className = 'dwc-setup-lid-hole';
    plate.appendChild(hole);
  }
  const cap = document.createElement('div');
  cap.className = 'dwc-setup-lid-caption';
  cap.textContent = filas + ' filas × ' + cols + ' cestas · tapa';
  const tank = document.createElement('div');
  tank.className = 'dwc-setup-lid-tank';
  tank.title =
    volLitros != null && Number(volLitros) > 0
      ? 'Depósito · ~' + volLitros + ' L de solución'
      : 'Depósito · litros pendientes';
  tank.style.width = Math.min(side + 8, 112) + 'px';
  wrap.appendChild(plate);
  wrap.appendChild(cap);
  wrap.appendChild(tank);
  previewEl.appendChild(wrap);
}

/** Vista previa DWC del asistente (depósito unido o multiválvula); no usa el preview de torre vertical. */
function refreshDwcSetupPreview() {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'dwc') return;
  const preview =
    (typeof getSetupPreviewElement === 'function' ? getSetupPreviewElement() : null) ||
    document.getElementById('setupDwcPreview');
  if (!preview) return;

  const mc =
    typeof dwcEsSetupMultivalvula === 'function'
      ? dwcEsSetupMultivalvula()
      : typeof dwcNormalizeOxigenacionDiseno === 'function' &&
        dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value) ===
          'cubos_independientes';

  const esNueva =
    typeof hcSetupAsistenteInstalacionNueva === 'function' && hcSetupAsistenteInstalacionNueva();
  let filas = esNueva ? 0 : 2;
  let cols = esNueva ? 0 : 3;
  if (mc) {
    const formaMc =
      typeof dwcNormalizeDepositoForma === 'function'
        ? dwcNormalizeDepositoForma(document.getElementById('setupDwcDepositoForma')?.value)
        : 'prismatico';
    const defNc = esNueva ? 0 : formaMc === 'cilindrico' ? 1 : 4;
    const nRaw = parseInt(String(document.getElementById('setupDwcNumCubos')?.value || '').trim(), 10);
    cols =
      Number.isFinite(nRaw) && nRaw >= 1
        ? Math.min(24, nRaw)
        : defNc > 0
          ? defNc
          : 0;
    filas = cols > 0 ? 1 : 0;
  } else {
    const fRaw = parseInt(String(document.getElementById('sliderNiveles')?.value || (esNueva ? 0 : 2)), 10);
    const cRaw = parseInt(String(document.getElementById('sliderCestas')?.value || (esNueva ? 0 : 3)), 10);
    filas = esNueva
      ? Math.max(0, Math.min(10, Number.isFinite(fRaw) ? fRaw : 0))
      : Math.max(1, Math.min(10, Number.isFinite(fRaw) ? fRaw : 2));
    cols = esNueva
      ? Math.max(0, Math.min(8, Number.isFinite(cRaw) ? cRaw : 0))
      : Math.max(1, Math.min(8, Number.isFinite(cRaw) ? cRaw : 3));
    const vn = document.getElementById('valNiveles');
    const vc = document.getElementById('valCestas');
    if (vn) vn.textContent = String(filas);
    if (vc) vc.textContent = String(cols);
  }

  if (hcSetupPreviewSinDimensiones()) {
    hcRenderSetupPreviewPlaceholder(preview);
    return;
  }

  let vol = esNueva ? 0 : parseInt(String(document.getElementById('sliderVol')?.value || 20), 10) || 20;
  try {
    const draftVol =
      typeof buildDwcDraftCfgFromSetupWizardInputs === 'function'
        ? buildDwcDraftCfgFromSetupWizardInputs()
        : null;
    const vMez =
      draftVol && typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(draftVol) : null;
    if (vMez != null && vMez > 0) vol = Math.round(vMez * 10) / 10;
    else vol = 0;
  } catch (_) {}

  preview.classList.add('torre-preview--dwc');
  preview.classList.remove('torre-preview--srf');
  try {
    if (mc) {
      let volMc = vol;
      try {
        const draftMc =
          typeof buildDwcDraftCfgFromSetupWizardInputs === 'function'
            ? buildDwcDraftCfgFromSetupWizardInputs()
            : null;
        const vMc =
          draftMc && typeof dwcLitrosUtilesPorCuboMultivalvula === 'function'
            ? dwcLitrosUtilesPorCuboMultivalvula(draftMc)
            : null;
        if (vMc != null && vMc > 0) volMc = Math.round(vMc * 10) / 10;
      } catch (_) {}
      let draftMc = null;
      try {
        draftMc =
          typeof buildDwcDraftCfgFromSetupWizardInputs === 'function'
            ? buildDwcDraftCfgFromSetupWizardInputs()
            : null;
      } catch (_) {}
      if (typeof hcIlloGenerarSVGDwc === 'function' && draftMc) {
        draftMc.numNiveles = 1;
        draftMc.numCestas = cols;
        renderDwcIlloSetupPreview(preview, 1, cols, volMc, draftMc);
      } else {
        renderDwcMulticuboSetupPreview(
          preview,
          cols,
          volMc,
          document.getElementById('setupDwcDepositoForma')?.value
        );
      }
    } else {
      renderDwcIlloSetupPreview(preview, filas, cols, vol);
    }
  } catch (err) {
    preview.innerHTML =
      '<p class="setup-dwc-preview-fallback" role="status">No se pudo dibujar la vista previa. Prueba Ctrl+F5 o revisa la consola del navegador.</p>';
    try {
      console.error('refreshDwcSetupPreview', err);
    } catch (_) {}
  }
}

/** Vista previa RDWC en el asistente (diagrama SVG). */
function refreshRdwcSetupPreview() {
  if (typeof setupTipoInstalacion === 'undefined' || setupTipoInstalacion !== 'rdwc') return;
  const preview = document.getElementById('setupRdwcPreview');
  if (!preview) return;
  try {
    const sitesRaw = parseInt(String(document.getElementById('setupRdwcSites')?.value || '').trim(), 10);
    const rowsRaw = parseInt(String(document.getElementById('setupRdwcRows')?.value || '').trim(), 10);
    if (
      (typeof hcSetupAsistenteInstalacionNueva === 'function' && hcSetupAsistenteInstalacionNueva()) &&
      (!Number.isFinite(sitesRaw) || sitesRaw < 2 || !Number.isFinite(rowsRaw) || rowsRaw < 1)
    ) {
      preview.innerHTML =
        '<p class="setup-dwc-preview-fallback setup-dwc-preview-empty" role="status">Indica sitios, filas y medidas de los cubos para ver el diagrama RDWC.</p>';
      preview.classList.remove('torre-preview--rdwc');
      return;
    }
    let draft = {};
    if (typeof applySetupRdwcDesdeFormulario === 'function') {
      draft = applySetupRdwcDesdeFormulario() || {};
    } else if (typeof setupRdwcDraft === 'object' && setupRdwcDraft) {
      draft = setupRdwcDraft;
    }
    if (typeof rdwcEnsureConfigDefaults === 'function') rdwcEnsureConfigDefaults(draft);
    const sites = Math.max(2, Math.round(Number(draft.rdwcSites) || 4));
    const rows = Math.max(1, Math.min(4, Math.round(Number(draft.rdwcRows) || 1)));
    const cols = Math.max(1, Math.ceil(sites / rows));
    draft.numNiveles = rows;
    draft.numCestas = cols;
    const prevCfg = state.configTorre;
    const prevTorre = state.torre;
    state.configTorre = Object.assign({}, draft, { tipoInstalacion: 'rdwc' });
    const emptyCell = () => ({
      variedad: '',
      fecha: '',
      notas: '',
      origenPlanta: '',
      fotos: [],
      fotoKeys: [],
    });
    const torrePreview = [];
    for (let n = 0; n < rows; n++) {
      const row = [];
      for (let col = 0; col < cols; col++) row.push(emptyCell());
      torrePreview.push(row);
    }
    state.torre = torrePreview;
    if (typeof generarSVGRdwc === 'function') {
      preview.innerHTML = generarSVGRdwc();
      preview.classList.add('torre-preview--rdwc');
      try {
        if (typeof disposeDwcScadaViewport === 'function') disposeDwcScadaViewport(preview);
        if (typeof bindDwcScadaCestaHover === 'function') bindDwcScadaCestaHover(preview);
      } catch (_) {}
    }
    state.configTorre = prevCfg;
    state.torre = prevTorre;
  } catch (err) {
    preview.innerHTML =
      '<p class="setup-dwc-preview-fallback" role="status">No se pudo dibujar la vista previa RDWC.</p>';
    try {
      console.error('refreshRdwcSetupPreview', err);
    } catch (_) {}
  }
}

function updateTorreBuilder() {
  if (setupTipoInstalacion === 'nft') {
    updateNftSetupPreview();
    return;
  }
  if (setupTipoInstalacion === 'rdwc') {
    try {
      if (typeof onSetupRdwcInput === 'function') onSetupRdwcInput();
    } catch (_) {}
    return;
  }
  if (setupTipoInstalacion === 'srf') {
    const preview = getSetupPreviewElement();
    if (!preview) return;
    try {
      const esNuevaSrf =
        typeof hcSetupAsistenteInstalacionNueva === 'function' && hcSetupAsistenteInstalacionNueva();
      const seed =
        esNuevaSrf && typeof hcFreshSrfSetupDefaults === 'function'
          ? hcFreshSrfSetupDefaults()
          : state.configTorre || {};
      const draft =
        typeof buildSrfConfigFromForm === 'function'
          ? buildSrfConfigFromForm('setup', seed, { applyDefaults: false })
          : {};
      if (typeof srfEnsureConfigDefaults === 'function') srfEnsureConfigDefaults(draft);
      const filasSrf = parseInt(String(document.getElementById('setupSrfFilas')?.value || '').trim(), 10);
      const colsSrf = parseInt(String(document.getElementById('setupSrfPlantasPorFila')?.value || '').trim(), 10);
      if (esNuevaSrf && (!Number.isFinite(filasSrf) || filasSrf < 1 || !Number.isFinite(colsSrf) || colsSrf < 1)) {
        preview.innerHTML =
          '<p class="setup-dwc-preview-fallback setup-dwc-preview-empty" role="status">Indica filas, plantas por fila y medidas del estanque para ver la vista previa SRF.</p>';
        preview.classList.remove('torre-preview--srf');
        return;
      }
      const grid =
        typeof srfDistribuirPlantas === 'function'
          ? srfDistribuirPlantas(draft)
          : { rows: draft.srfFilas || (esNuevaSrf ? 0 : 2), cols: draft.srfPlantasPorFila || (esNuevaSrf ? 0 : 4) };
      if (grid.rows < 1 || grid.cols < 1) {
        preview.innerHTML =
          '<p class="setup-dwc-preview-fallback setup-dwc-preview-empty" role="status">Indica filas, plantas por fila y medidas del estanque para ver la vista previa SRF.</p>';
        preview.classList.remove('torre-preview--srf');
        return;
      }
      draft.numNiveles = grid.rows;
      draft.numCestas = grid.cols;
      const prevCfg = state.configTorre;
      const prevTorre = state.torre;
      const emptyCell = () => ({
        variedad: '',
        fecha: '',
        notas: '',
        origenPlanta: '',
        fotos: [],
        fotoKeys: [],
      });
      const torrePreview = [];
      for (let n = 0; n < grid.rows; n++) {
        const row = [];
        for (let col = 0; col < grid.cols; col++) row.push(emptyCell());
        torrePreview.push(row);
      }
      state.configTorre = Object.assign({}, draft, { tipoInstalacion: 'srf' });
      state.torre = torrePreview;
      if (typeof generarSVGSrf === 'function') {
        preview.innerHTML = generarSVGSrf();
        preview.classList.add('torre-preview--srf');
        try {
          if (typeof disposeDwcScadaViewport === 'function') disposeDwcScadaViewport(preview);
          if (typeof bindDwcScadaCestaHover === 'function') bindDwcScadaCestaHover(preview);
        } catch (_) {}
      } else if (typeof renderSrfSetupPreview === 'function') {
        renderSrfSetupPreview(preview, draft);
      }
      state.configTorre = prevCfg;
      state.torre = prevTorre;
      if (typeof renderSrfCalculoStatus === 'function') renderSrfCalculoStatus(draft, 'setupSrfCalcStatus');
      if (typeof syncSetupVolMezclaSugeridoSrf === 'function') syncSetupVolMezclaSugeridoSrf();
    } catch (_) {}
    return;
  }
  const esNuevaBuilder =
    typeof hcSetupAsistenteInstalacionNueva === 'function' && hcSetupAsistenteInstalacionNueva();
  const defSlider = esNuevaBuilder ? 0 : 5;
  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || defSlider, 10);
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || defSlider, 10);
  let dwcNivPrev = niveles;
  let dwcCesPrev = cestas;
  if (setupTipoInstalacion === 'dwc') {
    const oxB =
      typeof dwcEsSetupMultivalvula === 'function'
        ? dwcEsSetupMultivalvula()
        : typeof dwcNormalizeOxigenacionDiseno === 'function' &&
          dwcNormalizeOxigenacionDiseno(document.getElementById('setupDwcOxigenacionDiseno')?.value) ===
            'cubos_independientes';
    if (oxB) {
      const formaMc =
        typeof dwcNormalizeDepositoForma === 'function'
          ? dwcNormalizeDepositoForma(document.getElementById('setupDwcDepositoForma')?.value)
          : 'prismatico';
      const nRaw = parseInt(String(document.getElementById('setupDwcNumCubos')?.value || '').trim(), 10);
      const defNc = esNuevaBuilder ? 0 : formaMc === 'cilindrico' ? 1 : 4;
      const nn =
        Number.isFinite(nRaw) && nRaw >= 1
          ? Math.min(24, nRaw)
          : defNc > 0
            ? defNc
            : 0;
      dwcNivPrev = nn > 0 ? 1 : 0;
      dwcCesPrev = nn;
    }
  }
  const volSlider = parseInt(document.getElementById('sliderVol')?.value || (esNuevaBuilder ? 0 : 20), 10);
  const dwcCap = getDwcCapacidadLitrosFromSetupInputs();
  const volDepDwc =
    dwcCap != null && dwcCap > 0 ? Math.round(dwcCap * 10) / 10 : volSlider;

  const elVN = document.getElementById('valNiveles');
  const elVC = document.getElementById('valCestas');
  if (elVN) elVN.textContent = String(dwcNivPrev);
  if (elVC) elVC.textContent = String(dwcCesPrev);
  const snTorre = document.getElementById('sliderNiveles');
  const scTorre = document.getElementById('sliderCestas');
  if (snTorre) snTorre.setAttribute('aria-valuenow', String(dwcNivPrev));
  if (scTorre) scTorre.setAttribute('aria-valuenow', String(dwcCesPrev));
  const elVol = document.getElementById('valVol');
  if (elVol) {
    if (setupTipoInstalacion === 'dwc' && dwcCap != null && dwcCap > 0) {
      let safeHtml = '';
      try {
        const draft = typeof buildDwcDraftCfgFromSetupWizardInputs === 'function' ? buildDwcDraftCfgFromSetupWizardInputs() : null;
        const vSeg =
          draft && typeof getDwcVolumenSeguroMaxLitrosDesdeConfig === 'function'
            ? getDwcVolumenSeguroMaxLitrosDesdeConfig(draft)
            : null;
        if (vSeg != null && vSeg > 0 && Math.abs(vSeg - volDepDwc) > 0.15) {
          safeHtml =
            '<span class="setup-inline-approx"> · op. ~' + Math.round(vSeg * 10) / 10 + ' L</span>';
        }
      } catch (_) {}
      elVol.innerHTML =
        volDepDwc + '<span class="setup-inline-unit-l">L</span>' + safeHtml;
    } else if (setupTipoInstalacion === 'dwc') {
      elVol.innerHTML =
        volSlider +
        '<span class="setup-inline-unit-l">L</span>' +
        '<span class="setup-inline-approx"> (aprox.)</span>';
    } else {
      elVol.textContent = volSlider;
    }
  }

  const preview = getSetupPreviewElement();
  if (!preview) return;

  if (setupTipoInstalacion === 'dwc') {
    try {
      if (typeof refreshDwcSetupPreview === 'function') refreshDwcSetupPreview();
    } catch (eDwcPrev) {
      try {
        console.error('updateTorreBuilder dwc preview', eDwcPrev);
      } catch (_) {}
    }
    try {
      refreshDwcTapHintSetup();
    } catch (eHint) {}
    return;
  }
  preview.classList.remove('torre-preview--dwc');

  if (setupTipoInstalacion === 'torre') {
    if (esNuevaBuilder && (niveles < 1 || cestas < 1)) {
      preview.innerHTML =
        '<p class="setup-dwc-preview-fallback setup-dwc-preview-empty" role="status">Indica niveles y cestas por nivel para ver la torre.</p>';
      return;
    }
    try {
      calcularBombaRecomendada();
      if (
        typeof readTorreMontajeOrigenDesdeSetupUi === 'function' &&
        readTorreMontajeOrigenDesdeSetupUi() === 'diy'
      ) {
        refrescarUIMensajeBombaUsuarioTorre();
      }
    } catch (_) {}
  }

  // Actualizar preview visual de la torre vertical
  preview.innerHTML = '';

  // Pipe central
  const pipe = document.createElement('div');
  pipe.className = 'torre-preview-pipe';
  pipe.style.height = (niveles * 18 + 20) + 'px';
  preview.appendChild(pipe);

  // Niveles (superpuestos sobre el pipe con position absolute)
  preview.style.position = 'relative';
  preview.style.height = (niveles * 22 + 40) + 'px';
  pipe.style.position = 'absolute';
  pipe.style.left = '50%';
  pipe.style.top = '0';
  pipe.style.transform = 'translateX(-50%)';

  for (let n = 0; n < niveles; n++) {
    const nivel = document.createElement('div');
    nivel.className = 'torre-preview-nivel';
    nivel.style.position = 'absolute';
    nivel.style.top = (n * 20) + 'px';
    nivel.style.left = '50%';
    nivel.style.transform = 'translateX(-50%)';
    nivel.style.width = Math.min(70, 30 + cestas * 8) + 'px';
    nivel.style.opacity = 0.6 + (n / niveles) * 0.4;
    preview.appendChild(nivel);
  }

  // Depósito
  const dep = document.createElement('div');
  dep.className = 'torre-preview-deposito';
  dep.style.position = 'absolute';
  dep.style.bottom = '0';
  dep.style.left = '50%';
  dep.style.transform = 'translateX(-50%)';
  dep.style.width = Math.min(70, 30 + volSlider * 0.5) + 'px';
  dep.title = volSlider + 'L';
  preview.appendChild(dep);
}

function toggleUbic(tipo) {
  setupUbicacion = tipo;
  setupData.ubicacion = tipo;
}

function toggleEquip(id) {
  const card = document.getElementById('eq' + id.charAt(0).toUpperCase() + id.slice(1));
  if (setupEquipamiento.has(id)) {
    setupEquipamiento.delete(id);
    card.className = 'equip-card';
  } else {
    setupEquipamiento.add(id);
    card.className = 'equip-card selected';
  }
  refreshSetupCalentadorConsignaVis();
}

function refreshSetupCalentadorConsignaVis() {
  const wrap = document.getElementById('setupCalentadorConsignaWrap');
  if (!wrap) return;
  wrap.classList.toggle('setup-hidden', !setupEquipamiento.has('calentador'));
}

const SETUP_EQUIP_IDS = ['difusor', 'calentador', 'bomba', 'timer', 'medidorEC', 'toldo'];

function refreshSetupEquipamientoCardsDesdeSet() {
  for (let j = 0; j < SETUP_EQUIP_IDS.length; j++) {
    const eid = SETUP_EQUIP_IDS[j];
    const card = document.getElementById('eq' + eid.charAt(0).toUpperCase() + eid.slice(1));
    if (card) card.className = 'equip-card' + (setupEquipamiento.has(eid) ? ' selected' : '');
  }
}

function syncSetupEquipamientoDesdeConfig(cfg) {
  const c = cfg || {};
  setupEquipamiento = new Set();
  const eqSaved = Array.isArray(c.equipamiento) ? c.equipamiento : [];
  for (let i = 0; i < SETUP_EQUIP_IDS.length; i++) {
    if (eqSaved.includes(SETUP_EQUIP_IDS[i])) setupEquipamiento.add(SETUP_EQUIP_IDS[i]);
  }
  if (setupEquipamiento.size === 0) {
    setupEquipamiento = new Set(['difusor', 'calentador', 'bomba']);
  }
  refreshSetupEquipamientoCardsDesdeSet();
  const ccInp = document.getElementById('setupCalentadorConsignaC');
  if (ccInp) {
    const v = Number(c.calentadorConsignaC);
    ccInp.value =
      Number.isFinite(v) && v >= 10 && v <= 35 ? String(Math.round(v * 10) / 10) : '20';
  }
  refreshSetupCalentadorConsignaVis();
}

function ensureSetupSensoresHardware() {
  if (!setupData.sensoresHardware) {
    setupData.sensoresHardware = { ec: false, ph: false, humedad: false };
  }
  return setupData.sensoresHardware;
}

function cargarSetupSensoresHwUI() {
  const s = ensureSetupSensoresHardware();
  const e = document.getElementById('setupSensHwEC');
  const p = document.getElementById('setupSensHwPH');
  const h = document.getElementById('setupSensHwHum');
  if (e) e.checked = !!s.ec;
  if (p) p.checked = !!s.ph;
  if (h) h.checked = !!s.humedad;
}

function persistSetupSensoresHardware() {
  const s = ensureSetupSensoresHardware();
  s.ec = !!document.getElementById('setupSensHwEC')?.checked;
  s.ph = !!document.getElementById('setupSensHwPH')?.checked;
  s.humedad = !!document.getElementById('setupSensHwHum')?.checked;
}

function renderNutrientesGrid() {
  const grid = document.getElementById('nutrientesGrid');
  if (!grid) return;
  grid.innerHTML = NUTRIENTES_DB.map(n => `
    <button type="button" class="nutriente-card ${n.id === setupNutriente ? 'selected' : ''}"
      id="nut-${n.id}" onclick="selNutriente('${n.id}')" aria-pressed="${n.id === setupNutriente ? 'true' : 'false'}"
      aria-label="Nutriente ${n.nombre}${n.buffer ? ', con buffer de pH' : ''}">
      <span class="nutriente-bandera" aria-hidden="true">${n.bandera}</span>
      <span class="nutriente-info">
        <span class="nutriente-nombre">${n.nombre}</span>
        <span class="nutriente-detalle">${n.detalle}</span>
      </span>
      <span class="nutriente-buffer ${n.buffer ? 'si' : 'no'}" aria-hidden="true">
        ${n.buffer ? 'pH buffer' : 'Sin buffer'}
      </span>
    </button>
  `).join('');
}

