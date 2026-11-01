#!/usr/bin/env node
/*
 * Renders every admin view in views/admin/*.ejs with realistic fixture
 * locals, without a database, so a template error or a missing local
 * surfaces here rather than as a 500 on a live admin page.
 *
 * Run:   node scripts/audit/check-admin-views.js
 *        node scripts/audit/check-admin-views.js --serve [port]   (default 5301)
 *
 * The check mode prints one line per render — `ok  <view>/<state>  <bytes>`
 * or `FAIL <view>/<state>: <error>` — and exits 1 if anything failed. A
 * render that completes but leaks the words `undefined`, `NaN` or
 * `[object Object]` into the HTML is also a FAIL: that is how a missing
 * local usually shows up, quietly, in the middle of a sentence.
 *
 * The serve mode starts a tiny Express server that serves the same fixtures
 * as HTML (plus /css and /js from public/) so Playwright can screenshot each
 * page state. It touches no database either.
 *
 * HOW THE LOCALS ARE CHOSEN. The base object mirrors what server.js puts on
 * app.locals (formatPrice, jsonForScript, productImage, testOrder,
 * assetVersion) and what the `/admin` middleware adds (`money`). Each
 * fixture then supplies exactly the locals its route's res.render call
 * supplies — see the route file named beside every fixture — with values
 * shaped the way the service that produces them shapes them. Where a route
 * derives a local from a pure, cheap module (config/markets, the partner
 * rotation, the feed validators, the mail template registry) the real
 * module is used, so a shape change there breaks this audit rather than
 * silently drifting from it.
 *
 * Every view with a material branch is rendered in at least two states:
 * empty and populated, with and without an error, new and edit, and so on.
 * Views in views/admin/ that have no fixture here are reported as FAIL so a
 * page added later cannot slip past unrendered.
 */

const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

const ROOT = path.join(__dirname, '..', '..');
const VIEWS = path.join(ROOT, 'views', 'admin');
/* config/site builds absolute URLs from this; the feed builder needs it. */
process.env.SITE_URL = process.env.SITE_URL || 'https://gogetcards.com';

/* ── The real modules the routes lean on ──────────────────────────────── */
const markets = require(path.join(ROOT, 'config/markets'));
const formatPrice = require(path.join(ROOT, 'helpers/formatPrice'));
const jsonForScript = require(path.join(ROOT, 'helpers/jsonForScript'));
const productImage = require(path.join(ROOT, 'helpers/productImage'));
const orderReference = require(path.join(ROOT, 'helpers/orderReference'));
const testOrder = require(path.join(ROOT, 'services/testOrder'));
const customerOrders = require(path.join(ROOT, 'services/customerOrders'));
const preorderCfg = require(path.join(ROOT, 'config/preorder'));
const specTemplates = require(path.join(ROOT, 'config/specTemplates'));
const variants = require(path.join(ROOT, 'services/variants'));
const rot = require(path.join(ROOT, 'services/partnerRotation'));
const AbandonedCheckout = require(path.join(ROOT, 'models/AbandonedCheckout'));
const templates = require(path.join(ROOT, 'services/mail/templates'));
const samples = require(path.join(ROOT, 'services/mail/samples'));
const mailCfg = require(path.join(ROOT, 'config/mail'));
const broadcast = require(path.join(ROOT, 'services/mail/broadcast'));
const distribution = require(path.join(ROOT, 'config/distribution'));
const validators = require(path.join(ROOT, 'services/distribution/validators'));
const feedBuilder = require(path.join(ROOT, 'services/distribution/feedBuilder'));
const autofix = require(path.join(ROOT, 'services/distribution/autofix'));
const fileProvider = require(path.join(ROOT, 'services/distribution/providers/file'));
const company = require(path.join(ROOT, 'config/company'));

/* ── Base locals: app.locals + the /admin middleware ──────────────────── */
function baseLocals(currentPath) {
  return {
    /* server.js app.locals */
    formatPrice,
    jsonForScript,
    productImage,
    testOrder,
    assetVersion: 'audit',
    /* server.js: app.use('/admin', …) */
    money: (cents, currency) => markets.format(Number(cents || 0), currency || 'USD'),
    /* routes/admin.js router-level middleware, for the sidebar badge */
    unreadChatCount: 3,
    /* The global template-locals middleware. Admin views read almost none
       of these, but a template that does must not fail only here. */
    currentPath: currentPath || '/admin',
    currentYear: new Date().getFullYear(),
    cart: { items: [], totalItems: 0, totalPrice: 0 },
    marketPath: (p) => (String(p || '/').startsWith('/') ? String(p || '/') : `/${p}`),
  };
}

/* ── Time helpers ─────────────────────────────────────────────────────── */
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const NOW = Date.now();
const ago = (ms) => new Date(NOW - ms);
const ahead = (ms) => new Date(NOW + ms);
const dayStr = (d) => new Date(d).toISOString().slice(0, 10);

/* ═══════════════════════════════════════════════════════════════════════
   Fixtures
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Products ─────────────────────────────────────────────────────────
   Priced on the partner grid on purpose (multiples of the unit step) so the
   settings mapping shows served products, with one deliberately off-grid
   so the "why not" branch renders too. */
const UNIT = rot.DEFAULT_UNIT_CENTS;
const STEPS = rot.LADDER_STEPS;

function product(over) {
  return Object.assign({
    _id: 'p1',
    title: 'One Piece TCG: OP-17 The World’s Strongest Warriors Booster Box',
    slug: 'op-17-booster-box',
    price: 3 * UNIT, comparePrice: null,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0/op17.jpg', images: [],
    description: '<p>Factory sealed English booster box. 24 packs of 12 cards.</p>',
    specs: [{ label: 'Packs per box', value: '24' }, { label: 'Cards per pack', value: '12' }],
    vendor: 'Bandai', brand: 'Bandai', productType: 'Booster Box',
    collections: ['one-piece'], tags: ['one-piece'],
    available: true, stock: 12, badge: 'Hot', featured: true,
    preorder: false, preorderShips: null, releaseDate: null,
    stockHold: false, supersededBy: '',
    sku: 'GGC-OP17-BB', gtin: '4570118083104', mpn: 'OP-17-BB',
    language: 'English', edition: '', setCode: 'OP-17', allocationLimit: 0,
    variantGroup: '', variantName: '', variantAxis: 'color', variantOrder: 0,
    marketPrices: [],
    merchant: {},
    createdAt: ago(40 * DAY),
  }, over);
}

const op17Box = product({
  merchant: {
    googleCategory: '3793', lastSyncedAt: ago(2 * DAY), lastSyncStatus: 'sent',
    lastSyncHash: '9f1c2a7b3d4e5f60', included: { google: true }, excluded: { google: false },
  },
  marketPrices: [{ market: 'UK', amount: 12999, compareAmount: 0, available: true }],
});
const prismaticEtb = product({
  _id: 'p2', title: 'Pokémon TCG: Scarlet & Violet — Prismatic Evolutions Elite Trainer Box',
  slug: 'prismatic-evolutions-etb', price: UNIT, comparePrice: 5999,
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/prismatic-etb.jpg',
  images: ['https://cdn.shopify.com/s/files/1/0/prismatic-etb-2.jpg'],
  /* "pokemon" rather than the catalogue spelling, and no GTIN: two of the
     warnings the distribution page exists to show. */
  vendor: 'pokemon', brand: '', productType: 'Elite Trainer Box',
  collections: ['pokemon'], tags: ['pokemon'], stock: 3, badge: 'Limited',
  sku: 'GGC-PRE-ETB', gtin: '', mpn: '', setCode: 'SV8.5',
  description: '<p>Nine booster packs, 65 sleeves, 45 energy cards. Factory sealed.</p>',
});
const megaEvoBox = product({
  _id: 'p3', title: 'Pokémon TCG: MEGA EVOLUTION Booster Box (Preorder)',
  slug: 'mega-evolution-booster-box-preorder', price: 29999, comparePrice: null,
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/mega-evo.jpg',
  vendor: 'The Pokémon Company', brand: 'The Pokémon Company',
  collections: ['pokemon'], tags: ['pokemon', 'preorder'], stock: 40, badge: 'Preorder',
  preorder: true, preorderShips: 'Q2 2026', releaseDate: null,
  sku: 'GGC-ME-BB', gtin: '', mpn: '', setCode: 'ME1',
  description: '<p>Preorder for the first Mega Evolution set. Factory sealed, 36 packs.</p>',
});
const prismaticCase = product({
  _id: 'p4', title: 'Pokémon TCG: Prismatic Evolutions Booster Bundle Case (10 Bundles)',
  slug: 'prismatic-evolutions-bundle-case', price: STEPS * UNIT, comparePrice: null,
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/prismatic-case.jpg',
  vendor: 'The Pokémon Company', brand: 'The Pokémon Company', productType: 'Case',
  collections: ['pokemon'], tags: ['pokemon', 'preorder'], stock: 4, badge: 'Preorder',
  preorder: true, preorderShips: null, releaseDate: ahead(14 * DAY),
  sku: 'GGC-PRE-CASE', gtin: '820650859649', mpn: '', allocationLimit: 2,
  /* Held back from the feed by hand: the "excluded" status. */
  merchant: { excluded: { google: true }, included: { google: false } },
  description: '<p>A sealed case of ten Prismatic Evolutions booster bundles. Factory sealed.</p>',
});
const op16Box = product({
  _id: 'p5', title: 'One Piece TCG: OP-16 Booster Box',
  slug: 'op-16-booster-box', price: 2 * UNIT, comparePrice: 11999,
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/op16.jpg',
  tags: ['one-piece', 'preorder'], stock: 0, badge: 'Preorder',
  /* Released twelve days ago with orders still waiting: the overdue row. */
  preorder: true, releaseDate: ago(12 * DAY),
  sku: 'GGC-OP16-BB', gtin: '4570118083098', mpn: 'OP-16-BB', setCode: 'OP-16',
});
const op18Case = product({
  _id: 'p6', title: 'One Piece TCG: OP-18 Booster Case (12 Boxes)',
  slug: 'op-18-booster-case', price: 36 * UNIT, comparePrice: null,
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/op18-case.jpg',
  productType: 'Case', tags: ['one-piece', 'preorder'], stock: 0, badge: '',
  /* Listing closed: a preorder nobody can buy right now. */
  available: false, preorder: true, releaseDate: ahead(60 * DAY),
  sku: 'GGC-OP18-CASE', gtin: '', mpn: '', setCode: 'OP-18',
});
const variantNight = product({
  _id: 'p7', title: 'Pokémon TCG: 30th Celebration Ultra-Premium Collection',
  slug: 'pokemon-30th-upc-night', price: 5 * UNIT, comparePrice: null,
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/upc-night.jpg',
  vendor: 'The Pokémon Company', brand: 'The Pokémon Company', productType: 'Bundle',
  collections: ['pokemon'], tags: ['pokemon'], stock: 6, badge: 'Rare',
  sku: 'GGC-30-UPC-N', gtin: '', mpn: '10-10448-120', setCode: 'MEW',
  variantGroup: '10-10448-120', variantName: 'Night (Umbreon ex)', variantAxis: 'color', variantOrder: 1,
});
const variantDay = product(Object.assign({}, variantNight, {
  _id: 'p8', slug: 'pokemon-30th-upc-day', imageUrl: 'https://cdn.shopify.com/s/files/1/0/upc-day.jpg',
  sku: 'GGC-30-UPC-D', variantName: 'Day (Espeon ex)', variantOrder: 2, available: false, stock: 0,
}));

const PRODUCTS = [op17Box, prismaticEtb, megaEvoBox, prismaticCase, op16Box, op18Case, variantNight, variantDay];
const productBySlug = new Map(PRODUCTS.map((p) => [p.slug, p]));

/* The Collection model rows the products page filters on. */
const COLLECTIONS = [
  { _id: 'c1', handle: 'one-piece', name: 'One Piece', sortOrder: 1 },
  { _id: 'c2', handle: 'pokemon', name: 'Pokémon', sortOrder: 2 },
  { _id: 'c3', handle: 'sports', name: 'Sports Cards', sortOrder: 3 },
];

