/**
 * Signs the post-purchase field set handed off to zypheratcg's /thank-you
 * pipeline, so it can tell "this came from a real completed checkout on
 * this site" apart from "someone typed a URL". No Whop involvement here —
 * this only signs data the browser already collected/received itself.
 *
 * The exact same canonicalization (sorted keys, String()-coerced values,
 * URI-encoded, joined with "&", "iat" appended last) is re-implemented on
 * the zypheratcg side (services/orderPipeline/signatureVerifier.js) against
 * the same shared secret. Keep the two in sync if this ever changes.
 * Identical to northbridgeai's server/thankYouSigning.js.
 */
import crypto from 'node:crypto';

export function canonicalizeFields(fields, iatString) {
  const keys = Object.keys(fields)
    .filter((k) => k !== 'sig' && k !== 'iat')
    .sort();
  const parts = keys.map((k) => `${k}=${encodeURIComponent(String(fields[k] ?? ''))}`);
  parts.push(`iat=${iatString}`);
  return parts.join('&');
}

export function signFields(fields, secret) {
  const iat = Date.now();
  const canonical = canonicalizeFields(fields, String(iat));
  const sig = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return { iat, sig };
}
