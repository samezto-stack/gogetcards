const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * A checkout that was started and not paid for.
 *
 * WHERE THE DATA COMES FROM. The customer types their email and address on
 * a PARTNER host (thebindery.com, podiumstrategy.com...), not here. Until
 * now the only thing that crossed back was the funnel beacon in
 * routes/frontend.js — a zcid and a step name, no personal data at all. So
 * recovery needs a second, deliberate channel: partner.html posts the
 * checkout state to /api/checkout/session, keyed by the same zcid the
 * beacon already uses. That keeps one correlation id across the funnel
 * events, the abandoned checkout and the eventual Order.
 *
 * WHY A SEPARATE COLLECTION AND NOT PendingPayment. PendingPayment records
 * money that HAS moved and is waiting for a browser to confirm it. This
 * records the opposite: a customer who never paid. They are different
 * lifecycles with different privacy expectations, and merging them would
 * put unpaid personal data in the collection the finance side treats as
 * a payment ledger.
 *
 * THE ONE RULE. A row here is only ever emailed while it is genuinely
 * unpaid. `status` is the gate, and services/orderPipeline flips it to
 * a paid status the instant an Order appears for the same email. The
 * scheduler re-checks for an Order immediately before every single send
 * regardless, because a status field is a cache and the Order collection
 * is the truth.
 */

/** The six-step sequence, measured from abandonedAt. Server-side only. */
const RECOVERY_SCHEDULE = [
  { step: 1, afterMinutes: 30, template: 'recoveryReminder1' },
  { step: 2, afterMinutes: 4 * 60, template: 'recoveryReminder2' },
  { step: 3, afterMinutes: 12 * 60, template: 'recoveryReminder3' },
  { step: 4, afterMinutes: 24 * 60, template: 'recoveryReminder4' },
  { step: 5, afterMinutes: 48 * 60, template: 'recoveryReminder5' },
  { step: 6, afterMinutes: 72 * 60, template: 'recoveryReminder6' },
];

const MAX_STEP = RECOVERY_SCHEDULE.length;

/* How long a checkout may sit untouched before it counts as abandoned.
   Deliberately the same as the first email's offset: a customer who is
   still typing has touched the session inside the last half hour, so they
   are never in the queue while they are actively checking out. */
const INACTIVITY_MINUTES = 30;

/* 'recovered' means THE SEQUENCE BROUGHT THEM BACK — they clicked a
   recovery link and then paid. 'purchased' means they paid without it: they
   never left the checkout, or they came back on their own hours later. Both
   close the row and stop every future send; only one of them is something
   the emails can take credit for.

   They were one status until now, which flattered the recovery rate with
   every customer who simply finished paying. A sequence that appears to
   recover people it never reached is worse than no measurement, because it
   is acted on. */
const STATUSES = ['active', 'abandoned', 'recovered', 'purchased', 'expired', 'cancelled', 'suppressed'];

/** Paid, by whatever route. Terminal, and never emailed again. */
const PAID_STATUSES = ['recovered', 'purchased'];

/** Closed for any reason. Nothing here is ever re-opened. */
const TERMINAL_STATUSES = [...PAID_STATUSES, 'expired', 'cancelled'];

const sentEmailSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    template: { type: String, default: '' },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    /* Joins to EmailLog, which already holds the provider response,
       delivery status and retry history. Not duplicated here. */
    emailLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailLog', default: null },
    messageId: { type: String, default: '' },
    status: { type: String, default: 'sent' },   // sent | failed | skipped
    error: { type: String, default: '' },
  },
  { _id: false }
);

