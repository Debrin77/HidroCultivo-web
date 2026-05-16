const fs = require('fs');
const path = require('path');
const D = 'd' + 'iv';
const htmlPath = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(htmlPath, 'utf8');

if (h.includes('sysDwcDepUnidoModoResumen')) {
  console.log('already patched');
  process.exit(0);
}

const re = new RegExp(
  `[ \\t]*<${D}>\\s*\\n[ \\t]*<label class="form-label torre-dwc-lbl-mono" for="sysDwcOxigenacionDiseno">Distribución del aire</label>[\\s\\S]*?id="sysDwcLitrosUtilesPorSitioWrap"[\\s\\S]*?</${D}>\\s*\\n`,
  'm'
);

const replacement =
  `          <${D} id="sysDwcDepUnidoModoResumen" class="torre-dwc-modo-resumen setup-hidden" role="status">
            <p class="torre-dwc-modo-resumen-tit"><strong>Un depósito</strong> · macetas en rejilla</p>
            <p class="torre-nft-p-soft torre-dwc-modo-resumen-txt">Todas las cestas comparten el mismo agua. Usa la rejilla y el esquema para filas y columnas.</p>
          </${D}>
          <${D} id="sysDwcOxigenacionModeWrap" class="setup-hidden">
            <label class="form-label torre-dwc-lbl-mono" for="sysDwcOxigenacionDiseno">Varios cubos (multiválvula)</label>
            <select id="sysDwcOxigenacionDiseno" class="torre-dwc-input" aria-label="DWC multiválvula"
              oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}">
              <option value="cubos_independientes">Varios cubos — 1 maceta por cubo</option>
            </select>
            <p class="torre-nft-p-soft" style="margin:0.35rem 0 0">Indica cuántos cubos y las medidas de un cubo típico. Los ml del checklist son <strong>por cubo</strong>.</p>
          <${D} id="sysDwcNumCubosWrap" class="setup-hidden">
            <label class="form-label torre-dwc-lbl-mono" for="sysDwcNumCubos">¿Cuántos cubos tienes?</label>
            <input type="number" id="sysDwcNumCubos" class="torre-dwc-input" min="1" max="24" step="1" placeholder="ej. 5" inputmode="numeric" autocomplete="off" aria-label="Número de cubos DWC con multivalvula"
              oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}">
          </${D}>
          <${D} id="sysDwcLitrosUtilesPorSitioWrap" class="setup-hidden">
            <label class="form-label torre-dwc-lbl-mono" for="sysDwcLitrosUtilesPorSitioL">Litros útiles por cubo (L, opcional)</label>
            <input type="number" id="sysDwcLitrosUtilesPorSitioL" class="torre-dwc-input" min="0.5" max="200" step="0.1" placeholder="Vacío → seguro y reparto" inputmode="decimal" autocomplete="off" aria-label="Litros útiles por cubo con cámara de aire"
              oninput="try{refreshDwcSistemaMedidasUI()}catch(e){}">
            <p class="torre-nft-p-soft" style="margin:0.35rem 0 0">Si las medidas y la cesta describen <strong>un cubo típico</strong>, vacío aquí = la app toma el <strong>mínimo</strong> entre la mezcla total repartida entre sitios y el <strong>llenado seguro</strong> por cubo (cámara de aire), igual que con un solo depósito. Indica litros si midió cada cubo.</p>
          </${D}>
          </${D}>
`;

if (!re.test(h)) {
  console.error('regex not found');
  process.exit(1);
}
h = h.replace(re, replacement);
fs.writeFileSync(htmlPath, h);
console.log('ok');
