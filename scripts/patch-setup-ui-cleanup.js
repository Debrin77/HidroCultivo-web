const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');

h = h.replace('<motion id="setupDwcDepUnidoExtrasWrap"', '<div id="setupDwcDepUnidoExtrasWrap"');

const start = '      <!-- Ubicación interior/exterior -->';
const end = '    <motion class="setup-page" id="spage2">';
const endAlt = '    <div class="setup-page" id="spage2">';
let i0 = h.indexOf(start);
let i1 = h.indexOf(endAlt);
if (i0 >= 0 && i1 > i0) {
  h = h.slice(0, i0) + h.slice(i1);
  console.log('removed ubicacion paso 1');
} else {
  console.error('ubic markers', i0, i1);
  process.exit(1);
}

const sysVol = `          <div id="sysDwcVolumenManualWrap" class="setup-hidden">
            <label class="form-label torre-dwc-lbl-mono" for="sysDwcVolumenManualL">Volumen útil real (L)</label>
            <input type="number" id="sysDwcVolumenManualL" class="torre-dwc-input" min="1" max="800" step="0.1"
              placeholder="ej. 18.0" inputmode="decimal" autocomplete="off" aria-label="Volumen útil real en litros"
              oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}">
            <p id="sysDwcVolumenManualHint" class="setup-hidden torre-dwc-vol-hint" role="status"></p>
          </div>
`;
if (h.includes(sysVol)) {
  h = h.replace(sysVol, '');
  console.log('removed sys volumen manual');
}

fs.writeFileSync(p, h);
console.log('ok');
