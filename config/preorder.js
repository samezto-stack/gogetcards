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
 * Is this product a preorder?
 *
 * THE FLAG IS THE TRUTH, NOT THE CALENDAR. A preorder becomes in stock when
 * the stock is in the building, which is something only the owner knows:
 * a publisher's release day is when distributors ship, not when boxes
 * arrive here. Flipping to "In Stock" at midnight on release day made the
 * page say In Stock (with an Add to Cart and "Ships today") while the
 * stock was still on a truck. The owner unticks Preorder when it lands;
 * until then it is a preorder everywhere: page, cards, feed, schema.
 */
function isPreorder(product) {
  return !!(product && (product.preorder || (product.tags || []).includes('preorder')));
}

function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: WAREHOUSE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Released (the date has arrived) but still marked preorder: awaiting stock. */
function awaitingStock(product, now = new Date()) {
  if (!isPreorder(product)) return false;
  const info = releaseInfo(product);
  return info.hasDate && info.iso <= todayIso(now);
}

function addBusinessDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString().split('T')[0];
}

/**
 * The date a preorder is expected to be available to ship, as an ISO day.
 * Before release: the release date. After release, while stock is still
 * awaited: today plus the stated dispatch window, so the feed and the
 * schema never carry an availability_date in the past (Google treats that
 * as wrong availability) and say honestly that it is days away.
 */
function expectedAvailability(product, now = new Date()) {
  const info = releaseInfo(product);
  if (!info.hasDate) return null;
  const today = todayIso(now);
  return info.iso > today ? info.iso : addBusinessDays(today, AFTER_RELEASE);
}

function displayIso(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
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
  if (awaitingStock(product)) return `Backorder — released ${info.display}, awaiting restock`;
  if (info.hasDate) return `Preorder — releases ${info.display}`;
  if (info.window) return `Preorder — ships ${info.window}`;
  return 'Preorder — release date to be confirmed';
}

/**
 * The four states, in one place, so the feed, the schema and the page can
 * never disagree about which one a product is in.
 *
 * WHY BACKORDER EXISTS (added 2026-11-07). Google's availability vocabulary
 * separates two things this store used to collapse into "preorder":
 *   - PREORDER  — the product is NOT released yet; it ships on its release
 *                 date, which is the availability_date.
 *   - BACKORDER — the product IS released, is temporarily out of stock
 *                 here, and orders are taken for fulfilment when our
 *                 allocation lands; the availability_date is when we expect
 *                 to ship it.
 * Sending `preorder` for a product whose release date has already passed is
 * an availability misrepresentation: Google can see the set is out. A
 * released-but-still-flagged product (what the owner leaves marked while
 * the allocation is in transit) is a BACKORDER, not a preorder.
 *
 * THE FLAG STILL DECIDES, NOT THE CALENDAR. `isPreorder` is the owner's
 * "not on the shelf here yet" switch; the release date only decides whether
 * that absence reads as preorder (date ahead) or backorder (date passed).
 * The moment stock lands the owner unticks it and the product is in_stock.
 *
 * An explicit `product.availabilityOverride` (one of the four lowercase
 * values) wins over the derivation, so the owner can force a state — e.g.
 * mark a released item out_of_stock — without touching the flag.
 */
const AVAIL_VALUES = ['in_stock', 'preorder', 'backorder', 'out_of_stock'];
const AVAIL_CONST = { in_stock: 'IN_STOCK', preorder: 'PREORDER', backorder: 'BACKORDER', out_of_stock: 'OUT_OF_STOCK' };
const SCHEMA_URL = {
  IN_STOCK: 'https://schema.org/InStock',
  PREORDER: 'https://schema.org/PreOrder',
  BACKORDER: 'https://schema.org/BackOrder',
  OUT_OF_STOCK: 'https://schema.org/OutOfStock',
};

/** The feed-side constant (IN_STOCK / PREORDER / BACKORDER / OUT_OF_STOCK). */
function availabilityState(product, now = new Date()) {
  const o = product && String(product.availabilityOverride || '').toLowerCase();
  if (o && AVAIL_VALUES.includes(o)) return AVAIL_CONST[o];
  if (product && product.available === false) return 'OUT_OF_STOCK';
  if (!isPreorder(product)) return 'IN_STOCK';
  return awaitingStock(product, now) ? 'BACKORDER' : 'PREORDER';
}

/** The schema.org availability URL for the same state. */
function schemaAvailability(product, now = new Date()) {
  return SCHEMA_URL[availabilityState(product, now)];
}

/** True when the product is released but awaiting restock (Google backorder). */
function isBackorder(product, now = new Date()) {
  return availabilityState(product, now) === 'BACKORDER';
}

module.exports = {
  TERMS, releaseInfo, shortLine, isPreorder, awaitingStock, isBackorder,
  expectedAvailability, displayIso, releasedCutoff, AFTER_RELEASE, DISPATCH_SHORT,
  availabilityState, schemaAvailability, AVAIL_VALUES,
};
