/**
 * Customer management, for us.
 *
 * WHY THIS EXISTS AT ALL: the customer portal shows tracking numbers,
 * dispatch dates and refund status. Nothing wrote any of them. A portal
 * that can only ever say "unfulfilled" is worse than no portal, because it
 * looks like the shop has forgotten the order. This is the other end of
 * every field models/Order.js gained for the account area.
 *
 * REFUNDS ARE STILL ISSUED BY HAND in the payment provider. Nothing here
 * calls Whop, Stripe or anything else. The button below records that a
 * refund a human has already sent has been sent, which is the only claim
 * we can make truthfully — and the portal's wording depends on it.
 *
 * The order actions are scoped under a customer rather than sitting on a
 * global /admin/orders/:id: it keeps "who am I acting for" in the URL, and
 * the handler re-derives the order from that customer's own orders, so a
 * mistyped id cannot update somebody else's order.
 */

const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const Customer = require('../models/Customer');
const CustomerSession = require('../models/CustomerSession');
const MagicLink = require('../models/MagicLink');
const Order = require('../models/Order');
const testOrder = require('../services/testOrder');
const customerOrders = require('../services/customerOrders');
const lifecycle = require('../services/mail/lifecycle');
const orderAdmin = require('../services/orderAdmin');

const PAGE_SIZE = 50;

/* ── List ──────────────────────────────────────────────── */

router.get('/', requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter = {};
    if (q) {
      /* Escaped: a customer search box that accepts a regex is a search
         box that accepts a denial-of-service. */
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { displayEmail: rx }, { firstName: rx }, { lastName: rx }, { phone: rx }];
    }

    const [customers, total, activeSessions] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
      Customer.countDocuments(filter),
      CustomerSession.countDocuments({}),
    ]);

    /* Order stats come from the Order collection, not from counters on the
       Customer. A denormalised count would drift the first time an order
       was edited anywhere else, and the portal reads the same source. */
    const emails = customers.map((c) => c.email);
    const byEmail = new Map();
    if (emails.length) {
      const rows = await Order.aggregate([
        { $match: { customerEmail: { $in: emails }, status: { $ne: 'abandoned' } } },
        { $group: {
            _id: { $toLower: '$customerEmail' },
            orders: { $sum: 1 },
            spend: { $sum: { $cond: [{ $ne: ['$cancelledAt', null] }, 0, '$totalPrice'] } },
            last: { $max: '$createdAt' },
        } },
      ]);
      rows.forEach((r) => byEmail.set(r._id, r));
    }

    const rows = customers.map((c) => {
      const s = byEmail.get(c.email) || { orders: 0, spend: 0, last: null };
      return { c, orders: s.orders, spend: s.spend, last: s.last };
    });

    res.render('admin/customers', {
      layout: false,
      pageTitle: 'Customers',
      q, rows, total, activeSessions,
      deleted: req.query.deleted || '',
      stats: {
        customers: total,
        withOrders: rows.filter((r) => r.orders > 0).length,
        repeat: rows.filter((r) => r.orders > 1).length,
        spend: rows.reduce((sum, r) => sum + r.spend, 0),
      },
      truncated: total > rows.length,
    });
  } catch (err) {
    console.error('[admin/customers] list failed:', err);
    res.status(500).send('Server Error');
  }
});

/* ── Detail ────────────────────────────────────────────── */

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).send('Customer not found');

    const [{ all, counts, totalSpend }, sessions] = await Promise.all([
      customerOrders.ordersForCustomer(customer, { limit: 200 }),
      CustomerSession.find({ customer: customer._id }).sort({ lastUsedAt: -1 }).lean(),
    ]);

    /* Whether the "delete everything" button is offered at all. It is,
       only when every order on the account came from the test-purchase
       flow — so the button cannot be the thing that erases a real sale,
       whatever anybody clicks. An account with no orders qualifies:
       there is nothing there to destroy. */
    const realOrders = all.filter((d) => !testOrder.isTestOrder(d.order));

    res.render('admin/customer', {
      layout: false,
      pageTitle: customer.displayEmail || customer.email,
      customer, orders: all, counts, totalSpend, sessions,
      saved: req.query.saved || '',
      failed: req.query.failed || '',
      testOnly: realOrders.length === 0,
      realOrderCount: realOrders.length,
      testOrderCount: all.length - realOrders.length,
    });
  } catch (err) {
    console.error('[admin/customers] detail failed:', err);
    res.status(500).send('Server Error');
  }
});

/* ── Account state ─────────────────────────────────────── */

