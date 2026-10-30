/* ── Order Model Builder ──────────────────────────────────
   Step 5. Assembles the exact document shape services/orderService will
   persist into the existing Order collection, from the parsed params,
   normalized customer, and detected source. Kept separate from the
   Mongoose schema (models/Order.js) so this stays a pure data-shaping
   step that's easy to unit test.
*/

const markets = require('../../config/markets');

/* Which storefront a currency belongs to. One market per currency here, so
   this is exact; it returns null rather than guessing if that ever stops
   being true. */
function marketForCurrency(code) {
  const c = String(code || '').toUpperCase();
  const hits = markets.MARKETS.filter((m) => m.currency === c);
  return hits.length === 1 ? hits[0].id : null;
}

function toCents(price) {
  const n = Number(price);
  if (!price || isNaN(n)) return 0;
  return Math.round(n * 100);
}

function buildOrderData(raw, customer, sourceInfo, trafficSource) {
  const quantity = Math.max(1, parseInt(raw.quantity, 10) || 1);
  const unitPriceCents = toCents(raw.price);

  /* An explicit total wins over unit-price-times-quantity.
   *
   * Callers that know a unit price keep the old behaviour untouched:
   * without total_price this is exactly `unitPriceCents * quantity` as
   * before, so every existing integration is unaffected.
   *
   * Callers that only know a bundle total — a partner checkout sold
   * "6 rounds for $899.94", which never learns the per-unit figure —
   * send total_price and the real quantity. Deriving a unit price by
   * dividing is not an option: bundle pricing is not required to be
   * linear, and dividing money reintroduces rounding at exactly the
   * point where it turns into a wrong charge on the books. */
  const currency = String(raw.currency || 'USD').toUpperCase();

  const explicitTotalCents = toCents(raw.total_price);
  const totalPrice = explicitTotalCents > 0 ? explicitTotalCents : unitPriceCents * quantity;

  return {
    orderId: raw.order_id,
    totalPrice,
    currency,
    /* DERIVED FROM THE CURRENCY when the payload does not say. The partner
       page has never sent `market`, so this defaulted to 'US' on every
       partner order — including the ones taken in euros. Each storefront
       has exactly one currency, so the currency identifies the market
       unambiguously and is a better answer than a constant.

       An explicit `market` still wins: this is a fallback, not an
       override, so a caller that knows better is never second-guessed. */
    market: (raw.market || marketForCurrency(currency) || 'US').toUpperCase(),
    customerName: customer.fullName,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    products: raw.product ? [raw.product] : [],
    productSlug: raw.product_slug || '',
    productImage: raw.product_image || '',
    quantity,
    shippingAddress: customer.shippingAddress,
    firstName: customer.firstName,
    lastName: customer.lastName,
    address1: customer.address1,
    address2: customer.address2,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    country: customer.country,
    status: 'completed',
    financialStatus: 'paid',
    paymentGateway: raw.payment_provider || sourceInfo.source,
    paymentProvider: raw.payment_provider || sourceInfo.source,
    paymentId: raw.payment_id || '',
    checkoutId: raw.checkout_id || '',
    /* Kept under its own name because raw.checkout_id above is Whop's plan
       id, not ours. See the field comment in models/Order.js. */
    zcid: raw.zcid || '',
    source: sourceInfo.source,
    trafficSource: trafficSource || '',
    purchaseDate: raw.purchase_date ? new Date(raw.purchase_date) : new Date(),
    importedFrom: sourceInfo.source !== 'direct' ? sourceInfo.source : '',
    importTimestamp: sourceInfo.source !== 'direct' ? new Date() : null,
    originalCheckoutMethod: raw.store || '',
  };
}

module.exports = { buildOrderData, toCents };
