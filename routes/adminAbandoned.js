/**
 * Abandoned checkouts: what was left behind, what came back, and why a
 * sequence stopped.
 *
 * EVERY NUMBER ON THIS PAGE IS COUNTED, NOT ESTIMATED. There is no
 * modelled recovery rate and no assumed open rate. Where the data does
 * not exist — opens and clicks, which need provider webhooks nobody has
 * wired yet — the page says so rather than showing a plausible figure.
 * A dashboard that invents its own numbers is worse than one that admits
 * a gap, because the invented ones get quoted in decisions.
 *
 * RECOVERY IS ATTRIBUTED TO THE LAST EMAIL ACTUALLY SENT. That is an
 * attribution CHOICE, not a measurement, and it is labelled as such in
 * the view: a customer who came back after reminder 3 may well have been
 * prompted by reminder 1. It is the same last-touch convention every
 * ecommerce platform uses, and it is the only one this data supports.
 */

const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const AbandonedCheckout = require('../models/AbandonedCheckout');
const EmailSuppression = require('../models/EmailSuppression');
const Event = require('../models/Event');
/* For the convert-to-order button — see the route at the bottom. */
const recoveryPause = require('../services/abandonedCheckout/pause');
const { runThankYouPipeline } = require('../services/orderPipeline');
const { provisionFromOrder } = require('../services/customerProvisioning');

/* The convert form posts a Whop payment id. Scoped to this router rather
   than added globally: nothing else here reads a body. */
router.use(express.urlencoded({ extended: false, limit: '8kb' }));

const { MAX_STEP, RECOVERY_SCHEDULE } = AbandonedCheckout;

const PAGE_SIZE = 50;