router.post('/:id/status', requireAuth, express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const status = req.body.status === 'closed' ? 'closed' : 'active';
    await Customer.updateOne({ _id: req.params.id }, { $set: { status } });
    /* Closing an account without ending its sessions would leave the
       holder of a live cookie signed in until it expired. */
    if (status === 'closed') await CustomerSession.deleteMany({ customer: req.params.id });
    res.redirect(`/admin/customers/${req.params.id}?saved=status`);
  } catch (err) {
    console.error('[admin/customers] status failed:', err);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/sessions/revoke', requireAuth, async (req, res) => {
  try {
    await CustomerSession.deleteMany({ customer: req.params.id });
    res.redirect(`/admin/customers/${req.params.id}?saved=sessions`);
  } catch (err) {
    console.error('[admin/customers] revoke failed:', err);
    res.status(500).send('Server Error');
  }
});

/**
 * Deletes the account permanently.
 *
 * TWO DIFFERENT ACTIONS, because they answer different questions and
 * merging them is how a records-retention obligation gets clicked away.
 *
 *   orders=keep  removes the Customer, its sessions and its sign-in
 *   links. Orders survive. Note that this is not amnesia: orders are
 *   matched to an account by EMAIL, so if that address still has orders,
 *   signing in with it rebuilds the account around them. That is correct
 *   — the orders are the record, the account is just a view of them —
 *   and the page says so rather than letting it be a surprise.
 *
 *   orders=test  additionally deletes the orders, and is REFUSED unless
 *   every one of them came from the test-purchase flow. The check is
 *   re-run here against the database rather than trusted from the form,
 *   so a stale page, a back button or a hand-made POST cannot turn this
 *   into a way to delete a real sale. Refusing loudly beats deleting
 *   quietly.
 *
 * Nothing here is undoable, which is why the destructive variant is
 * fenced by what the data IS rather than by how carefully it is clicked.
 */
router.post('/:id/delete', requireAuth, express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.redirect('/admin/customers');

    const wipeOrders = String((req.body && req.body.orders) || '') === 'test';
    const owned = await Order.find({
      customerEmail: new RegExp(`^${escapeRegex(customer.email)}$`, 'i'),
    }).lean();

    if (wipeOrders) {
      const real = owned.filter((o) => !testOrder.isTestOrder(o));
      if (real.length) {
        /* The only path that declines. Says which orders stopped it so
           the answer is actionable rather than a shrug. */
        return res.redirect(`/admin/customers/${req.params.id}?failed=real_orders`);
      }
      if (owned.length) {
        await Order.deleteMany({ _id: { $in: owned.map((o) => o._id) } });
      }
    }

    /* Sessions and sign-in links go regardless. A live cookie or an
       unspent magic link outliving the account it belongs to would let
       somebody sign in to something that no longer exists — which
       consumeMagicLink would answer by CREATING the account again. */
    await Promise.all([
      CustomerSession.deleteMany({ customer: customer._id }),
      MagicLink.deleteMany({ email: customer.email }),
    ]);
    await Customer.deleteOne({ _id: customer._id });

    res.redirect('/admin/customers?deleted=' + (wipeOrders ? 'all' : 'account'));
  } catch (err) {
    console.error('[admin/customers] delete failed:', err);
    res.status(500).send('Server Error');
  }
});

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ── Order lifecycle ───────────────────────────────────── */

/** The order, but only if it belongs to this customer. */
async function ownedOrder(customerId, orderId) {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) return null;
  const order = await Order.findById(orderId);
  if (!order) return null;
  if (String(order.customerEmail || '').toLowerCase() !== customer.email) return null;
  return order;
}

/**
 * Moves an order through fulfilment.
 *
 * Timestamps are set on TRANSITION, not on every save, so re-saving a
 * shipped order to correct a typo in the tracking number does not rewrite
 * the date it was dispatched.
 */
