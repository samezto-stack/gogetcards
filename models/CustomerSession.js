const mongoose = require('mongoose');

/**
 * One signed-in browser.
 *
 * WHY SESSIONS ARE ROWS RATHER THAN A SIGNED TOKEN: a self-contained token
 * cannot be taken away. "Sign out of all devices" has to mean something
 * after a shared laptop or a stolen phone, and with a stateless token the
 * honest answer is "in about a fortnight". A row can be deleted, and the
 * next request from that browser is anonymous.
 *
 * THE COOKIE HOLDS A RANDOM STRING; THIS HOLDS ITS SHA-256. Read access to
 * this collection — a backup, a log, a stray screenshot of a database
 * client — therefore yields nothing that can be replayed. The store never
 * possesses the value it would need to impersonate its own customer.
 *
 * Nothing about the customer is duplicated here. This is a pointer, an
 * expiry, and enough context to recognise a session in a list.
 */
const customerSessionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },

  /* SHA-256 of the cookie value. Unique so a token cannot be registered
     twice, indexed because it is looked up on every authenticated request. */
  tokenHash: { type: String, required: true, unique: true, index: true },

  /* Absolute expiry. Mongo's TTL monitor deletes the row when it passes,
     so expired sessions do not accumulate and a forgotten cleanup job is
     not load-bearing for security. */
  expiresAt: { type: Date, required: true, index: { expires: 0 } },

  /* Rotation. Every authenticated request past the halfway mark issues a
     fresh token and retires this one, so a token that leaks has a short
     useful life even though the session itself is long-lived. */
  rotatedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },

  /* Context, for the customer's own benefit when reviewing sessions.
     Truncated user-agent only — no fingerprinting, and the IP is stored
     truncated to its network rather than in full, because "which sessions
     are mine" does not require knowing where somebody lives. */
  userAgent: { type: String, default: '' },
  ipPrefix: { type: String, default: '' },

  /* 'purchase' when the session came from completing a checkout,
     'magic_link' when it came from an emailed sign-in link. */
  origin: { type: String, default: 'purchase' },
}, { timestamps: true });

module.exports = mongoose.model('CustomerSession', customerSessionSchema);
