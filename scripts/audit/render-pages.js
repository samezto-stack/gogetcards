/* Renders each public page template through the real layout with
   realistic locals, so template bugs surface without a database. */
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_FILE = path.join(require('os').tmpdir(), 'zyphera-rendered.json');
process.env.SITE_URL = 'https://zypheratcg.com';

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
  sku: 'ZTCG-OP17-BB', gtin: '4570118083104', mpn: 'OP-17-BB',
  language: 'English', edition: '', setCode: 'OP-17', allocationLimit: 0, releaseDate: null,
};
const preorderItem = {
  ...inStock, _id: 'p2', title: 'Pokémon Mega Evolution Booster Box (Preorder)',
  slug: 'mega-evolution-bb-preorder', price: 13999, comparePrice: null,
  vendor: 'The Pokémon Company', brand: 'The Pokémon Company',
  preorder: true, preorderShips: 'Q2 2026', badge: 'Preorder', stock: 4,
  releaseDate: new Date('2026-09-26'), gtin: '', sku: 'ZTCG-ME-BB',
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
  cart: { items: [], totalItems: 0, totalPrice: 0 },
  currentPath: '/', currentYear: 2026, pageTitle: 'Zyphera TCG', metaDescription: '',
  ogType: 'website', ogImage: '', canonicalUrl: 'https://zypheratcg.com/',
  canonicalOrigin: 'https://zypheratcg.com', jsonLd: null, bodyClass: '',
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
  company, payments, preorder, shippingCfg, returnWindowDays: faqCfg.RETURN_WINDOW_DAYS,
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
  ['product(variants)', {
    __view: 'product', product: variantNight,
    variantTitle: 'Pokémon TCG: 30th Celebration Ultra-Premium Collection — Night (Umbreon ex)',
    variantSiblings: [variantNight, variantDay],
    relatedProducts: [inStock], partnerExperience: { enabled: false },
  }],
  ['collection', { collectionTitle: 'All Products', collectionDescription: '', collectionHandle: 'all', content: null, products: [inStock, preorderItem], totalProducts: 2, page: 1, totalPages: 1, perPage: 24, sort: 'featured', searchQuery: '' }],
  ['about', {}],
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
