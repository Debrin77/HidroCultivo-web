/**
 * Piezas SVG reutilizables — callouts, flujo, paneles (Fase 1 SCADA DWC).
 */
(function (global) {
  'use strict';

  function f1(n) {
    return Number(n).toFixed(1);
  }

  function tokens() {
    if (typeof HC_DIAG !== 'undefined' && HC_DIAG.dwcScada) return HC_DIAG.dwcScada;
    return global.DWC_SCADA || {};
  }

  /** Etiqueta con línea guía (estilo foto referencia). */
  function callout(labelX, labelY, px, py, text, opts) {
    opts = opts || {};
    const T = tokens();
    const anchor = opts.anchor || 'start';
    const fs = opts.fs != null ? opts.fs : 8.5;
    const dy = opts.dy != null ? opts.dy : 0;
    const ly = labelY + dy;
    return (
      `<g class="dwc-scada-callout" pointer-events="none" aria-hidden="true">` +
      `<line x1="${f1(labelX)}" y1="${f1(ly)}" x2="${f1(px)}" y2="${f1(py)}" stroke="${T.calloutLine}" stroke-width="1" stroke-linecap="round"/>` +
      `<circle cx="${f1(px)}" cy="${f1(py)}" r="2.2" fill="${T.flow}" opacity="0.85"/>` +
      `<text x="${f1(labelX)}" y="${f1(ly)}" text-anchor="${anchor}" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="${fs}" font-weight="600" fill="${T.callout}">${text}</text>` +
      `</g>`
    );
  }

  /** Flecha de sentido de flujo (aire/agua). */
  function flowArrow(x1, y1, x2, y2, ta) {
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
    let dashAnim = '';
    if (ta) {
      dashAnim =
        `<path d="M ${f1(x1)} ${f1(y1)} L ${f1(x2)} ${f1(y2)}" fill="none" stroke="${T.flowGhost}" stroke-width="4" stroke-linecap="round" stroke-dasharray="7 5" opacity="0.55">` +
        `<animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.1s" repeatCount="indefinite" calcMode="linear"/></path>`;
    }
    return (
      dashAnim +
      `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${T.flow}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<polygon points="${f1(ax)},${f1(ay)} ${f1(p1x)},${f1(p1y)} ${f1(p2x)},${f1(p2y)}" fill="${T.flow}"/>`
    );
  }

  /** Tubería doble + capa de flujo animada opcional. */
  function flowPath(d, ta, strokeW) {
    const T = tokens();
    const sw = strokeW != null ? strokeW : 2.2;
    let o =
      `<path d="${d}" fill="none" stroke="${T.pipeHi}" stroke-width="${(sw + 0.9).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>` +
      `<path d="${d}" fill="none" stroke="${T.pipe}" stroke-width="${(sw - 0.5).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>`;
    if (ta) {
      o +=
        `<path class="dwc-scada-flow-anim" d="${d}" fill="none" stroke="${T.flow}" stroke-width="${(sw - 0.4).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 7" opacity="0.88">` +
        `<animate attributeName="stroke-dashoffset" from="32" to="0" dur="1.25s" repeatCount="indefinite" calcMode="linear"/></path>`;
    } else {
      o += `<path d="${d}" fill="none" stroke="${T.flow}" stroke-width="${(sw - 0.6).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`;
    }
    return o;
  }

  function sectionPanel(x, y, w, h, rx) {
    const T = tokens();
    rx = rx != null ? rx : 10;
    return (
      `<rect class="dwc-scada-panel" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" ` +
      `fill="${T.panelBg}" stroke="${T.panelBorder}" stroke-width="1.1" opacity="0.92"/>`
    );
  }

  function header(W, title, subtitle) {
    const T = tokens();
    let o =
      `<text class="dwc-scada-title" x="${f1(W / 2)}" y="22" text-anchor="middle" font-family="Syne,sans-serif" font-size="13" font-weight="900" fill="${T.title}" letter-spacing="0.03em">${title}</text>`;
    if (subtitle) {
      o += `<text class="dwc-scada-subtitle" x="${f1(W / 2)}" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.5" font-weight="600" fill="${T.inkSoft}">${subtitle}</text>`;
    }
    return `<g class="dwc-scada-header">${o}</g>`;
  }

  function sectionLabel(x, y, text) {
    const T = tokens();
    return (
      `<text class="dwc-scada-section-label" x="${f1(x)}" y="${f1(y)}" font-family="Syne,sans-serif" font-size="9" font-weight="800" fill="${T.inkSoft}" letter-spacing="0.06em">${text}</text>`
    );
  }

  /** Borde superior en perspectiva (tapa / depósito prisma). */
  function isoTopFace(x, y, w, h, depth) {
    const T = tokens();
    depth = depth != null ? depth : 8;
    const d = `M ${f1(x)} ${f1(y)} L ${f1(x + w)} ${f1(y)} L ${f1(x + w + depth)} ${f1(y - depth * 0.55)} L ${f1(x + depth)} ${f1(y - depth * 0.55)} Z`;
    return (
      `<path d="${d}" fill="${T.lid}" stroke="${T.tank}" stroke-width="1" opacity="0.95"/>` +
      `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + depth)}" y2="${f1(y - depth * 0.55)}" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>`
    );
  }

  function scadaDefs(suffix) {
    const T = tokens();
    const id = suffix || '';
    return (
      `<linearGradient id="dwcScadaBg${id}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${T.bg1}"/><stop offset="100%" stop-color="${T.bg0}"/></linearGradient>`
    );
  }

  function plantAccent(cx, cy, r, hasPlant) {
    if (!hasPlant) return '';
    const T = tokens();
    const pr = Math.max(4, r * 0.55);
    return (
      `<g class="dwc-scada-plant-hint" pointer-events="none" aria-hidden="true">` +
      `<ellipse cx="${f1(cx)}" cy="${f1(cy - pr * 0.3)}" rx="${f1(pr)}" ry="${f1(pr * 1.15)}" fill="${T.plant}" opacity="0.35"/>` +
      `<ellipse cx="${f1(cx - pr * 0.35)}" cy="${f1(cy - pr * 0.5)}" rx="${f1(pr * 0.65)}" ry="${f1(pr * 0.85)}" fill="${T.plant}" opacity="0.5"/>` +
      `<ellipse cx="${f1(cx + pr * 0.35)}" cy="${f1(cy - pr * 0.5)}" rx="${f1(pr * 0.65)}" ry="${f1(pr * 0.85)}" fill="${T.plant}" opacity="0.5"/>` +
      `</g>`
    );
  }

  /** Cubo multiválvula en alzado con cara lateral y tapa (pseudo-3D). */
  function mcCuboFront3d(x, y, w, h, volPctAgua, tieneDifusor, Dw, idx, volPerCubo, ta) {
    const T = tokens();
    const depth = Math.min(14, Math.max(6, w * 0.12));
    const ix = x + 5;
    const iy = y + 12;
    const iw = w - 10;
    const ih = h - 18;
    const cx = x + w / 2;
    const airFrac = 0.15;
    const fillU = Math.min(1 - airFrac, Math.max(0, volPctAgua));
    const wTop = iy + ih * (1 - fillU);
    const sy = iy + ih - 4;
    const topY = y + 4;
    const rightX = x + w;
    const sideD =
      `M ${f1(rightX)} ${f1(topY + depth * 0.4)} L ${f1(rightX + depth)} ${f1(topY)} L ${f1(rightX + depth)} ${f1(y + h - 4)} L ${f1(rightX)} ${f1(y + h)} Z`;
    const topD =
      `M ${f1(x)} ${f1(topY)} L ${f1(rightX)} ${f1(topY + depth * 0.4)} L ${f1(rightX + depth)} ${f1(topY)} L ${f1(x + depth)} ${f1(topY - depth * 0.45)} Z`;
    let o =
      `<g class="dwc-scada-mc-cubo">` +
      `<path d="${sideD}" fill="${T.tankFace}" stroke="${T.tank}" stroke-width="1" opacity="0.9"/>` +
      `<path d="${topD}" fill="${T.lid}" stroke="${T.tank}" stroke-width="1"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="url(#dwcMcCuboShell)" stroke="${T.tank}" stroke-width="1.3" filter="drop-shadow(0 4px 10px rgba(15,23,42,0.12))"/>` +
      `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="5" fill="rgba(224,247,250,0.78)" stroke="none"/>` +
      `<rect x="${f1(ix + 2)}" y="${iy}" width="${f1(Math.max(4, iw * 0.2))}" height="${ih}" rx="3" fill="rgba(255,255,255,0.4)"/>` +
      `<rect x="${ix}" y="${wTop.toFixed(1)}" width="${iw}" height="${(iy + ih - wTop).toFixed(1)}" fill="url(#dwcWaterGrad)"/>` +
      `<line x1="${ix}" y1="${wTop.toFixed(1)}" x2="${ix + iw}" y2="${wTop.toFixed(1)}" stroke="#00acc1" stroke-width="1.5" opacity="0.75"/>` +
      `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="5" fill="none" stroke="#0ea5e9" stroke-width="0.95" opacity="0.45"/>`;
    if (tieneDifusor) {
      o += `<ellipse cx="${f1(cx)}" cy="${f1(sy)}" rx="8" ry="4" fill="${Dw.airStoneFill}" stroke="${Dw.airStoneStroke}" stroke-width="0.9"/>`;
    }
    if (tieneDifusor && ta) {
      for (let bi = 0; bi < 3; bi++) {
        const dx = (bi - 1) * 3;
        const y0 = sy - 3;
        const y1 = wTop + 5;
        o += `<circle cx="${f1(cx + dx)}" cy="${y0}" r="1.2" fill="${Dw.bubble}" opacity="0">
          <animate attributeName="cy" from="${y0}" to="${y1}" dur="1.2s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;0.85;0" dur="1.2s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
        </circle>`;
      }
    }
    o += `</g>`;
    return { svg: o, cx, stoneY: sy, waterTop: wTop, iy };
  }

  /** Cubo cenital con borde 3D ligero. */
  function mcCuboPlan3d(bx, by, size) {
    const T = tokens();
    const d = Math.min(9, size * 0.12);
    return (
      isoTopFace(bx, by, size, 8, d) +
      `<rect x="${f1(bx)}" y="${f1(by)}" width="${size}" height="${size}" rx="${Math.max(4, size * 0.1).toFixed(1)}" fill="url(#dwcLidTop)" stroke="${T.tank}" stroke-width="1.4" filter="drop-shadow(0 2px 8px rgba(15,23,42,0.08))"/>` +
      `<rect x="${f1(bx + 5)}" y="${f1(by + 5)}" width="${f1(size - 10)}" height="${f1(size - 10)}" rx="7" fill="${T.panelInner}" stroke="#e2e8f0" stroke-width="1"/>`
    );
  }

  global.dwcScadaParts = {
    f1: f1,
    tokens: tokens,
    callout: callout,
    flowArrow: flowArrow,
    flowPath: flowPath,
    sectionPanel: sectionPanel,
    header: header,
    sectionLabel: sectionLabel,
    isoTopFace: isoTopFace,
    scadaDefs: scadaDefs,
    plantAccent: plantAccent,
    mcCuboFront3d: mcCuboFront3d,
    mcCuboPlan3d: mcCuboPlan3d,
  };
})(typeof window !== 'undefined' ? window : globalThis);
