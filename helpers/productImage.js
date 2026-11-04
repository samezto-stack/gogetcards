/**
 * Responsive product images, without a media library.
 *
 * THE PROBLEM THIS SOLVES: every template renders the same stored URL into
 * every slot. A collection card is 480px wide, a cart thumbnail is 70px and
 * a checkout line item is 64px, and all three download whatever the
 * operator pasted — typically a 2048px original. On a twenty-card
 * collection page that is twenty full-size originals fetched to be drawn at
 * a twentieth of their area. It is the single largest thing on the page and
 * it lands squarely on Largest Contentful Paint.
 *
 * WHY THIS RATHER THAN A MEDIA LIBRARY: see docs/image-hosting.md for the
 * full evaluation. Short version — Shopify's CDN already does resizing and
 * modern-format negotiation on demand via URL parameters, from a global
 * edge network, at no cost and with no infrastructure to run. Rebuilding
 * that on a single Render web service with no object storage and no edge
 * would be measurably worse on every axis the migration was supposed to
 * improve.
 *
 * SAFE FAILURE. The transform is only applied to hosts documented to
 * support it, and an ignored parameter degrades to "the original image at
 * every descriptor" — no savings, but a correct picture. It cannot produce
 * a broken image, which is why it is safe to apply site-wide without being
 * able to test every stored URL first.
 */

/* Hosts whose URL parameters are a documented resizing API.
   Shopify's CDN accepts ?width= / &height= / &format= on /s/files/ asset
   URLs; this is what Shopify's own themes emit. Anything not recognised is
   passed through untouched, because guessing a transform syntax against an
   unknown CDN is how you turn a working image into a 404. */
const TRANSFORMABLE_HOSTS = /(^|\.)(cdn\.shopify\.com|shopifycdn\.com)$/i;

/* THE HOST LIST ALONE WAS NOT ENOUGH, and it silently disabled the entire
   module for this store.
 *
 * Shopify serves the same assets from the SHOP's own domain as well as from
 * cdn.shopify.com — `gogetcardsg.myshopify.com/cdn/shop/files/x.png?v=…` is
 * what its admin hands you when you copy an image URL, and it is what every
 * product in this catalogue stores. That host does not end in
 * cdn.shopify.com, so isTransformable said no, so every template fell back
 * to the stored original: the 70px cart thumbnail, the 64px checkout line,
 * the 72px gallery thumb and the collection cards were all downloading a
 * 900px file. The helper was working exactly as written and doing nothing
 * at all.
 *
 * The reliable signal is the PATH, not the host. `/cdn/shop/` is Shopify's
 * own asset prefix and is where the transform API lives, on the CDN domain
 * and on shop domains and custom domains alike. Matching on it covers every
 * form of the URL without needing to enumerate hosts that keep changing.
 *
 * GETTING THIS WRONG IS SAFE, which is why the broader rule is acceptable.
 * If some host ignored the parameter, every srcset candidate would resolve
 * to the same file and the browser would pick the widest descriptor — which
 * is the stored original, exactly what it downloads today. The downside is
 * no saving, never a bigger download and never a broken image. */
const TRANSFORMABLE_PATHS = /^\/cdn\/shop(ify)?\//i;

/* Descriptor ladder. Chosen to cover 1x and 2x for the slot sizes actually
   used in this codebase (64, 70, 80, 480, 900) without emitting a dozen
   candidates the browser has to weigh on every card. */
const WIDTHS = [80, 160, 320, 480, 720, 960, 1440, 2048];

function parse(url) {
  try {
    return new URL(String(url), 'https://placeholder.invalid');
  } catch {
    return null;
  }
}

/** Whether this URL is one we can ask for a specific size. */
/* This app's own multipack composites (services/multipackImage) take the
   same ?width= and a ?fmt=webp, so cards and pages get the size they use. */