const abandonedCheckoutSchema = new mongoose.Schema(
  {
    /* The correlation id zypheratcg minted for this checkout hop and
       already writes onto every funnel Event. One id across the whole
       journey means the admin can line up "arrived" and "form_completed"
       against this row without a second join key. */
    checkoutId: { type: String, required: true, unique: true, index: true },

    /* ---- customer ---- */
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    country: { type: String, default: '' },       // ISO-2
    shipping: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },

    /* ---- what they were buying ----
       productSlug is the reference; the rest is a SNAPSHOT of what the
       customer was actually shown. Both are needed: the slug lets the
       scheduler re-check the live product before every send, and the
       snapshot lets the admin see what the email said even after the
       catalogue moves on. The email itself always renders from the live
       product, never from the snapshot — see services/abandonedCheckout. */
    productSlug: { type: String, default: '', index: true },
    productName: { type: String, default: '' },
    productImage: { type: String, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    /* Strings, because that is what the partner host sends and what Whop
       charges against a fixed plan. Parsed to numbers only for display
       and for the admin's value totals. */
    total: { type: String, default: '' },
    currency: { type: String, default: 'USD' },
    /* WHICH STOREFRONT THIS CHECKOUT HAPPENED IN.
       Without it every re-price ran in the default market: a UK checkout
       saved at £179.97 was compared against the base USD price of 224.97,
       always differed, and the sequence stopped itself with "price
       changed" — so no non-US customer could ever be sent a recovery
       email, and the row sat expired with a figure that was never wrong.
       It is also what puts the /uk prefix on the link in the email. */
    market: { type: String, default: '' },
    whopPlanId: { type: String, default: '' },
    availability: { type: String, default: 'preorder' },  // preorder | in_stock
    releaseDate: { type: Date, default: null },
    /* Which partner host the customer was on, so a recovery link sends
       them back to the same experience rather than a different one. */
    partnerStore: { type: String, default: '', index: true },

    /* How this customer found the store: 'Google', 'Facebook', 'ChatGPT',
       'Direct'...
     *
     * DENORMALISED, NOT RE-COLLECTED. The partner host has no idea where the
     * customer came from — it only ever receives a zcid. The answer already
     * exists on this site, on the checkout_click Event that minted that same
     * zcid, where it was resolved from the session's earliest acquisition
     * page view. So it is copied across at capture time rather than asked
     * for, which also means the partner page cannot influence it.
     *
     * WHY IT EARNS A COLUMN. Without it an abandoned checkout is an
     * anonymous failure. With it, "every Google Shopping click abandons and
     * every ChatGPT referral converts" is one glance at a list rather than a
     * query nobody gets round to writing — and that distinction is what
     * decides whether ad money is buying customers or bounces. */
    trafficSource: { type: String, default: '', index: true },

    /* ---- lifecycle ---- */
    status: { type: String, enum: STATUSES, default: 'active', index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    abandonedAt: { type: Date, default: null },
    recoveredAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    /* Set when the sequence is stopped for a reason other than success:
       product withdrawn, price moved, preorder closed. Shown in the admin
       so a stalled sequence is never a mystery. */
    stoppedReason: { type: String, default: '' },

    /* When this row's timeline was last shifted forward by a global pause
       of the recovery sequence. Recorded because abandonedAt is rewritten
       by that shift, and without this there would be no way to tell a
       checkout abandoned an hour ago from one abandoned last week and held
       for six days — the two would look identical afterwards. */
    resumedAt: { type: Date, default: null },

    /* The Order this checkout turned into. */
    orderId: { type: String, default: '', index: true },

    /* ---- recovery sequence ---- */
    recoveryStep: { type: Number, default: 0, min: 0, max: MAX_STEP },
    nextEmailAt: { type: Date, default: null, index: true },
    lastEmailAt: { type: Date, default: null },
    emailsSent: { type: [sentEmailSchema], default: [] },

    /* Held while a scheduler run is sending, so two workers cannot both
       claim the same step. Cleared on completion; a stale lock older than
       the timeout is reclaimable, which is what stops a process that died
       mid-send from freezing the row forever. */
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: '' },

    /* ---- recovery token ----
       Only the SHA-256 lives here. A database dump is then not a set of
       working links into other people's checkouts. Compared by hashing
       the presented token, so lookup stays a single indexed query. */
    recoveryTokenHash: { type: String, default: '', index: true },
    recoveryTokenExpiresAt: { type: Date, default: null },
    recoveryLinkClicks: { type: Number, default: 0 },
    lastRecoveryClickAt: { type: Date, default: null },

    /* Denormalised from EmailSuppression so the scheduler's due-query can
       exclude suppressed rows without a per-row join. EmailSuppression is
       still the authority and is re-checked before each send. */
    suppressedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* The scheduler's only hot query: "which rows are due right now". Ordered
   status -> nextEmailAt so it is an index scan over a handful of rows
   rather than a collection scan every five minutes. */
abandonedCheckoutSchema.index({ status: 1, nextEmailAt: 1 });

/* The sweep that promotes active -> abandoned. */
abandonedCheckoutSchema.index({ status: 1, lastActivityAt: 1 });

/* "Has this customer got another live sequence?" — the dedupe check. */
abandonedCheckoutSchema.index({ email: 1, status: 1, createdAt: -1 });

/** Mints a recovery token, returning the plaintext ONCE. */
abandonedCheckoutSchema.methods.issueRecoveryToken = function issueRecoveryToken(ttlHours = 96) {
  /* 32 bytes of CSPRNG output. Base64url so it survives a URL path and a
     mail client's line wrapping without escaping. */
  const plaintext = crypto.randomBytes(32).toString('base64url');
  this.recoveryTokenHash = hashRecoveryToken(plaintext);
  /* Outlives the 72-hour sequence by a day, so the final email's link is
     still good for a customer who opens it the next morning. */
  this.recoveryTokenExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return plaintext;
};

function hashRecoveryToken(plaintext) {
  return crypto.createHash('sha256').update(String(plaintext)).digest('hex');
}

/** Whether this row may still be emailed. Cheap, local, no I/O. */
abandonedCheckoutSchema.methods.isEmailable = function isEmailable() {
  return this.status === 'abandoned' && !this.suppressedAt && this.recoveryStep < MAX_STEP;
};

const AbandonedCheckout =
  mongoose.models.AbandonedCheckout ||
  mongoose.model('AbandonedCheckout', abandonedCheckoutSchema);

module.exports = AbandonedCheckout;
module.exports.RECOVERY_SCHEDULE = RECOVERY_SCHEDULE;
module.exports.MAX_STEP = MAX_STEP;
module.exports.INACTIVITY_MINUTES = INACTIVITY_MINUTES;
module.exports.STATUSES = STATUSES;
module.exports.PAID_STATUSES = PAID_STATUSES;
module.exports.TERMINAL_STATUSES = TERMINAL_STATUSES;
module.exports.hashRecoveryToken = hashRecoveryToken;
