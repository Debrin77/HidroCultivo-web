const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
const D = 'd' + 'iv';
let h = fs.readFileSync(p, 'utf8');
if (h.includes('sistemaTorreMontajeCard')) {
  console.log('already inserted');
  process.exit(0);
}
const block =
  `\n      <${D} id="sistemaTorreMontajeCard" class="torre-card-elevated setup-hidden">\n` +
  `        <${D} class="torre-sistema-panel-kicker">Torre vertical · niveles y bomba</${D}>\n` +
  `        <${D} class="setup-nft-montaje-origen-row torre-nft-row-mb">\n` +
  `          <span class="setup-nft-montaje-origen-label">Tipo de montaje</span>\n` +
  `          <${D} class="torre-nft-grid-2-tight">\n` +
  `            <button type="button" class="equip-card nft-disp-btn torre-nft-chip-btn" id="sysTorreMontajeOrigenKit" onclick="seleccionarSistemaTorreMontajeOrigen('kit')" aria-pressed="false">Kit comercial</button>\n` +
  `            <button type="button" class="equip-card nft-disp-btn torre-nft-chip-btn selected" id="sysTorreMontajeOrigenDiy" onclick="seleccionarSistemaTorreMontajeOrigen('diy')" aria-pressed="true">DIY / a medida</button>\n` +
  `          </${D}>\n` +
  `        </${D}>\n` +
  `        <p id="sysTorreMontajeOrigenHint" class="torre-nft-p-note setup-hidden" role="note">Kit: niveles y cestas del manual; la app calcula la bomba orientativa. DIY: igual + puedes contrastar caudal y potencia de tu placa.</p>\n` +
  `        <${D} id="sistemaTorreCantidadesMount" class="torre-controls torre-sistema-cantidades-mount"></${D}>\n` +
  `        <${D} id="sysTorreBombaSistemaBlock" class="setup-mt-10">\n` +
  `          <${D} class="setup-kicker setup-kicker-md setup-mb-6">Bomba de riego (orientativa)</${D}>\n` +
  `          <${D} class="setup-mb-10">\n` +
  `            <${D} class="setup-kicker setup-kicker-md setup-mb-6 setup-kicker--row">\n` +
  `              <svg class="hc-ico" aria-hidden="true" focusable="false"><use href="#hc-i-ruler"/></svg>\n` +
  `              Altura total de la torre\n` +
  `              <span id="sysValAltura" class="setup-val-altura"> 1.2m</span>\n` +
  `            </${D}>\n` +
  `            <input type="range" class="torre-slider" id="sysSliderAltura" min="0.5" max="3.0" value="1.2" step="0.1" oninput="calcularBombaRecomendadaSistema()" aria-label="Altura total de la torre en metros">\n` +
  `          </${D}>\n` +
  `          <${D} id="sysResultadoBomba" class="setup-box-info setup-mt-8" role="status">Ajusta niveles, cestas y altura para ver la bomba orientativa.</${D}>\n` +
  `          <${D} id="sysTorreBombaUsuarioBlock" class="setup-mt-10">\n` +
  `            <${D} class="setup-kicker setup-kicker-md setup-mb-6">Tu bomba (opcional)</${D}>\n` +
  `            <p class="setup-field-hint setup-mb-8">Caudal nominal (L/h) y potencia (W) de la placa; se comparan con el mínimo según tu torre.</p>\n` +
  `            <${D} class="setup-grid-2 setup-grid-gap-8">\n` +
  `              <${D}><label class="form-label" for="sysTorreBombaUsuarioLh">Caudal placa (L/h)</label>\n` +
  `                <input type="number" id="sysTorreBombaUsuarioLh" class="form-input torre-dwc-input" min="50" max="20000" step="10" placeholder="ej. 800" inputmode="decimal" oninput="try{onSistemaTorreBombaUsuarioInput()}catch(e){}" onblur="try{onSistemaTorreBombaUsuarioBlur()}catch(e){}"></${D}>\n` +
  `              <${D}><label class="form-label" for="sysTorreBombaUsuarioW">Potencia (W)</label>\n` +
  `                <input type="number" id="sysTorreBombaUsuarioW" class="form-input torre-dwc-input" min="1" max="500" step="1" placeholder="opcional" inputmode="numeric" oninput="try{onSistemaTorreBombaUsuarioInput()}catch(e){}" onblur="try{onSistemaTorreBombaUsuarioBlur()}catch(e){}"></${D}>\n` +
  `            </${D}>\n` +
  `            <${D} id="sysTorreBombaUsuarioMsg" class="setup-mt-6" role="status" aria-live="polite"></${D}>\n` +
  `          </${D}>\n` +
  `        </${D}>\n` +
  `        <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaTorreMontajeDesdeFormulario()">Guardar niveles y bomba</button>\n` +
  `      </${D}>\n`;
const needle = `\n      <${D} id="sistemaEcPhStrategyCard" class="torre-card-elevated">`;
if (!h.includes(needle)) {
  console.error('needle missing');
  process.exit(1);
}
h = h.replace(needle, block + needle);
fs.writeFileSync(p, h);
console.log('ok');
