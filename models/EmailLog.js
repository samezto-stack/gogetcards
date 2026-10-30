const mongoose = require('mongoose');

/**
 * One row per email we tried to send.
 *
 * WRITTEN BEFORE THE SEND, NOT AFTER. A log that only records successes
 * cannot answer the one question that matters — "did this customer get
 * their confirmation?" — because the interesting case is the one where
 * the process died mid-send. A row in `pending` that never moved is
 * itself the answer.
 *
 * This replaces the old arrangement, where the only evidence an email
 * had been attempted was a boolean on the Order and a line on stdout.
 * That could not distinguish "sent", "refused by the provider" and
 * "SMTP was never configured", and all three had been happening.
 */
const emailLogSchema = new mongoose.Schema({
  /* Which template. Matches a key in services/mail/templates. */
  type: { type: String, required: true, index: true },

  to: { type: String, required: true, index: true },
  subject: { type: String, default: '' },

  /* The order this is about, by its human reference AND its raw id.
     The reference is what a customer quotes; the raw id is what joins
     back to the Order collection. Storing both means neither lookup
     needs the other collection. */
  orderRef: { type: String, default: '', index: true },
  orderId: { type: String, default: '', index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },

  /* pending → sent | failed | skipped
     `skipped` is not a failure: it is the honest state for "no transport
     configured" and "this order has no email address", both of which are
     conditions of the environment rather than of the message.

     `queued` is a message that has not been attempted yet: a broadcast
     row waiting for its turn in services/mail/broadcast. It is replaced
     by a real attempt row when it is sent, the same way a retry replaces
     the failure it retries, so the log still shows one row per message. */
  status: { type: String, default: 'pending', index: true },

  /* ── Broadcast payload ───────────────────────────────────────────
     Only on `queued` rows. What the message will be rebuilt from when its
     turn comes: the product, every order it covers (one email per
     customer, however many orders they hold), and the admin-typed facts
     the template needs — a delivery window, a deadline. The orders are
     re-read at send time, so one cancelled or refunded while the row was
     waiting drops out of the message rather than being described as it
     was an hour ago. */
  broadcast: { type: mongoose.Schema.Types.Mixed, default: null },

  /* Verbatim from the provider. A 550 with a reason is worth more than
     any summary we could write over it. */
  providerResponse: { type: String, default: '' },
  messageId: { type: String, default: '' },
  error: { type: String, default: '' },

  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },

  /* Set when a human pressed Retry, so an automatic redelivery and a
     deliberate one are distinguishable afterwards. */
  retriedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailLog', default: null },

  /* When the link inside this email was actually used.
     NOT AN OPEN. There is no tracking pixel in these emails and there
     will not be: a 1x1 remote image is the classic spam signature, and
     between Apple's Mail Privacy Protection pre-fetching images and
     Gmail proxying them, most recorded "opens" are machines anyway.
     This fires when somebody clicked through and signed in, which is a
     smaller number and a true one. Absent means "we do not know", not
     "they did not read it". */
  linkOpenedAt: { type: Date, default: null },

  /* ── Staggered retry queue ──────────────────────────────────────
     Set when "Retry all" enqueues this row. The queue exists because a
     provider outage fails dozens of messages at once, and sending the
     whole backlog the moment it clears is exactly the burst pattern that
     gets a sending domain throttled or blocked again — the recovery would
     cause the next incident.

     retryDueAt is stamped per row with a gap between them, so the drain
     is one message at a time on a human cadence rather than a blast.
     retryClaimedAt is the atomic claim: the sender flips it before
     sending, so an overlapping run or a restart can never send the same
     row twice. */
  retryDueAt: { type: Date, default: null },
  retryClaimedAt: { type: Date, default: null },
  retryQueuedBy: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now, index: true },
});

/* The admin log is read newest-first, usually filtered by status. */
emailLogSchema.index({ createdAt: -1, status: 1 });

/* The drain's query: due, unclaimed, oldest first. */
emailLogSchema.index({ retryDueAt: 1, retryClaimedAt: 1 });

/**
 * Has this exact message already gone out for this order?
 *
 * The guard against sending two confirmations for one payment. Kept here
 * rather than on the Order because the question is about the EMAIL, and
 * the old boolean-on-the-order version could only answer it for one
 * template — there was nowhere to record that a shipping notice had
 * been sent, so there was nothing stopping a second one.
 */
emailLogSchema.statics.alreadySent = async function alreadySent(type, orderId) {
  if (!orderId) return false;
  const hit = await this.findOne({ type, orderId, status: 'sent' }).select('_id').lean();
  return !!hit;
};

module.exports = mongoose.model('EmailLog', emailLogSchema);
