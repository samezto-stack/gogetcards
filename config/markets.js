/**
 * Markets: the single source of truth for country, currency and URL.
 *
 * A MARKET IS NOT A CURRENCY TOGGLE. It is the tuple that has to stay
 * identical across five surfaces that Google compares against each other:
 *
 *     URL  →  visible price  →  JSON-LD Offer  →  feed row  →  the charge
 *
 * Every one of those is derived from this file plus the product's own
 * per-market price. Nothing in the request — not the IP, not the
 * Accept-Language header, not a cookie — is allowed to change any of them.
 * A given URL renders the same market for a shopper in Toronto, a shopper
 * in Berlin and Googlebot, byte for byte. That property is what makes the
 * system safe to submit to Merchant Center, and it is the reason country
 * detection in this codebase can only ever SUGGEST a market (a dismissible
 * banner) and never select one.
 *
 * ── THE INVARIANT THAT ACTUALLY MATTERS ──────────────────────────────
 *
 * A market may only be enabled when the checkout holds ITS OWN plan
 * ladder. The charge is a Whop plan id, and a plan id is where the money
 * lands — so a market with no ladder of its own has no plan that could be
 * correct, and one borrowed from another country would both charge the
 * wrong amount and credit the wrong campaign.
 *
 * `enabled: true` is therefore not sufficient on its own. services/market
 * intersects this list with partnerRotation.marketsServed(), and a market
 * that fails that test is treated as switched off however it is configured
 * here. scripts/audit/check-markets.js asserts it, so a half-open market
 * fails the suite rather than reaching a customer.
 *
 * ── WHY US KEEPS THE BARE URL ────────────────────────────────────────
 *
 * `/products/x` is the US market. Every other market is prefixed:
 * `/ca/products/x`, `/gb/products/x`. The alternative — moving the US to
 * `/us/products/x` — would rewrite every indexed URL, every existing
 * Merchant Center listing and every backlink the store has, in exchange
 * for symmetry. Google documents the bare-root-plus-subdirectory shape as
 * a supported locale layout, so the tidier-looking option costs real
 * ranking for no compliance gain.
 *
 * Adding a market is: add an entry here, load a plan ladder under its id,
 * set its prices on the products. No application code changes.
 */

/* Currency display. Amounts are stored in the currency's smallest unit
   everywhere — cents, pence. `decimals` exists so a zero-decimal currency
   can be added later without every caller learning about it; all four
   supported today have two. */
const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', prefix: 'US$', decimals: 2 },
  CAD: { code: 'CAD', symbol: '$', prefix: 'CA$', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', prefix: '£', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', prefix: '€', decimals: 2 },
};

/* ── The markets ──────────────────────────────────────────────────────
 *
 * A MARKET IS A STOREFRONT: one URL tree, one currency, one price list.
 * A COUNTRY IS A FEED: one Merchant Center feed, one campaign, one budget.
 * They are not the same thing, and conflating them is what makes this
 * either twenty near-identical URL trees or one feed nobody can campaign.
 *
 * So the euro area is ONE market at `/eu` serving six countries from one
 * page, one euro price and ONE feed. A Merchant Center feed may serve
 * several countries as long as its currency is accepted in all of them,
 * and that is what a currency zone is.
 *
 * ONE FEED IS NOT ONE CAMPAIGN. Country targeting is a campaign setting in
 * Google Ads, so six campaigns with six budgets can all point at this one
 * feed. An earlier version generated a feed per country to make that
 * possible; it was not necessary, and it was six submissions to keep in
 * step where one will do.
 *
 * THE COUNTRIES ARE THE ONES WHERE AN ENGLISH STOREFRONT ACTUALLY WORKS.
 * Ireland is English-speaking; the Netherlands has the highest non-native
 * English proficiency in the EU; Germany, Belgium, Austria and Finland are
 * high-proficiency markets with real TCG demand. France, Italy, Spain,
 * Portugal and Greece are deliberately absent — lower willingness to check
 * out in a foreign language, and in France the Loi Toubon requires French
 * for the offer and presentation of goods sold to French consumers, which
 * an English-only storefront does not satisfy. Adding one later is a line
 * in `countries`, plus a shipping region that covers it.
 *
 * `id`             internal key. Stored on orders and events, and the key
 *                  a partner site files its plan ladder under.
 * `prefix`         URL segment. '' is the default market, and unique.
 * `countries`      every country this storefront serves. Drives hreflang,
 *                  the feed's shipping rows, and the suggestion banner.
 * `feedLabel`      the label its ONE Merchant Center feed is filed under.
 * `locale`         hreflang base. Per-country variants are derived.
 */