/* ── Customers ───────────────────────────────────────────────────────── */
function customer(over) {
  return Object.assign({
    _id: 'c0000000000000000000a001', email: 'marcus@example.com', displayEmail: 'Marcus@Example.com',
    firstName: 'Marcus', lastName: 'Hale', phone: '+1 310 555 0142',
    address: { line1: '18 Ocean Ave', line2: 'Apt 4', city: 'Santa Monica', region: 'CA', postalCode: '90401', country: 'United States' },
    status: 'active', createdAt: ago(90 * DAY), createdVia: 'purchase', marketingOptIn: true,
  }, over);
}
const marcus = customer();
const priya = customer({ _id: 'c0000000000000000000a002', email: 'priya.n@example.com', displayEmail: 'priya.n@example.com', firstName: 'Priya', lastName: 'Natarajan', phone: '', address: {}, createdAt: ago(30 * DAY), createdVia: 'magic_link', marketingOptIn: false });
const lena = customer({ _id: 'c0000000000000000000a003', email: 'lena.k@example.co.uk', displayEmail: 'Lena.K@example.co.uk', firstName: 'Lena', lastName: 'Kowalski', phone: '+44 7700 900123', address: { line1: '12 Baker Street', city: 'London', postalCode: 'NW1 6XE', country: 'United Kingdom' }, status: 'closed', createdAt: ago(200 * DAY) });
const jonas = customer({ _id: 'c0000000000000000000a004', email: 'jonas@example.de', displayEmail: 'jonas@example.de', firstName: 'Jonas', lastName: 'Weber', phone: '', address: { line1: 'Hauptstraße 5', city: 'Berlin', postalCode: '10115', country: 'Germany' }, createdAt: ago(12 * DAY) });
const samTest = customer({ _id: 'c0000000000000000000a005', email: 'sam+ztest@gogetcards.com', displayEmail: 'sam+ztest@gogetcards.com', firstName: 'Sam', lastName: 'Test', phone: '', address: {}, createdAt: ago(3 * DAY), createdVia: 'test' });
const CUSTOMERS = [marcus, priya, lena, jonas, samTest];
const customerByEmail = new Map(CUSTOMERS.map((c) => [c.email, c]));

/* ── Orders ──────────────────────────────────────────────────────────── */
function order(over) {
  return Object.assign({
    _id: '6600000000000000000000a1', orderId: 'whop_pay_MYUR2yPi5hiWdI', paymentId: 'pay_9Jk2LmN8',
    customerEmail: 'marcus@example.com', customerName: 'Marcus Hale', firstName: 'Marcus', lastName: 'Hale',
    products: ['One Piece TCG: OP-17 The World’s Strongest Warriors Booster Box'], productSlug: 'op-17-booster-box',
    quantity: 1, totalPrice: 3 * UNIT, currency: 'USD', market: 'US',
    status: 'completed', financialStatus: 'paid', fulfillmentStatus: 'unfulfilled',
    trackingNumber: '', trackingCarrier: '', trackingUrl: '', shippedAt: null, deliveredAt: null,
    cancelledAt: null, cancellationRequestedAt: null, cancellationReason: '', cancelledBy: '',
    refundStatus: 'none', refundInitiatedAt: null, refundedAt: null, refundAmount: 0,
    reinstateDeadline: null, reinstatedAt: null,
    shippingAddress: '18 Ocean Ave, Santa Monica, CA 90401, United States',
    trafficSource: 'Google Ads', source: 'whop', paymentProvider: 'whop', originalCheckoutMethod: 'partner',
    createdAt: ago(2 * HOUR), purchaseDate: ago(2 * HOUR),
  }, over);
}

const ORDERS = [
  order(),
  order({
    _id: '6600000000000000000000a2', orderId: 'whop_pay_7Qx1ZnB3kLpT', customerEmail: priya.email, customerName: 'Priya Natarajan',
    products: [prismaticEtb.title], productSlug: prismaticEtb.slug, quantity: 2, totalPrice: 2 * UNIT,
    fulfillmentStatus: 'shipped', shippedAt: ago(1 * DAY), trackingNumber: '9400111899223197428490', trackingCarrier: 'USPS Ground Advantage',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428490',
    shippingAddress: '77 King St W, Toronto, ON M5K 1E7, Canada', trafficSource: 'Facebook', createdAt: ago(3 * DAY), purchaseDate: ago(3 * DAY),
  }),
  order({
    _id: '6600000000000000000000a3', orderId: 'whop_pay_Kp9sWd2eRt4Y', customerEmail: marcus.email,
    products: [prismaticCase.title], productSlug: prismaticCase.slug, quantity: 1, totalPrice: STEPS * UNIT,
    trafficSource: 'Direct', createdAt: ago(9 * DAY), purchaseDate: ago(9 * DAY),
  }),
  order({
    _id: '6600000000000000000000a4', orderId: 'whop_pay_Lm3nHj6uVb8C', customerEmail: lena.email, customerName: 'Lena Kowalski',
    products: [op16Box.title], productSlug: op16Box.slug, quantity: 1, totalPrice: 9999, currency: 'GBP', market: 'UK',
    /* Cancelled, refund queued, keep-or-refund offer still open. */
    cancelledAt: ago(2 * DAY), cancellationRequestedAt: ago(2 * DAY), cancellationReason: 'Changed my mind', cancelledBy: 'customer',
    refundStatus: 'processing', refundInitiatedAt: ago(2 * DAY), refundAmount: 9999, reinstateDeadline: ahead(3 * DAY),
    shippingAddress: '12 Baker Street, London, NW1 6XE, United Kingdom', trafficSource: 'Google', createdAt: ago(20 * DAY), purchaseDate: ago(20 * DAY),
  }),
  order({
    _id: '6600000000000000000000a5', orderId: 'whop_pay_Zx8cVb4nMq1W', customerEmail: priya.email, customerName: 'Priya Natarajan',
    products: [op17Box.title], productSlug: op17Box.slug, quantity: 1, totalPrice: 3 * UNIT,
    cancelledAt: ago(15 * DAY), cancellationRequestedAt: ago(15 * DAY), cancelledBy: 'admin', cancellationReason: 'Allocation cut by distributor',
    refundStatus: 'refunded', refundInitiatedAt: ago(15 * DAY), refundedAt: ago(13 * DAY), refundAmount: 3 * UNIT,
    shippingAddress: '77 King St W, Toronto, ON M5K 1E7, Canada', trafficSource: 'Facebook', createdAt: ago(18 * DAY), purchaseDate: ago(18 * DAY),
  }),
  order({
    _id: '6600000000000000000000a6', orderId: 'ZY-TEST-1A2B3C4D', paymentId: '', customerEmail: samTest.email, customerName: 'Sam Test',
    products: [prismaticEtb.title], productSlug: prismaticEtb.slug, totalPrice: UNIT,
    originalCheckoutMethod: testOrder.MARKER, paymentProvider: 'test', source: 'test',
    shippingAddress: '2321 Rosecrans Ave, El Segundo, CA 90245, United States', trafficSource: 'Direct', createdAt: ago(3 * DAY), purchaseDate: ago(3 * DAY),
  }),
  order({
    _id: '6600000000000000000000a7', orderId: 'whop_pay_Qw5eRt7yUi9O', customerEmail: jonas.email, customerName: 'Jonas Weber',
    products: [variantNight.title + ' — Night (Umbreon ex)'], productSlug: variantNight.slug, totalPrice: 22999, currency: 'EUR', market: 'EU',
    fulfillmentStatus: 'delivered', shippedAt: ago(8 * DAY), deliveredAt: ago(4 * DAY), trackingNumber: 'DHL00392817465', trackingCarrier: 'DHL',
    shippingAddress: 'Hauptstraße 5, Berlin, 10115, Germany', trafficSource: 'Reddit', createdAt: ago(12 * DAY), purchaseDate: ago(12 * DAY),
  }),
  order({
    _id: '6600000000000000000000a8', orderId: 'whop_pay_As2dFg4hJk6L', customerEmail: lena.email, customerName: 'Lena Kowalski',
    products: [op16Box.title], productSlug: op16Box.slug, quantity: 2, totalPrice: 19998, currency: 'GBP', market: 'UK',
    /* Cancelled, then reinstated by the customer: no refund owed. */
    cancellationRequestedAt: ago(6 * DAY), reinstatedAt: ago(5 * DAY),
    shippingAddress: '12 Baker Street, London, NW1 6XE, United Kingdom', trafficSource: 'Google', createdAt: ago(25 * DAY), purchaseDate: ago(25 * DAY),
  }),
  order({
    _id: '6600000000000000000000a9', orderId: 'whop_pay_Pl0oKi8jUh7Y', customerEmail: 'guest.buyer@example.com', customerName: '',
    firstName: '', lastName: '', products: [megaEvoBox.title], productSlug: megaEvoBox.slug, totalPrice: 29999,
    status: 'pending', financialStatus: 'pending', shippingAddress: '', trafficSource: '',
    createdAt: ago(30 * 60e3), purchaseDate: ago(30 * 60e3),
  }),
  order({
    _id: '6600000000000000000000b1', orderId: 'whop_pay_Nb4vCx2zAs1D', customerEmail: lena.email, customerName: 'Lena Kowalski',
    products: [prismaticCase.title], productSlug: prismaticCase.slug, quantity: 2, totalPrice: 2 * 95000, currency: 'GBP', market: 'UK',
    shippingAddress: '12 Baker Street, London, NW1 6XE, United Kingdom', trafficSource: 'Google Ads', createdAt: ago(16 * DAY), purchaseDate: ago(16 * DAY),
  }),
  order({
    _id: '6600000000000000000000b2', orderId: 'whop_pay_Mj7hGf5dSa3Q', customerEmail: jonas.email, customerName: 'Jonas Weber',
    products: [prismaticCase.title], productSlug: prismaticCase.slug, totalPrice: 109999, currency: 'EUR', market: 'EU',
    shippingAddress: 'Hauptstraße 5, Berlin, 10115, Germany', trafficSource: 'Direct', createdAt: ago(5 * DAY), purchaseDate: ago(5 * DAY),
  }),
];

/* routes/admin.js and routes/adminPreorders.js decorate rows this way. */
function orderRow(o) {
  const p = productBySlug.get(o.productSlug) || null;
  const d = customerOrders.decorate(o, p);
  const c = customerByEmail.get(String(o.customerEmail || '').toLowerCase());
  return {
    order: o, reference: d.reference, status: d.status, isPreorder: d.isPreorder, release: d.release,
    title: (p && p.title) || (o.products || [])[0] || '',
    customerId: c ? c._id : null,
  };
}

/* services/customerOrders.ordersForCustomer, computed over the fixtures. */
function ordersForCustomer(c) {
  const mine = ORDERS.filter((o) => String(o.customerEmail || '').toLowerCase() === c.email && o.status !== 'abandoned')
    .sort((a, b) => b.createdAt - a.createdAt);
  const all = mine.map((o) => customerOrders.decorate(o, productBySlug.get(o.productSlug)));
  const m = {
    all: () => true,
    active: (d) => !d.order.cancelledAt && d.status.key !== 'delivered',
    preorders: (d) => d.isPreorder && !d.order.cancelledAt,
    shipped: (d) => d.status.key === 'shipped',
    delivered: (d) => d.status.key === 'delivered',
    cancelled: (d) => !!d.order.cancelledAt,
    refunded: (d) => d.order.refundStatus === 'refunded' || d.order.refundStatus === 'processing',
  };
  const counts = {};
  for (const k of Object.keys(m)) counts[k] = all.filter(m[k]).length;
  return {
    all, counts,
    totalSpend: all.filter((d) => !d.order.cancelledAt && d.order.refundStatus !== 'refunded')
      .reduce((n, d) => n + (d.order.totalPrice || 0), 0),
  };
}

/* routes/adminCustomers.js detail locals, from a customer and its orders. */
function customerDetail(c, over = {}) {
  const { all, counts, totalSpend } = ordersForCustomer(c);
  const real = all.filter((d) => !testOrder.isTestOrder(d.order));
  return Object.assign({
    layout: false, pageTitle: c.displayEmail || c.email,
    customer: c, orders: all, counts, totalSpend,
    sessions: [],
    saved: '', failed: '',
    testOnly: real.length === 0, realOrderCount: real.length, testOrderCount: all.length - real.length,
  }, over);
}

