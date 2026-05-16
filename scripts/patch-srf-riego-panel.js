const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
const D = 'd' + 'iv';
const NL = '\r\n';
const needle = '        </' + D + '>' + NL + NL + '        <' + D + ' id="riegoTorreResultBlock">';
const before =
  '            <' + D + ' id="riegoClimaUsadoRdwc" class="riego-clima-ref setup-hidden"></' + D + '>' + NL + '          </' + D + '>' + NL + needle;
if (!h.includes('riegoSrfPanel')) {
  const block =
    '            <' + D + ' id="riegoClimaUsadoRdwc" class="riego-clima-ref setup-hidden"></' + D + '>' + NL + '          </' + D + '>' + NL + '        </' + D + '>' + NL + NL + '        <' +
    D +
    ' id="riegoSrfPanel" class="riego-panel-dwc setup-hidden">' + NL +
    '          <' + D + ' class="riego-panel-inner">' + NL +
    '            <' + D + ' class="riego-panel-kicker riego-panel-kicker--dwc">' + NL +
    '              Estanque común (SRF / DFT)' + NL +
    '            </' + D + '>' + NL +
    '            <p class="riego-panel-lead">' + NL +
    '              En <strong>SRF</strong> (raíz flotante) todas las plantas comparten un <strong>estanque único</strong> bajo la balsa; la solución no se riega por pulsos como en torre vertical.' + NL +
    '              Vigila <strong>oxigenación</strong> (aireador o cámara de aire en Kratky), temperatura del líquido y nivel respecto a la balsa. Aquí solo tienes <strong>referencia del clima</strong> para toldo y estrés del follaje.' + NL +
    '            </p>' + NL +
    '            <' + D + ' class="card-title riego-card-title-sm"><svg class="hc-ico hc-ico--title-sm" aria-hidden="true" focusable="false"><use href="#hc-i-cloud-sun"/></svg> Datos climáticos</' + D + '>' + NL +
    '            <' + D + ' id="riegoClimaUsadoSrf" class="riego-clima-ref setup-hidden"></' + D + '>' + NL +
    '          </' + D + '>' + NL +
    '        </' + D + '>' + NL + NL + '        <' + D + ' id="riegoTorreResultBlock">';
  const idx = h.indexOf(before);
  if (idx < 0) {
    console.error('before block not found');
    process.exit(1);
  }
  h = h.slice(0, idx) + block + h.slice(idx + before.length);
  fs.writeFileSync(p, h);
  console.log('inserted riegoSrfPanel');
} else {
  console.log('riegoSrfPanel already present');
}

// welcome + meta
h = fs.readFileSync(p, 'utf8');
h = h.replace(
  '<strong>3</strong> sistemas hidropónicos',
  '<strong>5</strong> sistemas hidropónicos'
);
h = h.replace(
  '<p>Torre, NFT o DWC con estructura consistente desde el primer día.</p>',
  '<p>Torre, NFT, DWC, RDWC o SRF con estructura consistente desde el primer día.</p>'
);
h = h.replace(
  'varias instalaciones (torre, NFT, DWC), EC',
  'varias instalaciones (torre, NFT, DWC, RDWC, SRF), EC'
);
h = h.replace(
  'HidroCultivo, hidropónico, torre vertical, NFT, DWC, cultivo',
  'HidroCultivo, hidropónico, torre vertical, NFT, DWC, RDWC, SRF, cultivo'
);
h = h.replace(
  'instalación activa</strong> (Torre, NFT o DWC).',
  'instalación activa</strong> (torre, NFT, DWC, RDWC o SRF).'
);
fs.writeFileSync(p, h);
console.log('updated welcome/meta');
