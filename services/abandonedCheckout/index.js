/**
 * Abandoned-checkout recovery: capture, state transitions, and the checks
 * that run immediately before every send.
 *
 * The scheduler (cron/abandonedCheckout.js) is deliberately thin and this
 * file holds the decisions, so the rules can be tested without waiting for
 * a timer.
 *
 * THE ORDERING RULE THAT MATTERS. Status on the row is a cache. Payment is
 * the truth. Every function that is about to send re-reads the payment
 * record first, because the window between "scheduler claimed this row"
 * and "SMTP accepted the message" is exactly when a customer's payment
 * lands. Nothing here trusts `status: 'abandoned'` on its own.
 *
 * AND "PAID" IS NOT THE SAME AS "HAS AN ORDER". An Order is only written
 * when the customer's browser reaches /thank-you. A customer who paid and
 * closed the tab has a PendingPayment and no Order — they are as paid as
 * anyone else, and mailing them "you left something behind" is the single
 * worst thing this system can do. hasPaid() reads both collections for
 * exactly that reason; do not narrow it back to Order alone.
 */

const AbandonedCheckout = require('../../models/AbandonedCheckout');
const EmailSuppression = require('../../models/EmailSuppression');
const Order = require('../../models/Order');
const PendingPayment = require('../../models/PendingPayment');
const Product = require('../../models/Product');
const Event = require('../../models/Event');

const { RECOVERY_SCHEDULE, MAX_STEP, INACTIVITY_MINUTES } = AbandonedCheckout;

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Order.customerEmail casing is not normalised on the way in. */
function emailMatcher(email) {
  return new RegExp(`^${escapeRegex(String(email).trim())}$`, 'i');
}

