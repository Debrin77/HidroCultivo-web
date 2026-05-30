/**
 * Piezas SVG SCADA para RDWC (impulsión / retorno, módulos 3D).
 */
(function (global) {
  'use strict';

  function f1(n) {
    return Number(n).toFixed(1);
  }

  function tokens() {
    if (typeof HC_DIAG !== 'undefined' && HC_DIAG.rdwcScada) return HC_DIAG.rdwcScada;
    return global.RDWC_SCADA || {};
  }

  function sp() {
    return typeof dwcScadaParts !== 'undefined' ? dwcScadaParts : null;
  }

  function supplyPath(d, ta, strokeW) {
    const T = tokens();
    const sw = strokeW != null ? strokeW : 2.4;
    let o =
      `<path d="${d}" fill="none" stroke="#ecfdf5" stroke-width="${(sw + 0.8).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` +
      `<path d="${d}" fill="none" stroke="${T.supply}" stroke-width="${(sw - 0.4).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>`;
    if (ta) {
      o +=
        `<path class="rdwc-scada-flow-supply" d="${d}" fill="none" stroke="${T.supplyFlow}" stroke-width="${(sw - 0.3).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 7" opacity="0.9">` +
        `<animate attributeName="stroke-dashoffset" from="32" to="0" dur="1.2s" repeatCount="indefinite" calcMode="linear"/></path>`;
    } else {
      o += `<path d="${d}" fill="none" stroke="${T.supplyFlow}" stroke-width="${(sw - 0.5).toFixed(1)}" stroke-linecap="round" opacity="0.82"/>`;
    }
    return o;
  }

  function returnPath(d, ta, strokeW) {
    const T = tokens();
    const sw = strokeW != null ? strokeW : 2.4;
    let o =
      `<path d="${d}" fill="none" stroke="#eff6ff" stroke-width="${(sw + 0.8).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` +
      `<path d="${d}" fill="none" stroke="${T.return}" stroke-width="${(sw - 0.4).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>`;
    if (ta) {
      o +=
        `<path class="rdwc-scada-flow-return" d="${d}" fill="none" stroke="${T.returnFlow}" stroke-width="${(sw - 0.3).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 7" opacity="0.88">` +
        `<animate attributeName="stroke-dashoffset" from="32" to="0" dur="1.35s" repeatCount="indefinite" calcMode="linear"/></path>`;
    } else {
      o += `<path d="${d}" fill="none" stroke="${T.returnFlow}" stroke-width="${(sw - 0.5).toFixed(1)}" stroke-linecap="round" opacity="0.8"/>`;
    }
    return o;
  }

  function flowArrowSupply(x1, y1, x2, y2, ta) {
    const T = tokens();
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ax = mx + Math.cos(ang) * 5;
    const ay = my + Math.sin(ang) * 5;
    const p1x = ax - Math.cos(ang - 0.42) * 6.5;
    const p1y = ay - Math.sin(ang - 0.42) * 6.5;
    const p2x = ax - Math.cos(ang + 0.42) * 6.5;
    const p2y = ay - Math.sin(ang + 0.42) * 6.5;
    let dash = '';
    if (ta) {
      dash = `<path d="M ${f1(x1)} ${f1(y1)} L ${f1(x2)} ${f1(y2)}" fill="none" stroke="${T.supplyGhost}" stroke-width="4" stroke-dasharray="7 5" opacity="0.5"><animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.1s" repeatCount="indefinite"/></path>`;
    }
    return (
      dash +
      `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${T.supplyFlow}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<polygon points="${f1(ax)},${f1(ay)} ${f1(p1x)},${f1(p1y)} ${f1(p2x)},${f1(p2y)}" fill="${T.supply}"/>`
    );
  }

  function flowArrowReturn(x1, y1, x2, y2, ta) {
    const T = tokens();
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ax = mx + Math.cos(ang) * 5;
    const ay = my + Math.sin(ang) * 5;
    const p1x = ax - Math.cos(ang - 0.42) * 6.5;
    const p1y = ay - Math.sin(ang - 0.42) * 6.5;
    const p2x = ax - Math.cos(ang + 0.42) * 6.5;
    const p2y = ay - Math.sin(ang + 0.42) * 6.5;
    let dash = '';
    if (ta) {
      dash = `<path d="M ${f1(x1)} ${f1(y1)} L ${f1(x2)} ${f1(y2)}" fill="none" stroke="${T.returnGhost}" stroke-width="4" stroke-dasharray="7 5" opacity="0.5"><animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite"/></path>`;
    }
    return (
      dash +
      `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${T.returnFlow}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<polygon points="${f1(ax)},${f1(ay)} ${f1(p1x)},${f1(p1y)} ${f1(p2x)},${f1(p2y)}" fill="${T.return}"/>`
    );
  }

  /** Módulo/cubo RDWC en alzado (pseudo-3D). */
  function module3d(cx, cy, w, h, volPct, tieneDifusor, ta, idx) {
    const T = tokens();
    const x = cx - w / 2;
    const y = cy - h / 2;
    const depth = Math.min(10, w * 0.14);
    const ix = x + 4;
    const iy = y + 10;
    const iw = w - 8;
    const ih = h - 14;
    const fillU = Math.min(0.88, Math.max(0.2, volPct || 0.65));
    const wTop = iy + ih * (1 - fillU);
    const airY = iy + ih - 5;
    const topD =
      `M ${f1(x)} ${f1(y + 6)} L ${f1(x + w)} ${f1(y + 6)} L ${f1(x + w + depth)} ${f1(y + 6 - depth * 0.5)} L ${f1(x + depth)} ${f1(y + 6 - depth * 0.5)} Z`;
    const sideD =
      `M ${f1(x + w)} ${f1(y + 8)} L ${f1(x + w + depth)} ${f1(y + 4)} L ${f1(x + w + depth)} ${f1(y + h - 4)} L ${f1(x + w)} ${f1(y + h)} Z`;
    let o =
      `<g class="rdwc-scada-module">` +
      `<path d="${sideD}" fill="${T.tankFace}" stroke="${T.tank}" stroke-width="1"/>` +
      `<path d="${topD}" fill="${T.module}" stroke="${T.tank}" stroke-width="1"/>` +
      `<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" rx="7" fill="url(#rdwcModShell)" stroke="${T.tank}" stroke-width="1.2" filter="drop-shadow(0 3px 8px rgba(15,23,42,0.1))"/>` +
      `<rect x="${f1(ix)}" y="${f1(iy)}" width="${iw}" height="${ih}" rx="4" fill="rgba(224,247,250,0.75)"/>` +
      `<rect x="${f1(ix)}" y="${wTop.toFixed(1)}" width="${iw}" height="${(iy + ih - wTop).toFixed(1)}" fill="url(#rdwcWater)"/>` +
      `<line x1="${f1(ix)}" y1="${wTop.toFixed(1)}" x2="${f1(ix + iw)}" y2="${wTop.toFixed(1)}" stroke="#00acc1" stroke-width="1.2" opacity="0.7"/>`;
    if (tieneDifusor) {
      o += `<ellipse cx="${f1(cx)}" cy="${f1(airY)}" rx="7" ry="3.5" fill="#9ca3af" stroke="#64748b" stroke-width="0.8"/>`;
      if (ta) {
        for (let bi = 0; bi < 2; bi++) {
          const dx = (bi - 0.5) * 2.5;
          o += `<circle cx="${f1(cx + dx)}" cy="${(airY - 2).toFixed(1)}" r="1" fill="#bae6fd" opacity="0">
            <animate attributeName="cy" from="${(airY - 2).toFixed(1)}" to="${(wTop + 4).toFixed(1)}" dur="1.1s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0;0.85;0" dur="1.1s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
          </circle>`;
        }
      }
    }
    o += `</g>`;
    return o;
  }

  function controlTank(x, y, w, h, volPct, tieneCalentador, tieneDifusor, ta, volLabel) {
    const T = tokens();
    const SP = sp();
    const waterY = y + h - Math.round(h * Math.max(0.15, Math.min(0.95, volPct))) - 6;
    let o = '';
    if (SP) o += SP.isoTopFace(x, y, w, 12, 8);
    o +=
      `<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" rx="12" fill="url(#rdwcTankBody)" stroke="${T.tank}" stroke-width="1.4"/>` +
      `<rect x="${f1(x + 6)}" y="${waterY}" width="${w - 12}" height="${y + h - waterY - 8}" rx="8" fill="url(#rdwcWater)" opacity="0.92"/>`;
    if (tieneCalentador) {
      o += `<rect x="${f1(x + 14)}" y="${f1(y + h - 30)}" width="6" height="20" rx="3" fill="#f97316" stroke="#ea580c" stroke-width="1"/>`;
    }
    if (tieneDifusor) {
      const ax = x + w - 20;
      const ay = y + h - 14;
      o += `<ellipse cx="${f1(ax)}" cy="${f1(ay)}" rx="9" ry="5" fill="#9ca3af" stroke="#57534e" stroke-width="0.9"/>`;
      if (ta) {
        for (let bi = 0; bi < 3; bi++) {
          o += `<circle cx="${f1(ax + (bi - 1) * 2.5)}" cy="${(ay - 3).toFixed(1)}" r="1" fill="#bae6fd" opacity="0">
            <animate attributeName="cy" to="${(waterY + 6).toFixed(1)}" dur="1.2s" begin="${(bi * 0.2).toFixed(1)}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0;0.8;0" dur="1.2s" begin="${(bi * 0.2).toFixed(1)}s" repeatCount="indefinite"/>
          </circle>`;
        }
      }
    }
    if (volLabel != null) {
      const volOnly = String(volLabel).replace(/\s*mezcla\s*$/i, '').trim();
      if (typeof hcDiagramVolLabelSvg === 'function') {
        o += hcDiagramVolLabelSvg(x + w / 2, y + h - 10, volOnly, { fill: T.waterDeep, fontSize: 12, pointerEvents: false });
      } else {
        o += `<text x="${f1(x + w / 2)}" y="${f1(y + h - 10)}" text-anchor="middle" font-family="Syne,sans-serif" font-size="12" font-weight="900" fill="${T.waterDeep}">${volOnly}</text>`;
      }
    }
    return o;
  }

  function recircPump(cx, cy, r, label) {
    const T = tokens();
    return (
      `<g class="rdwc-scada-pump">` +
      `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r + 3}" fill="rgba(255,152,0,0.15)"/>` +
      `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="url(#rdwcPumpDome)" stroke="${T.pumpDark}" stroke-width="2"/>` +
      `<ellipse cx="${f1(cx - r * 0.35)}" cy="${f1(cy - r * 0.4)}" rx="${(r * 0.45).toFixed(1)}" ry="${(r * 0.2).toFixed(1)}" fill="rgba(255,255,255,0.45)"/>` +
      `</g>`
    );
  }

  global.rdwcScadaParts = {
    f1: f1,
    tokens: tokens,
    supplyPath: supplyPath,
    returnPath: returnPath,
    flowArrowSupply: flowArrowSupply,
    flowArrowReturn: flowArrowReturn,
    module3d: module3d,
    controlTank: controlTank,
    recircPump: recircPump,
    callout: function () {
      return sp() ? sp().callout.apply(null, arguments) : '';
    },
    header: function () {
      return sp() ? sp().header.apply(null, arguments) : '';
    },
    sectionPanel: function () {
      return sp() ? sp().sectionPanel.apply(null, arguments) : '';
    },
    sectionLabel: function () {
      return sp() ? sp().sectionLabel.apply(null, arguments) : '';
    },
    plantAccent: function () {
      return sp() ? sp().plantAccent.apply(null, arguments) : '';
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
