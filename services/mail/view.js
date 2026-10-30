/**
 * One shape, derived once, that every order email is written against.
 *
 * WHY THIS EXISTS SEPARATELY: nine templates each reaching into an Order
 * document is nine places to get `order.products[0]` wrong, nine places
 * to forget that `address2` is usually empty, and nine chances for the
 * dispatch email to call a customer something different from the
 * confirmation. The templates receive a finished view and do no
 * digging.
 *
 * EVERY FIELD DEGRADES TO SOMETHING TRUE. An order imported from a
 * partner checkout may have no structured address, no phone, no product
 * slug and a bundle price with no unit price. None of that may produce
 * "undefined" in an email a customer keeps.
 */

const preorderCfg = require('../../config/preorder');
const orderReference = require('../../helpers/orderReference');
const site = require('../../config/site');

/**
 * @param {object} order    a persisted Order
 * @param {object} product  the Product behind it, if it still exists
 * @param {object} extra    { accessUrl, trackingUrl, ... }
 */
function fromOrder(order, product = null, extra = {}) {
  const o = order || {};
  const isPreorder = !!(product && (product.preorder || (product.tags || []).includes('preorder')));
  const release = isPreorder && product ? preorderCfg.releaseInfo(product) : null;

  const title = (product && product.title) || (o.products || [])[0] || 'Your order';
  const quantity = Math.max(1, Number(o.quantity) || 1);

  /* The address the ORDER captured. A profile edited later must never
     rewrite where a parcel actually went, and a receipt is a record. */
  const addressLines = [
    [o.firstName, o.lastName].filter(Boolean).join(' ') || o.customerName || '',
    o.address1,
    o.address2,
    [o.city, [o.state, o.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    o.country,
  ].filter(Boolean);

  return {
    reference: orderReference(o),
    orderId: o.orderId || '',
    firstName: o.firstName || (o.customerName || '').split(' ')[0] || '',
    email: o.customerEmail || '',
    placedOn: o.purchaseDate || o.createdAt || null,

    title,
    quantity,
    image: (product && (product.imageUrl || (product.images || [])[0])) || o.productImage || '',
    slug: o.productSlug || (product && product.slug) || '',

    total: Number(o.totalPrice) || 0,
    currency: o.currency || 'USD',

    isPreorder,
    /* `hasDate` false means we genuinely do not know yet. Templates say
       so rather than printing a placeholder date, because a date in a
       confirmation email is a promise. */
    release: release || { hasDate: false, display: null, window: null },

    addressLines,
    trackingNumber: o.trackingNumber || '',
    trackingCarrier: o.trackingCarrier || '',
    trackingUrl: o.trackingUrl || '',
    shippedAt: o.shippedAt || null,

    refundAmount: Number(o.refundAmount) || Number(o.totalPrice) || 0,
    refundedAt: o.refundedAt || null,
    cancelledAt: o.cancelledAt || null,

    /* Where the "View your order" button goes. Minted per email by the
       caller — never a raw order id in a query string. Falls back to
       the account page, which asks them to sign in. */
    accessUrl: extra.accessUrl || `${site.origin()}/account`,
    origin: site.origin(),
    ...extra,
  };
}

/**
 * The view for a message that covers several of one customer's orders.
 *
 * WHY A SECOND SHAPE. The release-day emails go to a person, not to an
 * order: somebody who placed three preorders for the same set gets one
 * message naming three references, not three messages a minute apart —
 * which reads as a mailer misfiring and is treated like one. The
 * single-order fields are filled from the FIRST order so every shared
 * layout piece still works; `orders` carries the rest.
 *
 * The orders arrive oldest first and stay that way: that is the order
 * they are packed in, and the email says so.
 */
function fromOrders(orders, product = null, extra = {}) {
  const list = (orders || []).slice().sort((a, b) =>
    new Date(a.purchaseDate || a.createdAt || 0) - new Date(b.purchaseDate || b.createdAt || 0));
  const first = list[0] || {};
  const base = fromOrder(first, product, extra);
  return Object.assign(base, {
    orders: list.map((o) => ({
      reference: orderReference(o),
      orderId: o.orderId || '',
      quantity: Math.max(1, Number(o.quantity) || 1),
      total: Number(o.totalPrice) || 0,
      currency: o.currency || base.currency,
      refundAmount: Number(o.refundAmount) || Number(o.totalPrice) || 0,
      cancelledAt: o.cancelledAt || null,
    })),
  });
}

module.exports = { fromOrder, fromOrders };
