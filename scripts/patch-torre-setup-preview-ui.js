const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');

const markerStart = '      <div class="torre-builder">\r\n        <!-- Preview visual -->';
const markerEnd = '        <p id="setupTorreQuickHint"';

const i0 = h.indexOf(markerStart);
const i1 = h.indexOf(markerEnd, i0);
if (i0 < 0 || i1 < 0) {
  console.error('markers not found', { i0, i1 });
  process.exit(1);
}
const pEnd = h.indexOf('</p>', i1) + 4;
const iCloseTorre = h.indexOf('      </div>', pEnd);
const end = iCloseTorre + 13;
if (end <= i1) {
  console.error('end not found');
  process.exit(1);
}

const newBlock = `      <div class="torre-builder setup-torre-builder">
        <div id="setupTorrePreviewSlot" class="setup-torre-preview-slot">
          <div class="torre-preview" id="torrePreview" role="img" aria-label="Vista previa de la torre según niveles y cestas"></div>
        </div>
        <div id="setupTorreBuilderControlsSlot" class="torre-controls setup-torre-controls">
          <div class="torre-control-row">
            <label class="torre-control-label torre-control-label--solo-val" for="sliderNiveles">
              <span class="torre-control-val" id="valNiveles">5</span>
            </label>
            <input type="range" class="torre-slider" id="sliderNiveles"
              min="1" max="10" value="5" oninput="onTorreSlidersInput()"
              aria-label="Niveles de la torre">
          </div>
          <div class="torre-control-row">
            <label class="torre-control-label torre-control-label--solo-val" for="sliderCestas">
              <span class="torre-control-val" id="valCestas">5</span>
            </label>
            <input type="range" class="torre-slider" id="sliderCestas"
              min="1" max="8" value="5" oninput="onTorreSlidersInput()"
              aria-label="Cestas por nivel">
          </div>
        </div>
      </div>`;

h = h.slice(0, i0) + newBlock + h.slice(end);
fs.writeFileSync(p, h, 'utf8');
console.log('patched index.html torre builder block');
