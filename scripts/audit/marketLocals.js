/*
 * The locals middleware/market puts on every real request.
 *
 * Four audit harnesses render customer templates directly rather than
 * booting server.js, because the real middleware reads SiteConfig and an
 * audit has to run with no database. Every one of them had to be taught
 * about `marketPath` separately, and the ones that were missed did not
 * fail with "missing local" — they failed with twenty assertions about
 * order history and sold-out copy, none of which was broken.
 *
 * One definition, imported everywhere, so the next helper added to the
 * middleware is added here once. check-routes asserts the two lists match.
 */
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const markets = require(path.join(ROOT, 'config/markets'));
const marketService = require(path.join(ROOT, 'services/market'));

/** @param {object} [market] defaults to the default market. */
function marketLocals(market) {
  const m = market || markets.defaultMarket();
  return {
    market: m,
    sellableMarkets: markets.configured(),
    marketPath: (p) => markets.path(m, p),
    marketMoney: (amount, currency) => markets.format(amount, currency || m.currency),
    marketPrice: (product) => marketService.priceFor(product, m),
    /* Null rather than absent: both are set only in the situations that
       warrant them, and the templates guard on their presence. */
    marketSuggestion: null,
    cartMarket: null,
  };
}

module.exports = marketLocals;
module.exports.marketLocals = marketLocals;
