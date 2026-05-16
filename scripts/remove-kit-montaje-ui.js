const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');

function stripHint(html, hintId) {
  const re = new RegExp('\\s*<p id="' + hintId + '"[\\s\\S]*?</p>\\s*', 'g');
  return html.replace(re, '\n');
}

function stripMontajeRow(html, kitBtnId) {
  const kitPos = html.indexOf('id="' + kitBtnId + '"');
  if (kitPos < 0) return html;
  const rowStart = html.lastIndexOf('<motion class="setup-nft-montaje-origen-row', kitPos);
  const rowStart2 = html.lastIndexOf('<div class="setup-nft-montaje-origen-row', kitPos);
  const start = Math.max(rowStart, rowStart2);
  if (start < 0) return html;
  const closeDiv = html.indexOf('</div>', kitPos);
  const endRow = html.indexOf('</div>', closeDiv + 6);
  if (endRow < 0) return html;
  return html.slice(0, start) + html.slice(endRow + 6);
}

// Fix motion typo in search - use div only
function stripMontajeRowDiv(html, kitBtnId) {
  const kitPos = html.indexOf('id="' + kitBtnId + '"');
  if (kitPos < 0) return html;
  const markers = ['<motion class="setup-nft-montaje-origen-row', '<div class="setup-nft-montaje-origen-row'];
  let start = -1;
  for (const m of markers) {
    const s = html.lastIndexOf(m.replace('motion', 'motion'), kitPos);
    const s2 = html.lastIndexOf(m.replace('motion', 'div'), kitPos);
    start = Math.max(start, s, s2);
  }
  const rowMarker = html.lastIndexOf('montaje-origen-row', kitPos);
  start = html.lastIndexOf('<', rowMarker);
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const open = html.indexOf('<div', i);
    const close = html.indexOf('</motion>', i);
    const close2 = html.indexOf('</div>', i);
    const nextOpen = open >= 0 ? open : Infinity;
    const nextClose = Math.min(close2 >= 0 ? close2 : Infinity, close >= 0 ? close : Infinity);
    if (nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else if (nextClose < Infinity) {
      depth--;
      i = nextClose + (html[nextClose + 2] === 'd' ? 6 : 9);
      if (depth <= 0) {
        return html.slice(0, start) + html.slice(i);
      }
    } else break;
  }
  return html;
}

// Simpler: regex per known block
const patterns = [
  [
    /\s*<div id="setupTorreMontajeOrigenRow"[\s\S]*?<\/div>\s*<p id="setupTorreMontajeOrigenHint"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
  [
    /\s*<motion id="setupTorreMontajeOrigenRow"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
  [
    /\s*<div class="setup-nft-montaje-origen-row setup-mb-10">[\s\S]*?setupRdwcMontajeOrigenDiy[\s\S]*?<\/div>\s*<\/div>\s*<p id="setupRdwcMontajeOrigenHint"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
  [
    /<p class="setup-field-hint setup-mb-8">Elige si tu NFT es un <strong>kit comercial<\/strong>[\s\S]*?<\/p>\s*/m,
    '',
  ],
  [
    /\s*<div class="setup-nft-montaje-origen-row setup-mb-10">[\s\S]*?setupNftMontajeOrigenDiy[\s\S]*?<\/div>\s*<\/div>\s*<p id="setupNftMontajeOrigenHint"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
  [
    /\s*<div class="setup-nft-montaje-origen-row torre-nft-row-mb">[\s\S]*?sysTorreMontajeOrigenDiy[\s\S]*?<\/div>\s*<\/div>\s*<p id="sysTorreMontajeOrigenHint"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
  [
    /\s*<div class="setup-nft-montaje-origen-row torre-nft-row-mb">[\s\S]*?sysNftMontajeOrigenDiy[\s\S]*?<\/motion>\s*<\/motion>\s*<p id="sysNftMontajeOrigenHint"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
  [
    /\s*<div class="setup-nft-montaje-origen-row torre-nft-row-mb">[\s\S]*?sysNftMontajeOrigenDiy[\s\S]*?<\/div>\s*<\/div>\s*<p id="sysNftMontajeOrigenHint"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
  [
    /\s*<div class="setup-nft-montaje-origen-row torre-nft-row-mb">[\s\S]*?sysRdwcMontajeOrigenDiy[\s\S]*?<\/div>\s*<\/div>\s*<p id="sysRdwcMontajeOrigenHint"[\s\S]*?<\/p>\s*/m,
    '\n',
  ],
];

for (const [re, rep] of patterns) {
  h = h.replace(re, rep);
}

fs.writeFileSync(p, h);
console.log('Kit comercial count:', (h.match(/Kit comercial/g) || []).length);
console.log('MontajeOrigenKit count:', (h.match(/MontajeOrigenKit/g) || []).length);
