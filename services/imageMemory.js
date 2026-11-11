/**
 * Memory guards for on-demand image rendering (productAsset, multipackImage).
 *
 * Rendered images used to be cached in plain Maps with no size limit, and any
 * number of sharp renders could run at once. A crawler fetching a hundred
 * 1600px PNGs (a Merchant Center image refresh does exactly that) filled the
 * container's memory and the platform restarted the app ("no healthy
 * upstream"). Two guards fix that:
 *
 *  - ByteLru: a cache with a byte budget; the least recently used entries
 *    are dropped first.
 *  - gate(): at most MAX_RENDERS sharp pipelines at a time; the rest wait.
 */
let sharp = null;
try { sharp = require('sharp'); } catch (err) { /* callers log their own error */ }
if (sharp) {
  /* libvips' own operation cache holds decoded images; ours is enough. */
  sharp.cache(false);
  sharp.concurrency(1);
}

class ByteLru {
  constructor(maxBytes) {
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this.map = new Map();
  }

  static sizeOf(value) {
    return (value && value.buf && value.buf.length) || 0;
  }

  get(key) {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  has(key) { return this.map.has(key); }

  set(key, value) {
    const size = ByteLru.sizeOf(value);
    if (this.map.has(key)) this.delete(key);
    if (size > this.maxBytes) return this;
    this.map.set(key, value);
    this.bytes += size;
    for (const [k] of this.map) {
      if (this.bytes <= this.maxBytes) break;
      this.delete(k);
    }
    return this;
  }

  delete(key) {
    const v = this.map.get(key);
    if (v === undefined) return false;
    this.bytes -= ByteLru.sizeOf(v);
    return this.map.delete(key);
  }

  get size() { return this.map.size; }

  clear() { this.map.clear(); this.bytes = 0; }
}

const MAX_RENDERS = 2;
let running = 0;
const waiting = [];

/** Runs fn() once fewer than MAX_RENDERS renders are in progress. */
async function gate(fn) {
  if (running >= MAX_RENDERS) await new Promise((resolve) => waiting.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    const next = waiting.shift();
    if (next) next();
  }
}

module.exports = { ByteLru, gate, MAX_RENDERS };
