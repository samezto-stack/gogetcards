/**
 * Sample data for every template, in every state that changes it.
 *
 * ONE SET, used by both the admin preview and scripts/audit/check-email.
 * If the preview had its own fixtures, the states a human looks at and
 * the states the audit asserts on would drift apart, and the drift would
 * be invisible — the preview would keep looking fine while the audit
 * kept passing, on different data.
 *
 * The cases are chosen for the shapes that break things rather than the
 * shapes that look good: a product that has been deleted since the order,
 * an address with no state or ZIP, a title long enough to wrap three
 * times, a currency that is not USD, a preorder whose date is not known,
 * and a product name containing the characters that break HTML.
 *
 * Nothing here resembles a real customer. Every name is invented and
 * every address is either ours or obviously fictional, so a screenshot
 * of a preview is not a screenshot of somebody's order.
 */

const view = require('./view');

const ACCESS_URL = 'https://zypheratcg.com/account/open/9f3a2b1c8d7e6f5a4b3c2d1e0f9a8b7c';

const baseOrder = (o = {}) => Object.assign({
  orderId: 'whop_pay_SAMPLE0000001',
  customerEmail: 'sample@example.com',
  firstName: 'Sam', lastName: 'Ezto', customerName: 'Sam Ezto',
  address1: '2321 Rosecrans Ave', address2: 'Ste 5200', city: 'El Segundo',
  state: 'CA', zip: '90245', country: 'United States',
  products: ['One Piece TCG: OP-17 Booster Box'], productSlug: 'op-17-box',
  quantity: 2, totalPrice: 85800, currency: 'USD',
  purchaseDate: new Date('2026-08-07T15:00:00Z'),
  createdAt: new Date('2026-08-07T15:00:00Z'),
  trackingNumber: '', trackingCarrier: '', trackingUrl: '', shippedAt: null,
  refundAmount: 0, refundedAt: null, cancelledAt: null,
}, o);

const inStock = {
  title: 'One Piece TCG: OP-17 The World’s Strongest Warriors Booster Box',
  slug: 'op-17-box', imageUrl: 'https://cdn.shopify.com/s/files/1/sample/op17.jpg',
  images: [], preorder: false, tags: [], releaseDate: null, preorderShips: null,
};
const preorderDated = Object.assign({}, inStock, {
  preorder: true, tags: ['preorder'], releaseDate: new Date('2026-11-21'),
});
const preorderWindow = Object.assign({}, inStock, {
  preorder: true, tags: ['preorder'], releaseDate: null, preorderShips: 'Q4 2026',
});
const preorderUnknown = Object.assign({}, preorderWindow, { preorderShips: null });

const v = (o, p, extra) => view.fromOrder(baseOrder(o), p, Object.assign({ accessUrl: ACCESS_URL }, extra));

/* A broadcast view: one customer, several orders. Built through the same
   function the queue uses, so the preview shows the shape that is really
   sent rather than a hand-assembled lookalike. `p` defaults to the
   in-stock product; pass null for the deleted-product case. */
const bv = (extra, orders, p = inStock) => view.fromOrders(
  orders.map((o) => baseOrder(Object.assign({ totalPrice: o.total }, o))),
  p,
  Object.assign({ accessUrl: ACCESS_URL }, extra)
);


/* ── Abandoned-checkout reminders ──
   These take the view built by services/mail/recoveryLifecycle.view(), not
   the order view above, so their cases are written against that shape. The
   preview exists so somebody can read all six in order and check the tone
   actually de-escalates rather than repeating itself six times. */
const rv = (over = {}) => ({
  firstName: 'Alex',
  title: 'One Piece TCG: OP-09 The Worlds Strongest Warriors Booster Box',
  image: '',
  quantity: 2,
  total: 29998,
  currency: 'USD',
  isPreorder: true,
  release: { hasDate: true, display: 'November 20, 2026' },
  recoveryUrl: 'https://zypheratcg.com/checkout/recover/SAMPLE-TOKEN',
  unsubscribeUrl: 'https://zypheratcg.com/email/unsubscribe/SAMPLE-TOKEN?c=zc_sample',
  ...over,
});

const RECOVERY_CASES = [
  ['preorder with a confirmed date', rv()],
  ['preorder, date not announced', rv({ release: { hasDate: false, display: '' } })],
  ['in stock', rv({ isPreorder: false, release: { hasDate: false, display: '' } })],
  ['single unit, no first name', rv({ firstName: '', quantity: 1, total: 14999 })],
  ['four-figure order', rv({ total: 175999, quantity: 2 })],
  ['very long product title', rv({
    title: 'Magic: The Gathering | The Lord of the Rings: Tales of Middle-earth Collector Booster Display Box (Sealed, English, 1st Print Run)',
  })],
];