const OWN_RESIZABLE = /^\/images\/multipack\/[^/?#]+\.png$/i;
function isOwnResizable(url) {
  const parsed = parse(url);
  return !!parsed && OWN_RESIZABLE.test(parsed.pathname)
    && (parsed.hostname === 'placeholder.invalid' || /(^|\.)gogetcards\.com$/i.test(parsed.hostname) || parsed.hostname === 'localhost');
}

function isTransformable(url) {
  if (isOwnResizable(url)) return true;
  const parsed = parse(url);
  if (!parsed) return false;
  if (parsed.hostname && TRANSFORMABLE_HOSTS.test(parsed.hostname)) return true;
  /* A Shopify asset path, whatever domain is serving it. Guarded by
     hostname so a stored value that is only a path — "/images/x.png" —
     cannot be mistaken for one: those are served by this app, which has no
     resizing endpoint at all. */
  return !!(parsed.hostname
    && parsed.hostname !== 'placeholder.invalid'
    && TRANSFORMABLE_PATHS.test(parsed.pathname));
}

/**
 * The same image at a given width.
 * Existing query parameters are preserved: Shopify asset URLs carry a `v=`
 * cache-buster that must survive, or every render becomes a cache miss.
 */
function at(url, width) {
  if (!isTransformable(url)) return url;
  const parsed = parse(url);
  if (isOwnResizable(url)) {
    /* Snap to the ladder the service renders, WebP for browsers. The feed
       never comes through here with a width (it uses the plain PNG URL). */
    const ladder = require('../services/multipackImage').WIDTHS;
    const w = ladder.find((x) => x >= width) || ladder[ladder.length - 1];
    parsed.searchParams.set('width', String(w));
    parsed.searchParams.set('fmt', 'webp');
    return parsed.toString().replace('https://placeholder.invalid', '');
  }
  parsed.searchParams.set('width', String(width));
  return parsed.toString().replace('https://placeholder.invalid', '');
}

/**
 * A srcset for a slot of the given CSS width.
 *
 * Capped at 2x the slot: beyond that the extra pixels are invisible on
 * every display that exists, and the bytes are pure waste. Returns '' when
 * the host cannot be transformed, so the caller simply omits the attribute
 * rather than emitting a srcset whose candidates are all the same file —
 * which would let the browser pick the widest descriptor and download MORE
 * than it does today.
 */
function srcset(url, slotWidth) {
  if (!isTransformable(url)) return '';
  const max = slotWidth * 2;
  const ladder = (isOwnResizable(url) ? require('../services/multipackImage').WIDTHS : WIDTHS).filter((w) => w <= max);
  if (!isOwnResizable(url) && !ladder.includes(max) && max <= WIDTHS[WIDTHS.length - 1]) ladder.push(max);
  if (!ladder.length) return '';
  return ladder.map((w) => `${at(url, w)} ${w}w`).join(', ');
}

/**
 * Everything a template needs for one <img>, in one call.
 *
 * `sizes` defaults to the slot width in pixels, which is correct for the
 * fixed-size slots (thumbnails, cart lines). Grid cards pass their own
 * media-query string because their slot width genuinely changes with the
 * viewport, and a wrong `sizes` is worse than none — the browser trusts it
 * and picks from the wrong end of the ladder.
 */
function img(url, slotWidth, sizes) {
  const src = at(url, slotWidth);
  const set = srcset(url, slotWidth);
  return {
    src: src || url || '',
    srcset: set,
    sizes: set ? (sizes || `${slotWidth}px`) : '',
  };
}

/**
 * Renders the src/srcset/sizes attributes as a string, for templates that
 * build their <img> inline. Escaped for attribute context: a stored URL
 * containing a quote would otherwise break out of the attribute.
 */
function attrs(url, slotWidth, sizes) {
  const o = img(url, slotWidth, sizes);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return [
    `src="${esc(o.src)}"`,
    o.srcset ? `srcset="${esc(o.srcset)}"` : '',
    o.sizes ? `sizes="${esc(o.sizes)}"` : '',
  ].filter(Boolean).join(' ');
}

module.exports = { img, attrs, at, srcset, isTransformable, WIDTHS, TRANSFORMABLE_HOSTS, TRANSFORMABLE_PATHS };
