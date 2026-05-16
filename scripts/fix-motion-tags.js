const fs = require('fs');
const p = require('path').join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
if (h.includes('<motion')) {
  h = h.replace(/<motion /g, '<div ').replace(/<\/motion>/g, '</div>');
  fs.writeFileSync(p, h);
  console.log('fixed motion tags');
} else {
  console.log('no motion tags');
}
// ensure spage1 closes before spage2
const needle = '    <div class="setup-page" id="spage2">';
const before = h.indexOf(needle);
const snippet = h.slice(before - 80, before);
if (!snippet.includes('id="spage1"') && !snippet.match(/<\/div>\s*$/)) {
  const ins = '\n    </motion>\n\n';
  const ins2 = '\n    </div>\n\n';
  if (!h.slice(before - 20, before).trim().endsWith('</div>')) {
    h = h.replace(needle, ins2 + needle);
    fs.writeFileSync(p, h);
    console.log('added spage1 close');
  }
}
