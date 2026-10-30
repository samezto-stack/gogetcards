/* ── Signature Verifier ───────────────────────────────────
   Gates the post-purchase pipeline on real, cryptographic proof that a
   /thank-you hit came from a completed checkout on the partner site
   (NorthbridgeAI), not from someone hand-typing a URL. NorthbridgeAI signs
   the exact field set with a shared secret right after Whop's onComplete
   fires (see server/thankYouSigning.js + the /internal/thank-you/token
   route there); this recomputes the same signature and compares.

   The canonicalization here (sorted keys, String()-coerced values,
   URI-encoded, joined with "&", "iat" appended last) MUST stay identical to
   NorthbridgeAI's server/thankYouSigning.js — keep the two in sync.
*/

const crypto = require('crypto');

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000; // allow a signer clock up to 5 min ahead

function canonicalizeFields(fields, iatString) {
  const keys = Object.keys(fields)
    .filter((k) => k !== 'sig' && k !== 'iat')
    .sort();
  const parts = keys.map((k) => `${k}=${encodeURIComponent(String(fields[k] ?? ''))}`);
  parts.push(`iat=${iatString}`);
  return parts.join('&');
}

function verifySignature(query, secret, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  if (!secret) {
    return { valid: false, reason: 'signing_not_configured' };
  }

  const { sig, iat } = query || {};
  if (!sig || !iat) {
    return { valid: false, reason: 'missing_token' };
  }

  const iatNum = Number(iat);
  if (!Number.isFinite(iatNum)) {
    return { valid: false, reason: 'invalid_iat' };
  }

  const age = Date.now() - iatNum;
  if (age > maxAgeMs) {
    return { valid: false, reason: 'expired' };
  }
  if (age < -CLOCK_SKEW_TOLERANCE_MS) {
    return { valid: false, reason: 'issued_in_future' };
  }

  const canonical = canonicalizeFields(query, String(iat));
  const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');

  const providedBuf = Buffer.from(String(sig), 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, reason: 'bad_signature' };
  }

  return { valid: true };
}

module.exports = { verifySignature, canonicalizeFields };