const CASES = {
  recoveryReminder1: RECOVERY_CASES,
  recoveryReminder2: RECOVERY_CASES,
  recoveryReminder3: RECOVERY_CASES,
  recoveryReminder4: RECOVERY_CASES,
  recoveryReminder5: RECOVERY_CASES,
  recoveryReminder6: RECOVERY_CASES,

  orderConfirmation: [
    ['in stock', v({}, inStock)],
    ['product no longer in the catalogue', v({ productSlug: 'gone' }, null)],
    ['no structured address', v({ address1: '', address2: '', city: '', state: '', zip: '', country: '' }, inStock)],
    ['very long name and title', v({
      firstName: 'Bartholomew', lastName: 'Fitzwilliam-Montgomery',
      customerName: 'Bartholomew Fitzwilliam-Montgomery III',
      products: ['Pokémon TCG: Scarlet & Violet—Surging Sparks Elite Trainer Box (Japanese Edition, 1st Print Run, Factory Sealed Case of Twelve)'],
      totalPrice: 1275900, quantity: 12,
    }, null)],
    ['international address', v({
      firstName: 'Yuki', lastName: 'Tanaka', customerName: 'Yuki Tanaka',
      address1: '4-2-8 Shibakoen', address2: 'Minato City', city: 'Tokyo',
      state: '', zip: '105-0011', country: 'Japan',
    }, inStock)],
    ['non-USD currency', v({ currency: 'CAD' }, inStock)],
    ['title with HTML characters', v({ products: ['Magic: The Gathering — "Bloomburrow" <Bundle> & More'] }, null)],
  ],

  preorderConfirmation: [
    ['confirmed release date', v({ totalPrice: 189900, quantity: 1 }, preorderDated)],
    ['window only, no date', v({ totalPrice: 189900, quantity: 1 }, preorderWindow)],
    ['nothing announced yet', v({ totalPrice: 189900, quantity: 1 }, preorderUnknown)],
  ],

  shipped: [
    ['with tracking', v({
      shippedAt: new Date('2026-08-09T18:00:00Z'), trackingNumber: '9400111899223',
      trackingCarrier: 'USPS Ground Advantage', trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction',
    }, inStock)],
    ['tracking not live yet', v({ shippedAt: new Date('2026-08-09T18:00:00Z') }, inStock)],
  ],

  trackingAvailable: [
    ['added after dispatch', v({
      shippedAt: new Date('2026-08-09T18:00:00Z'), trackingNumber: '1Z999AA10123456784',
      trackingCarrier: 'UPS', trackingUrl: 'https://ups.com/track',
    }, inStock)],
  ],

  cancellation: [
    ['in stock', v({ cancelledAt: new Date('2026-08-08T09:00:00Z'), refundAmount: 85800 }, inStock)],
    ['preorder, allocation released', v({
      cancelledAt: new Date('2026-08-08T09:00:00Z'), refundAmount: 189900, totalPrice: 189900, quantity: 1,
    }, preorderDated)],
  ],

  refundInitiated: [
    ['refund queued without a cancellation', v({ refundAmount: 42900 }, inStock)],
  ],

  refundCompleted: [
    ['issued', v({ refundAmount: 85800, refundedAt: new Date('2026-08-12T11:00:00Z') }, inStock)],
  ],

  releaseUpdate: [
    ['date moved back', v({ totalPrice: 189900, quantity: 1 }, preorderDated, { previousRelease: 'October 3, 2026' })],
    ['date withdrawn', v({ totalPrice: 189900, quantity: 1 }, preorderWindow, { previousRelease: 'October 3, 2026' })],
    ['with a written explanation', v({ totalPrice: 189900, quantity: 1 }, preorderDated, {
      previousRelease: 'October 3, 2026',
      message: 'Bandai has moved the English release by six weeks. Your allocation and your price are unchanged, and you can cancel for a full refund at any time before dispatch.',
    })],
  ],

  /* Release day. These two are one-per-customer broadcasts, so their view
     carries `orders` — every order the message covers — on top of the
     single-order fields, which are filled from the first. The three-order
     case is the one that matters: it is the shape that turns three emails
     a minute apart into one. */
  releaseReady: [
    ['one order', bv({ deliveryWindow: '5 to 7 business days' }, [
      { orderId: 'whop_pay_SAMPLE0000001', quantity: 2, total: 85800, currency: 'USD' },
    ])],
    ['three orders, one email', bv({ deliveryWindow: '5 to 7 business days' }, [
      { orderId: 'whop_pay_SAMPLE0000001', quantity: 1, total: 42900, currency: 'USD' },
      { orderId: 'whop_pay_SAMPLE0000002', quantity: 2, total: 85800, currency: 'USD' },
      { orderId: 'whop_pay_SAMPLE0000003', quantity: 1, total: 42900, currency: 'USD' },
    ])],
    ['product no longer in the catalogue', bv({ deliveryWindow: '5 to 7 business days' }, [
      { orderId: 'whop_pay_SAMPLE0000001', quantity: 1, total: 42900, currency: 'USD' },
    ], null)],
  ],

  reinstateOffer: [
    ['one cancelled order', bv({
      deliveryWindow: '5 to 7 business days',
      deadline: new Date('2026-09-19T23:59:59-07:00'), deadlineDisplay: 'September 19, 2026',
    }, [
      { orderId: 'whop_pay_SAMPLE0000001', quantity: 1, total: 42900, currency: 'USD',
        refundAmount: 42900, cancelledAt: new Date('2026-08-30T10:00:00Z') },
    ])],
    ['two cancelled orders, one email', bv({
      deliveryWindow: '5 to 7 business days',
      deadline: new Date('2026-09-19T23:59:59-07:00'), deadlineDisplay: 'September 19, 2026',
    }, [
      { orderId: 'whop_pay_SAMPLE0000001', quantity: 1, total: 42900, currency: 'USD',
        refundAmount: 42900, cancelledAt: new Date('2026-08-30T10:00:00Z') },
      { orderId: 'whop_pay_SAMPLE0000002', quantity: 3, total: 128700, currency: 'USD',
        refundAmount: 128700, cancelledAt: new Date('2026-09-02T10:00:00Z') },
    ])],
    ['non-USD currency', bv({
      deliveryWindow: '5 to 7 business days',
      deadline: new Date('2026-09-19T23:59:59-07:00'), deadlineDisplay: 'September 19, 2026',
    }, [
      { orderId: 'whop_pay_SAMPLE0000001', quantity: 1, total: 32900, currency: 'GBP',
        refundAmount: 32900, cancelledAt: new Date('2026-08-30T10:00:00Z') },
    ])],
  ],

  reinstated: [
    ['reinstated by the customer', v({
      reinstatedAt: new Date('2026-09-16T18:00:00Z'), totalPrice: 42900, quantity: 1,
    }, inStock, { deliveryWindow: '5 to 7 business days' })],
  ],

  accountAccess: [
    ['sign-in link', view.fromOrder({}, null, { accessUrl: ACCESS_URL, expiresMinutes: 15 })],
  ],

  /* The contact form. These two take a plain object rather than an order
     view model, because neither is about an order — one is a stranger's
     message and the other is our answer to it.

     The HTML-characters case is the one that matters: both templates render
     free text somebody typed into a public form, so it goes through the
     same escaping every product title does. */
  contactReceived: [
    ['preorder question', {
      name: 'Dario Liebenberg', email: 'dario@example.com', topic: 'preorder', orderNumber: '',
      message: 'Good day,\n\nI would like to find out if I could pre-order an OP-17 case (12 boxes), and who your distributor is. I am based in South Africa.',
    }],
    ['about an order, with a number', {
      name: 'Jerelle Whitmore', email: 'jerelle@example.com', topic: 'order', orderNumber: 'ZTCG-1001',
      message: 'I placed a preorder in April and never received it. Can you ship it or refund me?',
    }],
    ['no name given, unknown topic', {
      name: '', email: 'someone@example.com', topic: 'not-a-real-topic', orderNumber: '',
      message: 'hello',
    }],
    ['message with HTML characters', {
      name: 'A <script> Tester', email: 'tester@example.com', topic: 'general', orderNumber: '',
      message: 'Do you stock "Bloomburrow" <Bundle> & similar? 5 > 3',
    }],
  ],

  supportReply: [
    ['answer to a preorder question', {
      name: 'Dario Liebenberg',
      message: 'I would like to find out if I could pre-order an OP-17 case (12 boxes).',
      reply: 'Hi Dario,\n\nYes, the OP-17 case is open for preorder and we ship to South Africa.\n\nPayment is taken at order time and it leaves within two business days of release.',
    }],
    ['no name on the original', {
      name: '', message: 'hello', reply: 'Thanks for writing in. Yes, we can help with that.',
    }],
    ['reply containing HTML characters', {
      name: 'Tester',
      message: 'Do you stock "Bloomburrow" <Bundle>?',
      reply: 'We do stock <Bundle> products, and 5 > 3 of them are in stock now.',
    }],
  ],
};

/** The named states for one template, as [label, data] pairs. */
function casesFor(type) {
  return CASES[type] || [];
}

/** One state by label, or the first if the label is unknown. */
function sample(type, label) {
  const cases = casesFor(type);
  if (!cases.length) return null;
  const hit = cases.find(([l]) => l === label);
  return (hit || cases[0])[1];
}

module.exports = { CASES, casesFor, sample, ACCESS_URL };
