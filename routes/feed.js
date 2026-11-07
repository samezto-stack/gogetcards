/**
 * The public product feed, for Merchant Center's scheduled fetch.
 *
 * WHY THIS EXISTS ALONGSIDE THE API PUSH: they are two transports for one
 * payload, not two systems. Both call the same feedBuilder and the same
 * validators, so the shipping windows, the preorder dates, the return
 * policy and the free-shipping rate are identical whichever way the data
 * reaches Google. That is the entire point of building the payload
 * separately from the transport — choosing scheduled fetch costs none of
 * the consistency guarantees, only the immediacy.
 *
 * WHY IT CANNOT REUSE /admin/distribution/export.xml: that route is behind
 * requireAuth, and Google's feed fetcher cannot log in. It would receive
 * the login page, parse it as XML, and report a malformed feed.
 *
 * NOTHING PRIVATE IS EXPOSED. Every field in the feed — title, price,
 * availability, image, link — is already on the public product page. What
 * is deliberately NOT here is anything the admin panel adds: sync history,
 * quota, per-product diagnostics, the merchant account id.
 *
 * INVALID PRODUCTS ARE OMITTED, exactly as they are on the push path.
 * Publishing an item that is known to fail validation just moves the
 * rejection from here to Merchant Center, and each rejection is a
 * disapproval recorded against the account.
 */

const express = require('express');
const router = express.Router();

const Product = require('../models/Product');
const ChannelConfig = require('../models/ChannelConfig');
const validators = require('../services/distribution/validators');
const fileProvider = require('../services/distribution/providers/file');
const markets = require('../config/markets');
const marketService = require('../services/market');

/* Google fetches on a schedule measured in hours, so a short cache costs
   nothing in freshness and protects the database from anything that
   decides to pull this repeatedly. Overrides the global no-store, which is
   correct for pages a customer sees and wrong for a machine-read file. */
const CACHE_SECONDS = 900;

const FORMATS = {
  xml: { type: 'application/xml; charset=utf-8', render: (p) => fileProvider.toXml(p) },
  csv: { type: 'text/csv; charset=utf-8', render: (p) => fileProvider.toCsv(p) },
  json: { type: 'application/json; charset=utf-8', render: (p) => fileProvider.toJson(p) },
};

/**
 * Optional shared secret.
 *
 * Everything in the feed is public already, so this is not protecting a
 * secret — it keeps the file from being trivially discoverable and
 * scraped on a loop. Unset means the feed is open, which is the normal
 * arrangement and what most stores run.
 */
function tokenOk(req) {
  const expected = (process.env.FEED_TOKEN || '').trim();
  if (!expected) return true;
  const given = Buffer.from(String(req.query.key || ''));
  const want = Buffer.from(expected);
  return given.length === want.length && require('crypto').timingSafeEqual(given, want);
}

/**
 * ONE FEED PER STOREFRONT, which is one feed per currency.
 *
 *   /feed/google.xml       US   USD   (unchanged)
 *   /feed/ca/google.xml    CA   CAD
 *   /feed/uk/google.xml    GB   GBP
 *   /feed/eu/google.xml    DE NL IE BE AT FI   EUR
 *
 * The euro feed covers six countries in one submission. Merchant Center
 * allows a feed to serve several countries as long as its currency is
 * accepted in all of them, which is the definition of a currency zone —
 * and every row carries a shipping entry for all six, because a country
 * with no shipping row simply does not run.
 *
 * ONE FEED IS NOT ONE CAMPAIGN. Country targeting lives on the campaign in
 * Google Ads, so six campaigns with six budgets can point at this one
 * feed. An earlier version published a feed per country to make that
 * possible; it was not necessary, and it was nine URLs to keep in step
 * where four will do.
 *
 * SEPARATE URLS PER CURRENCY, though, are not optional: a feed is keyed to
 * one currency, and a combined file would need Google to pick rows out of
 * it by label, which it does not do for prices.
 */
async function serveFeed(req, res, market) {
  const chosen = FORMATS[req.params.format];
  if (!chosen) return res.status(404).type('text/plain').send('Unknown format. Use google.xml, google.csv or google.json.');
  if (!tokenOk(req)) return res.status(404).type('text/plain').send('Not found.');

  try {
    const [config, products] = await Promise.all([
      ChannelConfig.findOne({ channel: 'google' }).select('selectionMode').lean(),
      Product.find({}).lean(),
    ]);
    /* The same include/exclude decision the push path makes. A product
       held back in the panel must not reappear through the file, or the
       two transports would disagree about the catalogue. */
    const selectionMode = (config && config.selectionMode) || 'all';

    /* Products with no price in this market are ineligible, not
       fallback-priced — validators.validate reports them as such and they
       are filtered here exactly like any other invalid row. */
    const payloads = products
      .map((p) => validators.validate(p, { channel: 'google', selectionMode, market }))
      .filter((r) => r.eligible)
      .map((r) => r.payload);

    /* NEVER PUBLISH AN EMPTY FEED. Google reads a successfully fetched
       empty file as "this merchant now sells nothing" and removes every
       product it has reviewed — approvals and history included. An empty
       result here is always an accident (nothing selected yet, a selection
       cleared), so answer 503: Google keeps its last good fetch and retries.
       To genuinely withdraw everything, delete the feed in Merchant Center. */
    if (!payloads.length) {
      console.warn(`[feed] ${market.id}: 0 eligible products — refusing to publish an empty feed (503)`);
      res.set('Retry-After', '3600');
      return res.status(503).type('text/plain').send('Feed temporarily unavailable.');
    }

    res.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
    /* The file is data, not a page. Without this a feed URL can end up in
       the index as a bare XML document competing with the product pages it
       describes. */
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.type(chosen.type).send(chosen.render(payloads));
  } catch (err) {
    console.error('[feed] generation failed:', err);
    /* 500 rather than an empty feed. Google treats a successfully fetched
       EMPTY feed as "this merchant now sells nothing" and removes the
       catalogue; an error leaves the previous fetch in place. */
    res.status(500).type('text/plain').send('Feed generation failed.');
  }
}

/* The default market keeps the bare URL it already has in Merchant
   Center. Declared first so `google.xml` never matches the :prefix route. */
router.get('/google.:format', (req, res) => serveFeed(req, res, markets.defaultMarket()));

router.get('/:prefix/google.:format', async (req, res) => {
  const market = markets.byPrefix(String(req.params.prefix || '').toLowerCase());
  if (!market || market.isDefault) return res.status(404).type('text/plain').send('Unknown market.');
  /* A storefront that is configured off, or whose plan ladder the
     checkout does not hold, has no feed. Publishing one would advertise
     prices nothing can take money for. */
  const sellable = await marketService.sellableNow();
  if (!sellable.some((m) => m.id === market.id)) {
    return res.status(404).type('text/plain').send('That market is not open.');
  }
  return serveFeed(req, res, market);
});

module.exports = router;