/** "299.98" -> 29998. Totals are stored as the string the host sent. */
function cents(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

router.get('/', requireAuth, async (req, res) => {
  const status = String(req.query.status || 'all');
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const filter = {};
  if (AbandonedCheckout.STATUSES.includes(status)) filter.status = status;

  try {
    const [rows, total, all, suppressedCount] = await Promise.all([
      AbandonedCheckout.find(filter)
        .sort({ lastActivityAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      AbandonedCheckout.countDocuments(filter),
      /* The stats are over everything, not the current filter — a
         recovery rate that changed when you clicked a tab would be
         meaningless. Only the fields the maths needs. */
      AbandonedCheckout.find({}, {
        status: 1, total: 1, recoveryStep: 1, emailsSent: 1, recoveredAt: 1,
        recoveryLinkClicks: 1, lastRecoveryClickAt: 1, currency: 1, market: 1,
      }).lean(),
      EmailSuppression.countDocuments({}),
    ]);

    /* Backfill the traffic source for rows captured before it was recorded.
     *
     * WHY HERE AND NOT A ONE-OFF SCRIPT. The answer has always existed on
     * the checkout_click Event keyed by the same zcid; only the copy on the
     * row is new. A migration script would need someone to remember to run
     * it against production, and the rows that matter most are exactly the
     * ones already in the list. Doing it on view means the history fills
     * itself in the first time anybody looks, and permanently — this writes
     * back, so it is one query per page until there is nothing left to fix,
     * then never again.
     *
     * Bounded by the page size, so it is one indexed $in over at most a
     * screenful. A failure here must never cost the page: the list renders
     * with an em dash, which is what it did before this existed. */
    const needSource = rows.filter((r) => !r.trafficSource).map((r) => r.checkoutId);
    if (needSource.length) {
      try {
        const clicks = await Event.find({ type: 'checkout_click', checkoutId: { $in: needSource } })
          .select('checkoutId source')
          .lean();
        const byId = new Map(clicks.filter((c) => c.source).map((c) => [c.checkoutId, c.source]));
        if (byId.size) {
          for (const r of rows) {
            if (!r.trafficSource && byId.has(r.checkoutId)) r.trafficSource = byId.get(r.checkoutId);
          }
          await AbandonedCheckout.bulkWrite(
            [...byId].map(([checkoutId, source]) => ({
              updateOne: { filter: { checkoutId }, update: { $set: { trafficSource: source } } },
            })),
            { ordered: false }
          );
        }
      } catch (e) {
        console.error('[admin/abandoned] source backfill skipped:', e.message);
      }
    }

    /* ── counted, never modelled ── */
    const stats = {
      total: all.length,
      byStatus: {},
      abandonedValue: 0,
      recoveredValue: 0,
      /* PER CURRENCY, because adding pounds to dollars produces a figure
         that is not money. Keyed by code; the view prints each one. */
      byCurrency: {},
      /* Paid without the sequence: they never left, or came back on their
         own. Counted separately because folding it into recoveredValue is
         what made the recovery rate meaningless. */
      purchasedValue: 0,
      emailsSent: 0,
      /* Of the reminders that went out, how many were clicked. The one
         number that says whether the sequence is being read at all, and
         it was unavailable while recovery links went untracked. */
      emailsClicked: 0,
      /* Recoveries credited to the last email that actually went out.
         Index 0 is "recovered before any email was sent" — a real and
         quite large bucket, and one a per-step-only table would hide. */
      recoveredAfterStep: new Array(MAX_STEP + 1).fill(0),
      sentAtStep: new Array(MAX_STEP + 1).fill(0),
    };

    for (const r of all) {
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
      const value = cents(r.total);
      const sent = (r.emailsSent || []).filter((e) => e.status === 'sent');

      stats.emailsSent += sent.length;
      for (const e of sent) {
        if (e.step >= 1 && e.step <= MAX_STEP) stats.sentAtStep[e.step]++;
      }

      if ((r.recoveryLinkClicks || 0) > 0) stats.emailsClicked++;

      const code = r.currency || 'USD';
      const bucket = stats.byCurrency[code] || (stats.byCurrency[code] = {
        abandoned: 0, recovered: 0, purchased: 0, count: 0,
      });
      bucket.count += 1;
      if (r.status === 'recovered') bucket.recovered += value;
      else if (r.status === 'purchased') bucket.purchased += value;
      else if (['abandoned', 'expired'].includes(r.status)) bucket.abandoned += value;

      if (r.status === 'recovered') {
        stats.recoveredValue += value;
        stats.recoveredAfterStep[Math.min(sent.length, MAX_STEP)]++;
      } else if (r.status === 'purchased') {
        stats.purchasedValue += value;
      } else if (['abandoned', 'expired'].includes(r.status)) {
        /* Value genuinely lost: it was abandoned and never came back.
           'active' is excluded because those customers are still in the
           middle of checking out. */
        stats.abandonedValue += value;
      }
    }

    /* THE RATE IS OVER THE ONES THE SEQUENCE COULD HAVE SAVED. A customer
       who paid without ever needing a reminder was never at risk, so
       counting them in the denominator makes a sequence look worse the
       better the checkout gets — and counting them in the numerator, which
       is what happened while the two shared a status, made it look better
       the more ordinary sales came through. Neither belongs. */
    const closed = (stats.byStatus.recovered || 0)
      + (stats.byStatus.abandoned || 0)
      + (stats.byStatus.expired || 0);
    stats.recoveryRate = closed ? (stats.byStatus.recovered || 0) / closed : null;
    /* Click-through over rows that were actually emailed. */
    const emailedRows = all.filter((r) => (r.emailsSent || []).some((e) => e.status === 'sent')).length;
    stats.clickRate = emailedRows ? stats.emailsClicked / emailedRows : null;

    /* Per-step conversion: of the people who received reminder N, how many
       ended up recovered with exactly N emails behind them. Null where
       nothing was sent at that step, so the view can print "no data"
       instead of a misleading 0%. */
    stats.stepRates = RECOVERY_SCHEDULE.map((s) => {
      const sent = stats.sentAtStep[s.step];
      return {
        step: s.step,
        label: s.afterMinutes < 60
          ? `${s.afterMinutes} min`
          : `${s.afterMinutes / 60} h`,
        sent,
        recovered: stats.recoveredAfterStep[s.step],
        rate: sent ? stats.recoveredAfterStep[s.step] / sent : null,
      };
    });

    res.render('admin/abandoned', {
      pageTitle: 'Abandoned checkouts',
      /* For the convert-to-order flash. Read only for its own keys in the
         template, and every value is escaped there. */
      query: req.query,
      rows,
      stats,
      suppressedCount,
      status,
      page,
      pageSize: PAGE_SIZE,
      totalRows: total,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      statuses: AbandonedCheckout.STATUSES,
      maxStep: MAX_STEP,
      schedule: RECOVERY_SCHEDULE,
      /* Whether the sequence is sending, so the page says so plainly. A
         paused sequence that looks identical to a running one is how a
         pause gets forgotten about for a fortnight. */
      pauseState: await recoveryPause.state(),
      layout: false,
    });
  } catch (err) {
    console.error('[admin/abandoned] failed:', err.message);
    res.status(500).send('Failed to load abandoned checkouts');
  }
});

/**
 * Hold the recovery sequence.
 *
 * Nobody is cancelled and nothing is rescheduled here — rows keep their due
 * times and the sweep simply stops acting on them. The rescheduling happens
 * on resume, which is the only moment the length of the pause is known.
 * See services/abandonedCheckout/pause.js.
 */
router.post('/cap', requireAuth, express.urlencoded({ extended: false, limit: '4kb' }), async (req, res) => {
  try {
    const by = (req.session && req.session.adminUser) || 'admin';
    const r = await recoveryPause.setMaxStep(req.body.maxStep, String(by));

    if (!r.changed) return res.redirect('/admin/abandoned?cap=nochange');
    if (r.direction === 'down') {
      return res.redirect(`/admin/abandoned?cap=down&step=${r.maxStep}&held=${r.held}`);
    }
    const hours = Math.round((r.heldMs / 3600000) * 10) / 10;
    return res.redirect(`/admin/abandoned?cap=up&step=${r.maxStep}&shifted=${r.shifted}&hours=${hours}`);
  } catch (err) {
    console.error('[admin/abandoned] cap change failed:', err.message);
    res.redirect('/admin/abandoned?failed=cap');
  }
});

/**
 * Delete one checkout.
 *
 * WHAT IT IS FOR: clearing the rows a test checkout left behind, so the
 * numbers on this page describe real customers and the scheduler stops
 * emailing an address about an order that was never meant to happen.
 *
 * DELETING THE ROW IS WHAT STOPS THE EMAILS. cron/abandonedCheckout.js
 * sweeps this collection and nothing else, so a row that is gone cannot be
 * picked up by any later step of the sequence. There is no separate
 * cancellation to remember, and no window where one more reminder escapes.
 *
 * IT DOES NOT TOUCH THE ORDER. A recovered row points at one, and that
 * Order is the record of a real sale — only the recovery bookkeeping goes.
 */
router.post('/:id/delete', requireAuth, async (req, res) => {
  const status = String(req.query.status || 'all');
  const page = String(req.query.page || '1');
  try {
    await AbandonedCheckout.findByIdAndDelete(req.params.id);
  } catch (err) {
    console.error('[admin/abandoned] delete failed:', err.message);
  }
  /* Back to the tab and page they were on, so clearing several in a row
     does not throw them to the top of "All" after each one. */
  res.redirect(`/admin/abandoned?status=${encodeURIComponent(status)}&page=${encodeURIComponent(page)}`);
});

/* Turn an abandoned checkout into a real order, on the admin's authority.
 *
 * WHY THIS IS DIFFERENT FROM THE BUTTON ON /admin/orders. That one recovers
 * a PAYMENT the partner reported: there is a signed payload behind it, so
 * the order it produces is exactly as trustworthy as one the customer's own
 * browser created. But that record only exists if the browser reached the
 * partner's signing endpoint, and somebody who closes the tab the instant
 * Whop settles never gets that far — the payment is real, Whop shows it,
 * and this server heard nothing at all.
 *
 * This route answers that case, and it is a different kind of thing:
 * NOTHING HERE PROVES A PAYMENT HAPPENED. The row is only what the customer
 * typed at Step 1. The proof is the admin having looked at Whop, which is
 * why the Whop payment id is required rather than optional — it is not
 * decoration, it is the evidence, and it is written onto the order so the
 * two can be reconciled later by somebody who was not there.
 *
 * The order id is stamped MAN- so nobody ever has to wonder which orders
 * came through the signed pipeline and which came from this button. It is
 * derived from the checkout id rather than random, which makes pressing it
 * twice harmless: the pipeline is idempotent on order id.
 *
 * Everything after the payload is the ordinary pipeline — order,
 * confirmation email, account, phone push, and closing this very row. */
router.post('/:id/create-order', requireAuth, async (req, res) => {
  const status = String(req.query.status || 'all');
  const page = String(req.query.page || '1');
  const backTo = (params) =>
    res.redirect(`/admin/abandoned?status=${encodeURIComponent(status)}&page=${encodeURIComponent(page)}&`
      + new URLSearchParams(params).toString());

  const paymentId = String((req.body && req.body.paymentId) || '').trim();

  try {
    const doc = await AbandonedCheckout.findById(req.params.id).lean();
    if (!doc) return backTo({ convertError: 'That checkout no longer exists.' });
    if (!paymentId) {
      return backTo({ convertError: 'Enter the Whop payment id first — it is what ties this order to the money.' });
    }
    if (doc.orderId) {
      return backTo({ convertError: `Already converted to order ${doc.orderId}.` });
    }
    if (!doc.email) {
      return backTo({ convertError: 'That checkout has no email address, so no order or account can be made from it.' });
    }

    const qty = Math.max(1, Number(doc.quantity) || 1);
    const total = String(doc.total || '').replace(/[^0-9.]/g, '');
    /* `total` on the row is the ORDER total, while `price` downstream is a
       UNIT price — so it is divided, and total_price is sent as well, which
       makes the model use the total verbatim instead of multiplying. Both
       are stated, so a bundle whose unit price does not divide evenly still
       records the right total. */
    const unit = total ? (Number(total) / qty).toFixed(2) : '';
    const shipping = doc.shipping || {};

    const payload = {
      order_id: `MAN-${doc.checkoutId}`,
      email: doc.email,
      first_name: doc.firstName || '',
      last_name: doc.lastName || '',
      address1: shipping.line1 || '',
      address2: shipping.line2 || '',
      city: shipping.city || '',
      state: shipping.state || '',
      zip: shipping.postalCode || '',
      country: doc.country || '',
      phone: doc.phone || '',
      product: doc.productName || '',
      product_slug: doc.productSlug || '',
      product_image: doc.productImage || '',
      price: unit,
      total_price: total,
      currency: doc.currency || 'USD',
      quantity: String(qty),
      store: doc.partnerStore || '',
      payment_provider: 'whop',
      payment_id: paymentId,
      purchase_date: new Date().toISOString(),
      /* Carries the pipeline back to this checkout: it re-reads the address
         the customer actually typed at Step 1, resolves the true marketing
         source from the original click, and closes this row. */
      zcid: doc.checkoutId,
    };

    const result = await runThankYouPipeline(payload);
    if (!result.ok || !result.order) {
      const why = (result.errors && Object.values(result.errors).join('; ')) || 'unknown reason';
      return backTo({ convertError: `Could not build the order: ${why}` });
    }

    /* signIn:false — this is the admin's browser, not the customer's. */
    await provisionFromOrder(result.order, req, res, { signIn: false });

    console.log(`[admin/abandoned] converted ${doc.checkoutId} to order ${result.order.orderId} (whop payment ${paymentId}, new: ${result.isNew})`);
    return backTo({ converted: result.order.orderId, convertedNew: result.isNew ? '1' : '0' });
  } catch (err) {
    console.error('[admin/abandoned] convert failed:', err);
    return backTo({ convertError: err.message });
  }
});

module.exports = router;
