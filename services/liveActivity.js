/**
 * What a live visitor is doing, in words.
 *
 * The dashboard's live list used to print the raw path, so a buyer on the
 * payment step read as "/checkout/Yx3…" and a product page as its slug.
 * This turns each path into an activity the shop owner can read at a
 * glance: the product's real title, "Checking out" with the item being
 * bought, "Just purchased", "Searching ‘op-13’".
 *
 * Read-only and admin-only. It never writes to a checkout session, and
 * the checkout token in a URL is only ever hashed and looked up, never
 * returned to the browser. A path it does not recognise falls back to the
 * path itself rather than to a guess.
 */
const Product = require('../models/Product');
const CheckoutSession = require('../models/CheckoutSession');
const catalog = require('../config/catalog');
const markets = require('../config/markets');
const trustPages = require('../config/trustPages');
const productImage = require('../helpers/productImage');

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{40,}$/;

/* Lower number = more important. The list is pinned in this order so a
   buyer on the payment step is never below someone reading the FAQ. */
const RANK = { purchased: 0, checkout: 1, cart: 2, product: 3, search: 4, collection: 5, account: 6, home: 7, page: 8, other: 9 };

const STATIC = {
  '/': ['home', 'Home page'],
  '/cart': ['cart', 'Looking at the cart'],
  '/thank-you': ['purchased', 'Just purchased'],
  '/checkout/success': ['purchased', 'Just purchased'],
  '/checkout/step-1': ['checkout', 'Checking out'],
  '/checkout/whop': ['checkout', 'On the payment page'],
  '/checkout-redirect': ['checkout', 'Going to payment'],
  '/releases': ['page', 'Release calendar'],
  '/about': ['page', 'About'],
  '/contact': ['page', 'Contact'],
  '/faq': ['page', 'FAQ'],
  '/shipping': ['page', 'Shipping & Delivery'],
  '/order-tracking': ['page', 'Order tracking'],
  '/customer-support': ['page', 'Customer support'],
};

/** Splits a tracked path into its market and the path the routes see. */
function unprefix(raw) {
  const path = String(raw || '/').split('?')[0] || '/';
  const m = /^\/([a-z]{2})(\/.*|$)/.exec(path);
  if (m && markets.byPrefix(m[1]) && m[1] !== '') {
    return { market: m[1].toUpperCase(), path: m[2] || '/' };
  }
  return { market: '', path };
}

/** First pass: classify by shape alone, noting what needs a lookup. */
function classify(rawPage) {
  const full = String(rawPage || '/');
  const { market, path } = unprefix(full);
  const query = full.includes('?') ? new URLSearchParams(full.split('?')[1]) : null;
  const base = { market, path, kind: 'other', label: path, detail: '' };

  if (STATIC[path]) {
    const [kind, label] = STATIC[path];
    return { ...base, kind, label };
  }
  let m;
  if ((m = /^\/products\/([^/]+)\/?$/.exec(path))) return { ...base, kind: 'product', label: m[1], slug: m[1] };
  if ((m = /^\/collection\/([^/]+)\/?$/.exec(path))) {
    const q = query && query.get('q');
    if (q) return { ...base, kind: 'search', label: `Searching “${q.slice(0, 60)}”` };
    const line = catalog.byHandle(m[1]);
    const named = { all: 'All products', preorders: 'Preorders' }[m[1]];
    return { ...base, kind: 'collection', label: line ? line.name : (named || m[1]), detail: 'Browsing' };
  }
  if ((m = /^\/checkout\/([^/]+)(\/payment)?\/?$/.exec(path)) && TOKEN_SHAPE.test(m[1])) {
    return { ...base, kind: 'checkout', label: m[2] ? 'On the payment step' : 'Checking out', token: m[1], path: '/checkout/…' };
  }
  if (/^\/checkout\/recover\//.test(path)) return { ...base, kind: 'checkout', label: 'Back from a checkout reminder', path: '/checkout/recover/…' };
  if (/^\/account(\/|$)/.test(path)) return { ...base, kind: 'account', label: 'In their account' };
  const trust = trustPages.bySlug(path.replace(/^\//, ''));
  if (trust) return { ...base, kind: 'page', label: trust.title };
  return base;
}

/**
 * Adds `activity` to every visitor and returns them sorted by importance,
 * then by most recent. Two batched queries at most, whatever the count.
 */
async function describe(visitors) {
  const rows = (visitors || []).map((v) => ({ v, a: classify(v.page) }));

  const slugs = [...new Set(rows.filter((r) => r.a.slug).map((r) => r.a.slug))];
  const sessions = rows.filter((r) => r.a.token);
  const [products, checkoutDocs] = await Promise.all([
    slugs.length
      ? Product.find({ slug: { $in: slugs } }).select('slug title price imageUrl images preorder').lean()
      : [],
    Promise.all(sessions.map((r) => CheckoutSession.resolve(r.a.token).catch(() => null))),
  ]);

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  sessions.forEach((r, i) => { r.session = checkoutDocs[i]; });

  const checkoutSlugs = [...new Set(sessions.map((r) => r.session && r.session.productSlug).filter((s) => s && !bySlug.has(s)))];
  if (checkoutSlugs.length) {
    (await Product.find({ slug: { $in: checkoutSlugs } }).select('slug title price imageUrl images preorder').lean())
      .forEach((p) => bySlug.set(p.slug, p));
  }

  const thumb = (p) => {
    const src = p && (p.imageUrl || (p.images && p.images[0]));
    return src ? productImage.at(src, 80) : '';
  };

  const out = rows.map(({ v, a, session }) => {
    const activity = { kind: a.kind, label: a.label, detail: a.detail, path: a.path, market: a.market, image: '', href: '' };
    if (a.kind === 'product') {
      const p = bySlug.get(a.slug);
      if (p) {
        activity.label = p.title;
        activity.detail = p.preorder ? 'Viewing a preorder' : 'Viewing product';
        activity.image = thumb(p);
        activity.href = `/products/${p.slug}`;
      } else {
        activity.detail = 'Viewing product';
      }
    }
    if (a.token) {
      if (session && session.isComplete && session.isComplete()) {
        activity.kind = 'purchased';
        activity.label = 'Just purchased';
      }
      const p = session && bySlug.get(session.productSlug);
      if (p) {
        activity.detail = `${p.title}${session.quantity > 1 ? ` × ${session.quantity}` : ''}`;
        activity.image = thumb(p);
        activity.href = `/products/${p.slug}`;
      } else if (!session) {
        activity.detail = 'Expired link';
      }
    }
    return {
      ip: v.ip,
      country: v.country,
      countryCode: v.countryCode,
      lastSeen: v.lastSeen,
      page: activity.path,
      activity,
    };
  });

  out.sort((x, y) => (RANK[x.activity.kind] - RANK[y.activity.kind])
    || (new Date(y.lastSeen) - new Date(x.lastSeen)));
  return out;
}

module.exports = { describe, classify, RANK };
