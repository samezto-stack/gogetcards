/**
 * Checks that an image URL actually loads, and how big it is.
 *
 * WHY THIS EXISTS: an unreachable image_link is one of the most common
 * causes of item disapproval and one of the hardest to notice, because
 * Google fetches image_link with its own crawler, separately from the
 * landing page. A browser with the image cached shows a perfectly fine
 * product page while Google sees a 404. Nothing on the storefront reveals
 * it.
 *
 * This store is particularly exposed: product images are hosted on Shopify
 * CDN URLs belonging to stores it does not control. If one of those stores
 * rotates, closes or deletes a product, the image disappears and the
 * catalogue silently starts failing review. See docs/image-hosting.md.
 *
 * DIMENSIONS WITHOUT AN IMAGE LIBRARY: width and height live in the first
 * few dozen bytes of every format that matters, so a ranged request reads
 * the header and stops. That avoids pulling megabytes per product and
 * avoids a native dependency (sharp) that would have to build on the
 * deploy host.
 */

/** PNG: IHDR is always the first chunk, at a fixed offset. */
function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** GIF: logical screen descriptor, little-endian, right after the header. */
function gifSize(buf) {
  if (buf.length < 10) return null;
  if (buf.toString('ascii', 0, 3) !== 'GIF') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

/**
 * JPEG: walk the marker segments to the first SOFn frame header. Size is
 * not at a fixed offset because the number and length of preceding
 * segments (EXIF, ICC profile, comments) varies per encoder.
 */
function jpegSize(buf) {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0..SOF15, excluding the non-frame markers in that range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) return null; // malformed; stop rather than loop forever
    i += 2 + len;
  }
  return null;
}

/** WebP: VP8, VP8L and VP8X each store size differently. */
function webpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === 'VP8X') {
    const w = buf[24] | (buf[25] << 8) | (buf[26] << 16);
    const h = buf[27] | (buf[28] << 8) | (buf[29] << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

function dimensions(buf) {
  return pngSize(buf) || jpegSize(buf) || gifSize(buf) || webpSize(buf) || null;
}

/**
 * Probes one image URL.
 * Never throws: a probe failure is a result, not an exception, because the
 * caller is validating dozens of products and one bad URL must not abort
 * the run.
 *
 * @returns {Promise<{url,ok,status?,contentType?,width?,height?,bytes?,error?}>}
 */
async function probe(url, { timeoutMs = 8000 } = {}) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { url, ok: false, error: 'not an absolute http(s) URL' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    /* Range request: the header is all that is needed, and some CDNs are
       slow to serve a full multi-megabyte original. A server that ignores
       Range replies 200 with the whole body, which still works. */
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Range: 'bytes=0-32767', 'User-Agent': 'ZypheraTCG-FeedValidator/1.0' },
    });
    if (!res.ok && res.status !== 206) {
      return { url, ok: false, status: res.status, contentType: res.headers.get('content-type') || '' };
    }
    const contentType = res.headers.get('content-type') || '';
    const buf = Buffer.from(await res.arrayBuffer());
    const size = dimensions(buf);

    /* A URL that returns 200 with an HTML body is the classic symptom of a
       CDN serving a "not found" page instead of a 404 — and it disapproves
       the item just as surely, while looking healthy to a status check. */
    if (/^text\/html/i.test(contentType)) {
      return { url, ok: false, status: res.status, contentType, error: 'served HTML, not an image' };
    }

    return {
      url,
      ok: true,
      status: res.status,
      contentType,
      bytes: Number(res.headers.get('content-length')) || buf.length,
      ...(size || {}),
      ...(size ? {} : { error: 'loaded, but the format header could not be read' }),
    };
  } catch (err) {
    return { url, ok: false, error: err.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probes many URLs with a concurrency cap.
 * Unbounded Promise.all over a few hundred images opens a few hundred
 * sockets at once, which the host and the CDN both dislike.
 */
async function probeAll(urls, { concurrency = 6, timeoutMs = 8000 } = {}) {
  const unique = [...new Set(urls.filter(Boolean))];
  const results = new Map();
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++];
      results.set(url, await probe(url, { timeoutMs }));
    }
  }));
  return results;
}

module.exports = { probe, probeAll, dimensions };
