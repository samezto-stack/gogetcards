/**
 * Stock follows paid orders.
 *
 * Until now Product.stock was never touched by a sale: it fed the "Only N
 * left" meter and nothing else, so two buyers could both pay for the last
 * unit and an allocation could oversell by any factor. This runs once per
 * NEW order (the pipeline is idempotent on orderId, so a refresh of the
 * thank-you page cannot decrement twice) and does one atomic, conditional
 * decrement per order.
 *
 * Semantics of `stock`, kept deliberately simple:
 *   - 0 and never sold through this ledger: "not counted" — nothing here
 *     changes, nothing is enforced (the catalogue's historical state);
 *   - N > 0: counted in PACKS (the unit the checkout charges). A sale of
 *     q packs needs stock >= q; the decrement is conditional so a race
 *     between two buyers can only ever succeed for one of them;
 *   - reaching 0 through a sale sets stockHold, which refuses further
 *     checkouts at the payment step and offers supersededBy, while the
 *     page and feed keep reading from `available` (the owner's chosen
 *     sold-out behaviour, see models/Product.js). Untick Available to
 *     make it honest everywhere.
 *
 * If a decrement cannot be satisfied (stock < q at the moment of sale) the
 * order still stands — the customer has paid — but it is stamped OVERSOLD
 * in its note and stock is pinned at 0 with stockHold set, so the admin
 * sees it on the order and nobody else can buy the phantom unit.
 */
const Product = require('../../models/Product');
const Order = require('../../models/Order');

async function consume(order) {
  const slug = order && order.productSlug;
  const qty = Math.max(1, parseInt(order && order.quantity, 10) || 1);
  if (!slug) return { tracked: false };
  const product = await Product.findOne({ slug }).select('stock stockHold').lean();
  if (!product || typeof product.stock !== 'number' || product.stock <= 0) return { tracked: false };

  const r = await Product.updateOne({ slug, stock: { $gte: qty } }, { $inc: { stock: -qty } });
  if (r.modifiedCount === 1) {
    const after = await Product.findOne({ slug }).select('stock').lean();
    if (after && after.stock <= 0) await Product.updateOne({ slug }, { $set: { stock: 0, stockHold: true } });
    return { tracked: true, oversold: false, remaining: after ? after.stock : null };
  }
  await Product.updateOne({ slug }, { $set: { stock: 0, stockHold: true } });
  await Order.updateOne({ _id: order._id }, { $set: { note: `OVERSOLD: paid for ${qty} but stock was ${product.stock}. ${order.note || ''}`.trim() } });
  console.error(`[stock] OVERSOLD ${slug}: order ${order.orderId} paid for ${qty}, stock was ${product.stock}`);
  return { tracked: true, oversold: true, remaining: 0 };
}

module.exports = { consume };
