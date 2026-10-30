/**
 * Cancelling an order on a customer's behalf.
 *
 * ONE IMPLEMENTATION, because there are now two places staff can do it —
 * the orders list and the customer page — and a cancellation that
 * queues a refund from one button but not the other is the kind of
 * difference nobody notices until somebody is owed money and has not
 * been told.
 *
 * THE EMAIL IS PART OF THE TRANSITION, not something the caller
 * remembers to do afterwards. A cancelled order the customer was never
 * told about is worse than no cancellation feature: they find out when
 * the parcel does not arrive.
 *
 * IT MOVES NO MONEY. `refundStatus` becomes 'processing', which means
 * "a human owes this and has been told". The actual refund is issued by
 * hand in the payment provider, and only then does an admin mark it
 * sent. The customer's email says exactly that.
 */

const lifecycle = require('./mail/lifecycle');

/**
 * @param {object} order   a live Order document (not a lean object)
 * @param {object} opts
 * @param {string} [opts.reason]  recorded verbatim, shown to staff only
 * @param {string} [opts.by]      'admin' | 'customer'
 * @returns {Promise<{ok: boolean, changed: boolean, reason?: string}>}
 */
async function cancelOrder(order, { reason = '', by = 'admin' } = {}) {
  if (!order) return { ok: false, changed: false, reason: 'no_order' };

  /* Refused rather than quietly ignored. A parcel already with a
     carrier cannot be un-sent, and recording it as cancelled would put
     the order record and the real world into disagreement — with the
     customer holding an email saying their money is coming back. */
  if (order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'delivered') {
    return { ok: false, changed: false, reason: 'already_shipped' };
  }

  /* Idempotent. Pressing Cancel twice, or on a stale tab, must not send
     a second cancellation email or reset the refund clock. */
  if (order.cancelledAt) return { ok: true, changed: false, reason: 'already_cancelled' };

  const now = new Date();
  order.cancelledAt = now;
  order.cancellationRequestedAt = order.cancellationRequestedAt || now;
  order.cancelledBy = by;
  order.cancellationReason = String(reason || '').slice(0, 200);
  order.status = 'cancelled';

  if (order.refundStatus === 'none') {
    order.refundStatus = 'processing';
    order.refundInitiatedAt = now;
    order.refundAmount = order.totalPrice || 0;
  }

  await order.save();

  /* Not awaited. The record is the thing that must be right; the
     customer being told is important but must not be able to fail the
     click or make somebody press Cancel twice. The attempt is a row in
     /admin/emails either way, with a Retry button if it did not land. */
  lifecycle.cancellation(order).catch(() => {});

  return { ok: true, changed: true };
}

module.exports = { cancelOrder };
