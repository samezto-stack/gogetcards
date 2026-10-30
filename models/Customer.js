const mongoose = require('mongoose');

/**
 * A customer account.
 *
 * IDENTITY IS THE NORMALISED EMAIL. Orders already carry `customerEmail`
 * and always have, so the account is keyed on the same thing rather than
 * on a new identifier the order records would not know about. That makes
 * every historical order attributable the moment an account exists, with
 * no backfill, and it means the account system reads the order system
 * rather than shadowing it.
 *
 * NOTHING ABOUT PAYMENT LIVES HERE. Card details never reach this
 * application, and the payment provider's identifiers stay on the Order
 * where the pipeline put them. An account row that accumulated payment
 * metadata would be a second place to leak it from and a second place to
 * keep correct.
 *
 * NO PASSWORD FIELD, DELIBERATELY. Authentication is a signed-in session
 * issued by a verified purchase, or a single-use link sent to this address
 * — see services/customerAuth.js. There is no password to store badly, to
 * leak, or to ask a collector to invent at the worst possible moment.
 */
const customerSchema = new mongoose.Schema({
  /* Lowercased and trimmed. Stored separately from the display address so
     "Sam@Example.com " and "sam@example.com" are one account while the
     customer still sees their own capitalisation back. */
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  displayEmail: { type: String, default: '' },

  firstName: { type: String, default: '', trim: true },
  lastName: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },

  /* Default shipping address. Seeded from the first order that carried one
     and editable afterwards. Orders keep their OWN address copy — an
     address edited today must not silently rewrite where a parcel was
     actually sent last year. */
  address: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    region: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
  },

  /* 'active' | 'closed'. A closed account keeps its orders — the store has
     tax and consumer-law obligations that outlive a customer's interest in
     logging in — but can no longer authenticate. */
  status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },

  /* How the account came to exist, for support. 'purchase' is automatic
     creation on a verified order; 'magic_link' is somebody signing in with
     an address that had orders but no account yet. */
  createdVia: { type: String, default: 'purchase' },

  lastLoginAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: null },

  /* Communication preference. Transactional mail about an order the
     customer placed is not marketing and is not covered by this. */
  marketingOptIn: { type: Boolean, default: false },
}, { timestamps: true });

/** The canonical form of an address, used for every lookup and comparison. */
customerSchema.statics.normaliseEmail = function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
};

/**
 * Finds the account for an address, creating it if this is the first time
 * the address has been seen.
 *
 * Idempotent under concurrency. Two requests for the same new customer —
 * a double-submitted confirmation, a retried webhook — race on the unique
 * index, and the loser reads the winner's document instead of throwing.
 * The alternative is an intermittent 500 on somebody's first purchase.
 */
customerSchema.statics.findOrCreateByEmail = async function findOrCreateByEmail(rawEmail, seed = {}) {
  const email = this.normaliseEmail(rawEmail);
  if (!email || !email.includes('@')) return null;

  const existing = await this.findOne({ email });
  if (existing) return existing;

  try {
    return await this.create({
      email,
      displayEmail: String(rawEmail || '').trim(),
      firstName: seed.firstName || '',
      lastName: seed.lastName || '',
      phone: seed.phone || '',
      address: seed.address || {},
      createdVia: seed.createdVia || 'purchase',
    });
  } catch (err) {
    if (err && err.code === 11000) return this.findOne({ email });
    throw err;
  }
};

/** The name to greet them by, degrading to something that is never blank. */
customerSchema.methods.greetingName = function greetingName() {
  return this.firstName || (this.displayEmail || this.email).split('@')[0];
};

module.exports = mongoose.model('Customer', customerSchema);
