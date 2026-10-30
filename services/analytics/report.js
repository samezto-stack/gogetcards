/**
 * Every figure on /admin/analytics, aggregated in the database.
 *
 * NOTHING HERE IS INVENTED. Each number is traceable to a stored event, a
 * stored order, or a documented ratio of the two. Where the data cannot
 * answer a question the function returns an empty set and the page says so,
 * rather than returning a plausible-looking zero that reads as a finding.
 *
 * AGGREGATED SERVER-SIDE, ALWAYS. The Events collection holds a year of
 * page views on a 512 MB instance; loading raw rows into Node to count them
 * is how this page would take the store down. Every function below returns
 * at most a few dozen already-summarised rows, and every pipeline starts by
 * narrowing on { type, createdAt } — the compound indexes in models/Event.js
 * exist for exactly these queries.
 *
 * A NOTE ON WHAT "VISITOR" MEANS. Events carry sessionId, so a visitor is a
 * distinct session in the window, not a distinct person: the same human on
 * two devices is two, and after a session expires they are two again. That
 * is the honest reading of what is stored, and it is the same denominator
 * the existing dashboard uses, so the two agree.
 *
 * ORDERS EXCLUDE TEST PURCHASES via the same constant the dashboard uses,
 * so no panel here can disagree with the one on /admin.
 */

const Event = require('../../models/Event');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const AbandonedCheckout = require('../../models/AbandonedCheckout');
const testOrder = require('../testOrder');
const device = require('./device');

/* Wide enough for any real catalogue or country list, narrow enough that a
   runaway grouping cannot return a million rows into memory. */
const ROW_CAP = 200;

/* The funnel, in order. Each stage names the event that proves it happened.
   `page_view` is the denominator; the rest are progressively narrower.

   checkout_click is counted DISTINCT BY checkoutId, not as raw documents,
   because one visitor clicking Buy three times is one checkout, not three —
   the existing dashboard card counts documents and therefore overstates. */
const FUNNEL = [
  { key: 'visitors',   label: 'Visitors',         type: 'page_view',              distinct: 'sessionId' },
  { key: 'product',    label: 'Product page',     type: 'view_product',           distinct: 'sessionId' },
  { key: 'started',    label: 'Checkout started', type: 'checkout_click',         distinct: 'checkoutId' },
  { key: 'step1',      label: 'Step 1 (details)', type: 'checkout_arrived',       distinct: 'checkoutId' },
  { key: 'formDone',   label: 'Form completed',   type: 'checkout_form_completed', distinct: 'checkoutId' },
  { key: 'step2',      label: 'Step 2 (payment)', type: 'checkout_payment_shown', distinct: 'checkoutId' },
];

function eventMatch(win, extra = {}) {
  return { createdAt: { $gte: win.startDate, $lt: win.endDate }, ...extra };
}
function orderMatch(win, extra = {}) {
  return {
    createdAt: { $gte: win.startDate, $lt: win.endDate },
    ...testOrder.EXCLUDE_FROM_REPORTING,
    ...extra,
  };
}

/** Distinct count of one field, done in the database. */
async function distinctCount(win, type, field) {
  const rows = await Event.aggregate([
    { $match: eventMatch(win, { type, [field]: { $nin: [null, ''] } }) },
    { $group: { _id: `$${field}` } },
    { $count: 'n' },
  ]);
  return rows.length ? rows[0].n : 0;
}

/**
 * The funnel, stage by stage, with the drop between each.
 *
 * Percentages are computed against BOTH the top of the funnel and the
 * previous stage, because those answer different questions — "3% of
 * visitors reach payment" is a business number, "31% of arrivals reach
 * payment" is the one that tells you which step is broken.
 */
