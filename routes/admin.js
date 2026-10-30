const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const requireAuth = require('../middleware/auth');

/* Brute-force guard for the admin password. Without it, the login form is
   an unlimited password-guessing oracle (there is no 2FA behind it). Keyed
   per IP; counts only failures (skipSuccessfulRequests) so a working admin
   is never locked out by their own successful logins. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
});
const testOrder = require('../services/testOrder');
const customerOrders = require('../services/customerOrders');
const orderReference = require('../helpers/orderReference');
const orderAdmin = require('../services/orderAdmin');
const axios = require('axios');
const cryptoUtil = require('../services/cryptoUtil');
const mail = require('../services/mail');
const partnerClient = require('../services/partnerClient');
const metaCapi = require('../services/metaCapi');
const crypto = require('crypto');
const { generateSecret, verifySync } = require('otplib');
const qrcode = require('qrcode');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Collection = require('../models/Collection');
const Page = require('../models/Page');
const PendingPayment = require('../models/PendingPayment');
/* For site.timezone(), which every date-bucketing aggregation here has to
   pass to MongoDB explicitly — see config/site.js. */
const site = require('../config/site');
/* For recovering a payment that never became an order — see the
   /orders/pending/:orderId/create-order route. */
const { runThankYouPipeline } = require('../services/orderPipeline');
const { verifySignature } = require('../services/orderPipeline/signatureVerifier');
const { provisionFromOrder } = require('../services/customerProvisioning');
const { buildTrafficSourcePipeline, buildDirectLandingPipeline, siteHostFromEnv } = require('../services/analytics/trafficSources');
const Event = require('../models/Event');
const Visitor = require('../models/Visitor');
const Order = require('../models/Order');
const Lead = require('../models/Lead');
const SiteConfig = require('../models/SiteConfig');
const specTemplates = require('../config/specTemplates');
const variants = require('../services/variants');
const partnerRotation = require('../services/partnerRotation');
const partnerHealth = require('../services/partnerHealth');
const ChatMessage = require('../models/ChatMessage');
const ContactMessage = require('../models/ContactMessage');
const formatPrice = require('../helpers/formatPrice');
const markets = require('../config/markets');

/* Safe serialiser for data embedded in an inline <script> via <%- %>.
   Plain JSON.stringify is unsafe there — a "</script>" in the data (which
   a crafted utm_source can reach the dashboard as) closes the tag and
   injects live markup (stored XSS). Shared with the templates' global. */
const jsonForScript = require('../helpers/jsonForScript');

router.get('/test-error', (req,res) => res.status(500).send('test'));
/* ── Global Admin Middleware ─────────────────────────────── */
router.use(async (req, res, next) => {
  if (req.session && req.session.adminId) {
    try {
      res.locals.unreadChatCount = await ChatMessage.countDocuments({ sender: 'user', readByAdmin: false });
    } catch (err) {
      res.locals.unreadChatCount = 0;
    }
  }
  next();
});