function toCents(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/* ────────────────────────────── capture ────────────────────────────── */

/**
 * Upsert the checkout a partner page is reporting.
 *
 * Called on every meaningful edit, so it must be cheap and idempotent:
 * the same zcid always addresses the same row, and every call refreshes
 * lastActivityAt. That timestamp is the whole basis of "inactive for 30
 * minutes" — a customer still filling in their address keeps pushing it
 * forward and never enters the queue.
 *
 * A row that has already been paid for, expired or unsubscribed is
 * touched but NOT resurrected: `status` is only ever moved back to
 * 'active' from 'active' or 'abandoned'.
 */
async function capture(payload = {}) {
  const checkoutId = String(payload.checkoutId || '').trim();
  const email = String(payload.email || '').toLowerCase().trim();
  if (!checkoutId || !email) return null;

  const now = new Date();
  const existing = await AbandonedCheckout.findOne({ checkoutId });

  /* Terminal states stay terminal. A recovered checkout being re-posted
     means the customer went back to the page after paying; that is not a
     new abandonment and must never re-enter the sequence. */
  if (existing && AbandonedCheckout.TERMINAL_STATUSES.includes(existing.status)) {
    return existing;
  }

  const set = {
    email,
    lastActivityAt: now,
    ...pick(payload, [
      'firstName', 'lastName', 'phone', 'country',
      'productSlug', 'productName', 'productImage',
      'currency', 'market', 'whopPlanId', 'availability', 'partnerStore',
    ]),
  };

  if (payload.shipping && typeof payload.shipping === 'object') {
    set.shipping = pick(payload.shipping, ['line1', 'line2', 'city', 'state', 'postalCode']);
  }
  if (payload.quantity != null) set.quantity = Math.max(1, parseInt(payload.quantity, 10) || 1);
  if (payload.total != null) set.total = String(payload.total).replace(/[^0-9.]/g, '');
  if (payload.releaseDate) {
    const d = new Date(payload.releaseDate);
    if (!isNaN(d.getTime())) set.releaseDate = d;
  }

  /* Editing after abandonment means they came back and are active again.
     Their sequence resets rather than continuing from where it stopped —
     a customer who returns and leaves a second time deserves the gentle
     first email, not the "last reminder". */
  if (existing && existing.status === 'abandoned') {
    set.status = 'active';
    set.abandonedAt = null;
    set.nextEmailAt = null;
  }

  /* Where this customer came from, read from the checkout_click Event that
     minted this same zcid on this server. Resolved once, on first capture,
     because the answer cannot change afterwards and capture() runs on every
     keystroke-batch the partner page reports.

     Deliberately not taken from the payload: the partner host never knew
     the source, and a field it could set is a field it could get wrong.

     Failing to find it is not an error. A checkout can reach the partner
     without a click Event (a recovery link, a manually shared URL), and an
     unknown source is worth strictly less than a wrong one. */
  if (!existing || !existing.trafficSource) {
    try {
      const click = await Event.findOne({ type: 'checkout_click', checkoutId })
        .select('source')
        .lean();
      if (click && click.source) set.trafficSource = String(click.source);
    } catch { /* a missing source must never cost us the capture */ }
  }

  /* MongoDB refuses an update that names the same path in $set and
     $setOnInsert (ConflictingUpdateOperators) — and it refuses it up front,
     whether or not the upsert would actually insert. The reset branch
     above puts `status` in $set, so for a customer returning to an
     abandoned checkout this call used to throw and the partner page's
     capture POST 500'd on every keystroke-batch. `status` goes in
     $setOnInsert only when $set is not already carrying it. */
  const setOnInsert = { checkoutId };
  if (!('status' in set)) setOnInsert.status = 'active';

  const doc = await AbandonedCheckout.findOneAndUpdate(
    { checkoutId },
    { $set: set, $setOnInsert: setOnInsert },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  /* An address that unsubscribed earlier never re-enters the queue, even
     on a brand new checkout. */
  if (!doc.suppressedAt && (await EmailSuppression.isSuppressed(email))) {
    doc.suppressedAt = new Date();
    doc.status = 'suppressed';
    await doc.save();
  }

  return doc;
}

function pick(src, keys) {
  const out = {};
  for (const k of keys) {
    if (src[k] != null && String(src[k]).trim() !== '') out[k] = String(src[k]).trim();
  }
  return out;
}

/* ──────────────────────── active -> abandoned ──────────────────────── */

/**
 * Promotes checkouts that have gone quiet, and schedules their first email.
 *
 * DEDUPE (the brief's "five sequences for five sessions" problem). A
 * customer who starts three checkouts gets ONE sequence, for their most
 * recent one. The older rows are closed as 'cancelled/superseded' rather
 * than deleted, so the admin can still see they happened and the
 * abandoned-value total stays honest.
 */
async function sweepToAbandoned() {
  const cutoff = new Date(Date.now() - INACTIVITY_MINUTES * 60 * 1000);
  const stale = await AbandonedCheckout.find({
    status: 'active',
    lastActivityAt: { $lt: cutoff },
  }).sort({ lastActivityAt: -1 });

  const results = { abandoned: 0, superseded: 0, skipped: 0 };

  for (const doc of stale) {
    /* Paid in the meantime? Then this was never an abandonment. */
    if (await hasPaid(doc)) {
      await markRecovered({ checkoutId: doc.checkoutId, email: doc.email, note: 'paid before first email' });
      results.skipped++;
      continue;
    }
    if (await EmailSuppression.isSuppressed(doc.email)) {
      doc.status = 'suppressed';
      doc.suppressedAt = new Date();
      await doc.save();
      results.skipped++;
      continue;
    }

    /* The checkout was abandoned when the customer went quiet, not when
       this sweep happened to notice. The schedule's first step is "30
       minutes after abandonment" and INACTIVITY_MINUTES is the same 30
       minutes, so anchoring abandonedAt at `now` pushed the first email
       out to an hour after they left and every later step with it. Set
       the anchor at the last activity and the first reminder is due the
       moment the row is promoted — the send phase of this same sweep
       picks it up. */
    const abandonedAt = doc.lastActivityAt || new Date();
    doc.status = 'abandoned';
    doc.abandonedAt = abandonedAt;
    doc.recoveryStep = 0;
    doc.nextEmailAt = nextEmailTime(abandonedAt, RECOVERY_SCHEDULE[0].step);
    if (!doc.recoveryTokenHash) doc.issueRecoveryToken();
    await doc.save();
    results.abandoned++;

    /* Close any older live sequence for the same person. */
    const superseded = await AbandonedCheckout.updateMany(
      {
        email: doc.email,
        _id: { $ne: doc._id },
        status: { $in: ['active', 'abandoned'] },
      },
      {
        $set: {
          status: 'cancelled',
          stoppedReason: 'superseded by a newer checkout',
          nextEmailAt: null,
        },
      }
    );
    results.superseded += superseded.modifiedCount || 0;
  }

  return results;
}

/* ────────────────────────── payment always wins ────────────────────── */

/**
 * Has this checkout been paid for?
 *
 * THE SUBTLETY THAT MAKES OR BREAKS THIS FEATURE. When pooled-email mode
 * is on, the address Whop reports as the buyer — and therefore the address
 * on the Order — is the POOLED one, not the address the customer typed on
 * the partner page. Matching Order.customerEmail against the customer's
 * real address would then never match, the checkout would look unpaid
 * forever, and the customer would get six reminders about something they
 * had already bought. That is the exact failure this whole system must
 * not have.
 *
 * So both are checked: the real address (correct when pooling is off) and
 * the pooled address recorded on this checkout's own click Event (correct
 * when it is on). Same join the retired pooled-email sweep used to decide
 * whether a pooled address converted.
 *
 * Order.checkoutId is NOT usable here — it holds Whop's checkout id, not
 * our zcid.
 */
async function hasPaid(emailOrDoc) {
  const doc = emailOrDoc && typeof emailOrDoc === 'object' ? emailOrDoc : null;
  const email = doc ? doc.email : emailOrDoc;
  const checkoutId = doc ? doc.checkoutId : null;

  /* An address is paid if EITHER collection knows about it. PendingPayment
     is checked with the same weight as Order, not as an afterthought: for a
     customer who closed the tab on the confirmation redirect it is the only
     record that exists. */
  if (email && (await paidByAddress(email))) return true;

  /* The payment a partner reported carries our zcid in its verified
     payload, so a checkout can be matched even when the address on the
     payment differs from the one typed at Step 1 — pooled mode, or a
     customer who corrected a typo on the payment form. */
  if (checkoutId) {
    try {
      if (await PendingPayment.exists({ 'payload.zcid': String(checkoutId) })) return true;
    } catch (err) {
      console.error('[abandonedCheckout] pending-payment zcid check failed:', err.message);
    }
  }

  if (!checkoutId) return false;

  try {
    const ev = await Event.findOne({
      checkoutId: String(checkoutId),
      pooledEmail: { $nin: [null, ''] },
    }).lean();
    if (ev && ev.pooledEmail && (await paidByAddress(ev.pooledEmail))) {
      return true;
    }
  } catch (err) {
    /* A lookup failure must not be read as "not paid" — but it also must
       not block the sweep. Treated as unknown, and the next run retries. */
    console.error('[abandonedCheckout] pooled-email order check failed:', err.message);
  }
  return false;
}

/** Either record of payment, for one address. */
async function paidByAddress(email) {
  const matcher = emailMatcher(email);
  if (await Order.exists({ customerEmail: matcher })) return true;
  try {
    if (await PendingPayment.exists({ customerEmail: matcher })) return true;
  } catch (err) {
    console.error('[abandonedCheckout] pending-payment address check failed:', err.message);
  }
  return false;
}

/**
 * Called by the order pipeline the moment an Order exists, and again by
 * the scheduler immediately before each send.
 *
 * Closes EVERY live checkout for the address, not just the newest: a
 * customer who abandoned three sessions and then paid must not receive a
 * reminder from any of them.
 */
async function markRecovered(opts = {}) {
  const email = opts.email ? String(opts.email).toLowerCase().trim() : '';
  const checkoutId = opts.checkoutId ? String(opts.checkoutId) : '';
  if (!email && !checkoutId) return { modified: 0 };

  /* Closing by ADDRESS as well as by id is deliberate: somebody who
     abandoned three sessions and then paid must not hear from any of
     them. The id alone would only close the one they came back to. */
  const or = [];
  if (checkoutId) or.push({ checkoutId });
  if (email) or.push({ email });

  /* ── RECOVERED IS NOT THE SAME AS PAID ────────────────────────────
     Both close the row and stop every future send, and that part must
     happen for anybody who pays. What differs is the credit.

     'recovered' is reserved for a checkout the sequence actually brought
     back: one where somebody clicked a recovery link. Everyone else —
     the customer who never left and simply finished, the one who
     returned on their own the next morning — is 'purchased'.

     Marking both as recovered, which is what this did, meant the
     recovery rate counted every ordinary sale that happened to have a
     checkout row behind it. That number is worse than having none,
     because it gets acted on: it says the sequence is working when it
     may never have been opened.

     Two writes rather than one so the split is decided per document by
     what that document shows, and neither can be applied twice — the
     status filter is the same in both, and the first write moves its
     matches out of it. */
  const closing = {
    recoveredAt: new Date(),
    orderId: opts.orderId || '',
    nextEmailAt: null,
    /* The link dies with the checkout it belonged to. */
    recoveryTokenHash: '',
    recoveryTokenExpiresAt: null,
    ...(opts.note ? { stoppedReason: opts.note } : {}),
  };
  const open = { $or: or, status: { $in: ['active', 'abandoned'] } };

  /* Clicked a recovery link at some point: the email did its job, even if
     they went round the houses before paying. */
  const attributed = await AbandonedCheckout.updateMany(
    { ...open, recoveryLinkClicks: { $gt: 0 } },
    { $set: { status: 'recovered', ...closing }, $unset: { lockedAt: '', lockedBy: '' } }
  );

  /* Everyone else. Paid, closed, and not the sequence's doing. */
  const unattributed = await AbandonedCheckout.updateMany(
    open,
    { $set: { status: 'purchased', ...closing }, $unset: { lockedAt: '', lockedBy: '' } }
  );

  return {
    modified: (attributed.modifiedCount || 0) + (unattributed.modifiedCount || 0),
    recovered: attributed.modifiedCount || 0,
    purchased: unattributed.modifiedCount || 0,
  };
}

/** Back-compat shim for callers that only have an address. */
async function markRecoveredByEmail(email, opts = {}) {
  return markRecovered({ ...opts, email });
}

/* ───────────────────── pre-send validation ─────────────────────────── */

/**
 * The gate every send passes through. Returns { ok } or { ok:false, reason,
 * stop } — `stop` meaning the sequence should end, not just skip this run.
 *
 * Ordered cheapest-and-most-important first: an already-paid customer is
 * the one case where sending would be actively damaging, so it is checked
 * before anything else.
 */
async function validateForSend(doc) {
  if (await hasPaid(doc)) {
    return { ok: false, stop: true, reason: 'paid', recovered: true };
  }
  if (await EmailSuppression.isSuppressed(doc.email)) {
    return { ok: false, stop: true, reason: 'suppressed' };
  }
  if (doc.status !== 'abandoned') {
    return { ok: false, stop: false, reason: `status is ${doc.status}` };
  }
  if (doc.recoveryStep >= MAX_STEP) {
    return { ok: false, stop: true, reason: 'sequence complete' };
  }

  /* A recovery link must always land on something buyable. Sending
     someone back to a withdrawn product is worse than not writing. */
  if (doc.productSlug) {
    const product = await Product.findOne({ slug: doc.productSlug }).lean();
    if (!product) {
      return { ok: false, stop: true, reason: 'product no longer exists' };
    }
    if (product.available === false) {
      return { ok: false, stop: true, reason: 'product is not purchasable' };
    }
    /* Price moved. The saved figure would make the email a
       misquotation, so the sequence stops rather than quoting a number
       the customer will not be charged. */
    /* PRICED IN THE MARKET THE CHECKOUT HAPPENED IN. `product.price` is the
       base USD figure; comparing a £179.97 checkout against it found a
       difference every single time and stopped the sequence as though the
       price had moved. The saved total and the live total have to be read
       off the same storefront or the comparison is meaningless.

       A product that is no longer sold in that market is a genuine stop —
       there is nothing to send them back to. */
    const markets = require('../../config/markets');
    const marketService = require('../market');
    const market = markets.byId(doc.market) || markets.defaultMarket();
    const localPrice = marketService.priceFor(product, market);
    if (!localPrice) {
      return { ok: false, stop: true, reason: `no longer sold in ${market.id}` };
    }
    const savedCents = toCents(doc.total);
    const liveCents = Number(localPrice.amount);
    if (Number.isFinite(savedCents) && Number.isFinite(liveCents) && doc.quantity === 1) {
      if (savedCents !== liveCents) {
        return { ok: false, stop: true, reason: `price changed in ${market.id} (${savedCents} -> ${liveCents})` };
      }
    }
    return { ok: true, product };
  }

  return { ok: true, product: null };
}

/** Ends a sequence with a recorded reason. */
async function stopSequence(doc, reason, status = 'expired') {
  await AbandonedCheckout.updateOne(
    { _id: doc._id },
    {
      $set: {
        status,
        stoppedReason: reason,
        nextEmailAt: null,
        ...(status === 'expired' ? { expiredAt: new Date() } : {}),
        ...(status === 'suppressed' ? { suppressedAt: new Date() } : {}),
      },
      $unset: { lockedAt: '', lockedBy: '' },
    }
  );
}

/** Where the next email lands, or null when the sequence is done. */
function nextEmailTime(abandonedAt, nextStep) {
  const entry = RECOVERY_SCHEDULE.find((s) => s.step === nextStep);
  if (!entry) return null;
  return new Date(new Date(abandonedAt).getTime() + entry.afterMinutes * 60 * 1000);
}

module.exports = {
  capture,
  markRecovered,
  sweepToAbandoned,
  hasPaid,
  markRecoveredByEmail,
  validateForSend,
  stopSequence,
  nextEmailTime,
  emailMatcher,
  toCents,
  RECOVERY_SCHEDULE,
  MAX_STEP,
};
