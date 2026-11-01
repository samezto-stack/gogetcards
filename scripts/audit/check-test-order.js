/* The test-purchase bypass, end to end minus the database.
 *
 * Run:  node scripts/audit/check-test-order.js
 *
 * A bypass around payment is the one feature in a shop that must never be
 * slightly wrong, so this checks the two things that would make it
 * dangerous and the two that would make it useless:
 *
 *   dangerous — an address a stranger could guess opening the bypass, or
 *   a test order counting as revenue or as a Meta conversion.
 *
 *   useless — a signature the real verifier rejects, or an order shaped
 *   so differently from a real one that walking it proves nothing.
 *
 * It runs the genuine signature verifier and the genuine pipeline steps
 * (parse, validate, detect source, normalise customer, build order) over
 * the URL the bypass actually produces. Only the database write is left
 * out, because that is the one step with nothing to decide.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
process.env.THANK_YOU_SIGNING_SECRET = process.env.THANK_YOU_SIGNING_SECRET || 'audit-secret-not-a-real-one';

const testOrder = require(path.join(ROOT, 'services/testOrder'));
const { verifySignature } = require(path.join(ROOT, 'services/orderPipeline/signatureVerifier'));
const { parseOrderParams } = require(path.join(ROOT, 'services/orderPipeline/orderParser'));
const { validateOrderParams } = require(path.join(ROOT, 'services/orderPipeline/orderValidator'));
const { detectSource } = require(path.join(ROOT, 'services/orderPipeline/sourceDetector'));
const { normalizeCustomer } = require(path.join(ROOT, 'services/orderPipeline/customerNormalizer'));
const { buildOrderData } = require(path.join(ROOT, 'services/orderPipeline/orderModel'));

let passed = 0;
const failures = [];
function ok(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(label + (detail ? ' — ' + detail : ''));
  console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
}

/* ── Which addresses open it ────────────────────────────── */
console.log('the address');
{
  ok('the canonical address', testOrder.isTestEmail('test@gogetcards.com'));
  ok('case and space tolerant', testOrder.isTestEmail('  TEST@GoGetCards.COM '));
  ok('a plus tag on any domain', testOrder.isTestEmail('samezto+ztest@gmail.com'));
  ok('a plus tag with a mixed-case local part', testOrder.isTestEmail('Sam+ZTest@outlook.com'));

  /* Everything a real customer could plausibly type must NOT match. A
     false positive here is a customer who paid nothing and thinks they
     bought a sealed case. */
  [
    'samezto@gmail.com', 'test@gmail.com', 'ztest@gmail.com',
    'sam+news@gmail.com', 'sam+ztest2@gmail.com', 'sam+ztestx@gmail.com',
    'sam@ztest.com', 'ztest@gogetcards.com', 'sam+ztest.foo@gmail.com',
    'test@gogetcards.com.evil.example', 'notest@gogetcards.com',
    '', null, undefined, 'not-an-email', 'sam+ztest',
  ].forEach((e) => ok(`refused: ${JSON.stringify(e)}`, !testOrder.isTestEmail(e)));

  /* The tag must survive account normalisation, or a test would sign the
     owner into their own real account and prove nothing about a new one. */
  const Customer = require(path.join(ROOT, 'models/Customer'));
  ok('a tagged address is its own account',
    Customer.normaliseEmail('Sam+ZTest@gmail.com') !== Customer.normaliseEmail('sam@gmail.com'));
}

/* ── Who may use it ─────────────────────────────────────── */
console.log('the gate');
{
  ok('an admin session opens it', testOrder.isAllowed({ session: { adminId: 'x' } }));
  [
    {}, { session: {} }, { session: null }, { session: { adminId: '' } },
    { session: { admin: true } }, { session: { isAdmin: true } },
    { session: { customer: 'x' } }, null, undefined,
  ].forEach((req, i) => ok(`case ${i}: no admin session, no bypass`, !testOrder.isAllowed(req)));

  /* The route must check the address FIRST and the session second, and
     must fall through rather than refuse — a refusal would tell an
     anonymous visitor the address means something. */
  const src = require('fs').readFileSync(path.join(ROOT, 'routes/frontend.js'), 'utf8');
  ok('the route requires both conditions',
    /testOrder\.isTestEmail\(email\)\s*&&\s*testOrder\.isAllowed\(req\)/.test(src));
  /* THE ROUTE NO LONGER WRITES AN ORDER ON ITS WAY OUT. It used to create
     one marked 'abandoned' before deciding whether the checkout could be
     paid for at all, so every refusal left an unpayable row in the admin —
     a record of a sale that could not have happened. The static-link
     checkout that needed it is gone. */
  ok('capture-lead writes no abandoned order', !/orderId: 'ORD-'/.test(src));
}