/* ── Login ─────────────────────────────────────────────── */
router.get('/login', (req, res) => {
  res.render('admin/login', { layout: false, error: null });
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    /* Coerce to string before any use: a JSON/urlencoded body can make
       email/password objects (e.g. email[$ne]=1), and an object reaching
       the Mongo filter would be an operator-injection. String() closes
       that, and .toLowerCase() then works on a guaranteed string. */
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const user = email ? await User.findOne({ email }) : null;
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).render('admin/login', { layout: false, error: 'Invalid email or password.' });
    }

    // 2FA check removed per user request

    /* Regenerate the session on privilege change so a session fixed before
       login (an attacker-planted session id) cannot become an authenticated
       admin session. A fresh id is issued, then the admin marker is written
       to it. */
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Session regenerate failed on admin login:', regenErr);
        return res.status(500).render('admin/login', { layout: false, error: 'Server error. Try again.' });
      }
      req.session.adminId = user._id;
      req.session.save(() => res.redirect('/admin'));
    });
  } catch (err) {
    res.status(500).render('admin/login', { layout: false, error: 'Server error. Try again.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});


/**
 * The dashboard's date window, from the query string.
 *
 * EXTRACTED SO A DRILL-DOWN CANNOT DISAGREE WITH THE PANEL IT OPENED FROM.
 * A popup listing what is behind a number has to resolve "this week" to the
 * same two instants that number did; a second copy of this logic would be
 * right on the day it was written and wrong the first time either was
 * touched. One definition, two callers.
 *
 * Behaviour is identical to the inline version it replaces, Monday week
 * start and the custom end-date bump included.
 */
function resolveRange(req) {
  const range = req.query.range || 'today';
  const now = new Date();
  let startDate, endDate;

  if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (range === 'yesterday') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (range === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
  } else if (range === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date();
  } else if (range === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date();
  } else if (range === 'custom') {
    startDate = new Date(req.query.start);
    endDate = new Date(req.query.end);
    endDate.setDate(endDate.getDate() + 1); // include the end date fully
  } else {
    // 'all'
    startDate = new Date(0);
    endDate = new Date();
  }

  return { range, startDate, endDate };
}

/**
 * What sold through one acquisition channel — the Revenue by Channel
 * drill-down.
 *
 * The panel answers "which channel brings money". This answers "which
 * PRODUCTS that channel brings", which is the question that actually
 * changes what gets advertised where.
 *
 * Matched on the same trafficSource rule the panel groups by, which is why
 * the match is built rather than a plain equality: the panel folds an
 * absent and an empty trafficSource together under 'Direct', so selecting
 * Direct with an equality on that literal would return nothing at all.
 */
router.get('/analytics/channel-orders', requireAuth, async (req, res) => {
  try {
    const source = String(req.query.source || '').slice(0, 120);
    if (!source) return res.status(400).json({ error: 'source required' });

    const { startDate, endDate } = resolveRange(req);
    const orderQuery = {
      createdAt: { $gte: startDate, $lt: endDate },
      ...testOrder.EXCLUDE_FROM_REPORTING,
    };

    const sourceMatch = source === 'Direct'
      ? { $or: [
          { trafficSource: '' },
          { trafficSource: null },
          { trafficSource: 'Direct' },
          { trafficSource: { $exists: false } },
        ] }
      : { trafficSource: source };

    const rows = await Order.aggregate([
      { $match: { ...orderQuery, ...sourceMatch } },
      {
        $group: {
          _id: { $ifNull: ['$productSlug', ''] },
          revenue: { $sum: '$totalPrice' },
          units: { $sum: { $ifNull: ['$quantity', 1] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 50 },
    ]);

    /* Titles come from the catalogue, because an Order stores only the
       slug. A product deleted since the sale keeps showing its slug rather
       than dropping out of the list — the revenue was still real. */
    const slugs = rows.map((r) => r._id).filter(Boolean);
    const products = slugs.length
      ? await Product.find({ slug: { $in: slugs } }).select('slug name').lean()
      : [];
    const nameBySlug = new Map(products.map((p) => [p.slug, p.name || '']));

    const totals = rows.reduce(
      (a, r) => ({ revenue: a.revenue + r.revenue, units: a.units + r.units, orders: a.orders + r.orders }),
      { revenue: 0, units: 0, orders: 0 }
    );

    res.json({
      source,
      totals,
      rows: rows.map((r) => ({
        slug: r._id || '',
        name: nameBySlug.get(r._id) || '',
        revenue: r.revenue,
        units: r.units,
        orders: r.orders,
      })),
    });
  } catch (err) {
    console.error('[admin/analytics/channel-orders] failed:', err.message);
    res.status(500).json({ error: 'lookup failed' });
  }
});

/* ── Dashboard ─────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    /* Shared with the channel drill-down above, so the popup's window and
       the number it was opened from can never drift apart. */
    const { range, startDate, endDate } = resolveRange(req);

    const query = { createdAt: { $gte: startDate, $lt: endDate } };

    /* Orders only. A test purchase (see services/testOrder.js) writes a
       real Order so the customer-facing flow can be walked end to end,
       which means it would otherwise show up as revenue that nobody paid.
       Excluded HERE, once, rather than in each aggregate below — the
       failure mode of the alternative is one panel quietly disagreeing
       with the others. The Event queries keep the plain `query`: they
       count page views and clicks, which have no order to be a test of. */
    const orderQuery = { ...query, ...testOrder.EXCLUDE_FROM_REPORTING };

    /* The immediately preceding window of the SAME length, so every card
     * can say whether the number is better or worse than last time. "96
     * visitors" and "$3,899.97" mean nothing on their own; the comparison
     * is what makes them readable.
     *
     * Derived from the selected range rather than hardcoded per range, so
     * a custom 3-day span compares against the 3 days before it. The
     * all-time range has nothing to compare against, so it is skipped. */
    const rangeMs = endDate - startDate;
    const hasComparison = range !== 'all' && rangeMs > 0 && rangeMs < 400 * 24 * 60 * 60 * 1000;
    const prevQuery = hasComparison
      ? { createdAt: { $gte: new Date(startDate.getTime() - rangeMs), $lt: startDate } }
      : null;
    const prevOrderQuery = prevQuery ? { ...prevQuery, ...testOrder.EXCLUDE_FROM_REPORTING } : null;

    
    const [
      uniqueVisitors, checkouts, orders, revenueAgg,
    ] = await Promise.all([
      Event.distinct('ip', { type: 'page_view', ...query }).then(arr => arr.length),
      Event.countDocuments({ type: 'checkout_click', ...query }),
      Order.countDocuments(orderQuery),
      /* Revenue for the selected range. totalPrice is stored in cents, so
         this stays an integer all the way through and is only divided for
         display — summing dollars as floats accumulates rounding error
         across a busy day. */
      Order.aggregate([
        { $match: orderQuery },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      /* The Checkout Funnel and Checkout Destinations panels were built to
         prove the partner-experience redirect chain worked end to end.
         It does, and they were never day-to-day numbers, so both panels
         and the six queries that fed them are gone.

         The underlying events are STILL recorded (checkout_arrived,
         checkout_form_completed, checkout_payment_shown,
         checkout_payment_failed, checkout_token_failed, and the
         destination on checkout_click). Nothing about the beacons
         changed, so the panels can be rebuilt from history whenever a
         redirect problem needs diagnosing again, and Reached Checkout
         above still reads checkout_payment_shown directly. */
    ]);

    /* Reached Checkout: got as far as the payment step.
     *
     * "Confirmed Arrivals" used to sit here, and it reported the same
     * number as Checkouts in practice, so the card carried no information.
     * This counts the checkouts where a checkout_payment_shown beacon
     * fired — the customer filled the form and Whop's payment iframe
     * actually rendered — which is a genuinely later, narrower step than
     * the Checkouts card next to it.
     *
     * Buyers are INCLUDED. The card previously read "Abandoned Checkouts"
     * and subtracted the ones that converted, but the subtraction never
     * matched anything: it joined Event.checkoutId (the zcid this site
     * mints) against Order.checkoutId, which orderModel fills from
     * raw.checkout_id — and the partner checkout page sends the Whop PLAN
     * id in that field, not the zcid. So the figure on screen has always
     * been this count, and the label is what was wrong. Left as a plain
     * count rather than repairing the join, because the join lives on the
     * order-pipeline side of the checkout logic. */
    const paymentShownIds = await Event.distinct('checkoutId', {
      type: 'checkout_payment_shown',
      checkoutId: { $nin: ['', null] },
      ...query,
    });
    const reachedCheckout = paymentShownIds.length;

    const revenue = (revenueAgg[0] && revenueAgg[0].total) || 0;

    /* Previous-period equivalents. Only the four headline figures are
     * compared: the others are either ratios derived from these or, like
     * the live count, not tied to the window at all. */
    let previous = null;
    if (prevQuery) {
      const [pVisitors, pCheckouts, pOrders, pRevenueAgg] = await Promise.all([
        Event.distinct('ip', { type: 'page_view', ...prevQuery }).then(a => a.length),
        Event.countDocuments({ type: 'checkout_click', ...prevQuery }),
        Order.countDocuments(prevOrderQuery),
        Order.aggregate([{ $match: prevOrderQuery }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      ]);
      previous = {
        views: pVisitors,
        checkouts: pCheckouts,
        orders: pOrders,
        revenue: (pRevenueAgg[0] && pRevenueAgg[0].total) || 0,
      };
    }

    /* Revenue by acquisition channel. The Traffic Sources panel counts
     * VISITORS per channel, which answers "who shows up" but not "who
     * pays" — and those routinely disagree by an order of magnitude. This
     * is the one that decides where ad money goes.
     *
     * Order.trafficSource is the first-touch channel resolved at checkout
     * time (see resolveTrafficSource in routes/frontend.js), not the
     * referrer of the final click. */
    const revenueBySource = await Order.aggregate([
      { $match: orderQuery },
      {
        $group: {
          _id: { $ifNull: [{ $cond: [{ $eq: ['$trafficSource', ''] }, 'Direct', '$trafficSource'] }, 'Direct'] },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]);
    const revenueBySourceTotal = revenueBySource.reduce((n, r) => n + r.revenue, 0) || 1;

    /* Top products by REVENUE. The views-based panel below ranks a $12
     * pack above a $1,759 program whenever the cheap thing is browsed
     * more, which is exactly backwards for deciding what to restock or
     * advertise. */
    const topProductsByRevenue = await Order.aggregate([
      { $match: { ...orderQuery, productSlug: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$productSlug',
          revenue: { $sum: '$totalPrice' },
          units: { $sum: { $ifNull: ['$quantity', 1] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]);

    /* Payments a partner host confirmed where the customer's browser never
     * reached our /thank-you, so no order exists. This already appears on
     * the Orders page, but it is the one figure that represents money
     * possibly taken and not recorded, so it belongs where you look first.
     * Not scoped to the date range: an unresolved payment stays a problem
     * regardless of which window is selected. */
    const unconfirmedPaymentCount = await PendingPayment.countDocuments({
      resolvedOrderId: null,
      acknowledgedAt: null,
    });

    // Top products by views (always use a recent window like last 7 days or the selected range)
    const topProductsQuery = (range === 'today' || range === 'yesterday') ? query : { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } };
    const topProducts = await Event.aggregate([
      { $match: { type: 'view_product', ...topProductsQuery } },
      { $group: { _id: '$productSlug', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    // Top countries by unique visitors (by IP)
    const topCountries = await Event.aggregate([
      { $match: { type: 'page_view', country: { $nin: ['', null] }, ...query } },
      { $group: { _id: '$country', ips: { $addToSet: '$ip' } } },
      { $project: { _id: 1, views: { $size: '$ips' } } },
      { $sort: { views: -1 } },
      { $limit: 15 },
    ]);

    /* Hourly unique visitors breakdown (by IP).
     *
     * The timezone is passed EXPLICITLY. $hour runs inside MongoDB, which
     * knows nothing about the process's TZ, so without this every bar sat
     * one hour to the left of the wall clock: a visitor at 12AM local was
     * drawn under 11PM. Setting process.env.TZ fixed the timestamps Node
     * prints and left this untouched. */
    const hourlyData = await Event.aggregate([
      { $match: { type: 'page_view', ...query } },
      { $group: { _id: { $hour: { date: '$createdAt', timezone: site.timezone() } }, ips: { $addToSet: '$ip' } } },
      { $project: { _id: 1, count: { $size: '$ips' } } },
      { $sort: { _id: 1 } },
    ]);
    // Fill all 24 hours (0-23) with 0 if no data
    const hourlyChart = Array(24).fill(0);
    hourlyData.forEach(h => { hourlyChart[h._id] = h.count; });

    /* Traffic sources: one row per UNIQUE VISITOR, credited to the channel
     * that actually brought them. The pipeline itself lives in
     * services/analytics/trafficSources.js, with the full explanation of
     * what the previous per-pageview version got wrong. */
    const sourceData = await Event.aggregate(
      buildTrafficSourcePipeline(query, siteHostFromEnv())
    ).allowDiskUse(true);

    /* What the remaining Direct visitors are, by landing page. A visitor
     * landing on "/" plausibly typed the address; one landing straight on
     * a product URL followed a link from somewhere that stripped the
     * referrer. Both are real, they just cannot name themselves. */
    const directLandings = await Event.aggregate(
      buildDirectLandingPipeline(query, siteHostFromEnv())
    ).allowDiskUse(true);

    const totalSourceVisitors = sourceData.reduce((sum, s) => sum + s.count, 0) || 1;
    const trafficSources = sourceData.map(s => ({
      name: s._id || 'Direct',
      count: s.count,
      percent: ((s.count / totalSourceVisitors) * 100).toFixed(1)
    }));

    // Live visitors (seen in last 5 minutes, grouped by IP)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const rawLiveVisitors = await Visitor.find({ lastSeen: { $gte: fiveMinAgo } }).sort({ lastSeen: -1 }).lean();
    
    // Deduplicate by IP to get actual live humans/bots
    const ipMap = new Map();
    rawLiveVisitors.forEach(v => {
      if (!ipMap.has(v.ip)) {
        ipMap.set(v.ip, v); // Keeps the most recent one since we sorted by lastSeen -1
      }
    });
    const liveVisitors = Array.from(ipMap.values());

    // Globe data: recent visitors with coordinates (last 5 minutes — matches Live Now)
    const globePins = await Event.aggregate([
      { $match: { type: 'page_view', lat: { $ne: null }, lon: { $ne: null }, createdAt: { $gte: fiveMinAgo } } },
      { $group: { _id: { ip: '$ip', lat: '$lat', lon: '$lon' }, country: { $first: '$country' } } },
      { $group: { _id: { lat: '$_id.lat', lon: '$_id.lon' }, country: { $first: '$country' }, count: { $sum: 1 } } },
      { $project: { _id: 0, lat: '$_id.lat', lng: '$_id.lon', country: '$country', count: '$count' } },
      { $limit: 200 },
    ]);

    res.render('admin/dashboard', {
      directLandings,
      previous,
      revenueBySource: revenueBySource.map(r => ({ name: r._id, revenue: r.revenue, orders: r.orders })),
      revenueBySourceTotal,
      topProductsByRevenue,
      unconfirmedPaymentCount,
      layout: false,
      pageTitle: 'Dashboard',
      stats: {
        views: uniqueVisitors, checkouts, orders, revenue, reachedCheckout,
      },
      range,
      startDate: req.query.start || '',
      endDate: req.query.end || '',
      topProducts,
      topCountries: topCountries || [],
      liveVisitors,
      formatPrice,
      hourlyChart: jsonForScript(hourlyChart),
      trafficSources: jsonForScript(trafficSources),
      globePins: jsonForScript(globePins),
    }, (err, html) => {
      if (err) {
        // Log the detail server-side; the browser gets a generic 500 so a
        // render error can't leak template internals or data shapes.
        console.error('Dashboard render error:', err && err.stack ? err.stack : err);
        return res.status(500).send('Internal Server Error');
      }
      res.send(html);
    });
  } catch (err) {
    console.error('Dashboard route error:', err);
    res.status(500).send('Dashboard Route Error: ' + err.message);
  }
});

/* ── Sales / Orders Dashboard ────────────────────────────── */
/* Mark an unconfirmed payment as handled so it drops off the orders page.
 * Deliberately does NOT create an order: if this payment should become one,
 * that is a decision to make explicitly, not a side effect of dismissing a
 * notice. */
router.post('/orders/pending/:orderId/acknowledge', requireAuth, async (req, res) => {
  try {
    await PendingPayment.updateOne(
      { orderId: req.params.orderId },
      { $set: { acknowledgedAt: new Date() } }
    );
  } catch (err) {
    console.error('[admin] could not acknowledge pending payment:', err.message);
  }
  res.redirect('/admin/orders');
});

/* Turn a recorded payment into the order it should have been.
 *
 * WHAT THIS IS FOR. A payment is reported to us server-to-server the moment
 * Whop settles it; an Order is written only when the customer's browser
 * reaches /thank-you. When that arrival never happens — tab closed on the
 * redirect, a dead connection — the money is real and the customer has
 * nothing: no confirmation email, no account, no order to look at. This is
 * the button that finishes the job.
 *
 * IT RUNS THE REAL PIPELINE on the payload we stored at the time, rather
 * than hand-building an Order. runThankYouPipeline is what creates the
 * order, closes the checkout session, closes the abandoned-checkout row,
 * sends the confirmation email, pushes to the phone, converts the pooled
 * address and reports to Meta. Reimplementing any of that here would mean
 * two definitions of what an order is, and the second would drift.
 *
 * THE SIGNATURE IS RE-CHECKED, with the age limit lifted and nothing else.
 * The HMAC still has to hold, so a payload edited in the database cannot
 * become an order. The 30-minute freshness window is dropped deliberately:
 * it exists to stop a *link* being replayed, and this is not a link — it is
 * an authenticated admin acting on a record that only exists because the
 * same signature already verified once, when it arrived.
 *
 * SAFE TO PRESS TWICE. The pipeline keys on orderId and reports isNew — the
 * same mechanism that makes refreshing the thank-you page harmless — so a
 * second press finds the existing order and re-sends nothing. */
router.post('/orders/pending/:orderId/create-order', requireAuth, async (req, res) => {
  const orderId = String(req.params.orderId || '');
  const back = (params) => res.redirect('/admin/orders?' + new URLSearchParams(params).toString());

  try {
    const pending = await PendingPayment.findOne({ orderId }).lean();
    if (!pending) return back({ recoverError: 'No recorded payment with that id.' });
    if (pending.resolvedOrderId) {
      return back({ recoverError: `Already resolved as order ${pending.resolvedOrderId}.` });
    }
    if (!pending.payload || typeof pending.payload !== 'object') {
      return back({ recoverError: 'That payment was recorded without its signed payload, so no order can be built from it. Create it by hand from the Whop receipt.' });
    }

    const check = verifySignature(pending.payload, process.env.THANK_YOU_SIGNING_SECRET, Infinity);
    if (!check.valid) {
      return back({ recoverError: `Stored payload failed verification (${check.reason}). No order created.` });
    }

    const result = await runThankYouPipeline(pending.payload);
    if (!result.ok || !result.order) {
      const why = (result.errors && Object.values(result.errors).join('; ')) || 'unknown reason';
      return back({ recoverError: `Pipeline refused the payload: ${why}` });
    }

    /* The account, so the customer can actually find the order at /account.
       signIn:false — this is the admin's browser, not the buyer's. */
    await provisionFromOrder(result.order, req, res, { signIn: false });

    await PendingPayment.updateOne(
      { orderId, resolvedOrderId: null },
      { $set: { resolvedOrderId: result.order.orderId, resolvedAt: new Date(), acknowledgedAt: new Date() } }
    );

    console.log(`[admin] recovered payment ${orderId} into order ${result.order.orderId} (new: ${result.isNew})`);
    return back({ recovered: result.order.orderId, recoveredNew: result.isNew ? '1' : '0' });
  } catch (err) {
    console.error(`[admin] could not recover pending payment ${orderId}:`, err);
    return back({ recoverError: err.message });
  }
});

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const range = req.query.range || 'monthly';
    const now = new Date();
    let startDate = new Date(0); // all time

    if (range === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const query = { createdAt: { $gte: startDate } };

    // Aggregates for the metric cards (computed before the source filter,
    // so the top cards always reflect the full date range regardless of
    // which source the table below is filtered to).
    /* Same exclusion as the dashboard: the table below still LISTS test
       orders, tagged, because seeing one is the point of making it. It is
       the money that must not count them. */
    const statsResult = await Order.aggregate([
      { $match: { ...query, ...testOrder.EXCLUDE_FROM_REPORTING } },
      { $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 }
      }}
    ]);

    const stats = statsResult[0] || { totalRevenue: 0, totalOrders: 0 };
    const aov = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

    /* ── The table ────────────────────────────────────────────────
       Filtered by what you actually do with this page — find an order,
       and see what still needs packing — rather than by which payment
       provider produced it. The provider column is gone: with one
       checkout flow and test orders tagged separately, it was a column
       of the same word repeated.

       PAGINATED. This query previously had no limit at all and returned
       every order in the range, which was survivable at fifty and is not
       at five thousand: the whole collection was serialised into one
       HTML page on every load. */
    const statusFilter = String(req.query.status || 'all');
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const PER_PAGE = 50;

    const tableQuery = { ...query };
    const STATUS_QUERIES = {
      unfulfilled: { fulfillmentStatus: 'unfulfilled', cancelledAt: null },
      preparing: { fulfillmentStatus: 'preparing', cancelledAt: null },
      shipped: { fulfillmentStatus: 'shipped' },
      delivered: { fulfillmentStatus: 'delivered' },
      cancelled: { cancelledAt: { $ne: null } },
      refunded: { refundStatus: { $in: ['processing', 'refunded'] } },
    };
    if (STATUS_QUERIES[statusFilter]) Object.assign(tableQuery, STATUS_QUERIES[statusFilter]);

    if (q) {
      /* Escaped, because a search box that accepts a regex is a search
         box that accepts a denial of service. */
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      tableQuery.$or = [
        { customerEmail: rx }, { customerName: rx }, { orderId: rx },
        { paymentId: rx }, { products: rx }, { trackingNumber: rx },
      ];
      /* A ZTCG- reference is DERIVED from the order id, not stored, so it
         cannot be matched by a query. Resolved separately below. */
    }

    const [orders, totalMatching] = await Promise.all([
      Order.find(tableQuery).sort({ createdAt: -1 })
        .skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean(),
      Order.countDocuments(tableQuery),
    ]);

    /* Searching by the reference a customer actually quotes. The
       reference is a hash of the order id, so there is nothing to match
       in the database — but it is the ONLY identifier a customer has,
       and "search by the number in your email" is the single most
       common thing this page is opened to do. Scoped to the current
       date range so the scan stays bounded. */
    let referenceHit = null;
    if (q && /^(ZTCG-)?\d{4,5}$/i.test(q)) {
      const wanted = (q.toUpperCase().startsWith('ZTCG-') ? q : 'ZTCG-' + q).toUpperCase();
      const candidates = await Order.find(query).select('orderId paymentId').lean();
      const match = candidates.find((o) => orderReference(o) === wanted);
      if (match) referenceHit = await Order.findOne({ orderId: match.orderId }).lean();
    }

    const rows = referenceHit
      ? [referenceHit, ...orders.filter((o) => o.orderId !== referenceHit.orderId)]
      : orders;

    /* Products, for the real customer-facing status. Without them a
       preorder reads as an ordinary unfulfilled order, which is the
       difference between "why has this not shipped" and "this is not
       out yet". */
    const slugs = [...new Set(rows.map((o) => o.productSlug).filter(Boolean))];
    const products = slugs.length
      ? await Product.find({ slug: { $in: slugs } })
        .select('slug title imageUrl images preorder tags releaseDate preorderShips').lean()
      : [];
    const productBySlug = new Map(products.map((p) => [p.slug, p]));

    /* The customer account behind each order, so a row is one click from
       the profile instead of a copy-paste into another search box. */
    const emails = [...new Set(rows.map((o) => (o.customerEmail || '').toLowerCase()).filter(Boolean))];
    const customers = emails.length
      ? await Customer.find({ email: { $in: emails } }).select('_id email').lean()
      : [];
    const customerByEmail = new Map(customers.map((c) => [c.email, c._id]));

    const decorated = rows.map((o) => {
      const product = productBySlug.get(o.productSlug) || null;
      const d = customerOrders.decorate(o, product);
      return {
        order: o,
        reference: d.reference,
        status: d.status,
        isPreorder: d.isPreorder,
        release: d.release,
        title: (product && product.title) || (o.products || [])[0] || '',
        customerId: customerByEmail.get((o.customerEmail || '').toLowerCase()) || null,
      };
    });

    /* Payments a partner host confirmed with Whop where the customer's
     * browser never reached our /thank-you, so no order was ever created.
     * These are real money that is not in the orders table below, and the
     * whole point of separating the two is that they surface here instead
     * of quietly inflating the order count. Unacknowledged only, so a case
     * you have already dealt with stops reappearing. */
    const unconfirmedPayments = await PendingPayment.find({
      resolvedOrderId: null,
      acknowledgedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const pages = Math.max(1, Math.ceil(totalMatching / PER_PAGE));

    res.render('admin/orders', {
      layout: false,
      pageTitle: 'Sales & Orders',
      range, statusFilter, q,
      notice: req.query.notice || '',
      /* For the recover-payment flash. Read only for its own keys in the
         template, and every value is escaped there. */
      query: req.query,
      stats: {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        aov: aov
      },
      unconfirmedPayments,
      rows: decorated,
      page,
      pages,
      perPage: PER_PAGE,
      total: totalMatching,
      /* First and last row NUMBER in the whole result set, so the pager
         can say "51 to 100 of 380" rather than making somebody multiply
         a page number by a page size in their head. */
      from: totalMatching === 0 ? 0 : (page - 1) * PER_PAGE + 1,
      to: Math.min(page * PER_PAGE, totalMatching),
    });
  } catch (err) {
    console.error('Orders dashboard error:', err);
    res.status(500).send('Server Error');
  }
});

/* ── Order Management Routes ─────────────────────────────── */
router.post('/orders/:id/complete', requireAuth, async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { status: 'completed' });
    res.redirect('/admin/orders');
  } catch (err) {
    console.error('Complete order error:', err);
    res.redirect('/admin/orders');
  }
});

/**
 * Cancels an order from the orders list.
 *
 * The same operation as the one on the customer page, through the same
 * service, so both queue the refund and both send the customer the same
 * email. It exists here as well because this is the page staff are
 * already looking at when a cancellation request arrives by email — and
 * because a customer who cannot sign in cannot cancel it themselves,
 * which is the case this is for.
 */
router.post('/orders/:id/cancel', requireAuth, async (req, res) => {
  const back = req.get('Referer') || '/admin/orders';
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.redirect(back);

    const result = await orderAdmin.cancelOrder(order, {
      reason: String((req.body && req.body.reason) || 'Cancelled by staff on customer request'),
      by: 'admin',
    });

    const sep = back.includes('?') ? '&' : '?';
    if (!result.ok) return res.redirect(`${back}${sep}notice=cancel_${result.reason}`);
    return res.redirect(`${back}${sep}notice=${result.changed ? 'cancelled' : 'cancel_already_cancelled'}`);
  } catch (err) {
    console.error('[admin] cancel order failed:', err);
    res.redirect(back);
  }
});

router.post('/orders/:id/delete', requireAuth, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.redirect('/admin/orders');
  } catch (err) {
    console.error('Delete order error:', err);
    res.redirect('/admin/orders');
  }
});

/* ── Manual CAPI Trigger ───────────────────────────────── */
/* Sends a sample order push, so the phone setup can be verified without
 * waiting for a real sale. Uses the same builder and the same senders the
 * live path uses, so a success here really does mean the next order will
 * arrive — testing through a different code path would prove nothing. */
router.post('/api/test-push', requireAuth, async (req, res) => {
  const pushNotify = require('../services/pushNotify');
  if (!pushNotify.isConfigured()) {
    return res.status(400).json({
      success: false,
      error: 'No push provider configured. Set BARK_KEY (iPhone) or NTFY_TOPIC in the environment, then redeploy.',
    });
  }
  try {
    const sample = pushNotify.buildOrderPush({
      orderId: 'TEST-' + Date.now(),
      totalPrice: 44997,
      currency: 'USD',
      productSlug: 'op-17-booster-box',
      quantity: 3,
      customerName: 'Test Customer',
      trafficSource: 'Facebook',
    });
    /* Sent verbatim, with no "test" marker, so what arrives is exactly
       what a real order looks like. The trade-off is deliberate: a test
       push is now indistinguishable from a real sale, so do not fire one
       and then forget you did. */
    const results = await pushNotify.sendPush(sample);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === results.length) {
      return res.status(502).json({ success: false, error: failed.map((f) => `${f.provider}: ${f.error}`).join('; ') });
    }
    return res.json({ success: true, results });
  } catch (err) {
    console.error('[test-push] failed:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/manual-capi', requireAuth, async (req, res) => {
  try {
    const { value, email } = req.body;
    const result = await metaCapi.sendPurchaseEvent({ value, email });
    if (!result.ok) {
      const status = result.error === 'missing_credentials' ? 400 : result.error === 'invalid_value' ? 400 : 500;
      const message =
        result.error === 'missing_credentials' ? 'Missing Meta Pixel ID or Access Token in .env'
        : result.error === 'invalid_value' ? 'Invalid order value'
        : 'Failed to send to Meta';
      return res.status(status).json({ success: false, error: message });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Manual CAPI error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send to Meta' });
  }
});

/* ── Live Chat Dashboard ─────────────────────────────────── */
router.get('/chats', requireAuth, async (req, res) => {
  try {
    // Group messages by sessionId to figure out the distinct conversations
    // We want the latest messages and unread count per session
    const chatStats = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: "$sessionId",
          lastMessage: { $first: "$message" },
          lastSender: { $first: "$sender" },
          lastDate: { $first: "$createdAt" },
          unreadCount: { 
            $sum: { $cond: [ { $and: [ { $eq: ["$sender", "user"] }, { $eq: ["$readByAdmin", false] } ] }, 1, 0 ] }
          }
      }},
      { $sort: { lastDate: -1 } }
    ]);

    // If an active session is requested, fetch full thread
    const activeSessionId = req.query.session || (chatStats.length > 0 ? chatStats[0]._id : null);
    let activeMessages = [];
    
    if (activeSessionId) {
      activeMessages = await ChatMessage.find({ sessionId: activeSessionId }).sort({ createdAt: 1 }).lean();
      // Mark these messages as read
      await ChatMessage.updateMany({ sessionId: activeSessionId, sender: 'user', readByAdmin: false }, { $set: { readByAdmin: true } });
    }

    res.render('admin/chats', {
      layout: false,
      pageTitle: 'Live Chat',
      chatStats,
      activeSessionId,
      activeMessages
    });
  } catch (err) {
    console.error('Chats dashboard error:', err);
    res.status(500).send('Server Error');
  }
});

/* ── Live Chat Admin Reply Endpoint ──────────────────────── */
router.post('/api/chats/:sessionId/reply', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
    
    const chatMsg = await ChatMessage.create({
      sessionId: sessionId,
      sender: 'admin',
      message: message.trim(),
      readByAdmin: true
    });
    
    res.json({ success: true, chatMsg });
  } catch (err) {
    console.error('Chat reply error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ── Manual CAPI Trigger ───────────────────────────────── */
router.post('/api/manual-capi', requireAuth, async (req, res) => {
  try {
    const { value, email, date } = req.body;
    if (!value || isNaN(value)) {
      return res.status(400).json({ success: false, error: 'Invalid order value' });
    }

    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    if (!pixelId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing Meta Pixel ID or Access Token in .env' });
    }

    let eventTime = Math.floor(Date.now() / 1000);
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        eventTime = Math.floor(parsedDate.getTime() / 1000);
      }
    }

    const payload = {
      data: [{
        event_name: 'Purchase',
        event_time: eventTime,
        action_source: 'website',
        user_data: {
          em: email ? [crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')] : []
        },
        custom_data: {
          currency: 'USD',
          value: parseFloat(value)
        }
      }]
    };

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    await axios.post(url, payload);
    console.log(`[CAPI] Purchase event fired: $${parseFloat(value).toFixed(2)} at ${new Date().toISOString()}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Manual CAPI error:', err.response ? err.response.data : err.message);
    res.status(500).json({ success: false, error: 'Failed to send to Meta' });
  }
});

/* ── Live Visitors API (for real-time polling) ─────────── */
router.get('/api/live-visitors', requireAuth, async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const rawVisitors = await Visitor.find({ lastSeen: { $gte: fiveMinAgo } }).sort({ lastSeen: -1 }).lean();
    
    // Deduplicate by IP to get actual live humans/bots
    const ipMap = new Map();
    rawVisitors.forEach(v => {
      if (!ipMap.has(v.ip)) {
        ipMap.set(v.ip, v);
      }
    });
    const visitors = Array.from(ipMap.values());
    res.json({ count: visitors.length, visitors });
  } catch (err) {
    res.json({ count: 0, visitors: [] });
  }
});

/* ── Leads & Marketing ─────────────────────────────────── */
router.get('/leads', requireAuth, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).lean();
    res.render('admin/leads', { layout: false, leads }, (err, html) => {
      if (err) {
        console.error('Leads render error:', err);
        return res.status(500).send('Leads Render Error: ' + err.message);
      }
      res.send(html);
    });
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

/* ── Contact-form messages ─────────────────────────────── */
router.get('/messages', requireAuth, async (req, res) => {
  try {
    /* Capped rather than unbounded: this list is read newest-first and a
       find() with no limit becomes a slow page the moment the form gets
       any real traffic. */
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(200).lean();
    const newCount = await ContactMessage.countDocuments({ status: 'new' });
    // assetVersion is an app.local, so it is already in scope for the view.
    res.render('admin/messages', {
      layout: false,
      messages,
      newCount,
      /* Passed explicitly rather than leaned on from res.locals: this view
         renders with layout:false and is the only place that needs it, so
         a middleware change elsewhere should not be able to turn the page
         into a ReferenceError. */
      supportEmail: require('../config/company').business.supportEmail,
      /* Outcome of a reply, round-tripped through the redirect so a refresh
         cannot resend anything. */
      sent: typeof req.query.sent === 'string' ? req.query.sent : '',
      error: typeof req.query.error === 'string' ? req.query.error : '',
    });
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

router.post('/messages/:id/status', requireAuth, async (req, res) => {
  try {
    const status = ['new', 'read', 'answered'].includes(req.body.status) ? req.body.status : 'read';
    await ContactMessage.findByIdAndUpdate(req.params.id, { status });
  } catch (err) {
    console.error('[admin] message status update failed:', err.message);
  }
  res.redirect('/admin/messages');
});

/**
 * Answers a contact message, for real.
 *
 * Until this existed the page could only record that a reply had happened
 * somewhere else — the two buttons set a status field and sent nothing — so
 * answering meant leaving the admin, composing in a mail client, and coming
 * back to press a button that captured no evidence of what was said.
 *
 * The reply goes out through the same services/mail as every other message:
 * rendered from a registered template, retried on a transient SMTP failure,
 * and logged in /admin/email with a delivery status. The text is stored on
 * the message too, so whoever opens the thread next can see what was
 * promised rather than only that something was.
 *
 * ONLY MARKED ANSWERED IF THE SEND ACTUALLY SUCCEEDED. A status reading
 * "answered" over an email that never left is worse than one still reading
 * "new", because the first is what stops anybody looking again.
 */
router.post('/messages/:id/reply', requireAuth, async (req, res) => {
  const back = '/admin/messages';
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res.redirect(`${back}?error=${encodeURIComponent('That message no longer exists.')}`);
    }

    const body = String(req.body.reply || '').trim().slice(0, 5000);
    if (body.length < 2) {
      return res.redirect(`${back}?error=${encodeURIComponent('Write something before sending.')}#m-${message._id}`);
    }

    const result = await mail.send('supportReply', {
      to: message.email,
      data: {
        name: message.name,
        reply: body,
        /* Their original, quoted underneath, so the answer still makes
           sense on its own days later. */
        message: message.message,
      },
    });

    if (!result.ok) {
      console.error('[admin] reply to', message.email, 'was not sent:', result.error || result.status);
      return res.redirect(`${back}?error=${encodeURIComponent(`The reply was NOT sent (${result.error || result.status}). Nothing was recorded, so you can try again.`)}#m-${message._id}`);
    }

    message.replies.push({ body, sentAt: new Date(), emailLogId: result.logId || null });
    message.status = 'answered';
    await message.save();

    return res.redirect(`${back}?sent=${encodeURIComponent(message.email)}#m-${message._id}`);
  } catch (err) {
    console.error('[admin] reply failed:', err.message);
    return res.redirect(`${back}?error=${encodeURIComponent('Something went wrong sending that reply.')}`);
  }
});

/* ── Products ──────────────────────────────────────────── */
router.get('/products', requireAuth, async (req, res) => {
  const { q, collection, sort } = req.query;
  let query = {};
  let sortObj = { createdAt: -1 };

  // Search
  if (q && q.trim()) {
    query.$or = [
      { title: { $regex: q.trim(), $options: 'i' } },
      { vendor: { $regex: q.trim(), $options: 'i' } },
      { slug: { $regex: q.trim(), $options: 'i' } },
    ];
  }

  // Filter by collection
  if (collection && collection !== 'all') {
    query.collections = collection;
  }

  // Sort
  if (sort === 'price-asc') sortObj = { price: 1 };
  else if (sort === 'price-desc') sortObj = { price: -1 };
  else if (sort === 'title') sortObj = { title: 1 };
  else if (sort === 'stock') sortObj = { stock: 1 };

  const products = await Product.find(query).sort(sortObj).lean();
  const collections = await Collection.find().sort({ sortOrder: 1 }).lean();

  res.render('admin/products', {
    layout: false,
    pageTitle: 'Products',
    products,
    collections,
    q: q || '',
    collection: collection || 'all',
    sort: sort || 'newest',
    formatPrice,
    success: req.query.success || null,
  });
});

router.get('/products/new', requireAuth, (req, res) => {
  res.render('admin/product-form', { layout: false, pageTitle: 'Add Product', product: null, error: null, success: null, formatPrice, specTemplates, variantAxes: variants.VARIANT_AXES, allMarkets: require('../config/markets').MARKETS });
});

router.post('/products', requireAuth, async (req, res) => {
  try {
    const data = parseProductBody(req.body);
    await Product.create(data);
    res.redirect('/admin/products?success=Product+created+successfully');
  } catch (err) {
    console.error(err);
    res.render('admin/product-form', { layout: false, pageTitle: 'Add Product', product: req.body, error: err.message, success: null, formatPrice, specTemplates, variantAxes: variants.VARIANT_AXES, allMarkets: require('../config/markets').MARKETS });
  }
});

router.get('/products/:id/edit', requireAuth, async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.redirect('/admin/products');
  res.render('admin/product-form', { layout: false, pageTitle: 'Edit Product', product, error: null, success: null, formatPrice, specTemplates, variantAxes: variants.VARIANT_AXES, allMarkets: require('../config/markets').MARKETS });
});

router.post('/products/:id', requireAuth, async (req, res) => {
  try {
    const data = parseProductBody(req.body);
    await Product.findByIdAndUpdate(req.params.id, data, { runValidators: true });
    res.redirect('/admin/products?success=Product+updated+successfully');
  } catch (err) {
    const product = { ...req.body, _id: req.params.id };
    res.render('admin/product-form', { layout: false, pageTitle: 'Edit Product', product, error: err.message, success: null, formatPrice, specTemplates, variantAxes: variants.VARIANT_AXES, allMarkets: require('../config/markets').MARKETS });
  }
});

router.post('/products/:id/delete', requireAuth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect('/admin/products?success=Product+deleted');
});

/* ── Quick inline update (AJAX) ────────────────────────── */
router.post('/products/:id/quick-update', requireAuth, async (req, res) => {
  try {
    const { field, value } = req.body;
    const allowed = ['title', 'price', 'stock', 'available'];
    if (!allowed.includes(field)) return res.json({ success: false, error: 'Field not allowed' });

    let updateVal = value;
    if (field === 'price') updateVal = Math.round(parseFloat(value) * 100) || 0;
    if (field === 'stock') updateVal = parseInt(value) || 0;
    if (field === 'available') updateVal = value === 'true';

    await Product.findByIdAndUpdate(req.params.id, { [field]: updateVal });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

  /* ── Settings (Partner Experience) ─────────────────────────────────────── */
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.adminId).lean();

    let partnerExperience = await SiteConfig.getValue('partnerExperience', {
      enabled: false,
      apiKey: '',
      routes: [],
      savedSites: []
    });
    if (!partnerExperience.savedSites) partnerExperience.savedSites = [];

    // Auto-migrate old single-route config
    if (partnerExperience.url !== undefined && !partnerExperience.routes) {
      partnerExperience.routes = [{
        label: 'Default Route',
        url: partnerExperience.url,
        experienceId: partnerExperience.experienceId || 'partner',
        productSlugs: partnerExperience.targetProductSlugs ? partnerExperience.targetProductSlugs.split(',').map(s => s.trim()).filter(Boolean) : [],
        apiKey: '', // overrides use empty string if not set
        lastConnectionStatus: partnerExperience.lastConnectionStatus || { status: 'Not tested', timestamp: null }
      }];
      delete partnerExperience.url;
      delete partnerExperience.experienceId;
      delete partnerExperience.targetProductSlugs;
      delete partnerExperience.lastConnectionStatus;
      await SiteConfig.setValue('partnerExperience', partnerExperience);
    } else if (!partnerExperience.routes) {
      partnerExperience.routes = [];
    }

      /* Counts for the historical panel. Pooled email is retired — nothing
         claims an address any more — so these only ever describe what the
         scheme did while it ran, and none of them can grow. */
      const PartnerEmail = require('../models/PartnerEmail');
      const emailTotal = await PartnerEmail.countDocuments();
      const emailAvailable = await PartnerEmail.countDocuments({ status: 'available' });
      const emailUsed = await PartnerEmail.countDocuments({ status: 'used' });
      /* Permanently linked to a confirmed order. This is the one status the
         pool is authoritative for: `used` and `available` were both rewritten
         by the release sweep, which is why the export reads the checkout
         sessions rather than trusting these. */
      const emailConverted = await PartnerEmail.countDocuments({ status: 'converted' });
      const partnerEmailStats = { total: emailTotal, available: emailAvailable, used: emailUsed, converted: emailConverted };

      /* Bring an older config forward before anything reads it — legacy
         routes into sites, and site-wide ladders into per-product ones.
         Idempotent, so a page refresh rewrites nothing; it only writes back
         on the load that actually moved something. */
      {
        const migrated = partnerRotation.migrate(partnerExperience);
        if (migrated.changed) {
          partnerExperience = migrated.config;
          await SiteConfig.setValue('partnerExperience', partnerExperience);
        }
      }

      /* Every product on sale, with the price the grid is computed from.
         Nothing is configured per product any more, so what the screen shows
         instead is what the arithmetic decided — and, for anything excluded,
         why. */
      const partnerProducts = await Product.find({ available: true }, { slug: 1, title: 1, price: 1 })
        .sort({ title: 1 }).lean();

      const partnerMapping = partnerRotation.mapping(partnerExperience, partnerProducts);
      /* The cycle itself, and what happened after the last few orders. The
         rotation is otherwise a claim: every way it can go wrong looks like
         a working checkout that merely favours one host. */
      const partnerOrder = partnerRotation.rotationOrder(partnerExperience);
      const partnerHistory = (partnerExperience.history || []).slice(0, partnerRotation.HISTORY_LIMIT);
      const partnerLadders = (partnerExperience.savedSites || []).map((site) => ({
        id: site.id,
        ...partnerRotation.ladderStatus(site),
      }));

      res.render('admin/settings', { 
        layout: false, 
        pageTitle: 'Settings', 
        user,
        partnerExperience,
        partnerEmailStats,
        partnerProducts,
        partnerMapping,
        partnerLadders,
        partnerOrder,
        partnerHistory,
        allMarkets: require('../config/markets').MARKETS,
      /* Read once and cleared. A CSV that fails can fail on forty rows, and
         forty messages do not fit in a query string — so the report travels
         in the session and this is the only page that shows it. */
      partnerImport: (() => { const r = req.session && req.session.partnerImport; if (req.session) delete req.session.partnerImport; return r || null; })(),
      success: req.query.success || null, 
      error: req.query.error || null 
    }, (err, html) => {
      if (err) {
        console.error('Settings render error:', err);
        return res.status(500).send('Settings Render Error: ' + err.message);
      }
      res.send(html);
    });
  } catch (err) {
    console.error('Settings route error:', err);
    res.status(500).send('Server Error: ' + err.message);
  }
});

/* ── Partner Experience ──────────────────────────────────── */

router.post('/settings/partner-experience', requireAuth, async (req, res) => {
  try {
    const { enabled, apiKey, routeLabel, routeUrl, routeExperienceId, routeSlugs, routeApiKey, routeWhopPlanId, routeBundlePlans, routeSavedSiteId } = req.body;
    const isEnabled = enabled === 'on';

    let existingConfig = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [] });
    if (existingConfig.url !== undefined && !existingConfig.routes) {
      existingConfig.routes = [{
        label: 'Default Route',
        url: existingConfig.url,
        experienceId: existingConfig.experienceId || 'partner',
        productSlugs: existingConfig.targetProductSlugs ? existingConfig.targetProductSlugs.split(',').map(s => s.trim()).filter(Boolean) : [],
        apiKey: '',
        lastConnectionStatus: existingConfig.lastConnectionStatus || { status: 'Not tested', timestamp: null }
      }];
    }
    
    // Encrypt the shared API key if a new one is provided
    let finalSharedApiKey = existingConfig.apiKey;
    if (apiKey && apiKey.trim() !== '') {
      finalSharedApiKey = cryptoUtil.encrypt(apiKey.trim());
    }

    // Process route arrays
    const toArray = (val) => (Array.isArray(val) ? val : (val ? [val] : []));
    const labels = toArray(routeLabel);
    const urls = toArray(routeUrl);
    const expIds = toArray(routeExperienceId);
    const slugs = toArray(routeSlugs);
    const apiKeys = toArray(routeApiKey);
    const whopPlanIds = toArray(routeWhopPlanId);
    const bundlePlansRaw = toArray(routeBundlePlans);
    const savedSiteIds = toArray(routeSavedSiteId);

    // Parses the "quantity:planId:totalPrice" per-line textarea into
    // [{ quantity, whopPlanId, price }], used by resolvePartnerRedirect() to
    // route a qty > 1 checkout to a real, fixed-price Whop plan built for
    // that exact quantity — never a guessed/multiplied price, since Whop
    // only ever charges what a plan_id is actually configured for. Silently
    // skips malformed lines rather than rejecting the whole save, so one typo
    // doesn't block saving the rest of the route.
    function parseBundlePlans(raw) {
      if (!raw || !raw.trim()) return [];
      const out = [];
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(':');
        if (parts.length < 3) continue;
        const quantity = parseInt(parts[0], 10);
        const whopPlanId = parts[1].trim();
        const price = parseFloat(parts[2]);
        if (!quantity || quantity < 2 || !whopPlanId || !Number.isFinite(price) || price <= 0) continue;
        out.push({ quantity, whopPlanId, price });
      }
      return out;
    }

    const routesToSave = [];
    const allSlugs = new Set();
    
    for (let i = 0; i < urls.length; i++) {
      if (!urls[i] || urls[i].trim() === '') continue;
      
      const rUrl = urls[i].trim();
      if (!rUrl.startsWith('https://')) {
        return res.redirect('/admin/settings?error=All+route+URLs+must+be+absolute+https+URLs');
      }

      const rSlugsRaw = slugs[i] ? slugs[i].split(',').map(s => s.trim()).filter(Boolean) : [];
      for (const s of rSlugsRaw) {
        if (allSlugs.has(s)) {
          return res.redirect('/admin/settings?error=Duplicate+product+slug+found+across+multiple+routes:+' + s);
        }
        allSlugs.add(s);
      }

      let rApiKey = '';
      if (apiKeys[i] && apiKeys[i].trim() !== '') {
        rApiKey = cryptoUtil.encrypt(apiKeys[i].trim());
      } else {
        // preserve existing if left blank
        const existingRoute = existingConfig.routes.find(r => r.url === rUrl && r.experienceId === expIds[i].trim());
        if (existingRoute && existingRoute.apiKey) {
          rApiKey = existingRoute.apiKey;
        }
      }

      const existingRoute2 = existingConfig.routes.find(r => r.url === rUrl && r.experienceId === expIds[i].trim());

      routesToSave.push({
        label: labels[i] ? labels[i].trim() : 'Route',
        url: rUrl,
        experienceId: expIds[i] ? expIds[i].trim() : 'partner',
        productSlugs: rSlugsRaw,
        apiKey: rApiKey,
        // Which Saved Site (if any) supplies this route's API key when no
        // per-route override is set above — see savedSites on configToSave
        // below and the resolution chain in resolvePartnerRedirect.
        savedSiteId: savedSiteIds[i] ? savedSiteIds[i].trim() : null,
        whopPlanId: whopPlanIds[i] ? whopPlanIds[i].trim() : '',
        bundlePlans: parseBundlePlans(bundlePlansRaw[i]),
        lastConnectionStatus: existingRoute2?.lastConnectionStatus || { status: 'Not tested', timestamp: null }
      });
    }

    const configToSave = {
      /* SPREAD FIRST, so this form only ever changes the switches it owns.
         Rebuilding the object from scratch silently dropped the rotation
         cursor and the order history on every save — the cycle restarted at
         site one each time anyone touched the pooled-email checkbox, which
         is exactly the kind of reset nobody would connect to the thing they
         just clicked. */
      ...existingConfig,
      enabled: isEnabled,
      apiKey: finalSharedApiKey,
      /* usePooledEmail and emptyPoolBehavior are not written any more. They
         are also not deleted from a config that already holds them: nothing
         reads either one, and a migration that rewrites live config to drop
         two dead keys is more risk than the keys are. */
      routes: routesToSave,
      // This form only carries the integration switches and the shared key;
      // sites are edited by their own routes above. Carry the list through
      // untouched so saving the switches never wipes it.
      savedSites: existingConfig.savedSites || []
    };

    // If enabled, perform a connection test for EVERY route before saving
    if (isEnabled && configToSave.routes.length > 0) {
      let anyFailed = false;
      let failMessage = '';
      
      for (let i = 0; i < configToSave.routes.length; i++) {
        const route = configToSave.routes[i];
        try {
          const site = route.savedSiteId ? configToSave.savedSites.find(s => s.id === route.savedSiteId) : null;
          const testConfig = {
            url: route.url,
            apiKey: (route.apiKey ? cryptoUtil.decrypt(route.apiKey)
              : site && site.apiKey ? cryptoUtil.decrypt(site.apiKey)
              : cryptoUtil.decrypt(configToSave.apiKey)) || process.env.PARTNER_EXPERIENCE_API_KEY,
            experienceId: route.experienceId
          };
          await partnerClient.getPartnerToken(testConfig);
          route.lastConnectionStatus = { status: 'Connected', timestamp: new Date() };
        } catch (err) {
          let status = 'Unreachable';
          if (err.name === 'PartnerAuthError') status = 'Auth failed';
          if (err.name === 'PartnerExperienceNotFoundError') status = 'Experience not found';
          if (err.name === 'PartnerUnavailableError') status = 'Unavailable';
          
          route.lastConnectionStatus = { status, timestamp: new Date() };
          anyFailed = true;
          if (!failMessage) failMessage = `Route "${route.label}" failed: ${status}`;
        }
      }
      
      if (anyFailed) {
        configToSave.enabled = false;
        await SiteConfig.setValue('partnerExperience', configToSave);
        return res.redirect(`/admin/settings?error=Integration+disabled.+${encodeURIComponent(failMessage)}`);
      }
    }

    await SiteConfig.setValue('partnerExperience', configToSave);
    res.redirect('/admin/settings?success=Partner+Experience+Settings+Saved');
  } catch (err) {
    console.error('Partner config save error:', err);
    res.redirect('/admin/settings?error=Failed+to+save+Partner+config');
  }
});

/* ── Partner Experience: removing a site ─────────────────────
 * The add and edit routes live above with the rest of the site handling.
 * Only delete is here, keeping the URL the screen has always posted to.
 *
 * The route that USED to sit here — saved-sites/add, taking a name, a base
 * URL, an API key and a list of experience ids — is gone with the form that
 * fed it. Every field it collected either belongs to the site form above or
 * turned out to be the same value on every host. */
router.post('/settings/partner-experience/saved-sites/:id/delete', requireAuth, async (req, res) => {
  try {
    const existingConfig = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    existingConfig.savedSites = (existingConfig.savedSites || []).filter(s => s.id !== req.params.id);
    // Routes that referenced the deleted site fall back to their own
    // override or the shared key on the very next request — never leave a
    // route pointing at an id that no longer resolves to anything.
    for (const route of existingConfig.routes || []) {
      if (route.savedSiteId === req.params.id) route.savedSiteId = null;
    }
    await SiteConfig.setValue('partnerExperience', existingConfig);
    res.redirect('/admin/settings?success=Saved+site+removed');
  } catch (err) {
    console.error('Saved site delete error:', err);
    res.redirect('/admin/settings?error=Failed+to+remove+saved+site');
  }
});

/* ── Partner Sites ─────────────────────────────────────────
 * A site holds everything routing one product to one host needs: the
 * service URL, the experience id, the key, the quantity-1 plan, the bundle
 * ladder, which products it may sell and whether it is switched on.
 *
 * WHY THIS REPLACED ROUTES. All of those facts belong to the site. Routes
 * made them belong to a pairing of site and product, so a second product on
 * the same host meant retyping the URL, the key, the experience id and the
 * whole ladder — and pausing a host meant deleting it. Everything below
 * edits one site; which products it sells is a checkbox list, and rotation
 * falls out of several sites listing the same product.
 *
 * Legacy routes are untouched and still resolve when no site claims a
 * product, so nothing configured before this stops selling.
 */

/**
 * The twelve plan ids for one site, from a textarea.
 *
 * FORGIVING ABOUT FORMAT, STRICT ABOUT POSITION. Plan ids get pasted in
 * whatever shape they were copied — a bare id per line, or the
 * "3:plan_xxx:224.97" form the Whop side hands back. Both are accepted, and
 * a line carrying its own step number is placed at THAT step rather than
 * wherever it happened to appear. Position is the whole meaning of a rung,
 * so a pasted list missing a line would otherwise shift every plan below it
 * up one and quietly sell each step at the previous step's price.
 *
 * Blank lines are kept as blanks for the same reason.
 */
function parseLadder(raw) {
  const rungs = new Array(partnerRotation.LADDER_STEPS).fill('');
  if (!raw) return rungs;
  const lines = String(raw).split('\n');
  let seq = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { seq++; continue; }
    const parts = trimmed.split(':').map((x) => x.trim());
    let step = null;
    let id = trimmed;
    if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
      step = parseInt(parts[0], 10);
      id = parts[1];
    } else {
      step = seq + 1;
      id = parts[parts.length >= 2 ? 1 : 0];
    }
    seq++;
    if (!/^plan_[A-Za-z0-9]+$/.test(id)) continue;
    if (step >= 1 && step <= rungs.length) rungs[step - 1] = id;
  }
  return rungs;
}

