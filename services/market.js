/**
 * Resolving a market, and pricing a product in it.
 *
 * Everything that decides what a visitor sees goes through here, so there
 * is exactly one answer to "what does this product cost in this market"
 * and the page, the JSON-LD, the feed and the checkout all ask the same
 * function. They disagree the moment any of them computes it itself.
 *
 * ── THE MARKET COMES FROM THE URL. FULL STOP. ────────────────────────
 *
 * `/products/x` is the US market for everyone. `/ca/products/x` is Canada
 * for everyone. Not for Canadians — for everyone, including a shopper in
 * Berlin, including Googlebot, including a Merchant Center reviewer
 * fetching the landing page from an IP in a country you have never sold
 * to. The server's HTML for a URL does not vary by who asked.
 *
 * That is not caution, it is the requirement. Merchant Center validates a
 * feed row by fetching its `link` and comparing the price it finds. If
 * that fetch can land on a different currency than the feed claims —
 * because the fetcher's IP resolved somewhere else — the row is a price
 * mismatch, and the store cannot reproduce it or even see it happen.
 * Serving crawler and customer different prices from one URL is also the
 * definition of cloaking.
 *
 * So IP detection exists here for exactly one purpose: `suggest()`, which
 * powers a dismissible "looks like you're in Canada" banner offering a
 * LINK. Following it is a navigation to a different URL. Nothing about
 * the page it left has changed.
 *
 * ── A MARKET IS OFF UNLESS IT CAN BE CHARGED ─────────────────────────
 *
 * `sellable()` is the only list anything should use. It is the configured
 * markets intersected with the currencies the partner rotation can
 * actually bill in, because a market whose checkout would charge USD
 * against a CAD page is worse than a market that is closed.
 */

const markets = require('../config/markets');
const partnerRotation = require('./partnerRotation');
const SiteConfig = require('../models/SiteConfig');

/* The partner config decides which currencies can be charged, and it is
   read on every request that renders a price. Sixty seconds is short
   enough that switching a site on is effectively immediate and long
   enough that a crawl does not become a database read per page. */
let cache = { at: 0, config: null };
const TTL_MS = 60 * 1000;

async function partnerConfig() {
  if (cache.config && Date.now() - cache.at < TTL_MS) return cache.config;
  const config = await SiteConfig.getValue('partnerExperience', null);
  cache = { at: Date.now(), config };
  return config;
}

/** Drops the memo. Called when partner settings are saved. */
function invalidate() {
  cache = { at: 0, config: null };
}

/**
 * Markets that are configured on AND whose currency can be charged.
 *
 * The default market is never removed by the currency test. If the
 * rotation cannot charge USD then the store is broken for everybody and
 * the answer is not to silently unpublish the entire catalogue — the
 * checkout already refuses visibly, and that is where it should be
 * noticed.
 */
function sellable(config) {
  /* Keyed by MARKET, not currency: Germany needs German plan ids, not
     merely euro ones. Two euro countries sharing a ladder would pool
     their revenue and make a per-country campaign unmeasurable. */
  const served = new Set(partnerRotation.marketsServed(config));
  const def = markets.defaultMarket();
  return markets.configured().filter((m) => m.id === def.id || served.has(m.id));
}

async function sellableNow() {
  return sellable(await partnerConfig());
}

/** A market by prefix, but only if it is actually sellable. */
function fromPrefix(prefix, list) {
  const m = markets.byPrefix(prefix);
  if (!m) return null;
  return (list || []).some((s) => s.id === m.id) ? m : null;
}

/**
 * What a product costs in a market.
 *
 * Returns null when the product is NOT SOLD in that market, which is a
 * different thing from being out of stock: no price row means no offer,
 * so the product is left out of that market's feed and its market URL
 * does not resolve. Nothing is converted and nothing falls back to the
 * US price — a fallback is how a page ends up quoting a number the
 * checkout cannot charge.
 */
