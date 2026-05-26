/**
 * Comprueba plantillas RDWC: cantidad, ids únicos y valores ancla del manual.
 * node scripts/test-rdwc-presets.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../js/diagrams/rdwc/rdwc-presets.js'), 'utf8');
const fn = new Function(src + '\nreturn { rdwcPresetsList, rdwcPresetById, rdwcGuessPresetId, rdwcApplyPresetToConfig };');
const g = {};
fn.call(g);
Object.assign(globalThis, g);

const list = globalThis.rdwcPresetsList();
const ids = new Set(list.map((p) => p.id));
let err = 0;

if (list.length < 30) {
  console.error('FAIL: se esperaban ≥30 plantillas, hay', list.length);
  err++;
}
if (ids.size !== list.length) {
  console.error('FAIL: ids duplicados');
  err++;
}

const anchors = [
  ['c8-f2', { sites: 8, rows: 2, recirculationLh: 1800, airLpm: 40 }],
  ['c24-f4', { sites: 24, rows: 4, controlVolL: 90, airLpm: 80 }],
];
for (const [id, want] of anchors) {
  const p = globalThis.rdwcPresetById(id);
  if (!p) {
    console.error('FAIL: falta preset', id);
    err++;
    continue;
  }
  for (const k of Object.keys(want)) {
    if (p[k] !== want[k]) {
      console.error('FAIL:', id, k, 'esperado', want[k], 'obtenido', p[k]);
      err++;
    }
  }
}

const cfg = { rdwcSites: 12, rdwcRows: 3 };
if (globalThis.rdwcGuessPresetId(cfg) !== 'c12-f3') {
  console.error('FAIL: guess c12-f3');
  err++;
}

const c = { tipoInstalacion: 'rdwc' };
globalThis.rdwcApplyPresetToConfig(c, 'c16-f4');
if (c.rdwcSites !== 16 || c.rdwcLayout !== 'double_row') {
  console.error('FAIL: apply preset');
  err++;
}

if (err) process.exit(1);
console.log('OK:', list.length, 'plantillas RDWC');
