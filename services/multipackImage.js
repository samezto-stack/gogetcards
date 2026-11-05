/**
 * The picture of a pack.
 *
 * A pack-sold product (packSize > 1) is listed to Google as a multipack at
 * the pack price. Its photo showed ONE box, so a Shopping ad read "one
 * Booster Bundle, US$199.96": a shopper who clicked expecting one box
 * found three, and the click was paid for nothing. The ad image, the
 * product page and the cards now show the pack:
 *
 *   - 2 or 3: that many copies of the product's own photo, cascaded;
 *   - 4 or more: one copy with a "×N" badge beside it, the way the owner's
 *     own case photos are made (public/images/badges, pre-rendered once
 *     with a real font).
 *
 * White background, no promotional text. Built with sharp from the stored
 * image, kept as a 1600px master, and served at the width and format each
 * slot asks for (?width=480&fmt=webp for a card, plain PNG at 1600 for the
 * feed), so it loads like the CDN-hosted singles do. Every variant is
 * cached in memory; the whole set is warmed at boot so no shopper waits
 * for the first render. URLs carry ?v=<hash of the source> and are served
 * immutable for a year.
 *
 * Served at /images/multipack/<slug>.png. The source is fetched through the
 * same public-host check every outbound request uses.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const productImage = require('../helpers/productImage');
const { assertPublicUrl } = require('../helpers/safeUrl');

let sharp = null;
try { sharp = require('sharp'); } catch (err) { console.error('[multipack image] sharp unavailable:', err.message); }

const CANVAS = 1600;       // Google: at least 800 px, square preferred
const COPY = 1000;         // each copy's width
const BADGE_GAP = 110;
const WIDTHS = [160, 320, 480, 720, 960, 1440, 1600];
const FORMATS = new Set(['png', 'webp', 'jpeg']);
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MASTERS = 400;

const masters = new Map();   // slug -> { buf, at, v }
const variants = new Map();  // slug|width|fmt -> { buf, at, v }
const inflight = new Map();  // slug -> Promise<master>

function sourceOf(product) {
  return (product && (product.imageUrl || (product.images && product.images[0]))) || '';
}
function packOf(product) {
  return Math.min(12, Math.max(1, parseInt(product && product.packSize, 10) || 1));
}
/** Cache-buster: changes when the source photo or the pack size changes. */
function versionOf(product) {
  return crypto.createHash('md5').update(`${sourceOf(product)}|${packOf(product)}|v2`).digest('hex').slice(0, 8);
}