function priceFor(product, market) {
  if (!product || !market) return null;
  const def = markets.defaultMarket();

  if (market.id === def.id) {
    /* The default market reads the base `price` field, untouched. Every
       existing product is therefore already priced in it, with no
       migration and no per-market row to add. */
    return {
      market: market.id,
      currency: market.currency,
      amount: Number(product.price) || 0,
      compareAmount: Number(product.comparePrice) || 0,
      available: product.available !== false,
    };
  }

  const row = (product.marketPrices || [])
    .find((r) => String(r.market || '').toUpperCase() === market.id);
  if (!row || !(Number(row.amount) > 0)) return null;

  return {
    market: market.id,
    currency: market.currency,
    amount: Math.round(Number(row.amount)),
    compareAmount: Math.round(Number(row.compareAmount) || 0),
    /* Both have to hold: withdrawing a product everywhere must not need
       every market's row edited. */
    available: product.available !== false && row.available !== false,
  };
}

/** Formatted for display, in the market's own currency convention. */
function display(priced) {
  return priced ? markets.format(priced.amount, priced.currency) : '';
}

/**
 * The highest quantity the checkout can actually charge for, in this
 * market's currency.
 *
 * Same reasoning as the single-market version it generalises: a ladder
 * has twelve rungs, so a product costing three of them tops out at four.
 * Asking with the wrong market would read the wrong ladder and offer a
 * quantity that cannot be billed.
 */
function maxQuantity(config, product, market) {
  const priced = priceFor(product, market);
  if (!priced) return 0;
  return partnerRotation.maxQuantityAcross(config, product, {
    amount: priced.amount,
    market: market.id,
  });
}

/**
 * Every market this product is genuinely offered in, for hreflang.
 *
 * ONLY MARKETS WITH A PRICE. An hreflang pointing at a URL that 404s is
 * a broken cluster, and Google drops the whole set rather than the one
 * bad entry.
 */
function alternatesFor(product, list) {
  return (list || []).filter((m) => !!priceFor(product, m));
}

/**
 * A market to SUGGEST, from the request. Never authoritative.
 *
 * Reads whatever country hint the CDN put on the request. There is no
 * IP-to-country lookup here on purpose: if the header is absent the
 * answer is null and no banner is shown, which is the safe way to fail —
 * a missing suggestion costs a click, a wrong one sends somebody to the
 * wrong currency.
 */
function suggest(req, list) {
  const cc = String(
    req.get('CF-IPCountry')
    || req.get('X-Vercel-IP-Country')
    || req.get('X-Country-Code')
    || ''
  ).toUpperCase();
  if (!cc || cc === 'XX' || cc === 'T1') return null;
  const m = markets.byCountry(cc);
  if (!m) return null;
  return (list || []).some((s) => s.id === m.id) ? m : null;
}

const COOKIE = 'ztcg_market';

/**
 * The market the visitor last chose, if it is still sellable.
 *
 * KEPT IN THE SESSION, not a cookie, because the session already exists
 * and a preference stored anywhere else would be a second thing to expire.
 * It is only ever a SUGGESTION: it decides whether the banner offers a
 * different storefront, never what a URL renders. A remembered preference
 * that could override the path would reintroduce exactly the problem the
 * prefix scheme removes — one URL, two prices.
 */
function remembered(req, list) {
  const id = (req.session && req.session.market)
    || (req.cookies && req.cookies[COOKIE]);
  if (!id) return null;
  const m = markets.byId(id);
  return m && (list || []).some((s) => s.id === m.id) ? m : null;
}

/** Records the visitor's choice, so the banner stops arguing with them. */
function remember(req, market) {
  if (req.session && market) req.session.market = market.id;
}

module.exports = {
  COOKIE,
  partnerConfig, invalidate,
  sellable, sellableNow, fromPrefix,
  priceFor, display, maxQuantity, alternatesFor,
  suggest, remembered, remember,
};
