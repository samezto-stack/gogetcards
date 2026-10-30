const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * A checkout in progress, owned by Zyphera.
 *
 * WHY THIS EXISTS AND WHAT IT REPLACES. The old /checkout/whop route
 * addressed a checkout by putting a raw Mongo ObjectId in the URL and then
 * did `Order.findById(id)` with no ownership check at all — anyone holding
 * or guessing an id could open somebody else's checkout, and ObjectIds are
 * timestamp + machine + counter rather than random. This model is the fix:
 * the URL carries 32 bytes of CSPRNG, only its SHA-256 is stored, and there
 * is nothing in the address bar that identifies a person or a record.
 *
 * IT IS NOT AN ORDER, AND THAT IS THE POINT. The store's invariant is
 *
 *     an Order exists  <=>  the customer's browser reached /thank-you
 *
 * so a customer part-way through checkout must not produce one. Two things
 * would break if it did: /admin/orders would fill with unpaid rows, and
 * services/abandonedCheckout treats the existence of an Order as proof of
 * payment — every Step 1 submission would be marked 'recovered' on the
 * spot and no recovery email would ever be sent to anyone.
 *
 * THE PRICE HERE IS THE SERVER'S. `unitPrice`/`total` are recalculated
 * from the Product at Step 1 and re-checked at handoff. Nothing the browser
 * posts is ever trusted, which is what keeps the figure on the product
 * page, this page, the payment step and the confirmation the same number.
 */

/* step1_active   the form is open, nothing submitted yet
   step1_completed  details validated and saved, not yet sent to payment
   payment_pending  handed off to the payment step; no money yet
   paid           payment confirmed and an Order exists
   payment_failed the provider declined; Step 1 survives, they can retry
   expired        the token is dead
   cancelled      superseded or abandoned deliberately */
const STATUSES = [
  'step1_active',
  'step1_completed',
  'payment_pending',
  'paid',
  'payment_failed',
  'expired',
  'cancelled',
];

/* Long enough that somebody who starts a checkout, goes to bed and comes
   back can still finish; short enough that a link found later is dead. */
const TOKEN_TTL_HOURS = 72;

const checkoutSessionSchema = new mongoose.Schema(
  {
    /* Only the hash. A database dump is then not a set of working links
       into other people's checkouts. */
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },

    /* The same correlation id the funnel Events and the AbandonedCheckout
       row use, so one id follows the customer from product page to order.
       Minted by trackCheckoutReached() when it exists, otherwise here. */
    checkoutId: { type: String, default: '', index: true },

    status: { type: String, enum: STATUSES, default: 'step1_active', index: true },

    /* ---- what is being bought (server-owned) ---- */
    productSlug: { type: String, required: true, index: true },
    quantity: { type: Number, default: 1, min: 1 },
    /* Cents, snapshotted from Product at Step 1 and re-verified before
       handoff. `total` is quantity * unitPrice unless a fixed bundle plan
       overrides it, which is the only case where they differ. */
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    /* WHICH STOREFRONT THIS CHECKOUT BELONGS TO, pinned at Step 1 and
       never re-derived. The session is what carries the market from the
       product page to the charge: without it the payment step would have
       to guess from a token URL that has no market prefix, and a guess
       is how a buyer browses in CAD and is billed in USD. */
    market: { type: String, default: 'US', uppercase: true, trim: true },
    /* Free today, and modelled anyway so a future change cannot silently
       make Step 1 and the payment step disagree. */
    shippingCents: { type: Number, default: 0 },
    taxCents: { type: Number, default: 0 },

    /* ---- who is buying ---- */
    email: { type: String, default: '', lowercase: true, trim: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    country: { type: String, default: '' },
    address1: { type: String, default: '' },
    address2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },

    /* ---- payment step ---- */
    /* Where the customer was sent to pay. Recorded so support can answer
       "which page were they on" without guessing, and so the transition
       is auditable rather than invisible. */
    paymentUrl: { type: String, default: '' },
    paymentHost: { type: String, default: '' },
    whopPlanId: { type: String, default: '' },
    /* The pooled address handed to the payment provider, when pooled-email
       mode is on. Kept because the Order will come back carrying THIS
       address rather than the customer's, and reconciliation needs both. */
    pooledEmail: { type: String, default: '' },
    handedOffAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
    failureCount: { type: Number, default: 0 },

    /* A rehearsal, not a sale. Set at Step 1 from the address typed AND a
       live admin session on that browser — see services/testOrder.js — and
       never from anything the payment host sends back. The payment step
       then shows a plainly-labelled test panel instead of the card form,
       and the resulting order carries the marker that keeps it out of
       revenue reporting. */
    isTest: { type: Boolean, default: false },

    /* ---- outcome ---- */
    orderId: { type: String, default: '', index: true },
    paidAt: { type: Date, default: null },

    lastActivityAt: { type: Date, default: Date.now, index: true },

    /* Diagnostics only. Never used to vary what is shown — no
       user-agent branching anywhere in this flow. */
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

/* Expiry sweep, and the "is this token live" lookup. */
checkoutSessionSchema.index({ status: 1, expiresAt: 1 });

function hashToken(plaintext) {
  return crypto.createHash('sha256').update(String(plaintext)).digest('hex');
}

/** Mints a session and returns { doc, token } — the token exists once. */
async function issue(fields = {}) {
  const token = crypto.randomBytes(32).toString('base64url');
  const doc = await CheckoutSession.create({
    ...fields,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
  });
  return { doc, token };
}

/**
 * Resolves a presented token.
 *
 * One indexed lookup on the hash, so a wrong token costs the same as a
 * right one and there is no timing signal to enumerate against. Returns
 * null for unknown AND for expired, so the caller cannot distinguish them
 * either.
 */
async function resolve(token) {
  if (!token || typeof token !== 'string' || token.length < 32) return null;
  const doc = await CheckoutSession.findOne({ tokenHash: hashToken(token) });
  if (!doc) return null;
  if (doc.expiresAt && doc.expiresAt < new Date()) return null;
  if (doc.status === 'expired' || doc.status === 'cancelled') return null;
  return doc;
}

/** True once payment has succeeded; the payment step must not reopen. */
checkoutSessionSchema.methods.isComplete = function isComplete() {
  return this.status === 'paid';
};

/** Everything needed to fill in Step 1 again for a returning customer. */
checkoutSessionSchema.methods.customerFields = function customerFields() {
  return {
    email: this.email || '',
    firstName: this.firstName || '',
    lastName: this.lastName || '',
    phone: this.phone || '',
    country: this.country || '',
    address1: this.address1 || '',
    address2: this.address2 || '',
    city: this.city || '',
    state: this.state || '',
    postalCode: this.postalCode || '',
  };
};

const CheckoutSession =
  mongoose.models.CheckoutSession ||
  mongoose.model('CheckoutSession', checkoutSessionSchema);

module.exports = CheckoutSession;
module.exports.STATUSES = STATUSES;
module.exports.TOKEN_TTL_HOURS = TOKEN_TTL_HOURS;
module.exports.hashToken = hashToken;
module.exports.issue = issue;
module.exports.resolve = resolve;
