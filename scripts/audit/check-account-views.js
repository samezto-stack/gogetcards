/* Renders every account view in every state that has its own branch.
 *
 * Run:  node scripts/audit/check-account-views.js
 *
 * A template smoke test, and the only one that reaches the rare branches:
 * a refunded order, a product that has been withdrawn since it was bought,
 * a profile with nothing filled in, a session with no user agent. Those
 * render for one customer in a hundred and are exactly where an undefined
 * local sits unnoticed until it 500s on somebody's order page.
 *
 * Every render is also checked for a leaked `undefined`, `NaN` or
 * `[object Object]`, which is how a missing local usually surfaces —
 * quietly, in the middle of a sentence, rather than as an error. */

const path = require('path');
const ejs = require('ejs');

const ROOT = path.join(__dirname, '..', '..');
const productImage = require(path.join(ROOT, 'helpers/productImage'));
const orderReference = require(path.join(ROOT, 'helpers/orderReference'));
const customerOrders = require(path.join(ROOT, 'services/customerOrders'));

const customerDoc = {
  firstName: 'Marcus', lastName: 'Hale',
  email: 'marcus@example.com', displayEmail: 'Marcus@Example.com',
  phone: '+1 310 555 0142',
  address: { line1: '18 Ocean Ave', line2: 'Apt 4', city: 'Santa Monica', region: 'CA', postalCode: '90401', country: 'United States' },
  marketingOptIn: true,
  createdAt: new Date('2024-11-02'),
  greetingName() { return this.firstName || this.email.split('@')[0]; },
};

function order(over = {}) {
  return Object.assign({
    _id: 'a1', orderId: 'whop_pay_MYUR2yPi5hiWdI', totalPrice: 42900, currency: 'USD',
    customerEmail: 'marcus@example.com', customerName: 'Marcus Hale',
    firstName: 'Marcus', lastName: 'Hale',
    address1: '18 Ocean Ave', address2: 'Apt 4', city: 'Santa Monica', state: 'CA', zip: '90401', country: 'United States',
    products: ['One Piece TCG: OP-17 Booster Box'], productSlug: 'op-17-booster-box',
    quantity: 2, purchaseDate: new Date(Date.now() - 2 * 3600e3), createdAt: new Date(Date.now() - 2 * 3600e3),
    status: 'completed', financialStatus: 'paid',
    fulfillmentStatus: 'unfulfilled', trackingNumber: '', trackingCarrier: '', trackingUrl: '',
    shippedAt: null, deliveredAt: null,
    cancelledAt: null, cancellationRequestedAt: null, cancellationReason: '', cancelledBy: '',
    refundStatus: 'none', refundInitiatedAt: null, refundedAt: null, refundAmount: 0,
  }, over);
}

const product = {
  slug: 'op-17-booster-box', title: 'One Piece TCG: OP-17 The World’s Strongest Warriors Booster Box',
  imageUrl: 'https://cdn.shopify.com/s/files/1/0/op17.jpg', images: [], price: 42900,
  available: true, vendor: 'Bandai', preorder: false, tags: [],
  releaseDate: null, preorderShips: null,
};
const preorderProduct = Object.assign({}, product, {
  slug: 'op-18-case', title: 'One Piece TCG: OP-18 Case', preorder: true, tags: ['preorder'],
  releaseDate: new Date('2026-11-21'),
});

const dec = (o, p) => customerOrders.decorate(o, p);

let failures = 0;
let rendered = 0;

async function render(view, locals, checks = []) {
  const file = path.join(ROOT, 'views/pages', view + '.ejs');
  try {
    const html = await ejs.renderFile(
      file,
      /* marketLocals first, so a caller can still override one. */
      Object.assign({ productImage }, require('./marketLocals')(), locals),
      { async: false },
    );
    rendered++;
    for (const [label, fn] of checks) {
      if (!fn(html)) { console.log(`  ✗ ${view}: ${label}`); failures++; }
    }
    if (/undefined|\[object Object\]|NaN/.test(html)) {
      console.log(`  ✗ ${view}: leaked undefined/NaN/[object Object]`);
      failures++;
    }
    return html;
  } catch (err) {
    console.log(`  ✗ ${view} THREW: ${err.message.split('\n')[0]}`);
    failures++;
    return '';
  }
}

const has = (s) => (html) => html.includes(s);
const lacks = (s) => (html) => !html.includes(s);

