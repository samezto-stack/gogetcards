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

/**
 * The title with the pack in it: "… Booster Bundle (Pack of 3)". The pack
 * is what the buyer pays for, so it is in the name wherever the name is
 * shown — H1, <title>, breadcrumb, cards, JSON-LD and the feed — rather
 * than a detail discovered under the price. Placed before a " – detail"
 * tail when there is one. Nothing is appended when the title already
 * says it, or when the product is sold singly.
 */
function titleFor(product, base) {
  const n = of(product);
  const title = String(base == null ? (product && product.title) || '' : base).trim();
  if (n <= 1 || !title) return title;
  if (new RegExp(`\\b(pack of ${n}|${n}[- ]pack|x ?${n})\\b`, 'i').test(title)) return title;
  const dash = title.indexOf(' – ');
  return dash === -1 ? `${title} (Pack of ${n})` : `${title.slice(0, dash)} (Pack of ${n})${title.slice(dash)}`;
}

/** The pack picture (relative URL) for a pack product, '' for singles. */
function imageFor(product) {
  return require('../services/multipackImage').urlFor(product, '');
}

module.exports = { of, units, unitPrice, titleFor, imageFor };
