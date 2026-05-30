/** Iconos SVG y emoji de respaldo por tipo de instalación hidropónica. */
function hcSistemaTipoDesdeTorreOCfg(x) {
  if (x && x.config && typeof tipoInstalacionNormalizado === 'function') {
    return tipoInstalacionNormalizado(x.config);
  }
  if (x && x.tipoInstalacion && typeof tipoInstalacionNormalizado === 'function') {
    return tipoInstalacionNormalizado(x);
  }
  if (x && x.config && x.config.tipoInstalacion) return String(x.config.tipoInstalacion);
  if (x && x.tipoInstalacion) return String(x.tipoInstalacion);
  return 'torre';
}

/** ID del símbolo SVG en el sprite (#hc-i-sys-*). */
function hcSistemaSvgSymbolId(tipo) {
  const t = hcSistemaTipoDesdeTorreOCfg({ tipoInstalacion: tipo });
  if (t === 'nft') return 'hc-i-sys-nft';
  if (t === 'dwc') return 'hc-i-sys-dwc';
  if (t === 'rdwc') return 'hc-i-sys-rdwc';
  if (t === 'srf') return 'hc-i-sys-srf';
  return 'hc-i-sys-torre';
}

/** Markup SVG reutilizable (asistente, inicio, selector de torres). */
function hcSistemaIconMarkup(tipo, extraClass) {
  const id = hcSistemaSvgSymbolId(tipo);
  const cls = ('hc-ico hc-ico--sistema' + (extraClass ? ' ' + extraClass : '')).trim();
  return '<svg class="' + cls + '" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
}

function hcPintarSistemaIconoEnElemento(el, torreOCfg, extraClass) {
  if (!el) return;
  const tipo = hcSistemaTipoDesdeTorreOCfg(torreOCfg);
  el.innerHTML = hcSistemaIconMarkup(tipo, extraClass || '');
}

/** Emoji solo donde hace falta texto plano (checklist, historial). */
function emojiSistemaPorTipo(tipo) {
  const t = hcSistemaTipoDesdeTorreOCfg({ tipoInstalacion: tipo });
  if (t === 'nft') return '💧';
  if (t === 'dwc') return '🫧';
  if (t === 'rdwc') return '♻️';
  if (t === 'srf') return '🟩';
  return '🌿';
}
