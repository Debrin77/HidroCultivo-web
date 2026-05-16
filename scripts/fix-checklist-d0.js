const fs = require('fs');
const p = require('path').join(__dirname, '..', 'js', 'hc-setup-checklist.js');
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  "desc: dwcOxMult\n            ? 'Enciende la <strong>bomba multiválvula</strong> (una línea de aire por cubo). En PC·1 confirmaste <strong>litros útiles por cubo</strong>; en el paso 4 los <strong>ml son para un cubo</strong> — repite en cada uno.'",
  "desc: dwcOxMult\n            ? 'Enciende la <strong>bomba multiválvula</strong> (una línea de aire por cubo, difusor al fondo de cada cubo).'"
);
s = s.replace(
  "nota: dwcOxMult\n            ? 'Caudal de la <strong>bomba en conjunto</strong> (suma de cubos). Cada salida: difusor al fondo. La mezcla va <strong>en cada cubo</strong>, no en un depósito común.'",
  'nota: dwcOxMult ? null :'
);
// fix broken nota - the replace above is wrong. Do it properly.
s = fs.readFileSync(p, 'utf8');
const block =
  `          desc: dwcOxMult
            ? 'Enciende la <strong>bomba multiválvula</strong> (una línea de aire por cubo, difusor al fondo de cada cubo).'
            : 'Dimensiona el <strong>aireador</strong> y los <strong>difusores</strong> según los <strong>litros reales</strong> de solución (mezcla o depósito) y el <strong>número de cestas</strong> de tu rejilla. El recuadro inferior usa la misma lógica que la pestaña Cultivo e instalación.',
          nota: dwcOxMult
            ? null
            : 'Referencia habitual en DWC casero: del orden de <strong>1 L/min por cada 10 L</strong> de líquido; la app ajusta un plus por cesta (más raíz) y sugiere <strong>puntos de difusión</strong> al fondo (piedra horizontal, disco o bolas microporosas). Comprueba en la <strong>bomba</strong> el caudal a tu <strong>profundidad</strong>.',
          postCamposHtml:
            (dwcOxMult ? '' : clGuiaMcHtml || '') +
            '<div id="clDwcDifusorRecomendacion" class="cl-dwc-difusor-rec" role="status" aria-live="polite"></motion>',`;
const re = /          desc: dwcOxMult[\s\S]*?aria-live="polite"><\/div>',/;
if (!re.test(s)) {
  console.error('checklist block not found');
  process.exit(1);
}
s = s.replace(re, block.replace('</motion>', '</motion>').replace('</motion>', '</div>').replace('<motion', '<div'));
// fix the erroneous motion tag in block
const blockFixed = block.replace('</motion>', '</motion>');
const block2 =
  `          desc: dwcOxMult
            ? 'Enciende la <strong>bomba multiválvula</strong> (una línea de aire por cubo, difusor al fondo de cada cubo).'
            : 'Dimensiona el <strong>aireador</strong> y los <strong>difusores</strong> según los <strong>litros reales</strong> de solución (mezcla o depósito) y el <strong>número de cestas</strong> de tu rejilla. El recuadro inferior usa la misma lógica que la pestaña Cultivo e instalación.',
          nota: dwcOxMult
            ? null
            : 'Referencia habitual en DWC casero: del orden de <strong>1 L/min por cada 10 L</strong> de líquido; la app ajusta un plus por cesta (más raíz) y sugiere <strong>puntos de difusión</strong> al fondo (piedra horizontal, disco o bolas microporosas). Comprueba en la <strong>bomba</strong> el caudal a tu <strong>profundidad</strong>.',
          postCamposHtml:
            (dwcOxMult ? '' : clGuiaMcHtml || '') +
            '<div id="clDwcDifusorRecomendacion" class="cl-dwc-difusor-rec" role="status" aria-live="polite"></div>',`;
s = fs.readFileSync(p, 'utf8');
s = s.replace(re, block2);
fs.writeFileSync(p, s);
console.log('checklist ok');