const SESSIONS = [
  { _id: 's1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', ipPrefix: '73.15.4.0/24', origin: 'purchase', createdAt: ago(9 * DAY), lastUsedAt: ago(2 * HOUR), expiresAt: ahead(21 * DAY) },
  { _id: 's2', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1', ipPrefix: '', origin: 'magic_link', createdAt: ago(3 * DAY), lastUsedAt: null, expiresAt: ahead(27 * DAY) },
  { _id: 's3', userAgent: '', ipPrefix: '', origin: '', createdAt: ago(1 * DAY), lastUsedAt: ago(1 * DAY), expiresAt: ahead(DAY) },
];

/* routes/adminCustomers.js list rows. */
function customerRows(list) {
  return list.map((c) => {
    const mine = ORDERS.filter((o) => String(o.customerEmail || '').toLowerCase() === c.email && o.status !== 'abandoned');
    return {
      c,
      orders: mine.length,
      spend: mine.reduce((n, o) => n + (o.cancelledAt ? 0 : o.totalPrice), 0),
      last: mine.length ? new Date(Math.max(...mine.map((o) => o.createdAt.getTime()))) : null,
    };
  });
}
function customerStats(rows, total) {
  return {
    customers: total,
    withOrders: rows.filter((r) => r.orders > 0).length,
    repeat: rows.filter((r) => r.orders > 1).length,
    spend: rows.reduce((n, r) => n + r.spend, 0),
  };
}

/* ── Pending payments (routes/admin.js orders page) ─────────────────── */
const UNCONFIRMED = [
  { orderId: 'whop_pay_Ux3cVb9nQw2E', store: 'coverage-desk', customerName: 'Diego Alvarez', customerEmail: 'diego@example.com', productName: op17Box.title, quantity: '1', currency: 'USD', price: '149.97', paymentId: 'pay_3Fg7Hj1kLm', createdAt: ago(40 * 60e3) },
  { orderId: 'whop_pay_Yt6rEw4qZx8V', store: '', customerName: '', customerEmail: '', productName: '', quantity: '2', currency: 'GBP', price: '', paymentId: '', createdAt: ago(5 * HOUR) },
];

/* ── Chats, leads, messages ─────────────────────────────────────────── */
const CHAT_STATS = [
  { _id: 'sess_8f2a91c4d7e6b5a3', lastMessage: 'Do you ship to Canada? The checkout only shows US.', lastSender: 'user', lastDate: ago(4 * 60e3), unreadCount: 2 },
  { _id: 'sess_1b3c5d7e9f0a2b4c', lastMessage: 'Yes, that one is in stock and ships tomorrow.', lastSender: 'admin', lastDate: ago(3 * HOUR), unreadCount: 0 },
  { _id: 'sess_aa11bb22cc33dd44', lastMessage: '<script>alert(1)</script> is my name', lastSender: 'user', lastDate: ago(1 * DAY), unreadCount: 1 },
];
const CHAT_THREAD = [
  { sender: 'user', message: 'Hi, is the OP-17 box English or Japanese?', createdAt: ago(20 * 60e3) },
  { sender: 'admin', message: 'English, factory sealed, 24 packs.', createdAt: ago(15 * 60e3) },
  { sender: 'user', message: 'Do you ship to Canada? The checkout only shows US.', createdAt: ago(4 * 60e3) },
];
const LEADS = [
  { email: 'marcus@example.com', source: 'newsletter', createdAt: ago(2 * DAY) },
  { email: 'abandoned.cart@example.com', source: 'cart_abandonment', createdAt: ago(5 * HOUR) },
  { email: 'later@example.net', source: 'newsletter', createdAt: ago(30 * DAY) },
  { email: 'x"onmouseover="alert(1)@example.com', source: 'cart_abandonment', createdAt: ago(1 * DAY) },
];
const MESSAGES = [
  { _id: 'm1', name: 'Dario Liebenberg', email: 'dario@example.com', topic: 'preorder', status: 'new', createdAt: ago(2 * HOUR), orderNumber: '', message: 'Good day,\n\nCould I pre-order an OP-17 case (12 boxes)? I am based in South Africa.', replies: [] },
  { _id: 'm2', name: 'Jerelle Whitmore', email: 'jerelle@example.com', topic: 'order', status: 'answered', createdAt: ago(3 * DAY), orderNumber: 'ZTCG-1001', message: 'I placed a preorder in April and never received it. Can you ship it or refund me?', replies: [{ body: 'Hi Jerelle, the set lands on the 21st and your box goes out the same day. Tracking follows by email.', sentAt: ago(2 * DAY), emailLogId: 'e1' }] },
  { _id: 'm3', name: 'A <script> Tester', email: 'tester@example.com', topic: 'general', status: 'read', createdAt: ago(6 * DAY), orderNumber: '', message: 'Do you stock "Bloomburrow" <Bundle> & similar? 5 > 3', replies: [] },
];

/* ── Pages ───────────────────────────────────────────────────────────── */
const PAGES = [
  { _id: 'pg1', title: 'Privacy Policy', slug: 'privacy-policy', category: 'legal', metaDescription: 'How GoGetCards handles your data.', content: '<h2>Privacy</h2><p>We keep what the order needs and nothing else.</p>', updatedAt: ago(10 * DAY) },
  { _id: 'pg2', title: 'Shipping & Returns', slug: 'shipping-returns', category: 'information', metaDescription: '', content: '<p>Free US shipping on every order.</p>', updatedAt: ago(DAY) },
];

/* ── Email log (routes/adminEmails.js) ──────────────────────────────── */
function emailRow(over) {
  return Object.assign({
    _id: '6700000000000000000000e1', createdAt: ago(2 * HOUR), type: 'orderConfirmation', retriedFrom: null,
    subject: 'Order ZTCG-46571 confirmed — One Piece TCG: OP-17 Booster Box', to: 'marcus@example.com',
    orderRef: 'ZTCG-46571', orderId: 'whop_pay_MYUR2yPi5hiWdI', status: 'sent', attempts: 1,
    linkOpenedAt: ago(1 * HOUR), error: '', providerResponse: '250 2.0.0 OK queued as 8fA3c1',
  }, over);
}
const EMAIL_ROWS = [
  emailRow(),
  emailRow({ _id: '6700000000000000000000e2', type: 'shipped', subject: 'Your order is on its way', to: 'priya.n@example.com', orderRef: 'ZTCG-10882', orderId: 'whop_pay_7Qx1ZnB3kLpT', linkOpenedAt: null, createdAt: ago(1 * DAY) }),
  emailRow({ _id: '6700000000000000000000e3', type: 'cancellation', subject: 'Order ZTCG-20931 cancelled', to: 'lena.k@example.co.uk', orderRef: 'ZTCG-20931', orderId: 'whop_pay_Lm3nHj6uVb8C', status: 'failed', attempts: 3, linkOpenedAt: null, error: '550 5.1.1 The email account that you tried to reach does not exist', providerResponse: '', createdAt: ago(2 * DAY) }),
  emailRow({ _id: '6700000000000000000000e4', type: 'cancellation', subject: 'Order ZTCG-20931 cancelled', to: 'lena.k@example.co.uk', orderRef: 'ZTCG-20931', orderId: 'whop_pay_Lm3nHj6uVb8C', retriedFrom: '6700000000000000000000e3', status: 'queued', attempts: 0, linkOpenedAt: null, providerResponse: '', createdAt: ago(1 * HOUR) }),
  emailRow({ _id: '6700000000000000000000e5', type: 'accountAccess', subject: 'Your sign-in link', to: 'jonas@example.de', orderRef: '', orderId: '', status: 'skipped', attempts: 0, linkOpenedAt: null, providerResponse: '', error: 'No mail credentials on this server, so nothing was sent. See docs/email-setup.md.', createdAt: ago(3 * DAY) }),
  emailRow({ _id: '6700000000000000000000e6', type: 'preorderConfirmation', subject: 'Preorder secured — Prismatic Evolutions Case', to: 'sam+ztest@gogetcards.com', orderRef: 'SAMPLE', orderId: '', status: 'sent', linkOpenedAt: null, createdAt: ago(5 * DAY) }),
  emailRow({ _id: '6700000000000000000000e7', type: 'recoveryReminder2', subject: 'Still thinking it over?', to: 'left.behind@example.com', orderRef: '', orderId: '', status: 'pending', attempts: 1, linkOpenedAt: null, providerResponse: '', createdAt: ago(10 * 60e3) }),
];
function byStatusOf(rows) {
  const b = { sent: 0, failed: 0, skipped: 0, pending: 0 };
  rows.forEach((r) => { b[r.status] = (b[r.status] || 0) + 1; });
  return b;
}
const EMAIL_COMMON = {
  layout: false, pageTitle: 'Email',
  types: templates.keys, labels: templates.LABELS,
  from: mailCfg.from(), replyTo: mailCfg.REPLY_TO,
  status: 'all', type: 'all', q: '', sent: '', failed: '', query: {},
};
const TRANSPORT_OK = { ok: true, host: 'api.zeptomail.com', port: 443 };
const TRANSPORT_DOWN = { ok: false, error: 'No ZeptoMail API token: set ZEPTOMAIL_TOKEN (or SMTP_PASS) and redeploy. See docs/email-setup.md.' };

/* ── Abandoned checkouts (routes/adminAbandoned.js) ─────────────────── */
const { MAX_STEP, RECOVERY_SCHEDULE, STATUSES } = AbandonedCheckout;

function abRow(over) {
  return Object.assign({
    _id: '6800000000000000000000f1', checkoutId: 'zc_8f2a91c4', email: 'marcus@example.com', firstName: 'Marcus', lastName: 'Hale',
    country: 'US', shipping: { city: 'Santa Monica' }, productName: op17Box.title, productSlug: op17Box.slug, productImage: op17Box.imageUrl,
    quantity: 1, partnerStore: 'coverage-desk', total: '149.97', currency: 'USD', market: 'US', trafficSource: 'Google Ads',
    status: 'abandoned', stoppedReason: '', orderId: '', recoveryStep: 2, recoveryLinkClicks: 0,
    emailsSent: [{ step: 1, status: 'sent' }, { step: 2, status: 'sent' }],
    lastEmailAt: ago(4 * HOUR), nextEmailAt: ahead(8 * HOUR), lastActivityAt: ago(5 * HOUR), recoveredAt: null, createdAt: ago(5 * HOUR),
  }, over);
}
const AB_ROWS = [
  abRow(),
  abRow({ _id: '6800000000000000000000f2', checkoutId: 'zc_1b3c5d7e', email: 'priya.n@example.com', firstName: 'Priya', lastName: 'Natarajan', country: 'CA', shipping: { city: 'Toronto' }, productName: prismaticEtb.title, productSlug: prismaticEtb.slug, quantity: 2, total: '99.98', trafficSource: 'Facebook', status: 'active', recoveryStep: 0, emailsSent: [], lastEmailAt: null, nextEmailAt: ahead(25 * 60e3), lastActivityAt: ago(5 * 60e3) }),
  abRow({ _id: '6800000000000000000000f3', checkoutId: 'zc_aa11bb22', email: 'lena.k@example.co.uk', firstName: 'Lena', lastName: 'Kowalski', country: 'GB', shipping: { city: 'London' }, productName: op16Box.title, productSlug: op16Box.slug, total: '179.97', currency: 'GBP', market: 'UK', trafficSource: 'Google', status: 'recovered', orderId: 'whop_pay_As2dFg4hJk6L', recoveryStep: 3, recoveryLinkClicks: 2, emailsSent: [{ step: 1, status: 'sent' }, { step: 2, status: 'sent' }, { step: 3, status: 'sent' }], lastEmailAt: ago(2 * DAY), nextEmailAt: null, lastActivityAt: ago(DAY), recoveredAt: ago(DAY) }),
  abRow({ _id: '6800000000000000000000f4', checkoutId: 'zc_cc33dd44', email: 'jonas@example.de', firstName: 'Jonas', lastName: 'Weber', country: 'DE', shipping: { city: 'Berlin' }, productName: variantNight.title, productSlug: variantNight.slug, total: '229.99', currency: 'EUR', market: 'EU', trafficSource: 'Reddit', status: 'purchased', orderId: 'whop_pay_Qw5eRt7yUi9O', recoveryStep: 0, emailsSent: [], lastEmailAt: null, nextEmailAt: null, lastActivityAt: ago(12 * DAY) }),
  abRow({ _id: '6800000000000000000000f5', checkoutId: 'zc_ee55ff66', email: 'nobody@example.net', firstName: '', lastName: '', country: '', shipping: {}, productName: '', productSlug: megaEvoBox.slug, total: '', trafficSource: '', status: 'expired', recoveryStep: 6, emailsSent: RECOVERY_SCHEDULE.map((s) => ({ step: s.step, status: 'sent' })), lastEmailAt: ago(4 * DAY), nextEmailAt: null, lastActivityAt: ago(7 * DAY), partnerStore: '' }),
  abRow({ _id: '6800000000000000000000f6', checkoutId: 'zc_0011aabb', email: 'unsub@example.com', firstName: 'Quinn', lastName: '', country: 'US', shipping: { city: 'Austin' }, status: 'suppressed', stoppedReason: 'Unsubscribed from the first reminder', recoveryStep: 1, emailsSent: [{ step: 1, status: 'sent' }], lastEmailAt: ago(3 * DAY), nextEmailAt: null, lastActivityAt: ago(3 * DAY) }),
  abRow({ _id: '6800000000000000000000f7', checkoutId: 'zc_2233ccdd', email: 'sam+ztest@gogetcards.com', firstName: 'Sam', lastName: 'Test', status: 'cancelled', stoppedReason: 'Test checkout', recoveryStep: 1, emailsSent: [{ step: 1, status: 'failed' }], lastEmailAt: ago(DAY), nextEmailAt: null, lastActivityAt: ago(DAY) }),
];

/* The same arithmetic routes/adminAbandoned.js does over the whole
   collection, so the metrics cannot disagree with the rows under them. */
function abandonedStats(all) {
  const cents = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
  const stats = {
    total: all.length, byStatus: {}, abandonedValue: 0, recoveredValue: 0, byCurrency: {}, purchasedValue: 0,
    emailsSent: 0, emailsClicked: 0,
    recoveredAfterStep: new Array(MAX_STEP + 1).fill(0), sentAtStep: new Array(MAX_STEP + 1).fill(0),
  };
  for (const r of all) {
    stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
    const value = cents(r.total);
    const sent = (r.emailsSent || []).filter((e) => e.status === 'sent');
    stats.emailsSent += sent.length;
    for (const e of sent) if (e.step >= 1 && e.step <= MAX_STEP) stats.sentAtStep[e.step]++;
    if ((r.recoveryLinkClicks || 0) > 0) stats.emailsClicked++;
    const code = r.currency || 'USD';
    const bucket = stats.byCurrency[code] || (stats.byCurrency[code] = { abandoned: 0, recovered: 0, purchased: 0, count: 0 });
    bucket.count += 1;
    if (r.status === 'recovered') { bucket.recovered += value; stats.recoveredValue += value; stats.recoveredAfterStep[Math.min(sent.length, MAX_STEP)]++; }
    else if (r.status === 'purchased') { bucket.purchased += value; stats.purchasedValue += value; }
    else if (['abandoned', 'expired'].includes(r.status)) { bucket.abandoned += value; stats.abandonedValue += value; }
  }
  const closed = (stats.byStatus.recovered || 0) + (stats.byStatus.abandoned || 0) + (stats.byStatus.expired || 0);
  stats.recoveryRate = closed ? (stats.byStatus.recovered || 0) / closed : null;
  const emailed = all.filter((r) => (r.emailsSent || []).some((e) => e.status === 'sent')).length;
  stats.clickRate = emailed ? stats.emailsClicked / emailed : null;
  stats.stepRates = RECOVERY_SCHEDULE.map((s) => {
    const sent = stats.sentAtStep[s.step];
    return { step: s.step, label: s.afterMinutes < 60 ? `${s.afterMinutes} min` : `${s.afterMinutes / 60} h`, sent, recovered: stats.recoveredAfterStep[s.step], rate: sent ? stats.recoveredAfterStep[s.step] / sent : null };
  });
  return stats;
}
function abandonedLocals(rows, over = {}) {
  return Object.assign({
    layout: false, pageTitle: 'Abandoned checkouts', query: {},
    rows, stats: abandonedStats(rows), suppressedCount: 4,
    status: 'all', page: 1, pageSize: 50, totalRows: rows.length, pages: 1,
    statuses: STATUSES, maxStep: MAX_STEP, schedule: RECOVERY_SCHEDULE,
    pauseState: { maxStep: MAX_STEP, fullMaxStep: MAX_STEP, restricted: false, paused: false, cappedAt: null, cappedBy: '' },
  }, over);
}

/* ── Partner sites (routes/admin.js settings, routes/adminPartnerLog.js) ──
   The same shapes scripts/audit/check-partner-sites.js builds, plus the
   fields the settings page grew since: groups, pacing, per-market ladders,
   banked revenue and the checkout-health flag. */
function site(id, over = {}) {
  return {
    id, name: id.replace(/-/g, ' '),
    url: `https://${id}.onrender.com/services/thing`, baseUrl: `https://${id}.onrender.com`,
    unitCents: UNIT, plans: Array.from({ length: STEPS }, (_, i) => `plan_${id}_${i + 1}`),
    enabled: true, stats: { orders: 3, lastOrderAt: ago(2 * DAY), revenue: { USD: 44991 } },
    ...over,
  };
}
const PARTNER_CONFIG = {
  enabled: true, apiKey: 'encrypted:shared', salesPerSite: 2, cursorServed: 1,
  groups: [
    { id: 'grp_live', name: 'Live accounts', enabled: true, salesPerSite: 3 },
    { id: 'grp_held', name: 'Resting', enabled: false },
  ],
  savedSites: [
    site('coverage-desk', { groupId: 'grp_live', stats: { orders: 11, lastOrderAt: ago(3 * HOUR), revenue: { USD: 164967, GBP: 25998 } },
      ladders: { UK: { unitCents: 4299, plans: Array.from({ length: STEPS }, (_, i) => `plan_uk_${i + 1}`) } } }),
    site('award-cycle', { groupId: 'grp_live', enabled: false, stats: { orders: 4, lastOrderAt: ago(20 * DAY), revenue: { USD: 59988 } } }),
    /* Rung 6 blank, so it cannot carry two of a three-step product. */
    site('defense-date', { plans: Array.from({ length: STEPS }, (_, i) => (i === 5 ? '' : `plan_dd_${i + 1}`)), salesPerSite: 5,
      stats: { orders: 0, lastOrderAt: null, revenue: {} } }),
    site('script-ledger', { groupId: 'grp_held', stats: { orders: 7, lastOrderAt: ago(9 * DAY), revenue: { USD: 104979, EUR: 22999 } } }),
    site('quiet-harbor', { health: { state: 'suspended', reason: 'Six hand-offs since the last completed order.', suspendedAt: ago(DAY), openHandoffs: 6, firstOpenAt: ago(3 * DAY) },
      stats: { orders: 2, lastOrderAt: ago(6 * DAY), revenue: { USD: 29994 } } }),
    site('plain-vanilla', { stats: { orders: 1, lastOrderAt: ago(DAY), revenue: { USD: 14997 } } }),
    site('open-handoffs', { health: { state: 'ok', openHandoffs: 2, firstOpenAt: ago(5 * HOUR) }, stats: { orders: 5, lastOrderAt: ago(2 * DAY), revenue: { USD: 74985 } } }),
  ],
  cursor: 'coverage-desk',
  history: [
    { at: ago(3 * HOUR), orderId: ORDERS[0].orderId, productSlug: op17Box.slug, siteId: 'coverage-desk', siteName: 'coverage desk' },
    { at: ago(DAY), orderId: ORDERS[6].orderId, productSlug: variantNight.slug, siteId: 'plain-vanilla', siteName: 'plain vanilla' },
    { at: ago(2 * DAY), orderId: 'whop_pay_gone_from_db', productSlug: prismaticEtb.slug, siteId: 'script-ledger', siteName: 'script ledger' },
    { at: ago(3 * DAY), orderId: ORDERS[1].orderId, productSlug: prismaticEtb.slug, siteId: 'coverage-desk', siteName: 'coverage desk' },
    { at: ago(5 * DAY), orderId: ORDERS[10].orderId, productSlug: prismaticCase.slug, siteId: 'script-ledger', siteName: 'script ledger' },
  ],
};
const PARTNER_PRODUCTS = PRODUCTS.filter((p) => p.available).map((p) => ({ slug: p.slug, title: p.title, price: p.price }));

function settingsLocals(config, over = {}) {
  return Object.assign({
    layout: false, pageTitle: 'Settings',
    user: { _id: 'u1', email: 'owner@gogetcards.com', twoFactorEnabled: false },
    partnerExperience: config,
    partnerEmailStats: { total: 40, available: 12, used: 10, converted: 18 },
    partnerProducts: PARTNER_PRODUCTS,
    partnerMapping: rot.mapping(config, PARTNER_PRODUCTS),
    partnerLadders: (config.savedSites || []).map((s) => ({ id: s.id, ...rot.ladderStatus(s) })),
    partnerOrder: rot.rotationOrder(config),
    partnerHistory: (config.history || []).slice(0, rot.HISTORY_LIMIT),
    allMarkets: markets.MARKETS,
    partnerImport: null,
    success: null, error: null,
  }, over);
}

/* routes/adminPartnerLog.js, over the config above and the order fixtures. */
function partnerLogLocals(config) {
  const byId = new Map(ORDERS.map((o) => [o.orderId, o]));
  const rows = (config.history || []).map((h) => {
    const o = byId.get(h.orderId);
    return { at: h.at, siteId: h.siteId || '', siteName: h.siteName || 'unknown', productSlug: h.productSlug || '', orderId: h.orderId || '', amount: o ? o.totalPrice : null, currency: (o && o.currency) || 'USD' };
  });
  const totals = new Map();
  for (const r of rows) {
    if (!totals.has(r.siteName)) totals.set(r.siteName, { name: r.siteName, orders: 0, byCurrency: new Map(), unknown: 0 });
    const t = totals.get(r.siteName);
    t.orders += 1;
    if (r.amount == null) { t.unknown += 1; continue; }
    t.byCurrency.set(r.currency, (t.byCurrency.get(r.currency) || 0) + r.amount);
  }
  const siteTotals = [...totals.values()].map((t) => ({ name: t.name, orders: t.orders, unknown: t.unknown, sums: [...t.byCurrency.entries()].map(([c, a]) => markets.format(a, c)) })).sort((a, b) => b.orders - a.orders);
  const lifetime = (config.savedSites || []).map((s) => ({ name: s.name || s.url || s.id, orders: (s.stats && s.stats.orders) || 0, sums: rot.revenueOf(s).map((r) => markets.format(r.amount, r.currency)) }))
    .filter((s) => s.orders > 0 || s.sums.length).sort((a, b) => b.orders - a.orders);
  return { layout: false, pageTitle: 'Brokered orders', rows, siteTotals, lifetime, money: (a, c) => markets.format(a, c) };
}

/* ── Preorders (routes/adminPreorders.js) ───────────────────────────── */
const PREORDER_PRODUCTS = PRODUCTS.filter((p) => p.preorder || (p.tags || []).includes('preorder'));
/* What the $group over Order would return, by slug. */
const PREORDER_GROUPED = {
  [prismaticCase.slug]: { orders: 3, units: 4, revenue: STEPS * UNIT + 2 * 95000 + 109999, customers: [marcus.email, lena.email, jonas.email], awaiting: 3, firstOrder: ago(16 * DAY), lastOrder: ago(5 * DAY) },
  [op16Box.slug]: { orders: 1, units: 2, revenue: 19998, customers: [lena.email], awaiting: 1, firstOrder: ago(25 * DAY), lastOrder: ago(25 * DAY) },
  [megaEvoBox.slug]: { orders: 1, units: 1, revenue: 29999, customers: ['guest.buyer@example.com'], awaiting: 1, firstOrder: ago(HOUR), lastOrder: ago(HOUR) },
};
function preorderRows(products, grouped) {
  const rows = products.map((p) => {
    const g = grouped[p.slug] || { orders: 0, units: 0, revenue: 0, customers: [], awaiting: 0 };
    const release = preorderCfg.releaseInfo(p);
    const daysAway = release.hasDate ? Math.round((new Date(p.releaseDate).getTime() - NOW) / DAY) : null;
    return {
      product: p, release, daysAway,
      overdue: release.hasDate && daysAway !== null && daysAway < 0 && g.awaiting > 0,
      imminent: release.hasDate && daysAway !== null && daysAway >= 0 && daysAway <= 21,
      orders: g.orders, units: g.units, revenue: g.revenue,
      customers: (g.customers || []).filter(Boolean).length, awaiting: g.awaiting, lastOrder: g.lastOrder || null,
    };
  });
  rows.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.release.hasDate !== b.release.hasDate) return a.release.hasDate ? -1 : 1;
    if (a.release.hasDate) return a.daysAway - b.daysAway;
    return b.units - a.units;
  });
  return rows;
}
function preordersLocals(rows, over = {}) {
  const totals = rows.reduce((t, r) => ({ units: t.units + r.units, revenue: t.revenue + r.revenue, awaiting: t.awaiting + r.awaiting, customers: t.customers + r.customers }), { units: 0, revenue: 0, awaiting: 0, customers: 0 });
  return Object.assign({ layout: false, pageTitle: 'Preorders', rows, totals, overdueCount: rows.filter((r) => r.overdue).length, sent: '', failed: '' }, over);
}
function preorderDetailLocals(p, over = {}) {
  const rows = ORDERS.filter((o) => o.productSlug === p.slug && !o.cancelledAt && !['abandoned', 'cancelled'].includes(o.status))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((o) => { const d = customerOrders.decorate(o, p); const c = customerByEmail.get(String(o.customerEmail || '').toLowerCase()); return { order: o, reference: d.reference, status: d.status, customerId: c ? c._id : null }; });
  return Object.assign({
    layout: false, pageTitle: p.title, product: p, release: preorderCfg.releaseInfo(p), rows,
    releaseDay: {
      ready: { customers: 3, orders: 3, skipped: { alreadySent: 1, suppressed: 0 }, finishesAt: ahead(2 * 35e3) },
      offer: { customers: 1, orders: 1, skipped: { alreadySent: 0, suppressed: 1 }, finishesAt: null },
      cancelledPending: 2, offersOpen: 1, reinstated: 1,
      campaigns: [
        { kind: 'releaseReady', campaign: `releaseReady:${p.slug}`, queued: 2, sent: 9, failed: 1, skipped: 0, pending: 0, finishesAt: ahead(40e3) },
        { kind: 'reinstateOffer', campaign: `reinstateOffer:${p.slug}:1762000000000`, queued: 0, sent: 3, failed: 0, skipped: 1, pending: 0, finishesAt: null },
      ],
      gap: `${broadcast.GAP_SECONDS}–${broadcast.GAP_SECONDS + broadcast.JITTER_SECONDS}s`,
    },
    sent: '', failed: '',
  }, over);
}

