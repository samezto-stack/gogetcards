const mongoose = require('mongoose');

/**
 * A single-use sign-in link.
 *
 * SHORT-LIVED AND SINGLE-USE, both enforced here rather than by convention.
 * A sign-in link sits in an inbox forever; the window in which it is worth
 * anything must not. `usedAt` makes replay a no-op even inside that window,
 * which matters because links get forwarded, quoted in support threads, and
 * scanned by corporate mail filters that follow every URL they see.
 *
 * ONLY THE HASH IS STORED, for the same reason as CustomerSession: whoever
 * can read this collection still cannot sign in as anybody.
 *
 * THE EMAIL IS STORED, NOT A CUSTOMER REFERENCE. A link can be requested
 * for an address that has orders but no account yet — the account is
 * created when the link is consumed, not when it is asked for, so that
 * requesting a link for a stranger's address creates nothing.
 */
const magicLinkSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, lowercase: true, trim: true },
  tokenHash: { type: String, required: true, unique: true, index: true },

  /* TTL-deleted. Fifteen minutes is long enough for a slow mail server and
     short enough that a forwarded link is usually already dead. */
  expiresAt: { type: Date, required: true, index: { expires: 0 } },

  usedAt: { type: Date, default: null },

  /* Where to land after signing in. Validated as a same-site path before
     it is stored — an open redirect on an authentication endpoint is how a
     sign-in link becomes a phishing tool. */
  redirectTo: { type: String, default: '/account' },

  requestedIpPrefix: { type: String, default: '' },

  /* 'signin'  — asked for from the website, minutes old, GET-safe to
                 the extent anything is.
     'order'   — the button in a confirmation email, days old, scoped to
                 one order.
     Recorded so the admin log can tell "somebody asked to sign in" from
     "we mailed them a link", which are different events with different
     things to worry about. */
  purpose: { type: String, default: 'signin', index: true },

  /* The EmailLog row this link was mailed in, when it was mailed at all.
     Set after the send, because the log row does not exist until then.

     THIS IS HOW ENGAGEMENT IS MEASURED HERE, and the alternative is
     worth naming: the usual way is a 1x1 remote image, which is the
     classic spam-filter signature — it is how a spammer confirms an
     address is live — and would reverse the one-image rule these
     templates are built on. It would also be bad data: Apple's Mail
     Privacy Protection pre-fetches every remote image, and Gmail
     proxies them, so most "opens" are machines.

     A consumed link is a human who clicked. Fewer events, all of them
     real, and nothing added to the email at all. */
  emailLog: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailLog', default: null, index: true },
}, { timestamps: true });

module.exports = mongoose.model('MagicLink', magicLinkSchema);
