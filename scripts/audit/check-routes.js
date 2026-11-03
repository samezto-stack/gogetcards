/* Exercises the real Express routes that need no database read, so the
 * schema and validation each one performs is verified as the route
 * actually behaves — not as a harness re-derives it.
 *
 * Run:  node scripts/audit/check-routes.js
 *
 * Mongoose models are defined without a live connection, and none of the
 * routes touched here reads from the database, so no server is needed.
 */
const express = require('express');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
process.env.SITE_URL = 'https://gogetcards.com';

/* Populated by the locals middleware below, and read by the parity check
   at the end so the two cannot drift. */
const mirroredLocals = new Set();

/* Titles are rendered through <%= %>, so "Refund & Return Policy" reaches
   the browser as "Refund &amp; Return Policy". Comparing the raw config
   string against the HTML flagged a correctly escaped page as missing its
   title; the comparison has to escape the same way EJS does. */
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&#34;').replace(/'/g, '&#39;');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
// Same layout wiring as server.js, so what a route emits here is what it
// emits in production, including the sitewide schema graph in layout.ejs.
app.use(require('express-ejs-layouts'));
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.locals.assetVersion = 'test';

const shippingCfg = require(path.join(ROOT, 'config/shipping'));
const faqCfg = require(path.join(ROOT, 'config/faq'));
const markets = require(path.join(ROOT, 'config/markets'));
const marketService = require(path.join(ROOT, 'services/market'));

app.use((req, res, next) => {
  Object.assign(res.locals, {
    cart: { items: [], totalItems: 0, totalPrice: 0 },
    /* Set by the /admin middleware in server.js. Storefront pages never
       read it, but the parity check below compares against every
       res.locals server.js assigns, and an admin-only local is still one
       of those. */
    money: (cents, currency) =>
      require('../../config/markets').format(Number(cents || 0), currency || 'USD'),
    currentPath: req.path,
    currentYear: 2026,
    pageTitle: 'GoGetCards',
    metaDescription: '',
    ogType: 'website',
    ogImage: '',
    canonicalUrl: 'https://gogetcards.com' + req.path,
    canonicalOrigin: 'https://gogetcards.com',
    jsonLd: null,
    bodyClass: '',
    /* Every local views/partials/analytics.ejs reads. It is included by
       layout.ejs, so one missing here is not one broken page — it is a 500
       on every page that uses the layout. Empty means "nothing configured",
       which is what production currently sends. */
    metaPixelId: '',
    googleAdsId: '',
    googleAdsPurchaseLabel: '',
    fx: require(path.join(ROOT, 'services/fx')).snapshot(),
    shippingCopy: shippingCfg.copy,
    company: require(path.join(ROOT, 'config/company')),
    payments: require(path.join(ROOT, 'config/payments')),
    preorder: require(path.join(ROOT, 'config/preorder')),
    shippingCfg,
    returnWindowDays: faqCfg.RETURN_WINDOW_DAYS,
    formatPrice: require(path.join(ROOT, 'helpers/formatPrice')),

    /* ── What middleware/market puts on every real request ───────────
       The customer templates build every internal link and every price
       through these, so a harness without them does not render "the US
       market" — it 500s. Mirrored rather than mounted because the real
       middleware reads SiteConfig, and an audit must run with no database
       at all. The parity check below is what keeps this list honest. */
    ...require('./marketLocals')(),
    /* Mirrors server.js's app.locals. A local registered there and not
       here fails only in this harness, which reads as a broken audit
       rather than a missing local. */
    productImage: require(path.join(ROOT, 'helpers/productImage')),
    dispatch: require(path.join(ROOT, 'helpers/dispatch')),
    testOrder: require(path.join(ROOT, 'services/testOrder')),
    /* jsonForScript is how every inline <script> in the layout serialises
       data (the sitewide JSON-LD graph included), so without it here the
       layout throws and every page is a 500 before a single assertion
       runs. catalog is set per-request in server.js for the storefront
       nav and collection pages. */
    jsonForScript: require(path.join(ROOT, 'helpers/jsonForScript')),
    catalog: require(path.join(ROOT, 'config/catalog')),
    script: '',
  });
  Object.keys(res.locals).forEach((k) => mirroredLocals.add(k));
  next();
});

