/* ── Order Parser ─────────────────────────────────────────
   Step 1 of the post-purchase pipeline. Takes the raw query-string
   parameters from a Thank You page redirect and produces a plain,
   trimmed object. Adding a new field later only means adding a line
   here — nothing downstream needs to change shape.
*/

const FIELDS = [
  'order_id', 'email', 'first_name', 'last_name',
  'address1', 'address2', 'city', 'state', 'zip', 'country', 'phone',
  'product', 'product_slug', 'product_image', 'price', 'currency', 'quantity',
  /* The ORDER TOTAL, sent explicitly. `price` has always been a unit
     price that the model multiplies by quantity, which works only when
     the caller can state a unit price. Bundle plans cannot: a partner
     checkout is told "6 rounds for $899.94" and never learns the
     per-unit figure, so it had to send quantity: 1 and put the bundle
     total in `price` to keep the arithmetic right. That is why every
     partner order recorded a quantity of 1. When total_price is present
     it is used verbatim and no multiplication happens. */
  'total_price',
  'store', 'checkout_id', 'purchase_date', 'payment_provider', 'payment_id',
  // The zcid handed out by trackCheckoutReached() at the original
  // checkout-click on gogetcards — forwarded verbatim through the whole
  // Partner Experience round trip (see partner.html's buildThankYouFields)
  // so the pipeline can look back up the true traffic-source attribution
  // captured at that moment (see routes/frontend.js's resolveTrafficSource).
  'zcid',
];

function parseOrderParams(query = {}) {
  const raw = {};
  for (const field of FIELDS) {
    const value = query[field];
    raw[field] = typeof value === 'string' ? value.trim() : (value ?? null);
  }
  return raw;
}

module.exports = { parseOrderParams, FIELDS };