/* ── Analytics (routes/adminAnalytics.js + services/analytics/report.js) ── */
const RANGES = [
  { key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }, { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' }, { key: '90d', label: 'Last 90 days' }, { key: 'month', label: 'This month' },
  { key: 'prev_month', label: 'Previous month' }, { key: 'year', label: 'This year' }, { key: 'custom', label: 'Custom range' },
];
function window30(over = {}) {
  const endDate = new Date(NOW);
  const startDate = new Date(NOW - 30 * DAY);
  return Object.assign({ key: '30d', startDate, endDate, prev: { startDate: new Date(NOW - 60 * DAY), endDate: startDate }, partialEvents: false, retentionDays: 365 }, over);
}
const delta = (now, before) => (before ? ((now - before) / before) * 100 : null);
const pct = (a, b) => (b ? (a / b) * 100 : 0);

function overviewOf(c) {
  return {
    totalPageViews: c.pageViews, visitors: c.visitors, productViews: c.productViews, uniqueProductViewers: c.viewers,
    started: c.started, step1: c.step1, step2: c.step2, orders: c.orders, units: c.units, revenue: c.revenue,
    aov: c.orders ? Math.round(c.revenue / c.orders) : 0,
    revenuePerVisitor: c.visitors ? Math.round(c.revenue / c.visitors) : 0,
    conversionRate: pct(c.orders, c.visitors), checkoutConversionRate: pct(c.orders, c.started),
    checkoutAbandonmentRate: c.started ? pct(c.started - c.orders, c.started) : 0,
    productToCheckoutRate: pct(c.started, c.viewers),
  };
}
function funnelOf(c) {
  const stages = [
    { key: 'visitors', label: 'Visitors', users: c.visitors }, { key: 'product', label: 'Product page', users: c.viewers },
    { key: 'started', label: 'Checkout started', users: c.started }, { key: 'step1', label: 'Step 1 (details)', users: c.step1 },
    { key: 'formDone', label: 'Form completed', users: c.formDone }, { key: 'step2', label: 'Step 2 (payment)', users: c.step2 },
    { key: 'orders', label: 'Order completed', users: c.orders },
  ];
  const top = stages[0].users || 0;
  return stages.map((s, i) => {
    const prev = i === 0 ? null : stages[i - 1].users;
    const dropCount = prev === null ? 0 : Math.max(0, prev - s.users);
    return { ...s, ofTotal: top ? (s.users / top) * 100 : 0, fromPrev: prev ? (s.users / prev) * 100 : null, dropPct: prev ? (dropCount / prev) * 100 : null, dropCount, paymentFailed: c.paymentFailed || 0, tokenFailed: c.tokenFailed || 0 };
  });
}
function dim(key, visitors, productViews, starts, step2, orders, units, revenue) {
  return { key, visitors, hits: visitors * 3, productViews, starts, step2, orders, units, revenue, aov: orders ? Math.round(revenue / orders) : 0, conversionRate: pct(orders, visitors), abandonmentRate: starts ? pct(starts - orders, starts) : 0, revenuePerVisitor: visitors ? Math.round(revenue / visitors) : 0 };
}
function prodRow(p, views, viewers, checkouts, step1, step2, orders, units, revenue, refunds = 0, refundAmount = 0) {
  return { slug: p.slug, name: p.title, views, viewers, checkouts, step1, step2, orders, units, revenue, refunds, refundAmount, avgPrice: units ? Math.round(revenue / units) : 0, conversionRate: pct(orders, viewers), viewToCheckout: pct(checkouts, viewers), checkoutToPurchase: pct(orders, checkouts), abandonmentRate: checkouts ? pct(checkouts - orders, checkouts) : 0 };
}
function coRow(slug, name, starts, step1, step2, tokenFailed) {
  return { slug, name, starts, step1, step2, tokenFailed, step1Rate: starts ? (step1 / starts) * 100 : 0, step2Rate: step1 ? (step2 / step1) * 100 : 0 };
}
function seriesOf(days, scale) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(NOW - (days - 1 - i) * DAY);
    const v = Math.round((120 + 80 * Math.sin(i / 3)) * scale);
    return { bucket: dayStr(d), visitors: v, starts: Math.round(v / 14), orders: Math.round(v / 60), revenue: Math.round(v / 60) * 18999 };
  });
}

