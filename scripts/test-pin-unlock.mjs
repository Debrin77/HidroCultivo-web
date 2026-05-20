import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = 'http://127.0.0.1:8765/index.html';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CON: ' + m.text());
});

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000);

const pre = await page.evaluate(() => ({
  initApp: typeof initApp,
  renderTorre: typeof renderTorre,
  PIN: typeof PIN !== 'undefined' ? PIN : null,
  appBootstrapped: typeof appBootstrapped !== 'undefined' ? appBootstrapped : null,
}));

await page.evaluate(() => {
  pinEntry = PIN;
  checkPin();
});
await page.waitForTimeout(2000);

const post = await page.evaluate(() => ({
  pinDisplay: document.getElementById('pinScreen')?.style.display,
  appInert: document.getElementById('app')?.inert,
  pinErr: document.getElementById('pinErr')?.textContent || '',
  appBootstrapped: typeof appBootstrapped !== 'undefined' ? appBootstrapped : null,
}));

console.log(JSON.stringify({ pre, post, errors }, null, 2));
await browser.close();
