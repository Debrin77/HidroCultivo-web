/**
 * Vista Medir NFT: misma hidráulica que Cultivo, estilo cartoon visible.
 */
(function (global) {
  'use strict';

  function buildNftMedirEquipOpts(cfg) {
    const eq = cfg.equipamiento || [];
    const volRawMax =
      typeof getVolumenDepositoMaxLitros === 'function' ? getVolumenDepositoMaxLitros(cfg) : null;
    const volRawMez = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : null;
    const vol =
      volRawMez != null && Number(volRawMez) > 0
        ? volRawMez
        : volRawMax != null && Number(volRawMax) > 0
          ? volRawMax
          : 40;
    const altShow =
      cfg.nftAlturaBombeoCm != null && Number(cfg.nftAlturaBombeoCm) > 0
        ? Math.round(Number(cfg.nftAlturaBombeoCm))
        : typeof getNftAlturaBombeoEfectivaCm === 'function'
          ? getNftAlturaBombeoEfectivaCm(cfg)
          : null;
    const hyd = typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : {};
    const bomb = typeof getNftBombaDesdeConfig === 'function' ? getNftBombaDesdeConfig(cfg) : null;
    return {
      calentador: eq.includes('calentador'),
      difusor: true,
      interactive: true,
      cartoonMedir: true,
      bombaInfo: bomb,
      nftDisposicion: cfg.nftDisposicion,
      nftAlturaBombeoCm: altShow > 0 ? altShow : null,
      ubicacion: cfg.ubicacion,
      cfgSnapshot: cfg,
      volCapL: volRawMax,
      volMezL: volRawMez,
      mesaTiers: hyd.mesaTiers,
      escaleraNiveles: hyd.escaleraNiveles,
      escaleraCaras: hyd.escaleraCaras,
      pendPct: cfg.nftPendientePct != null ? cfg.nftPendientePct : 2,
      volL: vol,
    };
  }

  /**
   * @returns {string|null}
   */
  function buildNftMedirCartoonHtml(cfg) {
    if (!cfg || cfg.tipoInstalacion !== 'nft') return null;

    const disp =
      typeof nftDisposicionNormalizada === 'function' ? nftDisposicionNormalizada(cfg.nftDisposicion) : 'mesa';
    const hyd = typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 4 };
    const hx =
      typeof nftHuecosDesdeCfg === 'function'
        ? nftHuecosDesdeCfg(cfg)
        : parseInt(String(cfg.nftHuecosPorCanal || cfg.numCestas), 10) || 8;
    const pend = cfg.nftPendientePct != null ? cfg.nftPendientePct : 2;
    const EO = buildNftMedirEquipOpts(cfg);

    /* Mismo SVG hidráulico que Cultivo/Sistema (serie o colectores paralelo). No usar la ilustración pared sin tuberías. */
    if (typeof global.buildNftActiveDiagramSvg !== 'function') return null;
    const dispM =
      typeof nftDisposicionNormalizada === 'function' ? nftDisposicionNormalizada(cfg.nftDisposicion) : 'mesa';
    const canalesM =
      dispM === 'escalera' && hyd.escaleraNiveles != null && hyd.escaleraNiveles >= 1
        ? hyd.escaleraNiveles
        : hyd.nCh;
    let svg = global.buildNftActiveDiagramSvg(canalesM, hx, pend, EO.volL, 'MedirCartoon', EO);
    if (!svg || svg.indexOf('<svg') < 0) return null;
    if (typeof global.enhanceNftDiagramCartoon === 'function') {
      svg = global.enhanceNftDiagramCartoon(svg, { medir: true, disp: disp });
    }
    return svg;
  }

  function renderNftMedirCartoon(cfg, mountEl) {
    const html = buildNftMedirCartoonHtml(cfg);
    if (!html || !mountEl) return false;
    mountEl.innerHTML = html;
    mountEl.className = 'torre-svg-canvas medir-diagram-canvas medir-diagram-canvas--nft-cartoon';
    mountEl.setAttribute(
      'aria-label',
      'Vista cartoon de tu NFT en Medir: mismo circuito de agua que en Cultivo e instalación.'
    );
    try {
      if (typeof bindTorreCestas === 'function') bindTorreCestas(mountEl);
    } catch (_) {}
    return true;
  }

  global.buildNftMedirCartoonHtml = buildNftMedirCartoonHtml;
  global.renderNftMedirCartoon = renderNftMedirCartoon;
})(typeof window !== 'undefined' ? window : globalThis);
