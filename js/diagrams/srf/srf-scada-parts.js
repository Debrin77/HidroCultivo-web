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
  };
})(typeof window !== 'undefined' ? window : globalThis);
