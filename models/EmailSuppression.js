const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Addresses that must not receive recovery email again, and why.
 *
 * There was no suppression anywhere in this application before. Order
 * confirmations did not need one — a receipt for a purchase somebody just
 * made is transactional, and nobody unsubscribes from a receipt.
 * Abandoned-checkout recovery is different: its purpose is to persuade
 * somebody to buy, which makes it commercial mail, which makes an
 * unsubscribe mechanism and an honoured suppression list a legal
 * requirement rather than a courtesy.
 *
 * SCOPE IS DELIBERATE. Suppression here stops MARKETING/recovery mail. It
 * does NOT stop transactional mail: somebody who unsubscribed from
 * recovery reminders and then places an order still gets their
 * confirmation, their dispatch notice and their refund notice, because
 * those are records of a transaction they entered into. `scope` records
 * which, so a future all-mail suppression can be added without
 * reinterpreting existing rows.
 *
 * ONE ROW PER ADDRESS, upserted. A hard bounce followed by a complaint
 * updates the reason and keeps the earliest suppressedAt, rather than
 * accumulating rows that all have to be checked.
 */

const REASONS = ['unsubscribed', 'hard_bounce', 'complaint', 'manual', 'invalid'];
const SCOPES = ['marketing', 'all'];

const emailSuppressionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    reason: { type: String, enum: REASONS, default: 'unsubscribed' },
    scope: { type: String, enum: SCOPES, default: 'marketing' },

    suppressedAt: { type: Date, default: Date.now },

    /* Which checkout's email prompted it, when known. Useful when
       somebody asks why they stopped receiving reminders. */
    sourceCheckoutId: { type: String, default: '' },

    /* Verbatim provider text for a bounce or complaint, so a suppression
       can be audited rather than taken on trust. */
    providerDetail: { type: String, default: '' },

    /* An unsubscribe click is a state change triggered by a GET, so the
       token has to prove the request came from the actual email we sent.
       Hashed for the same reason recovery tokens are: a database dump
       must not be a set of working unsubscribe links for other people.
       Only set on rows created by a click. */
    tokenHash: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

/* The scheduler asks "is this address suppressed" before every send. */
emailSuppressionSchema.index({ email: 1, scope: 1 });

function hashUnsubscribeToken(plaintext) {
  return crypto.createHash('sha256').update(String(plaintext)).digest('hex');
}

/**
 * Deterministic per (address, checkout) unsubscribe token.
 *
 * Derived rather than stored, so the link in email #1 still works when
 * email #6 is the one the customer eventually opens, without keeping six
 * separate tokens alive. It is an HMAC over a server-side secret, so it
 * cannot be forged or enumerated from the address alone.
 */
function unsubscribeToken(email, checkoutId) {
  const secret =
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.THANK_YOU_SIGNING_SECRET ||
    process.env.SESSION_SECRET ||
    '';
  if (!secret) return '';
  return crypto
    .createHmac('sha256', secret)
    .update(`${String(email).toLowerCase().trim()}:${checkoutId || ''}`)
    .digest('base64url');
}

/** Constant-time compare, so a wrong token cannot be narrowed by timing. */
function verifyUnsubscribeToken(token, email, checkoutId) {
  const expected = unsubscribeToken(email, checkoutId);
  if (!expected || !token) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Is this address blocked for this kind of mail? */
async function isSuppressed(email, scope = 'marketing') {
  if (!email) return true;
  const row = await EmailSuppression.findOne({
    email: String(email).toLowerCase().trim(),
    ...(scope === 'marketing' ? {} : { scope: 'all' }),
  }).lean();
  return !!row;
}

/** Upsert, keeping the earliest suppressedAt. */
async function suppress(email, reason, extra = {}) {
  if (!email) return null;
  return EmailSuppression.findOneAndUpdate(
    { email: String(email).toLowerCase().trim() },
    {
      $set: {
        reason: REASONS.includes(reason) ? reason : 'manual',
        scope: extra.scope === 'all' ? 'all' : 'marketing',
        ...(extra.sourceCheckoutId ? { sourceCheckoutId: extra.sourceCheckoutId } : {}),
        ...(extra.providerDetail ? { providerDetail: String(extra.providerDetail).slice(0, 2000) } : {}),
        ...(extra.tokenHash ? { tokenHash: extra.tokenHash } : {}),
      },
      $setOnInsert: { suppressedAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const EmailSuppression =
  mongoose.models.EmailSuppression ||
  mongoose.model('EmailSuppression', emailSuppressionSchema);

module.exports = EmailSuppression;
module.exports.REASONS = REASONS;
module.exports.SCOPES = SCOPES;
module.exports.isSuppressed = isSuppressed;
module.exports.suppress = suppress;
module.exports.unsubscribeToken = unsubscribeToken;
module.exports.verifyUnsubscribeToken = verifyUnsubscribeToken;
module.exports.hashUnsubscribeToken = hashUnsubscribeToken;