/** Everything a site form submits, normalised. Shared by add and update. */
function readSiteForm(body) {
  const dollars = parseFloat(body.siteUnitPrice);
  return {
    name: String(body.siteName || '').trim(),
    url: String(body.siteUrl || '').trim(),
    /* The step, in cents. Everything downstream divides product prices by
       it with integer arithmetic — 224.97 / 74.99 in floating point is
       2.9999999999999996, which floors to 2 and sells a three-step product
       at two steps' price. */
    unitCents: Number.isFinite(dollars) && dollars > 0
      ? Math.round(dollars * 100)
      : partnerRotation.DEFAULT_UNIT_CENTS,
    plans: parseLadder(body.sitePlans),
    /* ── One ladder per country ────────────────────────────────────────
       Keyed by market id, so Germany and France hold separate plan ids
       despite sharing the euro. A market with no ids is OMITTED rather
       than stored empty: services/market reads the presence of a ladder
       as the signal that the market can be charged, and an empty one
       would say "open" while resolving no plan. */
    ladders: require('../config/markets').MARKETS
      .filter((m) => !m.isDefault)
      .reduce((acc, m) => {
        const plans = parseLadder(body[`ladder_${m.id}_plans`]);
        if (!plans.some(Boolean)) return acc;
        const unit = parseFloat(body[`ladder_${m.id}_unit`]);
        acc[m.id] = {
          unitCents: Number.isFinite(unit) && unit > 0
            ? Math.round(unit * 100)
            : partnerRotation.DEFAULT_UNIT_CENTS,
          plans,
        };
        return acc;
      }, {}),
    enabled: body.siteEnabled === 'on',
    /* Which group the site belongs to, '' meaning none. Stored on the site
       rather than as a list of ids on the group so a site can only ever be
       in one place, and so moving it is a single write that cannot leave it
       in two groups at once. */
    groupId: String(body.siteGroupId || '').trim(),
    /* Undefined, not 1, when the field is blank: absent means "inherit",
       and services/partnerRotation reads it that way. Writing 1 would
       pin the site to one order and look identical to a deliberate
       choice, which is how an override nobody set ends up overriding a
       group that did. */
    salesPerSite: (() => {
      const n = parseInt(String(body.siteSalesPerSite || '').trim(), 10);
      return Number.isFinite(n) && n >= 1 ? Math.min(n, partnerRotation.MAX_SALES_PER_SITE) : undefined;
    })(),
  };
}

