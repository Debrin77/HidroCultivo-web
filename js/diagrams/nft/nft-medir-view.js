/**
 * Vista Medir NFT: mismo builder hidráulico que Cultivo + capa cartoon (solo lectura visual).
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
      difusor: eq.includes('difusor'),
      interactive: true,
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
   * SVG técnico + enhance cartoon (misma hidráulica que Cultivo e instalación).
   * @returns {string|null}
   */
  function buildNftMedirCartoonHtml(cfg) {
    if (!cfg || cfg.tipoInstalacion !== 'nft') return null;
    if (typeof global.buildNftActiveDiagramSvg !== 'function') return null;

    const hyd = typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 4 };
    const hx =
      typeof nftHuecosDesdeCfg === 'function'
        ? nftHuecosDesdeCfg(cfg)
        : parseInt(String(cfg.nftHuecosPorCanal || cfg.numCestas), 10) || 8;
    const pend = cfg.nftPendientePct != null ? cfg.nftPendientePct : 2;
    const EO = buildNftMedirEquipOpts(cfg);

    let svg = global.buildNftActiveDiagramSvg(hyd.nCh, hx, pend, EO.volL, 'MedirCartoon', EO);
    if (!svg || svg.indexOf('<svg') < 0) return null;
    if (typeof global.enhanceNftDiagramCartoon === 'function') {
      svg = global.enhanceNftDiagramCartoon(svg, { medir: true });
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
      'Esquema cartoon de tu NFT: mismo recorrido del agua que en Cultivo e instalación. Toca un hueco para ver cultivo.'
    );
    try {
      if (typeof bindTorreCestas === 'function') bindTorreCestas(mountEl);
    } catch (_) {}
    return true;
  }

  global.buildNftMedirCartoonHtml = buildNftMedirCartoonHtml;
  global.renderNftMedirCartoon = renderNftMedirCartoon;
})(typeof window !== 'undefined' ? window : globalThis);
