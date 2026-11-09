/**
 * The store's side of the Google Ads picture, per country, in one place.
 *
 * WHY THIS EXISTS. Google Ads knows what you SPENT and how many clicks it
 * bought; it does not know what those clicks were worth once they reached
 * the shop. This store does — every order carries the market it sold into
 * and the channel the buyer arrived from, and every page view carries its
 * country and source. So this joins the two things Ads cannot: revenue and
 * orders, attributed to Google Ads clicks, split by the countries you run
 * ads for. Paste your spend next to it and you have ROAS per country.
 *
 * WHAT COUNTS AS AN AD CLICK. `detectSource` (middleware/tracking.js) files
 * a visit as 'Google Ads' the moment it arrives with a `gclid` or
 * `gad_source` on the URL — which is exactly what Google appends to an ad
 * click and nothing else does. Organic Google is 'Google', kept separate.
 * The order's `trafficSource` is resolved from that same click, so an order
 * is credited to Google Ads only when the buyer's checkout click was an ad
 * click. Test orders are excluded by the same constant every other report
 * uses, so this can never disagree with /admin/analytics.
 *
 * TWO DIMENSIONS, ONE HONEST SEAM. Orders are grouped by the storefront that
 * sold them (`order.market`, authoritative). Sessions come from page views,
 * which carry a geo-IP country, not a storefront — so sessions are mapped
 * country → market. For the UK, Canada and the US the two line up (a UK
 * visitor lands on the /uk storefront and orders in GBP); the EU bucket is
 * the several countries that share the € storefront. The conversion rate is
 * therefore ads-orders over ads-sessions-in-that-geo, which is the right
 * shape for planning and is labelled as such in the UI rather than being
 * dressed up as something more precise than it is.
 *
 * NOTHING HERE IS INVENTED. A market with no ad orders returns zeroes, not a
 * plausible guess, and the page says the window is empty rather than filling
 * it in.
 */

const Order = require('../../models/Order');
const Event = require('../../models/Event');
const markets = require('../../config/markets');
const fx = require('../fx');
const testOrder = require('../testOrder');

/* The value detectSource writes for an ad click. An array so a second
   spelling (should Google ever change it) can be added without touching the
   pipelines. Organic 'Google' is deliberately NOT here. */
const AD_SOURCES = ['Google Ads', 'Google Ads Partners'];

/** How many top products to name per country. */
const TOP_N = 3;

function eventMatch(win, extra = {}) {
  return { createdAt: { $gte: win.startDate, $lt: win.endDate }, ...extra };
}
function orderMatch(win, extra = {}) {
  return {
    createdAt: { $gte: win.startDate, $lt: win.endDate },
    ...testOrder.EXCLUDE_FROM_REPORTING,
    ...extra,
  };
}

/**
 * Cents in a market's own currency → cents in USD, using the courtesy FX
 * table. Only ever used for the cross-country comparison total; each
 * country's own figure stays in its own currency, which is what actually
 * hit the account. Guarded so a missing or nonsense rate falls back to the
 * raw figure rather than dividing by zero.
 */
function toUsdCents(cents, currencyCode) {
  if (!cents) return 0;
  if (currencyCode === 'USD') return cents;
  const { rates } = fx.snapshot();
  const rate = rates && rates[currencyCode];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return cents; // best effort
  return Math.round(cents / rate); // rate is USD→currency, so divide back
}

/**
 * The whole report for one window: a row per advertised market, plus a USD
 * total across them.
 */
async function adsByMarket(win) {
  /* Only the markets that are switched on — the countries you actually run
     ads for. All four are enabled today; this follows the config so opening
     or closing a market never leaves a stale row here. */
  const advertised = markets.configured();

  const [orderRows, sessionRows, productRows] = await Promise.all([
    Order.aggregate([
      { $match: orderMatch(win, { status: 'completed', trafficSource: { $in: AD_SOURCES } }) },
      { $group: { _id: '$market', orders: { $sum: 1 }, revenueCents: { $sum: '$totalPrice' } } },
    ]),

    /* Distinct (country, session) pairs, counted in two stages so no giant
       array of session ids is ever built in memory. */
    Event.aggregate([
      { $match: eventMatch(win, { type: 'page_view', source: { $in: AD_SOURCES }, sessionId: { $nin: [null, ''] } }) },
      { $group: { _id: { c: '$country', s: '$sessionId' } } },
      { $group: { _id: '$_id.c', sessions: { $sum: 1 } } },
    ]),

    Order.aggregate([
      { $match: orderMatch(win, { status: 'completed', trafficSource: { $in: AD_SOURCES } }) },
      { $unwind: '$products' },
      { $group: { _id: { m: '$market', p: '$products' }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $group: { _id: '$_id.m', items: { $push: { name: '$_id.p', n: '$n' } } } },
    ]),
  ]);

  const ordersByMarket = new Map(orderRows.map((r) => [String(r._id || '').toUpperCase(), r]));
  const productsByMarket = new Map(productRows.map((r) => [String(r._id || '').toUpperCase(), r.items]));

  /* Sessions arrive keyed by geo country; fold them up to the market that
     country belongs to. A click from a country no market serves is dropped
     from the per-market view — it is not a country you advertise in. */
  const sessionsByMarket = new Map();
  for (const row of sessionRows) {
    const market = markets.byCountry(row._id);
    if (!market) continue;
    sessionsByMarket.set(market.id, (sessionsByMarket.get(market.id) || 0) + row.sessions);
  }

  const rows = advertised.map((m) => {
    const o = ordersByMarket.get(m.id) || { orders: 0, revenueCents: 0 };
    const sessions = sessionsByMarket.get(m.id) || 0;
    const orders = o.orders || 0;
    const revenueCents = o.revenueCents || 0;
    return {
      id: m.id,
      name: m.name,
      flag: m.flag,
      currency: m.currency,
      sessions,
      orders,
      revenueCents,
      revenueUsdCents: toUsdCents(revenueCents, m.currency),
      aovCents: orders ? Math.round(revenueCents / orders) : 0,
      /* orders per session, as a percentage. Null — not zero — when there
         were no sessions, so "no ad traffic" reads differently from "traffic
         that never converted". */
      conversionRate: sessions ? (orders / sessions) * 100 : null,
      topProducts: (productsByMarket.get(m.id) || []).slice(0, TOP_N),
    };
  });

  const totalUsdCents = rows.reduce((s, r) => s + r.revenueUsdCents, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);

  return {
    rows,
    total: {
      revenueUsdCents: totalUsdCents,
      orders: totalOrders,
      sessions: totalSessions,
      aovUsdCents: totalOrders ? Math.round(totalUsdCents / totalOrders) : 0,
      conversionRate: totalSessions ? (totalOrders / totalSessions) * 100 : null,
    },
    fxUpdatedAt: fx.snapshot().updatedAt,
    empty: totalOrders === 0 && totalSessions === 0,
  };
}

module.exports = { adsByMarket, AD_SOURCES };
