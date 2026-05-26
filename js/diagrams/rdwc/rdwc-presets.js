/**
 * Presets de instalación RDWC (referencia técnica kit modular XL 2.0).
 * Sin marcas comerciales — solo geometría, volúmenes y caudales orientativos.
 */
(function (global) {
  'use strict';

  /** Valores anclados del manual / pruebas previas (id → overrides). */
  const RDWC_PRESET_OVERRIDES = {
    'c4-f2': { controlVolL: 40, recirculationLh: 1100, airLpm: 28, spacingCm: 42, headM: 1.0, lineLenM: 6, fittings: 10 },
    'c6-f2': { controlVolL: 45, recirculationLh: 1400, airLpm: 32, spacingCm: 42, headM: 1.1, lineLenM: 8, fittings: 12 },
    'c8-f2': { controlVolL: 50, recirculationLh: 1800, airLpm: 40, spacingCm: 40, headM: 1.2, lineLenM: 10, fittings: 14 },
    'c9-f3': { controlVolL: 55, recirculationLh: 2000, airLpm: 42, spacingCm: 40, headM: 1.2, lineLenM: 12, fittings: 16 },
    'c12-f3': { controlVolL: 60, recirculationLh: 2400, airLpm: 55, spacingCm: 38, headM: 1.3, lineLenM: 14, fittings: 18 },
    'c12-f4': { controlVolL: 60, recirculationLh: 2400, airLpm: 55, spacingCm: 38, headM: 1.3, lineLenM: 14, fittings: 18 },
    'c16-f4': { controlVolL: 70, recirculationLh: 3000, airLpm: 60, spacingCm: 36, headM: 1.4, lineLenM: 16, fittings: 22, hydroMode: 'alto_rendimiento' },
    'c18-f3': { controlVolL: 75, recirculationLh: 3200, airLpm: 72, spacingCm: 36, headM: 1.5, lineLenM: 18, fittings: 24, hydroMode: 'alto_rendimiento' },
    'c24-f4': { controlVolL: 90, recirculationLh: 4000, airLpm: 80, spacingCm: 34, headM: 1.6, lineLenM: 22, fittings: 28, hydroMode: 'alto_rendimiento' },
  };

  /** [sitios, filas] — cobertura típica 2–32 cubos, 1–4 filas. */
  const RDWC_PRESET_GRID = [
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 1],
    [7, 1],
    [8, 1],
    [10, 1],
    [12, 1],
    [2, 2],
    [4, 2],
    [6, 2],
    [8, 2],
    [10, 2],
    [12, 2],
    [14, 2],
    [16, 2],
    [18, 2],
    [20, 2],
    [24, 2],
    [3, 3],
    [6, 3],
    [9, 3],
    [12, 3],
    [15, 3],
    [18, 3],
    [21, 3],
    [24, 3],
    [4, 4],
    [8, 4],
    [12, 4],
    [16, 4],
    [20, 4],
    [24, 4],
    [28, 4],
    [32, 4],
  ];

  function rdwcPresetHydroMode(sites, rows) {
    if (sites >= 18 || (sites >= 16 && rows >= 4)) return 'alto_rendimiento';
    if (sites <= 3 && rows <= 2) return 'silencioso';
    return 'estandar';
  }

  function rdwcMakePreset(sites, rows) {
    const s = Math.max(2, Math.min(64, sites));
    const r = Math.max(1, Math.min(4, rows));
    const cols = Math.max(1, Math.ceil(s / r));
    const id = 'c' + s + '-f' + r;
    const layout = r >= 2 ? 'double_row' : 'line';
    const spacingCm = Math.round(Math.max(32, Math.min(46, 46 - s * 0.32 - (r - 1) * 1.2)));
    const controlVolL = Math.round(Math.min(120, Math.max(35, 30 + s * 2.35 + (r >= 3 ? 4 : 0))));
    const recirculationLh = Math.round(Math.min(12000, Math.max(800, 380 + s * 148 + r * 52)));
    const airLpm = Math.round(Math.min(300, Math.max(12, s * (s >= 14 ? 3.2 : 2.75) + (r >= 3 ? 4 : 0))));
    const headM = Math.round((0.82 + r * 0.11 + cols * 0.035) * 10) / 10;
    const lineLenM = Math.round((2 + cols * 0.95 + r * 1.15 + s * 0.08) * 10) / 10;
    const fittings = Math.round(Math.min(80, 6 + s * 0.52 + r * 2.2));
    const airMainLenCm = r >= 3 || s >= 8 ? 100 : 50;
    const airStoneHoseCm = s >= 16 ? 60 : s >= 8 ? 55 : 50;

    const base = {
      id: id,
      label: s + ' cubos · ' + r + (r === 1 ? ' fila' : ' filas'),
      sites: s,
      rows: r,
      bucketVolL: 20,
      controlVolL: controlVolL,
      netPotMm: 125,
      spacingCm: spacingCm,
      recirculationLh: recirculationLh,
      airLpm: airLpm,
      layout: layout,
      headM: headM,
      lineLenM: lineLenM,
      fittings: fittings,
      hydroMode: rdwcPresetHydroMode(s, r),
      airMainLenCm: airMainLenCm,
      airStoneHoseCm: airStoneHoseCm,
    };
    const ov = RDWC_PRESET_OVERRIDES[id];
    return ov ? Object.assign(base, ov) : base;
  }

  const RDWC_INSTALL_PRESETS = RDWC_PRESET_GRID.map((pair) => rdwcMakePreset(pair[0], pair[1]));

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
    if (cfg.rdwcPresetId && rdwcPresetById(cfg.rdwcPresetId)) {
      const saved = rdwcPresetById(cfg.rdwcPresetId);
      if (saved.sites === sites && saved.rows === rows) return saved.id;
    }
    const hit = RDWC_INSTALL_PRESETS.find((p) => p.sites === sites && p.rows === rows);
    return hit ? hit.id : '';
  }

  function rdwcFillPresetSelect(selectEl, selectedId) {
    if (!selectEl) return;
    const cur = selectedId || '';
    let html = '<option value="">Personalizado (manual)</option>';
    const byRow = [[], [], [], [], []];
    for (let i = 0; i < RDWC_INSTALL_PRESETS.length; i++) {
      const p = RDWC_INSTALL_PRESETS[i];
      const ri = Math.min(4, Math.max(1, p.rows));
      byRow[ri].push(p);
    }
    for (let r = 1; r <= 4; r++) {
      const list = byRow[r];
      if (!list.length) continue;
      html += '<optgroup label="' + (r === 1 ? '1 fila' : r + ' filas') + '">';
      for (let j = 0; j < list.length; j++) {
        const p = list[j];
        html +=
          '<option value="' +
          p.id +
          '"' +
          (p.id === cur ? ' selected' : '') +
          '>' +
          p.label +
          '</option>';
      }
      html += '</optgroup>';
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
