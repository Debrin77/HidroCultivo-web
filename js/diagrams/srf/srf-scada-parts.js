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
    return sectionPanelTinted(x, y, w, h, rx, 'default');
  }

  /** Panel con tinte (plan = verde suave, tank = azul invernadero). */
  function sectionPanelTinted(x, y, w, h, rx, variant) {
    const T = tokens();
    let fill = T.panelBg;
    let stroke = T.panelBorder;
    let sw = 1;
    if (variant === 'plan') {
      fill = T.panelPlanBg || '#ecfdf5';
      stroke = T.panelPlanBorder || '#34d399';
      sw = 1.4;
    } else if (variant === 'tank') {
      fill = T.panelTankBg || '#f0f9ff';
      stroke = T.panelTankBorder || '#38bdf8';
      sw = 1.4;
    }
    return (
      '<rect class="srf-scada-panel srf-scada-panel--' +
      (variant || 'default') +
      '" x="' +
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
      fill +
      '" stroke="' +
      stroke +
      '" stroke-width="' +
      sw +
      '" opacity="0.96"/>'
    );
  }

  /** Vista frontal: relleno interior del recipiente (detrás del agua, hasta el borde negro). */
  function frontalTankInner(x, y, w, h, rimIn) {
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
      '" fill="url(#srfTankInner)" stroke="none" aria-hidden="true"/>'
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

  /** Brida superior del estanque (la balsa actúa como tapadera). */
  function frontalTankLidSeat(x, y, w) {
    return (
      '<g class="srf-frontal-lid-seat" aria-hidden="true">' +
      '<line x1="' +
      f1(x + 2) +
      '" y1="' +
      f1(y + 2.2) +
      '" x2="' +
      f1(x + w - 2) +
      '" y2="' +
      f1(y + 2.2) +
      '" stroke="#94a3b8" stroke-width="0.9" stroke-linecap="round" opacity="0.65"/>' +
      '</g>'
    );
  }

  /** Balsa flotante (tapadera) en vista frontal. */
  function frontalRaftLid(x, y, w, h, stroke) {
    const st = stroke || '#0284c7';
    return (
      '<g class="srf-frontal-raft-lid" aria-hidden="true">' +
      '<rect x="' +
      f1(x) +
      '" y="' +
      f1(y) +
      '" width="' +
      f1(w) +
      '" height="' +
      f1(h) +
      '" rx="4" fill="url(#srfRaft)" stroke="' +
      st +
      '" stroke-width="1.4" filter="url(#srfSoftShadow)"/>' +
      '<line x1="' +
      f1(x + 4) +
      '" y1="' +
      f1(y + 3) +
      '" x2="' +
      f1(x + w - 4) +
      '" y2="' +
      f1(y + 3) +
      '" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.65"/>' +
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
    sectionPanelTinted: sectionPanelTinted,
    sectionLabel: sectionLabel,
    frontalTankInner: frontalTankInner,
    frontalTankRim: frontalTankRim,
    frontalTankLidSeat: frontalTankLidSeat,
    frontalRaftLid: frontalRaftLid,
  };
})(typeof window !== 'undefined' ? window : globalThis);
