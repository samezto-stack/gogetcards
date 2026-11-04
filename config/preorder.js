/**
 * Preorder terms, stated once and shown everywhere a preorder is sold.
 *
 * WHY THIS EXISTS: preorder listings said only "Price locked. Ships release
 * day. Cancel anytime." on the product page and nothing anywhere else. That
 * omits every fact Google Merchant Center expects a preorder listing to
 * disclose, and every fact a buyer needs before parting with money for
 * something that does not exist yet:
 *
 *   - that payment is taken in full NOW, not on release day
 *   - the publisher's release date, not just a vague quarter
 *   - what happens when the publisher moves the date
 *   - what happens when the distributor cuts the allocation
 *   - how to cancel and what the refund is
 *
 * Merchant Center treats a preorder advertised as though it were in stock
 * as a Misrepresentation violation, and an undisclosed wait between payment
 * and delivery as an "inaccurate product information" problem. Both are
 * account-level, not item-level.
 *
 * These strings are the store's commitments. Change them only when the
 * store's actual practice changes.
 */

const shipping = require('./shipping');
const WAREHOUSE_TZ = 'America/Los_Angeles'; // helpers/dispatch.js WAREHOUSE_TZ, repeated here to avoid a config→helpers require

/* ONE dispatch window, stated the same way everywhere a preorder is sold.
   The homepage, the preorders collection, the product page, the FAQ, the
   Preorder Policy and the Shipping page all read this number, so they
   cannot drift apart again (they had: "release day", "the business day
   after" and "within 2 business days" were all live at once). It is the
   window declared to Google as preorder handling time. */
const AFTER_RELEASE = shipping.DISPATCH.preorderBusinessDaysAfterRelease;
const DISPATCH_SHORT = `Ships on release day or within ${AFTER_RELEASE} business days`;

const TERMS = [
  {
    title: 'Payment is taken today',
    body:
      'Your card is charged in full when you place the preorder, not on release day. '
      + 'That is what reserves your unit against our distributor allocation.',
  },
  {
    title: 'Price is locked',
    body:
      'You pay the price shown on the day you order. If the market price rises before '
      + 'release, yours does not change. If we lower it, we refund you the difference.',
  },
  {
    title: 'Ships on release, not before',
    body:
      'Sealed product cannot legally leave a distributor ahead of the publisher\'s street '
      + `date. We dispatch as soon as stock reaches us: on the publisher's release date, `
      + `or within ${AFTER_RELEASE} business days of it.`,
  },
  {
    title: 'If the publisher moves the date',
    body:
      'Release dates do slip, and that decision is the publisher\'s, not ours. We email you '
      + 'the new date as soon as we have it. You can wait or cancel for a full refund.',
  },
  {
    title: 'If our allocation is cut',
    body:
      'Distributors sometimes reduce what they send us after preorders open. If we cannot '
      + 'fill your order we tell you immediately and refund you in full. We never substitute '
      + 'a different product without asking you first.',
  },
  {
    title: 'Cancel any time before it ships',
    body:
      'Email us and we refund the full amount to your original payment method, with no fee '
      + 'and no questions. Once dispatched, the standard returns policy applies.',
  },
];

/**
 * Is this product a preorder TODAY?
 *
 * The flag (or the "preorder" tag) says the product was listed as a
 * preorder; the release date says whether it still is. Nothing used to
 * clear the flag when the date passed, so the day after release the feed
 * still sent `preorder` with a past availability_date (a Merchant Center
 * availability error) and the page still said "not yet released". With
 * 37 releases landing in one fortnight that is not a manual job.
 *
 * Released = the publisher's date has arrived in the warehouse's own
 * timezone. From that day the product reads in stock everywhere; stock
 * and `available` are then the honest levers.
 */
function isPreorder(product, now = new Date()) {
  const flagged = !!(product && (product.preorder || (product.tags || []).includes('preorder')));
  if (!flagged) return false;
  const info = releaseInfo(product);
  if (!info.hasDate) return true;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: WAREHOUSE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return info.iso > today;
}

/** Start of today in the warehouse timezone, for database filters. */
function releasedCutoff(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: WAREHOUSE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return new Date(`${today}T00:00:00Z`);
}

/**
 * Human-readable release information for a product.
 *
 * `releaseDate` is the authoritative field because it is a real date that
 * can also be emitted as schema.org availabilityDate. `preorderShips` is a
 * free-text window ("Q2 2026") that is fine for a shopper but useless to a
 * crawler, so it is used only as a fallback and is never fed to schema.
 *
 * @returns {{ hasDate: boolean, iso: string|null, display: string|null, window: string|null }}
 */
function releaseInfo(product) {
  const raw = product && product.releaseDate ? new Date(product.releaseDate) : null;
  const valid = raw && !Number.isNaN(raw.getTime());
  return {
    hasDate: !!valid,
    iso: valid ? raw.toISOString().split('T')[0] : null,
    display: valid
      ? raw.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
      : null,
    window: (product && product.preorderShips) || null,
  };
}

/**
 * One-line summary used on cards and in meta descriptions.
 * Prefers the real date; falls back to the free-text window; says
 * something honest rather than nothing when neither is set.
 */
function shortLine(product) {
  const info = releaseInfo(product);
  if (info.hasDate) return `Preorder — releases ${info.display}`;
  if (info.window) return `Preorder — ships ${info.window}`;
  return 'Preorder — release date to be confirmed';
}

module.exports = { TERMS, releaseInfo, shortLine, isPreorder, releasedCutoff, AFTER_RELEASE, DISPATCH_SHORT };