router.post('/:id/orders/:orderId/fulfilment', requireAuth,
  express.urlencoded({ extended: false, limit: '8kb' }), async (req, res) => {
    try {
      const order = await ownedOrder(req.params.id, req.params.orderId);
      if (!order) return res.status(404).send('Order not found');

      const before = {
        fulfillmentStatus: order.fulfillmentStatus,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      };

      const b = req.body || {};
      const allowed = ['unfulfilled', 'preparing', 'shipped', 'delivered'];
      const next = allowed.includes(b.fulfillmentStatus) ? b.fulfillmentStatus : order.fulfillmentStatus;
      const clean = (v, max) => String(v || '').trim().slice(0, max);

      order.trackingNumber = clean(b.trackingNumber, 60);
      order.trackingCarrier = clean(b.trackingCarrier, 60);
      order.trackingUrl = /^https?:\/\//i.test(b.trackingUrl || '') ? clean(b.trackingUrl, 400) : '';

      /* Captured BEFORE the save, because "did this order already have
         a tracking number" is the question that decides which of the two
         shipping emails to send, and after the save the answer is always
         yes. */
      const wasShipped = order.fulfillmentStatus === 'shipped' || order.fulfillmentStatus === 'delivered';
      const hadTracking = !!(before.trackingNumber || before.trackingUrl);
      const hasTracking = !!(order.trackingNumber || order.trackingUrl);

      if (next !== order.fulfillmentStatus) {
        if (next === 'shipped' && !order.shippedAt) order.shippedAt = new Date();
        if (next === 'delivered') {
          if (!order.shippedAt) order.shippedAt = new Date();
          if (!order.deliveredAt) order.deliveredAt = new Date();
        }
        order.fulfillmentStatus = next;
      }

      await order.save();

      /* THE EMAIL FOLLOWS THE SAVE, and follows it without being waited
         on. The record is the thing that must be right; the customer
         being told is important but must not be able to fail the admin's
         action or make them press Save twice.

         Two different events, decided by what changed:
           unfulfilled → shipped   "your order is on its way"
           shipped, tracking added "your tracking is live"
         Both are once-per-order, so correcting a typo in a tracking
         number does not send a second dispatch notice. */
      if (!wasShipped && (next === 'shipped' || next === 'delivered')) {
        lifecycle.shipped(order).catch(() => {});
      } else if (wasShipped && !hadTracking && hasTracking) {
        lifecycle.trackingAvailable(order).catch(() => {});
      }

      res.redirect(`/admin/customers/${req.params.id}?saved=fulfilment`);
    } catch (err) {
      console.error('[admin/customers] fulfilment failed:', err);
      res.status(500).send('Server Error');
    }
  });

/**
 * Cancels on the customer's behalf, or records a refund that has been sent.
 *
 * `refunded` IS A STATEMENT OF FACT, not an instruction. Pressing it does
 * not move money; it says money has already been moved in the payment
 * provider, and the portal will tell the customer exactly that. Nothing
 * here talks to Whop, Stripe or any other provider.
 */
router.post('/:id/orders/:orderId/refund', requireAuth,
  express.urlencoded({ extended: false, limit: '8kb' }), async (req, res) => {
    try {
      const order = await ownedOrder(req.params.id, req.params.orderId);
      if (!order) return res.status(404).send('Order not found');

      const action = String((req.body && req.body.action) || '');
      const now = new Date();

      /* Snapshotted before anything is mutated: every email below is
         sent on a TRANSITION, not on a state. Pressing "Mark refunded"
         twice must not send two "your refund has been issued" emails.
         (Cancellation has the same guard, inside services/orderAdmin.) */
      const wasRefundStatus = order.refundStatus;

      if (action === 'cancel') {
        /* Delegated, so this page and the orders list cannot drift on
           what cancelling means. The email is sent inside it. */
        const result = await orderAdmin.cancelOrder(order, {
          reason: String(req.body.reason || 'Cancelled by staff'), by: 'admin',
        });
        if (!result.ok) return res.redirect(`/admin/customers/${req.params.id}?failed=${result.reason}`);
        return res.redirect(`/admin/customers/${req.params.id}?saved=refund`);
      } else if (action === 'refunded') {
        order.refundStatus = 'refunded';
        order.refundedAt = order.refundedAt || now;
        if (!order.refundAmount) order.refundAmount = order.totalPrice || 0;
      } else if (action === 'processing') {
        order.refundStatus = 'processing';
        order.refundInitiatedAt = order.refundInitiatedAt || now;
        if (!order.refundAmount) order.refundAmount = order.totalPrice || 0;
      } else if (action === 'clear') {
        /* Undo for a mis-click. Leaves the cancellation alone — that is a
           separate fact from whether money went back. */
        order.refundStatus = 'none';
        order.refundInitiatedAt = null;
        order.refundedAt = null;
        order.refundAmount = 0;
      }

      await order.save();

      /* One email per thing that actually changed, and each says only
         what the record now says. A cancellation email already covers
         the queued refund, so refundInitiated is only sent when a refund
         was started WITHOUT a cancellation — otherwise the customer
         gets two emails about one event. */
      if (action === 'processing' && wasRefundStatus === 'none') {
        lifecycle.refundInitiated(order).catch(() => {});
      }
      if (order.refundStatus === 'refunded' && wasRefundStatus !== 'refunded') {
        lifecycle.refundCompleted(order).catch(() => {});
      }

      res.redirect(`/admin/customers/${req.params.id}?saved=refund`);
    } catch (err) {
      console.error('[admin/customers] refund failed:', err);
      res.status(500).send('Server Error');
    }
  });

module.exports = router;
