/**
 * A human-readable order reference, derived from the order id.
 *
 * WHY DERIVED RATHER THAN STORED, AND WHY orderId IS LEFT ALONE:
 * `orderId` is the payment provider's own identifier — `whop_pay_MYUR2yPi5hiWdI`
 * — and it is load-bearing in three places. It is the unique index on Order,
 * it is the idempotency key that stops a refreshed confirmation page creating
 * a second order, and it is what PendingPayment matches on to close the loop
 * between "the host says this was paid" and "the customer's browser arrived".
 * Renaming it would be a data migration wearing a cosmetic change's clothing.
 *
 * So this is an alias, not a replacement. `orderId` remains the key; this is
 * what the customer reads, quotes in an email, and can actually remember.
 *
 * DETERMINISTIC ON PURPOSE. The same order always produces the same
 * reference, which means:
 *   - it works retroactively for every order already in the database,
 *     with no migration and no backfill,
 *   - support can recompute it from an order id and vice versa by scanning,
 *   - nothing has to be written at checkout time, so no code on the payment
 *     path changes to support it.
 *
 * The number is a hash, not a counter. A sequential counter would publish
 * the store's exact order volume on every receipt — order #14 tells a
 * customer spending $300 rather more than you would choose to tell them.
 *
 * COLLISIONS. Five digits is 90,000 possible references, so distinct orders
 * can collide, and at a few thousand orders that stops being hypothetical.
 * This is deliberate and safe: the reference is a display alias for a human
 * to quote, never a lookup key. Support resolves it against the customer's
 * email or the order date, exactly as they would with a name. If the store
 * ever wants guaranteed uniqueness, that is a stored sequence, and it should
 * be introduced as one rather than by widening this.
 */

const crypto = require('crypto');

const PREFIX = 'GGC';

/* 10000–99999. The floor keeps every reference the same width, so they line
   up in a column and none of them reads as truncated. */
const FLOOR = 10000;
const SPAN = 90000;

/**
 * @param {object|string} order  an Order document, or an order id
 * @returns {string} e.g. "GGC-46571", or '' when there is nothing to derive from
 */
function orderReference(order) {
  const id = typeof order === 'string' ? order : (order && (order.orderId || order.paymentId));
  if (!id) return '';
  const digest = crypto.createHash('sha1').update(String(id)).digest();
  /* readUInt32BE over the first four bytes, then modulo into the span. The
     bias from modulo is irrelevant for a display label. */
  const n = FLOOR + (digest.readUInt32BE(0) % SPAN);
  return `${PREFIX}-${n}`;
}

module.exports = orderReference;
module.exports.PREFIX = PREFIX;
