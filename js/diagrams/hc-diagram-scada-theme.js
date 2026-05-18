/**
 * Paletas SCADA en tema oscuro + re-render del diagrama al cambiar apariencia.
 * Cargar tras hc-diagram-palette.js y tokens SCADA de cada sistema.
 */
(function (global) {
  'use strict';

  const DARK = {
    dwcScada: {
      panelBg: '#1e293b',
      panelBorder: '#475569',
      panelInner: '#0f172a',
      bg0: '#0f172a',
      bg1: '#1e293b',
      ink: '#e2e8f0',
      inkSoft: '#94a3b8',
      title: '#f1f5f9',
      flow: '#60a5fa',
      flowGhost: '#1e3a5f',
      pipe: '#64748b',
      tank: '#94a3b8',
      callout: '#cbd5e1',
      calloutLine: '#475569',
    },
    rdwcScada: {
      panelBg: '#1e293b',
      panelBorder: '#475569',
      bg0: '#0f172a',
      bg1: '#1e293b',
      ink: '#e2e8f0',
      inkSoft: '#94a3b8',
      title: '#f1f5f9',
      supply: '#4ade80',
      supplyFlow: '#86efac',
      return: '#60a5fa',
      returnFlow: '#93c5fd',
    },
    nftScada: {
      bg0: '#0f172a',
      bg1: '#1e293b',
      panelBg: '#1e293b',
      panelBorder: '#475569',
      ink: '#e2e8f0',
      inkSoft: '#94a3b8',
      title: '#86efac',
      flow: '#60a5fa',
      legendSupply: '#60a5fa',
    },
    srfScada: {
      bg0: '#0f172a',
      bg1: '#1e293b',
      panelBg: '#1e293b',
      panelBorder: '#475569',
      ink: '#e2e8f0',
      inkSoft: '#94a3b8',
      title: '#f1f5f9',
    },
    torreScada: {
      bg0: '#0f172a',
      bg1: '#1e293b',
      ink: '#e2e8f0',
      inkSoft: '#94a3b8',
    },
    nft: {
      flow: '#60a5fa',
      flowGhost: '#334155',
      schematicTitle: '#86efac',
      schematicFoot: '#94a3b8',
      labelHole: '#bae6fd',
      textHalo: '#0f172a',
    },
    torre: {
      eje0: '#4ade80',
      eje1: '#16a34a',
      body0: '#1e293b',
      body1: '#334155',
      body2: '#1e293b',
      body3: '#334155',
      body4: '#1e293b',
      depBody0: '#334155',
      depBody1: '#1e293b',
    },
  };

  const _lightSnapshots = {};

  function snapshotLight() {
    if (typeof HC_DIAG === 'undefined') return;
    ['dwcScada', 'rdwcScada', 'nftScada', 'srfScada', 'torreScada', 'nft', 'torre'].forEach((k) => {
      if (HC_DIAG[k] && !_lightSnapshots[k]) {
        _lightSnapshots[k] = Object.assign({}, HC_DIAG[k]);
      }
    });
  }

  function isDark() {
    try {
      return document.documentElement.classList.contains('hc-theme-dark');
    } catch (_) {
      return false;
    }
  }

  function applyDiagramScadaTheme() {
    if (typeof HC_DIAG === 'undefined') return;
    snapshotLight();
    const dark = isDark();
    Object.keys(DARK).forEach((key) => {
      if (!_lightSnapshots[key] && HC_DIAG[key]) {
        _lightSnapshots[key] = Object.assign({}, HC_DIAG[key]);
      }
      const base = _lightSnapshots[key] || HC_DIAG[key] || {};
      HC_DIAG[key] = dark ? Object.assign({}, base, DARK[key]) : Object.assign({}, base);
    });
    try {
      const wrap = document.getElementById('torreSVGWrap');
      const tabCultivo = document.getElementById('tab-cultivo');
      if (
        wrap &&
        tabCultivo &&
        tabCultivo.classList.contains('active') &&
        typeof renderTorre === 'function'
      ) {
        renderTorre();
      }
      if (typeof updateNftSetupPreview === 'function' && typeof setupTipoInstalacion !== 'undefined') {
        if (setupTipoInstalacion === 'nft') updateNftSetupPreview();
        if (setupTipoInstalacion === 'rdwc' && typeof refreshRdwcSetupPreview === 'function') {
          refreshRdwcSetupPreview();
        }
        if (setupTipoInstalacion === 'srf' && typeof updateTorreBuilder === 'function') {
          updateTorreBuilder();
        }
      }
    } catch (_) {}
  }

  function watchTheme() {
    applyDiagramScadaTheme();
    try {
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.attributeName === 'class') {
            applyDiagramScadaTheme();
            break;
          }
        }
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } catch (_) {
      document.addEventListener('visibilitychange', applyDiagramScadaTheme);
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchTheme);
    } else {
      watchTheme();
    }
  }

  global.applyDiagramScadaTheme = applyDiagramScadaTheme;
})(typeof window !== 'undefined' ? window : globalThis);
