/**
 * What is committed, when it lands, and who is waiting.
 *
 * REPLACES THE STEALTH GENERATOR, which added Shopify stores to a
 * rotator this shop no longer uses. This is the page that was actually
 * missing: preorders are most of the money here, they are taken months
 * before anything ships, and until now the only way to see how many
 * people were waiting on a set was to filter the orders list by hand and
 * count.
 *
 * THE ROW THAT MATTERS IS THE OVERDUE ONE. A set whose release date has
 * passed while orders sit unfulfilled is the single most expensive state
 * this business has — every day of it is a customer wondering whether
 * they have been forgotten, and a cancellation that did not have to
 * happen. It is sorted to the top and coloured, rather than being a
 * number you would have to work out.
 */

const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const preorderCfg = require('../config/preorder');
const testOrder = require('../services/testOrder');

const DAY = 24 * 60 * 60 * 1000;

router.get('/', requireAuth, async (req, res) => {
  try {
    /* Every product we are taking preorders on, including the ones with
       no orders yet — a preorder listing nobody has bought is a fact
       worth seeing, and a page that hides it looks like the listing is
       broken. */
    const products = await Product.find({
      $or: [{ preorder: true }, { tags: 'preorder' }],
    }).select('slug title imageUrl images price available preorder tags releaseDate preorderShips')
      .lean();

    const slugs = products.map((p) => p.slug);

    /* Grouped in the database rather than in Node: this is the one page
       whose numbers grow with every order ever placed, and pulling them
       all back to count them is how an admin page starts timing out in
       its second year. Test orders are excluded from the money for the
       same reason they are excluded everywhere else. */
    const grouped = slugs.length ? await Order.aggregate([
      { $match: {
        productSlug: { $in: slugs },
        status: { $nin: ['abandoned', 'cancelled'] },
        cancelledAt: null,
        ...testOrder.EXCLUDE_FROM_REPORTING,
      } },
      { $group: {
        _id: '$productSlug',
        orders: { $sum: 1 },
        units: { $sum: { $ifNull: ['$quantity', 1] } },
        revenue: { $sum: '$totalPrice' },
        customers: { $addToSet: { $toLower: '$customerEmail' } },
        /* Still to go out. Shipped and delivered preorders are done
           with; what this page is for is the ones that are not. */
        awaiting: { $sum: { $cond: [
          { $in: ['$fulfillmentStatus', ['shipped', 'delivered']] }, 0, 1,
        ] } },
        firstOrder: { $min: '$createdAt' },
        lastOrder: { $max: '$createdAt' },
      } },
    ]) : [];

    const bySlug = new Map(grouped.map((g) => [g._id, g]));
    const now = Date.now();

    const rows = products.map((p) => {
      const g = bySlug.get(p.slug) || { orders: 0, units: 0, revenue: 0, customers: [], awaiting: 0 };
      const release = preorderCfg.releaseInfo(p);
      const daysAway = release.hasDate
        ? Math.round((new Date(p.releaseDate).getTime() - now) / DAY)
        : null;

      return {
        product: p,
        release,
        daysAway,
        /* Released, but people are still waiting. The state this page
           exists to surface. */
        overdue: release.hasDate && daysAway !== null && daysAway < 0 && g.awaiting > 0,
        /* Close enough that it is worth checking the distributor. */
        imminent: release.hasDate && daysAway !== null && daysAway >= 0 && daysAway <= 21,
        orders: g.orders,
        units: g.units,
        revenue: g.revenue,
        customers: (g.customers || []).filter(Boolean).length,
        awaiting: g.awaiting,
        lastOrder: g.lastOrder || null,
      };
    });

    /* Overdue first, then by how soon it lands, then undated. Somebody
       opening this page is asking "what needs me today", and the answer
       should be the first thing on the screen. */
    rows.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.release.hasDate !== b.release.hasDate) return a.release.hasDate ? -1 : 1;
      if (a.release.hasDate) return a.daysAway - b.daysAway;
      return b.units - a.units;
    });

    const totals = rows.reduce((t, r) => ({
      units: t.units + r.units,
      revenue: t.revenue + r.revenue,
      awaiting: t.awaiting + r.awaiting,
      customers: t.customers + r.customers,
    }), { units: 0, revenue: 0, awaiting: 0, customers: 0 });

    res.render('admin/preorders', {
      layout: false,
      pageTitle: 'Preorders',
      rows,
      totals,
      overdueCount: rows.filter((r) => r.overdue).length,
      sent: req.query.sent || '',
      failed: req.query.failed || '',
    });
  } catch (err) {
    console.error('[admin/preorders] failed:', err);
    res.status(500).send('Server Error');
  }
});