/* Stub the two model reads the product route makes, so the route itself —
   including every line of schema construction in it — runs for real
   without a database. Mongoose models are singletons, so patching here
   before the router is required is enough. Nothing else on the route is
   mocked: the JSON-LD asserted below is the JSON-LD production emits. */
const Product = require(path.join(ROOT, 'models/Product'));
const Event = require(path.join(ROOT, 'models/Event'));
const SiteConfig = require(path.join(ROOT, 'models/SiteConfig'));

/* A release 45 days out, so the preorder fixture is a preorder on the day
   the audit runs and not only on the day it was written. */
const PREORDER_RELEASE = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 45));
const PREORDER_ISO = PREORDER_RELEASE.toISOString().split('T')[0];
const FIXTURES = {
  'op-17-booster-box': {
    _id: 'p1', title: 'One Piece TCG OP-17 Booster Box', slug: 'op-17-booster-box',
    price: 29998, comparePrice: 34999, imageUrl: 'https://example.com/a.jpg',
    /* Two images so the gallery renders. With one, the thumbnail strip
       is skipped entirely and its alt text is asserted against markup
       that was never emitted. */
    images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    description: '<p>Sealed booster box.</p>', specs: [], vendor: 'Bandai', brand: 'Bandai',
    productType: 'Booster Box', collections: ['one-piece'], tags: ['one-piece'],
    available: true, stock: 12, preorder: false, sku: 'GGC-OP17-BB',
    gtin: '4570118083104', mpn: 'OP-17-BB', language: 'English', edition: '',
    setCode: 'OP-17', allocationLimit: 0, releaseDate: null,
  },
  'mega-evolution-bb-preorder': {
    _id: 'p2', title: 'Pokemon Mega Evolution Booster Box (Preorder)',
    slug: 'mega-evolution-bb-preorder', price: 13999, comparePrice: null,
    imageUrl: 'https://example.com/b.jpg', images: [], description: '<p>Preorder.</p>',
    specs: [], vendor: 'The Pokemon Company', brand: 'The Pokemon Company',
    productType: 'Booster Box', collections: ['pokemon'], tags: ['pokemon'],
    available: true, stock: 4, preorder: true, preorderShips: 'Q2 2026',
    sku: 'GGC-ME-BB', gtin: '', mpn: '', language: 'English', edition: '',
    setCode: '', allocationLimit: 0, releaseDate: PREORDER_RELEASE,
  },
};

const thenable = (value) => {
  const chain = {
    lean: () => chain, limit: () => chain, sort: () => chain, skip: () => chain,
    select: () => chain, then: (r) => Promise.resolve(value).then(r),
    catch: () => chain,
  };
  return chain;
};
Product.findOne = (q) => thenable(FIXTURES[q && q.slug] || null);
Product.find = () => thenable(Object.values(FIXTURES));
Product.countDocuments = () => Promise.resolve(Object.keys(FIXTURES).length);
/* The collection page counts its filter facets in one $facet pipeline;
   the stub answers with empty buckets, so the sidebar renders nothing and
   the rest of the page is checked as before. */
Product.aggregate = () => thenable([{ avail: [], line: [], type: [], lang: [], price: [] }]);
Event.create = () => Promise.resolve();
SiteConfig.getValue = (_k, d) => Promise.resolve(d);

app.use(require(path.join(ROOT, 'routes/frontend')));

