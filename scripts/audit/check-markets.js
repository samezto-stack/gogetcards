/*
 * Multi-market consistency.
 *
 * The one thing Merchant Center actually checks is that the price in a
 * feed row matches the price on the page that row links to. Everything in
 * this file exists to make that comparison impossible to fail by accident,
 * because the ways it fails are all silent: a feed still validates with a
 * wrong price, a page still renders, and the first symptom is a
 * disapproval days later against an account rather than a listing.
 *
 * Four chains have to hold for every market:
 *
 *   1. URL      → market            (deterministic, never from an IP)
 *   2. market   → price             (stored, never converted)
 *   3. price    → Offer + feed row  (one source, not three)
 *   4. price    → the actual charge (that country's own plan id)
 *
 * Chain 4 is the one with teeth. The others produce a wrong number on a
 * page; that one takes the wrong amount of money.
 *
 * Run:  node scripts/audit/check-markets.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const markets = require(path.join(ROOT, 'config/markets'));
const marketService = require(path.join(ROOT, 'services/market'));
const rotation = require(path.join(ROOT, 'services/partnerRotation'));
const feedBuilder = require(path.join(ROOT, 'services/distribution/feedBuilder'));

let pass = 0; const fails = [];
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`pass  ${n}`); }
  else { fails.push(n); console.log(`FAIL  ${n}${d ? ' — ' + d : ''}`); }
};

/* Priced in three storefronts and deliberately not... nowhere: every
   configured market has a price, so the not-sold case is exercised by
   deleting a row below. */
const PRODUCT = {
  slug: 'op-18', title: 'OP-18 Booster Box', price: 14998,
  available: true, description: 'Sealed booster box.',
  imageUrl: 'https://cdn.example.com/op18.png', brand: 'Bandai',
  marketPrices: [
    { market: 'CA', amount: 18999, available: true },
    { market: 'UK', amount: 10999, available: true },
    { market: 'EU', amount: 12999, available: true },
  ],
};

console.log('the registry');
{
  const ids = markets.MARKETS.map((m) => m.id);
  ok('market ids are unique', new Set(ids).size === ids.length);
  const prefixes = markets.MARKETS.map((m) => m.prefix);
  ok('url prefixes are unique', new Set(prefixes).size === prefixes.length);
  ok('exactly one default market',
     markets.MARKETS.filter((m) => m.isDefault).length === 1);
  /* THE DEFAULT MUST KEEP THE BARE URL. Giving it a prefix would move
     every indexed product page and every live Merchant Center listing. */
  ok('the default market has no prefix', markets.defaultMarket().prefix === '');
  ok('every market names a known currency',
     markets.MARKETS.every((m) => !!markets.CURRENCIES[m.currency]));
  ok('only the four wanted currencies exist',
     Object.keys(markets.CURRENCIES).sort().join(',') === 'CAD,EUR,GBP,USD',
     Object.keys(markets.CURRENCIES).join(','));

  ok('the UK storefront lives at /uk', markets.byId('UK').prefix === 'uk');
  /* The URL says uk because that is what people type; the feed and
     hreflang say GB because Google accepts nothing but the ISO code. */
  ok('but its country is the ISO code', markets.byId('UK').countries.join() === 'GB');
  ok('canada lives at /ca', markets.byId('CA').prefix === 'ca');
  ok('the euro area is one storefront at /eu', markets.byId('EU').prefix === 'eu');

  /* ONE COUNTRY BELONGS TO ONE STOREFRONT, or byCountry() and the feed
     router would each have two answers for it. */
  const all = markets.MARKETS.flatMap((m) => m.countries);
  ok('no country belongs to two storefronts', new Set(all).size === all.length);

  /* ONE FEED PER STOREFRONT, WHICH IS ONE PER CURRENCY. A feed may serve
     several countries as long as its currency is accepted in all of them.
     Country targeting is a CAMPAIGN setting, so this costs no per-country
     campaigns — it only removes five submissions to keep in step. */
  const feeds = markets.feeds();
  ok('one feed per storefront, not per country', feeds.length === markets.MARKETS.length,
     String(feeds.length));
  ok('four feeds in total', feeds.length === 4, String(feeds.length));
  ok('the euro feed covers all six euro countries',
     markets.feeds([markets.byId('EU')])[0].countries.length === 6);
  ok('feed labels are unique', new Set(feeds.map((f) => f.label)).size === feeds.length);
  ok('the US feed keeps its existing url',
     feeds.find((f) => f.market.isDefault).url === '/feed/google.xml');
  /* Every storefront's currency must be distinct, or two feeds would be
     indistinguishable to Merchant Center. */
  const curs = markets.MARKETS.map((m) => m.currency);
  ok('one currency per storefront', new Set(curs).size === curs.length);
}

