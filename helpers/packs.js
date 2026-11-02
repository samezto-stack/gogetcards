/**
 * Pack sizes: a product sold only in multiples.
 *
 * The partner checkout charges whole rungs of a $49.99 ladder, so a
 * booster pack worth twelve dollars cannot be bought on its own. It can
 * be bought four at a time: the product's `price` is the price of the
 * pack of four (on the ladder, like any other price) and `packSize` says
 * how many units that pack holds. The storefront then shows the price of
 * ONE unit, steps the quantity by the pack, and the checkout, the
 * rotation and the order record keep counting in packs exactly as they
 * always have. Nothing about money changes; only what the customer reads.
 *
 * `quantity` on a cart line and an order is therefore PACKS. Every place
 * that shows a count to a person multiplies by the pack size first, so a
 * customer who bought two packs of four reads "8", which is what arrives.
 */

function of(product) {
  const n = parseInt(product && product.packSize, 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** Units in `packs` packs of this product. */
function units(packs, packSize) {
  const n = Math.max(1, parseInt(packSize, 10) || 1);
  return Math.max(0, parseInt(packs, 10) || 0) * n;
}

/** The per-unit price to display, in the smallest unit, from a pack price. */
function unitPrice(packPriceCents, packSize) {
  const n = Math.max(1, parseInt(packSize, 10) || 1);
  return Math.round((Number(packPriceCents) || 0) / n);
}

module.exports = { of, units, unitPrice };
