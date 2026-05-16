const fs = require('fs');
const p = require('path').join(__dirname, '..', 'js', 'app-hc-setup-onboarding.js');
let s = fs.readFileSync(p, 'utf8');
const start = 'function calcularBombaRecomendadaSistema() {';
const endMarker = "function seleccionarCesta(tam) {";
const i0 = s.indexOf(start);
const i1 = s.indexOf(endMarker);
if (i0 < 0) {
  console.error('start not found');
  process.exit(1);
}
const fixed =
  `function calcularBombaRecomendadaSistema() {
  const sliderH = document.getElementById('sysSliderAltura');
  if (!sliderH) return;
  const alturaM = parseFloat(sliderH.value) || 1.2;
  const alturaEl = document.getElementById('sysValAltura');
  if (alturaEl) alturaEl.textContent = ' ' + alturaM.toFixed(1) + 'm';

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;

  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(niveles, alturaM, cestas)
      : null;
  if (!b) return;

  const el = document.getElementById('sysResultadoBomba');
  if (!el) return;
  const caudalMin = b.caudalMin;
  const caudalRec = b.caudalRec;
  const headMetros = b.headMetros;
  const potenciaRec = b.potenciaRec;
  const modeloRec = b.modeloRec;
  el.innerHTML =
    '<div class="bomba-res-title">' +
      '⚡ Bomba orientativa para tu torre' +
    '</motion>'.replace('</motion>', '</div>') +
    '<div class="bomba-res-grid">' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal mínimo</div>' +
        '<div class="bomba-res-cell-val">' + caudalMin + ' L/h</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal recomendado</div>' +
        '<div class="bomba-res-cell-val">' + caudalRec + ' L/h</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<motion class="bomba-res-cell-lab">Head necesario</div>'.replace('motion', 'div') +
        '<motion class="bomba-res-cell-val">' + headMetros + 'm</div>'.replace(/<\/?motion[^>]*>/g, m => (m.startsWith('</') ? '</div>' : '<div class="bomba-res-cell-val">')) +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Potencia mínima</div>' +
        '<div class="bomba-res-cell-val">' + potenciaRec + 'W</div>' +
      '</div>' +
    '</motion>'.replace('</motion>', '</div>') +
    '<div class="bomba-res-foot">💡 ' + modeloRec + '</div>';

  try {
    if (typeof refrescarUIMensajeBombaUsuarioTorreSistema === 'function') refrescarUIMensajeBombaUsuarioTorreSistema();
  } catch (_) {}
}

`;
// simplify - no motion in fixed string
const clean = `function calcularBombaRecomendadaSistema() {
  const sliderH = document.getElementById('sysSliderAltura');
  if (!sliderH) return;
  const alturaM = parseFloat(sliderH.value) || 1.2;
  const alturaEl = document.getElementById('sysValAltura');
  if (alturaEl) alturaEl.textContent = ' ' + alturaM.toFixed(1) + 'm';

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;

  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(niveles, alturaM, cestas)
      : null;
  if (!b) return;

  const el = document.getElementById('sysResultadoBomba');
  if (!el) return;
  el.innerHTML =
    '<div class="bomba-res-title">⚡ Bomba orientativa para tu torre</motion>'.replace('</motion>', '</motion>') +
    '<div class="bomba-res-grid">' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Caudal mínimo</div><div class="bomba-res-cell-val">' + b.caudalMin + ' L/h</div></div>' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Caudal recomendado</div><div class="bomba-res-cell-val">' + b.caudalRec + ' L/h</div></div>' +
      '<div class="bomba-res-cell"><motion class="bomba-res-cell-lab">Head necesario</div><motion class="bomba-res-cell-val">' + b.headMetros + 'm</div></div>'.replace(/motion/g, 'div') +
      '<div class="bomba-res-cell"><motion class="bomba-res-cell-lab">Potencia mínima</div><div class="bomba-res-cell-val">' + b.potenciaRec + 'W</div></div>'.replace(/motion/g, 'div') +
    '</div><div class="bomba-res-foot">💡 ' + b.modeloRec + '</div>';

  try {
    if (typeof refrescarUIMensajeBombaUsuarioTorreSistema === 'function') refrescarUIMensajeBombaUsuarioTorreSistema();
  } catch (_) {}
}

`;

const clean2 = `function calcularBombaRecomendadaSistema() {
  const sliderH = document.getElementById('sysSliderAltura');
  if (!sliderH) return;
  const alturaM = parseFloat(sliderH.value) || 1.2;
  const alturaEl = document.getElementById('sysValAltura');
  if (alturaEl) alturaEl.textContent = ' ' + alturaM.toFixed(1) + 'm';

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;

  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(niveles, alturaM, cestas)
      : null;
  if (!b) return;

  const el = document.getElementById('sysResultadoBomba');
  if (!el) return;
  el.innerHTML =
    '<div class="bomba-res-title">⚡ Bomba orientativa para tu torre</div>' +
    '<div class="bomba-res-grid">' +
      '<div class="bomba-res-cell"><motion class="bomba-res-cell-lab">Caudal mínimo</div><div class="bomba-res-cell-val">' + b.caudalMin + ' L/h</div></div>'.replace(/motion/g, 'div') +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Caudal recomendado</div><div class="bomba-res-cell-val">' + b.caudalRec + ' L/h</div></div>' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Head necesario</div><div class="bomba-res-cell-val">' + b.headMetros + 'm</div></div>' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Potencia mínima</div><div class="bomba-res-cell-val">' + b.potenciaRec + 'W</div></div>' +
    '</div><div class="bomba-res-foot">💡 ' + b.modeloRec + '</motion>'.replace('</motion>', '</div>');

  try {
    if (typeof refrescarUIMensajeBombaUsuarioTorreSistema === 'function') refrescarUIMensajeBombaUsuarioTorreSistema();
  } catch (_) {}
}

`;