console.log('\nmoney');
{
  ok('USD prints two decimals', markets.format(13999, 'USD') === 'US$139.99');
  ok('GBP prints its own symbol', markets.format(10999, 'GBP') === '£109.99');
  ok('EUR prints its own symbol', markets.format(12999, 'EUR') === '€129.99');
  ok('thousands are separated', markets.format(189999, 'CAD') === 'CA$1,899.99');
}

console.log('\nurl → market');
{
  ok('the bare path is the default market', markets.byPrefix('') === markets.defaultMarket());
  ok('a prefix names its market', markets.byPrefix('ca').id === 'CA');
  ok('/uk resolves to the UK storefront', markets.byPrefix('uk').id === 'UK');
  ok('/eu resolves to the euro storefront', markets.byPrefix('eu').id === 'EU');
  ok('a euro country resolves to the euro storefront', markets.byCountry('NL').id === 'EU');
  ok('an unknown prefix is nothing', markets.byPrefix('zz') === null);
  ok('a market url is built from the registry',
     markets.path(markets.byId('CA'), '/products/x') === '/ca/products/x');
  ok('the default market adds no prefix',
     markets.path(markets.byId('US'), '/products/x') === '/products/x');
}

console.log('\nmarket → price');
{
  const us = marketService.priceFor(PRODUCT, markets.byId('US'));
  ok('the default market reads the base price', us.amount === 14998 && us.currency === 'USD');

  const ca = marketService.priceFor(PRODUCT, markets.byId('CA'));
  ok('a market reads its own stored price', ca.amount === 18999 && ca.currency === 'CAD');

  /* NOT SOLD IS NULL, NOT A CONVERSION. This is the single most important
     assertion in the file: a fallback to the US figure would put USD in a
     Italian feed pointing at an /it/ URL, which is a price mismatch and a
     broken landing page in one row. */
  const noEu = { ...PRODUCT, marketPrices: PRODUCT.marketPrices.filter((r) => r.market !== 'EU') };
  ok('an unpriced market returns nothing at all',
     marketService.priceFor(noEu, markets.byId('EU')) === null);

  const withdrawn = { ...PRODUCT, marketPrices: [{ market: 'CA', amount: 18999, available: false }] };
  const w = marketService.priceFor(withdrawn, markets.byId('CA'));
  ok('a withdrawn market keeps its price but is unavailable',
     w && w.amount === 18999 && w.available === false);
  ok('an unavailable product is unavailable in every market',
     marketService.priceFor({ ...PRODUCT, available: false }, markets.byId('CA')).available === false);
}

