/**
 * Modelo hidráulico NFT: topología del circuito → waypoints → SVG.
 * Una sola fuente de verdad para alimentación (serie/ramas) y retorno al depósito.
 */
(function (global) {
  'use strict';

  function fq(v) {
    const n = Math.round(Number(v) * 100) / 100;
    return Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(2);
  }

  function pushWp(list, x, y) {
    if (!list.length) {
      list.push([x, y]);
      return;
    }
    const last = list[list.length - 1];
    if (Math.abs(last[0] - x) > 0.5 || Math.abs(last[1] - y) > 0.5) list.push([x, y]);
  }

  /** @returns {{ xFeedRiser: number, xReturnRiser: number, oddTubes: boolean }} */
  function nftHydraulicRisers(p) {
    const oddTubes = p.oddTubes != null ? p.oddTubes : p.nTubos % 2 === 1;
    const flowMargin = p.flowMargin != null ? p.flowMargin : 10;
    const riserSep = 16;
    const xFeedRiser =
      p.xFeedRiser != null
        ? p.xFeedRiser
        : Math.max(12, p.xL - flowMargin - (oddTubes ? 0 : riserSep));
    const xReturnRiser =
      p.xReturnRiser != null
        ? p.xReturnRiser
        : oddTubes
          ? Math.min(p.Wsvg - 14, p.xR + flowMargin)
          : Math.max(xFeedRiser + 10, Math.min(p.xL - 4, xFeedRiser + riserSep));
    return { xFeedRiser: xFeedRiser, xReturnRiser: xReturnRiser, oddTubes: oddTubes };
  }

  function returnWaypointsFromExit(p) {
    const ports = p.ports;
    const xExit = p.xExit;
    const yExit = p.yExit;
    const xL = p.xL;
    const xR = p.xR;
    const flowMargin = p.flowMargin != null ? p.flowMargin : 10;
    const risers = nftHydraulicRisers(p);
    const xFeedRiser = p.xFeedRiser != null ? p.xFeedRiser : risers.xFeedRiser;
    const xReturnRiser = p.xReturnRiser != null ? p.xReturnRiser : risers.xReturnRiser;
    const oddTubes = risers.oddTubes;
    const tankY = p.tankY;
    const tubeH = p.tubeH != null ? p.tubeH : 22;
    const endsRight = p.endsRight != null ? p.endsRight : xExit > (xL + xR) / 2;
    const wp = [];
    wp.push([xExit, yExit]);
    let yDuctRun = yExit + tubeH / 2 + (p.ductDrop != null ? p.ductDrop : 28);
    if (yDuctRun > tankY - 10) yDuctRun = tankY - 12;
    if (oddTubes) {
      const xJog = endsRight
        ? Math.min(xReturnRiser + 8, xR + flowMargin + 20)
        : Math.max(xReturnRiser - 8, xFeedRiser - 10);
      pushWp(wp, xJog, yExit);
      pushWp(wp, xJog, yDuctRun);
      pushWp(wp, xReturnRiser, yDuctRun);
    } else {
      pushWp(wp, xReturnRiser, yExit);
      pushWp(wp, xReturnRiser, yDuctRun);
    }
    pushWp(wp, ports.xReturn, yDuctRun);
    pushWp(wp, ports.xReturn, ports.yInlet);
    return wp;
  }

  function waypointsToSvg(waypoints, opts) {
    opts = opts || {};
    if (!waypoints || !waypoints.length) return '';
    const er = opts.cornerRadius != null ? opts.cornerRadius : 0;
    if (!er || waypoints.length < 2) {
      let d = 'M ' + fq(waypoints[0][0]) + ' ' + fq(waypoints[0][1]);
      for (let i = 1; i < waypoints.length; i++) {
        d += ' L ' + fq(waypoints[i][0]) + ' ' + fq(waypoints[i][1]);
      }
      return d;
    }
    let d = 'M ' + fq(waypoints[0][0]) + ' ' + fq(waypoints[0][1]);
    let lx = waypoints[0][0];
    let ly = waypoints[0][1];
    const Lto = function (x, y) {
      d += ' L ' + fq(x) + ' ' + fq(y);
      lx = x;
      ly = y;
    };
    const Arc = function (ex, ey, sw) {
      d += ' A ' + fq(er) + ' ' + fq(er) + ' 0 0 ' + sw + ' ' + fq(ex) + ' ' + fq(ey);
      lx = ex;
      ly = ey;
    };
    for (let pi = 1; pi < waypoints.length; pi++) {
      const tx = waypoints[pi][0];
      const ty = waypoints[pi][1];
      if (Math.abs(lx - tx) < 0.8 && Math.abs(ly - ty) < 0.8) continue;
      if (Math.abs(lx - tx) < 0.8) {
        Lto(tx, ty);
        continue;
      }
      if (Math.abs(ly - ty) < 0.8) {
        Lto(tx, ty);
        continue;
      }
      const sx = tx > lx ? 1 : -1;
      const sy = ty > ly ? 1 : -1;
      if (Math.abs(ty - ly) > er && Math.abs(tx - lx) > er) {
        Lto(lx, ty - sy * er);
        const swK = sx > 0 ? (sy > 0 ? 1 : 0) : sy > 0 ? 0 : 1;
        Arc(lx + sx * er, ty, swK);
        Lto(tx, ty);
      } else {
        Lto(lx, ty);
        Lto(tx, ty);
      }
    }
    return d;
  }

  function pathsToSvg(pathList, opts) {
    const parts = [];
    for (let i = 0; i < pathList.length; i++) {
      const seg = waypointsToSvg(pathList[i], opts);
      if (seg) parts.push(seg);
    }
    return parts.join(' ');
  }

  /** Serpentín vertical (pared / mesa 1 nivel): circuito en serie. */
  function serpentineWaypoints(p) {
    const nCh = p.nCh;
    const yRow = p.yRow;
    const xL = p.xL;
    const xR = p.xR;
    const padFlow = p.padFlow;
    const flowMargin = p.flowMargin;
    const ports = p.ports;
    const risers = nftHydraulicRisers(p);
    const xFeedRiser = risers.xFeedRiser;

    const supply = [];
    pushWp(supply, p.xPump, p.yPump);
    pushWp(supply, ports.xFeed, p.yPump);
    pushWp(supply, ports.xFeed, ports.yOutlet);
    pushWp(supply, xFeedRiser, ports.yOutlet);
    pushWp(supply, xFeedRiser, yRow(0));

    for (let i = 0; i < nCh; i++) {
      const y = yRow(i);
      const l2r = i % 2 === 0;
      const xIn = l2r ? xL + padFlow : xR - padFlow;
      const xOut = l2r ? xR - padFlow : xL + padFlow;
      pushWp(supply, xIn, y);
      pushWp(supply, xOut, y);
      if (i < nCh - 1) {
        const xDrop = l2r ? xR - padFlow + flowMargin : xL + padFlow - flowMargin;
        const l2rN = (i + 1) % 2 === 0;
        const xNextIn = l2rN ? xL + padFlow : xR - padFlow;
        pushWp(supply, xDrop, y);
        pushWp(supply, xDrop, yRow(i + 1));
        pushWp(supply, xNextIn, yRow(i + 1));
      }
    }

    const yLast = yRow(nCh - 1);
    const endsRight = (nCh - 1) % 2 === 0;
    const xExit = endsRight ? xR - padFlow : xL + padFlow;
    const retWp = returnWaypointsFromExit({
      xExit: xExit,
      yExit: yLast,
      xL: xL,
      xR: xR,
      padFlow: padFlow,
      flowMargin: flowMargin,
      oddTubes: risers.oddTubes,
      xFeedRiser: xFeedRiser,
      xReturnRiser: risers.xReturnRiser,
      Wsvg: p.Wsvg,
      tankY: p.tankY,
      ports: ports,
      tubeH: p.tubeH,
      endsRight: endsRight,
    });

    return { supply: supply, return: retWp, xExit: xExit, xFeedRiser: xFeedRiser, xReturnRiser: risers.xReturnRiser };
  }

  function nftHydraulicSerpentine(p) {
    const ports =
      p.ports ||
      (typeof nftSvgTankPorts === 'function'
        ? nftSvgTankPorts(p.tx, p.tankW, p.tankY, p.tankH, p.nCh)
        : null);
    if (!ports) return { supplyD: '', returnD: '', ports: null };
    const spec = Object.assign({}, p, { ports: ports, nTubos: p.nCh });
    const w = serpentineWaypoints(spec);
    const corner = p.cornerRadius != null ? p.cornerRadius : 0;
    return {
      supplyD: waypointsToSvg(w.supply, { cornerRadius: corner }),
      returnD: waypointsToSvg(w.return, { cornerRadius: corner }),
      ports: ports,
      xFeedRiser: w.xFeedRiser,
      xReturnRiser: w.xReturnRiser,
      xExitSerp: w.xExit,
      supplyWaypoints: w.supply,
      returnWaypoints: w.return,
    };
  }

  function zigzagRunWaypoints(runList, padFlow, flowMargin, outerSide) {
    const wp = [];
    const xDropAt = function (R) {
      return outerSide === 'R' ? R.xR - padFlow + flowMargin : R.xL + padFlow - flowMargin;
    };
    for (let i = 0; i < runList.length; i++) {
      const R = runList[i];
      const Rn = i < runList.length - 1 ? runList[i + 1] : null;
      const xS = R.rtl ? R.xR - padFlow : R.xL + padFlow;
      const xE = R.rtl ? R.xL + padFlow : R.xR - padFlow;
      pushWp(wp, xS, R.y);
      pushWp(wp, xE, R.y);
      if (Rn) {
        pushWp(wp, xDropAt(R), R.y);
        pushWp(wp, xDropAt(R), Rn.y);
        pushWp(wp, Rn.rtl ? Rn.xR - padFlow : Rn.xL + padFlow, Rn.y);
      }
    }
    return wp;
  }

  function faceInnerX(R, face, padFlow) {
    return face === 'L' ? R.xR - padFlow : R.xL + padFlow;
  }

  function faceOuterX(R, face, padFlow) {
    return face === 'L' ? R.xL + padFlow : R.xR - padFlow;
  }

  function drainWaypoints(xFrom, yFrom, xLeg, xTankX, yInlet, ladderBot) {
    const wp = [];
    pushWp(wp, xFrom, yFrom);
    pushWp(wp, xLeg, yFrom);
    const yBase = ladderBot + 8;
    pushWp(wp, xLeg, yBase);
    pushWp(wp, xTankX, yBase);
    pushWp(wp, xTankX, yInlet);
    return wp;
  }

  /** Escalera / A-frame: 1 cara (serie) o 2 caras (T central, ramas en paralelo). */
  function nftHydraulicEscalera(p) {
    const runs = p.runs || [];
    const nv = p.nv;
    const car = p.car;
    const padFlow = p.padFlow;
    const flowMargin = p.flowMargin != null ? p.flowMargin : 8;
    const er = p.cornerRadius != null ? p.cornerRadius : 14;
    const nTubosTotal = car === 2 ? nv * 2 : nv;
    const ports =
      p.ports ||
      (car === 2
        ? {
            xFeed: p.xTankFeed,
            yOutlet: p.yOutlet,
            yInlet: p.yInlet,
            odd: nTubosTotal % 2 === 1,
          }
        : typeof nftSvgTankPorts === 'function'
          ? nftSvgTankPorts(p.tx, p.tankW, p.tankY, p.tankH, nv)
          : null);

    const supplyPaths = [];
    const returnPaths = [];

    if (!runs.length) {
      return { supplyD: '', returnD: '', ports: ports, supplyPaths: [], returnPaths: [] };
    }

    if (car === 2) {
      const runsL = runs.slice(0, nv);
      const runsR = runs.slice(nv);
      const yManifold = p.yManifold;
      const retAlCentro = p.retAlCentro;
      const supHead = [];
      pushWp(supHead, p.xPump, p.yPump);
      pushWp(supHead, p.xTankFeed, p.yPump);
      pushWp(supHead, p.xTankFeed, p.yOutlet);
      pushWp(supHead, p.xSupplyRiser, p.yOutlet);
      pushWp(supHead, p.xSupplyRiser, yManifold);

      const supL = supHead.slice();
      const R0L = runsL[0];
      pushWp(supL, faceInnerX(R0L, 'L', padFlow), yManifold);
      pushWp(supL, faceInnerX(R0L, 'L', padFlow), R0L.y);
      pushWp(supL, faceOuterX(R0L, 'L', padFlow), R0L.y);
      supL.push.apply(supL, zigzagRunWaypoints(runsL, padFlow, flowMargin, 'L'));
      supplyPaths.push(supL);

      const supR = [];
      pushWp(supR, p.xSupplyRiser, yManifold);
      const R0R = runsR[0];
      pushWp(supR, faceInnerX(R0R, 'R', padFlow), yManifold);
      pushWp(supR, faceInnerX(R0R, 'R', padFlow), R0R.y);
      pushWp(supR, faceOuterX(R0R, 'R', padFlow), R0R.y);
      supR.push.apply(supR, zigzagRunWaypoints(runsR, padFlow, flowMargin, 'R'));
      supplyPaths.push(supR);

      const RnL = runsL[nv - 1];
      const xEndL = retAlCentro ? faceInnerX(RnL, 'L', padFlow) : faceOuterX(RnL, 'L', padFlow);
      returnPaths.push(
        drainWaypoints(
          xEndL,
          RnL.y,
          retAlCentro ? p.cx : faceOuterX(RnL, 'L', padFlow),
          retAlCentro ? p.xTankReturnCenter : p.xTankReturnL,
          p.yInlet,
          p.ladderBot
        )
      );

      const RnR = runsR[nv - 1];
      const xEndR = retAlCentro ? faceInnerX(RnR, 'R', padFlow) : faceOuterX(RnR, 'R', padFlow);
      returnPaths.push(
        drainWaypoints(
          xEndR,
          RnR.y,
          retAlCentro ? p.cx : faceOuterX(RnR, 'R', padFlow),
          retAlCentro ? p.xTankReturnCenter : p.xTankReturnR,
          p.yInlet,
          p.ladderBot
        )
      );
    } else {
      const sup1 = [];
      pushWp(sup1, p.xPump, p.yPump);
      pushWp(sup1, p.xTankFeed, p.yPump);
      pushWp(sup1, p.xTankFeed, p.yOutlet);
      pushWp(sup1, p.xLegSupplyL, p.yOutlet);
      pushWp(sup1, p.xLegSupplyL, runs[0].y);
      const R0 = runs[0];
      pushWp(sup1, faceInnerX(R0, 'L', padFlow), R0.y);
      pushWp(sup1, faceOuterX(R0, 'L', padFlow), R0.y);
      sup1.push.apply(sup1, zigzagRunWaypoints(runs, padFlow, flowMargin, 'L'));
      supplyPaths.push(sup1);

      const Rn = runs[nv - 1];
      const xExit1 = Rn.rtl ? Rn.xL + padFlow : Rn.xR - padFlow;
      returnPaths.push(
        drainWaypoints(
          xExit1,
          Rn.y,
          p.oddEsc ? p.backX + 8 : p.xLegReturnEven,
          p.xTankReturn,
          p.yInlet,
          p.ladderBot
        )
      );
    }

    return {
      supplyD: pathsToSvg(supplyPaths, { cornerRadius: er }),
      returnD: pathsToSvg(returnPaths, { cornerRadius: er }),
      ports: ports,
      supplyPaths: supplyPaths,
      returnPaths: returnPaths,
    };
  }

  /**
   * Mesa multinivel o 1 nivel con varios tubos: serie según hydSeq.
   * p.buildMesaSegment(i) → waypoints para enlazar tubo i (opcional, si no se usa callbacks).
   */
  function nftHydraulicMesaMultinivel(p) {
    const er = p.cornerRadius != null ? p.cornerRadius : 0;
    const ports = p.ports;
    const supply = [];
    pushWp(supply, p.xPump, p.yPump);
    pushWp(supply, ports.xFeed, p.yPump);
    pushWp(supply, ports.xFeed, ports.yOutlet);
    pushWp(supply, p.xFeedRiser, ports.yOutlet);

    if (typeof p.appendSupplyThroughTubes === 'function') {
      p.appendSupplyThroughTubes(supply, pushWp);
    } else if (p.supplyExtension && p.supplyExtension.length) {
      for (let i = 0; i < p.supplyExtension.length; i++) {
        pushWp(supply, p.supplyExtension[i][0], p.supplyExtension[i][1]);
      }
    }

    let supplyD = waypointsToSvg(supply, { cornerRadius: er });
    if (p.supplyTailSvg && String(p.supplyTailSvg).trim()) {
      const tail = String(p.supplyTailSvg).trim();
      supplyD = supplyD ? supplyD + ' ' + tail : tail;
    }

    const retWp = returnWaypointsFromExit({
      xExit: p.xExit,
      yExit: p.yExit,
      xL: p.xL,
      xR: p.xR,
      flowMargin: p.flowMargin,
      oddTubes: p.oddTubes,
      xFeedRiser: p.xFeedRiser,
      xReturnRiser: p.xReturnRiser,
      Wsvg: p.Wsvg,
      tankY: p.tankY,
      ports: ports,
      tubeH: p.tubeH,
      ductDrop: p.ductDrop,
      endsRight: p.endsRight,
    });

    return {
      supplyD: supplyD,
      returnD: waypointsToSvg(retWp, { cornerRadius: er }),
      ports: ports,
      supplyWaypoints: supply,
      returnWaypoints: retWp,
    };
  }

  function nftHydraulicSolve(spec) {
    if (!spec || !spec.kind) return { supplyD: '', returnD: '' };
    if (spec.kind === 'serpentine') return nftHydraulicSerpentine(spec);
    if (spec.kind === 'escalera') return nftHydraulicEscalera(spec);
    if (spec.kind === 'mesa_multinivel') return nftHydraulicMesaMultinivel(spec);
    return { supplyD: '', returnD: '' };
  }

  global.nftHydraulicSolve = nftHydraulicSolve;
  global.nftHydraulicSerpentine = nftHydraulicSerpentine;
  global.nftHydraulicEscalera = nftHydraulicEscalera;
  global.nftHydraulicMesaMultinivel = nftHydraulicMesaMultinivel;
  global.nftHydraulicWaypointsToSvg = waypointsToSvg;
  global.nftHydraulicReturnWaypointsFromExit = returnWaypointsFromExit;
})(typeof window !== 'undefined' ? window : globalThis);
