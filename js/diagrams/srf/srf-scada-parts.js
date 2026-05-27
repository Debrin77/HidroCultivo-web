/**
 * Piezas SCADA SRF.
 */
(function (global) {
  'use strict';

  function f1(n) {
    return Number(n).toFixed(1);
  }

  function tokens() {
    if (typeof HC_DIAG !== 'undefined' && HC_DIAG.srfScada) return HC_DIAG.srfScada;
    return global.SRF_SCADA || {};
  }

  function sp() {
    return typeof dwcScadaParts !== 'undefined' ? dwcScadaParts : null;
  }

  function header(w, title, sub) {
    const SP = sp();
    if (SP) return SP.header(w, title, sub);
    const T = tokens();
    return (
      '<text x="' +
      w / 2 +
      '" y="22" text-anchor="middle" font-family="Syne,sans-serif" font-size="14" font-weight="800" fill="' +
      T.title +
      '">' +
      title +
      '</text><text x="' +
      w / 2 +
      '" y="38" text-anchor="middle" font-size="9" fill="' +
      T.inkSoft +
      '">' +
      sub +
      '</text>'
    );
  }

  function sectionPanel(x, y, w, h, rx) {
    const SP = sp();
    if (SP) return SP.sectionPanel(x, y, w, h, rx);
    const T = tokens();
    return (
      '<rect x="' +
      f1(x) +
      '" y="' +
      f1(y) +
      '" width="' +
      f1(w) +
      '" height="' +
      f1(h) +
      '" rx="' +
      (rx || 12) +
      '" fill="' +
      T.panelBg +
      '" stroke="' +
      T.panelBorder +
      '" stroke-width="1"/>'
    );
  }

  /** Vista frontal: relleno interior del recipiente (detrás del agua, hasta el borde negro). */
  function frontalTankInner(x, y, w, h, rimIn) {
    const T = tokens();
    const inner = T.tankInner || '#f1f5f9';
    const ri = rimIn != null ? rimIn : 1.2;
    return (
      '<rect class="srf-frontal-tank__inner" x="' +
      f1(x + ri) +
      '" y="' +
      f1(y) +
      '" width="' +
      f1(w - ri * 2) +
      '" height="' +
      f1(h - ri) +
      '" fill="' +
      inner +
      '" stroke="none" aria-hidden="true"/>'
    );
  }

  /** Vista frontal: borde del recipiente en negro (U abierta arriba — estanque SRF). */
  function frontalTankRim(x, y, w, h) {
    const T = tokens();
    const rim = T.tankRim || '#0f172a';
    const bot = y + h;
    return (
      '<g class="srf-frontal-tank-rim" aria-hidden="true">' +
      '<path d="M ' +
      f1(x) +
      ' ' +
      f1(y) +
      ' L ' +
      f1(x) +
      ' ' +
      f1(bot) +
      ' L ' +
      f1(x + w) +
      ' ' +
      f1(bot) +
      ' L ' +
      f1(x + w) +
      ' ' +
      f1(y) +
      '" fill="none" stroke="' +
      rim +
      '" stroke-width="2.4" stroke-linecap="butt" stroke-linejoin="miter"/>' +
      '</g>'
    );
  }

  function sectionLabel(x, y, text) {
    const SP = sp();
    if (SP) return SP.sectionLabel(x, y, text);
    const T = tokens();
    return (
      '<text x="' +
      f1(x) +
      '" y="' +
      f1(y) +
      '" font-size="8" font-weight="800" fill="' +
      T.inkSoft +
      '" letter-spacing="0.06em">' +
      text +
      '</text>'
    );
  }

  global.srfScadaParts = {
    f1: f1,
    tokens: tokens,
    header: header,
    sectionPanel: sectionPanel,
    sectionLabel: sectionLabel,
    frontalTankInner: frontalTankInner,
    frontalTankRim: frontalTankRim,
  };
})(typeof window !== 'undefined' ? window : globalThis);