const server = app.listen(0, async () => {
  const port = server.address().port;
  const get = (p) => new Promise((resolve) => {
    http.get({ port, path: p }, (r) => {
      let b = '';
      r.on('data', (d) => (b += d));
      r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: b }));
    });
  });
  const post = (body) => new Promise((resolve) => {
    const data = new URLSearchParams(body).toString();
    const r = http.request({
      port, path: '/contact', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    r.end(data);
  });

  let fails = 0;
  const check = (n, ok, d) => {
    if (!ok) { fails++; console.log(`FAIL  ${n}${d ? ' — ' + d : ''}`); }
    else console.log(`pass  ${n}`);
  };

  /* /contact — the page whose schema is built entirely in the route. */
  const c = await get('/contact');
  check('GET /contact 200', c.status === 200, 'got ' + c.status);

  const nodes = (c.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs) || [])
    .map((s) => JSON.parse(s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')))
    .flatMap((g) => g['@graph'] || [g]);
  const byType = (t) => nodes.find((n) => n['@type'] === t);

  check('/contact emits FAQPage', !!byType('FAQPage'));
  check('/contact emits ContactPage', !!byType('ContactPage'));
  check('/contact emits BreadcrumbList', !!byType('BreadcrumbList'));

  const faq = byType('FAQPage');
  check('/contact FAQ carries every configured question',
    !!faq && faq.mainEntity.length === faqCfg.faqs().length);

  /* Marked-up answers must appear in the visible HTML. Google issues a
     manual action when they do not. Compared after entity-decoding, since
     EJS escapes the rendered copy. */
  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const visible = decode(c.body);
  check('/contact every FAQ answer is visible on the page',
    !!faq && faq.mainEntity.every((q) => visible.includes(q.acceptedAnswer.text)));
  check('/contact no FAQ answer mentions PayPal',
    !!faq && !faq.mainEntity.some((q) => /PayPal/i.test(q.acceptedAnswer.text)));

  const orgNode = nodes.filter((n) => n['@type'] === 'Organization').find((n) => n.contactPoint);
  check('/contact ContactPoint carries a support email',
    !!(orgNode && orgNode.contactPoint[0] && orgNode.contactPoint[0].email));

  /* POST /contact validation. A create() against an unconnected mongoose
     buffers rather than throwing, so only the rejection paths are
     exercised here; the success path is covered by the model's own
     required/enum rules. */
  const noName = await post({ name: '', email: 'a@b.co', message: 'hello there' });
  check('POST /contact rejects a missing name',
    noName.status === 400 && /tell us your name/i.test(noName.body));

  const badEmail = await post({ name: 'Sam', email: 'nope', message: 'hello there' });
  check('POST /contact rejects a malformed email',
    badEmail.status === 400 && /email address we can reply to/i.test(badEmail.body));

  const shortMsg = await post({ name: 'Sam', email: 'a@b.co', message: 'hi' });
  check('POST /contact rejects a too-short message',
    shortMsg.status === 400 && /more detail/i.test(shortMsg.body));

  const hp = await post({ name: 'Bot', email: 'a@b.co', message: 'buy my thing', website: 'http://spam' });
  check('POST /contact silently drops a honeypot hit',
    hp.status === 302 && hp.headers.location === '/contact?sent=1#contact-form');

  /* An out-of-enum topic must fall back to "general" and never reach the
     rendered page. Asserted on the submitted string itself rather than on
     the presence of "<script>", which the page legitimately contains. */
  const badTopic = await post({ name: 'Sam', email: 'a@b.co', message: 'x', topic: '<script>alert(1)</script>' });
  check('POST /contact drops an out-of-enum topic',
    !/alert\(1\)/.test(badTopic.body) && !/&lt;script&gt;/.test(badTopic.body)
    && /value="general"\s+selected/.test(badTopic.body));

  /* ── Product schema, built entirely in the route ── */
  const productNode = async (slug) => {
    const r = await get('/products/' + slug);
    if (r.status !== 200) return { status: r.status, node: null };
    for (const b of (r.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [])) {
      const j = JSON.parse(b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
      const p = (j['@graph'] || []).find((n) => n['@type'] === 'Product');
      if (p) return { status: r.status, node: p, html: r.body };
    }
    return { status: r.status, node: null, html: r.body };
  };

  const inStock = await productNode('op-17-booster-box');
  check('GET /products/:slug 200', inStock.status === 200, 'got ' + inStock.status);
  check('product: Product schema emitted', !!inStock.node);

  const off = inStock.node && inStock.node.offers;
  /* GTIN under the length-specific property as well as the generic one.
     schema.org's `gtin` is the modern spelling, but Google's documentation
     enumerates gtin8/12/13/14 and several third-party validators only look
     for those — a feed audit reporting "no GTIN in Product schema" on a
     page that has one is usually looking for the alias. */
  check('product: GTIN emitted under its length-specific property',
    !!(inStock.node && inStock.node.gtin === '4570118083104'
       && inStock.node.gtin13 === '4570118083104'));
  check('product: no wrong-length GTIN alias',
    !!(inStock.node && !inStock.node.gtin12 && !inStock.node.gtin8 && !inStock.node.gtin14));

  /* Gallery thumbnails name the product. They used to read "Image 1",
     which numbers a picture rather than describing it: Google uses alt
     text to confirm the image matches the listing, and a screen reader
     user gets nothing from an index. */
  check('product: gallery thumbnails have descriptive alt text',
    /alt="One Piece TCG OP-17 Booster Box — photo \d"/.test(inStock.html)
    && !/alt="Image \d"/.test(inStock.html));

  check('product: identifiers emitted',
    !!(inStock.node && inStock.node.sku === 'GGC-OP17-BB'
      && inStock.node.gtin === '4570118083104' && inStock.node.mpn === 'OP-17-BB'));
  check('product: brand is the manufacturer, not the shop',
    !!(inStock.node && inStock.node.brand.name === 'Bandai'));
  check('product: sku is no longer the URL slug',
    !!(inStock.node && inStock.node.sku !== inStock.node.url.split('/').pop()));

  /* Shipping declared per region, matching the rate table on /shipping.
     A single flat US rate quoted to every shopper was the mismatch. */
  const sd = off && off.shippingDetails;
  check('product: shippingDetails is per-region', Array.isArray(sd) && sd.length === 5);
  /* Free shipping on every order, so every region declares 0 — and the
     transit estimate still has to match config, because a US shopper shown
     a 7-to-14-day estimate is worse than no estimate. */
  check('product: every region declares free shipping and its own transit time', (() => {
    if (!Array.isArray(sd)) return false;
    return shippingCfg.REGIONS.filter((r) => r.countries.length).every((r, i) => (
      sd[i].shippingRate.value === '0'
      && sd[i].deliveryTime.transitTime.minValue === r.transitDays[0]
      && sd[i].deliveryTime.transitTime.maxValue === r.transitDays[1]
    ));
  })());

  check('product: returnPolicyCountry set',
    !!(off && off.hasMerchantReturnPolicy.returnPolicyCountry));
  check('product: return window matches config',
    !!(off && off.hasMerchantReturnPolicy.merchantReturnDays === faqCfg.RETURN_WINDOW_DAYS));
  /* returnFees must track config/faq's FREE_RETURNS in BOTH directions.
     The original form of this check forbade FreeReturn outright, which was
     right while a change of mind was the customer's postage and wrong the
     moment the store started covering it. Asserting the value matches the
     flag catches the real failure either way round: markup promising free
     returns the policy does not give, or markup charging for returns the
     policy gives away. */
  check('product: returnFees matches the configured returns policy',
    !!(off && off.hasMerchantReturnPolicy.returnFees === (faqCfg.FREE_RETURNS
      ? 'https://schema.org/FreeReturn'
      : 'https://schema.org/ReturnShippingFees')));

  /* And the pages have to agree with the same flag. A refund policy that
     still says "you pay return postage" beside markup promising a free
     return is the exact contradiction a reviewer compares for. */
  check('refund policy page agrees with the returns flag', await (async () => {
    const rp = await get('/refund-policy');
    const text = rp.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return faqCfg.FREE_RETURNS
      ? /We do, on every return/.test(text) && !/You pay return postage/.test(text)
      : /You pay return postage/.test(text);
  })());
  check('product: no invented aggregateRating',
    !!(inStock.node && !inStock.node.aggregateRating && !inStock.node.review));

  const pre = await productNode('mega-evolution-bb-preorder');
  const poff = pre.node && pre.node.offers;
  check('preorder: availability is PreOrder',
    !!(poff && /PreOrder$/.test(poff.availability)));
  check('preorder: availabilityDate emitted',
    !!(poff && poff.availabilityDate === PREORDER_ISO));
  check('preorder: priceValidUntil capped at release, not a rolling year',
    !!(poff && poff.priceValidUntil === PREORDER_ISO));
  check('preorder: no GTIN invented for a product without one',
    !!(pre.node && !pre.node.gtin));
  check('preorder: meta description does not say In Stock',
    !!(pre.html && !/content="[^"]*In Stock[^"]*"/.test(pre.html)));

  /* Social/share metadata, which the route sets and the layout renders.
     A product's og:image must be the product photo, not the sitewide
     share card, or every shared product link previews as the same
     picture. */
  check('product: og:image is the product photo',
    !!(inStock.html && /property="og:image" content="https:\/\/example\.com\/a\.jpg"/.test(inStock.html)));
  check('product: og:type is product',
    !!(inStock.html && /property="og:type" content="product"/.test(inStock.html)));
  check('product: canonical is the product URL',
    !!(inStock.html && /rel="canonical" href="https:\/\/gogetcards\.com\/products\/op-17-booster-box"/.test(inStock.html)));

  /* ── Shipping page and its redirect ── */
  const ship = await get('/shipping');
  check('GET /shipping 200', ship.status === 200, 'got ' + ship.status);
  check('/shipping lists every configured region',
    shippingCfg.REGIONS.every((r) => ship.body.includes(r.name)));
  check('/shipping states free for every region',
    (ship.body.match(/class="ship-free">Free</g) || []).length === shippingCfg.REGIONS.length);

  const oldShip = await get('/page/shipping-and-returns');
  check('old shipping URL 301s to /shipping',
    oldShip.status === 301 && oldShip.headers.location === '/shipping');

  /* ── Search ── */
  const search = await get('/collection/all?q=booster');
  check('search results are noindex, follow',
    /name="robots" content="noindex, follow"/.test(search.body));
  check('search canonical points at the plain collection URL',
    /rel="canonical" href="https:\/\/gogetcards\.com\/collection\/all"/.test(search.body));

  /* ── Trust and policy pages ── */
  const trustPages = require(path.join(ROOT, 'config/trustPages'));
  const slugs = trustPages.allSlugs();
  check('trustPages: 14 pages configured', slugs.length === 14, 'got ' + slugs.length);

  let trustFails = 0;
  const trustBodies = {};
  for (const slug of slugs) {
    const r = await get('/' + slug);
    trustBodies[slug] = r.body;
    const page = trustPages.bySlug(slug);
    const canonical = `rel="canonical" href="https://gogetcards.com/${slug}"`;
    const ok = r.status === 200
      && r.body.includes(escapeHtml(page.title))
      && /name="description" content="[^"]{60,}"/.test(r.body)
      && r.body.includes(canonical)
      && (r.body.match(/<h1[\s>]/g) || []).length === 1;
    if (!ok) {
      trustFails++;
      console.log(`        /${slug}: status=${r.status} title=${r.body.includes(escapeHtml(page.title))} `
        + `desc=${/name="description" content="[^"]{60,}"/.test(r.body)} `
        + `canonical=${r.body.includes(canonical)} h1=${(r.body.match(/<h1[\s>]/g) || []).length}`);
    }
  }
  check('every trust page returns 200 with a title, description and one h1', trustFails === 0,
    trustFails + ' page(s) failed');

  /* Consistency is the whole reason these live in config rather than the
     database: a policy page must not contradict the rest of the site. */
  const allTrust = Object.values(trustBodies).join('\n');
  check('no trust page mentions PayPal or Klarna', !/PayPal|Klarna/i.test(allTrust));
  check('no trust page quotes a shipping threshold',
    !/free (tracked )?(shipping|delivery)[^.]{0,40}over \$\d|shipping[^.]{0,30}over \$\d/i.test(allTrust));
  check('no trust page states a return window other than the configured one', (() => {
    const windows = [...allTrust.matchAll(/(\d+)[- ]day(s)? (of |from )?(delivery|return|window)/gi)].map(m => Number(m[1]));
    return windows.every((w) => w === faqCfg.RETURN_WINDOW_DAYS);
  })());
  check('preorder policy discloses up-front payment',
    /charged in full at checkout, not on release day/i.test(trustBodies['preorder-policy']));
  check('allocation policy states what happens when allocation is cut',
    /refunded in full/i.test(trustBodies['allocation-policy']));
  const paymentsCfg = require(path.join(ROOT, 'config/payments'));
  check('payment information names every configured method',
    paymentsCfg.METHODS.every((m) => trustBodies['payment-information'].includes(m.label)));
  check('payment information names nothing that is not configured',
    !/PayPal|Klarna|Afterpay|Affirm|Discover|Cash App/i.test(trustBodies['payment-information']));
  check('privacy policy states data is never sold',
    /do not sell, rent or trade personal data/i.test(trustBodies['privacy-policy']));
  check('disclaimer disclaims publisher affiliation',
    /not affiliated with, endorsed by, sponsored by, or licensed by/i.test(trustBodies.disclaimer));
  check('every trust page links onward to the others',
    slugs.every((sl) => (trustBodies[sl].match(/class="tp__aside-group"/g) || []).length >= 4));

  /* ── Release calendar ── */
  const relPage = await get('/releases');
  check('GET /releases 200', relPage.status === 200, 'got ' + relPage.status);
  check('/releases lists the dated preorder fixture with a Preorder button',
    relPage.body.includes('rel-row') && /class="btn btn-primary" href="[^"]*\/products\/[^"]+">Preorder</.test(relPage.body));
  check('/releases emits an ItemList of the upcoming sets', (() => {
    const g = (relPage.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [])
      .map((x) => JSON.parse(x.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')))
      .flatMap((x) => x['@graph'] || [x]);
    const node = g.find((n) => n['@type'] === 'ItemList');
    return !!node && node.itemListElement.length > 0;
  })());
  const relLine = await get('/releases?line=pokemon');
  check('/releases?line= filters to a known line and canonicalises to it',
    relLine.status === 200 && relLine.body.includes('href="https://gogetcards.com/releases?line=pokemon"'));
  const relBad = await get('/releases?line=%7B%22%24gt%22%3A%22%22%7D');
  check('/releases ignores an unknown line value', relBad.status === 200 && relBad.body.includes('href="https://gogetcards.com/releases"'));

  /* ── FAQ page ── */
  const faqPage = await get('/faq');
  check('GET /faq 200', faqPage.status === 200, 'got ' + faqPage.status);
  check('/faq renders every configured question',
    faqCfg.faqs().every((f) => decode(faqPage.body).includes(f.q)));
  check('/faq emits FAQPage markup matching the visible answers', (() => {
    const g = (faqPage.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [])
      .map((x) => JSON.parse(x.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')))
      .flatMap((x) => x['@graph'] || [x]);
    const node = g.find((n) => n['@type'] === 'FAQPage');
    return !!node && node.mainEntity.every((q) => decode(faqPage.body).includes(q.acceptedAnswer.text));
  })());

  /* ── Legacy redirects ── */
  const REDIRECTS = [
    ['/page/shipping-and-returns', '/shipping'],
    ['/page/refund-policy', '/refund-policy'],
    ['/page/terms-of-service', '/terms-of-service'],
    ['/page/privacy-policy', '/privacy-policy'],
    ['/page/cookie-policy', '/cookie-policy'],
    ['/page/disclaimer', '/disclaimer'],
    ['/page/track-order', '/order-tracking'],
    ['/page/faq', '/faq'],
  ];
  let redirFails = 0;
  for (const [from, to] of REDIRECTS) {
    const r = await get(from);
    if (r.status !== 301 || r.headers.location !== to) {
      redirFails++;
      console.log(`        ${from} -> ${r.status} ${r.headers.location}`);
    }
  }
  check('every legacy /page/* URL 301s to its hardcoded replacement', redirFails === 0);

  /* An unknown top-level slug must still 404, not be swallowed by the
     trust-page route's catch-all pattern. */
  const unknown = await get('/definitely-not-a-page');
  check('an unknown top-level slug still 404s', unknown.status === 404, 'got ' + unknown.status);

  /* ── Free shipping, stated identically everywhere ── */
  const shipPage = await get('/shipping');
  const surfaces = { shipping: shipPage.body, faq: faqPage.body, contact: c.body, product: inStock.html };
  for (const [name, body] of Object.entries(surfaces)) {
    /* Deliberately narrow. "Orders over $500 require a signature" is a
       delivery-security rule, not a shipping price, and an earlier version
       of this check flagged it as a stale threshold. */
    check(`${name}: no stale shipping threshold`,
      !/free (tracked )?(shipping|delivery)[^.]{0,40}over \$\d|shipping[^.]{0,30}over \$\d/i.test(body));
  }
  check('product Offer declares free shipping in every region',
    Array.isArray(sd) && sd.every((e) => e.shippingRate.value === '0'));

  /* Locals parity.
     This harness supplies its own res.locals rather than booting server.js,
     so a helper registered on app.locals there and forgotten here fails
     only inside the audit — which reads as a broken suite rather than a
     missing local, and costs an hour to work out. Asserting the mirror is
     cheaper than rediscovering it. */
  const serverSource = require('fs').readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const IGNORED = new Set(['assetVersion']); // set per-environment, not a helper
  const isMirrored = (k) => IGNORED.has(k) || k in app.locals || mirroredLocals.has(k);

  const declared = [...serverSource.matchAll(/app\.locals\.(\w+)\s*=/g)].map((m) => m[1]);
  const missing = declared.filter((k) => !isMirrored(k));
  check('every app.locals helper in server.js is mirrored in this harness',
    missing.length === 0, 'missing: ' + missing.join(', '));

  /* The same parity, for res.locals — which the check above did NOT cover,
     and that gap cost real time. googleAdsId and googleAdsPurchaseLabel were
     added to server.js's per-request middleware and never added here, so
     every page that includes the layout returned 500 with
     "googleAdsId is not defined" and 51 checks failed at once. The failures
     named schema and FAQ assertions, none of which was actually broken, so
     the suite pointed away from the cause rather than at it.
     A template reads a local without caring which object it came from. */
  const declaredRes = [...serverSource.matchAll(/res\.locals\.(\w+)\s*=/g)].map((m) => m[1]);
  const missingRes = [...new Set(declaredRes.filter((k) => !isMirrored(k)))];
  check('every res.locals value in server.js is mirrored in this harness',
    missingRes.length === 0, 'missing: ' + missingRes.join(', '));

  /* AND THE SAME FOR THE MARKET MIDDLEWARE, which server.js mounts but
     this harness does not — it reads SiteConfig, and an audit has to run
     with no database. That exemption is exactly how marketPath came to be
     used by every internal link in the customer templates while being
     absent here: 52 checks failed naming FAQ schema and contact forms,
     none of which was broken, and the one real cause was a helper the
     harness had never been told about. Sourcing the list from the
     middleware itself means the next helper added there cannot be
     silently missing from the harness. */
  const marketSource = require('fs').readFileSync(path.join(ROOT, 'middleware/market.js'), 'utf8');
  const declaredMarket = [...marketSource.matchAll(/res\.locals\.(\w+)\s*=/g)].map((m) => m[1]);
  const missingMarket = [...new Set(declaredMarket.filter((k) => !isMirrored(k)))];
  check('every res.locals value in middleware/market.js is mirrored too',
    missingMarket.length === 0, 'missing: ' + missingMarket.join(', '));

  /* robots.txt */
  const robots = await get('/robots.txt');
  check('robots.txt disallows checkout and admin',
    /Disallow: \/admin/.test(robots.body) && /Disallow: \/checkout/.test(robots.body));
  check('robots.txt disallows the customer portal',
    /Disallow: \/account/.test(robots.body));
  check('robots.txt advertises the sitemap on SITE_URL',
    /Sitemap: https:\/\/gogetcards\.com\/sitemap\.xml/.test(robots.body));

  server.close();
  console.log(fails ? `\n${fails} route check(s) FAILED` : '\nAll route checks pass');
  process.exit(fails ? 1 : 0);
});