function analyticsPopulated() {
  const cur = { pageViews: 18422, visitors: 6210, productViews: 9850, viewers: 4120, started: 388, step1: 301, formDone: 240, step2: 212, orders: 97, units: 131, revenue: 2184503, paymentFailed: 9, tokenFailed: 14 };
  const prev = { pageViews: 15110, visitors: 5390, productViews: 8210, viewers: 3590, started: 350, step1: 270, formDone: 210, step2: 180, orders: 81, units: 104, revenue: 1795120 };
  const overview = overviewOf(cur);
  const prevOverview = overviewOf(prev);
  const sourceColumns = ['Google Ads', 'Direct', 'Facebook', 'Google', 'Reddit', 'Other'];
  const spRows = [
    { slug: op17Box.slug, name: op17Box.title, orders: 41, revenue: 41 * 3 * UNIT, cells: { 'Google Ads': { orders: 22, revenue: 22 * 3 * UNIT }, Direct: { orders: 10, revenue: 10 * 3 * UNIT }, Facebook: { orders: 6, revenue: 6 * 3 * UNIT }, Other: { orders: 3, revenue: 3 * 3 * UNIT } } },
    { slug: prismaticEtb.slug, name: prismaticEtb.title, orders: 30, revenue: 30 * UNIT, cells: { 'Google Ads': { orders: 12, revenue: 12 * UNIT }, Google: { orders: 9, revenue: 9 * UNIT }, Reddit: { orders: 9, revenue: 9 * UNIT } } },
    { slug: prismaticCase.slug, name: '', orders: 6, revenue: 6 * STEPS * UNIT, cells: { Direct: { orders: 6, revenue: 6 * STEPS * UNIT } } },
  ];
  const spTotals = {};
  for (const c of sourceColumns) spTotals[c] = spRows.reduce((n, r) => n + ((r.cells[c] && r.cells[c].orders) || 0), 0);
  return {
    layout: false, pageTitle: 'Analytics', ranges: RANGES, range: '30d', query: { range: '30d' },
    win: window30(), bucket: 'day', overview,
    deltas: { visitors: delta(overview.visitors, prevOverview.visitors), orders: delta(overview.orders, prevOverview.orders), revenue: delta(overview.revenue, prevOverview.revenue), aov: delta(overview.aov, prevOverview.aov), conversionRate: delta(overview.conversionRate, prevOverview.conversionRate), started: delta(overview.started, prevOverview.started) },
    funnel: funnelOf(cur),
    products: [
      prodRow(op17Box, 4210, 2380, 160, 120, 90, 41, 44, 41 * 3 * UNIT, 2, 2 * 3 * UNIT),
      prodRow(prismaticEtb, 3100, 1650, 140, 110, 80, 30, 48, 30 * UNIT),
      prodRow(prismaticCase, 900, 610, 20, 15, 11, 6, 6, 6 * STEPS * UNIT),
      { ...prodRow(megaEvoBox, 1640, 980, 68, 56, 31, 20, 33, 20 * 29999), name: '' },
    ],
    countries: [dim('US', 4100, 7200, 290, 160, 70, 95, 1600000), dim('CA', 820, 1100, 40, 22, 11, 14, 220000), dim('GB', 610, 800, 31, 18, 9, 12, 190000), dim('DE', 300, 420, 14, 7, 4, 6, 110000), dim('XX', 12, 3, 0, 0, 0, 0, 0)],
    sources: [dim('Google Ads', 2900, 5100, 210, 120, 48, 66, 1050000), dim('Direct', 1500, 2100, 90, 50, 24, 31, 640000), dim('Facebook', 900, 1300, 48, 22, 11, 14, 190000), dim('Google', 600, 900, 25, 12, 9, 12, 180000), dim('Reddit', 310, 450, 15, 8, 5, 8, 124503)],
    devices: { rows: [{ key: 'Mobile', visitors: 3900, starts: 230, step2: 110, startRate: 5.9, step2Rate: 47.8, dropAfterStart: 52.2 }, { key: 'Desktop', visitors: 2100, starts: 150, step2: 98, startRate: 7.1, step2Rate: 65.3, dropAfterStart: 34.7 }, { key: 'Tablet', visitors: 210, starts: 8, step2: 4, startRate: 3.8, step2Rate: 50, dropAfterStart: 50 }], totals: { orders: 97, revenue: 2184503 } },
    technical: { browsers: [{ key: 'Chrome', visitors: 3400 }, { key: 'Safari', visitors: 2100 }, { key: 'Firefox', visitors: 400 }, { key: 'Edge', visitors: 210 }, { key: 'Other', visitors: 100 }], oses: [{ key: 'iOS', visitors: 2500 }, { key: 'Windows', visitors: 1800 }, { key: 'Android', visitors: 1300 }, { key: 'macOS', visitors: 560 }, { key: 'Linux', visitors: 50 }] },
    campaigns: [{ source: 'google', medium: 'cpc', campaign: 'op17-launch', visitors: 1800 }, { source: 'facebook', medium: 'paid_social', campaign: '', visitors: 420 }, { source: 'newsletter', medium: '', campaign: 'release-day', visitors: 96 }],
    series: seriesOf(30, 1),
    abandonment: [{ status: 'abandoned', count: 141, value: 2914508 }, { status: 'recovered', count: 23, value: 486212 }, { status: 'purchased', count: 74, value: 1688400 }, { status: 'expired', count: 60, value: 1203000 }],
    customers: { customers: 88, repeatCustomers: 7, repeatRate: 7.95, avgOrdersPerCustomer: 1.1, avgCustomerValue: 24824, top: [] },
    sourceProduct: { columns: sourceColumns, rows: spRows, totals: spTotals, grandOrders: spRows.reduce((n, r) => n + r.orders, 0), grandRevenue: spRows.reduce((n, r) => n + r.revenue, 0) },
    coProduct: [coRow(op17Box.slug, op17Box.title, 160, 120, 90, 6), coRow(prismaticEtb.slug, '', 140, 110, 80, 2), coRow('', '', 24, 0, 0, 0)],
    coCountry: [{ country: 'US', ...coRow('', '', 290, 220, 160, 8) }, { country: 'CA', ...coRow('', '', 40, 30, 22, 1) }, { country: '', ...coRow('', '', 11, 0, 0, 5) }].map((r) => { delete r.slug; delete r.name; return r; }),
  };
}
function analyticsEmpty(over = {}) {
  const zero = { pageViews: 0, visitors: 0, productViews: 0, viewers: 0, started: 0, step1: 0, formDone: 0, step2: 0, orders: 0, units: 0, revenue: 0 };
  return Object.assign({
    layout: false, pageTitle: 'Analytics', ranges: RANGES, range: 'today', query: { range: 'today' },
    win: window30({ key: 'today', startDate: new Date(NOW - 6 * HOUR), endDate: new Date(NOW) }), bucket: 'hour',
    overview: overviewOf(zero),
    deltas: { visitors: null, orders: null, revenue: null, aov: null, conversionRate: null, started: null },
    funnel: funnelOf(zero), products: [], countries: [], sources: [],
    devices: { rows: [], totals: { orders: 0, revenue: 0 } }, technical: { browsers: [], oses: [] },
    campaigns: [], series: [], abandonment: [],
    customers: { customers: 0, repeatCustomers: 0, repeatRate: 0, avgOrdersPerCustomer: 0, avgCustomerValue: 0, top: [] },
    sourceProduct: { columns: [], rows: [], totals: {}, grandOrders: 0, grandRevenue: 0 },
    coProduct: [], coCountry: [],
  }, over);
}

