/**
 * Modelo hidráulico NFT — única fuente de verdad del circuito de agua.
 * Topología → waypoints / segmentos (L + A) → paths SVG alimentación (azul) y retorno (verde).
 *
 * Montajes: serpentín (pared/mesa 1 nivel), escalera 1/2 caras, mesa multinivel.
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

  function pushSeg(segs, type, data) {
    segs.push(Object.assign({ t: type }, data));
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

  /** Segmentos L / A (codos en U de columnas mesa multinivel). */
  function segmentsToSvg(segments, opts) {
    if (!segments || !segments.length) return '';
    opts = opts || {};
    const erKnee = opts.cornerRadius != null ? opts.cornerRadius : 0;
    let d = '';
    let lx = null;
    let ly = null;

    const Lto = function (x, y) {
      if (lx == null) {
        d = 'M ' + fq(x) + ' ' + fq(y);
        lx = x;
        ly = y;
        return;
      }
      d += ' L ' + fq(x) + ' ' + fq(y);
      lx = x;
      ly = y;
    };

    const orthoKnee = function (tx, ty) {
      if (lx == null) {
        Lto(tx, ty);
        return;
      }
      if (Math.abs(lx - tx) < 0.8 && Math.abs(ly - ty) < 0.8) return;
      if (Math.abs(lx - tx) < 0.8) {
        Lto(tx, ty);
        return;
      }
      if (Math.abs(ly - ty) < 0.8) {
        Lto(tx, ty);
        return;
      }
      const sx = tx > lx ? 1 : -1;
      const sy = ty > ly ? 1 : -1;
      if (Math.abs(ty - ly) > erKnee && Math.abs(tx - lx) > erKnee) {
        Lto(lx, ty - sy * erKnee);
        const swK = sx > 0 ? (sy > 0 ? 1 : 0) : sy > 0 ? 0 : 1;
        d += ' A ' + fq(erKnee) + ' ' + fq(erKnee) + ' 0 0 ' + swK + ' ' + fq(lx + sx * erKnee) + ' ' + fq(ty);
        lx = lx + sx * erKnee;
        ly = ty;
        Lto(tx, ty);
      } else {
        Lto(lx, ty);
        Lto(tx, ty);
      }
    };

    for (let si = 0; si < segments.length; si++) {
      const s = segments[si];
      if (s.t === 'L') {
        if (opts.orthoKneeBetweenLines) orthoKnee(s.x, s.y);
        else Lto(s.x, s.y);
      } else if (s.t === 'A') {
        if (lx == null) {
          Lto(s.ex, s.ey);
        } else {
          d += ' A ' + fq(s.er) + ' ' + fq(s.er) + ' 0 0 ' + s.sw + ' ' + fq(s.ex) + ' ' + fq(s.ey);
          lx = s.ex;
          ly = s.ey;
        }
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

  /** Serpentín vertical (pared / mesa 1 nivel apilado). */
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
            xReturn: p.xTankReturnCenter,
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
   * Mesa: fila horizontal de tubos (1 nivel) — serpentín en X.
   * @returns {{ supply: number[][], xExit: number, yExit: number, endsRight: boolean }}
   */
  function mesaRowSupplyWaypoints(p) {
    const hydSeq = p.hydSeq || [];
    const geomByG = p.geomByG || {};
    const shelfFn = p.shelfFn;
    const flowMargin = p.flowMargin != null ? p.flowMargin : 10;
    const xFeedRiser = p.xFeedRiser;
    const supply = [];

    for (let i = 0; i < hydSeq.length; i++) {
      const Gcur = geomByG[hydSeq[i]];
      const H = shelfFn(Gcur);
      const l2r = i % 2 === 0;
      const xIn = l2r ? H.x0 : H.x1;
      const xOut = l2r ? H.x1 : H.x0;
      if (i === 0) {
        pushWp(supply, xFeedRiser, H.yC);
        pushWp(supply, xIn, H.yC);
        pushWp(supply, xOut, H.yC);
      } else {
        const Gprev = geomByG[hydSeq[i - 1]];
        const P = shelfFn(Gprev);
        const prevL2r = (i - 1) % 2 === 0;
        const prevOut = prevL2r ? P.x1 : P.x0;
        const xDrop = prevL2r ? P.x1 + flowMargin : P.x0 - flowMargin;
        if (Math.abs(H.yC - P.yC) > 0.5) {
          pushWp(supply, xDrop, P.yC);
          pushWp(supply, xDrop, H.yC);
        } else if (Math.abs(prevOut - xIn) > 0.5) {
          pushWp(supply, xDrop, H.yC);
        }
        if (Math.abs(prevOut - xIn) > 0.5 || Math.abs(H.yC - P.yC) <= 0.5) {
          pushWp(supply, xIn, H.yC);
        }
        pushWp(supply, xOut, H.yC);
      }
    }

    let xExit = xFeedRiser;
    let yExit = supply.length ? supply[supply.length - 1][1] : 0;
    let endsRight = true;
    if (hydSeq.length) {
      const Gl = geomByG[hydSeq[hydSeq.length - 1]];
      const Hl = shelfFn(Gl);
      const ll2r = (hydSeq.length - 1) % 2 === 0;
      xExit = ll2r ? Hl.x1 : Hl.x0;
      yExit = Hl.yC;
      endsRight = ll2r;
    }
    return { supply: supply, xExit: xExit, yExit: yExit, endsRight: endsRight };
  }

  /**
   * Mesa multinivel: columnas verticales con codos en U (segmentos L/A).
   * @returns {{ segments: object[], xExit: number, yExit: number }}
   */
  function mesaColumnSupplySegments(p) {
    const hydSeq = p.hydSeq || [];
    const geomByG = p.geomByG || {};
    const layoutFn = p.layoutFn;
    const xFeedRiser = p.xFeedRiser;
    const er = p.er != null ? p.er : 16;
    const segs = [];
    let lx = xFeedRiser;
    let ly = p.yOutletStart != null ? p.yOutletStart : 0;

    const Lto = function (x, y) {
      pushSeg(segs, 'L', { x: x, y: y });
      lx = x;
      ly = y;
    };
    const Arc = function (ex, ey, sw) {
      pushSeg(segs, 'A', { er: er, ex: ex, ey: ey, sw: sw });
      lx = ex;
      ly = ey;
    };
    const orthoKnee = function (tx, ty) {
      if (Math.abs(lx - tx) < 0.8 && Math.abs(ly - ty) < 0.8) return;
      if (Math.abs(lx - tx) < 0.8) {
        Lto(tx, ty);
        return;
      }
      if (Math.abs(ly - ty) < 0.8) {
        Lto(tx, ty);
        return;
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
    };

    for (let i = 0; i < hydSeq.length; i++) {
      const Gc = geomByG[hydSeq[i]];
      const Lc = layoutFn(Gc);
      const xC = Lc.xC;
      const yT = Lc.yTop;
      const yB = Lc.yBot;
      const Gn = i + 1 < hydSeq.length ? geomByG[hydSeq[i + 1]] : null;
      const xNext = Gn ? layoutFn(Gn).xC : null;
      let dir;
      if (Gn) {
        dir = xNext >= xC - 0.5 ? 1 : -1;
      } else if (i > 0) {
        const xPrev = layoutFn(geomByG[hydSeq[i - 1]]).xC;
        dir = xC >= xPrev - 0.5 ? 1 : -1;
      } else {
        dir = 1;
      }
      const up = i % 2 === 0;
      const xIn = xC - dir * er;
      const xOut = xC + dir * er;
      const yIn = up ? yB : yT;
      if (i === 0) {
        Lto(xFeedRiser, yB);
        Lto(xIn, yB);
      } else {
        const Gp = geomByG[hydSeq[i - 1]];
        const tierJump = Gp.t !== Gc.t;
        if (tierJump) {
          if (Math.abs(lx - xC) > 0.8) Lto(xC, ly);
          if (Math.abs(ly - yIn) > 0.8) Lto(xC, yIn);
          if (Math.abs(lx - xIn) > 0.8) Lto(xIn, yIn);
        } else {
          orthoKnee(xIn, yIn);
        }
      }
      if (up) {
        if (dir > 0) {
          Arc(xC, yB - er, 0);
          Lto(xC, yT + er);
          Arc(xOut, yT, 1);
        } else {
          Arc(xC, yB - er, 1);
          Lto(xC, yT + er);
          Arc(xOut, yT, 0);
        }
      } else {
        if (dir > 0) {
          Arc(xC, yT + er, 1);
          Lto(xC, yB - er);
          Arc(xOut, yB, 0);
        } else {
          Arc(xC, yT + er, 0);
          Lto(xC, yB - er);
          Arc(xOut, yB, 1);
        }
      }
    }
    return { segments: segs, xExit: lx, yExit: ly };
  }

  /** Mesa multinivel o 1 nivel: cabecera depósito + tubos + retorno. */
  function nftHydraulicMesaMultinivel(p) {
    const er = p.cornerRadius != null ? p.cornerRadius : 0;
    const ports = p.ports;
    const head = [];
    pushWp(head, p.xPump, p.yPump);
    pushWp(head, ports.xFeed, p.yPump);
    pushWp(head, ports.xFeed, ports.yOutlet);
    pushWp(head, p.xFeedRiser, ports.yOutlet);

    let xExit = p.xExit;
    let yExit = p.yExit;
    let endsRight = p.endsRight;
    let supplyBodyD = '';

    if (p.mesaColumns && p.mesaColumns.hydSeq && p.mesaColumns.hydSeq.length) {
      const mc = p.mesaColumns;
      const col = mesaColumnSupplySegments({
        hydSeq: mc.hydSeq,
        geomByG: mc.geomByG,
        layoutFn: mc.layoutFn,
        xFeedRiser: p.xFeedRiser,
        yOutletStart: ports.yOutlet,
        er: mc.er != null ? mc.er : 16,
      });
      const tailD = segmentsToSvg(col.segments, { orthoKneeBetweenLines: false });
      supplyBodyD = tailD;
      xExit = col.xExit;
      yExit = col.yExit;
      endsRight = xExit > (p.xL + p.xR) / 2;
    } else if (p.mesaRow && p.mesaRow.hydSeq && p.mesaRow.hydSeq.length) {
      const mr = mesaRowSupplyWaypoints({
        hydSeq: p.mesaRow.hydSeq,
        geomByG: p.mesaRow.geomByG,
        shelfFn: p.mesaRow.shelfFn,
        flowMargin: p.mesaRow.flowMargin,
        xFeedRiser: p.xFeedRiser,
      });
      supplyBodyD = waypointsToSvg(mr.supply, { cornerRadius: 0 });
      xExit = mr.xExit;
      yExit = mr.yExit;
      endsRight = mr.endsRight;
    } else if (p.supplyTailSvg && String(p.supplyTailSvg).trim()) {
      supplyBodyD = String(p.supplyTailSvg).trim();
    }

    let supplyD = waypointsToSvg(head, { cornerRadius: 0 });
    if (supplyBodyD) {
      supplyD = supplyD ? supplyD + ' ' + supplyBodyD : supplyBodyD;
    }

    const retWp = returnWaypointsFromExit({
      xExit: xExit,
      yExit: yExit,
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
      endsRight: p.endsRight != null ? p.endsRight : endsRight,
    });

    return {
      supplyD: supplyD,
      returnD: waypointsToSvg(retWp, { cornerRadius: er }),
      ports: ports,
      xExit: xExit,
      yExit: yExit,
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
  global.nftHydraulicMesaRowSupplyWaypoints = mesaRowSupplyWaypoints;
  global.nftHydraulicMesaColumnSupplySegments = mesaColumnSupplySegments;
})(typeof window !== 'undefined' ? window : globalThis);
