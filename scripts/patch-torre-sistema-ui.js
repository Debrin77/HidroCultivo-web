const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(htmlPath, 'utf8');

if (!h.includes('sistemaTorreMontajeCard')) {
  const insert =
    `
      <motion id="sistemaTorreMontajeCard" class="torre-card-elevated setup-hidden">
        <motion class="torre-sistema-panel-kicker">Torre vertical · niveles y bomba</motion>
        <motion class="setup-nft-montaje-origen-row torre-nft-row-mb">
          <span class="setup-nft-montaje-origen-label">Tipo de montaje</span>
          <motion class="torre-nft-grid-2-tight">
            <button type="button" class="equip-card nft-disp-btn torre-nft-chip-btn" id="sysTorreMontajeOrigenKit" onclick="seleccionarSistemaTorreMontajeOrigen('kit')"
              aria-pressed="false">Kit comercial</button>
            <button type="button" class="equip-card nft-disp-btn torre-nft-chip-btn selected" id="sysTorreMontajeOrigenDiy" onclick="seleccionarSistemaTorreMontajeOrigen('diy')"
              aria-pressed="true">DIY / a medida</button>
          </motion>
        </motion>
        <p id="sysTorreMontajeOrigenHint" class="torre-nft-p-note setup-hidden" role="note">Kit: indica niveles y cestas del manual; la app calcula la bomba orientativa. DIY: igual + puedes contrastar caudal y potencia de tu placa.</p>
        <motion id="sistemaTorreCantidadesMount" class="torre-controls torre-sistema-cantidades-mount"></motion>
        <motion id="sysTorreBombaSistemaBlock" class="setup-mt-10">
          <motion class="setup-kicker setup-kicker-md setup-mb-6">Bomba de riego (orientativa)</motion>
          <motion class="setup-mb-10">
            <motion class="setup-kicker setup-kicker-md setup-mb-6 setup-kicker--row">
              <svg class="hc-ico" aria-hidden="true" focusable="false"><use href="#hc-i-ruler"/></svg>
              Altura total de la torre
              <span id="sysValAltura" class="setup-val-altura"> 1.2m</span>
            </motion>
            <input type="range" class="torre-slider" id="sysSliderAltura"
              min="0.5" max="3.0" value="1.2" step="0.1"
              oninput="calcularBombaRecomendadaSistema()"
              aria-label="Altura total de la torre en metros">
          </motion>
          <motion id="sysResultadoBomba" class="setup-box-info setup-mt-8" role="status">Ajusta niveles, cestas y altura para ver la bomba orientativa.</motion>
          <motion id="sysTorreBombaUsuarioBlock" class="setup-mt-10">
            <motion class="setup-kicker setup-kicker-md setup-mb-6">Tu bomba (opcional)</motion>
            <p class="setup-field-hint setup-mb-8">Caudal nominal (L/h) y potencia (W) de la placa; se comparan con el mínimo según tu torre.</p>
            <motion class="setup-grid-2 setup-grid-gap-8">
              <motion>
                <label class="form-label" for="sysTorreBombaUsuarioLh">Caudal placa (L/h)</label>
                <input type="number" id="sysTorreBombaUsuarioLh" class="form-input torre-dwc-input" min="50" max="20000" step="10" placeholder="ej. 800" inputmode="decimal"
                  oninput="try{onSistemaTorreBombaUsuarioInput()}catch(e){}"
                  onblur="try{onSistemaTorreBombaUsuarioBlur()}catch(e){}">
              </motion>
              <motion>
                <label class="form-label" for="sysTorreBombaUsuarioW">Potencia (W)</label>
                <input type="number" id="sysTorreBombaUsuarioW" class="form-input torre-dwc-input" min="1" max="500" step="1" placeholder="opcional" inputmode="numeric"
                  oninput="try{onSistemaTorreBombaUsuarioInput()}catch(e){}"
                  onblur="try{onSistemaTorreBombaUsuarioBlur()}catch(e){}">
              </motion>
            </motion>
            <motion id="sysTorreBombaUsuarioMsg" class="setup-mt-6" role="status" aria-live="polite"></motion>
          </motion>
        </motion>
        <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaTorreMontajeDesdeFormulario()">Guardar niveles y bomba</button>
      </motion>
`.replace(/<\/?motion/g, (m) => (m.startsWith('</') ? '</div' : '<motion'.replace('motion', 'motion') ? '<div' : '<div'));

  // fix replace - use D variable
  const D = 'd' + 'iv';
  const block = `
      <${D} id="sistemaTorreMontajeCard" class="torre-card-elevated setup-hidden">
        <div class="torre-sistema-panel-kicker">Torre vertical · niveles y bomba</motion>
        <div class="setup-nft-montaje-origen-row torre-nft-row-mb">
          <span class="setup-nft-montaje-origen-label">Tipo de montaje</span>
          <div class="torre-nft-grid-2-tight">
            <button type="button" class="equip-card nft-disp-btn torre-nft-chip-btn" id="sysTorreMontajeOrigenKit" onclick="seleccionarSistemaTorreMontajeOrigen('kit')"
              aria-pressed="false">Kit comercial</button>
            <button type="button" class="equip-card nft-disp-btn torre-nft-chip-btn selected" id="sysTorreMontajeOrigenDiy" onclick="seleccionarSistemaTorreMontajeOrigen('diy')"
              aria-pressed="true">DIY / a medida</button>
          </div>
        </div>
        <p id="sysTorreMontajeOrigenHint" class="torre-nft-p-note setup-hidden" role="note">Kit: indica niveles y cestas del manual; la app calcula la bomba orientativa. DIY: igual + puedes contrastar caudal y potencia de tu placa.</p>
        <motion id="sistemaTorreCantidadesMount" class="torre-controls torre-sistema-cantidades-mount"></div>
        <div id="sysTorreBombaSistemaBlock" class="setup-mt-10">
          <motion class="setup-kicker setup-kicker-md setup-mb-6">Bomba de riego (orientativa)</div>
          <div class="setup-mb-10">
            <div class="setup-kicker setup-kicker-md setup-mb-6 setup-kicker--row">
              <svg class="hc-ico" aria-hidden="true" focusable="false"><use href="#hc-i-ruler"/></svg>
              Altura total de la torre
              <span id="sysValAltura" class="setup-val-altura"> 1.2m</span>
            </div>
            <input type="range" class="torre-slider" id="sysSliderAltura"
              min="0.5" max="3.0" value="1.2" step="0.1"
              oninput="calcularBombaRecomendadaSistema()"
              aria-label="Altura total de la torre en metros">
          </div>
          <div id="sysResultadoBomba" class="setup-box-info setup-mt-8" role="status">Ajusta niveles, cestas y altura para ver la bomba orientativa.</div>
          <div id="sysTorreBombaUsuarioBlock" class="setup-mt-10">
            <div class="setup-kicker setup-kicker-md setup-mb-6">Tu bomba (opcional)</div>
            <p class="setup-field-hint setup-mb-8">Caudal nominal (L/h) y potencia (W) de la placa; se comparan con el mínimo según tu torre.</p>
            <div class="setup-grid-2 setup-grid-gap-8">
              <div>
                <label class="form-label" for="sysTorreBombaUsuarioLh">Caudal placa (L/h)</label>
                <input type="number" id="sysTorreBombaUsuarioLh" class="form-input torre-dwc-input" min="50" max="20000" step="10" placeholder="ej. 800" inputmode="decimal"
                  oninput="try{onSistemaTorreBombaUsuarioInput()}catch(e){}"
                  onblur="try{onSistemaTorreBombaUsuarioBlur()}catch(e){}">
              </div>
              <div>
                <label class="form-label" for="sysTorreBombaUsuarioW">Potencia (W)</label>
                <input type="number" id="sysTorreBombaUsuarioW" class="form-input torre-dwc-input" min="1" max="500" step="1" placeholder="opcional" inputmode="numeric"
                  oninput="try{onSistemaTorreBombaUsuarioInput()}catch(e){}"
                  onblur="try{onSistemaTorreBombaUsuarioBlur()}catch(e){}">
              </div>
            </div>
            <div id="sysTorreBombaUsuarioMsg" class="setup-mt-6" role="status" aria-live="polite"></motion>
          </div>
        </div>
        <button type="button" class="torre-dwc-save-btn" onclick="aplicarSistemaTorreMontajeDesdeFormulario()">Guardar niveles y bomba</button>
      </${D}>
`.split('motion').join(D);

  const needle = '      </div>\n\n      <motion id="sistemaEcPhStrategyCard"';
  const needle2 = '      </div>\n\n      <motion id="sistemaEcPhStrategyCard"'.replace(/motion/g, D);
  if (h.includes('sistemaEcPhStrategyCard') && h.includes('sistemaTorreObjetivoCard')) {
    const re = new RegExp(`(\\s*</${D}>\\s*\\n\\s*<${D} id="sistemaEcPhStrategyCard")`);
    if (re.test(h)) {
      h = h.replace(re, '\n' + block + '$1');
    } else {
      console.error('insert point for torre card not found');
      process.exit(1);
    }
  }
}

// Hide tube diameter in setup wizard
if (!h.includes('seccionTuboDiametroOculto')) {
  h = h.replace(
    '      <!-- Tubo y bomba — solo para torres DIY/personalizadas -->\n      <div id="seccionTuboBomba" class="setup-hidden">\n\n        <motion class="setup-block-title'.replace(/motion/g, 'd' + 'iv'),
    '      <!-- Bomba orientativa torre (sin preguntar Ø tubo central) -->\n      <div id="seccionTuboBomba" class="setup-hidden">\n\n        <div id="seccionTuboDiametroOculto" class="setup-hidden" aria-hidden="true">\n        <motion class="setup-block-title'.replace(/motion/g, 'd' + 'iv')
  );
  // fix botched replace - do simpler
}

fs.writeFileSync(htmlPath, h);
console.log('done');
