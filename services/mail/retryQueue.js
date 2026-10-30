/**
 * Staggered redelivery of failed email.
 *
 * WHY A QUEUE AND NOT A LOOP. A provider outage fails everything for as
 * long as it lasts — a morning of confirmations, sign-in links and recovery
 * mail all land in the log as failures together. Pressing "retry" on each
 * one is unusable at that size, and sending them all the instant the
 * provider recovers is precisely the burst that gets a sending domain
 * throttled or blocked again. The recovery would cause the next incident.
 *
 * So enqueueing stamps a due time on each row with a gap between them, and
 * a sweep sends at most ONE per pass. Nothing here sends immediately, and
 * nothing sends in parallel.
 *
 * THE GAP IS JITTERED. A message every 240 seconds on the dot is a machine
 * signature in its own right, and reputation systems read cadence. Each gap
 * is the base spacing plus a random slice, so the pattern is irregular the
 * way a person sending mail is irregular.
 *
 * REBUILT, NOT REPLAYED — same rule the single Retry button follows. The
 * log stores what was sent, not the data it was made from, so redelivery
 * asks the order what is true now. A row with no order behind it (a
 * sign-in link) is never enqueued: re-issuing one unasked would mail
 * somebody a session key they did not request.
 */

const EmailLog = require('../../models/EmailLog');
const Order = require('../../models/Order');

/* Base seconds between two sends, and the extra random slice on top. Both
   overridable per deploy: a provider that has just lifted a block wants a
   slower drain than one that had a five-minute wobble. */
const GAP_SECONDS = parseInt(process.env.MAIL_RETRY_GAP_SECONDS || '', 10) || 240;
const JITTER_SECONDS = parseInt(process.env.MAIL_RETRY_JITTER_SECONDS || '', 10) || 180;

/* A claim older than this belonged to a process that died mid-send. Long
   enough that a slow SMTP handshake is never mistaken for a dead worker. */
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * The whole send schedule, drawn once.
 *
 * BUILT AS ONE SEQUENCE rather than asking for "the offset of message n"
 * per row. The per-row version re-rolled the jitter on every call, so two
 * neighbouring offsets came from different draws and the distance between
 * them was a difference of independent random walks, not a gap. With the
 * jitter on the earlier row landing high and the later one low, the real
 * spacing collapsed to well under the base gap — a 205-second interval out
 * of a queue whose entire purpose is a floor of 240.
 *
 * Accumulating a single running total makes the gap between consecutive
 * sends exactly GAP_SECONDS + one jitter draw, which is the guarantee the
 * queue is supposed to provide, and lets finishesAt be read off the same
 * schedule that was actually written to the rows instead of a third draw
 * that matched neither.
 *
 * First message goes now: there is no reason to make the customer who has
 * waited longest wait another four minutes.
 */
function buildSchedule(count, fromMs) {
  const out = [];
  let t = fromMs;
  for (let i = 0; i < count; i++) {
    out.push(new Date(t));
    t += (GAP_SECONDS + Math.floor(Math.random() * (JITTER_SECONDS + 1))) * 1000;
  }
  return out;
}

/**
 * Queue every failed email that can actually be rebuilt.
 *
 * Returns what happened rather than just a count, because "37 queued" and
 * "37 queued, 12 skipped because they were sign-in links" are different
 * facts and the admin should see the second one.
 */
async function enqueueFailed({ by = '', limit = 200 } = {}) {
  const rows = await EmailLog.find({
    status: 'failed',
    /* Not already waiting. Pressing the button twice must not double the
       queue or halve the spacing. */
    retryDueAt: null,
  })
    .sort({ createdAt: 1 })   // oldest first: the customer waiting longest hears first
    .limit(limit)
    .lean();

  const queued = [];
  const skipped = { noOrder: 0, orderGone: 0 };

  for (const row of rows) {
    /* A failed broadcast message is rebuilt by the broadcast queue, which
       knows which orders it covered and what the admin typed; this queue
       only knows how to rebuild a single-order lifecycle email. Handing it
       back is one field flip, and it goes out at the broadcast cadence. */
    if (row.broadcast) {
      await EmailLog.updateOne({ _id: row._id }, {
        $set: { status: 'queued', retryDueAt: new Date(), retryClaimedAt: null, retryQueuedBy: by },
      });
      continue;
    }
    if (!row.orderId) { skipped.noOrder++; continue; }
    /* Checked at enqueue rather than only at send, so the count the admin
       is shown is the number that will really go out. */
    const exists = await Order.exists({ orderId: row.orderId });
    if (!exists) { skipped.orderGone++; continue; }
    queued.push(row);
  }

  /* One schedule for the whole batch, so the gaps written to the rows and
     the finish time reported back are the same numbers. */
  const schedule = buildSchedule(queued.length, Date.now());

  for (let i = 0; i < queued.length; i++) {
    await EmailLog.updateOne(
      { _id: queued[i]._id, retryDueAt: null },
      { $set: { retryDueAt: schedule[i], retryQueuedBy: by } }
    );
  }

  return {
    queued: queued.length,
    skipped,
    finishesAt: schedule.length ? schedule[schedule.length - 1] : null,
  };
}

