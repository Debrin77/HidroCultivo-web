/**
 * Vista Medir: ilustración premium por tipo de instalación (solo lectura).
 */
(function (global) {
  'use strict';

  function nftMedirConfigHash(cfg) {
    cfg = cfg || {};
    const hyd =
      typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : {};
    const parts = [
      cfg.tipoInstalacion || '',
      cfg.nftDisposicion || '',
      String(cfg.nftNumCanales ?? cfg.numNiveles ?? ''),
      String(cfg.nftHuecosPorCanal ?? cfg.numCestas ?? ''),
      String(cfg.nftMesaMultinivel || ''),
      String(cfg.nftMesaTubosPorNivelStr || ''),
      String(cfg.nftEscaleraCaras || ''),
      String(cfg.nftEscaleraNivelesCara || ''),
      String(cfg.volDeposito ?? ''),
      String(cfg.volMezcla ?? ''),
      (cfg.equipamiento || []).join(','),
    ];
    return parts.join('|');
  }

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
      interactive: false,
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
   * @returns {string|null} SVG ilustrado o null si no hay builder para este montaje.
   */
  function buildNftMedirIllustrationHtml(cfg) {
    if (!cfg || cfg.tipoInstalacion !== 'nft') return null;
    const disp =
      typeof nftDisposicionNormalizada === 'function' ? nftDisposicionNormalizada(cfg.nftDisposicion) : 'mesa';
    if (disp !== 'mesa') return null;
    if (typeof global.buildNftMesaMedirIllustrationSvg !== 'function') return null;

    const hyd = typeof getNftHidraulicaDesdeConfig === 'function' ? getNftHidraulicaDesdeConfig(cfg) : { nCh: 4 };
    const hx =
      typeof nftHuecosDesdeCfg === 'function'
        ? nftHuecosDesdeCfg(cfg)
        : parseInt(String(cfg.nftHuecosPorCanal || cfg.numCestas), 10) || 8;
    const nCh = Math.max(1, hyd.nCh || parseInt(String(cfg.nftNumCanales), 10) || 4);
    const EO = buildNftMedirEquipOpts(cfg);
    const pend = cfg.nftPendientePct != null ? cfg.nftPendientePct : 2;

    return global.buildNftMesaMedirIllustrationSvg(nCh, hx, pend, EO.volL, 'Medir', EO);
  }

  function renderNftMedirIllustration(cfg, mountEl) {
    const html = buildNftMedirIllustrationHtml(cfg);
    if (!html || !mountEl) return false;
    mountEl.innerHTML = html;
    mountEl.className = 'torre-svg-canvas medir-diagram-canvas medir-diagram-canvas--nft-mesa-illo';
    mountEl.setAttribute(
      'aria-label',
      'Vista ilustrada de tu NFT en mesa. Los cultivos y datos están en el resumen por plaza.'
    );
    return true;
  }

  function invalidateNftMedirCache() {
    if (typeof global.state === 'object' && global.state) {
      global.state.nftMedirIllustrationCache = null;
    }
  }

  global.nftMedirConfigHash = nftMedirConfigHash;
  global.buildNftMedirIllustrationHtml = buildNftMedirIllustrationHtml;
  global.renderNftMedirIllustration = renderNftMedirIllustration;
  global.invalidateNftMedirCache = invalidateNftMedirCache;
})(typeof window !== 'undefined' ? window : globalThis);
