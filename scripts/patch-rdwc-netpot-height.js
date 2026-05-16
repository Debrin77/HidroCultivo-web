const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

const sysPotLine =
  '              <motion><label class="form-label torre-dwc-lbl-mono" for="sysRdwcNetPotMm" title="Diámetro del aro / net pot">Ø aro net pot (mm)</label><input type="number" id="sysRdwcNetPotMm" class="torre-dwc-input" min="40" max="200" step="1" placeholder="125"></div>';

const sysPotLineReal =
  '              <div><label class="form-label torre-dwc-lbl-mono" for="sysRdwcNetPotMm" title="Diámetro del aro / net pot">Ø aro net pot (mm)</label><input type="number" id="sysRdwcNetPotMm" class="torre-dwc-input" min="40" max="200" step="1" placeholder="125"></motion></div>';

const sysPotLineOk =
  '              <motion><label class="form-label torre-dwc-lbl-mono" for="sysRdwcNetPotMm" title="Diámetro del aro / net pot">Ø aro net pot (mm)</label><input type="number" id="sysRdwcNetPotMm" class="torre-dwc-input" min="40" max="200" step="1" placeholder="125"></div>';

// Use exact from file
const anchor = s.match(/[^\n]*sysRdwcNetPotMm[^\n]*/);
if (!anchor) {
  console.error('sysRdwcNetPotMm line missing');
  process.exit(1);
}
const potLine = anchor[0];
if (!s.includes(potLine + nl + '              <div><label class="form-label torre-dwc-lbl-mono" for="sysRdwcNetPotHeightMm"')) {
  const heightInMain =
    nl +
    '              <div><label class="form-label torre-dwc-lbl-mono" for="sysRdwcNetPotHeightMm" title="Altura del cuerpo del macetero de red (envase o catálogo)">Altura cesta / net pot (mm)</label><input type="number" id="sysRdwcNetPotHeightMm" class="torre-dwc-input" min="30" max="200" step="1" placeholder="ej. 75" inputmode="numeric"></div>';
  s = s.replace(potLine, potLine + heightInMain);
}

const diyHeight =
  nl +
  '              <div><label class="form-label torre-dwc-lbl-mono" for="sysRdwcNetPotHeightMm" title="Altura del cuerpo del macetero de red; opcional">Altura net pot (mm, opc.)</label><input type="number" id="sysRdwcNetPotHeightMm" class="torre-dwc-input" min="30" max="200" step="1" placeholder="—"></div>' +
  nl;
if (s.includes(diyHeight)) {
  s = s.replace(diyHeight, nl);
}

if (!s.includes('id="sysRdwcLitrosUtilesHint"')) {
  const hint =
    '            <p id="sysRdwcLitrosUtilesHint" class="torre-nft-p-soft setup-dwc-help" role="status" aria-live="polite"></p>' + nl;
  s = s.replace(
    '            </motion></motion>' + nl + '            <div id="sysRdwcMontajeDiyExtra"',
    '            </div>' + nl + hint + '            <div id="sysRdwcMontajeDiyExtra"'
  );
  if (!s.includes('id="sysRdwcLitrosUtilesHint"')) {
    s = s.replace(
      '            </motion></div>' + nl + '            <div id="sysRdwcMontajeDiyExtra"',
      '            </div>' + nl + hint + '            <motion id="sysRdwcMontajeDiyExtra"'
    );
  }
  if (!s.includes('id="sysRdwcLitrosUtilesHint"')) {
    s = s.replace(
      '            </motion></div>' + nl + '            <div id="sysRdwcMontajeDiyExtra"',
      '            </div>' + nl + hint + '            <div id="sysRdwcMontajeDiyExtra"'
    );
  }
}

const setupAnchor = s.match(/[^\n]*setupRdwcNetPotMm[^\n]*/);
if (!setupAnchor) {
  console.error('setupRdwcNetPotMm missing');
  process.exit(1);
}
const setupPot = setupAnchor[0];
if (!setupPot.includes('onSetupRdwcInput')) {
  console.warn('setup pot line unexpected');
}
if (!s.includes(setupPot + nl + '            <div><label class="form-label setup-dwc-label" for="setupRdwcNetPotHeightMm"')) {
  const setupHeight =
    nl +
    '            <div><label class="form-label setup-dwc-label" for="setupRdwcNetPotHeightMm" title="Altura del cuerpo del macetero (envase)">Altura cesta / net pot (mm)</label><input type="number" id="setupRdwcNetPotHeightMm" class="setup-dwc-input" min="30" max="200" step="1" placeholder="ej. 75" inputmode="numeric" oninput="try{onSetupRdwcInput()}catch(e){}"></div>';
  s = s.replace(setupPot, setupPot + setupHeight);
}

const setupDiyHeight =
  nl +
  '            <div><label class="form-label setup-dwc-label" for="setupRdwcNetPotHeightMm" title="Altura del cuerpo del macetero de red; opcional">Altura net pot (mm, opc.)</label><input type="number" id="setupRdwcNetPotHeightMm" class="setup-dwc-input" min="30" max="200" step="1" placeholder="—"></div>' +
  nl;
if (s.includes(setupDiyHeight)) {
  s = s.replace(setupDiyHeight, nl);
}

if (!s.includes('id="setupRdwcLitrosUtilesHint"')) {
  const setupHint =
    '          <p id="setupRdwcLitrosUtilesHint" class="setup-dwc-help" role="status" aria-live="polite"></p>' + nl;
  s = s.replace(
    '          <div id="setupRdwcMontajeDiyExtra" class="setup-dwc-grid-2">',
    setupHint + '          <motion id="setupRdwcMontajeDiyExtra" class="setup-dwc-grid-2">'
  );
  if (!s.includes('id="setupRdwcLitrosUtilesHint"')) {
    s = s.replace(
      '          <div id="setupRdwcMontajeDiyExtra" class="setup-dwc-grid-2">',
      setupHint + '          <div id="setupRdwcMontajeDiyExtra" class="setup-dwc-grid-2">'
    );
  }
}

fs.writeFileSync(p, s);
console.log('patched RDWC net pot height in index.html');
