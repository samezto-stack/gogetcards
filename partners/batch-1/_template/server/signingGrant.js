import crypto from 'node:crypto';

/**
 * Proof that a browser was served the gated checkout, in a form that
 * survives being inside a frame.
 *
 * WHY THIS EXISTS. /internal/thank-you/token refuses to sign unless the
 * request proves it belongs to a real checkout session, and it proved that
 * with the signed experience cookie. That cookie is SameSite=Lax, and a Lax
 * cookie is NOT SENT on a subrequest from a cross-site framed document — not
 * even a same-origin fetch, because the top-level site is what "same site"
 * is measured against.
 *
 * The consequence was silent and expensive: inside zypheratcg's frame the
 * customer paid, the signing call came back 403, the thank-you fields went
 * out unsigned, and zypheratcg's pipeline — which will not create an order
 * from an unsigned link, correctly — created nothing. A real payment with no
 * order behind it, and a confirmation page that looked almost right.
 *
 * So the proof travels in the page instead of in a cookie. The server mints
 * this when it serves the gated checkout, which is the exact moment it has
 * already verified a one-time token; the page hands it back when it asks for
 * a signature. Same claim as the cookie made, carried somewhere a frame
 * cannot strip.
 *
 * WHAT IT IS NOT. It is not a bearer token for anything else: it authorises
 * one thing, signing thank-you fields, on this host. It carries no customer
 * data, it is short-lived, and it is useless without the fields themselves,
 * which zypheratcg re-verifies against its own record before an order is
 * created.
 */

/* Long enough that a customer can take their time over a card, short enough
   that a grant found later is worthless. A checkout that has been open for
   two hours has expired at zypheratcg's end anyway. */
const TTL_MS = 2 * 60 * 60 * 1000;

const b64u = (buf) => Buffer.from(buf).toString('base64url');

function mac(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * @param {string} experienceId  the gated experience this browser was granted
 * @param {string} secret
 * @returns {string} "<payload>.<mac>" — opaque to the page that carries it
 */
export function mintSigningGrant(experienceId, secret) {
  if (!secret) return '';
  const payload = b64u(JSON.stringify({ x: String(experienceId || ''), t: Date.now() }));
  return `${payload}.${mac(payload, secret)}`;
}

/**
 * Constant-time verify. Returns the experience id, or '' for anything that
 * is malformed, expired, or not ours — a caller that treats '' as "no proof"
 * therefore fails closed on every failure mode without having to enumerate
 * them.
 */
export function verifySigningGrant(grant, secret) {
  if (!grant || !secret || typeof grant !== 'string') return '';
  const dot = grant.lastIndexOf('.');
  if (dot < 1) return '';
  const payload = grant.slice(0, dot);
  const given = grant.slice(dot + 1);
  const expected = mac(payload, secret);
  /* Length check first: timingSafeEqual throws on a mismatch, and throwing
     is itself an oracle. */
  if (given.length !== expected.length) return '';
  if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return '';
  try {
    const { x, t } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!x || typeof t !== 'number') return '';
    if (Date.now() - t > TTL_MS) return '';
    /* A clock that has run backwards is not a reason to trust a grant. */
    if (t - Date.now() > 60 * 1000) return '';
    return String(x);
  } catch {
    return '';
  }
}

export { TTL_MS };
