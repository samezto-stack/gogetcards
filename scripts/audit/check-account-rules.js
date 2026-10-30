/* The account system's decision logic, exhaustively, with no database.
 *
 * Run:  node scripts/audit/check-account-rules.js
 *
 * WHAT THIS IS FOR: check-account.js exercises the whole thing over HTTP
 * against a real MongoDB, which is the real test — but it needs a mongod.
 * This covers the pure functions those routes decide with, and it runs
 * anywhere. Between them, the rules are checked here and the wiring is
 * checked there.
 *
 * Everything below is a TRUTH TABLE rather than a handful of examples.
 * "Can this be cancelled" has five inputs; testing three of the pleasant
 * combinations is how a store ends up refunding an order that is already
 * in a van.
 */

const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const customerOrders = require(path.join(ROOT, 'services/customerOrders'));
const customerAuth = require(path.join(ROOT, 'services/customerAuth'));
const orderReference = require(path.join(ROOT, 'helpers/orderReference'));

let passed = 0;
const failures = [];
function ok(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(label + (detail ? ' — ' + detail : ''));
  console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
}

const HOUR = 3600 * 1000;
const order = (over = {}) => Object.assign({
  totalPrice: 42900, currency: 'USD', status: 'completed', financialStatus: 'paid',
  fulfillmentStatus: 'unfulfilled', cancelledAt: null, cancellationRequestedAt: null,
  refundStatus: 'none', refundInitiatedAt: null, refundedAt: null, refundAmount: 0,
  purchaseDate: new Date(Date.now() - HOUR), createdAt: new Date(Date.now() - HOUR),
}, over);

/* ── Status precedence ──────────────────────────────────── */
console.log('status precedence');
{
  const s = (o, pre) => customerOrders.statusOf(order(o), { isPreorder: !!pre }).key;

  ok('paid, unfulfilled, in stock → confirmed', s({}) === 'confirmed');
  ok('paid, unfulfilled, preorder → preorder', s({}, true) === 'preorder');
  ok('preparing outranks preorder', s({ fulfillmentStatus: 'preparing' }, true) === 'preparing');
  ok('shipped outranks preparing', s({ fulfillmentStatus: 'shipped' }) === 'shipped');
  ok('delivered outranks shipped', s({ fulfillmentStatus: 'delivered' }) === 'delivered');
  ok('cancelled outranks delivered', s({ fulfillmentStatus: 'delivered', cancelledAt: new Date() }) === 'cancelled');
  ok('refund processing outranks cancelled',
    s({ cancelledAt: new Date(), refundStatus: 'processing' }) === 'refund_processing');
  ok('refunded outranks refund processing',
    s({ cancelledAt: new Date(), refundStatus: 'refunded' }) === 'refunded');
  ok('unpaid and unconfirmed → pending',
    s({ financialStatus: 'pending', status: 'pending_verification' }) === 'pending');

  /* The wording is the part a customer acts on, so it is asserted, not
     just the key. A "processing" refund must never read as sent. */
  const processing = customerOrders.statusOf(order({ refundStatus: 'processing' }), {});
  ok('processing never claims the money was sent',
    !/has been (issued|sent|refunded)/i.test(processing.detail)
    && /being processed/i.test(processing.detail));
  const refunded = customerOrders.statusOf(order({ refundStatus: 'refunded' }), {});
  ok('refunded does say it was issued', /has been issued/i.test(refunded.detail));

  /* Every status must carry a tone the stylesheet knows about, or the
     badge renders unstyled. */
  const tones = new Set(['good', 'accent', 'warn', 'neutral']);
  const all = [
    s({}), s({}, true), s({ fulfillmentStatus: 'preparing' }), s({ fulfillmentStatus: 'shipped' }),
    s({ fulfillmentStatus: 'delivered' }), s({ cancelledAt: new Date() }),
    s({ refundStatus: 'processing' }), s({ refundStatus: 'refunded' }),
    s({ financialStatus: 'pending', status: 'pending_verification' }),
  ];
  ok('nine distinct statuses exist', new Set(all).size === 9, all.join(','));
  [
    order({}), order({ fulfillmentStatus: 'shipped' }), order({ cancelledAt: new Date() }),
    order({ refundStatus: 'processing' }), order({ refundStatus: 'refunded' }),
    order({ financialStatus: 'pending', status: 'pending_verification' }),
  ].forEach((o, i) => {
    const st = customerOrders.statusOf(o, { isPreorder: i === 0 });
    ok(`status ${st.key} has a known tone`, tones.has(st.tone), st.tone);
    ok(`status ${st.key} has a label`, !!st.label && !!st.detail);
  });
}

