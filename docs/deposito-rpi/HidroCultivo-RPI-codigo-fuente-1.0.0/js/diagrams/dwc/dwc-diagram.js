/**
 * Motor gráfico DWC v2 — layout paramétrico, cestas interactivas (hc-cesta).
 * Cargar después de hc-diagram-palette.js y antes de torre-render-build.js.
 */
(function (global) {
  'use strict';
function dwcSvgDepDimsDesdeCfg(cfg) {
  const c = cfg || {};
  const L = Number(c.dwcDepositoLargoCm);
  const W = Number(c.dwcDepositoAnchoCm);
  const P = Number(c.dwcDepositoProfCm);
  return {
    L: Number.isFinite(L) && L >= 5 ? L : null,
    W: Number.isFinite(W) && W >= 5 ? W : null,
    P: Number.isFinite(P) && P >= 5 ? P : null,
  };
}

/**
 * DWC: tapa en vista cenital (rejilla + macetas tocables) y debajo alzado frontal
 * del depósito con solución, calentador y aireador si aplica.
 */
/** Proporción alto/diámetro del cubo cilíndrico DWC (siempre alto > ancho en el dibujo). */
function dwcCilindricoAspectoDesdeCfg(cfg, dep) {
  const c = cfg || {};
  const d = dep || {};
  let diamCm = null;
  if (d.L != null && d.W != null) diamCm = (d.L + d.W) / 2;
  else {
    const L = Number(c.dwcDepositoLargoCm);
    const W = Number(c.dwcDepositoAnchoCm);
    if (Number.isFinite(L) && Number.isFinite(W) && L > 0 && W > 0) diamCm = (L + W) / 2;
    else if (Number.isFinite(L) && L > 0) diamCm = L;
    else if (Number.isFinite(W) && W > 0) diamCm = W;
  }
  if (diamCm == null || diamCm < 5) diamCm = 40;
  let profCm = d.P != null ? d.P : Number(c.dwcDepositoProfCm);
  if (!Number.isFinite(profCm) || profCm < 5) profCm = diamCm * 1.35;
  const aspectH = Math.max(1.22, Math.min(2.1, profCm / diamCm));
  return { diamCm, profCm, aspectH };
}

/** Radio maceta en tapa cilíndrica (cesta grande, proporcional al Ø net pot). */
function dwcSvgCilindricoMacetaR(planW, planPad, cfg) {
  const lidR = Math.max(12, planW / 2 - 1 - planPad);
  const rimMm = Number(cfg && cfg.dwcNetPotRimMm);
  let frac = 0.44;
  if (Number.isFinite(rimMm) && rimMm > 0) {
    const diamMm = (planW / 220) * 400;
    frac = Math.min(0.52, Math.max(0.36, (rimMm / Math.max(diamMm, 80)) * 1.15));
  }
  return Math.max(24, Math.min(40, lidR * frac));
}

/** Alzado frontal depósito cilíndrico (más alto que ancho). */
function dwcSvgCilindricoAlzado(
  tankX,
  tankStartY,
  tankW,
  tankH,
  rimH,
  innerX0,
  innerY0,
  innerW0,
  innerH0,
  waterTopY,
  innerBottom,
  waveY,
  ta,
  tankFaceInset
) {
  const cx = tankX + tankW / 2;
  const rx = (tankW - tankFaceInset * 2) / 2;
  const yCap = tankStartY + rimH / 2;
  const yTop = tankStartY + rimH - 2;
  const yBot = tankStartY + tankH;
  return (
    `<rect x="${tankX}" y="${tankStartY}" width="${tankW}" height="${rimH}" rx="5" fill="#f1f5f9" stroke="#64748b" stroke-width="1.3"/>` +
    `<ellipse cx="${cx.toFixed(1)}" cy="${yCap.toFixed(1)}" rx="${(tankW / 2).toFixed(1)}" ry="${(rimH / 2).toFixed(1)}" fill="none" stroke="#475569" stroke-width="1.1" opacity="0.5"/>` +
    `<rect x="${(tankX + tankFaceInset).toFixed(1)}" y="${yTop.toFixed(1)}" width="${(tankW - tankFaceInset * 2).toFixed(1)}" height="${(yBot - yTop).toFixed(1)}" fill="url(#dwcTankFace)" stroke="#94a3b8" stroke-width="1.2"/>` +
    `<ellipse cx="${cx.toFixed(1)}" cy="${yTop.toFixed(1)}" rx="${rx.toFixed(1)}" ry="9" fill="#b3e5fc" stroke="#64748b" stroke-width="1"/>` +
    `<ellipse cx="${cx.toFixed(1)}" cy="${yBot.toFixed(1)}" rx="${rx.toFixed(1)}" ry="11" fill="#81d4fa" stroke="#64748b" stroke-width="1.1" opacity="0.85"/>` +
    `<g clip-path="url(#dwcTankInnerClip)">` +
    `<rect x="${innerX0.toFixed(1)}" y="${waterTopY.toFixed(1)}" width="${innerW0.toFixed(1)}" height="${(innerBottom - waterTopY).toFixed(1)}" fill="url(#dwcWaterGrad)"/>` +
    (ta
      ? `<path d="M ${(innerX0 + 14).toFixed(1)} ${waveY.toFixed(1)} Q ${(innerX0 + innerW0 / 2).toFixed(1)} ${(innerY0 + innerH0 * 0.3).toFixed(1)} ${(innerX0 + innerW0 - 14).toFixed(1)} ${(innerY0 + innerH0 * 0.38).toFixed(1)}" fill="none" stroke="#bae6fd" stroke-width="1" opacity="0.45"><animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.6s" repeatCount="indefinite"/></path>`
      : '') +
    `</g>` +
    `<rect x="${innerX0.toFixed(1)}" y="${innerY0.toFixed(1)}" width="${innerW0.toFixed(1)}" height="${innerH0.toFixed(1)}" rx="8" fill="none" stroke="#0ea5e9" stroke-width="1.2" opacity="0.38"/>`
  );
}

/** Manguera cenital hub → cubo (multiválvula). */
function dwcSvgMcHosePlan(hx, hy, tx, ty) {
  const mx = (hx + tx) / 2;
  const my = (hy + ty) / 2;
  const bow = Math.max(8, Math.hypot(tx - hx, ty - hy) * 0.12);
  const c1x = hx + (tx - hx) * 0.2;
  const c1y = hy - bow;
  const c2x = tx - (tx - hx) * 0.2;
  const c2y = ty - bow * 0.35;
  const d = `M ${hx.toFixed(1)} ${hy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
  return (
    `<path d="${d}" fill="none" stroke="#f5f5f5" stroke-width="2" stroke-linecap="round" opacity="0.95"/>` +
    `<path d="${d}" fill="none" stroke="#90a4ae" stroke-width="1.1" stroke-linecap="round" opacity="0.4"/>`
  );
}

/** Cuerpo compacto de multiválvula (solo reparto de aire, no tubería hidráulica). */
function dwcSvgMcMultivalveBody(cx, cy) {
  return (
    `<g class="dwc-mc-valve" aria-hidden="true">` +
    `<rect x="${(cx - 14).toFixed(1)}" y="${(cy - 5).toFixed(1)}" width="28" height="10" rx="4" fill="#e8f5e9" stroke="#16a34a" stroke-width="1.1"/>` +
    `<circle cx="${(cx - 6).toFixed(1)}" cy="${cy.toFixed(1)}" r="1.8" fill="#86efac"/>` +
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.8" fill="#86efac"/>` +
    `<circle cx="${(cx + 6).toFixed(1)}" cy="${cy.toFixed(1)}" r="1.8" fill="#86efac"/>` +
    `</g>`
  );
}

/** Manguera flexible de aire (bomba/multiválvula → piedra difusora). */
function dwcSvgMcAirHoseFlex(x1, y1, x2, y2, ta, SC, sw) {
  const bow = Math.max(10, Math.hypot(x2 - x1, y2 - y1) * 0.22);
  const c1y = y1 + (y2 > y1 ? bow : -bow);
  const c2y = y2 - (y2 > y1 ? bow * 0.35 : -bow * 0.35);
  const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${c1y.toFixed(1)} ${x2.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  const strokeW = sw != null ? sw : 2;
  if (SC) return SC.flowPath(d, ta, strokeW);
  return (
    `<path d="${d}" fill="none" stroke="#eceff1" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.92"/>` +
    `<path d="${d}" fill="none" stroke="#90a4ae" stroke-width="${(strokeW - 0.6).toFixed(1)}" stroke-linecap="round" opacity="0.38"/>`
  );
}

/** Cenital: multiválvula en bomba + una manguera por cubo hasta la difusora (sin raíles ni manifold). */
function dwcSvgMcAirHosesPlan(positions, valveX, valveY, bucketR, ta, SC) {
  if (!positions || !positions.length) return '';
  const r = bucketR != null ? bucketR : 28;
  let s = dwcSvgMcMultivalveBody(valveX, valveY);
  for (let i = 0; i < positions.length; i++) {
    const P = positions[i];
    const stoneX = P.cx;
    const stoneY = P.cy + r * 0.38;
    s += dwcSvgMcAirHoseFlex(valveX, valveY - 2, stoneX, stoneY, ta, SC, 1.9);
  }
  return s;
}

/** Cubo cenital — mismo dibujo que vista plano RDWC. */
function dwcSvgMcBucketRdwc(cx, cy, size, idx, ta) {
  const r = Math.max(14, size / 2 - 2);
  if (typeof rdwcPlanRoundBucket === 'function') {
    return rdwcPlanRoundBucket(cx, cy, r, idx, ta);
  }
  return dwcSvgMcBucketPlan(cx - size / 2, cy - size / 2, size, null, true);
}

/** Cubo alzado — módulo RDWC (rdwcScadaParts.module3d). */
function dwcSvgMcModuleFrontRdwc(x, y, w, h, volPct, tieneDifusor, ta, idx, RP) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const iy = cy - h / 2 + 10;
  const ih = h - 14;
  const fillU = Math.min(0.88, Math.max(0.2, volPct != null ? volPct : 0.65));
  const wTop = iy + ih * (1 - fillU);
  const stoneY = iy + ih - 5;
  if (RP && typeof RP.module3d === 'function') {
    return {
      svg: RP.module3d(cx, cy, w, h, volPct, tieneDifusor, ta, idx),
      cx: cx,
      stoneY: stoneY,
      waterTop: wTop,
    };
  }
  return dwcSvgMcCuboFront(x, y, w, h, volPct, tieneDifusor, {}, idx, null, ta);
}

/** Alzado: manguera desde multiválvula/bomba hasta piedra en el fondo del cubo. */
function dwcSvgMcAirHoseFront(pumpX, pumpTopY, stoneX, stoneY, ta, SC) {
  return dwcSvgMcAirHoseFlex(pumpX, pumpTopY, stoneX, stoneY, ta, SC, 2);
}

/** Cubo vista cenital (cuadrado o circular según forma del depósito). */
function dwcSvgMcBucketPlan(bx, by, size, SC, esCilindrico) {
  const cx = bx + size / 2;
  const cy = by + size / 2;
  const rOut = size / 2 - 1;
  const rIn = Math.max(12, rOut - 5);
  const rHole = Math.max(10, rIn * 0.48);
  if (esCilindrico) {
    let o =
      `<g class="dwc-mc-bucket dwc-mc-bucket--cyl" pointer-events="none" aria-hidden="true">` +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rOut.toFixed(1)}" fill="url(#dwcLidTop)" stroke="#64748b" stroke-width="1.5" filter="drop-shadow(0 2px 8px rgba(15,23,42,0.08))"/>` +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rIn.toFixed(1)}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>` +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rHole.toFixed(1)}" fill="#1e293b" stroke="#0f172a" stroke-width="1" opacity="0.88"/>` +
      `</g>`;
    return o;
  }
  const rx = Math.max(4, size * 0.1);
  const inner = Math.max(8, size - 10);
  const hole = Math.max(14, inner * 0.42);
  const hx = bx + (size - hole) / 2;
  const hy = by + (size - hole) / 2;
  let o =
    SC && SC.mcCuboPlan3d
      ? SC.mcCuboPlan3d(bx, by, size)
      : `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${size}" height="${size}" rx="${rx}" fill="url(#dwcLidTop)" stroke="#64748b" stroke-width="1.5" filter="drop-shadow(0 2px 8px rgba(15,23,42,0.08))"/>` +
        `<rect x="${(bx + 5).toFixed(1)}" y="${(by + 5).toFixed(1)}" width="${inner.toFixed(1)}" height="${inner.toFixed(1)}" rx="${Math.max(3, rx - 2)}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>`;
  o += `<rect x="${hx.toFixed(1)}" y="${hy.toFixed(1)}" width="${hole}" height="${hole}" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="1" opacity="0.88"/>`;
  return o;
}

/** Eje X del pasillo entre columnas (evita atravesar cubos). */
function dwcSvgMcAisleX(col, bx, cols, cubeSz, gap, innerLeft) {
  if (col < cols - 1) return bx + cubeSz + gap * 0.5;
  return Math.max(innerLeft + 3, bx - gap * 0.5);
}

/** Manguera cenital: dos filas → recta por columna desde el hub (sin cruzar otros cubos). */
function dwcSvgMcHosePlanRoute(hubCx, hubCy, bx, by, cx, cy, row, rows, col, cols, cubeSz, gap, innerLeft) {
  if (rows > 1) {
    return (
      `M ${hubCx.toFixed(1)} ${hubCy.toFixed(1)} L ${cx.toFixed(1)} ${hubCy.toFixed(1)} L ${cx.toFixed(1)} ${cy.toFixed(1)}`
    );
  }
  const ax = dwcSvgMcAisleX(col, bx, cols, cubeSz, gap, innerLeft);
  const botY = by + cubeSz;
  return (
    `M ${hubCx.toFixed(1)} ${hubCy.toFixed(1)} L ${ax.toFixed(1)} ${hubCy.toFixed(1)} L ${ax.toFixed(1)} ${botY.toFixed(1)} L ${cx.toFixed(1)} ${botY.toFixed(1)} L ${cx.toFixed(1)} ${cy.toFixed(1)}`
  );
}

/** Manguera alzado multiválvula: bomba → colector entre filas → cada cubo por su eje (sin pasar bajo otros). */
function dwcSvgMcHoseFrontRoute(pumpCx, pumpOutY, manifoldY, aisleX, y, miniH, cuboCx, entryY, stoneY, fr, fRows) {
  if (fRows > 1) {
    return (
      `M ${pumpCx.toFixed(1)} ${pumpOutY.toFixed(1)} L ${pumpCx.toFixed(1)} ${manifoldY.toFixed(1)} L ${cuboCx.toFixed(1)} ${manifoldY.toFixed(1)} L ${cuboCx.toFixed(1)} ${entryY.toFixed(1)} L ${cuboCx.toFixed(1)} ${stoneY.toFixed(1)}`
    );
  }
  const underY = y + miniH;
  return (
    `M ${pumpCx.toFixed(1)} ${pumpOutY.toFixed(1)} L ${pumpCx.toFixed(1)} ${manifoldY.toFixed(1)} L ${aisleX.toFixed(1)} ${manifoldY.toFixed(1)} L ${aisleX.toFixed(1)} ${underY.toFixed(1)} L ${cuboCx.toFixed(1)} ${underY.toFixed(1)} L ${cuboCx.toFixed(1)} ${entryY.toFixed(1)} L ${cuboCx.toFixed(1)} ${stoneY.toFixed(1)}`
  );
}

/** Cubo cilíndrico multiválvula (alzado frontal). */
function dwcSvgMcCuboFrontCyl(x, y, w, h, volPctAgua, tieneDifusor, Dw, ta) {
  const cx = x + w / 2;
  const rimH = 10;
  const yTop = y + rimH;
  const yBot = y + h - 4;
  const rx = (w - 8) / 2;
  const airFrac = 0.15;
  const fillU = Math.min(1 - airFrac, Math.max(0, volPctAgua));
  const ySurf = yBot - (yBot - yTop) * fillU;
  const sy = yBot - 5;
  let o =
    `<g class="dwc-mc-bucket-front dwc-mc-bucket-front--cyl">` +
    `<ellipse cx="${cx.toFixed(1)}" cy="${yTop.toFixed(1)}" rx="${rx.toFixed(1)}" ry="7" fill="#f1f5f9" stroke="#64748b" stroke-width="1.2"/>` +
    `<rect x="${(x + 4).toFixed(1)}" y="${yTop.toFixed(1)}" width="${(w - 8).toFixed(1)}" height="${(yBot - yTop).toFixed(1)}" fill="url(#dwcTankFace)" stroke="#94a3b8" stroke-width="1.1"/>` +
    `<ellipse cx="${cx.toFixed(1)}" cy="${yBot.toFixed(1)}" rx="${rx.toFixed(1)}" ry="8" fill="#81d4fa" stroke="#64748b" stroke-width="1" opacity="0.85"/>` +
    `<rect x="${(x + 6).toFixed(1)}" y="${ySurf.toFixed(1)}" width="${(w - 12).toFixed(1)}" height="${(yBot - ySurf).toFixed(1)}" fill="url(#dwcWaterGrad)"/>` +
    `<line x1="${(x + 6).toFixed(1)}" y1="${ySurf.toFixed(1)}" x2="${(x + w - 6).toFixed(1)}" y2="${ySurf.toFixed(1)}" stroke="#00acc1" stroke-width="1.3" opacity="0.7"/>` +
    `</g>`;
  if (tieneDifusor) {
    o += `<ellipse cx="${cx.toFixed(1)}" cy="${sy}" rx="8" ry="4" fill="${Dw.airStoneFill}" stroke="${Dw.airStoneStroke}" stroke-width="0.9"/>`;
  }
  if (tieneDifusor && ta) {
    for (let bi = 0; bi < 3; bi++) {
      const dx = (bi - 1) * 3;
      const y0 = sy - 3;
      const y1 = ySurf + 5;
      o += `<circle cx="${(cx + dx).toFixed(1)}" cy="${y0}" r="1.2" fill="${Dw.bubble}" opacity="0">
        <animate attributeName="cy" from="${y0}" to="${y1}" dur="1.2s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.85;0" dur="1.2s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
      </circle>`;
    }
  }
  return { svg: o, cx, stoneY: sy, waterTop: ySurf, iy: yTop };
}

/** Cubo individual multiválvula (alzado prisma, más alto que ancho). */
function dwcSvgMcCuboFront(x, y, w, h, volPctAgua, tieneDifusor, Dw, idx, volPerCubo, ta) {
  const ix = x + 5;
  const iy = y + 12;
  const iw = w - 10;
  const ih = h - 18;
  const cx = x + w / 2;
  const airFrac = 0.15;
  const fillU = Math.min(1 - airFrac, Math.max(0, volPctAgua));
  const wTop = iy + ih * (1 - fillU);
  const sy = iy + ih - 4;
  let o =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="url(#dwcMcCuboShell)" stroke="#64748b" stroke-width="1.25" filter="drop-shadow(0 3px 8px rgba(15,23,42,0.1))"/>` +
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="5" fill="rgba(224,247,250,0.72)" stroke="none"/>` +
    `<rect x="${(ix + 2).toFixed(1)}" y="${iy}" width="${Math.max(4, iw * 0.22).toFixed(1)}" height="${ih}" rx="4" fill="rgba(255,255,255,0.35)" opacity="0.55"/>` +
    `<rect x="${ix}" y="${wTop.toFixed(1)}" width="${iw}" height="${(iy + ih - wTop).toFixed(1)}" fill="url(#dwcWaterGrad)"/>` +
    `<line x1="${ix}" y1="${wTop.toFixed(1)}" x2="${(ix + iw)}" y2="${wTop.toFixed(1)}" stroke="#00acc1" stroke-width="1.4" opacity="0.7"/>` +
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="5" fill="none" stroke="#0ea5e9" stroke-width="0.9" opacity="0.4"/>`;
  if (tieneDifusor) {
    o += `<ellipse cx="${cx.toFixed(1)}" cy="${sy}" rx="8" ry="4" fill="${Dw.airStoneFill}" stroke="${Dw.airStoneStroke}" stroke-width="0.9"/>`;
  }
  if (tieneDifusor && ta) {
    for (let bi = 0; bi < 3; bi++) {
      const dx = (bi - 1) * 3;
      const y0 = sy - 3;
      const y1 = wTop + 5;
      o += `<circle cx="${(cx + dx).toFixed(1)}" cy="${y0}" r="1.2" fill="${Dw.bubble}" opacity="0">
        <animate attributeName="cy" from="${y0}" to="${y1}" dur="1.2s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.85;0" dur="1.2s" begin="${(bi * 0.15).toFixed(2)}s" repeatCount="indefinite"/>
      </circle>`;
    }
  }
  return { svg: o, cx, stoneY: sy, waterTop: wTop, iy };
}

/** Piedras difusoras sugeridas (misma lógica que checklist DWC). */
function dwcSvgNumPiedrasDifusor(cfg) {
  if (typeof dwcRecomendacionDifusorCompletaDesdeConfig === 'function') {
    const rec = dwcRecomendacionDifusorCompletaDesdeConfig(cfg);
    if (rec && rec.salidasSug > 0) return Math.min(6, Math.max(1, rec.salidasSug));
  }
  return 1;
}

/** Bomba de aire externa; `numOutlets` = mangueras visibles (1 salvo varias piedras). */
function dwcSvgAirPumpExternal(px, py, numOutlets) {
  const w = 54;
  const h = 40;
  const cx = px + w / 2;
  const nOut = Math.max(1, Math.min(4, numOutlets || 1));
  const outlets = [];
  for (let i = 0; i < nOut; i++) {
    const t = nOut === 1 ? 0.55 : (i + 0.5) / nOut;
    outlets.push({ x: px, y: py + 12 + t * (h - 6) });
  }
  let connSvg = '';
  for (const o of outlets) {
    connSvg += `<circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="2.2" fill="#cfd8dc" stroke="#546e7a" stroke-width="0.8"/>`;
  }
  const svg =
    `<g class="dwc-ext-pump" filter="drop-shadow(0 3px 6px rgba(15,23,42,0.15))">` +
    `<ellipse cx="${cx.toFixed(1)}" cy="${(py + h + 8).toFixed(1)}" rx="${(w * 0.4).toFixed(1)}" ry="5" fill="rgba(15,23,42,0.12)"/>` +
    `<rect x="${(px + 5).toFixed(1)}" y="${(py + h - 3).toFixed(1)}" width="5" height="4" rx="1" fill="#263238"/>` +
    `<rect x="${(px + w - 10).toFixed(1)}" y="${(py + h - 3).toFixed(1)}" width="5" height="4" rx="1" fill="#263238"/>` +
    `<rect x="${(px + 4).toFixed(1)}" y="${(py + 14).toFixed(1)}" width="${(w - 8).toFixed(1)}" height="${(h - 10).toFixed(1)}" rx="5" fill="#37474f" stroke="#1e293b" stroke-width="1.8"/>` +
    `<ellipse cx="${cx.toFixed(1)}" cy="${(py + 12).toFixed(1)}" rx="${((w - 10) / 2).toFixed(1)}" ry="13" fill="url(#dwcPumpDome)" stroke="#e65100" stroke-width="2"/>` +
    `<ellipse cx="${(cx - 8).toFixed(1)}" cy="${(py + 8).toFixed(1)}" rx="7" ry="3" fill="rgba(255,255,255,0.45)"/>` +
    connSvg +
    `<circle cx="${cx.toFixed(1)}" cy="${(py + h * 0.52).toFixed(1)}" r="9" fill="#eceff1" stroke="#78909c" stroke-width="1.2"/>` +
    `<circle cx="${cx.toFixed(1)}" cy="${(py + h * 0.52).toFixed(1)}" r="4.5" fill="none" stroke="#90a4ae" stroke-width="0.9"/>` +
    `</g>`;
  return { svg, outlets, w, h };
}

/** Zona de cámara de aire (clip #dwcAirChamberClip definido en el SVG; sin etiqueta). */
function dwcSvgCamaraAireOverlay(waterLinePts) {
  return (
    `<g class="dwc-camara-aire" clip-path="url(#dwcAirChamberClip)" pointer-events="none">` +
    `<rect x="-20" y="-20" width="800" height="600" fill="#e0f7fa" opacity="0.92"/>` +
    `<rect x="-20" y="-20" width="800" height="600" fill="url(#dwcAirChamberPat)" opacity="0.55"/>` +
    (waterLinePts
      ? `<polyline points="${waterLinePts}" fill="none" stroke="#00acc1" stroke-width="2.2" stroke-linecap="round" opacity="0.95"/>`
      : '') +
    `</g>`
  );
}

/** Manguera continua bomba → piedra (una sola línea). */
function dwcSvgAirHosePumpToStone(xPump, yPump, wallX, entryY, stoneX, stoneY, strokeW, opacity) {
  const bow = Math.max(16, Math.abs(wallX - xPump) * 0.34);
  const c1x = xPump - bow;
  const c1y = yPump;
  const c2x = wallX + bow * 0.22;
  const c2y = entryY;
  const midY = (entryY + stoneY) * 0.5;
  const c3x = wallX - Math.max(10, (wallX - stoneX) * 0.35);
  const c3y = midY;
  const c4x = stoneX + 6;
  const c4y = stoneY - 4;
  const op = opacity != null ? opacity : 0.92;
  const sw = strokeW != null ? strokeW : 2.2;
  const d =
    `M ${xPump.toFixed(1)} ${yPump.toFixed(1)} ` +
    `C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${wallX.toFixed(1)} ${entryY.toFixed(1)} ` +
    `S ${c4x.toFixed(1)} ${c4y.toFixed(1)} ${stoneX.toFixed(1)} ${stoneY.toFixed(1)}`;
  return (
    `<path d="${d}" fill="none" stroke="#eceff1" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>` +
    `<path d="${d}" fill="none" stroke="#78909c" stroke-width="${(sw - 0.7).toFixed(1)}" stroke-linecap="round" opacity="${(op * 0.35).toFixed(2)}"/>`
  );
}

/** X del borde derecho del tronco a una altura y. */
function dwcTroncoXRightAtY(tr, y) {
  const u = (y - tr.yt) / Math.max(1e-6, tr.yb - tr.yt);
  return tr.xRt + (tr.xRb - tr.xRt) * Math.max(0, Math.min(1, u));
}

/** Huecos de cestas en la tapa (vista frontal, alineados con cenital). */
function dwcSvgTapaHuecosFrontal(tankX, tankY, tankW, rimH, nRows, nCols, esCilindrico, svgW) {
  let o = '';
  if (esCilindrico) {
    const cx = svgW / 2;
    const holeR = Math.min(15, tankW * 0.1);
    const cy = tankY + rimH * 0.5;
    o +=
      `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${holeR.toFixed(1)}" ry="${(holeR * 0.45).toFixed(1)}" fill="#1e293b" opacity="0.55"/>` +
      `<ellipse cx="${cx.toFixed(1)}" cy="${(cy + 1).toFixed(1)}" rx="${(holeR * 0.62).toFixed(1)}" ry="${(holeR * 0.28).toFixed(1)}" fill="#0f172a" opacity="0.65"/>`;
    return o;
  }
  const holeR = Math.min(10, tankW / Math.max(2.5, nCols * 2.2));
  for (let n = 0; n < nRows; n++) {
    for (let c = 0; c < nCols; c++) {
      const cx = tankX + ((c + 0.5) / nCols) * tankW;
      const cy = nRows > 1 ? tankY + ((n + 0.5) / nRows) * rimH * 0.9 : tankY + rimH * 0.48;
      o += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${holeR.toFixed(1)}" ry="${(holeR * 0.5).toFixed(1)}" fill="#1e293b" opacity="0.52"/>`;
    }
  }
  return o;
}

