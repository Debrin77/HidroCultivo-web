/**
 * Presets de instalación RDWC (referencia técnica kit modular XL 2.0).
 * Sin marcas comerciales — solo geometría, volúmenes y caudales orientativos.
 */
(function (global) {
  'use strict';

  /** @type {Array<object>} */
  const RDWC_INSTALL_PRESETS = [
    { id: 'c4-f2', label: '4 cubos · 2 filas', sites: 4, rows: 2, bucketVolL: 20, controlVolL: 40, netPotMm: 125, spacingCm: 42, recirculationLh: 1100, airLpm: 28, layout: 'double_row', headM: 1.0, lineLenM: 6, fittings: 10, hydroMode: 'estandar', airMainLenCm: 50, airStoneHoseCm: 50 },
    { id: 'c6-f2', label: '6 cubos · 2 filas', sites: 6, rows: 2, bucketVolL: 20, controlVolL: 45, netPotMm: 125, spacingCm: 42, recirculationLh: 1400, airLpm: 32, layout: 'double_row', headM: 1.1, lineLenM: 8, fittings: 12, hydroMode: 'estandar', airMainLenCm: 50, airStoneHoseCm: 50 },
    { id: 'c8-f2', label: '8 cubos · 2 filas', sites: 8, rows: 2, bucketVolL: 20, controlVolL: 50, netPotMm: 125, spacingCm: 40, recirculationLh: 1800, airLpm: 40, layout: 'double_row', headM: 1.2, lineLenM: 10, fittings: 14, hydroMode: 'estandar', airMainLenCm: 100, airStoneHoseCm: 55 },
    { id: 'c9-f3', label: '9 cubos · 3 filas', sites: 9, rows: 3, bucketVolL: 20, controlVolL: 55, netPotMm: 125, spacingCm: 40, recirculationLh: 2000, airLpm: 42, layout: 'double_row', headM: 1.2, lineLenM: 12, fittings: 16, hydroMode: 'estandar', airMainLenCm: 100, airStoneHoseCm: 55 },
    { id: 'c12-f3', label: '12 cubos · 3 filas', sites: 12, rows: 3, bucketVolL: 20, controlVolL: 60, netPotMm: 125, spacingCm: 38, recirculationLh: 2400, airLpm: 55, layout: 'double_row', headM: 1.3, lineLenM: 14, fittings: 18, hydroMode: 'estandar', airMainLenCm: 100, airStoneHoseCm: 55 },
    { id: 'c12-f4', label: '12 cubos · 4 filas', sites: 12, rows: 4, bucketVolL: 20, controlVolL: 60, netPotMm: 125, spacingCm: 38, recirculationLh: 2400, airLpm: 55, layout: 'double_row', headM: 1.3, lineLenM: 14, fittings: 18, hydroMode: 'estandar', airMainLenCm: 100, airStoneHoseCm: 55 },
    { id: 'c16-f4', label: '16 cubos · 4 filas', sites: 16, rows: 4, bucketVolL: 20, controlVolL: 70, netPotMm: 125, spacingCm: 36, recirculationLh: 3000, airLpm: 60, layout: 'double_row', headM: 1.4, lineLenM: 16, fittings: 22, hydroMode: 'alto_rendimiento', airMainLenCm: 100, airStoneHoseCm: 60 },
    { id: 'c18-f3', label: '18 cubos · 3 filas', sites: 18, rows: 3, bucketVolL: 20, controlVolL: 75, netPotMm: 125, spacingCm: 36, recirculationLh: 3200, airLpm: 72, layout: 'double_row', headM: 1.5, lineLenM: 18, fittings: 24, hydroMode: 'alto_rendimiento', airMainLenCm: 100, airStoneHoseCm: 60 },
    { id: 'c24-f4', label: '24 cubos · 4 filas', sites: 24, rows: 4, bucketVolL: 20, controlVolL: 90, netPotMm: 125, spacingCm: 34, recirculationLh: 4000, airLpm: 80, layout: 'double_row', headM: 1.6, lineLenM: 22, fittings: 28, hydroMode: 'alto_rendimiento', airMainLenCm: 100, airStoneHoseCm: 60 },
  ];

  function rdwcPresetsList() {
    return RDWC_INSTALL_PRESETS.slice();
  }

  function rdwcPresetById(id) {
    return RDWC_INSTALL_PRESETS.find((p) => p.id === id) || null;
  }

  function rdwcColsFromSitesRows(sites, rows) {
    const s = Math.max(2, parseInt(String(sites), 10) || 4);
    const r = Math.max(1, Math.min(4, parseInt(String(rows), 10) || 1));
    return Math.max(1, Math.ceil(s / r));
  }

  /** Aplica preset a objeto config (mutación). */
  function rdwcApplyPresetToConfig(cfg, presetId) {
    const p = rdwcPresetById(presetId);
    if (!p || !cfg) return false;
    cfg.tipoInstalacion = 'rdwc';
    cfg.rdwcSites = p.sites;
    cfg.rdwcRows = p.rows;
    cfg.rdwcBucketVolL = p.bucketVolL;
    cfg.rdwcControlVolL = p.controlVolL;
    cfg.rdwcNetPotMm = p.netPotMm;
    cfg.rdwcCenterSpacingCm = p.spacingCm;
    cfg.rdwcRecirculationLh = p.recirculationLh;
    cfg.rdwcAirLpm = p.airLpm;
    cfg.rdwcLayout = p.layout;
    cfg.rdwcHeadM = p.headM;
    cfg.rdwcLineLenM = p.lineLenM;
    cfg.rdwcFittings = p.fittings;
    cfg.rdwcHydroMode = p.hydroMode;
    cfg.rdwcPresetId = p.id;
    cfg.rdwcAirStonePerBucket = true;
    if (p.airMainLenCm != null) cfg.rdwcAirMainLenCm = p.airMainLenCm;
    if (p.airStoneHoseCm != null) cfg.rdwcAirStoneHoseCm = p.airStoneHoseCm;
    return true;
  }

  /** Texto orientativo de montaje (mangueras aire) según preset o cubos×filas. */
  function rdwcMontajeHintsForConfig(cfg) {
    cfg = cfg || {};
    const pid = cfg.rdwcPresetId || rdwcGuessPresetId(cfg);
    const p = pid ? rdwcPresetById(pid) : null;
    const sites = Math.max(2, parseInt(String(cfg.rdwcSites), 10) || 4);
    const rows = Math.max(1, Math.min(4, parseInt(String(cfg.rdwcRows), 10) || 1));
    const airMain = p && p.airMainLenCm != null ? p.airMainLenCm : rows >= 3 || sites >= 8 ? 100 : 50;
    const airStone = p && p.airStoneHoseCm != null ? p.airStoneHoseCm : 55;
    return {
      airMainLenCm: airMain,
      airStoneHoseCm: airStone,
      airStones: sites,
      summary:
        'Aire: línea principal ~' +
        airMain +
        ' cm · ~' +
        airStone +
        ' cm silicona/cubo × ' +
        sites +
        ' piedras. Bomba de aire por encima del nivel del agua.',
    };
  }

  function rdwcGuessPresetId(cfg) {
    cfg = cfg || {};
    const sites = Math.round(Number(cfg.rdwcSites) || 0);
    const rows = Math.round(Number(cfg.rdwcRows) || 0);
    if (sites < 2 || rows < 1) return '';
    const hit = RDWC_INSTALL_PRESETS.find((p) => p.sites === sites && p.rows === rows);
    return hit ? hit.id : '';
  }

  function rdwcFillPresetSelect(selectEl, selectedId) {
    if (!selectEl) return;
    const cur = selectedId || '';
    let html = '<option value="">Personalizado (manual)</option>';
    for (let i = 0; i < RDWC_INSTALL_PRESETS.length; i++) {
      const p = RDWC_INSTALL_PRESETS[i];
      html +=
        '<option value="' +
        p.id +
        '"' +
        (p.id === cur ? ' selected' : '') +
        '>' +
        p.label +
        '</option>';
    }
    selectEl.innerHTML = html;
  }

  global.rdwcPresetsList = rdwcPresetsList;
  global.rdwcPresetById = rdwcPresetById;
  global.rdwcColsFromSitesRows = rdwcColsFromSitesRows;
  global.rdwcApplyPresetToConfig = rdwcApplyPresetToConfig;
  global.rdwcGuessPresetId = rdwcGuessPresetId;
  global.rdwcFillPresetSelect = rdwcFillPresetSelect;
  global.rdwcMontajeHintsForConfig = rdwcMontajeHintsForConfig;
})(typeof window !== 'undefined' ? window : globalThis);