console.log('\nprice → feed row');
{
  const usRow = feedBuilder.build(PRODUCT, {});
  const caRow = feedBuilder.build(PRODUCT, { market: markets.byId('CA') });
  const ukRow = feedBuilder.build(PRODUCT, { market: markets.byId('UK') });
  const euRow = feedBuilder.build(PRODUCT, { market: markets.byId('EU') });

  ok('the US row is unchanged: bare link, USD, bare id',
     usRow.link.endsWith('/products/op-18')
     && usRow.price.currencyCode === 'USD'
     && usRow.offerId === 'op-18');

  ok('a market row links to that storefront\'s url',
     caRow.link.endsWith('/ca/products/op-18'), caRow.link);
  ok('the row price equals the page price',
     String(caRow.price.amountMicros) === String(18999 * 10000));
  ok('the UK feed is labelled GB and priced in GBP',
     ukRow.feedLabel === 'GB' && ukRow.price.currencyCode === 'GBP'
     && ukRow.link.endsWith('/uk/products/op-18'));
  ok('offer ids are distinct per storefront',
     new Set([usRow, caRow, ukRow, euRow].map((r) => r.offerId)).size === 4);

  /* ── The euro feed serves six countries ──────────────────────────────
     A COUNTRY WITH NO SHIPPING ROW DOES NOT RUN. Google validates a row
     against the country it is about to serve an impression in, so a euro
     feed declaring delivery only to Germany is silently dead in the other
     five — in exactly the markets it was opened for. */
  const shipCountries = euRow.shipping.map((r) => r.country).sort();
  ok('the euro feed ships to every country it serves',
     shipCountries.join(',') === 'AT,BE,DE,FI,IE,NL', shipCountries.join(','));
  /* And priced in the feed's own currency: a euro feed quoting a USD
     shipping price is a currency mismatch even at zero. */
  ok('shipping is quoted in the feed\'s currency',
     euRow.shipping.every((r) => r.price.currencyCode === 'EUR'));
  /* CANADA HAS ITS OWN FEED NOW, so the US feed must not still declare
     shipping to it. Both at once would offer a Canadian the same product
     from two feeds in two currencies, and whichever landing page Google
     fetched second would read as a price mismatch.

     This assertion used to say the opposite — it protected Canada ON this
     feed, because in USD from here was the only way Canada was served at
     all. The CAD storefront is what makes reversing it safe, so the two
     halves are checked together: CA off the US feed, and a CA feed that
     ships to CA in CAD. */
  const usShip = usRow.shipping.map((r) => r.country).sort().join(',');
  ok('the US feed serves the US only', usShip === 'US', usShip);
  const caShip = caRow.shipping.map((r) => r.country).sort().join(',');
  ok('Canada is served by the CA feed instead', caShip === 'CA', caShip);
  ok('and quoted there in CAD',
     caRow.shipping.every((r) => r.price.currencyCode === 'CAD'));
  ok('and quotes it in dollars',
     usRow.shipping.every((r) => r.price.currencyCode === 'USD'));

  const noEu2 = { ...PRODUCT, marketPrices: PRODUCT.marketPrices.filter((r) => r.market !== 'EU') };
  ok('an unpriced market produces no row at all',
     feedBuilder.build(noEu2, { market: markets.byId('EU') }) === null);
}

console.log('\nprice → the charge');
{
  /* A rotation that can bill the US and the euro storefront, but not the
     UK. One ladder per STOREFRONT: the euro area is one market, so one
     euro ladder serves all six of its countries. */
  const config = {
    savedSites: [{
      id: 'a', enabled: true, url: 'https://a.example', name: 'A',
      unitCents: 7499, plans: Array.from({ length: 12 }, (_, i) => `us_${i + 1}`),
      ladders: {
        EU: { unitCents: 6499, plans: Array.from({ length: 12 }, (_, i) => `eu_${i + 1}`) },
      },
    }],
  };

  ok('the markets the checkout can bill are reported',
     rotation.marketsServed(config).sort().join(',') === 'EU,US',
     rotation.marketsServed(config).join(','));

  const orig = markets.MARKETS.map((m) => m.enabled);
  markets.MARKETS.forEach((m) => { m.enabled = true; });
  try {
    const open = marketService.sellable(config).map((m) => m.id).sort();
    ok('only storefronts with their own ladder are sellable',
       open.join(',') === 'EU,US', open.join(','));
    /* THE GATE. The UK is configured on and still shut, because no site
       holds UK plan ids — showing £109.99 and charging dollars is the
       page, the feed and the receipt disagreeing. */
    ok('a storefront with no ladder stays shut', !open.includes('UK'));
    const none = marketService.sellable({ savedSites: [] }).map((m) => m.id);
    ok('the default market is never closed by the gate', none.includes('US'));
  } finally {
    markets.MARKETS.forEach((m, i) => { m.enabled = orig[i]; });
  }

  const site = config.savedSites[0];
  const two = rotation.planFor(site, 6499 * 2, 1, 'EU');
  ok('a euro price resolves a euro plan',
     two && two.whopPlanId === 'eu_2' && two.market === 'EU');
  ok('and reports the currency from the registry', two.currency === 'EUR');
  ok('and charges exactly the grid price', two.priceCents === 6499 * 2);
  ok('a US price resolves the US ladder',
     rotation.planFor(site, 7499 * 2, 1, 'US').whopPlanId === 'us_2');
  ok('a storefront with no ladder cannot be charged',
     rotation.planFor(site, 10999, 1, 'UK') === null);
  /* Off the euro grid — refused, never rounded to the nearest rung,
     because Whop charges what the plan id says. */
  ok('a price off the market grid is refused',
     rotation.planFor(site, 12999, 1, 'EU') === null);
  ok('site selection skips a site that cannot bill the market',
     rotation.nextSite(config, PRODUCT, { amount: 10999, market: 'UK' }) === null);
}