(async () => {
  console.log('── sign in ──');
  await render('account-signin', { pageTitle: '', sent: false, formError: '', email: '', redirectTo: '/account' },
    [['form present', has('action="/account/sign-in"')], ['no password field', lacks('type="password"')]]);
  await render('account-signin', { pageTitle: '', sent: true, formError: '', email: 'a@b.com', redirectTo: '/account' },
    [['confirmation shown', has('Check your inbox')], ['no form when sent', lacks('name="email"')]]);
  await render('account-signin', { pageTitle: '', sent: false, formError: 'That does not look like an email address.', email: 'zzz', redirectTo: '/account' },
    [['error shown', has('does not look like')]]);

  console.log('── overview ──');
  const empty = { all: [], shown: [], counts: { all: 0, active: 0, preorders: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 }, totalSpend: 0 };
  await render('account', Object.assign({ customerDoc, section: 'overview', recommendations: [] }, {
    counts: empty.counts, totalSpend: 0, preorders: [], recent: [],
  }), [['empty state', has('No orders yet')]]);

  const d1 = dec(order(), product);
  const d2 = dec(order({ _id: 'b2', orderId: 'whop_pay_two', productSlug: 'op-18-case', products: ['OP-18 Case'] }), preorderProduct);
  await render('account', {
    customerDoc, section: 'overview',
    counts: { all: 2, active: 2, preorders: 1, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 },
    totalSpend: 85800, preorders: [d2], recent: [d1, d2],
    recommendations: [{ slug: 'x', title: 'Pokémon Prismatic ETB', price: 5900, imageUrl: 'https://cdn.shopify.com/a.jpg', images: [] }],
  }, [['preorder section', has('Active preorders')], ['reference', has(orderReference(order()))]]);

  console.log('── orders list ──');
  await render('account-orders', {
    customerDoc, section: 'orders', filter: 'all', unavailable: false,
    orders: [d1, d2], counts: { all: 2, active: 2, preorders: 1, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 },
  }, [['filters rendered', has('ac__filter')], ['preorder tab', has('Preorders')]]);

  await render('account-orders', {
    customerDoc, section: 'orders', filter: 'shipped', unavailable: true,
    orders: [], counts: { all: 2, active: 2, preorders: 1, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 },
  }, [['empty for filter', has('Nothing in transit')], ['unavailable notice', has('isn&rsquo;t available')]]);

  console.log('── order detail ──');
  await render('account-order', { customerDoc, section: 'orders', o: d1, justCancelled: false },
    [['cancel offered in window', has('Cancel this order')], ['no tracking block', lacks('Tracking number')]]);

  const shipped = dec(order({ fulfillmentStatus: 'shipped', shippedAt: new Date('2026-08-01'), trackingNumber: '9400111899223', trackingCarrier: 'USPS Ground Advantage', trackingUrl: 'https://tools.usps.com/go/x' }), product);
  await render('account-order', { customerDoc, section: 'orders', o: shipped, justCancelled: false },
    [['tracking shown', has('9400111899223')], ['no cancel', lacks('Cancel this order')], ['reason explained', has('already shipped')]]);

  const cancelled = dec(order({ cancelledAt: new Date(), cancellationRequestedAt: new Date(), refundStatus: 'processing', refundInitiatedAt: new Date(), refundAmount: 42900, status: 'cancelled' }), product);
  await render('account-order', { customerDoc, section: 'orders', o: cancelled, justCancelled: true },
    [['timeline', has('Cancellation requested')],
     ['refund not claimed sent', has('queued to be refunded')],
     ['never says already refunded', lacks('was refunded to your original')]]);

  const refunded = dec(order({ cancelledAt: new Date(), cancellationRequestedAt: new Date(), refundStatus: 'refunded', refundedAt: new Date(), refundAmount: 42900 }), product);
  await render('account-order', { customerDoc, section: 'orders', o: refunded, justCancelled: false },
    [['refund confirmed', has('was refunded to your original')]]);

  const stale = dec(order({ purchaseDate: new Date(Date.now() - 5 * 864e5), createdAt: new Date(Date.now() - 5 * 864e5) }), product);
  await render('account-order', { customerDoc, section: 'orders', o: stale, justCancelled: false },
    [['24h window closed', lacks('Cancel this order')], ['window explained', has('within 24 hours')]]);

  const noProduct = dec(order({ productSlug: 'gone' }), undefined);
  await render('account-order', { customerDoc, section: 'orders', o: noProduct, justCancelled: false },
    [['degrades without product', has('OP-17')], ['no buy again', lacks('Buy again')]]);

  console.log('── cancel ──');
  await render('account-cancel', { customerDoc, section: 'orders', o: d1, formError: '' },
    [['consequences listed', has('What happens if you cancel')], ['honest refund', has('by hand')]]);
  await render('account-cancel', { customerDoc, section: 'orders', o: d2, formError: '' },
    [['preorder allocation warning', has('allocation is released')]]);
  await render('account-cancel', { customerDoc, section: 'orders', o: shipped, formError: 'This order has already shipped.' },
    [['conflict shown', has('already shipped')]]);

  console.log('── profile ──');
  await render('account-profile', { customerDoc, section: 'profile', saved: false, formError: '' },
    [['email readonly', has('readonly')], ['address prefilled', has('18 Ocean Ave')]]);
  await render('account-profile', { customerDoc, section: 'profile', saved: true, formError: '' },
    [['saved notice', has('Saved.')]]);
  await render('account-profile', {
    customerDoc: Object.assign({}, customerDoc, { firstName: '', lastName: '', phone: '', address: {}, marketingOptIn: false, greetingName: customerDoc.greetingName }),
    section: 'profile', saved: false, formError: '',
  }, [['blank profile ok', has('name="firstName"')]]);

  console.log('── security ──');
  await render('account-security', {
    customerDoc, section: 'security',
    sessions: [
      { _id: '1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', ipPrefix: '73.15.4.0/24', origin: 'purchase', createdAt: new Date(), lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 864e5), current: true },
      { _id: '2', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Mobile Safari/604.1', ipPrefix: '', origin: 'magic_link', createdAt: new Date(), lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 864e5), current: false },
      { _id: '3', userAgent: '', ipPrefix: '', origin: '', createdAt: new Date(), lastUsedAt: null, expiresAt: new Date(Date.now() + 864e5), current: false },
    ],
  }, [['device summary', has('Chrome on Mac')], ['iphone', has('Safari on iPhone')],
      ['this device', has('This device')], ['sign out everywhere', has('/account/sign-out-all')]]);

  await render('account-security', { customerDoc, section: 'security', sessions: [] },
    [['no sessions', has('No other devices')]]);

  console.log('── missing ──');
  await render('account-missing', { customerDoc, section: 'orders' },
    [['neutral wording', has('couldn&rsquo;t find that order')]]);

  console.log(`\n${rendered} renders, ${failures} failure(s)`);
  process.exit(failures ? 1 : 0);
})();