/* ── Groups ──────────────────────────────────────────────────────────
   A group is a switch over several sites at once. See
   services/partnerRotation: the group flag and the site flag are ANDed, so
   a group can pause a set without erasing which of its members were
   individually paused, and resuming it cannot wake those back up. */
router.post('/settings/partner-experience/groups/add', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.groupName || '').trim();
    if (!name) return res.redirect('/admin/settings?error=A+group+needs+a+name');
    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    if (!Array.isArray(config.groups)) config.groups = [];
    config.groups.push({ id: crypto.randomUUID(), name, enabled: true });
    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(`Group ${name} created`));
  } catch (err) {
    console.error('Partner group add error:', err);
    res.redirect('/admin/settings?error=Failed+to+create+the+group');
  }
});

router.post('/settings/partner-experience/groups/:id', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.groupName || '').trim();
    if (!name) return res.redirect('/admin/settings?error=A+group+needs+a+name');
    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const group = (config.groups || []).find((g) => g.id === req.params.id);
    if (!group) return res.redirect('/admin/settings?error=That+group+no+longer+exists');
    group.name = name;
    /* Blank clears the override and lets the global default apply again;
       that is why this is a delete rather than a write of 1, which would
       be indistinguishable from someone deliberately choosing 1. */
    const paceRaw = String(req.body.groupSalesPerSite || '').trim();
    if (!paceRaw) {
      delete group.salesPerSite;
    } else {
      const n = parseInt(paceRaw, 10);
      if (!Number.isFinite(n) || n < 1 || n > partnerRotation.MAX_SALES_PER_SITE) {
        return res.redirect('/admin/settings?error=' + encodeURIComponent(
          `Orders per site must be blank, or between 1 and ${partnerRotation.MAX_SALES_PER_SITE}`));
      }
      group.salesPerSite = n;
    }
    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(
      `Group saved: ${name}${group.salesPerSite ? ` — ${group.salesPerSite} orders per site` : ''}`));
  } catch (err) {
    console.error('Partner group rename error:', err);
    res.redirect('/admin/settings?error=Failed+to+rename+the+group');
  }
});