/* ── Cancellability, every combination ──────────────────── */
console.log('cancellability');
{
  const can = (o, pre) => customerOrders.cancellability(order(o), { isPreorder: !!pre });
  const WINDOW = customerOrders.SELF_CANCEL_WINDOW_MS;
  const fresh = { purchaseDate: new Date(Date.now() - HOUR) };
  const stale = { purchaseDate: new Date(Date.now() - WINDOW - HOUR) };

  /* In-stock: the 24h window governs. */
  ok('in stock, 1h old → cancellable', can(fresh).can === true);
  ok('in stock, just inside the window → cancellable',
    can({ purchaseDate: new Date(Date.now() - WINDOW + 60000) }).can === true);
  ok('in stock, just outside the window → refused',
    can({ purchaseDate: new Date(Date.now() - WINDOW - 60000) }).can === false);
  ok('and the refusal explains the window', /24 hours/.test(can(stale).reason));

  /* Preorders: the window does not apply, dispatch does. */
  ok('preorder, 1h old → cancellable', can(fresh, true).can === true);
  ok('preorder, months old → still cancellable',
    can({ purchaseDate: new Date(Date.now() - 90 * 24 * HOUR) }, true).can === true);
  ok('preorder, preparing → still cancellable',
    can({ ...fresh, fulfillmentStatus: 'preparing' }, true).can === true);
  ok('preorder, shipped → refused',
    can({ ...fresh, fulfillmentStatus: 'shipped' }, true).can === false);

  /* Dispatch beats everything, for both. */
  ['shipped', 'delivered'].forEach((f) => {
    [false, true].forEach((pre) => {
      const r = can({ ...fresh, fulfillmentStatus: f }, pre);
      ok(`${f}${pre ? ' preorder' : ''} → refused`, r.can === false);
      ok(`${f}${pre ? ' preorder' : ''} → explains why`, /already shipped/.test(r.reason));
    });
  });

  /* Terminal states. */
  ok('already cancelled → refused', can({ ...fresh, cancelledAt: new Date() }).can === false);
  ok('refund processing → refused', can({ ...fresh, refundStatus: 'processing' }).can === false);
  ok('already refunded → refused', can({ ...fresh, refundStatus: 'refunded' }).can === false);
  ok('abandoned → refused', can({ ...fresh, status: 'abandoned' }).can === false);

  /* Every refusal must say something, or the UI renders a blank reason. */
  const refusals = [
    can(stale), can({ ...fresh, fulfillmentStatus: 'shipped' }),
    can({ ...fresh, cancelledAt: new Date() }), can({ ...fresh, refundStatus: 'processing' }),
    can({ ...fresh, status: 'abandoned' }),
  ];
  ok('every refusal carries a reason', refusals.every((r) => !r.can && r.reason.length > 5));
  ok('every permission carries no reason', can(fresh).reason === '' && can(fresh, true).reason === '');

  /* THE ROUTE'S GUARDED WRITE MUST NOT BE LOOSER THAN THIS. The POST
     handler re-checks with a Mongo filter of its own; if that filter
     admits something cancellability() refuses, the check above is
     decoration. Asserted against the source so the two cannot drift
     silently. */
  const src = require('fs').readFileSync(path.join(ROOT, 'routes/account.js'), 'utf8');
  ok('the guarded update excludes already-cancelled orders', /cancelledAt:\s*null/.test(src));
  ok('the guarded update excludes shipped and delivered',
    /fulfillmentStatus:\s*\{\s*\$nin:\s*\['shipped',\s*'delivered'\]\s*\}/.test(src));
  ok('the route re-reads eligibility before writing', /found\.cancellable\.can/.test(src));
  ok('the route initiates no refund', !/refunds?\.create|stripe\.|whop/i.test(src));
  ok('the route records refundStatus as processing, not refunded',
    /refundStatus:\s*'processing'/.test(src) && !/refundStatus:\s*'refunded'/.test(src));
}

/* ── Cancellation timeline ──────────────────────────────── */
console.log('timeline');
{
  const t = customerOrders.cancellationTimeline(order({
    cancellationRequestedAt: new Date(), cancelledAt: new Date(),
    refundStatus: 'processing', refundInitiatedAt: new Date(),
  }));
  ok('five steps', t.length === 5);
  ok('placed is always done', t[0].done === true);
  ok('refund processing is done', t[3].done === true);
  ok('refund completed is NOT done while processing', t[4].done === false);

  const done = customerOrders.cancellationTimeline(order({
    cancelledAt: new Date(), refundStatus: 'refunded', refundedAt: new Date(),
  }));
  ok('refund completed is done once refunded', done[4].done === true);
}

/* ── Redirect safety ────────────────────────────────────── */
console.log('redirect safety');
{
  const safe = customerAuth.safeRedirect;
  ['/account', '/account/orders', '/account/orders/ZTCG-46571', '/products/op-17-box',
   '/collection/all?q=box'].forEach((p) => {
    ok(`same-site path survives: ${p}`, safe(p) === p);
  });
  ['https://evil.example/x', '//evil.example/x', 'http://evil.example', '\\\\evil.example',
   'javascript:alert(1)', 'data:text/html,x', '/\\evil.example', '///evil.example',
   '', null, undefined, 'account', 'https://gogetcards.com.evil.example/',
  ].forEach((p) => {
    ok(`hostile redirect neutralised: ${JSON.stringify(p)}`, safe(p) === '/account');
  });
}

