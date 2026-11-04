/* Renders each public page template through the real layout with
   realistic locals, so template bugs surface without a database. */
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_FILE = path.join(require('os').tmpdir(), 'gogetcards-rendered.json');
process.env.SITE_URL = 'https://gogetcards.com';

const company = require(path.join(ROOT, 'config/company'));
const payments = require(path.join(ROOT, 'config/payments'));
const preorder = require(path.join(ROOT, 'config/preorder'));
const shippingCfg = require(path.join(ROOT, 'config/shipping'));
const faqCfg = require(path.join(ROOT, 'config/faq'));
/* The real key, so the audit renders the page the route actually serves. */
const { SITE_KEY: RECAPTCHA_SITE_KEY } = require(path.join(ROOT, 'services/recaptcha'));
const markets = require(path.join(ROOT, 'config/markets'));
const marketService = require(path.join(ROOT, 'services/market'));
const formatPrice = require(path.join(ROOT, 'helpers/formatPrice'));
/* Mirrors server.js's app.locals. Anything registered there has to be
   here too, or a template that uses it renders in production and fails
   only in this harness — which reads as a broken audit rather than a
   missing local. */
const productImage = require(path.join(ROOT, 'helpers/productImage'));

const inStock = {
  _id: 'p1', title: 'One Piece TCG OP-17 Booster Box', slug: 'op-17-booster-box',
  price: 29998, comparePrice: 34999, imageUrl: 'https://example.com/a.jpg', images: [],
  description: '<p>Sealed booster box.</p>', specs: [{ label: 'Packs per box', value: '24' }],
  vendor: 'Bandai', brand: 'Bandai', productType: 'Booster Box', collections: ['one-piece'],
  tags: ['one-piece'], available: true, stock: 12, badge: 'Hot', preorder: false,
  sku: 'GGC-OP17-BB', gtin: '4570118083104', mpn: 'OP-17-BB',
  language: 'English', edition: '', setCode: 'OP-17', allocationLimit: 0, releaseDate: null,
};
const preorderItem = {
  ...inStock, _id: 'p2', title: 'Pokémon Mega Evolution Booster Box (Preorder)',
  slug: 'mega-evolution-bb-preorder', price: 13999, comparePrice: null,
  vendor: 'The Pokémon Company', brand: 'The Pokémon Company',
  preorder: true, preorderShips: 'Q2 2026', badge: 'Preorder', stock: 4,
  releaseDate: new Date('2027-03-26'), gtin: '', sku: 'GGC-ME-BB',
};

/* One product sold as two boxes — the Day/Night case. Rendered so the
   version chooser is exercised against the real template rather than only
   in isolation: it sits between the price and the quantity stepper, which
   is the busiest part of the page and the easiest place to break the
   layout without noticing. The sold-out sibling is deliberate — that
   branch renders a flag the available one does not. */
const variantNight = {
  ...preorderItem, _id: 'p3', title: 'Pokémon TCG: 30th Celebration Ultra-Premium Collection',
  slug: 'pokemon-30th-celebration-upc-night', price: 29999, stock: 6,
  variantGroup: '10-10448-120', variantName: 'Night (Umbreon ex)', variantAxis: 'color', variantOrder: 1,
};
const variantDay = {
  ...variantNight, _id: 'p4', slug: 'pokemon-30th-celebration-upc-day',
  variantName: 'Day (Espeon ex)', variantOrder: 2, available: false,
};

const base = {
  /* Globals server.js registers on app.locals / res.locals for every
     storefront render. A template that uses one and is missing it here
     fails this harness while rendering fine in production, which reads as
     a broken audit rather than a missing local. */
  catalog: require(path.join(ROOT, 'config/catalog')),
  jsonForScript: require(path.join(ROOT, 'helpers/jsonForScript')),
  dispatch: require(path.join(ROOT, 'helpers/dispatch')),
  cart: { items: [], totalItems: 0, totalPrice: 0 },
  currentPath: '/', currentYear: 2026, pageTitle: 'GoGetCards', metaDescription: '',
  ogType: 'website', ogImage: '', canonicalUrl: 'https://gogetcards.com/',
  canonicalOrigin: 'https://gogetcards.com', jsonLd: null, bodyClass: '',
  /* Every local views/partials/analytics.ejs reads. That partial is
     included by layout.ejs, so a missing one here is not a partial-shaped
     failure — it is EVERY page failing to render, which is what this script
     exists to catch. googleAdsId and googleAdsPurchaseLabel were added to
     server.js after the partial was extracted and never added here, so this
     audit has been reporting 14 failures for reasons that had nothing to do
     with the templates. Empty strings match production's current state (no
     Ads account configured); the ids are exercised separately. */
  metaPixelId: '', googleAdsId: '', googleAdsPurchaseLabel: '',
  fx: require(path.join(ROOT, 'services/fx')).snapshot(),
  assetVersion: 'test', shippingCopy: shippingCfg.copy,
  company, payments, preorder, shippingCfg, returnWindowDays: faqCfg.RETURN_WINDOW_DAYS, freeReturns: faqCfg.FREE_RETURNS, ga4Id: '', showStockCounts: true, packs: require(path.join(ROOT, 'helpers/packs')),
  formatPrice, productImage, script: '',

  /* ── The market locals every customer template now depends on ────────
     middleware/market sets these on every real request, and the templates
     build every internal link and every price through them. Rendering
     without them here is not "the default market", it is a ReferenceError
     — which is how this harness caught the links change before it shipped,
     and why they belong in the harness rather than being guarded away in
     each template. */
  ...require('./marketLocals')(),
};