router.post('/settings/partner-experience/groups/:id/toggle', requireAuth, async (req, res) => {
  try {
    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const group = (config.groups || []).find((g) => g.id === req.params.id);
    if (!group) return res.redirect('/admin/settings?error=That+group+no+longer+exists');
    group.enabled = group.enabled === false;
    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(`${group.name} ${group.enabled ? 'resumed' : 'paused'}`));
  } catch (err) {
    console.error('Partner group toggle error:', err);
    res.redirect('/admin/settings?error=Failed+to+change+the+group');
  }
});

/* Deleting a group RELEASES its sites rather than deleting them. Losing a
   grouping must never lose a configured ladder, and a site that silently
   vanished with its group would take its plan ids with it. */
router.post('/settings/partner-experience/groups/:id/delete', requireAuth, async (req, res) => {
  try {
    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const group = (config.groups || []).find((g) => g.id === req.params.id);
    if (!group) return res.redirect('/admin/settings?error=That+group+no+longer+exists');
    let released = 0;
    for (const site of config.savedSites || []) {
      if (site.groupId === group.id) { site.groupId = ''; released += 1; }
    }
    config.groups = (config.groups || []).filter((g) => g.id !== group.id);
    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(
      `Group ${group.name} removed${released ? ` — ${released} site${released === 1 ? '' : 's'} kept, now ungrouped` : ''}`));
  } catch (err) {
    console.error('Partner group delete error:', err);
    res.redirect('/admin/settings?error=Failed+to+remove+the+group');
  }
});