/**
 * Everyone still waiting on one product.
 *
 * The list you need when a distributor tells you an allocation is short
 * and somebody has to be told. Deliberately a separate page rather than
 * an expanding row: it is a list of real customers with real addresses,
 * and it should take a decision to look at it.
 */
router.get('/:slug', requireAuth, async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (!product) return res.status(404).send('Product not found');

    const orders = await Order.find({
      productSlug: req.params.slug,
      status: { $nin: ['abandoned', 'cancelled'] },
      cancelledAt: null,
    }).sort({ createdAt: 1 }).lean();

    const customerOrders = require('../services/customerOrders');
    const Customer = require('../models/Customer');
    const emails = [...new Set(orders.map((o) => (o.customerEmail || '').toLowerCase()).filter(Boolean))];
    const customers = emails.length
      ? await Customer.find({ email: { $in: emails } }).select('_id email').lean() : [];
    const customerByEmail = new Map(customers.map((c) => [c.email, c._id]));

    /* ── Release day ──
       What each broadcast would reach, read off the database, and what
       any run already queued for this set is doing. Both previews exclude
       orders already covered by a sent or queued message, so the numbers
       on the buttons are the numbers that will actually go out. */
    const broadcast = require('../services/mail/broadcast');
    const [ready, offer, campaigns, cancelledPending, offersOpen] = await Promise.all([
      broadcast.preview('releaseReady', product.slug),
      broadcast.preview('reinstateOffer', product.slug),
      broadcast.status(product.slug),
      Order.countDocuments({ productSlug: product.slug, cancelledAt: { $ne: null }, refundStatus: 'processing',
        ...testOrder.EXCLUDE_FROM_REPORTING }),
      Order.countDocuments({ productSlug: product.slug, cancelledAt: { $ne: null }, refundStatus: 'processing',
        reinstateDeadline: { $gte: new Date() } }),
    ]);
    const reinstated = await Order.countDocuments({ productSlug: product.slug, reinstatedAt: { $ne: null }, cancelledAt: null });

    res.render('admin/preorder-detail', {
      layout: false,
      pageTitle: product.title,
      product,
      release: preorderCfg.releaseInfo(product),
      rows: orders.map((o) => {
        const d = customerOrders.decorate(o, product);
        return {
          order: o,
          reference: d.reference,
          status: d.status,
          customerId: customerByEmail.get((o.customerEmail || '').toLowerCase()) || null,
        };
      }),
      releaseDay: {
        ready: { customers: ready.customers, orders: ready.orders, skipped: ready.skipped, finishesAt: ready.finishesAt },
        offer: { customers: offer.customers, orders: offer.orders, skipped: offer.skipped, finishesAt: offer.finishesAt },
        cancelledPending, offersOpen, reinstated,
        campaigns,
        gap: `${broadcast.GAP_SECONDS}–${broadcast.GAP_SECONDS + broadcast.JITTER_SECONDS}s`,
      },
      sent: String(req.query.sent || ''),
      failed: String(req.query.failed || ''),
    });
  } catch (err) {
    console.error('[admin/preorders] detail failed:', err);
    res.status(500).send('Server Error');
  }
});

/* ── Release-day broadcasts ─────────────────────────────── */

const form = express.urlencoded({ extended: false, limit: '8kb' });

/** A delivery window as typed, or the default — never blank in an email. */
function windowFrom(body) {
  const w = String((body && body.deliveryWindow) || '').trim().replace(/[\r\n]/g, ' ').slice(0, 60);
  return w || '5 to 7 business days';
}

