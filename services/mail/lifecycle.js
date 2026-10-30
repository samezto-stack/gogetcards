/**
 * The bridge between something happening to an order and the customer
 * being told about it.
 *
 * ONE FUNCTION PER EVENT, and every one of them does the same four
 * things: load the product, build the view, mint a fresh access link,
 * send. Putting that sequence in each caller instead would mean the
 * admin's dispatch handler and the pipeline's confirmation handler each
 * deciding independently how to look up a product and how long a link
 * should live, which is how two emails about the same order end up
 * disagreeing about what it contains.
 *
 * A FRESH LINK PER EMAIL, never a reused one. The button in a dispatch
 * notice must not be the same token as the one in the confirmation:
 * that token was already spent when the customer opened the
 * confirmation, so a shared link would arrive dead. It costs one row.
 *
 * NOTHING HERE THROWS AND NOTHING HERE BLOCKS ANYTHING IMPORTANT. Every
 * caller is finishing a payment, saving a fulfilment or cancelling an
 * order. An email that cannot be sent is a row in /admin/emails with a
 * Retry button, not a failed request.
 */

const Product = require('../../models/Product');
const Customer = require('../../models/Customer');
const preorderCfg = require('../../config/preorder');
const orderReference = require('../../helpers/orderReference');
const customerAuth = require('../customerAuth');
const mail = require('./index');
const view = require('./view');
const templates = require('./templates');

/**
 * Everything an order email needs, assembled once.
 * Returns null when there is nothing worth sending to.
 */
async function context(order, extra = {}) {
  if (!order || !order.customerEmail) return null;

  let product = null;
  try {
    if (order.productSlug) product = await Product.findOne({ slug: order.productSlug }).lean();
  } catch (err) {
    /* A missing product costs the photo and the release date. It must
       not cost the customer their confirmation. */
    console.error('[mail/lifecycle] product lookup failed:', err.message);
  }

  const reference = orderReference(order);

  let accessUrl = null;
  let linkId = null;
  try {
    const issued = await customerAuth.issueOrderLink(order.customerEmail, reference);
    if (issued) { accessUrl = issued.url; linkId = issued.linkId; }
  } catch (err) {
    console.error('[mail/lifecycle] could not mint an access link:', err.message);
  }

  let customerId = null;
  try {
    const c = await Customer.findOne({ email: Customer.normaliseEmail(order.customerEmail) })
      .select('_id').lean();
    customerId = c ? c._id : null;
  } catch { /* the log row is still useful without it */ }

  return {
    data: view.fromOrder(order, product, Object.assign(accessUrl ? { accessUrl } : {}, extra)),
    to: order.customerEmail,
    orderId: order.orderId,
    orderRef: reference,
    customer: customerId,
    linkId,
  };
}

/** Wraps the four-step sequence so no caller can get it half right. */
function event(type, { once = true } = {}) {
  return async function fire(order, extra = {}) {
    try {
      const ctx = await context(order, extra);
      if (!ctx) return { ok: false, status: 'skipped' };
      const resolved = typeof type === 'function' ? type(ctx.data) : type;
      const fn = once ? mail.sendOnce : mail.send;
      /* ctx carries linkId; services/mail does the attribution, so the
         retry path and the test send get it too. */
      return await fn(resolved, ctx);
    } catch (err) {
      console.error(`[mail/lifecycle] ${String(type)} failed:`, err.message);
      return { ok: false, status: 'failed', error: err.message };
    }
  };
}

module.exports = {
  /**
   * The confirmation, chosen by what the order actually is.
   *
   * A preorder and an in-stock order get different templates and the
   * decision is made from the product record, not from anything the
   * caller passes — so a caller that has not thought about preorders
   * cannot accidentally promise a delivery window for a set that has
   * not been printed.
   */
  orderConfirmation: event((data) => templates.confirmationFor(data)),

  /* Dispatch. Once per order — re-saving a tracking number to fix a
     typo must not send a second "your order has shipped". */
  shipped: event('shipped'),

  /* Tracking that turned up after dispatch. Also once: this is the
     "we promised you a number, here it is" email. */
  trackingAvailable: event('trackingAvailable'),

  cancellation: event('cancellation'),
  refundInitiated: event('refundInitiated'),
  refundCompleted: event('refundCompleted'),

  /* Release dates move more than once, and each move is news. This is
     the one event that may legitimately repeat, so it does not go
     through the once-per-order guard. */
  releaseUpdate: event('releaseUpdate', { once: false }),

  /* A cancelled order the customer chose to keep before its refund went
     out. Once per order: the button that fires it is single-use by
     construction, but a double-submit must not say it twice. */
  reinstated: event('reinstated'),

  /** Exposed for the preview and the admin retry. */
  context,
  /** Formats a release date the way the emails do, for admin summaries. */
  releaseDisplay(product) {
    const info = preorderCfg.releaseInfo(product);
    return info.hasDate ? info.display : (info.window || null);
  },
};
