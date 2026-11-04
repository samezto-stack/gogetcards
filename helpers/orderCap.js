/**
 * The most of one product a customer can buy in one order.
 *
 * The partner checkout sells a ladder of 24 equal steps of $49.99, so no
 * single order line can be charged more than 24 × $49.99 = $1,199.76:
 * there is no plan above it. The cap in quantity therefore follows the
 * price: a $199.96 pack can be bought 6 at a time, a $49.99 product 24,
 * a $1,199.76 case only 1. Quantity is in PACKS, like `price`.
 *
 * `allocationLimit` on the product can make the limit smaller (12 on a
 * $49.99 product reads as scarcer than 24); it can never make it larger
 * than the ladder allows. 0 on the product means "no extra limit".
 */
const MAX_ORDER_CENTS = 24 * 4999;

function maxQuantity(product, priceCents) {
  const price = Number(priceCents != null ? priceCents : (product && product.price)) || 0;
  const byTotal = price > 0 ? Math.max(1, Math.floor(MAX_ORDER_CENTS / price)) : 0;
  const alloc = parseInt(product && product.allocationLimit, 10) || 0;
  if (alloc > 0 && byTotal > 0) return Math.min(alloc, byTotal);
  return alloc > 0 ? alloc : byTotal;
}

/** The cap applied to a requested quantity (0 means no cap known). */
function clamp(product, requestedQty, priceCents) {
  const qty = Math.max(1, parseInt(requestedQty, 10) || 1);
  const max = maxQuantity(product, priceCents);
  return max > 0 ? Math.min(qty, max) : qty;
}

module.exports = { MAX_ORDER_CENTS, maxQuantity, clamp };
