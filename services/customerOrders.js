/**
 * The customer's view of their orders.
 *
 * ONE SOURCE OF TRUTH. Everything here reads the Order collection the
 * payment pipeline writes. Nothing is copied onto the Customer, so the
 * portal cannot drift from what the store actually knows, and there is no
 * second record to keep in step when a webhook lands.
 *
 * ORDERS ARE MATCHED BY NORMALISED EMAIL. That is what the pipeline has
 * always stored, so an account created today owns every order that address
 * ever placed, with no backfill.
 *
 * STATUS IS DERIVED, NOT STORED TWICE. A single `status` column would have
 * to be written correctly by every path that touches an order — the
 * pipeline, the admin, a future webhook — and would eventually disagree
 * with the fields it was summarising. Deriving it means the summary cannot
 * be stale, only wrong in one place if the rules are wrong.
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const preorderCfg = require('../config/preorder');
const shipping = require('../config/shipping');
const orderReference = require('../helpers/orderReference');

/* How long after purchase an in-stock order can still be cancelled by the
   customer without talking to anybody. Preorders are cancellable until
   they ship, which is the promise the preorder policy already makes. */
const SELF_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The customer-facing status of an order, in words a person uses.
 *
 * Ordered by precedence, not by lifecycle: a refunded order is refunded
 * whatever else is true of it, and a cancelled order is cancelled even if
 * it was once "preparing".
 */
function statusOf(order, { isPreorder = false } = {}) {
  if (order.refundStatus === 'refunded') {
    return { key: 'refunded', label: 'Refunded', tone: 'neutral',
      detail: 'Your refund has been issued to your original payment method.' };
  }
  if (order.refundStatus === 'processing') {
    return { key: 'refund_processing', label: 'Refund processing', tone: 'warn',
      detail: 'Your refund is being processed. Allow 7 to 10 business days for it to appear, depending on your bank.' };
  }
  if (order.cancelledAt) {
    return { key: 'cancelled', label: 'Cancelled', tone: 'neutral',
      detail: 'This order was cancelled.' };
  }
  if (order.fulfillmentStatus === 'delivered') {
    return { key: 'delivered', label: 'Delivered', tone: 'good', detail: 'Delivered.' };
  }
  if (order.fulfillmentStatus === 'shipped') {
    return { key: 'shipped', label: 'Shipped', tone: 'good',
      detail: 'On its way. Tracking is below and was emailed to you.' };
  }
  if (order.fulfillmentStatus === 'preparing') {
    return { key: 'preparing', label: 'Preparing shipment', tone: 'good',
      detail: 'Being picked and packed.' };
  }
  if (isPreorder) {
    return { key: 'preorder', label: 'Preorder secured', tone: 'accent',
      detail: 'Your allocation is secured and paid for. We prepare your order after the official release.' };
  }
  if (order.financialStatus === 'paid' || order.status === 'completed') {
    return { key: 'confirmed', label: 'Payment confirmed', tone: 'good',
      detail: 'Paid and queued for fulfilment.' };
  }
  return { key: 'pending', label: 'Awaiting confirmation', tone: 'warn',
    detail: 'We are still confirming this order.' };
}

/**
 * Whether the customer may cancel this themselves, and if not, why.
 *
 * The reason is returned rather than a bare boolean because the UI has to
 * explain a refusal, and "Cancel" quietly missing is worse than "this has
 * already shipped".
 */
function cancellability(order, { isPreorder = false } = {}) {
  if (order.cancelledAt) return { can: false, reason: 'Already cancelled.' };
  if (order.refundStatus !== 'none') return { can: false, reason: 'A refund is already in progress.' };
  if (order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'delivered') {
    return { can: false, reason: 'This order has already shipped. Contact support and we will help with a return.' };
  }
  if (order.status === 'abandoned') return { can: false, reason: 'This order was never completed.' };

  /* A preorder can be cancelled any time before dispatch — that is the
     published policy and the whole reason preordering is safe. */
  if (isPreorder) return { can: true, reason: '' };

  const age = Date.now() - new Date(order.purchaseDate || order.createdAt || Date.now()).getTime();
  if (age > SELF_CANCEL_WINDOW_MS) {
    return { can: false, reason: 'In-stock orders can be cancelled within 24 hours. Contact support and we will see what is possible.' };
  }
  return { can: true, reason: '' };
}

/**
 * The cancellation timeline, reflecting what has actually happened.
 * Steps that have not happened are shown as pending rather than hidden, so
 * the customer can see there is more to come.
 */
function cancellationTimeline(order) {
  const done = (d) => !!d;
  /* An order that was cancelled and then put back has a different story
     to tell: the refund never happened, and saying "pending" about it
     forever would be a lie the customer could see. */
  if (order.reinstatedAt && !order.cancelledAt) {
    return [
      { label: 'Order placed', at: order.purchaseDate || order.createdAt, done: true },
      { label: 'Cancellation requested', at: order.cancellationRequestedAt, done: done(order.cancellationRequestedAt) },
      { label: 'Order reinstated — refund withdrawn, nothing charged again', at: order.reinstatedAt, done: true },
    ];
  }
  return [
    { label: 'Order placed', at: order.purchaseDate || order.createdAt, done: true },
    { label: 'Cancellation requested', at: order.cancellationRequestedAt, done: done(order.cancellationRequestedAt) },
    { label: 'Order cancelled', at: order.cancelledAt, done: done(order.cancelledAt) },
    { label: 'Refund processing', at: order.refundInitiatedAt,
      done: order.refundStatus === 'processing' || order.refundStatus === 'refunded' },
    { label: 'Refund completed', at: order.refundedAt, done: order.refundStatus === 'refunded' },
  ];
}

