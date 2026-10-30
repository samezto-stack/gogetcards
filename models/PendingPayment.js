const mongoose = require('mongoose');

/**
 * A payment a partner host confirmed with Whop, recorded server-to-server
 * BEFORE (and independently of) the customer's browser reaching our own
 * /thank-you page.
 *
 * Why this collection exists at all:
 *
 * Partner hosts used to fire their post-purchase notification straight at
 * /thank-you, which runs the full order pipeline. That meant an Order could
 * be created by the host's server alone, with no browser involved — so an
 * order appearing in the admin did NOT prove the customer ever saw our
 * confirmation page. It proved only that a payment happened somewhere.
 *
 * That ambiguity is now removed. Orders are created by exactly one thing:
 * a real browser arriving at /thank-you with a valid signature. The
 * server-to-server call writes here instead. So:
 *
 *   an Order exists  <=>  the customer's browser reached our /thank-you
 *
 * The trade-off is that a payment whose browser never arrives (tab closed
 * during the redirect, blocked localStorage, dead connection) would leave
 * no trace at all. That is what this record prevents: the money is always
 * accounted for, it is just not counted as a confirmed order until the
 * arrival happens. `resolvedOrderId` is set when the browser does turn up,
 * so anything left unresolved is a real "paid but never confirmed" case
 * worth looking at by hand.
 *
 * Every field here arrives inside a payload whose HMAC signature was
 * verified against THANK_YOU_SIGNING_SECRET before anything was written,
 * so this is not attacker-controlled data.
 */
const pendingPaymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Which partner host reported it (thebindery.com, pitchforgestudio.com...).
    store: {
      type: String,
      default: '',
      index: true,
    },
    customerEmail: { type: String, default: '' },
    customerName: { type: String, default: '' },
    productName: { type: String, default: '' },
    productSlug: { type: String, default: '' },
    price: { type: String, default: '' },
    currency: { type: String, default: 'USD' },
    quantity: { type: String, default: '1' },
    paymentProvider: { type: String, default: '' },
    paymentId: { type: String, default: '' },

    /* The complete verified payload, kept verbatim. If an order has to be
       reconstructed by hand later, everything needed is here rather than
       spread across whatever columns happened to be modelled today. */
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /* Set once the customer's browser actually reaches /thank-you and the
       order is created. Null means the payment succeeded but the customer
       never landed on our confirmation page. */
    resolvedOrderId: {
      type: String,
      default: null,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    /* Set when an admin has looked at an unresolved payment and dealt with
       it, so the "needs attention" list does not keep re-surfacing the
       same known cases. */
    acknowledgedAt: {
      type: Date,
      default: null,
    },

    /* Set when the phone has been told about this payment, by
       cron/unconfirmedPayments.js. It doubles as that sweep's atomic claim:
       the update that sets it is conditional on it still being null, so two
       workers can never both push the same payment. Never cleared. */
    alertedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/* Unresolved-first ordering for the admin list. */
pendingPaymentSchema.index({ resolvedOrderId: 1, createdAt: -1 });

/* The unconfirmed-payment sweep: unresolved, never alerted, old enough
   that /thank-you has had its chance. */
pendingPaymentSchema.index({ alertedAt: 1, resolvedOrderId: 1, createdAt: 1 });

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