/**
 * "Your preorder is here" to everyone still holding an open order.
 *
 * Queued, not sent: the page reloads showing the run draining at one
 * message every twenty-odd seconds. Pressing it again queues nobody who
 * is already covered.
 */
router.post('/:slug/release-ready', requireAuth, form, async (req, res) => {
  const back = `/admin/preorders/${encodeURIComponent(req.params.slug)}`;
  try {
    const broadcast = require('../services/mail/broadcast');
    const r = await broadcast.enqueue('releaseReady', req.params.slug,
      { deliveryWindow: windowFrom(req.body) }, { by: 'admin' });
    return res.redirect(`${back}?sent=ready_${r.queued}_${r.orders}`);
  } catch (err) {
    console.error('[admin/preorders] release-ready failed:', err);
    return res.redirect(`${back}?failed=${encodeURIComponent(err.message)}`);
  }
});

/**
 * The keep-or-refund question to everyone who cancelled and has not yet
 * been refunded.
 *
 * THE DEADLINE IS WRITTEN TO THE ORDERS FIRST, then quoted in the email,
 * then checked at the instant somebody presses the button. It is the end
 * of a calendar day, Pacific time — where the shop is — so "by September
 * 19" means the same thing to the customer, the email and the database.
 * Until it passes, the orders list marks these as "do not refund yet".
 */
router.post('/:slug/reinstate-offer', requireAuth, form, async (req, res) => {
  const back = `/admin/preorders/${encodeURIComponent(req.params.slug)}`;
  try {
    const days = Math.min(14, Math.max(1, parseInt(req.body && req.body.days, 10) || 3));
    const { deadline, display } = endOfDayPacific(days);
    const broadcast = require('../services/mail/broadcast');
    const r = await broadcast.enqueue('reinstateOffer', req.params.slug,
      { deliveryWindow: windowFrom(req.body), deadline, deadlineDisplay: display }, { by: 'admin' });
    return res.redirect(`${back}?sent=offer_${r.queued}_${r.orders}`);
  } catch (err) {
    console.error('[admin/preorders] reinstate-offer failed:', err);
    return res.redirect(`${back}?failed=${encodeURIComponent(err.message)}`);
  }
});

/** Drops every unsent message of one campaign. Sent ones are sent. */
router.post('/:slug/broadcast/stop', requireAuth, form, async (req, res) => {
  const back = `/admin/preorders/${encodeURIComponent(req.params.slug)}`;
  try {
    const campaign = String((req.body && req.body.campaign) || '');
    if (!campaign.includes(`:${req.params.slug}`)) return res.redirect(back);
    const broadcast = require('../services/mail/broadcast');
    const r = await broadcast.stop(campaign);
    return res.redirect(`${back}?sent=stopped_${r.stopped}`);
  } catch (err) {
    console.error('[admin/preorders] stop failed:', err);
    return res.redirect(`${back}?failed=${encodeURIComponent(err.message)}`);
  }
});

/**
 * 23:59:59 Pacific, N days from today.
 *
 * Computed by asking Intl what today's date is in Los Angeles and building
 * the instant from that, so a button pressed at 11pm Pacific (6am UTC, the
 * next calendar day) still counts from the day the operator is living in.
 * The display string is the same date, so the email and the check agree.
 */
function endOfDayPacific(days) {
  const zone = 'America/Los_Angeles';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  const target = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days, 12, 0, 0));
  /* Midday UTC on the target date, then shifted by that date's Pacific
     offset, gives the end of that Pacific day exactly — DST included. */
  const offsetMinutes = (() => {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(target).reduce((o, p) => (o[p.type] = p.value, o), {});
    const asUtc = Date.UTC(Number(f.year), Number(f.month) - 1, Number(f.day), Number(f.hour) % 24, Number(f.minute));
    return Math.round((asUtc - target.getTime()) / 60000);
  })();
  const endLocal = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59);
  const deadline = new Date(endLocal - offsetMinutes * 60000);
  const display = new Date(endLocal).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return { deadline, display };
}

module.exports = router;
