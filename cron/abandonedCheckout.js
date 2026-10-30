/*
 * Abandoned-checkout recovery sweep.
 *
 * Runs in-process alongside the web server, started from server.js's boot()
 * once the DB is connected — the same place the other sweeps start, so
 * there is one answer to "where do background jobs live".
 *
 * TWO PHASES, EVERY FIVE MINUTES:
 *
 *   1. Promote checkouts that have been quiet for 30 minutes to
 *      'abandoned' and schedule their first email.
 *   2. Send whatever is due.
 *
 * IDEMPOTENCY IS THE WHOLE DESIGN. Two workers, an overlapping run, or a
 * process that dies mid-send must never produce two copies of the same
 * reminder. Three mechanisms, in order:
 *
 *   - A row lock (lockedAt/lockedBy) claimed with findOneAndUpdate, so a
 *     row is only ever in one worker's hands. Stale locks are reclaimable
 *     so a crash does not freeze a sequence forever.
 *   - The STEP is claimed by incrementing recoveryStep in the same
 *     conditional update, BEFORE the message is handed to SMTP. If two
 *     workers somehow reach the same row, exactly one wins the
 *     `recoveryStep: n - 1` predicate and the other does nothing. The cost
 *     of this ordering is that a hard SMTP failure burns its step rather
 *     than retrying — which is the right way round, because the failure
 *     mode of the alternative is a customer receiving the same email twice.
 *   - The send itself is recorded onto the row, and EmailLog holds the
 *     provider's response, so a duplicate is visible even if one ever
 *     happened.
 *
 * AND BEFORE EVERY SINGLE SEND, the row is re-validated: paid, suppressed,
 * product withdrawn, price moved. Status on the row is a cache; the Order
 * collection is the truth.
 */

const os = require('os');
const crypto = require('crypto');

const AbandonedCheckout = require('../models/AbandonedCheckout');
const service = require('../services/abandonedCheckout');
const pauseState = require('../services/abandonedCheckout/pause');
const recoveryMail = require('../services/mail/recoveryLifecycle');

const SWEEP_INTERVAL_MS = parseInt(process.env.ABANDONED_SWEEP_INTERVAL_MS || '', 10) || 5 * 60 * 1000;

/* A lock older than this belonged to a process that died. Comfortably
   longer than the mail service's own retry window, so a slow send is
   never mistaken for a dead one. */
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

/* Ceiling per run. A backlog drains over several sweeps instead of
   opening a thousand SMTP connections at once and getting the domain
   rate-limited by the provider. */
const MAX_PER_RUN = parseInt(process.env.ABANDONED_MAX_PER_RUN || '', 10) || 50;