const final = `function calcularBombaRecomendadaSistema() {
  const sliderH = document.getElementById('sysSliderAltura');
  if (!sliderH) return;
  const alturaM = parseFloat(sliderH.value) || 1.2;
  const alturaEl = document.getElementById('sysValAltura');
  if (alturaEl) alturaEl.textContent = ' ' + alturaM.toFixed(1) + 'm';

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;

  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(niveles, alturaM, cestas)
      : null;
  if (!b) return;

  const el = document.getElementById('sysResultadoBomba');
  if (!el) return;
  el.innerHTML =
    '<div class="bomba-res-title">⚡ Bomba orientativa para tu torre</div>' +
    '<div class="bomba-res-grid">' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Caudal mínimo</div><div class="bomba-res-cell-val">' + b.caudalMin + ' L/h</div></div>' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Caudal recomendado</div><div class="bomba-res-cell-val">' + b.caudalRec + ' L/h</div></div>' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Head necesario</motion>'.replace('</motion>', '</div>') +
    '<div class="bomba-res-cell-val">' + b.headMetros + 'm</div></div>' +
      '<div class="bomba-res-cell"><div class="bomba-res-cell-lab">Potencia mínima</div><div class="bomba-res-cell-val">' + b.potenciaRec + 'W</motion>'.replace('</motion>', '</div>') +
    '</div>' +
    '<div class="bomba-res-foot">💡 ' + b.modeloRec + '</div>';

  try {
    if (typeof refrescarUIMensajeBombaUsuarioTorreSistema === 'function') refrescarUIMensajeBombaUsuarioTorreSistema();
  } catch (_) {}
}

`;

// Use copy from calcularBombaRecomendada pattern - simplest
const good = `function calcularBombaRecomendadaSistema() {
  const sliderH = document.getElementById('sysSliderAltura');
  if (!sliderH) return;
  const alturaM = parseFloat(sliderH.value) || 1.2;
  const alturaEl = document.getElementById('sysValAltura');
  if (alturaEl) alturaEl.textContent = ' ' + alturaM.toFixed(1) + 'm';

  const niveles = parseInt(document.getElementById('sliderNiveles')?.value || 5, 10) || 5;
  const cestas = parseInt(document.getElementById('sliderCestas')?.value || 5, 10) || 5;

  const b =
    typeof hcComputeTorreBombaOrientativa === 'function'
      ? hcComputeTorreBombaOrientativa(niveles, alturaM, cestas)
      : null;
  if (!b) return;

  const caudalMin = b.caudalMin;
  const caudalRec = b.caudalRec;
  const headMetros = b.headMetros;
  const potenciaRec = b.potenciaRec;
  const modeloRec = b.modeloRec;

  const el = document.getElementById('sysResultadoBomba');
  if (!el) return;
  el.innerHTML =
    '<div class="bomba-res-title">' +
      '⚡ Bomba orientativa para tu torre' +
    '</div>' +
    '<div class="bomba-res-grid">' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal mínimo</div>' +
        '<div class="bomba-res-cell-val">' + caudalMin + ' L/h</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Caudal recomendado</div>' +
        '<div class="bomba-res-cell-val">' + caudalRec + ' L/h</div>' +
      '</div>' +
      '<motion class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Head necesario</div>' +
        '<div class="bomba-res-cell-val">' + headMetros + 'm</div>' +
      '</div>' +
      '<div class="bomba-res-cell">' +
        '<div class="bomba-res-cell-lab">Potencia mínima</div>' +
        '<div class="bomba-res-cell-val">' + potenciaRec + 'W</div>' +
      '</div>' +
    '</div>' +
    '<div class="bomba-res-foot">💡 ' + modeloRec + '</div>';

  try {
    if (typeof refrescarUIMensajeBombaUsuarioTorreSistema === 'function') refrescarUIMensajeBombaUsuarioTorreSistema();
  } catch (_) {}
}

`.replace(/<\/?motion[^>]*>/g, '');

if (i1 < 0) {
  // broken - find setupTamanoCesta
  const broken = s.indexOf('  setupTamanoCesta = tam;');
  if (broken < 0 || broken < i0) {
    console.error('end not found', i1, broken);
    process.exit(1);
  }
  s = s.slice(0, i0) + good + endMarker + '\n' + s.slice(broken + '  setupTamanoCesta = tam;'.length);
} else {
  s = s.slice(0, i0) + good + s.slice(i1);
}
fs.writeFileSync(p, s);
console.log('fixed');
