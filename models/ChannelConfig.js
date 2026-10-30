const mongoose = require('mongoose');

/**
 * Per-channel connection settings and credentials.
 *
 * ONE DOCUMENT PER CHANNEL, keyed on the channel id from
 * config/distribution.js, so adding Meta later is a new document rather
 * than a schema change.
 *
 * CREDENTIALS ARE ENCRYPTED AT REST. The refresh token in particular is
 * long-lived and grants write access to the merchant account for as long as
 * it is not revoked — it is materially more dangerous than a password,
 * because nobody rotates it and its compromise is silent. services/cryptoUtil
 * handles the encryption; this model only ever holds ciphertext, and the
 * getters below are the single decryption point.
 */
const channelConfigSchema = new mongoose.Schema({
  channel: { type: String, required: true, unique: true, index: true },

  enabled: { type: Boolean, default: false },

  /* OAuth client. These belong to the store's own Google Cloud project;
     the client secret is not as sensitive as the refresh token but is still
     not something to store in plaintext. */
  clientId: { type: String, default: '' },
  clientSecretEnc: { type: String, default: '' },

  // Tokens, both encrypted.
  refreshTokenEnc: { type: String, default: '' },
  accessTokenEnc: { type: String, default: '' },
  accessTokenExpiresAt: { type: Date, default: null },

  /* The selected merchant account, and the list offered at connect time so
     the admin can switch without re-authorising. */
  merchantId: { type: String, default: '' },
  merchantName: { type: String, default: '' },
  availableAccounts: [{ id: String, name: String, _id: false }],
  dataSource: { type: String, default: 'primary' },

  /* WHICH PRODUCTS GO TO THIS CHANNEL.
   *
   *   'all'      send everything that passes validation, except products
   *              individually excluded. The safe default for a store that
   *              wants its whole catalogue listed.
   *   'selected' send NOTHING except products individually chosen. The
   *              right mode when only part of the catalogue should be
   *              advertised — allocation-limited product, partner-exclusive
   *              lines, anything held back deliberately.
   *
   * The two lists are stored separately on the product (merchant.excluded
   * and merchant.included) rather than reusing one flag with two meanings.
   * Switching modes therefore does not destroy the other list, and
   * switching back restores exactly what was there before. */
  selectionMode: { type: String, enum: ['all', 'selected'], default: 'all' },

  /* Scheduling. `cron`-less on purpose: the runner checks whether
     intervalHours has elapsed since lastSyncAt, which survives a restart
     without needing a scheduler process. */
  autoSync: { type: Boolean, default: false },
  intervalHours: { type: Number, default: 6 },
  lastSyncAt: { type: Date, default: null },
  lastSyncStatus: { type: String, default: '' },

  /* Connection health, written by every API call so the dashboard can show
     a real state rather than "configured". */
  lastError: { type: String, default: '' },
  lastErrorAt: { type: Date, default: null },
  lastVerifiedAt: { type: Date, default: null },

  /* Rough quota accounting. Google's per-day limits are generous but not
     unlimited, and a nightly full re-push of an unchanged catalogue is how
     a store spends them on nothing. */
  quotaUsedToday: { type: Number, default: 0 },
  quotaDate: { type: String, default: '' },
}, { timestamps: true });

/* ── Credential access ──────────────────────────────────
   Every read and write of a secret goes through these four methods, so
   there is one place to audit and no route can accidentally persist a
   plaintext token by assigning to the field directly. */

const crypto = require('../services/cryptoUtil');

channelConfigSchema.methods.setSecret = function (field, value) {
  const map = { clientSecret: 'clientSecretEnc', refreshToken: 'refreshTokenEnc', accessToken: 'accessTokenEnc' };
  const target = map[field];
  if (!target) throw new Error(`Unknown secret field: ${field}`);
  this[target] = value ? crypto.encrypt(value) : '';
};

channelConfigSchema.methods.getSecret = function (field) {
  const map = { clientSecret: 'clientSecretEnc', refreshToken: 'refreshTokenEnc', accessToken: 'accessTokenEnc' };
  const target = map[field];
  if (!target || !this[target]) return '';
  try {
    return crypto.decrypt(this[target]);
  } catch (err) {
    /* A decryption failure almost always means ENCRYPTION_KEY changed
       between deploys. Returning empty forces a clean re-authorisation
       rather than sending a corrupt token and getting an opaque 401. */
    console.error(`[ChannelConfig] could not decrypt ${field} for ${this.channel}:`, err.message);
    return '';
  }
};

/** True when there is enough here to attempt an API call. */
channelConfigSchema.methods.isConnected = function () {
  return !!(this.clientId && this.clientSecretEnc && this.refreshTokenEnc && this.merchantId);
};

/**
 * WHICH of the four requirements is missing, in the order they are
 * obtained.
 *
 * "Not connected" on its own is a status, not a diagnosis. Four separate
 * things have to be true, three of them are invisible from the page
 * (secrets are never rendered back), and the failure that actually happens
 * — finishing Google's consent screen and stopping before picking a
 * merchant account — looks identical from the outside to never having
 * started. Returns null when the channel is fully connected.
 */
channelConfigSchema.methods.connectionGap = function () {
  if (!this.clientId) {
    return { step: 1, need: 'OAuth client ID',
      how: 'Create a Web application OAuth client in Google Cloud and paste its ID below.' };
  }
  if (!this.clientSecretEnc) {
    return { step: 1, need: 'OAuth client secret',
      how: 'Paste the secret from the same OAuth client. Google shows it once, at creation.' };
  }
  if (!this.refreshTokenEnc) {
    return { step: 2, need: 'Authorisation from Google',
      how: 'Press Authorise with Google and complete the consent screen. If it warns that the app is unverified, choose Advanced and continue — verification only affects whether your logo is shown, not whether this works.' };
  }
  if (!this.merchantId) {
    return { step: 3, need: 'A merchant account',
      how: 'Google authorised us but no account has been chosen yet. Pick one below. This is the step most often missed, because the consent screen closing looks like the end of the process.' };
  }
  return null;
};

/** Resets the daily quota counter when the date rolls over. */
channelConfigSchema.methods.noteQuota = function (calls = 1) {
  const today = new Date().toISOString().slice(0, 10);
  if (this.quotaDate !== today) { this.quotaDate = today; this.quotaUsedToday = 0; }
  this.quotaUsedToday += calls;
};

module.exports = mongoose.model('ChannelConfig', channelConfigSchema);