async function fetchSource(url) {
  /* A photo this app hosts itself is read from disk. */
  const own = String(url).match(/\/images\/products\/([a-z0-9-]+)\.webp/);
  if (own) {
    const p = require('./productAsset').masterPath(own[1]);
    if (p) return fs.readFileSync(p);
  }
  const u = await assertPublicUrl(productImage.at(url, 1200));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(u.toString(), {
      signal: controller.signal,
      redirect: 'manual',
      headers: { Accept: 'image/png,image/jpeg,image/webp,image/*', 'User-Agent': 'GoGetCards-MultipackImage/1.0' },
    });
    if (!res.ok) throw new Error(`source image ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

const badgeCache = new Map();
function badgeFile(n) {
  const key = Math.min(12, n);
  if (!badgeCache.has(key)) {
    const p = path.join(__dirname, '..', 'public', 'images', 'badges', `x${key}.png`);
    badgeCache.set(key, fs.existsSync(p) ? p : null);
  }
  return badgeCache.get(key);
}

/** Builds the 1600px master PNG for a product (or reads it from cache). */
async function master(product, opts = {}) {
  if (!sharp) throw new Error('sharp unavailable');
  const slug = product.slug;
  const v = versionOf(product);
  const hit = masters.get(slug);
  if (hit && hit.v === v && Date.now() - hit.at < TTL_MS && !opts.source) return hit.buf;
  if (inflight.has(slug) && !opts.source) return inflight.get(slug);

  const job = (async () => {
    const n = packOf(product);
    const src = opts.source || await fetchSource(sourceOf(product));
    const copy = await sharp(src).resize({ width: COPY, height: COPY, fit: 'inside', withoutEnlargement: true })
      .png().toBuffer();
    const meta = await sharp(copy).metadata();
    const w = meta.width, h = meta.height;
    const layers = [];
    if (n <= 3) {
      const span = CANVAS - Math.max(w, h);
      const step = Math.floor(span / (n - 1));
      const used = step * (n - 1) + Math.max(w, h);
      const base = Math.max(0, Math.floor((CANVAS - used) / 2));
      for (let i = 0; i < n; i++) layers.push({ input: copy, left: base + i * step, top: base + i * step });
    } else {
      layers.push({ input: copy, left: 80, top: Math.floor((CANVAS - h) / 2) });
      const badge = badgeFile(n);
      if (badge) layers.push({ input: badge, left: CANVAS - 400 - BADGE_GAP, top: Math.floor((CANVAS - 400) / 2) });
    }
    const buf = await sharp({ create: { width: CANVAS, height: CANVAS, channels: 3, background: '#ffffff' } })
      .composite(layers).png({ compressionLevel: 6 }).toBuffer();
    if (masters.size >= MAX_MASTERS) masters.delete(masters.keys().next().value);
    masters.set(slug, { buf, at: Date.now(), v });
    for (const k of [...variants.keys()]) if (k.startsWith(`${slug}|`)) variants.delete(k);
    return buf;
  })();
  if (!opts.source) inflight.set(slug, job);
  try { return await job; } finally { inflight.delete(slug); }
}

/** The master or a resized/re-encoded variant. Returns { buf, type }. */
async function render(product, { width, fmt } = {}) {
  const w = WIDTHS.includes(Number(width)) ? Number(width) : CANVAS;
  const f = FORMATS.has(fmt) ? fmt : 'png';
  const key = `${product.slug}|${w}|${f}`;
  const v = versionOf(product);
  const hit = variants.get(key);
  if (hit && hit.v === v) return { buf: hit.buf, type: `image/${f}` };
  const base = await master(product);
  let buf = base;
  if (w !== CANVAS || f !== 'png') {
    let s = sharp(base);
    if (w !== CANVAS) s = s.resize({ width: w });
    if (f === 'webp') s = s.webp({ quality: 82 });
    else if (f === 'jpeg') s = s.jpeg({ quality: 85, mozjpeg: true });
    else s = s.png({ compressionLevel: 8 });
    buf = await s.toBuffer();
  }
  variants.set(key, { buf, at: Date.now(), v });
  return { buf, type: `image/${f}` };
}

/** Back-compat: the 1600px PNG. `opts.source` is a buffer for tests. */
async function compose(product, opts = {}) {
  return master(product, opts);
}

/** The public URL of the composite for a pack product, or '' for singles. */
function urlFor(product, origin = '') {
  if (packOf(product) <= 1 || process.env.MULTIPACK_IMAGES === 'false') return '';
  if (!sourceOf(product)) return '';
  return `${origin}/images/multipack/${product.slug}.png?v=${versionOf(product)}`;
}

/**
 * Renders every pack product's master and the sizes the storefront uses,
 * a couple at a time, so the first shopper after a deploy is not the one
 * who pays for the render. Called once at boot; failures are logged and
 * skipped.
 */
async function warmAll() {
  if (!sharp) return;
  const Product = require('../models/Product');
  const products = await Product.find({ packSize: { $gt: 1 } }).select('slug imageUrl images packSize').lean();
  let done = 0;
  const queue = products.slice();
  const worker = async () => {
    while (queue.length) {
      const p = queue.shift();
      if (!sourceOf(p)) continue;
      try {
        await master(p);
        for (const w of [320, 480, 720, 960]) await render(p, { width: w, fmt: 'webp' });
        done++;
      } catch (err) {
        console.error('[multipack image] warm-up failed for', p.slug, err.message);
      }
    }
  };
  await Promise.all([worker(), worker()]);
  console.log(`[multipack image] warmed ${done}/${products.length} pack products`);
}

module.exports = { compose, render, urlFor, warmAll, WIDTHS, _cache: masters };
