/* Exercises the customer account system end to end against a real
 * database, over real HTTP, with a real cookie jar.
 *
 * Run:  node scripts/audit/check-account.js
 *
 * WHY A REAL DATABASE: every security property that matters here is a
 * property of a QUERY — ownership is enforced by scoping reads to the
 * signed-in customer's own email rather than by an `if`. A harness that
 * stubbed the models would verify the stub. This uses
 * mongodb-memory-server, already a dependency, and tears it down after.
 *
 * WHY REAL HTTP: sessions live in a cookie. Calling handlers directly
 * would skip the part that actually carries identity, and would not catch
 * a cookie that is never set, never cleared, or readable by script.
 *
 * The scenarios below are the ones a customer can actually reach, plus the
 * ones an attacker would try: another customer's order by reference,
 * cancelling something that has shipped, and posting a new email address
 * at the profile form.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');

/**
 * A MongoDB to run against.
 *
 * Prefers MONGO_AUDIT_URI so this can be pointed at a scratch database on
 * a machine that already has one. Falls back to mongodb-memory-server,
 * which downloads a mongod on first use — and which therefore cannot run
 * behind a network policy that blocks MongoDB's download host. When
 * neither is available the audit SKIPS LOUDLY rather than passing
 * vacuously: an audit that silently reports success when it ran nothing
 * is worse than no audit.
 */
async function database() {
  if (process.env.MONGO_AUDIT_URI) {
    return { uri: process.env.MONGO_AUDIT_URI, stop: async () => {} };
  }
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongo = await MongoMemoryServer.create();
  return { uri: mongo.getUri('zy_account_audit'), stop: () => mongo.stop() };
}

const ROOT = path.join(__dirname, '..', '..');
process.env.SITE_URL = 'https://zypheratcg.com';
process.env.NODE_ENV = 'test';

const Customer = require(path.join(ROOT, 'models/Customer'));
const CustomerSession = require(path.join(ROOT, 'models/CustomerSession'));
const MagicLink = require(path.join(ROOT, 'models/MagicLink'));
const Order = require(path.join(ROOT, 'models/Order'));
const Product = require(path.join(ROOT, 'models/Product'));
const customerAuth = require(path.join(ROOT, 'services/customerAuth'));
const { provisionFromOrder } = require(path.join(ROOT, 'services/customerProvisioning'));
const orderReference = require(path.join(ROOT, 'helpers/orderReference'));

let passed = 0;
const failures = [];
function ok(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(detail ? `${label} — ${detail}` : label);
  console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
}

/* ── A browser ──────────────────────────────────────────── */

/** One cookie jar per simulated visitor. */
function jar() {
  const cookies = new Map();
  return {
    cookies,
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    absorb(setCookie) {
      (setCookie || []).forEach((line) => {
        const [pair] = line.split(';');
        const eq = pair.indexOf('=');
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        /* An expired cookie is a deletion, which is how sign-out works. */
        if (!value || /Expires=Thu, 01 Jan 1970/i.test(line) || /Max-Age=0/i.test(line)) cookies.delete(name);
        else cookies.set(name, value);
      });
    },
  };
}

