/**
 * Enhanced conversions: the buyer's details, SHA-256 hashed, for the Google
 * Ads purchase conversion (gtag 'set', 'user_data').
 *
 * WHY. The conversion is credited to an ad click through the _gcl_aw cookie.
 * Anything that loses the cookie — Safari ITP, a different device, the
 * payment window — loses the conversion. Google can recover those by
 * matching hashed contact details against the signed-in Google account that
 * clicked. It is Google's recommended setup for exactly this.
 *
 * PRIVACY. Everything identifying is hashed HERE, on the server, so the
 * page never carries a plaintext address. Normalisation follows Google's
 * spec (trim, lowercase; gmail dots removed) or the hashes cannot match.
 * Postal code and country are sent as-is, as the spec requires.
 *
 * The buyer is taken from the CheckoutSession (what they typed at Step 1)
 * in preference to the order, because in pooled-email mode the order's
 * address is one of ours, and hashing that would match nobody.
 */
const crypto = require('crypto');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clean = (s) => String(s == null ? '' : s).trim().toLowerCase();

function normEmail(raw) {
  const e = clean(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return '';
  const [local, domain] = e.split('@');
  return (domain === 'gmail.com' || domain === 'googlemail.com')
    ? `${local.replace(/\./g, '')}@${domain}` : e;
}

function normPhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  return /^\+\d{8,15}$/.test(digits) ? digits : '';
}

/** Returns the user_data object, or null when there is nothing to send. */
function adsUserData(buyer) {
  if (!buyer) return null;
  const out = {};
  const email = normEmail(buyer.email);
  if (email) out.sha256_email_address = sha(email);
  const phone = normPhone(buyer.phone);
  if (phone) out.sha256_phone_number = sha(phone);
  const first = clean(buyer.firstName);
  const last = clean(buyer.lastName);
  const addr = {};
  if (first) addr.sha256_first_name = sha(first);
  if (last) addr.sha256_last_name = sha(last);
  const street = clean(buyer.street);
  if (street) addr.sha256_street = sha(street);
  if (buyer.city) addr.city = clean(buyer.city);
  if (buyer.region) addr.region = clean(buyer.region);
  if (buyer.postalCode) addr.postal_code = String(buyer.postalCode).trim();
  if (buyer.country) addr.country = String(buyer.country).trim().toUpperCase().slice(0, 2);
  if (addr.sha256_first_name && addr.sha256_last_name && addr.postal_code && addr.country) out.address = addr;
  return Object.keys(out).length ? out : null;
}

module.exports = { adsUserData, normEmail, normPhone };