/* ── The signed link ────────────────────────────────────── */
console.log('the confirmation link');
const built = testOrder.buildConfirmationUrl({
  email: 'sam+ztest@gmail.com', firstName: 'Sam', lastName: 'Ezto',
  address1: '2321 Rosecrans Ave', address2: 'Ste 5200', city: 'El Segundo',
  state: 'CA', zip: '90245', country: 'US', phone: '+13105550142',
  productTitle: 'One Piece TCG: OP-17 The World’s Strongest Warriors Booster Box',
  productSlug: 'op-17-box', productImage: 'https://cdn.shopify.com/a.jpg',
  totalCents: 85800, quantity: 2, currency: 'USD',
});
{
  ok('a link was produced', built.ok === true, built.error || '');
  const query = Object.fromEntries(new URLSearchParams(built.url.split('?')[1]));

  const check = verifySignature(query, process.env.THANK_YOU_SIGNING_SECRET);
  ok('the REAL verifier accepts it', check.valid === true, check.reason || '');

  const tampered = { ...query, total_price: '1.00' };
  ok('a tampered total is rejected', verifySignature(tampered, process.env.THANK_YOU_SIGNING_SECRET).valid === false);
  const wrongKey = verifySignature(query, 'some-other-secret');
  ok('a different key is rejected', wrongKey.valid === false);

  ok('the order id is obviously a test', query.order_id.startsWith(testOrder.ID_PREFIX));
  ok('and is not guessable', query.order_id.length > testOrder.ID_PREFIX.length + 6);
  ok('two links never share an id',
    testOrder.buildConfirmationUrl({ email: 'a+ztest@b.com', totalCents: 100 }).orderId !== built.orderId);

  /* The two omissions that make a fake conversion impossible. */
  ok('NO zcid is sent', !('zcid' in query));
  ok('NO checkout_id is sent', !query.checkout_id);
  ok('the marker is sent', query.store === testOrder.MARKER);

  /* Missing signing config must say so rather than produce a link that
     lands the buyer on the "we couldn't load your order" page. */
  const secret = process.env.THANK_YOU_SIGNING_SECRET;
  delete process.env.THANK_YOU_SIGNING_SECRET;
  const unsigned = testOrder.buildConfirmationUrl({ email: 'a+ztest@b.com', totalCents: 100 });
  ok('no secret means a clear error, not a broken link',
    unsigned.ok === false && /THANK_YOU_SIGNING_SECRET/.test(unsigned.error));
  process.env.THANK_YOU_SIGNING_SECRET = secret;
}

/* ── What the pipeline makes of it ──────────────────────── */
console.log('the resulting order');
{
  const query = Object.fromEntries(new URLSearchParams(built.url.split('?')[1]));
  const raw = parseOrderParams(query);
  const { valid, errors } = validateOrderParams(raw);
  ok('the pipeline validates it', valid === true, JSON.stringify(errors));

  const sourceInfo = detectSource(raw);
  ok('it is NOT classified as a Whop payment', sourceInfo.source !== 'whop');
  ok('it is classified as direct', sourceInfo.source === 'direct');

  const customer = normalizeCustomer(raw);
  const order = buildOrderData(raw, customer, sourceInfo, '');

  ok('the money is right, in cents', order.totalPrice === 85800, String(order.totalPrice));
  ok('the quantity survives', order.quantity === 2);
  ok('the customer survives', order.customerEmail === 'sam+ztest@gmail.com');
  ok('the address survives', order.address1 === '2321 Rosecrans Ave' && order.zip === '90245');
  ok('the product survives', order.productSlug === 'op-17-box');
  ok('it reads as paid, like a real order', order.status === 'completed' && order.financialStatus === 'paid');

  /* The two properties everything else here exists to protect. */
  ok('trafficSource is empty, so Meta CAPI cannot fire', order.trafficSource === '');
  ok('the marker lands where reporting looks for it',
    order.originalCheckoutMethod === testOrder.MARKER);
  ok('isTestOrder recognises it', testOrder.isTestOrder(order));
  ok('and does not recognise a real one',
    !testOrder.isTestOrder({ orderId: 'whop_pay_x', originalCheckoutMethod: 'partner_experience' }));

  /* The exclusion filter must match the field the pipeline actually
     wrote. These two drifting apart is the only way a test order could
     silently start counting as revenue. */
  const field = Object.keys(testOrder.EXCLUDE_FROM_REPORTING)[0];
  ok('the reporting filter targets the field the order carries',
    order[field] === testOrder.EXCLUDE_FROM_REPORTING[field].$ne);
}

