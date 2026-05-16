const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
h = h.replace(
  'id="setupSrfEspaciamientoCm" class="setup-dwc-input" min="8" max="60" step="1" placeholder="20" oninput="try{updateTorreBuilder()}catch(e){}"></div></div>',
  'id="setupSrfEspaciamientoCm" class="setup-dwc-input" min="8" max="60" step="1" placeholder="20" oninput="try{updateTorreBuilder()}catch(e){}"></motion>'
);
h = h.replace(
  'id="sysSrfEspaciamientoCm" class="torre-dwc-input" min="8" max="60" step="1" placeholder="20" oninput="try{srfRefreshSysFormLive()}catch(e){}"></div></div>',
  'id="sysSrfEspaciamientoCm" class="torre-dwc-input" min="8" max="60" step="1" placeholder="20" oninput="try{srfRefreshSysFormLive()}catch(e){}"></div>'
);
h = h.replace(/<\/motion>/g, '</div>');
h = h.replace(/<motion>/g, '<div>');
fs.writeFileSync(p, h);
console.log('extra div', h.includes('EspaciamientoCm"></motion></div>'));