/* ── How many orders a site takes before its turn ends ──────────────
   Its own tiny route rather than a field on the big integration form,
   because that form is about keys and switches and this is about how the
   rotation paces itself. Also means changing it cannot accidentally
   rewrite anything else on the config. */
router.post('/settings/partner-experience/rotation', requireAuth, async (req, res) => {
  try {
    const raw = String(req.body.salesPerSite || '').trim();
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > partnerRotation.MAX_SALES_PER_SITE) {
      return res.redirect('/admin/settings?error=' + encodeURIComponent(
        `Orders per site must be a whole number between 1 and ${partnerRotation.MAX_SALES_PER_SITE}`));
    }

    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const before = partnerRotation.salesPerSite(config);
    config.salesPerSite = n;

    /* A turn already further along than the new limit would otherwise run
       until it happened to pass the number, which reads as the setting
       being ignored. Reset it and let the current site start a fresh turn
       at the new length. */
    if (partnerRotation.cursorServed(config) >= n) config.cursorServed = 0;

    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(
      before === n
        ? `Orders per site unchanged at ${n}`
        : `Each site now takes ${n} order${n === 1 ? '' : 's'} before the rotation moves on`));
  } catch (err) {
    console.error('Rotation pacing error:', err);
    res.redirect('/admin/settings?error=Failed+to+change+the+rotation');
  }
});

