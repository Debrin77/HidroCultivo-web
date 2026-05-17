const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

if (!s.includes('setupNftAplicarCestaBtn')) {
  const a =
    '              <p id="setupNftCestaRecoStatus" class="setup-nft-compat-status setup-hidden" role="status" aria-live="polite"></p>' +
    nl +
    '            </div>';
  const b =
    '              <p id="setupNftCestaRecoStatus" class="setup-nft-compat-status setup-hidden" role="status" aria-live="polite"></p>' +
    nl +
    '              <motion class="setup-nft-aplicar-reco-row">' +
    nl +
    '                <button type="button" class="btn btn-secondary btn-sm" id="setupNftAplicarCestaBtn" onclick="aplicarNftCestaRecomendada(\'setup\')" disabled>Aplicar cesta recomendada</button>' +
    nl +
    '                <button type="button" class="btn btn-secondary btn-sm" id="setupNftAplicarCanalBtn" onclick="aplicarNftCanalRecomendado(\'setup\')" disabled>Aplicar Ø canal (cultivo)</button>' +
    nl +
    '              </motion>' +
    nl +
    '            </div>';
  const bFixed = b.replace(/<motion /g, '<motion ').replace(/<\/motion>/g, '</div>').replace(/<motion class/g, '<div class');
  const bOk =
    '              <p id="setupNftCestaRecoStatus" class="setup-nft-compat-status setup-hidden" role="status" aria-live="polite"></p>' +
    nl +
    '              <motion class="setup-nft-aplicar-reco-row">'.replace('<motion', '<div') +
    nl +
    '                <button type="button" class="btn btn-secondary btn-sm" id="setupNftAplicarCestaBtn" onclick="aplicarNftCestaRecomendada(\'setup\')" disabled>Aplicar cesta recomendada</button>' +
    nl +
    '                <button type="button" class="btn btn-secondary btn-sm" id="setupNftAplicarCanalBtn" onclick="aplicarNftCanalRecomendado(\'setup\')" disabled>Aplicar Ø canal (cultivo)</button>' +
    nl +
    '              </div>' +
    nl +
    '            </motion>'.replace('</motion>', '</motion>');
  const insert =
    '              <p id="setupNftCestaRecoStatus" class="setup-nft-compat-status setup-hidden" role="status" aria-live="polite"></p>' +
    nl +
    '              <div class="setup-nft-aplicar-reco-row">' +
    nl +
    '                <button type="button" class="btn btn-secondary btn-sm" id="setupNftAplicarCestaBtn" onclick="aplicarNftCestaRecomendada(\'setup\')" disabled>Aplicar cesta recomendada</button>' +
    nl +
    '                <button type="button" class="btn btn-secondary btn-sm" id="setupNftAplicarCanalBtn" onclick="aplicarNftCanalRecomendado(\'setup\')" disabled>Aplicar Ø canal (cultivo)</button>' +
    nl +
    '              </div>' +
    nl +
    '            </div>';
  if (!s.includes(a)) {
    console.error('setup cesta status anchor missing');
    process.exit(1);
  }
  s = s.replace(a, insert);
}

if (!s.includes('sysNftAplicarCestaBtn')) {
  const sysA =
    '              <input type="number" id="sysNftPotHmm" class="torre-nft-input-mt" min="30" max="200" step="1" placeholder="—"' +
    nl +
    '                inputmode="numeric" autocomplete="off">' +
    nl +
    '            </div>' +
    nl +
    '          </div>' +
    nl +
    '        </div>' +
    nl +
    '        <button type="button" class="torre-nft-apply-btn" onclick="aplicarSistemaNftMontajeDesdeFormulario()">';
  const sysB =
    '              <input type="number" id="sysNftPotHmm" class="torre-nft-input-mt" min="30" max="200" step="1" placeholder="—"' +
    nl +
    '                inputmode="numeric" autocomplete="off">' +
    nl +
    '            </div>' +
    nl +
    '          </motion>' +
    nl +
    '          <button type="button" class="btn btn-secondary btn-sm setup-mt-8" id="sysNftAplicarCestaBtn" onclick="aplicarNftCestaRecomendada(\'sys\')" disabled>Aplicar cesta recomendada</button>' +
    nl +
    '        </div>' +
    nl +
    '        <button type="button" class="torre-nft-apply-btn" onclick="aplicarSistemaNftMontajeDesdeFormulario()">';
  const sysInsert =
    '              <input type="number" id="sysNftPotHmm" class="torre-nft-input-mt" min="30" max="200" step="1" placeholder="—"' +
    nl +
    '                inputmode="numeric" autocomplete="off">' +
    nl +
    '            </div>' +
    nl +
    '          </div>' +
    nl +
    '          <button type="button" class="btn btn-secondary btn-sm" id="sysNftAplicarCestaBtn" onclick="aplicarNftCestaRecomendada(\'sys\')" disabled>Aplicar cesta recomendada</button>' +
    nl +
    '        </div>' +
    nl +
    '        <button type="button" class="torre-nft-apply-btn" onclick="aplicarSistemaNftMontajeDesdeFormulario()">';
  if (!s.includes(sysA)) {
    console.error('sys pot anchor missing');
    process.exit(1);
  }
  s = s.replace(sysA, sysInsert);
}

s = s.replace(
  /hc-setup-wizard-nft-diagrams\.js\?v=[^"]+/,
  'hc-setup-wizard-nft-diagrams.js?v=2026-05-15-nft-aplicar'
);

fs.writeFileSync(p, s);
console.log('patched aplicar reco buttons');
