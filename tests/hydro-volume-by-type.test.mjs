import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadScript(relativePath, extraCtx = {}) {
  const code = readFileSync(join(root, relativePath), 'utf8');
  const ctx = vm.createContext({
    console,
    state: { configTorre: {} },
    Math,
    Number,
    JSON,
    parseInt,
    String,
    Array,
    Object,
    Date,
    isNaN,
    ...extraCtx,
  });
  vm.runInContext(code, ctx);
  return ctx;
}

test('tipoInstalacionNormalizado: vacío o inválido → torre', () => {
  const ctx = loadScript('js/hc-setup-wizard-core.js');
  const norm = ctx.tipoInstalacionNormalizado;
  assert.strictEqual(norm({}), 'torre');
  assert.strictEqual(norm({ tipoInstalacion: '' }), 'torre');
  assert.strictEqual(norm({ tipoInstalacion: 'rdwc' }), 'rdwc');
});

test('getRdwcVolumenSolucionTotalLitros: control + cubos × sitios', () => {
  const ctx = loadScript('js/hc-setup-wizard-core.js', {
    rdwcRecomendacionControlDesdeConfig: () => null,
    dwcTieneMedidasCestaEnCfg: () => false,
    getDwcVolumenSeguroMaxLitrosDesdeConfig: () => null,
  });
  const total = ctx.getRdwcVolumenSolucionTotalLitros({
    tipoInstalacion: 'rdwc',
    rdwcSites: 4,
    rdwcControlVolL: 40,
    rdwcBucketVolL: 20,
    volMezclaLitros: 35,
    rdwcBucketTrabajoL: 15,
  });
  assert.strictEqual(total, 95);
});

test('dwcLitrosUtilesPorCuboMultivalvula: litros explícitos por cubo', () => {
  const ctx = loadScript('js/hc-setup-wizard-dwc.js', {
    tipoInstalacionNormalizado: (cfg) => (cfg && cfg.tipoInstalacion === 'dwc' ? 'dwc' : 'torre'),
    dwcGetOxigenacionDiseno: (cfg) => cfg.dwcOxigenacionDiseno || '',
    getDwcVolumenSeguroMaxLitrosDesdeConfig: () => null,
  });
  const litros = ctx.dwcLitrosUtilesPorCuboMultivalvula({
    tipoInstalacion: 'dwc',
    dwcOxigenacionDiseno: 'cubos_independientes',
    dwcLitrosUtilesPorSitioL: 12.5,
  });
  assert.strictEqual(litros, 12.5);
});

test('srfVolumenSeguroLitrosDesdeConfig: por debajo de capacidad geométrica', () => {
  const ctx = loadScript('js/hc-setup-wizard-srf.js', {
    tipoInstalacionNormalizado: (cfg) => (cfg && cfg.tipoInstalacion === 'srf' ? 'srf' : 'torre'),
  });
  const cfg = {
    tipoInstalacion: 'srf',
    srfCanalLargoCm: 100,
    srfCanalAnchoCm: 50,
    srfProfundidadCm: 20,
    srfNetPotHeightMm: 80,
    srfBalsaGrosorMm: 40,
    srfNetPotMm: 50,
  };
  const cap = ctx.srfCapacidadLitrosDesdeConfig(cfg);
  const seg = ctx.srfVolumenSeguroLitrosDesdeConfig(cfg);
  assert.strictEqual(cap, 100);
  assert.ok(seg != null && seg > 0 && seg < cap);
});

test('nftAplicarObjetivoEcRango: baby reduce EC respecto a final', () => {
  const ctx = loadScript('js/hc-setup-wizard-core.js');
  const base = { min: 1000, max: 1400 };
  const cfg = { tipoInstalacion: 'nft', nftObjetivoCultivo: 'baby' };
  const baby = ctx.nftAplicarObjetivoEcRango(base, cfg);
  const fin = ctx.nftAplicarObjetivoEcRango(base, { tipoInstalacion: 'nft', nftObjetivoCultivo: 'final' });
  assert.ok(baby.max < fin.max);
  assert.ok(baby.min < fin.min);
});