/**
 * Import sites and their ladders from a CSV.
 *
 * ALL OR NOTHING. services/partnerImport collects every problem it finds
 * rather than stopping at the first, and if there is one this writes
 * nothing. A partial import is the worst outcome available: some sites
 * would have ladders and some would not, both look the same on the screen,
 * and the only way to tell them apart is a test purchase.
 *
 * MATCHED BY URL. The url is what the rotation actually redirects to, so a
 * row whose url already exists updates that site rather than adding a
 * second one beside it. The id, the stats and anything else already on the
 * record survive — re-importing a corrected file must not reset the order
 * counts a site has earned.
 *
 * The group comes from the form, not the file. See partnerImport for why.
 */
router.post(
  '/settings/partner-experience/sites/import',
  requireAuth,
  /* Its own parser: the app-wide urlencoded limit is 100kb and a file of
     ten sites is about half that, which leaves no room to grow. */
  express.urlencoded({ extended: false, limit: '1mb' }),
  async (req, res) => {
    try {
      const { parseSitesCsv } = require('../services/partnerImport');
      const { sites, errors, warnings } = parseSitesCsv(req.body.csv);

      if (errors.length) {
        req.session.partnerImport = { ok: false, errors, warnings, added: 0, updated: 0 };
        return req.session.save(() => res.redirect('/admin/settings?error=' + encodeURIComponent(
          `The file was not imported — ${errors.length} problem${errors.length === 1 ? '' : 's'} to fix`)));
      }
      if (!sites.length) {
        return res.redirect('/admin/settings?error=' + encodeURIComponent('That file had no rows'));
      }

      const groupId = String(req.body.importGroupId || '').trim();
      const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
      if (!config.savedSites) config.savedSites = [];
      /* A group id that no longer exists would leave every imported site
         answering to a switch that is not on the screen. */
      if (groupId && !(config.groups || []).some((g) => g && g.id === groupId)) {
        return res.redirect('/admin/settings?error=' + encodeURIComponent('That group no longer exists'));
      }

      /* ── A plan id already in use on a site this file does not mention ──
         The parser catches an id repeated inside the file. It cannot see
         what is already saved, and that is the likelier collision: a ladder
         pasted into the wrong Whop business, exported, then imported
         alongside the site it was copied from. Two sites holding one id
         means one of them charges the other's plan — the money lands in the
         wrong account, and both screens look perfectly filled in. */
      const incomingUrls = new Set(sites.map((s) => s.url));
      const idsOf = (s) => {
        const all = [...((s && s.plans) || [])];
        for (const lad of Object.values((s && s.ladders) || {})) all.push(...((lad && lad.plans) || []));
        return all.filter(Boolean);
      };
      const takenIds = new Map();
      for (const saved of config.savedSites) {
        if (!saved || incomingUrls.has(String(saved.url || '').trim())) continue;
        for (const id of idsOf(saved)) takenIds.set(id, saved.name || saved.url);
      }
      const collisions = [];
      for (const s of sites) {
        for (const id of idsOf(s)) {
          if (takenIds.has(id)) collisions.push(`Plan ${id} is already on ${takenIds.get(id)}, so ${s.name} cannot also use it.`);
        }
      }
      if (collisions.length) {
        req.session.partnerImport = { ok: false, errors: collisions, warnings, added: 0, updated: 0 };
        return req.session.save(() => res.redirect('/admin/settings?error=' + encodeURIComponent(
          `The file was not imported — ${collisions.length} plan id${collisions.length === 1 ? ' is' : 's are'} already in use`)));
      }

      let added = 0;
      let updated = 0;
      for (const s of sites) {
        const existing = config.savedSites.find((x) => x && String(x.url || '').trim() === s.url);
        const fields = {
          name: s.name,
          url: s.url,
          unitCents: s.unitCents,
          plans: s.plans,
          ladders: s.ladders,
          groupId,
          baseUrl: (() => { try { return new URL(s.url).origin; } catch { return ''; } })(),
        };
        if (existing) {
          /* ── What an update may NOT quietly take away ──────────────────
             MARKETS ABSENT FROM THE FILE ARE KEPT. Replacing `ladders`
             wholesale means a US-only correction file silently closes the
             euro market on a site that was selling in it: services/market
             reads the presence of a ladder as the signal that a market can
             be charged, so it just stops, with nothing on any screen saying
             why. A file states what it knows; it does not assert the
             absence of what it does not mention. Removing a market stays a
             deliberate act on that site's own card.

             THE GROUP IS ONLY WRITTEN WHEN ONE WAS CHOSEN. '' is the
             select's default, so writing it through would pull every
             re-imported site out of its group — and a group is a pause
             switch, so that would resume a paused set without a click. */
          const kept = Object.keys(existing.ladders || {}).filter((m) => !(m in (s.ladders || {})));
          fields.ladders = { ...(existing.ladders || {}), ...(s.ladders || {}) };
          if (kept.length) {
            warnings.push(`${s.name}: the file has no ${kept.join(', ')} rows, so the ${kept.length === 1 ? 'ladder' : 'ladders'} already saved for ${kept.join(', ')} ${kept.length === 1 ? 'was' : 'were'} kept.`);
          }
          if (!groupId) delete fields.groupId;
          Object.assign(existing, fields);
          if (!existing.stats) existing.stats = { orders: 0, lastOrderAt: null };
          updated++;
        } else {
          config.savedSites.push({
            id: crypto.randomUUID(),
            ...fields,
            /* Imported sites arrive ACTIVE.
               They used to arrive paused, on the reasoning that a file
               saying what a site CAN charge is not a decision that it
               SHOULD start taking orders. That reasoning did not survive
               contact with a batch: the file is uploaded precisely to put
               those sites into the rotation, and eight sites each needing
               a separate click produced exactly one failure mode — the
               site somebody forgot, sitting configured and silent while
               the operator believed the batch was live.

               The checks that actually protect a buyer are elsewhere and
               are unchanged: an incomplete ladder cannot price anything,
               a price off the grid abandons the hop rather than charging
               a near-miss, a plan id already saved on another site is
               refused above, and a site whose checkout stops converting is
               suspended automatically (services/partnerHealth.js). None of
               those depended on the pause.

               Pausing one is still a click, and it is still per site. */
            enabled: true,
            stats: { orders: 0, lastOrderAt: null },
          });
          added++;
        }
      }

      await SiteConfig.setValue('partnerExperience', config);
      req.session.partnerImport = { ok: true, errors: [], warnings, added, updated };
      req.session.save(() => res.redirect('/admin/settings?success=' + encodeURIComponent(
        `Imported ${added} new and ${updated} updated site${added + updated === 1 ? '' : 's'}` +
        (added ? ' — new sites are active and in the rotation' : ''))));
    } catch (err) {
      console.error('Partner site import error:', err);
      res.redirect('/admin/settings?error=Failed+to+import+the+file');
    }
  },
);

router.post('/settings/partner-experience/sites/add', requireAuth, async (req, res) => {
  try {
    const form = readSiteForm(req.body);
    if (!form.name) return res.redirect('/admin/settings?error=A+site+needs+a+name');
    if (!/^https:\/\//i.test(form.url)) {
      return res.redirect('/admin/settings?error=The+service+URL+must+be+an+absolute+https+URL');
    }

    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    if (!config.savedSites) config.savedSites = [];

    config.savedSites.push({
      id: crypto.randomUUID(),
      ...form,
      /* Kept for the legacy route picker, which lists sites by base URL. */
      baseUrl: (() => { try { return new URL(form.url).origin; } catch { return ''; } })(),
      stats: { orders: 0, lastOrderAt: null },
    });

    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(`${form.name} added`));
  } catch (err) {
    console.error('Partner site add error:', err);
    res.redirect('/admin/settings?error=Failed+to+add+the+site');
  }
});

router.post('/settings/partner-experience/sites/:id', requireAuth, async (req, res) => {
  try {
    const form = readSiteForm(req.body);
    if (!/^https:\/\//i.test(form.url)) {
      return res.redirect('/admin/settings?error=The+service+URL+must+be+an+absolute+https+URL');
    }

    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const site = (config.savedSites || []).find((s) => s.id === req.params.id);
    if (!site) return res.redirect('/admin/settings?error=That+site+no+longer+exists');

    Object.assign(site, form);
    site.baseUrl = (() => { try { return new URL(form.url).origin; } catch { return ''; } })();
    if (!site.stats) site.stats = { orders: 0, lastOrderAt: null };

    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(`${form.name || 'Site'} saved`));
  } catch (err) {
    console.error('Partner site save error:', err);
    res.redirect('/admin/settings?error=Failed+to+save+the+site');
  }
});

/* Pause and resume, which is the whole reason enabled exists as a flag
   rather than deletion being the only way to stop a host taking sales. */
router.post('/settings/partner-experience/sites/:id/toggle', requireAuth, async (req, res) => {
  try {
    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const site = (config.savedSites || []).find((s) => s.id === req.params.id);
    if (!site) return res.redirect('/admin/settings?error=That+site+no+longer+exists');
    site.enabled = site.enabled === false;
    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=' + encodeURIComponent(`${site.name} ${site.enabled ? 'resumed' : 'paused'}`));
  } catch (err) {
    console.error('Partner site toggle error:', err);
    res.redirect('/admin/settings?error=Failed+to+change+the+site');
  }
});

/* Reset the counters without touching the configuration — for after a run
   of test orders, so the real figures start from zero. */
router.post('/settings/partner-experience/sites/:id/reset-stats', requireAuth, async (req, res) => {
  try {
    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const site = (config.savedSites || []).find((s) => s.id === req.params.id);
    if (!site) return res.redirect('/admin/settings?error=That+site+no+longer+exists');
    site.stats = { orders: 0, lastOrderAt: null };
    await SiteConfig.setValue('partnerExperience', config);
    res.redirect('/admin/settings?success=Counters+reset');
  } catch (err) {
    console.error('Partner site stats reset error:', err);
    res.redirect('/admin/settings?error=Failed+to+reset+the+counters');
  }
});

/* Put an auto-suspended site back in the rotation.
   The counter is cleared as well as the state — see partnerHealth.restore
   for why restoring without that reads as a button that does nothing. */
router.post('/settings/partner-experience/sites/:id/restore', requireAuth, async (req, res) => {
  try {
    const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
    const site = (config.savedSites || []).find((s) => s.id === req.params.id);
    if (!site) return res.redirect('/admin/settings?error=That+site+no+longer+exists');
    await partnerHealth.restore(site.id, 'admin');
    res.redirect('/admin/settings?success=' + encodeURIComponent(`${site.name || site.id} restored to the rotation`));
  } catch (err) {
    console.error('Partner site restore error:', err);
    res.redirect('/admin/settings?error=Failed+to+restore+the+site');
  }
});