/* ── Ads planner (services/analytics/adsPlanner.js) ─────────────────── */
function adsRow(m, sessions, orders, revenueCents, usdRate, top) {
  const revenueUsdCents = m.currency === 'USD' ? revenueCents : Math.round(revenueCents / usdRate);
  return { id: m.id, name: m.name, flag: m.flag, currency: m.currency, sessions, orders, revenueCents, revenueUsdCents, aovCents: orders ? Math.round(revenueCents / orders) : 0, conversionRate: sessions ? (orders / sessions) * 100 : null, topProducts: top };
}
function adsReport(rows) {
  const totalUsd = rows.reduce((s, r) => s + r.revenueUsdCents, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  return { rows, total: { revenueUsdCents: totalUsd, orders: totalOrders, sessions: totalSessions, aovUsdCents: totalOrders ? Math.round(totalUsd / totalOrders) : 0, conversionRate: totalSessions ? (totalOrders / totalSessions) * 100 : null }, fxUpdatedAt: ago(HOUR), empty: totalOrders === 0 && totalSessions === 0 };
}
const byMarketId = (id) => markets.byId(id);
/* Every market rather than only the configured ones, so the non-USD
   "≈ US$" branch renders; production lists markets.configured(). */
const ADS_ROWS = [
  adsRow(byMarketId('US'), 2900, 48, 48 * 3 * UNIT, 1, [{ name: op17Box.title, n: 30 }, { name: prismaticEtb.title, n: 12 }, { name: megaEvoBox.title, n: 6 }]),
  adsRow(byMarketId('CA'), 410, 6, 6 * 19999, 1.36, [{ name: prismaticEtb.title, n: 6 }]),
  adsRow(byMarketId('UK'), 380, 5, 5 * 12999, 0.79, [{ name: op17Box.title, n: 5 }]),
  adsRow(byMarketId('EU'), 150, 0, 0, 0.92, []),
];

/* ── Distribution (routes/distribution.js) ──────────────────────────── */
function probeOk(url) { return { url, ok: true, status: 200, contentType: 'image/jpeg', width: 1200, height: 1200, bytes: 184233 }; }
function probeBad(url) { return { url, ok: false, status: 404, error: 'HTTP 404' }; }

function distributionLocals(products, { channel = 'google', selectionMode = 'all', probed = false, query = {} } = {}) {
  const rows = products.map((p) => {
    const payload = feedBuilder.build(p);
    const result = validators.validate(p, { channel, selectionMode, imageProbe: probed ? (p.slug === megaEvoBox.slug ? probeBad(payload.imageLink) : probeOk(payload.imageLink)) : null });
    return { product: p, result, status: validators.statusOf(result), hash: feedBuilder.hash(result.payload), unchanged: !!(p.merchant && p.merchant.lastSyncHash) };
  });
  const summary = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.totalIssues += r.result.issues.length;
    if (r.result.errors) acc.errorIssues += r.result.errors;
    if (r.result.warnings) acc.warningIssues += r.result.warnings;
    if (r.status !== 'excluded' && !r.result.errors) acc.inFeed++;
    return acc;
  }, { ready: 0, warning: 0, error: 0, excluded: 0, totalIssues: 0, errorIssues: 0, warningIssues: 0, inFeed: 0 });
  const counted = rows.filter((r) => !r.result.excluded);
  const tally = new Map();
  counted.forEach((r) => r.result.issues.forEach((i) => {
    const e = tally.get(i.code) || { ...i, count: 0, slugs: [] };
    e.count++; if (e.slugs.length < 12) e.slugs.push(r.product.slug);
    tally.set(i.code, e);
  }));
  const rank = { error: 0, warning: 1, info: 2 };
  const topIssues = [...tally.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
  const feedRows = markets.feeds().map((f) => ({
    id: f.market.id, name: f.market.name, flag: f.market.flag, currency: f.market.currency, label: f.label, countries: f.countries, url: f.url,
    isDefault: !!f.market.isDefault,
    /* services/market.sellableNow needs the database; the US is the one
       market open today and the others are configured off. */
    open: !!f.market.isDefault,
    priced: products.filter((p) => validators.validate(p, { channel, selectionMode, market: f.market }).eligible).length,
  }));
  return {
    layout: false, query, feedRows, siteOrigin: feedBuilder.siteOrigin(), channel,
    channels: distribution.CHANNELS, available: distribution.available(), planned: distribution.planned(),
    config: { channel, selectionMode },
    rows: rows.sort((a, b) => a.result.score - b.result.score), summary, topIssues, probed,
    connectionGap: null, selectionMode, uncountedIssueProducts: rows.length - counted.length,
    defaults: distribution.defaults, refused: autofix.REFUSED,
  };
}
function distributionProductLocals(p, { probe, selectionMode = 'all', query = {} } = {}) {
  const channel = 'google';
  const payload = feedBuilder.build(p, { channel });
  const pr = probe || probeOk(payload.imageLink);
  const result = validators.validate(p, { channel, selectionMode, imageProbe: pr });
  return {
    layout: false, query, channel, product: p, result, status: validators.statusOf(result), selectionMode,
    preorderSource: p.preorder ? 'the Preorder checkbox' : ((p.tags || []).includes('preorder') ? 'the “preorder” tag' : null),
    release: preorderCfg.releaseInfo(p), tradingName: company.business.tradingName,
    payload: result.payload, probe: pr, fixes: autofix.plan(p), refused: autofix.REFUSED,
    xml: fileProvider.toXml([result.payload]), defaults: distribution.defaults, tcgTypes: validators.TCG_TYPES,
  };
}

/* ── Dashboard (routes/admin.js) ────────────────────────────────────── */
function dashboardLocals(over = {}) {
  const hourly = Array.from({ length: 24 }, (_, h) => Math.round(8 + 30 * Math.max(0, Math.sin((h - 6) / 24 * Math.PI * 2))));
  const sources = [{ name: 'Google Ads', count: 1290 }, { name: 'Direct', count: 740 }, { name: 'Facebook', count: 310 }, { name: 'chatgpt.com', count: 88 }, { name: 'trustpilot', count: 40 }, { name: 'Bing', count: 31 }, { name: '</script><img src=x onerror=alert(1)>', count: 1 }];
  const totalSources = sources.reduce((n, s) => n + s.count, 0);
  const revenueBySource = [{ name: 'Google Ads', revenue: 1050000, orders: 48 }, { name: 'Direct', revenue: 640000, orders: 24 }, { name: 'Facebook', revenue: 190000, orders: 11 }, { name: 'Google', revenue: 180000, orders: 9 }, { name: 'Reddit', revenue: 124503, orders: 5 }, { name: 'Bing Ads', revenue: 14997, orders: 1 }];
  return Object.assign({
    layout: false, pageTitle: 'Dashboard',
    directLandings: [{ _id: '/', count: 410 }, { _id: '/products/op-17-booster-box', count: 190 }, { _id: '/collections/pokemon', count: 60 }],
    previous: { views: 5390, checkouts: 350, orders: 81, revenue: 1795120 },
    revenueBySource, revenueBySourceTotal: revenueBySource.reduce((n, r) => n + r.revenue, 0) || 1,
    topProductsByRevenue: [{ _id: op17Box.slug, revenue: 41 * 3 * UNIT, units: 44, orders: 41 }, { _id: prismaticCase.slug, revenue: 6 * STEPS * UNIT, units: 6, orders: 6 }, { _id: prismaticEtb.slug, revenue: 30 * UNIT, units: 48, orders: 30 }, { _id: megaEvoBox.slug, revenue: 20 * 29999, units: 33, orders: 20 }, { _id: variantNight.slug, revenue: 4 * 5 * UNIT, units: 4, orders: 4 }, { _id: op16Box.slug, revenue: 3 * 2 * UNIT, units: 3, orders: 3 }],
    unconfirmedPaymentCount: 2,
    stats: { views: 6210, checkouts: 388, orders: 97, revenue: 2184503, reachedCheckout: 212 },
    range: 'month', startDate: '', endDate: '',
    topProducts: [{ _id: op17Box.slug, views: 4210 }, { _id: prismaticEtb.slug, views: 3100 }, { _id: megaEvoBox.slug, views: 1640 }, { _id: prismaticCase.slug, views: 900 }, { _id: variantNight.slug, views: 610 }, { _id: op16Box.slug, views: 420 }, { _id: op18Case.slug, views: 90 }],
    topCountries: [{ _id: 'US', views: 4100 }, { _id: 'CA', views: 820 }, { _id: 'GB', views: 610 }, { _id: 'DE', views: 300 }, { _id: 'AU', views: 120 }, { _id: 'JP', views: 70 }, { _id: '', views: 12 }],
    liveVisitors: [
      { page: '/products/op-17-booster-box', ip: '73.15.4.22', country: 'United States', countryCode: 'US', lastSeen: ago(20e3) },
      { page: '/', ip: '2a02:8071:1:2::1', country: 'Germany', countryCode: 'DE', lastSeen: ago(90e3) },
      { page: '/collections/pokemon', ip: '10.0.0.9', country: 'Unknown', countryCode: '', lastSeen: ago(200e3) },
    ],
    formatPrice,
    hourlyChart: jsonForScript(hourly),
    trafficSources: jsonForScript(sources.map((s) => ({ name: s.name, count: s.count, percent: ((s.count / totalSources) * 100).toFixed(1) }))),
    globePins: jsonForScript([{ lat: 34.02, lng: -118.49, country: 'United States', count: 3 }, { lat: 52.52, lng: 13.4, country: 'Germany', count: 1 }]),
  }, over);
}

/* ── Orders page (routes/admin.js) ──────────────────────────────────── */
function ordersLocals(rows, over = {}) {
  const counted = rows.map((r) => r.order).filter((o) => !testOrder.isTestOrder(o));
  const totalRevenue = counted.reduce((n, o) => n + o.totalPrice, 0);
  return Object.assign({
    layout: false, pageTitle: 'Sales & Orders', range: 'monthly', statusFilter: 'all', q: '', notice: '', query: {},
    stats: { totalRevenue, totalOrders: counted.length, aov: counted.length ? totalRevenue / counted.length : 0 },
    unconfirmedPayments: [], rows, page: 1, pages: 1, perPage: 50, total: rows.length,
    from: rows.length ? 1 : 0, to: rows.length,
  }, over);
}

/* ── Product-form as the POST error path renders it ──────────────────
   routes/admin.js re-renders with `product: req.body`, i.e. every field a
   string, and the comment in the view says specs is handled either way. */
const PRODUCT_BODY = {
  title: 'One Piece TCG: OP-19 Booster Box', slug: '', price: '149.97', comparePrice: '', vendor: 'Bandai', productType: 'Booster Box',
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/op19.jpg', badge: 'New',
  images: 'https://cdn.shopify.com/s/files/1/0/op19-2.jpg\nhttps://cdn.shopify.com/s/files/1/0/op19-3.jpg',
  description: '<p>Preorder</p>', specs: 'Packs per box: 24\nCards per pack: 12',
  collections: 'one-piece, new', tags: 'one-piece, preorder', stock: '0', allocationLimit: '0', preorderShips: 'Q3 2026', releaseDate: '',
  available: 'on', preorder: 'on', sku: '', gtin: '', mpn: '', brand: '', language: 'English', edition: '', setCode: 'OP-19',
  variantGroup: '', variantName: '', variantAxis: 'color', variantOrder: '0', mp_UK_amount: '', mp_UK_compare: '', mp_UK_available: 'on',
};

