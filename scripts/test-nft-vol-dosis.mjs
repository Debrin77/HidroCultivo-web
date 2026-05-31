/**
 * Comprueba separación NFT: dosificación (recomendado) vs capacidad física (volDeposito).
 * Ejecutar: node scripts/test-nft-vol-dosis.mjs
 */

function nftSnapCapacidadFisicaDepositoL(valorL, recomendadoL) {
  const rec = Math.max(5, Math.min(100, Math.round(Number(recomendadoL) || 10)));
  const minSnap = Math.ceil(rec / 5) * 5;
  const v = Number(valorL);
  if (!Number.isFinite(v) || v <= 0) return minSnap;
  return Math.min(100, Math.max(minSnap, Math.ceil(v / 5) * 5));
}

function nftVolumenDosificacionLitrosDesdeConfig(cfg, bombaRec) {
  const b = { volDepositoRecomendadoL: bombaRec };
  if (b && Number.isFinite(b.volDepositoRecomendadoL) && b.volDepositoRecomendadoL > 0) {
    return Math.min(600, Math.max(1, Math.round(b.volDepositoRecomendadoL * 10) / 10));
  }
  const vm = Number(cfg.volMezclaLitros);
  const vMax = Number(cfg.volDeposito);
  if (Number.isFinite(vm) && vm > 0) {
    if (Number.isFinite(vMax) && vMax > vm + 0.35) return Math.round(vm * 10) / 10;
    if (!Number.isFinite(vMax) || vMax <= 0 || Math.abs(vm - vMax) <= 0.35) {
      return Math.min(600, Math.max(1, Math.round(vm * 10) / 10));
    }
  }
  return null;
}

function getVolumenDepositoMaxLitros(cfg) {
  const vFis = Number(cfg.volDeposito);
  if (Number.isFinite(vFis) && vFis > 0) return Math.round(vFis * 10) / 10;
  const d = nftVolumenDosificacionLitrosDesdeConfig(cfg, 22);
  if (d != null) return d;
  return null;
}

function getVolumenMezclaLitros(cfg, bombaRec) {
  const dNft = nftVolumenDosificacionLitrosDesdeConfig(cfg, bombaRec);
  if (dNft != null && dNft > 0) return dNft;
  return null;
}

function simGuardarAsistente(sliderVol, bombaRec) {
  const recNftL = Math.round(bombaRec);
  const fisNftL = nftSnapCapacidadFisicaDepositoL(sliderVol, recNftL);
  return {
    volDeposito: Math.min(100, fisNftL),
    volMezclaLitros: recNftL,
  };
}

let ok = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    ok++;
    console.log('  OK:', msg);
  } else {
    fail++;
    console.error('  FAIL:', msg);
  }
}

const REC = 22;
const cfg = simGuardarAsistente(30, REC);
assert(cfg.volMezclaLitros === 22, 'guardar: volMezclaLitros = recomendado (22)');
assert(cfg.volDeposito === 30, 'guardar: volDeposito = físico slider (30)');

const mez = getVolumenMezclaLitros(cfg, REC);
const max = getVolumenDepositoMaxLitros(cfg);
assert(mez === 22, 'getVolumenMezclaLitros = 22 (no 30)');
assert(max === 30, 'getVolumenDepositoMaxLitros = 30');
assert(mez < max, 'dosificación < capacidad física cuando depósito es mayor');

const cfgLegacy = { volDeposito: 30, volMezclaLitros: 30 };
const mezLegacy = nftVolumenDosificacionLitrosDesdeConfig(cfgLegacy, REC);
assert(mezLegacy === 22, 'bomba manda aunque volMezcla legacy = 30');

const snapMin = nftSnapCapacidadFisicaDepositoL(10, 22);
assert(snapMin === 25, 'slider 10 con rec 22 → mínimo físico 25');

const snapEq = nftSnapCapacidadFisicaDepositoL(22, 22);
assert(snapEq === 25, 'slider 22 con rec 22 → físico 25 (redondeo step 5)');

console.log('\n' + ok + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