const PAGES = [
  ['home', { featuredProducts: [inStock, preorderItem], preorderProducts: [preorderItem] }],
  ['product', { product: inStock, relatedProducts: [preorderItem], partnerExperience: { enabled: false } }],
  ['product(preorder)', { __view: 'product', product: preorderItem, relatedProducts: [inStock], partnerExperience: { enabled: false } }],
  /* Sold in packs: priced per pack on the ladder, shown per unit, bought
     by the pack. helpers/packs.js. */
  ['product(case-offer)', { __view: 'product', product: inStock, relatedProducts: [], partnerExperience: { enabled: false },
    caseOffer: { kind: 'case', boxes: 6, perBox: 16667, savingsPct: 17, product: { ...inStock, _id: 'c1', slug: 'the-case', title: 'Prismatic Evolutions Booster Box Case (6 Boxes)', price: 99999 }, priced: { amount: 99999, currency: 'USD', compareAmount: 0 } } }],
  ['product(pack-of-4)', { __view: 'product', product: { ...inStock, _id: 'p4', slug: 'booster-pack', title: 'One Piece TCG OP-17 Booster Pack', price: 4999, comparePrice: null, packSize: 4, stock: 40 }, packImage: 'https://gogetcards.com/images/multipack/booster-pack.png', relatedProducts: [inStock], partnerExperience: { enabled: false } }],
  ['product(variants)', {
    __view: 'product', product: variantNight,
    variantTitle: 'Pokémon TCG: 30th Celebration Ultra-Premium Collection — Night (Umbreon ex)',
    variantSiblings: [variantNight, variantDay],
    relatedProducts: [inStock], partnerExperience: { enabled: false },
  }],
  ['collection', { collectionTitle: 'All Products', collectionDescription: '', collectionHandle: 'all', content: null, products: [inStock, preorderItem], totalProducts: 2, page: 1, totalPages: 1, perPage: 24, sort: 'featured', searchQuery: '' }],
  ['collection(filters)', (function () {
    const filters = { avail: ['in-stock'], line: [], type: ['Booster Box'], lang: [], price: ['100-250'] };
    const qs = (f) => Object.entries(f).filter(([, v]) => v && v.length).map(([k, v]) => `${k}=${encodeURIComponent(v.join(','))}`).join('&');
    return {
      __view: 'collection', collectionTitle: 'All Products', collectionDescription: '', collectionHandle: 'all', content: null,
      products: [inStock], totalProducts: 1, page: 1, totalPages: 1, perPage: 24, sort: 'featured', searchQuery: '',
      facets: {
        avail: [{ id: 'in-stock', label: 'In stock', n: 5 }, { id: 'preorder', label: 'Preorder', n: 2 }],
        line: [{ id: 'pokemon', label: 'Pokémon', n: 4 }, { id: 'one-piece', label: 'One Piece', n: 3 }],
        type: [{ id: 'Booster Box', label: 'Booster Box', n: 4 }, { id: 'Elite Trainer Box', label: 'Elite Trainer Box', n: 2 }],
        lang: [{ id: 'English', label: 'English', n: 6 }, { id: 'Japanese', label: 'Japanese', n: 1 }],
        price: [{ id: 'under-100', label: 'Under $100', n: 2 }, { id: '100-250', label: '$100 – $250', n: 4 }],
      },
      filters, activeFilterCount: 3,
      filterHref: (over) => '/collection/all?' + qs({ ...filters, ...over }),
      toggleHref: (key, id) => '/collection/all?' + qs({ ...filters, [key]: filters[key].includes(id) ? filters[key].filter((x) => x !== id) : [...filters[key], id] }),
    };
  })()],
  ['about', {}],
  ['releases', (function () {
    const priced = (p) => ({ amount: p.price, currency: 'USD', compareAmount: 0 });
    const line = { handle: 'pokemon', name: 'Pokémon', shortName: 'Pokémon', icon: 'pokemon.svg' };
    const lines = [line, { handle: 'mtg', name: 'Magic: The Gathering', shortName: 'Magic', icon: 'mtg.svg' }];
    const dated = { product: preorderItem, priced: priced(preorderItem), unit: preorderItem.price, pack: 1, line, info: { hasDate: true, window: null }, daysOut: 12, monthKey: '2026-12', monthLabel: 'December 2026', day: 5, monthShort: 'Dec', weekday: 'Fri' };
    const soon = { ...dated, product: { ...preorderItem, _id: 'soon', slug: 'soon', setCode: 'SV9' }, daysOut: 1, day: 3, weekday: 'Wed' };
    const tbc = { product: { ...preorderItem, _id: 'tbc', slug: 'tbc', releaseDate: null, preorderShips: 'Q2 2027', packSize: 4 }, priced: priced(preorderItem), unit: Math.round(preorderItem.price / 4), pack: 4, line: null, info: { hasDate: false, window: 'Q2 2027' }, daysOut: null, monthKey: 'tbc', monthLabel: 'Date to be confirmed', day: null, monthShort: null, weekday: null };
    const past = { product: { ...inStock, available: false }, priced: priced(inStock), unit: inStock.price, pack: 1, line, info: { hasDate: true, window: null }, daysOut: -10, monthKey: '2026-10', monthLabel: 'October 2026', day: 23, monthShort: 'Oct', weekday: 'Fri' };
    return { months: [{ key: '2026-12', label: 'December 2026', entries: [soon, dated] }, { key: 'tbc', label: 'Date to be confirmed', entries: [tbc] }], released: [past, { ...past, product: inStock, daysOut: -1 }], upcomingCount: 3, line: '', lineName: '', lines };
  })()],
  ['releases(empty)', { __view: 'releases', months: [], released: [], upcomingCount: 0, line: 'mtg', lineName: 'Magic: The Gathering', lines: [{ handle: 'mtg', name: 'Magic: The Gathering', shortName: 'Magic', icon: 'mtg.svg' }] }],
  ['contact', { faqs: faqCfg.faqs(), sent: false, formError: '', formValues: {}, recaptchaSiteKey: RECAPTCHA_SITE_KEY }],
  ['contact(sent)', { __view: 'contact', faqs: faqCfg.faqs(), sent: true, formError: '', formValues: {}, recaptchaSiteKey: RECAPTCHA_SITE_KEY }],
  ['contact(error)', { __view: 'contact', faqs: faqCfg.faqs(), sent: false, formError: 'Please tell us your name.', formValues: { name: '', email: 'a@b.c', message: 'hi' }, recaptchaSiteKey: RECAPTCHA_SITE_KEY }],
  ['cart', { cart: { items: [{ slug: 'op-17-booster-box', title: 'OP-17', price: 29998, quantity: 1, imageUrl: '' }], totalItems: 1, totalPrice: 29998 } }],
  ['404', {}],
  ['shipping', {}],
  ['trust-page', { page: require(path.join(ROOT, 'config/trustPages')).bySlug('preorder-policy'),
                   trustNav: require(path.join(ROOT, 'config/trustPages')).navByGroup(),
                   lastReviewed: require(path.join(ROOT, 'config/trustPages')).LAST_REVIEWED }],
  ['faq', { faqs: faqCfg.faqs(),
            trustNav: require(path.join(ROOT, 'config/trustPages')).navByGroup(),
            lastReviewed: require(path.join(ROOT, 'config/trustPages')).LAST_REVIEWED }],
  ['page', { page: { title: 'Privacy Policy', slug: 'privacy-policy', content: '<p>Policy text.</p>', updatedAt: new Date() } }],
];

let failed = 0;
const out = {};
for (const [name, extra] of PAGES) {
  const view = extra.__view || name;
  const file = path.join(ROOT, 'views/pages', view + '.ejs');
  const data = { ...base, ...extra };
  try {
    const body = ejs.render(fs.readFileSync(file, 'utf8'), data, { filename: file });
    const layout = path.join(ROOT, 'views/layout.ejs');
    const html = ejs.render(fs.readFileSync(layout, 'utf8'), { ...data, body }, { filename: layout });
    out[name] = html;
    console.log(`OK   ${name.padEnd(18)} ${String(html.length).padStart(7)} bytes`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name.padEnd(18)} ${e.message.split('\n').slice(-3).join(' | ')}`);
  }
}
fs.writeFileSync(OUT_FILE, JSON.stringify(out));
console.log(failed ? `\n${failed} template(s) failed` : '\nAll templates rendered');
process.exit(failed ? 1 : 0);