const PRODUCT_FORM_COMMON = { layout: false, success: null, formatPrice, specTemplates, variantAxes: variants.VARIANT_AXES, allMarkets: markets.MARKETS };

/* ═══════════════════════════════════════════════════════════════════════
   The fixture list: one entry per view per state.
   `path` is what res.locals.currentPath would be, for the sidebar.
   ═══════════════════════════════════════════════════════════════════════ */
const FIXTURES = [
  /* routes/admin.js GET /login, POST /login */
  { view: 'login', state: 'blank', path: '/admin/login', locals: { layout: false, error: null } },
  { view: 'login', state: 'error', path: '/admin/login', locals: { layout: false, error: 'Invalid email or password.' } },

  /* routes/admin.js GET / */
  { view: 'dashboard', state: 'populated', path: '/admin', locals: dashboardLocals() },
  { view: 'dashboard', state: 'no-previous', path: '/admin', locals: dashboardLocals({ range: 'all', previous: null, unconfirmedPaymentCount: 0 }) },
  { view: 'dashboard', state: 'custom-range', path: '/admin', locals: dashboardLocals({ range: 'custom', startDate: dayStr(ago(10 * DAY)), endDate: dayStr(new Date(NOW)), previous: { views: 0, checkouts: 0, orders: 0, revenue: 0 } }) },
  { view: 'dashboard', state: 'empty', path: '/admin', locals: dashboardLocals({ range: 'today', previous: { views: 12, checkouts: 1, orders: 0, revenue: 0 }, directLandings: [], revenueBySource: [], revenueBySourceTotal: 1, topProductsByRevenue: [], unconfirmedPaymentCount: 0, stats: { views: 0, checkouts: 0, orders: 0, revenue: 0, reachedCheckout: 0 }, topProducts: [], topCountries: [], liveVisitors: [], hourlyChart: jsonForScript(Array(24).fill(0)), trafficSources: jsonForScript([]), globePins: jsonForScript([]) }) },

  /* routes/admin.js GET /orders */
  { view: 'orders', state: 'populated', path: '/admin/orders', locals: ordersLocals(ORDERS.map(orderRow), { unconfirmedPayments: UNCONFIRMED, notice: 'cancelled', query: { recovered: 'whop_pay_Ux3cVb9nQw2E', recoveredNew: '1' }, pages: 4, total: 180, from: 1, to: 50 }) },
  { view: 'orders', state: 'page-3-filtered', path: '/admin/orders', locals: ordersLocals(ORDERS.slice(0, 4).map(orderRow), { range: 'all', statusFilter: 'unfulfilled', q: 'ZTCG-46571', page: 3, pages: 8, total: 380, from: 101, to: 150, notice: 'cancel_already_shipped', query: { recoverError: 'The payment id did not match any pending payment.' } }) },
  { view: 'orders', state: 'empty', path: '/admin/orders', locals: ordersLocals([]) },
  { view: 'orders', state: 'search-no-match', path: '/admin/orders', locals: ordersLocals([], { q: 'nobody@example.com', statusFilter: 'refunded' }) },

  /* routes/admin.js GET /chats */
  { view: 'chats', state: 'populated', path: '/admin/chats', locals: { layout: false, pageTitle: 'Live Chat', chatStats: CHAT_STATS, activeSessionId: CHAT_STATS[0]._id, activeMessages: CHAT_THREAD } },
  { view: 'chats', state: 'no-messages-in-session', path: '/admin/chats', locals: { layout: false, pageTitle: 'Live Chat', chatStats: CHAT_STATS, activeSessionId: 'sess_unknown', activeMessages: [] } },
  { view: 'chats', state: 'empty', path: '/admin/chats', locals: { layout: false, pageTitle: 'Live Chat', chatStats: [], activeSessionId: null, activeMessages: [] } },

  /* routes/admin.js GET /leads */
  { view: 'leads', state: 'populated', path: '/admin/leads', locals: { layout: false, leads: LEADS } },
  { view: 'leads', state: 'empty', path: '/admin/leads', locals: { layout: false, leads: [] } },

  /* routes/admin.js GET /messages */
  { view: 'messages', state: 'populated', path: '/admin/messages', locals: { layout: false, messages: MESSAGES, newCount: 1, supportEmail: company.business.supportEmail, sent: 'jerelle@example.com', error: '' } },
  { view: 'messages', state: 'empty', path: '/admin/messages', locals: { layout: false, messages: [], newCount: 0, supportEmail: company.business.supportEmail, sent: '', error: 'The reply was NOT sent (failed). Nothing was recorded, so you can try again.' } },

  /* routes/admin.js GET /products */
  { view: 'products', state: 'populated', path: '/admin/products', locals: { layout: false, pageTitle: 'Products', products: PRODUCTS, collections: COLLECTIONS, q: '', collection: 'all', sort: 'newest', formatPrice, success: 'Product updated successfully' } },
  { view: 'products', state: 'filtered-empty', path: '/admin/products', locals: { layout: false, pageTitle: 'Products', products: [], collections: COLLECTIONS, q: 'yugioh', collection: 'sports', sort: 'price-asc', formatPrice, success: null } },

  /* routes/admin.js GET /products/import */
  { view: 'product-import', state: 'default', path: '/admin/products/import', locals: { layout: false, columns: require(path.join(ROOT, 'services/productCsv')).COLUMNS } },

  /* routes/admin.js GET /products/new, GET /products/:id/edit, POST error paths */
  { view: 'product-form', state: 'new', path: '/admin/products', locals: { ...PRODUCT_FORM_COMMON, pageTitle: 'Add Product', product: null, error: null } },
  { view: 'product-form', state: 'edit', path: '/admin/products', locals: { ...PRODUCT_FORM_COMMON, pageTitle: 'Edit Product', product: op17Box, error: null } },
  { view: 'product-form', state: 'edit-variant-preorder', path: '/admin/products', locals: { ...PRODUCT_FORM_COMMON, pageTitle: 'Edit Product', product: { ...prismaticCase, variantGroup: 'PRE-CASE', variantName: 'Case A', stockHold: true, supersededBy: op17Box.slug, marketPrices: [{ market: 'UK', amount: 95000, compareAmount: 99900, available: false }] }, error: null } },
  { view: 'product-form', state: 'edit-validation-error', path: '/admin/products', locals: { ...PRODUCT_FORM_COMMON, pageTitle: 'Edit Product', product: { ...op17Box, specs: 'Packs per box: 24' }, error: 'Product validation failed: price: Path `price` is required.' } },
  /* POST /products on a validation error re-renders with product: req.body,
     where images/collections/tags are the raw textarea and input strings. */
  { view: 'product-form', state: 'new-error-raw-body', path: '/admin/products', locals: { ...PRODUCT_FORM_COMMON, pageTitle: 'Add Product', product: PRODUCT_BODY, error: 'Product validation failed: slug: A product with that slug already exists.' } },

  /* routes/admin.js GET /pages, /pages/new, /pages/:id/edit, POST error */
  { view: 'pages', state: 'populated', path: '/admin/pages', locals: { layout: false, pageTitle: 'Pages', pages: PAGES, success: 'Page created successfully' } },
  { view: 'pages', state: 'empty', path: '/admin/pages', locals: { layout: false, pageTitle: 'Pages', pages: [], success: null } },
  { view: 'page-form', state: 'new', path: '/admin/pages', locals: { layout: false, pageTitle: 'Add Page', page: null, error: null } },
  { view: 'page-form', state: 'edit', path: '/admin/pages', locals: { layout: false, pageTitle: 'Edit Page', page: PAGES[0], error: null } },
  { view: 'page-form', state: 'new-error-raw-body', path: '/admin/pages', locals: { layout: false, pageTitle: 'Add Page', page: { title: 'Terms', slug: 'privacy-policy', category: 'legal', metaDescription: '', content: '<p>…</p>' }, error: 'E11000 duplicate key error collection: pages index: slug_1' } },

  /* routes/admin.js GET /settings */
  { view: 'settings', state: 'populated', path: '/admin/settings', locals: settingsLocals(PARTNER_CONFIG, { success: 'Settings saved', partnerImport: { ok: false, errors: ['Row 3: step "25" is outside 1–24', 'Row 9: plan id is blank'], warnings: ['Site "award cycle" already existed and was updated'], added: 0, updated: 0 } }) },
  { view: 'settings', state: 'import-ok', path: '/admin/settings', locals: settingsLocals(PARTNER_CONFIG, { partnerImport: { ok: true, errors: [], warnings: [], added: 2, updated: 1 }, partnerEmailStats: { total: 0, available: 0, used: 0, converted: 0 } }) },
  { view: 'settings', state: 'empty', path: '/admin/settings', locals: settingsLocals({ enabled: false, apiKey: '', routes: [], savedSites: [], groups: [], history: [] }, { error: 'Failed to disable 2FA', partnerEmailStats: { total: 0, available: 0, used: 0, converted: 0 } }) },

  /* routes/adminCustomers.js GET /, GET /:id */
  { view: 'customers', state: 'populated', path: '/admin/customers', locals: (() => { const rows = customerRows(CUSTOMERS); return { layout: false, pageTitle: 'Customers', q: '', rows, total: 5, activeSessions: 3, deleted: 'account', stats: customerStats(rows, 5), truncated: false }; })() },
  { view: 'customers', state: 'truncated-search', path: '/admin/customers', locals: (() => { const rows = customerRows([marcus, priya]); return { layout: false, pageTitle: 'Customers', q: 'example', rows, total: 120, activeSessions: 1, deleted: 'all', stats: customerStats(rows, 120), truncated: true }; })() },
  { view: 'customers', state: 'empty', path: '/admin/customers', locals: { layout: false, pageTitle: 'Customers', q: '', rows: [], total: 0, activeSessions: 0, deleted: '', stats: { customers: 0, withOrders: 0, repeat: 0, spend: 0 }, truncated: false } },
  { view: 'customers', state: 'search-no-match', path: '/admin/customers', locals: { layout: false, pageTitle: 'Customers', q: 'zzz', rows: [], total: 0, activeSessions: 2, deleted: '', stats: { customers: 0, withOrders: 0, repeat: 0, spend: 0 }, truncated: false } },
  { view: 'customer', state: 'active', path: '/admin/customers', locals: customerDetail(marcus, { sessions: SESSIONS, saved: 'fulfilment' }) },
  { view: 'customer', state: 'refunds-and-reinstated', path: '/admin/customers', locals: customerDetail(lena, { sessions: [SESSIONS[1]], saved: 'refund', failed: 'real_orders', customer: { ...lena, status: 'active' } }) },
  { view: 'customer', state: 'closed', path: '/admin/customers', locals: customerDetail(lena, { sessions: [], saved: 'status' }) },
  { view: 'customer', state: 'test-only', path: '/admin/customers', locals: customerDetail(samTest, { sessions: [SESSIONS[2]] }) },
  { view: 'customer', state: 'no-orders', path: '/admin/customers', locals: customerDetail(customer({ _id: 'c0000000000000000000a009', email: 'new@example.com', displayEmail: '', firstName: '', lastName: '', phone: '', address: {}, createdVia: '' }), {}) },

  /* routes/adminEmails.js GET /, GET /preview */
  { view: 'emails', state: 'populated', path: '/admin/emails', locals: { ...EMAIL_COMMON, rows: EMAIL_ROWS, byStatus: byStatusOf(EMAIL_ROWS), opened: 1, sampleCount: 1, retryQueue: { pending: 1, claimed: 0, outstanding: 1, nextAt: ahead(4 * 60e3), nextTo: 'lena.k@example.co.uk' }, duplicates: 2, transport: TRANSPORT_OK, sent: 'retry', query: { queued: '3', skippedNoOrder: '1', skippedGone: '0', deduped: '2', groups: '1', wasFailed: '1' } } },
  { view: 'emails', state: 'transport-down', path: '/admin/emails', locals: { ...EMAIL_COMMON, rows: EMAIL_ROWS.filter((r) => r.status !== 'sent'), byStatus: byStatusOf(EMAIL_ROWS), opened: 0, sampleCount: 0, retryQueue: { pending: 0, claimed: 0, outstanding: 0, nextAt: null, nextTo: '' }, duplicates: 0, transport: TRANSPORT_DOWN, status: 'failed', type: 'cancellation', q: 'lena', failed: 'no_order', query: { bulk: 'none', cleared: '2' } } },
  { view: 'emails', state: 'release-flash-bulk', path: '/admin/emails', locals: { ...EMAIL_COMMON, rows: EMAIL_ROWS.slice(0, 2), byStatus: { sent: 2, failed: 0, skipped: 0, pending: 0 }, opened: 1, sampleCount: 0, retryQueue: { pending: 0, claimed: 0, outstanding: 0, nextAt: null, nextTo: '' }, duplicates: 0, transport: TRANSPORT_OK, sent: 'release_14_16', query: { bulkDeleted: '3', bulkDequeued: '1' } } },
  { view: 'emails', state: 'empty', path: '/admin/emails', locals: { ...EMAIL_COMMON, rows: [], byStatus: { sent: 0, failed: 0, skipped: 0, pending: 0 }, opened: 0, sampleCount: 0, retryQueue: { pending: 0, claimed: 0, outstanding: 0, nextAt: null, nextTo: '' }, duplicates: 0, transport: TRANSPORT_OK, sent: 'purged_5' } },
  { view: 'email-preview', state: 'default', path: '/admin/emails', locals: { layout: false, pageTitle: 'Email templates', types: templates.keys, labels: templates.LABELS, cases: Object.fromEntries(templates.keys.map((t) => [t, samples.casesFor(t).map(([l]) => l)])) } },
  { view: 'email-preview', state: 'missing-samples', path: '/admin/emails', locals: { layout: false, pageTitle: 'Email templates', types: templates.keys, labels: templates.LABELS, cases: {} } },

  /* routes/adminPartnerLog.js GET / */
  { view: 'partner-log', state: 'populated', path: '/admin/partner-log', locals: partnerLogLocals(PARTNER_CONFIG) },
  { view: 'partner-log', state: 'empty', path: '/admin/partner-log', locals: partnerLogLocals({ savedSites: [], history: [] }) },

  /* routes/adminPreorders.js GET /, GET /:slug */
  { view: 'preorders', state: 'populated', path: '/admin/preorders', locals: preordersLocals(preorderRows(PREORDER_PRODUCTS, PREORDER_GROUPED), { sent: 'release_12_14' }) },
  { view: 'preorders', state: 'nothing-waiting', path: '/admin/preorders', locals: preordersLocals(preorderRows([prismaticCase, megaEvoBox], {}), { failed: 'no_product' }) },
  { view: 'preorders', state: 'empty', path: '/admin/preorders', locals: preordersLocals([]) },
  { view: 'preorder-detail', state: 'populated', path: '/admin/preorders', locals: preorderDetailLocals(prismaticCase, { sent: 'ready_3_3' }) },
  { view: 'preorder-detail', state: 'offer-queued', path: '/admin/preorders', locals: preorderDetailLocals(op16Box, { sent: 'offer_1_1' }) },
  { view: 'preorder-detail', state: 'empty', path: '/admin/preorders', locals: preorderDetailLocals(op18Case, { failed: 'No open orders for this set.', releaseDay: { ready: { customers: 0, orders: 0, skipped: { alreadySent: 0, suppressed: 0 }, finishesAt: null }, offer: { customers: 0, orders: 0, skipped: { alreadySent: 0, suppressed: 0 }, finishesAt: null }, cancelledPending: 0, offersOpen: 0, reinstated: 0, campaigns: [], gap: '20–35s' } }) },

  /* routes/adminAbandoned.js GET / */
  { view: 'abandoned', state: 'populated', path: '/admin/abandoned', locals: abandonedLocals(AB_ROWS, { query: { converted: 'MAN-zc_1b3c5d7e', convertedNew: '1', cap: 'up', step: '6', shifted: '3', hours: '5.5' }, pauseState: { maxStep: 3, fullMaxStep: MAX_STEP, restricted: true, paused: false, cappedAt: ago(5 * HOUR), cappedBy: 'owner' } }) },
  { view: 'abandoned', state: 'paused-filtered', path: '/admin/abandoned', locals: abandonedLocals(AB_ROWS.filter((r) => r.status === 'abandoned'), { status: 'abandoned', page: 2, pages: 3, totalRows: 130, query: { cap: 'down', step: '0', held: '12', convertError: 'Enter the Whop payment id first — it is what ties this order to the money.' }, pauseState: { maxStep: 0, fullMaxStep: MAX_STEP, restricted: true, paused: true, cappedAt: ago(DAY), cappedBy: '' } }) },
  { view: 'abandoned', state: 'empty', path: '/admin/abandoned', locals: abandonedLocals([], { suppressedCount: 0, query: { failed: 'cap' } }) },

  /* routes/adminAnalytics.js GET /, GET /ads */
  { view: 'analytics', state: 'populated', path: '/admin/analytics', locals: analyticsPopulated() },
  { view: 'analytics', state: 'custom-partial', path: '/admin/analytics', locals: { ...analyticsPopulated(), range: 'custom', bucket: 'week', query: { range: 'custom', start: dayStr(ago(400 * DAY)), end: dayStr(new Date(NOW)) }, win: window30({ key: 'custom', startDate: ago(400 * DAY), partialEvents: true }), campaigns: [], series: seriesOf(58, 0.4).map((s, i) => ({ ...s, bucket: `2026-W${String(i + 1).padStart(2, '0')}` })) } },
  { view: 'analytics', state: 'empty', path: '/admin/analytics', locals: analyticsEmpty() },
  { view: 'ads-planner', state: 'populated', path: '/admin/analytics/ads', locals: { layout: false, pageTitle: 'Ads Planner', ranges: RANGES, range: 'month', query: { range: 'month' }, win: window30({ key: 'month', startDate: new Date(new Date(NOW).getFullYear(), new Date(NOW).getMonth(), 1) }), report: adsReport(ADS_ROWS) } },
  { view: 'ads-planner', state: 'empty', path: '/admin/analytics/ads', locals: { layout: false, pageTitle: 'Ads Planner', ranges: RANGES, range: 'custom', query: { range: 'custom', start: dayStr(ago(3 * DAY)), end: dayStr(new Date(NOW)) }, win: window30({ key: 'custom', startDate: ago(3 * DAY) }), report: adsReport([adsRow(byMarketId('US'), 0, 0, 0, 1, [])]) } },

  /* routes/distribution.js GET /, GET /product/:slug */
  { view: 'distribution', state: 'populated', path: '/admin/distribution', locals: distributionLocals(PRODUCTS, { query: { saved: '1' } }) },
  { view: 'distribution', state: 'selected-probed', path: '/admin/distribution', locals: distributionLocals(PRODUCTS, { selectionMode: 'selected', probed: true, query: { fixed: '3', bulk: '2', action: 'hold', error: 'Select at least one product first.' } }) },
  { view: 'distribution', state: 'empty', path: '/admin/distribution', locals: distributionLocals([], { query: { fixed: '0', bulk: '1', action: 'send' } }) },
  { view: 'distribution-product', state: 'ready', path: '/admin/distribution', locals: distributionProductLocals(op17Box, { query: { saved: '1' } }) },
  { view: 'distribution-product', state: 'issues-and-fixes', path: '/admin/distribution', locals: distributionProductLocals(megaEvoBox, { probe: probeBad(megaEvoBox.imageUrl), query: { fixed: '2' } }) },
  { view: 'distribution-product', state: 'excluded-preorder', path: '/admin/distribution', locals: distributionProductLocals(prismaticCase, { query: { fixed: '0' } }) },
  { view: 'distribution-product', state: 'not-selected-no-image', path: '/admin/distribution', locals: distributionProductLocals({ ...variantDay, imageUrl: '', images: [] }, { selectionMode: 'selected', probe: { url: '', ok: false, error: 'not an absolute http(s) URL' } }) },
];