function request(port, method, url, { jar: j = null, body = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? new URLSearchParams(body).toString() : null;
    const req = http.request({
      host: '127.0.0.1', port, method, path: url,
      headers: Object.assign({
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        ...(j && j.header() ? { cookie: j.header() } : {}),
        ...(payload ? { 'content-type': 'application/x-www-form-urlencoded', 'content-length': Buffer.byteLength(payload) } : {}),
      }, headers),
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (j) j.absorb(res.headers['set-cookie']);
        resolve({ status: res.statusCode, headers: res.headers, body: data, setCookie: res.headers['set-cookie'] || [] });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/* ── The app, wired exactly as server.js wires it ───────── */

function buildApp() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT, 'views'));
  app.use(require('express-ejs-layouts'));
  app.set('layout', 'layout');
  app.set('layout extractScripts', true);
  app.locals.assetVersion = 'test';
  app.locals.productImage = require(path.join(ROOT, 'helpers/productImage'));
  app.set('trust proxy', true);

  const shippingCfg = require(path.join(ROOT, 'config/shipping'));
  const faqCfg = require(path.join(ROOT, 'config/faq'));
  app.use((req, res, next) => {
    Object.assign(res.locals, {
      cart: { items: [], totalItems: 0, totalPrice: 0 },
      currentPath: req.path, currentYear: 2026,
      pageTitle: 'Zyphera TCG', metaDescription: '', ogType: 'website', ogImage: '',
      canonicalUrl: 'https://zypheratcg.com' + req.path,
      canonicalOrigin: 'https://zypheratcg.com',
      jsonLd: null, bodyClass: '', metaPixelId: '',
      shippingCopy: shippingCfg.copy,
      company: require(path.join(ROOT, 'config/company')),
      payments: require(path.join(ROOT, 'config/payments')),
      preorder: require(path.join(ROOT, 'config/preorder')),
      shippingCfg,
      returnWindowDays: faqCfg.RETURN_WINDOW_DAYS,
      formatPrice: require(path.join(ROOT, 'helpers/formatPrice')),
      script: '',
    });
    next();
  });

  app.use(require(path.join(ROOT, 'middleware/customer')).attachCustomer);

  /* Stands in for the tail of the /thank-you handler. The pipeline that
     precedes it there has already verified an HMAC-signed confirmation
     from the payment host; what is under test is what happens AFTER that,
     which is exactly this call. */
  app.get('/__provision/:orderId', async (req, res) => {
    const order = await Order.findOne({ orderId: req.params.orderId });
    const account = await provisionFromOrder(order, req, res);
    res.json({ created: account.created, signedIn: account.signedIn });
  });

  /* Proves the header renders both states without a signed-in customer
     being required for the page to work. */
  app.get('/__header', (req, res) => {
    res.render('pages/account-signin', {
      layout: 'layout', pageTitle: 'x', metaDescription: '',
      sent: false, formError: '', email: '', redirectTo: '/account',
    });
  });

  app.use('/account', require(path.join(ROOT, 'routes/account')));
  app.use('/admin/customers', require(path.join(ROOT, 'routes/adminCustomers')));
  app.use((req, res) => res.status(404).send('not found'));
  app.use((err, req, res, next) => { console.error(err); res.status(500).send('error'); });
  return app;
}

/* ── Fixtures ───────────────────────────────────────────── */

const HOUR = 3600 * 1000;

async function seed() {
  await Product.create([
    { title: 'One Piece TCG: OP-17 Booster Box', slug: 'op-17-box', price: 42900,
      available: true, vendor: 'Bandai', imageUrl: 'https://cdn.shopify.com/a.jpg', tags: [] },
    { title: 'One Piece TCG: OP-18 Case', slug: 'op-18-case', price: 189900,
      available: true, vendor: 'Bandai', imageUrl: 'https://cdn.shopify.com/b.jpg',
      preorder: true, tags: ['preorder'], releaseDate: new Date('2026-11-21') },
    { title: 'Pokémon Prismatic ETB', slug: 'prismatic-etb', price: 5900,
      available: true, vendor: 'Pokémon', imageUrl: 'https://cdn.shopify.com/c.jpg', tags: [] },
    { title: 'Withdrawn line', slug: 'gone', price: 1000, available: false, vendor: 'Bandai', tags: [] },
  ]);

  const mk = (over) => Object.assign({
    totalPrice: 42900, currency: 'USD', products: ['One Piece TCG: OP-17 Booster Box'],
    productSlug: 'op-17-box', quantity: 1, status: 'completed', financialStatus: 'paid',
    firstName: 'Ada', lastName: 'Lovelace', customerName: 'Ada Lovelace',
    address1: '18 Ocean Ave', city: 'Santa Monica', state: 'CA', zip: '90401', country: 'United States',
    customerPhone: '+13105550142',
    purchaseDate: new Date(Date.now() - HOUR), createdAt: new Date(Date.now() - HOUR),
  }, over);

  await Order.create([
    /* Ada: fresh in-stock order, inside the self-cancel window. */
    mk({ orderId: 'pay_ada_fresh', customerEmail: 'Ada@Example.com' }),
    /* Ada: preorder, old enough that the 24h rule would block it if the
       preorder exception did not exist. */
    mk({ orderId: 'pay_ada_preorder', customerEmail: 'ada@example.com',
      productSlug: 'op-18-case', products: ['One Piece TCG: OP-18 Case'], totalPrice: 189900,
      purchaseDate: new Date(Date.now() - 20 * 24 * HOUR), createdAt: new Date(Date.now() - 20 * 24 * HOUR) }),
    /* Ada: already shipped. */
    mk({ orderId: 'pay_ada_shipped', customerEmail: 'ada@example.com',
      fulfillmentStatus: 'shipped', shippedAt: new Date(), trackingNumber: '9400111899223',
      trackingCarrier: 'USPS Ground Advantage', trackingUrl: 'https://tools.usps.com/go/x',
      purchaseDate: new Date(Date.now() - 3 * 24 * HOUR), createdAt: new Date(Date.now() - 3 * 24 * HOUR) }),
    /* Ada: in-stock but eight days old, so past the window. */
    mk({ orderId: 'pay_ada_stale', customerEmail: 'ada@example.com', productSlug: 'prismatic-etb',
      products: ['Pokémon Prismatic ETB'], totalPrice: 5900,
      purchaseDate: new Date(Date.now() - 8 * 24 * HOUR), createdAt: new Date(Date.now() - 8 * 24 * HOUR) }),
    /* Ada: withdrawn product, so reorder must be refused. */
    mk({ orderId: 'pay_ada_gone', customerEmail: 'ada@example.com', productSlug: 'gone',
      products: ['Withdrawn line'], totalPrice: 1000 }),
    /* Grace: somebody else entirely. */
    mk({ orderId: 'pay_grace', customerEmail: 'grace@example.com',
      firstName: 'Grace', lastName: 'Hopper', customerName: 'Grace Hopper',
      address1: '9 Navy Yard', city: 'Arlington', state: 'VA', zip: '22202' }),
    /* Abandoned: must never appear in anybody's account. */
    mk({ orderId: 'pay_ada_abandoned', customerEmail: 'ada@example.com', status: 'abandoned' }),
  ]);
}

/* ── Scenarios ──────────────────────────────────────────── */

(async () => {
  let mongo;
  try {
    mongo = await database();
  } catch (err) {
    console.log('SKIPPED: no MongoDB available for the account audit.');
    console.log('  ' + err.message.split('\n')[0]);
    console.log('  Set MONGO_AUDIT_URI to a scratch database to run it.');
    process.exit(0);
  }
  await mongoose.connect(mongo.uri);
  /* A scratch database, emptied first, so a re-run is not contaminated by
     the last one and so pointing this at a stray URI cannot mix fixtures
     into real data silently. */
  await Promise.all([Customer, CustomerSession, MagicLink, Order, Product]
    .map((M) => M.deleteMany({})));
  await seed();

  const app = buildApp();
  const server = await new Promise((resolve) => {
    const s = http.createServer(app).listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const GET = (url, opts) => request(port, 'GET', url, opts);
  const POST = (url, body, opts) => request(port, 'POST', url, Object.assign({ body }, opts));

  try {
    /* ── 1. An account is created by a confirmed payment ── */
    console.log('1. account created from a confirmed order');
    const ada = jar();
    {
      const before = await Customer.countDocuments({});
      const r = await GET('/__provision/pay_ada_fresh', { jar: ada });
      const json = JSON.parse(r.body);
      ok('provisioning reports created', json.created === true);
      ok('provisioning signs the buyer in', json.signedIn === true);
      ok('exactly one account was created', await Customer.countDocuments({}) === before + 1);

      const c = await Customer.findOne({ email: 'ada@example.com' });
      ok('keyed on the normalised address', !!c, 'Ada@Example.com should normalise');
      ok('display case preserved', c.displayEmail === 'Ada@Example.com');
      ok('name copied from the order', c.firstName === 'Ada' && c.lastName === 'Lovelace');
      ok('address copied from the order', c.address.line1 === '18 Ocean Ave' && c.address.postalCode === '90401');
      ok('no password field exists anywhere', !('password' in c.toObject()) && !('passwordHash' in c.toObject()));
      ok('createdVia records the purchase', c.createdVia === 'purchase');

      const cookie = ada.cookies.get('zy_cust');
      ok('a session cookie was set', !!cookie);
      const raw = (r.setCookie || []).join(' ');
      ok('cookie is HttpOnly', /HttpOnly/i.test(raw));
      ok('cookie is SameSite=Lax', /SameSite=Lax/i.test(raw));
      const stored = await CustomerSession.findOne({ customer: c._id });
      ok('session token is stored hashed, never raw', !!stored && stored.tokenHash !== cookie
        && /^[a-f0-9]{64}$/.test(stored.tokenHash));
    }

    /* ── 2. A second order does not create a second account ── */
    console.log('2. a returning buyer is the same account');
    {
      const c = await Customer.findOne({ email: 'ada@example.com' });
      c.firstName = 'Ada K.';
      c.address.line1 = '404 Analytical Way';
      await c.save();

      const before = await Customer.countDocuments({});
      await GET('/__provision/pay_ada_preorder', { jar: jar() });
      ok('no duplicate account', await Customer.countDocuments({}) === before);

      const after = await Customer.findOne({ email: 'ada@example.com' });
      ok('a customer edit is not overwritten by the order', after.firstName === 'Ada K.');
      ok('an edited address is not overwritten', after.address.line1 === '404 Analytical Way');
    }

    /* ── 3. The portal shows the customer their own orders ── */
    console.log('3. the portal');
    {
      const r = await GET('/account', { jar: ada });
      ok('overview renders', r.status === 200);
      ok('greets the customer', r.body.includes('Ada K.'));
      ok('shows an active preorder', r.body.includes('Active preorders'));
      ok('never indexed', /noindex/.test(r.headers['x-robots-tag'] || '')
        && /noindex/.test(r.body));
      ok('never cached', /no-store/.test(r.headers['cache-control'] || ''));

      const list = await GET('/account/orders', { jar: ada });
      ok('order list renders', list.status === 200);
      ok('abandoned orders are hidden', !list.body.includes(orderReference({ orderId: 'pay_ada_abandoned' })));
      ok("Grace's order is absent", !list.body.includes(orderReference({ orderId: 'pay_grace' })));
      ['pay_ada_fresh', 'pay_ada_preorder', 'pay_ada_shipped', 'pay_ada_stale'].forEach((id) => {
        ok(`own order ${id} is listed`, list.body.includes(orderReference({ orderId: id })));
      });

      const shipped = await GET('/account/orders/' + orderReference({ orderId: 'pay_ada_shipped' }), { jar: ada });
      ok('tracking number is shown', shipped.body.includes('9400111899223'));
      ok('shipped order offers no cancel button', !shipped.body.includes('/cancel"'));
    }

    /* ── 4. Anonymous access is refused, and remembers where ── */
    console.log('4. anonymous access');
    {
      const anon = jar();
      const r = await GET('/account/orders', { jar: anon });
      ok('redirected to sign in', r.status === 302 && String(r.headers.location).startsWith('/account/sign-in'));
      ok('remembers the destination', String(r.headers.location).includes(encodeURIComponent('/account/orders')));

      const post = await POST('/account/profile', { firstName: 'Mallory' }, { jar: anon });
      ok('an anonymous POST is refused, not redirected', post.status === 401);
      ok('nothing was written', (await Customer.findOne({ email: 'ada@example.com' })).firstName === 'Ada K.');
    }

    /* ── 5. One customer cannot reach another's order ── */
    console.log('5. cross-customer access');
    {
      const grace = jar();
      await GET('/__provision/pay_grace', { jar: grace });

      const graceRef = orderReference({ orderId: 'pay_grace' });
      const adaRef = orderReference({ orderId: 'pay_ada_fresh' });

      const stolen = await GET('/account/orders/' + adaRef, { jar: grace });
      ok("Ada's order is not visible to Grace", stolen.status === 404);
      ok('no detail leaks in the refusal', !stolen.body.includes('18 Ocean Ave')
        && !stolen.body.includes('ada@example.com'));

      const madeUp = await GET('/account/orders/ZTCG-00001', { jar: grace });
      ok('an unknown reference answers identically', madeUp.status === stolen.status);
      ok('the refusal body is identical, so existence cannot be probed',
        madeUp.body.length === stolen.body.length);

      const own = await GET('/account/orders/' + graceRef, { jar: grace });
      ok('Grace can still see her own order', own.status === 200 && own.body.includes('9 Navy Yard'));

      const cancelSomeoneElse = await POST('/account/orders/' + adaRef + '/cancel', { reason: '' }, { jar: grace });
      ok("cancelling Ada's order as Grace does nothing", cancelSomeoneElse.status === 404 || cancelSomeoneElse.status === 302);
      ok("Ada's order is untouched", (await Order.findOne({ orderId: 'pay_ada_fresh' })).cancelledAt === null);

      const byRawId = await GET('/account/orders/pay_ada_fresh', { jar: grace });
      ok('the raw payment id is not a back door', byRawId.status === 404);
    }

    /* ── 6. Cancelling, and the refund wording ── */
    console.log('6. cancellation');
    {
      const ref = orderReference({ orderId: 'pay_ada_fresh' });
      const confirm = await GET(`/account/orders/${ref}/cancel`, { jar: ada });
      ok('confirmation page renders', confirm.status === 200);
      ok('says the refund is issued by hand', confirm.body.includes('by hand'));

      const done = await POST(`/account/orders/${ref}/cancel`, { reason: 'Changed my mind' }, { jar: ada });
      ok('cancellation redirects to the order', done.status === 302 && String(done.headers.location).includes(ref));

      const o = await Order.findOne({ orderId: 'pay_ada_fresh' });
      ok('order is cancelled', !!o.cancelledAt);
      ok('cancelled by the customer', o.cancelledBy === 'customer');
      ok('reason recorded', o.cancellationReason === 'Changed my mind');
      ok('refund is queued, NOT issued', o.refundStatus === 'processing');
      ok('refund not marked complete', o.refundedAt === null);
      ok('refund amount is the order total', o.refundAmount === 42900);

      const page = await GET(`/account/orders/${ref}?cancelled=1`, { jar: ada });
      ok('page never claims the money was sent',
        !/has been (issued|refunded|sent)/i.test(page.body) && !page.body.includes('was refunded to your original'));
      ok('page says a refund is queued', page.body.includes('queued'));

      const again = await POST(`/account/orders/${ref}/cancel`, { reason: '' }, { jar: ada });
      ok('cancelling twice is refused', again.status === 409);
    }

    /* ── 7. Shipped orders cannot be cancelled, even by POST ── */
    console.log('7. shipped orders');
    {
      const ref = orderReference({ orderId: 'pay_ada_shipped' });
      const page = await GET(`/account/orders/${ref}/cancel`, { jar: ada });
      ok('the confirmation page redirects away', page.status === 302);

      const forced = await POST(`/account/orders/${ref}/cancel`, { reason: 'x' }, { jar: ada });
      ok('a direct POST is refused', forced.status === 409);
      ok('order remains uncancelled', (await Order.findOne({ orderId: 'pay_ada_shipped' })).cancelledAt === null);
      ok('no refund was queued', (await Order.findOne({ orderId: 'pay_ada_shipped' })).refundStatus === 'none');
    }

    /* ── 8. The 24h rule, and the preorder exception ── */
    console.log('8. eligibility rules');
    {
      const stale = orderReference({ orderId: 'pay_ada_stale' });
      const forced = await POST(`/account/orders/${stale}/cancel`, { reason: '' }, { jar: ada });
      ok('an 8-day-old in-stock order cannot self-cancel', forced.status === 409);
      ok('and is not cancelled', (await Order.findOne({ orderId: 'pay_ada_stale' })).cancelledAt === null);

      const pre = orderReference({ orderId: 'pay_ada_preorder' });
      const done = await POST(`/account/orders/${pre}/cancel`, { reason: '' }, { jar: ada });
      ok('a 20-day-old preorder CAN still be cancelled', done.status === 302);
      const o = await Order.findOne({ orderId: 'pay_ada_preorder' });
      ok('preorder is cancelled', !!o.cancelledAt);
      ok('preorder refund is queued only', o.refundStatus === 'processing' && o.refundedAt === null);
    }

    /* ── 8b. Keeping a cancelled order before its refund goes out ── */
    console.log('8b. reinstatement');
    {
      /* The preorder Ada cancelled in 8 is exactly the release-day case:
         cancelled, refund queued, nothing issued. Offer it back the way
         the admin broadcast does — a deadline stamped on the order. */
      const pre = orderReference({ orderId: 'pay_ada_preorder' });
      const soon = new Date(Date.now() + 2 * 24 * HOUR);
      await Order.updateOne({ orderId: 'pay_ada_preorder' },
        { $set: { reinstateOfferedAt: new Date(), reinstateDeadline: soon } });

      const detail = await GET(`/account/orders/${pre}`, { jar: ada });
      ok('the order page offers to keep it', detail.body.includes('Keep this order'));
      ok('and says nothing is charged again', /nothing is\s+charged again/i.test(detail.body));

      const list = await GET('/account/reinstate/op-18-case', { jar: ada });
      ok('the keep page renders', list.status === 200);
      ok('it lists the cancelled order with a button', list.body.includes(pre) && list.body.includes(`/orders/${pre}/keep`));
      ok('a GET reinstated nothing', !!(await Order.findOne({ orderId: 'pay_ada_preorder' })).cancelledAt);

      const grace = jar();
      await GET('/__provision/pay_grace', { jar: grace });
      const stranger = await POST(`/account/orders/${pre}/keep`, {}, { jar: grace });
      ok("Grace cannot keep Ada's order", stranger.status === 404 || stranger.status === 302);
      ok('and it is still cancelled', !!(await Order.findOne({ orderId: 'pay_ada_preorder' })).cancelledAt);

      const kept = await POST(`/account/orders/${pre}/keep`, {}, { jar: ada });
      ok('keeping redirects back to the keep page', kept.status === 302 && String(kept.headers.location).includes('kept=1'));
      const o = await Order.findOne({ orderId: 'pay_ada_preorder' });
      ok('the cancellation is withdrawn', o.cancelledAt === null && o.status === 'completed');
      ok('the queued refund is withdrawn', o.refundStatus === 'none' && o.refundInitiatedAt === null && o.refundAmount === 0);
      ok('nothing claims a refund was issued', o.refundedAt === null);
      ok('reinstatement is recorded', !!o.reinstatedAt && o.reinstatedBy === 'customer');
      ok('the offer is consumed', o.reinstateDeadline === null);

      const again = await POST(`/account/orders/${pre}/keep`, {}, { jar: ada });
      ok('keeping twice is refused', again.status === 409);

      const after = await GET(`/account/orders/${pre}`, { jar: ada });
      ok('the order page shows it reinstated', /reinstated/i.test(after.body) && !after.body.includes('Refund processing'));
      ok('and offers to cancel again', after.body.includes(`/orders/${pre}/cancel`));

      /* An expired offer, and an already-issued refund, both refuse. */
      const stale = orderReference({ orderId: 'pay_ada_stale' });
      await Order.updateOne({ orderId: 'pay_ada_stale' }, { $set: {
        cancelledAt: new Date(), status: 'cancelled', refundStatus: 'processing', refundAmount: 5900,
        reinstateOfferedAt: new Date(Date.now() - 3 * 24 * HOUR), reinstateDeadline: new Date(Date.now() - HOUR),
      } });
      const late = await POST(`/account/orders/${stale}/keep`, {}, { jar: ada });
      ok('an offer past its deadline is refused', late.status === 409);
      ok('and the order stays cancelled', !!(await Order.findOne({ orderId: 'pay_ada_stale' })).cancelledAt);

      await Order.updateOne({ orderId: 'pay_ada_stale' }, { $set: {
        refundStatus: 'refunded', refundedAt: new Date(), reinstateDeadline: soon,
      } });
      const refunded = await POST(`/account/orders/${stale}/keep`, {}, { jar: ada });
      ok('an order already refunded is refused even inside the deadline', refunded.status === 409);
      ok('and stays refunded', (await Order.findOne({ orderId: 'pay_ada_stale' })).refundStatus === 'refunded');
      /* Put it back the way section 14 expects to find it. */
      await Order.updateOne({ orderId: 'pay_ada_stale' }, { $set: {
        cancelledAt: null, status: 'completed', refundStatus: 'none', refundedAt: null, refundAmount: 0,
        reinstateOfferedAt: null, reinstateDeadline: null,
      } });
    }

    /* ── 9. Profile edits, and what cannot be edited ── */
    console.log('9. profile');
    {
      const r = await POST('/account/profile', {
        firstName: 'Ada', lastName: 'Lovelace', phone: '+442071234567',
        line1: '12 Bletchley Rd', city: 'London', postalCode: 'NW1 1AA', country: 'United Kingdom',
        email: 'attacker@evil.example', marketingOptIn: 'on',
      }, { jar: ada });
      ok('profile saves', r.status === 302);

      const c = await Customer.findOne({ email: 'ada@example.com' });
      ok('editable fields persisted', c.firstName === 'Ada' && c.phone === '+442071234567');
      ok('address persisted', c.address.line1 === '12 Bletchley Rd' && c.address.country === 'United Kingdom');
      ok('marketing opt-in persisted', c.marketingOptIn === true);
      ok('THE EMAIL WAS NOT CHANGED', c.email === 'ada@example.com');
      ok('no account exists for the posted address', !(await Customer.findOne({ email: 'attacker@evil.example' })));

      const already = await Order.findOne({ orderId: 'pay_ada_shipped' });
      ok('an existing order keeps the address it shipped to', already.address1 === '18 Ocean Ave');

      const page = await GET('/account/profile', { jar: ada });
      ok('email is rendered readonly', /id="p-email"[^>]*readonly/.test(page.body));
    }

    /* ── 10. Sign-in links ── */
    console.log('10. passwordless sign in');
    {
      const known = await POST('/account/sign-in', { email: 'ada@example.com' }, { jar: jar() });
      const unknown = await POST('/account/sign-in', { email: 'nobody@example.com' }, { jar: jar() });
      ok('a known address gets the sent screen', known.body.includes('Check your inbox'));
      ok('an unknown address is indistinguishable', unknown.body.includes('Check your inbox'));
      ok('the two responses are the same length',
        known.body.replace(/ada@example.com/g, 'x').length === unknown.body.replace(/nobody@example.com/g, 'x').length);
      ok('requesting a link creates no account for an unknown address',
        !(await Customer.findOne({ email: 'nobody@example.com' })));
      ok('the link is never rendered to the browser', !/\/account\/sign-in\/[A-Za-z0-9_-]{20,}/.test(known.body));

      /* Read the token the way the mailer would, not the way the page does. */
      const link = await MagicLink.findOne({ email: 'ada@example.com' }).sort({ createdAt: -1 });
      ok('a link row exists', !!link);
      ok('the link is stored hashed', /^[a-f0-9]{64}$/.test(link.tokenHash));
      ok('the link expires within 15 minutes',
        link.expiresAt.getTime() - link.createdAt.getTime() <= customerAuth.MAGIC_LINK_TTL_MS + 1000);

      /* Mint one directly so the raw token is knowable — the service is the
         thing under test, and it never hands the token to a page. */
      const token = await customerAuth.issueMagicLink('ada@example.com', { redirectTo: '/account/orders' });
      const fresh = jar();
      const used = await GET('/account/sign-in/' + token, { jar: fresh });
      ok('a valid link signs in', used.status === 302 && used.headers.location === '/account/orders');
      ok('and sets a session cookie', !!fresh.cookies.get('zy_cust'));

      const replay = await GET('/account/sign-in/' + token, { jar: jar() });
      ok('the same link cannot be used twice', replay.status === 400 && replay.body.includes('already been used'));

      const bogus = await GET('/account/sign-in/' + 'z'.repeat(43), { jar: jar() });
      ok('an invented token is refused', bogus.status === 400);

      const expiredToken = await customerAuth.issueMagicLink('ada@example.com');
      await MagicLink.updateOne({ tokenHash: require('crypto').createHash('sha256').update(expiredToken).digest('hex') },
        { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const expired = await GET('/account/sign-in/' + expiredToken, { jar: jar() });
      ok('an expired link is refused', expired.status === 400 && expired.body.includes('expired'));

      const openRedirect = await customerAuth.issueMagicLink('ada@example.com', { redirectTo: 'https://evil.example/x' });
      const phish = await GET('/account/sign-in/' + openRedirect, { jar: jar() });
      ok('an off-site redirect is neutralised', phish.headers.location === '/account');
    }

    /* ── 11. Signing out ── */
    console.log('11. sign out');
    {
      const a = jar(); const b = jar();
      const t1 = await customerAuth.issueMagicLink('ada@example.com');
      await GET('/account/sign-in/' + t1, { jar: a });
      const t2 = await customerAuth.issueMagicLink('ada@example.com');
      await GET('/account/sign-in/' + t2, { jar: b });

      const c = await Customer.findOne({ email: 'ada@example.com' });
      const live = await CustomerSession.countDocuments({ customer: c._id });
      ok('two devices hold sessions', live >= 2);

      const out = await POST('/account/sign-out', {}, { jar: a });
      ok('sign out redirects home', out.status === 302 && out.headers.location === '/');
      ok('the cookie is cleared', !a.cookies.get('zy_cust'));
      ok('device A is now anonymous', (await GET('/account', { jar: a })).status === 302);
      ok('device B is still signed in', (await GET('/account', { jar: b })).status === 200);

      const security = await GET('/account/security', { jar: b });
      ok('security page lists devices', security.status === 200 && security.body.includes('This device'));

      await POST('/account/sign-out-all', {}, { jar: b });
      ok('every session is gone', await CustomerSession.countDocuments({ customer: c._id }) === 0);
      ok('device B is now anonymous too', (await GET('/account', { jar: b })).status === 302);
    }

    /* ── 12. Reorder checks stock at click time ── */
    console.log('12. reorder');
    {
      const live = jar();
      const t = await customerAuth.issueMagicLink('ada@example.com');
      await GET('/account/sign-in/' + t, { jar: live });

      const good = await GET('/account/reorder/prismatic-etb', { jar: live });
      ok('an in-stock product redirects to its page', good.headers.location === '/products/prismatic-etb');

      const gone = await GET('/account/reorder/gone', { jar: live });
      ok('a withdrawn product is refused', gone.headers.location === '/account/orders?unavailable=1');

      const never = await GET('/account/reorder/does-not-exist', { jar: live });
      ok('an unknown slug is refused', never.headers.location === '/account/orders?unavailable=1');

      const shown = await GET('/account/orders?unavailable=1', { jar: live });
      ok('and the list explains why', shown.body.includes('available right now'));
    }

    /* ── 13. A closed account cannot get back in ── */
    console.log('13. closed accounts');
    {
      await Customer.updateOne({ email: 'grace@example.com' }, { $set: { status: 'closed' } });
      const t = await customerAuth.issueMagicLink('grace@example.com');
      const r = await GET('/account/sign-in/' + t, { jar: jar() });
      ok('a closed account is refused a session', r.status === 400 && r.body.includes('closed'));
      await Customer.updateOne({ email: 'grace@example.com' }, { $set: { status: 'active' } });
    }

    /* ── 14. Admin can drive the lifecycle the portal reports ── */
    console.log('14. admin');
    {
      /* requireAuth reads a session; the audit calls the handlers with one
         faked, because what is under test is the write, not the login. */
      const adminApp = express();
      adminApp.set('view engine', 'ejs');
      adminApp.set('views', path.join(ROOT, 'views'));
      adminApp.locals.assetVersion = 'test';
      /* middleware/auth.js gates on req.session.adminId, so that is what
         is faked — not a plausible-looking session shape that would let
         these assertions pass while the real guard rejected everything. */
      adminApp.use((req, res, next) => { req.session = { adminId: 'audit' }; next(); });
      adminApp.use('/admin/customers', require(path.join(ROOT, 'routes/adminCustomers')));
      const adminServer = await new Promise((resolve) => {
        const s = http.createServer(adminApp).listen(0, '127.0.0.1', () => resolve(s));
      });
      const ap = adminServer.address().port;

      const list = await request(ap, 'GET', '/admin/customers');
      ok('admin customer list renders', list.status === 200, `status ${list.status}`);
      ok('and shows the customer', list.body.includes('ada@example.com'));

      const c = await Customer.findOne({ email: 'ada@example.com' });
      const detail = await request(ap, 'GET', '/admin/customers/' + c._id);
      ok('admin customer detail renders', detail.status === 200, `status ${detail.status}`);
      ok('lists their orders', detail.body.includes(orderReference({ orderId: 'pay_ada_stale' })));

      const staleOrder = await Order.findOne({ orderId: 'pay_ada_stale' });
      const ship = await request(ap, 'POST', `/admin/customers/${c._id}/orders/${staleOrder._id}/fulfilment`, {
        body: { fulfillmentStatus: 'shipped', trackingCarrier: 'USPS Ground Advantage',
          trackingNumber: '9400555000111', trackingUrl: 'javascript:alert(1)' },
      });
      ok('fulfilment saves', ship.status === 302);
      const shippedNow = await Order.findOne({ orderId: 'pay_ada_stale' });
      ok('status moved to shipped', shippedNow.fulfillmentStatus === 'shipped');
      ok('dispatch time was stamped', !!shippedNow.shippedAt);
      ok('a non-http tracking URL is rejected', shippedNow.trackingUrl === '');

      /* And the customer sees it. */
      const live = jar();
      const t = await customerAuth.issueMagicLink('ada@example.com');
      await GET('/account/sign-in/' + t, { jar: live });
      const seen = await GET('/account/orders/' + orderReference({ orderId: 'pay_ada_stale' }), { jar: live });
      ok('the customer sees the tracking number', seen.body.includes('9400555000111'));
      ok('and the shipped status', seen.body.includes('On its way'));

      /* Marking a refund complete is what finally lets the portal say the
         money went back — and only then. */
      const cancelled = await Order.findOne({ orderId: 'pay_ada_fresh' });
      const before = await GET('/account/orders/' + orderReference({ orderId: 'pay_ada_fresh' }), { jar: live });
      ok('before: the portal says queued', before.body.includes('queued to be refunded'));
      ok('before: it does not say refunded', !before.body.includes('was refunded to your original'));

      await request(ap, 'POST', `/admin/customers/${c._id}/orders/${cancelled._id}/refund`, { body: { action: 'refunded' } });
      const after = await GET('/account/orders/' + orderReference({ orderId: 'pay_ada_fresh' }), { jar: live });
      ok('after: the portal says refunded', after.body.includes('was refunded to your original'));
      ok('and the record agrees', (await Order.findOne({ orderId: 'pay_ada_fresh' })).refundStatus === 'refunded');

      /* Admin cannot act across customers either. */
      const grace = await Customer.findOne({ email: 'grace@example.com' });
      const crossed = await request(ap, 'POST', `/admin/customers/${grace._id}/orders/${cancelled._id}/refund`, { body: { action: 'clear' } });
      ok("admin actions are scoped to the customer in the URL", crossed.status === 404);
      ok('and changed nothing', (await Order.findOne({ orderId: 'pay_ada_fresh' })).refundStatus === 'refunded');

      const closed = await request(ap, 'POST', `/admin/customers/${grace._id}/status`, { body: { status: 'closed' } });
      ok('closing an account works', closed.status === 302
        && (await Customer.findById(grace._id)).status === 'closed');
      ok('and ends its sessions', await CustomerSession.countDocuments({ customer: grace._id }) === 0);

      /* ── Deleting accounts ───────────────────────────────────
         The destructive variant must be fenced by what the orders ARE,
         not by which button the page happened to render. Both are
         exercised here with a hand-made POST, which is exactly what a
         stale tab would send. */
      const testOrderSvc = require(path.join(ROOT, 'services/testOrder'));

      /* Ada has real orders. The combined delete must refuse. */
      const refused = await request(ap, 'POST', `/admin/customers/${c._id}/delete`, { body: { orders: 'test' } });
      ok('deleting real orders is refused', String(refused.headers.location || '').includes('failed=real_orders'));
      ok('the account survives the refusal', !!(await Customer.findById(c._id)));
      ok('and so do the orders',
        await Order.countDocuments({ customerEmail: /^ada@example\.com$/i }) > 0);

      /* Account-only delete keeps the orders — and, because ownership is
         by email, signing in again rebuilds the account around them.
         Asserted rather than assumed: it is the surprising half. */
      const adaOrdersBefore = await Order.countDocuments({ customerEmail: /^ada@example\.com$/i });
      const gone = await request(ap, 'POST', `/admin/customers/${c._id}/delete`, { body: { orders: 'keep' } });
      ok('account-only delete succeeds', gone.status === 302);
      ok('the account is gone', !(await Customer.findById(c._id)));
      ok('its sessions went with it', await CustomerSession.countDocuments({ customer: c._id }) === 0);
      ok('its sign-in links went too', await MagicLink.countDocuments({ email: 'ada@example.com' }) === 0);
      ok('every order was kept',
        await Order.countDocuments({ customerEmail: /^ada@example\.com$/i }) === adaOrdersBefore);

      const rebuilt = jar();
      const t2 = await customerAuth.issueMagicLink('ada@example.com');
      await GET('/account/sign-in/' + t2, { jar: rebuilt });
      const back = await GET('/account/orders', { jar: rebuilt });
      ok('signing in again rebuilds the account around the surviving orders',
        back.status === 200 && back.body.includes(orderReference({ orderId: 'pay_ada_shipped' })));

      /* A genuinely test-only account can be removed entirely. */
      await Order.create({
        orderId: testOrderSvc.ID_PREFIX + 'DEADBEEF', totalPrice: 4200, currency: 'USD',
        customerEmail: 'tester+ztest@example.com', customerName: 'Test Tester',
        products: ['OP-17 Box'], productSlug: 'op-17-box', quantity: 1,
        status: 'completed', financialStatus: 'paid',
        originalCheckoutMethod: testOrderSvc.MARKER,
        purchaseDate: new Date(), createdAt: new Date(),
      });
      const tester = await Customer.findOrCreateByEmail('tester+ztest@example.com', { createdVia: 'purchase' });
      await customerAuth.issueMagicLink('tester+ztest@example.com');

      const wiped = await request(ap, 'POST', `/admin/customers/${tester._id}/delete`, { body: { orders: 'test' } });
      ok('a test-only account can be wiped', wiped.status === 302
        && String(wiped.headers.location || '').includes('deleted=all'));
      ok('the account is gone', !(await Customer.findById(tester._id)));
      ok('its test order is gone',
        await Order.countDocuments({ customerEmail: /^tester\+ztest@example\.com$/i }) === 0);
      ok('its sign-in links are gone',
        await MagicLink.countDocuments({ email: 'tester+ztest@example.com' }) === 0);

      /* And nothing else was touched. */
      ok("Grace's account is untouched", !!(await Customer.findOne({ email: 'grace@example.com' })));
      ok("Grace's order is untouched",
        await Order.countDocuments({ customerEmail: /^grace@example\.com$/i }) === 1);

      adminServer.close();
    }

    /* ── 15. Nothing leaks into a URL, a page, or a search index ── */
    console.log('15. exposure');
    {
      const live = jar();
      await Customer.updateOne({ email: 'ada@example.com' }, { $set: { status: 'active' } });
      const t = await customerAuth.issueMagicLink('ada@example.com');
      await GET('/account/sign-in/' + t, { jar: live });
      const token = live.cookies.get('zy_cust');

      for (const url of ['/account', '/account/orders', '/account/profile', '/account/security']) {
        const r = await GET(url, { jar: live });
        ok(`${url} renders`, r.status === 200, `status ${r.status}`);
        ok(`${url} is noindex`, /noindex/.test(r.headers['x-robots-tag'] || ''));
        ok(`${url} is no-store`, /no-store/.test(r.headers['cache-control'] || ''));
        ok(`${url} never prints the session token`, !r.body.includes(token));
        ok(`${url} never touches localStorage`, !/localStorage|sessionStorage/.test(r.body));
        ok(`${url} has no password input`, !/type="password"/.test(r.body));
      }
    }
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
  }

  console.log(`\n${passed} assertions passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  • ' + f));
  }
  process.exit(failures.length ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