/** Manguera flexible bomba → pared del depósito (curva, no línea recta). */
function dwcSvgAirHoseCurve(x1, y1, x2, y2, strokeW, opacity) {
  const bow = Math.max(18, Math.abs(x2 - x1) * 0.35);
  const c1x = x1 - bow;
  const c1y = y1;
  const c2x = x2 + bow * 0.35;
  const c2y = y2;
  return (
    `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#f5f5f5" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>` +
    `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#90a4ae" stroke-width="${(strokeW - 0.8).toFixed(1)}" stroke-linecap="round" opacity="${(opacity * 0.45).toFixed(2)}"/>`
  );
}

/** Tubería interna (pared → piedra), suave y baja en el depósito. */
function dwcSvgAirHoseInternal(x1, y1, x2, y2) {
  const midY = (y1 + y2) / 2;
  return (
    `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${(x1 - 6).toFixed(1)} ${midY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#b0bec5" stroke-width="1.35" stroke-linecap="round" stroke-dasharray="3 2.5" opacity="0.75"/>`
  );
}

function generarSVGDwc() {
  const SC = typeof dwcScadaParts !== 'undefined' ? dwcScadaParts : null;
  const RP = typeof rdwcScadaParts !== 'undefined' ? rdwcScadaParts : null;
  const cfg = state.configTorre || {};
  const N = Math.max(1, Math.min(12, cfg.numNiveles || window.NUM_NIVELES_ACTIVO || NUM_NIVELES));
  const C = Math.max(1, Math.min(12, cfg.numCestas || window.NUM_CESTAS_ACTIVO || NUM_CESTAS));
  const ta = torreSvgAnimacionesActivas();
  const volMax = getVolumenDepositoMaxLitros(cfg);
  const volTrabajo = getVolumenMezclaLitros(cfg);
  /** Litros mostrados: siempre el volumen de mezcla / trabajo (≤ máx.), no la última medición ni un % fijo del máx. */
  const volEtiqueta =
    volTrabajo != null && Number.isFinite(volTrabajo) ? Math.round(volTrabajo * 10) / 10 : '—';
  let volPerCuboMc = null;
  let volTotalMcTxt = volEtiqueta;
  /** Nivel del agua en el dibujo: fracción útil mezcla / capacidad física del depósito. */
  const volPct =
    volMax != null &&
    volTrabajo != null &&
    Number.isFinite(volMax) &&
    Number.isFinite(volTrabajo) &&
    volMax > 0
      ? Math.min(1, Math.max(0, volTrabajo / Math.max(1, volMax)))
      : 0;
  /** En DWC siempre hay cámara de aire bajo la tapa; el esquema reserva ese hueco. */
  const DWC_CAMARA_AIRE_FRAC_MIN = 0.15;
  const volPctAguaDibujo = Math.min(volPct > 0 ? volPct : 0.72, 1 - DWC_CAMARA_AIRE_FRAC_MIN);
  const tieneDifusor = state.configTorre?.equipamiento?.includes('difusor') ?? true;
  const tieneCalentador = state.configTorre?.equipamiento?.includes('calentador') ?? true;
  const objSpec =
    typeof dwcGetObjetivoSpec === 'function' && typeof dwcGetObjetivoCultivo === 'function'
      ? dwcGetObjetivoSpec(dwcGetObjetivoCultivo(cfg))
      : { label: 'Planta adulta (tamaño completo)', litrosTxt: '3–5 L/planta', ccTxt: '15–25 cm' };
  const rejModo =
    typeof dwcGetRejillaModoPreferido === 'function'
      ? dwcGetRejillaModoPreferido(cfg)
      : (cfg.dwcRejillaModoPreferido === 'max' ? 'max' : 'objetivo');
  const rejTxt = rejModo === 'max' ? 'principal: máxima geométrica' : 'principal: recomendada por objetivo';
  const formaDwc =
    typeof dwcNormalizeDepositoForma === 'function'
      ? dwcNormalizeDepositoForma(cfg.dwcDepositoForma)
      : (cfg.dwcDepositoForma || 'prismatico');
  const formaDwcTxt =
    typeof dwcFormaDepositoLabel === 'function' ? dwcFormaDepositoLabel(formaDwc) : formaDwc;
  const esMulticubo =
    typeof dwcGetOxigenacionDiseno === 'function' &&
    dwcGetOxigenacionDiseno(cfg) === 'cubos_independientes';
  if (esMulticubo && typeof renderDwcMcPlan === 'function') {
    const siteFn =
      typeof dwcMcSiteInteractive === 'function' ? dwcMcSiteInteractive : null;
    return renderDwcMcPlan(cfg, siteFn);
  }
  const esMcCilindrico = esMulticubo && formaDwc === 'cilindrico';
  const esCilindricoDwc = !esMulticubo && formaDwc === 'cilindrico';
  /** Cubo redondo DWC: siempre 1 maceta; tapa = mismo diámetro que el depósito. */
  const nDraw = esCilindricoDwc ? 1 : N;
  const cDraw = esCilindricoDwc ? 1 : C;
  /** Posiciones de piedras (cenital x, frente y) para burbujas en modo multivalvula. */
  let dwcMcAirPts = null;
  const S_mc = esMulticubo
    ? typeof dwcGetNumCubosIndependientes === 'function'
      ? Math.max(1, dwcGetNumCubosIndependientes(cfg))
      : Math.max(1, N * C)
    : 0;
  let mcCols = 1;
  let mcRows = 1;
  let mcColsPerRow = [1];
  let mcLayoutDist = null;
  let mcPositions = null;
  let mcCubeSz = 56;
  let mcGapPlan = 16;
  let mcGapFront = 14;
  let mcColStep = 90;
  let mcRowStep = 78;
  if (esMulticubo) {
    mcLayoutDist =
      typeof hcDistribuirCubosMultivalvula === 'function'
        ? hcDistribuirCubosMultivalvula(S_mc)
        : typeof hcDistribuirFilasColumnas === 'function'
          ? (() => {
              const g = hcDistribuirFilasColumnas(S_mc, 6);
              return { sites: S_mc, rows: g.rows, cols: g.cols, colsPerRow: [g.cols], grid: null };
            })()
          : { sites: S_mc, cols: S_mc <= 6 ? S_mc : 6, rows: S_mc <= 6 ? 1 : 2, colsPerRow: [Math.ceil(S_mc / 2), Math.floor(S_mc / 2)], grid: null };
    mcCols = mcLayoutDist.cols;
    mcRows = mcLayoutDist.rows;
    mcColsPerRow = mcLayoutDist.colsPerRow || [mcCols];
    mcCubeSz = S_mc <= 4 ? 78 : S_mc <= 6 ? 70 : 58;
    mcGapPlan = S_mc <= 4 ? 18 : 14;
    mcGapFront = S_mc <= 4 ? 18 : 12;
    const mcSteps =
      typeof hcDwcMcColRowSteps === 'function' ? hcDwcMcColRowSteps(mcCubeSz, mcGapPlan) : null;
    if (mcSteps) {
      mcColStep = mcSteps.colStep;
      mcRowStep = mcSteps.rowStep;
    }
    if (typeof dwcLitrosUtilesPorCuboMultivalvula === 'function') {
      volPerCuboMc = dwcLitrosUtilesPorCuboMultivalvula(cfg);
    }
    if (volPerCuboMc != null && S_mc > 0) {
      volTotalMcTxt = Math.round(volPerCuboMc * S_mc * 10) / 10;
    } else if (typeof volEtiqueta === 'number' && Number.isFinite(volEtiqueta)) {
      volTotalMcTxt = volEtiqueta;
    } else {
      volTotalMcTxt = '—';
    }
  }
  const recoCultivo =
    typeof dwcRecomendacionCultivoDesdeConfig === 'function'
      ? dwcRecomendacionCultivoDesdeConfig(cfg)
      : '';
  const Dw =
    typeof HC_DIAG !== 'undefined' && HC_DIAG.dwc
      ? HC_DIAG.dwc
      : {
          title: '#475569',
          sep: '#cbd5e1',
          calFill: '#f97316',
          calStroke: '#c2410c',
          calGlow: '#fbbf24',
          calText: '#9a3412',
          airLine: '#64748b',
          airStoneFill: '#9ca3af',
          airStoneStroke: '#57534e',
          airLabel: '#475569',
          bubble: '#e0f2fe',
          volLow: '#e11d48',
          volMid: '#d97706',
          volOk: '#0284c7',
        };

  const dep = dwcSvgDepDimsDesdeCfg(cfg);
  const cilAspect = esCilindricoDwc ? dwcCilindricoAspectoDesdeCfg(cfg, dep) : null;
  let W = esMulticubo ? 520 : 460;
  const planPad = esMulticubo ? 12 : 10;
  const planTop = esMulticubo ? 48 : 54;
  if (esMulticubo && typeof hcDwcMcComputePositions === 'function') {
    const wProbe = Math.min(
      620,
      Math.max(480, 88 + Math.max(0, mcCols - 1) * mcColStep + mcCubeSz * 2)
    );
    mcPositions = hcDwcMcComputePositions(mcLayoutDist, wProbe, planTop, mcCubeSz, mcGapPlan);
    W = Math.min(
      620,
      Math.max(480, 88 + Math.max(0, mcCols - 1) * mcColStep + mcCubeSz * 2)
    );
    mcPositions = hcDwcMcComputePositions(mcLayoutDist, W, planTop, mcCubeSz, mcGapPlan);
  }
  const H = esMulticubo ? 760 : esCilindricoDwc ? 620 : 548;

  const blockW = esMulticubo
    ? Math.max(
        mcCubeSz + planPad * 2,
        Math.max(0, mcCols - 1) * mcColStep + mcCubeSz + planPad * 2
      )
    : esCilindricoDwc && cilAspect
      ? Math.min(280, Math.max(200, Math.round(170 + cilAspect.diamCm * 0.85)))
      : Math.min(320, Math.max(228, 28 + cDraw * 30));
  const planLeft = (W - blockW) / 2;
  const planW = blockW;
  const mcAirBandH = esMulticubo ? 76 : 0;
  const planH = esMulticubo
    ? mcPositions
      ? mcPositions.gridBottom - planTop + mcAirBandH + 8
      : mcRows * mcCubeSz + Math.max(0, mcRows - 1) * mcRowStep + planPad * 2 + mcAirBandH
    : esCilindricoDwc
      ? planW
      : Math.min(200, 28 + nDraw * 30);
  const planInnerX = planLeft + planPad;
  const planInnerY = planTop + planPad;
  const planInnerW = planW - planPad * 2;
  const planInnerH = planH - planPad * 2;
  const cellW = esMulticubo ? mcCubeSz : planInnerW / cDraw;
  const cellH = esMulticubo ? mcCubeSz : planInnerH / nDraw;
  let Rpot = esMulticubo
    ? Math.max(16, Math.min(28, mcCubeSz * 0.4))
    : Math.max(7, Math.min(20, Math.min(cellW, cellH) * 0.38));
  if (esCilindricoDwc) {
    Rpot = dwcSvgCilindricoMacetaR(planW, planPad, cfg);
  }

  function macetaSvg(n, c, cx, cy, r, topView, squarePot) {
    const dat =
      state.torre && state.torre[n] && state.torre[n][c]
        ? state.torre[n][c]
        : { variedad: '', fecha: '', fotos: [] };
    const dias = dat.fecha ? torreDiasCicloVisual(dat) : 0;
    const est = dat.variedad ? getEstado(dat.variedad, dias) : '';
    const diasBase = DIAS_COSECHA[dat.variedad] || 50;
    const diasT = typeof torreGetDiasCosechaObjetivo === 'function'
      ? torreGetDiasCosechaObjetivo(diasBase, state.configTorre || {})
      : diasBase;
    const pct = dat.variedad ? Math.min(100, Math.round((dias / diasT) * 100)) : 0;
    let fill, stroke, phaseEmoji;
    if (!dat.variedad) {
      fill = '#f8fafc';
      stroke = '#94a3b8';
      phaseEmoji = '';
    } else if (est === 'plantula') {
      fill = '#eff6ff';
      stroke = '#2563eb';
      phaseEmoji = getEmoji(est);
    } else if (est === 'crecimiento') {
      fill = '#f0fdf4';
      stroke = '#15803d';
      phaseEmoji = getEmoji(est);
    } else if (est === 'madurez') {
      fill = '#fffbeb';
      stroke = '#b45309';
      phaseEmoji = getEmoji(est);
    } else {
      fill = '#faf5ff';
      stroke = '#7c3aed';
      phaseEmoji = getEmoji(est);
    }
    const clipId = `dwc_clip_${n}_${c}`;
    const isSelected = !!(window.editingCesta && editingCesta.nivel === n && editingCesta.cesta === c);
    const multiKey = n + ',' + c;
    const isMultiSel = torreInteraccionModo === 'asignar' && torreCestasMultiSel.has(multiKey);
    const fotos = (dat.fotos || []).filter((f) => f && f.data);
    const ultimaFoto = fotos.length > 0 ? fotos[fotos.length - 1] : null;
    const varTxt = dat.variedad ? String(dat.variedad) : 'vacía';
    const ariaCesta = escAriaAttr(
      (esMulticubo
        ? `Cubo ${c + 1}, maceta ${varTxt}`
        : `Maceta fila ${n + 1} columna ${c + 1}, ${varTxt}`) +
        (dias ? ', día ' + dias + ' de cultivo' : '') +
        '. Pulsa para abrir ficha o asignar cultivo.'
    );

    let o = '';
    if (!topView) {
      o += `<ellipse cx="${cx.toFixed(1)}" cy="${(cy + 4).toFixed(1)}" rx="${(r * 1.08).toFixed(1)}" ry="${(r * 0.55).toFixed(1)}"
        fill="rgba(15,23,42,0.07)" opacity="0.85"/>`;
    } else if (squarePot && topView) {
      const sq = (r + 2) * 1.42;
      o += `<rect x="${(cx - sq / 2).toFixed(1)}" y="${(cy - sq / 2).toFixed(1)}" width="${sq.toFixed(1)}" height="${sq.toFixed(1)}" rx="3" fill="none" stroke="#cbd5e1" stroke-width="1.1" opacity="0.9"/>`;
    } else {
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 2.2).toFixed(1)}" fill="none" stroke="#cbd5e1" stroke-width="1.1" opacity="0.9"/>`;
    }
    if (topView && SC && dat.variedad) {
      o += SC.plantAccent(cx, cy, r, true);
    }
    o += `<g data-n="${n}" data-c="${c}" class="hc-cesta hc-cesta--interactive dwc-maceta hc-cesta-pe-all" role="button" tabindex="0" aria-label="${ariaCesta}">`;
    if (squarePot && topView) {
      const pr = r * 0.92;
      o += `<rect x="${(cx - pr).toFixed(1)}" y="${(cy - pr).toFixed(1)}" width="${(pr * 2).toFixed(1)}" height="${(pr * 2).toFixed(1)}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    } else {
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${topView ? 2 : 2.2}"/>`;
    }
    if (isMultiSel) {
      if (squarePot && topView) {
        const pr2 = r + 5;
        o += `<rect x="${(cx - pr2).toFixed(1)}" y="${(cy - pr2).toFixed(1)}" width="${(pr2 * 2).toFixed(1)}" height="${(pr2 * 2).toFixed(1)}" rx="5" fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-dasharray="4 3" opacity="0.95"/>`;
      } else {
        o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 5).toFixed(1)}"
          fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-dasharray="4 3" opacity="0.95"/>`;
      }
    }
    if (isSelected) {
      if (squarePot && topView) {
        const pr3 = r + 4;
        o += `<rect x="${(cx - pr3).toFixed(1)}" y="${(cy - pr3).toFixed(1)}" width="${(pr3 * 2).toFixed(1)}" height="${(pr3 * 2).toFixed(1)}" rx="5" fill="none" stroke="#22c55e" stroke-width="2.5" opacity="0.9"/>`;
      } else {
        o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 4).toFixed(1)}"
          fill="none" stroke="#22c55e" stroke-width="2.5" opacity="0.9"/>`;
        o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 7.5).toFixed(1)}"
          fill="none" stroke="rgba(34,197,94,0.22)" stroke-width="5" opacity="0.85"/>`;
      }
    }
    if (ultimaFoto?.data) {
      if (squarePot && topView) {
        o += `<defs><clipPath id="${clipId}"><rect x="${(cx - r + 1.5).toFixed(1)}" y="${(cy - r + 1.5).toFixed(1)}" width="${((r - 1.5) * 2).toFixed(1)}" height="${((r - 1.5) * 2).toFixed(1)}" rx="3"/></clipPath></defs>`;
      } else {
        o += `<defs><clipPath id="${clipId}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 1.5).toFixed(1)}"/></clipPath></defs>`;
      }
      o += `<image href="${ultimaFoto.data}" x="${(cx - r).toFixed(1)}" y="${(cy - r).toFixed(1)}"
        width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" preserveAspectRatio="xMidYMid slice"
        clip-path="url(#${clipId})" opacity="0.93"></image>`;
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 0.5).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.1"/>`;
    }
    if (pct > 0 && pct < 100) {
      const r2 = r + 5;
      const ang2 = (pct / 100) * 2 * Math.PI - Math.PI / 2;
      const x1e = cx + r2 * Math.cos(-Math.PI / 2);
      const y1e = cy + r2 * Math.sin(-Math.PI / 2);
      const x2e = cx + r2 * Math.cos(ang2);
      const y2e = cy + r2 * Math.sin(ang2);
      o += `<path d="M${x1e.toFixed(1)},${y1e.toFixed(1)} A${r2.toFixed(1)},${r2.toFixed(1)} 0 ${pct > 50 ? 1 : 0},1 ${x2e.toFixed(1)},${y2e.toFixed(1)}"
        fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;
    }
    const emoFs = topView ? Math.min(13, Math.max(8, r * 0.95)) : 14;
    if (phaseEmoji) {
      o += `<text x="${cx.toFixed(1)}" y="${(topView ? cy + 2 : cy - r - 5).toFixed(1)}" font-size="${emoFs}" text-anchor="middle" dominant-baseline="${topView ? 'central' : 'alphabetic'}" opacity="0.95">${phaseEmoji}</text>`;
    } else if (!ultimaFoto?.data) {
      const dotFs = topView ? Math.min(11, r * 0.9) : 11;
      o += `<text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-family="Inconsolata,monospace" font-size="${dotFs}" font-weight="600" text-anchor="middle" fill="#cbd5e1">·</text>`;
    }
    const subFs = topView ? Math.min(7.5, r * 0.55) : 8;
    const subY = topView ? cy + r * 0.85 : cy + r + 12;
    if (dias > 0 && phaseEmoji) {
      o += `<text x="${cx.toFixed(1)}" y="${subY.toFixed(1)}" font-family="Inconsolata,monospace"
        font-size="${subFs}" font-weight="700" fill="${stroke}" text-anchor="middle">${dias}d</text>`;
    } else {
      o += `<text x="${cx.toFixed(1)}" y="${subY.toFixed(1)}" font-family="Inconsolata,monospace"
        font-size="${(subFs - 0.5).toFixed(1)}" fill="#94a3b8" text-anchor="middle">${c + 1}</text>`;
    }
    const notasRaw = state.torre && state.torre[n] && state.torre[n][c] ? state.torre[n][c].notas : '';
    const hasNotas = !!(notasRaw && String(notasRaw).trim().length > 0);
    if (ultimaFoto?.data) {
      o += `<rect x="${(cx - r + 2).toFixed(1)}" y="${(cy - r + 2).toFixed(1)}" width="14" height="10" rx="2"
        fill="#0f172a" opacity="0.88"/><text x="${(cx - r + 9).toFixed(1)}" y="${(cy - r + 10).toFixed(1)}" font-family="Inconsolata,monospace" font-size="7" font-weight="800" text-anchor="middle" fill="#f8fafc">F</text>`;
    }
    if (hasNotas) {
      o += `<rect x="${(cx + r - 16).toFixed(1)}" y="${(cy - r + 2).toFixed(1)}" width="14" height="10" rx="2"
        fill="#334155" opacity="0.9"/><text x="${(cx + r - 9).toFixed(1)}" y="${(cy - r + 10).toFixed(1)}" font-family="Inconsolata,monospace" font-size="7" font-weight="800" text-anchor="middle" fill="#f8fafc">N</text>`;
    }
    if (est === 'cosecha') {
      o += `<circle cx="${(cx + r - 2).toFixed(1)}" cy="${(cy - r + 2).toFixed(1)}" r="5" fill="#7c3aed">${
        ta ? `<animate attributeName="r" values="4;6.5;4" dur="1.5s" repeatCount="indefinite"/>` : ''
      }</circle>`;
      o += `<text x="${(cx + r - 2).toFixed(1)}" y="${(cy - r + 6).toFixed(1)}" font-size="7" text-anchor="middle" fill="white">✓</text>`;
    }
    const hitMult =
      SC &&
      (window.innerWidth < 768 ||
        (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches))
        ? 1.95
        : 1.55;
    if (squarePot && topView) {
      const hr = r * hitMult;
      o += `<rect x="${(cx - hr).toFixed(1)}" y="${(cy - hr).toFixed(1)}" width="${(hr * 2).toFixed(1)}" height="${(hr * 2).toFixed(1)}" rx="6"
        fill="rgba(0,0,0,0)" stroke="none" pointer-events="all" class="hc-cesta-hit"/>`;
    } else {
      o += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * hitMult).toFixed(1)}"
        fill="rgba(0,0,0,0)" stroke="none" pointer-events="all" class="hc-cesta-hit"/>`;
    }
    o += `</g>`;
    return o;
  }

  const planBottom = planTop + planH;
  const tankStartY = planBottom + 48;
  const tankW = blockW;
  let tankH = 108;
  if (esCilindricoDwc && cilAspect) {
    tankH = Math.round(Math.max(142, Math.min(215, tankW * cilAspect.aspectH)));
  }
  /** Borde inferior del bloque frontal (depósito único o rejilla de cubos). */
  let tankGraphicBottom = tankStartY + tankH;
  const tankX = planLeft;
  const rimH = 14;
  const innerPad = 10;
  const innerX0 = tankX + innerPad;
  const innerY0 = tankStartY + rimH + 4;
  const innerW0 = tankW - innerPad * 2;
  const innerH0 = tankH - rimH - 8;
  let clipPathInner = '';
  let tankFrontalSvg = '';
  let hx = innerX0 + 22;
  let stoneX = innerX0 + innerW0 - 32;
  let innerBottom = innerY0 + innerH0;
  let waterTopY = innerY0 + innerH0 * (1 - volPctAguaDibujo);
  let waveY = innerY0 + innerH0 * 0.35;
  const tankFaceInset = 4;
  let dwcTroncoFront = null;
  let airChamberClipInner = '';
  let airChamberTopY = innerY0;
  let airChamberWaterLine = '';

  if (esMulticubo) {
    const S = S_mc;
    const fRows = mcRows;
    const gapMc = mcGapFront;
    const airGapBetweenRows = fRows > 1 ? 12 : 0;
    const pumpCx = W / 2;
    const yGrid0 = tankStartY + 8;
    const miniW = Math.min(82, Math.max(48, mcCubeSz * 0.92));
    const miniH = Math.round(miniW * 1.28);
    const frontLayout =
      mcPositions ||
      (typeof hcDwcMcComputePositions === 'function'
        ? hcDwcMcComputePositions(mcLayoutDist, W, tankStartY, miniW, gapMc)
        : null);
    const frontPos = frontLayout ? frontLayout.positions : [];
    const rowSpan = miniH + gapMc + (fRows > 1 ? airGapBetweenRows / Math.max(1, fRows - 1) : 0);
    function mcFrontYForRow(fr) {
      if (mcPositions && mcPositions.positions.length) {
        const rowPts = mcPositions.positions.filter((p) => p.row === fr);
        if (rowPts.length) {
          return yGrid0 + (rowPts[0].by - mcPositions.gridTop);
        }
      }
      let y = yGrid0 + fr * (miniH + gapMc + 8);
      if (fRows > 1 && fr >= 1) y += airGapBetweenRows;
      return y;
    }
    let gridBottom = yGrid0 + fRows * rowSpan;
    if (frontPos.length) {
      const maxRow = Math.max(...frontPos.map((p) => p.row));
      gridBottom = mcFrontYForRow(maxRow) + miniH;
    }
    const pumpGapBelow = 30;
    const pumpY = gridBottom + pumpGapBelow;
    const valveY = pumpY + 6;
    let cuboSvg = '';
    let hoseSvg = '';
    dwcMcAirPts = [];
    const pumpMc = dwcSvgAirPumpExternal(pumpCx - 27, pumpY, 1);
    const pumpOut = pumpMc.outlets[0] || { x: pumpCx, y: pumpY + 12 };
    const frontCubos = [];
    for (let idx = 0; idx < S; idx++) {
      const P = frontPos[idx];
      const slot =
        P ||
        (typeof hcMultivalvulaSlotDesdeIdx === 'function'
          ? hcMultivalvulaSlotDesdeIdx(idx, mcLayoutDist || { rows: fRows, cols: mcCols, colsPerRow: mcColsPerRow })
          : { row: Math.floor(idx / mcCols), col: idx % mcCols, colsInRow: mcCols });
      const x = P ? P.cx - miniW / 2 : tankX + (tankW - miniW) / 2;
      const y = mcFrontYForRow(slot.row);
      const cubo = dwcSvgMcModuleFrontRdwc(
        x,
        y,
        miniW,
        miniH,
        volPctAguaDibujo,
        tieneDifusor,
        ta,
        idx,
        RP
      );
      cuboSvg += cubo.svg;
      frontCubos.push(cubo);
      if (tieneDifusor) {
        dwcMcAirPts.push({ cx: cubo.cx, stoneY: cubo.stoneY, waterTop: cubo.waterTop });
      }
    }
    if (tieneDifusor) {
      hoseSvg += dwcSvgMcMultivalveBody(pumpCx, valveY);
      for (let i = 0; i < frontCubos.length; i++) {
        const cubo = frontCubos[i];
        hoseSvg += dwcSvgMcAirHoseFront(pumpOut.x, pumpOut.y - 2, cubo.cx, cubo.stoneY, ta, SC);
      }
    }
    innerBottom = gridBottom + 6;
    tankGraphicBottom = pumpY + pumpMc.h + 22;
    clipPathInner = `<rect x="${tankX}" y="${tankStartY}" width="${tankW}" height="${(tankGraphicBottom - tankStartY).toFixed(1)}" rx="2"/>`;
    tankFrontalSvg = cuboSvg + hoseSvg + pumpMc.svg;
  } else if (formaDwc === 'cilindrico') {
    clipPathInner = `<rect x="${innerX0}" y="${innerY0}" width="${innerW0}" height="${innerH0}" rx="5"/>`;
    waterTopY = innerY0 + innerH0 * (1 - volPctAguaDibujo);
    innerBottom = innerY0 + innerH0;
    waveY = innerY0 + innerH0 * 0.35;
    hx = innerX0 + 22;
    stoneX = innerX0 + innerW0 - 32;
    tankFrontalSvg = dwcSvgCilindricoAlzado(
      tankX,
      tankStartY,
      tankW,
      tankH,
      rimH,
      innerX0,
      innerY0,
      innerW0,
      innerH0,
      waterTopY,
      innerBottom,
      waveY,
      ta,
      tankFaceInset
    );
  } else if (formaDwc === 'troncopiramidal') {
    const padT = 8;
    const yt = tankStartY + rimH + 6;
    const yb = tankStartY + tankH - 8;
    const cxm = tankX + tankW / 2;
    const wt = tankW - 2 * padT;
    const wb = Math.max(56, wt - 48);
    const xLt = cxm - wt / 2;
    const xRt = cxm + wt / 2;
    const xLb = cxm - wb / 2;
    const xRb = cxm + wb / 2;
    innerBottom = yb;
    const uFill = Math.min(1, Math.max(0, volPctAguaDibujo));
    const ySurf = yb - (yb - yt) * uFill;
    const uS = Math.max(0, Math.min(1, (ySurf - yt) / Math.max(1e-6, yb - yt)));
    const xLs = xLt + (xLb - xLt) * uS;
    const xRs = xRt + (xRb - xRt) * uS;
    clipPathInner = `<polygon points="${xLt},${yt} ${xRt},${yt} ${xRb},${yb} ${xLb},${yb}"/>`;
    waterTopY = ySurf;
    waveY = ySurf + (yb - ySurf) * 0.38;
    hx = xLb + Math.max(16, (xRb - xLb) * 0.12);
    stoneX = xRb - Math.max(24, (xRb - xLb) * 0.2);
    dwcTroncoFront = { xLt, xRt, xLb, xRb, yt, yb, ySurf, xLs, xRs };
    airChamberTopY = yt;
    airChamberClipInner = `<polygon points="${xLt},${yt} ${xRt},${yt} ${xRs},${ySurf} ${xLs},${ySurf}"/>`;
    airChamberWaterLine = `${xLs.toFixed(1)},${ySurf.toFixed(1)} ${xRs.toFixed(1)},${ySurf.toFixed(1)}`;
    tankFrontalSvg =
      `<rect x="${tankX}" y="${tankStartY}" width="${tankW}" height="${rimH}" rx="5" fill="#f1f5f9" stroke="#64748b" stroke-width="1.3"/>` +
      `<polygon points="${xLt},${yt - 1} ${xRt},${yt - 1} ${xRt},${yt} ${xLt},${yt}" fill="#e2e8f0" stroke="#64748b" stroke-width="1.1"/>` +
      `<polygon points="${xLt},${yt} ${xRt},${yt} ${xRb},${yb} ${xLb},${yb}" fill="url(#dwcTankFace)" stroke="#64748b" stroke-width="1.35"/>` +
      `<g clip-path="url(#dwcTankInnerClip)">` +
      `<polygon points="${xLs},${ySurf} ${xRs},${ySurf} ${xRb},${yb} ${xLb},${yb}" fill="url(#dwcWaterGrad)"/>` +
      (ta
        ? `<path d="M ${xLs + (xRs - xLs) * 0.15} ${waveY} Q ${(xLs + xRs) / 2} ${waveY - 6} ${xRs - (xRs - xLs) * 0.18} ${waveY + 4}" fill="none" stroke="#bae6fd" stroke-width="1" opacity="0.45"><animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.6s" repeatCount="indefinite"/></path>`
        : '') +
      `</g>` +
      `<polygon points="${xLt},${yt} ${xRt},${yt} ${xRb},${yb} ${xLb},${yb}" fill="none" stroke="#0ea5e9" stroke-width="1.25" opacity="0.42"/>`;
  } else {
    clipPathInner = `<rect x="${innerX0}" y="${innerY0}" width="${innerW0}" height="${innerH0}" rx="5"/>`;
    waterTopY = innerY0 + innerH0 * (1 - volPctAguaDibujo);
    innerBottom = innerY0 + innerH0;
    waveY = innerY0 + innerH0 * 0.35;
    hx = innerX0 + 22;
    stoneX = innerX0 + innerW0 - 32;
    tankFrontalSvg =
      (SC ? SC.isoTopFace(tankX, tankStartY, tankW, rimH, 7) : '') +
      `<rect x="${tankX}" y="${tankStartY}" width="${tankW}" height="${rimH}" rx="5" fill="#cfd8dc" stroke="#455a64" stroke-width="1.5"/>` +
      `<rect x="${tankX + tankFaceInset}" y="${tankStartY + rimH - 2}" width="${tankW - tankFaceInset * 2}" height="${tankH - rimH + 6}" rx="10" fill="url(#dwcTankBlue)" stroke="#1565c0" stroke-width="2"/>` +
      `<g clip-path="url(#dwcTankInnerClip)">` +
      `<rect x="${innerX0}" y="${waterTopY.toFixed(1)}" width="${innerW0}" height="${(innerBottom - waterTopY).toFixed(1)}" fill="url(#dwcWaterGrad)"/>` +
      (ta
        ? `<path d="M ${innerX0 + 18} ${waveY} Q ${innerX0 + innerW0 / 2} ${innerY0 + innerH0 * 0.28} ${innerX0 + innerW0 - 22} ${innerY0 + innerH0 * 0.4}" fill="none" stroke="#b3e5fc" stroke-width="1.2" opacity="0.55"><animate attributeName="opacity" values="0.25;0.65;0.25" dur="2.6s" repeatCount="indefinite"/></path>`
        : '') +
      `</g>` +
      `<rect x="${innerX0}" y="${innerY0}" width="${innerW0}" height="${innerH0}" rx="6" fill="none" stroke="#4fc3f7" stroke-width="1.4" opacity="0.5"/>` +
      `<line x1="${(tankX + 4).toFixed(1)}" y1="${(tankStartY + 6).toFixed(1)}" x2="${(tankX + tankW - 4).toFixed(1)}" y2="${(tankStartY + 6).toFixed(1)}" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>`;
  }

  if (!esMulticubo && !airChamberClipInner) {
    const airH = Math.max(10, waterTopY - airChamberTopY);
    airChamberClipInner =
      `<rect x="${innerX0.toFixed(1)}" y="${airChamberTopY.toFixed(1)}" width="${innerW0.toFixed(1)}" height="${airH.toFixed(1)}" rx="4"/>`;
    airChamberWaterLine =
      `${innerX0.toFixed(1)},${waterTopY.toFixed(1)} ${(innerX0 + innerW0).toFixed(1)},${waterTopY.toFixed(1)}`;
  }

  const dwcSvgH = Math.max(H, tankGraphicBottom + 40);
  const dwcShowCamaraAire = !esMulticubo && !!airChamberClipInner;

  let s = '';
  const volEtiquetaTxt =
    esMulticubo && volPerCuboMc != null && Number.isFinite(volPerCuboMc)
      ? (typeof hcDiagramFormatVolL === 'function'
          ? hcDiagramFormatVolL(volPerCuboMc)
          : volPerCuboMc + ' L') +
        '/cubo · ' +
        S_mc +
        ' cubos'
      : typeof volEtiqueta === 'number' && Number.isFinite(volEtiqueta)
        ? typeof hcDiagramFormatVolL === 'function'
          ? hcDiagramFormatVolL(volEtiqueta)
          : volEtiqueta + ' L'
        : '—';
  let diagramViewLabels = '';
  if (typeof hcDiagramViewLabelSvg === 'function') {
    diagramViewLabels +=
      hcDiagramViewLabelSvg(planLeft + planW / 2, planTop - 6, 'cenital', { pointerEvents: false }) +
      hcDiagramViewLabelSvg(W / 2, planBottom + 24, 'frontal', { pointerEvents: false });
  }

  s += `<defs>
    ${
      SC
        ? `<linearGradient id="dwcScadaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5f6f8"/><stop offset="100%" stop-color="#e4e7eb"/></linearGradient>`
        : ''
    }
    <linearGradient id="dwcBgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e0f2fe"/><stop offset="42%" stop-color="#f0fdfa"/><stop offset="100%" stop-color="#eef2ff"/>
    </linearGradient>
    <linearGradient id="dwcMcCuboShell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
    <linearGradient id="dwcWaterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#81d4fa"/><stop offset="50%" stop-color="#29b6f6"/><stop offset="100%" stop-color="#0277bd"/>
    </linearGradient>
    <linearGradient id="dwcTankBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4fc3f7"/><stop offset="40%" stop-color="#29b6f6"/><stop offset="100%" stop-color="#1565c0"/>
    </linearGradient>
    <linearGradient id="dwcTankFace" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b3e5fc"/><stop offset="45%" stop-color="#4fc3f7"/><stop offset="100%" stop-color="#0288d1"/>
    </linearGradient>
    <linearGradient id="dwcPumpDome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffb74d"/><stop offset="100%" stop-color="#ff9800"/>
    </linearGradient>
    <linearGradient id="dwcLidTop" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8eef4"/>
    </linearGradient>
    <pattern id="dwcAirChamberPat" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="5" r="1.2" fill="#4dd0e1" opacity="0.45"/>
    </pattern>
    <clipPath id="dwcTankInnerClip">${clipPathInner}</clipPath>
    ${airChamberClipInner ? `<clipPath id="dwcAirChamberClip">${airChamberClipInner}</clipPath>` : ''}
    ${
      formaDwc === 'cilindrico'
        ? `<clipPath id="dwcLidPlanClipCyl"><circle cx="${(planLeft + planW / 2).toFixed(2)}" cy="${(planTop + planH / 2).toFixed(2)}" r="${Math.max(12, Math.min(planW, planH) / 2 - 1 - planPad).toFixed(2)}"/></clipPath>`
        : ''
    }
    ${esMulticubo && typeof rdwcScadaDefs === 'function' ? rdwcScadaDefs() : ''}
  </defs>`;

  s += `<rect width="${W}" height="${dwcSvgH}" fill="url(#dwcBgGrad)"/>`;

  /* ── Tapa vista cenital ── */
  const lidCxCyl = planLeft + planW / 2;
  const lidCyCyl = planTop + planH / 2;
  const lidROutCyl = Math.min(planW, planH) / 2 - 1;
  const lidRInCyl = Math.max(12, lidROutCyl - planPad);

  let dwcLidCylNoCabenOverlay = '';
  if (esMulticubo) {
    if (!mcPositions && typeof hcDwcMcComputePositions === 'function') {
      mcPositions = hcDwcMcComputePositions(mcLayoutDist, W, planTop, mcCubeSz, mcGapPlan);
    }
    const planPts = mcPositions ? mcPositions.positions : [];
    const hubCx = mcPositions ? mcPositions.cx : planLeft + planW / 2;
    const gridPlanBottom = mcPositions ? mcPositions.gridBottom : planTop + planH - mcAirBandH;
    const pumpPlanY = gridPlanBottom + 26;
    const valvePlanY = pumpPlanY + 8;
    let cubesPlanSvg = '';
    let hosesPlanSvg = '';
    const mcBucketR = Math.max(14, mcCubeSz / 2 - 2);
    const rPot = Math.max(12, Math.min(22, mcBucketR * 0.7));
    for (let idx = 0; idx < S_mc; idx++) {
      const P = planPts[idx];
      const cx = P ? P.cx : planInnerX + mcCubeSz / 2;
      const cy = P ? P.cy : planInnerY + mcCubeSz / 2;
      cubesPlanSvg += dwcSvgMcBucketRdwc(cx, cy, mcCubeSz, idx, ta);
      cubesPlanSvg += macetaSvg(0, idx, cx, cy, rPot, true, false);
    }
    const pumpPlan = dwcSvgAirPumpExternal(hubCx - 27, pumpPlanY, 1);
    const pumpOut = pumpPlan.outlets[0] || { x: hubCx, y: pumpPlanY + 12 };
    if (tieneDifusor && planPts.length) {
      hosesPlanSvg += dwcSvgMcAirHosesPlan(planPts, pumpOut.x, valvePlanY, mcBucketR, ta, SC);
    }
    if (SC) {
      s += SC.sectionPanel(planLeft - 10, planTop - 10, planW + 20, planH + 6, 12);
      s += SC.sectionPanel(tankX - 10, tankStartY - 10, tankW + 20, tankGraphicBottom - tankStartY + 24, 12);
    }
    if (mcRows >= 2 && SC && SC.sectionLabel) {
      const lblY = mcPositions ? mcPositions.gridTop + (mcPositions.gridBottom - mcPositions.gridTop) / 2 : planTop + planH * 0.42;
      s +=
        `<text x="20" y="${lblY.toFixed(1)}" font-size="10" font-weight="800" fill="#475569" font-family="Syne,sans-serif" text-anchor="middle" transform="rotate(-90 20,${lblY.toFixed(1)})" pointer-events="none">${mcRows} FILAS</text>`;
    }
    s += cubesPlanSvg + hosesPlanSvg + pumpPlan.svg;
    if (volPerCuboMc != null && Number.isFinite(volPerCuboMc)) {
      s +=
        `<text x="${hubCx.toFixed(1)}" y="${(pumpPlanY + pumpPlan.h + 14).toFixed(1)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" font-weight="600" fill="#64748b" pointer-events="none">` +
        `${Math.round(volPerCuboMc * 10) / 10} L/cubo · multiválvula solo aire a difusoras</text>`;
    }
  } else {
    if (formaDwc === 'cilindrico') {
      const rimMm = Number(cfg.dwcNetPotRimMm);
      const Lcm = Number(cfg.dwcDepositoLargoCm);
      const Wcm = Number(cfg.dwcDepositoAnchoCm);
      let marcoMm = 0;
      let huecoMm = 4;
      if (cfg.dwcTapaMarcoPorLadoMm != null && Number.isFinite(Number(cfg.dwcTapaMarcoPorLadoMm)) && Number(cfg.dwcTapaMarcoPorLadoMm) >= 0) {
        marcoMm = Number(cfg.dwcTapaMarcoPorLadoMm);
      }
      if (cfg.dwcTapaHuecoMm != null && Number.isFinite(Number(cfg.dwcTapaHuecoMm)) && Number(cfg.dwcTapaHuecoMm) >= 0) {
        huecoMm = Number(cfg.dwcTapaHuecoMm);
      }
      if (
        typeof dwcEvaluarCapestEnTapa === 'function' &&
        Number.isFinite(rimMm) &&
        rimMm > 0 &&
        Number.isFinite(Lcm) &&
        Number.isFinite(Wcm)
      ) {
        const evLid = dwcEvaluarCapestEnTapa(1, 1, rimMm, Lcm, Wcm, marcoMm, huecoMm, 'cilindrico');
        if (evLid.estado === 'no') {
          const rArm = lidRInCyl * 0.72;
          const cx = lidCxCyl;
          const cy = lidCyCyl;
          dwcLidCylNoCabenOverlay =
            `<g class="dwc-lid-cyl-no-caben" pointer-events="none" aria-hidden="true">` +
            `<line x1="${(cx - rArm).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + rArm).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#dc2626" stroke-width="3.2" stroke-linecap="round"/>` +
            `<line x1="${cx.toFixed(1)}" y1="${(cy - rArm).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy + rArm).toFixed(1)}" stroke="#dc2626" stroke-width="3.2" stroke-linecap="round"/>` +
            `<text x="${cx.toFixed(1)}" y="${(cy + lidRInCyl * 0.28).toFixed(1)}" text-anchor="middle" fill="#991b1b" font-size="9" font-weight="800" font-family="Syne,sans-serif">No caben en tapa</text>` +
            `</g>`;
        }
      }
    }

    if (formaDwc === 'cilindrico') {
      s +=
        `<circle cx="${lidCxCyl.toFixed(2)}" cy="${lidCyCyl.toFixed(2)}" r="${lidROutCyl.toFixed(2)}" fill="url(#dwcLidTop)" stroke="#64748b" stroke-width="1.5" filter="drop-shadow(0 3px 10px rgba(15,23,42,0.08))"/>`;
    } else {
      s += `<rect x="${planLeft}" y="${planTop}" width="${planW}" height="${planH}" rx="14" fill="url(#dwcLidTop)" stroke="#64748b" stroke-width="1.5" filter="drop-shadow(0 3px 10px rgba(15,23,42,0.08))"/>`;
      s += `<rect x="${planInnerX}" y="${planInnerY}" width="${planInnerW}" height="${planInnerH}" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>`;
      if (formaDwc === 'troncopiramidal') {
        const topInPlan = 18;
        const botW = planW - 36;
        const cxP = planLeft + planW / 2;
        const yT = planTop + 4;
        const yB = planTop + planH - 4;
        s += `<path d="M ${cxP - (planW - 2 * topInPlan) / 2} ${yT} L ${cxP + (planW - 2 * topInPlan) / 2} ${yT} L ${cxP + botW / 2} ${yB} L ${cxP - botW / 2} ${yB} Z"
          fill="none" stroke="#475569" stroke-width="1.25" opacity="0.5"/>`;
      } else {
        const isCubePlan = dep.L != null && dep.W != null && Math.abs(dep.L - dep.W) / Math.max(dep.L, dep.W) <= 0.06;
        if (isCubePlan) {
          const side = Math.min(planInnerW, planInnerH) * 0.76;
          const ox = planInnerX + (planInnerW - side) / 2;
          const oy = planInnerY + (planInnerH - side) / 2;
          s += `<rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${side.toFixed(1)}" height="${side.toFixed(1)}" rx="7" fill="none" stroke="#64748b" stroke-width="1.15" opacity="0.48"/>`;
        } else if (dep.L != null && dep.W != null) {
          const sk = Math.min(16, planInnerW * 0.09);
          s += `<path d="M ${(planInnerX + sk).toFixed(1)} ${planInnerY.toFixed(1)} L ${(planInnerX + planInnerW).toFixed(1)} ${planInnerY.toFixed(1)} L ${(planInnerX + planInnerW - sk * 0.5).toFixed(1)} ${(planInnerY + planInnerH).toFixed(1)} L ${planInnerX.toFixed(1)} ${(planInnerY + planInnerH).toFixed(1)} Z"
            fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" opacity="0.52"/>`;
        }
      }
    }
    if (!esCilindricoDwc) {
      for (let gi = 1; gi < cDraw; gi++) {
        const x = planInnerX + gi * cellW;
        s += `<line x1="${x.toFixed(1)}" y1="${planInnerY}" x2="${x.toFixed(1)}" y2="${planInnerY + planInnerH}" stroke="#e2e8f0" stroke-width="1"/>`;
      }
      for (let gj = 1; gj < nDraw; gj++) {
        const y = planInnerY + gj * cellH;
        s += `<line x1="${planInnerX}" y1="${y.toFixed(1)}" x2="${planInnerX + planInnerW}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`;
      }
    }

    for (let n = 0; n < nDraw; n++) {
      for (let c = 0; c < cDraw; c++) {
        const cx = esCilindricoDwc ? lidCxCyl : planInnerX + (c + 0.5) * cellW;
        const cy = esCilindricoDwc ? lidCyCyl : planInnerY + (n + 0.5) * cellH;
        s += macetaSvg(n, c, cx, cy, Rpot, true);
      }
    }
    if (formaDwc === 'cilindrico') {
      s += dwcLidCylNoCabenOverlay;
    }
  }

  /* Separador cenital → frontal */
  const sepY = planBottom + 30;
  s += `<line x1="36" y1="${sepY}" x2="${W - 36}" y2="${sepY}" stroke="${Dw.sep}" stroke-width="1" stroke-dasharray="5 4"/>`;

  /* ── Alzado depósito (prisma / cubo isométrico, tronco piramidal o cilindro) ── */
  s += tankFrontalSvg;
  if (!esMulticubo) {
    s += dwcSvgTapaHuecosFrontal(tankX, tankStartY, tankW, rimH, nDraw, cDraw, esCilindricoDwc, W);
  }
  const stoneY = innerBottom - 10;

  if (tieneCalentador && !esMulticubo) {
    let hxCal;
    let hTop;
    let hH;
    if (dwcTroncoFront) {
      const tr = dwcTroncoFront;
      const hBot = tr.yb - 7;
      hH = Math.min(34, Math.max(14, hBot - tr.ySurf - 10));
      hTop = hBot - hH;
      if (hTop < tr.ySurf + 5) {
        hTop = tr.ySurf + 5;
        hH = Math.max(10, hBot - hTop);
      }
      const hMid = hTop + hH / 2;
      hxCal = dwcTroncoXRightAtY(tr, hMid) - 11;
    } else {
      hxCal = innerX0 + innerW0 - 14;
      hTop = Math.max(waterTopY + 6, innerBottom - 40);
      hH = innerBottom - hTop - 5;
    }
    if (hH > 8) {
      s +=
        `<rect x="${(hxCal - 4).toFixed(1)}" y="${hTop.toFixed(1)}" width="8" height="${hH.toFixed(1)}" rx="4" fill="${Dw.calFill}" stroke="${Dw.calStroke}" stroke-width="1" opacity="0.92"/>`;
    }
  }

  if (tieneDifusor && !esMulticubo) {
    const stoneN = dwcSvgNumPiedrasDifusor(cfg);
    const pumpX = tankX + tankW + 14;
    const pumpY = tankStartY + 14;
    const pump = dwcSvgAirPumpExternal(pumpX, pumpY, stoneN);
    s += pump.svg;
    const entryBaseY = tankStartY + tankH * 0.56;
    const entryStep = stoneN > 1 ? Math.min(16, tankH * 0.14) : 0;
    const stonePts = [];
    for (let st = 0; st < stoneN; st++) {
      let sx;
      if (dwcTroncoFront) {
        const tr = dwcTroncoFront;
        sx = tr.xLb + ((st + 0.5) / stoneN) * (tr.xRb - tr.xLb);
      } else {
        sx = innerX0 + ((st + 0.5) / stoneN) * innerW0;
      }
      stonePts.push({ x: sx, y: stoneY });
      const entryY = entryBaseY + (st - (stoneN - 1) / 2) * entryStep;
      const wallX = dwcTroncoFront ? dwcTroncoXRightAtY(dwcTroncoFront, entryY) : tankX + tankW;
      const out = pump.outlets[st] || pump.outlets[0];
      if (SC) {
        const bow = Math.max(16, Math.abs(wallX - out.x) * 0.34);
        const hoseD =
          `M ${out.x.toFixed(1)} ${out.y.toFixed(1)} ` +
          `C ${(out.x - bow).toFixed(1)} ${out.y.toFixed(1)} ${(wallX + bow * 0.22).toFixed(1)} ${entryY.toFixed(1)} ${wallX.toFixed(1)} ${entryY.toFixed(1)} ` +
          `L ${sx.toFixed(1)} ${stoneY.toFixed(1)}`;
        s += SC.flowPath(hoseD, ta, stoneN === 1 ? 2.4 : 2);
        s += SC.flowArrow(wallX, entryY, sx, stoneY, ta);
      } else {
        s += dwcSvgAirHosePumpToStone(
          out.x,
          out.y,
          wallX,
          entryY,
          sx,
          stoneY,
          stoneN === 1 ? 2.4 : 2,
          stoneN === 1 ? 0.95 : 0.85
        );
      }
    }
    for (let si = 0; si < stonePts.length; si++) {
      const sp = stonePts[si];
      s += `<ellipse cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" rx="13" ry="6.5" fill="${Dw.airStoneFill}" stroke="${Dw.airStoneStroke}" stroke-width="1.1"/>`;
    }
    if (ta) {
      for (let i = 0; i < 8; i++) {
        const sp = stonePts[i % stonePts.length];
        const dx = (i % 5 - 2) * 4;
        const delay = (i * 0.2).toFixed(2);
        const dur = (1.05 + i * 0.1).toFixed(2);
        const y0 = stoneY - 4;
        const y1 = waterTopY + 8;
        s += `<circle cx="${(sp.x + dx).toFixed(1)}" cy="${y0}" r="${1.4 + (i % 2) * 0.6}" fill="${Dw.bubble}" opacity="0">
          <animate attributeName="cy" from="${y0}" to="${y1}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="linear"/>
          <animate attributeName="opacity" values="0;0.9;0.9;0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        </circle>`;
      }
    }
  }
  if (dwcShowCamaraAire) {
    s += dwcSvgCamaraAireOverlay(airChamberWaterLine);
  }
  if (tieneDifusor && esMulticubo && dwcMcAirPts && dwcMcAirPts.length) {
    if (ta) {
      let bi = 0;
      for (const pt of dwcMcAirPts) {
        if (bi >= 5) break;
        for (let j = 0; j < 2; j++) {
          const dx = (j - 0.5) * 3.5;
          const delay = ((bi * 2 + j) * 0.18).toFixed(2);
          const dur = (1.1 + (bi + j) * 0.08).toFixed(2);
          const y0 = pt.stoneY - 3;
          const y1 = pt.waterTop + 6;
          s += `<circle cx="${pt.cx + dx}" cy="${y0}" r="1.2" fill="${Dw.bubble}" opacity="0">
            <animate attributeName="cy" from="${y0}" to="${y1}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="linear"/>
            <animate attributeName="opacity" values="0;0.85;0.85;0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
          </circle>`;
        }
        bi++;
      }
    }
  }

  const volCol =
    esMulticubo && volPerCuboMc != null
      ? '#0369a1'
      : typeof volEtiqueta === 'number' && Number.isFinite(volEtiqueta)
        ? volEtiqueta < 6
          ? Dw.volLow
          : volEtiqueta < 12
            ? Dw.volMid
            : Dw.volOk
        : '#64748b';
  const volBottomY = tankGraphicBottom + 24;
  if (typeof hcDiagramVolLabelSvg === 'function') {
    s += hcDiagramVolLabelSvg(
      W / 2,
      volBottomY,
      esMulticubo && volPerCuboMc != null && Number.isFinite(volPerCuboMc) ? volPerCuboMc : volEtiqueta,
      { fill: volCol, fontSize: esMulticubo ? 17 : 19, pointerEvents: false }
    );
    if (esMulticubo && volPerCuboMc != null) {
      s += `<text x="${W / 2}" y="${volBottomY + 14}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="600" fill="#64748b" pointer-events="none">por cubo · ${S_mc} cubos</text>`;
    }
  } else {
    s += `<text x="${W / 2}" y="${volBottomY}" font-family="Syne,sans-serif" font-size="19" font-weight="900" fill="${volCol}" text-anchor="middle">${volEtiquetaTxt}</text>`;
  }

  const pad = 14;
  const vbW = W + pad * 2;
  const vbH = dwcSvgH + pad * 2;
  s += diagramViewLabels;

  const dwcSvgClass =
    'torre-svg-diagram dwc-svg-diagram svg-centered-block' +
    (SC ? ' dwc-svg-diagram--scada' : '') +
    (esMulticubo ? ' dwc-svg-diagram--multicubo dwc-svg-diagram--multicubo-rdwc' : '') +
    (esMcCilindrico ? ' dwc-svg-diagram--multicubo-cyl' : ' dwc-svg-diagram--multicubo-prism');
  return (
    `<svg class="${dwcSvgClass}" width="${W}" height="${dwcSvgH}" viewBox="${-pad} ${-pad} ${vbW} ${vbH}" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dwcDiagTitle">` +
    `<title id="dwcDiagTitle">DWC · ${volEtiquetaTxt} · vista cenital y frontal</title>${s}</svg>`
  );
}
  function buildDwcDiagramSvg(cfg, torre, opts) {
    opts = opts || {};
    var prevCfg = typeof state !== 'undefined' ? state.configTorre : null;
    var prevTorre = typeof state !== 'undefined' ? state.torre : null;
    if (typeof state !== 'undefined') {
      if (cfg) state.configTorre = cfg;
      if (torre) state.torre = torre;
    }
    try {
      return generarSVGDwc();
    } finally {
      if (typeof state !== 'undefined') {
        state.configTorre = prevCfg;
        state.torre = prevTorre;
      }
    }
  }

  global.buildDwcDiagramSvg = buildDwcDiagramSvg;
  global.generarSVGDwc = generarSVGDwc;
  global.dwcSvgDepDimsDesdeCfg = dwcSvgDepDimsDesdeCfg;
  global.dwcSvgAirPumpExternal = dwcSvgAirPumpExternal;
  global.dwcSvgAirHosePumpToStone = dwcSvgAirHosePumpToStone;

  /** Bomba unificada con cúpula naranja sólida (sin depender de #dwcPumpDome en el documento). */
  function dwcSvgAirPumpDraw(px, py, scale) {
    const sc = Number.isFinite(Number(scale)) ? Math.max(0.72, Math.min(1.15, Number(scale))) : 1;
    const x = Number(px) || 0;
    const y = Number(py) || 0;
    if (typeof dwcSvgAirPumpExternal === 'function') {
      const pump = dwcSvgAirPumpExternal(0, 0, 1);
      const inner = pump.svg.replace(/fill="url\(#dwcPumpDome\)"/g, 'fill="#ff9800"');
      return {
        svg:
          '<g class="dwc-unified-air-pump" transform="translate(' +
          x.toFixed(1) +
          ' ' +
          y.toFixed(1) +
          ') scale(' +
          sc.toFixed(3) +
          ')">' +
          inner +
          '</g>',
        outlets: pump.outlets.map(function (o) {
          return { x: x + o.x * sc, y: y + o.y * sc };
        }),
      };
    }
    const w = 54 * sc;
    const h = 40 * sc;
    const cx = x + w / 2;
    return {
      svg:
        '<g class="dwc-unified-air-pump" transform="translate(' +
        x.toFixed(1) +
        ' ' +
        y.toFixed(1) +
        ') scale(' +
        sc.toFixed(3) +
        ')" pointer-events="none">' +
        '<ellipse cx="' +
        (w / 2).toFixed(1) +
        '" cy="' +
        (h + 6 * sc).toFixed(1) +
        '" rx="' +
        (w * 0.4).toFixed(1) +
        '" ry="' +
        (4.5 * sc).toFixed(1) +
        '" fill="rgba(15,23,42,0.14)"/>' +
        '<rect x="' +
        (4 * sc).toFixed(1) +
        '" y="' +
        (15 * sc).toFixed(1) +
        '" width="' +
        (w - 8 * sc).toFixed(1) +
        '" height="' +
        (h - 11 * sc).toFixed(1) +
        '" rx="' +
        (5 * sc).toFixed(1) +
        '" fill="#37474f" stroke="#1e293b" stroke-width="1.8"/>' +
        '<ellipse cx="' +
        (w / 2).toFixed(1) +
        '" cy="' +
        (12 * sc).toFixed(1) +
        '" rx="' +
        ((w - 10 * sc) / 2).toFixed(1) +
        '" ry="' +
        (13 * sc).toFixed(1) +
        '" fill="#ff9800" stroke="#e65100" stroke-width="2"/>' +
        '<circle cx="' +
        (w / 2).toFixed(1) +
        '" cy="' +
        (h * 0.52).toFixed(1) +
        '" r="' +
        (9 * sc).toFixed(1) +
        '" fill="#eceff1" stroke="#78909c" stroke-width="1.2"/>' +
        '</g>',
      outlets: [{ x: x, y: y + (12 + 0.55 * 34) * sc }],
    };
  }

  global.dwcSvgAirPumpDraw = dwcSvgAirPumpDraw;

  /** Solo el icono de bomba de aire torre (cúpula naranja), sin manguera — p. ej. ilustraciones compactas. */
  function hcSvgAirPumpTorreBlock(px, py, scale) {
    if (typeof dwcSvgAirPumpDraw === 'function') {
      return dwcSvgAirPumpDraw(px, py, scale).svg;
    }
    if (typeof dwcSvgAirPumpExternal === 'function') {
      const pump = dwcSvgAirPumpExternal(0, 0, 1);
      const sc = Number.isFinite(Number(scale)) ? Math.max(0.72, Math.min(1.15, Number(scale))) : 1;
      const inner = pump.svg.replace(/fill="url\(#dwcPumpDome\)"/g, 'fill="#ff9800"');
      return (
        '<g class="hc-air-pump-torre" transform="translate(' +
        (Number(px) || 0).toFixed(1) +
        ' ' +
        (Number(py) || 0).toFixed(1) +
        ') scale(' +
        sc.toFixed(3) +
        ')">' +
        inner +
        '</g>'
      );
    }
    return '';
  }
  global.hcSvgAirPumpTorreBlock = hcSvgAirPumpTorreBlock;
})(typeof window !== 'undefined' ? window : globalThis);
