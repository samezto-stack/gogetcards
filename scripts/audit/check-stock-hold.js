/*
 * The stock hold: listed as available, refused at the payment step.
 *
 * Product.stockHold keeps an unfulfillable item reading as in stock to
 * crawlers and AI assistants and stops the buyer one step before payment,
 * offering a replacement. The two failures worth catching are both silent:
 * the hold firing EARLY (Step 1 never renders, so the listing is simply
 * broken) and the hold firing LATE or not at all (an order is taken for
 * something that cannot ship).
 *
 * The feed assertions are the other half. The page and the feed disagree
 * on purpose, and the direction matters: the feed must under-promise.
 *
 * Run:  node scripts/audit/check-stock-hold.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const Product = require(path.join(ROOT, 'models/Product'));
const CATALOGUE = {
  'op-17': { slug: 'op-17', title: 'One Piece OP-17 Booster Box', price: 14998,
             available: true, stockHold: true, supersededBy: 'op-18', allocationLimit: 0 },
  'op-18': { slug: 'op-18', title: 'One Piece OP-18 Booster Box', price: 14998,
             available: true, stockHold: false, allocationLimit: 0 },
  'held-no-successor': { slug: 'held-no-successor', title: 'Orphan', price: 7499,
             available: true, stockHold: true, supersededBy: 'gone', allocationLimit: 0 },
};
Product.findOne = (q) => {
  const c = { lean: () => c, then: (r) => {
    let hit = CATALOGUE[q && q.slug] || null;
    if (hit && q.available === true && hit.available !== true) hit = null;
    if (hit && q.stockHold && q.stockHold.$ne === true && hit.stockHold === true) hit = null;
    return Promise.resolve(hit).then(r);
  }};
  return c;
};
const s = require(path.join(ROOT, 'services/checkout/session'));
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('pass  ' + n)) : (fail++, console.log('FAIL  ' + n + (d ? ' — ' + d : ''))); };

(async () => {
  const step1 = await s.priceFor('op-17', 1);
  ok('step 1 prices a held product normally', step1.ok === true, step1.reason);

  const pay = await s.priceFor('op-17', 1, { enforceStock: true });
  ok('the payment step refuses it', pay.ok === false && pay.reason === 'sold_out', pay.reason);
  ok('and names the replacement', pay.replacement && pay.replacement.slug === 'op-18');

  const free = await s.priceFor('op-18', 1, { enforceStock: true });
  ok('an unheld product is untouched at payment', free.ok === true, free.reason);

  const orphan = await s.priceFor('held-no-successor', 1, { enforceStock: true });
  ok('a missing successor refuses without one', orphan.ok === false
     && orphan.reason === 'sold_out' && !orphan.replacement);

  /* ── The feed ignores the hold, on purpose ────────────────────────
     Asserted rather than left implicit because it looks exactly like a
     missing check. availability() reads `available` and `preorder` only;
     a held product with available:true is advertised as in stock while
     its own checkout refuses. The owner chose this knowingly — see the
     comment in feedBuilder.availability() — so this test's job is to stop
     anyone changing it silently in either direction. */
  const fb = require(path.join(ROOT, 'services/distribution/feedBuilder'));
  ok('the feed advertises a held product as in stock',
     fb.availability(CATALOGUE['op-17']) === 'IN_STOCK', fb.availability(CATALOGUE['op-17']));
  ok('the feed leaves a normal product in stock',
     fb.availability(CATALOGUE['op-18']) === 'IN_STOCK');
  ok('unticking Available is still the honest lever',
     fb.availability({ ...CATALOGUE['op-17'], available: false }) === 'OUT_OF_STOCK');
  ok('a held preorder still reports PREORDER, not IN_STOCK',
     fb.availability({ ...CATALOGUE['op-17'], preorder: true }) === 'PREORDER');

  /* ── The page itself ──────────────────────────────────────────────
     Rendered for real, both branches. The scarcity assertions are the
     point: a badge must appear when the figure is stored and must NOT
     appear when it is not. Invented urgency on the page that just failed
     someone's order is how a recovery reads as a trick. */
  const ejs = require('ejs');
  const VIEW = path.join(ROOT, 'views/pages/checkout-sold-out.ejs');
  const base = {
    /* This page is rendered standalone here; on a real request the market
       middleware has already supplied these. */
    ...require('./marketLocals')(),
    layout: false, pageTitle: 'Sold out | Zyphera TCG', assetVersion: 'test',
    formatPrice: require(path.join(ROOT, 'helpers/formatPrice')),
    productImage: require(path.join(ROOT, 'helpers/productImage')),
    gone: { title: 'One Piece OP-17 Booster Box', image: 'https://x.myshopify.com/cdn/shop/f/a.png?width=900' },
  };
  const render = (d) => ejs.renderFile(VIEW, { ...base, ...d }, {});

  const full = await render({ alt: {
    slug: 'op-18', title: 'One Piece OP-18 Booster Box', image: 'https://x.myshopify.com/cdn/shop/f/b.png?width=900',
    price: 14998, comparePrice: 17998, stock: 6, limit: 4, isPreorder: true, release: 'November 20, 2026' } });
  ok('the page names the replacement and its price', full.includes('US$149.98'));
  ok('nothing-was-charged comes before the offer',
     full.indexOf('Nothing was charged') < full.indexOf('op-18'));
  ok('a stored stock figure becomes a badge', full.includes('6 left'));
  ok('the allocation limit is shown as the real limit', full.includes('Limit 4 per customer'));
  ok('a preorder shows its release date', full.includes('ships November 20, 2026'));
  ok('the compare price becomes a real saving', full.includes('Save 17%'));
  ok('the card image is resized, not full-size', full.includes('width=570'));

  const bare = await render({ alt: {
    slug: 'op-18', title: 'One Piece OP-18 Booster Box', image: '',
    price: 14998, comparePrice: 0, stock: 0, limit: 0, isPreorder: false, release: '' } });
  ok('no stock figure means NO scarcity badge', !/\d+ left/.test(bare));
  ok('no limit means no limit line', !bare.includes('Limit'));
  ok('no compare price means no invented saving', !bare.includes('Save'));
  ok('a non-preorder says in stock instead', bare.includes('In stock'));

  const solo = await render({ alt: null });
  ok('with no replacement the page still renders', solo.includes('Nothing was charged'));
  ok('and offers the catalogue', solo.includes('/collection/all'));
  ok('and invents no product', !solo.includes('US$'));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
