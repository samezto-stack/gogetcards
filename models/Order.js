const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  /* WHICH STOREFRONT SOLD IT. Carried from the checkout session so
     revenue can be read per market without inferring it from the
     currency — two markets could share one some day, and an inference is
     not something a finance report should rest on. */
  market: { type: String, default: 'US', uppercase: true, trim: true, index: true },
  currency: {
    type: String,
    default: 'USD',
  },
  customerName: {
    type: String,
    default: 'Guest',
  },
  customerEmail: {
    type: String,
    default: '',
  },
  customerPhone: {
    type: String,
    default: '',
  },
  products: {
    type: [String],
    default: [],
  },
  source: {
    type: String,
    default: 'direct',
  },
  // Marketing/traffic channel the customer originally arrived from
  // (Facebook, Google, Yahoo, Direct, ...) — NOT to be confused with
  // `source`/`paymentProvider` above, which describe the checkout MECHANISM
  // (whop / partner_experience), not where the
  // customer came from. Populated for Partner Experience orders by looking
  // up the checkout_click Event recorded at the original checkout click
  // (see routes/frontend.js's trackCheckoutReached + resolveTrafficSource,
  // and services/orderPipeline/index.js). Empty when not resolvable (e.g.
  // an order imported from elsewhere, whose completion is reported from a
  // separate cross-domain request with no link back to that click).
  trafficSource: {
    type: String,
    default: '',
    index: true,
  },
  status: {
    type: String,
    default: 'completed', // 'abandoned', 'pending_verification', 'completed'
  },
  financialStatus: {
    type: String,
    default: 'paid',
  },
  paymentGateway: {
    type: String,
    default: 'partner_experience',
  },
  shippingAddress: {
    type: String,
    default: '',
  },
  note: {
    type: String,
    default: '',
  },
  items: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  recoveryEmailSent: {
    type: Boolean,
    default: false
  },

  /* ── Imported-order tracking (external providers, e.g. Whop) ─────── */
  // These are additive fields used only when an order is created via the
  // post-purchase import pipeline (services/orderPipeline). Native orders
  // (Shopify rotator / Stripe static links) simply leave them at defaults.
  paymentId: {
    type: String,
    default: '',
    index: true,
  },
  checkoutId: {
    type: String,
    default: '',
  },
  /* This site's own correlation id for the checkout hop that produced this
     order — the zcid minted by trackCheckoutReached, carried through the
     partner redirect and handed back on the thank-you payload.
   *
   * NOT THE SAME THING AS checkoutId ABOVE, which is filled from
   * raw.checkout_id and receives the Whop PLAN id. That collision has
   * already broken one dashboard figure silently: a join written against
   * checkoutId matched nothing and reported a plausible zero rather than an
   * error. Storing the real id under its own name is what makes "of the
   * checkouts that reached the payment step, which ones paid" answerable at
   * all, and this is the last point in the flow where the id is still in
   * hand. Empty on orders created before this field existed. */
  zcid: {
    type: String,
    default: '',
    index: true,
  },
  paymentProvider: {
    type: String,
    default: '',
  },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  address1: { type: String, default: '' },
  address2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zip: { type: String, default: '' },
  country: { type: String, default: '' },
  productSlug: { type: String, default: '' },
  productImage: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  /* Units per `quantity` when the product is sold in packs (see
     helpers/packs.js). quantity counts packs, which is what the ladder
     charged; quantity × packSize is what the customer receives and is
     the figure every receipt, page and email shows. 1 for everything
     sold singly, which is every order that predates the field. */
  packSize: { type: Number, default: 1 },
  purchaseDate: { type: Date, default: null },

  // Import metadata — kept separate from the fields above so an imported
  // order can be filtered/rendered identically to a native one while still
  // preserving where it actually came from.
  importedFrom: { type: String, default: '' }, // e.g. 'whop'
  importTimestamp: { type: Date, default: null },
  originalCheckoutMethod: { type: String, default: '' }, // e.g. 'partner_experience'

  confirmationEmailSent: {
    type: Boolean,
    default: false,
  },

  /* ── Customer-facing lifecycle ────────────────────────────────────
     Added for the customer account portal. All additive with defaults, so
     every order already in the database reads as an unfulfilled, paid,
     non-cancelled order — which is what they are.

     `status` and `financialStatus` above are NOT replaced. They describe
     whether the order record itself is complete and whether money arrived.
     These describe what has happened to the goods, which is a different
     question and the only one a customer is asking. */

  // 'unfulfilled' | 'preparing' | 'shipped' | 'delivered'
  fulfillmentStatus: { type: String, default: 'unfulfilled', index: true },
  trackingNumber: { type: String, default: '' },
  trackingCarrier: { type: String, default: '' },
  trackingUrl: { type: String, default: '' },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },

  /* Cancellation. Requested and completed are separate timestamps because
     they are separate events even when they happen a second apart, and a
     support conversation about "when did you cancel" needs the first one. */
  cancelledAt: { type: Date, default: null },
  cancellationRequestedAt: { type: Date, default: null },
  cancellationReason: { type: String, default: '' },
  cancelledBy: { type: String, default: '' }, // 'customer' | 'admin'

  /* Refund state, tracked SEPARATELY from cancellation because they move
     at different speeds and the customer is owed the truth about both.
     'none' | 'processing' | 'refunded'
     Refunds are issued by hand in the payment provider; nothing here
     initiates one, and the portal never claims money has been sent until
     this says 'refunded'. */
  refundStatus: { type: String, default: 'none', index: true },
  refundInitiatedAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  refundAmount: { type: Number, default: 0 },

  /* ── Reinstatement ───────────────────────────────────────────────
     A cancelled order whose refund has not yet been issued can be put
     back on, by the customer, before the money moves. This exists for
     the release-day case: a set that was preordered months ago lands,
     and some of the people who cancelled while waiting would rather have
     it than the refund. They are asked ONCE, by email, with a deadline;
     nothing is reinstated unless they click.

     reinstateDeadline is the moment the offer stops working, checked at
     the instant they press the button — so a link forwarded a week late
     cannot revive an order whose refund has since gone out. The admin
     side reads it too: a cancelled order with an open offer is shown as
     "do not refund yet". */
  reinstateOfferedAt: { type: Date, default: null },
  reinstateDeadline: { type: Date, default: null, index: true },
  reinstatedAt: { type: Date, default: null },
  reinstatedBy: { type: String, default: '' }, // 'customer' | 'admin'

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('Order', orderSchema);