async function funnel(win) {
  const counts = {};
  for (const stage of FUNNEL) {
    counts[stage.key] = await distinctCount(win, stage.type, stage.distinct);
  }

  const orders = await Order.countDocuments(orderMatch(win));
  const paymentFailed = await distinctCount(win, 'checkout_payment_failed', 'checkoutId');
  /* Server-side, so it does not depend on the visitor's browser running
     anything — the honest count of "died before the page even rendered". */
  const tokenFailed = await distinctCount(win, 'checkout_token_failed', 'checkoutId');

  const stages = FUNNEL.map((s) => ({ key: s.key, label: s.label, users: counts[s.key] }));
  stages.push({ key: 'orders', label: 'Order completed', users: orders });

  const top = stages[0].users || 0;
  return stages.map((s, i) => {
    const prev = i === 0 ? null : stages[i - 1].users;
    const dropCount = prev === null ? 0 : Math.max(0, prev - s.users);
    return {
      ...s,
      ofTotal: top ? (s.users / top) * 100 : 0,
      fromPrev: prev ? (s.users / prev) * 100 : null,
      dropPct: prev ? (dropCount / prev) * 100 : null,
      dropCount,
    };
  }).map((s) => ({ ...s, paymentFailed, tokenFailed }));
}

/** The headline cards. */
async function overview(win) {
  const [
    visitors, productViews, uniqueProductViewers, started, step1, step2,
  ] = await Promise.all([
    distinctCount(win, 'page_view', 'sessionId'),
    Event.countDocuments(eventMatch(win, { type: 'view_product' })),
    distinctCount(win, 'view_product', 'sessionId'),
    distinctCount(win, 'checkout_click', 'checkoutId'),
    distinctCount(win, 'checkout_arrived', 'checkoutId'),
    distinctCount(win, 'checkout_payment_shown', 'checkoutId'),
  ]);

  const totalPageViews = await Event.countDocuments(eventMatch(win, { type: 'page_view' }));

  const agg = await Order.aggregate([
    { $match: orderMatch(win) },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
        units: { $sum: { $ifNull: ['$quantity', 1] } },
      },
    },
  ]);
  const o = agg[0] || { orders: 0, revenue: 0, units: 0 };

  const pct = (a, b) => (b ? (a / b) * 100 : 0);

  return {
    totalPageViews,
    visitors,
    productViews,
    uniqueProductViewers,
    started,
    step1,
    step2,
    orders: o.orders,
    units: o.units,
    revenue: o.revenue,
    aov: o.orders ? Math.round(o.revenue / o.orders) : 0,
    /* Revenue per visitor, in cents, so it renders with the same helper as
       every other money figure. */
    revenuePerVisitor: visitors ? Math.round(o.revenue / visitors) : 0,
    conversionRate: pct(o.orders, visitors),
    checkoutConversionRate: pct(o.orders, started),
    checkoutAbandonmentRate: started ? pct(started - o.orders, started) : 0,
    productToCheckoutRate: pct(started, uniqueProductViewers),
  };
}

/**
 * Per-product performance, joining event counts to order counts.
 *
 * The two sides are aggregated separately and merged by slug rather than
 * joined in one pipeline: a $lookup from a year of events onto orders is a
 * far heavier query for the same answer, and merging a few dozen rows in
 * Node costs nothing.
 */