const MARKETS = [
  {
    id: 'US', name: 'United States', flag: '🇺🇸',
    prefix: '', currency: 'USD', locale: 'en-US', language: 'en',
    countries: ['US'], feedLabel: 'US',
    isDefault: true,
    enabled: true,
  },
  {
    id: 'CA', name: 'Canada', flag: '🇨🇦',
    prefix: 'ca', currency: 'CAD', locale: 'en-CA', language: 'en',
    countries: ['CA'], feedLabel: 'CA',
    /* Off at launch. GoGetCards sells in the US first; switch on only once
       every active partner site carries this market's full plan ladder and
       the products carry prices on its grid. */
    enabled: false,
  },
  {
    /* id UK, country GB. The URL says /uk because that is what people
       type and recognise; the feed and hreflang say GB because that is
       the ISO code and Google accepts nothing else. */
    id: 'UK', name: 'United Kingdom', flag: '🇬🇧',
    prefix: 'uk', currency: 'GBP', locale: 'en-GB', language: 'en',
    countries: ['GB'], feedLabel: 'GB',
    /* VAT-INCLUSIVE, like every consumer price shown in the UK and the
       euro area. The stored price is what the customer pays; nothing is
       added at checkout. */
    taxIncluded: true,
    /* Off at launch. GoGetCards sells in the US first; switch on only once
       every active partner site carries this market's full plan ladder and
       the products carry prices on its grid. */
    enabled: false,
  },
  {
    id: 'EU', name: 'Europe', flag: '🇪🇺',
    prefix: 'eu', currency: 'EUR', locale: 'en-150', language: 'en',
    countries: ['DE', 'NL', 'IE', 'BE', 'AT', 'FI'],
    /* An arbitrary label rather than a country code, because this feed
       serves six of them. The countries it runs in are set on the
       campaign, which is where country targeting belongs. */
    feedLabel: 'EU',
    taxIncluded: true,
    /* Off at launch. GoGetCards sells in the US first; switch on only once
       every active partner site carries this market's full plan ladder and
       the products carry prices on its grid. */
    enabled: false,
  },
];

const BY_ID = new Map(MARKETS.map((m) => [m.id, m]));
const BY_PREFIX = new Map(MARKETS.map((m) => [m.prefix, m]));

/** The market a URL prefix names, or null. '' resolves to the default. */
function byPrefix(prefix) {
  return BY_PREFIX.get(String(prefix || '').toLowerCase()) || null;
}

function byId(id) {
  return BY_ID.get(String(id || '').toUpperCase()) || null;
}

/** The market serving a country code, or null. */
function byCountry(code) {
  const cc = String(code || '').toUpperCase();
  if (!cc) return null;
  return MARKETS.find((m) => m.countries.includes(cc)) || null;
}

/**
 * Every Merchant Center feed that should exist: one per storefront.
 *
 * Which is one per currency, since a storefront has exactly one. The
 * countries a feed runs in are a campaign setting, not a feed property.
 */
function feeds(list) {
  return (list || MARKETS).map((m) => ({
    market: m, label: m.feedLabel, countries: m.countries,
    url: m.isDefault ? '/feed/google.xml' : `/feed/${m.prefix}/google.xml`,
  }));
}

function defaultMarket() {
  return MARKETS.find((m) => m.isDefault) || MARKETS[0];
}

/** Configured as on. NOT the same as sellable — see services/market. */
function configured() {
  return MARKETS.filter((m) => m.enabled);
}

function currency(code) {
  return CURRENCIES[String(code || '').toUpperCase()] || CURRENCIES.USD;
}

/**
 * Money, in the market's own currency and convention.
 *
 * Takes the smallest unit (cents, pence, yen) exactly as the database
 * stores it, so nothing here has to know which currency has a minor unit
 * — `decimals` does.
 */
function format(amount, currencyCode) {
  const c = currency(currencyCode);
  const n = Number(amount) || 0;
  const value = c.decimals === 0
    ? String(Math.round(n))
    : (n / 100).toFixed(c.decimals);
  return c.prefix + value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** URL for a path within a market. `/products/x` in CA → `/ca/products/x`. */
function path(market, p) {
  const clean = String(p || '/').replace(/^\/+/, '');
  const m = market && market.prefix ? `/${market.prefix}` : '';
  return `${m}/${clean}`.replace(/\/+$/, '') || '/';
}

module.exports = {
  MARKETS, CURRENCIES,
  byPrefix, byId, byCountry, defaultMarket, configured,
  currency, format, path, feeds,
  /** Every prefix that is not the default, for the router's matcher. */
  prefixes: () => MARKETS.filter((m) => m.prefix).map((m) => m.prefix),
};
