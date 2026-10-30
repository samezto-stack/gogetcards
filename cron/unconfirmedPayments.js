/*
 * Unconfirmed-payment alert sweep.
 *
 * WHAT THIS EXISTS FOR. A partner host reports every confirmed payment to
 * /api/checkout/payment-recorded the instant Whop settles it. An Order is a
 * separate thing: it is written only when the customer's browser reaches
 * /thank-you. Almost always both happen within a second of each other and
 * the order push covers it.
 *
 * When the browser never arrives — tab closed on the redirect, a dead
 * connection, a blocked postMessage — the payment used to be completely
 * silent. It sat in PendingPayment, correctly, and nothing said so: no
 * push, no order row, no confirmation email to the customer. The money was
 * taken and the first anyone knew of it was the customer asking where their
 * order was. That is what this sweep is for.
 *
 * WHY A SWEEP AND NOT A PUSH FROM THE ROUTE. payment-recorded is
 * server-to-server and lands BEFORE the browser gets to /thank-you, so at
 * that moment "no order yet" is the normal case, not the exceptional one.
 * Pushing there would fire on every single sale and then fire again from
 * the order pipeline a second later. The grace period below is what
 * separates "not yet" from "never".
 *
 * NO DUPLICATES, EVER. alertedAt is claimed with a conditional
 * findOneAndUpdate before the push is sent, so a restart mid-run, an
 * overlapping sweep or a second worker can only ever lose an alert, never
 * repeat one. Losing one is the right way round: this is a prompt to go
 * look at a list that is still there either way.
 */

const PendingPayment = require('../models/PendingPayment');
const Order = require('../models/Order');
const pushNotify = require('../services/pushNotify');

const SWEEP_INTERVAL_MS = parseInt(process.env.UNCONFIRMED_SWEEP_INTERVAL_MS || '', 10) || 5 * 60 * 1000;

/* How long /thank-you gets before its absence counts as a real failure.
   Long enough to cover a slow phone finishing a redirect, short enough that
   an alert still arrives while the sale is worth acting on. */
const GRACE_MS = parseInt(process.env.UNCONFIRMED_GRACE_MS || '', 10) || 10 * 60 * 1000;

/* Ceiling per run, so a backlog (or a first run after this ships) drains
   over several sweeps instead of emptying a day of history onto the phone
   in one burst. */
const MAX_PER_RUN = parseInt(process.env.UNCONFIRMED_MAX_PER_RUN || '', 10) || 10;

let timer = null;
let running = false;

async function sweep() {
  if (running) return;
  running = true;
  try {
    if (!pushNotify.isConfigured()) return; // nothing to push to: no-op

    const cutoff = new Date(Date.now() - GRACE_MS);
    const candidates = await PendingPayment.find({
      resolvedOrderId: null,
      alertedAt: null,
      acknowledgedAt: null,
      createdAt: { $lt: cutoff },
    })
      .sort({ createdAt: 1 })
      .limit(MAX_PER_RUN)
      .lean();

    for (const pending of candidates) {
      /* Re-read the Order collection rather than trusting resolvedOrderId.
         That field is written by /thank-you as fire-and-forget bookkeeping;
         if that one write failed while the order itself succeeded, the row
         is stale and this would alert about a sale that is sitting in the
         admin perfectly fine. The order is the thing being asked about, so
         ask about the order. */
      try {
        if (await Order.exists({ orderId: pending.orderId })) {
          await PendingPayment.updateOne(
            { _id: pending._id, resolvedOrderId: null },
            { $set: { resolvedOrderId: pending.orderId, resolvedAt: new Date() } }
          );
          continue;
        }
      } catch (err) {
        /* Unknown is not "unresolved". Skip and let the next run decide,
           rather than pushing an alert we are not sure is warranted. */
        console.error(`[unconfirmedPayments] order check failed for ${pending.orderId}:`, err.message);
        continue;
      }

      // Claim BEFORE sending. See the header note on duplicates.
      const claimed = await PendingPayment.findOneAndUpdate(
        { _id: pending._id, alertedAt: null },
        { $set: { alertedAt: new Date() } }
      );
      if (!claimed) continue; // another worker got there first

      try {
        await pushNotify.sendPush(pushNotify.buildPendingPaymentPush(pending));
        console.warn(
          `[unconfirmedPayments] payment ${pending.orderId} has no order ` +
          `(${pending.customerEmail || 'no address'}, ${pending.price || '?'} ${pending.currency || ''}) — alerted`
        );
      } catch (err) {
        console.error(`[unconfirmedPayments] alert failed for ${pending.orderId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[unconfirmedPayments] sweep failed:', err.message);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  /* First run is delayed rather than immediate: at boot the DB connection
     has just come up and /thank-you traffic from the deploy that just
     restarted is still settling. */
  setTimeout(sweep, 60 * 1000).unref?.();
  timer = setInterval(sweep, SWEEP_INTERVAL_MS);
  if (timer.unref) timer.unref();
  console.log(`[unconfirmedPayments] sweep every ${Math.round(SWEEP_INTERVAL_MS / 60000)}m, ${Math.round(GRACE_MS / 60000)}m grace`);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, sweep };