router.post('/api/partner-test', requireAuth, async (req, res) => {
  try {
    const { url, apiKey, experienceId, savedSiteId } = req.body;

    let testApiKey = apiKey;

    // If the API key is blank/masked in the form, figure out what it should
    // be: this exact route's own saved override, then the saved site this
    // route is linked to (if any — see savedSiteId), then the account-wide
    // shared key. Mirrors resolvePartnerRedirect's resolution order in
    // routes/frontend.js, so "Test Connection" always reflects what a real
    // checkout would actually use.
    if (!testApiKey || testApiKey.trim() === '') {
      const existingConfig = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
      let existingRoute = existingConfig.routes && existingConfig.routes.find(r => r.url === (url||'').trim() && r.experienceId === (experienceId||'').trim());

      const site = savedSiteId ? (existingConfig.savedSites || []).find(s => s.id === savedSiteId) : null;

      if (existingRoute && existingRoute.apiKey) {
        testApiKey = cryptoUtil.decrypt(existingRoute.apiKey);
      } else if (site && site.apiKey) {
        testApiKey = cryptoUtil.decrypt(site.apiKey);
      } else {
        testApiKey = cryptoUtil.decrypt(existingConfig.apiKey);
      }
    }
    
    // Test the token endpoint
    try {
      await partnerClient.getPartnerToken({
        url: url.trim(),
        apiKey: testApiKey,
        experienceId: experienceId.trim() || 'partner'
      });
      
      // Update stored status for this specific route if possible
      const existingConfig = await SiteConfig.getValue('partnerExperience', null);
      if (existingConfig && existingConfig.routes) {
         let existingRoute = existingConfig.routes.find(r => r.url === url.trim() && r.experienceId === experienceId.trim());
         if (existingRoute) {
           existingRoute.lastConnectionStatus = { status: 'Connected', timestamp: new Date() };
           await SiteConfig.setValue('partnerExperience', existingConfig);
         }
      }
      
      return res.json({ success: true, status: 'Connected' });
    } catch (err) {
      let status = 'Unreachable';
      if (err.name === 'PartnerAuthError') status = 'Auth failed';
      if (err.name === 'PartnerExperienceNotFoundError') status = 'Experience not found';
      if (err.name === 'PartnerUnavailableError') status = 'Unavailable';
      
      const existingConfig = await SiteConfig.getValue('partnerExperience', null);
      if (existingConfig && existingConfig.routes) {
         let existingRoute = existingConfig.routes.find(r => r.url === url.trim() && r.experienceId === experienceId.trim());
         if (existingRoute) {
           existingRoute.lastConnectionStatus = { status, timestamp: new Date() };
           await SiteConfig.setValue('partnerExperience', existingConfig);
         }
      }
      
      return res.json({ success: false, status, error: err.message });
    }
  } catch (err) {
    console.error('Connection test error:', err);
    res.status(500).json({ success: false, status: 'Unreachable', error: 'Internal Server Error' });
  }
});

/* ── The pooled-email record ─────────────────────────────────────────
   The scheme is gone (docs/pooled-email.md). What it wrote is not: an
   order sitting under one of our addresses is unattributable without the
   row that recorded the substitution, so the collection is now read-only.

   ADD, RELEASE AND CLEAR ARE DELETED, and their absence is the point.
   Nothing new is ever claimed, so "add" would fill a pool nothing draws
   from. "Release" reset usedFor to null, which is what destroyed the
   history of every address that was handed out and never converted.
   "Clear" deleted the lot, converted rows included — the button's own
   confirm text admitted it was "permanently losing which customer each
   one was linked to". Keeping a one-click version of that next to a
   record we now rely on is how it goes on a day someone is tired.

   The two downloads below are the whole interface. Both are gathered by
   services/partnerEmailHistory, which scripts/export-partner-emails.js
   also uses, so clicking and running cannot produce different files. */
router.get('/settings/partner-experience/emails/export.csv', requireAuth, async (req, res) => {
  try {
    const history = require('../services/partnerEmailHistory');
    const { rows, detail } = await history.collect();
    const wantDetail = req.query.detail === '1';
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="partner-emails${wantDetail ? '-detail' : ''}-${stamp}.csv"`);
    res.send(wantDetail ? history.toDetailCsv(detail) : history.toSummaryCsv(rows));
  } catch (err) {
    console.error('Partner email export error:', err);
    res.redirect('/admin/settings?error=Failed+to+build+the+export');
  }
});

// Generate 2FA Secret
router.post('/settings/2fa/generate', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.adminId);
    const secret = generateSecret();
    user.twoFactorSecret = secret;
    await user.save();
    
    const otpauth = 'otpauth://totp/GoGetCards:' + encodeURIComponent(user.email) + '?secret=' + secret + '&issuer=GoGetCards';
    const qrCodeUrl = await qrcode.toDataURL(otpauth);
    
    res.json({ success: true, secret, qrCodeUrl });
  } catch (err) {
    console.error('2FA Generate Error:', err);
    res.json({ success: false, error: 'Failed to generate 2FA' });
  }
});

// Verify & Enable 2FA
router.post('/settings/2fa/verify', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.session.adminId);
    
    const result = verifySync({ token, secret: user.twoFactorSecret });
    if (result && result.valid) {
      user.twoFactorEnabled = true;
      await user.save();
      return res.json({ success: true });
    } else {
      return res.json({ success: false, error: 'Invalid token' });
    }
  } catch (err) {
    res.json({ success: false, error: 'Verification failed' });
  }
});

// Disable 2FA
router.post('/settings/2fa/disable', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.adminId);
    user.twoFactorEnabled = false;
    user.twoFactorSecret = '';
    await user.save();
    res.redirect('/admin/settings?success=2FA+Disabled');
  } catch (err) {
    res.redirect('/admin/settings?error=Failed+to+disable+2FA');
  }
});

/* ── Pages ─────────────────────────────────────────────── */
router.get('/pages', requireAuth, async (req, res) => {
  const pages = await Page.find().sort({ title: 1 }).lean();
  res.render('admin/pages', { layout: false, pageTitle: 'Pages', pages, success: req.query.success || null });
});

router.get('/pages/new', requireAuth, (req, res) => {
  res.render('admin/page-form', { layout: false, pageTitle: 'Add Page', page: null, error: null });
});

router.post('/pages', requireAuth, async (req, res) => {
  try {
    const { title, slug, content, category } = req.body;
    await Page.create({ title, slug, content, category, metaDescription: (req.body.metaDescription || '').trim() });
    res.redirect('/admin/pages?success=Page+created+successfully');
  } catch (err) {
    res.render('admin/page-form', { layout: false, pageTitle: 'Add Page', page: req.body, error: err.message });
  }
});

router.get('/pages/:id/edit', requireAuth, async (req, res) => {
  const page = await Page.findById(req.params.id).lean();
  if (!page) return res.redirect('/admin/pages');
  res.render('admin/page-form', { layout: false, pageTitle: 'Edit Page', page, error: null });
});

router.post('/pages/:id', requireAuth, async (req, res) => {
  try {
    const { title, slug, content, category } = req.body;
    await Page.findByIdAndUpdate(req.params.id, { title, slug, content, category, metaDescription: (req.body.metaDescription || '').trim() });
    res.redirect('/admin/pages?success=Page+updated+successfully');
  } catch (err) {
    res.render('admin/page-form', { layout: false, pageTitle: 'Edit Page', page: req.body, error: err.message });
  }
});

router.post('/pages/:id/delete', requireAuth, async (req, res) => {
  await Page.findByIdAndDelete(req.params.id);
  res.redirect('/admin/pages?success=Page+deleted');
});

/* ── Helpers ───────────────────────────────────────────── */
function parseProductBody(body) {
  return {
    title: body.title,
    slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    price: Math.round(parseFloat(body.price) * 100) || 0,
    comparePrice: body.comparePrice ? Math.round(parseFloat(body.comparePrice) * 100) : null,
    imageUrl: body.imageUrl || '',
    images: body.images ? body.images.split('\n').map(s => s.trim()).filter(Boolean) : [],
    description: body.description || '',
    // One "Label: Value" per line. Splits on the FIRST colon only, so values
    // may themselves contain colons.
    specs: body.specs
      ? body.specs.split('\n').map(line => {
        const idx = line.indexOf(':');
        if (idx < 0) return null;
        const label = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        return label && value ? { label, value } : null;
      }).filter(Boolean)
      : [],
    /* Google Shopping identifiers. Trimmed and stored as-is, never
       synthesised: the product page and the Product schema both omit any
       of these when blank, and a made-up GTIN resolves to somebody else's
       product in Google's catalogue, which is a Misrepresentation finding
       rather than a missing-field warning. */
    sku: (body.sku || '').trim(),
    gtin: (body.gtin || '').replace(/\s/g, ''),
    mpn: (body.mpn || '').trim(),
    brand: (body.brand || '').trim(),
    language: (body.language || '').trim(),
    edition: (body.edition || '').trim(),
    setCode: (body.setCode || '').trim(),
    /* Variant grouping. The axis is checked against Google's fixed list
       rather than stored as typed: an attribute Google does not recognise
       is silently ignored, which would leave the group with nothing to
       tell its members apart — the one condition that invalidates a
       variant group — while the form looked perfectly filled in. */
    variantGroup: (body.variantGroup || '').trim().slice(0, variants.GROUP_ID_MAX),
    variantName: (body.variantName || '').trim().slice(0, variants.AXIS_VALUE_MAX),
    variantAxis: variants.AXIS_IDS.includes(String(body.variantAxis || '').trim().toLowerCase())
      ? String(body.variantAxis).trim().toLowerCase()
      : variants.DEFAULT_AXIS,
    variantOrder: parseInt(body.variantOrder, 10) || 0,
    /* A real date, distinct from the free-text preorderShips window. This
       is what schema.org availabilityDate is built from; an unparseable or
       empty value stores null rather than an Invalid Date, which would
       otherwise fail validation on save. */
    releaseDate: body.releaseDate && !Number.isNaN(Date.parse(body.releaseDate))
      ? new Date(body.releaseDate)
      : null,
    vendor: body.vendor || '',
    productType: body.productType || '',
    collections: body.collections ? body.collections.split(',').map(s => s.trim()).filter(Boolean) : [],
    tags: body.tags ? body.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    available: body.available === 'on' || body.available === 'true',
    stock: parseInt(body.stock) || 0,
    badge: body.badge || null,
    preorder: body.preorder === 'on' || body.preorder === 'true',
    preorderShips: body.preorderShips || null,
    allocationLimit: parseInt(body.allocationLimit) || 0,
    /* See Product.stockHold. Kept out of `available` on purpose: this is
       the "listed but unbuyable" switch, and it must never be reachable by
       accident from the ordinary Available checkbox. */
    stockHold: body.stockHold === 'on' || body.stockHold === 'true',
    /* Only markets with a real amount become rows. An empty field is the
       product not being sold there, so it must not survive as a zero —
       a zero-priced row would put a free item in that market's feed. */
    marketPrices: require('../config/markets').MARKETS
      .filter((m) => !m.isDefault)
      .map((m) => ({
        market: m.id,
        /* Typed as 179.99, stored as 17999. The same conversion the base
           price field has always used, so both behave identically — and
           it is done here rather than in the template because the stored
           unit is what every downstream comparison is made in. */
        amount: Math.round((parseFloat(body[`mp_${m.id}_amount`]) || 0) * 100),
        compareAmount: Math.round((parseFloat(body[`mp_${m.id}_compare`]) || 0) * 100),
        available: body[`mp_${m.id}_available`] === 'on' || body[`mp_${m.id}_available`] === 'true',
      }))
      .filter((r) => r.amount > 0),
    supersededBy: (body.supersededBy || '').trim(),
    featured: body.featured === 'on' || body.featured === 'true',
  };
}

// eslint-disable-next-line no-unused-vars
module.exports = router;