console.log('\nthe admin can actually configure this');
{
  const fs = require('fs');
  const form = fs.readFileSync(path.join(ROOT, 'views/admin/product-form.ejs'), 'utf8');
  /* PRICES ARE TYPED THE WAY THEY ARE WRITTEN. 179.99, not 17999. The
     base price field has always worked this way and a second convention
     on the same screen is how a price ends up a hundred times wrong. */
  ok('market prices accept decimals', /name="mp_<%= m\.id %>_amount"[\s\S]{0,120}step="0\.01"/.test(form)
     || /step="0\.01"[\s\S]{0,120}name="mp_<%= m\.id %>_amount"/.test(form));
  ok('and are redisplayed in the same units', form.includes('(_row.amount / 100).toFixed(2)'));

  const admin = fs.readFileSync(path.join(ROOT, 'routes/admin.js'), 'utf8');
  ok('and are converted to minor units on save',
     admin.includes("(parseFloat(body[`mp_${m.id}_amount`]) || 0) * 100"));

  const settings = fs.readFileSync(path.join(ROOT, 'views/admin/settings.ejs'), 'utf8');
  /* THE BOOTSTRAP. A market cannot open without a ladder, so if the
     ladder box only rendered for open markets neither could ever come
     first. Every non-default market gets a box whatever its state. */
  ok('ladder boxes render for markets that are still off',
     settings.includes('filter(function (mk) { return !mk.isDefault; })'));

  const dist = fs.readFileSync(path.join(ROOT, 'views/admin/distribution.ejs'), 'utf8');
  ok('the distribution panel lists every feed separately', dist.includes('dh-feeds'));
  ok('and shows what each feed would contain', dist.includes('f.priced'));
}

console.log('\nno IP anywhere near the price');
{
  const fs = require('fs');
  const mw = fs.readFileSync(path.join(ROOT, 'middleware/market.js'), 'utf8');
  /* The market may only come from the path. A redirect or a cookie read
     here would mean one URL serving two currencies, which is both a feed
     mismatch Google cannot reproduce and the definition of cloaking. */
  ok('the middleware never redirects between markets', !/res\.redirect/.test(mw));
  ok('the middleware picks the market from the path only',
     mw.includes('PREFIXES.has(seg)') && !/req\.ip|geoip/.test(mw));

  const svc = fs.readFileSync(path.join(ROOT, 'services/market.js'), 'utf8');
  /* A country header may only reach suggest(). If priceFor could see it,
     the same URL would price differently for different visitors. */
  const priceBody = svc.slice(svc.indexOf('function priceFor'), svc.indexOf('function display'));
  ok('priceFor cannot see the request at all',
     !/req\b|CF-IPCountry|headers/.test(priceBody));

  /* EVERY nextSite CALL MUST NAME ITS MARKET. Omitting it silently reads
     the US ladder at the US price. On the serving side that would hand a
     euro buyer to a host holding no euro plan; in the order pipeline, where
     this was actually wrong, it credited the revenue to a site the checkout
     had correctly skipped, and advanced the cursor from there — so the NEXT
     order went to the wrong site as well. Both are invisible: every screen
     shows a working rotation that merely favours one host.

     Only the three production callers are checked. The audits construct
     single-market configs deliberately. */
  for (const rel of ['services/orderPipeline/index.js', 'services/checkout/session.js', 'routes/frontend.js']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const calls = src.match(/nextSite\([\s\S]*?\)\s*;/g) || [];
    ok(`${rel}: every nextSite call names a market`,
       calls.length > 0 && calls.every((c) => c.includes('market:')));
  }
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log('\nFailures:'); fails.forEach((f) => console.log('  • ' + f)); }
process.exit(fails.length ? 1 : 0);
