/*
 * Responsive images: does the resizing actually happen for the URLs this
 * store stores?
 *
 * WHY THIS EXISTS. helpers/productImage only rewrites URLs it recognises,
 * and everything it does not recognise is passed through silently — a
 * correct picture at the wrong size. That is the right failure mode, and it
 * is also completely invisible: the page looks perfect, the tests pass, and
 * every thumbnail on the site is quietly a full-size original.
 *
 * It happened. The host list matched cdn.shopify.com, and this store's
 * images are served from gogetcardsg.myshopify.com/cdn/shop/files/…, so the
 * module was disabled for the entire catalogue from the day it shipped. No
 * check would have caught it, because every check used a cdn.shopify.com
 * fixture.
 *
 * So the fixtures here are REAL STORED URL SHAPES, not convenient ones.
 *
 * Run:  node scripts/audit/check-images.js
 */
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const productImage = require(path.join(ROOT, 'helpers/productImage'));

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) { fails++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`pass  ${name}`);
};

/* The shape Shopify's admin hands you when you copy an image URL: the shop
   domain, the /cdn/shop/ path, a v= cache-buster and a width already on it. */
const SHOP_DOMAIN = 'https://gogetcardsg.myshopify.com/cdn/shop/files/Untitled_design_22.png?v=1787253161&width=900';
/* The same asset from the CDN domain, which is what older stored values
   look like. */
const CDN_DOMAIN = 'https://cdn.shopify.com/s/files/1/0001/0001/files/box.png?v=1712345678';
/* Served by this app. There is no resizing endpoint here, so it must be
   left alone. */
const LOCAL = '/images/placeholder.jpg';
/* Somebody else's host. Guessing a transform syntax turns a working image
   into a 404. */
const FOREIGN = 'https://images.example.com/box.png';

check('a shop-domain URL is transformable', productImage.isTransformable(SHOP_DOMAIN));
check('a cdn.shopify.com URL is still transformable', productImage.isTransformable(CDN_DOMAIN));
check('a local asset is left alone', !productImage.isTransformable(LOCAL));
check('an unknown host is left alone', !productImage.isTransformable(FOREIGN));

/* The width already present in the stored URL is REPLACED, not appended.
   Two width parameters is an ambiguous request, and which one wins is the
   CDN's business rather than ours. */
const at70 = productImage.at(SHOP_DOMAIN, 70);
check('the requested width is applied', /[?&]width=70(&|$)/.test(at70), at70);
check('the stored width is replaced, not duplicated',
  (at70.match(/width=/g) || []).length === 1, at70);
check('the cache-buster survives', /[?&]v=1787253161(&|$)/.test(at70), at70);
check('the path is untouched', at70.includes('/cdn/shop/files/Untitled_design_22.png'), at70);

/* Any stored width must be overridden, not just the 900 in the fixture. */
for (const w of [800, 1000, 1200, 2048]) {
  const src = SHOP_DOMAIN.replace('width=900', `width=${w}`);
  const out = productImage.at(src, 64);
  check(`a stored width=${w} is overridden`,
    /[?&]width=64(&|$)/.test(out) && (out.match(/width=/g) || []).length === 1, out);
}

/* A URL with no width at all gains one. */
check('a URL with no width gains one',
  /[?&]width=64(&|$)/.test(productImage.at(CDN_DOMAIN, 64)));

/* srcset: real candidates, capped at 2x, and nothing at all for a host we
   cannot transform — identical candidates at different descriptors would
   let the browser pick the widest and download MORE than a bare src. */
const set = productImage.srcset(SHOP_DOMAIN, 70);
const descriptors = [...set.matchAll(/ (\d+)w/g)].map((m) => Number(m[1]));
check('srcset is produced for a shop-domain URL', descriptors.length > 0);
check('srcset candidates are distinct URLs',
  new Set(set.split(', ').map((c) => c.split(' ')[0])).size === descriptors.length, set);
check('srcset is capped at 2x the slot',
  descriptors.every((w) => w <= 140), descriptors.join(','));
check('srcset is empty for an untransformable URL',
  productImage.srcset(FOREIGN, 70) === '' && productImage.srcset(LOCAL, 70) === '');

/* The whole point: a small slot must not request the stored original. */
const tiny = productImage.img(SHOP_DOMAIN, 44);
check('a 44px slot asks for 44px, not the stored 900',
  /width=44(&|$)/.test(tiny.src) && !/width=900/.test(tiny.src), tiny.src);
check('a small slot declares its size', tiny.sizes === '44px', tiny.sizes);

/* attrs() is what templates call. Its output goes straight into an
   attribute, so & must be entity-escaped or the markup is invalid. */
const html = productImage.attrs(SHOP_DOMAIN, 70);
check('attrs escapes ampersands', !/&(?!amp;)/.test(html), html);
check('attrs emits all three attributes',
  /src="/.test(html) && /srcset="/.test(html) && /sizes="/.test(html));
check('attrs omits srcset when it cannot resize',
  !/srcset=/.test(productImage.attrs(FOREIGN, 70)));

/* A missing or malformed value must not throw or emit "undefined": an
   operator can leave an image URL blank, and every template calls this. */
for (const bad of ['', null, undefined, 'not a url', 'javascript:alert(1)']) {
  const out = productImage.attrs(bad, 70);
  check(`attrs survives ${JSON.stringify(bad)}`, typeof out === 'string' && !/undefined|null/.test(out), out);
}

/* Every slot width used by a template, so a call site added later with an
   absurd value shows up here rather than in a Lighthouse report. */
const SLOTS = [44, 64, 70, 72, 80, 90, 240, 270, 570];
for (const slot of SLOTS) {
  const o = productImage.img(SHOP_DOMAIN, slot);
  check(`slot ${slot} requests its own width`, o.src.includes(`width=${slot}`), o.src);
}

console.log(fails ? `\n${fails} image check(s) FAILED` : '\nAll image checks pass');
process.exit(fails ? 1 : 0);
