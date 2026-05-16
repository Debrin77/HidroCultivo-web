const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
const nl = '\r\n';
const X = 'd' + 'iv';
let h = fs.readFileSync(p, 'utf8');

h = h.replace(/<motion /gi, '<' + X + ' ');
h = h.replace(/<\/motion>/gi, '</' + X + '>');

const nftBroken =
  '<' + X + ' id="setupNftBuilderWrap"<motion id="setupNftBuilderWrap" class="setup-hidden">';
h = h.replace(nftBroken.split('motion').join(X), '<' + X + ' id="setupNftBuilderWrap" class="setup-hidden setup-nft-asistente-simple">');

if (!h.includes('setupRdwcPreview')) {
  const old =
    '<' + X + ' id="setupRdwcDetalleWrap" class="setup-hidden">' +
    nl +
    '          <' + X + ' class="setup-dwc-title">Sistema RDWC</' + X + '>' +
    nl +
    '          <p class="setup-dwc-help"><strong>En un vistazo:</strong>';
  const neu =
    '<' + X + ' id="setupRdwcDetalleWrap" class="setup-hidden setup-rdwc-asistente-simple">' +
    nl +
    '          <' + X + ' class="setup-dwc-title">Sistema RDWC</' + X + '>' +
    nl +
    '          <p class="setup-dwc-help">Indica <strong>cubos</strong>, <strong>depósito de control</strong> y Ø de cesta. Recirculación y aire en tiempo real.</p>' +
    nl +
    '          <' + X + ' id="setupRdwcPreviewSection" class="setup-dwc-preview-section setup-dwc-preview-section--diagram">' +
    nl +
    '            <p class="setup-dwc-preview-kicker">Vista previa</p>' +
    nl +
    '            <' + X + ' class="torre-preview torre-preview--rdwc" id="setupRdwcPreview" role="img" aria-live="polite"></' + X + '>' +
    nl +
    '          </' + X + '>' +
    nl +
    '          <' + X + ' id="setupRdwcRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
    nl +
    '            <p class="setup-dwc-litros-solucion-label">Resultados recomendados</p>' +
    nl +
    '            <p class="setup-dwc-litros-solucion-valor" id="setupRdwcRecoValor">—</p>' +
    nl +
    '            <p class="setup-dwc-litros-solucion-hint" id="setupRdwcRecoHint"></p>' +
    nl +
    '          </' + X + '>' +
    nl +
    '          <p class="setup-dwc-help setup-hidden"><strong>En un vistazo:</strong>';
  if (h.includes(old)) h = h.replace(old, neu);
  else console.error('RDWC anchor missing');
}

if (!h.includes('setupNftRecoBlock')) {
  const oldNft =
    '            <' + X + ' class="torre-preview nft-schematic-host" id="nftPreview" aria-hidden="true"></' + X + '>' +
    nl +
    '          </' + X + '>' +
    nl +
    '          <' + X + ' class="torre-controls">';
  const neuNft =
    '            <' + X + ' class="torre-preview nft-schematic-host" id="nftPreview" aria-live="polite"></' + X + '>' +
    nl +
    '          </' + X + '>' +
    nl +
    '          <' + X + ' id="setupNftRecoBlock" class="setup-dwc-litros-solucion-block setup-mt-8" role="status" aria-live="polite">' +
    nl +
    '            <p class="setup-dwc-litros-solucion-label">Bomba y circuito (orientativo)</p>' +
    nl +
    '            <p class="setup-dwc-litros-solucion-valor" id="setupNftRecoValor">—</p>' +
    nl +
    '            <p class="setup-dwc-litros-solucion-hint" id="setupNftRecoHint"></p>' +
    nl +
    '          </' + X + '>' +
    nl +
    '          <' + X + ' class="torre-controls">';
  if (h.includes(oldNft)) h = h.replace(oldNft, neuNft);
}

['setupRdwcSites', 'setupRdwcRows', 'setupRdwcBucketVolL', 'setupRdwcControlVolL', 'setupRdwcNetPotMm'].forEach((id) => {
  const re = new RegExp('(id="' + id + '"[^>]*)(>)');
  h = h.replace(re, (m, a, b) => (m.includes('onSetupRdwcInput') ? m : a + ' oninput="try{onSetupRdwcInput()}catch(e){}"' + b));
});

fs.writeFileSync(p, h);
console.log({
  rdwc: h.includes('setupRdwcPreview'),
  nftReco: h.includes('setupNftRecoBlock'),
  nftWrap: !h.includes('setupNftBuilderWrap"<'),
  motionTags: (h.match(/<motion/gi) || []).length,
});
