// Renders a share image from an HTML file: node og.js in.html out.png
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [, , input, output] = process.argv;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(input), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: output, type: 'png' });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