/* ── Cookie reading ─────────────────────────────────────── */
console.log('cookie parsing');
{
  const read = customerAuth.readCookie;
  const req = (cookie) => ({ headers: { cookie } });
  ok('reads a single cookie', read(req('zy_cust=abc'), 'zy_cust') === 'abc');
  ok('reads among many', read(req('a=1; zy_cust=abc; b=2'), 'zy_cust') === 'abc');
  ok('tolerates spacing', read(req('a=1;zy_cust=abc'), 'zy_cust') === 'abc');
  ok('does not match a prefix', read(req('xzy_cust=abc'), 'zy_cust') === '');
  ok('does not match a suffix', read(req('zy_custx=abc'), 'zy_cust') === '');
  ok('missing cookie is empty', read(req('a=1'), 'zy_cust') === '');
  ok('no header is empty', read({ headers: {} }, 'zy_cust') === '');
  ok('no request is empty', read(null, 'zy_cust') === '');
  ok('base64url values survive', read(req('zy_cust=aB-_9'), 'zy_cust') === 'aB-_9');
  ok('cookie-parser is preferred when present',
    read({ cookies: { zy_cust: 'x' }, headers: { cookie: 'zy_cust=y' } }, 'zy_cust') === 'x');
}

/* ── IP truncation ──────────────────────────────────────── */
console.log('ip truncation');
{
  const p = customerAuth.ipPrefix;
  ok('IPv4 is truncated to /24', p({ ip: '73.15.4.201' }) === '73.15.4.0');
  ok('IPv4-mapped IPv6 is unwrapped', p({ ip: '::ffff:73.15.4.201' }) === '73.15.4.0');
  ok('IPv6 keeps three groups', p({ ip: '2001:db8:85a3:1:2:3:4:5' }) === '2001:db8:85a3::');
  ok('nothing in, nothing out', p({}) === '' && p(null) === '');
  ok('the full address is never stored', p({ ip: '73.15.4.201' }).indexOf('201') === -1);
}

/* ── Order references ───────────────────────────────────── */
console.log('order references');
{
  ok('format is ZTCG-nnnnn', /^ZTCG-\d{5}$/.test(orderReference({ orderId: 'whop_pay_MYUR2yPi5hiWdI' })));
  ok('stable for the same order',
    orderReference({ orderId: 'a' }) === orderReference({ orderId: 'a' }));
  ok('accepts a bare id', orderReference('whop_pay_x') === orderReference({ orderId: 'whop_pay_x' }));
  ok('falls back to paymentId', orderReference({ paymentId: 'p1' }) === orderReference('p1'));
  ok('nothing in, nothing out', orderReference(null) === '' && orderReference({}) === '');
  ok('never starts at 1', orderReference({ orderId: 'a' }) !== 'ZTCG-00001');

  /* Collisions are possible in 90,000 values and are handled by scoping
     the lookup to one customer's own orders. What must NOT happen is two
     references that differ only by case or whitespace resolving
     differently, since the URL is typed by hand. */
  const ids = Array.from({ length: 4000 }, (_, i) => 'whop_pay_' + crypto.randomBytes(6).toString('hex') + i);
  const refs = ids.map((id) => orderReference(id));
  ok('all references are well formed', refs.every((r) => /^ZTCG-\d{5}$/.test(r)));
  const unique = new Set(refs).size;
  ok('references are well distributed', unique > 3800, `${unique}/4000 unique`);
}

/* ── What must not be in the templates ──────────────────── */
console.log('template hygiene');
{
  const fs = require('fs');
  const views = fs.readdirSync(path.join(ROOT, 'views/pages'))
    .filter((f) => f.startsWith('account'))
    .concat(['../partials/account-head.ejs', '../partials/account-foot.ejs', '../partials/account-styles.ejs']);

  ok('all eight account views exist',
    ['account.ejs', 'account-orders.ejs', 'account-order.ejs', 'account-cancel.ejs',
     'account-profile.ejs', 'account-security.ejs', 'account-signin.ejs', 'account-missing.ejs']
      .every((f) => fs.existsSync(path.join(ROOT, 'views/pages', f))));

  views.forEach((f) => {
    const src = fs.readFileSync(path.join(ROOT, 'views/pages', f), 'utf8');
    const name = path.basename(f);
    ok(`${name}: no password input`, !/type=["']password/.test(src));
    ok(`${name}: no localStorage`, !/localStorage|sessionStorage/.test(src));
    ok(`${name}: no token in a link`, !/[?&](token|t|sid|session)=/.test(src));
  });

  /* The one claim that must never appear except when the record supports
     it. account-order.ejs is allowed to say it inside the `refunded`
     branch, and nowhere else. */
  const detail = fs.readFileSync(path.join(ROOT, 'views/pages/account-order.ejs'), 'utf8');
  const claims = detail.split('\n').filter((l) => /was refunded to your original/.test(l));
  ok('the "money was sent" sentence appears exactly once', claims.length === 1, `${claims.length} times`);
  ok('and only under refundStatus === refunded',
    /refundStatus === 'refunded'[\s\S]{0,400}was refunded to your original/.test(detail));
}

console.log(`\n${passed} assertions passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  • ' + f));
}
process.exit(failures.length ? 1 : 0);