/**
 * Whether a cancelled order can be put back by the customer, and if not,
 * why. Exactly the conditions the reinstatement POST re-checks in its
 * guarded update, written once here so the page and the write agree.
 *
 * Only ever true inside an open offer: nobody can revive a cancellation
 * on their own initiative, because the allocation may already have been
 * given to the next buyer. The offer is the business saying "we still
 * have one for you".
 */
function reinstatability(order) {
  if (!order.cancelledAt) return { can: false, reason: 'This order is not cancelled.' };
  if (order.refundStatus === 'refunded') return { can: false, reason: 'The refund for this order has already been issued.' };
  if (order.refundStatus !== 'processing') return { can: false, reason: 'This order cannot be reinstated.' };
  if (order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'delivered') {
    return { can: false, reason: 'This order has already shipped.' };
  }
  if (!order.reinstateDeadline) return { can: false, reason: 'This order was not offered for reinstatement.' };
  if (new Date(order.reinstateDeadline).getTime() < Date.now()) {
    return { can: false, reason: 'The deadline to keep this order has passed and the refund is going ahead.' };
  }
  return { can: true, reason: '' };
}

/** Resolves the products behind an order, for images and preorder dates. */
async function productsFor(orders) {
  const slugs = [...new Set(orders.map((o) => o.productSlug).filter(Boolean))];
  if (!slugs.length) return new Map();
  const products = await Product.find({ slug: { $in: slugs } })
    .select('slug title imageUrl images price available preorder tags releaseDate preorderShips')
    .lean();
  return new Map(products.map((p) => [p.slug, p]));
}

/** Decorates one order with everything the portal renders. */
function decorate(order, product) {
  const isPreorder = !!(product && (product.preorder || (product.tags || []).includes('preorder')));
  const release = isPreorder && product ? preorderCfg.releaseInfo(product) : null;
  return {
    order,
    product: product || null,
    reference: orderReference(order),
    isPreorder,
    release,
    status: statusOf(order, { isPreorder }),
    cancellable: cancellability(order, { isPreorder }),
    reinstatable: reinstatability(order),
    timeline: order.cancelledAt || order.cancellationRequestedAt || order.reinstatedAt ? cancellationTimeline(order) : null,
    /* Reorder is offered only when the product still exists AND is
       sellable. Sending somebody to a dead listing, or letting them buy a
       discontinued line, is worse than not offering it. */
    reorderable: !!(product && product.available),
    image: (product && (product.imageUrl || (product.images || [])[0])) || order.productImage || '',
  };
}

/**
 * Every order belonging to a customer, newest first.
 *
 * The email match is the ownership check. There is no path here that takes
 * an order id from a request.
 */
async function ordersForCustomer(customer, { filter = 'all', limit = 100 } = {}) {
  const orders = await Order.find({
    customerEmail: new RegExp(`^${escapeRegex(customer.email)}$`, 'i'),
    status: { $ne: 'abandoned' },
  }).sort({ purchaseDate: -1, createdAt: -1 }).limit(limit).lean();

  const products = await productsFor(orders);
  const decorated = orders.map((o) => decorate(o, products.get(o.productSlug)));

  const matches = {
    all: () => true,
    active: (d) => !d.order.cancelledAt && d.status.key !== 'delivered',
    preorders: (d) => d.isPreorder && !d.order.cancelledAt,
    shipped: (d) => d.status.key === 'shipped',
    delivered: (d) => d.status.key === 'delivered',
    cancelled: (d) => !!d.order.cancelledAt,
    refunded: (d) => d.order.refundStatus === 'refunded' || d.order.refundStatus === 'processing',
  };
  const predicate = matches[filter] || matches.all;

  return {
    all: decorated,
    shown: decorated.filter(predicate),
    counts: {
      all: decorated.length,
      active: decorated.filter(matches.active).length,
      preorders: decorated.filter(matches.preorders).length,
      shipped: decorated.filter(matches.shipped).length,
      delivered: decorated.filter(matches.delivered).length,
      cancelled: decorated.filter(matches.cancelled).length,
      refunded: decorated.filter(matches.refunded).length,
    },
    totalSpend: decorated
      .filter((d) => !d.order.cancelledAt && d.order.refundStatus !== 'refunded')
      .reduce((sum, d) => sum + (d.order.totalPrice || 0), 0),
  };
}

/**
 * One order, BUT ONLY IF THIS CUSTOMER OWNS IT.
 *
 * The reference in the URL is never trusted. The query is scoped to the
 * authenticated customer's email, so a reference belonging to somebody
 * else simply does not match and the caller gets null — the same answer as
 * a reference that does not exist, which is also the right answer to give
 * a stranger probing for one.
 */
async function findOwnedOrder(customer, reference) {
  const wanted = String(reference || '').trim().toUpperCase();
  if (!wanted) return null;

  const orders = await Order.find({
    customerEmail: new RegExp(`^${escapeRegex(customer.email)}$`, 'i'),
  }).lean();

  /* The reference is derived rather than stored, so it cannot be queried
     directly. The candidate set is one customer's own orders, which is
     small, and scoping the scan to it is what makes the ownership check
     structural rather than an `if` somebody can forget. */
  const match = orders.find((o) => orderReference(o) === wanted || o.orderId === reference);
  if (!match) return null;

  const products = await productsFor([match]);
  return decorate(match, products.get(match.productSlug));
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  ordersForCustomer,
  findOwnedOrder,
  statusOf,
  cancellability,
  reinstatability,
  cancellationTimeline,
  decorate,
  SELF_CANCEL_WINDOW_MS,
};