/* ═══════════════════════════════════════════════════════════════════════
   Rendering
   ═══════════════════════════════════════════════════════════════════════ */

function renderFixture(f) {
  const file = path.join(VIEWS, `${f.view}.ejs`);
  const locals = Object.assign(baseLocals(f.path), f.locals);
  /* By file path, so include('_sidebar') and include('../partials/flag')
     resolve exactly as they do under Express. */
  return ejs.renderFile(file, locals, { filename: file });
}

/** The one line worth reading from an EJS error: what, and where.
 *  EJS puts `<file>:<line>` on the first line of a runtime error and
 *  `ejs:<line>` on a compile error; the message itself is the last line. */
function describe(err) {
  const lines = String(err && err.message || err).split('\n').map((s) => s.trim()).filter(Boolean);
  const what = lines[lines.length - 1] || 'unknown error';
  const file = err && err.path ? path.relative(ROOT, err.path) : '';
  const first = lines[0] || '';
  const m = first.match(/\.ejs:(\d+)$/) || first.match(/^ejs:(\d+)/);
  const where = file ? `${file}${m ? ':' + m[1] : ''}` : (m ? `line ${m[1]}` : '');
  return where ? `${what}  [${where}]` : what;
}

/** A missing local rarely throws; it prints. */
function leak(html) {
  const m = html.match(/\bundefined\b|\bNaN\b|\[object Object\]/);
  if (!m) return null;
  const at = m.index;
  const ctx = html.slice(Math.max(0, at - 70), at + m[0].length + 40).replace(/\s+/g, ' ');
  return `leaked "${m[0]}" near: …${ctx}…`;
}

/** Every page in views/admin that nothing here renders. */
function uncoveredViews() {
  const covered = new Set(FIXTURES.map((f) => f.view));
  return fs.readdirSync(VIEWS)
    .filter((n) => n.endsWith('.ejs') && !n.startsWith('_'))
    .map((n) => n.replace(/\.ejs$/, ''))
    .filter((v) => !covered.has(v));
}

async function runChecks() {
  let ok = 0;
  let failed = 0;
  for (const f of FIXTURES) {
    const name = `${f.view}/${f.state}`;
    try {
      const html = await renderFixture(f);
      const bad = leak(html);
      if (bad) { failed++; console.log(`FAIL ${name}: ${bad}`); continue; }
      ok++;
      console.log(`ok   ${name.padEnd(42)} ${String(html.length).padStart(7)}`);
    } catch (err) {
      failed++;
      console.log(`FAIL ${name}: ${describe(err)}`);
    }
  }
  for (const v of uncoveredViews()) {
    failed++;
    console.log(`FAIL ${v}/(none): no fixture in scripts/audit/check-admin-views.js renders this view`);
  }
  console.log(`\n${ok} render(s) ok, ${failed} failure(s)${failed ? '' : ' — every admin view rendered in every fixture state'}`);
  process.exit(failed ? 1 : 0);
}

/* ── Serve mode: the same fixtures over HTTP, for screenshots ────────── */
function serve(port) {
  const express = require('express');
  const app = express();
  app.disable('x-powered-by');
  app.use('/css', express.static(path.join(ROOT, 'public', 'css')));
  app.use('/js', express.static(path.join(ROOT, 'public', 'js')));

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const urlFor = (f) => `/${f.view}/${f.state}`;

  app.get('/', (req, res) => {
    const items = FIXTURES.map((f) => `<li><a href="${urlFor(f)}">${esc(urlFor(f))}</a></li>`).join('\n');
    res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Admin view fixtures</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem}li{margin:.15rem 0}</style>
<h1>Admin view fixtures</h1><p>${FIXTURES.length} renders. <code>/&lt;view&gt;</code> serves that view's first state.</p><ul>${items}</ul>`);
  });

  app.get('/:view/:state?', async (req, res) => {
    const f = FIXTURES.find((x) => x.view === req.params.view && (!req.params.state || x.state === req.params.state));
    if (!f) return res.status(404).type('text/plain').send(`No fixture for ${req.params.view}/${req.params.state || ''}. See / for the list.`);
    try {
      const html = await renderFixture(f);
      res.set('Cache-Control', 'no-store').type('html').send(html);
    } catch (err) {
      /* The audit's own server, read only by whoever is running it: the
         full message is the point here. */
      res.status(500).type('text/plain').send(`Render failed for ${f.view}/${f.state}:\n\n${err && err.message || err}`);
    }
  });

  app.listen(port, () => {
    console.log(`Admin view fixtures on http://localhost:${port}/  (no database; Ctrl-C to stop)\n`);
    for (const f of FIXTURES) console.log(`  http://localhost:${port}${urlFor(f)}`);
  });
}

const argv = process.argv.slice(2);
if (argv[0] === '--serve') {
  serve(parseInt(argv[1], 10) || 5301);
} else {
  runChecks();
}
