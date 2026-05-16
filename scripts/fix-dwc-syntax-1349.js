const fs = require('fs');
const p = require('path').join(__dirname, '..', 'js', 'hc-setup-wizard-dwc.js');
let s = fs.readFileSync(p, 'utf8');
const bad = "    '</motion>';\n}\n\nfunction dwcFormatHtmlRecomendacionDifusorCore";
const good = "    '</div>'\n  );\n}\n\nfunction dwcFormatHtmlRecomendacionDifusorCore";
if (s.includes(bad.replace('motion', 'div'))) {
  s = s.replace(
    "    '</div>';\n}\n\nfunction dwcFormatHtmlRecomendacionDifusorCore",
    "    '</motion>'\n  );\n}\n\nfunction dwcFormatHtmlRecomendacionDifusorCore".replace(/motion/g, 'div')
  );
  fs.writeFileSync(p, s);
  console.log('fixed paren');
} else {
  console.log('pattern not found');
  const i = s.indexOf('dwcFormatHtmlD0MultivalvulaDatos');
  console.log(s.slice(i, i + 800));
}