async function products(win) {
  const [views, checkouts, step1, step2, sales] = await Promise.all([
    Event.aggregate([
      { $match: eventMatch(win, { type: 'view_product', productSlug: { $nin: [null, ''] } }) },
      { $group: { _id: '$productSlug', views: { $sum: 1 }, viewers: { $addToSet: '$sessionId' } } },
      { $project: { views: 1, viewers: { $size: '$viewers' } } },
      { $sort: { views: -1 } }, { $limit: ROW_CAP },
    ]),
    Event.aggregate([
      { $match: eventMatch(win, { type: 'checkout_click', productSlug: { $nin: [null, ''] } }) },
      { $group: { _id: '$productSlug', ids: { $addToSet: '$checkoutId' } } },
      { $project: { n: { $size: '$ids' } } },
    ]),
    Event.aggregate([
      { $match: eventMatch(win, { type: 'checkout_arrived', productSlug: { $nin: [null, ''] } }) },
      { $group: { _id: '$productSlug', ids: { $addToSet: '$checkoutId' } } },
      { $project: { n: { $size: '$ids' } } },
    ]),
    Event.aggregate([
      { $match: eventMatch(win, { type: 'checkout_payment_shown', productSlug: { $nin: [null, ''] } }) },
      { $group: { _id: '$productSlug', ids: { $addToSet: '$checkoutId' } } },
      { $project: { n: { $size: '$ids' } } },
    ]),
    Order.aggregate([
      { $match: orderMatch(win, { productSlug: { $nin: [null, ''] } }) },
      {
        $group: {
          _id: '$productSlug',
          orders: { $sum: 1 },
          units: { $sum: { $ifNull: ['$quantity', 1] } },
          revenue: { $sum: '$totalPrice' },
          refunds: { $sum: { $cond: [{ $in: ['$refundStatus', ['refunded', 'partial']] }, 1, 0] } },
          refundAmount: { $sum: { $ifNull: ['$refundAmount', 0] } },
        },
      },
    ]),
  ]);

  const by = new Map();
  const touch = (slug) => {
    if (!by.has(slug)) {
      by.set(slug, {
        slug, name: '', views: 0, viewers: 0, checkouts: 0, step1: 0, step2: 0,
        orders: 0, units: 0, revenue: 0, refunds: 0, refundAmount: 0,
      });
    }
    return by.get(slug);
  };

  views.forEach((r) => { const e = touch(r._id); e.views = r.views; e.viewers = r.viewers; });
  checkouts.forEach((r) => { touch(r._id).checkouts = r.n; });
  step1.forEach((r) => { touch(r._id).step1 = r.n; });
  step2.forEach((r) => { touch(r._id).step2 = r.n; });
  sales.forEach((r) => {
    const e = touch(r._id);
    e.orders = r.orders; e.units = r.units; e.revenue = r.revenue;
    e.refunds = r.refunds; e.refundAmount = r.refundAmount;
  });

  const slugs = [...by.keys()];
  const cat = slugs.length
    ? await Product.find({ slug: { $in: slugs } }).select('slug name').lean()
    : [];
  const nameBySlug = new Map(cat.map((p) => [p.slug, p.name || '']));

  const pct = (a, b) => (b ? (a / b) * 100 : 0);
  return [...by.values()]
    .map((e) => ({
      ...e,
      name: nameBySlug.get(e.slug) || '',
      avgPrice: e.units ? Math.round(e.revenue / e.units) : 0,
      conversionRate: pct(e.orders, e.viewers),
      viewToCheckout: pct(e.checkouts, e.viewers),
      checkoutToPurchase: pct(e.orders, e.checkouts),
      abandonmentRate: e.checkouts ? pct(e.checkouts - e.orders, e.checkouts) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.views - a.views);
}

/** One dimension of Event joined to the same dimension of Order. */
async function byDimension(win, eventField, orderField) {
  const [visitors, viewsAgg, starts, step2, sales] = await Promise.all([
    Event.aggregate([
      { $match: eventMatch(win, { type: 'page_view', [eventField]: { $nin: [null, ''] } }) },
      { $group: { _id: `$${eventField}`, sessions: { $addToSet: '$sessionId' }, hits: { $sum: 1 } } },
      { $project: { visitors: { $size: '$sessions' }, hits: 1 } },
      { $sort: { visitors: -1 } }, { $limit: ROW_CAP },
    ]),
    Event.aggregate([
      { $match: eventMatch(win, { type: 'view_product', [eventField]: { $nin: [null, ''] } }) },
      { $group: { _id: `$${eventField}`, n: { $sum: 1 } } },
    ]),
    Event.aggregate([
      { $match: eventMatch(win, { type: 'checkout_click', [eventField]: { $nin: [null, ''] } }) },
      { $group: { _id: `$${eventField}`, ids: { $addToSet: '$checkoutId' } } },
      { $project: { n: { $size: '$ids' } } },
    ]),
    Event.aggregate([
      { $match: eventMatch(win, { type: 'checkout_payment_shown', [eventField]: { $nin: [null, ''] } }) },
      { $group: { _id: `$${eventField}`, ids: { $addToSet: '$checkoutId' } } },
      { $project: { n: { $size: '$ids' } } },
    ]),
    Order.aggregate([
      { $match: orderMatch(win) },
      {
        $group: {
          _id: { $ifNull: [`$${orderField}`, ''] },
          orders: { $sum: 1 },
          units: { $sum: { $ifNull: ['$quantity', 1] } },
          revenue: { $sum: '$totalPrice' },
        },
      },
    ]),
  ]);

  const by = new Map();
  const touch = (k) => {
    const key = k || '';
    if (!by.has(key)) by.set(key, { key, visitors: 0, hits: 0, productViews: 0, starts: 0, step2: 0, orders: 0, units: 0, revenue: 0 });
    return by.get(key);
  };
  visitors.forEach((r) => { const e = touch(r._id); e.visitors = r.visitors; e.hits = r.hits; });
  viewsAgg.forEach((r) => { touch(r._id).productViews = r.n; });
  starts.forEach((r) => { touch(r._id).starts = r.n; });
  step2.forEach((r) => { touch(r._id).step2 = r.n; });
  sales.forEach((r) => {
    const e = touch(r._id);
    e.orders = r.orders; e.units = r.units; e.revenue = r.revenue;
  });

  const pct = (a, b) => (b ? (a / b) * 100 : 0);
  return [...by.values()]
    .filter((e) => e.key !== '')
    .map((e) => ({
      ...e,
      aov: e.orders ? Math.round(e.revenue / e.orders) : 0,
      conversionRate: pct(e.orders, e.visitors),
      abandonmentRate: e.starts ? pct(e.starts - e.orders, e.starts) : 0,
      revenuePerVisitor: e.visitors ? Math.round(e.revenue / e.visitors) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);
}

/* Country codes on Events; Order stores a country NAME, so the two are
   reported side by side rather than force-joined on unequal keys. */
const countries = (win) => byDimension(win, 'countryCode', 'country');
const sources = (win) => byDimension(win, 'source', 'trafficSource');

/**
 * Device split, classified from the stored User-Agent.
 *
 * The grouping happens in Node because the classification is a set of
 * regexes this codebase owns, not something Mongo can express — but only
 * over the DISTINCT user agents in the window, which is a few hundred rows
 * at most, never one per event.
 */
async function devices(win) {
  const [uaVisitors, uaOrders] = await Promise.all([
    Event.aggregate([
      { $match: eventMatch(win, { type: 'page_view' }) },
      { $group: { _id: '$userAgent', sessions: { $addToSet: '$sessionId' } } },
      { $project: { visitors: { $size: '$sessions' } } },
    ]),
    Order.aggregate([
      { $match: orderMatch(win) },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
    ]),
  ]);

  /* Checkout starts by UA, so abandonment can be split by device. Orders
     carry no user agent, so order counts cannot be attributed per device
     from Order alone — the checkout session that produced them can be, via
     checkoutId, but that join is only as complete as the events. Reported
     as starts and step-2 reach rather than pretending to per-device
     revenue we cannot substantiate. */
  const [uaStarts, uaStep2] = await Promise.all([
    Event.aggregate([
      { $match: eventMatch(win, { type: 'checkout_click' }) },
      { $group: { _id: '$userAgent', ids: { $addToSet: '$checkoutId' } } },
      { $project: { n: { $size: '$ids' } } },
    ]),
    Event.aggregate([
      { $match: eventMatch(win, { type: 'checkout_payment_shown' }) },
      { $group: { _id: '$userAgent', ids: { $addToSet: '$checkoutId' } } },
      { $project: { n: { $size: '$ids' } } },
    ]),
  ]);

  const roll = new Map();
  const touch = (k) => {
    if (!roll.has(k)) roll.set(k, { key: k, visitors: 0, starts: 0, step2: 0 });
    return roll.get(k);
  };
  uaVisitors.forEach((r) => { touch(device.deviceType(r._id)).visitors += r.visitors; });
  uaStarts.forEach((r) => { touch(device.deviceType(r._id)).starts += r.n; });
  uaStep2.forEach((r) => { touch(device.deviceType(r._id)).step2 += r.n; });

  const pct = (a, b) => (b ? (a / b) * 100 : 0);
  const rows = [...roll.values()].map((e) => ({
    ...e,
    startRate: pct(e.starts, e.visitors),
    step2Rate: pct(e.step2, e.starts),
    dropAfterStart: e.starts ? pct(e.starts - e.step2, e.starts) : 0,
  })).sort((a, b) => b.visitors - a.visitors);

  return { rows, totals: uaOrders[0] || { orders: 0, revenue: 0 } };
}

/** Browser and OS splits, same derivation. */
async function technical(win) {
  const ua = await Event.aggregate([
    { $match: eventMatch(win, { type: 'page_view' }) },
    { $group: { _id: '$userAgent', sessions: { $addToSet: '$sessionId' } } },
    { $project: { visitors: { $size: '$sessions' } } },
  ]);
  const bump = (m, k, n) => m.set(k, (m.get(k) || 0) + n);
  const browsers = new Map(); const oses = new Map();
  ua.forEach((r) => {
    bump(browsers, device.browser(r._id), r.visitors);
    bump(oses, device.os(r._id), r.visitors);
  });
  const toRows = (m) => [...m.entries()].map(([key, visitors]) => ({ key, visitors }))
    .sort((a, b) => b.visitors - a.visitors);
  return { browsers: toRows(browsers), oses: toRows(oses) };
}

/** Campaign tags. Empty until tagged traffic arrives — see models/Event.js. */
async function campaigns(win) {
  const rows = await Event.aggregate([
    { $match: eventMatch(win, { type: 'page_view', utmSource: { $nin: [null, ''] } }) },
    {
      $group: {
        _id: { source: '$utmSource', medium: '$utmMedium', campaign: '$utmCampaign' },
        sessions: { $addToSet: '$sessionId' },
      },
    },
    { $project: { visitors: { $size: '$sessions' } } },
    { $sort: { visitors: -1 } }, { $limit: ROW_CAP },
  ]);
  return rows.map((r) => ({
    source: r._id.source || '',
    medium: r._id.medium || '',
    campaign: r._id.campaign || '',
    visitors: r.visitors,
  }));
}

/**
 * Checkout stages broken down by one dimension of the checkout_click.
 *
 * WHY THIS NEEDS A JOIN AT ALL. Only the click knows what was being bought
 * and where from — it is raised server-side on this domain. Every later
 * stage is a beacon fired by the partner page, which knows nothing but its
 * zcid. So the dimension lives on the click and the stages inherit it by
 * sharing that id.
 *
 * BOUNDED BY CHECKOUT VOLUME, NOT TRAFFIC. The lookup runs from the click
 * rows outward — a few hundred in a normal window — never from page views,
 * and each lookup is served by the { checkoutId, type } index.
 *
 * Clicks recorded before this dimension was captured have no slug or
 * country and are returned under an empty key, so the total still adds up
 * and the gap is visible rather than silently dropped.
 */
async function checkoutStagesBy(win, field) {
  return Event.aggregate([
    { $match: eventMatch(win, { type: 'checkout_click', checkoutId: { $nin: [null, ''] } }) },
    {
      $lookup: {
        from: 'events',
        localField: 'checkoutId',
        foreignField: 'checkoutId',
        as: 'steps',
        pipeline: [
          { $match: { type: { $in: ['checkout_arrived', 'checkout_payment_shown', 'checkout_token_failed'] } } },
          { $project: { type: 1, _id: 0 } },
        ],
      },
    },
    {
      $project: {
        k: { $ifNull: [`$${field}`, ''] },
        types: '$steps.type',
      },
    },
    {
      $group: {
        _id: '$k',
        starts: { $sum: 1 },
        step1: { $sum: { $cond: [{ $in: ['checkout_arrived', '$types'] }, 1, 0] } },
        step2: { $sum: { $cond: [{ $in: ['checkout_payment_shown', '$types'] }, 1, 0] } },
        /* Server-side refusal: the host decided the token did not grant the
           gated experience. A technical loss, not a customer decision. */
        tokenFailed: { $sum: { $cond: [{ $in: ['checkout_token_failed', '$types'] }, 1, 0] } },
      },
    },
    { $sort: { starts: -1 } },
    { $limit: ROW_CAP },
  ]);
}

/** Which products people actually start checking out on. */
async function checkoutsByProduct(win) {
  const rows = await checkoutStagesBy(win, 'productSlug');
  const slugs = rows.map((r) => r._id).filter(Boolean);
  const cat = slugs.length
    ? await Product.find({ slug: { $in: slugs } }).select('slug name').lean()
    : [];
  const nameBySlug = new Map(cat.map((p) => [p.slug, p.name || '']));
  return rows.map((r) => ({
    slug: r._id,
    name: nameBySlug.get(r._id) || '',
    starts: r.starts,
    step1: r.step1,
    step2: r.step2,
    tokenFailed: r.tokenFailed,
    step1Rate: r.starts ? (r.step1 / r.starts) * 100 : 0,
    step2Rate: r.step1 ? (r.step2 / r.step1) * 100 : 0,
  }));
}

/** And from which country. */
async function checkoutsByCountry(win) {
  const rows = await checkoutStagesBy(win, 'countryCode');
  return rows.map((r) => ({
    country: r._id,
    starts: r.starts,
    step1: r.step1,
    step2: r.step2,
    tokenFailed: r.tokenFailed,
    step1Rate: r.starts ? (r.step1 / r.starts) * 100 : 0,
    step2Rate: r.step1 ? (r.step2 / r.step1) * 100 : 0,
  }));
}

/** Product x country, and source x product. Both capped. */
async function productByCountry(win) {
  const [views, sales] = await Promise.all([
    Event.aggregate([
      { $match: eventMatch(win, { type: 'view_product', productSlug: { $nin: [null, ''] }, countryCode: { $nin: [null, ''] } }) },
      { $group: { _id: { c: '$countryCode', p: '$productSlug' }, views: { $sum: 1 } } },
      { $sort: { views: -1 } }, { $limit: ROW_CAP },
    ]),
    Order.aggregate([
      { $match: orderMatch(win, { productSlug: { $nin: [null, ''] } }) },
      { $group: { _id: { c: { $ifNull: ['$country', ''] }, p: '$productSlug' }, orders: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
      { $sort: { revenue: -1 } }, { $limit: ROW_CAP },
    ]),
  ]);
  return { views, sales };
}

/**
 * Which channel sells which product, as a grid rather than a list.
 *
 * ONE ROW PER PRODUCT, ONE COLUMN PER CHANNEL. The pair-per-row version of
 * this answered the same question but made it unreadable: every product
 * appeared once for every channel that ever sold it, so a modest catalogue
 * across six channels was dozens of lines and comparing two products meant
 * hunting their rows apart. A product's whole channel mix now reads across
 * a single line.
 *
 * COLUMNS ARE CAPPED AND THE REST FOLDED INTO "Other". A grid gains a
 * column for every channel that ever produced one order — a stray referrer
 * would otherwise add a column of blanks across every product and push the
 * ones that matter off the screen. The kept columns are the channels with
 * the most revenue overall, so the ones worth comparing are the ones on
 * screen, and nothing is dropped: what falls outside is summed into Other
 * and the row totals still reconcile.
 */
const CHANNEL_COLUMNS = 6;

async function sourceByProduct(win) {
  const pairs = await Order.aggregate([
    { $match: orderMatch(win, { productSlug: { $nin: [null, ''] } }) },
    {
      $group: {
        _id: { s: { $ifNull: ['$trafficSource', 'Direct'] }, p: '$productSlug' },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 1000 },
  ]);

  /* Which channels earn the columns, decided across the whole grid rather
     than per product — otherwise each row would have its own column meaning
     and the grid would not be comparable down a column, which is the only
     reason to draw one. */
  const channelRevenue = new Map();
  for (const r of pairs) {
    const s = r._id.s || 'Direct';
    channelRevenue.set(s, (channelRevenue.get(s) || 0) + r.revenue);
  }
  const ranked = [...channelRevenue.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const columns = ranked.slice(0, CHANNEL_COLUMNS);
  const kept = new Set(columns);
  const hasOther = ranked.length > columns.length;

  const byProduct = new Map();
  for (const r of pairs) {
    const slug = r._id.p;
    const channel = kept.has(r._id.s || 'Direct') ? (r._id.s || 'Direct') : 'Other';
    if (!byProduct.has(slug)) {
      byProduct.set(slug, { slug, name: '', orders: 0, revenue: 0, cells: {} });
    }
    const row = byProduct.get(slug);
    row.orders += r.orders;
    row.revenue += r.revenue;
    const cell = row.cells[channel] || (row.cells[channel] = { orders: 0, revenue: 0 });
    cell.orders += r.orders;
    cell.revenue += r.revenue;
  }

  const slugs = [...byProduct.keys()];
  const cat = slugs.length
    ? await Product.find({ slug: { $in: slugs } }).select('slug name').lean()
    : [];
  const nameBySlug = new Map(cat.map((p) => [p.slug, p.name || '']));

  const rows = [...byProduct.values()]
    .map((r) => ({ ...r, name: nameBySlug.get(r.slug) || '' }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, ROW_CAP);

  /* Column totals, so a channel can be judged across the catalogue without
     the reader adding a column up by eye. */
  const totals = {};
  for (const c of [...columns, ...(hasOther ? ['Other'] : [])]) {
    totals[c] = rows.reduce((n, r) => n + ((r.cells[c] && r.cells[c].orders) || 0), 0);
  }

  return {
    columns: hasOther ? [...columns, 'Other'] : columns,
    rows,
    totals,
    grandOrders: rows.reduce((n, r) => n + r.orders, 0),
    grandRevenue: rows.reduce((n, r) => n + r.revenue, 0),
  };
}

/** Visitors, orders and revenue over time, bucketed. */
async function timeseries(win, bucket = 'day', timezone = 'UTC') {
  const fmt = { hour: '%Y-%m-%d %H:00', day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' }[bucket] || '%Y-%m-%d';
  const [traffic, orders] = await Promise.all([
    Event.aggregate([
      { $match: eventMatch(win, { type: { $in: ['page_view', 'checkout_click'] } }) },
      {
        $group: {
          _id: { b: { $dateToString: { format: fmt, date: '$createdAt', timezone } }, t: '$type' },
          sessions: { $addToSet: '$sessionId' },
        },
      },
      { $project: { n: { $size: '$sessions' } } },
      { $sort: { '_id.b': 1 } },
    ]),
    Order.aggregate([
      { $match: orderMatch(win) },
      {
        $group: {
          _id: { $dateToString: { format: fmt, date: '$createdAt', timezone } },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const by = new Map();
  const touch = (b) => {
    if (!by.has(b)) by.set(b, { bucket: b, visitors: 0, starts: 0, orders: 0, revenue: 0 });
    return by.get(b);
  };
  traffic.forEach((r) => {
    const e = touch(r._id.b);
    if (r._id.t === 'page_view') e.visitors = r.n; else e.starts = r.n;
  });
  orders.forEach((r) => { const e = touch(r._id); e.orders = r.orders; e.revenue = r.revenue; });
  return [...by.values()].sort((a, b) => (a.bucket < b.bucket ? -1 : 1));
}

/** Where sequences stop, from the recovery collection and the funnel gaps. */
async function abandonment(win) {
  const rows = await AbandonedCheckout.aggregate([
    { $match: { createdAt: { $gte: win.startDate, $lt: win.endDate } } },
    {
      $group: {
        _id: '$status',
        n: { $sum: 1 },
        /* total IS A STRING on this model — it stores what the partner host
           sent. $sum ignores non-numeric values, so summing it directly
           returns 0 for every row and the column reads as "no value at
           risk" no matter how much is. Converted explicitly, with a
           malformed or empty string contributing 0 rather than aborting
           the whole aggregation. */
        value: {
          $sum: {
            $convert: { input: '$total', to: 'double', onError: 0, onNull: 0 },
          },
        },
      },
    },
    { $sort: { n: -1 } },
  ]);
  /* Dollars here, unlike everything else on this page, because that is the
     unit the string holds. Multiplied to cents so one formatter serves the
     whole page and no panel is out by a hundred. */
  return rows.map((r) => ({
    status: r._id || 'unknown',
    count: r.n,
    value: Math.round((r.value || 0) * 100),
  }));
}

/** Repeat-purchase behaviour, by email. */
async function customers(win) {
  const rows = await Order.aggregate([
    { $match: orderMatch(win, { customerEmail: { $nin: [null, ''] } }) },
    {
      $group: {
        _id: { $toLower: '$customerEmail' },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
        first: { $min: '$createdAt' },
        last: { $max: '$createdAt' },
      },
    },
  ]);
  const total = rows.length;
  const repeat = rows.filter((r) => r.orders > 1).length;
  const revenue = rows.reduce((n, r) => n + r.revenue, 0);
  return {
    customers: total,
    repeatCustomers: repeat,
    repeatRate: total ? (repeat / total) * 100 : 0,
    avgOrdersPerCustomer: total ? rows.reduce((n, r) => n + r.orders, 0) / total : 0,
    avgCustomerValue: total ? Math.round(revenue / total) : 0,
    top: rows.sort((a, b) => b.revenue - a.revenue).slice(0, 20)
      .map((r) => ({ email: r._id, orders: r.orders, revenue: r.revenue, first: r.first, last: r.last })),
  };
}

module.exports = {
  overview, funnel, products, countries, sources, devices, technical,
  campaigns, productByCountry, sourceByProduct, timeseries, abandonment,
  checkoutsByProduct, checkoutsByCountry,
  customers, FUNNEL, ROW_CAP,
};
