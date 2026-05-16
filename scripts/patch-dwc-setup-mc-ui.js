const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const D = 'd' + 'iv';
const start = '        <div id="setupDwcSoloBloque">';
const end = `      </${D}>\r\n\r\n      <${D} id="setupSrfDetalleWrap"`;
const i0 = h.indexOf(start);
const i1 = h.indexOf(end);
if (i0 < 0 || i1 < 0) {
  console.error('markers not found', i0, i1);
  process.exit(1);
}
const block = `        <${D} id="setupDwcSoloBloque">
        <${D}>
          <label class="form-label setup-dwc-label" for="setupDwcDepositoForma">Forma del depósito DWC</label>
          <select id="setupDwcDepositoForma" class="setup-dwc-input"
            onchange="try{onDwcFormaChanged(DWC_FORM_IDS_SETUP);actualizarResumenSetup();updateTorreBuilder()}catch(e){}"
            aria-label="Forma geométrica del depósito DWC">
            <option value="prismatico">Cubo / prismático regular</option>
            <option value="cilindrico">Cilíndrico (cubo redondo)</option>
            <option value="troncopiramidal">Troncopiramidal / tronco-cónico</option>
          </select>
        </${D}>
        <${D} id="setupDwcOxigenacionBlock">
          <label class="form-label setup-dwc-label" for="setupDwcOxigenacionDiseno">Distribución del aire</label>
          <select id="setupDwcOxigenacionDiseno" class="setup-dwc-input"
            onchange="try{var w=document.getElementById('setupDwcLitrosUtilesPorSitioWrap');if(w)w.classList.toggle('setup-hidden',(this.value||'')!=='cubos_independientes');try{dwcRefreshMulticuboDependienteUi('setup')}catch(e0){};try{dwcReparentSetupSlidersForPreview()}catch(e0b){};try{updateTorreBuilder()}catch(e1){};try{refreshDwcTapHintSetup()}catch(e2){};actualizarResumenSetup()}catch(e){}"
            aria-label="DWC: un depósito o cubos multiválvula">
            <option value="dep_unido">Un depósito: varias macetas comparten el mismo agua</option>
            <option value="cubos_independientes">Varios cubos (multiválvula) — 1 maceta por cubo</option>
          </select>
        </${D}>
        <${D} id="setupDwcNumCubosWrap" class="setup-hidden">
          <label class="form-label setup-dwc-label" for="setupDwcNumCubos">¿Cuántos cubos?</label>
          <input type="number" id="setupDwcNumCubos" class="setup-dwc-input" min="1" max="24" step="1" placeholder="ej. 4" inputmode="numeric" autocomplete="off" aria-label="Número de cubos DWC multiválvula"
            oninput="try{updateTorreBuilder()}catch(e0){}try{refreshDwcTapHintSetup()}catch(e1){}try{actualizarResumenSetup()}catch(e2){}try{onSetupDwcMedidasInput()}catch(e3){}">
        </${D}>
        <${D} id="setupDwcPreviewSection" class="setup-dwc-preview-section">
          <p class="setup-dwc-preview-kicker">Vista previa del montaje</p>
          <${D} class="torre-preview torre-preview--dwc" id="setupDwcPreview" role="img" aria-live="polite"></${D}>
          <${D} id="setupDwcDepUnidoControls" class="setup-dwc-dep-unido-controls setup-dwc-dep-unido-only"></${D}>
        </${D}>
        <${D} id="setupDwcLitrosUtilesPorSitioWrap" class="setup-hidden" aria-hidden="true">
          <input type="hidden" id="setupDwcLitrosUtilesPorSitioL" value="">
        </${D}>
        <h3 class="setup-dwc-section-title">Medidas del cubo</h3>
        <${D} class="setup-dwc-grid-3" id="setupDwcMedidasRow">
          <${D} id="setupDwcMedidasLAWrap" class="setup-dwc-medidas-span2 setup-dwc-dep-unido-only">
            <${D}><label class="form-label setup-dwc-label" for="setupDwcLargoCm">Largo (cm)</label><input type="number" id="setupDwcLargoCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></${D}></${D}>
            <${D}><label class="form-label setup-dwc-label" for="setupDwcAnchoCm">Ancho (cm)</label><input type="number" id="setupDwcAnchoCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></${D}></${D}>
          </${D}>
          <${D} id="setupDwcMedidasCilWrap" class="setup-dwc-medidas-span2 setup-dwc-medidas-cil-only setup-hidden">
            <${D}><label class="form-label setup-dwc-label" for="setupDwcDiametroCm">Ø interior (cm)</label><input type="number" id="setupDwcDiametroCm" min="5" max="300" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput();actualizarResumenSetup()}catch(e){}"></${D}></${D}>
          </${D}>
          <${D} id="setupDwcProfWrap"><label class="form-label setup-dwc-label" for="setupDwcProfCm">Prof./altura útil líquido (cm)</label><input type="number" id="setupDwcProfCm" min="5" max="200" step="0.5" placeholder="—" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></${D}></${D}>
        </${D}>
        <${D} id="setupDwcVolumenManualWrap" class="setup-hidden setup-dwc-dep-unido-only">
          <label class="form-label setup-dwc-label" for="setupDwcVolumenManualL">Volumen útil real (L)</label>
          <input type="number" id="setupDwcVolumenManualL" min="1" max="800" step="0.1" placeholder="ej. 18.0" class="setup-dwc-input" oninput="onSetupDwcMedidasInput()">
          <p id="setupDwcVolumenManualHint" class="setup-hidden setup-dwc-cap-hint" role="status"></p>
        </${D}>
        <${D} id="setupDwcLitrosCuboBlock" class="setup-dwc-litros-cubo-block setup-hidden" role="status" aria-live="polite">
          <p id="setupDwcCapacidadEstimada" class="setup-dwc-litros-cubo-valor"></p>
        </${D}>
        <h3 class="setup-dwc-section-title">Medidas de la cesta</h3>
        <${D} class="setup-dwc-grid-2 setup-dwc-grid-2-top">
          <${D}><label class="form-label setup-dwc-label" for="setupDwcPotRimMm">Diámetro cesta (mm)</label><input type="number" id="setupDwcPotRimMm" min="25" max="120" step="1" placeholder="ej. 50" class="setup-dwc-input" oninput="try{onSetupDwcMedidasInput();refreshDwcTapHintSetup()}catch(e){}" onchange="try{actualizarResumenSetup()}catch(e){}"></${D}></${D}>
          <${D}><label class="form-label setup-dwc-label" for="setupDwcPotHmm">Altura cesta (mm)</label><input type="number" id="setupDwcPotHmm" min="30" max="200" step="1" placeholder="ej. 75" class="setup-dwc-input" onchange="try{onSetupDwcMedidasInput();actualizarResumenSetup()}catch(e){}" oninput="try{onSetupDwcMedidasInput()}catch(e){}"></${D}></${D}>
        </${D}>
        <${D} id="setupDwcDepUnidoExtrasWrap" class="setup-dwc-dep-unido-only">
        <${D}><label class="form-label setup-dwc-label" for="setupDwcModoCultivo">Modo DWC</label><select id="setupDwcModoCultivo" class="setup-dwc-input" onchange="try{onDwcModoChanged(DWC_FORM_IDS_SETUP);actualizarResumenSetup()}catch(e){}"><option value="aireado">DWC aireado</option><option value="kratky">Kratky</option></select></${D}>
        <${D}><label class="form-label setup-dwc-label" for="setupDwcObjetivoCultivo">Objetivo de cultivo</label><select id="setupDwcObjetivoCultivo" class="setup-dwc-input"><option value="final">Planta adulta</option><option value="baby">Baby leaf</option></select></${D}>
        <p id="setupDwcCultivoRecoStatus" class="setup-hidden" role="status"></p>
        <${D} id="setupDwcDepUnidoRejillaWrap">
        <${D}><label class="form-label setup-dwc-label" for="setupDwcRejillaPreferida">Rejilla</label><select id="setupDwcRejillaPreferida" class="setup-dwc-input"><option value="objetivo">Por objetivo</option><option value="max">Máxima</option></select></${D}>
        <${D} class="setup-dwc-grid-2"><${D}><label for="setupDwcTapaMarcoMm">Marco tapa</label><input type="number" id="setupDwcTapaMarcoMm" class="setup-dwc-input"></${D}><${D}><label for="setupDwcTapaHuecoMm">Entre cestas</label><input type="number" id="setupDwcTapaHuecoMm" class="setup-dwc-input"></${D}></${D}>
        <p id="setupDwcTapaCestasHint" class="setup-hidden"></p>
        <button type="button" class="setup-hidden" id="btnDwcAplicarRejillaPrincipalSetup"></button>
        <p id="setupDwcRejillaHintPrincipal" class="setup-hidden"></p>
        <button type="button" class="setup-hidden" id="btnDwcAplicarRejillaSecundariaSetup"></button>
        </${D}>
        <label class="setup-dwc-check-label setup-dwc-dep-unido-only"><input type="checkbox" id="setupDwcCupulas" class="setup-dwc-check-input"><span>Cúpulas</span></label>
        <label class="setup-dwc-check-label setup-dwc-dep-unido-only"><input type="checkbox" id="setupDwcEntradaAire" class="setup-dwc-check-input"><span>Entrada aire</span></label>
        <${D} id="setupVolMezclaSlotDwc" class="setup-dwc-vol-mezcla-slot setup-mt-10 setup-dwc-dep-unido-only"></${D}>
        </${D}>
        </${D}>
`;

h = h.slice(0, i0) + block + h.slice(i1);
h = h.replace(
  /<div id="setupDwcIntroBloque">[\s\S]*?<\/div>\s*<div id="setupRdwcDetalleWrap"/,
  `<${D} id="setupDwcIntroBloque" class="setup-hidden" aria-hidden="true"></${D}>\n        <${D} id="setupRdwcDetalleWrap"`
);
fs.writeFileSync(p, h);
console.log('ok');
