/**
 * Product photos this app hosts itself.
 *
 * Masters live in assets/products/<slug>.webp (lossless, transparent, 1600px on the
 * long side, committed with the code) and are served at
 * /images/products/<slug>.webp?width=&fmt=, resized and re-encoded with
 * sharp on demand and cached in memory, so a card gets a 480px WebP and
 * the feed gets a 1600px PNG, exactly like the CDN-hosted ones.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let sharp = null;
try { sharp = require('sharp'); } catch (err) { console.error('[product asset] sharp unavailable:', err.message); }

const DIR = path.join(__dirname, '..', 'assets', 'products');
const WIDTHS = [160, 320, 480, 720, 960, 1440, 1600];
const FORMATS = new Set(['webp', 'png', 'jpeg']);
const { ByteLru, gate } = require('./imageMemory');

/* Rendered sizes, kept within a byte budget (see services/imageMemory). */
const cache = new ByteLru(48 * 1024 * 1024);
const inflight = new Map();
const versions = new Map();

function masterPath(slug) {
  if (!/^[a-z0-9-]+$/.test(String(slug))) return null;
  for (const ext of ['webp', 'png']) {
    const p = path.join(DIR, `${slug}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Short hash of the master file, for immutable URLs. */
function versionOf(slug) {
  if (versions.has(slug)) return versions.get(slug);
  const p = masterPath(slug);
  const v = p ? crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8) : '';
  versions.set(slug, v);
  return v;
}

/** Public URL for a hosted master, or '' when there is none. */
function urlFor(slug, origin = '') {
  const v = versionOf(slug);
  return v ? `${origin}/images/products/${slug}.webp?v=${v}` : '';
}

async function render(slug, { width, fmt } = {}) {
  const p = masterPath(slug);
  if (!p || !sharp) return null;
  const w = WIDTHS.includes(Number(width)) ? Number(width) : 1600;
  const f = FORMATS.has(fmt) ? fmt : 'webp';
  const key = `${slug}|${w}|${f}`;
  const hit = cache.get(key);
  if (hit) return hit;
  /* Concurrent requests for the same size share one render. */
  if (inflight.has(key)) return inflight.get(key);
  const job = gate(async () => {
    let s = sharp(p).resize({ width: w, withoutEnlargement: true });
    if (f === 'webp') s = s.webp({ quality: 80, alphaQuality: 85 });
    else if (f === 'jpeg') s = s.flatten({ background: '#ffffff' }).jpeg({ quality: 88, mozjpeg: true });
    else s = s.png({ compressionLevel: 8 });
    const out = { buf: await s.toBuffer(), type: `image/${f}` };
    cache.set(key, out);
    return out;
  }).finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

module.exports = { masterPath, urlFor, render, WIDTHS, DIR };
