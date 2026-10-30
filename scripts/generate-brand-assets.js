/* Regenerates every brand raster from brand/mark.js.
 *
 *   node scripts/generate-brand-assets.js
 *
 * Run this after ANY change to the mark. Editing one icon by hand is how
 * a set of icons ends up disagreeing with each other, which is exactly
 * the state this repo was in: a 490 KB JPEG named favicon.png sitting
 * next to nothing else.
 *
 * Rendering goes through headless Chromium rather than an image library
 * because the source is SVG and Chromium is the same renderer that will
 * draw it in the browser — so what is written to disk matches what a
 * visitor sees, including anti-aliasing.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { markSvg, markBody, BRAND } = require('../brand/mark.js');

const PUBLIC = path.join(__dirname, '..', 'public');
const BRAND_DIR = path.join(__dirname, '..', 'brand');
const BG_DARK = '#0F2A4A';   // brand navy: the share card and icon tiles sit on it
const ACCENT = '#F2A33A';    // warm orange, the "Cards" in the wordmark

/* Every raster icon is a filled violet square with a white mark rather
   than a transparent violet mark. Two reasons: iOS composites a
   transparent touch icon onto black, and a filled tile holds far more
   contrast at 16px on a light browser tab than a violet glyph on
   whatever colour happens to be behind it. */
const RASTERS = [
  { file: 'favicon-32.png',       size: 32 },
  { file: 'favicon-192.png',      size: 192 },
  { file: 'favicon-512.png',      size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  // Legacy path, still referenced as the Organization logo in JSON-LD.
  { file: 'favicon.png',          size: 192 },
];

async function shoot(page, html, width, height, out, type = 'png') {
  await page.setViewportSize({ width, height });
  await page.setContent(html);
  await page.waitForTimeout(60);
  const buf = await page.screenshot(
    type === 'jpeg' ? { type: 'jpeg', quality: 88 } : { type: 'png', omitBackground: false }
  );
  fs.writeFileSync(out, buf);
  return buf.length;
}

(async () => {
  // ── Vector masters ──
  fs.writeFileSync(path.join(PUBLIC, 'favicon.svg'), markSvg());
  fs.writeFileSync(path.join(BRAND_DIR, 'logo-navy.svg'), markSvg());
  fs.writeFileSync(path.join(BRAND_DIR, 'logo-white.svg'), markSvg({ fill: '#FFFFFF' }));
  fs.writeFileSync(path.join(BRAND_DIR, 'logo-black.svg'), markSvg({ fill: '#000000' }));
  console.log('svg   favicon.svg, logo-navy, logo-white, logo-black');

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  // ── Icons ──
  for (const { file, size } of RASTERS) {
    const html = `<style>html,body{margin:0;padding:0}</style>${markSvg({ fill: '#FFFFFF', bg: BRAND, size })}`;
    const bytes = await shoot(page, html, size, size, path.join(PUBLIC, file));
    console.log(`png   ${file.padEnd(22)} ${size}x${size}  ${bytes.toLocaleString()} bytes`);
  }

  // ── Share card ──
  /* 1200x630 is the size every social platform crops to. Generated from
     the same mark so the share image can never show an older logo than
     the site does. */
  const og = `<style>
    html,body{margin:0;padding:0}
    .c{width:1200px;height:630px;background:${BG_DARK};display:flex;flex-direction:column;
       align-items:center;justify-content:center;gap:38px;
       font-family:-apple-system,Segoe UI,Roboto,Helvetica,sans-serif}
    .w{font-size:64px;font-weight:800;letter-spacing:-.02em;color:#fff}
    .w span{color:${ACCENT}}
    .t{font-size:25px;font-weight:400;color:#c7d0dd;letter-spacing:.01em}
  </style>
  <div class="c">
    <svg viewBox="0 0 512 512" width="150" height="150">${markBody('#FFFFFF')}</svg>
    <div class="w">GoGet<span>Cards</span></div>
    <div class="t">Sealed TCG and sports cards. Photographed before they ship.</div>
  </div>`;
  const ogBytes = await shoot(page, og, 1200, 630, path.join(PUBLIC, 'images', 'og-default.jpg'), 'jpeg');
  console.log(`jpg   og-default.jpg          1200x630  ${ogBytes.toLocaleString()} bytes`);

  await browser.close();
})().catch((err) => { console.error(err); process.exit(1); });
