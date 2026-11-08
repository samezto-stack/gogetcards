/**
 * Turns an AbandonedCheckout row into a recovery email.
 *
 * Sits alongside lifecycle.js and follows its rules exactly: one function
 * per event, the view assembled once, and NOTHING HERE THROWS — the
 * scheduler is a background sweep and an email that cannot be built must
 * become a log row, not a crashed cron.
 *
 * THE PRICE IN THE EMAIL IS THE LIVE PRICE. The row carries a snapshot of
 * what the customer was shown, but the snapshot is only used when there
 * is no product to read (a checkout for something since removed from the
 * catalogue, which the scheduler stops anyway). Quoting a stale figure is
 * how a recovery email becomes a misquotation, and the customer finds out
 * at the payment step.
 */

const site = require('../../config/site');
const markets = require('../../config/markets');
const marketService = require('../market');
const EmailSuppression = require('../../models/EmailSuppression');
const mail = require('./index');

/** "November 20, 2026", or nothing. Never a guessed date. */
function displayDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (err) {
    return '';
  }
}

function toCents(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Everything the six templates need.
 *
 * @param {object} doc      an AbandonedCheckout document
 * @param {object} product  the live Product, or null
 * @param {string} token    the PLAINTEXT recovery token (never stored)
 * @param {number} [step]   which reminder this is, for click attribution
 */
function view(doc, product, token, step) {
  const origin = site.origin();

  /* Live product first, snapshot second. */
  const title = (product && product.title) || doc.productName || 'Your order';
  const image = (product && (product.imageUrl || (product.images && product.images[0]))) || doc.productImage || '';
  /* IN THE MARKET THE CHECKOUT HAPPENED IN. `product.price` is the base
     USD figure, so a single-unit UK checkout was quoted the dollar number
     with a pound sign in front of it — the live price was preferred over
     the saved one precisely so a stale figure never went out, and it
     fetched the wrong storefront's. */
  const market = markets.byId(doc.market) || markets.defaultMarket();
  const livePrice = product ? marketService.priceFor(product, market) : null;
  const totalCents = (livePrice && doc.quantity === 1) ? livePrice.amount : toCents(doc.total);

  const releaseValue = (product && product.releaseDate) || doc.releaseDate;
  const display = displayDate(releaseValue);
  const isPreorder = product ? require('../../config/preorder').isActivePreorder(product) : doc.availability !== 'in_stock';

  const unsubToken = EmailSuppression.unsubscribeToken(doc.email, doc.checkoutId);

  return {
    firstName: doc.firstName || '',
    title,
    image,
    quantity: doc.quantity || 1,
    total: totalCents,
    currency: (livePrice && livePrice.currency) || doc.currency || market.currency,
    isPreorder,
    release: { hasDate: !!display, display },
    /* `s` names the step that sent them, so a click lands on the exact
       message rather than being guessed at from the most recent send.
       Nothing about the checkout is derived from it — the token is still
       the only credential — so a stripped or edited parameter costs a
       statistic and never a checkout. */
    /* Prefixed with the buyer's own storefront, so the address bar says
       /uk from the first paint and every page on the way through the
       recovery — the expired notice, the product page it may fall back
       to — renders in the market they were shopping in. */
    recoveryUrl: (() => {
      const base = origin + markets.path(market, `/checkout/recover/${encodeURIComponent(token)}`);
      return step ? `${base}?s=${encodeURIComponent(step)}` : base;
    })(),
    unsubscribeUrl: unsubToken
      ? `${origin}/email/unsubscribe/${encodeURIComponent(unsubToken)}?c=${encodeURIComponent(doc.checkoutId)}`
      : `${origin}/contact`,
  };
}

/**
 * Sends one step. Returns the mail service's result object unchanged, so
 * the scheduler records exactly what happened rather than a summary of it.
 */
async function sendStep(doc, step, product, token) {
  const type = `recoveryReminder${step}`;
  try {
    return await mail.send(type, {
      to: doc.email,
      data: view(doc, product, token, step),
      /* No orderId — there is no order yet, which is the point. The
         checkoutId goes in orderRef so /admin/emails can still be
         searched by it. */
      orderRef: doc.checkoutId,
    });
  } catch (err) {
    return { ok: false, status: 'failed', error: err.message };
  }
}

module.exports = { view, sendStep, displayDate, toCents };
