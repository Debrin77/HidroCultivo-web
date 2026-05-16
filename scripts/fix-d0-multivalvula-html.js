const fs = require('fs');
const path = require('path');
const dwcPath = path.join(__dirname, '..', 'js', 'hc-setup-wizard-dwc.js');
const clPath = path.join(__dirname, '..', 'js', 'hc-setup-checklist.js');
const D = 'd' + 'iv';

let dwc = fs.readFileSync(dwcPath, 'utf8');
const dwcRe = /\/\*\* Checklist D·0 multiválvula[\s\S]*?\nfunction dwcFormatHtmlRecomendacionDifusorCore\(rec\) \{/;
const dwcNew =
  `/** Checklist D·0 multiválvula: solo litros de solución y caudales de aire (por cubo y bomba). */
function dwcFormatHtmlD0MultivalvulaDatos(rec) {
  if (!rec || rec.diseno !== 'cubos_independientes') return '';
  const vSol = Math.round(Number(rec.volPorSitio) * 10) / 10;
  const aireCubo = Math.round(Number(rec.caudalPorSitioReco) * 10) / 10;
  const aireTotal = Math.round(Number(rec.reco) * 10) / 10;
  if (!Number.isFinite(vSol) || vSol <= 0 || !Number.isFinite(aireCubo) || aireCubo <= 0) return '';
  const total =
    Number.isFinite(aireTotal) && aireTotal > 0 ? aireTotal : aireCubo * Math.max(1, rec.nTotal || 1);
  return (
    '<${D} class="cl-dwc-d0-datos">' +
    '<${D} class="cl-dwc-d0-dato"><span class="cl-dwc-d0-dato-lab">Solución con nutrientes · por cubo</span>' +
    '<span class="cl-dwc-d0-dato-val">' + vSol + ' L</span></${D}>' +
    '<${D} class="cl-dwc-d0-dato"><span class="cl-dwc-d0-dato-lab">Aireación · por cubo</span>' +
    '<span class="cl-dwc-d0-dato-val">~' + aireCubo + ' L/min</span></${D}>' +
    '<${D} class="cl-dwc-d0-dato cl-dwc-d0-dato--total"><span class="cl-dwc-d0-dato-lab">Bomba multiválvula · total sistema</span>' +
    '<span class="cl-dwc-d0-dato-val">~' + total + ' L/min</span></${D}>' +
    '</${D}>'
  ).split('${D}').join(D);
}

function dwcFormatHtmlRecomendacionDifusorCore(rec) {`;
if (!dwcRe.test(dwc)) {
  console.error('dwc block not found');
  process.exit(1);
}
dwc = dwc.replace(dwcRe, dwcNew);
fs.writeFileSync(dwcPath, dwc);

let cl = fs.readFileSync(clPath, 'utf8');
cl = cl.replace(
  "            ? 'Enciende la <strong>bomba multiválvula</strong> (una línea de aire por cubo). En PC·1 confirmaste <strong>litros útiles por cubo</strong>; en el paso 4 los <strong>ml son para un cubo</strong> — repite en cada uno.'",
  "            ? 'Enciende la <strong>bomba multiválvula</strong> (una línea de aire por cubo, difusor al fondo de cada cubo).'"
);
cl = cl.replace(
  "            ? 'Caudal de la <strong>bomba en conjunto</strong> (suma de cubos). Cada salida: difusor al fondo. La mezcla va <strong>en cada cubo</strong>, no en un depósito común.'",
  '            ? null'
);
cl = cl.replace(
  '            (clGuiaMcHtml || \'\') +\n            \'<div id="clDwcDifusorRecomendacion"',
  '            (dwcOxMult ? \'\' : clGuiaMcHtml || \'\') +\n            \'<motion id="clDwcDifusorRecomendacion"'
);
cl = cl.replace(
  '            (dwcOxMult ? \'\' : clGuiaMcHtml || \'\') +\n            \'<motion id="clDwcDifusorRecomendacion"',
  '            (dwcOxMult ? \'\' : clGuiaMcHtml || \'\') +\n            \'<div id="clDwcDifusorRecomendacion"'
);
fs.writeFileSync(clPath, cl);
console.log('ok');