/* ── Reporting actually applies it ──────────────────────── */
console.log('reporting');
{
  const src = require('fs').readFileSync(path.join(ROOT, 'routes/admin.js'), 'utf8');
  ok('the dashboard builds an order-scoped query', /const orderQuery = \{ \.\.\.query, \.\.\.testOrder\.EXCLUDE_FROM_REPORTING \}/.test(src));
  ok('no dashboard Order aggregate still matches the unfiltered query',
    !/Order\.aggregate\(\[\s*\n?\s*\{ \$match: query \}/.test(src));
  ok('order counts use it', /Order\.countDocuments\(orderQuery\)/.test(src));
  ok('the previous window uses it too', /Order\.countDocuments\(prevOrderQuery\)/.test(src));
  ok('the orders page stat cards use it',
    /statsResult = await Order\.aggregate\(\[\s*\n\s*\{ \$match: \{ \.\.\.query, \.\.\.testOrder\.EXCLUDE_FROM_REPORTING \} \}/.test(src));

  const view = require('fs').readFileSync(path.join(ROOT, 'views/admin/orders.ejs'), 'utf8');
  ok('the orders table still lists them', /testOrder\.isTestOrder\(order\)/.test(view));
  ok('and tags them', /TEST/.test(view));
}

/* ── The old preview URLs are gone ──────────────────────── */
console.log('the removed preview');
{
  const fs = require('fs');
  const route = fs.readFileSync(path.join(ROOT, 'routes/distribution.js'), 'utf8');
  const view = fs.readFileSync(path.join(ROOT, 'views/admin/distribution.ejs'), 'utf8');
  ok('the preview route is gone', !/preview\/thank-you/.test(route));
  ok('the preview panel is gone', !/preview\/thank-you/.test(view));
  ok('its sample data went with it', !/PREVIEW00000001/.test(route));
}

/* ── Deleting a test account ────────────────────────────── */
console.log('deletion');
{
  const fs = require('fs');
  const route = fs.readFileSync(path.join(ROOT, 'routes/adminCustomers.js'), 'utf8');
  const view = fs.readFileSync(path.join(ROOT, 'views/admin/customer.ejs'), 'utf8');

  /* The guard has to live in the ROUTE. A form that only offers the
     destructive button for test-only accounts is a courtesy; a stale tab
     or a hand-made POST does not go through the form. */
  ok('the route re-reads the orders from the database',
    /const owned = await Order\.find\(/.test(route));
  ok('and refuses when any of them is real',
    /const real = owned\.filter\(\(o\) => !testOrder\.isTestOrder\(o\)\);[\s\S]{0,200}if \(real\.length\)[\s\S]{0,200}return res\.redirect/.test(route));
  ok('the refusal deletes nothing',
    route.indexOf('failed=real_orders') < route.indexOf('Order.deleteMany'));
  ok('sessions go with the account', /CustomerSession\.deleteMany\(\{ customer: customer\._id \}\)/.test(route));
  ok('and so do unspent sign-in links', /MagicLink\.deleteMany\(\{ email: customer\.email \}\)/.test(route));
  ok('the account itself is removed', /Customer\.deleteOne\(\{ _id: customer\._id \}\)/.test(route));
  ok('the destructive button is only rendered for a test-only account',
    view.indexOf('<% if (testOnly) { %>') < view.indexOf('name="orders" value="test"'));
  ok('the keep-orders variant is always available',
    (view.match(/name="orders" value="keep"/g) || []).length === 2);

  /* Every branch of the panel renders. The "real orders" branch is the
     one nobody looks at until the day it matters. */
  const ejs = require('ejs');
  const customerOrders = require(path.join(ROOT, 'services/customerOrders'));
  const mk = (o) => customerOrders.decorate(Object.assign({
    _id: 'x', orderId: 'ZY-TEST-AB12CD34', totalPrice: 42900, currency: 'USD',
    products: ['OP-17 Box'], productSlug: 'op-17', quantity: 1,
    purchaseDate: new Date(), createdAt: new Date(), status: 'completed',
    financialStatus: 'paid', fulfillmentStatus: 'unfulfilled', refundStatus: 'none',
    cancelledAt: null, cancellationRequestedAt: null, originalCheckoutMethod: testOrder.MARKER,
    refundAmount: 0, refundedAt: null, refundInitiatedAt: null, deliveredAt: null,
    shippedAt: null, trackingNumber: '', trackingCarrier: '', trackingUrl: '',
    cancelledBy: '', cancellationReason: '',
  }, o), null);
  const customer = {
    _id: 'c1', email: 'sam+ztest@gmail.com', displayEmail: 'sam+ztest@gmail.com',
    firstName: 'Sam', lastName: 'Ezto', phone: '', address: {}, status: 'active',
    createdVia: 'purchase', createdAt: new Date(), marketingOptIn: false,
  };
  const counts = { all: 1, active: 1, preorders: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 };
  /* Mirrors the helper server.js puts on res.locals for every /admin
     router. Without it this harness renders a page the app never serves. */
  const money = (cents, currency) =>
    require(path.join(ROOT, 'config/markets')).format(Number(cents || 0), currency || 'USD');
  const shell = { assetVersion: 'test', testOrder, pageTitle: 'x', sessions: [], saved: '', failed: '', money };

  const states = {
    'test only': { ...shell, customer, orders: [mk({})], counts, totalSpend: 42900,
      testOnly: true, realOrderCount: 0, testOrderCount: 1 },
    'no orders': { ...shell, customer, orders: [], counts: { ...counts, all: 0 }, totalSpend: 0,
      testOnly: true, realOrderCount: 0, testOrderCount: 0 },
    'has real orders': { ...shell, customer, failed: 'real_orders', counts, totalSpend: 85800,
      orders: [mk({ _id: 'y', orderId: 'whop_pay_real', originalCheckoutMethod: 'partner_experience' }), mk({})],
      testOnly: false, realOrderCount: 1, testOrderCount: 1 },
  };

  const rendered = {};
  for (const [label, locals] of Object.entries(states)) {
    try {
      rendered[label] = ejs.render(fs.readFileSync(path.join(ROOT, 'views/admin/customer.ejs'), 'utf8'),
        locals, { filename: path.join(ROOT, 'views/admin/customer.ejs') });
      ok(`renders: ${label}`, true);
      ok(`no leaked undefined: ${label}`, !/undefined|\[object Object\]/.test(rendered[label]));
    } catch (err) {
      ok(`renders: ${label}`, false, err.message.split('\n')[0]);
    }
  }
  ok('a test-only account offers the combined delete',
    (rendered['test only'] || '').includes('Delete account and 1 test order'));
  ok('an account with real orders does NOT',
    !(rendered['has real orders'] || '').includes('name="orders" value="test"'));
  ok('and says why', (rendered['has real orders'] || '').includes('cannot be deleted from here'));
  ok('and warns that signing in rebuilds it',
    (rendered['has real orders'] || '').includes('the account is rebuilt'));
}

/* ── The route, over HTTP ───────────────────────────────── */
/* The assertions above prove the pieces. This proves the route wires them
   together: that an admin gets a redirect to a signed confirmation and
   never sees the Whop embed, and that everybody else takes the ordinary
   path with no hint that the address meant anything.

   Only Product.find and SiteConfig.getValue are stubbed — the branch
   under test reads nothing else, and stubbing Order.create would hide the
   very thing being checked, which is that a test never reaches it. */
(async () => {
  const express = require('express');
  const http = require('http');

  const Product = require(path.join(ROOT, 'models/Product'));
  const SiteConfig = require(path.join(ROOT, 'models/SiteConfig'));
  const Order = require(path.join(ROOT, 'models/Order'));

  const CATALOGUE = {
    'op-17-box': { slug: 'op-17-box', title: 'One Piece TCG: OP-17 Booster Box',
      price: 42900, imageUrl: 'https://cdn.shopify.com/a.jpg', images: [], allocationLimit: 0 },
  };
  const thenable = (value) => {
    const chain = { lean: () => chain, limit: () => chain, sort: () => chain, skip: () => chain,
      select: () => chain, then: (r) => Promise.resolve(value).then(r), catch: () => chain };
    return chain;
  };
  Product.find = (q) => {
    const wanted = (q && q.slug && q.slug.$in) || [];
    return thenable(wanted.map((s) => CATALOGUE[s]).filter(Boolean));
  };
  Product.findOne = (q) => thenable(CATALOGUE[q && q.slug] || null);
  SiteConfig.getValue = (_k, d) => Promise.resolve(d);

  /* Tripwire. Nothing on this route may write an Order except the test
     purchase's own pipeline; a count above zero means the deleted
     abandoned-order write has come back. */
  let ordersCreated = 0;
  Order.create = async (doc) => { ordersCreated++; return { _id: 'stub', ...doc }; };

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT, 'views'));
  app.use(require('express-ejs-layouts'));
  app.set('layout', 'layout');
  app.locals.assetVersion = 'test';
  app.locals.productImage = require(path.join(ROOT, 'helpers/productImage'));
  app.locals.testOrder = testOrder;
  app.use(express.json());

  /* The admin session is faked per-request from a header, so one server
     can answer as both an admin and an anonymous visitor. */
  app.use((req, res, next) => {
    req.session = req.get('x-audit-admin') ? { adminId: 'audit' } : {};
    req.session.save = (cb) => cb && cb();
    next();
  });
  app.use(require(path.join(ROOT, 'routes/frontend')));

  const server = await new Promise((r) => { const s = http.createServer(app).listen(0, '127.0.0.1', () => r(s)); });
  const port = server.address().port;

  const post = (body, asAdmin) => new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/checkout/capture-lead',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload),
        ...(asAdmin ? { 'x-audit-admin': '1' } : {}) } }, (res) => {
      let d = ''; res.on('data', (c) => { d += c; });
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on('error', reject); req.write(payload); req.end();
  });

  const cart = {
    email: 'sam+ztest@gmail.com', firstName: 'Sam', lastName: 'Ezto',
    address: '2321 Rosecrans Ave, El Segundo, CA 90245, US',
    addressDetails: { addressLine1: '2321 Rosecrans Ave', apartment: 'Ste 5200', city: 'El Segundo',
      state: 'CA', zip: '90245', country: 'US', phone: '+13105550142' },
    cartData: { total: 85800, items: [{ product: { slug: 'op-17-box' }, quantity: 2 }] },
  };

  console.log('the route');
  {
    const admin = await post(cart, true);
    ok('an admin is redirected', admin.success === true && typeof admin.redirect === 'string');
    ok('straight to the confirmation', String(admin.redirect || '').startsWith('/thank-you?'));
    ok('NOT to the Whop embed', !String(admin.redirect || '').includes('/checkout/whop'));
    ok('no order was written by the route itself', ordersCreated === 0, `${ordersCreated} written`);

    const q = Object.fromEntries(new URLSearchParams(String(admin.redirect).split('?')[1]));
    ok('the link verifies', verifySignature(q, process.env.THANK_YOU_SIGNING_SECRET).valid === true);
    ok('the total came from the DATABASE, not the posted cart',
      q.total_price === '858.00', q.total_price);
  }
  {
    /* A tampered cart total must not survive: the price is re-read from
       the catalogue, so signing our own key over a client figure is
       impossible. */
    const cheated = JSON.parse(JSON.stringify(cart));
    cheated.cartData.total = 1;
    cheated.cartData.items[0].product.price = 1;
    const res = await post(cheated, true);
    const q = Object.fromEntries(new URLSearchParams(String(res.redirect).split('?')[1]));
    ok('a tampered cart total is ignored', q.total_price === '858.00', q.total_price);
  }
  {
    const anon = await post(cart, false);
    ok('a non-admin does NOT get a confirmation link',
      !String(anon.redirect || '').startsWith('/thank-you'));
    ok('and is refused without writing an order', ordersCreated === 0, `${ordersCreated} written`);
    ok('the refusal is visible rather than a fake success', anon.success === false);
    ok('the refusal reveals nothing about the address',
      !/test|ztest|admin|bypass/i.test(JSON.stringify(anon)));
  }
  {
    ordersCreated = 0;
    const real = await post({ ...cart, email: 'sam@gmail.com' }, true);
    ok('an ordinary address is unaffected even for an admin',
      !String(real.redirect || '').startsWith('/thank-you'));
    ok('and writes no order either', ordersCreated === 0);
  }
  {
    const empty = await post({ ...cart, cartData: { total: 0, items: [] } }, true);
    ok('an empty cart is refused clearly', empty.success === false && /empty/i.test(empty.error));
  }

  server.close();

  console.log(`\n${passed} assertions passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  • ' + f));
  }
  process.exit(failures.length ? 1 : 0);
})();