const WORKER_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(3).toString('hex')}`;

let timer = null;
let running = false;

/**
 * Claims one due row, or null.
 *
 * The predicate IS the concurrency control: whichever worker's update
 * lands first owns the row, and every other worker's query no longer
 * matches it.
 */
async function claimNext(maxStep = service.MAX_STEP) {
  const now = new Date();
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  return AbandonedCheckout.findOneAndUpdate(
    {
      status: 'abandoned',
      nextEmailAt: { $ne: null, $lte: now },
      suppressedAt: null,
      /* The cap, not the schedule length. A row that has had every step
         the cap allows is simply not claimed — it waits at that step with
         its due time intact until the cap is raised, which is what makes
         the hold resumable rather than a skip. */
      recoveryStep: { $lt: maxStep },
      $or: [{ lockedAt: null }, { lockedAt: { $lt: staleLock } }],
    },
    { $set: { lockedAt: now, lockedBy: WORKER_ID } },
    { new: true, sort: { nextEmailAt: 1 } }
  );
}

async function releaseLock(id, extra = {}) {
  await AbandonedCheckout.updateOne(
    { _id: id },
    { $set: extra, $unset: { lockedAt: '', lockedBy: '' } }
  );
}

/** Sends at most one email for one row. */
async function processOne(doc) {
  const step = doc.recoveryStep + 1;

  const check = await service.validateForSend(doc);
  if (!check.ok) {
    if (check.recovered) {
      /* They paid. This closes every live checkout for the address, not
         just this one. */
      await service.markRecoveredByEmail(doc.email);
      await releaseLock(doc._id);
      return { outcome: 'recovered', checkoutId: doc.checkoutId };
    }
    if (check.stop) {
      const status = check.reason === 'suppressed' ? 'suppressed' : 'expired';
      await service.stopSequence(doc, check.reason, status);
      return { outcome: 'stopped', reason: check.reason, checkoutId: doc.checkoutId };
    }
    await releaseLock(doc._id);
    return { outcome: 'skipped', reason: check.reason, checkoutId: doc.checkoutId };
  }

  /* A token is minted per sequence, not per email: the link in reminder 1
     must still work when reminder 6 is the one they open. Only ever
     re-issued if the row somehow has none. */
  let token = null;
  if (!doc.recoveryTokenHash) {
    token = doc.issueRecoveryToken();
    await AbandonedCheckout.updateOne(
      { _id: doc._id },
      { $set: { recoveryTokenHash: doc.recoveryTokenHash, recoveryTokenExpiresAt: doc.recoveryTokenExpiresAt } }
    );
  }

  /* CLAIM THE STEP BEFORE SENDING. See the header note on ordering. */
  const claimed = await AbandonedCheckout.findOneAndUpdate(
    { _id: doc._id, status: 'abandoned', recoveryStep: step - 1 },
    { $set: { recoveryStep: step } },
    { new: true }
  );
  if (!claimed) {
    await releaseLock(doc._id);
    return { outcome: 'raced', checkoutId: doc.checkoutId };
  }

  /* The plaintext token only exists at mint time. For every later step we
     re-issue and store the new hash, which also revokes the previous
     link — acceptable, because the newest email always carries the newest
     link and older ones are superseded rather than left working forever. */
  if (!token) {
    token = claimed.issueRecoveryToken();
    await AbandonedCheckout.updateOne(
      { _id: claimed._id },
      {
        $set: {
          recoveryTokenHash: claimed.recoveryTokenHash,
          recoveryTokenExpiresAt: claimed.recoveryTokenExpiresAt,
        },
      }
    );
  }

  const result = await recoveryMail.sendStep(claimed, step, check.product, token);

  /* mail.send returns the log id, not the provider's message id — that
     lives on the EmailLog row it just wrote. Read it back so the admin
     table can show a provider reference without a join. */
  let messageId = '';
  if (result && result.logId) {
    try {
      const EmailLog = require('../models/EmailLog');
      const logRow = await EmailLog.findById(result.logId).select('messageId').lean();
      messageId = (logRow && logRow.messageId) || '';
    } catch (err) { /* the reference is a nicety, not the record */ }
  }

  const now = new Date();
  const nextStep = step + 1;
  const nextAt = nextStep <= service.MAX_STEP
    ? service.nextEmailTime(claimed.abandonedAt, nextStep)
    : null;

  await AbandonedCheckout.updateOne(
    { _id: claimed._id },
    {
      $set: {
        lastEmailAt: now,
        nextEmailAt: nextAt,
        /* Step 6 is the end of the road. The row becomes EXPIRED so the
           due-query never looks at it again. */
        ...(nextAt ? {} : { status: 'expired', expiredAt: now, stoppedReason: 'sequence completed' }),
      },
      $push: {
        emailsSent: {
          step,
          template: `recoveryReminder${step}`,
          scheduledFor: claimed.nextEmailAt,
          sentAt: result && result.ok ? now : null,
          emailLogId: (result && result.logId) || null,
          messageId,
          status: (result && result.status) || (result && result.ok ? 'sent' : 'failed'),
          error: (result && result.error) || '',
        },
      },
      $unset: { lockedAt: '', lockedBy: '' },
    }
  );

  return {
    outcome: result && result.ok ? 'sent' : 'send_failed',
    step,
    checkoutId: doc.checkoutId,
    error: result && result.error,
  };
}

/** One full sweep. Exported so tests can drive it without a timer. */
async function runOnce() {
  const summary = { promoted: 0, superseded: 0, sent: 0, stopped: 0, recovered: 0, skipped: 0, failed: 0, paused: false };

  try {
    const swept = await service.sweepToAbandoned();
    summary.promoted = swept.abandoned;
    summary.superseded = swept.superseded;
  } catch (err) {
    console.error('[AbandonedCheckout] sweep failed:', err.message);
  }

  /* PROMOTION CONTINUES WHILE PAUSED, SENDING DOES NOT.
   *
   * Marking a checkout abandoned is bookkeeping — it costs no mail and
   * keeps the dashboard honest about what happened during the pause. Only
   * the sending is held. Rows promoted in here are shifted on resume like
   * every other, anchored to their own abandonedAt, so they wait their
   * ordinary half hour from the resume rather than leaving the instant it
   * happens.
   *
   * Read per sweep rather than at start(), so the toggle takes effect
   * without a redeploy — which is the point of it being a toggle. */
  let cap = service.MAX_STEP;
  try {
    const p = await pauseState.state();
    cap = p.maxStep;
    summary.maxStep = cap;
  } catch (err) {
    /* If the cap cannot be read, the safe reading is FULLY HELD. Sending
       because a config lookup failed is how a hold quietly stops being one,
       and the whole reason this exists is a provider allowance that a stray
       burst would swallow. */
    console.error('[AbandonedCheckout] cap unreadable, holding all sends:', err.message);
    cap = 0;
    summary.maxStep = 0;
  }

  if (cap <= 0) {
    summary.paused = true;
    if (summary.promoted) {
      console.log(`[AbandonedCheckout] held — promoted ${summary.promoted}, sent nothing`);
    }
    return summary;
  }

  for (let i = 0; i < MAX_PER_RUN; i++) {
    let doc;
    try {
      doc = await claimNext(cap);
    } catch (err) {
      console.error('[AbandonedCheckout] claim failed:', err.message);
      break;
    }
    if (!doc) break;

    try {
      const res = await processOne(doc);
      if (res.outcome === 'sent') summary.sent++;
      else if (res.outcome === 'stopped') summary.stopped++;
      else if (res.outcome === 'recovered') summary.recovered++;
      else if (res.outcome === 'send_failed') summary.failed++;
      else summary.skipped++;
    } catch (err) {
      console.error(`[AbandonedCheckout] ${doc.checkoutId} failed:`, err.message);
      summary.failed++;
      /* Never leave a lock behind on an unexpected throw, or the row is
         frozen until the lock times out. */
      await releaseLock(doc._id).catch(() => {});
    }
  }

  if (summary.promoted || summary.sent || summary.stopped || summary.failed) {
    console.log(
      `[AbandonedCheckout] promoted ${summary.promoted}, superseded ${summary.superseded}, ` +
      `sent ${summary.sent}, stopped ${summary.stopped}, recovered ${summary.recovered}, failed ${summary.failed}`
    );
  }
  return summary;
}

/** Guarded so a slow run can never overlap the next tick. */
async function tick() {
  if (running) return;
  running = true;
  try {
    await runOnce();
  } catch (err) {
    /* THIS CATCH IS NOT OPTIONAL, and leaving it out took the whole store
       down. setInterval calls this bare, so nothing holds the promise it
       returns — and since Node 15 an unhandled rejection TERMINATES THE
       PROCESS. A database that stopped answering therefore did not degrade
       the site, it killed it: the sweep threw, the process exited, the host
       restarted it, and thirty seconds later it exited again. From outside,
       a crash loop looks like 502 Bad Gateway.

       A failed sweep is not worth one lost request, let alone all of them.
       Log it and let the next tick try again. */
    console.error('[abandonedCheckout] sweep failed:', err.message);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  if (process.env.ABANDONED_RECOVERY_ENABLED === 'false') {
    console.log('[AbandonedCheckout] disabled by ABANDONED_RECOVERY_ENABLED=false');
    return;
  }
  console.log(`[AbandonedCheckout] sweeping every ${Math.round(SWEEP_INTERVAL_MS / 60000)} min as ${WORKER_ID}`);
  timer = setInterval(tick, SWEEP_INTERVAL_MS);
  if (timer.unref) timer.unref();
  /* A short delay so boot is not competing with the first request. */
  setTimeout(tick, 30 * 1000).unref?.();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, runOnce, tick, claimNext, processOne, WORKER_ID, MAX_PER_RUN };
