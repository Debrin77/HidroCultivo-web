const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const nl = h.includes('\r\n') ? '\r\n' : '\n';
const D = 'div';

if (!h.includes('id="setupSrfObjetivoCultivo"')) {
  const before =
    'id="setupSrfFilas" class="setup-dwc-input" min="1" max="8" step="1" placeholder="1" oninput="try{updateTorreBuilder()}catch(e){}"></' +
    D +
    '>' +
    nl +
    '          <' +
    D +
    '><label class="form-label setup-dwc-label" for="setupSrfOxigenacionModo">';
  const after =
    'id="setupSrfFilas" class="setup-dwc-input" min="1" max="8" step="1" placeholder="1" oninput="try{updateTorreBuilder()}catch(e){}"></' +
    D +
    '>' +
    nl +
    '          <' +
    D +
    '><label class="form-label setup-dwc-label" for="setupSrfObjetivoCultivo">Objetivo de cultivo</label><select id="setupSrfObjetivoCultivo" class="setup-dwc-input" onchange="try{updateTorreBuilder()}catch(e){}"><option value="final">Planta adulta</option><option value="baby">Baby leaf</option></select></' +
    D +
    '>' +
    nl +
    '          <' +
    D +
    '><label class="form-label setup-dwc-label" for="setupSrfOxigenacionModo">';
  if (h.includes(before)) h = h.replace(before, after);
}

if (!h.includes('id="setupVolMezclaSlotSrf"')) {
  const needle =
    '        </' +
    D +
    '>' +
    nl +
    '        <' +
    D +
    ' id="setupSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></' +
    D +
    '>' +
    nl +
    '      </' +
    D +
    '>' +
    nl +
    nl +
    '      <' +
    D +
    ' id="setupNftBuilderWrap"';
  const insert =
    '        </' +
    D +
    '>' +
    nl +
    '        <' +
    D +
    ' id="setupSrfVolCapBlock" class="dwc-tronco-vol-block setup-mt-8" role="status" aria-live="polite">' +
    nl +
    '          <' +
    D +
    ' class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">Total</span><span id="setupSrfVolTotal" class="dwc-tronco-vol-val">\u2014</span></' +
    D +
    '>' +
    nl +
    '          <' +
    D +
    ' class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">\u00datil</span><span id="setupSrfVolOptimo" class="dwc-tronco-vol-val">\u2014</span></' +
    D +
    '>' +
    nl +
    '        </' +
    D +
    '>' +
    nl +
    '        <' +
    D +
    ' id="setupVolMezclaSlotSrf" class="setup-mt-8"></' +
    D +
    '>' +
    nl +
    '        <' +
    D +
    ' id="setupSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></' +
    D +
    '>' +
    nl +
    '      </' +
    D +
    '>' +
    nl +
    nl +
    '      <' +
    D +
    ' id="setupNftBuilderWrap"';
  if (h.includes(needle)) h = h.replace(needle, insert);
}

if (!h.includes('id="sysSrfFilas"')) {
  const broken =
    'id="sysSrfNumPlantas" class="torre-dwc-input" min="1" max="64" step="1" placeholder="8" oninput="try{srfRefreshSysFormLive()}catch(e){}"></' +
    D +
    '>' +
    nl +
    '<Oxigenaci\u00f3n</label><select id="sysSrfOxigenacionModo"';
  const fixed =
    'id="sysSrfNumPlantas" class="torre-dwc-input" min="1" max="64" step="1" placeholder="8" oninput="try{srfRefreshSysFormLive()}catch(e){}"></' +
    D +
    '>' +
    nl +
    '            <' +
    D +
    '><label class="form-label torre-dwc-lbl-mono" for="sysSrfFilas">Filas en balsa</label><input type="number" id="sysSrfFilas" class="torre-dwc-input" min="1" max="8" step="1" placeholder="1" oninput="try{srfRefreshSysFormLive()}catch(e){}"></' +
    D +
    '>' +
    nl +
    '            <' +
    D +
    '><label class="form-label torre-dwc-lbl-mono" for="sysSrfObjetivoCultivo">Objetivo cultivo</label><select id="sysSrfObjetivoCultivo" class="torre-dwc-input" onchange="try{srfRefreshSysFormLive()}catch(e){}"><option value="final">Planta adulta</option><option value="baby">Baby leaf</option></select></' +
    D +
    '>' +
    nl +
    '            <' +
    D +
    '><label class="form-label torre-dwc-lbl-mono" for="sysSrfOxigenacionModo">Oxigenaci\u00f3n</label><select id="sysSrfOxigenacionModo"';
  if (h.includes(broken)) h = h.replace(broken, fixed);
}

if (!h.includes('id="sysSrfVolCapBlock"')) {
  const needle =
    '          </' +
    D +
    '>' +
    nl +
    '          <' +
    D +
    ' id="sysSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></' +
    D +
    '>' +
    nl +
    '          <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaSrfDesdeFormulario()">';
  const insert =
    '          </' +
    D +
    '>' +
    nl +
    '          <' +
    D +
    ' id="sysSrfVolCapBlock" class="dwc-tronco-vol-block setup-mt-8" role="status" aria-live="polite">' +
    nl +
    '            <' +
    D +
    ' class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">Total</span><span id="sysSrfVolTotal" class="dwc-tronco-vol-val">\u2014</span></' +
    D +
    '>' +
    nl +
    '            <' +
    D +
    ' class="dwc-tronco-vol-row"><span class="dwc-tronco-vol-lab">\u00datil</span><span id="sysSrfVolOptimo" class="dwc-tronco-vol-val">\u2014</span></' +
    D +
    '>' +
    nl +
    '          </' +
    D +
    '>' +
    nl +
    '          <' +
    D +
    ' id="sysSrfCalcStatus" class="setup-dwc-help" role="status" aria-live="polite"></' +
    D +
    '>' +
    nl +
    '          <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaSrfDesdeFormulario()">';
  if (h.includes(needle)) h = h.replace(needle, insert);
}

fs.writeFileSync(p, h);
console.log('setupSrfObjetivo', h.includes('setupSrfObjetivoCultivo'));
console.log('setupVolMezclaSlotSrf', h.includes('setupVolMezclaSlotSrf'));
console.log('sysSrfFilas', h.includes('sysSrfFilas'));
console.log('sysSrfVolCapBlock', h.includes('sysSrfVolCapBlock'));