/** Everything still waiting, for the admin panel. */
async function status() {
  const [pending, claimed, outstanding, next] = await Promise.all([
    EmailLog.countDocuments({ retryDueAt: { $ne: null }, retryClaimedAt: null }),
    EmailLog.countDocuments({ retryClaimedAt: { $ne: null }, status: 'failed' }),
    /* Failures not already waiting — what the button will act on. A retry
       removes the row it replaces, so this falls as the queue drains
       instead of being a total that only grows. */
    EmailLog.countDocuments({ status: 'failed', retryDueAt: null }),
    EmailLog.findOne({ retryDueAt: { $ne: null }, retryClaimedAt: null })
      .sort({ retryDueAt: 1 }).select('retryDueAt to').lean(),
  ]);
  return {
    pending, claimed, outstanding,
    nextAt: next ? next.retryDueAt : null,
    nextTo: next ? next.to : '',
  };
}

/** Drop the whole queue without sending. */
async function clear() {
  const res = await EmailLog.updateMany(
    { retryDueAt: { $ne: null }, retryClaimedAt: null },
    { $set: { retryDueAt: null, retryQueuedBy: '' } }
  );
  return { cleared: res.modifiedCount || 0 };
}

/**
 * Send at most ONE due message. Called on a timer.
 *
 * One per pass is the whole design: the spacing lives in retryDueAt, and a
 * sweep that drained everything due would undo it the moment the process
 * restarted after being down for an hour.
 */
async function drainOne() {
  /* Reclaim anything a dead worker was holding, so a crash mid-send does
     not strand a message forever. */
  await EmailLog.updateMany(
    { retryClaimedAt: { $lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) }, status: 'failed' },
    { $set: { retryClaimedAt: null } }
  );

  /* Claim and read in one atomic step. Two workers cannot both win this. */
  const row = await EmailLog.findOneAndUpdate(
    { retryDueAt: { $ne: null, $lte: new Date() }, retryClaimedAt: null },
    { $set: { retryClaimedAt: new Date() } },
    { sort: { retryDueAt: 1 }, new: true }
  ).lean();
  if (!row) return { sent: false, reason: 'nothing_due' };

  const done = (patch) => EmailLog.updateOne({ _id: row._id }, { $set: patch });

  try {
    const order = await Order.findOne({ orderId: row.orderId });
    if (!order) {
      await done({ retryDueAt: null, retryClaimedAt: null });
      return { sent: false, reason: 'order_gone', to: row.to };
    }

    /* Required lazily: services/mail/lifecycle pulls in the template set,
       and loading that at module scope would drag it into every process
       that merely requires this file. */
    const lifecycle = require('./lifecycle');
    const mail = require('./index');

    const ctx = await lifecycle.context(order);
    if (!ctx) {
      await done({ retryDueAt: null, retryClaimedAt: null });
      return { sent: false, reason: 'no_address', to: row.to };
    }

    /* mail.send, not sendOnce — the once-per-order guard was already
       satisfied by a row that never arrived. Same call the single Retry
       button makes. */
    const result = await mail.send(row.type, Object.assign({}, ctx, { retryOf: row._id }));

    /* The queue fields are cleared either way. A retry that fails again
       leaves the row failed and OUT of the queue rather than looping: if
       the provider is still refusing, sending it again in four minutes
       helps nobody and looks worse each time. */
    await done({ retryDueAt: null, retryClaimedAt: null });
    return { sent: !!(result && result.ok), reason: result && result.ok ? 'sent' : 'send_failed', to: row.to };
  } catch (err) {
    await done({ retryDueAt: null, retryClaimedAt: null });
    console.error(`[mailRetry] ${row.to} (${row.type}) threw:`, err.message);
    return { sent: false, reason: 'error', to: row.to, error: err.message };
  }
}

module.exports = {
  enqueueFailed, status, clear, drainOne,
  GAP_SECONDS, JITTER_SECONDS,
};
