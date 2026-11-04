/**
 * The picture of a pack.
 *
 * A pack-sold product (packSize > 1) is listed to Google as a multipack at
 * the pack price. Its photo showed ONE box, so a Shopping ad read "one
 * Booster Bundle, US$199.96": a shopper who clicked expecting one box
 * found three, and the click was paid for nothing. The ad image now shows
 * the pack: N copies of the product's own photo, cascaded, on white, with
 * no text or badge (Google refuses promotional overlays on images).
 *
 * Built on demand from the stored image, cached in memory for a day, and
 * served at /images/multipack/<slug>.png. Pure JavaScript (pngjs): no
 * native image library on the host. The source is fetched as PNG at a
 * fixed width through the same public-host check every outbound request
 * uses.
 */
const { PNG } = require('pngjs');
const productImage = require('../helpers/productImage');
const { assertPublicUrl } = require('../helpers/safeUrl');

const CANVAS = 1600;       // Google: at least 800 px, square preferred
const COPY = 1000;         // each copy's width, fetched at this width
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 300;
const cache = new Map();   // slug -> { buf, at }

function remember(slug, buf) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(slug, { buf, at: Date.now() });
}

async function fetchPng(url) {
  const u = await assertPublicUrl(productImage.at(url, COPY));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(u.toString(), {
      signal: controller.signal,
      redirect: 'manual',
      headers: { Accept: 'image/png', 'User-Agent': 'GoGetCards-MultipackImage/1.0' },
    });
    if (!res.ok) throw new Error(`source image ${res.status}`);
    const type = res.headers.get('content-type') || '';
    if (!/image\/png/.test(type)) throw new Error(`source image is ${type}, not PNG`);
    return PNG.sync.read(Buffer.from(await res.arrayBuffer()));
  } finally {
    clearTimeout(timer);
  }
}

/** Nearest-neighbour resize to `w` wide, keeping the aspect ratio. */
function resize(src, w) {
  if (src.width === w) return src;
  const h = Math.max(1, Math.round(src.height * (w / src.width)));
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.floor(y * src.height / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor(x * src.width / w));
      const si = (sy * src.width + sx) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = src.data[si]; out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2]; out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

/** Alpha-blend `img` onto `canvas` at (ox, oy). */
function blit(canvas, img, ox, oy) {
  for (let y = 0; y < img.height; y++) {
    const cy = oy + y;
    if (cy < 0 || cy >= canvas.height) continue;
    for (let x = 0; x < img.width; x++) {
      const cx = ox + x;
      if (cx < 0 || cx >= canvas.width) continue;
      const si = (y * img.width + x) * 4;
      const a = img.data[si + 3] / 255;
      if (a === 0) continue;
      const di = (cy * canvas.width + cx) * 4;
      for (let c = 0; c < 3; c++) canvas.data[di + c] = Math.round(img.data[si + c] * a + canvas.data[di + c] * (1 - a));
      canvas.data[di + 3] = 255;
    }
  }
}

/**
 * The composite for a product: N cascaded copies of its main image.
 * `product` needs imageUrl/images, packSize and slug. Returns a PNG buffer.
 */
async function compose(product, opts = {}) {
  const n = Math.min(9, Math.max(2, parseInt(product.packSize, 10) || 1));
  const src = product.imageUrl || (product.images && product.images[0]);
  if (!src) throw new Error('no image');
  const hit = cache.get(product.slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.buf;

  /* opts.source: a PNG buffer, for tests and offline tooling. */
  const copy = resize(opts.source ? PNG.sync.read(opts.source) : await fetchPng(src), COPY);
  const canvas = new PNG({ width: CANVAS, height: CANVAS, fill: true });
  canvas.data.fill(255);
  if (n <= 3) {
    /* Two or three: a diagonal cascade, back copy top-left, front copy
       bottom-right, the whole stack centred. Beyond three a cascade reads
       as a smear and costs N full blits; see below. */
    const span = CANVAS - Math.max(copy.width, copy.height);
    const step = Math.floor(span / (n - 1));
    const used = step * (n - 1) + copy.width;
    const base = Math.max(0, Math.floor((CANVAS - used) / 2));
    for (let i = 0; i < n; i++) blit(canvas, copy, base + i * step, base + i * step);
  } else {
    /* Four or more: one copy on the left and a "×N" badge on the right,
       the way the owner's own case photos are made. The badge is a
       pre-rendered PNG (public/images/badges, drawn once with a real
       font) so no text rasteriser is needed here. */
    blit(canvas, copy, 80, Math.floor((CANVAS - copy.height) / 2));
    const badge = badgeFor(n);
    if (badge) blit(canvas, badge, CANVAS - badge.width - 110, Math.floor((CANVAS - badge.height) / 2));
  }
  const buf = PNG.sync.write(canvas, { colorType: 2 }); // RGB, no alpha
  remember(product.slug, buf);
  return buf;
}

const badges = new Map();
function badgeFor(n) {
  const key = Math.min(12, n);
  if (badges.has(key)) return badges.get(key);
  let png = null;
  try {
    png = PNG.sync.read(require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'images', 'badges', `x${key}.png`)));
  } catch (err) {
    console.error('[multipack image] no badge for', n, err.message);
  }
  badges.set(key, png);
  return png;
}

/** The public URL of the composite for a pack product, or '' for singles. */
function urlFor(product, origin) {
  const n = parseInt(product && product.packSize, 10) || 1;
  if (n <= 1 || process.env.MULTIPACK_IMAGES === 'false') return '';
  if (!(product.imageUrl || (product.images && product.images[0]))) return '';
  return `${origin}/images/multipack/${product.slug}.png`;
}

module.exports = { compose, urlFor, _cache: cache };
