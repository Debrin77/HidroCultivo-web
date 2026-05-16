const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const D = 'd' + 'iv';
const badStart = '<h3 class="setup-dwc-section-title">Medidas del cubo</h3>';
const badEnd = '<h3 class="setup-dwc-section-title">Medidas de la cesta</h3>';
const i0 = h.indexOf(badStart);
const i1 = h.indexOf(badEnd);
if (i0 < 0 || i1 < 0) {
  console.error('not found', i0, i1);
  process.exit(1);
}
const fixed = `<h3 class="setup-dwc-section-title">Medidas del cubo</h3>
        <${D} class="setup-dwc-grid-3" id="setupDwcMedidasRow">
          <${D} id="setupDwcMedidasLAWrap" class="setup-dwc-medidas-span2">
            <${D}>
              <label class="form-label setup-dwc-label" for="setupDwcLargoCm">Largo (cm)</label>
              <input type="number" id="setupDwcLargoCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}">
            </${D}>
            <${D}>
              <label class="form-label setup-dwc-label" for="setupDwcAnchoCm">Ancho (cm)</label>
              <input type="number" id="setupDwcAnchoCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}">
            </${D}>
          </${D}>
          <${D} id="setupDwcMedidasCilWrap" class="setup-dwc-medidas-span2 setup-dwc-medidas-cil-only setup-hidden">
            <${D}>
              <label class="form-label setup-dwc-label" for="setupDwcDiametroCm">Ø interior (cm)</label>
              <input type="number" id="setupDwcDiametroCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput();actualizarResumenSetup()}catch(e){}">
            </${D}>
          </${D}>
          <${D} id="setupDwcProfWrap">
            <label class="form-label setup-dwc-label" for="setupDwcProfCm">Prof./altura útil líquido (cm)</label>
            <input type="number" id="setupDwcProfCm" min="5" max="200" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}">
          </${D}>
        </${D}>
        <${D} id="setupDwcVolumenManualWrap" class="setup-hidden setup-dwc-dep-unido-only">
          <label class="form-label setup-dwc-label" for="setupDwcVolumenManualL">Volumen útil real (L)</label>
          <input type="number" id="setupDwcVolumenManualL" min="1" max="800" step="0.1" placeholder="ej. 18.0" class="setup-dwc-input" oninput="onSetupDwcMedidasInput()">
          <p id="setupDwcVolumenManualHint" class="setup-hidden setup-dwc-cap-hint" role="status"></p>
        </${D}>
        <${D} id="setupDwcLitrosCuboBlock" class="setup-dwc-litros-cubo-block setup-hidden" role="status" aria-live="polite">
          <p id="setupDwcCapacidadEstimada" class="setup-dwc-litros-cubo-valor"></p>
        </${D}>
        `;
h = h.slice(0, i0) + fixed + h.slice(i1);
const cestaBad = `<${D} class="setup-dwc-grid-2 setup-dwc-grid-2-top">
          <${D}><label class="form-label setup-dwc-label" for="setupDwcPotRimMm">Diámetro cesta (mm)</label><input type="number" id="setupDwcPotRimMm" min="25" max="120" step="1" placeholder="ej. 50" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput();refreshDwcTapHintSetup()}catch(e){}" onchange="try{actualizarResumenSetup()}catch(e){}"></${D}></${D}>
          <${D}><label class="form-label setup-dwc-label" for="setupDwcPotHmm">Altura cesta (mm)</label><input type="number" id="setupDwcPotHmm" min="30" max="200" step="1" placeholder="ej. 75" class="setup-dwc-input" onchange="try{onSetupDwcMedidasInput();actualizarResumenSetup()}catch(e){}" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></${D}></${D}>
        </${D}>`;
const cestaGood = `<${D} class="setup-dwc-grid-2 setup-dwc-grid-2-top">
          <${D}>
            <label class="form-label setup-dwc-label" for="setupDwcPotRimMm">Diámetro cesta (mm)</label>
            <input type="number" id="setupDwcPotRimMm" min="25" max="120" step="1" placeholder="ej. 50" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput();refreshDwcTapHintSetup()}catch(e){}" onchange="try{actualizarResumenSetup()}catch(e){}">
          </${D}>
          <${D}>
            <label class="form-label setup-dwc-label" for="setupDwcPotHmm">Altura cesta (mm)</label>
            <input type="number" id="setupDwcPotHmm" min="30" max="200" step="1" placeholder="ej. 75" class="setup-dwc-input" onchange="try{onSetupDwcMedidasInput();actualizarResumenSetup()}catch(e){}" oninput="try{onSetupDwcMedidasInput()}catch(e){}">
          </${D}>
        </${D}>`;
if (!h.includes(cestaBad)) {
  console.error('cesta block not found');
  process.exit(1);
}
h = h.replace(cestaBad, cestaGood);
fs.writeFileSync(p, h);
console.log('ok');
