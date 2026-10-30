/**
 * Turns a market prefix at the front of the path into `req.market`.
 *
 * `/ca/products/x` is rewritten to `/products/x` with `req.market` set to
 * Canada, so every route in the application keeps its existing path and
 * simply reads the market off the request. That is the whole reason this
 * is a rewrite rather than a second set of routes: a parallel `/:market/*`
 * router would be a second copy of every page, and the first time the two
 * drifted a price would differ between markets for no reason anyone could
 * find.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It never chooses a market from an
 * IP, a header or a cookie, and it never redirects between markets. The
 * prefix in the URL is the only input. A visitor from Toronto who lands on
 * `/products/x` gets the US page and a banner offering the Canadian one;
 * they are not moved. Automatic relocation breaks the property the whole
 * design rests on — that a URL renders the same bytes for a customer, for
 * Googlebot, and for a Merchant Center reviewer fetching the landing page
 * from wherever their crawler happens to sit.
 *
 * A PREFIX FOR A MARKET THAT IS NOT SELLABLE 404s rather than falling back
 * to the default market. Falling back would serve US dollars from a URL
 * that says `/ca/`, which is the exact mismatch this system exists to
 * prevent — and it would do it at the moment a market was misconfigured,
 * which is when nobody is looking.
 */

const markets = require('../config/markets');
const marketService = require('../services/market');

/* Matches a leading segment only. Built once from the registry so adding
   a market never means touching a regex. */
const PREFIXES = new Set(markets.prefixes());

function firstSegment(url) {
  const path = String(url || '/').split('?')[0];
  const seg = path.split('/')[1] || '';
  return seg.toLowerCase();
}

module.exports = function marketMiddleware() {
  return async function (req, res, next) {
    let sellable;
    try {
      sellable = await marketService.sellableNow();
    } catch (err) {
      /* A database hiccup must not take the storefront down. The default
         market needs no configuration to price, so falling back to it
         keeps every existing US URL serving exactly what it serves now. */
      console.error('[market] could not load markets:', err.message);
      sellable = [markets.defaultMarket()];
    }

    const seg = firstSegment(req.url);
    let market = markets.defaultMarket();

    if (PREFIXES.has(seg)) {
      const found = marketService.fromPrefix(seg, sellable);
      if (!found) {
        /* Configured off, or its currency cannot be charged. Not found is
           the honest answer: there is no such storefront. */
        return res.status(404).render('pages/404');
      }
      market = found;
      // Strip the prefix so the existing routes match unchanged.
      req.url = req.url.slice(seg.length + 1) || '/';
      if (!req.url.startsWith('/')) req.url = `/${req.url}`;
    }

    req.market = market;
    req.sellableMarkets = sellable;

    /* Templates need all three: which market they are rendering, how to
       build a URL inside it, and the list for the selector. */
    res.locals.market = market;
    res.locals.sellableMarkets = sellable;
    res.locals.marketPath = (p) => markets.path(market, p);
    res.locals.marketMoney = (amount, currency) =>
      markets.format(amount, currency || market.currency);

    /* Any list of products a template renders — a related strip, a
       collection grid, a cart line — has to price in THIS market, and
       every one of them used to print the base USD field directly. A
       shopper on /uk read £ on the product they came for and US$ on
       everything around it, and the cart they were about to pay for was
       quoted in a currency the checkout would not charge.

       Handed to the views rather than pre-priced per route so that one
       partial cannot be included somewhere that forgot: the card asks for
       the price it is allowed to show, and gets null when the product is
       not sold here. Null means no offer, not a fallback. */
    res.locals.marketPrice = (product) => marketService.priceFor(product, market);

    /* The cart and its drawer hold a snapshot taken when the item was
       added, priced in the base currency. Displayed as-is on a localised
       storefront they quote US dollars to somebody the checkout is about
       to charge in pounds — the two numbers a shopper compares before
       paying, in two different currencies.

       Re-priced here rather than at add time because the shopper can
       change storefront after adding, and a snapshot cannot follow them.
       The lookup is skipped entirely in the default market, where the
       stored figures are already right, so the common path costs nothing
       and only a localised storefront with a non-empty cart pays for one
       query by slug. */
    const cart = res.locals.cart;
    if (!market.isDefault && cart && cart.items && cart.items.length) {
      try {
        const Product = require('../models/Product');
        const slugs = cart.items.map((i) => i.slug).filter(Boolean);
        const rows = await Product.find({ slug: { $in: slugs } })
          .select('slug price comparePrice marketPrices available')
          .lean();
        const bySlug = new Map(rows.map((r) => [r.slug, r]));
        const lines = {};
        let total = 0;
        let priceable = true;
        for (const item of cart.items) {
          const priced = marketService.priceFor(bySlug.get(item.slug), market);
          if (!priced) { priceable = false; break; }
          lines[item.slug] = priced.amount;
          total += priced.amount * (item.quantity || 1);
        }
        /* All lines or none. A cart showing one line in pounds and another
           in dollars, with a total that is neither, is worse than the
           snapshot it replaced.

           Written to a local rather than onto the cart items: those items
           ARE the session objects, so an amount stashed on one would
           outlive the request that computed it and follow the shopper back
           to the US storefront, where it would be printed under a US$
           label. The cart in the session stays exactly as it was stored. */
        if (priceable) {
          res.locals.cartMarket = { currency: market.currency, totalPrice: total, lines };
        }
      } catch (err) {
        /* No re-price is recoverable; a broken cart page is not. */
        console.error('[market] cart re-price failed:', err.message);
      }
    }

    /* The banner's suggestion. Computed here so a page only has to decide
       whether to show it, and null whenever the visitor is already in the
       right market or the hint is missing. */
    const hinted = marketService.suggest(req, sellable) || marketService.remembered(req, sellable);
    res.locals.marketSuggestion = hinted && hinted.id !== market.id ? hinted : null;

    /* Vary is not needed for the page itself — it does not vary — but the
       suggestion banner does read a request header, so a shared cache must
       not serve one visitor's banner to another. */
    if (hinted) res.set('Vary', 'CF-IPCountry, Cookie');

    next();
  };
};
